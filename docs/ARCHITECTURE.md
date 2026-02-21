# psp-dashboard Architecture Rules (DD/Feature + App Router)

## Non-negotiables
- `src/app/**` contains **routes only**:
  - `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`
- No business logic, no “derive ui state”, no reusable components in `src/app/**`.

## Layers
- **features/** — product modules (invoices, accounting, auth, ...)
  - `ui/` (sections, page composition components)
  - `model/` (hooks, derive functions, UI state)
  - `api/` (fetchers, client functions)
  - `types/` (UI-level types)
- **entities/** — domain entities (invoice, merchant, ...)
  - `types/` (domain types)
  - `lib/` (pure helpers, normalization)
- **shared/** — reusable UI + utils
  - `ui/` (Badge, Table, JsonViewer, Toast)
  - `lib/` (formatters, guards, helpers)
  - `types/` (Brand, Result, Nullable)

## Imports
Prefer:
- `@/shared/...`
- `@/entities/...`
- `@/features/...`

Avoid importing from `@/app/...` (except route constants if ever needed).

## TypeScript
- No `any`.
- Use `unknown` + type guards for untrusted data.
