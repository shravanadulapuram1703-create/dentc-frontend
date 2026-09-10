// Builds the merge-field context for SMS templates from real backend data:
// patient (name/phones/consent), the office (name/phone), the provider
// directory, and the patient's appointments (for reminder/confirmation texts).

import { useMemo } from "react";
import { useGetPatient } from "@/api/generated/endpoints/patients/patients";
import { useListAppointments } from "@/api/generated/endpoints/appointments/appointments";
import { useListOffices } from "@/api/generated/endpoints/organization/organization";
import { useProviderDirectory } from "@/hooks/useProviderDirectory";
import type { AppointmentRead, OfficeRead, PatientRead } from "@/api/generated/model";
import { formatPhone, toE164 } from "../phone";
import type { SmsMergeContext } from "../smsTemplates";

export interface PhoneOption {
  /** `cell` | `home` | `work` — where the number came from. */
  kind: "cell" | "home" | "work";
  label: string;
  /** E.164 value used for sending. */
  value: string;
  display: string;
}

export interface AppointmentOption {
  id: string;
  date: string;
  start_time: string | null;
  provider_id: string;
  provider_name: string;
  office_id: number;
  status: string;
  label: string;
  is_upcoming: boolean;
  is_confirmed: boolean;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** `Tue, Sep 9` */
export function fmtApptDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

/** `2:30 PM` */
export function fmtApptTime(time: string | null | undefined): string {
  if (!time) return "";
  const [h = NaN, mi = 0] = time.split(":").map(Number);
  if (!Number.isFinite(h)) return time;
  const d = new Date();
  d.setHours(h, mi, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function useSmsMergeContext(patient_id: number, office_id_hint: number | null) {
  const validId = Number.isFinite(patient_id) && patient_id > 0;
  const patientQuery = useGetPatient(patient_id, { query: { enabled: validId } });
  const officesQuery = useListOffices({ size: 200 });
  const apptQuery = useListAppointments(
    { patient_id, size: 100, sort: "date", order: "desc" },
    { query: { enabled: validId } },
  );
  // providerLabel ("Name (ID)") is for the on-screen appointment picker;
  // providerName (bare) is what gets merged into the patient-facing message.
  const { providerLabel, providerName } = useProviderDirectory();

  const patient: PatientRead | null = patientQuery.data ?? null;
  const office: OfficeRead | null = useMemo(() => {
    const list = officesQuery.data?.items ?? [];
    const wanted = patient?.home_office_id ?? office_id_hint;
    return list.find((o) => o.id === wanted) ?? list[0] ?? null;
  }, [officesQuery.data, patient?.home_office_id, office_id_hint]);

  const phones: PhoneOption[] = useMemo(() => {
    if (!patient) return [];
    const out: PhoneOption[] = [];
    const push = (kind: PhoneOption["kind"], label: string, raw: string | null | undefined) => {
      const e164 = toE164(raw);
      if (e164 && !out.some((p) => p.value === e164)) {
        out.push({ kind, label, value: e164, display: formatPhone(e164) });
      }
    };
    push("cell", "Mobile", patient.cell_phone);
    push("home", "Home", patient.phone);
    push("work", "Work", patient.work_phone);
    return out;
  }, [patient]);

  const appointments: AppointmentOption[] = useMemo(() => {
    const today = todayIso();
    const rows: AppointmentRead[] = apptQuery.data?.items ?? [];
    return rows
      .filter((a) => !a.is_archived && !a.is_cancelled && !a.is_blocked)
      .map((a) => {
        const provider_name = providerName(a.provider_id) || "your provider";
        const provider_display = providerLabel(a.provider_id) || provider_name;
        const status = (a.status ?? "").toLowerCase();
        return {
          id: a.id,
          date: a.date,
          start_time: a.start_time ?? null,
          provider_id: a.provider_id,
          provider_name,
          office_id: a.office_id,
          status: a.status,
          label: `${fmtApptDate(a.date)}${a.start_time ? ` · ${fmtApptTime(a.start_time)}` : ""} · ${provider_display}`,
          is_upcoming: a.date >= today && status !== "missed",
          is_confirmed: !!a.confirmed_on || status === "confirmed",
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [apptQuery.data, providerLabel, providerName]);

  const buildContext = useMemo(
    () =>
      (appt: AppointmentOption | null): SmsMergeContext => ({
        patient_first_name: patient?.preferred_name || patient?.first_name || "",
        patient_name: patient ? `${patient.first_name} ${patient.last_name}`.trim() : "",
        appointment_date: appt ? fmtApptDate(appt.date) : "",
        appointment_time: appt ? fmtApptTime(appt.start_time) : "",
        appointment_datetime: appt
          ? `${fmtApptDate(appt.date)}${appt.start_time ? ` at ${fmtApptTime(appt.start_time)}` : ""}`
          : "",
        provider_name: appt?.provider_name ?? "",
        office_name: office?.name ?? "",
        office_phone: office?.phone ? formatPhone(office.phone) : "",
      }),
    [patient, office],
  );

  return {
    patient,
    office,
    phones,
    appointments,
    buildContext,
    sms_opted_out: !!patient?.no_auto_sms,
    isLoading: patientQuery.isLoading || officesQuery.isLoading,
  };
}
