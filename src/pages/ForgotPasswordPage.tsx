import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, Send, CheckCircle } from "lucide-react";
import AuthShell from "../features/auth/components/AuthShell";
import AuthErrorAlert from "../features/auth/components/AuthErrorAlert";
import authExtrasService from "../features/auth/services/authExtrasService";
import { mapAuthError } from "../features/auth/utils/authErrors";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await authExtrasService.forgotPassword({ email: email.trim() });
      // Neutral success regardless of whether the account exists.
      setSubmitted(true);
    } catch (err) {
      const mapped = mapAuthError(err);
      // Avoid account enumeration: a 404 for an unknown email still shows the
      // neutral success screen. Only surface real infrastructure problems.
      if (mapped.kind === "network") {
        setError(mapped.message);
      } else {
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset Password"
      subtitle={
        submitted
          ? "Check your email for reset instructions"
          : "Enter your email to receive reset instructions"
      }
    >
      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <AuthErrorAlert message={error} />

          <div className="p-4 rounded-lg bg-cyan-50 border-2 border-cyan-200">
            <p className="text-sm text-slate-700 font-medium leading-relaxed">
              Enter the email address associated with your account and we&apos;ll
              send you a link to reset your password.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-[#1F3A5F]"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                <Mail className="w-5 h-5 text-slate-400" strokeWidth={2} />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-[#E2E8F0] rounded-lg text-[#1E293B] placeholder-slate-400 focus:outline-none focus:border-[#3A6EA5] focus:ring-4 focus:ring-[#3A6EA5]/20 transition-all duration-200 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-[#3A6EA5] to-[#5A8EC5] text-white font-bold text-base shadow-md hover:shadow-lg hover:from-[#2d5684] hover:to-[#4A7EB5] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" strokeWidth={2.5} />
            {loading ? "Sending…" : "Send Reset Link"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full py-3.5 px-6 rounded-lg bg-slate-100 text-slate-700 font-semibold border-2 border-slate-300 hover:bg-slate-200 hover:border-slate-400 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
            Back to Login
          </button>
        </form>
      ) : (
        <div className="space-y-6 text-center" role="status" aria-live="polite">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#3A6EA5] to-[#5A8EC5] shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-[#1F3A5F]">Check Your Email</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              If an account exists for{" "}
              <span className="text-[#3A6EA5] font-bold">{email}</span>, we&apos;ve
              sent password reset instructions.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-cyan-50 border-2 border-cyan-200">
            <p className="text-sm text-slate-700 font-medium leading-relaxed">
              Didn&apos;t get an email? Check your spam folder, or try again with a
              different address.
            </p>
          </div>

          <button
            onClick={() => navigate("/login")}
            className="w-full py-3.5 px-6 rounded-lg bg-slate-100 text-slate-700 font-semibold border-2 border-slate-300 hover:bg-slate-200 hover:border-slate-400 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
            Back to Login
          </button>
        </div>
      )}
    </AuthShell>
  );
}
