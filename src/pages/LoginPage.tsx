import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, LogIn, KeyRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import AuthShell from "../features/auth/components/AuthShell";
import PasswordField from "../features/auth/components/PasswordField";
import AuthErrorAlert from "../features/auth/components/AuthErrorAlert";
import { REMEMBERED_IDENTIFIER_KEY } from "../features/auth/rememberMe";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState(
    () => localStorage.getItem(REMEMBERED_IDENTIFIER_KEY) ?? "",
  );
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(
    () => localStorage.getItem(REMEMBERED_IDENTIFIER_KEY) !== null,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier || !password) {
      setError("Please enter your username/email and password.");
      return;
    }

    setLoading(true);
    try {
      const result = await login(identifier.trim(), password);

      if (result.ok) {
        if (rememberMe) {
          localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, identifier.trim());
        } else {
          localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
        }
        // Force a password change on first login / admin-required reset.
        navigate(
          result.must_change_password
            ? "/setup/security/change-my-password"
            : "/dashboard",
        );
      } else {
        setError(result.error.message);
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reckon Dental PMS"
      subtitle="Sign in to your account"
    >
      <form onSubmit={handleLogin} className="space-y-6" noValidate>
        <AuthErrorAlert message={error} />

        {/* Username or Email */}
        <div className="space-y-2">
          <label
            htmlFor="identifier"
            className="block text-sm font-semibold text-[#1F3A5F]"
          >
            Username or Email Address
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
              <Mail className="w-5 h-5 text-slate-400" strokeWidth={2} />
            </div>
            <input
              id="identifier"
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

        {/* Password */}
        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        {/* Remember me + Forgot password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-[#E2E8F0] bg-white text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5] cursor-pointer"
            />
            <span className="text-sm font-medium text-[#475569] group-hover:text-[#1F3A5F] transition-colors">
              Remember me
            </span>
          </label>
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="text-sm font-semibold text-[#3A6EA5] hover:text-[#1F3A5F] transition-colors"
          >
            Forgot password?
          </button>
        </div>

        {/* Sign In */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-[#3A6EA5] to-[#5A8EC5] text-white font-bold text-base shadow-md hover:shadow-lg hover:from-[#2d5684] hover:to-[#4A7EB5] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <LogIn className="w-5 h-5" strokeWidth={2.5} />
          {loading ? "Signing In…" : "Sign In"}
        </button>
      </form>

      {/* Legacy account activation */}
      <div className="mt-6 pt-6 border-t-2 border-[#E2E8F0] text-center">
        <p className="text-sm text-[#475569] font-medium mb-2">
          Migrating from the legacy system?
        </p>
        <button
          onClick={() => navigate("/activate-legacy")}
          className="inline-flex items-center justify-center gap-2 text-sm font-bold text-[#3A6EA5] hover:text-[#1F3A5F] transition-colors"
        >
          <KeyRound className="w-4 h-4" strokeWidth={2.5} />
          Activate Legacy Account
        </button>
      </div>
    </AuthShell>
  );
}
