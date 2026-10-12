import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { fetchOfficeDeleteImpact, type OfficeDeleteImpact } from "../../../services/officeDeleteApi";

type DeleteOfficeDialogProps = {
  office_id: number;
  office_name: string;
  /** True when this office is the user's current working office (top-bar switcher). */
  is_working_office: boolean;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const IMPACT_ROWS: { key: keyof OfficeDeleteImpact; label: string }[] = [
  { key: "future_appointments", label: "Upcoming appointments (today onward)" },
  { key: "home_patients", label: "Active patients with this home office" },
  { key: "assigned_users", label: "Users assigned to this office" },
  { key: "assigned_providers", label: "Providers assigned to this office" },
  { key: "active_operatories", label: "Active operatories" },
];

/**
 * Confirm dialog for deleting an office. The backend delete is a soft delete
 * (the office becomes Inactive and can be reactivated), and it does not check
 * what still references the office — so this dialog shows that impact and
 * makes the user type the office name before confirming.
 */
export default function DeleteOfficeDialog({
  office_id,
  office_name,
  is_working_office,
  deleting,
  onCancel,
  onConfirm,
}: DeleteOfficeDialogProps) {
  const [impact, setImpact] = useState<OfficeDeleteImpact | null>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let cancelled = false;
    setImpact(null);
    void fetchOfficeDeleteImpact(office_id).then((r) => {
      if (!cancelled) setImpact(r);
    });
    return () => {
      cancelled = true;
    };
  }, [office_id]);

  const nameMatches = typed.trim().toLowerCase() === office_name.trim().toLowerCase();
  const hasUpcoming = (impact?.future_appointments ?? 0) > 0;
  const canConfirm = !!impact && nameMatches && !is_working_office && !deleting;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[#E2E8F0]">
          <h2 className="flex items-center gap-2 text-lg font-bold text-red-700">
            <Trash2 className="w-5 h-5" />
            Delete office
          </h2>
          <button onClick={onCancel} className="p-1 rounded hover:bg-slate-100" aria-label="Close">
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 text-sm text-[#1E293B]">
          <p>
            <span className="font-bold">{office_name}</span> will be marked <span className="font-bold">Inactive</span>.
            Its history (patients, appointments, ledger, claims) is kept and still shows this office. You can
            reactivate it later from this screen.
          </p>

          {is_working_office && (
            <div className="flex gap-2 p-3 rounded-lg bg-red-50 border-2 border-red-200 text-red-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                This is your current working office. Switch to another office in the top bar before deleting it.
              </span>
            </div>
          )}

          <div className="rounded-lg border-2 border-[#E2E8F0]">
            <div className="px-3 py-2 bg-[#F7F9FC] border-b-2 border-[#E2E8F0] text-xs font-bold uppercase tracking-wide text-[#64748B]">
              Still attached to this office
            </div>
            {impact == null ? (
              <div className="flex items-center gap-2 px-3 py-3 text-[#64748B]">
                <Loader2 className="w-4 h-4 animate-spin" /> Checking…
              </div>
            ) : (
              <ul className="divide-y divide-[#E2E8F0]">
                {IMPACT_ROWS.map(({ key, label }) => {
                  const n = impact[key];
                  return (
                    <li key={key} className="flex justify-between px-3 py-2">
                      <span>{label}</span>
                      <span className={`font-bold ${n ? "text-amber-700" : "text-[#64748B]"}`}>
                        {n == null ? "couldn't check" : n}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {hasUpcoming && (
            <div className="flex gap-2 p-3 rounded-lg bg-amber-50 border-2 border-amber-200 text-amber-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Upcoming appointments are not moved or cancelled. Reschedule them first, or they stay booked
                at an inactive office.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-1">
              Type <span className="font-mono">{office_name}</span> to confirm
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={is_working_office || deleting}
              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 disabled:bg-slate-100"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t-2 border-[#E2E8F0]">
          <button
            onClick={onCancel}
            className="px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete office
          </button>
        </div>
      </div>
    </div>
  );
}
