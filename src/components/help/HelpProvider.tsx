// App-wide provider that makes "Report an Issue" reachable from anywhere:
//   - exposes useHelp().openReportIssue() to any component (nav menu, Help page)
//   - renders the global floating action button on authenticated screens
//   - owns the single ReportIssueDialog instance
//
// Mounted once in App below the Router + AuthProvider so it can read auth/route.
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import ReportIssueDialog from "./components/ReportIssueDialog";
import ReportIssueFab from "./components/ReportIssueFab";
import type { TicketFormValues, TicketSubmitResult } from "./types";

interface HelpContextValue {
  /** Open the Report an Issue dialog, optionally prefilling fields. */
  openReportIssue: (prefill?: Partial<TicketFormValues>) => void;
  closeReportIssue: () => void;
}

const HelpContext = createContext<HelpContextValue | undefined>(undefined);

/** Routes where the floating button should stay hidden. */
const HIDDEN_FAB_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/activate-legacy",
  "/signup",
  "/help", // the Help Center has its own prominent button
];

export function HelpProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<Partial<TicketFormValues> | undefined>(undefined);

  const openReportIssue = useCallback((pf?: Partial<TicketFormValues>) => {
    setPrefill(pf);
    setOpen(true);
  }, []);

  const closeReportIssue = useCallback(() => setOpen(false), []);

  const value = useMemo<HelpContextValue>(
    () => ({ openReportIssue, closeReportIssue }),
    [openReportIssue, closeReportIssue],
  );

  const showFab =
    isAuthenticated &&
    !HIDDEN_FAB_PREFIXES.some((p) => location.pathname.startsWith(p));

  const onSubmitted = (result: TicketSubmitResult) => {
    if (result.ok && result.issue_key) {
      toast.success(`Ticket ${result.issue_key} submitted`);
    }
    // Let any open "My Tickets" list refresh itself.
    window.dispatchEvent(new CustomEvent("help:ticket-created"));
  };

  return (
    <HelpContext.Provider value={value}>
      {children}
      {showFab && <ReportIssueFab onClick={() => openReportIssue()} />}
      <ReportIssueDialog
        open={open}
        onClose={closeReportIssue}
        prefill={prefill}
        onSubmitted={onSubmitted}
      />
    </HelpContext.Provider>
  );
}

export function useHelp(): HelpContextValue {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error("useHelp must be used within HelpProvider");
  return ctx;
}
