import { defineConfig } from "vite";
import { qwikVite } from "@qwik.dev/core/optimizer";

// `vite build` builds the client (for q-manifest.json), `vite build --ssr` the Node bench
const entry = process.env.ENTRY ?? "src/bench.tsx";

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    qwikVite({
      client: { input: entry, outDir: "dist/client" },
      ssr: { input: entry, outDir: "dist" },
    }),
  ],
  build: isSsrBuild
    ? { minify: false, rollupOptions: { output: { entryFileNames: "[name].js" } } }
    : {},
}));
