// Renders the server's pricing provenance for one charge line: a compact
// one-line explanation of how the fee and split were derived, plus any resolver
// warnings. This is the shared display seam (gap report FE-PR-14) that every
// charge screen drops in when it is rewired to price through the server
// (Phase F2). It computes nothing — it only shows what `PricingProvenance` holds.

import type { PricingProvenance } from './provenance';
import { formatProvenance } from './provenance';

interface ProcedureProvenanceProps {
  provenance: PricingProvenance;
  /** Extra classes for the wrapper. */
  className?: string;
  /** Hide the warning lines (show only the one-liner). */
  hideWarnings?: boolean;
}

/**
 * Compact provenance line + warnings. Muted, single line by default; warnings
 * (a code missing on the bound schedule, an unpriced charge, a back-dated entry)
 * render below in amber so a Setup problem is visible at the point of charge.
 */
export function ProcedureProvenance({
  provenance,
  className,
  hideWarnings = false,
}: ProcedureProvenanceProps) {
  const line = formatProvenance(provenance);
  const warnings = provenance.warnings ?? [];

  return (
    <div className={`text-xs leading-snug ${className ?? ''}`.trim()}>
      <span
        className={
          provenance.is_unpriced ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
        }
        title={line}
      >
        {line}
      </span>
      {!hideWarnings && warnings.length > 0 && (
        <ul className="mt-0.5 space-y-0.5">
          {warnings.map((w, i) => (
            <li key={i} className="text-amber-600 dark:text-amber-400">
              ⚠ {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProcedureProvenance;
