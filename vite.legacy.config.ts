// Standalone build of the legacy (old set-top browser) renderer.
// Output: public/legacy/legacy.js — a single classic, down-levelled IIFE that
// the main app's watchdog loads when the React bundle does not start.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, loadEnv, type Plugin } from "vite";

const IMAGE_RE = /\/src\/assets\/.+\.(jpe?g|png|webp)$/;

/**
 * Library builds always inline imported images as base64, which would bloat the
 * script to several MB on a weak set-top box. Emit them as plain files under
 * /legacy/img/ instead and make the imports resolve to those URLs.
 */
function legacyImages(): Plugin {
  const files = new Map<string, string>();
  return {
    name: "legacy-images",
    enforce: "pre",
    load(id) {
      const clean = id.split("?")[0]!.split(path.sep).join("/");
      if (!IMAGE_RE.test(clean)) return null;
      const name = path.basename(clean).replace(/\s+/g, "-");
      files.set(name, clean);
      return `export default ${JSON.stringify(`/legacy/img/${name}`)};`;
    },
    generateBundle() {
      for (const [name, file] of files) {
        this.emitFile({ type: "asset", fileName: `img/${name}`, source: fs.readFileSync(file) });
      }
    },
  };
}

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, dir, "VITE_");
  const apiUrl = process.env["VITE_API_URL"] ?? env["VITE_API_URL"] ?? "http://localhost:3000";
  return {
    base: "/legacy/",
    plugins: [legacyImages()],
    publicDir: false,
    resolve: { alias: { "@": path.resolve(dir, "src") } },
    define: { __API_URL__: JSON.stringify(apiUrl) },
    build: {
      outDir: "public/legacy",
      emptyOutDir: true,
      target: "es2015",
      assetsInlineLimit: 0,
      minify: true,
      lib: {
        entry: path.resolve(dir, "src/legacy/main.ts"),
        formats: ["iife"],
        name: "BarboardLegacy",
        fileName: () => "legacy.js",
      },
      rollupOptions: { output: { assetFileNames: "assets/[name]-[hash][extname]" } },
    },
  };
});
