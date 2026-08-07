// The shared config preset already includes TanStack devtools (dev-only, first),
// tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only, cloudflare
// target by default), VITE_* env injection, the @ path alias, React/TanStack dedupe and
// error logger plugins — do NOT add them manually or the app breaks with duplicate plugins.
// Additional config can be passed via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
