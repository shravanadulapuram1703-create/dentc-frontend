// Patient Medical History (legacy Denticon "Patient Medical History") —
// /patient/:patientId/medical-history.
//
// One screen, four tabs: Medical Alerts · Dental Questionnaire · Medical
// Questionnaire · Signature, plus the legacy "***Copy Medical History***"
// picker that pulls another patient's answers across.
//
// Before this existed these sections were reachable only while *registering* a
// patient, so anything skipped at intake could never be filled in again. The
// Add-Patient wizard no longer owns them in edit mode — this screen does.
//
// Backend gaps: docs/medical-history/medical_history_backend_devreport.md

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Ban, HeartPulse, Loader2, PenLine, Save } from "lucide-react";
import { getPatientOverview, getPatient } from "@/api/generated/endpoints/patients/patients";
import type { PatientRead } from "@/api/generated/model";
import {
  alertLabels,
  allAlertCodes,
  emptyMedicalHistoryForm,
  loadMedicalHistoryCatalogs,
  questionLabels,
  LEGACY_CATALOGS,
  type MedicalHistoryCatalogs,
  type MedicalHistoryForm,
} from "./medicalHistoryModel";
import {
  applyCopy,
  emptyBaseline,
  loadHistoryForCopy,
  loadMedicalHistory,
  loadSignatures,
  saveMedicalHistory,
  saveSignature,
  COPY_SCOPE_LABELS,
  type CopyScope,
  type MedicalHistoryBaseline,
  type SignaturePair,
} from "./medicalHistoryService";
import MedicalAlertsTab from "./tabs/MedicalAlertsTab";
import QuestionnaireTab from "./tabs/QuestionnaireTab";
import SignatureTab from "./tabs/SignatureTab";
import CopyFromPatientDialog from "./CopyFromPatientDialog";

interface OutletContext {
  patient: { id: string; name: string; officeId?: string; chartNo?: string; dob?: string };
}

type TabId = "alerts" | "dental" | "medical" | "signature";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "alerts", label: "Medical Alerts" },
  { id: "dental", label: "Dental Questionnaire" },
  { id: "medical", label: "Medical Questionnaire" },
  { id: "signature", label: "Signature" },
];

const COPY_SCOPES: CopyScope[] = ["all", "alerts", "dental", "medical"];

/** Legacy header numbers. Everything is optional — the strip degrades to dashes. */
interface HeaderData {
  patient: PatientRead | null;
  next_visit: string;
  next_recall: string;
  last_visit: string;
  first_visit: string;
  responsible: string;
  balance: string;
  est_ins: string;
  est_pat: string;
}

const money = (v: unknown): string => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n.toFixed(2) : "";
};
/** "2026-08-23" or an ISO timestamp → "08/23/2026". Never `new Date` on a bare
 *  date — that parses as UTC and can shift the day. */
const fmtDate = (v: unknown): string => {
  const raw = v == null ? "" : String(v);
  if (!raw) return "";
  const [y, m, d] = raw.slice(0, 10).split("-");
  return y && m && d ? `${m}/${d}/${y}` : "";
};
const ageFrom = (dob?: string | null): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dob ?? "").slice(0, 10));
  if (!m) return "";
  const [, y, mo, d] = m;
  const today = new Date();
  let a = today.getFullYear() - Number(y);
  const md = today.getMonth() + 1 - Number(mo);
  if (md < 0 || (md === 0 && today.getDate() < Number(d))) a--;
  return a >= 0 ? String(a) : "";
};

export default function MedicalHistoryPage() {
  const { patient } = useOutletContext<OutletContext>();
  const patientId = Number(patient.id);
  const validId = Number.isFinite(patientId) && patientId > 0;

  const [tab, setTab] = useState<TabId>("alerts");
  const [catalogs, setCatalogs] = useState<MedicalHistoryCatalogs>(LEGACY_CATALOGS);
  const [form, setForm] = useState<MedicalHistoryForm>(emptyMedicalHistoryForm);
  const [baseline, setBaseline] = useState<MedicalHistoryBaseline>(emptyBaseline);
  const [signatures, setSignatures] = useState<SignaturePair>({ patient: null, dentist: null });
  const [staged, setStaged] = useState<{ patient: string | null; dentist: string | null }>({
    patient: null,
    dentist: null,
  });
  const [header, setHeader] = useState<HeaderData | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [copyScope, setCopyScope] = useState<CopyScope | null>(null);
  const [copying, setCopying] = useState(false);
  const [loadingMySig, setLoadingMySig] = useState(false);

  // Guard re-entry with a ref, never with state this effect also sets — an
  // effect that lists its own output in its deps cancels its in-flight run.
  const loadedRef = useRef<number | null>(null);

  const updateForm = useCallback((next: MedicalHistoryForm) => {
    setForm(next);
    setDirty(true);
  }, []);

  // ---- Load ---------------------------------------------------------------
  useEffect(() => {
    if (!validId || loadedRef.current === patientId) return;
    loadedRef.current = patientId;
    let cancelled = false;
    let settled = false;

    (async () => {
      setLoading(true);
      try {
        const [snapshot, resolved] = await Promise.all([
          loadMedicalHistory(patientId),
          loadMedicalHistoryCatalogs().catch(() => LEGACY_CATALOGS),
        ]);
        settled = true;
        if (cancelled) return;
        setForm(snapshot.form);
        setBaseline(snapshot.baseline);
        setSignatures(snapshot.signatures);
        setCatalogs(resolved);
        setWarnings(snapshot.warnings);
        setDirty(false);
      } catch (err) {
        settled = true;
        loadedRef.current = null; // let a failed load be retried
        if (!cancelled) {
          setWarnings([(err as Error)?.message || "This patient's medical history could not be loaded."]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      // StrictMode mounts, tears down and re-runs this effect before the fetch
      // above resolves. Without releasing the claim here the re-run would be
      // turned away by the guard while THIS run discards its own results as
      // cancelled — leaving the screen loading forever.
      if (!settled) loadedRef.current = null;
    };
  }, [patientId, validId]);

  // Header strip. One aggregate call rather than the Overview's fan-out; it is
  // decorative, so a failure quietly falls back to the patient record alone.
  useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    (async () => {
      try {
        const o = await getPatientOverview(patientId);
        if (cancelled) return;
        const visit = (o.visit ?? {}) as Record<string, unknown>;
        const rp = (o.responsible_party ?? {}) as Record<string, unknown>;
        const recalls = (o.recalls ?? []) as Array<Record<string, unknown>>;
        const nextRecall = recalls
          .map((r) => String(r.due_date ?? "").slice(0, 10))
          .filter(Boolean)
          .sort()[0];
        setHeader({
          patient: o.patient,
          next_visit: fmtDate(visit.next_visit ?? visit.next),
          next_recall: fmtDate(nextRecall),
          last_visit: fmtDate(visit.last_visit ?? o.patient?.last_visit),
          first_visit: fmtDate(visit.first_visit ?? o.patient?.first_visit),
          responsible:
            [rp.last_name, rp.first_name].filter(Boolean).join(", ") ||
            `${o.patient?.last_name ?? ""}, ${o.patient?.first_name ?? ""}`.replace(/^, |, $/g, ""),
          balance: money(o.balance?.account_balance ?? o.balance?.balance),
          est_ins: money(o.balance?.estimated_insurance),
          est_pat: money(o.balance?.estimated_patient),
        });
      } catch {
        try {
          const p = await getPatient(patientId);
          if (cancelled) return;
          setHeader({
            patient: p,
            next_visit: "",
            next_recall: "",
            last_visit: fmtDate(p.last_visit),
            first_visit: fmtDate(p.first_visit),
            responsible: `${p.last_name ?? ""}, ${p.first_name ?? ""}`.replace(/^, |, $/g, ""),
            balance: "",
            est_ins: "",
            est_pat: "",
          });
        } catch {
          /* the shell's own identity bar still names the patient */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, validId]);

  const labels = useMemo(
    () => ({
      alerts: alertLabels(catalogs.alerts),
      dental: questionLabels(catalogs.dental),
      medical: questionLabels(catalogs.medical),
    }),
    [catalogs],
  );

  // ---- Save ---------------------------------------------------------------
  const persist = useCallback(async (): Promise<boolean> => {
    if (!validId) return false;
    setSaving(true);
    try {
      const result = await saveMedicalHistory({
        patient_id: patientId,
        baseline,
        form,
        alert_labels: labels.alerts,
        question_labels: { dental: labels.dental, medical: labels.medical },
      });
      // Adopt the post-save ids, or a second save would duplicate every row the
      // first one created.
      setBaseline(result.baseline);

      const sigWarnings: string[] = [];
      for (const which of ["patient", "dentist"] as const) {
        const data = staged[which];
        if (!data) continue;
        try {
          await saveSignature(patientId, data, which === "dentist");
        } catch {
          sigWarnings.push(`The ${which} signature could not be saved.`);
        }
      }
      if (staged.patient || staged.dentist) {
        try {
          setSignatures(await loadSignatures(patientId));
          setStaged({ patient: null, dentist: null });
        } catch {
          /* keep what is on screen */
        }
      }

      const all = [...result.warnings, ...sigWarnings];
      setWarnings(all);
      setDirty(false);
      if (all.length > 0) toast.warning(`Saved with ${all.length} problem(s).`);
      else toast.success("Medical history saved.");
      return true;
    } catch (err) {
      toast.error((err as Error)?.message || "Could not save the medical history.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [validId, patientId, baseline, form, labels, staged]);

  /** Legacy "SIGN" — commit what is on screen, then go collect the signature. */
  const handleSign = async () => {
    if (await persist()) setTab("signature");
  };

  /** Legacy "NO TO ALL ALERTS" — set every unanswered row to No, never override a Yes. */
  const noToAllAlerts = () => {
    const next = { ...form.alerts.responses };
    for (const code of allAlertCodes(catalogs.alerts)) {
      if (next[code] !== "yes") next[code] = "no";
    }
    updateForm({ ...form, alerts: { ...form.alerts, responses: next } });
  };

  const handleCopy = async (sourceId: number, sourceLabel: string) => {
    if (!copyScope) return;
    setCopying(true);
    try {
      const incoming = await loadHistoryForCopy(sourceId);
      updateForm(applyCopy(form, incoming, copyScope));
      setCopyScope(null);
      toast.success(`Copied from ${sourceLabel}. Review it, then press Save.`);
    } catch (err) {
      toast.error((err as Error)?.message || "Could not read that patient's history.");
    } finally {
      setCopying(false);
    }
  };

  const handleLoadMySignature = async () => {
    setLoadingMySig(true);
    try {
      const pair = await loadSignatures(patientId);
      const data = pair.dentist?.signature_data;
      if (!data) {
        toast.info("No signature on file for this patient yet — use the Sign pad.");
        return;
      }
      setStaged((s) => ({ ...s, dentist: data }));
      setDirty(true);
    } catch (err) {
      toast.error((err as Error)?.message || "Could not load a stored signature.");
    } finally {
      setLoadingMySig(false);
    }
  };

  if (!validId) {
    return (
      <div className="p-6 text-sm text-red-600">
        This patient has no backend id, so their medical history cannot be loaded.
      </div>
    );
  }

  const p = header?.patient;
  const unseeded = !catalogs.source.alerts || !catalogs.source.dental || !catalogs.source.medical;

  return (
    // Extra bottom padding keeps the footer's Save clear of the app's floating
    // help/chat button, which is fixed to the bottom-right corner.
    <div className="p-4 pb-24">
      <div className="bg-white border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
        {/* ---- Legacy title + record ids ---- */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white px-4 py-2 flex items-center justify-between">
          {/* `text-white` must sit on the <h1> itself: globals.css sets a dark
              `color` on every heading in @layer base, which beats a colour
              inherited from the parent. */}
          <h1 className="font-bold text-sm uppercase tracking-wide flex items-center gap-2 text-white">
            <HeartPulse className="w-4 h-4" />
            Patient Medical History
          </h1>
          <span className="text-xs font-semibold">
            PGID: {patientId} / OID: {p?.home_office_id ?? patient.officeId ?? "—"}
          </span>
        </div>

        {/* ---- Legacy header strip ---- */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-1 px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs">
          <div>
            <div className="font-bold text-sm text-[#1E293B]">
              {`${p?.last_name ?? ""}, ${p?.first_name ?? ""}`.replace(/^, |, $/g, "") ||
                patient.name}
            </div>
            <HeaderLine label="" value={`${ageFrom(p?.dob)}${p?.gender ? `/${p.gender}` : ""}`} />
            <HeaderLine label="DOB" value={fmtDate(p?.dob ?? patient.dob)} />
            <HeaderLine label="ID" value={p?.chart_no ?? patient.chartNo ?? ""} />
          </div>
          <div>
            <HeaderLine label="(C)" value={p?.cell_phone ?? ""} />
            <HeaderLine label="(H)" value={p?.phone ?? ""} />
            <HeaderLine label="(W)" value={p?.work_phone ?? ""} />
          </div>
          <div>
            <HeaderLine label="Next Visit" value={header?.next_visit ?? ""} />
            <HeaderLine label="Next Recall" value={header?.next_recall ?? ""} />
            <HeaderLine label="Last Visit" value={header?.last_visit ?? ""} />
            <HeaderLine label="First Visit" value={header?.first_visit ?? ""} />
          </div>
          <div>
            <HeaderLine label="Responsible" value={header?.responsible ?? ""} />
            <HeaderLine label="Balance" value={header?.balance ?? ""} />
            <HeaderLine label="Est Ins" value={header?.est_ins ?? ""} />
            <HeaderLine label="Est Pat" value={header?.est_pat ?? ""} />
          </div>
          <div>
            <HeaderLine label="Home Office" value={String(p?.home_office_id ?? "")} />
            <HeaderLine label="Type" value={p?.patient_type ?? ""} />
          </div>
        </div>

        {/* ---- Tabs + copy picker ---- */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-2 border-b border-[#E2E8F0]">
          <div className="flex flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide border-b-2 -mb-px transition-colors ${
                  tab === t.id
                    ? "border-[#1D4ED8] text-[#1D4ED8]"
                    : "border-transparent text-[#64748B] hover:text-[#1F3A5F]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select
            value=""
            disabled={loading || saving}
            onChange={(e) => {
              const scope = e.target.value as CopyScope;
              if (scope) setCopyScope(scope);
              e.target.value = "";
            }}
            className="mb-2 min-w-[280px] px-3 py-1.5 border border-[#CBD5E1] rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] disabled:opacity-60"
          >
            <option value="">***Copy Medical History***</option>
            {COPY_SCOPES.map((scope) => (
              <option key={scope} value={scope}>
                {COPY_SCOPE_LABELS[scope]}
              </option>
            ))}
          </select>
        </div>

        {/* ---- Banners ---- */}
        {loading && (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-[#1F3A5F]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading this patient&rsquo;s medical history…
          </div>
        )}
        {warnings.length > 0 && (
          <div className="mx-4 mt-3 rounded border-2 border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            <ul className="list-disc pl-5 space-y-0.5">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        {!loading && unseeded && tab !== "signature" && (
          <div className="mx-4 mt-3 rounded border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2 text-xs text-[#1E40AF]">
            The tenant&rsquo;s alert / question catalogs are not seeded, so the full legacy list is
            shown (gap MH-1). Answers still persist normally.
          </div>
        )}

        {/* ---- Tab body ---- */}
        <div className={loading ? "opacity-50 pointer-events-none" : ""}>
          {tab === "alerts" && (
            <MedicalAlertsTab
              groups={catalogs.alerts}
              value={form.alerts}
              onChange={(alerts) => updateForm({ ...form, alerts })}
            />
          )}
          {tab === "dental" && (
            <QuestionnaireTab
              groups={catalogs.dental}
              answers={form.dental}
              onChange={(dental) => updateForm({ ...form, dental })}
            />
          )}
          {tab === "medical" && (
            <QuestionnaireTab
              groups={catalogs.medical}
              answers={form.medical}
              onChange={(medical) => updateForm({ ...form, medical })}
            />
          )}
          {tab === "signature" && (
            <SignatureTab
              signatures={signatures}
              staged={staged}
              loadingMySignature={loadingMySig}
              onLoadMySignature={handleLoadMySignature}
              onStage={(which, data) => {
                setStaged((s) => ({ ...s, [which]: data }));
                setDirty(true);
              }}
            />
          )}
        </div>

        {/* ---- Footer ---- */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t-2 border-[#E2E8F0] bg-[#F1F5F9]">
          <span className="text-xs text-[#64748B]">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </span>
          <div className="flex items-center gap-2">
            {tab === "alerts" && (
              <button
                type="button"
                onClick={noToAllAlerts}
                disabled={loading || saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#1D4ED8] text-white text-sm font-semibold hover:bg-[#1E40AF] disabled:opacity-60"
              >
                <Ban className="w-4 h-4" />
                NO TO ALL ALERTS
              </button>
            )}
            {tab !== "signature" && (
              <button
                type="button"
                onClick={handleSign}
                disabled={loading || saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#1D4ED8] text-white text-sm font-semibold hover:bg-[#1E40AF] disabled:opacity-60"
              >
                <PenLine className="w-4 h-4" />
                SIGN
              </button>
            )}
            <button
              type="button"
              onClick={persist}
              disabled={loading || saving}
              className={`flex items-center gap-1.5 px-5 py-2 rounded text-sm font-semibold ${
                loading || saving
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-[#2FB9A7] text-white hover:bg-[#26a396]"
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : "SAVE"}
            </button>
          </div>
        </div>
      </div>

      {copyScope && (
        <CopyFromPatientDialog
          scope={copyScope}
          currentPatientId={patientId}
          busy={copying}
          onCancel={() => setCopyScope(null)}
          onConfirm={handleCopy}
        />
      )}
    </div>
  );
}

function HeaderLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 leading-5">
      {label && <span className="text-[#64748B] min-w-[74px]">{label}</span>}
      <span className="font-semibold text-[#1E293B]">{value || "—"}</span>
    </div>
  );
}
