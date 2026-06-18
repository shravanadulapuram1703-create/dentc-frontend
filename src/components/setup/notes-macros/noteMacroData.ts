// Notes Macros Setup — form model + mappers. snake_case throughout, bound
// directly to the generated client types.

import type {
  NoteMacroRead,
  NoteMacroCreate,
  NoteMacroUpdate,
} from "@/api/generated/model";

export interface NoteMacroForm {
  name: string;
  category: string;
  content: string;
}

export function emptyNoteMacroForm(): NoteMacroForm {
  return { name: "", category: "", content: "" };
}

export function noteMacroToForm(m: NoteMacroRead): NoteMacroForm {
  return {
    name: m.name ?? "",
    category: m.category ?? "",
    content: m.content ?? "",
  };
}

export function buildNoteMacroCreate(form: NoteMacroForm): NoteMacroCreate {
  return {
    name: form.name.trim(),
    content: form.content,
    category: form.category.trim() || null,
  };
}

export function buildNoteMacroUpdate(form: NoteMacroForm): NoteMacroUpdate {
  return {
    name: form.name.trim(),
    content: form.content,
    category: form.category.trim() || null,
  };
}
