// Lab catalog (Setup → Lab Tracking → Labs) — thin service over the generated
// Orval client for /api/v1/labs (tag: Appointments). Snake_case bodies pass
// through unchanged. DELETE is a soft delete (is_active=false). Duplicate
// names are refused with 409 `duplicate_lab_name` unless
// `allow_duplicate_name: true` is sent (the same lab in two states is
// legitimate) — the screen asks before retrying.

import {
  listLabs,
  createLab,
  updateLab,
  deleteLab,
  getLabNameAvailability,
} from "@/api/generated/endpoints/appointments/appointments";
import type { LabCreate, LabRead, LabUpdate, LabNameAvailability } from "@/api/generated/model";

const PAGE_SIZE = 200;

/** Every lab (active + inactive), paging past the 200/row server cap. */
export async function listAllLabs(): Promise<LabRead[]> {
  const first = await listLabs({ page: 1, size: PAGE_SIZE, sort: "name", order: "asc" });
  const items = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        listLabs({ page: i + 2, size: PAGE_SIZE, sort: "name", order: "asc" }),
      ),
    );
    for (const res of rest) items.push(...(res.items ?? []));
  }
  return items;
}

export function createLabVendor(body: LabCreate): Promise<LabRead> {
  return createLab(body);
}

export function updateLabVendor(id: number, body: LabUpdate): Promise<LabRead> {
  return updateLab(id, body);
}

/** Soft delete → is_active=false. */
export function deactivateLabVendor(id: number): Promise<void> {
  return deleteLab(id);
}

export function checkLabName(name: string, excludeId?: number): Promise<LabNameAvailability> {
  return getLabNameAvailability({ name, exclude_id: excludeId ?? null });
}

/** True when an axios error is the 409 duplicate-name refusal. */
export function isDuplicateLabName(err: unknown): boolean {
  // Wire shape: 409 {error:{code:"conflict", details:{code:"duplicate_lab_name", matches:[…]}}}
  const e = err as {
    response?: { status?: number; data?: { error?: { code?: string; details?: { code?: string } | null } } };
  };
  if (e?.response?.status !== 409) return false;
  const error = e.response?.data?.error;
  return error?.code === "duplicate_lab_name" || error?.details?.code === "duplicate_lab_name";
}

/** Backend error message (code-aware) for toasts. */
export function labErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: { code?: string; message?: string; details?: unknown } } } };
  const error = e?.response?.data?.error;
  if (!error) return err instanceof Error ? err.message : fallback;
  if (error.code === "validation_error") {
    const d = error.details as { loc?: unknown[]; msg?: string }[] | undefined;
    const first = d?.[0];
    if (first?.loc?.length) return `${String(first.loc[first.loc.length - 1])}: ${first.msg ?? "invalid value"}`;
  }
  return error.message || fallback;
}
