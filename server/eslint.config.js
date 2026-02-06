import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: ["dist", "node_modules", "data", "coverage"],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [js.configs.recommended, eslintConfigPrettier],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      eslintConfigPrettier,
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
      parserOptions: {
        project: ["./tsconfig.eslint.json"],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
