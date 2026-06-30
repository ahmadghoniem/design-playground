'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { GenerationInfo } from '../lib/canvas-persistence';
import { getIterationKeysOnCanvas } from '../lib/canvas-persistence';
import { isInExpectedBatch, resolveIterationPosition } from '../lib/iteration-scan';
import type { GenerationCoordination } from './useGenerationCoordination';
import {
  ITERATION_PROMPT_COPIED_EVENT,
  ITERATION_FETCH_EVENT,
  POLL_INTERVAL,
  POLL_DURATION,
  ARRANGE_HORIZONTAL_GAP,
  DEFAULT_ITERATION_NODE_WIDTH,
  DEFAULT_COMPONENT_NODE_WIDTH,
  ITERATION_EDGE_STYLE,
  JSX_ID_PREFIX,
  type JsxComponentInfo,
  type ComponentSize,
} from '../lib/constants';

/** Poll interval while a generation is active (SSE fallback). */
const GENERATION_POLL_INTERVAL_MS = 4000;

interface IterationFile {
  filename: string;
  componentName: string;
  iterationNumber: number;
  parentId: string;
  description: string;
  sourceIteration: string | null;
}

export interface UseIterationScanParams {
  coord: GenerationCoordination;
  isGenerating: boolean;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  getNodeId: () => string;
  findParentNode: (componentName: string, parentId?: string) => Node | undefined;
  findIterationNodeByFilename: (filename: string) => Node | undefined;
  handleIterationDelete: (filename: string) => void;
  handleIterationAdopt: (filename: string, componentName: string) => void;
}

export interface UseIterationScanResult {
  scanForIterations: (
    resetTimeoutOnFind?: boolean,
    scanContext?: GenerationInfo | null,
  ) => Promise<void>;
  /** Stop any active prompt-copy polling loop (used by clear-canvas). */
  stopPolling: () => void;
}

export function useIterationScan({
  coord,
  isGenerating,
  setNodes,
  setEdges,
  getNodeId,
  findParentNode,
  findIterationNodeByFilename,
  handleIterationDelete,
  handleIterationAdopt,
}: UseIterationScanParams): UseIterationScanResult {
  const [, setIsScanning] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const generationPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const resetPollTimeout = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
    }
    pollTimeoutRef.current = setTimeout(() => {
      stopPolling();
    }, POLL_DURATION);
  }, [stopPolling]);

  const scanForIterations = useCallback(
    async (resetTimeoutOnFind = false, scanContext?: GenerationInfo | null) => {
      if (!coord.tryAcquireScanLock()) {
        coord.markScanQueued(scanContext);
        return;
      }
      setIsScanning(true);
      try {
        const info = scanContext !== undefined ? scanContext : coord.getGenerationInfo();
        const canvasIterationKeys = getIterationKeysOnCanvas(coord.getNodes());

        if (info?.renderMode === 'html' && info.htmlFolder) {
          const htmlFolder = info.htmlFolder;
          try {
            const htmlResponse = await fetch('/playground/api/html-pages');
            if (htmlResponse.ok) {
              const { pages } = (await htmlResponse.json()) as {
                pages: { folder: string; iterations: { folder: string; number: number }[] }[];
              };
              const page = pages.find((p: { folder: string }) => p.folder === htmlFolder);
              if (page) {
                const currentNodes = coord.getNodes();
                const existingHtmlKeys = canvasIterationKeys;

                let newHtmlIterations = page.iterations.filter(
                  (iter: { folder: string; number: number }) =>
                    !existingHtmlKeys.has(`${htmlFolder}/${iter.folder}`),
                );
                if (info.startNumber != null && info.iterationCount) {
                  newHtmlIterations = newHtmlIterations.filter((iter) =>
                    isInExpectedBatch(iter.number, info),
                  );
                }

                if (newHtmlIterations.length > 0) {
                  const skeletonsToRemove: string[] = [];
                  const newNodes: Node[] = [];
                  const newEdges: Edge[] = [];
                  const newKnownFilenames: string[] = [];

                  newHtmlIterations.sort(
                    (a: { number: number }, b: { number: number }) => a.number - b.number,
                  );

                  for (const iter of newHtmlIterations) {
                    const sourceNodeId = info.parentNodeId
                      ? currentNodes.find((n) => n.id === info.parentNodeId)?.id || undefined
                      : undefined;
                    const sourceNode = sourceNodeId
                      ? currentNodes.find((n) => n.id === sourceNodeId) ||
                        newNodes.find((n) => n.id === sourceNodeId)
                      : undefined;

                    const position = resolveIterationPosition(
                      info,
                      iter.number,
                      currentNodes,
                      skeletonsToRemove,
                      sourceNode,
                      info.skeletonPositions?.[0],
                    );

                    const nodeId = getNodeId();
                    const parentSize = sourceNode?.data?.size as ComponentSize | undefined;

                    newNodes.push({
                      id: nodeId,
                      type: 'iteration',
                      position,
                      data: {
                        componentName: htmlFolder,
                        iterationNumber: iter.number,
                        filename: `${htmlFolder}/iteration-${iter.number}`,
                        description: '',
                        parentNodeId: sourceNodeId || undefined,
                        parentSize,
                        renderMode: 'html',
                        htmlFolder,
                        htmlIterationFolder: iter.folder,
                        onDelete: handleIterationDelete,
                        onAdopt: handleIterationAdopt,
                      },
                    });

                    if (sourceNodeId) {
                      newEdges.push({
                        id: `edge_${sourceNodeId}_${nodeId}`,
                        source: sourceNodeId,
                        target: nodeId,
                        type: 'smoothstep',
                        animated: false,
                        style: ITERATION_EDGE_STYLE,
                      });
                    }

                    newKnownFilenames.push(`${htmlFolder}/${iter.folder}`);
                  }

                  if (newNodes.length > 0) {
                    const skeletonSet = new Set(skeletonsToRemove);
                    setNodes((nds) => [
                      ...nds.filter((n) => !skeletonSet.has(n.id)),
                      ...newNodes,
                    ]);
                    setEdges((eds) => [
                      ...eds.filter((e) => !skeletonSet.has(e.target)),
                      ...newEdges,
                    ]);
                    coord.appendKnownIterations(newKnownFilenames);
                    if (resetTimeoutOnFind) resetPollTimeout();
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error scanning HTML iterations:', error);
          }
          return;
        }

        if (info?.renderMode === 'jsx' && info.jsxFile) {
          const baseFilename = info.jsxFile.replace(/\.iteration-\d+\.tsx$/, '.tsx');
          try {
            const jsxResponse = await fetch('/playground/api/oncanvas-components');
            if (jsxResponse.ok) {
              const { components } = (await jsxResponse.json()) as {
                components: JsxComponentInfo[];
              };
              const comp = components.find((c) => c.filename === baseFilename);
              if (comp && comp.iterations.length > 0) {
                const currentNodes = coord.getNodes();
                const existingJsxKeys = canvasIterationKeys;

                let newJsxIterations = comp.iterations.filter(
                  (it) => !existingJsxKeys.has(it.filename),
                );
                if (info.startNumber != null && info.iterationCount) {
                  newJsxIterations = newJsxIterations.filter((it) =>
                    isInExpectedBatch(it.iterationNumber, info),
                  );
                }

                if (newJsxIterations.length > 0) {
                  const skeletonsToRemove: string[] = [];
                  const newNodes: Node[] = [];
                  const newEdges: Edge[] = [];
                  const newKnownFilenames: string[] = [];

                  newJsxIterations.sort((a, b) => a.iterationNumber - b.iterationNumber);

                  for (const it of newJsxIterations) {
                    const sourceNodeId = info.parentNodeId
                      ? currentNodes.find((n) => n.id === info.parentNodeId)?.id || undefined
                      : undefined;
                    const sourceNode = sourceNodeId
                      ? currentNodes.find((n) => n.id === sourceNodeId) ||
                        newNodes.find((n) => n.id === sourceNodeId)
                      : undefined;

                    const position = resolveIterationPosition(
                      info,
                      it.iterationNumber,
                      currentNodes,
                      skeletonsToRemove,
                      sourceNode,
                      info.skeletonPositions?.[0],
                    );

                    const nodeId = getNodeId();
                    const parentSize = sourceNode?.data?.size as ComponentSize | undefined;
                    const registryId =
                      (sourceNode?.data?.componentId as string | undefined) ??
                      `${JSX_ID_PREFIX}${comp.label}`;

                    newNodes.push({
                      id: nodeId,
                      type: 'iteration',
                      position,
                      data: {
                        componentName: comp.label,
                        iterationNumber: it.iterationNumber,
                        filename: it.filename,
                        description: '',
                        parentNodeId: sourceNodeId || undefined,
                        parentSize,
                        registryId,
                        renderMode: 'jsx',
                        jsxFile: it.filename,
                        onDelete: handleIterationDelete,
                        onAdopt: handleIterationAdopt,
                      },
                    });

                    if (sourceNodeId) {
                      newEdges.push({
                        id: `edge_${sourceNodeId}_${nodeId}`,
                        source: sourceNodeId,
                        target: nodeId,
                        type: 'smoothstep',
                        animated: false,
                        style: ITERATION_EDGE_STYLE,
                      });
                    }

                    newKnownFilenames.push(it.filename);
                  }

                  if (newNodes.length > 0) {
                    const skeletonSet = new Set(skeletonsToRemove);
                    setNodes((nds) => [
                      ...nds.filter((n) => !skeletonSet.has(n.id)),
                      ...newNodes,
                    ]);
                    setEdges((eds) => [
                      ...eds.filter((e) => !skeletonSet.has(e.target)),
                      ...newEdges,
                    ]);
                    coord.appendKnownIterations(newKnownFilenames);
                    if (resetTimeoutOnFind) resetPollTimeout();
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error scanning JSX iterations:', error);
          }
          return;
        }

        const response = await fetch('/playground/api/iterations');
        if (!response.ok) {
          console.error('[Playground] Failed to fetch iterations:', response.status);
          return;
        }

        const { iterations } = (await response.json()) as { iterations: IterationFile[] };

        const currentNodes = coord.getNodes();
        const existingFilenames = getIterationKeysOnCanvas(currentNodes);

        let newIterations = iterations.filter(
          (iter: IterationFile) => !existingFilenames.has(iter.filename),
        );
        if (info?.startNumber != null && info.iterationCount) {
          const cleanName = info.componentName.replace(/\s+/g, '');
          newIterations = newIterations.filter(
            (iter) =>
              iter.componentName === cleanName && isInExpectedBatch(iter.iterationNumber, info),
          );
        }

        if (newIterations.length === 0) {
          return;
        }

        const skeletonsToRemove: string[] = [];
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        const newKnownFilenames: string[] = [];
        const pendingNodesByFilename = new Map<string, string>();

        newIterations.sort((a, b) => a.iterationNumber - b.iterationNumber);

        for (const iter of newIterations) {
          let sourceNodeId: string | undefined;

          if (iter.sourceIteration) {
            const sourceIterNode = findIterationNodeByFilename(iter.sourceIteration);
            if (sourceIterNode) {
              sourceNodeId = sourceIterNode.id;
            } else {
              sourceNodeId = pendingNodesByFilename.get(iter.sourceIteration);
            }
          }

          if (!sourceNodeId) {
            const parentNode = findParentNode(iter.componentName, iter.parentId);
            if (parentNode) {
              sourceNodeId = parentNode.id;
            }
          }

          const sourceNode = sourceNodeId
            ? coord.getNodes().find((n) => n.id === sourceNodeId) ||
              newNodes.find((n) => n.id === sourceNodeId)
            : undefined;

          let position: { x: number; y: number };

          if (info && info.skeletonNodeIds.length > 0) {
            position = resolveIterationPosition(
              info,
              iter.iterationNumber,
              currentNodes,
              skeletonsToRemove,
              sourceNode,
              info.skeletonPositions?.[0],
            );
          } else if (sourceNode) {
            const srcW =
              sourceNode.measured?.width ??
              (sourceNode.type === 'component'
                ? DEFAULT_COMPONENT_NODE_WIDTH
                : DEFAULT_ITERATION_NODE_WIDTH);
            position = {
              x: sourceNode.position.x + srcW + ARRANGE_HORIZONTAL_GAP,
              y: sourceNode.position.y,
            };
          } else {
            const skeletonPos = info?.skeletonPositions?.[0];
            position = skeletonPos ?? { x: 400, y: 200 };
          }

          const nodeId = getNodeId();
          pendingNodesByFilename.set(iter.filename, nodeId);

          const parentSize = sourceNode?.data?.size as ComponentSize | undefined;
          const inheritedRegistryId =
            (sourceNode?.data?.componentId as string | undefined) ??
            (sourceNode?.data?.registryId as string | undefined);

          newNodes.push({
            id: nodeId,
            type: 'iteration',
            position,
            data: {
              componentName: iter.componentName,
              iterationNumber: iter.iterationNumber,
              filename: iter.filename,
              description: iter.description,
              parentNodeId: sourceNodeId || undefined,
              parentSize,
              registryId: inheritedRegistryId,
              onDelete: handleIterationDelete,
              onAdopt: handleIterationAdopt,
            },
          });

          if (sourceNodeId) {
            newEdges.push({
              id: `edge_${sourceNodeId}_${nodeId}`,
              source: sourceNodeId,
              target: nodeId,
              type: 'smoothstep',
              animated: false,
              style: ITERATION_EDGE_STYLE,
            });
          }

          newKnownFilenames.push(iter.filename);
        }

        if (newNodes.length > 0) {
          const skeletonSet = new Set(skeletonsToRemove);
          setNodes((nds) => [
            ...nds.filter((n) => !skeletonSet.has(n.id)),
            ...newNodes,
          ]);
          setEdges((eds) => [
            ...eds.filter((e) => !skeletonSet.has(e.target)),
            ...newEdges,
          ]);
          coord.appendKnownIterations(newKnownFilenames);

          if (resetTimeoutOnFind) {
            resetPollTimeout();
          }
        }
      } catch (error) {
        console.error('Error scanning iterations:', error);
      } finally {
        setIsScanning(false);
        const { queued, override } = coord.releaseScanLock();
        if (queued) {
          scanForIterations(resetTimeoutOnFind, override);
        }
      }
    },
    [
      coord,
      findParentNode,
      findIterationNodeByFilename,
      getNodeId,
      handleIterationDelete,
      handleIterationAdopt,
      setNodes,
      setEdges,
      resetPollTimeout,
    ],
  );

  const startPolling = useCallback(() => {
    if (isPolling) return;

    setIsPolling(true);
    scanForIterations(true);

    pollIntervalRef.current = setInterval(() => {
      scanForIterations(true);
    }, POLL_INTERVAL);

    pollTimeoutRef.current = setTimeout(() => {
      stopPolling();
    }, POLL_DURATION);
  }, [isPolling, scanForIterations, stopPolling]);

  useEffect(() => {
    const handlePromptCopied = () => {
      startPolling();
    };

    const handleFetchRequest = () => {
      scanForIterations(true);
    };

    window.addEventListener(ITERATION_PROMPT_COPIED_EVENT, handlePromptCopied);
    window.addEventListener(ITERATION_FETCH_EVENT, handleFetchRequest);
    return () => {
      window.removeEventListener(ITERATION_PROMPT_COPIED_EVENT, handlePromptCopied);
      window.removeEventListener(ITERATION_FETCH_EVENT, handleFetchRequest);
      stopPolling();
    };
  }, [startPolling, stopPolling, scanForIterations]);

  useEffect(() => {
    scanForIterations(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isGenerating) {
      if (generationPollIntervalRef.current) {
        clearInterval(generationPollIntervalRef.current);
        generationPollIntervalRef.current = null;
      }
      return;
    }

    generationPollIntervalRef.current = setInterval(() => {
      const ctx = coord.getGenerationInfo();
      if (ctx) {
        scanForIterations(false, ctx);
      }
    }, GENERATION_POLL_INTERVAL_MS);

    return () => {
      if (generationPollIntervalRef.current) {
        clearInterval(generationPollIntervalRef.current);
        generationPollIntervalRef.current = null;
      }
    };
  }, [isGenerating, scanForIterations, coord]);

  return { scanForIterations, stopPolling };
}
