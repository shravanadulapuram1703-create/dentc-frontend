import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOfficeScope } from "./OfficeScopeContext";

/**
 * Per-screen READ scope — how wide a list / search reads. The office model has
 * NO global read mode: every screen declares how wide it may read (`allow`),
 * the user picks a breadth on that screen, and the choice is remembered per
 * user per screen for the lifetime of the tab. An office switch never resets
 * it — the mode is about breadth, the working office is about context.
 *
 *   office      — only the working office. The caller spreads
 *                 `officeFilter(office_id)` / `homeOfficeFilter(office_id)`.
 *   my_offices  — the user's assigned offices ∪ the working office. The caller
 *                 sends nothing server-side and filters on `office_ids`
 *                 client-side (no list endpoint takes an office SET yet).
 *   all         — tenant-wide (spread `allOfficesParam(true)`).
 *
 * `widestMode` is the privilege ceiling: `allow: "everyone"` may always read
 * everything, `"privileged"` needs `can_view_all_offices` (else at most
 * "my offices"), `"never"` pins the screen to the working office. A remembered
 * mode above the ceiling is clamped DOWN on read, never widened.
 */
export type ReadScopeMode = "office" | "my_offices" | "all";

/** Who may widen the read past the working office on this screen. */
export type ReadScopeAllow = "everyone" | "privileged" | "never";

export interface ReadScopeOptions {
  allow: ReadScopeAllow;
  /** Mode used when nothing is remembered yet (clamped to `widestMode`). */
  defaultMode?: "office" | "all";
}

export interface ReadScope {
  mode: ReadScopeMode;
  /** The working office when `mode === "office"`, else null. */
  office_id: number | null;
  /** `assigned_office_ids ∪ working office` when `mode === "my_offices"`, else `[]`. */
  office_ids: number[];
  setMode(mode: ReadScopeMode): void;
  /** False when only "This office" is offered — callers hide the toggle. */
  canToggle: boolean;
  widestMode: ReadScopeMode;
  /** Modes offered on this screen, narrowest first (always contains "office"). */
  modes: ReadScopeMode[];
  /** Name of the WORKING office (for "No match in …" copy), or null when none is set. */
  office_name: string | null;
}

/** sessionStorage: `dentc:read_scope:v1:<userId>:<screenKey>` → mode. */
export const READ_SCOPE_STORAGE_PREFIX = "dentc:read_scope:v1:";

export const READ_SCOPE_LABELS: Record<ReadScopeMode, string> = {
  office: "This office",
  my_offices: "My offices",
  all: "All offices",
};

const RANK: Record<ReadScopeMode, number> = { office: 0, my_offices: 1, all: 2 };
const ORDER: readonly ReadScopeMode[] = ["office", "my_offices", "all"];

export function readScopeStorageKey(user_id: string, screen_key: string): string {
  return `${READ_SCOPE_STORAGE_PREFIX}${user_id}:${screen_key}`;
}

export function isReadScopeMode(value: unknown): value is ReadScopeMode {
  return value === "office" || value === "my_offices" || value === "all";
}

function readStored(key: string | null): ReadScopeMode | null {
  if (!key) return null;
  try {
    const v = sessionStorage.getItem(key);
    return isReadScopeMode(v) ? v : null;
  } catch {
    return null;
  }
}

function writeStored(key: string | null, mode: ReadScopeMode): void {
  if (!key) return;
  try {
    sessionStorage.setItem(key, mode);
  } catch {
    /* ignore disabled / full storage — the in-memory choice still applies */
  }
}

function uniq(ids: ReadonlyArray<number | null | undefined>): number[] {
  const out: number[] = [];
  for (const id of ids) if (id != null && !out.includes(id)) out.push(id);
  return out;
}

/** The widest offered mode that does not exceed `wanted` ("office" is always offered). */
function clampMode(wanted: ReadScopeMode, modes: readonly ReadScopeMode[]): ReadScopeMode {
  let mode: ReadScopeMode = "office";
  for (const m of modes) if (RANK[m] <= RANK[wanted]) mode = m;
  return mode;
}

export interface ReadScopeInput {
  allow: ReadScopeAllow;
  defaultMode?: "office" | "all";
  /** What the user last picked on this screen (stored), or null. */
  requested: ReadScopeMode | null;
  working_office_id: number | null;
  assigned_office_ids: readonly number[];
  can_view_all_offices: boolean;
}

export type ResolvedReadScope = Pick<
  ReadScope,
  "mode" | "widestMode" | "modes" | "office_id" | "office_ids"
>;

/** The privilege ceiling for a screen. */
export function widestReadScope(
  input: Pick<ReadScopeInput, "allow" | "can_view_all_offices" | "assigned_office_ids">,
): ReadScopeMode {
  if (input.allow === "never") return "office";
  if (input.allow === "everyone" || input.can_view_all_offices) return "all";
  return input.assigned_office_ids.length > 0 ? "my_offices" : "office";
}

/**
 * Pure resolution (no React, unit-testable): the ceiling, the offered modes,
 * the clamped effective mode and the office set it reads. "My offices" is
 * only offered when it adds an office beyond the working one — otherwise it
 * would be "This office" under another name.
 */
export function deriveReadScope(input: ReadScopeInput): ResolvedReadScope {
  const widestMode = widestReadScope(input);
  const union = uniq([...input.assigned_office_ids, input.working_office_id]);
  const my_offices_meaningful = union.some((id) => id !== input.working_office_id);
  const modes = ORDER.filter(
    (m) => RANK[m] <= RANK[widestMode] && (m !== "my_offices" || my_offices_meaningful),
  );
  const mode = clampMode(input.requested ?? input.defaultMode ?? "office", modes);
  return {
    mode,
    widestMode,
    modes,
    office_id: mode === "office" ? input.working_office_id : null,
    office_ids: mode === "my_offices" ? union : [],
  };
}

/**
 * The per-screen read scope. `screenKey` names the screen in storage
 * (`"patient-search"`, `"ledger"`, …); screens that should share one choice
 * pass the same key.
 */
export function useReadScope(screenKey: string, opts: ReadScopeOptions): ReadScope {
  const { user } = useAuth();
  const {
    office_id: working_office_id,
    office,
    assigned_office_ids,
    can_view_all_offices,
  } = useOfficeScope();

  const user_id = user?.id ?? null;
  const storage_key = user_id ? readScopeStorageKey(user_id, screenKey) : null;

  const [requested, setRequested] = useState<ReadScopeMode | null>(() => readStored(storage_key));
  // Same tab, different user or screen: adopt that key's remembered choice.
  useEffect(() => {
    setRequested(readStored(storage_key));
  }, [storage_key]);

  const { allow, defaultMode } = opts;
  const resolved = useMemo(
    () =>
      deriveReadScope({
        allow,
        defaultMode,
        requested,
        working_office_id,
        assigned_office_ids,
        can_view_all_offices,
      }),
    [allow, defaultMode, requested, working_office_id, assigned_office_ids, can_view_all_offices],
  );

  const { modes } = resolved;
  const setMode = useCallback(
    (next: ReadScopeMode) => {
      const clamped = clampMode(next, modes);
      setRequested(clamped);
      writeStored(storage_key, clamped);
    },
    [modes, storage_key],
  );

  const office_name =
    office?.name ?? (working_office_id != null ? `Office ${working_office_id}` : null);

  return useMemo<ReadScope>(
    () => ({
      ...resolved,
      setMode,
      canToggle: resolved.modes.length > 1,
      office_name,
    }),
    [resolved, setMode, office_name],
  );
}
