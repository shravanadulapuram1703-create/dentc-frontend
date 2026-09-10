// Letters — the legacy "Letters (New)" dialog.
//
// Reproduces the legacy modal: an Envelope Printing checkbox, a "Select Letter
// Group" dropdown, a "Select Letter" dropdown, and — for the Patient Consent
// group only — a "Signature Type" dropdown, over a Print / Preview + Cancel
// footer.
//
// Two controls legacy did not have, each because a legacy binding does not
// exist here:
//   · Signing Provider — the consent bodies name the doctor via `#APPT_PRDR#`
//     (most of them) or `#DOC_LAST_NAME#`, which legacy took from the
//     workstation's logged-in dentist. The picker offers every active provider
//     in the tenant and overrides both tokens — see mergeFields.ts.
//   · Treatment Plan — shown only for the one template that interpolates
//     `#TX_PLAN_TH_NUMBER#`, which the backend binds from `treatment_plan_id`
//     (LTR-4) and otherwise prints blank rather than guessing a tooth.

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, Loader2 } from 'lucide-react';
import type { LetterTemplateRead } from '@/api/generated/model';
import { useProviderDirectory } from '@/hooks/useProviderDirectory';
import { useGetPatient } from '@/api/generated/endpoints/patients/patients';
import { providerOptionLabel } from '@/services/providerDirectory';
import Modal, {
  Field,
  input_class,
  PrimaryButton,
  SecondaryButton,
} from '@/features/patient-overview/Modal';
import { today_iso } from '@/features/patient-overview/format';
import {
  CONSENT_GROUP,
  OTHER_GROUP,
  SIGNATURE_TYPES,
  build_group_catalog,
  group_code_of,
  letter_file_name,
  type LetterGroupCode,
  type SignatureType,
} from './lettersModel';
import { merge_letter, tokens_in } from './mergeFields';
import { parse_letter_html } from './letterHtml';
import { build_letter_pdf } from './letterPdf';
import {
  lettersKeys,
  loadGroupDefinitions,
  loadLetterContext,
  loadMergeCatalog,
  loadOfficeLetterTemplates,
  loadTreatmentPlans,
} from './lettersService';
import type { GeneratedLetter } from './LetterPreviewModal';

/** Stable identity so the memos below don't recompute on every render. */
const NO_TEMPLATES: LetterTemplateRead[] = [];
/** Reference data — the catalog and the group labels barely ever change. */
const REF_STALE_MS = 30 * 60 * 1000;

interface Props {
  patient_id: number;
  office_id: number | null;
  patient_name: string;
  onClose: () => void;
  onGenerated: (letter: GeneratedLetter) => void;
}

export default function LetterDialog({
  patient_id,
  office_id,
  patient_name,
  onClose,
  onGenerated,
}: Props) {
  const [group, setGroup] = useState<LetterGroupCode>(CONSENT_GROUP);
  const [template_id, setTemplateId] = useState<number | null>(null);
  const [envelope, setEnvelope] = useState(false);
  const [signature_type, setSignatureType] = useState<SignatureType>('dentist');
  const [signer_id, setSignerId] = useState<string>('');
  const [plan_id, setPlanId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  // providerName (bare) goes into the letter body — patient-facing text never
  // carries the provider id; the signer picker below uses the "Name (ID)" label.
  const { providers, allProviders, providerName } = useProviderDirectory(office_id);

  const templates_query = useQuery({
    queryKey: lettersKeys.officeTemplates(office_id),
    queryFn: () => loadOfficeLetterTemplates(office_id),
    staleTime: 5 * 60 * 1000,
  });
  const group_defs_query = useQuery({
    queryKey: lettersKeys.groupDefs,
    queryFn: loadGroupDefinitions,
    staleTime: REF_STALE_MS,
  });
  const catalog_query = useQuery({
    queryKey: lettersKeys.mergeFields,
    queryFn: loadMergeCatalog,
    staleTime: REF_STALE_MS,
  });

  const templates = templates_query.data?.rows ?? NO_TEMPLATES;
  const group_catalog = useMemo(
    () => build_group_catalog(group_defs_query.data),
    [group_defs_query.data],
  );

  /** Only groups that actually have letters appear, in the seeded sort order. */
  const groups = useMemo(() => {
    const counts = new Map<LetterGroupCode, number>();
    for (const t of templates) {
      const g = group_code_of(t);
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([code, count]) => ({
        code,
        count,
        label: code === OTHER_GROUP ? 'Other Letters' : group_catalog.label(code),
        sort: code === OTHER_GROUP ? 999 : group_catalog.order(code),
      }))
      .sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label));
  }, [templates, group_catalog]);

  const in_group = useMemo(
    () => templates.filter((t) => group_code_of(t) === group),
    [templates, group],
  );

  useEffect(() => {
    const first = groups[0];
    if (!first) return;
    if (!groups.some((g) => g.code === group)) setGroup(first.code);
  }, [groups, group]);

  useEffect(() => {
    setTemplateId(in_group[0]?.id ?? null);
  }, [in_group]);

  const selected: LetterTemplateRead | undefined = in_group.find((t) => t.id === template_id);
  const is_consent = group === CONSENT_GROUP;

  /** Which tokens this template uses, and therefore what the render needs. */
  const needs = useMemo(() => {
    const catalog = catalog_query.data;
    const used = tokens_in(selected?.body_html ?? '');
    return {
      used,
      balance: catalog ? used.some((t) => catalog.needs_balance.has(t)) : false,
      treatment_plan: catalog ? used.some((t) => catalog.needs_treatment_plan.has(t)) : false,
    };
  }, [selected, catalog_query.data]);

  const plans_query = useQuery({
    queryKey: lettersKeys.treatmentPlans(patient_id),
    queryFn: () => loadTreatmentPlans(patient_id),
    enabled: needs.treatment_plan,
    staleTime: 60 * 1000,
  });

  // Every active provider in the tenant is a valid signer — a consent form is
  // frequently signed by a dentist who is not assigned to the office the patient
  // is being seen in. The office's own providers are listed first so the
  // default matches the office, but nobody is hidden.
  const signer_groups = useMemo(() => {
    const office_ids = new Set(providers.map((p) => p.id));
    const active = allProviders.filter((p) => p.is_active);
    const in_office = active.filter((p) => office_ids.has(p.id));
    const others = active.filter((p) => !office_ids.has(p.id));
    return { in_office, others };
  }, [providers, allProviders]);

  // The patient's preferred provider signs by default (legacy took the
  // workstation dentist); fall back to the first office provider, then anyone.
  const patient_query = useGetPatient(patient_id, { query: { enabled: patient_id > 0 } });
  const preferred_provider_id = patient_query.data?.preferred_provider_id ?? '';
  const default_signer = useMemo(() => {
    const all = [...signer_groups.in_office, ...signer_groups.others];
    if (preferred_provider_id && all.some((p) => p.id === preferred_provider_id)) return preferred_provider_id;
    return signer_groups.in_office[0]?.id ?? signer_groups.others[0]?.id ?? '';
  }, [signer_groups, preferred_provider_id]);
  useEffect(() => {
    if (!signer_id && default_signer) setSignerId(default_signer);
  }, [default_signer, signer_id]);

  const onPrintPreview = async () => {
    const catalog = catalog_query.data;
    if (!selected || !catalog) {
      toast.error('Select a letter first.');
      return;
    }
    setBusy(true);
    try {
      const signer = allProviders.find((p) => p.id === signer_id) ?? null;

      // One call for the whole merge context (LTR-6). The balance aggregate is
      // the slow one, so it is requested only when the template needs it.
      const context = await loadLetterContext({
        patient_id,
        office_id,
        treatment_plan_id: needs.treatment_plan && plan_id ? plan_id : null,
        include_balance: needs.balance,
      });

      const merged = merge_letter(
        selected.body_html ?? '',
        (context.merge_fields ?? {}) as Record<string, string>,
        catalog.names,
        {
          context,
          signer_name: signature_type === 'none' ? '' : (signer?.name ?? ''),
          signer_is_dentist: signature_type === 'dentist',
          provider_label: providerName,
          local_today: fmt_local_today(),
        },
      );

      const blocks = parse_letter_html(merged.html);
      if (blocks.length === 0) {
        toast.error('This letter has no content to print.');
        return;
      }

      const office_name = context.office?.name ?? '';
      const doc = build_letter_pdf(
        blocks,
        {
          patient_name,
          patient_id,
          office_name,
          printed_on: fmt_local_today(),
          letter_name: selected.name,
        },
        {
          envelope_printing: envelope,
          is_consent,
          signature_type,
          signer_name: signature_type === 'none' ? '' : (signer?.name ?? ''),
          fallback_from: envelope_lines_from(context),
          fallback_to: envelope_lines_to(context),
        },
      );

      onGenerated({
        template: selected,
        is_consent,
        blocks,
        doc,
        unresolved: merged.unresolved,
        unknown: merged.unknown,
        file_name: letter_file_name(selected.name, patient_id, today_iso()),
        envelope_printing: envelope,
        signature_type,
        signer_name: signer?.name ?? '',
      });
    } catch (err) {
      console.error(err);
      toast.error('Could not generate the letter.');
    } finally {
      setBusy(false);
    }
  };

  const loading_ref = templates_query.isLoading || catalog_query.isLoading;

  return (
    <Modal title="Letters (New)" on_close={onClose} width="max-w-xl">
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm text-[#1E293B]">
          <input
            type="checkbox"
            checked={envelope}
            onChange={(e) => setEnvelope(e.target.checked)}
            className="h-4 w-4 accent-[#3A6EA5]"
          />
          Envelope Printing
        </label>

        <Field label="Select Letter Group">
          <select
            className={input_class}
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            disabled={loading_ref}
          >
            {groups.length === 0 && <option value="">Loading…</option>}
            {groups.map((g) => (
              <option key={g.code} value={g.code}>
                {g.label} ({g.count})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Select Letter">
          <select
            className={input_class}
            value={template_id ?? ''}
            onChange={(e) => setTemplateId(Number(e.target.value) || null)}
            disabled={in_group.length === 0}
          >
            {in_group.length === 0 && <option value="">No letters in this group</option>}
            {in_group.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>

        {is_consent && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Signature Type">
              <select
                className={input_class}
                value={signature_type}
                onChange={(e) => setSignatureType(e.target.value as SignatureType)}
              >
                {SIGNATURE_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Signing Provider">
              <select
                className={input_class}
                value={signer_id}
                onChange={(e) => setSignerId(e.target.value)}
                disabled={signature_type === 'none'}
              >
                <option value="">— none —</option>
                {signer_groups.in_office.length > 0 && signer_groups.others.length > 0 ? (
                  <>
                    <optgroup label="This office">
                      {signer_groups.in_office.map((p) => (
                        <option key={p.id} value={p.id}>
                          {providerOptionLabel(p)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="All providers">
                      {signer_groups.others.map((p) => (
                        <option key={p.id} value={p.id}>
                          {providerOptionLabel(p)}
                        </option>
                      ))}
                    </optgroup>
                  </>
                ) : (
                  [...signer_groups.in_office, ...signer_groups.others].map((p) => (
                    <option key={p.id} value={p.id}>
                      {providerOptionLabel(p)}
                    </option>
                  ))
                )}
              </select>
            </Field>
          </div>
        )}

        {needs.treatment_plan && (
          <Field label="Treatment Plan">
            <select
              className={input_class}
              value={plan_id}
              onChange={(e) => setPlanId(e.target.value)}
            >
              <option value="">— none (tooth numbers print blank) —</option>
              {(plans_query.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || `Plan ${p.id}`}
                  {p.item_count ? ` · ${p.item_count} item(s)` : ''}
                </option>
              ))}
            </select>
          </Field>
        )}

        {templates_query.data?.scoped && (
          <p className="text-[11px] text-[#64748B]">
            Showing the letters assigned to this office.
          </p>
        )}

        {selected && !selected.body_html && (
          <p className="text-[11px] text-[#B45309]">
            This template has no body text; the printed letter will be empty.
          </p>
        )}
      </div>

      <div className="mt-5 flex justify-center gap-2 border-t-2 border-[#E2E8F0] pt-4">
        <PrimaryButton onClick={onPrintPreview} disabled={busy || !selected || loading_ref}>
          {busy ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Working…
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Print / Preview
            </span>
          )}
        </PrimaryButton>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
      </div>
    </Modal>
  );
}

/** MM/DD/YYYY in the workstation's local date — see LTR-14 in mergeFields.ts. */
function fmt_local_today(): string {
  const [y, m, d] = today_iso().split('-');
  return `${m}/${d}/${y}`;
}

type Ctx = Awaited<ReturnType<typeof loadLetterContext>>;

/** Return address for the envelope when the template has no `dvfrom` block. */
function envelope_lines_from(ctx: Ctx): string[] {
  const o = ctx.office;
  if (!o) return [];
  return [
    o.name,
    [o.address_line1, o.address_line2].filter(Boolean).join(', '),
    `${[o.city, o.state].filter(Boolean).join(', ')}${o.zip ? ` ${o.zip}` : ''}`,
  ].filter((l) => l.trim().length > 0);
}

/** Recipient address for the envelope when the template has no `dvto` block. */
function envelope_lines_to(ctx: Ctx): string[] {
  const p = ctx.patient;
  const name = [p.first_name, p.middle_initial, p.last_name].filter(Boolean).join(' ');
  return [
    name,
    [p.address_line1, p.address_line2].filter(Boolean).join(', '),
    `${[p.city, p.state].filter(Boolean).join(', ')}${p.zip ? ` ${p.zip}` : ''}`,
  ].filter((l) => l.trim().length > 0);
}
