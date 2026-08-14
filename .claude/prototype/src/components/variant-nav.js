const PAGES = [
  { href: 'index.html', label: 'Root' },
  { href: 'variant-a-floating.html', label: 'A · floating' },
  { href: 'variant-agent-right.html', label: 'Agent right' },
  { href: 'variant-b-docked.html', label: 'B · docked' },
  { href: 'variant-c-bezel.html', label: 'C · bezel' },
  { href: 'variant-flanks.html', label: 'Flanks' },
  { href: 'variant-goo-lab.html', label: 'Goo lab' },
  { href: 'variant-single-sidebar.html', label: 'Single sidebar' },
  { href: 'variant-ws-pill.html', label: 'WS pill' },
];

const CSS = `
.pg-vnav {
  position: fixed;
  left: 12px;
  bottom: 12px;
  z-index: 400;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 11px;
  color: #e7e5e4;
}
.pg-vnav-toggle {
  height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid #44403c;
  background: #292524;
  color: #d6d3d1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
.pg-vnav-toggle:hover { background: #1c1917; color: #fafaf9; }
.pg-vnav-k {
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #a8a29e;
}
.pg-vnav-menu {
  display: none;
  position: absolute;
  left: 0;
  bottom: 40px;
  min-width: 188px;
  padding: 6px;
  border: 1px solid #44403c;
  border-radius: 10px;
  background: #1c1917;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
.pg-vnav.open .pg-vnav-menu { display: grid; gap: 2px; }
.pg-vnav-menu a {
  display: block;
  padding: 6px 8px;
  border-radius: 6px;
  color: #d6d3d1;
  text-decoration: none;
}
.pg-vnav-menu a:hover { background: #292524; color: #fafaf9; }
.pg-vnav-menu a.current {
  background: #44403c;
  color: #fafaf9;
}
`;

function currentFile() {
  const path = location.pathname.replace(/\\/g, '/');
  const name = path.split('/').pop();
  return name === '' ? 'index.html' : name;
}

function mount() {
  if (document.querySelector('.pg-vnav')) return;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const file = currentFile();
  const current = PAGES.find((p) => p.href === file) ?? PAGES[0];

  const root = document.createElement('div');
  root.className = 'pg-vnav';
  root.innerHTML = `
    <button type="button" class="pg-vnav-toggle" aria-haspopup="true" aria-expanded="false" aria-label="Prototype variants">
      <span class="pg-vnav-k">proto</span>
      <span class="pg-vnav-cur">${current.label}</span>
    </button>
    <nav class="pg-vnav-menu" aria-label="Prototype variants">
      ${PAGES.map((p) => `<a href="${p.href}" class="${p.href === file ? 'current' : ''}">${p.label}</a>`).join('')}
    </nav>
  `;
  document.body.appendChild(root);

  const toggle = root.querySelector('.pg-vnav-toggle');
  const setOpen = (open) => {
    root.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!root.classList.contains('open'));
  });
  document.addEventListener('click', () => setOpen(false));
  root.addEventListener('click', (e) => e.stopPropagation());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
