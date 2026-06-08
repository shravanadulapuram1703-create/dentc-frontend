import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Maps to the autocomplete attribute: "current-password" | "new-password". */
  autoComplete?: "current-password" | "new-password";
  required?: boolean;
  /** id of an element describing the field (hint / error) for screen readers. */
  describedById?: string;
  invalid?: boolean;
}

/**
 * Password input with an accessible show/hide toggle. Replaces the three
 * copy-pasted toggle blocks that previously lived in the login / signup pages.
 */
export default function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder = "Enter your password",
  autoComplete = "current-password",
  required = true,
  describedById,
  invalid = false,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-[#1F3A5F]">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
          <Lock className="w-5 h-5 text-slate-400" strokeWidth={2} />
        </div>
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={invalid}
          aria-describedby={describedById}
          className="w-full pl-12 pr-12 py-3.5 bg-white border-2 border-[#E2E8F0] rounded-lg text-[#1E293B] placeholder-slate-400 focus:outline-none focus:border-[#3A6EA5] focus:ring-4 focus:ring-[#3A6EA5]/20 transition-all duration-200 font-medium aria-[invalid=true]:border-red-300"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1F3A5F] transition-colors"
        >
          {show ? (
            <EyeOff className="w-5 h-5" strokeWidth={2} />
          ) : (
            <Eye className="w-5 h-5" strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
}
