import type { PlaygroundSkill } from '../skills';

const DEFAULT_SKILL_IDS = ['design-variations', 'frontend-design'] as const;
let cachedDefaultSkillPrompt: string | null = null;

export async function loadDefaultSkillPrompt(): Promise<string | null> {
  if (cachedDefaultSkillPrompt !== null) return cachedDefaultSkillPrompt;
  try {
    const response = await fetch('/playground/api/skills');
    if (!response.ok) {
      cachedDefaultSkillPrompt = '';
      return cachedDefaultSkillPrompt;
    }
    const data = (await response.json()) as { skills?: PlaygroundSkill[] };
    const skills = data.skills || [];
    const parts: string[] = [];
    for (const id of DEFAULT_SKILL_IDS) {
      const skill = skills.find((s) => s.id === id);
      const sp = skill?.skillPath?.trim();
      if (sp) parts.push(sp);
    }
    cachedDefaultSkillPrompt = parts.length ? parts.join('\n\n') : '';
    return cachedDefaultSkillPrompt;
  } catch {
    cachedDefaultSkillPrompt = '';
    return cachedDefaultSkillPrompt;
  }
}
