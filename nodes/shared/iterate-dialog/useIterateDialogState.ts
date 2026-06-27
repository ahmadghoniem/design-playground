'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { PlaygroundSkill } from '../../../skills';
import { useImpeccableSkillPicker } from '../../../hooks/useImpeccableSkillPicker';
import { impeccablePromptFromSegment } from '../../../lib/impeccable-skill';
import { SKILLS_CHANGED_EVENT, DEFAULT_EMPTY_ITERATION_INSTRUCTIONS } from '../../../lib/constants';
import type { Segment, InlineReferenceHandle } from '../../../ui/inline-reference';
import { loadSelectedModel, saveSelectedModel, useAvailableModels } from './parts';

// ---------------------------------------------------------------------------
// useIterateDialogState
//
// Owns all form state for the IterateDialog:
//   - model selection (with localStorage persistence)
//   - variation count
//   - inline-reference segments → custom instructions + skill prompt
//   - skills list (loaded lazily when dialog opens)
//   - the ImpeccableSkillPicker sub-state
// ---------------------------------------------------------------------------

export interface IterateDialogFormState {
  // Model
  selectedModel: string;
  handleModelChange: (model: string) => void;
  models: ReturnType<typeof useAvailableModels>['models'];
  isLoadingModels: boolean;

  // Count
  iterationCount: number;
  setIterationCount: (n: number) => void;
  previousIterationCountBeforeDragRef: React.MutableRefObject<number>;

  // Skills / inline-reference
  segments: Segment[];
  setSegments: (s: Segment[]) => void;
  skills: PlaygroundSkill[];
  isLoadingSkills: boolean;
  skillsById: Map<string, PlaygroundSkill>;
  customInstructionsText: string | undefined;
  skillPrompt: string | undefined;

  // ImpeccableSkillPicker passthrough
  impeccableSubMenuOpen: boolean;
  setImpeccableSubMenuOpen: (v: boolean) => void;
  demoteState: ReturnType<typeof useImpeccableSkillPicker>['demoteState'];
  skillPickerItems: ReturnType<typeof useImpeccableSkillPicker>['skillPickerItems'];
  skillPickerFilterFn: ReturnType<typeof useImpeccableSkillPicker>['skillPickerFilterFn'];
  handleSelectItem: ReturnType<typeof useImpeccableSkillPicker>['handleSelectItem'];
  handleImpeccableCommandCleared: ReturnType<typeof useImpeccableSkillPicker>['handleImpeccableCommandCleared'];
  closeDemoteMenu: ReturnType<typeof useImpeccableSkillPicker>['closeDemoteMenu'];
  resetImpeccablePicker: ReturnType<typeof useImpeccableSkillPicker>['resetImpeccablePicker'];

  // Refs exposed so JSX can wire them up
  inlineRefHandle: React.MutableRefObject<InlineReferenceHandle | null>;
  inlineRefContainerRef: React.MutableRefObject<HTMLDivElement | null>;
}

export function useIterateDialogState(open: boolean): IterateDialogFormState {
  const [selectedModel, setSelectedModel] = useState(() => loadSelectedModel());
  const [iterationCount, setIterationCount] = useState(4);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [skills, setSkills] = useState<PlaygroundSkill[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const previousIterationCountBeforeDragRef = useRef(iterationCount);
  const inlineRefHandle = useRef<InlineReferenceHandle | null>(null);
  const inlineRefContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    impeccableSubMenuOpen,
    setImpeccableSubMenuOpen,
    demoteState,
    skillPickerItems,
    skillPickerFilterFn,
    handleSelectItem,
    handleImpeccableCommandCleared,
    closeDemoteMenu,
    resetImpeccablePicker,
  } = useImpeccableSkillPicker(skills);

  const { models, isLoading: isLoadingModels } = useAvailableModels();

  const handleModelChange = useCallback((model: string) => {
    setSelectedModel(model);
    saveSelectedModel(model);
  }, []);

  // When the provider changes, auto-select the first enabled model if the
  // current selection isn't valid for the new provider.
  useEffect(() => {
    if (models.length > 0 && !models.some(m => m.value === selectedModel)) {
      handleModelChange(models[0].value);
    }
  }, [models, selectedModel, handleModelChange]);

  // Load available skills when the dialog opens (once) and whenever skills change
  const refetchSkills = useCallback(async () => {
    setIsLoadingSkills(true);
    try {
      const response = await fetch('/playground/api/skills');
      if (!response.ok) return;
      const data = (await response.json()) as { skills?: PlaygroundSkill[] };
      if (Array.isArray(data.skills)) {
        setSkills(data.skills);
      }
    } catch {
      // ignore – inline reference will just have no skill items
    } finally {
      setIsLoadingSkills(false);
    }
  }, []);

  useEffect(() => {
    if (!open || skills.length > 0) return;
    refetchSkills();
  }, [open, skills.length, refetchSkills]);

  useEffect(() => {
    const handler = () => { refetchSkills(); };
    window.addEventListener(SKILLS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SKILLS_CHANGED_EVENT, handler);
  }, [refetchSkills]);

  const skillsById = useMemo(() => {
    const map = new Map<string, PlaygroundSkill>();
    for (const skill of skills) {
      map.set(skill.id, skill);
    }
    return map;
  }, [skills]);

  const getDefaultSkillPrompt = useCallback(
    (skillMap: Map<string, PlaygroundSkill>): string | undefined => {
      if (skillMap.size === 0) return undefined;
      const DEFAULT_SKILL_IDS = ['design-variations', 'frontend-design'] as const;
      const parts: string[] = [];
      for (const id of DEFAULT_SKILL_IDS) {
        const skill = skillMap.get(id);
        const sp = skill?.skillPath?.trim();
        if (sp) parts.push(sp);
      }
      if (!parts.length) return undefined;
      return parts.join('\n\n');
    },
    [],
  );

  // Derive freeform instructions + skill prompt from inline reference segments
  const { customInstructionsText, skillPrompt } = useMemo(() => {
    const hasSegments = !!segments && segments.length > 0;

    const textParts: string[] = [];
    const skillSections: string[] = [];

    if (hasSegments) {
      for (const segment of segments) {
        if (segment.type === 'text') {
          const trimmed = segment.value.trim();
          if (trimmed) {
            textParts.push(trimmed);
          }
        } else if (segment.type === 'reference') {
          const impeccablePrompt = impeccablePromptFromSegment(
            segment,
            skillsById.get('impeccable')?.skillPath,
          );
          if (impeccablePrompt) {
            skillSections.push(impeccablePrompt);
          } else {
            const skill = skillsById.get(segment.value);
            const p = skill?.skillPath?.trim();
            if (p) skillSections.push(p);
          }
        }
      }
    }

    let customInstructionsText =
      textParts.join('\n').trim() || undefined;

    let skillPromptText =
      skillSections.join('\n\n').trim() || undefined;

    // When the inline reference area is empty (no text, no explicit skills),
    // automatically apply the default design skills.
    if (!hasSegments && !skillPromptText) {
      skillPromptText = getDefaultSkillPrompt(skillsById);
    }

    // When the inline reference is completely empty, also add a default
    // instruction line at the end of the prompt.
    if (!hasSegments && !customInstructionsText) {
      customInstructionsText = DEFAULT_EMPTY_ITERATION_INSTRUCTIONS;
    }

    return { customInstructionsText, skillPrompt: skillPromptText };
  }, [segments, skillsById, getDefaultSkillPrompt]);

  return {
    selectedModel,
    handleModelChange,
    models,
    isLoadingModels,
    iterationCount,
    setIterationCount,
    previousIterationCountBeforeDragRef,
    segments,
    setSegments,
    skills,
    isLoadingSkills,
    skillsById,
    customInstructionsText,
    skillPrompt,
    impeccableSubMenuOpen,
    setImpeccableSubMenuOpen,
    demoteState,
    skillPickerItems,
    skillPickerFilterFn,
    handleSelectItem,
    handleImpeccableCommandCleared,
    closeDemoteMenu,
    resetImpeccablePicker,
    inlineRefHandle,
    inlineRefContainerRef,
  };
}
