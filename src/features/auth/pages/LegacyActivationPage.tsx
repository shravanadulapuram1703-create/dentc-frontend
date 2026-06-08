import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  KeyRound,
  Mail,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import AuthShell from "../components/AuthShell";
import AuthErrorAlert from "../components/AuthErrorAlert";
import PasswordField from "../components/PasswordField";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import authExtrasService from "../services/authExtrasService";
import { mapAuthError } from "../utils/authErrors";
import { describePasswordProblem } from "../utils/passwordPolicy";
import type { LegacyVerifyResponse } from "../types";

type Step = "verify" | "verification" | "create" | "success" | "already_activated";

const STEP_LABELS = ["Verify", "Confirm", "Password", "Done"];
const STEP_INDEX: Record<Step, number> = {
  verify: 0,
  verification: 1,
  create: 2,
  success: 3,
  already_activated: 0,
};

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center justify-between mb-6" aria-hidden="true">
      {STEP_LABELS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex-1 flex items-center">
            <div className="flex flex-col items-center">
              <span
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border-2 ${
                  active
                    ? "bg-[#3A6EA5] border-[#3A6EA5] text-white"
                    : done
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "bg-white border-slate-300 text-slate-400"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`mt-1 text-[11px] font-semibold ${
                  active ? "text-[#1F3A5F]" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-1 ${
                  done ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function LegacyActivationPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("verify");
  const [identifier, setIdentifier] = useState("");
  const [verification, setVerification] = useState<LegacyVerifyResponse | null>(
    null,
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  /* ---------- Step 1: verify identity ---------- */
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim()) {
      setError("Please enter your username or email.");
      return;
    }

    setBusy(true);
    try {
      const res = await authExtrasService.legacyVerify({
        username_or_email: identifier.trim(),
      });

      // Rule 2: one-time only — already-activated accounts cannot re-activate.
      if (res.legacy_activation_completed) {
        setStep("already_activated");
        return;
      }
      if (!res.eligible) {
        setError(
          "We couldn't find a legacy account to activate for that username or email.",
        );
        return;
      }

      setVerification(res);
      setStep("verification");
    } catch (err) {
      setError(mapAuthError(err).message);
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Step 3: create password ---------- */
  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const problem = describePasswordProblem(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    try {
      await authExtrasService.legacyCreatePassword({
        username_or_email: identifier.trim(),
        new_password: password,
        activation_token: verification?.activation_token ?? null,
      });
      setStep("success");
    } catch (err) {
      setError(mapAuthError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const backToLogin = (
    <button
      onClick={() => navigate("/login")}
      className="w-full py-3.5 px-6 rounded-lg bg-slate-100 text-slate-700 font-semibold border-2 border-slate-300 hover:bg-slate-200 transition-all duration-200 flex items-center justify-center gap-2"
    >
      <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
      Back to Login
    </button>
  );

  /* ---------- Already activated (Rule 2) ---------- */
  if (step === "already_activated") {
    return (
      <AuthShell title="Activate Legacy Account" subtitle="Already activated">
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200">
              <ShieldCheck className="w-10 h-10 text-amber-500" strokeWidth={2.2} />
            </div>
          </div>
          <p className="text-slate-600 font-medium leading-relaxed">
            This account has already been activated. Please use{" "}
            <strong>Forgot Password</strong> if you need to reset your password.
          </p>
          <button
            onClick={() => navigate("/forgot-password")}
            className="w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-[#3A6EA5] to-[#5A8EC5] text-white font-bold shadow-md hover:shadow-lg transition-all duration-200"
          >
            Go to Forgot Password
          </button>
          {backToLogin}
        </div>
      </AuthShell>
    );
  }

  /* ---------- Success ---------- */
  if (step === "success") {
    return (
      <AuthShell title="Account Activated" subtitle="Welcome to DentC">
        <Stepper current={STEP_INDEX.success} />
        <div className="space-y-6 text-center" role="status" aria-live="polite">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-slate-600 font-medium leading-relaxed">
            Your account has been activated successfully. You can now sign in with
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

  /* ---------- Step 2: verification method ---------- */
  if (step === "verification" && verification) {
    const method = verification.verification_method;
    return (
      <AuthShell
        title="Activate Legacy Account"
        subtitle="Confirm it's really you"
      >
        <Stepper current={STEP_INDEX.verification} />
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#E8EFF7] border-2 border-[#3A6EA5]/30">
              <Mail className="w-8 h-8 text-[#3A6EA5]" strokeWidth={2.2} />
            </div>
          </div>

          {method === "otp" ? (
            <p className="text-center text-slate-600 font-medium leading-relaxed">
              We sent a one-time code to{" "}
              <strong>{verification.masked_email ?? "your email"}</strong>. Enter
              it on the next screen — for now, continue to create your password.
            </p>
          ) : method === "magic_link" ? (
            <p className="text-center text-slate-600 font-medium leading-relaxed">
              We emailed a secure link to{" "}
              <strong>{verification.masked_email ?? "your email"}</strong>. Open it
              to continue, or proceed to set your password.
            </p>
          ) : (
            <p className="text-center text-slate-600 font-medium leading-relaxed">
              We&apos;ve verified your account
              {verification.masked_email ? (
                <>
                  {" "}
                  for <strong>{verification.masked_email}</strong>
                </>
              ) : null}
              . Continue to create your new password.
            </p>
          )}

          <button
            onClick={() => {
              setError("");
              setStep("create");
            }}
            className="w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-[#3A6EA5] to-[#5A8EC5] text-white font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
          {backToLogin}
        </div>
      </AuthShell>
    );
  }

  /* ---------- Step 3: create password ---------- */
  if (step === "create") {
    return (
      <AuthShell
        title="Activate Legacy Account"
        subtitle="Create your new password"
      >
        <Stepper current={STEP_INDEX.create} />
        <form onSubmit={handleCreatePassword} className="space-y-6" noValidate>
          <AuthErrorAlert message={error} />

          <PasswordField
            id="legacy-password"
            label="New Password"
            value={password}
            onChange={setPassword}
            placeholder="Create a password"
            autoComplete="new-password"
            invalid={!!error}
          />
          <PasswordStrengthMeter password={password} />
          <PasswordField
            id="legacy-confirm"
            label="Confirm Password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            invalid={!!error}
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-[#3A6EA5] to-[#5A8EC5] text-white font-bold text-base shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <KeyRound className="w-5 h-5" strokeWidth={2.5} />
            {busy ? "Activating…" : "Activate Account"}
          </button>
        </form>
      </AuthShell>
    );
  }

  /* ---------- Step 1: verify identity ---------- */
  return (
    <AuthShell
      title="Activate Legacy Account"
      subtitle="Verify your identity to get started"
    >
      <Stepper current={STEP_INDEX.verify} />
      <form onSubmit={handleVerify} className="space-y-6" noValidate>
        <AuthErrorAlert message={error} />

        <div className="p-4 rounded-lg bg-cyan-50 border-2 border-cyan-200">
          <p className="text-sm text-slate-700 font-medium leading-relaxed">
            If you used the previous dental system, activate your account once to
            set a new password. Afterwards, sign in normally.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="legacy-identifier"
            className="block text-sm font-semibold text-[#1F3A5F]"
          >
            Username or Email Address
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-slate-400" strokeWidth={2} />
            </div>
            <input
              id="legacy-identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter username or email"
              autoComplete="username"
              required
              className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-[#E2E8F0] rounded-lg text-[#1E293B] placeholder-slate-400 focus:outline-none focus:border-[#3A6EA5] focus:ring-4 focus:ring-[#3A6EA5]/20 transition-all duration-200 font-medium"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-[#3A6EA5] to-[#5A8EC5] text-white font-bold text-base shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? "Verifying…" : "Verify Account"}
          {!busy && <ArrowRight className="w-5 h-5" strokeWidth={2.5} />}
        </button>

        {backToLogin}
      </form>
    </AuthShell>
  );
}
