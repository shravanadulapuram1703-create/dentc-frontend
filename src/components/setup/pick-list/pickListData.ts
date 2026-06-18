// Pick List Setup — form model + mappers between the backend questionnaire
// shapes and the editable UI form. snake_case throughout, bound directly to the
// generated client types.

import type {
  QuestionnaireHeaderRead,
  QuestionnaireHeaderCreate,
  QuestionnaireHeaderUpdate,
  QuestionnaireOptionRead,
} from "@/api/generated/model";

/** One editable item row. `id` undefined ⇒ a new item not yet persisted. */
export interface PickListItemForm {
  id?: number;
  answer_code: string;
  sort_order: number;
  is_active: boolean;
}

export interface PickListForm {
  description: string;
  is_multi_select: boolean;
  is_active: boolean;
  items: PickListItemForm[];
}

export function emptyPickListForm(): PickListForm {
  return { description: "", is_multi_select: false, is_active: true, items: [] };
}

/** Build the editable form from a header + its loaded items. */
export function pickListToForm(
  header: QuestionnaireHeaderRead,
  items: QuestionnaireOptionRead[],
): PickListForm {
  return {
    description: header.description ?? "",
    is_multi_select: !!header.is_multi_select,
    is_active: !!header.is_active,
    items: items
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
      .map((it) => ({
        id: it.id,
        answer_code: it.answer_code ?? "",
        sort_order: it.sort_order ?? 0,
        is_active: !!it.is_active,
      })),
  };
}

export function buildHeaderCreate(form: PickListForm): QuestionnaireHeaderCreate {
  return {
    description: form.description.trim(),
    is_multi_select: form.is_multi_select,
    is_active: form.is_active,
  };
}

export function buildHeaderUpdate(form: PickListForm): QuestionnaireHeaderUpdate {
  return {
    description: form.description.trim(),
    is_multi_select: form.is_multi_select,
    is_active: form.is_active,
  };
}

export function multiSelectLabel(v: boolean | null | undefined): string {
  return v ? "Yes" : "No";
}

export function yesNo(v: boolean | null | undefined): string {
  return v ? "Yes" : "No";
}
