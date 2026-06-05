/**
 * Office Setup → SmartAssist data access — office-scoped wrappers.
 *
 * Thin wrappers over the generated Orval client (no raw axios). The backend has
 * landed the office SmartAssist endpoints:
 *   GET   /api/v1/offices/{officeId}/smart-assist   → SmartAssistRead
 *   PATCH /api/v1/offices/{officeId}/smart-assist   body SmartAssistUpdate → SmartAssistRead
 */
import {
  getOfficeSmartAssist,
  updateOfficeSmartAssist,
} from "@/api/generated/endpoints/office-setup/office-setup";
import type {
  SmartAssistRead,
  SmartAssistItemInput,
} from "@/api/generated/model";

/** GET the office SmartAssist configuration. */
export async function fetchOfficeSmartAssist(
  officeId: number
): Promise<SmartAssistRead> {
  return getOfficeSmartAssist(officeId);
}

/** Editable payload accepted by {@link saveOfficeSmartAssist}. */
export type SaveOfficeSmartAssistInput = {
  enabled: boolean;
  items: SmartAssistItemInput[];
};

/** PATCH the office SmartAssist configuration. */
export async function saveOfficeSmartAssist(
  officeId: number,
  { enabled, items }: SaveOfficeSmartAssistInput
): Promise<SmartAssistRead> {
  return updateOfficeSmartAssist(officeId, { enabled, items });
}
