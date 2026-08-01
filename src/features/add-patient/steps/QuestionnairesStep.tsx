import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { GapNotice, YesNoToggle } from "../stepUi";
import {
  DEFAULT_DENTAL_QUESTION_GROUPS,
  DEFAULT_MEDICAL_QUESTION_GROUPS,
  MIN_TENANT_CATALOG_ITEMS,
  type QuestionGroup,
  type QuestionItem,
  type QuestionnairesForm,
} from "../wizardModel";
import { GROUP_TYPE, listGroupsByType, listDefinitionsByGroup } from "@/components/setup/medical/definitionsService";

interface Props {
  value: QuestionnairesForm;
  onChange: (next: QuestionnairesForm) => void;
  /** Reports resolved question catalogs (code → text) so Finish can send question_text. */
  onCatalog?: (which: "dental" | "medical", labels: Record<string, string>) => void;
}

const labelMap = (groups: QuestionGroup[]): Record<string, string> =>
  Object.fromEntries(groups.flatMap((g) => g.questions).map((q) => [q.code, q.label]));

/**
 * Step — Dental + Medical Questionnaires (legacy Denticon "Medical Information").
 * Both questionnaires render their legacy groups in legacy order, including the
 * Medical form's "Emergency Contact" and "Women Only" sections. Questions come
 * from the tenant's DENTQUEST / MEDQUEST `definitions` when seeded, else the full
 * legacy list. Clicking a section heading collapses/expands it (legacy behaviour).
 */
export default function QuestionnairesStep({ value, onChange, onCatalog }: Props) {
  const [dental, setDental] = useState<QuestionGroup[]>(DEFAULT_DENTAL_QUESTION_GROUPS);
  const [medical, setMedical] = useState<QuestionGroup[]>(DEFAULT_MEDICAL_QUESTION_GROUPS);

  useEffect(() => {
    let cancelled = false;
    onCatalog?.("dental", labelMap(DEFAULT_DENTAL_QUESTION_GROUPS));
    onCatalog?.("medical", labelMap(DEFAULT_MEDICAL_QUESTION_GROUPS));

    const load = async (
      groupType: string,
      which: "dental" | "medical",
      setter: (g: QuestionGroup[]) => void,
    ) => {
      try {
        const defGroups = await listGroupsByType(groupType);
        const loaded: QuestionGroup[] = [];
        for (const g of defGroups) {
          const defs = await listDefinitionsByGroup(g.group_code);
          if (defs.length === 0) continue;
          loaded.push({
            title: g.description,
            questions: defs.map((d) => ({
              code: d.key1 || String(d.id),
              label: d.description,
              // Questionnaire Setup stores the input type on the definition;
              // anything not explicitly text/date/textarea renders as Yes/No.
              kind: (["text", "date", "textarea"] as const).includes((d as any).key2)
                ? (d as any).key2
                : "yesno",
            })),
          });
        }
        // Only a plausibly seeded tenant catalog replaces the legacy questions
        // — see MIN_TENANT_CATALOG_ITEMS / gap LEG-1.
        const itemCount = loaded.reduce((n, g) => n + g.questions.length, 0);
        if (cancelled || itemCount < MIN_TENANT_CATALOG_ITEMS) return;
        setter(loaded);
        onCatalog?.(which, labelMap(loaded));
      } catch {
        /* keep the legacy catalog */
      }
    };
    load(GROUP_TYPE.DENTAL_QUESTIONNAIRE, "dental", setDental);
    load(GROUP_TYPE.MEDICAL_QUESTIONNAIRE, "medical", setMedical);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAnswer = (which: "dental" | "medical", code: string, ans: string) =>
    onChange({ ...value, [which]: { ...value[which], [code]: ans } });

  return (
    <div className="space-y-3">
      <GapNotice>
        Answers persist per patient via <code>patient-questionnaire-responses</code>, and the
        Emergency&nbsp;Contact block is additionally saved to the real
        <code>patient-emergency-contacts</code> resource. The question catalogs are not yet seeded
        backend-side, so the full legacy list is shown (gap LEG-1).
      </GapNotice>

      <QuestionnaireCard
        title="Dental Questionnaire"
        groups={dental}
        answers={value.dental}
        onAnswer={(code, ans) => setAnswer("dental", code, ans)}
      />
      <QuestionnaireCard
        title="Medical Questionnaire"
        groups={medical}
        answers={value.medical}
        onAnswer={(code, ans) => setAnswer("medical", code, ans)}
      />
    </div>
  );
}

function QuestionnaireCard({
  title,
  groups,
  answers,
  onAnswer,
}: {
  title: string;
  groups: QuestionGroup[];
  answers: Record<string, string>;
  onAnswer: (code: string, ans: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const total = groups.reduce((n, g) => n + g.questions.length, 0);
  const answered = groups
    .flatMap((g) => g.questions)
    .filter((q) => (answers[q.code] ?? "").trim() !== "").length;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]"
      >
        <span className="font-semibold text-[#1F3A5F] text-sm">{title}</span>
        <span className="flex items-center gap-2">
          <span className="text-xs text-[#64748B]">
            {answered}/{total} answered
          </span>
          {open ? (
            <ChevronDown className="w-4 h-4 text-[#64748B]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#64748B]" />
          )}
        </span>
      </button>
      {open && (
        <div className="p-4 space-y-4">
          {groups.map((group) => (
            <CollapsibleGroup
              key={group.title}
              group={group}
              answers={answers}
              onAnswer={onAnswer}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** One legacy sub-section ("Emergency Contact", "Women Only", …) — heading toggles it. */
function CollapsibleGroup({
  group,
  answers,
  onAnswer,
}: {
  group: QuestionGroup;
  answers: Record<string, string>;
  onAnswer: (code: string, ans: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 bg-[#F1F5F9] px-3 py-1.5 rounded text-xs font-bold text-[#1F3A5F] uppercase tracking-wide mb-2"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {group.title}
      </button>
      {open && (
        <div className="divide-y divide-[#F1F5F9]">
          {group.questions.map((q) => (
            <QuestionRow
              key={q.code}
              question={q}
              answer={answers[q.code] ?? ""}
              onAnswer={(ans) => onAnswer(q.code, ans)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const fieldCls =
  "px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] text-sm";

function QuestionRow({
  question,
  answer,
  onAnswer,
}: {
  question: QuestionItem;
  answer: string;
  onAnswer: (ans: string) => void;
}) {
  const isBlock = question.kind === "textarea";
  return (
    <div
      className={`gap-3 py-2 ${isBlock ? "" : "flex items-center justify-between"}`}
    >
      <span className="text-sm text-[#1E293B] flex-1 block mb-1">{question.label}</span>
      {question.kind === "yesno" && (
        <YesNoToggle value={answer} onChange={(ans) => onAnswer(ans)} />
      )}
      {question.kind === "text" && (
        <input
          type="text"
          value={answer}
          onChange={(e) => onAnswer(e.target.value)}
          className={`${fieldCls} w-1/2`}
        />
      )}
      {question.kind === "date" && (
        <input
          type="date"
          value={answer}
          onChange={(e) => onAnswer(e.target.value)}
          className={`${fieldCls} w-48`}
        />
      )}
      {isBlock && (
        <textarea
          value={answer}
          onChange={(e) => onAnswer(e.target.value)}
          rows={2}
          className={`${fieldCls} w-full resize-none`}
        />
      )}
    </div>
  );
}
