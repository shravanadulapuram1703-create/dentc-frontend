// Expandable list of help articles. Self-contained accordion (one open at a
// time) with highlight-free, keyboard-accessible disclosure buttons.
import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { utils } from "../../../styles/theme";
import type { HelpArticle } from "../types";

interface Props {
  articles: HelpArticle[];
  /** Search term used to show a "match" hint; not required. */
  query?: string;
}

export default function ArticleAccordion({ articles }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (articles.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-white p-8 text-center">
        <FileText className="mx-auto mb-2 h-7 w-7 text-[#94A3B8]" strokeWidth={1.75} />
        <p className="text-sm text-[#64748B]">No articles match your search.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {articles.map((a) => {
        const isOpen = openId === a.id;
        return (
          <div
            key={a.id}
            className={utils.cn(
              "overflow-hidden rounded-lg border bg-white transition-colors",
              isOpen ? "border-[#3A6EA5] shadow-sm" : "border-[#E2E8F0]",
            )}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : a.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div className="min-w-0">
                <p className="font-semibold text-[#1E293B]">{a.title}</p>
                {!isOpen && (
                  <p className="mt-0.5 truncate text-sm text-[#64748B]">{a.summary}</p>
                )}
              </div>
              <ChevronDown
                className={utils.cn(
                  "h-5 w-5 shrink-0 text-[#94A3B8] transition-transform",
                  isOpen && "rotate-180 text-[#3A6EA5]",
                )}
              />
            </button>

            {isOpen && (
              <div className="border-t border-[#E2E8F0] px-4 py-3">
                {a.body.map((p, i) => (
                  <p key={i} className="mb-2 text-sm leading-relaxed text-[#475569]">{p}</p>
                ))}
                {a.steps && a.steps.length > 0 && (
                  <ol className="mt-1 list-decimal space-y-1.5 pl-5 text-sm text-[#475569]">
                    {a.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
