// Legacy SUMMARY > "RECALLS" grid. The red badge counts recalls that are due or
// overdue, matching the legacy alert dot next to the section title.

import { useState } from "react";
import { Edit2, Loader2, AlertCircle } from "lucide-react";
import { SectionBar, ActionButton, DataGrid, Td } from "../ui";
import { fmt_date, fmt_time, recall_interval_label, today_iso } from "../format";
import RecallEditModal from "../RecallEditModal";
import type { OverviewData } from "../useOverviewData";

const COLUMNS = ["Code", "Interval", "Recall Date", "Reason", "Sch Date", "Sch Time"];

export default function RecallsPanel({ data }: { data: OverviewData }) {
  const [editing_id, set_editing_id] = useState<number | null>(null);
  const [selected_id, set_selected_id] = useState<number | null>(null);

  const today = today_iso();
  const overdue_count = data.recalls.filter(
    (r) => r.due_date != null && r.due_date <= today && !r.scheduled_date,
  ).length;

  const editing = data.recalls.find((r) => r.id === editing_id) ?? null;
  const selected = data.recalls.find((r) => r.id === selected_id) ?? null;

  return (
    <div>
      <SectionBar
        title="Recalls"
        badge={
          overdue_count > 0 ? (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#DC2626] text-white text-[10px] font-bold"
              title={`${overdue_count} recall(s) due and not scheduled`}
            >
              <AlertCircle className="w-3 h-3" />
              {overdue_count}
            </span>
          ) : null
        }
        actions={
          <ActionButton
            onClick={() => set_editing_id(selected?.id ?? data.recalls[0]?.id ?? null)}
            disabled={data.recalls.length === 0}
            title={data.recalls.length === 0 ? "No recalls to edit" : "Edit the selected recall"}
          >
            <Edit2 className="w-3 h-3" /> Edit
          </ActionButton>
        }
      />

      {data.recalls_loading ? (
        <div className="flex items-center gap-2 justify-center py-6 text-[#64748B] text-sm border-2 border-[#E2E8F0] rounded">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading recalls…
        </div>
      ) : (
        <DataGrid
          columns={COLUMNS}
          empty="No recalls"
          is_empty={data.recalls.length === 0}
          min_width={620}
        >
          {data.recalls.map((r) => (
            <tr
              key={r.id}
              onClick={() => set_selected_id(r.id === selected_id ? null : r.id)}
              onDoubleClick={() => set_editing_id(r.id)}
              className={`cursor-pointer ${
                r.id === selected_id ? "bg-[#E8F0FA]" : "hover:bg-[#F8FAFC]"
              }`}
            >
              <Td className="font-semibold">{r.procedure_code || "-"}</Td>
              <Td>{recall_interval_label(r.interval_months, r.interval_unit)}</Td>
              <Td
                className={
                  r.due_date != null && r.due_date <= today && !r.scheduled_date
                    ? "text-[#DC2626] font-semibold"
                    : ""
                }
              >
                {fmt_date(r.due_date)}
              </Td>
              <Td className="whitespace-normal max-w-[240px]">{r.recall_type || "-"}</Td>
              <Td>{fmt_date(r.scheduled_date)}</Td>
              <Td>{fmt_time(r.scheduled_time)}</Td>
            </tr>
          ))}
        </DataGrid>
      )}

      {editing && (
        <RecallEditModal
          recall={editing}
          on_close={() => set_editing_id(null)}
          on_saved={() => {
            set_editing_id(null);
            data.refetch_all();
          }}
        />
      )}
    </div>
  );
}
