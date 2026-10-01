/**
 * How the office reaches an API call: an explicit, typed spread at the call
 * site — never an axios interceptor. The param name differs per endpoint
 * (`office_id` vs `home_office_id`), so does its meaning (filter / pricing key /
 * sender key), 15 lists have no office param at all, patient-tab reads must stay
 * unscoped, and Orval query keys are `[url, params]`, so a header injected
 * outside the params would serve the previous office's rows after a switch.
 *
 * Functions are camelCase; every emitted key is the backend's snake_case name.
 */

/** `{ office_id }` when scoped, `{}` when the read is tenant-wide. Never emits `office_id: null`. */
export function officeFilter(office_id: number | null | undefined): { office_id?: number } {
  return office_id != null ? { office_id } : {};
}

/** `GET /patients` / `/responsible-parties` use `home_office_id`. */
export function homeOfficeFilter(office_id: number | null | undefined): { home_office_id?: number } {
  return office_id != null ? { home_office_id: office_id } : {};
}

/**
 * Emitted whenever a screen deliberately reads every office, so that once
 * OFF-SCOPE-2 makes "omitted = my assigned offices" the default, privileged
 * "All offices" views keep working. FastAPI ignores the unknown param today.
 */
export function allOfficesParam(all: boolean): { all_offices?: true } {
  return all ? { all_offices: true } : {};
}

export class OfficeRequiredError extends Error {
  readonly action: string;
  constructor(action: string) {
    super(`Select an office to ${action}.`);
    this.name = "OfficeRequiredError";
    this.action = action;
  }
}

/**
 * For writes that must carry an office: returns the id or throws a typed,
 * human-readable error that the existing try/catch + toast around every posting
 * handler surfaces as-is.
 */
export function requireOfficeId(office_id: number | null | undefined, action: string): number {
  if (office_id == null) throw new OfficeRequiredError(action);
  return office_id;
}
