import { Hono } from 'hono';
import path from 'path';
import fs from 'fs/promises';
import type { PlaygroundSkill } from '../../skills';
import { resolvePlaygroundDir } from '../../shared/lib/resolve-playground-dir';

const BUILTIN_SKILLS_DIR = path.join(resolvePlaygroundDir(), 'skills');
const USER_SKILLS_DIR = path.join(process.cwd(), '.claude', 'skills');

async function findSkillFiles(dir: string, acc: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await findSkillFiles(fullPath, acc);
    } else if (entry.isFile() && entry.name === 'SKILL.md') {
      acc.push(fullPath);
    }
  }
  return acc;
}

function parseFrontmatter(content: string): { name?: string; description?: string } {
  if (!content.startsWith('---')) {
    return {};
  }

  const lines = content.split('\n');
  let i = 1;
  const frontmatterLines: string[] = [];

  for (; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      break;
    }
    frontmatterLines.push(lines[i]);
  }

  const meta: { [key: string]: string } = {};

  for (const line of frontmatterLines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    meta[key] = value.replace(/^['"]|['"]$/g, '');
  }

  return {
    name: meta.name,
    description: meta.description,
  };
}

async function loadSkillsFromDir(
  root: string,
  source: PlaygroundSkill['source'],
): Promise<PlaygroundSkill[]> {
  const files = await findSkillFiles(root);
  const skills: PlaygroundSkill[] = [];

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const { name, description } = parseFrontmatter(raw);
    skills.push({
      name: name || path.basename(path.dirname(file)),
      description: description || '',
      source,
    });
  }

  return skills;
}

/**
 * Read-only. Skills are installed through the Agent (`claude`, `codex`, …), not
 * through this app — an in-app installer would fetch someone else's prompt off
 * GitHub and write it where the Agent reads it, duplicating a job the Agent's
 * own tooling already does better. Don't add add/preview/update/remove here.
 */
export function skillsRoutes() {
  const app = new Hono();

  app.get('/api/skills', async (c) => {
    try {
      const [builtin, user] = await Promise.all([
        loadSkillsFromDir(BUILTIN_SKILLS_DIR, 'builtin'),
        loadSkillsFromDir(USER_SKILLS_DIR, 'user'),
      ]);

      const seen = new Set<string>();
      const merged: PlaygroundSkill[] = [];
      for (const skill of [...user, ...builtin]) {
        if (seen.has(skill.name)) continue;
        seen.add(skill.name);
        merged.push(skill);
      }

      merged.sort((a, b) => a.name.localeCompare(b.name));

      return c.json({ skills: merged });
    } catch (error) {
      console.error('[Playground] Failed to load skills:', error);
      return c.json({ skills: [] }, 500);
    }
  });

  return app;
}
