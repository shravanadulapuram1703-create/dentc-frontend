import { utils, components } from "../../../styles/theme";
import type { TicketStatus } from "../types";

const STYLES: Record<TicketStatus, string> = {
  Open: components.badgeInfo,
  "In Progress": components.badgeWarning,
  Submitted: components.badgeInfo,
  Done: components.badgeSuccess,
  Failed: components.badgeError,
};

export default function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={utils.cn(components.badge, STYLES[status] ?? components.badgeNeutral, "text-[11px]")}>
      {status}
    </span>
  );
}
