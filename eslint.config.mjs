import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Helper function to trim keys of an object. We unfortunately have dependencies
 * which rely on an older version of globals which has keys with
 * leading/trailing spaces, so we need to trim them.
 * @param {*} globalsObject The global object with leading/trailing spaces in
 * keys.
 * @returns The trimmed globals object.
 */
const trimGlobalsKeys = (globalsObject) => {
  const trimmedGlobals = {};
  for (const key in globalsObject) {
    if (Object.hasOwn(globalsObject, key)) {
      trimmedGlobals[key.trim()] = globalsObject[key];
    }
  }
  return trimmedGlobals;
};

export default [
  {
    ignores: ["build/**", "node_modules/**", "public/pdfjs/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...trimGlobalsKeys(globals.browser),
      },
    },
    plugins: {
      js,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
    settings: {
      react: {
        version: "18.3",
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      },
    },
  },
];
