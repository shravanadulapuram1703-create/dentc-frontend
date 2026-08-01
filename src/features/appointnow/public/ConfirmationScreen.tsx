import { CheckCircle2, CalendarClock } from "lucide-react";
import type { BookingRequest, PublicOfficeInfo } from "../transport/types";
import { formatDateLong, formatTime12 } from "./bookingUtils";

interface ConfirmationScreenProps {
  request: BookingRequest;
  office: PublicOfficeInfo;
  onBookAnother: () => void;
}

/** Shown after a request is submitted. Emphasises this is a REQUEST, not a
 *  confirmed booking — the office confirms. */
export default function ConfirmationScreen({
  request,
  office,
  onBookAnother,
}: ConfirmationScreenProps) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Request received</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        Thanks, {request.contact.first_name}! Your request has been sent to{" "}
        <span className="font-semibold">{office.name}</span>. The office will
        review it and contact you at{" "}
        <span className="font-semibold">{request.contact.phone}</span> to confirm.
      </p>

      <div className="mx-auto mt-6 max-w-sm rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <CalendarClock className="h-4 w-4 text-[#3A6EA5]" />
          Requested time
        </div>
        <div className="mt-2 text-sm text-slate-700">
          <div className="font-semibold">{request.reason_label}</div>
          <div>
            {formatDateLong(request.slot.date)} at {formatTime12(request.slot.start_time)}
          </div>
        </div>
        <div className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500">
          Confirmation code:{" "}
          <span className="font-mono font-semibold text-slate-700">{request.id}</span>
        </div>
      </div>

      <p className="mx-auto mt-4 max-w-md text-xs text-amber-700">
        This is a booking <strong>request</strong>, not a confirmed appointment.
        Your slot is held until the office confirms.
      </p>

      <button
        type="button"
        onClick={onBookAnother}
        className="mt-6 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-[#3A6EA5] hover:text-[#3A6EA5]"
      >
        Book another appointment
      </button>
    </div>
  );
}
