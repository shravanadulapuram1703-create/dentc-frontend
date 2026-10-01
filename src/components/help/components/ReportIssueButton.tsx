// Header button that opens the Report an Issue dialog from anywhere in the
// authenticated app. Lives in the GlobalNav top bar next to the Messages
// launcher and the AppointNow bell (it used to be a floating bottom-left FAB,
// which sat on top of page footers and action buttons).
import { Bug } from "lucide-react";
import { useHelp } from "../HelpProvider";

export default function ReportIssueButton() {
  const { openReportIssue } = useHelp();

  return (
    <button
      type="button"
      onClick={() => openReportIssue()}
      title="Report an issue"
      aria-label="Report an issue"
      className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 border border-white/30 text-white transition-all backdrop-blur-sm"
    >
      <Bug className="w-5 h-5" strokeWidth={2} />
    </button>
  );
}
