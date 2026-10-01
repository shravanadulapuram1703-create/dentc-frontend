import { providerOptionLabel, type ProviderLabelSource } from "@/services/providerDirectory";

export interface GroupableProvider extends ProviderLabelSource {
  /** From `fetchProviders(office)` / `useProviderDirectory` — serves the working office. */
  in_office?: boolean;
}

interface Props {
  providers: GroupableProvider[];
  /**
   * An id that must stay selectable even when it is not in `providers` (a
   * stored preferred provider who is inactive or was filtered out). Rendered
   * under the second group with a "(not in list)" hint.
   */
  keep_id?: string | null;
  keep_label?: string;
}

/**
 * The option body of every provider `<select>`: "This office" first, every other
 * provider below — nothing hidden. The roster is a hint, not a wall (office 4
 * resolves to a single test provider while the treating dentist sits on office 1).
 * Callers keep their own placeholder `<option>` above this.
 */
export function ProviderOptionGroups({ providers, keep_id, keep_label }: Props) {
  const inOffice = providers.filter((p) => p.in_office === true);
  const others = providers.filter((p) => p.in_office !== true);
  const missing =
    keep_id && !providers.some((p) => String(p.id) === String(keep_id)) ? String(keep_id) : null;

  return (
    <>
      {inOffice.length > 0 && (
        <optgroup label="This office">
          {inOffice.map((p) => (
            <option key={p.id} value={p.id}>
              {providerOptionLabel(p)}
            </option>
          ))}
        </optgroup>
      )}
      {(others.length > 0 || missing) && (
        <optgroup label={inOffice.length > 0 ? "Other offices" : "Providers"}>
          {missing && (
            <option value={missing}>{keep_label ?? `${missing} (not in list)`}</option>
          )}
          {others.map((p) => (
            <option key={p.id} value={p.id}>
              {providerOptionLabel(p)}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );
}
