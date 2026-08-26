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
    // Scripts de skills de agentes: código de terceros que se instala en el
    // repo. Sus avisos tapaban los del proyecto.
    ".agents/**",
    ".claude/**",
    ".windsurf/**",
    "app/generated/**",
  ]),
]);

export default eslintConfig;
