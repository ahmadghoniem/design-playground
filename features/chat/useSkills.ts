import { useEffect, useState } from "react";
import type { PlaygroundSkill } from "@pg/skills";

// Skills are installed through the Agent, outside this app, so the list is read
// once per page load and never invalidated from the UI.
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

  useEffect(() => {
    let cancelled = false;
    loadSkills().then((s) => {
      if (!cancelled) setSkills(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return skills;
}
