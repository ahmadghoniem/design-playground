import "@/index.css"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import PlaygroundClient from "./app/PlaygroundClient"
import { PlaygroundIterationIsolatedPage } from "./iterations/IterationIsolatedPage"
import "./playground-tailwind-entry.css"
import "./styles/playground-global.css"

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
