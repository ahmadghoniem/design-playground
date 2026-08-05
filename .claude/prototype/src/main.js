import Alpine from 'alpinejs';
import { loadPartials, wireCrossComponentEvents } from './components/proto.js';
import './components/theme.js';
import './components/sidebar.js';
import './components/canvas.js';
import './components/chat.js';
import './components/panel.js';
import './components/modals.js';
import './components/spec.js';
import './components/proto.js';

window.Alpine = Alpine;

await loadPartials();
wireCrossComponentEvents();
Alpine.start();
