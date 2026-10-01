// App-wide provider that makes "Report an Issue" reachable from anywhere:
//   - exposes useHelp().openReportIssue() to any component (nav header button,
//     nav menu, Help page)
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
import { toast } from "sonner";
import ReportIssueDialog from "./components/ReportIssueDialog";
import type { TicketFormValues, TicketSubmitResult } from "./types";

interface HelpContextValue {
  /** Open the Report an Issue dialog, optionally prefilling fields. */
  openReportIssue: (prefill?: Partial<TicketFormValues>) => void;
  closeReportIssue: () => void;
}

const HelpContext = createContext<HelpContextValue | undefined>(undefined);

export function HelpProvider({ children }: { children: ReactNode }) {
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
