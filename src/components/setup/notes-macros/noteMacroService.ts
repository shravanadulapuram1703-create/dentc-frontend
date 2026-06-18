// Notes Macros Setup — thin service over the generated Orval client.
//
// Wraps /api/v1/note-macros (tag: Procedures). Snake_case bodies pass through
// unchanged, per project convention. `size` maxes at 200, so listAllNoteMacros
// pages through the full set for the always-loaded search rail.

import {
  listNoteMacros,
  getNoteMacro,
  createNoteMacro,
  updateNoteMacro,
  deleteNoteMacro,
} from "@/api/generated/endpoints/procedures/procedures";
import type { NoteMacroRead, NoteMacroCreate, NoteMacroUpdate } from "@/api/generated/model";

const PAGE_SIZE = 200;

/** Fetch every note macro, paging past the 200/row server cap. */
export async function listAllNoteMacros(): Promise<NoteMacroRead[]> {
  const first = await listNoteMacros({ page: 1, size: PAGE_SIZE, sort: "name", order: "asc" });
  const items = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;

  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        listNoteMacros({ page: i + 2, size: PAGE_SIZE, sort: "name", order: "asc" }),
      ),
    );
    for (const res of rest) items.push(...(res.items ?? []));
  }
  return items;
}

export function getNoteMacroById(id: number): Promise<NoteMacroRead> {
  return getNoteMacro(id);
}

export function createNoteMacroEntry(body: NoteMacroCreate): Promise<NoteMacroRead> {
  return createNoteMacro(body);
}

export function updateNoteMacroEntry(id: number, body: NoteMacroUpdate): Promise<NoteMacroRead> {
  return updateNoteMacro(id, body);
}

export function deleteNoteMacroEntry(id: number): Promise<void> {
  return deleteNoteMacro(id);
}
