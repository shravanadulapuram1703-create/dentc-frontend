// Edit / Add Prescription panel (legacy M11 lower form).
//
// Two modes:
//   • 'add'  — editable draft (Add New). Drug Name can ONLY pick predefined
//              library drugs; selecting one copies its default Dispense/Sig/
//              Refill/As-Written (editable). Provider must be set before Save.
//   • 'view' — a saved prescription, read-only (legacy: a saved Rx cannot be
//              modified or deleted, only struck-off).
//
// Backend gap RX-P1: "Internal Note" has no backend field (single `notes`),
// so it is gated (disabled) in 'add' mode.

import type { RxDraft } from './rxModel';
import { fmtRxDate } from './rxModel';
import type { PrescriptionLibraryRead, ProviderRead, PrescriptionRead } from '@/api/generated/model';

interface Props {
  mode: 'add' | 'view' | 'empty';
  draft: RxDraft;
  selected: PrescriptionRead | null;
  library: PrescriptionLibraryRead[];
  providers: ProviderRead[];
  onChange: (patch: Partial<RxDraft>) => void;
  onPickDrug: (libraryId: number) => void;
}

const labelCls = 'text-xs font-semibold text-slate-600 pt-1.5';
const fieldCls =
  'w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500';

export default function RxEditPanel({
  mode,
  draft,
  selected,
  library,
  providers,
  onChange,
  onPickDrug,
}: Props) {
  const readOnly = mode !== 'add';

  // Display values: draft when adding, the selected row when viewing.
  const v = readOnly
    ? {
        rx_date: selected?.rx_date ?? '',
        drug_name: selected?.drug_name ?? '',
        dispense: selected?.dispense ?? '',
        sig: selected?.sig ?? '',
        refills: selected?.refills ?? 0,
        is_as_written: selected?.is_as_written ?? false,
        provider_id: selected?.provider_id ?? '',
        notes: selected?.notes ?? '',
      }
    : draft;

  const dosespotId = selected?.dosespot_rx_id || '0';

  const providerLabel = (p: ProviderRead) =>
    `${p.short_id ? p.short_id + ' : ' : ''}${p.name}`;

  return (
    <div className="border border-slate-300 rounded-md bg-slate-50">
      <div className="bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700">
        {mode === 'add' ? 'Add Prescription' : 'Edit Prescription'}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2 px-3 py-3">
        {/* ---- Left column ---- */}
        <div className="grid grid-cols-[110px_1fr] items-start gap-x-3 gap-y-2">
          <span className={labelCls}>Prescription Date</span>
          {readOnly ? (
            <div className="px-2 py-1 text-sm text-slate-700">{fmtRxDate(v.rx_date)}</div>
          ) : (
            <input
              type="date"
              className={fieldCls}
              value={draft.rx_date}
              onChange={(e) => onChange({ rx_date: e.target.value })}
            />
          )}

          <span className={labelCls}>Drug Name</span>
          {readOnly ? (
            <div className="px-2 py-1 text-sm font-medium text-slate-800">{v.drug_name}</div>
          ) : (
            <select
              className={fieldCls}
              value={draft.library_rx_id ?? ''}
              onChange={(e) => e.target.value && onPickDrug(Number(e.target.value))}
            >
              <option value="">— Please Select —</option>
              {library.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.drug_name}
                </option>
              ))}
            </select>
          )}

          <span className={labelCls}>Dispense</span>
          {readOnly ? (
            <div className="px-2 py-1 text-sm text-slate-700">{v.dispense}</div>
          ) : (
            <input
              className={fieldCls}
              value={draft.dispense}
              onChange={(e) => onChange({ dispense: e.target.value })}
            />
          )}

          <span className={labelCls}>Sig</span>
          {readOnly ? (
            <div className="px-2 py-1 text-sm text-slate-700 whitespace-pre-wrap">{v.sig}</div>
          ) : (
            <textarea
              rows={2}
              className={fieldCls}
              value={draft.sig}
              onChange={(e) => onChange({ sig: e.target.value })}
            />
          )}

          <span className={labelCls}>Refill</span>
          {readOnly ? (
            <div className="px-2 py-1 text-sm text-slate-700">
              {v.refills} times {v.is_as_written ? '· Dispense As Written' : ''}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                className="w-16 rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                value={draft.refills}
                onChange={(e) => onChange({ refills: Number(e.target.value) || 0 })}
              />
              <span className="text-xs text-slate-500">times</span>
              <label className="flex items-center gap-1 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={draft.is_as_written}
                  onChange={(e) => onChange({ is_as_written: e.target.checked })}
                />
                Dispense As Written
              </label>
            </div>
          )}

          <span className={labelCls}>DoseSpot Patient ID</span>
          <div className="px-2 py-1 text-sm text-slate-500">{dosespotId}</div>
        </div>

        {/* ---- Right column ---- */}
        <div className="grid grid-cols-[120px_1fr] items-start gap-x-3 gap-y-2">
          <span className={labelCls}>Provider</span>
          {readOnly ? (
            <div className="px-2 py-1 text-sm text-slate-700">
              {providers.find((p) => p.id === v.provider_id)
                ? providerLabel(providers.find((p) => p.id === v.provider_id)!)
                : v.provider_id || '—'}
            </div>
          ) : (
            <select
              className={fieldCls}
              value={draft.provider_id}
              onChange={(e) => onChange({ provider_id: e.target.value })}
            >
              <option value="">— Please Select —</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {providerLabel(p)}
                </option>
              ))}
            </select>
          )}

          <span className={labelCls}>Prescription Note</span>
          {readOnly ? (
            <div className="px-2 py-1 text-sm text-slate-700 whitespace-pre-wrap min-h-[2rem]">
              {v.notes}
            </div>
          ) : (
            <textarea
              rows={3}
              className={fieldCls}
              placeholder="Prints on the prescription"
              value={draft.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
            />
          )}

          <span className={labelCls}>Internal Note</span>
          {readOnly ? (
            <div className="px-2 py-1 text-sm text-slate-400 italic">—</div>
          ) : (
            <div>
              <textarea
                rows={3}
                disabled
                className={fieldCls}
                placeholder="Internal note (does not print) — not yet supported by backend"
                title="Backend gap RX-P1: the prescriptions API has a single notes field, so an internal (non-printing) note cannot be saved separately."
                value={draft.internal_note}
                onChange={(e) => onChange({ internal_note: e.target.value })}
              />
              <p className="text-[10px] text-amber-600 mt-0.5">
                Internal Note is disabled (backend gap RX-P1).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
