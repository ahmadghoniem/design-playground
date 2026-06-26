import { useEffect, useState } from 'react';
import PlaygroundClient from './PlaygroundClient';

interface ProjectInfoResponse {
  projectId: string;
}

/**
 * Fetches the stable per-project id from the backend. See
 * GET /api/project-id — server is expected to derive the id the same way the
 * old Next server component did (basename(cwd) + sha1(cwd) prefix).
 */
function useProjectInfo() {
  const [info, setInfo] = useState<ProjectInfoResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/playground/api/project-id')
      .then((res) => res.json())
      .then((data: ProjectInfoResponse) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {
        if (!cancelled) setInfo({ projectId: 'unknown-project' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return info;
}

export function PlaygroundPage() {
  const info = useProjectInfo();

  if (!info) return null;

  const { projectId } = info;

  return (
    <PlaygroundClient
      projectId={projectId}
    />
  );
}
