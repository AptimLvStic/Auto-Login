import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";

export default [
  {
    ignores: ["dist/**", "release/**", "output/**", "node_modules/**"]
  },
  js.configs.recommended,
  {
    files: ["src/main/**/*.js", "src/preload/**/*.js", "src/shared/**/*.js", "scripts/**/*.mjs", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node
    }
  },
  {
    files: ["src/renderer/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: globals.browser
    },
    plugins: { react },
    settings: {
      react: { version: "detect" }
    },
    rules: {
      "react/jsx-uses-vars": "error",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off"
    }
  }
];
