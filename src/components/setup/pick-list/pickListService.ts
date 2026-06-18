// Pick List Setup — thin service over the generated Orval client.
//
// The legacy "PickList" concept maps to the backend questionnaire pair:
//   - questionnaire-headers  → the pick list (description, multi-select, active)
//   - questionnaire-options  → its items   (answer_code, sort_order, active)
// (tag: metadata). Snake_case bodies pass through unchanged, per project
// convention. `size` maxes at 200, so the list helpers page through the full set.
//
// The backend implemented the logged gaps (PICK-1/PICK-2): items are now saved
// atomically via PUT .../options (replacePickListItems) and headers are removed
// with their items via DELETE .../cascade (deletePickListCascade).

import {
  listQuestionnaireHeaders,
  createQuestionnaireHeader,
  updateQuestionnaireHeader,
  deleteQuestionnaireHeader,
  listQuestionnaireOptions,
  replacePickListItems,
  deletePickListCascade,
} from "@/api/generated/endpoints/metadata/metadata";
import type {
  QuestionnaireHeaderRead,
  QuestionnaireHeaderCreate,
  QuestionnaireHeaderUpdate,
  QuestionnaireOptionRead,
  PickListItemWrite,
  PickListOptionRead,
  PickListCascadeResult,
} from "@/api/generated/model";

const PAGE_SIZE = 200;

/** Fetch every pick list (questionnaire header), paging past the 200/row cap. */
export async function listAllPickLists(): Promise<QuestionnaireHeaderRead[]> {
  const first = await listQuestionnaireHeaders({ page: 1, size: PAGE_SIZE });
  const items = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;

  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        listQuestionnaireHeaders({ page: i + 2, size: PAGE_SIZE }),
      ),
    );
    for (const res of rest) items.push(...(res.items ?? []));
  }
  return items;
}

/** Fetch all items for one pick list, ordered by sort_order then id. */
export async function listPickListItems(questionnaireId: number): Promise<QuestionnaireOptionRead[]> {
  const first = await listQuestionnaireOptions({
    questionnaire_id: questionnaireId,
    page: 1,
    size: PAGE_SIZE,
    sort: "sort_order",
    order: "asc",
  });
  const items = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;

  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        listQuestionnaireOptions({
          questionnaire_id: questionnaireId,
          page: i + 2,
          size: PAGE_SIZE,
          sort: "sort_order",
          order: "asc",
        }),
      ),
    );
    for (const res of rest) items.push(...(res.items ?? []));
  }
  return items.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export function createPickList(body: QuestionnaireHeaderCreate): Promise<QuestionnaireHeaderRead> {
  return createQuestionnaireHeader(body);
}

export function updatePickList(id: number, body: QuestionnaireHeaderUpdate): Promise<QuestionnaireHeaderRead> {
  return updateQuestionnaireHeader(id, body);
}

/** Soft-delete a pick list and all its items in one call (PICK-1). */
export function deletePickListCascadeById(id: number): Promise<PickListCascadeResult> {
  return deletePickListCascade(id);
}

/** Header-only delete (kept for fallback; prefer the cascade variant). */
export function deletePickList(id: number): Promise<void> {
  return deleteQuestionnaireHeader(id);
}

/**
 * Atomically replace a pick list's items (PICK-2). Pass each item's
 * answer_code/is_active and, for existing rows, its id (the backend preserves
 * order by array position). Returns the persisted options.
 */
export function replacePickListItemsById(
  headerId: number,
  items: PickListItemWrite[],
): Promise<PickListOptionRead[]> {
  return replacePickListItems(headerId, { items });
}
