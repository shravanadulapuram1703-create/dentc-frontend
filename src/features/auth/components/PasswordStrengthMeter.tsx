import { Check, X } from "lucide-react";
import {
  PASSWORD_RULES,
  validatePassword,
} from "../utils/passwordPolicy";

interface PasswordStrengthMeterProps {
  password: string;
  /** Show the per-rule checklist below the bar. Defaults to true. */
  showChecklist?: boolean;
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
 * Visual strength bar + rule checklist driven by the shared password policy.
 * Purely presentational — gating is done by `validatePassword` in the caller.
 */
export default function PasswordStrengthMeter({
  password,
  showChecklist = true,
}: PasswordStrengthMeterProps) {
  const { score } = validatePassword(password);
  const total = PASSWORD_RULES.length;
  const level =
    STRENGTH[Math.min(score, STRENGTH.length - 1)] ?? STRENGTH[0] ?? {
      label: "Very weak",
      bar: "bg-red-500",
      text: "text-red-600",
    };

  if (password.length === 0) return null;

  return (
    <div className="space-y-3" aria-live="polite">
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

      {showChecklist && (
        <ul className="space-y-1">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(password);
            return (
              <li
                key={rule.id}
                className={`flex items-center gap-2 text-xs font-medium ${
                  ok ? "text-emerald-600" : "text-slate-500"
                }`}
              >
                {ok ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                ) : (
                  <X className="w-3.5 h-3.5" strokeWidth={3} />
                )}
                {rule.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
