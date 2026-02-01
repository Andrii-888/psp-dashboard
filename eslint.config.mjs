import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // Base Next.js configs
  ...nextVitals,
  ...nextTs,

  // Override default ignores of eslint-config-next
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),

  // =====================================================
  // Guardrails against hydration bugs (#418)
  // =====================================================

  // 1) Ban locale-dependent formatting everywhere
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='toLocaleString']",
          message:
            "Do not use toLocaleString() (hydration risk). Use SSOT formatters from src/lib/formatters.ts",
        },
      ],
    },
  },

  // 2) Ban time/random in UI render path (but allow in API routes)
  {
    files: [
      "src/components/**/*.{ts,tsx,js,jsx}",
      "src/app/**/*.{ts,tsx,js,jsx}",
    ],
    ignores: ["src/app/api/**/*"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "Date",
          property: "now",
          message:
            "Do not use Date.now() in UI render path. Generate time in effects/handlers or on the server and pass it as data.",
        },
        {
          object: "Math",
          property: "random",
          message:
            "Do not use Math.random() in UI render path. Generate randomness in effects/handlers or on the server and pass it as data.",
        },
      ],
    },
  },
]);

export default eslintConfig;
