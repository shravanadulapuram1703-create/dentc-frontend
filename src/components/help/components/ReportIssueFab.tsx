// Global floating button that opens the Report an Issue dialog from anywhere in
// the authenticated app. Positioned bottom-left so it never collides with the
// AI chat launcher on the bottom-right.
import { Bug } from "lucide-react";

interface Props {
  onClick: () => void;
}

export default function ReportIssueFab({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Report an issue"
      className="group fixed bottom-5 left-5 z-[9990] flex items-center gap-2 rounded-full bg-[#3A6EA5] py-3 pl-3 pr-4 text-white shadow-lg transition-all hover:bg-[#2f5a8c] hover:shadow-xl"
    >
      <Bug className="h-5 w-5" strokeWidth={2.25} />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-bold opacity-0 transition-all duration-200 group-hover:max-w-[140px] group-hover:opacity-100">
        Report an issue
      </span>
    </button>
  );
}
