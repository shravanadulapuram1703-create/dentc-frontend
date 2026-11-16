import { CheckCircle2, XCircle } from "lucide-react";
import {
  PASSWORD_RULES,
  passwordsMatch,
  validatePassword,
} from "../utils/passwordPolicy";

interface PasswordStrengthMeterProps {
  password: string;
  /**
   * Pass the confirm-field value to add a live "Passwords match" row to the
   * checklist. Omit on screens without a confirm field.
   */
  confirm?: string;
  /** Show the per-rule checklist below the bar. Defaults to true. */
  showChecklist?: boolean;
  /** Tighter spacing / smaller text for dense admin forms. */
  compact?: boolean;
}

const STRENGTH = [
  { label: "Very weak", bar: "bg-red-500", text: "text-red-600" },
  { label: "Weak", bar: "bg-red-500", text: "text-red-600" },
  { label: "Fair", bar: "bg-amber-500", text: "text-amber-600" },
  { label: "Good", bar: "bg-lime-500", text: "text-lime-600" },
  { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600" },
  { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600" },
];

/**
 * Strength bar + live password-complexity checklist driven by the shared
 * password policy. The checklist is ALWAYS visible (even before typing) so the
 * user sees every rule up front: unmet rules are red, met rules turn green as
 * they type. Purely presentational — gating is done by `validatePassword` /
 * `describePasswordProblem` in the caller.
 */
export default function PasswordStrengthMeter({
  password,
  confirm,
  showChecklist = true,
  compact = false,
}: PasswordStrengthMeterProps) {
  const { score } = validatePassword(password);
  const total = PASSWORD_RULES.length;
  const level = STRENGTH[Math.min(score, STRENGTH.length - 1)] ?? {
    label: "Very weak",
    bar: "bg-red-500",
    text: "text-red-600",
  };

  const items = PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    ok: rule.test(password),
  }));
  if (confirm !== undefined) {
    items.push({
      id: "match",
      label: "Passwords match",
      ok: passwordsMatch(password, confirm),
    });
  }

  const iconCls = compact ? "w-3.5 h-3.5 shrink-0" : "w-4 h-4 shrink-0";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"} aria-live="polite">
      {password.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < score ? level.bar : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          <p className={`text-xs font-semibold ${level.text}`}>
            Password strength: {level.label}
          </p>
        </div>
      )}

      {showChecklist && (
        <ul
          className={compact ? "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1" : "space-y-1"}
          aria-label="Password requirements"
        >
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
                item.ok ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {item.ok ? (
                <CheckCircle2 className={iconCls} strokeWidth={2.5} aria-hidden="true" />
              ) : (
                <XCircle className={iconCls} strokeWidth={2.5} aria-hidden="true" />
              )}
              <span>{item.label}</span>
              <span className="sr-only">{item.ok ? "(met)" : "(not met)"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
