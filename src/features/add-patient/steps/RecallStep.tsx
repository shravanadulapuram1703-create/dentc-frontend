import { Plus, Trash2 } from "lucide-react";
import { StepSection, GapNotice } from "../stepUi";
import type { RecallEntry } from "../wizardModel";

interface Props {
  entries: RecallEntry[];
  onChange: (entries: RecallEntry[]) => void;
  firstVisit: string;
  lastVisit: string;
  onVisitChange: (which: "first" | "last", value: string) => void;
}

/**
 * Step — "Add Recall Due Dates" (legacy Denticon Step 3, final screen).
 * Mirrors the legacy grid: Code · Int · Int. Type · Recall Due Date · Sched Dt ·
 * Sched Time · Recall Reason, pre-seeded with the six legacy default recall rows.
 * Rows with a due date are persisted via `patient-recalls` on Finish.
 */
export default function RecallStep({
  entries,
  onChange,
  firstVisit,
  lastVisit,
  onVisitChange,
}: Props) {
  const setRow = (i: number, patch: Partial<RecallEntry>) =>
    onChange(entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const addRow = () =>
    onChange([
      ...entries,
      {
        procedure_code: "",
        interval: "6",
        interval_type: "Month",
        due_date: "",
        sched_date: "",
        sched_time: "",
        reason: "",
      },
    ]);

  const removeRow = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const dueCount = entries.filter((e) => e.due_date).length;

  return (
    <div className="space-y-3">
      <GapNotice>
        Recall rows with a due date persist via <code>patient-recalls</code> (code, reason, due date,
        interval in months). Legacy's <strong>Int. Type</strong> is normalised to months, and{" "}
        <strong>Sched Dt/Time</strong> has no backend column — it is folded into the recall note
        (gap LEG-8). <strong>Schedule Appt</strong> is out of scope here (book from the Scheduler).
      </GapNotice>

      <StepSection
        title="Visit History"
        right={<span className="text-xs text-[#64748B]">optional</span>}
      >
        <div className="grid grid-cols-2 gap-3 max-w-lg">
          <div>
            <label className="block text-[#1E293B] font-normal mb-1 text-sm">First Visit</label>
            <input
              type="date"
              value={firstVisit}
              onChange={(e) => onVisitChange("first", e.target.value)}
              className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] text-sm"
            />
          </div>
          <div>
            <label className="block text-[#1E293B] font-normal mb-1 text-sm">Last Visit</label>
            <input
              type="date"
              value={lastVisit}
              onChange={(e) => onVisitChange("last", e.target.value)}
              className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] text-sm"
            />
          </div>
        </div>
      </StepSection>

      <StepSection
        title="Recall Due Dates"
        right={
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64748B]">{dueCount} row(s) will be saved</span>
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1 text-xs font-semibold text-[#3A6EA5] hover:text-[#1F3A5F]"
            >
              <Plus className="w-3.5 h-3.5" /> Add Recall
            </button>
          </div>
        }
      >
        <p className="text-xs text-[#64748B] mb-3">
          If known, enter the dates the patient is due for their next recall appointment. Rows left
          without a due date are ignored.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
              <tr>
                {["Code", "Int", "Int. Type", "Recall Due Date", "Sched Dt", "Sched Time", "Recall Reason", ""].map(
                  (h) => (
                    <th key={h} className="px-2 py-2 text-left font-semibold text-[#1F3A5F] text-xs">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} className="border-b border-[#E2E8F0]">
                  <td className="px-2 py-1.5">
                    <input className={cell} style={{ width: 80 }} value={e.procedure_code} onChange={(ev) => setRow(i, { procedure_code: ev.target.value })} placeholder="D1110" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input className={cell} style={{ width: 56 }} type="number" min={1} value={e.interval} onChange={(ev) => setRow(i, { interval: ev.target.value })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <select className={cell} style={{ width: 90 }} value={e.interval_type} onChange={(ev) => setRow(i, { interval_type: ev.target.value as "Month" | "Year" })}>
                      <option value="Month">Month</option>
                      <option value="Year">Year</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input className={cell} style={{ width: 150 }} type="date" value={e.due_date} onChange={(ev) => setRow(i, { due_date: ev.target.value })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input className={cell} style={{ width: 150 }} type="date" value={e.sched_date} onChange={(ev) => setRow(i, { sched_date: ev.target.value })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input className={cell} style={{ width: 110 }} type="time" value={e.sched_time} onChange={(ev) => setRow(i, { sched_time: ev.target.value })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input className={cell} value={e.reason} onChange={(ev) => setRow(i, { reason: ev.target.value })} placeholder="Prophylaxis - Adult" />
                  </td>
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => removeRow(i)} className="text-[#64748B] hover:text-[#EF4444] p-1" title="Remove">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StepSection>
    </div>
  );
}

const cell =
  "w-full px-2 py-1 border border-[#E2E8F0] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] text-sm";
