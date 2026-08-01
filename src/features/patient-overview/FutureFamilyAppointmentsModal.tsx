// Legacy "VIEW FUTURE FAMILY APPT" — every upcoming appointment for every
// patient on the account.
//
// There is no family/account-scoped appointment endpoint (gap PO-4), so this
// fans out one /appointments?patient_id=…&date_from=today call per member.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal, { SecondaryButton } from "./Modal";
import { DataGrid, Td } from "./ui";
import { fmt_date, fmt_time, patient_display_name, today_iso } from "./format";
import { listAppointments } from "@/api/generated/endpoints/appointments/appointments";
import type { AppointmentRead } from "@/api/generated/model";
import type { OverviewData } from "./useOverviewData";

const COLUMNS = ["Member", "Appt Date", "Appt Time", "Office", "Operatory", "Provider", "Status"];

interface Row extends AppointmentRead {
  member_name: string;
}

export default function FutureFamilyAppointmentsModal({
  data,
  on_close,
}: {
  data: OverviewData;
  on_close: () => void;
}) {
  const [rows, set_rows] = useState<Row[] | null>(null);
  const [error, set_error] = useState<string | null>(null);
  const members = data.members;

  useEffect(() => {
    let cancelled = false;
    const today = today_iso();
    (async () => {
      try {
        const per_member = await Promise.all(
          members.map(async (m) => {
            const res = await listAppointments({
              patient_id: m.id,
              date_from: today,
              size: 100,
            });
            return (res.items ?? [])
              .filter((a) => !a.is_cancelled && !a.is_archived)
              .map((a) => ({ ...a, member_name: patient_display_name(m) }));
          }),
        );
        if (cancelled) return;
        set_rows(
          per_member
            .flat()
            .sort((a, b) =>
              `${a.date}T${a.start_time ?? ""}`.localeCompare(`${b.date}T${b.start_time ?? ""}`),
            ),
        );
      } catch (err) {
        if (!cancelled) set_error(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [members]);

  return (
    <Modal
      title="Future Family Appointments"
      on_close={on_close}
      width="max-w-5xl"
      footer={<SecondaryButton onClick={on_close}>Close</SecondaryButton>}
    >
      {error ? (
        <p className="text-sm text-[#DC2626]">{error}</p>
      ) : rows == null ? (
        <div className="flex items-center gap-2 justify-center py-8 text-[#64748B] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading family appointments…
        </div>
      ) : (
        <DataGrid
          columns={COLUMNS}
          empty="No upcoming appointments for this account"
          is_empty={rows.length === 0}
          min_width={840}
        >
          {rows.map((a) => (
            <tr key={a.id} className="hover:bg-[#F8FAFC]">
              <Td className="font-semibold">{a.member_name}</Td>
              <Td className="text-[#3A6EA5] font-semibold">{fmt_date(a.date)}</Td>
              <Td>{fmt_time(a.start_time)}</Td>
              <Td>{data.office_code(a.office_id) ?? data.office_name(a.office_id)}</Td>
              <Td>{data.operatory_name(a.operatory_id)}</Td>
              <Td>{data.provider_name(a.provider_id)}</Td>
              <Td>{a.status || "-"}</Td>
            </tr>
          ))}
        </DataGrid>
      )}
    </Modal>
  );
}
