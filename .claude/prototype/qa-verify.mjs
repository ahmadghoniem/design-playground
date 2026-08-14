// Right-flank redesign verification: one persistent right column (Design/Agent views
// switched from a strip-level head), no left rail, tabs + help FAB back in place.
// Run: bun qa-verify.mjs   (static-server.mjs must be up)
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const shot = (n) => join(HERE, `qa-${n}.png`);
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9334', '--no-first-run',
  '--no-default-browser-check', '--window-size=1440,900', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2000));
const targets = await (await fetch('http://127.0.0.1:9334/json')).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  const mid = ++id;
  pending.set(mid, { res, rej });
  ws.send(JSON.stringify({ id: mid, method, params }));
});
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  }
};
await new Promise((r) => { ws.onopen = r; });
await send('Runtime.enable');
await send('Page.enable');
const evalJs = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`eval failed: ${JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)}`);
  return r.result.value;
};
const snap = async (name) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(shot(name), Buffer.from(data, 'base64'));
};
const settle = () => new Promise((r) => setTimeout(r, 450));
const vis = (sel) => `!!document.querySelector('${sel}') && document.querySelector('${sel}').getBoundingClientRect().width > 0`;

try {
  await send('Page.navigate', { url: 'http://localhost:3456/variant-single-sidebar.html' });
  await new Promise((r) => setTimeout(r, 1500));

  // 1. New chrome map: no rail, no pills; strip-level right head; design view open by default;
  //    strip narrowed to the column; workspace + and help FAB back where they belong.
  console.log('baseline:', JSON.stringify(await evalJs(`({
    railGone: !document.querySelector('.app-rail'),
    headVisible: ${vis('.right-head')},
    designVisible: ${vis('.design-panel')},
    agentHidden: !(${vis('.ctx-panel')}),
    stripRight: Math.round(document.querySelector('.canvas-tabstrip').getBoundingClientRect().right),
    headLeft: Math.round(document.querySelector('.right-head').getBoundingClientRect().left),
    plusVisible: ${vis('.ct-add-wrap .ct-add')},
    helpFabVisible: ${vis('.bottom-left-wrap .help-fab')},
    view: Alpine.store('ui').rightTab, open: Alpine.store('ui').rightOpen })`)));
  await snap('rightflank-design');

  // 2. Switcher → Agent view
  await evalJs(`document.querySelector('.rh-switch button:nth-child(2)').click()`);
  await settle();
  console.log('agent view:', JSON.stringify(await evalJs(`({ agentVisible: ${vis('.ctx-panel')}, designHidden: !(${vis('.design-panel')}), view: Alpine.store('ui').rightTab })`)));
  await snap('rightflank-agent');

  // 3. Gear menu → real actions
  await evalJs(`document.querySelector('.rh-ic').click()`);
  await settle();
  console.log('gear menu:', JSON.stringify(await evalJs(`[...document.querySelectorAll('.rh-menu-wrap .ct-menu-item')].map((b) => b.textContent.trim())`)));
  await evalJs(`document.querySelector('.rh-ic').click()`);

  // 4. Close the flank from its own head; the strip-level head stays; switcher reopens.
  await evalJs(`document.querySelector('.cp-close').click()`);
  await settle();
  console.log('closed:', JSON.stringify(await evalJs(`({ open: Alpine.store('ui').rightOpen, agentHidden: !(${vis('.ctx-panel')}), headStillVisible: ${vis('.right-head')} })`)));
  await evalJs(`document.querySelector('.rh-switch button:nth-child(2)').click()`);
  await settle();
  console.log('reopened:', JSON.stringify(await evalJs(`({ open: Alpine.store('ui').rightOpen, agentVisible: ${vis('.ctx-panel')} })`)));

  // 5. Workspace menu from the strip + (restored to the tab strip)
  await evalJs(`document.querySelector('.ct-add').click()`);
  await settle();
  console.log('ws menu:', JSON.stringify(await evalJs(`[...document.querySelectorAll('.ct-add-wrap .ct-menu-item')].map((b) => b.textContent.trim().slice(0, 22))`)));
  await evalJs(`[...document.querySelectorAll('.ct-add-wrap .ct-menu-item')].find((b) => b.textContent.includes('New workspace')).click()`);
  await settle();
  console.log('new tab:', JSON.stringify(await evalJs(`({ n: Alpine.store('boards').list.length, active: Alpine.store('boards').active, plusMenuClosed: !document.querySelector('.ct-add-wrap .ct-menu') || document.querySelector('.ct-add-wrap .ct-menu').getBoundingClientRect().height === 0 })`)));
  await snap('rightflank-final');

  // 6. Workspace-pill variant: no strip; pill names the workspace; ⌘K/click open the
  //    switcher; switching, parking, restoring all work; right flank intact.
  await send('Page.navigate', { url: 'http://localhost:3456/variant-ws-pill.html' });
  await new Promise((r) => setTimeout(r, 1500));
  console.log('pill baseline:', JSON.stringify(await evalJs(`({
    stripGone: !document.querySelector('.canvas-tabstrip'),
    pillVisible: ${vis('.ws-pill')},
    pillText: document.querySelector('.ws-pill').textContent.trim().replace(/\\s+/g, ' ').slice(0, 60),
    pillDirty: !!document.querySelector('.ws-pill .ct-dirty') && document.querySelector('.ws-pill .ct-dirty').getBoundingClientRect().width > 0,
    faceTop: Math.round(document.querySelector('.canvas-face').getBoundingClientRect().top),
    headVisible: ${vis('.right-head')}, designVisible: ${vis('.design-panel')},
    panelTop: Math.round(document.querySelector('.design-panel').getBoundingClientRect().top) })`)));
  await snap('wspill-baseline');

  await evalJs(`document.querySelector('.ws-pill').click()`);
  await settle();
  console.log('ws menu rows:', JSON.stringify(await evalJs(`[...document.querySelectorAll('.ws-menu .ct-menu-item')].map((b) => b.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40))`)));
  await snap('wspill-menu');

  await evalJs(`[...document.querySelectorAll('.ws-menu .ct-menu-item')].find((b) => b.textContent.includes('PriceCard')).click()`);
  await settle();
  console.log('switched:', JSON.stringify(await evalJs(`({ active: Alpine.store('boards').active, pillText: document.querySelector('.ws-pill .ws-name').textContent, menuClosed: document.querySelector('.ws-menu').getBoundingClientRect().height === 0 })`)));

  await evalJs(`document.querySelector('.ws-pill').click()`);
  await settle();
  await evalJs(`[...document.querySelectorAll('.ws-menu .ct-menu-item')].find((b) => b.textContent.includes('navbar-experiment')).click()`);
  await settle();
  console.log('restored:', JSON.stringify(await evalJs(`({ n: Alpine.store('boards').list.length, stashed: Alpine.store('boards').stashed.length, active: Alpine.store('boards').active })`)));

  await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))`);
  await settle();
  const cmdkOpen = await evalJs(`document.querySelector('.ws-menu').getBoundingClientRect().height > 0`);
  await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))`);
  await settle();
  const cmdkClosed = await evalJs(`document.querySelector('.ws-menu').getBoundingClientRect().height === 0`);
  console.log('cmdk:', JSON.stringify({ cmdkOpen, cmdkClosed }));

  await evalJs(`document.querySelector('.ws-pill').click()`);
  await settle();
  await evalJs(`[...document.querySelectorAll('.ws-menu .ct-menu-item')].find((b) => b.textContent.includes('Park this workspace'))?.click()`);
  await settle();
  console.log('parked:', JSON.stringify(await evalJs(`({ n: Alpine.store('boards').list.length, stashed: Alpine.store('boards').stashed.length, active: Alpine.store('boards').active, pillText: document.querySelector('.ws-pill .ws-name').textContent })`)));
  await snap('wspill-final');

  // 6b. Flanks variant: left panel = workspaces + agent at once; right = design, always
  //     on, no head, no gear; strip gone; canvas chrome clears the left card.
  await send('Page.navigate', { url: 'http://localhost:3456/variant-flanks.html' });
  await new Promise((r) => setTimeout(r, 1500));
  console.log('flanks baseline:', JSON.stringify(await evalJs(`({
    leftPanel: ${vis('.left-panel')},
    rightHeadGone: !document.querySelector('.right-head'),
    gearGone: !document.querySelector('.rh-ic'),
    designVisible: ${vis('.design-panel')},
    designCloseGone: !document.querySelector('.dp-btn'),
    ctxPanelGone: !document.querySelector('.ctx-panel'),
    stripGone: !document.querySelector('.canvas-tabstrip'),
    pillGone: !document.querySelector('.ws-pill'),
    threadVisible: ${vis('.lp-agent-head + .cp-agent, .left-panel .cp-agent')},
    toolbarLeft: Math.round(document.querySelector('.canvas-toolbar').getBoundingClientRect().left),
    panelRight: Math.round(document.querySelector('.left-panel').getBoundingClientRect().right),
    boardPadLeft: Math.round(parseFloat(getComputedStyle(document.querySelector('.board')).paddingLeft)) })`)));
  await snap('flanks-baseline');

  await evalJs(`[...document.querySelectorAll('.lp-ws-row')].find((r) => r.textContent.includes('Checkout')).click()`);
  await settle();
  console.log('ws switch:', JSON.stringify(await evalJs(`({ active: Alpine.store('boards').active })`)));
  await evalJs(`document.querySelector('.lp-add').click()`);
  await settle();
  console.log('ws add:', JSON.stringify(await evalJs(`({ n: Alpine.store('boards').list.length, active: Alpine.store('boards').active })`)));
  await snap('flanks-switched');

  // collapse the workspaces section — the thread takes the space
  await evalJs(`document.querySelector('.lp-sec-toggle').click()`);
  await settle();
  console.log('ws collapsed:', JSON.stringify(await evalJs(`({ listHidden: document.querySelector('.lp-ws').getBoundingClientRect().height === 0 })`)));

  // 7. Regression: tabs variant still has its strip and + menu
  await send('Page.navigate', { url: 'http://localhost:3456/variant-single-sidebar.html' });
  await new Promise((r) => setTimeout(r, 1500));
  console.log('tabs variant:', JSON.stringify(await evalJs(`({ strip: ${vis('.canvas-tabstrip')}, pillGone: !document.querySelector('.ws-pill'), tabs: document.querySelectorAll('.ct-tab').length, plus: ${vis('.ct-add')} })`)));

  // 8. Regression: canvas-dock untouched
  await send('Page.navigate', { url: 'http://localhost:3456/index.html' });
  await new Promise((r) => setTimeout(r, 1500));
  console.log('canvas-dock:', JSON.stringify(await evalJs(`({ sidebar: ${vis('.library')}, rightTabs: document.querySelectorAll('.design-agents [role="tab"]').length, tabStrip: ${vis('.canvas-tabstrip')} })`)));
  await evalJs(`Alpine.store('boards').select('marketing')`);
  await settle();
  console.log('switch board:', JSON.stringify(await evalJs(`({ active: Alpine.store('boards').active, nodes: document.querySelectorAll('.node').length, dirtyDot: !!document.querySelector('.ct-dirty') })`)));
  await snap('regression-dock');
} finally {
  chrome.kill();
  console.log('done');
}
