import { useEffect, useState } from "react";
import type { PlaygroundSkill } from "@pg/skills";
import { useSkillsUiStore } from "@pg/shared/stores/skills-ui-store";

// ---------------------------------------------------------------------------
// useSkills — shared, deduped skills fetch
// ---------------------------------------------------------------------------
// The docked chat bar (DockedChatBar) and the skills catalog modal both need
// the skills list. A module-level cache + in-flight promise means they share a
// single `/playground/api/skills` request instead of each firing their own.
// Refreshes when skillsVersion bumps (skill added/removed).
// ---------------------------------------------------------------------------

let cache: PlaygroundSkill[] | null = null;
let inflight: Promise<PlaygroundSkill[]> | null = null;

function loadSkills(): Promise<PlaygroundSkill[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch("/playground/api/skills")
    .then((res) => (res.ok ? res.json() : { skills: [] }))
    .then((data: { skills?: PlaygroundSkill[] }) => {
      cache = Array.isArray(data?.skills) ? data.skills : [];
      return cache;
    })
    .catch(() => {
      cache = cache ?? [];
      return cache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useSkills(): PlaygroundSkill[] {
  const [skills, setSkills] = useState<PlaygroundSkill[]>(() => cache ?? []);
  const skillsVersion = useSkillsUiStore((s) => s.skillsVersion);

  useEffect(() => {
    let cancelled = false;
    loadSkills().then((s) => {
      if (!cancelled) setSkills(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (skillsVersion === 0) return;
    let cancelled = false;
    cache = null;
    loadSkills().then((s) => {
      if (!cancelled) setSkills(s);
    });
    return () => {
      cancelled = true;
    };
  }, [skillsVersion]);

  return skills;
}
