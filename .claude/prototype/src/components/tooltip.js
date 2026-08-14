import Alpine from 'alpinejs';

const OPEN_DELAY = 700;
const SKIP_DELAY = 300;

let tipEl = null;
let tipSurface = null;
let tipContent = null;
let tipDescEl = null;
let tipArtEl = null;
let tipKeyEl = null;
let tipAnchor = null;
let showTimer = null;
let activeTrigger = null;
let lastHideTime = 0;

const TIP_ARTIFACTS = {
  annotate() {
    return `<svg width="168" height="64" viewBox="0 0 168 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="168" height="64" rx="6" fill="#1c1917"/>
      <rect x="0" y="0" width="38" height="64" fill="#292524"/>
      <rect x="44" y="12" width="52" height="11" rx="5.5" fill="#22d3ee"/>
      <rect x="44" y="28" width="78" height="6" rx="3" fill="#57534e"/>
      <rect x="44" y="40" width="60" height="6" rx="3" fill="#44403c"/>
      <rect x="44" y="52" width="96" height="8" rx="2" fill="#3b82f6"/>
      <rect x="6" y="42" width="18" height="18" rx="4" fill="#1c1917" stroke="#44403c" stroke-width="1"/>
      <g transform="translate(9 45) scale(0.42)" stroke="#e7e5e4" stroke-width="1.5" stroke-linecap="square" fill="none">
        <path d="M11.875 16.375L15.464 12.786C15.594 12.656 15.544 12.435 15.3709 12.3736L4.24478 8.42557C4.04643 8.35519 3.85518 8.54643 3.92557 8.74478L7.87354 19.8709C7.93499 20.044 8.15599 20.094 8.28593 19.964L11.875 16.375ZM11.875 16.375L16.75 21.25"/>
        <path d="M20.25 3.75H10.75"/>
        <path d="M20.25 7.75H15.75"/>
      </g>
    </svg>`;
  },
};

function ensureGooFilter() {
  if (document.getElementById('pg-goo')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('style', 'position:absolute');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<defs>
    <filter id="pg-goo">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
      <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo"/>
      <feBlend in="SourceGraphic" in2="goo"/>
    </filter>
  </defs>`;
  document.body.appendChild(svg);
}

function getTipEl() {
  if (!tipEl) {
    ensureGooFilter();
    tipEl = document.createElement('div');
    tipEl.className = 'pg-tip';
    tipEl.setAttribute('role', 'tooltip');

    tipSurface = document.createElement('div');
    tipSurface.className = 'pg-tip-surface';
    const tipBody = document.createElement('div');
    tipBody.className = 'pg-tip-body';
    const tipBlob = document.createElement('span');
    tipBlob.className = 'pg-tip-blob';
    tipAnchor = document.createElement('span');
    tipAnchor.className = 'pg-tip-anchor';
    tipAnchor.hidden = true;
    tipSurface.append(tipBody, tipBlob, tipAnchor);

    tipContent = document.createElement('span');
    tipContent.className = 'pg-tip-text';
    tipDescEl = document.createElement('span');
    tipDescEl.className = 'pg-tip-desc';
    tipDescEl.hidden = true;
    tipArtEl = document.createElement('div');
    tipArtEl.className = 'pg-tip-art';
    tipArtEl.hidden = true;
    tipKeyEl = document.createElement('span');
    tipKeyEl.className = 'pg-tip-key';

    tipEl.append(tipSurface, tipContent, tipDescEl, tipArtEl, tipKeyEl);
    tipEl.style.display = 'none';
    document.body.appendChild(tipEl);
  }
  return tipEl;
}

function hideTip() {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  const tip = getTipEl();
  tip.classList.remove('pg-tip-visible');
  tip.style.display = 'none';
  if (activeTrigger) activeTrigger = null;
  lastHideTime = Date.now();
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(n, max));
}

function getTipOffset() {
  try {
    if (typeof Alpine === 'undefined' || !Alpine.store) return 14;
    const store = Alpine.store('goo');
    return store?.tipOffset ?? 14;
  } catch {
    return 14;
  }
}

function getSurfacePad() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--goo-surface-pad');
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 96;
}

function getAnchorEnabled() {
  try {
    if (typeof Alpine === 'undefined' || !Alpine.store) return true;
    const store = Alpine.store('goo');
    return store?.anchor ?? true;
  } catch {
    return true;
  }
}

function positionTip(trigger, side) {
  const tip = getTipEl();
  const rect = trigger.getBoundingClientRect();
  const boundary = trigger.closest('[data-tip-boundary]');
  const boundaryRect = boundary ? boundary.getBoundingClientRect() : rect;
  const tipRect = tip.getBoundingClientRect();
  const offset = getTipOffset();
  const pad = 8;
  let top;
  let left;

  switch (side) {
    case 'bottom':
      top = boundaryRect.bottom + offset;
      left = rect.left + rect.width / 2 - tipRect.width / 2;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - tipRect.height / 2;
      left = boundaryRect.left - tipRect.width - offset;
      break;
    case 'right':
      top = rect.top + rect.height / 2 - tipRect.height / 2;
      left = boundaryRect.right + offset;
      break;
    default:
      top = boundaryRect.top - tipRect.height - offset;
      left = rect.left + rect.width / 2 - tipRect.width / 2;
  }

  tip.style.top = `${clamp(top, pad, window.innerHeight - tipRect.height - pad)}px`;
  tip.style.left = `${clamp(left, pad, window.innerWidth - tipRect.width - pad)}px`;
  tip.dataset.side = side;
}

function positionAnchor(trigger, side) {
  if (!tipAnchor) return;

  if (!getAnchorEnabled()) {
    tipAnchor.hidden = true;
    return;
  }

  const tip = getTipEl();
  const rect = trigger.getBoundingClientRect();
  const boundary = trigger.closest('[data-tip-boundary]');
  const boundaryRect = boundary ? boundary.getBoundingClientRect() : rect;
  const tipRect = tip.getBoundingClientRect();
  const surfacePad = getSurfacePad();
  let anchorX;
  let anchorY;

  switch (side) {
    case 'bottom':
      anchorX = rect.left + rect.width / 2;
      anchorY = boundaryRect.bottom;
      break;
    case 'left':
      anchorX = boundaryRect.left;
      anchorY = rect.top + rect.height / 2;
      break;
    case 'right':
      anchorX = boundaryRect.right;
      anchorY = rect.top + rect.height / 2;
      break;
    default:
      anchorX = rect.left + rect.width / 2;
      anchorY = boundaryRect.top;
  }

  const localX = anchorX - tipRect.left + surfacePad;
  const localY = anchorY - tipRect.top + surfacePad;
  tipAnchor.style.left = `${localX}px`;
  tipAnchor.style.top = `${localY}px`;
  tipAnchor.hidden = false;
}

function showTip(trigger, text, side) {
  if (!text) return;
  const tip = getTipEl();
  tipContent.textContent = text;

  const desc = trigger.getAttribute('data-tip-desc');
  const artKey = trigger.getAttribute('data-tip-art');
  const rich = Boolean(desc);

  tip.classList.toggle('pg-tip-rich', rich);
  if (rich) {
    tipDescEl.textContent = desc;
    tipDescEl.hidden = false;
  } else {
    tipDescEl.textContent = '';
    tipDescEl.hidden = true;
  }

  const renderArt = artKey && TIP_ARTIFACTS[artKey];
  if (renderArt) {
    tipArtEl.innerHTML = renderArt();
    tipArtEl.hidden = false;
  } else {
    tipArtEl.innerHTML = '';
    tipArtEl.hidden = true;
  }

  const key = trigger.getAttribute('data-tip-key');
  if (!rich && key) {
    tipKeyEl.textContent = key;
    tipKeyEl.hidden = false;
  } else {
    tipKeyEl.textContent = '';
    tipKeyEl.hidden = true;
  }
  tip.dataset.side = side;
  tip.style.display = 'block';
  tip.style.visibility = 'hidden';
  tip.classList.remove('pg-tip-visible');
  positionTip(trigger, side);
  positionAnchor(trigger, side);
  tip.style.visibility = 'visible';
  requestAnimationFrame(() => tip.classList.add('pg-tip-visible'));
  activeTrigger = trigger;
}

export function registerTooltip() {
  document.addEventListener('alpine:init', () => {
    Alpine.directive('tip', (el, { expression, modifiers }, { evaluateLater, effect, cleanup }) => {
      const getText = evaluateLater(expression);
      let side = 'top';
      if (modifiers.includes('bottom')) side = 'bottom';
      else if (modifiers.includes('left')) side = 'left';
      else if (modifiers.includes('right')) side = 'right';

      let currentText = '';

      const scheduleShow = () => {
        if (!currentText) return;
        if (showTimer) clearTimeout(showTimer);
        const delay = Date.now() - lastHideTime < SKIP_DELAY ? 0 : OPEN_DELAY;
        showTimer = setTimeout(() => showTip(el, currentText, side), delay);
      };

      const onLeave = () => hideTip();
      const onClick = () => hideTip();

      el.addEventListener('mouseenter', scheduleShow);
      el.addEventListener('mouseleave', onLeave);
      el.addEventListener('focus', scheduleShow);
      el.addEventListener('blur', onLeave);
      el.addEventListener('click', onClick);

      effect(() => {
        getText((text) => {
          currentText = text == null || text === '' ? '' : String(text);
        });
      });

      cleanup(() => {
        if (showTimer) clearTimeout(showTimer);
        el.removeEventListener('mouseenter', scheduleShow);
        el.removeEventListener('mouseleave', onLeave);
        el.removeEventListener('focus', scheduleShow);
        el.removeEventListener('blur', onLeave);
        el.removeEventListener('click', onClick);
        if (activeTrigger === el) hideTip();
      });
    });
  });
}
