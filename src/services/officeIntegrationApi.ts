/**
 * Office Integration data access — office-scoped wrappers over the GENERATED
 * Orval client (no raw axios).
 *
 * Backend has landed the office integrations endpoints (gap #13), so these
 * functions delegate straight to the generated `office-setup` client and are
 * typed against the canonical generated models:
 *   GET    /api/v1/offices/{officeId}/integrations  -> OfficeIntegrationsRead
 *   PATCH  /api/v1/offices/{officeId}/integrations  -> OfficeIntegrationsUpdate
 */
import {
  getOfficeIntegrations,
  updateOfficeIntegrations as updateOfficeIntegrationsGenerated,
} from "@/api/generated/endpoints/office-setup/office-setup";
import type {
  OfficeIntegrationsRead,
  OfficeIntegrationsUpdate,
} from "@/api/generated/model";

// Re-export the generated model types so consumers have a single import site.
export type { OfficeIntegrationsRead, OfficeIntegrationsUpdate };

/** GET integrations for an office (read-only fields included). */
export function fetchOfficeIntegrations(officeId: number): Promise<OfficeIntegrationsRead> {
  return getOfficeIntegrations(officeId);
}

/** PATCH a partial integrations body for an office. */
export function updateOfficeIntegrations(
  officeId: number,
  body: OfficeIntegrationsUpdate
): Promise<OfficeIntegrationsRead> {
  return updateOfficeIntegrationsGenerated(officeId, body);
}
