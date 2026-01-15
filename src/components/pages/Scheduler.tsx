import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Printer,
  Loader2,
} from "lucide-react";
import GlobalNav from "../GlobalNav";
import NewAppointmentModal from "../modals/NewAppointmentModal";
import DatePickerCalendar from "../modals/DatePickerCalendar";
import CalendarPicker from "../CalendarPicker";
import { components } from "../../styles/theme";
import {
  fetchAppointments,
  fetchOperatories,
  fetchSchedulerConfig,
  fetchProcedureTypes,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  updateAppointmentStatus,
  type Appointment,
  type Operatory,
  type SchedulerConfig,
  type ProcedureType,
  type AppointmentCreateRequest,
  type AppointmentUpdateRequest,
} from "../../services/schedulerApi";

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
  const [viewMode, setViewMode] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");
  const [contextMenu, setContextMenu] =
    useState<ContextMenuState>({
      visible: false,
      x: 0,
      y: 0,
      type: "empty",
    });
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
        // TODO: Map currentOffice to officeId if needed
        const data = await fetchOperatories();
        setOperatories(data);
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
        // TODO: Map currentOffice to officeId if needed
        const data = await fetchProcedureTypes();
        setProcedureTypes(data);
      } catch (err: any) {
        console.error("Error loading procedure types:", err);
        // Don't set error state for procedure types - it's not critical for basic functionality
      }
    };

    loadProcedureTypes();
  }, [currentOffice]);

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
        // TODO: Map currentOffice to officeId if needed
        const config = await fetchSchedulerConfig();
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

  // Fetch appointments when date changes
  useEffect(() => {
    const loadAppointments = async () => {
      setIsLoadingAppointments(true);
      setError(null);
      try {
        const currentDate = formatDateYYYYMMDD(selectedDate);
        // Fetch appointments for the selected date
        // Optionally fetch a range (e.g., ±7 days) for better performance
        const data = await fetchAppointments(currentDate, currentDate);
        setAppointments(data);
      } catch (err: any) {
        setError(`Failed to load appointments: ${err.message}`);
        console.error("Error loading appointments:", err);
      } finally {
        setIsLoadingAppointments(false);
      }
    };

    loadAppointments();
  }, [selectedDate, currentOffice]);

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
        appt.startTime,
        appt.endTime,
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
          appt.startTime,
          appt.endTime,
        ),
      ) || null
    );
  };

  // ===== END TIME BLOCKING LOGIC =====

  // Get procedure type color
  const getProcedureTypeColor = (procedureTypeName: string): string => {
    const procedureType = procedureTypes.find(
      (pt) => pt.name === procedureTypeName
    );
    
    if (procedureType?.color) {
      const color = procedureType.color.trim();
      
      // If it's already a full class string with border and text, use it directly
      if (color.includes("border-") && color.includes("text-")) {
        return color;
      }
      
      // If it's just a background color, map it to a complete color set
      // Map common Tailwind background colors to full class sets
      const colorMap: Record<string, string> = {
        "bg-red-100": "bg-red-100 border-red-400 text-red-900",
        "bg-blue-100": "bg-blue-100 border-blue-400 text-blue-900",
        "bg-green-100": "bg-green-100 border-green-400 text-green-900",
        "bg-yellow-100": "bg-yellow-100 border-yellow-400 text-yellow-900",
        "bg-purple-100": "bg-purple-100 border-purple-400 text-purple-900",
        "bg-pink-100": "bg-pink-100 border-pink-400 text-pink-900",
        "bg-indigo-100": "bg-indigo-100 border-indigo-400 text-indigo-900",
        "bg-cyan-100": "bg-cyan-100 border-cyan-400 text-cyan-900",
        "bg-teal-100": "bg-teal-100 border-teal-400 text-teal-900",
        "bg-orange-100": "bg-orange-100 border-orange-400 text-orange-900",
        "bg-emerald-100": "bg-emerald-100 border-emerald-400 text-emerald-900",
        "bg-gray-100": "bg-gray-100 border-gray-400 text-gray-900",
        "bg-slate-100": "bg-slate-100 border-slate-400 text-slate-900",
      };
      
      // Check if we have a mapping for this color
      if (colorMap[color]) {
        return colorMap[color];
      }
      
      // Try to extract color name and create a mapping
      const bgMatch = color.match(/bg-(\w+)-(\d+)/);
      if (bgMatch) {
        const colorName = bgMatch[1];
        // Return a complete color set using the extracted color name
        return `bg-${colorName}-100 border-${colorName}-400 text-${colorName}-900`;
      }
      
      // If we can't parse it, use as-is (might be a custom class)
      return color;
    }
    
    // Default fallback color
    return "bg-gray-100 border-gray-400 text-gray-900";
  };

  // Status colors (kept for potential future use, but appointments now use procedure type colors)
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Scheduled: "bg-blue-100 border-blue-400 text-blue-900",
      Confirmed: "bg-green-100 border-green-400 text-green-900",
      Unconfirmed:
        "bg-yellow-100 border-yellow-400 text-yellow-900",
      "Left Message":
        "bg-purple-100 border-purple-400 text-purple-900",
      "In Reception":
        "bg-cyan-100 border-cyan-400 text-cyan-900",
      Available: "bg-gray-100 border-gray-400 text-gray-900",
      "In Operatory": "bg-red-100 border-red-400 text-red-900",
      "Checked Out":
        "bg-emerald-100 border-emerald-400 text-emerald-900",
      Missed: "bg-orange-100 border-orange-400 text-orange-900",
      Cancelled: "bg-slate-100 border-slate-400 text-slate-900",
    };
    return (
      colors[status] ||
      "bg-gray-100 border-gray-400 text-gray-900"
    );
  };

  // Calculate appointment position
  const getAppointmentPosition = (appointment: Appointment) => {
    const parts = appointment.startTime.split(":").map(Number);
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
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu({
          visible: false,
          x: 0,
          y: 0,
          type: "empty",
        });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
  }, []);

  // Close context menu on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (contextMenu.visible) {
        setContextMenu({
          visible: false,
          x: 0,
          y: 0,
          type: "empty",
        });
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

  // Navigate to previous/next day
  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
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
      time: appointment.startTime,
      operatory: appointment.operatory,
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
    try {
      if (editingAppointment) {
        // Update existing appointment
        // Handle both old format (flat) and new format (nested)
        const appointment = appointmentData.appointment || appointmentData;
        
        const updateData: AppointmentUpdateRequest = {
          id: editingAppointment.id,
          patientId: appointment.patientId || editingAppointment.patientId,
          date: appointment.date || editingAppointment.date,
          startTime: appointment.startTime || appointment.time || editingAppointment.startTime,
          duration: appointment.duration || editingAppointment.duration,
          procedureType: appointment.procedureType || editingAppointment.procedureType,
          status: appointment.status || editingAppointment.status,
          operatory: appointment.operatory || editingAppointment.operatory,
          provider: appointment.provider || editingAppointment.provider,
          notes: appointment.notes || "",
        };

        const updatedAppointment = await updateAppointment(updateData);
        setAppointments(
          appointments.map((appt) =>
            appt.id === editingAppointment.id ? updatedAppointment : appt
          )
        );
        setEditingAppointment(null);
      } else {
        // Create new appointment
        // Handle both formats:
        // 1. New format from modal: { patient: {...}, appointment: {...} } or flat { patient_id, ... }
        // 2. Old format: flat object with camelCase fields
        
        let createData: AppointmentCreateRequest;
        
        // Check if this is the new API format (has patient object or snake_case fields)
        if (appointmentData.patient && appointmentData.appointment) {
          // New patient format: extract appointment data and let backend handle patient creation
          const appointment = appointmentData.appointment;
          createData = {
            patientId: "NEW", // Backend will create patient and use the generated ID
            date: appointment.date || appointment.start_date || formatDateYYYYMMDD(selectedDate),
            startTime: appointment.start_time || appointment.startTime || selectedSlot?.time || "09:00",
            duration: appointment.duration || 30,
            procedureType: appointment.procedure_type || appointment.procedureType,
            status: appointment.status || "Scheduled",
            operatory: appointment.operatory || selectedSlot?.operatory || "",
            provider: appointment.provider || "",
            notes: appointment.notes || "",
          };
          // Note: Backend should handle patient creation from appointmentData.patient
        } else if (appointmentData.patient_id || appointmentData.patientId) {
          // Existing patient format (snake_case or camelCase)
          createData = {
            patientId: appointmentData.patient_id || appointmentData.patientId || "NEW",
            date: appointmentData.date || formatDateYYYYMMDD(selectedDate),
            startTime: appointmentData.start_time || appointmentData.startTime || appointmentData.time || selectedSlot?.time || "09:00",
            duration: appointmentData.duration || 30,
            procedureType: appointmentData.procedure_type || appointmentData.procedureType,
            status: appointmentData.status || "Scheduled",
            operatory: appointmentData.operatory || selectedSlot?.operatory || "",
            provider: appointmentData.provider || "",
            notes: appointmentData.notes || "",
          };
        } else {
          // Old format fallback (camelCase, flat structure)
          createData = {
            patientId: appointmentData.patientId || "NEW",
            date: appointmentData.date || formatDateYYYYMMDD(selectedDate),
            startTime: appointmentData.startTime || appointmentData.time || selectedSlot?.time || "09:00",
            duration: appointmentData.duration || 30,
            procedureType: appointmentData.procedureType,
            status: appointmentData.status || "Scheduled",
            operatory: appointmentData.operatory || selectedSlot?.operatory || "",
            provider: appointmentData.provider || "",
            notes: appointmentData.notes || "",
          };
        }

        // Validate required fields
        if (!createData.operatory || !createData.provider || !createData.procedureType) {
          alert("Missing required fields: Operatory, Provider, or Procedure Type");
          return;
        }

        // TODO: For new patient flow, we need to send both patient and appointment data
        // This requires updating the createAppointment API function to handle the nested format
        // For now, we'll send the appointment data and let the backend handle patient creation
        // if appointmentData.patient exists, it should be sent separately or the API should accept it
        
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

  // Navigate to patient module
  const handleGoToPatient = (
    module: string,
    appointment: Appointment,
  ) => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      type: "empty",
    });

    // Set patient context in sessionStorage
    const patientContext = {
      id: appointment.patientId,
      name: appointment.patientName,
      age: 34, // Mock data
      gender: "M",
      dob: "03/15/1990",
      responsibleParty: "Self",
      homeOffice: currentOffice,
      primaryInsurance: "Delta Dental PPO",
      secondaryInsurance: "",
      accountBalance: 1245.0,
      estInsurance: 850.0,
      estPatient: 395.0,
      firstVisit: "01/15/2018",
      lastVisit: "11/20/2024",
      nextVisit: "01/15/2025",
      nextRecall: "05/20/2025",
    };
    sessionStorage.setItem(
      "activePatient",
      JSON.stringify(patientContext),
    );

    switch (module) {
      case "overview":
        navigate("/patient-overview");
        break;
      case "ledger":
        navigate("/patient-ledger");
        break;
      case "transactions":
        navigate("/transactions");
        break;
      case "charting":
        navigate("/charting");
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
        `Delete appointment for ${appointment.patientName}?`,
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

  // ✅ CRITICAL FIX: Calculate dynamic min-width based on operatory count
  const TIME_COLUMN_WIDTH = 80;
  const OPERATORY_COLUMN_WIDTH = 250;
  const schedulerMinWidth =
    TIME_COLUMN_WIDTH +
    operatories.length * OPERATORY_COLUMN_WIDTH;

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <GlobalNav onLogout={onLogout} />

      {/* Scheduler Content with top padding */}
      <div className="pt-[120px]">
        {/* Scheduler Header */}
        <div className="bg-white shadow-md border-b border-[#E2E8F0] sticky top-[120px] z-10">
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

              {/* Day Navigation */}
              <button
                onClick={() => changeDate(-1)}
                className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium flex items-center gap-1 flex-shrink-0"
                aria-label="Previous day"
              >
                <ChevronLeft
                  className="w-3.5 h-3.5"
                  strokeWidth={2}
                />
                Prev Day
              </button>
              <button
                onClick={() => changeDate(1)}
                className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium flex items-center gap-1 flex-shrink-0"
                aria-label="Next day"
              >
                Next Day
                <ChevronRight
                  className="w-3.5 h-3.5"
                  strokeWidth={2}
                />
              </button>


              {/* Month Navigation */}
              <button
                onClick={() => changeDate(-30)}
                className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium flex items-center gap-1 flex-shrink-0"
                aria-label="Previous month"
              >
                <ChevronLeft
                  className="w-3.5 h-3.5"
                  strokeWidth={2}
                />
                Prev Month
              </button>
              <button
                onClick={() => changeDate(30)}
                className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium flex items-center gap-1 flex-shrink-0"
                aria-label="Next month"
              >
                Next Month
                <ChevronRight
                  className="w-3.5 h-3.5"
                  strokeWidth={2}
                />
              </button>
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
              <button
                className="px-3 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm flex-shrink-0"
                aria-label="Quick fill appointments"
              >
                <Search className="w-4 h-4" strokeWidth={2.5} />
                QUICK FILL
              </button>
              <button
                className="px-3 py-1.5 bg-[#64748B] hover:bg-[#475569] text-white rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm flex-shrink-0"
                aria-label="Print schedule"
              >
                <Printer className="w-4 h-4" strokeWidth={2.5} />
                PRINT
              </button>
            </div>
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

<!--         {/* Scheduler Grid */}
        <div
          className="overflow-auto scheduler-scroll-container"
          style={{ height: "calc(100vh - 170px)" }}
        >
          <div className="inline-block min-w-full">
            <div className="flex">
              {/* Time Column */}
              <div className="sticky left-0 bg-white border-r-2 border-[#E2E8F0] z-10 shadow-md">
                <div className="h-12 border-b-2 border-[#16293B] bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]"></div>
                {timeSlots.map((time, index) => (
                  <div
                    key={time}
                    className="h-10 px-3 flex items-center justify-end border-b border-slate-200 text-sm text-slate-600 font-semibold"
                    style={{ minWidth: "80px" }}
                  >
                    {index % 6 === 0 && time}
                  </div>
                ))} -->

        {/* ✅ FIX: Scheduler Grid with Tailwind class and ARIA */}
        <div
          className="overflow-auto scheduler-scroll-container h-[calc(100vh-170px)]"
          role="grid"
          aria-label="Appointment scheduler"
          aria-rowcount={timeSlots.length + 1}
          aria-colcount={operatories.length + 1}
        >
          {/* ✅ CRITICAL FIX: Dynamic min-width calculation */}
          <div
            className="inline-block"
            style={{ minWidth: `${schedulerMinWidth}px` }}
          >
            <div className="flex">
              {/* Time Column */}
              <div className="sticky left-0 bg-white border-r-2 border-[#E2E8F0] z-10 shadow-md">
                <div className="h-12 border-b-2 border-[#16293B] bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] backdrop-blur-sm"></div>
                {timeSlots.map((time, index) => (
                  <div
                    key={time}
                    className="h-10 px-3 flex items-center justify-end border-b border-slate-200 text-sm text-slate-600 font-semibold"
                    style={{ minWidth: `${TIME_COLUMN_WIDTH}px` }}
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
                  className="border-r-2 border-[#E2E8F0]"
                  style={{
                    minWidth: `${OPERATORY_COLUMN_WIDTH}px`,
                  }}
                  role="gridcell"
                  aria-colindex={colIndex + 2}
                >
                  {/* ✅ FIX: Column Header - Sticky with backdrop-blur */}
                  <div className="h-12 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] backdrop-blur-sm text-white px-4 py-2 border-b-2 border-[#16293B] sticky top-0 z-20">
                    <div className="text-sm font-bold">
                      {operatory.name}
                    </div>
                    <div className="text-xs opacity-90">
                      {operatory.provider}
                    </div>
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
                              ? `Time unavailable - occupied by ${occupyingAppt.patientName} (${occupyingAppt.startTime}-${occupyingAppt.endTime})`
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
                          className={`absolute left-1 right-1 border-2 rounded px-2 py-1 cursor-pointer overflow-hidden ${getProcedureTypeColor(appointment.procedureType)}`}
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
                          aria-label={`${appointment.patientName} - ${appointment.procedureType} at ${appointment.startTime}`}
                          tabIndex={0}
                        >
                          <div className="text-xs truncate">
                            <strong>
                              {appointment.startTime}
                            </strong>{" "}
                            {appointment.patientName}
                          </div>
                          <div className="text-xs truncate">
                            {appointment.procedureType}
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
          </div>
        </div>

        {/* Context Menu */}
        {contextMenu.visible && (
          <div
            ref={contextMenuRef}
            className="fixed bg-white border-2 border-[#E2E8F0] rounded-lg shadow-xl z-50 py-1 max-h-[500px]"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
              minWidth: "220px",
            }}
            role="menu"
            aria-label="Appointment context menu"
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
                  className="w-full px-4 py-2 text-left hover:bg-[#F7F9FC] text-[#1E293B] font-medium text-sm border-b border-[#E2E8F0]"
                  role="menuitem"
                >
                  Add New Appointment
                </button>
                <button
                  className="w-full px-4 py-2 text-left hover:bg-[#F7F9FC] text-[#1E293B] font-medium text-sm border-b border-[#E2E8F0]"
                  role="menuitem"
                >
                  Search Quick-Fill
                </button>
                <button
                  className="w-full px-4 py-2 text-left hover:bg-[#F7F9FC] text-[#1E293B] font-medium text-sm"
                  role="menuitem"
                >
                  Paste
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
                  className="w-full px-4 py-2 text-left hover:bg-[#F7F9FC] text-[#1E293B] font-medium text-sm border-b border-[#E2E8F0]"
                  role="menuitem"
                >
                  Edit
                </button>
                <button
                  className="w-full px-4 py-2 text-left hover:bg-[#F7F9FC] text-[#1E293B] font-medium text-sm border-b border-[#E2E8F0]"
                  role="menuitem"
                >
                  Cut
                </button>
                <button
                  className="w-full px-4 py-2 text-left hover:bg-[#F7F9FC] text-[#1E293B] font-medium text-sm border-b border-[#E2E8F0]"
                  role="menuitem"
                >
                  Copy
                </button>
                <button
                  className="w-full px-4 py-2 text-left hover:bg-[#F7F9FC] text-[#1E293B] font-medium text-sm border-b border-[#E2E8F0]"
                  role="menuitem"
                >
                  Reschedule
                </button>
                <button
                  onClick={() =>
                    handleDeleteAppointment(
                      contextMenu.appointment!,
                    )
                  }
                  className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 font-medium text-sm border-b border-[#E2E8F0]"
                  role="menuitem"
                >
                  Delete
                </button>

                {/* Go To Submenu */}
                <div className="relative group">
                  <button
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900 flex items-center justify-between"
                    role="menuitem"
                    aria-haspopup="true"
                  >
                    Go To
                    <span>›</span>
                  </button>
                  <div
                    className="hidden group-hover:block absolute left-full top-0 bg-white border border-gray-300 rounded shadow-lg py-1 ml-1"
                    style={{ minWidth: "180px" }}
                    role="menu"
                  >
                    <button
                      onClick={() =>
                        handleGoToPatient(
                          "overview",
                          contextMenu.appointment!,
                        )
                      }
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                      role="menuitem"
                    >
                      Patient Overview
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                      role="menuitem"
                    >
                      Treatment Plans
                    </button>
                    <button
                      onClick={() =>
                        handleGoToPatient(
                          "transactions",
                          contextMenu.appointment!,
                        )
                      }
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                      role="menuitem"
                    >
                      Transactions
                    </button>
                    <button
                      onClick={() =>
                        handleGoToPatient(
                          "ledger",
                          contextMenu.appointment!,
                        )
                      }
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                      role="menuitem"
                    >
                      Ledger
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                      role="menuitem"
                    >
                      Progress Notes
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                      role="menuitem"
                    >
                      Notes
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                      role="menuitem"
                    >
                      Email
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                      role="menuitem"
                    >
                      Text Message
                    </button>
                    <button
                      onClick={() =>
                        handleGoToPatient(
                          "charting",
                          contextMenu.appointment!,
                        )
                      }
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                      role="menuitem"
                    >
                      Restorative Chart
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                      role="menuitem"
                    >
                      Perio Chart
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                      role="menuitem"
                    >
                      Imaging System
                    </button>
                  </div>
                </div>

                {/* Set Status Submenu */}
                <div className="relative group">
                  <button
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900 flex items-center justify-between"
                    role="menuitem"
                    aria-haspopup="true"
                  >
                    Set Status
                    <span>›</span>
                  </button>
                  <div
                    className="hidden group-hover:block absolute left-full top-0 bg-white border border-gray-300 rounded shadow-lg py-1 ml-1"
                    style={{ minWidth: "180px" }}
                    role="menu"
                  >
                    {[
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
                    ].map((status) => (
                      <button
                        key={status}
                        onClick={() =>
                          handleSetStatus(
                            contextMenu.appointment!,
                            status as Appointment["status"],
                          )
                        }
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                        role="menuitem"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Print Submenu */}
                <div className="relative group">
                  <button
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900 flex items-center justify-between"
                    role="menuitem"
                    aria-haspopup="true"
                  >
                    Print
                    <span>›</span>
                  </button>
                  <div
                    className="hidden group-hover:block absolute left-full top-0 bg-white border border-gray-300 rounded shadow-lg py-1 ml-1"
                    style={{ minWidth: "180px" }}
                    role="menu"
                  >
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                      role="menuitem"
                    >
                      Routing Slip
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                      role="menuitem"
                    >
                      Walkout Report
                    </button>
                  </div>
                </div>
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
      </div>
    </div>
  );
}