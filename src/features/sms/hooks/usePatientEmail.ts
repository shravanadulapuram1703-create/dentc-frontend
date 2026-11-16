// React Query wiring for one patient's e-mail log (EMAIL-1).
//
// Mirrors usePatientSms: the log is `GET /api/v1/email-messages?patient_id=`,
// sends go through `POST /api/v1/email/send` (SendGrid; the backend persists
// the row first, so in log-only mode the e-mail is saved as Queued and not
// delivered). Sends render optimistically until the refetch reconciles them.

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
  getEmailGatewayStatus,
  listEmailMessages,
  sendEmail,
} from "@/api/generated/endpoints/communications/communications";
import type { EmailMessageRead } from "@/api/generated/model";
import { rowToEmailEntry, textToEmailHtml, type EmailEntry } from "../emailModel";
import type { SmsMessageType } from "../smsModel";
import { newClientId, SMS_POLL_MS } from "../smsService";
import { describeSendError } from "./usePatientSms";

/** `live` = SendGrid delivers; `log_only` = saved as Queued, nothing is sent. */
export type EmailSendCapability = "live" | "log_only" | "unknown";

export const emailKeys = {
  patient: (patient_id: number) => ["email", "patient", patient_id] as const,
  gateway: ["email", "gateway"] as const,
};

export interface EmailSendArgs {
  to_email: string;
  subject: string;
  body: string;
  message_type: SmsMessageType;
  appointment_id?: string | null;
  office_id: number | null;
  /** Required by the backend for a manual e-mail to a `no_auto_email` patient. */
  override_consent?: boolean;
}

export function usePatientEmail(patient_id: number, enabled = true) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<EmailEntry[]>([]);

  const rowsQuery = useQuery({
    queryKey: emailKeys.patient(patient_id),
    queryFn: async () => (await listEmailMessages({ patient_id, size: 200 })).items ?? [],
    enabled: enabled && Number.isFinite(patient_id) && patient_id > 0,
    refetchInterval: SMS_POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });

  const gatewayQuery = useQuery<EmailSendCapability>({
    queryKey: emailKeys.gateway,
    queryFn: async () => ((await getEmailGatewayStatus()).configured ? "live" : "log_only"),
    staleTime: Infinity,
    retry: false,
  });

  const entries = useMemo(() => {
    const rows: EmailMessageRead[] = rowsQuery.data ?? [];
    return [...rows.map(rowToEmailEntry), ...pending].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime() || a.row_id - b.row_id,
    );
  }, [rowsQuery.data, pending]);

  const sendMutation = useMutation({
    mutationFn: (args: EmailSendArgs & { client_id: string }) =>
      sendEmail({
        patient_id,
        office_id: args.office_id,
        appointment_id: args.appointment_id ?? null,
        to_email: args.to_email,
        subject: args.subject,
        body_text: args.body,
        body_html: textToEmailHtml(args.body),
        message_type: args.message_type,
        client_id: args.client_id,
        override_consent: !!args.override_consent,
      }),
  });

  const send = useCallback(
    async (args: EmailSendArgs): Promise<EmailMessageRead | null> => {
      const client_id = newClientId();
      const key = `email:tmp:${client_id}`;
      const optimistic: EmailEntry = {
        key,
        row_id: -1,
        to_email: args.to_email,
        subject: args.subject,
        body: args.body,
        status: "sending",
        raw_status: null,
        message_type: args.message_type,
        at: new Date().toISOString(),
        appointment_id: args.appointment_id ?? null,
        optimistic: true,
      };
      setPending((p) => [...p, optimistic]);
      try {
        const row = await sendMutation.mutateAsync({ ...args, client_id });
        await qc.invalidateQueries({ queryKey: emailKeys.patient(patient_id) });
        setPending((p) => p.filter((x) => x.key !== key));
        return row;
      } catch (err) {
        const message = describeSendError(err);
        // A SendGrid rejection (502) is persisted server-side as `failed` — the
        // refetch shows that row, so drop the optimistic copy instead of doubling it.
        // Validation/consent errors (4xx) persist nothing: keep a failed local copy.
        if (isAxiosError(err) && err.response?.status === 502) {
          await qc.invalidateQueries({ queryKey: emailKeys.patient(patient_id) });
          setPending((p) => p.filter((x) => x.key !== key));
        } else {
          setPending((p) =>
            p.map((x) => (x.key === key ? { ...x, status: "failed", error: message, optimistic: false } : x)),
          );
        }
        toast.error(`Email not sent: ${message}`);
        return null;
      }
    },
    [patient_id, qc, sendMutation],
  );

  const dismissFailed = useCallback((key: string) => {
    setPending((p) => p.filter((x) => x.key !== key));
  }, []);

  return {
    entries,
    isLoading: rowsQuery.isLoading,
    isFetching: rowsQuery.isFetching,
    error: rowsQuery.error,
    refetch: rowsQuery.refetch,
    capability: gatewayQuery.data ?? "unknown",
    send,
    sending: sendMutation.isPending,
    dismissFailed,
  };
}
