import { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Sparkles,
  Globe,
  Camera,
  CreditCard,
  Loader2,
  Save,
  CheckCircle2,
  Circle,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { components } from "../../../../styles/theme";
import {
  fetchOfficeIntegrations,
  updateOfficeIntegrations,
  type OfficeIntegrationsRead,
  type OfficeIntegrationsUpdate,
} from "../../../../services/officeIntegrationApi";

/**
 * Office → Integration tab. Backed by the real backend integrations endpoints
 * (gap #13, now landed) via the generated office-setup client. Sections:
 * Service Email, AI Assist, Patient Communication URLs, Dentiray, Transfirst,
 * DoseSpot, and Payment Portal accepted credit cards.
 */

/**
 * Stable UI enum for Dentiray storage formats. Presentation-only option set
 * (not business data) until the backend defines a canonical list. The selected
 * value is sent verbatim as the `dentiray_storage_format` string.
 */
const DENTIRAY_STORAGE_FORMATS = [
  "Uncompressed",
  "Compressed, Low Quality",
  "Compressed, Med.Quality",
  "Compressed, High Quality",
] as const;

/* ---------------------------------------------------------------------------
 * accepted_cards serialization convention.
 *
 * The backend stores accepted cards as a single plain STRING (`accepted_cards`).
 * We serialize the four checkbox states to a comma-separated list of canonical
 * tokens, in a fixed order, with NO spaces:
 *
 *     "AMEX,MC,VISA,DISC"
 *
 * - Empty selection serializes to null (cleared).
 * - On load we parse the string case-insensitively and tolerate spaces, so a
 *   value like "amex, visa" still maps back to the right checkboxes.
 * - Unknown tokens are ignored on parse.
 * ------------------------------------------------------------------------- */
const CARD_OPTIONS = [
  { token: "AMEX", label: "American Express" },
  { token: "MC", label: "Mastercard" },
  { token: "VISA", label: "Visa" },
  { token: "DISC", label: "Discover" },
] as const;

type CardToken = (typeof CARD_OPTIONS)[number]["token"];

type CardState = Record<CardToken, boolean>;

const EMPTY_CARDS: CardState = { AMEX: false, MC: false, VISA: false, DISC: false };

/** Parse a stored `accepted_cards` string into checkbox state. */
function parseAcceptedCards(value: string | null | undefined): CardState {
  const next: CardState = { ...EMPTY_CARDS };
  if (!value) return next;
  for (const raw of value.split(",")) {
    const token = raw.trim().toUpperCase();
    if (token in next) next[token as CardToken] = true;
  }
  return next;
}

/** Serialize checkbox state to the comma-separated `accepted_cards` string (or null). */
function serializeAcceptedCards(state: CardState): string | null {
  const tokens = CARD_OPTIONS.filter(({ token }) => state[token]).map(({ token }) => token);
  return tokens.length ? tokens.join(",") : null;
}

/** Editable form shape — the writable text/select fields plus card state. */
type IntegrationForm = {
  service_email: string;
  ai_assist_enabled: boolean;
  patient_comm_url: string;
  patient_portal_url: string;
  dentiray_storage_format: string;
  transfirst_device: string;
  dosespot_clinic_id: string;
  accepted_cards: CardState;
};

const EMPTY_FORM: IntegrationForm = {
  service_email: "",
  ai_assist_enabled: false,
  patient_comm_url: "",
  patient_portal_url: "",
  dentiray_storage_format: "",
  transfirst_device: "",
  dosespot_clinic_id: "",
  accepted_cards: { ...EMPTY_CARDS },
};

function readToForm(r: OfficeIntegrationsRead): IntegrationForm {
  return {
    service_email: r.service_email ?? "",
    ai_assist_enabled: r.ai_assist_enabled,
    patient_comm_url: r.patient_comm_url ?? "",
    patient_portal_url: r.patient_portal_url ?? "",
    dentiray_storage_format: r.dentiray_storage_format ?? "",
    transfirst_device: r.transfirst_device ?? "",
    dosespot_clinic_id: r.dosespot_clinic_id ?? "",
    accepted_cards: parseAcceptedCards(r.accepted_cards),
  };
}

const INPUT_CLASS =
  "w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const LABEL_CLASS = "block text-sm font-semibold text-slate-700 mb-2";

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-700">
      <CheckCircle2 className="w-3.5 h-3.5" />
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded bg-slate-100 text-slate-500">
      <Circle className="w-3.5 h-3.5" />
      Not Verified
    </span>
  );
}

type IntegrationTabProps = {
  officeId: number;
};

export default function IntegrationTab({ officeId }: IntegrationTabProps) {
  const [form, setForm] = useState<IntegrationForm>(EMPTY_FORM);
  // Write-only DoseSpot secret — sent only when the user types a new value.
  const [dosespotKey, setDosespotKey] = useState("");
  // Read-only server flags.
  const [emailVerified, setEmailVerified] = useState(false);
  const [keyMasked, setKeyMasked] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOfficeIntegrations(officeId);
      setForm(readToForm(data));
      setEmailVerified(data.service_email_verified);
      setKeyMasked(data.dosespot_key_masked ?? null);
      setDosespotKey("");
      setDirty(false);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as Error).message)
          : "Failed to load integrations";
      setError(msg);
      setForm(EMPTY_FORM);
    } finally {
      setLoading(false);
    }
  }, [officeId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setField = <K extends keyof IntegrationForm>(field: K, value: IntegrationForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const toggleCard = (token: CardToken, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      accepted_cards: { ...prev.accepted_cards, [token]: checked },
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: OfficeIntegrationsUpdate = {
        service_email: form.service_email || null,
        ai_assist_enabled: form.ai_assist_enabled,
        patient_comm_url: form.patient_comm_url || null,
        patient_portal_url: form.patient_portal_url || null,
        dentiray_storage_format: form.dentiray_storage_format || null,
        transfirst_device: form.transfirst_device || null,
        dosespot_clinic_id: form.dosespot_clinic_id || null,
        accepted_cards: serializeAcceptedCards(form.accepted_cards),
        // Write-only secret: only include when the user entered a new value.
        ...(dosespotKey ? { dosespot_key: dosespotKey } : {}),
      };
      const updated = await updateOfficeIntegrations(officeId, body);
      setForm(readToForm(updated));
      setEmailVerified(updated.service_email_verified);
      setKeyMasked(updated.dosespot_key_masked ?? null);
      setDosespotKey("");
      setDirty(false);
      toast.success("Integration settings saved");
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as Error).message)
          : "Request failed";
      toast.error("Save failed", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        <span className="text-sm font-bold">Loading integration settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {saving && (
        <div className="absolute inset-0 bg-white/60 z-40 flex items-center justify-center rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        </div>
      )}

      {error && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-3">
          <p className="text-xs font-bold text-amber-800">
            Could not load saved integration settings ({error}). You can still edit the fields
            below.
          </p>
        </div>
      )}

      {/* Service Email */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <Mail className="w-5 h-5 text-blue-600" />
          Service Email
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Service Email</label>
            <input
              type="email"
              value={form.service_email}
              onChange={(e) => setField("service_email", e.target.value)}
              placeholder="service@yourpractice.com"
              className={INPUT_CLASS}
            />
            <div className="mt-2">
              {/* Read-only: driven entirely by server `service_email_verified`. */}
              <VerifiedBadge verified={emailVerified} />
            </div>
          </div>
        </div>
      </div>

      {/* AI Assist */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <Sparkles className="w-5 h-5 text-blue-600" />
          AI Assist
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>AI Assist Enabled</label>
            <select
              value={form.ai_assist_enabled ? "yes" : "no"}
              onChange={(e) => setField("ai_assist_enabled", e.target.value === "yes")}
              className={INPUT_CLASS}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patient Communication URLs */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <Globe className="w-5 h-5 text-blue-600" />
          Patient Communication URLs
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={LABEL_CLASS}>Patient Communication URL</label>
            <input
              type="url"
              value={form.patient_comm_url}
              onChange={(e) => setField("patient_comm_url", e.target.value)}
              placeholder="https://comm.yourpractice.com"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Patient Portal URL</label>
            <input
              type="url"
              value={form.patient_portal_url}
              onChange={(e) => setField("patient_portal_url", e.target.value)}
              placeholder="https://portal.yourpractice.com"
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </div>

      {/* Dentiray */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <Camera className="w-5 h-5 text-blue-600" />
          Dentiray
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Image Storage Format</label>
            <select
              value={form.dentiray_storage_format}
              onChange={(e) => setField("dentiray_storage_format", e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Select Format</option>
              {DENTIRAY_STORAGE_FORMATS.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transfirst */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <CreditCard className="w-5 h-5 text-blue-600" />
          Transfirst
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Device</label>
            <input
              type="text"
              value={form.transfirst_device}
              onChange={(e) => setField("transfirst_device", e.target.value)}
              placeholder="e.g. Ingenico iCT250"
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </div>

      {/* DoseSpot */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <KeyRound className="w-5 h-5 text-blue-600" />
          DoseSpot
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>DoseSpot Clinic ID</label>
            <input
              type="text"
              value={form.dosespot_clinic_id}
              onChange={(e) => setField("dosespot_clinic_id", e.target.value)}
              placeholder="Clinic ID"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>DoseSpot Key</label>
            <input
              type="password"
              value={dosespotKey}
              onChange={(e) => {
                setDosespotKey(e.target.value);
                setDirty(true);
              }}
              placeholder={keyMasked ? "••••••••" : "Enter DoseSpot key"}
              className={INPUT_CLASS}
            />
            {keyMasked && !dosespotKey && (
              <p className="mt-1 text-xs text-slate-500 font-semibold">
                A key is stored ({keyMasked}). Enter a new value to replace it.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Payment Portal — Accepted Credit Cards */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">
          <CreditCard className="w-5 h-5 text-blue-600" />
          Payment Portal - Accepted Credit Cards
        </h3>
        {/* Checkboxes serialize to a single comma-separated `accepted_cards`
            string (e.g. "AMEX,MC,VISA,DISC"); see serializeAcceptedCards. */}
        <div className="grid grid-cols-4 gap-4">
          {CARD_OPTIONS.map(({ token, label }) => (
            <label
              key={token}
              className="flex items-center gap-2 cursor-pointer p-3 border-2 border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={form.accepted_cards[token]}
                onChange={(e) => toggleCard(token, e.target.checked)}
                className="w-5 h-5 text-blue-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Save Action */}
      <div className="flex justify-end pt-2 border-t-2 border-slate-100">
        <button
          onClick={() => void handleSave()}
          disabled={saving || !dirty}
          className={`${components.buttonPrimary} inline-flex items-center gap-2 ${
            saving || !dirty ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Integration"}
        </button>
      </div>
    </div>
  );
}
