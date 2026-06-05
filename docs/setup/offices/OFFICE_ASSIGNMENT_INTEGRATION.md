# Office Assignment — Integration

Setup → Offices → **Office Assignment** (`/setup/offices/office-assignment`).
Phase 3 of the Setup modernization. Backend gaps + resolution: `office_assignment_backend_devreport.md`;
backend implementation notes: `OFFICE_ASSIGNMENT_BACKEND_NOTES.md`.

> **Updated 2026-06-01** — after backend gaps #24–#31/#33 landed and the Orval client was re-synced,
> seven tabs became **editable** dual-list assignment (were gated/read-only). Only Ortho Misc Setup
> remains gated.

## 1. Screen Analysis

**Purpose.** Manage which catalog entities are assigned to a specific office.

**User workflow.** Pick an office from the list → tabbed detail view opens → each tab shows an
Available ↔ Assigned picker → move items → **Save** (per-tab) persists the full assigned set.

**Tabs (legacy 9):** Procedures, Exp Codes, Prod Types, Users, Providers, Notes Macros,
RX, Ortho Misc Setup, Letters.

| Tab | Built as | Backend |
|-----|----------|---------|
| Users | Editable dual-list (bulk set + server-side copy) | `GET/PUT /offices/{id}/users`, `…/copy-from/{src}` |
| Procedures | Editable dual-list | `GET/PUT /offices/{id}/procedure-codes` (str ids) |
| Exp Codes | Editable dual-list | `GET/PUT /offices/{id}/exp-codes` (catalog = `code-bundles`) |
| Prod Types | Editable dual-list | `GET/PUT /offices/{id}/production-types` (new catalog) |
| Providers | Editable dual-list (now M:N) | `GET/PUT /offices/{id}/providers` (str ids) |
| Notes Macros | Editable dual-list | `GET/PUT /offices/{id}/note-macros` |
| RX | Editable dual-list | `GET/PUT /offices/{id}/prescription-library` |
| Letters | Editable dual-list | `GET/PUT /offices/{id}/letter-templates` |
| Ortho Misc Setup | Gated "pending backend" | not built (#32 — columns unknown) |

**UI components.**
- `OfficeAssignment.tsx` — list→detail→tabs shell (mirrors `OfficeSetup.tsx` theme/UX).
- `DualListPicker.tsx` — reusable Available↔Assigned transfer list (search, multi-select,
  `>` `»` `<` `«` move buttons, double-click to move).
- `tabs/assignment/CatalogAssignmentTab.tsx` — **generic** editable dual-list tab driven by an
  `AssignmentResource`; used by Procedures, Exp Codes, Prod Types, Providers, Notes Macros, RX, Letters.
- `tabs/assignment/UsersAssignmentTab.tsx` — Users (bespoke: Active filter + Copy-From + bulk save).
- `TabNotAvailable` (inline) — gated state for Ortho Misc Setup.

## 2. API Mapping

Uniform office-scoped pair per catalog (`GET` assigned + `PUT { ids }` replace-set):

| Tab | Assigned GET / set PUT | Catalog (left pane) | id |
|---|---|---|---|
| Users | `listOfficeUsers` / `setOfficeUsers` (`{user_ids}`) + `copyOfficeUsersFrom` | `listUsers` | int |
| Procedures | `listOfficeProcedureCodes` / `setOfficeProcedureCodes` | `listProcedureCodes` | str (`code`) |
| Exp Codes | `listOfficeExpCodes` / `setOfficeExpCodes` | `listCodeBundles` | int |
| Prod Types | `listOfficeProductionTypes` / `setOfficeProductionTypes` | `listProductionTypes` | int |
| Providers | `listOfficeProviders` / `setOfficeProviders` | `listProviders` | str (`PRV-…`) |
| Notes Macros | `listOfficeNoteMacros` / `setOfficeNoteMacros` | `listNoteMacros` | int |
| RX | `listOfficePrescriptionLibrary` / `setOfficePrescriptionLibrary` | `listPrescriptionLibrary` | int |
| Letters | `listOfficeLetterTemplates` / `setOfficeLetterTemplates` | `listLetterTemplates` | int |

Set bodies: `StrIdAssignmentSet`/`IntIdAssignmentSet` (`{ids}`), `OfficeUsersSet` (`{user_ids}`).
Service wrappers (wrap the generated client — no raw axios; page catalogs at `size=200`; snake_case):
`src/services/officeAssignmentApi.ts` (7 catalogs) + `src/services/officeUserAssignmentApi.ts` (Users).

## 3. Frontend Changes (this round)

- **New:** `services/officeAssignmentApi.ts` (generic per-resource loaders + bulk set),
  `tabs/assignment/CatalogAssignmentTab.tsx` (generic editable tab).
- **Rewritten:** `services/officeUserAssignmentApi.ts` → dedicated bulk-set/denormalized-read/copy
  endpoints (dropped the N-call diff, client join, copy emulation, and the #33 client filter).
  `tabs/assignment/UsersAssignmentTab.tsx` → bulk save + immediate server-side Copy.
- **Updated:** `OfficeAssignment.tsx` — Procedures/Exp Codes/Prod Types/Providers/Notes Macros/RX/Letters
  now render `CatalogAssignmentTab`; Ortho Misc stays gated.
- **Removed (obsolete):** `ReadOnlyAssignmentGrid.tsx`, `tabs/assignment/ProvidersAssignmentTab.tsx`,
  `tabs/assignment/CatalogPreviewTabs.tsx`, `services/officeAssignmentCatalogApi.ts`.

## 4. Backend Gaps — status

See `office_assignment_backend_devreport.md` / `backend_devreport.md`:
- **✅ Resolved & wired:** #24 Procedures, #25 Exp Codes (= `code_bundles`), #26 Prod Types,
  #27 Users (bulk/copy/`created_by`), #28 Providers (M:N + `first_name`/`last_name`/`created_by`),
  #29 Notes Macros, #30 RX, #31 Letters, #33 server-side `office_id` filter.
- **⛔ Outstanding:** #32 Ortho Misc Setup — backend not built (columns unknown); tab gated.
  **Action: product/FE to provide the Ortho Misc field list** so backend can build the resource.

## 5. Validation Checklist

| Item | Status |
|---|---|
| Orval client re-synced from live backend (`npm run api:sync`) | ✅ |
| Users — read (denormalized) / bulk Save / server-side Copy / Active filter | ✅ |
| 7 catalogs — read assigned + catalog, move, Save (replace-set) | ✅ wired |
| Search / multi-select / move buttons | ✅ |
| Loading / error / empty / saving states | ✅ |
| Success/error notifications (sonner) | ✅ |
| Ortho Misc Setup | ⛔ gated (#32) |
| No mock/hardcoded business data | ✅ (all backend-driven) |
| `npx tsc -b` / `npx eslint` | ✅ clean on all new/changed files |
| Manual click-through against live backend | ⏳ not yet run |

## 6. Completion Summary

**Completed:** Orval re-synced against the updated backend. Office Assignment now ships **eight
editable assignment tabs** — Users (dedicated bulk-set + immediate server-side copy + Active filter)
and seven catalogs (Procedures, Exp Codes, Prod Types, Providers, Notes Macros, RX, Letters) via the
generic `CatalogAssignmentTab` + `DualListPicker`, all backend-driven through the uniform
`GET/PUT /offices/{id}/<resource>` endpoints. Obsolete read-only components removed. `tsc` + `eslint` clean.

**Outstanding:**
- **#32 Ortho Misc Setup** — gated until the backend builds the resource; needs the field list from product/FE.
- Manual end-to-end verification against the running backend (assign/remove/save/copy round-trips).
- Optional: confirm Production Types catalog columns match the legacy grid; decide provider split-name backfill
  (backend `OFFICE_ASSIGNMENT_BACKEND_NOTES.md` open questions).
