import { useListDefinitions } from '@/api/generated/endpoints/metadata/metadata';
import type { DefinitionRead } from '@/api/generated/model';

/**
 * Load a seeded lookup group from `/definitions` (replaces the legacy, nonexistent
 * `/patients/metadata*`). Group codes include: gender, title, marital_status,
 * referral_type, pronoun, contact_pref, resp_party_rel, state, patient_type,
 * adjustment, payment_method.
 *
 * `DefinitionRead.key1` is the stored value; `description` is the display label.
 * Returns active definitions sorted by `sort_order`.
 */
export function useDefinitions(groupCode: string) {
  const query = useListDefinitions(
    { group_code: groupCode, is_active: true, size: 200 },
    { query: { enabled: Boolean(groupCode) } },
  );

  const definitions: DefinitionRead[] = (query.data?.items ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return { ...query, definitions };
}
