/**
 * The working office as an outbound request header — `X-Office-ID` (OFF-SCOPE-3).
 *
 * The server validates it against the caller's assignments (403 otherwise),
 * records it on the audit row, and uses it as the DEFAULT write-stamp when a
 * create body omits `office_id`. It is deliberately NOT the read filter: reads
 * carry the office as an explicit `officeFilter()` query param (officeParams.ts),
 * and the header never changes which rows a GET returns — it only stamps and
 * audits. That is why sending it from the axios interceptor is safe here even
 * though the office as a *filter* must never go through one (Orval query keys are
 * `[url, params]`, so a filtering header would poison the cache after a switch).
 *
 * This module holds the id outside React so the axios instance (a non-React
 * module) can read it synchronously; {@link OfficeScopeProvider} keeps it in
 * sync with the working office on every change. The working office is always an
 * office the server accepts (assigned / privileged / unassigned-and-ungated),
 * because the switcher enforces the same membership rule (OFFICE_ASSIGNMENT_ENFORCED).
 */
export const OFFICE_HEADER = "X-Office-ID";

let activeOfficeId: number | null = null;

/** Called by OfficeScopeProvider whenever the working office changes. */
export function setActiveOfficeId(office_id: number | null): void {
  activeOfficeId = office_id;
}

/** The working office id for the outbound header, or null when none is set. */
export function getActiveOfficeId(): number | null {
  return activeOfficeId;
}
