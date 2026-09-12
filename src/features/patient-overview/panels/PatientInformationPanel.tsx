// Legacy "PATIENT INFORMATION" panel — identity block + the two-column
// label/value table, row-for-row with the legacy screen.

import { Cake, Mail, User, Edit2, Info } from "lucide-react";
import { useAssetObjectUrl } from "@/services/documentAccess";
import { Panel, PanelButton, FieldTable } from "../ui";
import {
  fmt_date,
  age_from_dob,
  sex_word,
  contact_pref_label,
  patient_display_name,
} from "../format";
import { alertDisplayLines } from "@/features/medical-alerts/patientMedicalAlerts";
import type { OverviewData } from "../useOverviewData";

export default function PatientInformationPanel({
  data,
  on_edit,
}: {
  data: OverviewData;
  on_edit: () => void;
}) {
  const p = data.patient;
  const age = age_from_dob(p?.dob);

  // Patient photo (PO-10): `patients.photo_document_id` points at a
  // patient-documents row; the content proxy needs the bearer token.
  const photo = useAssetObjectUrl(
    p?.photo_document_id != null ? `/api/v1/patient-documents/${p.photo_document_id}/content` : null,
  );

  // Only "yes" answers + account alerts are alerts (shared reader; "no" rows hidden).
  const medical_alert_text = alertDisplayLines(data.medical_alerts, data.account_alerts);

  return (
    <Panel
      title="Patient Information"
      actions={
        <PanelButton onClick={on_edit}>
          <Edit2 className="w-3 h-3" /> Edit
        </PanelButton>
      }
      // Sized to the Responsible Party + Insurance column beside it (zero
      // intrinsic height, then stretched to the grid row) so a long Patient
      // Note / Medical Alerts list scrolls inside instead of growing the row.
      className="overflow-hidden xl:h-0 xl:min-h-full print:h-auto print:min-h-0 print:overflow-visible"
      bodyClassName="flex flex-col flex-1 min-h-0"
    >
      {/* Identity block — pinned; only the field table below scrolls. */}
      <div className="flex gap-3 p-3 border-b-2 border-[#E2E8F0] shrink-0">
        <div className="shrink-0 w-[74px]">
          <div className="w-[74px] h-[74px] rounded border-2 border-[#3A6EA5] bg-[#EEF4FB] flex items-center justify-center overflow-hidden">
            {photo.src && !photo.error ? (
              <img src={photo.src} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-9 h-9 text-[#3A6EA5]" strokeWidth={1.75} />
            )}
          </div>
          <div className="text-center text-[10px] font-bold text-[#3A6EA5] uppercase mt-0.5">
            Photo
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-[13px] min-w-0">
          {/* Name / age / phone / email */}
          <div className="min-w-0">
            <div className="font-bold text-[#1E293B] text-sm truncate">
              {patient_display_name(p)}
            </div>
            <div className="text-[#475569]">
              {age ?? "-"} / {sex_word(p?.gender)}
            </div>
            {p?.cell_phone ? (
              <a
                href={`tel:${p.cell_phone}`}
                className="text-[#3A6EA5] font-semibold hover:underline block truncate"
              >
                (C) {p.cell_phone}
              </a>
            ) : (
              <div className="text-[#94A3B8]">(C) -</div>
            )}
            {p?.email ? (
              <a
                href={`mailto:${p.email}`}
                title={p.email}
                className="text-[#3A6EA5] inline-flex items-center gap-1 hover:underline"
              >
                <Mail className="w-4 h-4" />
                <span className="truncate max-w-[160px]">{p.email}</span>
              </a>
            ) : (
              <Mail className="w-4 h-4 text-[#CBD5E1]" />
            )}
          </div>

          {/* DOB / ID / Chart */}
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <Cake className="w-4 h-4 text-[#3A6EA5] shrink-0" />
              <span className="font-semibold text-[#1E293B]">{fmt_date(p?.dob)}</span>
            </div>
            {/* Both identifiers are shown side by side: the current DentC id is
                what every API call and the header chip use, while migrated
                patients also carry the legacy Denticon id staff search by.
                Showing only one of them reads as a mismatch. */}
            <LabelValue label="ID" value={p ? String(p.id) : "-"} title="DentC patient id" />
            {p?.legacy_id ? (
              <LabelValue label="Legacy ID" value={p.legacy_id} title="Legacy (migrated) patient id" />
            ) : null}
            <LabelValue label="Chart" value={p?.chart_no || "-"} />
          </div>

          {/* Visit summary */}
          <div className="space-y-0.5 min-w-0">
            <LabelValue label="Next Visit" value={fmt_date(data.visit_dates.next_visit)} />
            <LabelValue label="Next Recall" value={fmt_date(data.visit_dates.next_recall)} />
            <LabelValue label="Last Visit" value={fmt_date(data.visit_dates.last_visit)} />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto print:overflow-visible">
      <FieldTable
        rows={[
          [
            "Provider",
            data.provider_name(p?.preferred_provider_id),
            "Referral Type",
            data.referral_type_label(p?.referral_type),
          ],
          ["Hygienist", data.provider_name(p?.preferred_hygienist_id), "Referred By", p?.referred_by || ""],
          ["Home Office", data.office_name(p?.home_office_id), "Referred To", p?.referred_to || ""],
          [
            "First Visit",
            fmt_date(data.visit_dates.first_visit),
            "Last Perio Chart",
            fmt_date(data.last_perio_exam?.exam_date),
          ],
          ["Home", p?.phone || "", "Contact Pref", contact_pref_label(p?.preferred_contact)],
          [
            "Work",
            p?.work_phone || "",
            <span key="fs" className="inline-flex items-center gap-1">
              Fee Schedule
              <Info className="w-3.5 h-3.5 text-[#3A6EA5]" />
            </span>,
            data.fee_schedule_name ?? (p?.fee_schedule_id != null ? `#${p.fee_schedule_id}` : ""),
          ],
          [
            "Address",
            [p?.address_line1, p?.address_line2].filter(Boolean).join(", "),
            "Type",
            data.patient_type_label(p?.patient_type),
          ],
          [
            "City, State and Zip",
            [[p?.city, p?.state].filter(Boolean).join(", "), p?.zip].filter(Boolean).join(" "),
            "Preferred Language",
            p?.preferred_language || "",
          ],
          [
            "Patient Note",
            <span key="note" className="whitespace-pre-wrap font-normal">
              {p?.patient_notes || ""}
            </span>,
          ],
          [
            <span key="ma" className="text-[#DC2626]">
              Medical Alerts:
            </span>,
            medical_alert_text.length > 0 ? (
              <span key="mav" className="text-[#DC2626]">
                {medical_alert_text.join("; ")}
              </span>
            ) : (
              ""
            ),
          ],
        ]}
      />
      </div>
    </Panel>
  );
}

function LabelValue({
  label,
  value,
  title,
}: {
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div className="flex gap-1.5 min-w-0" title={title}>
      <span className="text-[#64748B] shrink-0">{label}</span>
      <span className="font-semibold text-[#1E293B] truncate">{value}</span>
    </div>
  );
}
