// "Add Notes Macro" picker for Patient Notes.
//
// Legacy parity: the button opens a popup listing the macros maintained in
// Setup → Notes Macros (/api/v1/note-macros), filtered by category and name,
// with a preview of the selected macro's body. It used to render a hard-coded
// list of eight sample sentences, which meant nothing the practice configured
// in Setup ever showed up here (KAN-…, "Add Macros" bug).
//
// Macro bodies may carry fillable tokens (@@prompt@@ / {{options}}); those run
// through the same questionnaire the Progress Notes editor uses, so a macro
// authored once behaves identically in both places.

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { listAllNoteMacros } from '@/components/setup/notes-macros/noteMacroService';
import MacroQuestionnaire from '@/features/progress-notes/MacroQuestionnaire';
import {
  macroHasFields,
  parseMacroFields,
  substituteMacro,
  type MacroField,
} from '@/features/progress-notes/macroTemplate';

const ALL = '__all__';

interface NoteMacroPickerModalProps {
  /** Called with the macro text to drop into the note (tokens already filled). */
  onInsert: (text: string) => void;
  onClose: () => void;
}

export default function NoteMacroPickerModal({ onInsert, onClose }: NoteMacroPickerModalProps) {
  const [category, setCategory] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [questionnaire, setQuestionnaire] = useState<{
    name: string;
    content: string;
    fields: MacroField[];
  } | null>(null);

  // Same key the Setup screen list uses, so a macro added there is picked up
  // here without a reload.
  const macrosQuery = useQuery({
    queryKey: ['/api/v1/note-macros', 'all'],
    queryFn: listAllNoteMacros,
  });

  const macrosData = macrosQuery.data;
  const macros = useMemo(() => macrosData ?? [], [macrosData]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const m of macros) if (m.category?.trim()) set.add(m.category.trim());
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [macros]);

  // Sorted by name client-side, the way the Setup screen does: the backend
  // ignores ?sort=name and hands rows back in id order.
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return macros
      .filter((m) => {
        if (category !== ALL && (m.category?.trim() ?? '') !== category) return false;
        if (!needle) return true;
        return (
          (m.name ?? '').toLowerCase().includes(needle) ||
          (m.content ?? '').toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }, [macros, category, search]);

  const selected = filtered.find((m) => m.id === selectedId) ?? null;

  const insert = (macro: { name: string; content: string }) => {
    const content = macro.content ?? '';
    if (macroHasFields(content)) {
      setQuestionnaire({ name: macro.name, content, fields: parseMacroFields(content) });
      return;
    }
    onInsert(content);
    onClose();
  };

  return (
    <>
      {/* Hidden (not unmounted) while the token questionnaire is up: that popup
          renders at z-50, so it would otherwise sit behind this one. */}
      <div
        className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 ${
          questionnaire ? 'hidden' : ''
        }`}
      >
        <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#3A6EA5] px-5 py-3 text-white">
            <h3 className="text-sm font-bold uppercase tracking-wide">Add Notes Macro</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded p-1 hover:bg-white/15"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#E2E8F0] bg-[#F7F9FC] px-5 py-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-[#475569]">
              Category
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSelectedId(null);
                }}
                className="min-w-[180px] rounded-lg border-2 border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#1E293B] outline-none transition-all focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
              >
                <option value={ALL}>All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search macros…"
                className="w-full rounded-lg border-2 border-[#E2E8F0] bg-white py-1.5 pl-9 pr-3 text-sm text-[#1E293B] outline-none transition-all focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
              />
            </div>
          </div>

          {/* List + preview */}
          <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="min-h-[220px] overflow-y-auto border-b border-[#E2E8F0] sm:border-b-0 sm:border-r">
              {macrosQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 p-6 text-sm text-[#64748B]">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading macros…
                </div>
              ) : macrosQuery.isError ? (
                <div className="p-6 text-sm text-red-600">
                  Could not load note macros.{' '}
                  <button
                    type="button"
                    onClick={() => macrosQuery.refetch()}
                    className="font-semibold underline"
                  >
                    Retry
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-sm text-[#64748B]">
                  {macros.length === 0 ? (
                    <>
                      No note macros have been set up yet. Add them under{' '}
                      <Link
                        to="/setup/notes-macros"
                        className="font-semibold text-[#3A6EA5] hover:underline"
                      >
                        Setup → Notes Macros
                      </Link>
                      .
                    </>
                  ) : (
                    'No macros match this filter.'
                  )}
                </div>
              ) : (
                <ul className="p-2">
                  {filtered.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(m.id)}
                        onDoubleClick={() => insert({ name: m.name, content: m.content ?? '' })}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          selectedId === m.id
                            ? 'bg-[#3A6EA5] text-white'
                            : 'text-[#1E293B] hover:bg-[#3A6EA5]/10'
                        }`}
                      >
                        <span className="block font-medium">{m.name}</span>
                        {m.category && (
                          <span
                            className={`block text-xs ${
                              selectedId === m.id ? 'text-white/80' : 'text-[#64748B]'
                            }`}
                          >
                            {m.category}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="min-h-[220px] overflow-y-auto bg-[#F7F9FC] p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[#64748B]">
                Preview
              </div>
              {selected ? (
                <>
                  <div className="mb-2 text-sm font-semibold text-[#1E293B]">{selected.name}</div>
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm text-[#334155]">
                    {selected.content}
                  </pre>
                </>
              ) : (
                <p className="text-sm text-[#94A3B8]">
                  Select a macro to preview its text before inserting it.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-[#E2E8F0] bg-white px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border-2 border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-[#475569] transition-colors hover:bg-[#F1F5F9]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selected}
              onClick={() => selected && insert({ name: selected.name, content: selected.content ?? '' })}
              className="flex items-center gap-2 rounded-lg bg-[#3A6EA5] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2f5a8c] disabled:cursor-not-allowed disabled:bg-[#94A3B8]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Insert Macro
            </button>
          </div>
        </div>
      </div>

      {questionnaire && (
        <MacroQuestionnaire
          macroName={questionnaire.name}
          fields={questionnaire.fields}
          onCancel={() => setQuestionnaire(null)}
          onSubmit={(answers) => {
            onInsert(substituteMacro(questionnaire.content, answers));
            setQuestionnaire(null);
            onClose();
          }}
        />
      )}
    </>
  );
}
