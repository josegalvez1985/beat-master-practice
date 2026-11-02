import js from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  { ignores: ["dist/*", "functions/lib/*", "functions/node_modules/*"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // The browser's own dialogs: use confirmar (src/components/ui/confirmar.tsx) and avisar.
    files: ["src/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "confirm", message: "Usa confirmar() de @/components/ui/confirmar." },
        { name: "alert", message: "Usa avisar() de @/components/ui/toast." },
        { name: "prompt", message: "Usa un Dialog con un Input." },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "window",
          property: "confirm",
          message: "Usa confirmar() de @/components/ui/confirmar.",
        },
        { object: "window", property: "alert", message: "Usa avisar() de @/components/ui/toast." },
        { object: "window", property: "prompt", message: "Usa un Dialog con un Input." },
      ],
    },
  },
  {
    files: ["scripts/**", "functions/**"],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
