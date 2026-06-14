// Procedure-code → description resolution for Fee Schedule entries.
//
// Fee-schedule entries store only `procedure_code`; the legacy UI shows a
// Description column. There are ~1,100 procedure codes, so we load the full
// code→description map once (paged at 200), cache it, and also expose a
// debounced search for the "add entry" code picker.

import { listProcedureCodes } from "@/api/generated/endpoints/procedures/procedures";
import type { ProcedureCodeRead } from "@/api/generated/model";
import type { PickerOption } from "./lookupService";

const PAGE_SIZE = 200;
const TTL_MS = 5 * 60_000;

let cache: { at: number; map: Map<string, ProcedureCodeRead> } | null = null;
let inflight: Promise<Map<string, ProcedureCodeRead>> | null = null;

async function fetchAll(): Promise<Map<string, ProcedureCodeRead>> {
  const first = await listProcedureCodes({ size: PAGE_SIZE, page: 1, sort: "code", order: "asc" });
  const map = new Map<string, ProcedureCodeRead>();
  for (const c of first.items ?? []) map.set(c.code, c);
  const pages = first.meta?.pages ?? 1;
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        listProcedureCodes({ size: PAGE_SIZE, page: i + 2, sort: "code", order: "asc" }),
      ),
    );
    for (const res of rest) for (const c of res.items ?? []) map.set(c.code, c);
  }
  return map;
}

/** Load (and cache) the full procedure-code map. */
export async function loadProcedureCodes(): Promise<Map<string, ProcedureCodeRead>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  if (inflight) return inflight;
  inflight = fetchAll()
    .then((map) => {
      cache = { at: Date.now(), map };
      return map;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Description for a code from the loaded map (call loadProcedureCodes first). */
export function codeDescription(code: string): string {
  return cache?.map.get(code)?.description ?? "";
}

/** Debounced-search source for the procedure-code picker (add entry). */
export async function searchProcedureCodes(query: string): Promise<PickerOption[]> {
  const map = await loadProcedureCodes();
  const q = query.trim().toLowerCase();
  const all = [...map.values()];
  const matched = (
    q ? all.filter((c) => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)) : all
  ).slice(0, 30);
  // Procedure codes are keyed by their string `code`; PickerOption.id carries it.
  return matched.map((c) => ({ id: c.code, label: c.code, sub: c.description }));
}
