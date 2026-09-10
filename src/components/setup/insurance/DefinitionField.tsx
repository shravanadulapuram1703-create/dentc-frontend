import { useDefinitions } from "@/shared/hooks/useDefinitions";

// A dropdown backed by /definitions?group_code=… (INS-10). If the group has no
// seeded definitions yet, it gracefully falls back to a free-text input with an
// optional datalist of hint values, so the field keeps working before the
// backend seed (`scripts.seed_account_definitions`) runs.

const INPUT_CLS =
  "w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 disabled:bg-[#F1F5F9] disabled:text-[#64748B]";

export default function DefinitionField({
  groupCode,
  value,
  onChange,
  placeholder,
  hints,
  allowEmpty = true,
  disabled = false,
}: {
  groupCode: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hints?: string[];
  allowEmpty?: boolean;
  disabled?: boolean;
}) {
  const { options, isLoading } = useDefinitions(groupCode);

  if (!isLoading && options.length > 0) {
    // If the stored value isn't among the seeded options, keep it selectable.
    const known = options.some((o) => o.value === value);
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={INPUT_CLS}
      >
        {allowEmpty && <option value="">—</option>}
        {!known && value && <option value={value}>{value} (legacy)</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  // Fallback: free text + datalist hints.
  const listId = `def-${groupCode}`;
  return (
    <>
      <input
        type="text"
        list={hints && hints.length ? listId : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={INPUT_CLS}
        placeholder={placeholder}
      />
      {hints && hints.length > 0 && (
        <datalist id={listId}>
          {hints.map((h) => (
            <option key={h} value={h} />
          ))}
        </datalist>
      )}
    </>
  );
}
