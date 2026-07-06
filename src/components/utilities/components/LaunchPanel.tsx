// Launch panel for kind "launch": shows the external destination, validates that
// the user is authorized (the shell already gates this — surfaced here for
// transparency), opens the app in a new tab, and reports that the launch was
// logged for auditing.
import { ExternalLink, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { UtilityDefinition } from "../types";

interface Props {
  def: UtilityDefinition;
  rolesLabel: string;
  launchedAt: string | null;
  onLaunch: () => void;
}

export default function LaunchPanel({ def, rolesLabel, launchedAt, onLaunch }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-[#E2E8F0] bg-[#F7F9FC] p-4">
        <ShieldCheck className="w-5 h-5 text-[#3A6EA5] shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold text-[#1F3A5F]">Permission verified</p>
          <p className="text-[#64748B]">Allowed roles: {rolesLabel}. Launch activity is recorded in the audit log.</p>
        </div>
      </div>

      <div className="rounded-lg border border-[#E2E8F0] p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#64748B] mb-1">Destination</p>
        <a
          href={def.launchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#3A6EA5] hover:underline break-all"
        >
          {def.launchUrl}
        </a>
      </div>

      <button
        type="button"
        onClick={onLaunch}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#3A6EA5] hover:bg-[#2f5a8c] text-white text-sm font-bold"
      >
        <ExternalLink className="w-4 h-4" /> Launch {def.title}
      </button>

      {launchedAt && (
        <div className="flex items-center gap-2 text-sm text-[#259688]">
          <CheckCircle2 className="w-4 h-4" />
          Opened in a new tab and logged at {new Date(launchedAt).toLocaleTimeString()}.
        </div>
      )}
    </div>
  );
}
