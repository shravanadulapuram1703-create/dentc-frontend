import { cn } from "@/components/ui/utils";
import type { PresenceStatus } from "../messagingModel";

const COLOR: Record<PresenceStatus, string> = {
  online: "bg-[#2FB9A7]",
  away: "bg-[#F59E0B]",
  offline: "bg-[#94A3B8]",
};

const SIZE = {
  sm: "w-2.5 h-2.5",
  md: "w-3 h-3",
};

/** Small colored presence indicator (online/away/offline). */
export default function PresenceDot({
  status,
  size = "sm",
  ring = true,
  className,
}: {
  status: PresenceStatus;
  size?: "sm" | "md";
  ring?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full",
        SIZE[size],
        COLOR[status],
        ring && "ring-2 ring-white",
        className,
      )}
      title={status}
      aria-label={status}
    />
  );
}
