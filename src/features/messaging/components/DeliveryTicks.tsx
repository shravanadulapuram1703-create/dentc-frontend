import { Check, CheckCheck, Clock, TriangleAlert } from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { DeliveryStatus } from "../messagingModel";

/**
 * Delivery-status glyph shown on your own outgoing messages:
 *   sending → clock, sent → single check, delivered → double check,
 *   read → blue double check, failed → alert.
 */
export default function DeliveryTicks({
  status,
  className,
}: {
  status: DeliveryStatus;
  className?: string;
}) {
  const base = cn("inline-flex items-center", className);
  switch (status) {
    case "sending":
      return <Clock className={cn(base, "w-3.5 h-3.5 text-white/70")} aria-label="Sending" />;
    case "sent":
      return <Check className={cn(base, "w-3.5 h-3.5 text-white/80")} aria-label="Sent" />;
    case "delivered":
      return <CheckCheck className={cn(base, "w-4 h-4 text-white/80")} aria-label="Delivered" />;
    case "read":
      return <CheckCheck className={cn(base, "w-4 h-4 text-[#7CE0D3]")} aria-label="Read" />;
    case "failed":
      return <TriangleAlert className={cn(base, "w-3.5 h-3.5 text-red-300")} aria-label="Failed to send" />;
    default:
      return null;
  }
}
