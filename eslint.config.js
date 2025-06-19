import globals from "globals";
import js from "@eslint/js";
import prettierConfig from "eslint-plugin-prettier/recommended";

export default [
  // Apply recommended ESLint rules
  js.configs.recommended,

  // Apply Prettier rules
  prettierConfig,

  // Configure global variables for browser environment
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node // Also include Node.js globals for scripts
      }
    }
  },
  
  // Ignore the node_modules directory globally
  {
    ignores: ["node_modules/"]
  }
];