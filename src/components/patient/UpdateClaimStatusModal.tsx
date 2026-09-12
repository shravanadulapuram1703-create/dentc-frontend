// UPDATE STATUS dialog for the claim screen.
//
// Replaces a `window.prompt` that took free text: whatever was typed went
// straight to POST /insurance-claims/{id}/status, so a capitalised "Submitted"
// or a typo saved a literal string, skipped the backend's date side-effects
// (Claim Sent / Paid / Close date) and read on screen as "the status did not
// update". The picker only offers values the backend acts on, and the save is
// read back from the server before the dialog closes so a silent no-op cannot
// look like a success.
//
// "Submitted" goes through POST /insurance-claims/{id}/submit (SVC-1), which is
// where the supporting-records gate lives (PROC-7c): a 422
// `supporting_records_missing` lists every line still lacking an X-ray / perio
// chart / photo / attachment / missing-tooth info, and the sender can override
// with "Send anyway" (allow_missing_records). Refusing outright would only push
// staff to un-flag the code in Setup.

import { useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Send, X } from "lucide-react";
import { getClaimDetail, setClaimStatus } from "@/api/generated/endpoints/billing/billing";
import {
  describeMissingRecord,
  submitClaimWithRecords,
  supportingRecordsError,
  type ClaimMissingRecord,
} from "@/features/procedures/supportingRecords";
import {
  CLAIM_STATUS_OPTIONS,
  claimStatusLabel,
  isUnknownClaimStatus,
} from "./claimStatus";

interface Props {
  claimId: string;
  /** Status currently stored on the claim. */
  currentStatus: string;
  onClose: () => void;
  /** Fired with the persisted status once the server confirms the change. */
  onUpdated: (status: string) => void;
}

const errMsg = (err: unknown): string | undefined =>
  (err as { response?: { data?: { detail?: string; error?: { message?: string } } } })?.response
    ?.data?.detail ||
  (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
    ?.message;

export default function UpdateClaimStatusModal({
  claimId,
  currentStatus,
  onClose,
  onUpdated,
}: Props) {
  const currentKey = (currentStatus || "").trim().toLowerCase();
  const [selected, setSelected] = useState<string>(
    CLAIM_STATUS_OPTIONS.some((o) => o.value === currentKey) ? currentKey : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Lines the submit refused for (PROC-7c). Set = the "Send anyway" path is offered. */
  const [missingRecords, setMissingRecords] = useState<ClaimMissingRecord[] | null>(null);

  const option = CLAIM_STATUS_OPTIONS.find((o) => o.value === selected);
  const unchanged = selected !== "" && selected === currentKey;

  // Read back rather than trusting the write: the reported bug was a status
  // that appeared to save but never changed on the record.
  const confirmSaved = async (expected: string): Promise<void> => {
    const fresh = await getClaimDetail(claimId);
    const saved = (fresh.claim.status || "").trim();
    if (saved.toLowerCase() !== expected) {
      setError(
        `The server still reports this claim as "${claimStatusLabel(saved)}". The status was not saved.`,
      );
      return;
    }
    onUpdated(saved);
    onClose();
  };

  const handleSubmit = async (allowMissing: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const result = await submitClaimWithRecords(claimId, { allow_missing_records: allowMissing });
      // The submit records sent_date / batch / method; make sure the lifecycle
      // status is stamped as well (it also sets Claim Sent Date if still blank).
      if ((result.status || "").trim().toLowerCase() !== "submitted") {
        await setClaimStatus(claimId, { status: "submitted" });
      }
      setMissingRecords(null);
      await confirmSaved("submitted");
    } catch (err) {
      const gate = supportingRecordsError(err);
      if (gate) {
        setMissingRecords(gate.missing);
        setError(null);
      } else {
        setError(errMsg(err) || "Failed to submit the claim.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!option) {
      setError("Select a claim status.");
      return;
    }
    if (option.value === "submitted") {
      await handleSubmit(false);
      return;
    }
    if (
      option.destructive &&
      !window.confirm(
        `Set this claim to ${option.label}? ${option.effect} You can reopen it later by setting the status back to Submitted.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setClaimStatus(claimId, { status: option.value });
      await confirmSaved(option.value);
    } catch (err) {
      setError(errMsg(err) || "Failed to update the claim status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded shadow-2xl w-full max-w-lg flex flex-col">
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-4 py-2 flex items-center justify-between rounded-t">
          <h2 className="text-sm font-bold text-white uppercase tracking-wide">
            Update Claim Status
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-white hover:bg-white/20 rounded"
            title="Close"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-xs text-slate-600">
            Current status:{" "}
            <span className="font-semibold text-slate-900">{claimStatusLabel(currentStatus)}</span>
            {isUnknownClaimStatus(currentStatus) && (
              <span className="ml-2 text-amber-700">
                (not one of the standard statuses — saved as free text previously)
              </span>
            )}
          </div>

          <fieldset className="border-2 border-[#E2E8F0] rounded">
            <legend className="sr-only">New claim status</legend>
            <div className="divide-y divide-slate-200">
              {CLAIM_STATUS_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={`flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 ${
                    selected === o.value ? "bg-[#E8EFF7]" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="claim-status"
                    className="mt-0.5"
                    value={o.value}
                    checked={selected === o.value}
                    onChange={() => {
                      setSelected(o.value);
                      setError(null);
                    }}
                  />
                  <span>
                    <span className="block text-xs font-semibold text-slate-900">
                      {o.label}
                      {o.value === currentKey && (
                        <span className="ml-2 font-normal text-slate-500">(current)</span>
                      )}
                    </span>
                    <span className="block text-[11px] text-slate-600">{o.effect}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {unchanged && (
            <div className="text-[11px] text-slate-500">
              This is already the claim's status — pick a different one to change it.
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded border-l-4 border-red-400 bg-red-50 px-3 py-2 text-xs text-red-800">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={2} />
              <span>{error}</span>
            </div>
          )}

          {missingRecords && (
            <div
              role="alert"
              className="rounded border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-1.5"
            >
              <div className="flex items-start gap-2 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={2} />
                <span>
                  Not submitted: supporting records are missing for {missingRecords.length} line
                  {missingRecords.length === 1 ? "" : "s"}.
                </span>
              </div>
              <ul className="list-disc pl-8 space-y-0.5">
                {missingRecords.map((m, i) => (
                  <li key={`${m.procedure_id}-${m.record}-${i}`}>{describeMissingRecord(m)}</li>
                ))}
              </ul>
              <div className="pl-5 text-[11px]">
                Attach the records (Claim Attachments, Imaging, Perio) and try again, or send the
                claim as it is. The override is recorded on the submission.
              </div>
            </div>
          )}
        </div>

        <div className="border-t-2 border-[#E2E8F0] px-4 py-2 flex items-center justify-end gap-2 bg-slate-50 rounded-b">
          {missingRecords && (
            <button
              onClick={() => void handleSubmit(true)}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-amber-600 text-white hover:bg-amber-700 font-semibold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} />
              ) : (
                <Send className="w-3 h-3" strokeWidth={2} />
              )}
              Send Anyway
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !option || unchanged}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-[#1F3A5F] text-white hover:bg-[#2d5080] font-semibold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} />
            ) : (
              <RefreshCw className="w-3 h-3" strokeWidth={2} />
            )}
            {saving ? "Updating…" : "Update Status"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-slate-500 text-white hover:bg-slate-600 font-semibold uppercase tracking-wide disabled:opacity-50"
          >
            <X className="w-3 h-3" strokeWidth={2} />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
