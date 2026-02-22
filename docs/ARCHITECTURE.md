psp-dashboard Architecture Rules (SSOT)

This repository follows a feature-module architecture with clean layers on top of Next.js App Router.

The goal is a fintech-grade structure: predictable, scalable, and protected from regressions via ESLint guardrails.

Project Structure Rules (SSOT)

1. src/app/\*\* = Routes Only (Leaf Layer)

src/app/\*\* contains routing artifacts only:

page.tsx

layout.tsx

loading.tsx

error.tsx

not-found.tsx

route.ts

It may also contain route folders such as:

app/invoices/\*\*

app/accounting/\*\*

app/pay/\*\*

app/api/\*\*

❌ Do NOT place inside app/:

business logic

derive / ui-state

selectors

reusable UI components

domain models / types

formatters or utilities

app/ is a leaf layer.
It composes pages using features/** and shared/**.

Special Case: app/api/\*\*

src/app/api/\*\* contains Next.js route handlers (server endpoints).

API routes:

may call shared/api, shared/lib

may call feature server logic when necessary

must NOT contain reusable UI or client-side feature logic

Enforced Rule

Nothing should import from:

@/app/\*

This is enforced by ESLint.

2. src/features/\*\* = Feature Modules

Each product feature is an isolated module.

A feature owns:

its UI

its state derivation

its feature-specific logic

its feature-specific API calls

its internal types

Allowed internal layers (use only what is needed)

ui/ — React UI components

model/ — derive/uiState/selectors (pure TypeScript, no React)

api/ — feature API calls

lib/ — pure utilities (no React)

actions/ — server actions (if needed)

hooks/ — feature hooks

types/ — feature types

Example
src/features/invoices/
ui/
model/
api/
lib/
hooks/
types/
Rule of Thumb

If it is feature-specific, it belongs inside that feature.

If it is reusable across multiple features, it belongs to shared/\*\*.

3. src/shared/\*\* = Reusable Building Blocks

Everything reusable across features must live in shared/\*\*.

Recommended structure

shared/ui/\*\* — reusable UI components (React)

shared/lib/\*\* — reusable utilities (pure TypeScript)

shared/hooks/\*\* — reusable hooks

shared/types/\*\* — reusable types

shared/api/\*\* — shared API clients/fetchers

Critical Boundary

shared/\*\* must be feature-agnostic

shared/** must NOT depend on features/**

Import Rules
Allowed dependency directions

app/ → features/, shared/

features/ → shared/

shared/ → shared/

Forbidden dependency directions

shared/ → features/

features/ → app/

any module → legacy roots (components, hooks, lib)

Guardrails (Enforced by ESLint)

1. No Legacy Roots

The following aliases must NOT be used:

@/components/_
@/hooks/_
@/lib/\*

Use:

@/shared/**
@/features/** 2) app/ is Routes-Only

Imports from:

@/app/\*

are forbidden.

3. Hydration Safety Rules

To avoid client/server mismatches:

Forbidden everywhere:

toLocaleString()
Use centralized SSOT formatters from:

src/shared/lib/formatters.ts
Forbidden in UI render paths (tsx/jsx):

Date.now()

Math.random()

Applies to:

src/app/**/\*.{tsx,jsx}
src/features/**/ui/**/\*.{tsx,jsx}
src/shared/**/ui/\*_/_.{tsx,jsx}

Randomness or time generation must occur:

in effects

in event handlers

on the server

or be passed as data

Quick Checklist (Definition of Done)
npm run build ✅
npm run lint ✅
rg 'from "@/app/' -n src → 0
rg 'components/invoice-details' -n src → 0
Notes

When adding new code:

Decide: feature-specific or reusable?

Place it inside:

features/<feature>/\*\*

or shared/\*\*

Keep app/\*\* strictly for route composition.

This document is the Single Source of Truth (SSOT) for project structure.
