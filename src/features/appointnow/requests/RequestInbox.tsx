// RequestInbox — the staff view of incoming AppointNow online-booking requests
// (route /appointnow/requests, rendered inside the app shell). Lists requests by
// status, exposes Approve (books the slot into the scheduler via the context) and
// Decline, and surfaces the public booking link staff paste on external sites.

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CalendarRange,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { listOffices } from "@/api/generated/endpoints/organization/organization";
import { officeIdNum } from "@/services/schedulerApi";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointNow } from "../AppointNowContext";
import { SlotConflictError, type SlotConflict } from "../staffBooking";
import type { AvailableSlot, BookingRequest, BookingRequestStatus } from "../transport/types";
import { formatDateLong, formatTime12, todayIso } from "../public/bookingUtils";

type Filter = BookingRequestStatus | "all";

const STATUS_STYLE: Record<BookingRequestStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  declined: "bg-slate-200 text-slate-600",
  expired: "bg-slate-100 text-slate-400",
};

function StatusBadge({ status }: { status: BookingRequestStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

/** HH:MM + minutes → HH:MM (clamped to the same day). */
function addMinutes(hhmm: string, minutes: number): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** The red double-booking pop-up shown when approve / reschedule hits an overlap. */
function ConflictDialog({
  conflict,
  onClose,
  onPickAnotherTime,
}: {
  conflict: { slot: AvailableSlot; conflicts: SlotConflict[] };
  onClose: () => void;
  onPickAnotherTime: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="an-conflict-title"
      data-testid="appointnow-conflict-dialog"
    >
      <div className="w-full max-w-lg rounded-2xl border-2 border-red-500 bg-white shadow-2xl">
        <div className="flex items-start gap-3 rounded-t-2xl bg-red-600 px-5 py-4 text-white">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />
          <div>
            <h3 id="an-conflict-title" className="text-base font-bold">
              Time slot already booked
            </h3>
            <p className="mt-0.5 text-sm text-red-50">
              {formatDateLong(conflict.slot.date)} · {formatTime12(conflict.slot.start_time)} –{" "}
              {formatTime12(conflict.slot.end_time)} overlaps{" "}
              {conflict.conflicts.length === 1
                ? "an existing appointment"
                : `${conflict.conflicts.length} existing appointments`}{" "}
              in the scheduler. Nothing was booked.
            </p>
          </div>
        </div>
        <ul className="max-h-64 divide-y divide-red-100 overflow-y-auto px-5 py-2">
          {conflict.conflicts.map((c) => (
            <li key={c.appointment_id} className="py-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-900">{c.patient_name}</span>
                <span className="font-mono text-xs text-red-700">
                  {formatTime12(c.start_time)} – {formatTime12(c.end_time)}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {c.procedure_label ? `${c.procedure_label} · ` : ""}
                {c.provider_name ? `${c.provider_name} · ` : ""}
                {c.operatory_name || "Operatory"}
                <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 font-semibold uppercase text-red-700">
                  {c.kind === "provider" ? "Provider busy" : "Chair taken"}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2 rounded-b-2xl border-t border-red-100 bg-red-50/60 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onPickAnotherTime}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            <CalendarRange className="h-4 w-4" /> Choose another time
          </button>
        </div>
      </div>
    </div>
  );
}

function RequestCard({
  request,
  onApprove,
  onDecline,
  onReschedule,
  busy,
  rescheduling,
  setRescheduling,
}: {
  request: BookingRequest;
  onApprove: () => void;
  onDecline: (reason: string) => void;
  onReschedule: (slot: AvailableSlot) => Promise<boolean>;
  busy: boolean;
  /** Controlled from the parent so the conflict dialog can open the panel. */
  rescheduling: boolean;
  setRescheduling: (open: boolean) => void;
}) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState(request.slot.date);
  const [newStart, setNewStart] = useState(request.slot.start_time);
  const name = `${request.contact.first_name} ${request.contact.last_name}`.trim();
  const newEnd = addMinutes(newStart, request.slot.duration_minutes);
  const unchanged = newDate === request.slot.date && newStart === request.slot.start_time;

  const submitReschedule = async () => {
    const ok = await onReschedule({
      ...request.slot,
      date: newDate,
      start_time: newStart,
      end_time: newEnd,
    });
    if (ok) setRescheduling(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-900">
              {name || "New patient"}
            </span>
            {request.contact.is_new_patient && (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                New
              </span>
            )}
            <StatusBadge status={request.status} />
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#3A6EA5]">
            <CalendarClock className="h-4 w-4" />
            {formatDateLong(request.slot.date)} at {formatTime12(request.slot.start_time)}
            <span className="text-slate-400">·</span>
            <span className="text-slate-600">{request.reason_label}</span>
          </div>
          {request.original_slot && (
            <div className="mt-0.5 text-xs text-amber-700">
              Rescheduled by staff · patient originally asked for{" "}
              {formatDateLong(request.original_slot.date)} at{" "}
              {formatTime12(request.original_slot.start_time)}
            </div>
          )}
        </div>
        <div className="text-right text-xs text-slate-400">
          <div>Code: <span className="font-mono">{request.id.slice(0, 12)}</span></div>
          <div>Office: {request.office_code}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <Phone className="h-4 w-4 text-slate-400" /> {request.contact.phone}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Mail className="h-4 w-4 text-slate-400" /> {request.contact.email}
        </span>
        {request.contact.date_of_birth && (
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4 text-slate-400" /> DOB {request.contact.date_of_birth}
          </span>
        )}
      </div>

      {request.contact.insurance_info && (
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-semibold text-slate-700">Insurance:</span>{" "}
          {request.contact.insurance_info}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>
          Disclaimer:{" "}
          <span className={request.contact.disclaimer_accepted ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>
            {request.contact.disclaimer_accepted ? "Yes" : "No"}
          </span>
        </span>
        <span>
          Consent to calls/texts:{" "}
          <span className={request.contact.consent_accepted ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>
            {request.contact.consent_accepted ? "Yes" : "No"}
          </span>
        </span>
      </div>

      {request.contact.notes && (
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {request.contact.notes}
        </p>
      )}

      {request.status === "approved" && request.appointment_id && (
        <p className="mt-2 text-xs text-emerald-700">
          Booked as appointment{" "}
          <span className="font-mono font-semibold">{request.appointment_id}</span>
          {request.actioned_by ? ` by ${request.actioned_by}` : ""}.
        </p>
      )}
      {request.status === "declined" && (
        <p className="mt-2 text-xs text-slate-500">
          Declined{request.actioned_by ? ` by ${request.actioned_by}` : ""}
          {request.decline_reason ? ` — ${request.decline_reason}` : ""}.
        </p>
      )}

      {request.status === "pending" && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          {rescheduling ? (
            <div className="space-y-3 rounded-lg border border-[#3A6EA5]/30 bg-[#3A6EA5]/5 p-3">
              <div className="text-sm font-semibold text-slate-800">
                Reschedule before booking
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {request.slot.duration_minutes} min · contact details are kept as entered by the patient
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block text-xs font-semibold text-slate-600">
                  New date
                  <input
                    type="date"
                    min={todayIso()}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-normal text-slate-900 outline-none focus:border-[#3A6EA5]"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  Start time
                  <input
                    type="time"
                    step={300}
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-normal text-slate-900 outline-none focus:border-[#3A6EA5]"
                  />
                </label>
                <div className="block text-xs font-semibold text-slate-600">
                  Ends
                  <div className="mt-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-normal text-slate-700">
                    {formatTime12(newEnd)}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRescheduling(false)}
                  disabled={busy}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitReschedule}
                  disabled={busy || unchanged || !newDate || !newStart}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#3A6EA5] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#2C5282] disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarRange className="h-4 w-4" />}
                  Check availability & save
                </button>
              </div>
            </div>
          ) : declining ? (
            <div className="space-y-2">
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#3A6EA5]"
                placeholder="Reason for declining (optional)…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeclining(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onDecline(reason)}
                  disabled={busy}
                  className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Confirm decline
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeclining(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-60"
              >
                <X className="h-4 w-4" /> Decline
              </button>
              <button
                type="button"
                onClick={() => setRescheduling(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#3A6EA5]/50 px-3.5 py-2 text-sm font-semibold text-[#3A6EA5] hover:bg-[#3A6EA5]/5 disabled:opacity-60"
              >
                <CalendarRange className="h-4 w-4" /> Reschedule
              </button>
              <button
                type="button"
                onClick={onApprove}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Approve & book
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RequestInbox() {
  const { currentOffice } = useAuth();
  const { requests, pendingCount, isSimulated, refresh, approve, decline, reschedule } =
    useAppointNow();

  const [filter, setFilter] = useState<Filter>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  /** Request whose reschedule panel is open (one at a time). */
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  /** Double-booking pop-up state (set by approve / reschedule on overlap). */
  const [conflict, setConflict] = useState<{
    request_id: string;
    slot: AvailableSlot;
    conflicts: SlotConflict[];
  } | null>(null);

  // Search + filters (all client-side over the loaded requests).
  const [search, setSearch] = useState("");
  const [officeFilter, setOfficeFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [newPatientFilter, setNewPatientFilter] = useState<"all" | "new" | "existing">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<"created_desc" | "created_asc" | "slot_asc" | "slot_desc">(
    "created_desc",
  );

  // Offices → public link picker.
  const [offices, setOffices] = useState<Array<{ id: number; office_code: string; name: string }>>([]);
  const [linkOfficeCode, setLinkOfficeCode] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    listOffices({ size: 200 })
      .then((res) => {
        if (cancelled) return;
        const items = (res?.items ?? []).map((o) => ({
          id: o.id,
          office_code: o.office_code,
          name: o.name,
        }));
        setOffices(items);
        const currentId = officeIdNum(currentOffice);
        const match = items.find((o) => o.id === currentId) ?? items[0];
        if (match) setLinkOfficeCode(match.office_code);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [currentOffice]);

  const publicUrl = linkOfficeCode
    ? `${window.location.origin}/book/${linkOfficeCode}`
    : "";

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, declined: 0, expired: 0, all: requests.length };
    requests.forEach((r) => (c[r.status] += 1));
    return c;
  }, [requests]);

  // Distinct offices / reasons present in the current requests (for the dropdowns).
  const officeOptions = useMemo(
    () => [...new Set(requests.map((r) => r.office_code))].sort(),
    [requests],
  );
  const reasonOptions = useMemo(
    () => [...new Set(requests.map((r) => r.reason_label))].sort(),
    [requests],
  );

  const activeFilterCount =
    (officeFilter ? 1 : 0) +
    (reasonFilter ? 1 : 0) +
    (newPatientFilter !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const clearFilters = () => {
    setSearch("");
    setOfficeFilter("");
    setReasonFilter("");
    setNewPatientFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = requests.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (officeFilter && r.office_code !== officeFilter) return false;
      if (reasonFilter && r.reason_label !== reasonFilter) return false;
      if (newPatientFilter === "new" && !r.contact.is_new_patient) return false;
      if (newPatientFilter === "existing" && r.contact.is_new_patient) return false;
      if (dateFrom && r.slot.date < dateFrom) return false;
      if (dateTo && r.slot.date > dateTo) return false;
      if (q) {
        const hay = [
          r.contact.first_name,
          r.contact.last_name,
          r.contact.phone,
          r.contact.email,
          r.reason_label,
          r.office_code,
          r.id,
          r.contact.notes ?? "",
          r.contact.insurance_info ?? "",
          r.appointment_id ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...list].sort((a, b) => {
      switch (sort) {
        case "created_asc":
          return (a.created_at || "").localeCompare(b.created_at || "");
        case "slot_asc":
          return (a.slot.date + a.slot.start_time).localeCompare(b.slot.date + b.slot.start_time);
        case "slot_desc":
          return (b.slot.date + b.slot.start_time).localeCompare(a.slot.date + a.slot.start_time);
        case "created_desc":
        default:
          return (b.created_at || "").localeCompare(a.created_at || "");
      }
    });
    return sorted;
  }, [
    requests,
    filter,
    search,
    officeFilter,
    reasonFilter,
    newPatientFilter,
    dateFrom,
    dateTo,
    sort,
  ]);

  const handleApprove = async (id: string) => {
    setBusyId(id);
    try {
      await approve(id);
    } catch (e) {
      if (e instanceof SlotConflictError) {
        setConflict({ request_id: id, slot: e.slot, conflicts: e.conflicts });
        toast.error("Time slot already booked", { description: e.message });
      } else {
        toast.error("Could not book appointment", {
          description: e instanceof Error ? e.message : "Please try again.",
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  /** Returns true when the new slot was saved (free), false on conflict / error. */
  const handleReschedule = async (id: string, slot: AvailableSlot): Promise<boolean> => {
    setBusyId(id);
    try {
      await reschedule(id, slot);
      return true;
    } catch (e) {
      if (e instanceof SlotConflictError) {
        setConflict({ request_id: id, slot: e.slot, conflicts: e.conflicts });
        toast.error("Time slot already booked", { description: e.message });
      } else {
        toast.error("Could not reschedule request", {
          description: e instanceof Error ? e.message : "Please try again.",
        });
      }
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (id: string, reason: string) => {
    setBusyId(id);
    try {
      await decline(id, reason.trim() || undefined);
    } finally {
      setBusyId(null);
    }
  };

  const doRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Public booking link copied");
    } catch {
      toast.message("Copy failed — select and copy the link manually.");
    }
  };

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "approved", label: "Approved", count: counts.approved },
    { key: "declined", label: "Declined", count: counts.declined },
    { key: "all", label: "All", count: counts.all },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Bell className="h-6 w-6 text-[#3A6EA5]" />
            AppointNow Requests
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-sm font-bold text-white">
                {pendingCount}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Online booking requests from your public scheduling page.
          </p>
        </div>
        <button
          type="button"
          onClick={doRefresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Public link */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <ExternalLink className="h-4 w-4 text-[#3A6EA5]" />
          Public booking link
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Paste this URL on your website so patients can request appointments.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {offices.length > 1 && (
            <select
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-[#3A6EA5]"
              value={linkOfficeCode}
              onChange={(e) => setLinkOfficeCode(e.target.value)}
            >
              {offices.map((o) => (
                <option key={o.id} value={o.office_code}>
                  {o.name} ({o.office_code})
                </option>
              ))}
            </select>
          )}
          <code className="flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {publicUrl || "No office available"}
          </code>
          <button
            type="button"
            onClick={copyLink}
            disabled={!publicUrl}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-50"
          >
            <Copy className="h-4 w-4" /> Copy
          </button>
          <a
            href={publicUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-lg bg-[#3A6EA5] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2C5282] ${
              publicUrl ? "" : "pointer-events-none opacity-50"
            }`}
          >
            <ExternalLink className="h-4 w-4" /> Preview
          </a>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              filter === f.key
                ? "bg-[#3A6EA5] text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300"
            }`}
          >
            {f.label}
            <span
              className={`ml-1.5 ${filter === f.key ? "text-white/80" : "text-slate-400"}`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, email, reason, code…"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-8 text-sm outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-700 outline-none focus:border-[#3A6EA5]"
            title="Sort"
          >
            <option value="created_desc">Newest request</option>
            <option value="created_asc">Oldest request</option>
            <option value="slot_asc">Appointment date ↑</option>
            <option value="slot_desc">Appointment date ↓</option>
          </select>
        </div>

        {/* Filter row */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
          </span>
          {officeOptions.length > 1 && (
            <select
              value={officeFilter}
              onChange={(e) => setOfficeFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-[#3A6EA5]"
              title="Office"
            >
              <option value="">All offices</option>
              {officeOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          )}
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-[#3A6EA5]"
            title="Reason"
          >
            <option value="">All reasons</option>
            {reasonOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={newPatientFilter}
            onChange={(e) => setNewPatientFilter(e.target.value as typeof newPatientFilter)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-[#3A6EA5]"
            title="Patient type"
          >
            <option value="all">New & existing</option>
            <option value="new">New patients</option>
            <option value="existing">Existing patients</option>
          </select>
          <label className="inline-flex items-center gap-1 text-xs text-slate-500">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-[#3A6EA5]"
            />
          </label>
          <label className="inline-flex items-center gap-1 text-xs text-slate-500">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-[#3A6EA5]"
            />
          </label>
          {(activeFilterCount > 0 || search) && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400"
            >
              <X className="h-3.5 w-3.5" /> Clear
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          )}
        </div>
      </div>

      {/* Result count */}
      <div className="mt-3 text-xs text-slate-500">
        Showing {visible.length} of {counts.all} request{counts.all === 1 ? "" : "s"}
      </div>

      {/* List */}
      <div className="mt-2 space-y-3">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm text-slate-500">
            {counts.all === 0
              ? "No requests yet."
              : "No requests match your search or filters."}
          </div>
        ) : (
          visible.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              busy={busyId === r.id}
              onApprove={() => handleApprove(r.id)}
              onDecline={(reason) => handleDecline(r.id, reason)}
              onReschedule={(slot) => handleReschedule(r.id, slot)}
              rescheduling={reschedulingId === r.id}
              setRescheduling={(open) => setReschedulingId(open ? r.id : null)}
            />
          ))
        )}
      </div>

      {conflict && (
        <ConflictDialog
          conflict={conflict}
          onClose={() => setConflict(null)}
          onPickAnotherTime={() => {
            setReschedulingId(conflict.request_id);
            setConflict(null);
          }}
        />
      )}

      {isSimulated && (
        <p className="mt-6 text-center text-xs text-slate-400">
          Demo mode — requests are stored client-side (localStorage). Approving books
          a real appointment in the scheduler via the live API.
        </p>
      )}
    </div>
  );
}
