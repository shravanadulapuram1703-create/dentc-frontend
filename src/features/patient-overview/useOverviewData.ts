// Patient Overview data composition.
//
// The legacy "Patient Overview" screen is a single dense page fed by ~12
// different backend resources. There is no aggregate endpoint that returns the
// whole page (see docs/patients/patient_overview_backend_devreport.md, PO-1),
// so this hook composes it from the canonical resources and exposes everything
// in the backend's snake_case field names — panels bind to these directly.

import { useEffect, useMemo, useState } from "react";
import {
  useGetPatient,
  useListPatientRecalls,
  useListPatientInsurance,
  useListPatients,
  getResponsibleParty,
  useListPatientMedicalAlerts,
  useListPatientAlerts,
  useListReferrals,
  listPatientRecalls,
} from "@/api/generated/endpoints/patients/patients";
import {
  useGetPatientBalance,
  useListPatientPaymentPlans,
  useListPatientRegPlans,
  useListOrthoPlans,
  getPatientBalance,
} from "@/api/generated/endpoints/billing/billing";
import { useListAppointments, listAppointments } from "@/api/generated/endpoints/appointments/appointments";
import { useListPerioExams } from "@/api/generated/endpoints/clinical/clinical";
import { useListDefinitions } from "@/api/generated/endpoints/metadata/metadata";
import {
  useListOffices,
  useListProviders,
  useListOperatories,
} from "@/api/generated/endpoints/organization/organization";
import { getFeeSchedule } from "@/api/generated/endpoints/procedures/procedures";
import {
  getInsurancePlan,
  getInsuranceCarrier,
  getInsuranceSubscriber,
} from "@/api/generated/endpoints/insurance/insurance";
import type {
  PatientRead,
  PatientInsuranceRead,
  InsurancePlanRead,
  InsuranceCarrierRead,
  InsuranceSubscriberRead,
  ResponsiblePartyRead,
  PatientBalance,
  AppointmentRead,
} from "@/api/generated/model";
import { today_iso } from "./format";

/** How many account members we enrich with per-member balance/visit lookups. */
const MEMBER_ENRICH_CAP = 25;

/**
 * Build a legacy-code -> label resolver from a /definitions group. Falls back to
 * the raw code so an unseeded group degrades to today's behaviour instead of a
 * blank cell.
 */
const make_label = (
  items: Array<{ key1?: string | null; description?: string | null }> | undefined,
) => {
  const by_key = new Map(
    (items ?? [])
      .filter((d) => d.key1)
      .map((d) => [String(d.key1).trim().toUpperCase(), d.description ?? ""]),
  );
  return (code?: string | null): string => {
    if (!code) return "";
    return by_key.get(code.trim().toUpperCase()) || code;
  };
};

export interface MemberEnrichment {
  balance?: PatientBalance;
  next_visit?: string | null;
  last_visit?: string | null;
  scheduled_recall?: string | null;
}

export interface InsuranceSlot {
  record: PatientInsuranceRead;
  plan?: InsurancePlanRead;
  carrier?: InsuranceCarrierRead;
  subscriber?: InsuranceSubscriberRead;
}

export function useOverviewData(patient_id: number) {
  const valid = Number.isFinite(patient_id);
  const enabled = { query: { enabled: valid } };
  const today = today_iso();

  // ---- Core patient + account ------------------------------------------------
  const patient_query = useGetPatient(patient_id, enabled);
  const balance_query = useGetPatientBalance(patient_id, enabled);
  const patient = patient_query.data;

  // ---- Reference tables (shared React Query cache with the rest of the app) ---
  const offices_query = useListOffices({ size: 200 });
  const providers_query = useListProviders({ size: 200 });
  const operatories_query = useListOperatories({ size: 200 });

  // Several patient columns are stored as legacy codes ("UP", "RC01", "CO").
  // The label lives in /definitions under a group_code, so each group the
  // Overview renders is loaded once and mapped key1 -> description.
  const patient_type_defs = useListDefinitions({ group_code: "PATTYPE", size: 200 });
  const referral_type_defs = useListDefinitions({ group_code: "REFTYPE", size: 200 });
  const resp_party_type_defs = useListDefinitions({ group_code: "RPTYPE", size: 200 });

  // ---- Per-patient collections ----------------------------------------------
  const appointments_query = useListAppointments(
    { patient_id, size: 200, sort: "date", order: "desc" },
    enabled,
  );
  const recalls_query = useListPatientRecalls({ patient_id, size: 50 }, enabled);
  const insurance_query = useListPatientInsurance({ patient_id, size: 50 }, enabled);
  const referrals_query = useListReferrals({ patient_id, size: 50 }, enabled);
  const medical_alerts_query = useListPatientMedicalAlerts(
    { patient_id, is_active: true, size: 50 },
    enabled,
  );
  const account_alerts_query = useListPatientAlerts(
    { patient_id, is_active: true, size: 50 },
    enabled,
  );
  const perio_query = useListPerioExams(
    { patient_id, size: 1, sort: "exam_date", order: "desc" },
    enabled,
  );
  const reg_plans_query = useListPatientRegPlans({ patient_id, is_active: true, size: 50 }, enabled);
  const payment_plans_query = useListPatientPaymentPlans(
    { patient_id, is_active: true, size: 50 },
    enabled,
  );
  // The Ortho Payment Plan screen writes to /ortho-plans, so the CONTRACT panel
  // reads its ortho column from there rather than from a plan_type convention.
  const ortho_plans_query = useListOrthoPlans({ patient_id, is_active: true, size: 50 }, enabled);

  // ---- Responsible party -----------------------------------------------------
  // `patients.responsible_party_id` is a string column. Migrated patients hold a
  // legacy id ("13002496") that does NOT resolve against /responsible-parties/{id}
  // (404 — gap PO-2), while patients created in the new system hold the numeric
  // FK ("2"). Detail is fetched only when the id is a resolvable numeric FK.
  // The 404 is an expected outcome for migrated patients, so this is fetched
  // outside React Query — the shared QueryCache surfaces every query error as a
  // toast, and a legacy guarantor id must not raise one on every page load.
  const rp_id_raw = patient?.responsible_party_id ?? null;
  const [responsible_party, set_responsible_party] = useState<ResponsiblePartyRead | null>(null);
  const [rp_resolved, set_rp_resolved] = useState(false);

  useEffect(() => {
    set_responsible_party(null);
    set_rp_resolved(false);
    if (!rp_id_raw || !/^\d+$/.test(rp_id_raw)) {
      set_rp_resolved(true);
      return;
    }
    let cancelled = false;
    getResponsibleParty(Number(rp_id_raw))
      .then((rp) => {
        if (!cancelled) set_responsible_party(rp);
      })
      .catch(() => {
        /* legacy id with no responsible-parties row — gap PO-2 */
      })
      .finally(() => {
        if (!cancelled) set_rp_resolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, [rp_id_raw]);

  // Account members = every patient sharing this responsible_party_id. The
  // roster endpoint (/responsible-parties/{id}/patients) only accepts the
  // numeric FK, so the list filter is used instead — it matches the raw string
  // and therefore works for legacy and new patients alike.
  const members_query = useListPatients(
    { responsible_party_id: rp_id_raw ?? undefined, size: 200 },
    { query: { enabled: valid && Boolean(rp_id_raw) } },
  );

  // ---- Insurance plan / carrier / subscriber resolution ----------------------
  // patient_insurance is a thin link record; carrier name, group number, phone
  // and subscriber all live on reference tables that are far too large to list,
  // so each referenced row is fetched by id.
  const [ins_refs, set_ins_refs] = useState<{
    plans: Record<number, InsurancePlanRead>;
    carriers: Record<number, InsuranceCarrierRead>;
    subscribers: Record<number, InsuranceSubscriberRead>;
  }>({ plans: {}, carriers: {}, subscribers: {} });

  const insurance_items = insurance_query.data?.items;
  useEffect(() => {
    const recs = insurance_items ?? [];
    if (recs.length === 0) {
      set_ins_refs({ plans: {}, carriers: {}, subscribers: {} });
      return;
    }
    let cancelled = false;
    (async () => {
      const plan_ids = [...new Set(recs.map((r) => r.ins_plan_id).filter((x): x is number => x != null))];
      const sub_ids = [...new Set(recs.map((r) => r.subscriber_id).filter((x): x is number => x != null))];

      const plans: Record<number, InsurancePlanRead> = {};
      (await Promise.all(plan_ids.map((id) => getInsurancePlan(id).catch(() => null)))).forEach((p) => {
        if (p) plans[p.id] = p;
      });

      const carrier_ids = [
        ...new Set(Object.values(plans).map((p) => p.carrier_id).filter((x): x is number => x != null)),
      ];
      const carriers: Record<number, InsuranceCarrierRead> = {};
      (await Promise.all(carrier_ids.map((id) => getInsuranceCarrier(id).catch(() => null)))).forEach((c) => {
        if (c) carriers[c.id] = c;
      });

      const subscribers: Record<number, InsuranceSubscriberRead> = {};
      (await Promise.all(sub_ids.map((id) => getInsuranceSubscriber(id).catch(() => null)))).forEach((s) => {
        if (s) subscribers[s.id] = s;
      });

      if (!cancelled) set_ins_refs({ plans, carriers, subscribers });
    })();
    return () => {
      cancelled = true;
    };
  }, [insurance_items]);

  // ---- Fee schedule name -----------------------------------------------------
  // The patient record carries `fee_schedule_id` only; the name lives on
  // /fee-schedules/{id}.
  const fee_schedule_id = patient?.fee_schedule_id ?? null;
  const [fee_schedule_name, set_fee_schedule_name] = useState<string | null>(null);
  useEffect(() => {
    if (fee_schedule_id == null) {
      set_fee_schedule_name(null);
      return;
    }
    let cancelled = false;
    getFeeSchedule(fee_schedule_id)
      .then((fs) => {
        if (!cancelled) set_fee_schedule_name(fs?.name ?? null);
      })
      .catch(() => {
        if (!cancelled) set_fee_schedule_name(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fee_schedule_id]);

  // ---- Per-member enrichment -------------------------------------------------
  // Neither the roster endpoint nor /patients returns a member's account balance
  // aging or next scheduled visit, so each member is enriched individually
  // (gap PO-3). Bounded to MEMBER_ENRICH_CAP members.
  const member_ids = useMemo(
    () => (members_query.data?.items ?? []).slice(0, MEMBER_ENRICH_CAP).map((m) => m.id),
    [members_query.data],
  );
  const member_ids_key = member_ids.join(",");
  const [member_extra, set_member_extra] = useState<Record<number, MemberEnrichment>>({});

  useEffect(() => {
    if (member_ids.length === 0) {
      set_member_extra({});
      return;
    }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        member_ids.map(async (id) => {
          const [balance, appts, member_recalls] = await Promise.all([
            getPatientBalance(id).catch(() => undefined),
            listAppointments({ patient_id: id, size: 200, sort: "date", order: "desc" }).catch(
              () => undefined,
            ),
            listPatientRecalls({ patient_id: id, is_active: true, size: 50 }).catch(() => undefined),
          ]);
          const dates = (appts?.items ?? [])
            .filter((a) => !a.is_cancelled && !a.is_archived)
            .map((a) => a.date)
            .sort();
          const next_visit = dates.find((d) => d > today);
          const last_visit = dates.filter((d) => d <= today).pop();
          const scheduled_recall = (member_recalls?.items ?? [])
            .map((r) => r.scheduled_date)
            .filter((d): d is string => Boolean(d))
            .sort()[0];
          return [id, { balance, next_visit, last_visit, scheduled_recall }] as const;
        }),
      );
      if (!cancelled) set_member_extra(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
    // `member_ids` is a fresh array each render — key on its contents instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member_ids_key, today]);

  // ---- Derived lookups -------------------------------------------------------
  const office_name = useMemo(() => {
    const by_id = new Map((offices_query.data?.items ?? []).map((o) => [o.id, o.name]));
    return (id?: number | null) => (id == null ? "-" : by_id.get(id) ?? `Office ${id}`);
  }, [offices_query.data]);

  const office_code = useMemo(() => {
    const by_id = new Map(
      (offices_query.data?.items ?? []).map((o) => [o.id, o.office_code ?? o.short_id ?? null]),
    );
    return (id?: number | null) => (id == null ? null : by_id.get(id) ?? null);
  }, [offices_query.data]);

  const provider_name = useMemo(() => {
    const by_id = new Map(
      (providers_query.data?.items ?? []).map((p) => [
        String(p.id),
        p.name || [p.last_name, p.first_name].filter(Boolean).join(", "),
      ]),
    );
    return (id?: string | number | null) =>
      id == null ? "-" : by_id.get(String(id)) ?? String(id);
  }, [providers_query.data]);

  const operatory_name = useMemo(() => {
    const by_id = new Map((operatories_query.data?.items ?? []).map((o) => [String(o.id), o.name]));
    return (id?: string | number | null) =>
      id == null ? "-" : by_id.get(String(id)) ?? String(id);
  }, [operatories_query.data]);

  const patient_type_label = useMemo(
    () => make_label(patient_type_defs.data?.items),
    [patient_type_defs.data],
  );
  const referral_type_label = useMemo(
    () => make_label(referral_type_defs.data?.items),
    [referral_type_defs.data],
  );
  const resp_party_type_label = useMemo(
    () => make_label(resp_party_type_defs.data?.items),
    [resp_party_type_defs.data],
  );

  // ---- Visit dates -----------------------------------------------------------
  // `patients.first_visit` / `last_visit` are only populated for migrated
  // records, so they are backfilled from the appointment history when blank.
  const appointments = useMemo(
    () => (appointments_query.data?.items ?? []).slice(),
    [appointments_query.data],
  );

  const recalls = useMemo(() => recalls_query.data?.items ?? [], [recalls_query.data]);

  const visit_dates = useMemo(() => {
    const bookable = appointments.filter((a) => !a.is_cancelled && !a.is_archived);
    const past = bookable.filter((a) => a.date <= today).map((a) => a.date).sort();
    const future = bookable.filter((a) => a.date > today).map((a) => a.date).sort();
    // `patients.next_recall` is a denormalized column the backend does not
    // maintain (gap PO-8), so the soonest recall due date is used instead.
    const due_dates = recalls
      .map((r) => r.due_date)
      .filter((d): d is string => Boolean(d))
      .sort();
    return {
      first_visit: patient?.first_visit ?? past[0] ?? null,
      last_visit: patient?.last_visit ?? past[past.length - 1] ?? null,
      next_visit: future[0] ?? null,
      next_recall: patient?.next_recall ?? due_dates.find((d) => d >= today) ?? due_dates[0] ?? null,
    };
  }, [appointments, patient, recalls, today]);

  // ---- Insurance slots -------------------------------------------------------
  // Category (dental/medical) is `legacy_plan_type` ("D"/"M"); the order within
  // a category is `insurance_type` ("primary"/"secondary"/…).
  const insurance_slots = useMemo(() => {
    const active = (insurance_items ?? []).filter((r) => r.is_active !== false);
    const build = (rec?: PatientInsuranceRead): InsuranceSlot | null => {
      if (!rec) return null;
      const plan = rec.ins_plan_id != null ? ins_refs.plans[rec.ins_plan_id] : undefined;
      const carrier = plan?.carrier_id != null ? ins_refs.carriers[plan.carrier_id] : undefined;
      const subscriber = rec.subscriber_id != null ? ins_refs.subscribers[rec.subscriber_id] : undefined;
      return { record: rec, plan, carrier, subscriber };
    };
    const category = (r: PatientInsuranceRead) => (r.legacy_plan_type ?? "").trim().toUpperCase();
    const order = (r: PatientInsuranceRead) => (r.insurance_type ?? "").trim().toLowerCase();
    const pick = (recs: PatientInsuranceRead[], want: string, fallback_index: number) =>
      build(recs.find((r) => order(r) === want) ?? recs[fallback_index]);

    const dental = active.filter((r) => category(r).startsWith("D"));
    const medical = active.filter((r) => category(r).startsWith("M"));
    return {
      dental: { primary: pick(dental, "primary", 0), secondary: pick(dental, "secondary", 1) },
      medical: { primary: pick(medical, "primary", 0), secondary: pick(medical, "secondary", 1) },
    };
  }, [insurance_items, ins_refs]);

  // ---- Account members -------------------------------------------------------
  const members = useMemo(() => {
    const items = (members_query.data?.items ?? []).slice();
    // The patient in context is always a member, even before the roster loads.
    if (patient && !items.some((m) => m.id === patient.id)) items.unshift(patient);
    // Legacy sorts the responsible party's own record first, then by name.
    return items.sort((a: PatientRead, b: PatientRead) =>
      `${a.last_name ?? ""}${a.first_name ?? ""}`.localeCompare(
        `${b.last_name ?? ""}${b.first_name ?? ""}`,
      ),
    );
  }, [members_query.data, patient]);

  const is_loading = patient_query.isLoading;
  const error = patient_query.isError
    ? ((patient_query.error as { message?: string } | null)?.message ?? "Failed to load patient")
    : null;

  const refetch_all = () => {
    patient_query.refetch();
    balance_query.refetch();
    appointments_query.refetch();
    recalls_query.refetch();
    insurance_query.refetch();
    referrals_query.refetch();
    medical_alerts_query.refetch();
    account_alerts_query.refetch();
    members_query.refetch();
    reg_plans_query.refetch();
    payment_plans_query.refetch();
    ortho_plans_query.refetch();
  };

  return {
    is_loading,
    error,
    refetch_all,

    patient,
    balance: balance_query.data,
    responsible_party,
    responsible_party_id_raw: rp_id_raw,
    responsible_party_unresolved: Boolean(rp_id_raw) && rp_resolved && !responsible_party,

    members,
    member_extra,
    members_loading: members_query.isLoading,

    appointments,
    appointments_loading: appointments_query.isLoading,
    recalls,
    recalls_loading: recalls_query.isLoading,
    referrals: referrals_query.data?.items ?? [],
    referrals_loading: referrals_query.isLoading,
    medical_alerts: medical_alerts_query.data?.items ?? [],
    account_alerts: account_alerts_query.data?.items ?? [],
    reg_plans: (reg_plans_query.data?.items ?? []).filter((p) => p.is_active !== false),
    payment_plans: (payment_plans_query.data?.items ?? []).filter((p) => p.is_active !== false),
    ortho_plans: (ortho_plans_query.data?.items ?? []).filter((p) => p.is_active !== false),

    insurance_slots,
    fee_schedule_name,
    last_perio_exam: perio_query.data?.items?.[0] ?? null,
    visit_dates,

    office_name,
    office_code,
    provider_name,
    operatory_name,
    patient_type_label,
    referral_type_label,
    resp_party_type_label,
  };
}

export type OverviewData = ReturnType<typeof useOverviewData>;
export type { AppointmentRead };
