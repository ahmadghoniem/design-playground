import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PlaygroundLayout } from './layout';
import { PlaygroundPage } from './page';
import { PlaygroundIterationIsolatedPage } from './iterations/[slug]/page';

// basename="/playground" matches the clean URL the vite-plugin serves at.
// Routes are declared relative to that basename.
createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename="/playground">
    <PlaygroundLayout>
      <Routes>
        <Route path="/" element={<PlaygroundPage />} />
        <Route path="/iterations/:slug" element={<PlaygroundIterationIsolatedPage />} />
      </Routes>
    </PlaygroundLayout>
  </BrowserRouter>
);
