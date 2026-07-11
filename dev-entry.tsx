import "@/index.css"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import PlaygroundClient from "@pg/app/PlaygroundClient"
import { PlaygroundIterationIsolatedPage } from "@pg/iterations/IterationIsolatedPage"
import "./playground-tailwind-entry.css"
import "@pg/styles/playground-global.css"

// basename="/playground" matches the clean URL the vite-plugin serves at.
// Routes are declared relative to that basename.
createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename="/playground">
    <Routes>
      <Route path="/" element={<PlaygroundClient />} />
      <Route path="/iterations/:slug" element={<PlaygroundIterationIsolatedPage />} />
    </Routes>
  </BrowserRouter>
)
