// Legacy "BILLING DETAILS" popup — the periodic billing schedule for one plan
// column (patient / primary insurance / secondary insurance).
//
// The insurance columns read their rows from the backend
// (/patient-ins-payment-plans, /patient-sec-ins-payment-plans), so billed
// instalments show their posting state and ledger id. The patient column has no
// backend row store (gap OPP-9), so its schedule is projected client-side and
// labelled as such.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Printer } from "lucide-react";
import { fmt_date, money, round2, type ScheduleRow } from "./planModel";
import { PlanButton } from "./ui";

interface Props {
  title: string;
  /** Rows to show. When `load` is given this is used only as the fallback. */
  rows?: ScheduleRow[];
  load?: () => Promise<ScheduleRow[]>;
  /** Shown when the rows are a client-side projection rather than stored rows. */
  projected_note?: string;
  on_close: () => void;
}

export default function BillingDetailsModal({
  title,
  rows,
  load,
  projected_note,
  on_close,
}: Props) {
  const [loading, set_loading] = useState(Boolean(load));
  const [data, set_data] = useState<ScheduleRow[]>(rows ?? []);

  useEffect(() => {
    if (!load) {
      set_data(rows ?? []);
      return;
    }
    let cancelled = false;
    set_loading(true);
    load()
      .then((r) => {
        if (!cancelled) set_data(r.length ? r : (rows ?? []));
      })
      .catch(() => {
        if (!cancelled) set_data(rows ?? []);
      })
      .finally(() => {
        if (!cancelled) set_loading(false);
      });
    return () => {
      cancelled = true;
    };
    // `rows` is a fresh array each render; the loader identity is the real dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  useEffect(() => {
    const on_key = (e: KeyboardEvent) => {
      if (e.key === "Escape") on_close();
    };
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, [on_close]);

  const billed_total = round2(
    data.filter((r) => r.is_billed).reduce((sum, r) => sum + r.periodic_amt, 0),
  );
  const total = round2(data.reduce((sum, r) => sum + r.periodic_amt, 0));

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] bg-black/45 flex items-start justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) on_close();
      }}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl my-8 overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]">
          <h2 className="text-white font-bold text-sm uppercase tracking-wide">{title}</h2>
          <div className="flex items-center gap-2">
            <PlanButton on_click={() => window.print()} title="Print this schedule">
              <Printer className="w-3 h-3" /> Print
            </PlanButton>
            <button
              type="button"
              onClick={on_close}
              aria-label="Close"
              className="text-white hover:bg-white/15 p-1 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="p-3 space-y-2">
          {projected_note && (
            <p className="text-[11px] leading-snug text-[#92400E] bg-[#FFFBEB] border-2 border-[#FDE68A] rounded px-2.5 py-1.5">
              {projected_note}
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[#64748B] text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-[#3A6EA5]" /> Loading schedule…
            </div>
          ) : (
            <div className="overflow-x-auto border-2 border-[#E2E8F0] rounded max-h-[55vh]">
              <table className="w-full text-[12px]">
                <thead className="bg-[#3A6EA5] text-white sticky top-0">
                  <tr>
                    {["#", "Billing Date", "Amount", "Rem. Pay", "Rem. Amount", "Status", "Ledger"].map(
                      (c) => (
                        <th
                          key={c}
                          className={`px-2 py-1.5 font-bold uppercase tracking-wide whitespace-nowrap ${
                            ["Amount", "Rem. Pay", "Rem. Amount"].includes(c) ? "text-right" : "text-left"
                          }`}
                        >
                          {c}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-2 py-6 text-center italic text-[#94A3B8]">
                        No periodic billing rows for this plan.
                      </td>
                    </tr>
                  ) : (
                    data.map((r) => (
                      <tr key={r.periodic_order} className={r.is_billed ? "bg-[#F0FDF4]" : ""}>
                        <td className="px-2 py-1 font-mono">{r.periodic_order}</td>
                        <td className="px-2 py-1">{fmt_date(r.periodic_date)}</td>
                        <td className="px-2 py-1 text-right font-mono font-semibold">
                          {money(r.periodic_amt)}
                        </td>
                        <td className="px-2 py-1 text-right font-mono">{r.rem_payments}</td>
                        <td className="px-2 py-1 text-right font-mono">{money(r.rem_total_amt)}</td>
                        <td className="px-2 py-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              r.is_billed
                                ? "bg-[#DCFCE7] text-[#166534]"
                                : "bg-[#F1F5F9] text-[#475569]"
                            }`}
                          >
                            {r.is_billed ? "Billed" : "Scheduled"}
                          </span>
                        </td>
                        <td className="px-2 py-1 font-mono text-[#64748B]">{r.ledger_id || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {data.length > 0 && (
                  <tfoot className="bg-[#F8FAFC] font-semibold">
                    <tr className="border-t-2 border-[#E2E8F0]">
                      <td colSpan={2} className="px-2 py-1.5 uppercase text-[11px] text-[#475569]">
                        Billed {data.filter((r) => r.is_billed).length} of {data.length}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">{money(billed_total)}</td>
                      <td colSpan={2} className="px-2 py-1.5 text-right uppercase text-[11px] text-[#475569]">
                        Schedule total
                      </td>
                      <td colSpan={2} className="px-2 py-1.5 font-mono">{money(total)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        <footer className="px-3 py-2 bg-[#F1F5F9] border-t-2 border-[#E2E8F0] flex justify-end">
          <PlanButton on_click={on_close} tone="dark">
            Close
          </PlanButton>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
