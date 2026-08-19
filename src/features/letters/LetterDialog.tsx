// Letters — the legacy "Letters (New)" dialog.
//
// Reproduces the legacy modal exactly: an Envelope Printing checkbox, a
// "Select Letter Group" dropdown, a "Select Letter" dropdown, and — for the
// Patient Consent group only — a "Signature Type" dropdown, over a
// Print / Preview + Cancel footer.
//
// One addition over legacy: when a consent form is selected we also offer a
// Signing Provider picker. The seeded consent bodies interpolate
// `#DOC_LAST_NAME#`, and legacy filled it from the workstation's logged-in
// dentist; DentC has no such binding, so the provider is chosen explicitly and
// defaults to the patient's preferred provider.

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, Loader2 } from 'lucide-react';
import type { LetterTemplateRead } from '@/api/generated/model';
import { useProviderDirectory } from '@/hooks/useProviderDirectory';
import Modal, {
  Field,
  input_class,
  PrimaryButton,
  SecondaryButton,
} from '@/features/patient-overview/Modal';
import {
  BLANK_SELECTION,
  CONSENT_GROUP,
  LETTER_GROUPS,
  SIGNATURE_TYPES,
  group_code_of,
  group_label,
  letter_file_name,
  type LetterGroupCode,
  type SignatureType,
} from './lettersModel';
import { today_iso } from '@/features/patient-overview/format';
import { merge_letter, tokens_in } from './mergeFields';
import { parse_letter_html } from './letterHtml';
import { build_letter_pdf } from './letterPdf';
import {
  buildLetterContext,
  lettersKeys,
  loadOfficeLetterTemplates,
} from './lettersService';
import type { GeneratedLetter } from './LetterPreviewModal';

/** Stable identity so the memos below don't recompute on every render. */
const NO_TEMPLATES: LetterTemplateRead[] = [];

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
  const [group, setGroup] = useState<LetterGroupCode>(BLANK_SELECTION.group);
  const [template_id, setTemplateId] = useState<number | null>(null);
  const [envelope, setEnvelope] = useState(false);
  const [signature_type, setSignatureType] = useState<SignatureType>('dentist');
  const [signer_id, setSignerId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const { providers, allProviders, providerLabel } = useProviderDirectory(office_id);

  const templates_query = useQuery({
    queryKey: lettersKeys.officeTemplates(office_id),
    queryFn: () => loadOfficeLetterTemplates(office_id),
    staleTime: 5 * 60 * 1000,
  });
  const templates = templates_query.data?.rows ?? NO_TEMPLATES;

  /** Only groups that actually have letters appear, in catalog order. */
  const groups = useMemo(() => {
    const counts = new Map<LetterGroupCode, number>();
    for (const t of templates) {
      const g = group_code_of(t);
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    const ordered: Array<{ code: LetterGroupCode; label: string; count: number }> = [];
    for (const g of LETTER_GROUPS) {
      const n = counts.get(g.code as LetterGroupCode);
      if (n) ordered.push({ code: g.code as LetterGroupCode, label: g.label, count: n });
    }
    const other = counts.get('OTHER');
    if (other) ordered.push({ code: 'OTHER', label: group_label('OTHER'), count: other });
    return ordered;
  }, [templates]);

  const in_group = useMemo(
    () => templates.filter((t) => group_code_of(t) === group),
    [templates, group],
  );

  // Keep the group valid once the catalog loads, and always preselect the first
  // letter in the group the way the legacy dropdown did.
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

  // Default the signing provider to the patient's preferred provider.
  const default_signer = useMemo(
    () => providers[0]?.id ?? allProviders[0]?.id ?? '',
    [providers, allProviders],
  );
  useEffect(() => {
    if (!signer_id && default_signer) setSignerId(default_signer);
  }, [default_signer, signer_id]);

  const onPrintPreview = async () => {
    if (!selected) {
      toast.error('Select a letter first.');
      return;
    }
    setBusy(true);
    try {
      const body = selected.body_html ?? '';
      const needed = new Set(tokens_in(body).map((t) => t.toUpperCase()));
      const signer =
        allProviders.find((p) => p.id === signer_id) ?? null;

      const { ctx, envelope_from, envelope_to, office_name } = await buildLetterContext({
        patient_id,
        office_id,
        signer: signer ? { name: signer.name } : null,
        provider_label: providerLabel,
        needed_tokens: needed,
      });

      const merged = merge_letter(body, ctx);
      const blocks = parse_letter_html(merged.html);
      if (blocks.length === 0) {
        toast.error('This letter has no content to print.');
        return;
      }

      const printed_on = ctx.today_date;
      const doc = build_letter_pdf(
        blocks,
        {
          patient_name,
          patient_id,
          office_name,
          printed_on,
          letter_name: selected.name,
        },
        {
          envelope_printing: envelope,
          is_consent,
          signature_type,
          signer_name: signer?.name ?? '',
          fallback_from: envelope_from,
          fallback_to: envelope_to,
        },
      );

      onGenerated({
        template: selected,
        is_consent,
        blocks,
        doc,
        unresolved: merged.unresolved,
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
            onChange={(e) => setGroup(e.target.value as LetterGroupCode)}
            disabled={templates_query.isLoading}
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
                {(providers.length ? providers : allProviders).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {templates_query.data && !templates_query.data.scoped && office_id != null && (
          <p className="text-[11px] text-[#64748B]">
            No letters are assigned to this office yet — showing the full tenant catalog.
          </p>
        )}

        {selected?.body_html ? null : selected ? (
          <p className="text-[11px] text-[#B45309]">
            This template has no body text; the printed letter will be empty.
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex justify-center gap-2 border-t-2 border-[#E2E8F0] pt-4">
        <PrimaryButton onClick={onPrintPreview} disabled={busy || !selected}>
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
