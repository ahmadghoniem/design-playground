'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Node } from '@xyflow/react';
import { getProviderFields } from '../lib/generation-body';
import { DEFAULT_PROVIDER_ID } from '../lib/providers/registry';
import { resolveAgentModel } from '../lib/resolve-agent-model';
import type { ProviderId } from '../lib/providers/types';
import { loadDefaultSkillPrompt } from '../lib/load-default-skill-prompt';
import {
  generateIterationPrompt,
  generateIterationFromIterationPrompt,
  generateElementIterationPrompt,
  generateElementIterationFromIterationPrompt,
  resolveRegistryItem,
} from '../registry';
import {
  formatReferenceNodesSection,
  formatSkillSection,
  formatCustomInstructionsSection,
  getStylingConstraint,
} from '../prompts/shared-sections';
import { freeformReferencePrompt } from '../prompts/freeform-reference.prompt';
import { editPrompt } from '../prompts/edit.prompt';
import { pickPlanFrameName } from '../lib/plan-frame-name';
import { generateHtmlIterationPrompt, generateHtmlIterationFromIterationPrompt } from '../lib/html-prompts';
import { generateJsxIterationPrompt, generateJsxIterationFromIterationPrompt } from '../lib/jsx-prompts';
import { captureAndSaveScreenshot, getScreenshotFilename } from '../lib/captureAndSaveScreenshot';
import {
  GENERATION_START_EVENT,
  GENERATION_COMPLETE_EVENT,
  GENERATION_ERROR_EVENT,
  GENERATION_QUEUED_EVENT,
  POST_GENERATION_SCAN_DELAY,
  DEFAULT_EMPTY_ITERATION_INSTRUCTIONS,
  DEFAULT_STYLING_MODE,
  CHAT_DEFAULT_COUNT,
  CHAT_DEFAULT_DEPTH,
  ENABLE_FREEFORM_CHAT,
  canSubmitReferenceOnlyChat,
  JSX_COMPONENT_ADDED_EVENT,
  EDIT_COMPLETE_EVENT,
  type StylingMode,
  type GenerationStartPayload,
  type GenerationCompletePayload,
  type GenerationErrorPayload,
  type GenerationQueuedPayload,
  type ChatSubmitPayload,
  type JsxComponentInfo,
} from '../lib/constants';
import type { GenerationInfo } from '../lib/canvas-persistence';
import type { GenerationCoordination } from './useGenerationCoordination';
import { toast } from 'sonner';

export interface UseChatSubmitParams {
  coord: GenerationCoordination;
  getNodeId: () => string;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  scanForIterations: (
    resetTimeoutOnFind?: boolean,
    scanContext?: GenerationInfo | null,
  ) => Promise<void>;
}

export function useChatSubmit({
  coord,
  getNodeId,
  setNodes,
  scanForIterations,
}: UseChatSubmitParams) {
  const generationQueueRef = useRef<ChatSubmitPayload[]>([]);

  const handleChatSubmit = useCallback(async (payload: ChatSubmitPayload) => {
    // If generation already in progress, queue it
    if (coord.getIsGenerating()) {
      generationQueueRef.current.push(payload);
      const queuePf = getProviderFields();
      const queueProvider = (queuePf.provider ?? DEFAULT_PROVIDER_ID) as ProviderId;
      window.dispatchEvent(
        new CustomEvent<GenerationQueuedPayload>(GENERATION_QUEUED_EVENT, {
          detail: {
            componentId: payload.targetComponentId || 'chat-freeform',
            model: resolveAgentModel(queueProvider, payload.model) ?? 'auto',
            provider: queuePf.provider as GenerationQueuedPayload['provider'],
            flowPosition: payload.canvasPosition ?? null,
            targetNodeId: payload.targetNodeId ?? null,
          },
        }),
      );
      return;
    }

    const chatMode = payload.chatMode ?? (payload.editMode ? 'edit' : 'explore');
    const isRawMode = chatMode === 'raw';
    const rawPrompt = payload.text.trim();

    if (payload.renderMode === 'embed' && payload.targetNodeId) {
      toast.error(
        'URL embed frames cannot be the chat target. Place chat on a React, HTML, or JSX frame, or use the embed only as a reference (shift-select).',
      );
      return;
    }

    const hasFreeformContext =
      payload.skillPrompts.length > 0 || (payload.referenceNodes?.length ?? 0) > 0;
    if (isRawMode && !rawPrompt && !hasFreeformContext) return;

    const hasTarget =
      payload.targetNodeId &&
      payload.targetComponentId &&
      payload.targetComponentName &&
      payload.targetType;
    if (
      !hasTarget &&
      !ENABLE_FREEFORM_CHAT &&
      !canSubmitReferenceOnlyChat({
        hasEditTarget: false,
        referenceNodeCount: payload.referenceNodes?.length ?? 0,
        skillPromptCount: payload.skillPrompts.length,
        text: payload.text,
      })
    ) {
      return;
    }

    // ── Edit Mode: modify file in-place, no iterations ──
    if (chatMode === 'edit' && payload.targetNodeId) {
      const isHtmlEdit = payload.renderMode === 'html';
      const isJsxEdit = payload.renderMode === 'jsx' && !!payload.jsxFile;
      const editComponentId = payload.targetComponentId || 'edit-mode';
      const editComponentName = payload.targetComponentName || editComponentId;
      let filePath: string;

      if (isHtmlEdit) {
        if (payload.htmlIterationFolder) {
          filePath = `public/${payload.htmlPageSlug}/${payload.htmlIterationFolder}/index.html`;
        } else {
          filePath = `public/${payload.htmlPageSlug}/index.html`;
        }
      } else if (isJsxEdit) {
        filePath = `src/app/playground/canvas-components/${payload.jsxFile}`;
      } else if (payload.targetType === 'iteration' && payload.sourceFilename) {
        filePath = `src/app/playground/iterations/${payload.sourceFilename}`;
      } else {
        const item = resolveRegistryItem(editComponentId);
        filePath = item?.sourcePath || `src/app/playground/iterations/${editComponentId}`;
      }

      // Gather skill prompts (same logic as normal path)
      let editSkillPrompt: string | undefined;
      if (payload.skillPrompts.length > 0) {
        editSkillPrompt = payload.skillPrompts.join('\n\n');
      } else if (!payload.text) {
        const defaultPrompt = await loadDefaultSkillPrompt();
        editSkillPrompt = defaultPrompt || undefined;
      }

      // Capture screenshot of the target node
      const editScreenshotFilename = getScreenshotFilename(editComponentName, payload.sourceFilename);
      const editScreenshotPath = await captureAndSaveScreenshot(payload.targetNodeId, editScreenshotFilename);

      // Build reference nodes section
      let editRefSection = '';
      if (payload.referenceNodes && payload.referenceNodes.length > 0) {
        const refNodes = payload.referenceNodes.filter((n) => n.nodeId !== payload.targetNodeId);
        if (refNodes.length > 0) {
          const refNodesWithScreenshots = await Promise.all(
            refNodes.map(async (node) => {
              if (node.type === 'text') {
                const textNode = coord.getNodes().find((n) => n.id === node.nodeId);
                return { ...node, textContent: (textNode?.data as Record<string, unknown>)?.text as string || '', screenshotPath: undefined, sourcePath: undefined };
              }
              if (node.type === 'image') {
                return { ...node, screenshotPath: node.imagePath, sourcePath: undefined };
              }
              const ssFilename = getScreenshotFilename(node.componentName, node.sourceFilename);
              const ssPath = await captureAndSaveScreenshot(node.nodeId, ssFilename);
              let sourcePath: string | undefined;
              if (node.type === 'component') {
                const regItem = resolveRegistryItem(node.componentId);
                sourcePath = regItem?.sourcePath;
              }
              return { ...node, screenshotPath: ssPath ?? undefined, sourcePath };
            }),
          );
          editRefSection = formatReferenceNodesSection(refNodesWithScreenshots);
        }
      }

      const prompt = editPrompt({
        filePath,
        customInstructions: payload.text || 'Improve the design',
        skillPrompt: editSkillPrompt,
        screenshotPath: editScreenshotPath ?? undefined,
        referenceNodesSection: editRefSection || undefined,
        elementSelections: payload.elementSelections,
      });

      const editPf = getProviderFields();
      const editProvider = (editPf.provider ?? DEFAULT_PROVIDER_ID) as ProviderId;
      const editResolvedModel = resolveAgentModel(editProvider, payload.model);
      // Dispatch GENERATION_START_EVENT so the presence bubble appears
      window.dispatchEvent(
        new CustomEvent<GenerationStartPayload>(GENERATION_START_EVENT, {
          detail: {
            componentId: editComponentId,
            componentName: editComponentName,
            parentNodeId: payload.targetNodeId,
            iterationCount: 0,
            model: editResolvedModel,
            provider: editPf.provider as GenerationStartPayload['provider'],
            flowPosition: payload.canvasPosition,
            targetNodeId: payload.targetNodeId,
            editMode: true,
            ...(isHtmlEdit ? { renderMode: 'html' as const, htmlFolder: payload.htmlPageSlug } : {}),
            ...(isJsxEdit && payload.jsxFile
              ? { renderMode: 'jsx' as const, jsxFile: payload.jsxFile }
              : {}),
          },
        }),
      );

      try {
        const response = await fetch('/playground/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            componentId: editComponentId,
            model: editResolvedModel,
            source: 'chat_edit',
            skillIds: payload.skillIds,
            ...getProviderFields(),
            ...(isHtmlEdit ? { htmlFolder: payload.htmlPageSlug } : {}),
            ...(isJsxEdit && payload.jsxFile ? { jsxFile: payload.jsxFile } : {}),
          }),
        });
        const data = await response.json().catch(() => ({ success: false }));
        if (!response.ok || !data.success) {
          console.error('[EditMode] Generation failed:', data?.error, 'status:', response.status, 'data:', data);
          toast.error(data?.error || `Edit failed (${response.status})`, { duration: 6000 });
          window.dispatchEvent(
            new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
              detail: { componentId: editComponentId, parentNodeId: payload.targetNodeId, error: data?.error || 'Edit failed' },
            }),
          );
        } else {
          if (isHtmlEdit) {
            // Dispatch edit complete to refresh iframes
            window.dispatchEvent(new CustomEvent(EDIT_COMPLETE_EVENT, {
              detail: { nodeId: payload.targetNodeId },
            }));
          } else if (isJsxEdit) {
            window.dispatchEvent(new Event(JSX_COMPONENT_ADDED_EVENT));
          }
          window.dispatchEvent(
            new CustomEvent<GenerationCompletePayload>(GENERATION_COMPLETE_EVENT, {
              detail: { componentId: editComponentId, parentNodeId: payload.targetNodeId, output: '' },
            }),
          );
        }
      } catch (err) {
        console.error('[EditMode] Error:', err);
        toast.error(err instanceof Error ? err.message : 'Unknown error', { duration: 6000 });
        window.dispatchEvent(
          new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
            detail: { componentId: editComponentId, parentNodeId: payload.targetNodeId, error: String(err) },
          }),
        );
      }
      return;
    }

    const {
      text,
      skillPrompts,
      model: payloadModel,
      targetNodeId,
      targetComponentId,
      targetComponentName,
      targetType,
      sourceFilename,
    } = payload;

    const canvasGenPfEarly = getProviderFields();
    const genProvider = (canvasGenPfEarly.provider ?? DEFAULT_PROVIDER_ID) as ProviderId;
    const resolvedModel = resolveAgentModel(genProvider, payloadModel);

    // Combine skill prompts — explicit skills always apply (including raw / text-only refs)
    let combinedSkillPrompt: string | undefined;
    if (skillPrompts.length > 0) {
      combinedSkillPrompt = skillPrompts.join('\n\n');
    } else if (!isRawMode && !text) {
      // Use default skills only when no explicit skills selected and text is empty
      const defaultPrompt = await loadDefaultSkillPrompt();
      combinedSkillPrompt = defaultPrompt || undefined;
    }

    const customInstructions = isRawMode
      ? rawPrompt
      : (text || DEFAULT_EMPTY_ITERATION_INSTRUCTIONS);
    const hasElementSelections = (payload.elementSelections?.length ?? 0) > 0;
    const stylingMode: StylingMode = payload.skillIds?.includes('no-bound-explore')
      ? 'inline-css' : DEFAULT_STYLING_MODE;

    // Build reference nodes section from canvas selection (text/image/component refs)
    let referenceNodesSection = '';
    if (payload.referenceNodes && payload.referenceNodes.length > 0) {
      // Filter out the target node from references (no need to reference itself)
      const refNodes = payload.referenceNodes.filter((n) => n.nodeId !== targetNodeId);

      if (refNodes.length > 0) {
        // Capture screenshots for each reference node
        const refNodesWithScreenshots = await Promise.all(
          refNodes.map(async (node) => {
            // Text nodes pass their content directly — no screenshot needed
            if (node.type === 'text') {
              const textNode = coord.getNodes().find((n) => n.id === node.nodeId);
              return {
                ...node,
                textContent: (textNode?.data as Record<string, unknown>)?.text as string || '',
                screenshotPath: undefined,
                sourcePath: undefined,
              };
            }
            // Image nodes already have the image — no need to capture a screenshot
            if (node.type === 'image') {
              return {
                ...node,
                screenshotPath: node.imagePath,
                sourcePath: undefined,
              };
            }
            const screenshotFilename = getScreenshotFilename(
              node.componentName,
              node.sourceFilename,
            );
            const screenshotPath = await captureAndSaveScreenshot(
              node.nodeId,
              screenshotFilename,
            );
            // Resolve source path from registry for component nodes
            let sourcePath: string | undefined;
            if (node.type === 'component') {
              const item = resolveRegistryItem(node.componentId);
              sourcePath = item?.sourcePath;
            }
            return {
              ...node,
              screenshotPath: screenshotPath ?? undefined,
              sourcePath,
            };
          }),
        );
        referenceNodesSection = formatReferenceNodesSection(refNodesWithScreenshots);
      }
    }

    const isHtmlTarget = payload.renderMode === 'html' && !!payload.htmlPageSlug;
    const isJsxTarget = payload.renderMode === 'jsx' && !!payload.jsxFile;
    const canvasGenPf = getProviderFields();

    if (targetNodeId && targetComponentId && targetComponentName && targetType) {
      // --- WITH TARGET NODE ---
      let prompt = rawPrompt;
      const componentId = targetComponentId;
      const componentName = targetComponentName;
      const iterationCount = payload.iterationCount ?? CHAT_DEFAULT_COUNT;
      let startNumber = 1;
      let screenshotPath: string | undefined;

      if (isRawMode) {
        prompt = rawPrompt;
      } else {
        // Fetch next available iteration number
        try {
          if (isHtmlTarget) {
            const response = await fetch('/playground/api/html-pages');
            if (response.ok) {
              const { pages } = await response.json();
              const page = pages.find((p: { folder: string }) => p.folder === payload.htmlPageSlug);
              const maxNumber = page?.iterations.reduce(
                (max: number, i: { number: number }) => Math.max(max, i.number), 0
              ) ?? 0;
              startNumber = maxNumber + 1;
            }
          } else if (isJsxTarget && payload.jsxFile) {
            const baseFilename = payload.jsxFile.replace(/\.iteration-\d+\.tsx$/, '.tsx');
            const response = await fetch('/playground/api/oncanvas-components');
            if (response.ok) {
              const { components } = await response.json() as { components: JsxComponentInfo[] };
              const comp = components.find(c => c.filename === baseFilename);
              const maxNumber = comp?.iterations.reduce(
                (max: number, i: { iterationNumber: number }) => Math.max(max, i.iterationNumber),
                0,
              ) ?? 0;
              startNumber = maxNumber + 1;
            }
          } else {
            const cleanName = componentName.replace(/\s+/g, '');
            const response = await fetch('/playground/api/iterations');
            if (response.ok) {
              const { iterations } = await response.json();
              const componentIterations = iterations.filter(
                (i: { componentName: string }) => i.componentName === cleanName
              );
              const maxNumber = componentIterations.reduce(
                (max: number, i: { iterationNumber: number }) =>
                  Math.max(max, i.iterationNumber),
                0
              );
              startNumber = maxNumber + 1;
            }
          }
        } catch { /* use default */ }

        // Capture screenshot of the target node
        const screenshotFilename = getScreenshotFilename(componentName, sourceFilename);
        screenshotPath = (await captureAndSaveScreenshot(targetNodeId, screenshotFilename)) ?? undefined;
      }

      if (!isRawMode && isHtmlTarget && payload.htmlPageSlug) {
        // HTML iteration
        if (targetType === 'iteration' && payload.htmlIterationFolder) {
          prompt = generateHtmlIterationFromIterationPrompt(
            payload.htmlPageSlug,
            payload.htmlIterationFolder,
            iterationCount,
            startNumber,
            customInstructions,
            combinedSkillPrompt,
            screenshotPath,
          );
        } else {
          prompt = generateHtmlIterationPrompt(
            payload.htmlPageSlug,
            iterationCount,
            startNumber,
            customInstructions,
            combinedSkillPrompt,
            screenshotPath,
          );
        }
      } else if (!isRawMode && isJsxTarget && payload.jsxFile) {
        const baseFile = payload.jsxFile.replace(/\.iteration-\d+\.tsx$/, '.tsx');
        if (targetType === 'iteration' && sourceFilename) {
          prompt = generateJsxIterationFromIterationPrompt(
            baseFile,
            sourceFilename,
            iterationCount,
            startNumber,
            customInstructions,
            combinedSkillPrompt,
            screenshotPath,
          );
        } else {
          prompt = generateJsxIterationPrompt(
            baseFile,
            iterationCount,
            startNumber,
            customInstructions,
            combinedSkillPrompt,
            screenshotPath,
          );
        }
      } else if (!isRawMode && targetType === 'iteration' && sourceFilename) {
        // Iterate from iteration
        if (hasElementSelections) {
          prompt = generateElementIterationFromIterationPrompt(
            componentId,
            sourceFilename,
            startNumber,
            iterationCount,
            CHAT_DEFAULT_DEPTH,
            payload.elementSelections,
            customInstructions,
            combinedSkillPrompt,
            stylingMode,
            screenshotPath,
            referenceNodesSection,
          );
        } else {
          prompt = generateIterationFromIterationPrompt(
            componentId,
            sourceFilename,
            iterationCount,
            startNumber,
            CHAT_DEFAULT_DEPTH,
            customInstructions,
            combinedSkillPrompt,
            stylingMode,
            screenshotPath,
            referenceNodesSection,
          );
        }
      } else if (!isRawMode) {
        // Component iteration
        if (hasElementSelections) {
          prompt = generateElementIterationPrompt(
            componentId,
            startNumber,
            iterationCount,
            CHAT_DEFAULT_DEPTH,
            payload.elementSelections,
            customInstructions,
            combinedSkillPrompt,
            stylingMode,
            screenshotPath,
            referenceNodesSection,
          );
        } else {
          prompt = generateIterationPrompt(
            componentId,
            iterationCount,
            startNumber,
            CHAT_DEFAULT_DEPTH,
            customInstructions,
            combinedSkillPrompt,
            stylingMode,
            screenshotPath,
            referenceNodesSection,
          );
        }
      }

      // Dispatch generation start (creates skeleton nodes)
      window.dispatchEvent(
        new CustomEvent<GenerationStartPayload>(GENERATION_START_EVENT, {
          detail: {
            componentId,
            componentName,
            parentNodeId: targetNodeId,
            iterationCount,
            startNumber,
            model: resolvedModel,
            provider: canvasGenPf.provider as GenerationStartPayload['provider'],
            flowPosition: payload.canvasPosition,
            targetNodeId,
            ...(isHtmlTarget ? { renderMode: 'html' as const, htmlFolder: payload.htmlPageSlug } : {}),
            ...(isJsxTarget && payload.jsxFile
              ? { renderMode: 'jsx' as const, jsxFile: payload.jsxFile }
              : {}),
          },
        }),
      );

      // Call the generate API
      try {
        const response = await fetch('/playground/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            componentId,
            iterationCount,
            model: resolvedModel,
            source: 'chat',
            skillIds: payload.skillIds,
            ...canvasGenPf,
            ...(isHtmlTarget ? { htmlFolder: payload.htmlPageSlug } : {}),
            ...(isJsxTarget && payload.jsxFile ? { jsxFile: payload.jsxFile } : {}),
          }),
        });

        let data;
        try {
          data = await response.json();
        } catch {
          window.dispatchEvent(
            new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
              detail: { componentId, parentNodeId: targetNodeId, error: 'Failed to parse response' },
            }),
          );
          return;
        }

        if (!response.ok || !data.success) {
          const error = typeof data?.error === 'string' ? data.error : 'Generation failed';
          window.dispatchEvent(
            new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
              detail: { componentId, parentNodeId: targetNodeId, error },
            }),
          );
        } else {
          window.dispatchEvent(
            new CustomEvent<GenerationCompletePayload>(GENERATION_COMPLETE_EVENT, {
              detail: { componentId, parentNodeId: targetNodeId, output: '' },
            }),
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        window.dispatchEvent(
          new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
            detail: { componentId, parentNodeId: targetNodeId, error: msg },
          }),
        );
      }
    } else if (payload.skillIds?.includes('visualise-plan')) {
      // --- VISUALISE PLAN: create HTML frame on canvas, then edit in place ---
      let planText = text || rawPrompt;
      if (payload.referenceNodes?.length) {
        for (const ref of payload.referenceNodes) {
          if (ref.type !== 'text') continue;
          const textNode = coord.getNodes().find((n) => n.id === ref.nodeId);
          const noteText = (textNode?.data as Record<string, unknown>)?.text;
          if (typeof noteText === 'string' && noteText.trim()) {
            planText = noteText;
            break;
          }
        }
      }

      const frameName = await pickPlanFrameName(planText);
      const position = payload.canvasPosition ?? { x: 0, y: 0 };

      let pageId: string;
      let folder: string;
      try {
        const createRes = await fetch('/playground/api/html-pages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: frameName }),
        });
        const createData = await createRes.json().catch(() => ({}));
        if (!createRes.ok) {
          toast.error(createData?.error || 'Failed to create HTML frame', { duration: 6000 });
          return;
        }
        pageId = createData.page.id as string;
        folder = createData.page.folder as string;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create HTML frame', { duration: 6000 });
        return;
      }

      const newNodeId = getNodeId();
      setNodes((nds) =>
        nds.concat({
          id: newNodeId,
          type: 'component',
          position,
          data: {
            componentId: pageId,
            renderMode: 'html' as const,
            htmlFolder: folder,
          },
        }),
      );
      window.dispatchEvent(new CustomEvent('playground:html-pages-updated'));

      const editSkillPrompt = combinedSkillPrompt;
      const visualiseInstructions =
        text ||
        rawPrompt ||
        'Visualise the referenced plan as interactive HTML per the skill instructions. Replace the placeholder page content entirely.';
      const prompt = editPrompt({
        filePath: `public/${folder}/index.html`,
        customInstructions: visualiseInstructions,
        skillPrompt: editSkillPrompt,
        referenceNodesSection: referenceNodesSection || undefined,
      });

      window.dispatchEvent(
        new CustomEvent<GenerationStartPayload>(GENERATION_START_EVENT, {
          detail: {
            componentId: pageId,
            componentName: folder,
            parentNodeId: newNodeId,
            iterationCount: 0,
            model: resolvedModel,
            provider: canvasGenPf.provider as GenerationStartPayload['provider'],
            flowPosition: payload.canvasPosition ?? undefined,
            targetNodeId: newNodeId,
            editMode: true,
            renderMode: 'html' as const,
            htmlFolder: folder,
          },
        }),
      );

      try {
        const response = await fetch('/playground/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            componentId: pageId,
            model: resolvedModel,
            source: 'visualise_plan',
            skillIds: payload.skillIds,
            htmlFolder: folder,
            ...canvasGenPf,
          }),
        });
        const data = await response.json().catch(() => ({ success: false }));
        if (!response.ok || !data.success) {
          console.error('[VisualisePlan] Generation failed:', data?.error);
          toast.error(data?.error || 'Plan visualisation failed', { duration: 6000 });
          window.dispatchEvent(
            new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
              detail: { componentId: pageId, parentNodeId: newNodeId, error: data?.error || 'Generation failed' },
            }),
          );
        } else {
          window.dispatchEvent(new CustomEvent(EDIT_COMPLETE_EVENT, { detail: { nodeId: newNodeId } }));
          window.dispatchEvent(
            new CustomEvent<GenerationCompletePayload>(GENERATION_COMPLETE_EVENT, {
              detail: { componentId: pageId, parentNodeId: newNodeId, output: '' },
            }),
          );
        }
      } catch (err) {
        console.error('[VisualisePlan] Generation error:', err);
        const msg = err instanceof Error ? err.message : 'Unknown error';
        toast.error(msg, { duration: 6000 });
        window.dispatchEvent(
          new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
            detail: { componentId: pageId, parentNodeId: newNodeId, error: msg },
          }),
        );
      }
    } else {
      // --- FREEFORM (no target) ---
      const freeformComponentId = 'chat-freeform';

      // Dispatch start event — creates skeleton node + presence bubble
      window.dispatchEvent(
        new CustomEvent<GenerationStartPayload>(GENERATION_START_EVENT, {
          detail: {
            componentId: freeformComponentId,
            componentName: 'Freeform',
            parentNodeId: '',
            iterationCount: 0,
            model: resolvedModel,
            provider: canvasGenPf.provider as GenerationStartPayload['provider'],
            flowPosition: payload.canvasPosition ?? undefined,
          },
        }),
      );

      // Build prompt — freeform-reference template or raw text
      let freeformPrompt: string;
      if (isRawMode) {
        if (referenceNodesSection || combinedSkillPrompt) {
          freeformPrompt = freeformReferencePrompt({
            skillSection: combinedSkillPrompt ? formatSkillSection(combinedSkillPrompt) : '',
            referenceNodesSection: referenceNodesSection || '',
            customInstructionsSection: formatCustomInstructionsSection(
              rawPrompt || customInstructions,
            ),
            stylingConstraint: getStylingConstraint(stylingMode),
          });
        } else {
          freeformPrompt = rawPrompt;
        }
      } else if (referenceNodesSection) {
        freeformPrompt = freeformReferencePrompt({
          skillSection: combinedSkillPrompt ? formatSkillSection(combinedSkillPrompt) : '',
          referenceNodesSection,
          customInstructionsSection: formatCustomInstructionsSection(customInstructions),
          stylingConstraint: getStylingConstraint(stylingMode),
        });
      } else {
        freeformPrompt = customInstructions;
      }

      try {
        const response = await fetch('/playground/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: freeformPrompt,
            componentId: 'chat-freeform',
            iterationCount: 0,
            model: resolvedModel,
            source: 'chat_freeform',
            skillIds: payload.skillIds,
            ...canvasGenPf,
          }),
        });

        const data = await response.json().catch(() => ({ success: false }));
        if (!response.ok || !data.success) {
          console.error('[Chat] Freeform generation failed:', data?.error);
          window.dispatchEvent(
            new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
              detail: { componentId: freeformComponentId, parentNodeId: '', error: data?.error || 'Generation failed' },
            }),
          );
        } else {
          window.dispatchEvent(
            new CustomEvent<GenerationCompletePayload>(GENERATION_COMPLETE_EVENT, {
              detail: { componentId: freeformComponentId, parentNodeId: '', output: '' },
            }),
          );
        }
      } catch (err) {
        console.error('[Chat] Freeform generation error:', err);
        const msg = err instanceof Error ? err.message : 'Unknown error';
        window.dispatchEvent(
          new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
            detail: { componentId: freeformComponentId, parentNodeId: '', error: msg },
          }),
        );
      } finally {
        // State cleanup and queue draining handled by GENERATION_COMPLETE/ERROR event handlers
        // Only clear state here as a safety net if events didn't fire (e.g. network error before dispatch)
        if (coord.getGenerationInfo()?.componentId === freeformComponentId) {
          coord.clearGenerationEager();
        }
      }
    }
  }, [coord, getNodeId, setNodes, scanForIterations]);

  // Also drain queue after normal generation completes
  // (hook into generation complete/error to check queue)
  useEffect(() => {
    const drainQueue = () => {
      setTimeout(() => {
        if (generationQueueRef.current.length > 0) {
          const next = generationQueueRef.current.shift()!;
          handleChatSubmit(next);
        }
      }, POST_GENERATION_SCAN_DELAY + 500);
    };

    window.addEventListener(GENERATION_COMPLETE_EVENT, drainQueue);
    window.addEventListener(GENERATION_ERROR_EVENT, drainQueue);
    return () => {
      window.removeEventListener(GENERATION_COMPLETE_EVENT, drainQueue);
      window.removeEventListener(GENERATION_ERROR_EVENT, drainQueue);
    };
  }, [handleChatSubmit]);

  return { handleChatSubmit };
}
