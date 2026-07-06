# DentC Frontend — Tech Stack

The tech stack powering the **dentc-frontend** dental practice management app, based on `package.json`, config files, and project conventions.

## Core Framework & Language

| Tech | Version | Role |
|---|---|---|
| **React** | 19.2 | UI library |
| **TypeScript** | 5.9 | Typed JavaScript |
| **Vite** | 7.2 | Build tool / dev server |
| **React Router** | 7.11 | Client-side routing |

**Advantages:**
- **React 19** — Latest version with the new compiler-friendly rendering, automatic batching, and improved `use()` / Suspense support. Huge ecosystem and component reusability, which suits a large app with dozens of patient/setup screens.
- **TypeScript** — Catches bugs at compile time, gives autocomplete, and lets you bind UI state *directly* to the backend's snake_case shapes via the generated Orval types — the backend↔frontend parity rule depends on this.
- **Vite** — Near-instant dev server startup and Hot Module Replacement (HMR) thanks to native ESM + esbuild. Production builds use Rollup. Far faster feedback loop than Webpack/CRA for an app this size.

## UI & Styling

| Tech | Role |
|---|---|
| **Tailwind CSS v4** | Utility-first styling |
| **Radix UI** (~25 packages) | Headless accessible primitives |
| **shadcn/ui pattern** | `class-variance-authority` + `clsx` + `tailwind-merge` |
| **lucide-react** | Icon set |
| **next-themes** | Light/dark theming |
| **sonner / vaul / cmdk / embla** | Toasts, drawers, command palette, carousels |

**Advantages:**
- **Tailwind v4** — New engine is dramatically faster, configured via CSS (`@tailwindcss/postcss`) instead of a big JS config. Keeps styling colocated and consistent without writing custom CSS files. Underpins the responsive-layout refactor (`--app-nav-height`, AppShell).
- **Radix UI** — Unstyled but fully accessible (keyboard nav, ARIA, focus management) primitives. You get correct dialog/select/tooltip behavior for free and style it yourself with Tailwind — the **shadcn/ui** approach. Critical for a clinical app where accessibility and predictable interaction matter.
- **CVA + tailwind-merge** — Lets you define component variants type-safely and resolve conflicting Tailwind classes cleanly.

## Data & Forms

| Tech | Role |
|---|---|
| **TanStack React Query** 5 | Server-state / caching |
| **Axios** | HTTP client |
| **Orval** | Generates typed API client + React Query hooks from `openapi.json` |
| **React Hook Form** + **Zod** + **@hookform/resolvers** | Forms & validation |

**Advantages:**
- **React Query** — Manages server state (caching, background refetch, invalidation) so you don't reinvent it with `useEffect`/`useState`.
- **Orval** — The keystone of the architecture. It reads the backend's OpenAPI spec and **auto-generates** the typed client and hooks in `src/api/generated/**`. That's why the snake_case parity rule works — the types *are* the backend contract. Run `npm run api:sync` and the frontend stays in lockstep with the backend, eliminating an entire class of drift bugs.
- **React Hook Form + Zod** — RHF minimizes re-renders (uncontrolled inputs) for fast forms; Zod gives runtime schema validation that doubles as TypeScript types. Ideal for the many data-entry screens (patient intake, insurance, setup).

## Domain-Specific Libraries

- **recharts** — Declarative charts for Dashboard/Reports KPI widgets.
- **jspdf + jspdf-autotable** — Client-side PDF generation (Treatment Plan reports, Lab/Cost reports, prescriptions) — important since the backend has no export endpoints.
- **react-day-picker**, **input-otp**, **react-resizable-panels** — Date pickers, OTP auth fields, resizable layouts.

## Tooling & Deployment

| Tech | Role |
|---|---|
| **ESLint 9** (flat config) + typescript-eslint | Linting |
| **Express + compression** (`server.js`) | Production static server |
| **PM2** (`ecosystem.config.js`) | Process manager |
| **rollup-plugin-visualizer / terser** | Bundle analysis & minification |

**Advantages:**
- **Express + PM2** — Serves the built SPA with gzip compression, and PM2 keeps it alive with clustering, auto-restart, and zero-downtime reloads (`npm run deploy` → build + `pm2 reload`). Production-grade hosting without a heavy platform.
- **Bundle visualizer + terser** — Lets you inspect and shrink the bundle (`npm run build:analyze`), which matters as the app grows across many feature modules.

## How It All Fits Together

The defining choice is the **OpenAPI → Orval → React Query → TypeScript** pipeline. The FastAPI backend's spec is the single source of truth; Orval turns it into typed hooks; React Query handles caching; TypeScript enforces that components use the exact snake_case fields the backend expects. This is what makes the "no camelCase aliases, no mapping layer" rule enforceable rather than aspirational — and it's the right backbone for an app with as many CRUD-heavy clinical screens as DentC has.
