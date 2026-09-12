// Medical Alert banner — the red "this patient has active medical alerts"
// strip shown wherever a clinician is about to act on the patient (today: the
// Prescriptions add screen). Reads the shared summary from
// patientMedicalAlerts.ts so it lists exactly what the Medical History tab
// says, grouped by legacy section with allergies first.
//
// States: loading · could-not-load · no history on file (unknown ≠ clear) ·
// history on file but nothing flagged · N active alerts (grouped + comments).

import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronDown, ChevronUp, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  groupAlertsBySection,
  isAllergySection,
  type PatientMedicalAlertsState,
} from "./patientMedicalAlerts";

interface Props {
  patient_id: number;
  patient_name?: string;
  state: PatientMedicalAlertsState;
  /** 'full' lists every alert (add/edit screens); 'compact' is one line with an expander. */
  variant?: "full" | "compact";
  /** Extra emphasis line, e.g. "Review before prescribing". */
  context?: string;
  className?: string;
}

const medicalHistoryPath = (patient_id: number) => `/patient/${patient_id}/medical-history`;

export default function MedicalAlertBanner({
  patient_id,
  patient_name,
  state,
  variant = "full",
  context,
  className = "",
}: Props) {
  const { summary, alerts, loading, error, refresh } = state;
  const [expanded, setExpanded] = useState(false);
  const showAll = variant === "full" || expanded;

  const historyLink = (
    <Link
      to={medicalHistoryPath(patient_id)}
      className="underline underline-offset-2 font-semibold whitespace-nowrap"
    >
      Open Medical History
    </Link>
  );

  if (loading) {
    return (
      <div
        className={`rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 ${className}`}
        role="status"
        aria-live="polite"
      >
        Checking medical alerts…
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div
        className={`rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex flex-wrap items-center gap-2 ${className}`}
        role="alert"
      >
        <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden />
        <span className="font-semibold">Medical alerts could not be loaded.</span>
        <span>Check the patient&apos;s Medical History before proceeding.</span>
        <button
          type="button"
          onClick={refresh}
          className="underline underline-offset-2 font-semibold"
        >
          Retry
        </button>
        {historyLink}
      </div>
    );
  }

  if (alerts.length === 0) {
    if (!summary.history_on_file) {
      return (
        <div
          className={`rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex flex-wrap items-center gap-2 ${className}`}
          role="status"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden />
          <span className="font-semibold">No medical history on file</span>
          <span>— allergies and conditions have not been recorded for this patient.</span>
          {historyLink}
        </div>
      );
    }
    return (
      <div
        className={`rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 flex flex-wrap items-center gap-2 ${className}`}
        role="status"
      >
        <ShieldCheck className="w-4 h-4 flex-shrink-0" aria-hidden />
        <span className="font-semibold">No active medical alerts on file.</span>
        {summary.partial && (
          <span className="text-amber-700">(One alert source could not be read.)</span>
        )}
        {summary.comments && showAll && (
          <span className="basis-full text-emerald-900/80">
            <span className="font-semibold">Comments:</span> {summary.comments}
          </span>
        )}
        {historyLink}
      </div>
    );
  }

  const groups = groupAlertsBySection(alerts);
  const allergyCount = alerts.filter((a) => isAllergySection(a.section)).length;
  const headline = `${alerts.length} active medical alert${alerts.length === 1 ? "" : "s"}${
    allergyCount ? ` · ${allergyCount} allerg${allergyCount === 1 ? "y" : "ies"}` : ""
  }`;

  return (
    <div
      className={`rounded-md border-2 border-red-400 bg-red-50 text-red-900 ${className}`}
      role="alert"
      aria-label="Medical alert"
      data-testid="medical-alert-banner"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-t">
        <ShieldAlert className="w-4 h-4 flex-shrink-0" aria-hidden />
        <span className="text-xs font-extrabold uppercase tracking-wide">Medical Alert</span>
        <span className="text-xs font-semibold">— {headline}</span>
        {patient_name && <span className="text-xs text-white/80 truncate">· {patient_name}</span>}
        <span className="ml-auto flex items-center gap-3">
          {context && showAll && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
              {context}
            </span>
          )}
          {variant === "compact" && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/90 hover:text-white"
              aria-expanded={expanded}
            >
              {expanded ? "Hide" : "Details"}
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" aria-hidden />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden />
              )}
            </button>
          )}
        </span>
      </div>

      {showAll ? (
        <div className="px-3 py-2 space-y-1.5">
          {groups.map((g) => {
            const allergy = isAllergySection(g.section);
            return (
              <div key={g.section} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wide ${
                    allergy ? "text-red-700" : "text-red-800/80"
                  }`}
                >
                  {g.section}:
                </span>
                {g.alerts.map((a) => (
                  <span
                    key={`${a.source}-${a.id}`}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-px text-xs font-semibold ${
                      allergy
                        ? "bg-red-600 text-white"
                        : "bg-white border border-red-300 text-red-800"
                    }`}
                    title={a.comments || undefined}
                  >
                    {a.label}
                    {a.is_flash_alert && (
                      <span className="text-[9px] font-extrabold uppercase opacity-80">flash</span>
                    )}
                    {a.blocks_charges && (
                      <span className="text-[9px] font-extrabold uppercase opacity-80">
                        blocks charges
                      </span>
                    )}
                  </span>
                ))}
              </div>
            );
          })}
          {summary.comments && (
            <div className="text-xs">
              <span className="font-bold">Comments:</span> {summary.comments}
            </div>
          )}
          {summary.partial && (
            <div className="text-[11px] text-amber-700">
              One alert source could not be read — this list may be incomplete.
            </div>
          )}
          <div className="text-[11px]">{historyLink}</div>
        </div>
      ) : (
        <div className="px-3 py-1.5 text-xs truncate">
          {groups
            .map((g) => `${g.section}: ${g.alerts.map((a) => a.label).join(", ")}`)
            .join(" · ")}
        </div>
      )}
    </div>
  );
}
