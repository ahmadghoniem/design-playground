import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PlaygroundPage } from './app/page';
import { PlaygroundIterationIsolatedPage } from './iterations/IterationIsolatedPage';
import './styles/playground-global.css';
import './playground-tailwind-entry.css';

// basename="/playground" matches the clean URL the vite-plugin serves at.
// Routes are declared relative to that basename.
createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename="/playground">
    <Routes>
      <Route path="/" element={<PlaygroundPage />} />
      <Route path="/iterations/:slug" element={<PlaygroundIterationIsolatedPage />} />
    </Routes>
  </BrowserRouter>
);
