import { Hono } from 'hono';
import { streamText } from 'hono/streaming';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  designMdExists,
  designMdPath,
  DESIGN_MD_FILENAME,
  DESIGN_MD_PACKAGE,
  isPackageInstalled,
  STARTER_DESIGN_MD,
} from '../../lib/design-md-helpers';
import { runDesignMdCli } from '../../lib/run-design-md-cli';
import {
  spawnAgent,
  getProviderNotFoundMessage,
} from '../../lib/providers';
import type { ProviderId } from '../../lib/providers';
import { hashFrontMatter } from '../../lib/parse-design-md';
import { readJson } from '../lib/hono-helpers';

const SHOWCASE_PATH = () => path.join(process.cwd(), '.context', 'design-preview.html');

// ---------------------------------------------------------------------------
// design/diff
// ---------------------------------------------------------------------------

function gitShowHead(): Promise<{ ok: boolean; content: string; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn('git', ['show', `HEAD:${DESIGN_MD_FILENAME}`], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (b: Buffer) => { stdout += b.toString('utf8'); });
    child.stderr.on('data', (b: Buffer) => { stderr += b.toString('utf8'); });
    child.on('error', (err) => resolve({ ok: false, content: '', error: err.message }));
    child.on('close', (code) => {
      if (code === 0) resolve({ ok: true, content: stdout });
      else resolve({ ok: false, content: '', error: stderr.trim() || `git exited with code ${code}` });
    });
  });
}

// ---------------------------------------------------------------------------
// design/setup
// ---------------------------------------------------------------------------

const SETUP_SCRIPTS = {
  'design:lint': 'design.md lint DESIGN.md',
  'design:diff': 'design.md diff DESIGN.md',
  'design:export': 'design.md export DESIGN.md',
};

function patchPackageJsonScripts(): { added: string[]; error?: string } {
  const pkgPath = path.join(process.cwd(), 'package.json');
  try {
    const raw = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
    pkg.scripts = pkg.scripts ?? {};
    const added: string[] = [];
    for (const [name, cmd] of Object.entries(SETUP_SCRIPTS)) {
      if (!pkg.scripts[name]) {
        pkg.scripts[name] = cmd;
        added.push(name);
      }
    }
    if (added.length > 0) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    }
    return { added };
  } catch (error) {
    return { added: [], error: error instanceof Error ? error.message : 'package.json patch failed' };
  }
}

// ---------------------------------------------------------------------------
// design/generate-from-codebase prompt builder
// ---------------------------------------------------------------------------

const FALLBACK_SCHEMA = `Top-level YAML keys (FLAT — no "tokens:" wrapper):
  version: alpha            # optional
  name: <string>
  description: <string>     # optional
  colors:
    <token-name>: "#hex"    # e.g. primary, secondary, tertiary, neutral, on-primary
  typography:
    <token-name>:           # e.g. h1, h2, body-md, label-caps — keyed by ROLE
      fontFamily: <string>
      fontSize: <dim>       # rem | px | em
      fontWeight: <number>  # optional
      lineHeight: <number>  # optional
      letterSpacing: <dim>  # optional
  spacing:
    <scale-level>: <dim>    # e.g. xs, sm, md, lg, xl — px or rem
  rounded:
    <scale-level>: <dim>    # e.g. sm, md, lg — px or rem  (NOTE: "rounded", not "radius")
  components:
    <component-name>:       # e.g. button-primary, button-primary-hover, card
      backgroundColor: "{colors.tertiary}"   # token reference
      textColor: "{colors.on-tertiary}"
      typography: "{typography.body-md}"
      rounded: "{rounded.md}"
      padding: 12px
      size | height | width: <dim>           # optional

Token reference syntax: {path.to.token} — e.g. {colors.primary}, {rounded.sm}.
Valid component properties (others get a warning): backgroundColor, textColor,
typography, rounded, padding, size, height, width.

Section order (## headings, omit any that don't apply, but keep this order):
  1. Overview              (alias: Brand & Style)
  2. Colors
  3. Typography
  4. Layout                (alias: Layout & Spacing)
  5. Elevation & Depth     (alias: Elevation)
  6. Shapes
  7. Components
  8. Do's and Don'ts`;

async function fetchLiveSpec(): Promise<string> {
  const result = await runDesignMdCli(['spec']);
  if (result.ok && result.stdout.trim().length > 0) {
    return result.stdout;
  }
  return FALLBACK_SCHEMA;
}

function readHostFile(rel: string): string | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
  } catch {
    return null;
  }
}

function findHostGlobalsCss(): { path: string; contents: string } | null {
  const candidates = [
    'src/app/globals.css',
    'app/globals.css',
    'src/styles/globals.css',
    'styles/globals.css',
  ];
  for (const rel of candidates) {
    const contents = readHostFile(rel);
    if (contents !== null) return { path: rel, contents };
  }
  return null;
}

function findHostTailwindConfig(): { path: string; contents: string } | null {
  const candidates = [
    'tailwind.config.ts',
    'tailwind.config.js',
    'tailwind.config.mjs',
    'tailwind.config.cjs',
  ];
  for (const rel of candidates) {
    const contents = readHostFile(rel);
    if (contents !== null) return { path: rel, contents };
  }
  return null;
}

function findExistingDesignMd(): string | null {
  try {
    return fs.readFileSync(designMdPath(), 'utf8');
  } catch {
    return null;
  }
}

interface BuildPromptOpts {
  spec: string;
  notes?: string;
  globalsCss: { path: string; contents: string } | null;
  tailwindConfig: { path: string; contents: string } | null;
  existingDesignMd: string | null;
}

function buildGenerateFromCodebasePrompt(opts: BuildPromptOpts): string {
  const targetPath = designMdPath();

  const globalsBlock = opts.globalsCss
    ? [
        `=== HOST globals.css (path: ${opts.globalsCss.path}) ===`,
        opts.globalsCss.contents,
        '=== END HOST globals.css ===',
      ].join('\n')
    : [
        '=== HOST globals.css ===',
        '(NOT FOUND — the host app has no globals.css at the conventional locations.',
        ' Derive tokens from tailwind.config and component source within the host app only.',
        ' Do NOT invent tokens to fill the gap.)',
        '=== END HOST globals.css ===',
      ].join('\n');

  const tailwindBlock = opts.tailwindConfig
    ? [
        `=== HOST tailwind config (path: ${opts.tailwindConfig.path}) ===`,
        opts.tailwindConfig.contents,
        '=== END HOST tailwind config ===',
      ].join('\n')
    : '';

  const existingBlock = opts.existingDesignMd
    ? [
        '=== EXISTING DESIGN.md (you are overwriting this — preserve human-curated names where reasonable) ===',
        opts.existingDesignMd,
        '=== END EXISTING DESIGN.md ===',
      ].join('\n')
    : '';

  return [
    'You are a senior design-systems engineer. Your one and only task is to produce a high-quality DESIGN.md file at the project root by inspecting THIS HOST APP and writing in the EXACT @google/design.md format below.',
    '',
    `TARGET PATH (write here, overwrite if it exists): ${targetPath}`,
    '',
    '=== DESIGN.md FORMAT (authoritative — follow this exactly) ===',
    opts.spec,
    '=== END FORMAT ===',
    '',
    globalsBlock,
    '',
    tailwindBlock,
    '',
    existingBlock,
    '',
    'STEPS:',
    '1. GROUND YOURSELF IN THE HOST APP\'S GLOBAL STYLES FIRST. The contents of the host app\'s globals.css are inlined above under "=== HOST globals.css ===". Read it before anything else. The @theme block, :root custom properties (--color-*, --spacing-*, --radius-*, --font-*), and any @layer base rules ARE the source of truth for this design system. Every token you emit should trace back to a value visible there (or, failing that, the tailwind config / component source within the host app).',
    '2. Cross-reference, in this order, ALL WITHIN THE HOST APP ONLY:',
    '   - tailwind config (inlined above, if present).',
    '   - Existing UI components under src/components/** and src/app/**/*.tsx — note their actual padding/radius/typography classes. EXCLUDE src/app/playground/** and public/.playground/** entirely; those are tooling, not the host app\'s product surface.',
    '   - public/ for logo / brand color / favicon hints.',
    '   - README.md / CLAUDE.md for tone-of-voice and product purpose.',
    '3. Synthesize what you found into a DESIGN.md. Write directly to the target path. Do NOT ask questions. Do NOT produce surrounding commentary — only the file.',
    '',
    'STRICT REQUIREMENTS:',
    '- HOST APP ONLY. Do not read or derive values from: node_modules/, .next/, .git/, src/app/playground/**, public/.playground/**, or any path outside the current working directory.',
    '- NO FABRICATION. Every color, spacing, radius, and typography value must trace back to a value found in the host app (globals.css preferred, then tailwind config, then component source). If a category genuinely has no source values in the host app, OMIT that section rather than inventing — do not add placeholder tokens.',
    '- The YAML front-matter MUST use FLAT top-level keys: `colors`, `typography`, `spacing`, `rounded`, `components` (NEVER nest these under a `tokens:` key — the linter and exporter will fail).',
    '- Use `rounded:` (NOT `radius:`).',
    '- Typography keys are ROLE-based (`h1`, `h2`, `body-md`, `label-caps`), NOT axis-based (`sans`, `mono`). Each is a full object with `fontFamily`, `fontSize`, etc.',
    '- Color values are bare hex strings: `primary: "#1A1C1E"` — NOT DTCG `{ value, type }` objects.',
    '- In Markdown bodies, reference tokens via {colors.primary} / {rounded.sm} / {typography.h1} — NEVER hard-code raw hex codes.',
    '- Use the EXACT section order listed in the spec above. ## headings only.',
    '- Components section: list the 3–6 most visually defining components you found IN THE HOST APP (e.g. `button-primary`, `card`, `dialog`). Map each to allowed properties only: backgroundColor, textColor, typography, rounded, padding, size, height, width.',
    '- Define color pairs that pass WCAG AA (≥ 4.5:1 body contrast).',
    '- Define a `primary` color (the linter warns when missing).',
    '- Keep the file under ~6 KB. Be opinionated and concise.',
    '- After writing, output a single line: "DESIGN.md written to <absolute path>".',
    '',
    opts.notes ? `EXTRA GUIDANCE FROM USER:\n${opts.notes}\n` : '',
    'Begin now. Anchor on globals.css, then write the file.',
  ]
    .filter(Boolean)
    .join('\n');
}

// ---------------------------------------------------------------------------
// design/generate-preview-showcase prompt builder
// ---------------------------------------------------------------------------

function readDesignMdForShowcase(): string | null {
  try {
    return fs.readFileSync(designMdPath(), 'utf8');
  } catch {
    return null;
  }
}

function buildShowcasePrompt(designMd: string, outPath: string): string {
  return [
    'You are a senior brand-systems designer. Your one and only task is to produce a single self-contained HTML file that visually demonstrates the design system defined in DESIGN.md, dramatizing both the YAML tokens AND the philosophy prose below the front-matter.',
    '',
    `WRITE THE FILE TO THIS EXACT PATH (overwrite if it exists): ${outPath}`,
    '',
    '=== DESIGN.md (source of truth — read both the YAML front-matter AND the prose below) ===',
    designMd,
    '=== END DESIGN.md ===',
    '',
    'OUTPUT REQUIREMENTS:',
    '- A single self-contained HTML5 document. No external JS, no <script> tags.',
    '- All styles inline in a single <style> block. NO CSS imports except Google Fonts <link> tags in <head> for the typography fontFamily values found in the YAML. If a font name is not available on Google Fonts, use a sensible fallback chain (e.g. Georgia, serif or system-ui, sans-serif).',
    '- Use the EXACT hex values from the YAML front-matter — do not reinterpret them. Resolve {colors.x} / {rounded.x} / {typography.x} references to literals.',
    '- The <body> background must be the page background color from the YAML.',
    '',
    'CONTENT — render these vignettes stacked vertically inside a single column with max-width 960px and generous vertical rhythm. Each vignette is a card that contains (a) the visual itself and (b) a small caption (label-caps style) naming which philosophy principle it dramatizes:',
    '  1. HERO BLOCK — display headline using h1 typography + body subtitle + a primary CTA button. Caption: "Editorial display + single primary action".',
    '  2. NAV BAR — pill-shaped nav links with one active state and a primary CTA on the right. Caption: "Pill shapes signal interactivity".',
    '  3. CARD GRID — 3 article-style cards (image placeholder area using a tonal surface fill, title in display font, meta line in label-caps, body excerpt). Caption: "Tonal surface layering, no shadows".',
    '  4. BUTTON CLUSTER — primary, secondary, ghost variants side-by-side, plus a disabled state. Caption: "Same radius tier across a button group".',
    '  5. FORM — a labeled input + helper text + a submit button. Caption: "Inputs use {rounded.lg} not pill — only buttons go full radius".',
    '  6. BADGE ROW — a few inline badges (category, status, PRO/premium using accent color if present). Caption: "Premium accent reserved for high-value labels".',
    '  7. PRICING / FEATURED CARD — a single elevated card with a 2px foreground border, a "Most Popular" pill badge, price, feature list, and CTA. Caption: "Heavy shadow + scale lift used only here".',
    '',
    'PHILOSOPHY ECHOES — at the very top of the document, before the vignettes, render a 2–3 sentence opening paragraph (in body typography on the page background) drawn from the Overview section of DESIGN.md. This sets the tone.',
    '',
    'CAPTION STYLING — captions sit above each vignette as small uppercase eyebrows in label-caps typography. Use the muted-foreground color if available, otherwise foreground at 60% opacity.',
    '',
    'STRICT RULES:',
    '- NO JavaScript whatsoever. No <script>. No event handlers. No data: URIs that contain script.',
    '- NO external assets except Google Fonts <link> tags. Image areas must be pure CSS (solid color blocks, gradients, or inline SVG).',
    '- Resolve every token reference. The output HTML must contain literal hex values, not {colors.primary} placeholders.',
    '- Honor the philosophy: if the prose reserves an accent color for premium CTAs, only use it on the high-value labels (e.g. a PRO badge / pricing CTA). Do not sprinkle it everywhere.',
    '- Do not invent tokens that aren\'t in the YAML.',
    '- Max-width 960px container, centered. Vignettes stack with 48–64px vertical gap.',
    '',
    `OUTPUT BEHAVIOR — write the HTML directly to ${outPath} using the file-write tool available to you. Do not print the HTML to stdout. After writing, output a single line: "Showcase written to ${outPath}".`,
    '',
    'Begin now.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export function designRoutes() {
  const app = new Hono();

  // design/diff
  app.post('/api/design/diff', async (c) => {
    if (!designMdExists()) {
      return c.json({ ok: false, error: 'DESIGN.md not found.' }, 404);
    }
    const head = await gitShowHead();
    if (!head.ok) {
      return c.json({ ok: false, error: `Could not read DESIGN.md from git HEAD: ${head.error}` });
    }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-md-diff-'));
    const tmpFile = path.join(tmpDir, 'HEAD-DESIGN.md');
    try {
      fs.writeFileSync(tmpFile, head.content, 'utf8');
      const result = await runDesignMdCli(['diff', tmpFile, DESIGN_MD_FILENAME]);
      return c.json(result);
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  // design/export
  app.post('/api/design/export', async (c) => {
    if (!designMdExists()) {
      return c.json({ ok: false, error: 'DESIGN.md not found.' }, 404);
    }
    const body = await readJson<{ format?: string }>(c);
    const format = body?.format === 'dtcg' ? 'dtcg' : 'tailwind';
    const result = await runDesignMdCli(['export', '--format', format, DESIGN_MD_FILENAME]);
    return c.json({ ...result, format });
  });

  // design/file
  app.get('/api/design/file', async (c) => {
    if (!designMdExists()) {
      return c.json({ exists: false, content: '' });
    }
    try {
      const content = fs.readFileSync(designMdPath(), 'utf8');
      return c.json({ exists: true, content });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to read DESIGN.md';
      return c.json({ exists: false, content: '', error: message }, 500);
    }
  });

  app.put('/api/design/file', async (c) => {
    const body = await readJson<{ content?: string }>(c);
    if (typeof body?.content !== 'string') {
      return c.json({ success: false, error: 'Missing `content` string in body.' }, 400);
    }
    try {
      fs.writeFileSync(designMdPath(), body.content, 'utf8');
      return c.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to write DESIGN.md';
      return c.json({ success: false, error: message }, 500);
    }
  });

  app.post('/api/design/file', async (c) => {
    if (designMdExists()) {
      return c.json({ success: false, error: 'DESIGN.md already exists.' }, 409);
    }
    try {
      fs.writeFileSync(designMdPath(), STARTER_DESIGN_MD, 'utf8');
      return c.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to scaffold DESIGN.md';
      return c.json({ success: false, error: message }, 500);
    }
  });

  // design/generate-from-codebase (text/plain streaming response)
  app.post('/api/design/generate-from-codebase', async (c) => {
    const body = await readJson<{ provider?: ProviderId; model?: string; notes?: string }>(c);
    const providerId: ProviderId = body?.provider ?? 'claude-code';
    const notes = body?.notes?.trim() || undefined;

    c.header('Content-Type', 'text/plain; charset=utf-8');
    c.header('Cache-Control', 'no-cache, no-transform');
    c.header('X-Content-Type-Options', 'nosniff');

    return streamText(c, async (stream) => {
    const log = (line: string) => { void stream.write(line + '\n'); };
    log(`> Fetching the latest @google/design.md spec…`);

    const spec = await fetchLiveSpec();
    const fromLive = spec !== FALLBACK_SCHEMA;
    log(
      fromLive
        ? `> Using live spec from the installed package.`
        : `> @google/design.md not callable yet; using built-in schema reference.`,
    );
    const globalsCss = findHostGlobalsCss();
    const tailwindConfig = findHostTailwindConfig();
    const existingDesignMd = findExistingDesignMd();

    if (globalsCss) {
      log(`> Read host ${globalsCss.path} (${globalsCss.contents.length} bytes) — anchoring the AI on it.`);
    } else {
      log(`[warn] No host globals.css found at the conventional locations. The AI will be told not to invent tokens to fill the gap.`);
    }
    if (tailwindConfig) {
      log(`> Read host ${tailwindConfig.path} (${tailwindConfig.contents.length} bytes).`);
    }
    if (existingDesignMd) {
      log(`> Existing DESIGN.md detected (${existingDesignMd.length} bytes) — passed as reference for naming continuity.`);
    }

    log(`> Asking the AI to study your host app and draft DESIGN.md…`);
    log(`> Provider: ${providerId}${body?.model ? `  •  model: ${body.model}` : ''}`);
    log('');

    const prompt = buildGenerateFromCodebasePrompt({ spec, notes, globalsCss, tailwindConfig, existingDesignMd });

    let child;
    try {
      child = spawnAgent(
        providerId,
        {
          model: body?.model,
          claudeDetailedStdout: false,
        },
        process.cwd(),
      );
    } catch (error) {
      log(`[error] ${(error as Error).message}`);
      log('[done]');
      return;
    }

    const before = (() => {
      try {
        return fs.statSync(designMdPath()).mtimeMs;
      } catch {
        return null;
      }
    })();

    child.stdout?.on('data', (chunk: Buffer) => {
      void stream.write(chunk.toString('utf8'));
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      void stream.write(chunk.toString('utf8'));
    });
    child.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        log(`\n[error] ${getProviderNotFoundMessage(providerId)}`);
      } else {
        log(`\n[error] ${err.message}`);
      }
    });

    child.stdin?.write(prompt);
    child.stdin?.end();

    const exitCode: number | null = await new Promise((resolve) => {
      child.on('close', (code) => resolve(code));
    });

    log('');
    const after = (() => {
      try {
        return fs.statSync(designMdPath()).mtimeMs;
      } catch {
        return null;
      }
    })();
    const wrote = after !== null && before !== after;
    const filePath = designMdPath();

    if (exitCode === 0 && wrote) {
      log(`> Wrote ${path.relative(process.cwd(), filePath)} ✓`);

      log(`> Running lint to verify the result…`);
      const lint = await runDesignMdCli(['lint', filePath]);
      if (lint.ok) {
        log(`> Lint passed.`);
      } else {
        log(`[warn] Lint surfaced issues (see Check tab):`);
        if (lint.stdout) log(lint.stdout.trim());
        if (lint.stderr) log(lint.stderr.trim());
      }
    } else if (exitCode === 0 && !wrote) {
      log(`[warn] The agent finished but didn't change ${path.relative(process.cwd(), filePath)}.`);
      log(`       You can try again, or pick a different model in Model Settings.`);
    } else {
      log(`[failed] Agent exited with code ${exitCode}.`);
    }
    log('[done]');
    });
  });

  // design/generate-preview-showcase (text/plain streaming response)
  app.post('/api/design/generate-preview-showcase', async (c) => {
    const body = await readJson<{ provider?: ProviderId; model?: string }>(c);
    const providerId: ProviderId = body?.provider ?? 'claude-code';

    c.header('Content-Type', 'text/plain; charset=utf-8');
    c.header('Cache-Control', 'no-cache, no-transform');
    c.header('X-Content-Type-Options', 'nosniff');

    return streamText(c, async (stream) => {
    const log = (line: string) => { void stream.write(line + '\n'); };

    const designMd = readDesignMdForShowcase();
    if (!designMd) {
      log('[error] DESIGN.md not found. Generate or scaffold one first.');
      log('[done]');
      return;
    }

    const outPath = SHOWCASE_PATH();
    const outDir = path.dirname(outPath);
    try {
      fs.mkdirSync(outDir, { recursive: true });
    } catch (err) {
      log(`[error] Could not create ${path.relative(process.cwd(), outDir)}: ${(err as Error).message}`);
      log('[done]');
      return;
    }

    log(`> Reading your design system…`);
    log(`> Composing a visual showcase of your design philosophy…`);
    log('');

    const prompt = buildShowcasePrompt(designMd, outPath);

    let child;
    try {
      child = spawnAgent(
        providerId,
        {
          model: body?.model,
          claudeDetailedStdout: false,
        },
        process.cwd(),
      );
    } catch (error) {
      log(`[error] ${(error as Error).message}`);
      log('[done]');
      return;
    }

    const before = (() => {
      try {
        return fs.statSync(outPath).mtimeMs;
      } catch {
        return null;
      }
    })();

    child.stdout?.on('data', (chunk: Buffer) => {
      void stream.write(chunk.toString('utf8'));
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      void stream.write(chunk.toString('utf8'));
    });
    child.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        log(`\n[error] ${getProviderNotFoundMessage(providerId)}`);
      } else {
        log(`\n[error] ${err.message}`);
      }
    });

    child.stdin?.write(prompt);
    child.stdin?.end();

    const exitCode: number | null = await new Promise((resolve) => {
      child.on('close', (code) => resolve(code));
    });

    log('');
    const after = (() => {
      try {
        return fs.statSync(outPath).mtimeMs;
      } catch {
        return null;
      }
    })();
    const wrote = after !== null && before !== after;

    if (exitCode === 0 && wrote) {
      try {
        const html = fs.readFileSync(outPath, 'utf8');
        const hash = hashFrontMatter(designMd);
        const headerLine = `<!-- design-md-hash: ${hash} -->`;
        const stripped = html.replace(/^<!--\s*design-md-hash:[^>]*-->\s*\r?\n?/, '');
        fs.writeFileSync(outPath, `${headerLine}\n${stripped}`, 'utf8');
        log(`> Your showcase is ready ✓`);
      } catch (err) {
        log(`> Your showcase is ready (with a small caveat): ${(err as Error).message}`);
      }
    } else if (exitCode === 0 && !wrote) {
      log(`> The AI didn't produce a showcase this time. Try again.`);
    } else {
      log(`> Something went wrong. Try again, or check Model Settings.`);
    }
    log('[done]');
    });
  });

  // design/lint
  app.post('/api/design/lint', async (c) => {
    if (!designMdExists()) {
      return c.json({ ok: false, error: 'DESIGN.md not found at project root.' }, 404);
    }
    const result = await runDesignMdCli(['lint', DESIGN_MD_FILENAME]);
    return c.json(result);
  });

  // design/preview-showcase
  app.get('/api/design/preview-showcase', async (c) => {
    const filePath = SHOWCASE_PATH();
    const raw = c.req.query('raw');
    try {
      const html = fs.readFileSync(filePath, 'utf8');
      if (raw) {
        c.header('Content-Type', 'text/html; charset=utf-8');
        c.header('Cache-Control', 'no-store');
        return c.body(html);
      }
      const match = html.match(/^<!--\s*design-md-hash:\s*([a-f0-9]+)\s*-->/);
      const hash = match ? match[1] : null;
      return c.json({ exists: true, html, hash });
    } catch {
      if (raw) {
        return c.body('', 404);
      }
      return c.json({ exists: false, html: null, hash: null });
    }
  });

  app.delete('/api/design/preview-showcase', async (c) => {
    const filePath = SHOWCASE_PATH();
    try {
      fs.unlinkSync(filePath);
      return c.json({ ok: true });
    } catch (err) {
      return c.json({ ok: false, error: (err as Error).message }, 500);
    }
  });

  // design/setup (text/plain streaming response)
  app.post('/api/design/setup', async (c) => {
    c.header('Content-Type', 'text/plain; charset=utf-8');
    c.header('Cache-Control', 'no-cache, no-transform');
    c.header('X-Content-Type-Options', 'nosniff');

    return streamText(c, async (stream) => {
    const log = (line: string) => { void stream.write(line + '\n'); };

    log(`> Installing ${DESIGN_MD_PACKAGE} as a dev dependency…`);

    const child = spawn('bun', ['add', '--dev', DESIGN_MD_PACKAGE], {
      cwd: process.cwd(),
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk: Buffer) => {
      void stream.write(chunk.toString('utf8'));
    });
    child.stderr.on('data', (chunk: Buffer) => {
      void stream.write(chunk.toString('utf8'));
    });

    const exitCode: number | null = await new Promise((resolve) => {
      child.on('close', (code) => resolve(code));
      child.on('error', (err) => {
        log(`\n[error] ${err.message}`);
        resolve(1);
      });
    });

    if (exitCode !== 0) {
      log(`\n[failed] bun add exited with code ${exitCode}.`);
      log('[done]');
      return;
    }

    log(`\n> Installed ${DESIGN_MD_PACKAGE}.`);

    if (designMdExists()) {
      log('> DESIGN.md already exists; left untouched.');
    } else {
      log('> DESIGN.md not found. Use step 2 ("Generate from my codebase" or "Use blank starter") to create it.');
    }

    const patch = patchPackageJsonScripts();
    if (patch.error) {
      log(`[warn] Could not update package.json scripts: ${patch.error}`);
    } else if (patch.added.length === 0) {
      log('> package.json scripts already present (design:lint, design:diff, design:export).');
    } else {
      log(`> Added package.json scripts: ${patch.added.join(', ')}.`);
    }

    log('\n[done]');
    });
  });

  // design/spec
  app.get('/api/design/spec', async (c) => {
    const result = await runDesignMdCli(['spec']);
    return c.json(result);
  });

  // design/status
  app.get('/api/design/status', async (c) => {
    const { installed, version } = isPackageInstalled();
    const fileExists = designMdExists();
    let fileSize: number | null = null;
    if (fileExists) {
      try {
        fileSize = fs.statSync(designMdPath()).size;
      } catch {
        fileSize = null;
      }
    }
    return c.json({
      installed,
      packageVersion: version ?? null,
      fileExists,
      filePath: designMdPath(),
      fileSize,
    });
  });

  return app;
}
