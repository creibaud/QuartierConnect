import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

// jsx-a11y's recommended rules, downgraded to warnings so pre-existing
// accessibility issues are surfaced without failing the build or CI.
const jsxA11yWarnings = {
    ...jsxA11y.flatConfigs.recommended,
    name: "jsx-a11y/recommended-warnings",
    rules: Object.fromEntries(
        Object.entries(jsxA11y.flatConfigs.recommended.rules).map(
            ([rule, level]) => [rule, level === "off" ? "off" : "warn"],
        ),
    ),
};

export default defineConfig([
    globalIgnores(["dist"]),
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactHooks.configs.flat.recommended,
            reactRefresh.configs.vite,
            jsxA11yWarnings,
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
    },
]);
