// The provider / hygienist picker used across the Transactions Entry screen.
//
// Why this is not a plain `<select>` over `useProviderDirectory().providers`:
//
//   The office roster is genuinely sparse. `GET /offices/{id}/providers/effective`
//   (the backend's own "assigned ∪ home office" view, PROV-1) returns 93 providers
//   for office 1 but exactly **1** for office 4 — and patient 83433's own history at
//   office 4 was posted by PRV-169 "Neha Sharma", who is not in that roster. The
//   old scoping rule ("fall back to the tenant list only when the office resolves
//   to *nothing*") therefore left the toolbar showing a single test provider while
//   96 real providers were hidden, and the grid rendered names the picker could not
//   select.
//
//   So the roster is rendered as a hint, not a wall: providers serving this office
//   come first under "This Office", everyone else stays reachable under "All
//   Providers". Nothing is ever hidden, and the office grouping still reads first.
//
// Options are also split by discipline (`providerKind`), because `role` arrives
// from the migration as `dentist` / `hygienist` / `Hygenist` / `staff` and a raw
// string compare would drop the misspelled row.

import { useMemo } from 'react';
import {
  isHygienist,
  isTreatingProvider,
  providerOptionLabel,
  type ProviderOption,
} from '@/services/providerDirectory';

export type ProviderSelectKind = 'treating' | 'hygienist';

interface Props {
  value: string;
  onChange: (id: string) => void;
  /** Providers serving the current office (from `useProviderDirectory`). */
  officeProviders: ProviderOption[];
  /** Every provider in the tenant — the "All Providers" group and the safety net. */
  allProviders: ProviderOption[];
  kind: ProviderSelectKind;
  placeholder: string;
  className?: string;
  title?: string;
  disabled?: boolean;
}

function partitionProviders(
  officeProviders: ProviderOption[],
  allProviders: ProviderOption[],
  kind: ProviderSelectKind,
  /** Always offered even when inactive / out of office, so a stored id stays selectable. */
  keepId?: string,
): { inOffice: ProviderOption[]; others: ProviderOption[] } {
  const matches = kind === 'hygienist' ? isHygienist : isTreatingProvider;
  const keep = (p: ProviderOption) => matches(p) || p.id === keepId;

  const inOffice = officeProviders.filter(keep);
  const officeIds = new Set(inOffice.map((p) => p.id));
  const others = allProviders.filter((p) => keep(p) && !officeIds.has(p.id));

  // A provider referenced by an existing record can be inactive and therefore
  // absent from both lists — surface it so the select does not silently blank out.
  if (keepId && !officeIds.has(keepId) && !others.some((p) => p.id === keepId)) {
    const fallback = allProviders.find((p) => p.id === keepId);
    if (fallback) others.unshift(fallback);
  }
  return { inOffice, others };
}

export default function ProviderSelect({
  value,
  onChange,
  officeProviders,
  allProviders,
  kind,
  placeholder,
  className,
  title,
  disabled,
}: Props) {
  const { inOffice, others } = useMemo(
    () => partitionProviders(officeProviders, allProviders, kind, value || undefined),
    [officeProviders, allProviders, kind, value],
  );

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      title={title}
      className={className}
    >
      <option value="">{placeholder}</option>
      {inOffice.length > 0 && (
        <optgroup label="This Office">
          {inOffice.map((p) => (
            <option key={p.id} value={p.id}>
              {providerOptionLabel(p)}
            </option>
          ))}
        </optgroup>
      )}
      {others.length > 0 && (
        <optgroup label={inOffice.length > 0 ? 'All Providers' : 'Providers'}>
          {others.map((p) => (
            <option key={p.id} value={p.id}>
              {providerOptionLabel(p)}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
