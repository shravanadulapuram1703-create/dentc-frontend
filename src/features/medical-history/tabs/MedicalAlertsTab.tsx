import TriStateToggle, { TriStateLegend } from "@/components/ui/TriStateToggle";
import {
  MEDICAL_ALERT_COMMENTS_MAX,
  allAlertCodes,
  type AlertAnswer,
  type MedicalAlertGroup,
  type MedicalAlertsForm,
} from "../medicalHistoryModel";

interface Props {
  groups: MedicalAlertGroup[];
  value: MedicalAlertsForm;
  onChange: (next: MedicalAlertsForm) => void;
  readOnly?: boolean;
}

/**
 * Tab — Medical Alerts (legacy "Patient Medical History → MEDICAL ALERTS").
 *
 * Groups render in legacy order, three across, filled row-major so the columns
 * read the same way as the legacy screen. A Yes is highlighted red because that
 * is the answer clinicians scan for.
 */
export default function MedicalAlertsTab({ groups, value, onChange, readOnly }: Props) {
  const codes = allAlertCodes(groups);
  const answered = codes.filter((c) => value.responses[c]).length;
  const yesCount = codes.filter((c) => value.responses[c] === "yes").length;

  const setResponse = (code: string, answer: AlertAnswer) =>
    onChange({ ...value, responses: { ...value.responses, [code]: answer } });

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#E2E8F0]">
        <span className="text-xs font-semibold text-[#64748B]">
          {answered}/{codes.length} answered · {yesCount} Yes
        </span>
        <TriStateLegend />
      </div>

      {groups.map((group) => (
        <div key={group.title}>
          <div className="px-4 py-1.5 text-[#1D4ED8] font-semibold text-sm uppercase tracking-wide">
            {group.title}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => {
              const answer = value.responses[item.code] ?? "";
              return (
                <div
                  key={item.code}
                  className="flex items-center justify-between gap-3 px-4 py-1.5 border-b border-r border-[#E2E8F0] odd:bg-[#F8FAFC]"
                >
                  <span
                    className={`text-sm ${
                      answer === "yes" ? "text-[#B91C1C] font-semibold" : "text-[#1E293B]"
                    }`}
                  >
                    {item.label}
                  </span>
                  <TriStateToggle
                    label={item.label}
                    value={answer}
                    disabled={readOnly}
                    onChange={(next) => setResponse(item.code, next)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[#1D4ED8] font-semibold text-sm uppercase tracking-wide">
            Additional Comments
          </span>
          <span className="text-xs text-[#64748B]">
            ({value.comments.length}/{MEDICAL_ALERT_COMMENTS_MAX} — MAXIMUM{" "}
            {MEDICAL_ALERT_COMMENTS_MAX} CHARACTERS)
          </span>
        </div>
        <textarea
          value={value.comments}
          readOnly={readOnly}
          onChange={(e) =>
            onChange({ ...value, comments: e.target.value.slice(0, MEDICAL_ALERT_COMMENTS_MAX) })
          }
          rows={3}
          className="w-full px-3 py-2 border border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] text-sm resize-none"
        />
      </div>
    </div>
  );
}
