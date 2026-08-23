// The legacy ledger grid, shared by the Ledger screen and the Claim Details
// popup so the same transaction renders identically in both places.
//
// Hyperlink map (matches the legacy Patient Ledger exactly):
//
//   column        charge            payment           adjustment   claim
//   ------------  ----------------  ----------------  -----------  -----------------------
//   Date          Edit Treatment    Edit Payment      —            Primary Dental Ins Claim
//   Description   —                 —                 —            Claim Details popup
//   Amount        Payment Alloc.    Payment Alloc.    Payment Alloc.  — (claims carry no amount)

import { Loader2, Paperclip } from 'lucide-react';
import {
  GRID_COLS,
  RIGHT_COLS,
  HEADER_BG,
  dollars,
  type LedgerRow,
  type LedgerTarget,
} from './accountLedgerModel';

interface SelectionProps {
  selected: Set<string>;
  onToggleRow: (key: string) => void;
  onTogglePage: (checked: boolean) => void;
  allPageSelected: boolean;
  anyClaimable: boolean;
}

interface Props {
  rows: LedgerRow[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyLabel?: string;
  /** Omit to render the grid read-only, without the Prn checkbox column. */
  selection?: SelectionProps;
  /** Omit to render the grid without any drill-down hyperlinks. */
  onOpen?: (row: LedgerRow, target: LedgerTarget) => void;
  /** Grand-Total footer value; omit to hide the footer. */
  grandTotal?: number;
}

const linkBase =
  'rounded underline decoration-dotted underline-offset-2 hover:decoration-solid ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6fc4]/40';

export default function LedgerGrid({
  rows,
  loading = false,
  error = null,
  onRetry,
  emptyLabel = 'No transactions to display.',
  selection,
  onOpen,
  grandTotal,
}: Props) {
  const cols = selection ? GRID_COLS : GRID_COLS.filter((c) => c !== 'Prn');
  const showFooter = grandTotal != null && !loading && !error && rows.length > 0;

  return (
    <div className="overflow-x-auto border-x border-slate-200 bg-white">
      <table className="w-full text-xs">
        <thead className="text-white" style={{ background: HEADER_BG }}>
          <tr>
            {cols.map((c, i) => (
              <th
                key={i}
                className={`whitespace-nowrap px-2 py-2 font-bold uppercase tracking-wide ${
                  RIGHT_COLS.includes(c) ? 'text-right' : c === 'Prn' ? 'text-center' : 'text-left'
                }`}
              >
                {c === 'Prn' && selection ? (
                  <input
                    type="checkbox"
                    checked={selection.allPageSelected}
                    disabled={!selection.anyClaimable}
                    onChange={(e) => selection.onTogglePage(e.target.checked)}
                    title="Select all claim-eligible transactions on this page"
                    className="h-3.5 w-3.5 cursor-pointer align-middle accent-white disabled:cursor-not-allowed disabled:opacity-40"
                  />
                ) : c === '' ? (
                  <Paperclip className="h-3.5 w-3.5" />
                ) : (
                  c
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td colSpan={cols.length} className="px-2 py-12 text-center text-slate-400">
                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={cols.length} className="px-2 py-12 text-center text-red-600">
                {error}
                {onRetry && (
                  <button onClick={onRetry} className="ml-2 underline">Retry</button>
                )}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={cols.length} className="px-2 py-12 text-center text-slate-400">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              // Legacy colour coding: credits/adjustments orange, claims magenta.
              const credit = r.kind === 'payment' || r.kind === 'adjustment';
              const claim = r.kind === 'claim';
              const text = claim ? 'text-fuchsia-700' : credit ? 'text-orange-600' : 'text-slate-700';
              const isSel = selection?.selected.has(r.key) ?? false;
              const linkTone = claim ? 'text-fuchsia-700' : credit ? 'text-orange-700' : 'text-[#1f6fc4]';
              // Every kind has a Date drill-down; claims go to the full claim screen.
              // Adjustments have no legacy detail window, so their Date is plain
              // text; their Amount still opens the allocation popup.
              const dateLinked = r.kind !== 'adjustment';
              const dateHint = claim
                ? 'Open this insurance claim'
                : r.kind === 'payment'
                  ? 'Open the payment details'
                  : 'Open the treatment details';

              return (
                <tr
                  key={r.key}
                  className={`hover:bg-slate-50 ${
                    isSel ? 'bg-blue-50' : claim ? 'bg-fuchsia-50/40' : credit ? 'bg-orange-50/40' : ''
                  }`}
                >
                  {selection && (
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSel}
                        disabled={!r.claimable}
                        onChange={() => selection.onToggleRow(r.key)}
                        title={
                          r.claimable
                            ? 'Select this transaction for a claim'
                            : r.hold_claim
                              ? 'On Hold Claim — remove the hold in Edit Treatment to bill it'
                              : 'Only unbilled procedures can be sent on a claim'
                        }
                        className="h-3.5 w-3.5 cursor-pointer accent-[#1f6fc4] disabled:cursor-not-allowed disabled:opacity-30"
                      />
                    </td>
                  )}

                  {/* Date -> the transaction's own detail window */}
                  <td className="whitespace-nowrap px-2 py-1.5 font-mono">
                    {onOpen && dateLinked ? (
                      <button
                        onClick={() => onOpen(r, 'detail')}
                        title={dateHint}
                        className={`${linkBase} ${linkTone}`}
                      >
                        {r.date}
                      </button>
                    ) : (
                      <span className={text}>{r.date}</span>
                    )}
                  </td>

                  <td className={`whitespace-nowrap px-2 py-1.5 ${text}`}>{r.patient}</td>
                  <td className={`px-2 py-1.5 ${text}`}>{r.office}</td>
                  <td className={`px-2 py-1.5 text-center ${text}`}>{r.apply_to}</td>
                  <td className={`px-2 py-1.5 font-semibold ${claim ? 'text-fuchsia-800' : credit ? 'text-orange-700' : 'text-blue-800'}`}>
                    {r.code}
                  </td>
                  <td className={`px-2 py-1.5 text-center ${text}`}>{r.tooth}</td>
                  <td className={`px-2 py-1.5 text-center ${text}`}>{r.surface}</td>
                  <td className={`px-2 py-1.5 text-center ${text}`}>{r.t}</td>
                  <td className={`px-2 py-1.5 text-center ${text}`}>{r.n}</td>
                  <td className={`px-2 py-1.5 text-center ${text}`}>-</td>
                  <td className={`px-2 py-1.5 text-center ${text}`}>-</td>

                  {/* Description -> Claim Details popup, claim rows only */}
                  <td className={`px-2 py-1.5 ${claim ? 'text-fuchsia-800' : credit ? 'text-orange-700' : 'text-slate-800'}`}>
                    {onOpen && claim ? (
                      <button
                        onClick={() => onOpen(r, 'claim-details')}
                        title="Open the claim details for this transaction"
                        className={`${linkBase} text-left text-fuchsia-700`}
                      >
                        {r.description}
                      </button>
                    ) : (
                      r.description
                    )}
                  </td>

                  {/* Bill — legacy renders a bare "H" for a charge on Hold Claim */}
                  <td className={`px-2 py-1.5 ${text}`}>
                    {r.hold_claim ? (
                      <span
                        title="Hold Claim — this procedure is held back from claim creation"
                        className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-red-100 px-1 text-[11px] font-bold text-red-700"
                      >
                        H
                      </span>
                    ) : (
                      r.bill
                    )}
                  </td>
                  <td className={`px-2 py-1.5 text-center ${text}`}>-</td>
                  <td className={`px-2 py-1.5 ${text}`}>{r.provider}</td>
                  <td className={`px-2 py-1.5 text-right ${text}`}>{dollars(r.est_pat)}</td>
                  <td className={`px-2 py-1.5 text-right ${text}`}>{dollars(r.est_ins)}</td>

                  {/* Amount -> Payment Allocation Detail, every kind but claims
                      (a claim row carries no amount of its own). */}
                  <td className={`px-2 py-1.5 text-right font-semibold ${claim ? 'text-fuchsia-800' : credit ? 'text-orange-700' : 'text-slate-900'}`}>
                    {claim ? (
                      '-'
                    ) : onOpen ? (
                      <button
                        onClick={() => onOpen(r, 'allocation')}
                        title="Show how this amount is allocated"
                        className={`${linkBase} ${linkTone}`}
                      >
                        {dollars(r.amount)}
                      </button>
                    ) : (
                      dollars(r.amount)
                    )}
                  </td>

                  <td className={`px-2 py-1.5 text-right font-mono ${text}`}>{dollars(r.balance)}</td>
                  <td className={`px-2 py-1.5 ${text}`}>{r.user}</td>
                </tr>
              );
            })
          )}
        </tbody>
        {showFooter && (
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-800">
              <td colSpan={cols.length - 3} className="px-2 py-2 text-right">Grand Total For Results :</td>
              <td className="px-2 py-2 text-right">{dollars(grandTotal!)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
