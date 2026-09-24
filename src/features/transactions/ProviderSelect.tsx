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
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/components/ui/utils';
import {
  isHygienist,
  isTreatingProvider,
  providerOptionLabel,
  type ProviderOption,
} from '@/services/providerDirectory';

export type ProviderSelectKind = 'treating' | 'hygienist' | 'any';

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
  /** Opt in only on the ledger modal; other consumers retain their native control. */
  presentation?: 'native' | 'pms';
}

function partitionProviders(
  officeProviders: ProviderOption[],
  allProviders: ProviderOption[],
  kind: ProviderSelectKind,
  /** Always offered even when inactive / out of office, so a stored id stays selectable. */
  keepId?: string,
): { inOffice: ProviderOption[]; others: ProviderOption[] } {
  const matches =
    kind === 'hygienist' ? isHygienist : kind === 'treating' ? isTreatingProvider : () => true;
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
  presentation = 'native',
}: Props) {
  const { inOffice, others } = useMemo(
    () => partitionProviders(officeProviders, allProviders, kind, value || undefined),
    [officeProviders, allProviders, kind, value],
  );

  if (presentation === 'pms') {
    // Radix reserves an empty value for its placeholder. Map only the clear row;
    // real provider IDs and the caller's empty-string state remain unchanged.
    const emptyValue = '__provider_placeholder__';
    const rowClass = 'min-h-8 rounded-sm py-1.5 pl-3 pr-8 text-xs font-normal '
      + 'text-slate-700 transition-colors focus:bg-blue-50 focus:text-[#1f6fc4] '
      + 'data-[highlighted]:bg-blue-50 data-[highlighted]:text-[#1f6fc4] '
      + 'data-[state=checked]:bg-[#1f6fc4] data-[state=checked]:text-white '
      + 'data-[state=checked]:focus:bg-[#1f6fc4] data-[state=checked]:focus:text-white '
      + 'data-[state=checked]:data-[highlighted]:bg-[#1f6fc4] '
      + 'data-[state=checked]:data-[highlighted]:text-white [&_svg:not([class*="text-"])]:text-current';
    const labelClass = 'rounded-sm bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600';
    return (
      <Select value={value || emptyValue} onValueChange={(id) => onChange(id === emptyValue ? '' : id)} disabled={disabled}>
        <SelectTrigger
          title={title}
          aria-label={kind === 'hygienist' ? 'Hygienist' : 'Provider'}
          className={cn(className, 'grid w-auto max-w-[calc(100vw-2rem)] grid-cols-[minmax(0,1fr)_auto] rounded-md border-2 border-slate-300 bg-white px-4 py-3 text-xs font-medium tracking-normal shadow-sm data-[size=default]:h-auto focus-visible:border-[#1f6fc4] focus-visible:ring-2 focus-visible:ring-[#1f6fc4]/20 [&>svg]:col-start-2 [&>svg]:row-start-1 [&>[data-slot=select-value]]:col-start-1 [&>[data-slot=select-value]]:row-start-1', !value && 'text-slate-500')}
        >
          {/* Like a native select, keep the width stable across selections. */}
          <span aria-hidden="true" className="invisible col-start-1 row-start-1 grid h-0 overflow-hidden pointer-events-none">
            {[placeholder, ...inOffice.map(providerOptionLabel), ...others.map(providerOptionLabel)].map((label, index) => (
              <span key={index} className="col-start-1 row-start-1">{label}</span>
            ))}
          </span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          side="bottom"
          collisionPadding={8}
          className="z-[60] max-h-[min(20rem,var(--radix-select-content-available-height))] max-w-[calc(100vw-1rem)] min-w-[var(--radix-select-trigger-width)] rounded-md border-slate-200 bg-white shadow-md"
        >
          <SelectItem value={emptyValue} className="min-h-8 py-1.5 text-xs font-normal text-slate-500 focus:bg-blue-50 focus:text-slate-600 data-[highlighted]:bg-blue-50 [&_svg]:hidden">
            {placeholder}
          </SelectItem>
          {inOffice.length > 0 && (
            <SelectGroup>
              <SelectLabel className={labelClass}>This Office</SelectLabel>
              {inOffice.map((p) => (
                <SelectItem key={p.id} value={p.id} className={rowClass}>{providerOptionLabel(p)}</SelectItem>
              ))}
            </SelectGroup>
          )}
          {others.length > 0 && (
            <SelectGroup>
              <SelectLabel className={labelClass}>{inOffice.length > 0 ? 'All Providers' : 'Providers'}</SelectLabel>
              {others.map((p) => (
                <SelectItem key={p.id} value={p.id} className={rowClass}>{providerOptionLabel(p)}</SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    );
  }

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
