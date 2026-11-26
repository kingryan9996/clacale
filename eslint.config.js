import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

/* 오류(error)는 "진짜 버그"만, 나머지는 경고(warn). CI는 오류가 있을 때만 실패합니다. */
export default [
  { ignores: ["dist", "node_modules", "Clacale.jsx", "Clacale-preview.html"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } }, globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // JSX로만 쓰는 컴포넌트(대문자)는 미사용으로 보지 않음. catch(e)의 e 는 무시
      "no-unused-vars": ["warn", { varsIgnorePattern: "^[A-Z_]", caughtErrors: "none" }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["public/sw.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "script", globals: globals.serviceworker },
    rules: { "no-unused-vars": ["warn", { caughtErrors: "none" }], "no-empty": ["warn", { allowEmptyCatch: true }] },
  },
  {
    files: ["*.config.js", "vite.sw-plugin.js", "*.test.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.node },
  },
];
