// components/ReadOnlyField.tsx
interface ReadOnlyFieldProps {
  label: string;
  value?: React.ReactNode;
  hint?: string;
}

export function ReadOnlyField({ label, value, hint }: ReadOnlyFieldProps) {
  return (
    <div>
      <label className="block text-[#1E293B] font-bold mb-1 text-sm">
        {label}
      </label>
      <div className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#1E293B]">
        {value ?? "—"}
      </div>
      {hint && (
        <p className="text-sm text-[#64748B] mt-1">{hint}</p>
      )}
    </div>
  );
}
