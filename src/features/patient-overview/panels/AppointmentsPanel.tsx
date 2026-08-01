// Legacy SUMMARY > "APPOINTMENTS" grid, with the legacy toolbar:
// ARCHIVE APPT / + ADD NEW APPT / VIEW FUTURE FAMILY APPT.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, Plus, Eye, Loader2, ArchiveRestore } from "lucide-react";
import { SectionBar, ActionButton, DataGrid, Td } from "../ui";
import { fmt_date, fmt_time } from "../format";
import { useUpdateAppointment } from "@/api/generated/endpoints/appointments/appointments";
import type { OverviewData } from "../useOverviewData";

const COLUMNS = [
  "Appt Date",
  "Appt Time",
  "Office",
  "Operatory",
  "Provider",
  "Duration",
  "Status",
  "Last Updated",
];

export default function AppointmentsPanel({
  data,
  patient_id,
  on_view_family,
}: {
  data: OverviewData;
  patient_id: number;
  on_view_family: () => void;
}) {
  const navigate = useNavigate();
  const [show_archived, set_show_archived] = useState(false);
  const [selected_id, set_selected_id] = useState<string | null>(null);
  const [busy, set_busy] = useState(false);

  // The /appointments list endpoint has no is_archived filter (gap PO-5), so
  // archived rows are separated here.
  const rows = data.appointments.filter((a) => Boolean(a.is_archived) === show_archived);
  const selected = rows.find((a) => a.id === selected_id) ?? null;

  const update_appointment = useUpdateAppointment();

  const toggle_archive = async () => {
    if (!selected) return;
    set_busy(true);
    try {
      await update_appointment.mutateAsync({
        itemId: selected.id,
        data: { is_archived: !selected.is_archived },
      });
      set_selected_id(null);
      data.refetch_all();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      window.alert(`Could not ${selected.is_archived ? "restore" : "archive"} appointment: ${message}`);
    } finally {
      set_busy(false);
    }
  };

  return (
    <div className="mb-4">
      <SectionBar
        title="Appointments"
        actions={
          <>
            <ActionButton
              onClick={toggle_archive}
              disabled={!selected || busy}
              title={selected ? undefined : "Select an appointment row first"}
            >
              {busy ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : show_archived ? (
                <ArchiveRestore className="w-3 h-3" />
              ) : (
                <Archive className="w-3 h-3" />
              )}
              {show_archived ? "Restore Appt" : "Archive Appt"}
            </ActionButton>
            <ActionButton
              onClick={() => {
                set_selected_id(null);
                set_show_archived((v) => !v);
              }}
              active={show_archived}
            >
              {show_archived ? "Show Active" : "Show Archived"}
            </ActionButton>
            <ActionButton onClick={() => navigate("/scheduler")}>
              <Plus className="w-3 h-3" /> Add New Appt
            </ActionButton>
            <ActionButton onClick={on_view_family}>
              <Eye className="w-3 h-3" /> View Future Family Appt
            </ActionButton>
          </>
        }
      />

      {data.appointments_loading ? (
        <div className="flex items-center gap-2 justify-center py-6 text-[#64748B] text-sm border-2 border-[#E2E8F0] rounded">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading appointments…
        </div>
      ) : (
        <DataGrid
          columns={COLUMNS}
          empty={show_archived ? "No archived appointments" : "No appointments"}
          is_empty={rows.length === 0}
          min_width={820}
        >
          {rows.map((a) => (
            <tr
              key={a.id}
              onClick={() => set_selected_id(a.id === selected_id ? null : a.id)}
              className={`cursor-pointer ${
                a.id === selected_id ? "bg-[#E8F0FA]" : "hover:bg-[#F8FAFC]"
              } ${a.is_cancelled ? "line-through text-[#94A3B8]" : ""}`}
            >
              <Td className="text-[#3A6EA5] font-semibold">{fmt_date(a.date)}</Td>
              <Td>{fmt_time(a.start_time)}</Td>
              <Td>{data.office_code(a.office_id) ?? data.office_name(a.office_id)}</Td>
              <Td>{data.operatory_name(a.operatory_id)}</Td>
              <Td>{data.provider_name(a.provider_id)}</Td>
              <Td>{a.duration ?? "-"}</Td>
              <Td>{a.status || "-"}</Td>
              <Td>{fmt_date(a.updated_at ?? a.created_at)}</Td>
            </tr>
          ))}
        </DataGrid>
      )}
      {patient_id > 0 && rows.length > 0 && (
        <p className="text-[11px] text-[#94A3B8] mt-1">
          Click a row to select it, then use Archive / Restore Appt.
        </p>
      )}
    </div>
  );
}
