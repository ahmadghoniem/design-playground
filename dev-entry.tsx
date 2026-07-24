import "@/index.css"
import { createRoot } from "react-dom/client"
import PlaygroundClient from "@pg/app/PlaygroundClient"
import "@pg/styles/playground-tailwind-entry.css"
import "@pg/styles/playground-global.css"

createRoot(document.getElementById("root")!).render(<PlaygroundClient />)
