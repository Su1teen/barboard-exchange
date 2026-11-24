// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    build: {
      // Cheap set-top boxes run very old Chromium/WebView builds. Down-level
      // the shipped JS (optional chaining, ??, class fields, ...) to ES2017 so
      // the bundle at least parses there; src/lib/polyfills.ts covers the
      // handful of newer runtime APIs.
      target: "es2017",
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Co-located test files (e.g. src/routes/index.test.tsx) live next to the
    // routes they exercise. Exclude them from the route generator so they do
    // not need to export a Route and do not pollute the route tree.
    router: { routeFileIgnorePattern: "[.](test|spec)[.]" },
  },
});
