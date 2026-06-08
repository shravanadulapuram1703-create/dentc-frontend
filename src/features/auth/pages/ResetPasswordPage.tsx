import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, Loader2, ShieldX, KeyRound } from "lucide-react";
import AuthShell from "../components/AuthShell";
import AuthErrorAlert from "../components/AuthErrorAlert";
import PasswordField from "../components/PasswordField";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import authExtrasService from "../services/authExtrasService";
import { mapAuthError } from "../utils/authErrors";
import { describePasswordProblem } from "../utils/passwordPolicy";

type Phase = "validating" | "valid" | "invalid" | "success";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [phase, setPhase] = useState<Phase>("validating");
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* Validate the token on mount. */
  useEffect(() => {
    let active = true;
    if (!token) {
      setPhase("invalid");
      return;
    }
    (async () => {
      try {
        const res = await authExtrasService.validateResetToken({ token });
        if (!active) return;
        if (res.valid) {
          setAccountEmail(res.email ?? null);
          setPhase("valid");
        } else {
          setPhase("invalid");
        }
      } catch {
        // Backend not available yet, or token rejected → treat as invalid.
        if (active) setPhase("invalid");
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const problem = describePasswordProblem(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }

    setSubmitting(true);
    try {
      await authExtrasService.resetPassword({ token, new_password: password });
      setPhase("success");
    } catch (err) {
      setError(mapAuthError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Validating ---------- */
  if (phase === "validating") {
    return (
      <AuthShell title="Reset Password" subtitle="Verifying your reset link…">
        <div className="flex flex-col items-center gap-3 py-6 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
          <p className="font-medium">Please wait…</p>
        </div>
      </AuthShell>
    );
  }

  /* ---------- Invalid / expired ---------- */
  if (phase === "invalid") {
    return (
      <AuthShell title="Reset Password" subtitle="This link is no longer valid">
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-50 border-2 border-red-200">
              <ShieldX className="w-10 h-10 text-red-500" strokeWidth={2.2} />
            </div>
          </div>
          <p className="text-slate-600 font-medium leading-relaxed">
            This password reset link is invalid or has expired. Request a new one
            and we&apos;ll email you a fresh link.
          </p>
          <button
            onClick={() => navigate("/forgot-password")}
            className="w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-[#3A6EA5] to-[#5A8EC5] text-white font-bold shadow-md hover:shadow-lg transition-all duration-200"
          >
            Request a New Link
          </button>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-3.5 px-6 rounded-lg bg-slate-100 text-slate-700 font-semibold border-2 border-slate-300 hover:bg-slate-200 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
            Back to Login
          </button>
        </div>
      </AuthShell>
    );
  }

  /* ---------- Success ---------- */
  if (phase === "success") {
    return (
      <AuthShell title="Password Updated" subtitle="You're all set">
        <div className="space-y-6 text-center" role="status" aria-live="polite">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-slate-600 font-medium leading-relaxed">
            Your password has been updated successfully. You can now sign in with
            your new password.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-[#3A6EA5] to-[#5A8EC5] text-white font-bold shadow-md hover:shadow-lg transition-all duration-200"
          >
            Return to Login
          </button>
        </div>
      </AuthShell>
    );
  }

  /* ---------- Valid → password form ---------- */
  return (
    <AuthShell
      title="Create New Password"
      subtitle={
        accountEmail ? `For ${accountEmail}` : "Choose a strong new password"
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <AuthErrorAlert message={error} />

        <PasswordField
          id="new-password"
          label="New Password"
          value={password}
          onChange={setPassword}
          placeholder="Create a new password"
          autoComplete="new-password"
          invalid={!!error}
        />

        <PasswordStrengthMeter password={password} />

        <PasswordField
          id="confirm-password"
          label="Confirm Password"
          value={confirm}
          onChange={setConfirm}
          placeholder="Re-enter your new password"
          autoComplete="new-password"
          invalid={!!error}
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-[#3A6EA5] to-[#5A8EC5] text-white font-bold text-base shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <KeyRound className="w-5 h-5" strokeWidth={2.5} />
          {submitting ? "Updating…" : "Update Password"}
        </button>
      </form>
    </AuthShell>
  );
}
