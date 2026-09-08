// One refresh seam for every screen that shows a patient's procedures.
//
// Four screens render the same clinical/financial facts from different stores:
//   Transactions Entry  /patient/:id/transaction      patient-procedures (charges)
//   Account Ledger      /patient/:id/account-ledger   account-ledger feed (charges + payments)
//   Restorative Chart   /patient/:id/restorative      chart-conditions + patient-procedures + plan items
//   Treatment Plan      /patient/:id/treatment        treatment-plans + treatment-plan-items
//
// Every write in `procedureEntryService.ts` ends with `announceProcedureChange`,
// which (1) invalidates every react-query cache that holds procedure / plan /
// ledger data for the patient, (2) raises a window event so screens that fetch
// by hand (Transactions, Ledger) can bump their reload key, and (3) broadcasts
// to the other browser tabs so a chart open beside the ledger refreshes too.
//
// Screens subscribe with `useProcedureSync(patient_id, onChange)`.

import { useEffect, useRef } from 'react';
import { queryClient } from '@/shared/config/queryClient';

export type ProcedureChangeKind = 'procedure' | 'plan_item' | 'plan' | 'condition' | 'payment';

export interface ProcedureChange {
  patient_id: number;
  /** Which stores changed. Treat an empty/missing list as "everything". */
  kinds: ProcedureChangeKind[];
  /** Sender tab, so a tab can ignore its own cross-tab echo. */
  origin: string;
}

export const PROCEDURE_CHANGED_EVENT = 'dentc:procedures-changed';
const CHANNEL_NAME = 'dentc:procedures';

const TAB_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tab-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

let channel: BroadcastChannel | null | undefined;
function getChannel(): BroadcastChannel | null {
  if (channel !== undefined) return channel;
  try {
    channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
  } catch {
    channel = null;
  }
  return channel;
}

/**
 * Does this react-query key hold data that changes when a procedure is added,
 * planned, posted or edited for `patient_id`? Matches the generated Orval keys
 * (`['/api/v1/<resource>', params]`) plus the hand-rolled keys some screens use.
 */
export function isProcedureQueryKey(key: readonly unknown[], patient_id: number): boolean {
  const head = key[0];
  if (typeof head !== 'string') return false;
  if (head.startsWith('/api/v1/patient-procedures')) return true;
  if (head.startsWith('/api/v1/treatment-plan')) return true; // treatment-plans + treatment-plan-items
  if (head.startsWith('/api/v1/chart-conditions')) return true;
  if (head.startsWith('/api/v1/patient-payments') || head.startsWith('/api/v1/patient-adjustments')) return true;
  if (head.startsWith('/api/v1/insurance-claims')) return true;
  // Patient-scoped feeds: account-ledger, ledger, balance, treatment-plan-items, chart.
  if (head.startsWith(`/api/v1/patients/${patient_id}/`)) return true;
  // Screen-local keys.
  if (head === 'tx-plan-items' || head === 'listTreatmentPlans') return true;
  return false;
}

/** Invalidate every cached query that shows this patient's procedures. */
export function invalidateProcedureQueries(patient_id: number): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (q) => isProcedureQueryKey(q.queryKey as readonly unknown[], patient_id),
  });
}

/**
 * Tell every open screen (this tab and the others) that the patient's
 * procedures changed. Safe to call after any write; cheap when nothing listens.
 */
export function announceProcedureChange(change: { patient_id: number; kinds?: ProcedureChangeKind[] }): void {
  const msg: ProcedureChange = { patient_id: change.patient_id, kinds: change.kinds ?? [], origin: TAB_ID };
  void invalidateProcedureQueries(msg.patient_id);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<ProcedureChange>(PROCEDURE_CHANGED_EVENT, { detail: msg }));
  }
  try {
    getChannel()?.postMessage(msg);
  } catch {
    /* channel closed / clone failure — same-tab refresh already happened */
  }
}

/**
 * Subscribe a screen to procedure changes for one patient. React-query screens
 * need no callback (their caches are invalidated for them); screens that fetch
 * by hand pass their `refresh` so they reload too. Also catches changes made in
 * another browser tab.
 */
export function useProcedureSync(
  patient_id: number | null | undefined,
  onChange?: (change: ProcedureChange) => void,
): void {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    if (patient_id == null || Number.isNaN(patient_id)) return;
    const handle = (c: ProcedureChange | undefined) => {
      if (!c || c.patient_id !== patient_id) return;
      cbRef.current?.(c);
    };
    const onWindow = (e: Event) => handle((e as CustomEvent<ProcedureChange>).detail);
    window.addEventListener(PROCEDURE_CHANGED_EVENT, onWindow);

    const ch = getChannel();
    const onMessage = (e: MessageEvent<ProcedureChange>) => {
      const c = e.data;
      if (!c || c.origin === TAB_ID || c.patient_id !== patient_id) return;
      // Another tab wrote: refresh our caches, then let the screen reload.
      void invalidateProcedureQueries(patient_id);
      handle(c);
    };
    ch?.addEventListener('message', onMessage);

    return () => {
      window.removeEventListener(PROCEDURE_CHANGED_EVENT, onWindow);
      ch?.removeEventListener('message', onMessage);
    };
  }, [patient_id]);
}
