import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  autoComplete?: "current-password" | "new-password";
  disabled?: boolean;
  invalid?: boolean;
  /** Extra classes for the <input> (border/padding). A right padding for the eye button is always added. */
  className?: string;
  "aria-label"?: string;
}

const BASE_CLS =
  "w-full px-3 py-2 border-2 rounded-lg text-sm text-[#1E293B] bg-white focus:outline-none focus:ring-2 transition-all";

/**
 * Compact password input with a show/hide (eye) toggle, for in-app forms
 * (Add/Edit User, Change My Password, My Page). The full-page auth screens use
 * the larger `PasswordField`.
 */
export default function PasswordInput({
  value,
  onChange,
  id,
  placeholder,
  autoComplete = "new-password",
  disabled = false,
  invalid = false,
  className,
  "aria-label": ariaLabel,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const stateCls = invalid
    ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20"
    : "border-[#E2E8F0] focus:border-[#3A6EA5] focus:ring-[#3A6EA5]/20";

  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        className={`${className ?? `${BASE_CLS} ${stateCls}`} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        disabled={disabled}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        title={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#1F3A5F] disabled:opacity-50"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
