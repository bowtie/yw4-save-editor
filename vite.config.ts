import { defineConfig } from "vite-plus";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/yw4-save-editor/",
  plugins: [tailwindcss()],
  server: {
    // Vite stamps HMR module URLs with ?t= and marks them immutable, which
    // freezes stale modules across reloads in some embedded browsers. Never
    // let dev responses cache.
    headers: { "Cache-Control": "no-store" },
  },
  build: {
    target: "es2020",
    outDir: "dist",
    assetsInlineLimit: 0,
  },
});
