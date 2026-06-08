import { AlertCircle, CheckCircle2 } from "lucide-react";

interface AuthErrorAlertProps {
  /** Message to announce. Nothing renders when empty/null. */
  message?: string | null;
  /** Visual + semantic tone. Defaults to "error". */
  tone?: "error" | "success" | "info";
}

const TONES = {
  error: {
    wrap: "bg-red-50 border-red-200",
    text: "text-red-700",
    Icon: AlertCircle,
    iconClass: "text-red-500",
    role: "alert" as const,
  },
  success: {
    wrap: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    Icon: CheckCircle2,
    iconClass: "text-emerald-500",
    role: "status" as const,
  },
  info: {
    wrap: "bg-cyan-50 border-cyan-200",
    text: "text-slate-700",
    Icon: AlertCircle,
    iconClass: "text-cyan-500",
    role: "status" as const,
  },
};

/**
 * Accessible inline alert banner for auth screens. Uses role="alert" +
 * aria-live so errors are announced to screen readers the moment they appear.
 */
export default function AuthErrorAlert({
  message,
  tone = "error",
}: AuthErrorAlertProps) {
  if (!message) return null;
  const t = TONES[tone];
  const { Icon } = t;

  return (
    <div
      role={t.role}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`flex items-start gap-2.5 p-4 rounded-lg border-2 ${t.wrap}`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${t.iconClass}`} strokeWidth={2.2} />
      <p className={`text-sm font-semibold ${t.text}`}>{message}</p>
    </div>
  );
}
