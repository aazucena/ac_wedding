import astroPlugin from "eslint-plugin-astro";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  ...astroPlugin.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parser: tsParser },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
