import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
} from "lucide-react";
import GlobalNav from "../GlobalNav";
import WeekView from "../scheduler/WeekView";
import MonthView from "../scheduler/MonthView";
import NewAppointmentModal from "../modals/NewAppointmentModal";
import DatePickerCalendar from "../modals/DatePickerCalendar";
import CalendarPicker from "../CalendarPicker";
import { components } from "../../styles/theme";
import { procedureTypeColorClasses } from "../../utils/procedureTypeColor";
import {
  fetchAppointments,
  fetchOperatories,
  fetchProviders,
  fetchSchedulerConfig,
  fetchProcedureTypes,
  fetchAppointmentStatuses,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
  type Operatory,
  type Provider,
  type SchedulerConfig,
  type ProcedureType,
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
  const [showDatePickerModal, setShowDatePickerModal] =
    useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const calendarBtnRef = useRef<HTMLButtonElement>(null);

  // Generate time slots based on scheduler config
  const generateTimeSlots = (config: SchedulerConfig): string[] => {
    const slots: string[] = [];
    for (let hour = config.startHour; hour < config.endHour; hour++) {
      for (let minute = 0; minute < 60; minute += config.slotInterval) {
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push(time);
      }
    }
    return slots;
  };

  // Default scheduler config
  const defaultConfig: SchedulerConfig = {
    startHour: 8,
    endHour: 17,
    slotInterval: 10,
  };

  // Data state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [operatories, setOperatories] = useState<Operatory[]>([]);
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([]);
  const [appointmentStatuses, setAppointmentStatuses] = useState<AppointmentStatus[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);

  // Calendar filters (backend-driven via listAppointments params).
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProvider, setFilterProvider] = useState("");
  const [filterOperatory, setFilterOperatory] = useState("");
  const [schedulerConfig, setSchedulerConfig] = useState<SchedulerConfig>(defaultConfig);
  const [timeSlots, setTimeSlots] = useState<string[]>(() => generateTimeSlots(defaultConfig));

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
        // Scope operatories and providers to the selected office (service
        // extracts the numeric office_id from "OFF-1"). Providers feed the
        // provider filter dropdown.
        const [ops, provs] = await Promise.all([
          fetchOperatories(currentOffice),
          fetchProviders(currentOffice).catch(() => []),
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

  // Fetch procedure types on mount and when office changes
  useEffect(() => {
    const loadProcedureTypes = async () => {
      try {
        // Procedure types come from the tenant-wide `definitions` table and
        // are not office-scoped on the backend.
        const data = await fetchProcedureTypes();
        setProcedureTypes(data);
      } catch (err: any) {
        console.error("Error loading procedure types:", err);
        // Don't set error state for procedure types - it's not critical for basic functionality
      }
    };

    loadProcedureTypes();
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

  // Update time slots when config changes - only if config is valid
  useEffect(() => {
    if (isValidConfig(schedulerConfig)) {
      const newTimeSlots = generateTimeSlots(schedulerConfig);
      // Only update if we get valid time slots
      if (newTimeSlots.length > 0) {
        setTimeSlots(newTimeSlots);
      }
    }
  }, [schedulerConfig]);

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

  // Get procedure type color (centralized in utils/procedureTypeColor)
  const getProcedureTypeColor = (procedureTypeName: string): string => {
    const procedureType = procedureTypes.find(
      (pt) => pt.name === procedureTypeName
    );
    return procedureTypeColorClasses(procedureType?.color);
  };

  // Calculate appointment position
  const getAppointmentPosition = (appointment: Appointment) => {
    const parts = appointment.start_time.split(":").map(Number);
    const hours = parts[0] ?? 0;
    const minutes = parts[1] ?? 0;
    const startMinutes = (hours - 8) * 60 + minutes;
    const slotHeight = 40; // Height per 10-minute slot
    const top = (startMinutes / 10) * slotHeight;
    const height = (appointment.duration / 10) * slotHeight;
    return { top, height };
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

    switch (module) {
      case "overview":
        navigate(`/patient/${numericPatientId}/overview`);
        break;
      case "ledger":
        navigate(`/patient/${numericPatientId}/ledger`);
        break;
      case "transactions":
        navigate(`/patient/${numericPatientId}/transaction`);
        break;
      case "charting":
        navigate(`/patient/${numericPatientId}/restorative`);
        break;
      default:
        break;
    }
  };

  // Set appointment status
  const handleSetStatus = async (
    appointment: Appointment,
    status: Appointment["status"],
  ) => {
    try {
      const updatedAppointment = await updateAppointmentStatus(
        appointment.id,
        status
      );
      setAppointments(
        appointments.map((appt) =>
          appt.id === appointment.id ? updatedAppointment : appt
        )
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
    <div className="min-h-screen bg-[#F7F9FC]">
      <GlobalNav onLogout={onLogout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} />

      {/* Scheduler Content with top padding (match GlobalNav height) */}
      <div className="pt-[120px] md:pt-[136px]">
        {/* Scheduler Header */}
        <div className="bg-white shadow-md border-b border-[#E2E8F0] sticky top-[120px] md:top-[136px] z-10">
          {/* Slate Blue Header Bar */}
          <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Calendar
                  className="w-7 h-7 text-white"
                  strokeWidth={2}
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Scheduler
                </h1>
                <p className="text-sm text-white/80">
                  Office: {currentOffice}
                </p>
              </div>
            </div>

            {/* ✅ FIX: Center Date Navigation with overflow control */}
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap max-w-[50vw]">
              {/* Date Picker Button */}
              <button
                ref={calendarBtnRef}
                onClick={() =>
                  setShowCalendarPicker(!showCalendarPicker)
                }
                className="px-3 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors flex items-center gap-2 text-white text-sm font-medium flex-shrink-0"
                aria-label="Select date"
              >
                <Calendar className="w-4 h-4" strokeWidth={2} />
                {selectedDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </button>

              {/* View-aware navigation (steps by day / week / month) */}
              <button
                onClick={() => stepDate(-1)}
                className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium flex items-center gap-1 flex-shrink-0"
                aria-label="Previous"
              >
                <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
                Prev
              </button>
              <button
                onClick={goToToday}
                className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium flex-shrink-0"
                aria-label="Go to today"
              >
                Today
              </button>
              <button
                onClick={() => stepDate(1)}
                className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium flex items-center gap-1 flex-shrink-0"
                aria-label="Next"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
              </button>

              {/* View toggle: Day / Week / Month */}
              <div className="flex items-center bg-white/10 border border-white/30 rounded-md overflow-hidden flex-shrink-0 ml-1">
                {(["daily", "weekly", "monthly"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
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

            {/* ✅ FIX: Right Action Buttons with overflow control */}
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap max-w-[30vw] flex-shrink-0">
              <button
                onClick={() => handleAddNewAppointment()}
                className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm flex-shrink-0"
                aria-label="Add new appointment"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                NEW APPOINTMENT
              </button>
            </div>
          </div>

          {/* Filter bar — backend-driven status/provider/operatory filters */}
          <div className="bg-white border-t border-[#E2E8F0] px-6 py-2 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
              Filters:
            </span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 py-1 border border-[#CBD5E1] rounded text-sm text-[#1E293B] focus:outline-none focus:border-[#3A6EA5]"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {statusMenuItems.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="px-2 py-1 border border-[#CBD5E1] rounded text-sm text-[#1E293B] focus:outline-none focus:border-[#3A6EA5]"
              aria-label="Filter by provider"
            >
              <option value="">All providers</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={filterOperatory}
              onChange={(e) => setFilterOperatory(e.target.value)}
              className="px-2 py-1 border border-[#CBD5E1] rounded text-sm text-[#1E293B] focus:outline-none focus:border-[#3A6EA5]"
              aria-label="Filter by operatory"
            >
              <option value="">All operatories</option>
              {operatories.map((op) => (
                <option key={op.id} value={op.id}>
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
                className="text-xs font-semibold text-[#3A6EA5] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
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

        {/* ✅ FIX: Scheduler Grid with Tailwind class and ARIA */}
        <div
          className="overflow-auto scheduler-scroll-container h-[calc(100vh-170px)]"
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
              {timeSlots.map((time, index) => (
                <div
                  key={time}
                  className="h-10 px-3 flex items-center justify-end border-b border-slate-200 text-sm text-slate-600 font-semibold"
                  role="rowheader"
                >
                  {index % 6 === 0 && time}
                </div>
              ))}
            </div>

            {/* Operatory Columns */}
            {operatories.map((operatory, colIndex) => (
              <div
                key={operatory.id}
                className="border-r-2 border-[#E2E8F0] flex-1 min-w-[220px]"
                role="gridcell"
                aria-colindex={colIndex + 2}
              >
                {/* ✅ FIX: Column Header - Sticky with backdrop-blur */}
                <div className="h-12 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] backdrop-blur-sm text-white px-3 py-1.5 border-b-2 border-[#16293B] sticky top-0 z-20">
                  <div className="text-sm font-bold">
                    {operatory.name}
                  </div>
                  {operatory.provider_id && (
                    <div className="text-xs opacity-90 truncate">
                      {providerNameById.get(operatory.provider_id) ?? ""}
                    </div>
                  )}
                </div>

                {/* Time Slots */}
                <div className="relative bg-white">
                  {timeSlots.map((time, rowIndex) => {
                    const slotBlocked = isSlotBlocked(
                      time,
                      operatory.id,
                    );
                    const occupyingAppt =
                      getSlotOccupyingAppointment(
                        time,
                        operatory.id,
                      );

                    return (
                      <div
                        key={`${operatory.id}-${time}`}
                        className={`h-10 border-b border-slate-200 transition-colors ${
                          slotBlocked
                            ? "bg-slate-100 cursor-not-allowed"
                            : "hover:bg-[#F7F9FC] cursor-pointer"
                        }`}
                        onContextMenu={(e) => {
                          if (!slotBlocked) {
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
                          slotBlocked && occupyingAppt
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
                    return (
                      <div
                        key={appointment.id}
                        className={`absolute left-1 right-1 border-2 rounded px-2 py-1 cursor-pointer overflow-hidden ${getProcedureTypeColor(appointment.procedure_label)}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                        }}
                        onContextMenu={(e) =>
                          handleAppointmentRightClick(
                            e,
                            appointment,
                          )
                        }
                        role="button"
                        aria-label={`${appointment.patient_name} - ${appointment.procedure_label} at ${appointment.start_time}`}
                        tabIndex={0}
                      >
                        <div className="text-xs truncate">
                          <strong>
                            {appointment.start_time}
                          </strong>{" "}
                          {appointment.patient_name}
                        </div>
                        <div className="text-xs truncate">
                          {appointment.procedure_label}
                        </div>
                        {appointment.duration >= 30 && (
                          <div className="text-xs opacity-75">
                            {appointment.duration} min
                          </div>
                        )}
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
              getColor={getProcedureTypeColor}
            />
          )}

          {viewMode === "monthly" && (
            <MonthView
              selectedDate={selectedDate}
              appointments={validAppointments}
              onSelectDay={handleSelectDay}
              getColor={getProcedureTypeColor}
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
                          handleGoToPatient(
                            "overview",
                            submenuAppointment!,
                          );
                          closeSubmenu();
                        }}
                        className={menuItemClass}
                      >
                        Patient Overview
                      </button>
                      <button className={menuItemClass}>
                        Treatment Plans
                      </button>
                      <button
                        onClick={() => {
                          handleGoToPatient(
                            "transactions",
                            submenuAppointment!,
                          );
                          closeSubmenu();
                        }}
                        className={menuItemClass}
                      >
                        Transactions
                      </button>
                      <button
                        onClick={() => {
                          handleGoToPatient(
                            "ledger",
                            submenuAppointment!,
                          );
                          closeSubmenu();
                        }}
                        className={menuItemClass}
                      >
                        Ledger
                      </button>
                      <button className={menuItemClass}>
                        Progress Notes
                      </button>
                      <button className={menuItemClass}>
                        Notes
                      </button>
                      <button className={menuItemClass}>
                        Email
                      </button>
                      <button className={menuItemClass}>
                        Text Message
                      </button>
                      <button
                        onClick={() => {
                          handleGoToPatient(
                            "charting",
                            submenuAppointment!,
                          );
                          closeSubmenu();
                        }}
                        className={menuItemClass}
                      >
                        Restorative Chart
                      </button>
                      <button className={menuItemClass}>
                        Perio Chart
                      </button>
                      <button className={menuItemClass}>
                        Imaging System
                      </button>
                    </>
                  )}

                  {/* ✅ STEP 6: Set Status Submenu (backend-driven via definitions) */}
                  {activeSubmenu.type === "status" && (
                    <>
                      {statusMenuItems.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => {
                            handleSetStatus(
                              submenuAppointment!,
                              status.value as Appointment["status"],
                            );
                            closeSubmenu();
                          }}
                          className={menuItemClass}
                        >
                          {status.label}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              );
            })(),
            document.body,
          )}
      </div>
    </div>
  );
}