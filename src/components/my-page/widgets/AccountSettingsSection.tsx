import { useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, User, IdCard, Lock, Bell, Loader2, ShieldCheck } from "lucide-react";
import { useChangeMyPassword } from "@/api/generated/endpoints/users/users";
import type { UserRead } from "@/api/generated/model";
import type { UserRole } from "../../../contexts/AuthContext.js";
import { roleLabel } from "../../dashboard/lib/dashboardUtils";
import { utils } from "../../../styles/theme.js";
import type { NotificationPrefs } from "../lib/myPageStorage";

interface AccountSettingsSectionProps {
  profile?: UserRead;
  role?: UserRole;
  prefs: NotificationPrefs;
  onPrefsChange: (prefs: NotificationPrefs) => void;
}

function fullName(u?: UserRead): string {
  if (!u) return "—";
  return `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.username;
}

/** A labelled read-only identity field. */
function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-[#3A6EA5] shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-[#1E293B] truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#1E293B]">{label}</p>
        <p className="text-xs text-[#64748B]">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={utils.cn(
          "relative w-11 h-6 rounded-full transition-colors shrink-0",
          checked ? "bg-[#3A6EA5]" : "bg-[#CBD5E1]",
        )}
      >
        <span
          className={utils.cn(
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "",
          )}
        />
      </button>
    </div>
  );
}

/**
 * The user's account panel: real identity (from `/auth/me-full`), a working
 * change-password form (POST /users/me/change-password), and locally-persisted
 * notification preferences. Profile identity is read-only here because the
 * backend exposes no self-service profile-update endpoint (only password) —
 * shown honestly rather than faking a save.
 */
export default function AccountSettingsSection({
  profile,
  role,
  prefs,
  onPrefsChange,
}: AccountSettingsSectionProps) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const changePassword = useChangeMyPassword({
    mutation: {
      onSuccess: () => {
        toast.success("Password updated.");
        setCurrent("");
        setNext("");
        setConfirm("");
      },
      onError: () => toast.error("Couldn't update password. Check your current password."),
    },
  });

  const canSubmit =
    current.length > 0 && next.length >= 8 && next === confirm && !changePassword.isPending;

  const submitPassword = () => {
    if (next !== confirm) {
      toast.error("New passwords don't match.");
      return;
    }
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    changePassword.mutate({ data: { current_password: current, new_password: next } });
  };

  const setPref = (patch: Partial<NotificationPrefs>) => onPrefsChange({ ...prefs, ...patch });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Profile identity (read-only, real) */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-[#1F3A5F]" />
          <h4 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">Profile</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field icon={<User className="w-4 h-4" />} label="Name" value={fullName(profile)} />
          <Field icon={<IdCard className="w-4 h-4" />} label="Role" value={roleLabel(role)} />
          <Field icon={<Mail className="w-4 h-4" />} label="Email" value={profile?.email ?? "—"} />
          <Field
            icon={<Phone className="w-4 h-4" />}
            label="Phone"
            value={profile?.phone ?? "Not set"}
          />
          <Field
            icon={<User className="w-4 h-4" />}
            label="Username"
            value={profile?.username ?? "—"}
          />
          <Field
            icon={<IdCard className="w-4 h-4" />}
            label="User ID"
            value={profile?.short_id ?? (profile?.id != null ? `#${profile.id}` : "—")}
          />
        </div>
        <p className="mt-4 text-xs text-[#94A3B8]">
          Name, email and contact details are managed by an administrator under Setup › Security ›
          Users.
        </p>
      </div>

      {/* Change password + notifications */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-[#1F3A5F]" />
            <h4 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">
              Change Password
            </h4>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
              className="w-full px-4 py-2.5 border-2 border-[#E2E8F0] rounded-lg text-sm text-[#1E293B] bg-white focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 outline-none transition-all"
            />
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="New password (min 8 characters)"
              autoComplete="new-password"
              className="w-full px-4 py-2.5 border-2 border-[#E2E8F0] rounded-lg text-sm text-[#1E293B] bg-white focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 outline-none transition-all"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              className={utils.cn(
                "w-full px-4 py-2.5 border-2 rounded-lg text-sm text-[#1E293B] bg-white focus:ring-2 outline-none transition-all",
                confirm && confirm !== next
                  ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20"
                  : "border-[#E2E8F0] focus:border-[#3A6EA5] focus:ring-[#3A6EA5]/20",
              )}
            />
            <button
              type="button"
              onClick={submitPassword}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3A6EA5] hover:bg-[#2f5a8c] disabled:bg-[#CBD5E1] disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all shadow-sm"
            >
              {changePassword.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Password
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-[#1F3A5F]" />
            <h4 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">
              Notifications
            </h4>
          </div>
          <div className="divide-y divide-[#E2E8F0]">
            <Toggle
              label="Email notifications"
              hint="Receive updates by email"
              checked={prefs.email}
              onChange={(v) => setPref({ email: v })}
            />
            <Toggle
              label="SMS notifications"
              hint="Receive text-message alerts"
              checked={prefs.sms}
              onChange={(v) => setPref({ sms: v })}
            />
            <Toggle
              label="Appointment reminders"
              hint="Daily summary of your schedule"
              checked={prefs.appointment_reminders}
              onChange={(v) => setPref({ appointment_reminders: v })}
            />
            <Toggle
              label="Task reminders"
              hint="Nudges for open tasks on your list"
              checked={prefs.task_reminders}
              onChange={(v) => setPref({ task_reminders: v })}
            />
          </div>
          <p className="mt-2 text-xs text-[#94A3B8]">
            Preferences are saved to this device.
          </p>
        </div>
      </div>
    </div>
  );
}
