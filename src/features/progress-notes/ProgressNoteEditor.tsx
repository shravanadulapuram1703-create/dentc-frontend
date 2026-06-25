// Progress Note editor — legacy Denticon "Add/Edit Note" screen.
//
// Left: Category + Macro list + "Add Macro" (opens the macro preview, then the
// questionnaire when the macro has fillable tokens). Right: Tooth#(+V grid),
// DOS(+calendar), a text-colour toolbar over a rich-text body, Attachments,
// Signature (pad / Change User / Load My Sig.), and Save Notes / Strike-Off /
// Restore / Cancel with a "Hide Macro Preview" toggle.
//
// Notes lock (read-only text) once signed or after midnight; locked notes can
// still be signed and struck off.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  Loader2,
  Paperclip,
  PenLine,
  Plus,
  RotateCcw,
  Save,
  Scan,
  Upload,
  X,
} from 'lucide-react';
import { useGetProgressNote } from '@/api/generated/endpoints/clinical/clinical';
import { useListNoteMacros } from '@/api/generated/endpoints/procedures/procedures';
import ToothNumberPicker from './ToothNumberPicker';
import MacroQuestionnaire from './MacroQuestionnaire';
import { macroHasFields, parseMacroFields, substituteMacro, type MacroField } from './macroTemplate';
import {
  ATTACHMENT_ACCEPT,
  createNote,
  currentUser,
  isLocked as isLockedNote,
  isSigned as isSignedNote,
  joinTeeth,
  loadMySignature,
  parseTeeth,
  restoreNote,
  saveUserSignature,
  signNote,
  strikeOffNote,
  todayInputDate,
  toInputDate,
  updateNote,
  uploadAttachment,
  validateAttachment,
} from './progressNotesService';

interface PatientData {
  id: string;
  name: string;
  dob: string;
  age: number;
  officeId?: string;
}
interface OutletContext {
  patient: PatientData;
}

const errMsg = (err: unknown): string | undefined =>
  (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;

const TEXT_COLORS = [
  '#000000', '#1F3A5F', '#1d4ed8', '#0e7490', '#15803d',
  '#b45309', '#b91c1c', '#7c3aed', '#be185d', '#475569',
];

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function textToHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

interface ProgressNoteEditorProps {
  mode?: 'add' | 'edit' | 'view';
}

export default function ProgressNoteEditor({ mode = 'add' }: ProgressNoteEditorProps) {
  const navigate = useNavigate();
  const { patientId, noteId } = useParams();
  const { patient } = useOutletContext<OutletContext>();
  const queryClient = useQueryClient();

  const numericPatientId = Number(patientId);
  const validPatientId = Number.isFinite(numericPatientId);
  const numericNoteId = Number(noteId);
  const isExisting = (mode === 'edit' || mode === 'view') && Number.isFinite(numericNoteId);
  const officeId = patient?.officeId ? Number(patient.officeId) : null;
  const me = useMemo(() => currentUser(), []);

  const editorRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  // ---- form state ---------------------------------------------------------
  const [category, setCategory] = useState('');
  const [macroSearch, setMacroSearch] = useState('');
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null);
  const [previewMacro, setPreviewMacro] = useState<{ name: string; content: string } | null>(null);
  const [questionnaire, setQuestionnaire] =
    useState<{ name: string; content: string; fields: MacroField[]; defaults: Record<string, string> } | null>(
      null,
    );

  const [teeth, setTeeth] = useState<string[]>([]);
  const [showToothPicker, setShowToothPicker] = useState(false);
  const [surface, setSurface] = useState('');
  const [region, setRegion] = useState('');
  const [dos, setDos] = useState<string>(todayInputDate());

  const [colorOpen, setColorOpen] = useState(false);
  const [hideMacroPanel, setHideMacroPanel] = useState(false);

  const [attachment, setAttachment] = useState<File | null>(null);

  const [padOpen, setPadOpen] = useState(false);
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [changeUser, setChangeUser] = useState('');
  const [changePassword, setChangePassword] = useState('');

  const [locked, setLocked] = useState(false);
  const [signed, setSigned] = useState(false);
  const [struckOff, setStruckOff] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<'sign' | 'strike' | 'restore' | null>(null);

  // ---- macros -------------------------------------------------------------
  const { data: macrosData } = useListNoteMacros({ size: 200 });
  const macros = useMemo(
    () =>
      (macrosData?.items ?? []).map((m) => ({
        id: String(m.id),
        name: m.name,
        content: m.content ?? '',
        category: m.category ?? '',
      })),
    [macrosData],
  );
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const m of macros) if (m.category) set.add(m.category);
    return [...set].sort();
  }, [macros]);
  const filteredMacros = macros.filter(
    (m) =>
      (!category || m.category === category) &&
      (!macroSearch || m.name.toLowerCase().includes(macroSearch.toLowerCase())),
  );

  // ---- hydrate existing note ----------------------------------------------
  const noteQuery = useGetProgressNote(numericNoteId, { query: { enabled: isExisting } });
  useEffect(() => {
    const n = noteQuery.data;
    if (!n || hydratedRef.current) return;
    hydratedRef.current = true;
    setTeeth(parseTeeth(n.tooth));
    setSurface(n.surface ?? '');
    setRegion(n.region ?? '');
    setDos(toInputDate(n.note_date) || todayInputDate());
    const sig = isSignedNote(n);
    setSigned(sig);
    setLocked(isLockedNote(n));
    setStruckOff(n.is_struck_off);
    if (editorRef.current) {
      editorRef.current.innerHTML = n.notes_html || textToHtml(n.notes ?? '');
    }
  }, [noteQuery.data]);

  const readOnly = mode === 'view' || locked;

  // ---- rich text ----------------------------------------------------------
  const applyColor = (color: string) => {
    setColorOpen(false);
    editorRef.current?.focus();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);
  };

  const appendToEditor = (text: string) => {
    const el = editorRef.current;
    if (!el) return;
    const html = textToHtml(text);
    el.innerHTML = el.innerHTML ? `${el.innerHTML}<br><br>${html}` : html;
  };

  // ---- macro flow ---------------------------------------------------------
  const openPreview = () => {
    const macro = macros.find((m) => m.id === selectedMacroId);
    if (!macro) {
      window.alert('Select a macro first.');
      return;
    }
    setPreviewMacro({ name: macro.name, content: macro.content });
  };

  const addPreviewToNotes = () => {
    if (!previewMacro) return;
    const { name, content } = previewMacro;
    setPreviewMacro(null);
    if (macroHasFields(content)) {
      const fields = parseMacroFields(content);
      // Prefill tooth-number prompts from the current Tooth# selection.
      const defaults: Record<string, string> = {};
      if (teeth.length) {
        for (const f of fields) {
          if (/tooth\s*number/i.test(f.label)) defaults[f.key] = teeth.join(', ');
        }
      }
      setQuestionnaire({ name, content, fields, defaults });
    } else {
      // Legacy convenience placeholder for the current tooth selection.
      const withTeeth = content.replace(/@@insert tooth number@@/gi, teeth.join(', '));
      appendToEditor(withTeeth);
    }
  };

  const applyQuestionnaire = (answers: Record<string, string>) => {
    if (!questionnaire) return;
    appendToEditor(substituteMacro(questionnaire.content, answers));
    setQuestionnaire(null);
  };

  // ---- attachments --------------------------------------------------------
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateAttachment(file);
    if (err) {
      window.alert(err);
      return;
    }
    setAttachment(file);
  };

  // ---- signature pad ------------------------------------------------------
  const canvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = canvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = canvasPoint(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#11315c';
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const endDraw = () => {
    drawing.current = false;
  };
  const clearPad = () => {
    const c = canvasRef.current;
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    setSigDataUrl(null);
  };
  const finishPad = () => {
    const data = canvasRef.current?.toDataURL('image/png');
    if (data) setSigDataUrl(data);
    setPadOpen(false);
  };
  const handleLoadMySig = async () => {
    try {
      const data = await loadMySignature(numericPatientId);
      if (!data) {
        window.alert('No signature on file — use the Sign pad to capture one.');
        return;
      }
      setSigDataUrl(data);
      setPadOpen(false);
    } catch (err) {
      window.alert(errMsg(err) || 'Could not load your signature.');
    }
  };

  // ---- persistence --------------------------------------------------------
  // Both the list (['/api/v1/progress-notes', params]) and the single-note
  // (['/api/v1/progress-notes/{id}']) caches start with the same path segment
  // but differ in the first key, so match both with a predicate.
  const invalidateNotes = () =>
    queryClient.invalidateQueries({
      predicate: (q) => String(q.queryKey[0]).startsWith('/api/v1/progress-notes'),
    });

  const collectBody = () => ({
    note_date: dos,
    notes: editorRef.current?.innerText ?? '',
    notes_html: editorRef.current?.innerHTML ?? '',
    tooth: joinTeeth(teeth),
    surface: surface.trim() || null,
    region: region.trim() || null,
  });

  const persist = async (): Promise<number | null> => {
    const body = collectBody();
    if (!readOnly) {
      if (!dos) {
        window.alert('Please enter the Date of Service (DOS).');
        return null;
      }
      if (!body.notes.trim()) {
        window.alert('Please enter the progress note.');
        return null;
      }
    }
    if (mode === 'edit' && isExisting) {
      if (!readOnly) await updateNote(numericNoteId, body);
      return numericNoteId;
    }
    const created = await createNote({
      patient_id: numericPatientId,
      office_id: officeId,
      ...body,
    });
    return created.id;
  };

  const afterWrite = async (id: number) => {
    if (attachment) {
      try {
        await uploadAttachment(attachment, numericPatientId, officeId);
      } catch (err) {
        window.alert(errMsg(err) || 'The note was saved but the attachment upload failed.');
      }
    }
    invalidateNotes();
    navigate(`/patient/${patientId}/progress-notes`);
    void id;
  };

  const handleSave = async () => {
    if (!validPatientId) {
      window.alert('Missing patient context. Reopen the patient and try again.');
      return;
    }
    setSaving(true);
    try {
      const id = await persist();
      if (id == null) return;
      // Save Notes also commits a staged signature (legacy "Load My Sig. → Save").
      if (sigDataUrl && !signed) {
        try {
          await saveUserSignature(numericPatientId, sigDataUrl);
          await signNote(id);
        } catch (err) {
          window.alert(errMsg(err) || 'The note was saved but signing failed.');
        }
      }
      await afterWrite(id);
    } catch (err) {
      window.alert(errMsg(err) || 'Failed to save the progress note.');
    } finally {
      setSaving(false);
    }
  };

  const handleStrikeToggle = async () => {
    if (!isExisting) {
      window.alert('Save the note before striking it off.');
      return;
    }
    setBusyAction(struckOff ? 'restore' : 'strike');
    try {
      if (struckOff) await restoreNote(numericNoteId);
      else await strikeOffNote(numericNoteId);
      invalidateNotes();
      navigate(`/patient/${patientId}/progress-notes`);
    } catch (err) {
      window.alert(errMsg(err) || 'Failed to update the note.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCancel = () => {
    const dirty = (editorRef.current?.innerText.trim().length ?? 0) > 0 || teeth.length > 0 || !!attachment;
    if (dirty && mode === 'add' && !window.confirm('Discard unsaved changes?')) return;
    navigate(`/patient/${patientId}/progress-notes`);
  };

  // ---- render -------------------------------------------------------------
  return (
    <div className="flex flex-col bg-slate-100" style={{ minHeight: 'calc(100vh - 300px)' }}>
      {/* Workspace header */}
      <div
        className="flex items-center justify-between px-5 py-2 text-sm font-semibold text-white"
        style={{ background: 'linear-gradient(180deg,#2566a8,#16406e)' }}
      >
        <div className="flex items-center gap-3">
          <span>Progress Notes</span>
          <span className="rounded bg-white/15 px-2 py-0.5 text-xs font-normal">{patient?.name}</span>
          {struckOff && (
            <span className="rounded bg-red-500/90 px-2 py-0.5 text-xs font-semibold">Struck Off</span>
          )}
          {locked && !struckOff && (
            <span className="rounded bg-amber-500/90 px-2 py-0.5 text-xs font-semibold">
              {signed ? 'Signed · Locked' : 'Locked'}
            </span>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs font-normal">
          <input
            type="checkbox"
            checked={hideMacroPanel}
            onChange={(e) => setHideMacroPanel(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/40 bg-transparent"
          />
          Hide Macro Preview
        </label>
      </div>

      <div className="flex flex-1 gap-3 p-3">
        {/* LEFT — Category + Macro */}
        {!hideMacroPanel && (
          <aside className="flex w-72 shrink-0 flex-col rounded-lg border border-slate-300 bg-[#16365c] text-white">
            <div className="space-y-3 p-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-blue-200">
                  Select Category
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSelectedMacroId(null);
                  }}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-blue-200">
                  Select Macro
                </label>
                <input
                  type="text"
                  value={macroSearch}
                  onChange={(e) => setMacroSearch(e.target.value)}
                  placeholder="Search macros…"
                  className="mb-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                />
              </div>
            </div>
            <div className="mx-4 flex-1 overflow-y-auto rounded bg-white" style={{ minHeight: 220 }}>
              {filteredMacros.length === 0 ? (
                <p className="p-3 text-center text-sm text-slate-400">
                  {macrosData ? 'No macros' : 'Loading…'}
                </p>
              ) : (
                filteredMacros.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMacroId(m.id)}
                    onDoubleClick={() => {
                      setSelectedMacroId(m.id);
                      setPreviewMacro({ name: m.name, content: m.content });
                    }}
                    className={`block w-full px-3 py-1.5 text-left font-mono text-[13px] ${
                      selectedMacroId === m.id ? 'bg-blue-600 text-white' : 'text-slate-800 hover:bg-blue-50'
                    }`}
                  >
                    {m.name}
                  </button>
                ))
              )}
            </div>
            <div className="p-4">
              <button
                type="button"
                onClick={openPreview}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} /> Add Macro
              </button>
            </div>
          </aside>
        )}

        {/* RIGHT — editor */}
        <section className="flex flex-1 flex-col gap-3">
          {/* Tooth / DOS bar */}
          <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-300 bg-white p-3">
            <div className="min-w-[16rem] flex-1">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-blue-700">
                Tooth#, Surf, Region
              </label>
              <div className="flex items-center gap-2">
                <div className="flex min-h-[2.25rem] flex-1 flex-wrap items-center gap-1 rounded border-2 border-slate-300 px-2 py-1">
                  {teeth.length === 0 ? (
                    <span className="text-sm text-slate-400">No teeth</span>
                  ) : (
                    teeth.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-xs font-semibold text-purple-700"
                      >
                        {t}
                        {!readOnly && (
                          <button type="button" onClick={() => setTeeth(teeth.filter((x) => x !== t))}>
                            <X className="h-3 w-3" strokeWidth={2.5} />
                          </button>
                        )}
                      </span>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => setShowToothPicker(true)}
                  className="rounded bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  title="Select tooth numbers"
                >
                  V
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={surface}
                  disabled={readOnly}
                  onChange={(e) => setSurface(e.target.value)}
                  placeholder="Surface (O, M, D…)"
                  className="rounded border-2 border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                />
                <input
                  type="text"
                  value={region}
                  disabled={readOnly}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Region"
                  className="rounded border-2 border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-blue-700">
                DOS (MM/DD/YYYY)
              </label>
              <input
                type="date"
                value={dos}
                disabled={readOnly}
                onChange={(e) => setDos(e.target.value)}
                className="rounded border-2 border-slate-300 px-3 py-2 text-sm font-medium disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Editor + colour toolbar */}
          <div className="flex flex-1 flex-col rounded-lg border border-slate-300 bg-white">
            <div className="flex items-center gap-1 border-b border-slate-200 px-3 py-1.5">
              <div className="relative">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => setColorOpen((o) => !o)}
                  className="flex items-center gap-0.5 rounded px-1.5 py-1 hover:bg-slate-100 disabled:opacity-50"
                  title="Text color"
                >
                  <span className="text-base font-bold leading-none text-red-600 underline">A</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </button>
                {colorOpen && (
                  <div className="absolute z-10 mt-1 grid grid-cols-5 gap-1 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => applyColor(c)}
                        className="h-5 w-5 rounded border border-slate-300"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                )}
              </div>
              <span className="ml-2 text-xs text-slate-400">
                Select text, then pick a colour to code the note.
              </span>
            </div>
            <div
              ref={editorRef}
              contentEditable={!readOnly}
              suppressContentEditableWarning
              className="min-h-[14rem] flex-1 overflow-auto px-4 py-3 font-mono text-sm leading-relaxed text-slate-900 focus:outline-none"
              style={{ whiteSpace: 'pre-wrap' }}
              data-placeholder="Type the note, or add a macro from the left panel…"
            />
          </div>

          {/* Attachments */}
          <div className="rounded-lg border border-slate-300 bg-white p-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-blue-700">
              Attachments{' '}
              <span className="font-normal normal-case text-slate-500">
                (Max file size: 10 MB. Allowed: .gif, .jpg, .jpeg, .png, .pdf)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                onChange={handleFile}
                className="hidden"
              />
              <button
                type="button"
                disabled={readOnly}
                onClick={() => window.alert('Scanner integration requires hardware support.')}
                className="flex items-center gap-1.5 rounded bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-50"
              >
                <Scan className="h-4 w-4" /> Scan
              </button>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" /> Choose file
              </button>
              {attachment ? (
                <span className="inline-flex items-center gap-1.5 rounded bg-green-50 px-2 py-1 text-sm text-green-800">
                  <Paperclip className="h-4 w-4" /> {attachment.name}
                  <button type="button" onClick={() => setAttachment(null)}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ) : (
                <span className="text-sm text-slate-400">No file chosen</span>
              )}
            </div>
          </div>

          {/* Signature */}
          <div className="rounded-lg border border-slate-300 bg-white p-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-blue-700">Signature</div>
            <div className="grid gap-4 md:grid-cols-3">
              {/* pad / preview */}
              <div>
                <div className="mb-2 flex h-28 items-center justify-center rounded border-2 border-dashed border-slate-300 bg-slate-50">
                  {padOpen ? (
                    <canvas
                      ref={canvasRef}
                      width={320}
                      height={104}
                      onPointerDown={startDraw}
                      onPointerMove={moveDraw}
                      onPointerUp={endDraw}
                      onPointerLeave={endDraw}
                      className="h-full w-full touch-none bg-white"
                    />
                  ) : sigDataUrl ? (
                    <img src={sigDataUrl} alt="Signature" className="max-h-full" />
                  ) : signed ? (
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
                      <PenLine className="h-4 w-4" /> Signed
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">Not signed</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={signed}
                    onClick={() => setPadOpen(true)}
                    className="rounded bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                  >
                    Sign
                  </button>
                  <button
                    type="button"
                    onClick={clearPad}
                    className="rounded bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    disabled={!padOpen}
                    onClick={finishPad}
                    className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* change user */}
              <div className="rounded border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  Change User
                </div>
                <input
                  type="text"
                  value={changeUser}
                  onChange={(e) => setChangeUser(e.target.value)}
                  placeholder="User Name"
                  className="mb-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="password"
                  value={changePassword}
                  onChange={(e) => setChangePassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Over-the-shoulder signing applies the signed-in user.
                </p>
              </div>

              {/* load my sig */}
              <div className="rounded border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  Load Sig. From File
                </div>
                <button
                  type="button"
                  disabled={signed}
                  onClick={handleLoadMySig}
                  className="flex w-full items-center justify-center gap-1.5 rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                >
                  <PenLine className="h-4 w-4" /> Load My Sig.
                </button>
                <p className="mt-2 text-center text-xs font-semibold text-slate-500">({me.login})</p>
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-end gap-2 rounded-lg border border-slate-300 bg-white p-3">
            {mode !== 'view' && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Notes
              </button>
            )}
            {isExisting && (
              <button
                type="button"
                onClick={handleStrikeToggle}
                disabled={busyAction != null}
                className={`flex items-center gap-1.5 rounded-md px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                  struckOff ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {busyAction === 'strike' || busyAction === 'restore' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : struckOff ? (
                  <RotateCcw className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                {struckOff ? 'Restore' : 'Strike-Off'}
              </button>
            )}
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-1.5 rounded-md bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </section>
      </div>

      {/* Popups */}
      {showToothPicker && (
        <ToothNumberPicker
          initial={teeth}
          onSave={(t) => {
            setTeeth(t);
            setShowToothPicker(false);
          }}
          onCancel={() => setShowToothPicker(false)}
        />
      )}

      {previewMacro && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-4 py-2.5 text-white">
              <h3 className="text-sm font-bold uppercase tracking-wide">Preview for Selected Macro</h3>
              <button type="button" onClick={() => setPreviewMacro(null)} className="rounded p-1 hover:bg-white/15">
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
            <div className="px-5 py-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {previewMacro.name}
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-3 font-mono text-[13px] text-slate-800">
                {previewMacro.content}
              </pre>
            </div>
            <div className="flex items-center justify-end gap-2 rounded-b-lg border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={addPreviewToNotes}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Add To Notes
              </button>
              <button
                type="button"
                onClick={() => setPreviewMacro(null)}
                className="rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {questionnaire && (
        <MacroQuestionnaire
          macroName={questionnaire.name}
          fields={questionnaire.fields}
          defaults={questionnaire.defaults}
          onSubmit={applyQuestionnaire}
          onCancel={() => setQuestionnaire(null)}
        />
      )}
    </div>
  );
}
