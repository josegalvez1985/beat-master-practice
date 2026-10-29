import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // "/" on www.pypulso.online; "/beat-master-practice/" on GitHub Pages (set by the workflow).
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "react-native": "react-native-web",
    },
    extensions: [".web.tsx", ".web.ts", ".web.js", ".tsx", ".ts", ".mjs", ".js", ".jsx", ".json"],
  },
});
