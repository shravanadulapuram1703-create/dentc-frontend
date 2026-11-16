/**
 * Inline "Existing patient found" panel shown under the name + birth-date
 * fields of every create-a-patient form. Lets the user pick the existing record
 * ("Use This Patient") instead of registering a duplicate; the host decides
 * what picking means (Scheduler → book this patient, Add Patient page → open
 * the patient).
 *
 * Feed it {@link useExistingPatientMatches}. Renders nothing while idle or when
 * there is no match, so a genuinely new patient sees no extra UI.
 */
import { Loader2, UserCheck, AlertTriangle } from "lucide-react";
import type { ExistingPatientMatches as Matches } from "./useExistingPatientMatches";

const MATCH_LABEL: Record<string, string> = {
  last_name: "Last name",
  first_name: "First name",
  dob: "DOB",
  ssn: "SSN",
  chart_no: "Chart #",
  phone: "Phone",
  email: "Email",
};

interface ExistingPatientMatchesProps {
  result: Matches;
  /** Label of the per-row action, e.g. "Use This Patient" / "Open Patient". */
  select_label?: string;
  onSelect: (patient_id: number) => void;
  disabled?: boolean;
}

export default function ExistingPatientMatches({
  result,
  select_label = "Use This Patient",
  onSelect,
  disabled = false,
}: ExistingPatientMatchesProps) {
  const { status, matches } = result;

  if (status === "searching" && matches.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#64748B] py-1.5" role="status">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Checking for an existing patient with this name and birth date…
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex items-center gap-2 text-xs text-[#B45309] py-1.5" role="status">
        <AlertTriangle className="w-3.5 h-3.5" />
        Couldn't check for existing patients. Search Existing Patient before creating a new one.
      </div>
    );
  }
  if (matches.length === 0) return null;

  return (
    <section
      className="border-2 border-[#F59E0B] bg-[#FFFBEB] rounded-lg overflow-hidden"
      aria-label="Existing patient matches"
    >
      <div className="px-3 py-2 flex items-center gap-2 border-b border-[#FCD34D]">
        <UserCheck className="w-4 h-4 text-[#B45309]" />
        <span className="text-xs font-bold text-[#92400E]">
          {matches.length === 1
            ? "This patient may already exist"
            : `${matches.length} existing patients match`}
        </span>
        <span className="text-[11px] text-[#92400E]/80">
          — select the existing record instead of creating a duplicate.
        </span>
        {status === "searching" && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B45309] ml-auto" />}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#FEF3C7] text-[#78350F]">
            <tr>
              <th className="px-3 py-1.5 text-left font-semibold">Patient Name</th>
              <th className="px-3 py-1.5 text-left font-semibold">Birthdate</th>
              <th className="px-3 py-1.5 text-left font-semibold">Patient ID</th>
              <th className="px-3 py-1.5 text-left font-semibold">Office</th>
              <th className="px-3 py-1.5 text-left font-semibold">Phone / Email</th>
              <th className="px-3 py-1.5 text-left font-semibold">Status</th>
              <th className="px-3 py-1.5 text-left font-semibold">Matched On</th>
              <th className="px-3 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id} className="border-t border-[#FDE68A] bg-white">
                <td className="px-3 py-1.5 font-semibold text-[#1F3A5F]">{m.name}</td>
                <td className="px-3 py-1.5">{m.dob}</td>
                <td className="px-3 py-1.5">{m.patient_id}</td>
                <td className="px-3 py-1.5">{m.home_office_short_id || "—"}</td>
                <td className="px-3 py-1.5">{[m.phone, m.email].filter(Boolean).join(" · ") || "—"}</td>
                <td className="px-3 py-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      m.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-[#64748B]">
                  {m.match_on.map((f) => MATCH_LABEL[f] ?? f).join(", ")}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(m.id)}
                    disabled={disabled}
                    className="px-3 py-1 text-[11px] font-bold rounded bg-[#3A6EA5] text-white hover:bg-[#1F3A5F] whitespace-nowrap disabled:opacity-60"
                  >
                    {select_label}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
