import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // 🎯 Reglas pragmáticas — warn para deuda técnica, error para lo crítico
  {
    rules: {
      // `any` es deuda técnica, no debe bloquear el desarrollo
      "@typescript-eslint/no-explicit-any": "warn",
      // setState en effects: común en montaje, se limpia cuando se toca el archivo
      "react-hooks/set-state-in-effect": "warn",
      // Caracteres sin escapar en JSX: menor prioridad
      "react/no-unescaped-entities": "warn",
      // children como prop: warning, no blocker
      "react/no-children-prop": "warn",
    },
  },
]);

export default eslintConfig;
