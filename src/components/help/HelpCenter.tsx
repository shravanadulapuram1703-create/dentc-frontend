// Modern Help Center. A searchable, categorized hub — user guides, FAQs,
// troubleshooting, release notes, and contact — with a prominent, always-present
// "Report an Issue" action that files a tracked support ticket via Jira.
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Bug,
  LifeBuoy,
  BookOpen,
  HelpCircle,
  Wrench,
  FileText,
  MessageCircle,
  Phone,
  Mail,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useHelp } from "./HelpProvider";
import { components, utils } from "../../styles/theme";
import WidgetCard from "../dashboard/components/WidgetCard";
import ArticleAccordion from "./components/ArticleAccordion";
import MyTicketsPanel from "./components/MyTicketsPanel";
import {
  ARTICLES,
  CATEGORIES,
  CONTACT,
  RELEASE_NOTES,
  SYSTEM_INFO,
} from "./content/helpContent";
import type { HelpArticle, HelpCategoryId } from "./types";

type Tab = "all" | HelpCategoryId;

const VALID_TABS: Tab[] = ["all", "guides", "faqs", "troubleshooting", "release-notes", "contact"];

const CAT_ICON: Record<HelpCategoryId, typeof BookOpen> = {
  guides: BookOpen,
  faqs: HelpCircle,
  troubleshooting: Wrench,
  "release-notes": FileText,
  contact: MessageCircle,
};

function matches(a: HelpArticle, q: string): boolean {
  if (!q.trim()) return true;
  const hay = [a.title, a.summary, ...a.body, ...(a.steps ?? []), ...(a.keywords ?? [])]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term));
}

export default function HelpCenter() {
  const { openReportIssue } = useHelp();
  const [query, setQuery] = useState("");
  const [params, setParams] = useSearchParams();

  const rawTab = params.get("tab") as Tab | null;
  const tab: Tab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : "all";
  const setTab = (t: Tab) =>
    setParams(t === "all" ? {} : { tab: t }, { replace: true });

  const searching = query.trim().length > 0;

  const searchResults = useMemo(
    () => (searching ? ARTICLES.filter((a) => matches(a, query)) : []),
    [query, searching],
  );

  const byCategory = (cat: HelpCategoryId) => ARTICLES.filter((a) => a.category === cat);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-2 flex items-center gap-2 text-white/70">
              <LifeBuoy className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Help Center</span>
            </div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">How can we help?</h1>
            <p className="mt-1.5 text-sm text-white/80">
              Search our guides, browse answers, or report an issue — we'll take it from there.
            </p>
            {/* Search */}
            <div className="relative mt-5">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search help articles, guides, and FAQs…"
                className="w-full rounded-xl border-0 bg-white py-3 pl-12 pr-4 text-sm text-[#1E293B] shadow-lg outline-none ring-2 ring-transparent focus:ring-[#2FB9A7]"
              />
            </div>
          </div>

          {/* Report an issue CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => openReportIssue()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-[#1F3A5F] shadow-lg transition-all hover:bg-[#EFF6FF] hover:shadow-xl lg:w-auto"
            >
              <Bug className="h-5 w-5 text-[#3A6EA5]" />
              Report an Issue
            </button>
            <p className="mt-2 text-center text-xs text-white/60">
              Creates a tracked support ticket
            </p>
          </div>
        </div>
      </div>

      {/* Category chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        <Chip active={tab === "all" && !searching} onClick={() => { setTab("all"); setQuery(""); }} icon={Sparkles}>
          All
        </Chip>
        {CATEGORIES.map((c) => {
          const Icon = CAT_ICON[c.id];
          return (
            <Chip
              key={c.id}
              active={tab === c.id && !searching}
              onClick={() => { setTab(c.id); setQuery(""); }}
              icon={Icon}
            >
              {c.label}
            </Chip>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {searching ? (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#1F3A5F]">
                {searchResults.length} result{searchResults.length === 1 ? "" : "s"} for “{query.trim()}”
              </h2>
              <ArticleAccordion articles={searchResults} query={query} />
            </section>
          ) : tab === "contact" ? (
            <ContactSection onReport={() => openReportIssue()} />
          ) : tab === "release-notes" ? (
            <ReleaseNotesSection />
          ) : tab === "all" ? (
            <>
              {(["guides", "faqs", "troubleshooting"] as HelpCategoryId[]).map((cat) => {
                const meta = CATEGORIES.find((c) => c.id === cat)!;
                const Icon = CAT_ICON[cat];
                return (
                  <section key={cat}>
                    <div className="mb-3 flex items-center gap-2">
                      <Icon className="h-5 w-5 text-[#3A6EA5]" />
                      <div>
                        <h2 className="text-sm font-bold uppercase tracking-wide text-[#1F3A5F]">{meta.label}</h2>
                        <p className="text-xs text-[#64748B]">{meta.blurb}</p>
                      </div>
                    </div>
                    <ArticleAccordion articles={byCategory(cat)} />
                  </section>
                );
              })}
            </>
          ) : (
            <section>
              <div className="mb-3 flex items-center gap-2">
                {(() => {
                  const Icon = CAT_ICON[tab];
                  const meta = CATEGORIES.find((c) => c.id === tab)!;
                  return (
                    <>
                      <Icon className="h-5 w-5 text-[#3A6EA5]" />
                      <div>
                        <h2 className="text-sm font-bold uppercase tracking-wide text-[#1F3A5F]">{meta.label}</h2>
                        <p className="text-xs text-[#64748B]">{meta.blurb}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <ArticleAccordion articles={byCategory(tab)} />
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Report CTA card */}
          <div className="rounded-lg border-2 border-[#3A6EA5] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-[#3A6EA5]" />
              <h3 className="font-bold text-[#1F3A5F]">Found a problem?</h3>
            </div>
            <p className="mt-1.5 text-sm text-[#64748B]">
              File a support ticket. We capture your version, browser, and screen automatically.
            </p>
            <button
              type="button"
              onClick={() => openReportIssue()}
              className={utils.cn(components.buttonPrimary, "mt-3 flex w-full items-center justify-center gap-2")}
            >
              Report an Issue <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <MyTicketsPanel />

          {/* Contact */}
          <WidgetCard title="Contact Support" icon={<MessageCircle className="h-4 w-4" />}>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-[#3A6EA5]" />
                <div>
                  <p className="font-semibold text-[#1E293B]">{CONTACT.phone}</p>
                  <p className="text-xs text-[#64748B]">{CONTACT.phoneHours}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-[#3A6EA5]" />
                <div>
                  <a href={`mailto:${CONTACT.email}`} className="font-semibold text-[#3A6EA5] hover:underline">
                    {CONTACT.email}
                  </a>
                  <p className="text-xs text-[#64748B]">{CONTACT.emailSla}</p>
                </div>
              </div>
            </div>
          </WidgetCard>

          {/* System info */}
          <WidgetCard title="System Information" icon={<FileText className="h-4 w-4" />}>
            <dl className="space-y-2 text-sm">
              <Row label="Version" value={SYSTEM_INFO.version} />
              <Row label="License" value={SYSTEM_INFO.license} />
            </dl>
          </WidgetCard>
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof BookOpen;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={utils.cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
        active
          ? "border-[#3A6EA5] bg-[#3A6EA5] text-white"
          : "border-[#E2E8F0] bg-white text-[#475569] hover:border-[#3A6EA5] hover:text-[#3A6EA5]",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-[#64748B]">{label}</dt>
      <dd className="font-semibold text-[#1E293B]">{value}</dd>
    </div>
  );
}

function ReleaseNotesSection() {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-5 w-5 text-[#3A6EA5]" />
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#1F3A5F]">Release Notes</h2>
          <p className="text-xs text-[#64748B]">What's new, improved, and fixed.</p>
        </div>
      </div>
      <div className="space-y-3">
        {RELEASE_NOTES.map((r) => (
          <div key={r.version} className="rounded-lg border border-[#E2E8F0] bg-white p-4">
            <div className="flex items-baseline justify-between">
              <h3 className="font-bold text-[#1F3A5F]">Version {r.version}</h3>
              <span className="text-xs text-[#94A3B8]">{r.date}</span>
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#475569]">
              {r.highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactSection({ onReport }: { onReport: () => void }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-[#3A6EA5]" />
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#1F3A5F]">Contact Support</h2>
          <p className="text-xs text-[#64748B]">Reach a human when you need one.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border-2 border-[#3A6EA5] bg-white p-5">
          <Bug className="h-6 w-6 text-[#3A6EA5]" />
          <h3 className="mt-2 font-bold text-[#1F3A5F]">Report an Issue</h3>
          <p className="mt-1 text-sm text-[#64748B]">
            Fastest path — files a tracked ticket with full context attached.
          </p>
          <button type="button" onClick={onReport} className={utils.cn(components.buttonPrimary, "mt-3 w-full")}>
            Open the form
          </button>
        </div>
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
          <Phone className="h-6 w-6 text-[#3A6EA5]" />
          <h3 className="mt-2 font-bold text-[#1F3A5F]">Call us</h3>
          <p className="mt-1 text-sm font-semibold text-[#1E293B]">{CONTACT.phone}</p>
          <p className="text-xs text-[#64748B]">{CONTACT.phoneHours}</p>
          <div className="mt-3 border-t border-[#E2E8F0] pt-3">
            <a href={`mailto:${CONTACT.email}`} className="text-sm font-semibold text-[#3A6EA5] hover:underline">
              {CONTACT.email}
            </a>
            <p className="text-xs text-[#64748B]">{CONTACT.emailSla}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
