// CDP-driven QA harness for the prototype. Launches headless Chrome once, then walks
// each variant capturing screenshots and geometry. Run: bun qa-cdp.mjs
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;
const BASE = 'http://localhost:3456';
const OUT = fileURLToPath(new URL('./qa-shots/', import.meta.url));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), 'qa-chrome-'));
const chrome = Bun.spawn([
  CHROME, '--headless=new', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu',
  '--window-size=1440,900', '--hide-scrollbars', 'about:blank',
], { stdout: 'ignore', stderr: 'ignore' });

let wsUrl = null;
for (let i = 0; i < 50 && !wsUrl; i++) {
  await sleep(300);
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl ?? null;
  } catch { /* not up yet */ }
}
if (!wsUrl) { console.error('chrome did not come up'); chrome.kill(); process.exit(1); }

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let nextId = 1;
const pending = new Map();
const consoleErrors = [];
ws.onmessage = (evt) => {
  const msg = JSON.parse(evt.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
  } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
  } else if (msg.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  }
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = nextId++;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params }));
});

const evalJs = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval failed');
  return r.result.value;
};

const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  await Bun.write(`${OUT}${name}.png`, Buffer.from(r.data, 'base64'));
  console.log(`shot: ${name}.png`);
};

const goto = async (path) => {
  consoleErrors.length = 0;
  const loaded = new Promise((res) => {
    const h = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.method === 'Page.loadEventFired') { ws.removeEventListener('message', h); res(); }
    };
    ws.addEventListener('message', h);
  });
  await send('Page.navigate', { url: `${BASE}${path}` });
  await loaded;
  await sleep(1800); // alpine init + partial fetch chain
};

await send('Page.enable');
await send('Runtime.enable');

// ── variant-single-sidebar.html ──────────────────────────────────────────
await goto('/variant-single-sidebar.html');
await shot('01-initial');

const geomInitial = await evalJs(`(() => {
  const r = (s) => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect(); return { left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), width: Math.round(b.width) }; };
  const panel = r('.design-panel'); const failed = r('.node.failed'); const orig = r('#loc-orig');
  return { panel, failed, orig,
    failedUnderPanel: panel && failed ? Math.max(0, failed.right - panel.left) : null,
    boardPadding: getComputedStyle(document.querySelector('.board')).padding };
})()`);
console.log('initial geometry:', JSON.stringify(geomInitial));

// open agent panel
await evalJs(`document.querySelector('.flank-pill.left').click()`);
await sleep(450);
await shot('02-agent-open');
const geomAgent = await evalJs(`(() => {
  const r = (s) => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect(); return { left: Math.round(b.left), right: Math.round(b.right), width: Math.round(b.width) }; };
  const panel = r('.ctx-panel'); const orig = r('#loc-orig'); const toolbar = r('.canvas-toolbar');
  return { panel, orig, toolbar,
    origUnderPanel: panel && orig ? Math.max(0, Math.min(orig.right, panel.right) - Math.max(orig.left, panel.left)) : null };
})()`);
console.log('agent-open geometry:', JSON.stringify(geomAgent));

// close agent panel
await evalJs(`document.querySelector('.cp-close').click()`);
await sleep(450);

// close design panel
await evalJs(`document.querySelector('.dp-btn.last').click()`);
await sleep(450);
await shot('03-both-closed');

// stress: add 7 workspaces
for (let i = 0; i < 7; i++) {
  await evalJs(`document.querySelector('.ct-add').click()`);
  await sleep(150);
  await evalJs(`document.querySelector('.ct-menu-item').click()`);
  await sleep(150);
}
await shot('04-many-tabs');
const geomTabs = await evalJs(`(() => {
  const strip = document.querySelector('.canvas-tabstrip');
  const tabs = [...strip.querySelectorAll('.ct-tab')].map((t) => Math.round(t.getBoundingClientRect().width));
  const add = document.querySelector('.ct-add-wrap').getBoundingClientRect();
  return { stripScrollW: strip.scrollWidth, stripClientW: strip.clientWidth, tabWidths: tabs,
    addRight: Math.round(add.right), viewportW: window.innerWidth, overflows: add.right > window.innerWidth - 4 || strip.scrollWidth > strip.clientWidth };
})()`);
console.log('many-tabs geometry:', JSON.stringify(geomTabs));

// reopen both pills under tab load
await evalJs(`document.querySelector('.flank-pill.left').click()`);
await evalJs(`document.querySelector('.flank-pill.right').click()`);
await sleep(450);
await shot('05-many-tabs-panels');

// pill tooltip (close panels again for the pills to exist)
await evalJs(`document.querySelector('.cp-close').click()`);
await sleep(300);
await evalJs(`document.querySelector('.flank-pill.left').dispatchEvent(new MouseEvent('mouseenter'))`);
await sleep(950);
await shot('06-pill-tooltip');
const tipVisible = await evalJs(`(() => { const t = document.querySelector('.pg-tip'); return t ? { display: t.style.display, text: t.querySelector('.pg-tip-text')?.textContent, visible: t.classList.contains('pg-tip-visible') } : null; })()`);
console.log('tooltip:', JSON.stringify(tipVisible));
console.log('console errors (single-sidebar):', JSON.stringify(consoleErrors));

// ── other variants ───────────────────────────────────────────────────────
for (const [file, name] of [
  ['/index.html', '07-index'],
  ['/variant-agent-right.html', '08-agent-right'],
  ['/variant-a-floating.html', '09-a-floating'],
  ['/variant-b-docked.html', '10-b-docked'],
  ['/variant-c-bezel.html', '11-c-bezel'],
  ['/variant-goo-lab.html', '12-goo-lab'],
]) {
  await goto(file);
  await shot(name);
  const status = await evalJs(`({ title: document.title, bodyChildren: document.body.children.length, hasCanvas: !!document.querySelector('.canvas-wrap, .canvas-tabstrip') })`);
  console.log(`${file}:`, JSON.stringify(status), 'errors:', JSON.stringify(consoleErrors));
}

ws.close();
chrome.kill();
console.log('done');
