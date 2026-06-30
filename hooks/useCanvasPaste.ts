'use client';

import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import type { Node } from '@xyflow/react';
import { classifyClipboard, nextFrameNumber } from '../lib/canvas-paste';
import { wrapHtmlFragment } from '../lib/html-utils';
import { wrapJsxComponent } from '../lib/jsx-utils';
import {
  JSX_ID_PREFIX,
  JSX_COMPONENT_ADDED_EVENT,
  DEFAULT_COMPONENT_NODE_WIDTH,
  DEFAULT_COMPONENT_NODE_HEIGHT,
} from '../lib/constants';
import { toast } from 'sonner';

export interface UseCanvasPasteParams {
  reactFlowWrapper: RefObject<HTMLDivElement | null>;
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  getNodeId: () => string;
  setNodes: Dispatch<SetStateAction<Node[]>>;
}

export function useCanvasPaste({
  reactFlowWrapper,
  screenToFlowPosition,
  getNodeId,
  setNodes,
}: UseCanvasPasteParams): void {
  // Paste images or HTML from clipboard onto the canvas
  useEffect(() => {
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return;

    const handlePaste = async (e: ClipboardEvent) => {
      // Don't intercept pastes into text inputs
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          (active as HTMLElement).isContentEditable)
      ) {
        return;
      }

      // Pure classification decides which node a paste becomes; this handler
      // owns the I/O (upload, frame-file writes, node insertion) each drives.
      const intent = classifyClipboard(e.clipboardData ?? null);
      if (intent.kind === 'none') return;
      e.preventDefault();

      // Drop the new node at the current viewport centre (computed lazily so
      // image/JSX/HTML pastes place correctly after their awaited round-trip).
      const centerPosition = () => {
        const wrapperBounds = wrapper.getBoundingClientRect();
        return screenToFlowPosition({
          x: wrapperBounds.left + wrapperBounds.width / 2,
          y: wrapperBounds.top + wrapperBounds.height / 2,
        });
      };

      // --- Image paste (takes priority) ---
      if (intent.kind === 'image') {
        const file = intent.file;
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          try {
            const res = await fetch('/playground/api/images', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageBase64: base64,
                originalName: file.name || `pasted-image.${file.type.split('/')[1] || 'png'}`,
              }),
            });
            const data = await res.json();
            if (data.success) {
              const position = centerPosition();
              const newNode: Node = {
                id: getNodeId(),
                type: 'image',
                position,
                style: { width: 300, height: 250 },
                data: {
                  imagePath: data.path,
                  imageUrl: data.url,
                  filename: data.filename,
                  originalName: file.name || 'Pasted Image',
                },
              };
              setNodes((nds) => nds.concat(newNode));
            }
          } catch (err) {
            console.error('[Playground] Image paste upload failed:', err);
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      // --- JSX paste (checked before HTML since JSX also contains HTML tags) ---
      if (intent.kind === 'jsx') {
        try {
          // Determine next frame number by scanning existing JSX components and HTML pages
          const [jsxRes, htmlRes] = await Promise.all([
            fetch('/playground/api/oncanvas-components').catch(() => null),
            fetch('/playground/api/html-pages').catch(() => null),
          ]);
          const jsxFilenames: string[] = [];
          const htmlFolders: string[] = [];
          if (jsxRes?.ok) {
            const { components } = await jsxRes.json() as { components: { filename: string }[] };
            for (const comp of components) jsxFilenames.push(comp.filename);
          }
          if (htmlRes?.ok) {
            const { pages } = await htmlRes.json() as { pages: { folder: string }[] };
            for (const page of pages) htmlFolders.push(page.folder);
          }
          const frameNumber = nextFrameNumber(jsxFilenames, htmlFolders);

          const frameName = `frame-${frameNumber}`;
          const componentName = `Frame${frameNumber}`;
          const filename = `${frameName}.tsx`;
          const wrappedJsx = wrapJsxComponent(intent.source, componentName);

          const res = await fetch('/playground/api/oncanvas-components', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, content: wrappedJsx }),
          });
          const data = await res.json();

          if (!res.ok) {
            console.error('[Playground] JSX paste failed:', data.error);
            toast.error(data.error || 'Failed to create frame from pasted JSX');
            return;
          }

          const position = centerPosition();
          const newNode: Node = {
            id: getNodeId(),
            type: 'component',
            position,
            data: {
              componentId: `${JSX_ID_PREFIX}${frameName}`,
              renderMode: 'jsx' as const,
              jsxFile: filename,
            },
          };
          setNodes((nds) => nds.concat(newNode));

          // Delay event dispatch to give the bundler (HMR) time to recompile
          // the updated barrel index after the new file is written to disk.
          // Retry a few times in case the first attempt is too early.
          const dispatchWithRetry = (attempts: number, delay: number) => {
            setTimeout(() => {
              window.dispatchEvent(new Event(JSX_COMPONENT_ADDED_EVENT));
              if (attempts > 1) {
                dispatchWithRetry(attempts - 1, delay * 2);
              }
            }, delay);
          };
          dispatchWithRetry(3, 500);
        } catch (err) {
          console.error('[Playground] JSX paste failed:', err);
          toast.error('Failed to create frame from pasted JSX');
        }
        return;
      }

      // --- Single-line URL paste → remote iframe embed (no file on disk) ---
      if (intent.kind === 'url') {
        const position = centerPosition();
        const embedComponentId = `url-embed:${crypto.randomUUID()}`;
        const newNode: Node = {
          id: getNodeId(),
          type: 'component',
          position,
          style: { width: DEFAULT_COMPONENT_NODE_WIDTH, height: DEFAULT_COMPONENT_NODE_HEIGHT },
          data: {
            componentId: embedComponentId,
            renderMode: 'embed' as const,
            embedUrl: intent.url,
          },
        };
        setNodes((nds) => nds.concat(newNode));
        return;
      }

      // --- HTML paste ---
      try {
        // Determine next frame number by scanning existing HTML pages and JSX components
        const [htmlRes2, jsxRes2] = await Promise.all([
          fetch('/playground/api/html-pages').catch(() => null),
          fetch('/playground/api/oncanvas-components').catch(() => null),
        ]);
        const jsxFilenames: string[] = [];
        const htmlFolders: string[] = [];
        if (htmlRes2?.ok) {
          const { pages } = await htmlRes2.json() as { pages: { folder: string }[] };
          for (const page of pages) htmlFolders.push(page.folder);
        }
        if (jsxRes2?.ok) {
          const { components } = await jsxRes2.json() as { components: { filename: string }[] };
          for (const comp of components) jsxFilenames.push(comp.filename);
        }
        const frameNumber = nextFrameNumber(jsxFilenames, htmlFolders);

        const frameName = `frame-${frameNumber}`;
        const wrappedHtml = wrapHtmlFragment(intent.html);

        const res = await fetch('/playground/api/html-pages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: frameName, content: wrappedHtml }),
        });
        const data = await res.json();

        if (!res.ok) {
          console.error('[Playground] HTML paste failed:', data.error);
          toast.error(data.error || 'Failed to create frame from pasted HTML');
          return;
        }

        const position = centerPosition();
        const pageId = data.page.id as string;
        const folder = data.page.folder as string;

        const newNode: Node = {
          id: getNodeId(),
          type: 'component',
          position,
          data: {
            componentId: pageId,
            renderMode: 'html' as const,
            htmlFolder: folder,
          },
        };
        setNodes((nds) => nds.concat(newNode));
      } catch (err) {
        console.error('[Playground] HTML paste failed:', err);
        toast.error('Failed to create frame from pasted HTML');
      }
    };

    wrapper.addEventListener('paste', handlePaste);
    return () => wrapper.removeEventListener('paste', handlePaste);
  }, [screenToFlowPosition, getNodeId, setNodes]);
}
