// React Query wiring for one patient's SMS thread.
//
// - Polls the log every SMS_POLL_MS while the tab is visible so replies and
//   Twilio delivery-status updates (written by backend webhooks) show up
//   without a reload. Push (WebSocket/SSE) is gap SMS-4.
// - Sends render optimistically (`optimistic: true`) and are reconciled by
//   the refetch that follows the mutation.

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import type { SmsMessageRead } from "@/api/generated/model";
import { useAuth } from "@/contexts/AuthContext";
import { computeStats, rowsToEntries, type SmsEntry, type SmsMessageType } from "../smsModel";
import { getSmsTransport, newClientId, SMS_POLL_MS } from "../smsService";
import type { SmsSendCapability } from "../transport/types";

export const smsKeys = {
  patient: (patient_id: number) => ["sms", "patient", patient_id] as const,
  capability: ["sms", "capability"] as const,
};

export interface SendArgs {
  body: string;
  to_phone: string;
  message_type: SmsMessageType;
  appointment_id?: string | null;
  office_id: number | null;
}

interface PendingSend {
  client_id: string;
  entry: SmsEntry;
}

/**
 * Turn a failed send into the sentence the backend meant. The gateway answers
 * `{ error: { code, message, details } }` (e.g. `sms_quiet_hours` with
 * `details.next_allowed_at`), FastAPI validation answers `{ detail: [...] }`.
 */
export function describeSendError(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as
      | { error?: { code?: string; message?: string; details?: { next_allowed_at?: string } }; detail?: unknown }
      | undefined;
    const e = data?.error;
    if (e?.message) {
      const next = e.details?.next_allowed_at;
      const when = next ? ` Next allowed: ${new Date(next).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}.` : "";
      return `${e.message}.${when}`.replace("..", ".");
    }
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) {
      return (data.detail as { msg?: string; loc?: unknown[] }[])
        .map((d) => `${(d.loc ?? []).slice(-1)[0] ?? "field"}: ${d.msg ?? "invalid"}`)
        .join("; ");
    }
    if (err.response?.status) return `Request failed (${err.response.status})`;
  }
  return err instanceof Error ? err.message : "Send failed";
}

export function usePatientSms(patient_id: number, enabled = true) {
  const qc = useQueryClient();
  const transport = getSmsTransport();
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingSend[]>([]);

  const rowsQuery = useQuery({
    queryKey: smsKeys.patient(patient_id),
    queryFn: () => transport.listForPatient(patient_id),
    enabled: enabled && Number.isFinite(patient_id) && patient_id > 0,
    refetchInterval: SMS_POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });

  const capabilityQuery = useQuery<SmsSendCapability>({
    queryKey: smsKeys.capability,
    queryFn: () => transport.getSendCapability(),
    staleTime: Infinity,
  });

  const rows = useMemo(() => rowsQuery.data ?? [], [rowsQuery.data]);

  const entries = useMemo(() => {
    const persisted = rowsToEntries(rows);
    if (pending.length === 0) return persisted;
    return [...persisted, ...pending.map((p) => p.entry)].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
  }, [rows, pending]);

  const stats = useMemo(() => computeStats(entries), [entries]);

  const sendMutation = useMutation({
    mutationFn: async (args: SendArgs & { client_id: string }) =>
      transport.send({
        patient_id,
        office_id: args.office_id,
        appointment_id: args.appointment_id ?? null,
        to_phone: args.to_phone,
        body: args.body,
        message_type: args.message_type,
        created_by: user?.id ? Number(user.id) : null,
        client_id: args.client_id,
      }),
  });

  const send = useCallback(
    async (args: SendArgs): Promise<SmsMessageRead | null> => {
      const client_id = newClientId();
      const optimistic: SmsEntry = {
        key: `tmp:${client_id}`,
        row_id: -1,
        direction: "outbound",
        body: args.body,
        phone: args.to_phone,
        status: "sending",
        raw_status: null,
        message_type: args.message_type,
        raw_message_type: args.message_type,
        at: new Date().toISOString(),
        is_read: true,
        appointment_id: args.appointment_id ?? null,
        office_id: args.office_id,
        patient_id,
        legacy_id: null,
        created_by: user?.id ? Number(user.id) : null,
        optimistic: true,
      };
      setPending((p) => [...p, { client_id, entry: optimistic }]);
      try {
        const row = await sendMutation.mutateAsync({ ...args, client_id });
        await qc.invalidateQueries({ queryKey: smsKeys.patient(patient_id) });
        setPending((p) => p.filter((x) => x.client_id !== client_id));
        return row;
      } catch (err) {
        const message = describeSendError(err);
        setPending((p) =>
          p.map((x) =>
            x.client_id === client_id
              ? { ...x, entry: { ...x.entry, status: "failed", error: message, optimistic: false } }
              : x,
          ),
        );
        toast.error(`Text not sent: ${message}`);
        return null;
      }
    },
    [patient_id, qc, sendMutation, user?.id],
  );

  const dismissFailed = useCallback((key: string) => {
    setPending((p) => p.filter((x) => x.entry.key !== key));
  }, []);

  const readMutation = useMutation({
    mutationFn: ({ row_id, is_read }: { row_id: number; is_read: boolean }) =>
      transport.markRead(row_id, is_read),
    onSuccess: () => qc.invalidateQueries({ queryKey: smsKeys.patient(patient_id) }),
  });

  const markRead = useCallback(
    (row_id: number, is_read = true) => readMutation.mutateAsync({ row_id, is_read }),
    [readMutation],
  );

  const markAllRead = useCallback(async () => {
    const unread = rows.filter((r) => !!r.reply_text && !r.is_read);
    if (unread.length === 0) return;
    await Promise.all(unread.map((r) => transport.markRead(r.id, true)));
    await qc.invalidateQueries({ queryKey: smsKeys.patient(patient_id) });
  }, [rows, transport, qc, patient_id]);

  const simulateInbound = useCallback(
    async (from_phone: string, body: string) => {
      if (!transport.simulateInbound) return;
      await transport.simulateInbound(patient_id, from_phone, body);
      await qc.invalidateQueries({ queryKey: smsKeys.patient(patient_id) });
    },
    [transport, patient_id, qc],
  );

  return {
    rows,
    entries,
    stats,
    isLoading: rowsQuery.isLoading,
    isFetching: rowsQuery.isFetching,
    error: rowsQuery.error,
    refetch: rowsQuery.refetch,
    capability: capabilityQuery.data ?? "unknown",
    mode: transport.mode,
    canSimulate: !!transport.simulateInbound,
    send,
    sending: sendMutation.isPending,
    dismissFailed,
    markRead,
    markAllRead,
    simulateInbound,
  };
}

export type PatientSms = ReturnType<typeof usePatientSms>;
