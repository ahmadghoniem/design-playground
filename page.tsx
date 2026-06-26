import { useEffect, useState } from 'react';
import PlaygroundClient from './PlaygroundClient';

interface ProjectInfoResponse {
  projectId: string;
  dockedChatBarEnabled?: boolean;
}

/**
 * Fetches the stable per-project id (and feature-flag gates that used to be
 * resolved server-side in the Next.js page) from the backend. See
 * GET /api/project-id — server is expected to derive the id the same way the
 * old Next server component did (basename(cwd) + sha1(cwd) prefix) and to
 * resolve the `playground-docked-chat-bar` PostHog flag.
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

  const { projectId, dockedChatBarEnabled = false } = info;

  return (
    <PlaygroundClient
      projectId={projectId}
      dockedChatBarEnabled={dockedChatBarEnabled}
    />
  );
}
