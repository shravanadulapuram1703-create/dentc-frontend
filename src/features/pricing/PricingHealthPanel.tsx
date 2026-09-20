// Pricing-setup health + the precedence card (FE-PR-80, docs/pricing §3.6).
// A collapsible banner surfacing GET /setup/pricing-health findings — each naming
// the Setup screen that owns the fix — plus the server-published precedence card
// so the three maintainers share one picture of how a fee is resolved. Read-only.

import { useState } from 'react';
import { usePricingHealth, healthFindingLabel } from './pricingSetup';
import { useFeeVocab } from './feeVocab';

const SEV_STYLE: Record<string, string> = {
  error: 'text-[#B91C1C] bg-[#FEE2E2] border-[#FCA5A5]',
  warning: 'text-[#B45309] bg-[#FEF3C7] border-[#FDE68A]',
  info: 'text-[#1E40AF] bg-[#DBEAFE] border-[#BFDBFE]',
};

export default function PricingHealthPanel() {
  const { findings, isLoading } = usePricingHealth();
  const { vocab } = useFeeVocab();
  const [openHealth, setOpenHealth] = useState(false);
  const [openCard, setOpenCard] = useState(false);

  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.filter((f) => f.severity === 'warning').length;

  return (
    <div className="mb-4 space-y-2">
      {/* Health banner */}
      {!isLoading && findings.length > 0 && (
        <div className="rounded-lg border-2 border-[#E2E8F0] bg-white">
          <button
            onClick={() => setOpenHealth((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left"
          >
            <span className="text-sm font-bold text-[#1F3A5F]">
              Pricing setup health —{' '}
              {errors > 0 && <span className="text-[#B91C1C]">{errors} error{errors === 1 ? '' : 's'}</span>}
              {errors > 0 && warnings > 0 && ', '}
              {warnings > 0 && <span className="text-[#B45309]">{warnings} warning{warnings === 1 ? '' : 's'}</span>}
            </span>
            <span className="text-xs font-bold text-[#3A6EA5]">{openHealth ? 'Hide' : 'Show'}</span>
          </button>
          {openHealth && (
            <ul className="divide-y divide-[#EEF2F7] border-t-2 border-[#E2E8F0]">
              {findings.map((f, i) => (
                <li key={i} className="px-4 py-2 flex items-start gap-2 text-xs">
                  <span className={`mt-0.5 px-1.5 py-0.5 rounded border font-bold uppercase ${SEV_STYLE[f.severity] ?? SEV_STYLE.info}`}>
                    {f.severity}
                  </span>
                  <span className="flex-1">
                    <span className="font-semibold text-[#1E293B]">{healthFindingLabel(f.code)}</span>
                    {f.count != null && <span className="text-[#64748B]"> · {f.count}</span>}
                    {f.office_name && <span className="text-[#64748B]"> · {f.office_name}</span>}
                    <span className="block text-[#94A3B8]">Fix in: {f.screen}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Precedence card */}
      {vocab.precedence.length > 0 && (
        <div className="rounded-lg border-2 border-[#E2E8F0] bg-white">
          <button
            onClick={() => setOpenCard((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left"
          >
            <span className="text-sm font-bold text-[#1F3A5F]">How a fee is resolved (precedence)</span>
            <span className="text-xs font-bold text-[#3A6EA5]">{openCard ? 'Hide' : 'Show'}</span>
          </button>
          {openCard && (
            <div className="overflow-auto border-t-2 border-[#E2E8F0]">
              <table className="w-full text-xs">
                <thead className="bg-[#F7F9FC]">
                  <tr>
                    {['Tier', 'Source', 'What it is', 'Owned by'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-bold text-[#1F3A5F] uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7]">
                  {vocab.precedence.map((row) => (
                    <tr key={row.tier}>
                      <td className="px-3 py-2 font-bold text-[#1E293B]">{row.tier}</td>
                      <td className="px-3 py-2 text-[#3A6EA5] font-semibold">{row.fee_source}</td>
                      <td className="px-3 py-2 text-[#64748B]">{row.source}</td>
                      <td className="px-3 py-2 text-[#64748B]">{row.owned_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
