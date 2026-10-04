// Manager editor for one punch — add a missed shift or correct a clock-in /
// clock-out (Denticon's "TimeClock Editor"). Times are entered as the office's
// wall clock and converted with the entry's zone (see timeClockModel header).
import { useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { OfficeOption } from "@/services/officeLookup";
import { apiErrorMessage } from "@/features/progress-notes/progressNotesService";
import {
  entryTimeZone,
  isLegacyEntry,
  isoToWallTime,
  LEGACY_WALL_CLOCK_ZONE,
  wallTimeToIso,
  type TimeClockEntry,
} from "../timeClockModel";
import { deleteEntry, saveEntry } from "../timeClockService";
import { US_DISPLAY_TIME_ZONE, parseServerDateTime } from "@/utils/datetime";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing punch to edit; omit to add a new one. */
  entry?: TimeClockEntry | null;
  staff: Array<{ id: number; name: string }>;
  offices: OfficeOption[];
  default_user_id?: number | null;
  default_office_id?: number | null;
  default_day: string;
  onSaved: () => void;
}

const inputCls =
  "w-full rounded-md border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-sm text-[#1E293B] focus:border-[#3A6EA5] focus:outline-none focus:ring-1 focus:ring-[#3A6EA5]";

export default function TimeEntryDialog(props: Props) {
  const { open, onOpenChange, entry } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit time entry" : "Add time entry"}</DialogTitle>
          <DialogDescription>
            {entry
              ? `Entry #${entry.id}${isLegacyEntry(entry) ? " · migrated from Denticon (times kept as recorded)" : ""}`
              : "Record a missed or manual shift."}
          </DialogDescription>
        </DialogHeader>
        {/* Remount per entry so the form re-seeds. */}
        {open && <EntryForm key={entry?.id ?? "new"} {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function EntryForm({
  onOpenChange,
  entry,
  staff,
  offices,
  default_user_id,
  default_office_id,
  default_day,
  onSaved,
}: Props) {
  const zoneFor = (id: number) => offices.find((o) => o.id === id)?.timezone;
  const seed = useMemo(() => {
    if (!entry) {
      return { user_id: default_user_id ?? null, office_id: default_office_id ?? null, in_day: default_day, in_time: "09:00", out_day: default_day, out_time: "17:00", open: false };
    }
    const tz = entryTimeZone(entry, zoneFor);
    const cin = parseServerDateTime(entry.clock_in);
    const cout = parseServerDateTime(entry.clock_out);
    const a = cin ? isoToWallTime(cin, tz) : { day: default_day, time: "09:00" };
    const b = cout ? isoToWallTime(cout, tz) : { day: a.day, time: "" };
    return { user_id: entry.user_id, office_id: entry.office_id ?? null, in_day: a.day, in_time: a.time, out_day: b.day, out_time: b.time, open: !cout };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seeded once per mount (dialog remounts per entry)
  }, []);

  const [user_id, setUserId] = useState<number | null>(seed.user_id);
  const [office_id, setOfficeId] = useState<number | null>(seed.office_id);
  const [in_day, setInDay] = useState(seed.in_day);
  const [in_time, setInTime] = useState(seed.in_time);
  const [out_day, setOutDay] = useState(seed.out_day);
  const [out_time, setOutTime] = useState(seed.out_time);
  const [still_open, setStillOpen] = useState(seed.open);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Legacy rows keep wall-clock semantics; everything else uses the office zone.
  const tz = entry && isLegacyEntry(entry)
    ? LEGACY_WALL_CLOCK_ZONE
    : (office_id != null ? zoneFor(office_id) : null) || US_DISPLAY_TIME_ZONE;

  const clock_in = in_day && in_time ? wallTimeToIso(in_day, in_time, tz) : null;
  const clock_out = !still_open && out_day && out_time ? wallTimeToIso(out_day, out_time, tz) : null;
  const hours = clock_in && clock_out ? (Date.parse(clock_out) - Date.parse(clock_in)) / 3_600_000 : null;

  let problem: string | null = null;
  if (user_id == null) problem = "Choose an employee.";
  else if (!clock_in) problem = "Enter the clock-in date and time.";
  else if (!still_open && !clock_out) problem = "Enter the clock-out date and time, or mark the shift as still open.";
  else if (hours != null && hours <= 0) problem = "Clock-out must be after clock-in.";
  else if (hours != null && hours > 24) problem = "A single shift cannot exceed 24 hours.";
  else if (clock_out && Date.parse(clock_out) > Date.now() + 60_000) problem = "Clock-out cannot be in the future.";

  const save = async () => {
    if (problem || user_id == null || !clock_in) return;
    setBusy("save");
    try {
      await saveEntry({ user_id, office_id, clock_in, clock_out }, entry?.id);
      toast.success(entry ? "Time entry updated" : "Time entry added");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err) ?? "Could not save the time entry.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!entry) return;
    setBusy("delete");
    try {
      await deleteEntry(entry.id);
      toast.success("Time entry deleted");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err) ?? "Could not delete the time entry.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 sm:col-span-1 text-xs font-semibold text-[#475569]">
          Employee
          <select
            className={`${inputCls} mt-1`}
            value={user_id ?? ""}
            onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : null)}
            disabled={entry != null}
          >
            <option value="">Select…</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 sm:col-span-1 text-xs font-semibold text-[#475569]">
          Office
          <select
            className={`${inputCls} mt-1`}
            value={office_id ?? ""}
            onChange={(e) => setOfficeId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">No office</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
                {o.is_active ? "" : " (inactive)"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-[#1F3A5F]">Clock in</legend>
        <input type="date" aria-label="Clock-in date" className={inputCls} value={in_day} onChange={(e) => {
          setInDay(e.target.value);
          if (!entry && out_day === in_day) setOutDay(e.target.value);
        }} />
        <input type="time" aria-label="Clock-in time" className={inputCls} value={in_time} onChange={(e) => setInTime(e.target.value)} />
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-[#1F3A5F]">Clock out</legend>
        <input type="date" aria-label="Clock-out date" className={inputCls} value={out_day} disabled={still_open} onChange={(e) => setOutDay(e.target.value)} />
        <input type="time" aria-label="Clock-out time" className={inputCls} value={out_time} disabled={still_open} onChange={(e) => setOutTime(e.target.value)} />
        <label className="col-span-2 inline-flex items-center gap-2 text-sm text-[#475569]">
          <input type="checkbox" checked={still_open} onChange={(e) => setStillOpen(e.target.checked)} />
          Still on the clock (no clock-out yet)
        </label>
      </fieldset>

      <div className="flex items-center justify-between rounded-md bg-[#F8FAFC] px-3 py-2 text-sm">
        <span className="text-[#64748B]">
          Times in <span className="font-semibold">{tz === LEGACY_WALL_CLOCK_ZONE ? "recorded wall clock" : tz}</span>
        </span>
        <span className="font-bold text-[#1F3A5F] tabular-nums">{hours != null && hours > 0 ? `${hours.toFixed(2)} h` : "—"}</span>
      </div>

      {problem && <p className="text-sm text-[#B91C1C]" role="alert">{problem}</p>}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E2E8F0]">
        <div>
          {entry &&
            (confirmDelete ? (
              <span className="inline-flex items-center gap-2 text-sm">
                <span className="text-[#B91C1C] font-semibold">Delete permanently?</span>
                <button type="button" onClick={() => void remove()} disabled={busy != null} className="rounded-md bg-[#DC2626] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#B91C1C] disabled:opacity-60">
                  {busy === "delete" ? "Deleting…" : "Yes, delete"}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-[#475569] hover:underline">
                  Cancel
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#DC2626] hover:underline">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-md border border-[#CBD5E1] px-3 py-1.5 text-sm font-semibold text-[#475569] hover:bg-[#F1F5F9]">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={problem != null || busy != null}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#3A6EA5] px-3 py-1.5 text-sm font-bold text-white hover:bg-[#2F5A88] disabled:opacity-50"
          >
            {busy === "save" && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
