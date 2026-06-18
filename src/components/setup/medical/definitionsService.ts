// Medical Setup — shared service over the generic definitions system.
//
// The legacy Medical Alerts / Medical Questionnaire / Dental Questionnaire SETUP
// screens have NO dedicated backend resource. We repurpose the generic
// `definition-groups` (= section / header) + `definitions` (= alert / question)
// tables (tag: metadata), namespacing each feature with a frontend `group_type`
// convention. Backend gaps are documented in
// docs/pick-list/pick_list_setup_backend_devreport.md (§3–§5).

import {
  listDefinitionGroups,
  createDefinitionGroup,
  updateDefinitionGroup,
  deleteDefinitionGroup,
  listDefinitions,
  createDefinition,
  updateDefinition,
  deleteDefinition,
} from "@/api/generated/endpoints/metadata/metadata";
import type {
  DefinitionGroupRead,
  DefinitionGroupCreate,
  DefinitionGroupUpdate,
  DefinitionRead,
  DefinitionCreate,
  DefinitionUpdate,
} from "@/api/generated/model";

const PAGE_SIZE = 200;

// Frontend group_type markers that scope each Medical Setup screen. The backend
// does not (yet) designate these — see gap MED-1.
export const GROUP_TYPE = {
  MEDICAL_ALERT: "MEDALERT",
  MEDICAL_QUESTIONNAIRE: "MEDQUEST",
  DENTAL_QUESTIONNAIRE: "DENTQUEST",
  TOOLBAR: "TOOLBAR",
} as const;

/** All definition-groups (paged past the 200 cap), filtered to one group_type. */
export async function listGroupsByType(groupType: string): Promise<DefinitionGroupRead[]> {
  const first = await listDefinitionGroups({ page: 1, size: PAGE_SIZE });
  const items = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        listDefinitionGroups({ page: i + 2, size: PAGE_SIZE }),
      ),
    );
    for (const res of rest) items.push(...(res.items ?? []));
  }
  return items
    .filter((g) => (g.group_type ?? "") === groupType)
    .sort((a, b) => a.description.localeCompare(b.description));
}

/** All definitions for one group_code, ordered by sort_order then id. */
export async function listDefinitionsByGroup(groupCode: string): Promise<DefinitionRead[]> {
  const first = await listDefinitions({ group_code: groupCode, page: 1, size: PAGE_SIZE });
  const items = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        listDefinitions({ group_code: groupCode, page: i + 2, size: PAGE_SIZE }),
      ),
    );
    for (const res of rest) items.push(...(res.items ?? []));
  }
  return items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);
}

export function createGroup(body: DefinitionGroupCreate): Promise<DefinitionGroupRead> {
  return createDefinitionGroup(body);
}
export function updateGroup(id: number, body: DefinitionGroupUpdate): Promise<DefinitionGroupRead> {
  return updateDefinitionGroup(id, body);
}
export function deleteGroup(id: number): Promise<void> {
  return deleteDefinitionGroup(id);
}

export function createDef(body: DefinitionCreate): Promise<DefinitionRead> {
  return createDefinition(body);
}
export function updateDef(id: number, body: DefinitionUpdate): Promise<DefinitionRead> {
  return updateDefinition(id, body);
}
export function deleteDef(id: number): Promise<void> {
  return deleteDefinition(id);
}

/**
 * Derive a stable, namespaced group_code from a header label. group_code must be
 * unique; we prefix with the feature's group_type and slug the description.
 */
export function makeGroupCode(groupType: string, description: string): string {
  const slug = description
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return `${groupType}_${slug || "GROUP"}`;
}
