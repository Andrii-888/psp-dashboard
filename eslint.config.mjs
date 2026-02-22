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
            "Do not use toLocaleString() (hydration risk). Use SSOT formatters from src/shared/lib/formatters.ts",
        },
      ],
    },
  },

  // 2) Ban time/random in UI render path (but allow in API routes)
  {
    files: [
      "src/app/**/*.{tsx,jsx}",

      // UI-only inside features/shared
      "src/features/**/ui/**/*.{tsx,jsx}",
      "src/shared/**/ui/**/*.{tsx,jsx}",
      "src/shared/ui/**/*.{tsx,jsx}",
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

  // =====================================================
  // Architecture boundaries (SSOT)
  // =====================================================
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          // ESLint 9 (flat config) schema: use `paths` (NOT `patterns`)
          // This blocks importing the base aliases directly.
          // We will add real subpath boundaries in the next step via a boundaries plugin.
          paths: [
            {
              name: "@/app",
              message:
                "Do not import from src/app/**. app/** is routes-only (pages/layouts/route handlers).",
            },
            {
              name: "@/components",
              message:
                "Legacy import path. Use src/shared/** or src/features/**.",
            },
            {
              name: "@/hooks",
              message:
                "Legacy import path. Use src/shared/hooks/** or src/features/**/hooks/**.",
            },
            {
              name: "@/lib",
              message:
                "Legacy import path. Use src/shared/** or src/features/**.",
            },
            {
              name: "@/features",
              message:
                "Do not import feature modules from shared. shared/** must be feature-agnostic.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
