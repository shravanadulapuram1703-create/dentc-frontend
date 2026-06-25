// Patient Insurance service — wraps the generated Orval client (no raw axios).
//
// Loads one insurance SLOT (dental/medical × primary…quaternary) by joining the
// patient_insurance row to its plan / carrier / employer / subscriber, and saves
// the slot back across patient_insurance + insurance_subscribers.

import {
  listPatientInsurance,
  createPatientInsurance,
  updatePatientInsurance,
} from "@/api/generated/endpoints/patients/patients";
import {
  getInsurancePlan,
  getInsuranceCarrier,
  getInsuranceSubscriber,
  getEmployer,
  createInsuranceSubscriber,
  updateInsuranceSubscriber,
  listInsuranceSubscribers,
} from "@/api/generated/endpoints/insurance/insurance";
import type { InsuranceSubscriberRead } from "@/api/generated/model";
import {
  type InsSlot,
  type InsuranceForm,
  type SlotData,
  findSlotRecord,
  buildSubscriberCreate,
  buildSubscriberUpdate,
  buildPatientInsuranceCreate,
  buildPatientInsuranceUpdate,
} from "./insuranceModel";

/** Load the full slot context for a patient, or empty data if none on file. */
export async function loadSlot(patientId: number, slot: InsSlot): Promise<SlotData> {
  const res = await listPatientInsurance({ patient_id: patientId, size: 50 });
  const record = findSlotRecord(res.items ?? [], slot) ?? null;

  const empty: SlotData = { record: null, plan: null, carrier: null, employer: null, subscriber: null };
  if (!record) return empty;

  const [plan, subscriber] = await Promise.all([
    record.ins_plan_id != null ? getInsurancePlan(record.ins_plan_id).catch(() => null) : Promise.resolve(null),
    record.subscriber_id != null ? loadSubscriber(record.subscriber_id) : Promise.resolve(null),
  ]);

  const [carrier, employer] = await Promise.all([
    plan?.carrier_id != null ? getInsuranceCarrier(plan.carrier_id).catch(() => null) : Promise.resolve(null),
    plan?.employer_id != null ? getEmployer(plan.employer_id).catch(() => null) : Promise.resolve(null),
  ]);

  return { record, plan, carrier, employer, subscriber };
}

async function loadSubscriber(subscriberId: number): Promise<InsuranceSubscriberRead | null> {
  return getInsuranceSubscriber(subscriberId).catch(() => null);
}

/** Resolve a freshly-selected plan's carrier + employer for the display panel. */
export async function loadPlanContext(
  planId: number,
): Promise<Pick<SlotData, "plan" | "carrier" | "employer">> {
  const plan = await getInsurancePlan(planId).catch(() => null);
  const [carrier, employer] = await Promise.all([
    plan?.carrier_id != null ? getInsuranceCarrier(plan.carrier_id).catch(() => null) : Promise.resolve(null),
    plan?.employer_id != null ? getEmployer(plan.employer_id).catch(() => null) : Promise.resolve(null),
  ]);
  return { plan, carrier, employer };
}

/** Fetch a single subscriber (for the "Member Subscriber" picker). */
export async function getSubscriberById(id: number): Promise<InsuranceSubscriberRead | null> {
  return getInsuranceSubscriber(id).catch(() => null);
}

/** Subscribers already on the selected plan — powers the "Member Subscriber" list. */
export async function listPlanSubscribers(insPlanId: number): Promise<InsuranceSubscriberRead[]> {
  const res = await listInsuranceSubscribers({ ins_plan_id: insPlanId, is_active: true, size: 100 });
  return res.items ?? [];
}

export interface SaveResult {
  recordId: number;
  subscriberId: number | null;
}

/**
 * Persist the slot. Creates/updates the subscriber first (so we have its id),
 * then creates/updates the patient_insurance row that ties everything together.
 */
export async function saveSlot(args: {
  patientId: number;
  slot: InsSlot;
  existingRecordId: number | null;
  form: InsuranceForm;
}): Promise<SaveResult> {
  const { patientId, slot, existingRecordId, form } = args;
  if (form.ins_plan_id == null) {
    throw new Error("Select an insurance plan before saving.");
  }

  // 1) Subscriber
  let subscriberId = form.subscriber_id;
  if (subscriberId == null) {
    const created = await createInsuranceSubscriber(buildSubscriberCreate(form, form.ins_plan_id));
    subscriberId = created.id;
  } else {
    await updateInsuranceSubscriber(subscriberId, buildSubscriberUpdate(form));
  }

  // 2) patient_insurance link
  let recordId: number;
  if (existingRecordId == null) {
    const created = await createPatientInsurance(
      buildPatientInsuranceCreate(form, patientId, slot, subscriberId),
    );
    recordId = created.id;
  } else {
    await updatePatientInsurance(existingRecordId, buildPatientInsuranceUpdate(form, slot, subscriberId));
    recordId = existingRecordId;
  }

  return { recordId, subscriberId };
}
