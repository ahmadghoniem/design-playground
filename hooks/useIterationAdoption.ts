'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useReactFlow } from '@xyflow/react';
import { generateAdoptPrompt } from '../registry';
import { generateHtmlAdoptPrompt } from '../lib/html-prompts';
import { generateJsxAdoptPrompt } from '../lib/jsx-prompts';
import { getProviderFields } from '../lib/generation-body';
import {
  GENERATION_START_EVENT,
  GENERATION_COMPLETE_EVENT,
  GENERATION_ERROR_EVENT,
  EDIT_COMPLETE_EVENT,
  ADOPTION_COMPLETE_EVENT,
  ADOPTION_ERROR_EVENT,
  FIT_COMPONENT_NODES_EVENT,
  type GenerationStartPayload,
  type GenerationCompletePayload,
  type GenerationErrorPayload,
  type AdoptionCompletePayload,
  type AdoptionErrorPayload,
} from '../lib/constants';
import { useIterationScreenshot } from './useIterationScreenshot';
import { jsxIterationToBaseFile } from '../lib/iteration-filename';

// ---------------------------------------------------------------------------
// useIterationAdoption
//
// Owns the full adoption lifecycle for an iteration node:
//   - open/close the confirm dialog
//   - capture thumbnail on open
//   - POST to /playground/api/generate with the adopt prompt
//   - dispatch ADOPTION_COMPLETE / ADOPTION_ERROR events
//   - update node data + toast
//
// Interface:
//   openAdoptConfirm()    — show the confirm dialog + start thumbnail capture
//   handleAdoptConfirm()  — perform the API call
//   adoptionStatus        — 'idle' | 'adopting' | 'adopted' | 'error'
//   showAdoptConfirm      — whether the dialog is open
//   setShowAdoptConfirm   — close the dialog
//   adoptThumbnail        — data-URL for the preview img (or null)
// ---------------------------------------------------------------------------

export interface UseIterationAdoptionParams {
  id: string;
  registryId: string;
  isHtml: boolean;
  isJsx: boolean;
  isGlobalGenerating: boolean;
  data: {
    componentName: string;
    parentNodeId: string;
    filename: string;
    htmlFolder?: string;
    htmlIterationFolder?: string;
    jsxFile?: string;
    adopted?: boolean;
    onAdopt?: (filename: string, componentName: string) => void;
  };
}

export function useIterationAdoption({
  id,
  registryId,
  isHtml,
  isJsx,
  isGlobalGenerating,
  data,
}: UseIterationAdoptionParams) {
  const [adoptionStatus, setAdoptionStatus] = useState<'idle' | 'adopting' | 'adopted' | 'error'>(
    () => (data.adopted ? 'adopted' : 'idle'),
  );
  const [showAdoptConfirm, setShowAdoptConfirm] = useState(false);
  const [adoptThumbnail, setAdoptThumbnail] = useState<string | null>(null);

  const { updateNodeData } = useReactFlow();
  const { capture } = useIterationScreenshot();

  const openAdoptConfirm = useCallback(() => {
    setShowAdoptConfirm(true);
    setAdoptThumbnail(null);
    // Capture thumbnail asynchronously — dialog renders immediately
    capture(id).then((url) => {
      if (url) setAdoptThumbnail(url);
    });
  }, [id, capture]);

  const handleAdoptConfirm = useCallback(async () => {
    setShowAdoptConfirm(false);
    setAdoptionStatus('adopting');

    const toastId = `adopt-${id}`;

    // Generate the adopt prompt
    let adoptPrompt: string;
    if (isJsx && data.jsxFile) {
      const baseFile = jsxIterationToBaseFile(data.jsxFile);
      adoptPrompt = generateJsxAdoptPrompt(baseFile, data.jsxFile);
    } else if (isHtml && data.htmlFolder && data.htmlIterationFolder) {
      adoptPrompt = generateHtmlAdoptPrompt(data.htmlFolder, data.htmlIterationFolder);
    } else {
      adoptPrompt = generateAdoptPrompt(registryId, data.filename);
    }

    const componentId = isJsx
      ? `jsx:${data.componentName}`
      : isHtml
        ? `html:${data.htmlFolder}`
        : registryId;

    // Dispatch start event (editMode prevents skeleton nodes)
    window.dispatchEvent(
      new CustomEvent<GenerationStartPayload>(GENERATION_START_EVENT, {
        detail: {
          componentId,
          componentName: data.componentName,
          parentNodeId: data.parentNodeId,
          iterationCount: 0,
          editMode: true,
          adoptionMode: true,
          ...(isHtml ? { renderMode: 'html' as const, htmlFolder: data.htmlFolder } : {}),
          ...getProviderFields() as Pick<GenerationStartPayload, 'model' | 'provider'>,
        },
      }),
    );

    try {
      const response = await fetch('/playground/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: adoptPrompt,
          componentId: `adopt-${componentId}`,
          source: 'adopt',
          ...getProviderFields(),
          ...(isHtml ? { htmlFolder: data.htmlFolder } : {}),
        }),
      });

      const result = await response.json().catch(() => ({ success: false, error: 'Invalid response' }));

      if (!response.ok || !result.success) {
        const errorMsg = result?.error || 'Adoption failed';
        window.dispatchEvent(
          new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
            detail: { componentId, parentNodeId: data.parentNodeId, error: errorMsg },
          }),
        );
        window.dispatchEvent(
          new CustomEvent<AdoptionErrorPayload>(ADOPTION_ERROR_EVENT, {
            detail: { iterationNodeId: id, componentId, parentNodeId: data.parentNodeId, error: errorMsg },
          }),
        );
        toast.error(`Adoption failed: ${errorMsg}`, { id: toastId, duration: 6000 });
        setAdoptionStatus('error');
        setTimeout(() => setAdoptionStatus('idle'), 3000);
      } else {
        // Success — refresh the original component
        if (isHtml) {
          window.dispatchEvent(
            new CustomEvent(EDIT_COMPLETE_EVENT, { detail: { nodeId: data.parentNodeId } }),
          );
        }
        window.dispatchEvent(
          new CustomEvent<GenerationCompletePayload>(GENERATION_COMPLETE_EVENT, {
            detail: { componentId, parentNodeId: data.parentNodeId, output: result.output || '' },
          }),
        );
        window.dispatchEvent(
          new CustomEvent<AdoptionCompletePayload>(ADOPTION_COMPLETE_EVENT, {
            detail: { iterationNodeId: id, componentId, parentNodeId: data.parentNodeId },
          }),
        );
        toast.success('Variation adopted! The original component has been updated.', { id: toastId });
        setAdoptionStatus('adopted');
        updateNodeData(id, { adopted: true });
        data.onAdopt?.(data.filename, data.componentName);

        // Pan canvas to the original (parent) component so the user sees the update
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent(FIT_COMPONENT_NODES_EVENT, {
              detail: { componentId },
            }),
          );
        }, 600);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      window.dispatchEvent(
        new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
          detail: { componentId, parentNodeId: data.parentNodeId, error: errorMsg },
        }),
      );
      window.dispatchEvent(
        new CustomEvent<AdoptionErrorPayload>(ADOPTION_ERROR_EVENT, {
          detail: { iterationNodeId: id, componentId, parentNodeId: data.parentNodeId, error: errorMsg },
        }),
      );
      toast.error(`Adoption failed: ${errorMsg}`, { id: toastId, duration: 6000 });
      setAdoptionStatus('error');
      setTimeout(() => setAdoptionStatus('idle'), 3000);
    }
  }, [id, registryId, isHtml, isJsx, data, updateNodeData]);

  return {
    adoptionStatus,
    showAdoptConfirm,
    setShowAdoptConfirm,
    adoptThumbnail,
    openAdoptConfirm,
    handleAdoptConfirm,
  };
}
