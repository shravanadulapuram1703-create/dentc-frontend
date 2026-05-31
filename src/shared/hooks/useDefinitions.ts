import { useMemo } from "react";
import { useListDefinitions } from "@/api/generated/endpoints/metadata/metadata";
import type { DefinitionRead } from "@/api/generated/model";

export interface SelectOption {
  value: string;
  label: string;
  raw: DefinitionRead;
}

const DEFAULT_SIZE = 200;

/**
 * Single hook for every legacy `…/metadata/*` dropdown. The backend stores all
 * lookups in one `definitions` table keyed by `group_code`, so callers pass the
 * group code (e.g. "gender", "marital_status", "payment_method").
 *
 * `value` defaults to `key1` (the stored code), `label` to `description`.
 * Active-only by default.
 *
 * NOTE: the canonical `group_code` strings come from migrated data — confirm
 * them via `GET /definition-groups` before hardcoding at call sites.
 */
export function useDefinitions(
  groupCode: string,
  opts?: { activeOnly?: boolean; enabled?: boolean },
) {
  const activeOnly = opts?.activeOnly ?? true;

  const query = useListDefinitions(
    {
      group_code: groupCode,
      size: DEFAULT_SIZE,
      ...(activeOnly ? { is_active: true } : {}),
    },
    { query: { enabled: opts?.enabled ?? Boolean(groupCode) } },
  );

  const options = useMemo<SelectOption[]>(
    () =>
      (query.data?.items ?? []).map((d) => ({
        value: d.key1 ?? String(d.id),
        label: d.description ?? d.key1 ?? String(d.id),
        raw: d,
      })),
    [query.data],
  );

  return {
    options,
    definitions: query.data?.items ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
