/**
 * Office Assignment — catalog assignment data access (Procedures, Exp Codes,
 * Prod Types, Providers, Notes Macros, RX, Letters).
 *
 * Wraps the generated Orval client (no raw axios). Every assignable catalog now
 * follows a uniform office-scoped pair shipped by the backend (gaps #24–#31):
 *   GET /api/v1/offices/{office_id}/<resource>   → assigned rows
 *   PUT /api/v1/offices/{office_id}/<resource>   → replace the full assigned set
 * The PUT body is `{ ids: [...] }` — string ids for Procedures/Providers
 * (`StrIdAssignmentSet`), int ids for the rest (`IntIdAssignmentSet`).
 *
 * Each resource exposes the same three operations returning a UI-neutral
 * `AssignmentRow` (no JSX) so the generic `CatalogAssignmentTab` can render any of
 * them. The full catalog (left pane) comes from the existing tenant-wide list
 * endpoints; the assigned set (right pane) from the office-scoped GET.
 */
import {
  listOfficeProcedureCodes,
  setOfficeProcedureCodes,
  listOfficeExpCodes,
  setOfficeExpCodes,
  listOfficeProductionTypes,
  setOfficeProductionTypes,
  listOfficeProviders,
  setOfficeProviders,
  listOfficeNoteMacros,
  setOfficeNoteMacros,
  listOfficePrescriptionLibrary,
  setOfficePrescriptionLibrary,
  listOfficeLetterTemplates,
  setOfficeLetterTemplates,
} from "@/api/generated/endpoints/office-assignment/office-assignment";
import {
  listProcedureCodes,
  listCodeBundles,
  listNoteMacros,
  listPrescriptionLibrary,
} from "@/api/generated/endpoints/procedures/procedures";
import { listProductionTypes } from "@/api/generated/endpoints/office-setup/office-setup";
import { listProviders } from "@/api/generated/endpoints/organization/organization";
import { listLetterTemplates } from "@/api/generated/endpoints/communications/communications";

const PAGE_SIZE = 200; // backend max page size on list endpoints

/** UI-neutral row for the dual-list. `active` drives an Active/Inactive badge. */
export type AssignmentRow = {
  id: string;
  primary: string;
  secondary?: string;
  active?: boolean | null;
};

/** One assignable resource: load the full catalog, the office's assigned set, and save. */
export type AssignmentResource = {
  loadCatalog: () => Promise<AssignmentRow[]>;
  loadAssigned: (officeId: number) => Promise<AssignmentRow[]>;
  save: (officeId: number, ids: string[]) => Promise<void>;
};

/** Page through a paginated list endpoint until every item is collected. */
async function pageAll<T>(
  fetchPage: (page: number) => Promise<{ items: T[]; meta: { pages: number } }>,
): Promise<T[]> {
  const first = await fetchPage(1);
  const all = [...first.items];
  for (let page = 2; page <= (first.meta?.pages ?? 1); page++) {
    const next = await fetchPage(page);
    all.push(...next.items);
  }
  return all;
}

const toInt = (ids: string[]) => ids.map((id) => Number(id));

/* --------------------------------------------------------------------------
 * Procedures (#24) — string id = procedure `code`. Catalog: /procedure-codes.
 * ------------------------------------------------------------------------ */
export const proceduresResource: AssignmentResource = {
  loadCatalog: async () =>
    (await pageAll((page) => listProcedureCodes({ page, size: PAGE_SIZE }))).map((p) => ({
      id: p.code,
      primary: p.code,
      secondary: p.description,
      active: p.is_active,
    })),
  loadAssigned: async (officeId) =>
    (await listOfficeProcedureCodes(officeId)).map((p) => ({
      id: p.code,
      primary: p.code,
      secondary: p.description,
      active: p.is_active,
    })),
  save: async (officeId, ids) => {
    await setOfficeProcedureCodes(officeId, { ids });
  },
};

/* --------------------------------------------------------------------------
 * Exp Codes (#25) — int id. Catalog: /code-bundles (display_code → Code).
 * ------------------------------------------------------------------------ */
export const expCodesResource: AssignmentResource = {
  loadCatalog: async () =>
    (await pageAll((page) => listCodeBundles({ page, size: PAGE_SIZE }))).map((c) => ({
      id: String(c.id),
      primary: c.display_code ?? c.name,
      secondary: c.description ?? c.name,
    })),
  loadAssigned: async (officeId) =>
    (await listOfficeExpCodes(officeId)).map((c) => ({
      id: String(c.id),
      primary: c.display_code ?? c.name,
      secondary: c.description ?? c.name,
    })),
  save: async (officeId, ids) => {
    await setOfficeExpCodes(officeId, { ids: toInt(ids) });
  },
};

/* --------------------------------------------------------------------------
 * Prod Types (#26) — int id. Catalog: new /production-types.
 * ------------------------------------------------------------------------ */
export const prodTypesResource: AssignmentResource = {
  loadCatalog: async () =>
    (await pageAll((page) => listProductionTypes({ page, size: PAGE_SIZE }))).map((t) => ({
      id: String(t.id),
      primary: t.name,
      secondary: t.description ?? t.color ?? undefined,
      active: !t.is_inactive,
    })),
  loadAssigned: async (officeId) =>
    (await listOfficeProductionTypes(officeId)).map((t) => ({
      id: String(t.id),
      primary: t.name,
      secondary: t.description ?? t.color ?? undefined,
      active: !t.is_inactive,
    })),
  save: async (officeId, ids) => {
    await setOfficeProductionTypes(officeId, { ids: toInt(ids) });
  },
};

/* --------------------------------------------------------------------------
 * Providers (#28) — string id (PRV-…), now multi-office. Catalog: /providers.
 * ------------------------------------------------------------------------ */
function providerName(p: { name: string; first_name?: string | null; last_name?: string | null }): string {
  const split = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
  return split || p.name;
}
export const providersResource: AssignmentResource = {
  loadCatalog: async () =>
    (await pageAll((page) => listProviders({ page, size: PAGE_SIZE }))).map((p) => ({
      id: p.id,
      primary: providerName(p),
      secondary: [p.short_id, p.role].filter(Boolean).join(" · ") || undefined,
      active: p.is_active,
    })),
  loadAssigned: async (officeId) =>
    (await listOfficeProviders(officeId)).map((p) => ({
      id: p.id,
      primary: providerName(p),
      secondary: [p.short_id, p.role].filter(Boolean).join(" · ") || undefined,
      active: p.is_active,
    })),
  save: async (officeId, ids) => {
    await setOfficeProviders(officeId, { ids });
  },
};

/* --------------------------------------------------------------------------
 * Notes Macros (#29) — int id. Catalog: /note-macros.
 * ------------------------------------------------------------------------ */
export const noteMacrosResource: AssignmentResource = {
  loadCatalog: async () =>
    (await pageAll((page) => listNoteMacros({ page, size: PAGE_SIZE }))).map((m) => ({
      id: String(m.id),
      primary: m.name,
      secondary: m.category ?? undefined,
    })),
  loadAssigned: async (officeId) =>
    (await listOfficeNoteMacros(officeId)).map((m) => ({
      id: String(m.id),
      primary: m.name,
      secondary: m.category ?? undefined,
    })),
  save: async (officeId, ids) => {
    await setOfficeNoteMacros(officeId, { ids: toInt(ids) });
  },
};

/* --------------------------------------------------------------------------
 * RX (#30) — int id. Catalog: /prescription-library.
 * ------------------------------------------------------------------------ */
export const rxResource: AssignmentResource = {
  loadCatalog: async () =>
    (await pageAll((page) => listPrescriptionLibrary({ page, size: PAGE_SIZE }))).map((r) => ({
      id: String(r.id),
      primary: r.drug_name,
      secondary: `Rx #${r.id}`,
      active: r.is_active,
    })),
  loadAssigned: async (officeId) =>
    (await listOfficePrescriptionLibrary(officeId)).map((r) => ({
      id: String(r.id),
      primary: r.drug_name,
      secondary: `Rx #${r.id}`,
      active: r.is_active,
    })),
  save: async (officeId, ids) => {
    await setOfficePrescriptionLibrary(officeId, { ids: toInt(ids) });
  },
};

/* --------------------------------------------------------------------------
 * Letters (#31) — int id. Catalog: /letter-templates.
 * ------------------------------------------------------------------------ */
export const lettersResource: AssignmentResource = {
  loadCatalog: async () =>
    (await pageAll((page) => listLetterTemplates({ page, size: PAGE_SIZE }))).map((l) => ({
      id: String(l.id),
      primary: l.name,
      secondary: l.letter_type ?? undefined,
      active: l.is_active,
    })),
  loadAssigned: async (officeId) =>
    (await listOfficeLetterTemplates(officeId)).map((l) => ({
      id: String(l.id),
      primary: l.name,
      secondary: l.letter_type ?? undefined,
      active: l.is_active,
    })),
  save: async (officeId, ids) => {
    await setOfficeLetterTemplates(officeId, { ids: toInt(ids) });
  },
};
