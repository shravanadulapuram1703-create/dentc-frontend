// Setup → Devices → Signature Pad (Topaz).
//
// Lets an office manager prove the whole chain — browser extension → native
// host → drivers → USB pad — works on THIS workstation without opening a
// patient chart. Nothing here writes to the backend; the test signature stays
// on the page.

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Loader2,
  RefreshCw,
  Usb,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import SignatureCapture from "./SignatureCapture";
import type { SignatureResult } from "./signatureModel";
import { useTopazStatus } from "./useTopazStatus";
import type { TopazAvailability, TopazState } from "./topaz/topazClient";

const TOPAZ_SDK_URL = "https://www.topazsystems.com/sdks/sigplusextlite.html";

const STATE_LABEL: Record<TopazState, { label: string; tone: "ok" | "warn" | "bad" }> = {
  ready: { label: "Ready to sign", tone: "ok" },
  no_device: { label: "Pad not detected", tone: "warn" },
  no_extension: { label: "Browser extension missing", tone: "bad" },
  not_installed: { label: "SigPlusExtLite not installed", tone: "bad" },
  no_drivers: { label: "SigPlus drivers missing", tone: "bad" },
  old_sigplus: { label: "Outdated SigPlus", tone: "warn" },
  unsupported: { label: "Unsupported platform", tone: "bad" },
  error: { label: "Error", tone: "bad" },
};

function browserName(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Microsoft Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua)) return "Google Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "Unknown";
}

function osName(): string {
  const ua = navigator.userAgent;
  if (/Windows NT 10/.test(ua)) return "Windows 10 / 11";
  if (/Windows/.test(ua)) return "Windows (older)";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad/.test(ua)) return "iOS";
  return "Unknown";
}

export default function SignaturePadDiagnosticsPage() {
  const topaz = useTopazStatus();
  const [test, setTest] = useState<SignatureResult | null>(null);
  const s = topaz.status;
  const meta = s ? STATE_LABEL[s.state] : null;

  const checks: Array<{ label: string; ok: boolean | null; detail: string }> = [
    {
      label: "Windows desktop browser",
      ok: s ? s.state !== "unsupported" : null,
      detail: `${osName()} · ${browserName()}`,
    },
    {
      label: "SigPlusExtLite browser extension",
      ok: s ? s.state !== "no_extension" && s.state !== "unsupported" : null,
      detail: s?.extension_version ? `v${s.extension_version}` : "Not detected in this browser",
    },
    {
      label: "SigPlusExtLite native host (Windows app)",
      ok: s ? !["no_extension", "not_installed", "unsupported", "error"].includes(s.state) : null,
      detail: s?.nmh_version ? `v${s.nmh_version}` : s?.state === "not_installed" ? "Not installed" : "—",
    },
    {
      label: "SigPlus drivers",
      ok: s ? !["no_extension", "not_installed", "no_drivers", "old_sigplus", "unsupported", "error"].includes(s.state) : null,
      detail: s?.state === "no_drivers" ? "Missing" : s?.state === "old_sigplus" ? "Outdated" : s?.state === "ready" || s?.state === "no_device" ? "Installed" : "—",
    },
    {
      label: "Signature pad connected (USB)",
      ok: s ? s.state === "ready" : null,
      detail:
        s?.state === "ready"
          ? `${s.device_model_label ?? "Topaz pad"}${s.device_serial != null ? ` · serial ${s.device_serial}` : ""}`
          : s?.state === "no_device"
            ? "Nothing plugged in"
            : "—",
    },
  ];

  const copyDiagnostics = async () => {
    const payload = {
      ...(s ?? {}),
      os: osName(),
      browser: browserName(),
      user_agent: navigator.userAgent,
      page_url: window.location.href,
      test_signature: test
        ? {
            device_source: test.device_source,
            point_count: test.point_count,
            stroke_count: test.stroke_count,
            sig_string_len: test.sig_string?.length ?? 0,
            image_len: test.signature_data.length,
          }
        : null,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast.success("Diagnostics copied.");
    } catch {
      toast.error("Could not copy to the clipboard.");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#1E293B] flex items-center gap-2">
            <Usb className="w-5 h-5 text-[#3A6EA5]" /> Signature Pad (Topaz)
          </h1>
          <p className="text-xs text-[#64748B]">
            Checks this workstation only. Every screen that captures a signature uses the pad when
            this page says <b>Ready to sign</b>, and falls back to on-screen signing otherwise.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void topaz.recheck()}
            disabled={topaz.checking}
            className="inline-flex items-center gap-1.5 rounded border-2 border-[#CBD5E1] bg-white px-3 py-1.5 text-sm font-semibold text-[#1F3A5F] hover:bg-[#F1F5F9] disabled:opacity-50"
          >
            {topaz.checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Re-check
          </button>
          <button
            type="button"
            onClick={copyDiagnostics}
            className="inline-flex items-center gap-1.5 rounded border-2 border-[#CBD5E1] bg-white px-3 py-1.5 text-sm font-semibold text-[#1F3A5F] hover:bg-[#F1F5F9]"
          >
            <Clipboard className="w-4 h-4" /> Copy diagnostics
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* status */}
        <section className="rounded-lg border-2 border-[#E2E8F0] bg-white">
          <header className="px-4 py-2 border-b-2 border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wide text-[#475569]">
            Status
          </header>
          <div className="p-4 space-y-3">
            <StatusBanner status={s} checking={topaz.checking} label={meta?.label ?? ""} tone={meta?.tone ?? "warn"} />
            <ul className="divide-y divide-[#F1F5F9]">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2 py-2">
                  {c.ok === null ? (
                    <Loader2 className="w-4 h-4 mt-0.5 text-[#94A3B8] animate-spin" />
                  ) : c.ok ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-[#16A34A]" />
                  ) : (
                    <XCircle className="w-4 h-4 mt-0.5 text-[#DC2626]" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#1E293B]">{c.label}</div>
                    <div className="text-xs text-[#64748B] break-words">{c.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
            {s?.checked_at && (
              <p className="text-[11px] text-[#94A3B8]">
                Last checked {new Date(s.checked_at).toLocaleTimeString()}
                {s.status_code != null ? ` · GetDeviceStatus = ${s.status_code}` : ""}
              </p>
            )}
          </div>
        </section>

        {/* install */}
        <section className="rounded-lg border-2 border-[#E2E8F0] bg-white">
          <header className="px-4 py-2 border-b-2 border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wide text-[#475569]">
            Setting up a workstation
          </header>
          <ol className="p-4 space-y-2 text-sm text-[#334155] list-decimal list-inside">
            <li>
              Use a Windows 10/11 PC with Chrome, Edge or Firefox. Topaz pads do not work from iPads or
              Macs with this integration.
            </li>
            <li>
              Download and run the <b>SigPlusExtLite</b> installer from Topaz (run as Administrator). It
              installs the SigPlus drivers and the native host.{" "}
              <a
                href={TOPAZ_SDK_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#3A6EA5] hover:underline"
              >
                topazsystems.com <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              Install the <b>Topaz SigPlusExtLite</b> extension for the browser used for Reckon Dental (the
              installer offers this, or add it from the browser&rsquo;s extension store).
            </li>
            <li>Plug the Topaz pad into USB, then fully restart the browser.</li>
            <li>
              Return here and press <b>Re-check</b>. Then sign in the test box below — the test is not
              saved anywhere.
            </li>
          </ol>
        </section>
      </div>

      {/* test */}
      <section className="rounded-lg border-2 border-[#E2E8F0] bg-white">
        <header className="px-4 py-2 border-b-2 border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wide text-[#475569]">
          Test signature
        </header>
        <div className="p-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <SignatureCapture
            value={test}
            onChange={setTest}
            always_open
            height={180}
            hint="Captured — this test is not saved."
          />
          <dl className="text-sm rounded border border-[#E2E8F0] bg-[#F8FAFC] p-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-[#64748B]">Method</dt>
            <dd className="font-semibold">{test ? (test.device_source === "topaz" ? "Topaz pad" : "On screen") : "—"}</dd>
            <dt className="text-[#64748B]">Device</dt>
            <dd className="font-semibold">{test?.device_model ?? "—"}</dd>
            <dt className="text-[#64748B]">Serial</dt>
            <dd className="font-semibold">{test?.device_serial ?? "—"}</dd>
            <dt className="text-[#64748B]">Points</dt>
            <dd className="font-semibold">{test?.point_count ?? "—"}</dd>
            <dt className="text-[#64748B]">Strokes</dt>
            <dd className="font-semibold">{test?.stroke_count ?? "—"}</dd>
            <dt className="text-[#64748B]">SigString</dt>
            <dd className="font-semibold">{test?.sig_string ? `${test.sig_string.length} chars` : "—"}</dd>
            <dt className="text-[#64748B]">Image</dt>
            <dd className="font-semibold">{test ? `${Math.round(test.signature_data.length / 1024)} KB` : "—"}</dd>
          </dl>
        </div>
      </section>
    </div>
  );
}

function StatusBanner({
  status,
  checking,
  label,
  tone,
}: {
  status: TopazAvailability | null;
  checking: boolean;
  label: string;
  tone: "ok" | "warn" | "bad";
}) {
  const cls =
    tone === "ok"
      ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]"
      : tone === "warn"
        ? "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]"
        : "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]";
  return (
    <div className={`rounded border-2 px-3 py-2 flex items-start gap-2 ${cls}`}>
      {checking || !status ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : tone === "ok" ? (
        <CheckCircle2 className="w-5 h-5" />
      ) : (
        <AlertTriangle className="w-5 h-5" />
      )}
      <div>
        <div className="text-sm font-bold">{checking || !status ? "Checking…" : label}</div>
        {status && <div className="text-xs">{status.message}</div>}
      </div>
    </div>
  );
}
