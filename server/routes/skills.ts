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

function parseFrontmatter(content: string): { name?: string; description?: string; body: string } {
  if (!content.startsWith('---')) {
    return { body: content };
  }

  const lines = content.split('\n');
  let i = 1;
  const frontmatterLines: string[] = [];

  for (; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      i++;
      break;
    }
    frontmatterLines.push(lines[i]);
  }

  const body = lines.slice(i).join('\n');
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
    body,
  };
}

function toLabelFromId(id: string): string {
  return id
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export type SkillSource = 'builtin' | 'user';

export interface ExtendedPlaygroundSkill extends PlaygroundSkill {
  source: SkillSource;
}

async function loadSkillsFromDir(
  root: string,
  source: SkillSource,
): Promise<ExtendedPlaygroundSkill[]> {
  const files = await findSkillFiles(root);
  const cwd = process.cwd();
  const skills: ExtendedPlaygroundSkill[] = [];

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const { name, description, body } = parseFrontmatter(raw);
    const id = name || path.basename(path.dirname(file));
    const label = toLabelFromId(id);
    const skillPath = path.relative(cwd, file).split(path.sep).join('/');
    skills.push({
      id,
      label,
      description: description || '',
      systemPrompt: body.trim(),
      skillPath,
      source,
    });
  }

  return skills;
}

/**
 * NOT IMPLEMENTED — the skills *installer*.
 *
 * `features/skills/SkillsCatalogModal.tsx` already POSTs to four endpoints this
 * router does not serve, so each 404s and the whole catalog UI is dead:
 *
 *   POST /api/skills/add      { source }              install a skill
 *   POST /api/skills/preview  { source }              inspect before installing
 *   POST /api/skills/update   { id }                  re-pull an installed skill
 *   POST /api/skills/remove   { id }                  uninstall
 *
 * Predates the cleanup branch — a long-standing gap, not a regression. Reading
 * skills works; only these four do not exist.
 *
 * Note what the payloads say about the design: this is **not** a CRUD editor.
 * There is no name/description/body in any request. `source` is a package
 * coordinate — `owner/repo` or `owner/repo@skill` (see `FEATURED_SKILLS` in
 * `features/skills/featured-skills.ts`), and the free-text field accepts "a
 * GitHub URL, or `npx skills add …`". `update` carries only an id, so it means
 * "re-fetch from where this came from". It is a package manager for skills,
 * backed by skills.sh / GitHub.
 *
 * Constraints worth knowing before implementing:
 *
 * 1. **This fetches from the network and writes to disk.** That is a materially
 *    different risk profile from every other route here, all of which are local.
 *    A skill is agent instructions that get injected into generation prompts, so
 *    installing one from an arbitrary GitHub repo is executing someone else's
 *    prompt. `preview` exists so the user can read it first — keep that
 *    mandatory in the UI rather than optional.
 * 2. **Only ever write to `USER_SKILLS_DIR`.** `BUILTIN_SKILLS_DIR` ships with
 *    the package. `loadSkillsFromDir` already tags each skill
 *    `source: 'builtin' | 'user'` — reject any mutation targeting a builtin.
 * 3. **Validate `id` as a single path segment before touching the filesystem.**
 *    Ids become directory names, and both `update` and `remove` take one
 *    straight from the client. Match an explicit safe regex, as
 *    `ITERATION_FILENAME_PATTERN` (`shared/lib/constants.ts`) does — do not
 *    sanitise by stripping characters.
 * 4. **A skill is a directory containing `SKILL.md`**, not a single file (see
 *    `loadSkillsFromDir`). Install creates the directory; remove deletes it
 *    recursively — which is the operation most worth getting the id check right.
 * 5. **Builtin ids shadow user ids** in the GET dedupe below. Decide explicitly
 *    whether installing a skill may shadow a builtin, or whether a colliding id
 *    is rejected.
 * 6. **`/skills/` is gitignored**, so installed skills are
 *    never committed and a remove is unrecoverable.
 * 7. **`preview` must not write.** Fetch and return; no directory creation, no
 *    caching to disk.
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
      const merged: ExtendedPlaygroundSkill[] = [];
      for (const skill of [...user, ...builtin]) {
        if (seen.has(skill.id)) continue;
        seen.add(skill.id);
        merged.push(skill);
      }

      merged.sort((a, b) => a.label.localeCompare(b.label));

      return c.json({ skills: merged });
    } catch (error) {
      console.error('[Playground] Failed to load skills:', error);
      return c.json({ skills: [] }, 500);
    }
  });

  return app;
}
