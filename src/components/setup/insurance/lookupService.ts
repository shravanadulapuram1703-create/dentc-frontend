// Carrier / employer name resolution for the Plans screen.
//
// Plans reference carrier_id / employer_id; there are ~31k plans, ~1.3k carriers
// and ~4.3k employers, so we resolve names lazily by id (cached) for whatever
// page of plans is on screen, rather than pre-loading every entity.

import {
  getInsuranceCarrier,
  getEmployer,
  listInsuranceCarriers,
  listEmployers,
  getInsurancePlan,
  listInsurancePlans,
} from "@/api/generated/endpoints/insurance/insurance";
import {
  getProvider,
  listProviders,
  getOffice,
  listOffices,
} from "@/api/generated/endpoints/organization/organization";
import {
  getFeeSchedule,
  listFeeSchedules,
} from "@/api/generated/endpoints/procedures/procedures";
import type { InsurancePlanRead } from "@/api/generated/model";

const carrierNames = new Map<number, string>();
const employerNames = new Map<number, string>();
const providerNames = new Map<string, string>();
const officeNames = new Map<number, string>();
const feeScheduleNames = new Map<number, string>();
const planLabels = new Map<number, string>();

async function resolve(
  ids: number[],
  cache: Map<number, string>,
  fetchOne: (id: number) => Promise<{ name?: string | null }>,
): Promise<void> {
  const missing = [...new Set(ids)].filter((id) => id != null && !cache.has(id));
  if (missing.length === 0) return;
  const results = await Promise.all(
    missing.map((id) =>
      fetchOne(id)
        .then((r) => ({ id, name: r.name ?? `#${id}` }))
        .catch(() => ({ id, name: `#${id}` })),
    ),
  );
  for (const { id, name } of results) cache.set(id, name);
}

/** Ensure carrier names for the given ids are cached. */
export async function ensureCarrierNames(ids: number[]): Promise<void> {
  await resolve(ids, carrierNames, (id) => getInsuranceCarrier(id));
}

/** Ensure employer names for the given ids are cached. */
export async function ensureEmployerNames(ids: number[]): Promise<void> {
  await resolve(ids, employerNames, (id) => getEmployer(id));
}

export function carrierName(id: number | null | undefined): string {
  if (id == null) return "—";
  return carrierNames.get(id) ?? `#${id}`;
}

export function employerName(id: number | null | undefined): string {
  if (id == null) return "—";
  return employerNames.get(id) ?? `#${id}`;
}

export interface PickerOption {
  id: number | string;
  label: string;
  sub?: string;
}

/** Debounced-search source for the carrier picker. */
export async function searchCarriers(query: string): Promise<PickerOption[]> {
  const res = await listInsuranceCarriers({ search: query || null, size: 20, sort: "name", order: "asc" });
  for (const c of res.items ?? []) carrierNames.set(c.id, c.name);
  return (res.items ?? []).map((c) => ({
    id: c.id,
    label: c.name,
    sub: [c.is_dental ? "Dental" : "Medical", c.payer_id ? `Payer ${c.payer_id}` : null]
      .filter(Boolean)
      .join(" · "),
  }));
}

/** Debounced-search source for the employer picker. */
export async function searchEmployers(query: string): Promise<PickerOption[]> {
  const res = await listEmployers({ search: query || null, size: 20, sort: "name", order: "asc" });
  for (const e of res.items ?? []) employerNames.set(e.id, e.name);
  return (res.items ?? []).map((e) => ({
    id: e.id,
    label: e.name,
    sub: [e.city, e.state].filter(Boolean).join(", "),
  }));
}

// ---------------------------------------------------------------------------
// Provider / office / fee-schedule / plan resolution — for Fee Schedule
// Assignments, whose rows reference these by id (the "lineage" columns).
// ---------------------------------------------------------------------------

export async function ensureProviderNames(ids: (string | null | undefined)[]): Promise<void> {
  const missing = [...new Set(ids)].filter((id): id is string => !!id && !providerNames.has(id));
  if (missing.length === 0) return;
  const res = await Promise.all(
    missing.map((id) =>
      getProvider(id)
        .then((p) => ({ id, name: p.name ?? id }))
        .catch(() => ({ id, name: id })),
    ),
  );
  for (const { id, name } of res) providerNames.set(id, name);
}

export async function ensureOfficeNames(ids: (number | null | undefined)[]): Promise<void> {
  await resolve(
    ids.filter((x): x is number => x != null),
    officeNames,
    (id) => getOffice(id),
  );
}

export async function ensureFeeScheduleNames(ids: (number | null | undefined)[]): Promise<void> {
  await resolve(
    ids.filter((x): x is number => x != null),
    feeScheduleNames,
    (id) => getFeeSchedule(id),
  );
}

export async function ensurePlanLabels(ids: (number | null | undefined)[]): Promise<void> {
  const missing = [...new Set(ids)].filter((id): id is number => id != null && !planLabels.has(id));
  if (missing.length === 0) return;
  const plans = await Promise.all(
    missing.map((id) =>
      getInsurancePlan(id)
        .then((p) => ({ id, plan: p as InsurancePlanRead }))
        .catch(() => ({ id, plan: null })),
    ),
  );
  await ensureCarrierNames(plans.map((x) => x.plan?.carrier_id).filter((x): x is number => x != null));
  for (const { id, plan } of plans) {
    planLabels.set(id, plan ? `${carrierName(plan.carrier_id)} · #${id}` : `#${id}`);
  }
}

export function providerName(id: string | null | undefined): string {
  if (!id) return "—";
  return providerNames.get(id) ?? id;
}
export function officeName(id: number | null | undefined): string {
  if (id == null) return "—";
  return officeNames.get(id) ?? `#${id}`;
}
export function feeScheduleName(id: number | null | undefined): string {
  if (id == null) return "—";
  return feeScheduleNames.get(id) ?? `#${id}`;
}
export function planLabel(id: number | null | undefined): string {
  if (id == null) return "—";
  return planLabels.get(id) ?? `#${id}`;
}

export async function searchProviders(query: string): Promise<PickerOption[]> {
  const res = await listProviders({ search: query || null, size: 20, sort: "name", order: "asc" });
  for (const p of res.items ?? []) providerNames.set(p.id, p.name);
  return (res.items ?? []).map((p) => ({ id: p.id, label: p.name, sub: p.short_id ?? undefined }));
}

export async function searchOffices(query: string): Promise<PickerOption[]> {
  const res = await listOffices({ size: 200, sort: "name", order: "asc" });
  const q = query.trim().toLowerCase();
  const items = (res.items ?? []).filter((o) => !q || o.name.toLowerCase().includes(q));
  for (const o of res.items ?? []) officeNames.set(o.id, o.name);
  return items.slice(0, 25).map((o) => ({ id: o.id, label: o.name, sub: o.short_id ?? undefined }));
}

export async function searchFeeSchedules(query: string): Promise<PickerOption[]> {
  const res = await listFeeSchedules({ search: query || null, size: 50, sort: "name", order: "asc" });
  for (const f of res.items ?? []) feeScheduleNames.set(f.id, f.name);
  return (res.items ?? []).map((f) => ({ id: f.id, label: f.name, sub: f.fee_type ?? undefined }));
}

export async function searchPlans(query: string): Promise<PickerOption[]> {
  const res = await listInsurancePlans({ search: query || null, size: 20, sort: "id", order: "asc" });
  const items = res.items ?? [];
  await ensureCarrierNames(items.map((p) => p.carrier_id));
  for (const p of items) planLabels.set(p.id, `${carrierName(p.carrier_id)} · #${p.id}`);
  return items.map((p) => ({
    id: p.id,
    label: `${carrierName(p.carrier_id)} · #${p.id}`,
    sub: [p.group_number, p.plan_type].filter(Boolean).join(" · ") || undefined,
  }));
}
