import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Resultados de joins do Supabase (ex: `activities ( title )`) não
      // são tipados até os tipos reais serem gerados via `supabase gen
      // types typescript` — usamos `any` propositalmente nesses pontos.
      "@typescript-eslint/no-explicit-any": "off",
      // Regra experimental que confunde Date.now() dentro de handlers
      // assíncronos (ex: nome de arquivo no upload) com uma chamada
      // durante a renderização.
      "react-hooks/purity": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
