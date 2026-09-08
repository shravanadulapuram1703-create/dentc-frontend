// One-line status strip explaining whether texts really go out.

import { FlaskConical, Radio, ServerOff } from "lucide-react";
import type { SmsSendCapability, SmsTransportMode } from "../transport/types";

export default function SmsModeBanner({ mode, capability }: { mode: SmsTransportMode; capability: SmsSendCapability }) {
  if (mode === "local") {
    return (
      <div className="flex items-center gap-2 border-b border-violet-200 bg-violet-50 px-4 py-1.5 text-[11px] text-violet-800">
        <FlaskConical className="h-3.5 w-3.5" />
        <span>
          <b>Demo mode</b> — texts are simulated in this browser (VITE_SMS_BACKEND=local). Nothing reaches a carrier.
        </span>
      </div>
    );
  }
  if (capability === "log_only") {
    return (
      <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-[11px] text-amber-800">
        <ServerOff className="h-3.5 w-3.5" />
        <span>
          <b>Twilio gateway not deployed</b> — the backend has the SMS log but no <code>POST /api/v1/sms/send</code>
          yet (gap SMS-1). New texts are saved as <i>Queued</i> and will not reach the patient until it ships.
        </span>
      </div>
    );
  }
  if (capability === "twilio") {
    return (
      <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-1.5 text-[11px] text-emerald-800">
        <Radio className="h-3.5 w-3.5" />
        <span>
          <b>Live</b> — texts are delivered through Twilio. Replies and delivery receipts refresh every 15 seconds.
        </span>
      </div>
    );
  }
  return null;
}
