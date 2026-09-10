// Legacy "RESPONSIBLE PARTY" panel — Name/Cell, Resp ID/Email, Type/Home Office.

import { Edit2, AlertTriangle } from "lucide-react";
import { Panel, PanelButton, FieldTable } from "../ui";
import type { OverviewData } from "../useOverviewData";

export default function ResponsiblePartyPanel({
  data,
  on_edit,
}: {
  data: OverviewData;
  on_edit: () => void;
}) {
  const rp = data.responsible_party;
  const p = data.patient;

  // Migrated patients carry a legacy responsible_party_id that has no row in
  // /responsible-parties (gap PO-2). Fall back to the patient's own demographics
  // — legacy shows the guarantor's name there and self-guarantors are the norm.
  const unresolved = data.responsible_party_unresolved;

  // The legacy guarantor id: the resolved record's own legacy_id when we have
  // one, otherwise the raw value carried on the patient (which is what the
  // unresolved case is left with).
  const legacy_resp_id = rp?.legacy_id || data.responsible_party_id_raw || "";

  const name = rp
    ? [rp.last_name, rp.first_name].filter(Boolean).join(", ") || "-"
    : p
      ? [p.last_name, p.first_name].filter(Boolean).join(", ") || "-"
      : "-";

  return (
    <Panel
      title="Responsible Party"
      actions={
        <PanelButton onClick={on_edit} disabled={!rp} title={rp ? undefined : "No responsible-party record to edit"}>
          <Edit2 className="w-3 h-3" /> Edit
        </PanelButton>
      }
    >
      <FieldTable
        rows={[
          ["Name", name, "Cell", rp?.cell_phone || p?.cell_phone || ""],
          [
            "Resp ID",
            // patient.responsible_party_id is the *legacy* guarantor id on
            // migrated accounts; the resolved record carries its own DentC id.
            // Show whichever of the two exist so the number on screen is never
            // ambiguous about which system it belongs to.
            <span key="resp-id" className="inline-flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-semibold text-[#1E293B]">
                {rp ? String(rp.id) : "-"}
              </span>
              {legacy_resp_id ? (
                <span className="text-[11px] font-normal text-[#64748B]">
                  (Legacy ID {legacy_resp_id})
                </span>
              ) : null}
            </span>,
            "Email",
            rp?.email || p?.email || "",
          ],
          [
            "Type",
            rp?.resp_party_type
              ? data.resp_party_type_label(rp.resp_party_type)
              : data.patient_type_label(p?.patient_type),
            "Home Office",
            data.office_name(p?.home_office_id),
          ],
        ]}
      />
      {unresolved && (
        <div className="flex items-start gap-1.5 px-3 py-1.5 bg-[#FFFBEB] border-t-2 border-[#FDE68A] text-[11px] text-[#92400E]">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>
            Responsible party <strong>{data.responsible_party_id_raw}</strong> is a legacy id with no
            record in <code>/responsible-parties</code> — showing the patient&apos;s own contact
            details (backend gap PO-2).
          </span>
        </div>
      )}
    </Panel>
  );
}
