// Editable Help Center content. Articles are grouped by category and rendered
// as searchable, expandable panels. Keep entries concise and task-focused —
// this is a data file, so writers can extend it without touching components.
import type { HelpArticle, HelpCategoryId, ReleaseNote } from "../types";
import { env } from "@/shared/config/env";

export interface CategoryMeta {
  id: HelpCategoryId;
  label: string;
  blurb: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "guides", label: "User Guides", blurb: "Step-by-step walkthroughs of everyday workflows." },
  { id: "faqs", label: "FAQs", blurb: "Quick answers to the questions we hear most." },
  { id: "troubleshooting", label: "Troubleshooting", blurb: "Fix common problems without waiting on support." },
  { id: "release-notes", label: "Release Notes", blurb: "What's new, improved, and fixed in each release." },
  { id: "contact", label: "Contact Support", blurb: "Reach a human when you need one." },
];

export const ARTICLES: HelpArticle[] = [
  // --- User Guides ----------------------------------------------------------
  {
    id: "guide-add-patient",
    category: "guides",
    title: "Add a new patient",
    summary: "Create a patient record and set their home office in a few steps.",
    body: ["New patients are created from the Patient menu and become the active patient once saved."],
    steps: [
      "Open Patient → Add New Patient from the top navigation.",
      "Complete the required demographics (name, date of birth, contact).",
      "Assign the patient's home office and responsible party.",
      "Click Save — the record opens and becomes your active patient.",
    ],
    keywords: ["patient", "create", "register", "demographics", "new"],
  },
  {
    id: "guide-schedule-appointment",
    category: "guides",
    title: "Book an appointment",
    summary: "Schedule, reschedule, and set appointment status from the Scheduler.",
    body: ["The Scheduler supports day, week, and month views with drag-to-reschedule."],
    steps: [
      "Open Scheduler and pick the provider column and date.",
      "Click an open slot to start a new appointment.",
      "Choose the patient, procedures, and duration, then save.",
      "Use the status bar (S·C·U·L·R·A·O·H) to update the appointment's state.",
    ],
    keywords: ["appointment", "schedule", "booking", "calendar", "reschedule"],
  },
  {
    id: "guide-run-report",
    category: "guides",
    title: "Run and export a report",
    summary: "Filter any report, then export to CSV, Excel, PDF, or print.",
    body: ["Reports share one runner: set filters, run, then export the results."],
    steps: [
      "Open Reports and choose a report (e.g. Production, Collections).",
      "Set the date range, office, and any report-specific filters.",
      "Click Run report to preview the summary, chart, and table.",
      "Export with the CSV / Excel / PDF / Print buttons above the table.",
    ],
    keywords: ["report", "export", "csv", "excel", "pdf", "print", "production"],
  },
  {
    id: "guide-post-payment",
    category: "guides",
    title: "Post a payment",
    summary: "Record a patient or insurance payment and allocate it to charges.",
    body: ["Payments are entered from the patient's Transactions Entry screen and allocated by amount."],
    steps: [
      "Open the patient and go to Transactions → Transaction Entry.",
      "Switch to the Payments tab and choose the payment type.",
      "Enter the amount and allocate it across outstanding procedures.",
      "Save — the ledger balance updates immediately.",
    ],
    keywords: ["payment", "post", "ledger", "allocate", "transaction", "billing"],
  },

  // --- FAQs -----------------------------------------------------------------
  {
    id: "faq-switch-office",
    category: "faqs",
    title: "How do I switch offices?",
    summary: "Use the Office selector in the top-right of the navigation bar.",
    body: [
      "Click the Office button in the header and pick a different location. Your selection persists across the session and scopes office-aware screens like Reports and the Scheduler.",
    ],
    keywords: ["office", "switch", "location", "change"],
  },
  {
    id: "faq-reset-password",
    category: "faqs",
    title: "How do I change my password?",
    summary: "Update it under Setup → Security → Change My Password.",
    body: [
      "Go to Setup → Security → Change My Password, enter your current password, then your new one twice. If you're locked out, use Forgot Password on the login screen.",
    ],
    keywords: ["password", "change", "reset", "security", "login"],
  },
  {
    id: "faq-active-patient",
    category: "faqs",
    title: "Why does a patient stay selected between screens?",
    summary: "The app remembers your last patient so clinical screens stay in context.",
    body: [
      "Your most recently opened patient is kept as the active patient and reopens automatically — even after logout. To pick a different one, use Patient → Search Patient.",
    ],
    keywords: ["active patient", "context", "persist", "default"],
  },
  {
    id: "faq-support-ticket",
    category: "faqs",
    title: "How do I report a problem?",
    summary: "Use Report an Issue — it files a tracked support ticket.",
    body: [
      "Click Report an Issue (in the Help Center, the Help menu, or the floating button). Your details are captured automatically, and you'll get a ticket ID to track progress.",
    ],
    keywords: ["report", "issue", "bug", "ticket", "support", "jira"],
  },

  // --- Troubleshooting ------------------------------------------------------
  {
    id: "trouble-blank-list",
    category: "troubleshooting",
    title: "A list or table is empty",
    summary: "Usually a filter or office scope hiding the data.",
    body: ["Empty results are most often a filter, date range, or office mismatch rather than missing data."],
    steps: [
      "Check the active Office in the header — data is scoped to it.",
      "Widen the date range or clear search/status filters.",
      "Reload the page to refetch, then retry.",
      "If it persists, use Report an Issue so we can investigate.",
    ],
    keywords: ["blank", "empty", "missing", "list", "table", "no data"],
  },
  {
    id: "trouble-session-expired",
    category: "troubleshooting",
    title: "I keep getting logged out",
    summary: "Your session expired — sign back in to continue.",
    body: [
      "For security, sessions expire after a period of inactivity. Sign in again to resume. If it happens repeatedly within minutes, your device clock or a browser extension may be interfering — try a different browser and report it if it continues.",
    ],
    keywords: ["logout", "session", "expired", "401", "unauthorized", "login"],
  },
  {
    id: "trouble-save-failed",
    category: "troubleshooting",
    title: "A save or action failed",
    summary: "Check your connection, then retry; capture the details if it repeats.",
    body: ["Transient network errors are the usual cause of a failed save."],
    steps: [
      "Confirm you're online and the page hasn't gone stale — reload if unsure.",
      "Retry the action once.",
      "If it fails again, note what you were doing and click Report an Issue.",
      "Attach a screenshot — the form captures your screen, version, and browser automatically.",
    ],
    keywords: ["save", "error", "failed", "retry", "network"],
  },

  // --- Contact --------------------------------------------------------------
  {
    id: "contact-support",
    category: "contact",
    title: "Contact support",
    summary: "Phone, email, and ticketing options.",
    body: [
      "Fastest resolution comes from Report an Issue — it attaches full context so we can reproduce problems quickly. For urgent, work-stopping issues, call the support line.",
    ],
    keywords: ["contact", "support", "phone", "email", "help"],
  },
];

/** Contact channels shown on the Contact card. */
export const CONTACT = {
  phone: "1-800-DENTAL-PMS",
  phoneHours: "Mon–Fri, 8am–6pm EST",
  email: "support@reckondental.com",
  emailSla: "We reply within 1 business day",
};

/** System info shown in the Help sidebar. */
export const SYSTEM_INFO = {
  version: env.appVersion,
  license: "Enterprise",
};

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: env.appVersion,
    date: "Current release",
    highlights: [
      "New Help Center with search, guides, FAQs, and troubleshooting.",
      "Report an Issue now files tracked support tickets with auto-captured context.",
      "Responsive layout refinements across the app.",
    ],
  },
  {
    version: "4.2.0",
    date: "Previous release",
    highlights: [
      "Reports runner: filter → preview → export (CSV / Excel / PDF).",
      "Modernized Scheduler with denormalized appointment feed.",
      "Account Ledger and Transactions Entry rebuilt.",
    ],
  },
];
