import { useState, useRef, useEffect, useMemo } from "react";
import {
  fetchOfficeSchedule,
  type OfficeScheduleDayUi,
} from "../../services/officeScheduleApi";
import SendEmailModal from "../modals/SendEmailModal";
import SendSmsModal from "../modals/SendSmsModal";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  X,
  Palette,
} from "lucide-react";
import AppShell from "../layout/AppShell";
import WeekView from "../scheduler/WeekView";
import MonthView from "../scheduler/MonthView";
import AppointmentDetailsPopover from "../scheduler/AppointmentDetailsPopover";
import CancelAppointmentDialog, {
  type CancellationResult,
} from "../scheduler/CancelAppointmentDialog";
import MedicalAlertPopover from "../scheduler/MedicalAlertPopover";
import {
  CONFIRMATION_STATUSES,
  SAMEDAY_STATUSES,
  statusMetaFor,
} from "../scheduler/statusMeta";
import NewAppointmentModal from "../modals/NewAppointmentModal";
import CalendarPicker from "../CalendarPicker";
import {
  buildProviderColorMapFromSetup,
  providerColorFor,
  type ProviderColor,
} from "../../utils/providerColor";
import {
  fetchAppointments,
  fetchOperatories,
  fetchProviders,
  fetchSchedulerConfig,
  officeIdNum,
  fetchAppointmentStatuses,
  fetchPatientAlerts,
  fetchPatientBalance,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
  type AppointmentStatusName,
  type PatientBalanceInfo,
  type Operatory,
  type Provider,
  type SchedulerConfig,
  type AppointmentCreateRequest,
  type AppointmentUpdateRequest,
} from "../../services/schedulerApi";
import { getPatientContext } from "@/api/generated/endpoints/patients/patients";
import type { SchedulerPatientRead } from "@/api/generated/model";

/** Fallback status options used only if the backend `definitions` fetch fails
 *  or returns nothing — the live list comes from fetchAppointmentStatuses. */
const DEFAULT_STATUS_NAMES = [
  "Scheduled",
  "Confirmed",
  "Unconfirmed",
  "Left Message",
  "In Reception",
  "Available",
  "In Operatory",
  "Checked Out",
  "Missed",
  "Cancelled",
] as const;

type ViewMode = "daily" | "weekly" | "monthly";

/** Pixel height of one time-slot row (the daily grid renders a full 24h at the
 *  office's slot interval; appointment blocks are positioned against this). */
const SLOT_PX = 40;
const MINUTES_PER_DAY = 24 * 60;

/** "HH:MM[:SS]" -> minutes past midnight; null when absent/unparseable. */
const parseTimeMinutes = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parts = value.split(":").map(Number);
  const h = parts[0];
  const mm = parts[1] ?? 0;
  if (h == null || Number.isNaN(h) || Number.isNaN(mm)) return null;
  return h * 60 + mm;
};

/** minutes past midnight -> "HH:MM". */
const minutesToTime = (mins: number): string =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

/** The grid rows between two minute marks, at the office's slot interval. */
const buildTimeSlots = (startMin: number, endMin: number, interval: number): string[] => {
  const step = interval > 0 ? interval : 10;
  const slots: string[] = [];
  for (let m = startMin; m < endMin; m += step) slots.push(minutesToTime(m));
  return slots;
};


const fmtYMD = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

/** Inclusive [start, end] date range (YYYY-MM-DD) to fetch for a given view:
 *  the single day (daily), the Sun–Sat week (weekly), or the whole month
 *  (monthly). Drives the appointments fetch so week/month show real data. */
const getDateRange = (date: Date, mode: ViewMode): { start: string; end: string } => {
  if (mode === "weekly") {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay()); // back to Sunday
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: fmtYMD(start), end: fmtYMD(end) };
  }
  if (mode === "monthly") {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start: fmtYMD(start), end: fmtYMD(end) };
  }
  return { start: fmtYMD(date), end: fmtYMD(date) };
};

/** Coerce any patient identifier to the numeric patient_id the backend
 *  contract requires (number | null). Non-numeric sentinels ("NEW") or a
 *  chart_no resolve to null rather than a contract-violating string. */
const numericPatientIdOrNull = (value: unknown): number | null => {
  if (value == null || value === "" || value === "NEW") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

interface SchedulerProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  type: "empty" | "appointment";
  appointment?: Appointment;
  timeSlot?: string;
  operatory?: string;
}

export default function Scheduler({
  onLogout,
  currentOffice,
  setCurrentOffice,
}: SchedulerProps) {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendarPicker, setShowCalendarPicker] =
    useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [contextMenu, setContextMenu] =
    useState<ContextMenuState>({
      visible: false,
      x: 0,
      y: 0,
      type: "empty",
    });
  const [activeSubmenu, setActiveSubmenu] = useState<{
    type: "goto" | "status" | null;
    anchorRect: DOMRect | null;
  }>({
    type: null,
    anchorRect: null,
  });

  // ✅ Stable appointment reference - preserves appointment when submenu opens
  const [submenuAppointment, setSubmenuAppointment] =
    useState<Appointment | null>(null);

  // ===============================
  // MENU ITEM STYLE (STEP 2)
  // ===============================
  const menuItemClass =
    "w-full px-3 py-1.5 text-left text-sm leading-tight text-[#1E293B] hover:bg-[#F7F9FC]";
  // ===============================
  // STEP 2: Submenu open / close helpers
  // ===============================
  const openSubmenu = (
    type: "goto" | "status",
    target: HTMLElement,
  ) => {
    setActiveSubmenu((prev) => {
      // If clicking the same submenu, toggle it closed
      if (prev.type === type) {
        return { type: null, anchorRect: null };
      }

      return {
        type,
        anchorRect: target.getBoundingClientRect(),
      };
    });

    // ✅ Set stable appointment reference
    if (contextMenu.appointment) {
      setSubmenuAppointment(contextMenu.appointment);
    }
  };

  // ===============================
  // STEP 3: Submenu auto-flip helper
  // ===============================
  const SUBMENU_WIDTH = 240;
  const SUBMENU_MAX_HEIGHT = 420;
  const SUBMENU_MARGIN = 8;

  const getSubmenuLeftPosition = () => {
    if (!activeSubmenu.anchorRect) return 0;

    const spaceOnRight =
      window.innerWidth - activeSubmenu.anchorRect.right;

    // Not enough space → open to the LEFT
    if (spaceOnRight < SUBMENU_WIDTH + 10) {
      return activeSubmenu.anchorRect.left - SUBMENU_WIDTH - 6;
    }

    // Default → open to the RIGHT
    return activeSubmenu.anchorRect.right + 6;
  };
  const closeSubmenu = () => {
    setActiveSubmenu({
      type: null,
      anchorRect: null,
    });
  };
  const [showNewAppointment, setShowNewAppointment] =
    useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    time: string;
    operatory: string;
  } | null>(null);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);

  // Left-click "Appointment Details" pop-out (PDF pages 5–7).
  const [detailsAppt, setDetailsAppt] = useState<Appointment | null>(null);
  const [detailsAnchor, setDetailsAnchor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Cancel dialog (PDF page 16).
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Medical-alert popover (PDF page 18) + per-patient active-alert cache.
  const [alertPopover, setAlertPopover] = useState<{
    patientName: string;
    alerts: string[];
    x: number;
    y: number;
  } | null>(null);
  const [alertsByPatient, setAlertsByPatient] = useState<Map<number, string[]>>(new Map());
  // Per-patient computed balance (drives the $ badge on the block).
  const [balanceByPatient, setBalanceByPatient] = useState<Map<number, PatientBalanceInfo>>(
    new Map(),
  );

  // Provider color legend (opt-in strip below the toolbar).
  const [showLegend, setShowLegend] = useState(false);

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const calendarBtnRef = useRef<HTMLButtonElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);


  // Default scheduler config
  const defaultConfig: SchedulerConfig = {
    startHour: 8,
    endHour: 17,
    slotInterval: 10,
  };

  // Data state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [operatories, setOperatories] = useState<Operatory[]>([]);
  const [appointmentStatuses, setAppointmentStatuses] = useState<AppointmentStatus[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);

  // Calendar filters (backend-driven via listAppointments params).
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProvider, setFilterProvider] = useState("");
  const [filterOperatory, setFilterOperatory] = useState("");
  const [schedulerConfig, setSchedulerConfig] = useState<SchedulerConfig>(defaultConfig);
  /** The office's weekly hours (Office Setup -> Schedule), 0=Mon … 6=Sun. */
  const [officeSchedule, setOfficeSchedule] = useState<OfficeScheduleDayUi[] | null>(null);

  // Loading and error states
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [isLoadingOperatories, setIsLoadingOperatories] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to format date as YYYY-MM-DD
  const formatDateYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Fetch operatories on mount and when office changes
  useEffect(() => {
    const loadOperatories = async () => {
      setIsLoadingOperatories(true);
      setError(null);
      try {
        // Operatories are office-scoped (they are the calendar columns). Providers
        // are fetched UNSCOPED: an appointment in this office can belong to a
        // provider whose home office differs, and we need every in-view provider's
        // name + scheduler_color for the blocks/legend/columns. The provider
        // filter dropdown then lists all providers.
        const [ops, provs] = await Promise.all([
          fetchOperatories(currentOffice),
          fetchProviders().catch(() => []),
        ]);
        setOperatories(ops);
        setProviders(provs);
      } catch (err: any) {
        setError(`Failed to load operatories: ${err.message}`);
        console.error("Error loading operatories:", err);
      } finally {
        setIsLoadingOperatories(false);
      }
    };

    loadOperatories();
  }, [currentOffice]);

  // Fetch appointment statuses from the backend `definitions` table so the
  // Set Status menu stays in sync with the backend instead of a hardcoded list.
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        const data = await fetchAppointmentStatuses();
        setAppointmentStatuses(data);
      } catch (err: any) {
        console.error("Error loading appointment statuses:", err);
        // Non-critical: the Set Status menu falls back to a default list.
      }
    };

    loadStatuses();
  }, []);

  // Status options for the Set Status menu: backend-driven, with a static
  // fallback only when the definitions fetch yields nothing.
  const statusMenuItems = useMemo(
    () =>
      appointmentStatuses.length > 0
        ? appointmentStatuses.map((s) => ({
            value: s.name,
            label: s.displayName || s.name,
          }))
        : DEFAULT_STATUS_NAMES.map((name) => ({ value: name, label: name })),
    [appointmentStatuses],
  );

  // status name -> backend color (from `appt_status` definitions), used to tint
  // the quick-status icons and block status strip. Empty until statuses load.
  const statusColors = useMemo(() => {
    const m = new Map<string, string>();
    appointmentStatuses.forEach((s) => s.color && m.set(s.name, s.color));
    return m;
  }, [appointmentStatuses]);

  // Validate config to ensure it has valid values
  const isValidConfig = (config: any): config is SchedulerConfig => {
    return (
      config &&
      typeof config.startHour === "number" &&
      config.startHour >= 0 &&
      config.startHour < 24 &&
      typeof config.endHour === "number" &&
      config.endHour >= 0 &&
      config.endHour < 24 &&
      config.endHour > config.startHour &&
      typeof config.slotInterval === "number" &&
      config.slotInterval > 0
    );
  };

  // Fetch scheduler config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Scope schedule hours / slot interval to the selected office.
        const config = await fetchSchedulerConfig(currentOffice);
        // Validate config before using it
        if (isValidConfig(config)) {
          setSchedulerConfig(config);
        } else {
          console.warn("Invalid config received from API, using default config", config);
          // Keep using default config if API returns invalid data
        }
      } catch (err: any) {
        console.error("Error loading scheduler config:", err);
        // Keep using default config if API fails
      }
    };

    loadConfig();
  }, [currentOffice]);

  // ✅ FIX: Create a Set of active operatory IDs for fast lookup
  const activeOperatoryIds = useMemo(
    () => new Set(operatories.map((op) => op.id)),
    [operatories],
  );

  // provider_id -> name, for resolving operatory.provider_id in column headers.
  const providerNameById = useMemo(
    () => new Map(providers.map((p) => [p.id, p.name])),
    [providers],
  );

  // provider_id -> color, preferring the hex each provider set on the Provider
  // Setup screen (scheduler_color) and falling back to a stable palette color.
  // Drives block tinting, column accents, and the legend.
  const providerColorMap = useMemo(
    () => buildProviderColorMapFromSetup(providers),
    [providers],
  );

  // provider_id -> name resolved from the scheduler feed (server-side), used as
  // a fallback when a provider isn't in the (office-scoped) master list so the
  // legend/columns never fall back to showing the raw id.
  const feedProviderNames = useMemo(() => {
    const m = new Map<string, string>();
    appointments.forEach((a) => {
      if (a.provider_id && a.provider_name) m.set(a.provider_id, a.provider_name);
    });
    return m;
  }, [appointments]);

  const resolveProviderName = (id: string): string =>
    providerNameById.get(id) || feedProviderNames.get(id) || `Provider ${id}`;

  // ✅ FIX: Filter appointments to only include those with valid operatories
  const validAppointments = useMemo(
    () =>
      appointments.filter(
        (appt) =>
          appt.operatory_id != null &&
          activeOperatoryIds.has(appt.operatory_id),
      ),
    [appointments, activeOperatoryIds],
  );

  // Legend: the distinct providers present in the current view, each with its
  // stable color. Only in-view providers are shown so the legend stays short.
  const legendProviders = useMemo(() => {
    const ids = new Set(
      validAppointments
        .map((a) => a.provider_id)
        .filter((id): id is string => !!id),
    );
    return [...ids]
      .map((id) => ({
        id,
        name: providerNameById.get(id) || feedProviderNames.get(id) || `Provider ${id}`,
        color: providerColorFor(id, providerColorMap),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [validAppointments, providerNameById, feedProviderNames, providerColorMap]);

  // ✅ PERFORMANCE OPTIMIZATION: Precompute appointments by operatory and date.
  // Keyed by operatory_id so it matches the column lookup (operatory.id).
  const appointmentsByOperatory = useMemo(() => {
    const currentDate = formatDateYYYYMMDD(selectedDate);
    const map = new Map<string, Appointment[]>();

    validAppointments
      .filter((appt) => appt.date === currentDate)
      .forEach((appt) => {
        const opId = appt.operatory_id;
        if (opId == null) return;
        if (!map.has(opId)) {
          map.set(opId, []);
        }
        map.get(opId)!.push(appt);
      });

    return map;
  }, [validAppointments, selectedDate]);

  // Fetch appointments when date changes
  useEffect(() => {
    const loadAppointments = async () => {
      setIsLoadingAppointments(true);
      setError(null);
      try {
        // Fetch the range the current view needs (day / week / month),
        // scoped to the office and any active filters.
        const { start, end } = getDateRange(selectedDate, viewMode);
        const data = await fetchAppointments(start, end, currentOffice, {
          status: filterStatus || undefined,
          provider_id: filterProvider || undefined,
          operatory_id: filterOperatory || undefined,
        });
        setAppointments(data);
      } catch (err: any) {
        setError(`Failed to load appointments: ${err.message}`);
        console.error("Error loading appointments:", err);
      } finally {
        setIsLoadingAppointments(false);
      }
    };

    loadAppointments();
  }, [selectedDate, currentOffice, viewMode, filterStatus, filterProvider, filterOperatory]);

  // Background: for the patients on the *current day*, load their active medical
  // alerts (red-cross badge, PDF pages 4/18) and computed account balance ($
  // badge). Daily view only, deduped by patient_id, capped, and non-blocking.
  // The scheduler feed carries neither a has_alert flag nor the balance — both
  // are documented backend gaps (SCHED-APPT-4/7) that would remove this fan-out.
  useEffect(() => {
    if (viewMode !== "daily") return;
    const currentDate = formatDateYYYYMMDD(selectedDate);
    const ids = [
      ...new Set(
        appointments
          .filter((a) => a.date === currentDate && a.patient_id != null)
          .map((a) => a.patient_id as number),
      ),
    ]
      .filter((id) => !alertsByPatient.has(id))
      .slice(0, 40);
    if (ids.length === 0) return;

    let alive = true;
    (async () => {
      const entries = await Promise.all(
        ids.map(
          async (
            id,
          ): Promise<[number, string[], PatientBalanceInfo | null]> => {
            const [alerts, balance] = await Promise.all([
              fetchPatientAlerts(id).catch(() => []),
              fetchPatientBalance(id).catch(() => null),
            ]);
            return [id, alerts.map((al) => al.alert), balance];
          },
        ),
      );
      if (!alive) return;
      setAlertsByPatient((prev) => {
        const next = new Map(prev);
        entries.forEach(([id, list]) => next.set(id, list));
        return next;
      });
      setBalanceByPatient((prev) => {
        const next = new Map(prev);
        entries.forEach(([id, , bal]) => bal && next.set(id, bal));
        return next;
      });
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, selectedDate, viewMode]);

  // Load the office's weekly hours; the day grid's range comes from the row for
  // whichever weekday is on screen.
  useEffect(() => {
    const oid = officeIdNum(currentOffice);
    if (oid == null) {
      setOfficeSchedule(null);
      return;
    }
    let cancelled = false;
    void fetchOfficeSchedule(oid)
      .then((rows) => {
        if (!cancelled) setOfficeSchedule(rows);
      })
      .catch((err) => {
        console.error("Error loading office schedule:", err);
        if (!cancelled) setOfficeSchedule(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentOffice]);

  // ===== TIME BLOCKING & OVERLAP LOGIC =====

  // Convert time string (HH:MM) to minutes since midnight
  const timeToMinutes = (time: string): number => {
    const parts = time.split(":").map(Number);
    const hours = parts[0] ?? 0;
    const minutes = parts[1] ?? 0;
    return hours * 60 + minutes;
  };

  // Check if two time ranges overlap
  const timeRangesOverlap = (
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean => {
    const start1Min = timeToMinutes(start1);
    const end1Min = timeToMinutes(end1);
    const start2Min = timeToMinutes(start2);
    const end2Min = timeToMinutes(end2);

    return start1Min < end2Min && end1Min > start2Min;
  };

  // ✅ OPTIMIZED: Use precomputed map instead of filtering
  const isSlotBlocked = (
    slotTime: string,
    operatoryId: string,
  ): boolean => {
    const slotEndTime = calculateEndTime(slotTime, 10);
    const operatoryAppointments =
      appointmentsByOperatory.get(operatoryId) || [];

    return operatoryAppointments.some((appt) =>
      timeRangesOverlap(
        slotTime,
        slotEndTime,
        appt.start_time,
        appt.end_time,
      ),
    );
  };

  // ✅ OPTIMIZED: Use precomputed map
  const getSlotOccupyingAppointment = (
    slotTime: string,
    operatoryId: string,
  ): Appointment | null => {
    const slotEndTime = calculateEndTime(slotTime, 10);
    const operatoryAppointments =
      appointmentsByOperatory.get(operatoryId) || [];

    return (
      operatoryAppointments.find((appt) =>
        timeRangesOverlap(
          slotTime,
          slotEndTime,
          appt.start_time,
          appt.end_time,
        ),
      ) || null
    );
  };

  // ===== END TIME BLOCKING LOGIC =====

  // Minutes per slot interval and pixels per minute — drive both the row height
  // and the absolutely-positioned appointment blocks so they stay aligned for
  // any office slot interval.
  const slotInterval = schedulerConfig.slotInterval > 0 ? schedulerConfig.slotInterval : 10;
  const pxPerMinute = SLOT_PX / slotInterval;

  /**
   * The selected office's opening hours for the weekday on screen, taken from
   * Office Setup -> Schedule. `day_of_week` there is 0=Monday … 6=Sunday, while
   * JS `getDay()` is 0=Sunday — hence the shift.
   *
   * Falls back to the office's schedule_start_hour / schedule_end_hour (Info
   * tab) when that day has no row, and to the 8-5 default when neither exists.
   * A day marked Closed keeps the fallback window so the grid still renders
   * something to schedule into.
   */
  const officeHours = useMemo(() => {
    const fallback = {
      startMin: schedulerConfig.startHour * 60,
      endMin: schedulerConfig.endHour * 60,
      closed: false,
    };
    if (!officeSchedule) return fallback;

    const dow = (selectedDate.getDay() + 6) % 7; // Sun-first -> Mon-first
    const row = officeSchedule.find((r) => r.day_of_week === dow);
    if (!row) return fallback;

    const startMin = parseTimeMinutes(row.start_time);
    const endMin = parseTimeMinutes(row.end_time);
    if (row.is_closed || startMin == null || endMin == null || endMin <= startMin) {
      return { ...fallback, closed: Boolean(row.is_closed) };
    }
    return { startMin, endMin, closed: false };
  }, [officeSchedule, selectedDate, schedulerConfig.startHour, schedulerConfig.endHour]);

  /** Appointments on the day the grid is showing. */
  const dayAppointments = useMemo(() => {
    const ymd = formatDateYYYYMMDD(selectedDate);
    return appointments.filter((a) => a.date === ymd);
  }, [appointments, selectedDate]);

  /**
   * The window the grid actually draws: the office's hours for that day,
   * widened to cover any appointment booked outside them.
   *
   * This is the fix for appointments vanishing — a 5:20 PM booking at an office
   * that closes at 4 PM used to fall outside the drawn rows. The extension is
   * still painted as out-of-hours (see isOutsideOfficeHours), so it reads as
   * "booked outside opening hours" rather than silently widening the day.
   */
  const gridRange = useMemo(() => {
    let startMin = officeHours.startMin;
    let endMin = officeHours.endMin;

    for (const appt of dayAppointments) {
      const s = parseTimeMinutes(appt.start_time);
      if (s == null) continue;
      const e = s + (appt.duration || slotInterval);
      if (s < startMin) startMin = s;
      if (e > endMin) endMin = e;
    }

    // Snap outwards to whole slot boundaries so rows line up with the interval.
    startMin = Math.max(0, Math.floor(startMin / slotInterval) * slotInterval);
    endMin = Math.min(MINUTES_PER_DAY, Math.ceil(endMin / slotInterval) * slotInterval);
    if (endMin <= startMin) endMin = Math.min(MINUTES_PER_DAY, startMin + slotInterval);
    return { startMin, endMin };
  }, [officeHours, dayAppointments, slotInterval]);

  const timeSlots = useMemo(
    () => buildTimeSlots(gridRange.startMin, gridRange.endMin, slotInterval),
    [gridRange, slotInterval],
  );

  // Position a block against the top of the drawn window.
  const getAppointmentPosition = (appointment: Appointment) => {
    const startMinutes = parseTimeMinutes(appointment.start_time) ?? 0;
    const top = (startMinutes - gridRange.startMin) * pxPerMinute;
    const height = (appointment.duration || slotInterval) * pxPerMinute;
    return { top, height };
  };

  // Is this HH:MM slot outside the office's hours for the day on screen? Such
  // slots stay visible but grayed out and non-interactive — including the rows
  // the grid added to reach an out-of-hours appointment.
  const isOutsideOfficeHours = (time: string): boolean => {
    const mins = parseTimeMinutes(time);
    if (mins == null) return false;
    return mins < officeHours.startMin || mins >= officeHours.endMin;
  };

  // Handle right-click on empty slot
  const handleEmptySlotRightClick = (
    e: React.MouseEvent,
    time: string,
    operatory: string,
  ) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: "empty",
      timeSlot: time,
      operatory,
    });
  };

  // Handle right-click on appointment
  const handleAppointmentRightClick = (
    e: React.MouseEvent,
    appointment: Appointment,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Get viewport dimensions
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Estimate menu height (will be adjusted if needed)
    const menuHeight = 400;
    const menuWidth = 220;

    // Calculate position to keep menu in viewport
    let x = e.clientX;
    let y = e.clientY;

    // Adjust if menu would go off right edge
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }

    // Adjust if menu would go off bottom edge
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }

    setContextMenu({
      visible: true,
      x,
      y,
      type: "appointment",
      appointment,
    });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      const clickedOutsideContextMenu =
        contextMenuRef.current &&
        !contextMenuRef.current.contains(target);

      if (clickedOutsideContextMenu) {
        setContextMenu({
          visible: false,
          x: 0,
          y: 0,
          type: "empty",
        });
        closeSubmenu();
      }
    };

    // ✅ FIX 1: Changed mousedown → click (fires AFTER submenu onClick)
    document.addEventListener("click", handleClickOutside);
    return () =>
      document.removeEventListener(
        "click",
        handleClickOutside,
      );
  }, []);

  // ✅ Close context menu on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (contextMenu.visible) {
        setContextMenu({
          visible: false,
          x: 0,
          y: 0,
          type: "empty",
        });
        closeSubmenu();
      }
    };

    // Add scroll listener to the scheduler grid container
    const schedulerContainer = document.querySelector(
      ".scheduler-scroll-container",
    );
    if (schedulerContainer) {
      schedulerContainer.addEventListener(
        "scroll",
        handleScroll,
      );
      return () =>
        schedulerContainer.removeEventListener(
          "scroll",
          handleScroll,
        );
    }

    // Also listen to window scroll as fallback
    window.addEventListener("scroll", handleScroll, true);
    return () =>
      window.removeEventListener("scroll", handleScroll, true);
  }, [contextMenu.visible]);

  // ✅ STEP 4: Close menus on ESC key (SEPARATE useEffect - not nested!)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeSubmenu.type) {
          closeSubmenu();
        } else if (contextMenu.visible) {
          setContextMenu({
            visible: false,
            x: 0,
            y: 0,
            type: "empty",
          });
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () =>
      document.removeEventListener("keydown", handleKeyDown);
  }, [activeSubmenu.type, contextMenu.visible]);

  // Close calendar picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        showCalendarPicker &&
        !target.closest(".calendar-picker-container")
      ) {
        setShowCalendarPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
  }, [showCalendarPicker]);

  // Debug: Log when selectedDate changes
  useEffect(() => {
    console.log(
      "Scheduler date changed:",
      formatDateYYYYMMDD(selectedDate),
    );
  }, [selectedDate]);

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Step the selected date by one unit of the current view (day/week/month).
  const stepDate = (dir: number) => {
    const d = new Date(selectedDate);
    if (viewMode === "weekly") d.setDate(d.getDate() + dir * 7);
    else if (viewMode === "monthly") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir);
    setSelectedDate(d);
  };

  const goToToday = () => setSelectedDate(new Date());

  // From week/month views: open the day view for the clicked date.
  const handleSelectDay = (date: Date) => {
    setSelectedDate(date);
    setViewMode("daily");
  };

  // STEP 4: Extract handler for CalendarPicker (single source of truth)
  const handleSchedulerDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  // Handle new appointment creation
  const handleAddNewAppointment = (
    timeSlot?: string,
    operatory?: string,
  ) => {
    setEditingAppointment(null); // Clear any editing state
    setSelectedSlot(
      timeSlot && operatory
        ? { time: timeSlot, operatory }
        : null,
    );
    setShowNewAppointment(true);
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      type: "empty",
    });
  };

  // Handle editing existing appointment
  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setSelectedSlot({
      time: appointment.start_time,
      operatory: appointment.operatory_id ?? "",
    });
    setShowNewAppointment(true);
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      type: "empty",
    });
  };

  // Handle appointment save
  const handleSaveAppointment = async (appointmentData: any) => {
    console.log("📥 Scheduler.handleSaveAppointment called with:", appointmentData);
    
    // Check if appointment was already saved by AddEditAppointmentForm
    // If _alreadySaved flag is true, AddEditAppointmentForm already saved the appointment via API,
    // so we just need to refresh the appointments list
    if (appointmentData._alreadySaved) {
      console.log("✅ Appointment already saved by AddEditAppointmentForm, refreshing appointments list...");
      // Just refresh the appointments list for the current view range/filters
      try {
        const { start, end } = getDateRange(selectedDate, viewMode);
        const data = await fetchAppointments(start, end, currentOffice, {
          status: filterStatus || undefined,
          provider_id: filterProvider || undefined,
          operatory_id: filterOperatory || undefined,
        });
        setAppointments(data);
        setEditingAppointment(null);
      } catch (err: any) {
        console.error("Error refreshing appointments:", err);
        // Don't show error alert - appointment was already saved successfully
      }
      return;
    }
    
    try {
      // Both modals now emit a flat, snake_case payload with a numeric
      // patient_id (they create the patient first when needed). We read
      // snake_case-first with a camelCase fallback for safety; the service
      // also coerces patient_id to number | null as a backstop.
      const a = appointmentData.appointment ?? appointmentData;
      const patientId: number | null = numericPatientIdOrNull(
        a.patient_id ?? a.patientId ?? editingAppointment?.patient_id,
      );

      if (editingAppointment) {
        // Update existing appointment
        const updateData: AppointmentUpdateRequest = {
          id: editingAppointment.id,
          patient_id: patientId,
          date: a.date ?? editingAppointment.date,
          start_time: a.start_time ?? a.startTime ?? a.time ?? editingAppointment.start_time,
          duration: a.duration ?? editingAppointment.duration,
          procedure_type: a.procedure_type ?? a.procedureType ?? editingAppointment.procedure_label,
          status: a.status ?? editingAppointment.status,
          operatory: a.operatory ?? editingAppointment.operatory_id ?? undefined,
          provider: a.provider ?? editingAppointment.provider_id ?? undefined,
          notes: a.notes ?? "",
        };

        // Block double-booking (excluding this appointment itself).
        if (
          updateData.operatory &&
          updateData.date &&
          updateData.start_time &&
          updateData.duration &&
          hasSlotConflict(
            updateData.operatory,
            updateData.date,
            updateData.start_time,
            calculateEndTime(updateData.start_time, updateData.duration),
            editingAppointment.id,
          )
        ) {
          alert(
            "This time slot conflicts with an existing appointment in that operatory. Please choose a different time or operatory.",
          );
          return;
        }

        const updatedAppointment = await updateAppointment(updateData);
        setAppointments(
          appointments.map((appt) =>
            appt.id === editingAppointment.id ? updatedAppointment : appt
          )
        );
        setEditingAppointment(null);
      } else {
        // Create new appointment
        const createData: AppointmentCreateRequest = {
          patient_id: patientId,
          date: a.date ?? formatDateYYYYMMDD(selectedDate),
          start_time: a.start_time ?? a.startTime ?? a.time ?? selectedSlot?.time ?? "09:00",
          duration: a.duration ?? 30,
          procedure_type: a.procedure_type ?? a.procedureType,
          status: a.status ?? "Scheduled",
          operatory: a.operatory ?? selectedSlot?.operatory ?? "",
          provider: a.provider ?? "",
          notes: a.notes ?? "",
        };

        // Validate required fields
        if (!createData.operatory || !createData.provider || !createData.procedure_type) {
          alert("Missing required fields: Operatory, Provider, or Procedure Type");
          return;
        }

        // Block double-booking the operatory.
        if (
          hasSlotConflict(
            createData.operatory,
            createData.date,
            createData.start_time,
            calculateEndTime(createData.start_time, createData.duration),
          )
        ) {
          alert(
            "This time slot conflicts with an existing appointment in that operatory. Please choose a different time or operatory.",
          );
          return;
        }

        const newAppointment = await createAppointment(createData);
        setAppointments([...appointments, newAppointment]);
      }
    } catch (err: any) {
      setError(`Failed to save appointment: ${err.message}`);
      console.error("Error saving appointment:", err);
      alert(`Failed to save appointment: ${err.message}`);
    }
  };

  // Calculate end time from start time and duration
  const calculateEndTime = (
    startTime: string,
    duration: number,
  ): string => {
    const parts = startTime.split(":").map(Number);
    const hours = parts[0] ?? 0;
    const minutes = parts[1] ?? 0;
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
  };

  // Double-booking check: does another (non-cancelled) appointment in the same
  // operatory on the same date overlap this time range? Matches on operatory_id
  // (the form and the read-model both carry the raw id).
  const hasSlotConflict = (
    operatoryId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): boolean => {
    return appointments.some(
      (a) =>
        a.id !== excludeId &&
        a.date === date &&
        !a.cancelled &&
        a.operatory_id === operatoryId &&
        timeRangesOverlap(startTime, endTime, a.start_time, a.end_time),
    );
  };

  // Navigate to patient module
  // Email / Text Message from the Go To menu. Both need the patient's contact
  // details, which only arrive with the patient-context fetch below.
  const [commTarget, setCommTarget] = useState<{
    kind: "email" | "sms";
    patient_id: number | null;
    appointment_id: string;
    name: string;
    email: string;
    phone: string;
  } | null>(null);

  const handleGoToPatient = async (
    module: string,
    appointment: Appointment,
  ) => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      type: "empty",
    });

    // Resolve the real patient via the backend context aggregate
    // (GET /patients/{id}/context) so we navigate with the numeric id and store
    // a real, minimal patient context — no fabricated demographics/balances.
    // The patient pages fetch their own data by id; only id/name are consumed
    // downstream (GlobalNav, ActivePatient).
    let numericPatientId =
      appointment.patient_id != null ? String(appointment.patient_id) : "";
    let patient: SchedulerPatientRead | null = null;
    try {
      if (appointment.patient_id != null) {
        const ctx = await getPatientContext(appointment.patient_id);
        patient = ctx.patient;
        numericPatientId = String(ctx.patient.id);
      }
    } catch (err: any) {
      console.error("Failed to resolve patient for navigation:", err);
    }

    const ageFromDob = (dob?: string | null): number => {
      if (!dob) return 0;
      const birth = new Date(dob);
      if (Number.isNaN(birth.getTime())) return 0;
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
      return age >= 0 ? age : 0;
    };

    const resolvedName = patient
      ? `${patient.last_name ?? ""}, ${patient.first_name ?? ""}`.replace(/^,\s*|,\s*$/g, "").trim()
      : "";
    sessionStorage.setItem(
      "activePatient",
      JSON.stringify({
        id: numericPatientId,
        name: resolvedName || appointment.patient_name,
        age: ageFromDob(patient?.dob),
        gender: patient?.gender ?? "",
        dob: patient?.dob ?? "",
      }),
    );

    // Email / Text Message open a dialog instead of navigating — they need the
    // contact details we just resolved.
    if (module === "email" || module === "sms") {
      setCommTarget({
        kind: module,
        patient_id: appointment.patient_id ?? null,
        appointment_id: appointment.id,
        name: resolvedName || appointment.patient_name,
        email: patient?.email ?? "",
        phone: patient?.cell_phone || patient?.phone || "",
      });
      return;
    }

    if (!numericPatientId) {
      alert("This appointment has no patient linked, so there is nothing to open.");
      return;
    }

    // Every entry maps to a real patient route (see App.tsx `/patient/:id/*`).
    const ROUTES: Record<string, string> = {
      overview: "overview",
      treatment: "treatment",
      transactions: "transaction",
      ledger: "ledger",
      "progress-notes": "progress-notes",
      notes: "notes",
      charting: "restorative",
      perio: "perio",
      imaging: "imaging",
    };
    const path = ROUTES[module];
    if (path) navigate(`/patient/${numericPatientId}/${path}`);
  };

  // Set appointment status (applies immediately via PATCH /appointments/{id}/status).
  const handleSetStatus = async (
    appointment: Appointment,
    status: Appointment["status"],
  ) => {
    try {
      const updatedAppointment = await updateAppointmentStatus(
        appointment.id,
        status
      );
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === appointment.id ? updatedAppointment : appt,
        ),
      );
      // Keep the open details pop-out in sync.
      setDetailsAppt((prev) =>
        prev && prev.id === appointment.id ? updatedAppointment : prev,
      );
    } catch (err: any) {
      setError(`Failed to update status: ${err.message}`);
      console.error("Error updating appointment status:", err);
      alert(`Failed to update status: ${err.message}`);
    }
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      type: "empty",
    });
  };

  // Route a status change: "Cancelled" opens the cancellation dialog (PDF p.16);
  // everything else (incl. Missed) applies immediately.
  const requestSetStatus = (
    appointment: Appointment,
    status: AppointmentStatusName,
  ) => {
    setContextMenu({ visible: false, x: 0, y: 0, type: "empty" });
    if (status === "Cancelled") {
      setCancelAppt(appointment);
      return;
    }
    handleSetStatus(appointment, status);
  };

  // Confirm cancellation from the dialog. The backend status-PATCH accepts only
  // {status}; note/reason/call-list are collected but not yet persisted
  // server-side (gap SCHED-APPT-2) — logged so nothing is silently dropped.
  const confirmCancel = async (result: CancellationResult) => {
    if (!cancelAppt) return;
    setIsCancelling(true);
    try {
      await handleSetStatus(cancelAppt, "Cancelled");
      console.info("Appointment cancelled", {
        id: cancelAppt.id,
        ...result,
      });
      setCancelAppt(null);
      setDetailsAppt(null);
    } finally {
      setIsCancelling(false);
    }
  };

  // Left-click an appointment → open the read-only details pop-out (PDF p.5–7).
  const handleAppointmentLeftClick = (
    e: React.MouseEvent,
    appointment: Appointment,
  ) => {
    e.stopPropagation();
    setContextMenu({ visible: false, x: 0, y: 0, type: "empty" });
    setDetailsAnchor({ x: e.clientX, y: e.clientY });
    setDetailsAppt(appointment);
  };

  // Click the red-cross badge → medical-alert popover (PDF p.18).
  const handleShowMedicalAlert = (
    e: React.MouseEvent,
    appointment: Appointment,
  ) => {
    e.stopPropagation();
    const alerts =
      appointment.patient_id != null
        ? alertsByPatient.get(appointment.patient_id) ?? []
        : [];
    setAlertPopover({
      patientName: appointment.patient_name,
      alerts,
      x: e.clientX,
      y: e.clientY,
    });
  };

  // Delete appointment
  const handleDeleteAppointment = async (
    appointment: Appointment,
  ) => {
    if (
      window.confirm(
        `Delete appointment for ${appointment.patient_name}?`,
      )
    ) {
      try {
        await deleteAppointment(appointment.id);
        setAppointments(
          appointments.filter((appt) => appt.id !== appointment.id)
        );
      } catch (err: any) {
        setError(`Failed to delete appointment: ${err.message}`);
        console.error("Error deleting appointment:", err);
        alert(`Failed to delete appointment: ${err.message}`);
      }
    }
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      type: "empty",
    });
  };

  // Layout note:
  // We let flexbox handle column widths so that columns expand/shrink
  // with the number of operatories, avoiding empty gaps on the right.

  return (
    <AppShell onLogout={onLogout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}>
      {/* Fill exactly the viewport below the fixed nav and let ONLY the grid
          scroll. Without this the page also scrolls, which drags the grid's
          sticky operatory headers up over the date/filter bar. */}
      <div className="flex flex-col h-[calc(100vh-var(--app-nav-height))] overflow-hidden">
        {/* Scheduler Header — fixed at the top of the non-scrolling column */}
        <div className="bg-white shadow-md border-b border-[#E2E8F0] flex-shrink-0 relative z-10">
          {/* Single-row slate header: title, date nav, view toggle, inline
              filters, and the action button — the separate filter row was
              folded in here to reclaim that vertical space. Wraps gracefully
              on narrow widths. */}
          <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            {/* Title */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div className="leading-tight">
                <h1 className="text-lg font-bold text-white">Scheduler</h1>
                <p className="text-[11px] text-white/80">Office: {currentOffice}</p>
              </div>
            </div>

            {/* Date navigation + view toggle */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                ref={calendarBtnRef}
                onClick={() => setShowCalendarPicker(!showCalendarPicker)}
                className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors flex items-center gap-1.5 text-white text-sm font-medium"
                aria-label="Select date"
              >
                <Calendar className="w-4 h-4" strokeWidth={2} />
                {selectedDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </button>
              <button
                onClick={() => stepDate(-1)}
                className="px-2 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium flex items-center gap-0.5"
                aria-label="Previous"
              >
                <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
                Prev
              </button>
              <button
                onClick={goToToday}
                className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium"
                aria-label="Go to today"
              >
                Today
              </button>
              <button
                onClick={() => stepDate(1)}
                className="px-2 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium flex items-center gap-0.5"
                aria-label="Next"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <div className="flex items-center bg-white/10 border border-white/30 rounded-md overflow-hidden ml-0.5">
                {(["daily", "weekly", "monthly"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      viewMode === mode
                        ? "bg-white text-[#1F3A5F]"
                        : "text-white hover:bg-white/20"
                    }`}
                    aria-pressed={viewMode === mode}
                  >
                    {mode === "daily" ? "Day" : mode === "weekly" ? "Week" : "Month"}
                  </button>
                ))}
              </div>
            </div>

            {/* Inline filters + action, pushed to the right */}
            <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="hdr-filter-select rounded-md text-xs focus:outline-none max-w-[130px]"
                aria-label="Filter by status"
                title="Filter by status"
              >
                <option className="bg-white text-slate-800" value="">All statuses</option>
                {statusMenuItems.map((s) => (
                  <option className="bg-white text-slate-800" key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value)}
                className="hdr-filter-select rounded-md text-xs focus:outline-none max-w-[140px]"
                aria-label="Filter by provider"
                title="Filter by provider"
              >
                <option className="bg-white text-slate-800" value="">All providers</option>
                {providers.map((p) => (
                  <option className="bg-white text-slate-800" key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={filterOperatory}
                onChange={(e) => setFilterOperatory(e.target.value)}
                className="hdr-filter-select rounded-md text-xs focus:outline-none max-w-[140px]"
                aria-label="Filter by operatory"
                title="Filter by operatory"
              >
                <option className="bg-white text-slate-800" value="">All operatories</option>
                {operatories.map((op) => (
                  <option className="bg-white text-slate-800" key={op.id} value={op.id}>
                    {op.name}
                  </option>
                ))}
              </select>
              {(filterStatus || filterProvider || filterOperatory) && (
                <button
                  onClick={() => {
                    setFilterStatus("");
                    setFilterProvider("");
                    setFilterOperatory("");
                  }}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                  aria-label="Clear filters"
                  title="Clear filters"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              )}
              <button
                onClick={() => setShowLegend((v) => !v)}
                className={`px-2.5 py-1.5 border rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium ${
                  showLegend
                    ? "bg-white text-[#1F3A5F] border-white"
                    : "bg-white/10 text-white border-white/30 hover:bg-white/20"
                }`}
                aria-pressed={showLegend}
                title="Toggle provider color legend"
              >
                <Palette className="w-4 h-4" strokeWidth={2} />
                Legend
              </button>
              <button
                onClick={() => handleAddNewAppointment()}
                className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm ml-1"
                aria-label="Add new appointment"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                NEW APPOINTMENT
              </button>
            </div>
          </div>

          {/* Provider color legend (opt-in) — in-view providers with their
              stable colors. Kept out of the default layout to save vertical
              space; toggled via the Legend button above. */}
          {showLegend && (
            <div className="bg-white border-t border-[#E2E8F0] px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">
                Providers:
              </span>
              {legendProviders.length === 0 ? (
                <span className="text-xs text-[#94A3B8]">
                  No appointments in view.
                </span>
              ) : (
                legendProviders.map((p) => (
                  <span key={p.id} className="flex items-center gap-1.5 text-xs text-[#1E293B]">
                    <span
                      className="inline-block w-3 h-3 rounded-sm border"
                      style={{ backgroundColor: p.color.bg, borderColor: p.color.border }}
                    />
                    {p.name}
                  </span>
                ))
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {(isLoadingAppointments || isLoadingOperatories) && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#1F3A5F]" />
            <span className="ml-3 text-gray-600">
              {isLoadingOperatories
                ? "Loading operatories..."
                : "Loading appointments..."}
            </span>
          </div>
        )}

        {/* ✅ FIX: Scheduler Grid — the ONLY scroll region (flex-1 + min-h-0 so
            it fills the remaining column height and scrolls internally). */}
        <div
          ref={gridScrollRef}
          className="overflow-auto scheduler-scroll-container flex-1 min-h-0"
          role="grid"
          aria-label="Appointment scheduler"
          aria-rowcount={timeSlots.length + 1}
          aria-colcount={operatories.length + 1}
        >
          {/* Daily view — operatory columns × time slots */}
          {viewMode === "daily" && (
          <div className="flex min-w-full">
            {/* Time Column */}
            <div className="sticky left-0 bg-white border-r-2 border-[#E2E8F0] z-10 shadow-md flex-shrink-0 w-20">
              {/* Sticky blue time header */}
              <div className="h-12 border-b-2 border-[#16293B] bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] backdrop-blur-sm sticky top-0 z-20"></div>
              {timeSlots.map((time) => {
                const outside = isOutsideOfficeHours(time);
                return (
                  <div
                    key={time}
                    className={`h-10 px-3 flex items-center justify-end border-b border-slate-200 text-sm font-semibold ${
                      outside ? "bg-slate-100 text-slate-400" : "text-slate-600"
                    }`}
                    role="rowheader"
                  >
                    {time.endsWith(":00") &&
                      new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                  </div>
                );
              })}
            </div>

            {/* Operatory Columns */}
            {operatories.map((operatory, colIndex) => (
              <div
                key={operatory.id}
                className="border-r-2 border-[#E2E8F0] flex-1 min-w-[220px]"
                role="gridcell"
                aria-colindex={colIndex + 2}
              >
                {/* ✅ FIX: Column Header - Sticky with backdrop-blur. A colored
                    top accent shows the operatory's assigned provider color. */}
                <div className="relative h-12 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] backdrop-blur-sm text-white px-3 py-1.5 border-b-2 border-[#16293B] sticky top-0 z-20">
                  {operatory.provider_id && (
                    <span
                      className="absolute left-0 right-0 top-0 h-1.5"
                      style={{
                        backgroundColor: providerColorFor(
                          operatory.provider_id,
                          providerColorMap,
                        ).border,
                      }}
                    />
                  )}
                  <div className="text-sm font-bold truncate">
                    {operatory.name}
                  </div>
                  {operatory.provider_id && (
                    <div className="text-xs opacity-90 truncate">
                      {resolveProviderName(operatory.provider_id)}
                    </div>
                  )}
                </div>

                {/* Time Slots */}
                <div className="relative bg-white">
                  {timeSlots.map((time, rowIndex) => {
                    const outside = isOutsideOfficeHours(time);
                    const slotBlocked = isSlotBlocked(
                      time,
                      operatory.id,
                    );
                    const occupyingAppt =
                      getSlotOccupyingAppointment(
                        time,
                        operatory.id,
                      );
                    // Slots outside office hours are visible but non-interactive.
                    const disabled = outside || slotBlocked;

                    return (
                      <div
                        key={`${operatory.id}-${time}`}
                        className={`h-10 border-b border-slate-200 transition-colors ${
                          outside
                            ? "bg-slate-100 cursor-not-allowed"
                            : slotBlocked
                              ? "bg-slate-100 cursor-not-allowed"
                              : "hover:bg-[#F7F9FC] cursor-pointer"
                        }`}
                        onContextMenu={(e) => {
                          if (!disabled) {
                            handleEmptySlotRightClick(
                              e,
                              time,
                              operatory.id,
                            );
                          } else {
                            e.preventDefault();
                          }
                        }}
                        title={
                          outside
                            ? "Outside office hours"
                            : slotBlocked && occupyingAppt
                              ? `Time unavailable - occupied by ${occupyingAppt.patient_name} (${occupyingAppt.start_time}-${occupyingAppt.end_time})`
                              : ""
                        }
                        role="gridcell"
                        aria-rowindex={rowIndex + 2}
                        aria-colindex={colIndex + 2}
                      ></div>
                    );
                  })}

                  {/* ✅ OPTIMIZED: Appointments from precomputed map */}
                  {(
                    appointmentsByOperatory.get(operatory.id) ||
                    []
                  ).map((appointment) => {
                    const { top, height } =
                      getAppointmentPosition(appointment);
                    const meta = statusMetaFor(appointment.status);
                    const statusColor =
                      statusColors.get(appointment.status) ?? meta.color;
                    // Provider-specific color for the block (see legend).
                    const pc: ProviderColor = providerColorFor(
                      appointment.provider_id,
                      providerColorMap,
                    );
                    const hasAlerts =
                      appointment.patient_id != null &&
                      (alertsByPatient.get(appointment.patient_id)?.length ?? 0) > 0;
                    // $ badge when the patient owes an outstanding balance.
                    const patientBalance =
                      appointment.patient_id != null
                        ? balanceByPatient.get(appointment.patient_id)
                        : undefined;
                    const owesMoney = (patientBalance?.balance ?? 0) > 0;
                    // Missed appointments stay on the grid with a strikethrough
                    // (PDF page 15); cancelled ones are dimmed.
                    const isStruck = appointment.missed || appointment.cancelled;
                    return (
                      <div
                        key={appointment.id}
                        className={`absolute left-1 right-1 border-2 rounded pr-2 py-1 cursor-pointer overflow-hidden ${
                          appointment.cancelled ? "opacity-60" : ""
                        }`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          backgroundColor: pc.bg,
                          borderColor: pc.border,
                          color: pc.text,
                        }}
                        onClick={(e) =>
                          handleAppointmentLeftClick(e, appointment)
                        }
                        onDoubleClick={() => handleEditAppointment(appointment)}
                        onContextMenu={(e) =>
                          handleAppointmentRightClick(
                            e,
                            appointment,
                          )
                        }
                        role="button"
                        aria-label={`${appointment.patient_name} - ${appointment.procedure_label} at ${appointment.start_time} (${appointment.status})`}
                        tabIndex={0}
                      >
                        {/* Status color strip (left edge) */}
                        <span
                          className="absolute left-0 top-0 bottom-0 w-1.5"
                          style={{ backgroundColor: statusColor }}
                          title={appointment.status}
                        />
                        <div className="pl-2">
                          <div
                            className={`text-xs truncate flex items-center gap-1 ${
                              isStruck ? "line-through" : ""
                            }`}
                          >
                            <span
                              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold flex-shrink-0"
                              style={{ backgroundColor: statusColor, color: "#fff" }}
                              title={appointment.status}
                            >
                              {meta.letter}
                            </span>
                            <strong>{appointment.start_time}</strong>
                            <span className="truncate">
                              {appointment.patient_name}
                            </span>
                            {appointment.is_new_patient && (
                              <span
                                className="text-[9px] font-bold text-emerald-700"
                                title="New patient"
                              >
                                NP
                              </span>
                            )}
                            {owesMoney && (
                              <span
                                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-green-600 text-white text-[9px] font-bold flex-shrink-0"
                                title={`Outstanding balance: $${(patientBalance?.balance ?? 0).toLocaleString(
                                  "en-US",
                                  { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                                )}${
                                  patientBalance && patientBalance.patient_balance > 0
                                    ? ` (patient $${patientBalance.patient_balance.toLocaleString(
                                        "en-US",
                                        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                                      )})`
                                    : ""
                                }`}
                                aria-label="Patient has an outstanding balance"
                              >
                                $
                              </span>
                            )}
                            {hasAlerts && (
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleShowMedicalAlert(e, appointment)
                                }
                                className="text-red-600 hover:text-red-800 flex-shrink-0"
                                title="Medical alert"
                                aria-label="View medical alert"
                              >
                                <span aria-hidden>✚</span>
                              </button>
                            )}
                          </div>
                          <div
                            className={`text-xs truncate ${
                              isStruck ? "line-through" : ""
                            }`}
                          >
                            {appointment.provider_name
                              ? `${appointment.provider_name}: `
                              : ""}
                            {appointment.procedure_label}
                          </div>
                          {appointment.duration >= 30 && (
                            <div className="text-xs opacity-75">
                              {appointment.duration} min
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          )}

          {viewMode === "weekly" && (
            <WeekView
              selectedDate={selectedDate}
              appointments={validAppointments}
              onSelectDay={handleSelectDay}
              onEditAppointment={handleEditAppointment}
              getProviderColor={(appt) =>
                providerColorFor(appt.provider_id, providerColorMap)
              }
            />
          )}

          {viewMode === "monthly" && (
            <MonthView
              selectedDate={selectedDate}
              appointments={validAppointments}
              onSelectDay={handleSelectDay}
              getProviderColor={(appt) =>
                providerColorFor(appt.provider_id, providerColorMap)
              }
            />
          )}
        </div>

        {/* Context Menu */}
        {contextMenu.visible && (
          <div
            ref={contextMenuRef}
            className="fixed bg-white border border-[#E2E8F0] rounded-lg shadow-xl z-50 py-0.5"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
              width: "210px",
              maxWidth: "210px",
            }}
          >
            {contextMenu.type === "empty" ? (
              <>
                <button
                  onClick={() =>
                    handleAddNewAppointment(
                      contextMenu.timeSlot,
                      contextMenu.operatory,
                    )
                  }
                  className="w-full px-3 py-1.5 text-left text-sm leading-tight text-[#1E293B] hover:bg-[#F7F9FC]"
                  role="menuitem"
                >
                  Add New Appointment
                </button>
              </>
            ) : contextMenu.appointment ? (
              <>
                <button
                  onClick={() =>
                    handleEditAppointment(
                      contextMenu.appointment!,
                    )
                  }
                  className="w-full px-3 py-1.5 text-left text-sm leading-tight text-[#1E293B] hover:bg-[#F7F9FC]"
                  role="menuitem"
                >
                  Edit
                </button>
                <button
                  onClick={() =>
                    handleEditAppointment(contextMenu.appointment!)
                  }
                  className="w-full px-3 py-1.5 text-left text-sm leading-tight text-[#1E293B] hover:bg-[#F7F9FC]"
                  role="menuitem"
                  title="Open the appointment to change its date/time"
                >
                  Reschedule
                </button>
                <button
                  onClick={() =>
                    handleDeleteAppointment(
                      contextMenu.appointment!,
                    )
                  }
                  className="w-full px-3 py-1.5 text-left hover:bg-red-50 text-red-600 font-medium text-sm border-b border-[#E2E8F0]"
                  role="menuitem"
                >
                  Delete
                </button>
                {/* STEP 3.2: Divider between actions and submenus */}
                <div className="my-1 border-t border-[#E2E8F0]" />
                {/* ✅ STEP 4: Go To - Click-based trigger */}
                <button
                  onClick={(e) =>
                    openSubmenu("goto", e.currentTarget)
                  }
                  className="w-full px-3 py-1.5 text-left
             hover:bg-[#F7F9FC]
             text-[#1E293B] font-medium text-sm
             flex items-center justify-between"
                  role="menuitem"
                  aria-haspopup="true"
                >
                  Go To
                  <span>›</span>
                </button>

                {/* ✅ STEP 4: Set Status - Click-based trigger */}
                <button
                  onClick={(e) =>
                    openSubmenu("status", e.currentTarget)
                  }
                  className="w-full px-3 py-1.5 text-left
             hover:bg-[#F7F9FC]
             text-[#1E293B] font-medium text-sm
             flex items-center justify-between"
                  role="menuitem"
                  aria-haspopup="true"
                >
                  Set Status
                  <span>›</span>
                </button>
              </>
            ) : null}
          </div>
        )}

        {/* Go To -> Email (hands the draft to the user's mail client) */}
        {commTarget?.kind === "email" && (
          <SendEmailModal
            isOpen
            onClose={() => setCommTarget(null)}
            patientEmail={commTarget.email}
            patientName={commTarget.name}
          />
        )}

        {/* Go To -> Text Message (records an sms-messages row) */}
        {commTarget?.kind === "sms" && (
          <SendSmsModal
            isOpen
            onClose={() => setCommTarget(null)}
            patientName={commTarget.name}
            patientId={commTarget.patient_id}
            officeId={officeIdNum(currentOffice) ?? null}
            appointmentId={commTarget.appointment_id}
            defaultPhone={commTarget.phone}
          />
        )}

        {/* New Appointment Modal */}
        {showNewAppointment && (
          <NewAppointmentModal
            isOpen={showNewAppointment}
            onClose={() => {
              setShowNewAppointment(false);
              setEditingAppointment(null);
            }}
            onSave={handleSaveAppointment}
            selectedSlot={selectedSlot}
            currentOffice={currentOffice}
            editingAppointment={editingAppointment}
            selectedDate={selectedDate}
          />
        )}

        {/* Calendar Picker Portal */}
        {showCalendarPicker &&
          calendarBtnRef.current &&
          createPortal(
            <CalendarPicker
              selectedDate={selectedDate}
              onDateChange={handleSchedulerDateChange}
              onClose={() => setShowCalendarPicker(false)}
              position={{
                top:
                  calendarBtnRef.current.getBoundingClientRect()
                    .bottom +
                  window.scrollY +
                  6,
                left:
                  calendarBtnRef.current.getBoundingClientRect()
                    .left + window.scrollX,
              }}
            />,
            document.body,
          )}

        {/* ✅ STEP 5: Portal-based Submenu Rendering (CRITICAL FIX) */}
        {activeSubmenu.type &&
          activeSubmenu.anchorRect &&
          createPortal(
            (() => {
              // ✅ STEP 2: viewport-safe vertical calculation
              const viewportHeight = window.innerHeight;

              const idealTop = activeSubmenu.anchorRect.top;
              const spaceBelow =
                viewportHeight - idealTop - SUBMENU_MARGIN;

              const submenuHeight = SUBMENU_MAX_HEIGHT;

              const safeTop =
                spaceBelow >= submenuHeight
                  ? idealTop
                  : Math.max(
                      SUBMENU_MARGIN,
                      viewportHeight - submenuHeight - SUBMENU_MARGIN,
                    );

              // ✅ STEP 3: Horizontal safety
              const viewportWidth = window.innerWidth;

              const idealLeft =
                activeSubmenu.anchorRect.right + SUBMENU_MARGIN;

              const spaceRight =
                viewportWidth - idealLeft - SUBMENU_MARGIN;

              const safeLeft =
                spaceRight >= SUBMENU_WIDTH
                  ? idealLeft
                  : Math.max(
                      SUBMENU_MARGIN,
                      activeSubmenu.anchorRect.left -
                        SUBMENU_WIDTH -
                        SUBMENU_MARGIN,
                    );

              return (
                <div
                  className="fixed bg-white border border-[#E2E8F0] rounded-lg shadow-xl py-1 z-[9999]"
                  style={{
                    top: safeTop,
                    left: safeLeft,
                    width: SUBMENU_WIDTH,
                    maxHeight: SUBMENU_MAX_HEIGHT,
                    overflowY: "auto",
                    boxSizing: "border-box",
                  }}
                  onMouseLeave={closeSubmenu}
                >
                  {/* ✅ STEP 6: Go To Submenu */}
                  {activeSubmenu.type === "goto" && (
                    <>
                      <button
                        onClick={() => {
                          handleGoToPatient("overview", submenuAppointment!);
                          closeSubmenu();
                        }}
                        className={menuItemClass}
                      >
                        Patient Overview
                      </button>
                      <button
                        onClick={() => {
                          handleGoToPatient("treatment", submenuAppointment!);
                          closeSubmenu();
                        }}
                        className={menuItemClass}
                      >
                        Treatment Plans
                      </button>
                      <button
                        onClick={() => {
                          handleGoToPatient("transactions", submenuAppointment!);
                          closeSubmenu();
                        }}
                        className={menuItemClass}
                      >
                        Transactions
                      </button>
                      <button
                        onClick={() => {
                          handleGoToPatient("ledger", submenuAppointment!);
                          closeSubmenu();
                        }}
                        className={menuItemClass}
                      >
                        Ledger
                      </button>
                      <button
                        onClick={() => {
                          handleGoToPatient("progress-notes", submenuAppointment!);
                          closeSubmenu();
                        }}
                        className={menuItemClass}
                      >
                        Progress Notes
                      </button>
                      <button
                        onClick={() => {
                          handleGoToPatient("notes", submenuAppointment!);
                          closeSubmenu();
                        }}
                        className={menuItemClass}
                      >
                        Notes
                      </button>
                      <button
                        onClick={() => {
                          handleGoToPatient("email", submenuAppointment!);
                          closeSubmenu();
                        }}
                        className={menuItemClass}
                      >
                        Email
                      </button>
                      <button
                        onClick={() => {
                          handleGoToPatient("sms", submenuAppointment!);
                          closeSubmenu();
                        }}
                        className={menuItemClass}
                      >
                        Text Message
                      </button>
                      <button
                        onClick={() => {
                          handleGoToPatient("charting", submenuAppointment!);
                          closeSubmenu();
                        }}
                        className={menuItemClass}
                      >
                        Restorative Chart
                      </button>
                      <button
                        onClick={() => {
                          handleGoToPatient("perio", submenuAppointment!);
                          closeSubmenu();
                        }}
                        className={menuItemClass}
                      >
                        Perio Chart
                      </button>
                      <button
                        onClick={() => {
                          handleGoToPatient("imaging", submenuAppointment!);
                          closeSubmenu();
                        }}
                        className={menuItemClass}
                      >
                        Imaging System
                      </button>
                    </>
                  )}

                  {/* ✅ STEP 6: Set Status Submenu — grouped like the legacy
                      menu (PDF page 12): confirmation statuses, then same-day
                      statuses, then Missed / Cancelled. */}
                  {activeSubmenu.type === "status" && (
                    <>
                      <div className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                        Confirmation
                      </div>
                      {CONFIRMATION_STATUSES.map((name) => {
                        const m = statusMetaFor(name);
                        return (
                          <button
                            key={name}
                            onClick={() => {
                              requestSetStatus(submenuAppointment!, name);
                              closeSubmenu();
                            }}
                            className={`${menuItemClass} flex items-center gap-2`}
                          >
                            <span
                              className="inline-flex w-4 h-4 rounded-full items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                              style={{ backgroundColor: statusColors.get(name) ?? m.color }}
                            >
                              {m.letter}
                            </span>
                            {m.label}
                          </button>
                        );
                      })}
                      <div className="my-1 border-t border-[#E2E8F0]" />
                      <div className="px-3 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                        Same-day
                      </div>
                      {SAMEDAY_STATUSES.map((name) => {
                        const m = statusMetaFor(name);
                        return (
                          <button
                            key={name}
                            onClick={() => {
                              requestSetStatus(submenuAppointment!, name);
                              closeSubmenu();
                            }}
                            className={`${menuItemClass} flex items-center gap-2`}
                          >
                            <span
                              className="inline-flex w-4 h-4 rounded-full items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                              style={{ backgroundColor: statusColors.get(name) ?? m.color }}
                            >
                              {m.letter}
                            </span>
                            {m.label}
                          </button>
                        );
                      })}
                      <div className="my-1 border-t border-[#E2E8F0]" />
                      {(["Missed", "Cancelled"] as const).map((name) => {
                        const m = statusMetaFor(name);
                        return (
                          <button
                            key={name}
                            onClick={() => {
                              requestSetStatus(submenuAppointment!, name);
                              closeSubmenu();
                            }}
                            className={`${menuItemClass} flex items-center gap-2 font-medium`}
                          >
                            <span
                              className="inline-flex w-4 h-4 rounded-full items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                              style={{ backgroundColor: m.color }}
                            >
                              {m.letter}
                            </span>
                            {m.label}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })(),
            document.body,
          )}

        {/* Appointment Details pop-out (left-click) — PDF pages 5–7 */}
        {detailsAppt && (
          <AppointmentDetailsPopover
            appointment={detailsAppt}
            anchor={detailsAnchor}
            statusColors={statusColors}
            onClose={() => setDetailsAppt(null)}
            onSetStatus={(status) => requestSetStatus(detailsAppt, status)}
            onCancelRequest={() => setCancelAppt(detailsAppt)}
          />
        )}

        {/* Cancel Appointment dialog — PDF page 16 */}
        {cancelAppt && (
          <CancelAppointmentDialog
            patientName={cancelAppt.patient_name}
            busy={isCancelling}
            onConfirm={confirmCancel}
            onClose={() => setCancelAppt(null)}
          />
        )}

        {/* Medical Alert popover — PDF page 18 */}
        {alertPopover && (
          <MedicalAlertPopover
            patientName={alertPopover.patientName}
            alerts={alertPopover.alerts}
            anchor={{ x: alertPopover.x, y: alertPopover.y }}
            onClose={() => setAlertPopover(null)}
          />
        )}
      </div>
    </AppShell>
  );
}