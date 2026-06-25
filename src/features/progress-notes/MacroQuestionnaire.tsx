// "Please complete below questionnaire" popup.
//
// Renders one row per macro field (see macroTemplate.ts). Options come from:
//   • inline "/"-separated lists, rendered as a multi-select listbox (Ctrl/⌘ to
//     pick more than one), OR
//   • a named pick list (questionnaire-header matched by description) — single
//     <select> when the header is single-select, multi listbox otherwise.
// Fields whose source resolves to nothing fall back to a free-text input.
// Mandatory fields (red asterisk) must be answered before "Add Note".

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { listAllPickLists, listPickListItems } from '@/components/setup/pick-list/pickListService';
import type { MacroField } from './macroTemplate';

interface ResolvedField extends MacroField {
  options: string[];
  multi: boolean;
  freeText: boolean;
}

interface MacroQuestionnaireProps {
  macroName: string;
  fields: MacroField[];
  /** Prefilled free-text answers by field key (e.g. tooth-number prompts). */
  defaults?: Record<string, string>;
  onSubmit: (answers: Record<string, string>) => void;
  onCancel: () => void;
}

export default function MacroQuestionnaire({
  macroName,
  fields,
  defaults,
  onSubmit,
  onCancel,
}: MacroQuestionnaireProps) {
  const [resolved, setResolved] = useState<ResolvedField[] | null>(null);
  const [values, setValues] = useState<Record<string, string[]>>({});
  const [text, setText] = useState<Record<string, string>>(() => ({ ...defaults }));
  const [error, setError] = useState(false);

  // Resolve pick-list-backed fields once on open.
  useEffect(() => {
    let alive = true;
    (async () => {
      let headers: Awaited<ReturnType<typeof listAllPickLists>> = [];
      const needsLookup = fields.some((f) => f.picklistName);
      if (needsLookup) {
        try {
          headers = await listAllPickLists();
        } catch {
          headers = [];
        }
      }
      const byDesc = new Map(
        headers.map((h) => [(h.description ?? '').trim().toLowerCase(), h]),
      );

      const out: ResolvedField[] = await Promise.all(
        fields.map(async (f) => {
          if (f.freeText) {
            return { ...f, options: [], multi: false, freeText: true };
          }
          if (f.inlineOptions) {
            return { ...f, options: f.inlineOptions, multi: true, freeText: false };
          }
          const header = f.picklistName
            ? byDesc.get(f.picklistName.trim().toLowerCase())
            : undefined;
          if (!header) {
            return { ...f, options: [], multi: false, freeText: true };
          }
          let options: string[] = [];
          try {
            const items = await listPickListItems(header.id);
            options = items.filter((o) => o.is_active !== false).map((o) => o.answer_code);
          } catch {
            options = [];
          }
          if (!options.length) return { ...f, options: [], multi: false, freeText: true };
          return { ...f, options, multi: !!header.is_multi_select, freeText: false };
        }),
      );
      if (alive) setResolved(out);
    })();
    return () => {
      alive = false;
    };
  }, [fields]);

  const setMulti = (key: string, opts: string[]) =>
    setValues((p) => ({ ...p, [key]: opts }));
  const setSingle = (key: string, val: string) =>
    setValues((p) => ({ ...p, [key]: val ? [val] : [] }));
  const setFree = (key: string, val: string) => setText((p) => ({ ...p, [key]: val }));

  const answerFor = (f: ResolvedField): string =>
    f.freeText ? (text[f.key] ?? '') : (values[f.key] ?? []).join(', ');

  const missingRequired = useMemo(
    () => (resolved ?? []).some((f) => f.required && !answerFor(f).trim()),
    // answerFor is a pure read over values/text/resolved, which are the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolved, values, text],
  );

  const handleSubmit = () => {
    if (missingRequired) {
      setError(true);
      return;
    }
    const answers: Record<string, string> = {};
    for (const f of resolved ?? []) answers[f.key] = answerFor(f);
    onSubmit(answers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-4 py-2.5 text-white">
          <h3 className="text-sm font-bold uppercase tracking-wide">
            Please complete below questionnaire
          </h3>
          <button type="button" onClick={onCancel} className="rounded p-1 hover:bg-white/15">
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {macroName}
          </div>

          {resolved === null ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading options…</div>
          ) : (
            <div className="grid grid-cols-[minmax(8rem,11rem)_1fr] gap-x-4 gap-y-3 text-sm">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Question</div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Answer</div>

              {resolved.map((f) => {
                const invalid = error && f.required && !answerFor(f).trim();
                return (
                  <FieldRow
                    key={f.key}
                    field={f}
                    invalid={invalid}
                    multiValue={values[f.key] ?? []}
                    freeValue={text[f.key] ?? ''}
                    onMulti={(opts) => setMulti(f.key, opts)}
                    onSingle={(v) => setSingle(f.key, v)}
                    onFree={(v) => setFree(f.key, v)}
                  />
                );
              })}
            </div>
          )}

          {error && missingRequired && (
            <p className="mt-3 text-sm font-medium text-red-600">
              Please complete all mandatory fields (marked with *).
            </p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Tip: hold <kbd className="rounded border border-slate-300 px-1">Ctrl</kbd> to select
            multiple items within a list.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 rounded-b-lg border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={resolved === null}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Add Note
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  field,
  invalid,
  multiValue,
  freeValue,
  onMulti,
  onSingle,
  onFree,
}: {
  field: ResolvedField;
  invalid: boolean;
  multiValue: string[];
  freeValue: string;
  onMulti: (opts: string[]) => void;
  onSingle: (v: string) => void;
  onFree: (v: string) => void;
}) {
  const border = invalid ? 'border-red-400 ring-1 ring-red-300' : 'border-slate-300';
  return (
    <>
      <label className="flex items-start pt-1.5 font-semibold text-slate-700">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      <div>
        {field.freeText ? (
          <input
            type="text"
            value={freeValue}
            onChange={(e) => onFree(e.target.value)}
            className={`w-full rounded-md border-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${border}`}
          />
        ) : field.multi ? (
          <select
            multiple
            value={multiValue}
            onChange={(e) =>
              onMulti(Array.from(e.target.selectedOptions, (o) => o.value))
            }
            size={Math.min(Math.max(field.options.length, 2), 6)}
            className={`w-full rounded-md border-2 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${border}`}
          >
            {field.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={multiValue[0] ?? ''}
            onChange={(e) => onSingle(e.target.value)}
            className={`w-full rounded-md border-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${border}`}
          >
            <option value="">— Select —</option>
            {field.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}
      </div>
    </>
  );
}
