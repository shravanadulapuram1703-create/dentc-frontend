import { useState } from "react";
import { Lock, Save, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { components } from "../../../styles/theme";
import { useAuth } from "../../../contexts/AuthContext";
import { changeMyPassword } from "@/api/generated/endpoints/users/users";

// ========================================
// Change My Password — self-service password change via
// POST /api/v1/users/me/change-password (devreport Gap 7). The backend verifies
// the current password and requires only that the user is signed in (no admin
// guard / RBAC self-PATCH dependency).
// ========================================

const MIN_LENGTH = 8;

const inputCls =
  "w-full px-3 py-2 pr-10 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";
const labelCls = "block text-xs font-bold text-[#1E293B] mb-2";

export default function ChangeMyPassword() {
  const { user } = useAuth();
  const hasUser = !!user?.id;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const trimmed = newPassword;
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_LENGTH;
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSubmit =
    hasUser &&
    currentPassword.length > 0 &&
    trimmed.length >= MIN_LENGTH &&
    confirmPassword === newPassword &&
    !saving;

  const handleSubmit = async () => {
    if (!currentPassword) {
      toast.error("Validation Failed", { description: "Enter your current password" });
      return;
    }
    if (trimmed.length < MIN_LENGTH) {
      toast.error("Validation Failed", { description: `Password must be at least ${MIN_LENGTH} characters` });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Validation Failed", { description: "Passwords do not match" });
      return;
    }

    setSaving(true);
    try {
      await changeMyPassword({ current_password: currentPassword, new_password: newPassword });
      toast.success("Password changed", { description: "Your password has been updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: unknown) {
      // Backend returns 401 when the current password is wrong.
      const status =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { status?: number } }).response?.status
          : undefined;
      const msg =
        status === 401
          ? "Your current password is incorrect."
          : e && typeof e === "object" && "message" in e
            ? String((e as Error).message)
            : "Failed to change password";
      toast.error("Could not change password", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  if (!hasUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <p className="text-sm font-bold text-[#64748B]">Sign in to change your password.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[640px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1F3A5F]">Change My Password</h1>
              <p className="text-xs text-[#64748B] font-bold">Signed in as {user?.email}</p>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 space-y-5">
            <div>
              <label className={labelCls}>
                Current Password <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#1F3A5F]"
                  title={showCurrent ? "Hide" : "Show"}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className={labelCls}>
                New Password <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#1F3A5F]"
                  title={showNew ? "Hide" : "Show"}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className={`text-xs mt-1 ${tooShort ? "text-[#DC2626]" : "text-[#64748B]"}`}>
                At least {MIN_LENGTH} characters.
              </p>
            </div>

            <div>
              <label className={labelCls}>
                Confirm New Password <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#1F3A5F]"
                  title={showConfirm ? "Hide" : "Show"}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mismatch ? (
                <p className="text-xs mt-1 text-[#DC2626] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Passwords do not match
                </p>
              ) : confirmPassword.length > 0 ? (
                <p className="text-xs mt-1 text-[#16A34A] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Passwords match
                </p>
              ) : null}
            </div>

          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t-2 border-[#E2E8F0] p-4 bg-[#F7F9FC]">
            <button
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className={components.buttonPrimary + " inline-flex items-center gap-2 disabled:opacity-50"}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
