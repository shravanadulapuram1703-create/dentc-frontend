// Logout while still on the clock → ask whether to clock out first (Denticon
// reminded staff the same way). Logging out never clocks out silently.
import { useState, type ReactNode } from "react";
import { LogOut } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDuration } from "../timeClockModel";
import { useTimeClock } from "../useTimeClock";

export function useLogoutClockGuard(onLogout: () => void): { requestLogout: () => void; dialog: ReactNode } {
  const clock = useTimeClock();
  const [open, setOpen] = useState(false);

  const requestLogout = () => {
    if (clock.is_clocked_in) setOpen(true);
    else onLogout();
  };

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>You are still clocked in</DialogTitle>
          <DialogDescription>
            You have been on the clock for {formatDuration(clock.elapsed_ms)}. Clock out before logging out?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-[#CBD5E1] px-3 py-2 text-sm font-semibold text-[#475569] hover:bg-[#F1F5F9]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="rounded-md border border-[#CBD5E1] px-3 py-2 text-sm font-semibold text-[#1F3A5F] hover:bg-[#F1F5F9]"
          >
            Log out, stay clocked in
          </button>
          <button
            type="button"
            disabled={clock.pending}
            onClick={async () => {
              // Stay put if the punch failed (the error is toasted).
              if (!(await clock.clockOut())) return;
              setOpen(false);
              onLogout();
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#DC2626] px-3 py-2 text-sm font-bold text-white hover:bg-[#B91C1C] disabled:opacity-60"
          >
            <LogOut className="w-4 h-4" /> Clock out &amp; log out
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return { requestLogout, dialog };
}
