import { useCallback, useEffect, useState } from "react";
import { Plus, Loader2, Pencil, Trash2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import type { DefinitionGroupRead, DefinitionRead } from "@/api/generated/model";
import {
  listGroupsByType,
  listDefinitionsByGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  createDef,
  updateDef,
  deleteDef,
  makeGroupCode,
} from "./definitionsService";
import EditorModal from "./EditorModal";

// ============================================================================
// Questionnaire Builder — shared by the Medical Questionnaire and Dental
// Questionnaire setup screens. Sections (headers) are definition-groups;
// questions are definitions (description = question text, key1 = input-type code,
// sort_order = order). Repurposes the generic definitions system; the input-type
// is a frontend convention stored in `key1` — there is no real questionnaire-
// template resource. Patient answers are NOT bound here. See gaps MED-2..MED-5 in
// docs/pick-list/pick_list_setup_backend_devreport.md (§4–§5).
// ============================================================================

// Input-type codes persisted in definition.key1 (best-effort — see gap MED-3).
const INPUT_TYPES = [
  { code: "TEXT", label: "Text field" },
  { code: "TEXTAREA", label: "Text area" },
  { code: "YESNO", label: "Yes / No dropdown" },
  { code: "DATE", label: "Date picker" },
] as const;

function inputTypeLabel(code: string | null | undefined): string {
  return INPUT_TYPES.find((t) => t.code === code)?.label ?? "Text field";
}

function QuestionPreview({ code }: { code: string | null | undefined }) {
  const cls = "px-3 py-1.5 border-2 border-[#E2E8F0] rounded text-sm bg-[#F1F5F9] text-[#94A3B8] w-full";
  if (code === "YESNO")
    return (
      <select disabled className={cls}>
        <option>YES</option>
      </select>
    );
  if (code === "DATE") return <input disabled type="date" className={cls} />;
  if (code === "TEXTAREA") return <textarea disabled rows={2} className={cls} />;
  return <input disabled type="text" className={cls} />;
}

type QForm = { description: string; key1: string; is_active: boolean };
type HForm = { description: string };

export default function QuestionnaireBuilder({
  groupType,
  title,
  subtitle,
}: {
  groupType: string;
  title: string;
  subtitle: string;
}) {
  const [groups, setGroups] = useState<DefinitionGroupRead[]>([]);
  const [defsByGroup, setDefsByGroup] = useState<Record<string, DefinitionRead[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [headerModal, setHeaderModal] = useState<{ id?: number; form: HForm } | null>(null);
  const [qModal, setQModal] = useState<{ groupCode: string; def?: DefinitionRead; form: QForm } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const gs = await listGroupsByType(groupType);
      const entries = await Promise.all(
        gs.map(async (g) => [g.group_code, await listDefinitionsByGroup(g.group_code)] as const),
      );
      setGroups(gs);
      setDefsByGroup(Object.fromEntries(entries));
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load questionnaire");
      setGroups([]);
      setDefsByGroup({});
    } finally {
      setLoading(false);
    }
  }, [groupType]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ---------- Section CRUD ----------
  const saveHeader = async () => {
    if (!headerModal) return;
    const desc = headerModal.form.description.trim();
    if (!desc) {
      toast.error("Validation Failed", { description: "Enter a section name" });
      return;
    }
    setSaving(true);
    try {
      if (headerModal.id != null) {
        await updateGroup(headerModal.id, {
          group_code: groups.find((g) => g.id === headerModal.id)!.group_code,
          description: desc,
          group_type: groupType,
        });
        toast.success("Section updated");
      } else {
        await createGroup({ group_code: makeGroupCode(groupType, desc), description: desc, group_type: groupType, can_add: true });
        toast.success("Section added");
      }
      setHeaderModal(null);
      await loadData();
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "Could not save section" });
    } finally {
      setSaving(false);
    }
  };

  const removeHeader = async (g: DefinitionGroupRead) => {
    const count = defsByGroup[g.group_code]?.length ?? 0;
    if (!confirm(`Delete section "${g.description}"${count ? ` and its ${count} question(s)` : ""}? This cannot be undone.`))
      return;
    try {
      for (const d of defsByGroup[g.group_code] ?? []) await deleteDef(d.id).catch(() => undefined);
      await deleteGroup(g.id);
      toast.success("Section deleted");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "Could not delete section" });
    }
  };

  // ---------- Question CRUD ----------
  const saveQuestion = async () => {
    if (!qModal) return;
    const desc = qModal.form.description.trim();
    if (!desc) {
      toast.error("Validation Failed", { description: "Enter the question text" });
      return;
    }
    setSaving(true);
    try {
      if (qModal.def) {
        await updateDef(qModal.def.id, {
          group_code: qModal.groupCode,
          key1: qModal.form.key1,
          description: desc,
          is_active: qModal.form.is_active,
        });
        toast.success("Question updated");
      } else {
        const order = (defsByGroup[qModal.groupCode]?.length ?? 0) + 1;
        await createDef({
          group_code: qModal.groupCode,
          key1: qModal.form.key1,
          description: desc,
          sort_order: order,
          is_active: qModal.form.is_active,
        });
        toast.success("Question added");
      }
      setQModal(null);
      await loadData();
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "Could not save question" });
    } finally {
      setSaving(false);
    }
  };

  const removeQuestion = async (d: DefinitionRead) => {
    if (!confirm(`Delete question "${d.description}"? This cannot be undone.`)) return;
    try {
      await deleteDef(d.id);
      toast.success("Question deleted");
      await loadData();
    } catch (e: unknown) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "Could not delete question" });
    }
  };

  const openAddQuestion = (groupCode: string) =>
    setQModal({ groupCode, form: { description: "", key1: "TEXT", is_active: true } });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1F3A5F]">{title}</h1>
                <p className="text-xs text-[#64748B] font-bold">{subtitle}</p>
              </div>
            </div>
            <button
              onClick={() => setHeaderModal({ form: { description: "" } })}
              className="flex items-center gap-2 px-4 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg hover:bg-[#E8EFF7] font-bold text-sm"
            >
              <Plus className="w-4 h-4" /> Add Header
            </button>
          </div>

          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-[#64748B] text-sm font-bold">
                <Loader2 className="w-5 h-5 animate-spin text-[#3A6EA5]" /> Loading…
              </div>
            ) : loadError ? (
              <div className="py-16 text-center text-sm text-[#DC2626]">
                {loadError}
                <button
                  onClick={() => void loadData()}
                  className="mt-3 block mx-auto px-3 py-1 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded text-xs font-bold hover:bg-[#E8EFF7]"
                >
                  Retry
                </button>
              </div>
            ) : groups.length === 0 ? (
              <div className="py-16 text-center text-[#64748B]">
                <ClipboardList className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                <p className="text-sm font-bold">No sections yet</p>
                <p className="text-xs">Use “Add Header” to create the first section.</p>
              </div>
            ) : (
              groups.map((g) => {
                const defs = defsByGroup[g.group_code] ?? [];
                return (
                  <section key={g.id} className="border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between bg-[#1B7BC0] text-white px-4 py-2.5">
                      <span className="text-sm font-bold uppercase tracking-wide">{g.description}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openAddQuestion(g.group_code)} title="Add question" className="p-1 hover:bg-white/20 rounded">
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setHeaderModal({ id: g.id, form: { description: g.description } })}
                          title="Edit section"
                          className="p-1 hover:bg-white/20 rounded"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => void removeHeader(g)} title="Delete section" className="p-1 hover:bg-white/20 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {defs.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-[#94A3B8]">No questions in this section.</div>
                    ) : (
                      <div className="divide-y divide-[#E2E8F0]">
                        {defs.map((d) => (
                          <div key={d.id} className="grid grid-cols-[1fr_320px_auto] items-center gap-4 px-4 py-2.5 odd:bg-[#F8FAFC]">
                            <span className={`text-sm ${d.is_active ? "text-[#1E293B]" : "text-[#94A3B8] line-through"}`}>
                              {d.description}
                            </span>
                            <QuestionPreview code={d.key1} />
                            <span className="flex items-center gap-0.5 shrink-0">
                              <button
                                onClick={() =>
                                  setQModal({
                                    groupCode: g.group_code,
                                    def: d,
                                    form: { description: d.description, key1: d.key1 || "TEXT", is_active: d.is_active },
                                  })
                                }
                                title="Edit question"
                                className="p-1 text-[#3A6EA5] hover:text-[#1F3A5F]"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => void removeQuestion(d)} title="Delete question" className="p-1 text-[#64748B] hover:text-[#DC2626]">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Section modal */}
      {headerModal ? (
        <EditorModal
          title={headerModal.id != null ? "Edit Section" : "Add Header"}
          onClose={() => setHeaderModal(null)}
          onSave={() => void saveHeader()}
          saving={saving}
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Section Name</span>
            <input
              autoFocus
              type="text"
              value={headerModal.form.description}
              onChange={(e) => setHeaderModal({ ...headerModal, form: { description: e.target.value } })}
              className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5]"
            />
          </label>
        </EditorModal>
      ) : null}

      {/* Question modal */}
      {qModal ? (
        <EditorModal
          title={qModal.def ? "Edit Question" : "Add Question"}
          onClose={() => setQModal(null)}
          onSave={() => void saveQuestion()}
          saving={saving}
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Question Text</span>
            <textarea
              autoFocus
              rows={2}
              value={qModal.form.description}
              onChange={(e) => setQModal({ ...qModal, form: { ...qModal.form, description: e.target.value } })}
              className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] resize-y"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Answer Type</span>
            <select
              value={qModal.form.key1}
              onChange={(e) => setQModal({ ...qModal, form: { ...qModal.form, key1: e.target.value } })}
              className="px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm bg-white focus:outline-none focus:border-[#3A6EA5]"
            >
              {INPUT_TYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-[#94A3B8]">Stored in definition.key1 (best-effort — backend has no input-type column).</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={qModal.form.is_active}
              onChange={(e) => setQModal({ ...qModal, form: { ...qModal.form, is_active: e.target.checked } })}
              className="w-4 h-4 accent-[#3A6EA5]"
            />
            <span className="text-sm font-bold text-[#1F3A5F]">Active</span>
          </label>
          <p className="text-[11px] text-[#94A3B8]">{inputTypeLabel(qModal.form.key1)} preview shown on the form row.</p>
        </EditorModal>
      ) : null}
    </div>
  );
}
