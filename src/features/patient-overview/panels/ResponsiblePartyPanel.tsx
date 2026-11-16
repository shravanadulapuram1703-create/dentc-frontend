// Legacy "RESPONSIBLE PARTY" panel — who is billed for this patient's account.
//
// Hierarchy: ACCOUNT -> RESPONSIBLE PARTY (guarantor) -> member patients. The
// guarantor is either the patient themself (self), another patient who heads
// the account (patient-as-guarantor), or a non-patient responsible_parties row.
// See ../guarantor.ts for how `patients.responsible_party_id` is classified.

import { useNavigate } from "react-router-dom";
import { Edit2, AlertTriangle, Info, Loader2 } from "lucide-react";
import { Panel, PanelButton, FieldTable } from "../ui";
import type { OverviewData } from "../useOverviewData";
import { relationship_label, type GuarantorKind } from "../guarantor";

const KIND_BADGE: Record<GuarantorKind, string> = {
  self: "Self",
  unlinked: "Self (not set)",
  patient: "Head of account",
  responsible_party: "Non-patient guarantor",
  unresolved: "Not migrated",
};

export default function ResponsiblePartyPanel({
  data,
  on_edit,
  on_edit_patient,
}: {
  data: OverviewData;
  /** Edit the responsible_parties row (non-patient guarantor). */
  on_edit: () => void;
  /** Edit the patient in context (self-guarantor's billing identity). */
  on_edit_patient: () => void;
}) {
  const navigate = useNavigate();
  const g = data.guarantor;
  const p = data.patient;
  const rp = g?.responsible_party ?? null;
  // Self / head-of-account guarantors are patients; fall back to the patient in
  // context when nothing resolved (unmigrated legacy key).
  const person = rp ?? g?.guarantor_patient ?? p ?? null;
  const is_patient_guarantor = !rp && Boolean(g?.guarantor_patient);

  const name = person ? [person.last_name, person.first_name].filter(Boolean).join(", ") || "-" : "-";
  const member_count = data.members.length || 1;

  // Resp ID: the guarantor's DentC id, labelled with which table it lives in so
  // a patient id is never mistaken for a responsible_parties id (gap RP-1).
  const resp_id = (() => {
    if (!g) return "-";
    if (rp) return String(rp.id);
    if (g.guarantor_patient) return `${g.guarantor_patient.id}`;
    return "-";
  })();
  const resp_id_note = (() => {
    if (!g) return "";
    if (rp) return rp.legacy_id ? `(RP record · Legacy ID ${rp.legacy_id})` : "(RP record)";
    if (is_patient_guarantor) return "(Patient ID)";
    if (g.kind === "unresolved") return `(Legacy ID ${g.account_key})`;
    return "";
  })();

  const relationship =
    g?.kind === "self" || g?.kind === "unlinked"
      ? "Self"
      : relationship_label(p?.responsible_party_relationship) || "-";

  const edit_action = (() => {
    if (!g) return { disabled: true, title: "Loading…", run: () => {} };
    if (g.kind === "responsible_party") return { disabled: false, title: undefined, run: on_edit };
    if (g.kind === "self" || g.kind === "unlinked") {
      return { disabled: false, title: "Edit the patient's own billing details", run: on_edit_patient };
    }
    if (g.kind === "patient" && g.guarantor_patient) {
      const id = g.guarantor_patient.id;
      return {
        disabled: false,
        title: "The guarantor is a patient — open their overview to edit",
        run: () => navigate(`/patient/${id}/overview`),
      };
    }
    return { disabled: true, title: "No responsible-party record to edit", run: () => {} };
  })();

  return (
    <Panel
      title="Responsible Party"
      actions={
        <>
          {g && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/20 text-white">
              {KIND_BADGE[g.kind]}
            </span>
          )}
          <PanelButton onClick={edit_action.run} disabled={edit_action.disabled} title={edit_action.title}>
            <Edit2 className="w-3 h-3" /> Edit
          </PanelButton>
        </>
      }
    >
      {!g ? (
        <div className="flex items-center gap-2 justify-center py-4 text-[#64748B] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Resolving responsible party…
        </div>
      ) : (
        <FieldTable
          rows={[
            [
              "Name",
              is_patient_guarantor && g.kind === "patient" && g.guarantor_patient ? (
                <button
                  key="rp-name"
                  type="button"
                  onClick={() => navigate(`/patient/${g.guarantor_patient!.id}/overview`)}
                  className="text-[#3A6EA5] font-semibold hover:underline"
                >
                  {name}
                </button>
              ) : (
                name
              ),
              "Cell",
              person?.cell_phone || "",
            ],
            [
              "Resp ID",
              <span key="resp-id" className="inline-flex flex-wrap items-baseline gap-x-1.5">
                <span className="font-semibold text-[#1E293B]">{resp_id}</span>
                {resp_id_note ? (
                  <span className="text-[11px] font-normal text-[#64748B]">{resp_id_note}</span>
                ) : null}
              </span>,
              "Email",
              person?.email || "",
            ],
            [
              "Relationship",
              relationship,
              "Type",
              rp?.resp_party_type ? data.resp_party_type_label(rp.resp_party_type) : "-",
            ],
            [
              "Account",
              `${member_count} member${member_count === 1 ? "" : "s"}`,
              "Home Office",
              data.office_name(rp?.home_office_id ?? g.guarantor_patient?.home_office_id ?? p?.home_office_id),
            ],
          ]}
        />
      )}
      {g?.kind === "unlinked" && (
        <div className="flex items-start gap-1.5 px-3 py-1.5 bg-[#EFF6FF] border-t-2 border-[#BFDBFE] text-[11px] text-[#1E40AF]">
          <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>No responsible party is linked to this patient, so they are billed as their own account.</span>
        </div>
      )}
      {g?.kind === "unresolved" && (
        <div className="flex items-start gap-1.5 px-3 py-1.5 bg-[#FFFBEB] border-t-2 border-[#FDE68A] text-[11px] text-[#92400E]">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>
            The responsible party for this account (Legacy ID <strong>{g.account_key}</strong>) has not
            been migrated yet, so the patient&apos;s own contact details are shown.
          </span>
        </div>
      )}
    </Panel>
  );
}
