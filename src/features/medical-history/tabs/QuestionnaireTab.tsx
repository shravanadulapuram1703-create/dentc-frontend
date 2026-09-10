import TriStateToggle from "@/components/ui/TriStateToggle";
import type {
  AlertAnswer,
  QuestionGroup,
  QuestionItem,
  QuestionnaireAnswers,
} from "../medicalHistoryModel";

interface Props {
  groups: QuestionGroup[];
  answers: QuestionnaireAnswers;
  onChange: (next: QuestionnaireAnswers) => void;
  readOnly?: boolean;
}

/**
 * Tab — Dental / Medical Questionnaire. One renderer drives both: the legacy
 * screens differ only in their question catalog (and the Medical one's extra
 * Emergency Contact and Women Only sections, which are just groups).
 *
 * Legacy lays these out as a two-column table — label on the left, control on
 * the right — rather than the stacked form the create wizard used.
 */
export default function QuestionnaireTab({ groups, answers, onChange, readOnly }: Props) {
  const total = groups.reduce((n, g) => n + g.questions.length, 0);
  const filled = groups
    .flatMap((g) => g.questions)
    .filter((q) => (answers[q.code] ?? "").trim() !== "").length;

  const setAnswer = (code: string, value: string) => onChange({ ...answers, [code]: value });

  return (
    <div>
      <div className="flex items-center justify-end px-4 py-2 border-b border-[#E2E8F0]">
        <span className="text-xs font-semibold text-[#64748B]">
          {filled}/{total} answered
        </span>
      </div>

      {groups.map((group) => (
        <div key={group.title}>
          <div className="px-4 py-1.5 text-[#1D4ED8] font-semibold text-sm uppercase tracking-wide">
            {group.title}
          </div>
          <div className="border-t border-[#E2E8F0]">
            {group.questions.map((question) => (
              <QuestionRow
                key={question.code}
                question={question}
                value={answers[question.code] ?? ""}
                readOnly={readOnly}
                onChange={(v) => setAnswer(question.code, v)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const field =
  "px-3 py-1.5 border border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] text-sm bg-white";

function QuestionRow({
  question,
  value,
  onChange,
  readOnly,
}: {
  question: QuestionItem;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 px-4 py-1.5 border-b border-[#E2E8F0] odd:bg-[#F8FAFC]">
      <span className="text-sm text-[#1E293B]">{question.label}</span>
      <div>
        {question.kind === "yesno" && (
          <TriStateToggle
            label={question.label}
            // Questionnaire answers are free-text on the wire; only the three
            // legacy states are meaningful for a Yes/No row.
            value={(value === "yes" || value === "no" ? value : "") as AlertAnswer}
            disabled={readOnly}
            onChange={(next) => onChange(next)}
          />
        )}
        {question.kind === "text" && (
          <input
            type="text"
            value={value}
            readOnly={readOnly}
            onChange={(e) => onChange(e.target.value)}
            className={`${field} w-full`}
          />
        )}
        {question.kind === "date" && (
          <input
            type="date"
            value={value}
            readOnly={readOnly}
            onChange={(e) => onChange(e.target.value)}
            className={`${field} w-56`}
          />
        )}
        {question.kind === "textarea" && (
          <textarea
            value={value}
            readOnly={readOnly}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className={`${field} w-full resize-none`}
          />
        )}
      </div>
    </div>
  );
}
