/**
 * Office Setup → Advanced tab data access — office-scoped advanced/financial settings.
 *
 * Backed by the generated Orval client (no raw axios). The backend now exposes:
 *   GET   /api/v1/offices/{officeId}/advanced-settings   → OfficeAdvancedSettingsRead
 *   PATCH /api/v1/offices/{officeId}/advanced-settings   body OfficeAdvancedSettingsUpdate → OfficeAdvancedSettingsRead
 *
 * These thin wrappers re-export the real generated models as the canonical
 * Read/Update shapes consumed by `AdvancedTab.tsx`.
 */
import {
  getOfficeAdvancedSettings as generatedGetOfficeAdvancedSettings,
  updateOfficeAdvancedSettings as generatedUpdateOfficeAdvancedSettings,
} from "@/api/generated/endpoints/office-setup/office-setup";
import type {
  OfficeAdvancedSettingsRead,
  OfficeAdvancedSettingsUpdate,
} from "@/api/generated/model";

/** Read shape returned by the backend (snake_case). */
export type OfficeAdvancedSettingsApi = OfficeAdvancedSettingsRead;

/** PATCH body — all fields optional, snake_case. */
export type { OfficeAdvancedSettingsUpdate };

export async function fetchOfficeAdvancedSettings(
  officeId: number
): Promise<OfficeAdvancedSettingsApi> {
  return generatedGetOfficeAdvancedSettings(officeId);
}

export async function updateOfficeAdvancedSettings(
  officeId: number,
  body: OfficeAdvancedSettingsUpdate
): Promise<OfficeAdvancedSettingsApi> {
  return generatedUpdateOfficeAdvancedSettings(officeId, body);
}
