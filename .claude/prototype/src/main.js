import Alpine from 'alpinejs';
import { loadPartials, wireCrossComponentEvents } from './components/proto.js';
import './components/library.js';
import './components/canvas.js';
import './components/chat.js';
import './components/design-agents.js';
import './components/modals.js';
import './components/tooltip.js';
import './components/goo.js';
import './components/theme.js';
import './components/proto.js';
import './components/variant-nav.js';

window.Alpine = Alpine;

await loadPartials();
wireCrossComponentEvents();
Alpine.start();
