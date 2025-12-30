import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Printer,
} from "lucide-react";
import GlobalNav from "../GlobalNav";
import NewAppointmentModal from "../modals/NewAppointmentModal";
import DatePickerCalendar from "../modals/DatePickerCalendar";
import CalendarPicker from "../CalendarPicker";
import { components } from "../../styles/theme";

interface SchedulerProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string; // ISO format: YYYY-MM-DD
  startTime: string; // Start time in "HH:MM" format
  endTime: string; // End time in "HH:MM" format (calculated from startTime + duration)
  duration: number; // Duration in minutes
  procedureType: string;
  status:
    | "Scheduled"
    | "Confirmed"
    | "Unconfirmed"
    | "Left Message"
    | "In Reception"
    | "Available"
    | "In Operatory"
    | "Checked Out"
    | "Missed"
    | "Cancelled";
  operatory: string;
  provider: string;
  notes: string;
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

  // Helper function to format date as YYYY-MM-DD
  const formatDateYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper function to get date offset
  const getDateOffset = (daysOffset: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return formatDateYYYYMMDD(date);
  };

  // Generate dates for mock data
  const today = getDateOffset(0);
  const yesterday = getDateOffset(-1);
  const lastWeek = getDateOffset(-7);
  const nextWeek = getDateOffset(7);
  const twoYearsAgo = getDateOffset(-730);
  const oneYearAgo = getDateOffset(-365);
  const nextMonth = getDateOffset(30);

  // Mock appointments data - distributed across multiple dates
  const [appointments, setAppointments] = useState<
    Appointment[]
  >([
    // TODAY'S APPOINTMENTS
    {
      id: "today-1",
      patientId: "900097",
      patientName: "Miller, Nicolas",
      date: today,
      startTime: "09:00",
      endTime: "10:00",
      duration: 60,
      procedureType: "New Patient",
      status: "Confirmed",
      operatory: "OP1",
      provider: "Dr. Jinna",
      notes: "First visit",
    },
    {
      id: "today-2",
      patientId: "900098",
      patientName: "Smith, John",
      date: today,
      startTime: "10:30",
      endTime: "11:00",
      duration: 30,
      procedureType: "Cleaning",
      status: "Scheduled",
      operatory: "OP1",
      provider: "Dr. Jinna",
      notes: "Routine cleaning",
    },
    {
      id: "today-3",
      patientId: "900099",
      patientName: "Johnson, Sarah",
      date: today,
      startTime: "11:00",
      endTime: "12:30",
      duration: 90,
      procedureType: "Crown",
      status: "In Operatory",
      operatory: "OP2",
      provider: "Dr. Smith",
      notes: "Crown preparation",
    },
    {
      id: "today-4",
      patientId: "900100",
      patientName: "Davis, Michael",
      date: today,
      startTime: "14:00",
      endTime: "14:45",
      duration: 45,
      procedureType: "Restorative",
      status: "Confirmed",
      operatory: "OP2",
      provider: "Dr. Smith",
      notes: "Filling replacement",
    },
    {
      id: "today-5",
      patientId: "903298700",
      patientName: "Patel, Raj",
      date: today,
      startTime: "08:00",
      endTime: "09:30",
      duration: 90,
      procedureType: "Root Canal",
      status: "In Operatory",
      operatory: "OP4",
      provider: "Dr. Smith",
      notes: "Root canal therapy",
    },
    {
      id: "today-6",
      patientId: "903298701",
      patientName: "Wilson, Emma",
      date: today,
      startTime: "08:00",
      endTime: "08:45",
      duration: 45,
      procedureType: "Checkup",
      status: "Confirmed",
      operatory: "OP6",
      provider: "Dr. Shravan",
      notes: "Routine checkup",
    },
    {
      id: "today-7",
      patientId: "903298702",
      patientName: "Brown, Robert",
      date: today,
      startTime: "13:00",
      endTime: "13:45",
      duration: 45,
      procedureType: "Filling",
      status: "Confirmed",
      operatory: "OP5",
      provider: "Dr. Uday",
      notes: "Composite filling",
    },
    {
      id: "today-8",
      patientId: "903298703",
      patientName: "Garcia, Maria",
      date: today,
      startTime: "11:00",
      endTime: "11:45",
      duration: 45,
      procedureType: "Cleaning",
      status: "Scheduled",
      operatory: "OP6",
      provider: "Dr. Uday",
      notes: "Deep cleaning",
    },

    // YESTERDAY'S APPOINTMENTS
    {
      id: "yesterday-1",
      patientId: "900200",
      patientName: "Anderson, Lisa",
      date: yesterday,
      startTime: "09:00",
      endTime: "10:00",
      duration: 60,
      procedureType: "Crown Prep",
      status: "Checked Out",
      operatory: "OP1",
      provider: "Dr. Jinna",
      notes: "Crown preparation completed",
    },
    {
      id: "yesterday-2",
      patientId: "900201",
      patientName: "Martinez, Carlos",
      date: yesterday,
      startTime: "10:30",
      endTime: "11:15",
      duration: 45,
      procedureType: "Filling",
      status: "Checked Out",
      operatory: "OP2",
      provider: "Dr. Smith",
      notes: "Posterior filling",
    },
    {
      id: "yesterday-3",
      patientId: "900202",
      patientName: "Thompson, James",
      date: yesterday,
      startTime: "14:00",
      endTime: "14:30",
      duration: 30,
      procedureType: "Cleaning",
      status: "Checked Out",
      operatory: "OP3",
      provider: "Dr. Jones",
      notes: "Routine prophylaxis",
    },

    // LAST WEEK'S APPOINTMENTS
    {
      id: "lastweek-1",
      patientId: "900300",
      patientName: "Lee, Jennifer",
      date: lastWeek,
      startTime: "09:00",
      endTime: "10:30",
      duration: 90,
      procedureType: "Root Canal",
      status: "Checked Out",
      operatory: "OP2",
      provider: "Dr. Smith",
      notes: "Endodontic treatment",
    },
    {
      id: "lastweek-2",
      patientId: "900301",
      patientName: "Rodriguez, Diego",
      date: lastWeek,
      startTime: "11:00",
      endTime: "12:00",
      duration: 60,
      procedureType: "Extraction",
      status: "Checked Out",
      operatory: "OP4",
      provider: "Dr. Dinesh",
      notes: "Wisdom tooth extraction",
    },
    {
      id: "lastweek-3",
      patientId: "900302",
      patientName: "White, Amanda",
      date: lastWeek,
      startTime: "13:30",
      endTime: "14:15",
      duration: 45,
      procedureType: "Cleaning",
      status: "Checked Out",
      operatory: "OP1",
      provider: "Dr. Jinna",
      notes: "Periodontal maintenance",
    },

    // NEXT WEEK'S APPOINTMENTS
    {
      id: "nextweek-1",
      patientId: "900400",
      patientName: "Taylor, David",
      date: nextWeek,
      startTime: "09:00",
      endTime: "10:00",
      duration: 60,
      procedureType: "New Patient",
      status: "Confirmed",
      operatory: "OP1",
      provider: "Dr. Jinna",
      notes: "Comprehensive exam",
    },
    {
      id: "nextweek-2",
      patientId: "900401",
      patientName: "Harris, Rebecca",
      date: nextWeek,
      startTime: "10:30",
      endTime: "11:15",
      duration: 45,
      procedureType: "Filling",
      status: "Scheduled",
      operatory: "OP2",
      provider: "Dr. Smith",
      notes: "Anterior restoration",
    },
    {
      id: "nextweek-3",
      patientId: "900402",
      patientName: "Clark, William",
      date: nextWeek,
      startTime: "14:00",
      endTime: "15:30",
      duration: 90,
      procedureType: "Crown Seat",
      status: "Confirmed",
      operatory: "OP3",
      provider: "Dr. Jones",
      notes: "Crown cementation",
    },

    // ONE YEAR AGO
    {
      id: "1year-1",
      patientId: "900500",
      patientName: "Lewis, Patricia",
      date: oneYearAgo,
      startTime: "09:00",
      endTime: "10:00",
      duration: 60,
      procedureType: "Cleaning",
      status: "Checked Out",
      operatory: "OP1",
      provider: "Dr. Jinna",
      notes: "Annual cleaning",
    },
    {
      id: "1year-2",
      patientId: "900501",
      patientName: "Walker, Christopher",
      date: oneYearAgo,
      startTime: "11:00",
      endTime: "11:45",
      duration: 45,
      procedureType: "Exam",
      status: "Checked Out",
      operatory: "OP2",
      provider: "Dr. Smith",
      notes: "Periodic exam",
    },

    // TWO YEARS AGO
    {
      id: "2years-1",
      patientId: "900600",
      patientName: "Hall, Margaret",
      date: twoYearsAgo,
      startTime: "10:00",
      endTime: "11:00",
      duration: 60,
      procedureType: "Cleaning",
      status: "Checked Out",
      operatory: "OP1",
      provider: "Dr. Jinna",
      notes: "Routine prophylaxis",
    },
    {
      id: "2years-2",
      patientId: "900601",
      patientName: "Young, Daniel",
      date: twoYearsAgo,
      startTime: "13:00",
      endTime: "14:30",
      duration: 90,
      procedureType: "Bridge Prep",
      status: "Checked Out",
      operatory: "OP3",
      provider: "Dr. Jones",
      notes: "Fixed bridge preparation",
    },

    // NEXT MONTH
    {
      id: "nextmonth-1",
      patientId: "900700",
      patientName: "King, Jessica",
      date: nextMonth,
      startTime: "09:00",
      endTime: "10:00",
      duration: 60,
      procedureType: "Crown Delivery",
      status: "Scheduled",
      operatory: "OP2",
      provider: "Dr. Smith",
      notes: "Final crown placement",
    },
    {
      id: "nextmonth-2",
      patientId: "900701",
      patientName: "Wright, Steven",
      date: nextMonth,
      startTime: "14:00",
      endTime: "14:45",
      duration: 45,
      procedureType: "Checkup",
      status: "Scheduled",
      operatory: "OP1",
      provider: "Dr. Jinna",
      notes: "6-month recall",
    },
  ]);

  // Operatories configuration
  const operatories = [
    {
      id: "OP1",
      name: "OP 1 - Hygiene",
      provider: "Dr. Jinna",
      office: "Moon, PA",
    },
    {
      id: "OP2",
      name: "OP 2 - Major",
      provider: "Dr. Smith",
      office: "Moon, PA",
    },
    {
      id: "OP3",
      name: "OP 3 - Minor",
      provider: "Dr. Jones",
      office: "Moon, PA",
    },
    {
      id: "OP4",
      name: "OP 4 - Regular Checkup",
      provider: "Dr. Dinesh",
      office: "Moon, PA",
    },
    {
      id: "OP5",
      name: "OP 5 - Rescheduled",
      provider: "Dr. Uday",
      office: "Moon, PA",
    },
    {
      id: "OP6",
      name: "OP 6 - Surgery",
      provider: "Dr. Shravan",
      office: "Moon, PA",
    },
  ];

  // Generate time slots (8:00 AM to 5:00 PM in 10-minute increments)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 10) {
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // ===== TIME BLOCKING & OVERLAP LOGIC =====

  // Convert time string (HH:MM) to minutes since midnight
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
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

  // Check if a specific slot is blocked by any appointment
  const isSlotBlocked = (
    slotTime: string,
    operatoryId: string,
    date: string,
  ): boolean => {
    // Calculate slot end time (10 minutes after start)
    const slotEndTime = calculateEndTime(slotTime, 10);

    // Get all appointments for this operatory on this date
    const operatoryAppointments = appointments.filter(
      (appt) =>
        appt.operatory === operatoryId && appt.date === date,
    );

    // Check if any appointment overlaps with this slot
    return operatoryAppointments.some((appt) =>
      timeRangesOverlap(
        slotTime,
        slotEndTime,
        appt.startTime,
        appt.endTime,
      ),
    );
  };

  // Get the appointment that occupies a specific slot (if any)
  const getSlotOccupyingAppointment = (
    slotTime: string,
    operatoryId: string,
    date: string,
  ): Appointment | null => {
    const slotEndTime = calculateEndTime(slotTime, 10);

    const operatoryAppointments = appointments.filter(
      (appt) =>
        appt.operatory === operatoryId && appt.date === date,
    );

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

  // Status colors
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
    const [hours, minutes] = appointment.startTime
      .split(":")
      .map(Number);
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
    console.log("Scheduler date changed:", formatDateYYYYMMDD(selectedDate));
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

  // ✅ STEP 4: Extract handler for CalendarPicker (single source of truth)
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
  const handleSaveAppointment = (appointmentData: any) => {
    if (editingAppointment) {
      // Update existing appointment
      const updatedAppointment: Appointment = {
        ...editingAppointment,
        patientId:
          appointmentData.patientId ||
          editingAppointment.patientId,
        patientName: `${appointmentData.lastName}, ${appointmentData.firstName}`,
        date: appointmentData.date || editingAppointment.date,
        startTime:
          appointmentData.time || editingAppointment.startTime,
        endTime: calculateEndTime(
          appointmentData.time || editingAppointment.startTime,
          appointmentData.duration,
        ),
        duration: appointmentData.duration,
        procedureType: appointmentData.procedureType,
        status:
          appointmentData.status || editingAppointment.status,
        operatory:
          appointmentData.operatory ||
          editingAppointment.operatory,
        provider:
          appointmentData.provider ||
          editingAppointment.provider,
        notes: appointmentData.notes || "",
      };

      setAppointments(
        appointments.map((appt) =>
          appt.id === editingAppointment.id
            ? updatedAppointment
            : appt,
        ),
      );
      setEditingAppointment(null);
    } else {
      // Create new appointment
      const newAppointment: Appointment = {
        id: Date.now().toString(),
        patientId: appointmentData.patientId || "NEW",
        patientName: `${appointmentData.lastName}, ${appointmentData.firstName}`,
        date: selectedDate.toISOString().substring(0, 10),
        startTime: selectedSlot?.time || appointmentData.time,
        endTime: calculateEndTime(
          selectedSlot?.time || appointmentData.time,
          appointmentData.duration,
        ),
        duration: appointmentData.duration,
        procedureType: appointmentData.procedureType,
        status: "Scheduled",
        operatory:
          selectedSlot?.operatory || appointmentData.operatory,
        provider: appointmentData.provider || "Dr. Jinna",
        notes: appointmentData.notes || "",
      };
      setAppointments([...appointments, newAppointment]);
    }
  };

  // Calculate end time from start time and duration
  const calculateEndTime = (
    startTime: string,
    duration: number,
  ): string => {
    const [hours, minutes] = startTime.split(":").map(Number);
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
  const handleSetStatus = (
    appointment: Appointment,
    status: Appointment["status"],
  ) => {
    setAppointments(
      appointments.map((appt) =>
        appt.id === appointment.id ? { ...appt, status } : appt,
      ),
    );
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      type: "empty",
    });
  };

  // Delete appointment
  const handleDeleteAppointment = (
    appointment: Appointment,
  ) => {
    if (
      window.confirm(
        `Delete appointment for ${appointment.patientName}?`,
      )
    ) {
      setAppointments(
        appointments.filter(
          (appt) => appt.id !== appointment.id,
        ),
      );
    }
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      type: "empty",
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <GlobalNav
        onLogout={onLogout}
        currentOffice={currentOffice}
        setCurrentOffice={setCurrentOffice}
      />

      {/* Scheduler Header */}
      <div className="bg-white shadow-md border-b border-[#E2E8F0] sticky top-0 z-10">
        {/* Slate Blue Header Bar */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
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

          {/* Center: Date Navigation */}
          <div className="flex items-center gap-2">
            {/* Date Picker Button */}
            <button
              ref={calendarBtnRef}
              onClick={() =>
                setShowCalendarPicker(!showCalendarPicker)
              }
              className="px-3 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors flex items-center gap-2 text-white text-sm font-medium"
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
              className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium flex items-center gap-1"
            >
              <ChevronLeft
                className="w-3.5 h-3.5"
                strokeWidth={2}
              />
              Prev Day
            </button>
            <button
              onClick={() => changeDate(1)}
              className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium flex items-center gap-1"
            >
              Next Day
              <ChevronRight
                className="w-3.5 h-3.5"
                strokeWidth={2}
              />
            </button>

            {/* Week Navigation */}
            <button
              onClick={() => changeDate(-7)}
              className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium"
            >
              <ChevronLeft
                className="w-3.5 h-3.5"
                strokeWidth={2}
              />
              Prev Week
            </button>
            <button
              onClick={() => changeDate(7)}
              className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium"
            >
              Nxt Week
              <ChevronRight
                className="w-3.5 h-3.5"
                strokeWidth={2}
              />
            </button>

            {/* Month Navigation */}
            <button
              onClick={() => changeDate(-30)}
              className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium"
            >
              -1 Month
            </button>
            <button
              onClick={() => changeDate(30)}
              className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium"
            >
              +1 Month
            </button>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAddNewAppointment()}
              className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              NEW APPOINTMENT
            </button>
            <button className="px-3 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm">
              <Search className="w-4 h-4" strokeWidth={2.5} />
              QUICK FILL
            </button>
            <button className="px-3 py-1.5 bg-[#64748B] hover:bg-[#475569] text-white rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm">
              <Printer className="w-4 h-4" strokeWidth={2.5} />
              PRINT
            </button>
          </div>
        </div>
      </div>

      {/* Scheduler Grid */}
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
              ))}
            </div>

            {/* Operatory Columns */}
            {operatories.map((operatory) => (
              <div
                key={operatory.id}
                className="border-r-2 border-[#E2E8F0]"
                style={{ minWidth: "250px" }}
              >
                {/* Column Header - Sticky */}
                <div className="h-12 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white px-4 py-2 border-b-2 border-[#16293B] sticky top-0 z-20">
                  <div className="text-sm font-bold">
                    {operatory.name}
                  </div>
                  <div className="text-xs opacity-90">
                    {operatory.provider}
                  </div>
                </div>

                {/* Time Slots */}
                <div className="relative bg-white">
                  {timeSlots.map((time) => {
                    const currentDate =
                      formatDateYYYYMMDD(selectedDate);
                    const slotBlocked = isSlotBlocked(
                      time,
                      operatory.id,
                      currentDate,
                    );
                    const occupyingAppt =
                      getSlotOccupyingAppointment(
                        time,
                        operatory.id,
                        currentDate,
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
                      ></div>
                    );
                  })}

                  {/* Appointments */}
                  {appointments
                    .filter(
                      (appt) =>
                        appt.operatory === operatory.id &&
                        appt.date ===
                          formatDateYYYYMMDD(selectedDate),
                    )
                    .map((appointment) => {
                      const { top, height } =
                        getAppointmentPosition(appointment);
                      return (
                        <div
                          key={appointment.id}
                          className={`absolute left-1 right-1 border-2 rounded px-2 py-1 cursor-pointer overflow-hidden ${getStatusColor(appointment.status)}`}
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
              >
                Add New Appointment
              </button>
              <button className="w-full px-4 py-2 text-left hover:bg-[#F7F9FC] text-[#1E293B] font-medium text-sm border-b border-[#E2E8F0]">
                Search Quick-Fill
              </button>
              <button className="w-full px-4 py-2 text-left hover:bg-[#F7F9FC] text-[#1E293B] font-medium text-sm">
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
              >
                Edit
              </button>
              <button className="w-full px-4 py-2 text-left hover:bg-[#F7F9FC] text-[#1E293B] font-medium text-sm border-b border-[#E2E8F0]">
                Cut
              </button>
              <button className="w-full px-4 py-2 text-left hover:bg-[#F7F9FC] text-[#1E293B] font-medium text-sm border-b border-[#E2E8F0]">
                Copy
              </button>
              <button className="w-full px-4 py-2 text-left hover:bg-[#F7F9FC] text-[#1E293B] font-medium text-sm border-b border-[#E2E8F0]">
                Reschedule
              </button>
              <button
                onClick={() =>
                  handleDeleteAppointment(
                    contextMenu.appointment!,
                  )
                }
                className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 font-medium text-sm border-b border-[#E2E8F0]"
              >
                Delete
              </button>

              {/* Go To Submenu */}
              <div className="relative group">
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900 flex items-center justify-between">
                  Go To
                  <span>›</span>
                </button>
                <div
                  className="hidden group-hover:block absolute left-full top-0 bg-white border border-gray-300 rounded shadow-lg py-1 ml-1"
                  style={{ minWidth: "180px" }}
                >
                  <button
                    onClick={() =>
                      handleGoToPatient(
                        "overview",
                        contextMenu.appointment!,
                      )
                    }
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                  >
                    Patient Overview
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
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
                  >
                    Ledger
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                    Progress Notes
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                    Notes
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                    Email
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
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
                  >
                    Restorative Chart
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                    Perio Chart
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                    Imaging System
                  </button>
                </div>
              </div>

              {/* Set Status Submenu */}
              <div className="relative group">
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900 flex items-center justify-between">
                  Set Status
                  <span>›</span>
                </button>
                <div
                  className="hidden group-hover:block absolute left-full top-0 bg-white border border-gray-300 rounded shadow-lg py-1 ml-1"
                  style={{ minWidth: "180px" }}
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
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Print Submenu */}
              <div className="relative group">
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900 flex items-center justify-between">
                  Print
                  <span>›</span>
                </button>
                <div
                  className="hidden group-hover:block absolute left-full top-0 bg-white border border-gray-300 rounded shadow-lg py-1 ml-1"
                  style={{ minWidth: "180px" }}
                >
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                    Routing Slip
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
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
      {showCalendarPicker && calendarBtnRef.current && createPortal(
        <CalendarPicker
          selectedDate={selectedDate}
          onDateChange={handleSchedulerDateChange}
          onClose={() => setShowCalendarPicker(false)}
          position={{
            top: calendarBtnRef.current.getBoundingClientRect().bottom + window.scrollY + 6,
            left: calendarBtnRef.current.getBoundingClientRect().left + window.scrollX,
          }}
        />,
        document.body
      )}
    </div>
  );
}import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Printer,
} from "lucide-react";
import GlobalNav from "../GlobalNav";
import NewAppointmentModal from "../modals/NewAppointmentModal";
import DatePickerCalendar from "../modals/DatePickerCalendar";
import CalendarPicker from "../CalendarPicker";
import { components } from "../../styles/theme";

interface SchedulerProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string; // ISO format: YYYY-MM-DD
  startTime: string; // Start time in "HH:MM" format
  endTime: string; // End time in "HH:MM" format (calculated from startTime + duration)
  duration: number; // Duration in minutes
  procedureType: string;
  status:
    | "Scheduled"
    | "Confirmed"
    | "Unconfirmed"
    | "Left Message"
    | "In Reception"
    | "Available"
    | "In Operatory"
    | "Checked Out"
    | "Missed"
    | "Cancelled";
  operatory: string;
  provider: string;
  notes: string;
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

  // Helper function to format date as YYYY-MM-DD
  const formatDateYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper function to get date offset
  const getDateOffset = (daysOffset: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return formatDateYYYYMMDD(date);
  };

  // Generate dates for mock data
  const today = getDateOffset(0);
  const yesterday = getDateOffset(-1);
  const lastWeek = getDateOffset(-7);
  const nextWeek = getDateOffset(7);
  const twoYearsAgo = getDateOffset(-730);
  const oneYearAgo = getDateOffset(-365);
  const nextMonth = getDateOffset(30);

  // Mock appointments data - distributed across multiple dates
  const [appointments, setAppointments] = useState<
    Appointment[]
  >([
    // TODAY'S APPOINTMENTS
    {
      id: "today-1",
      patientId: "900097",
      patientName: "Miller, Nicolas",
      date: today,
      startTime: "09:00",
      endTime: "10:00",
      duration: 60,
      procedureType: "New Patient",
      status: "Confirmed",
      operatory: "OP1",
      provider: "Dr. Jinna",
      notes: "First visit",
    },
    {
      id: "today-2",
      patientId: "900098",
      patientName: "Smith, John",
      date: today,
      startTime: "10:30",
      endTime: "11:00",
      duration: 30,
      procedureType: "Cleaning",
      status: "Scheduled",
      operatory: "OP1",
      provider: "Dr. Jinna",
      notes: "Routine cleaning",
    },
    {
      id: "today-3",
      patientId: "900099",
      patientName: "Johnson, Sarah",
      date: today,
      startTime: "11:00",
      endTime: "12:30",
      duration: 90,
      procedureType: "Crown",
      status: "In Operatory",
      operatory: "OP2",
      provider: "Dr. Smith",
      notes: "Crown preparation",
    },
    {
      id: "today-4",
      patientId: "900100",
      patientName: "Davis, Michael",
      date: today,
      startTime: "14:00",
      endTime: "14:45",
      duration: 45,
      procedureType: "Restorative",
      status: "Confirmed",
      operatory: "OP2",
      provider: "Dr. Smith",
      notes: "Filling replacement",
    },
    {
      id: "today-5",
      patientId: "903298700",
      patientName: "Patel, Raj",
      date: today,
      startTime: "08:00",
      endTime: "09:30",
      duration: 90,
      procedureType: "Root Canal",
      status: "In Operatory",
      operatory: "OP4",
      provider: "Dr. Smith",
      notes: "Root canal therapy",
    },
    {
      id: "today-6",
      patientId: "903298701",
      patientName: "Wilson, Emma",
      date: today,
      startTime: "08:00",
      endTime: "08:45",
      duration: 45,
      procedureType: "Checkup",
      status: "Confirmed",
      operatory: "OP6",
      provider: "Dr. Shravan",
      notes: "Routine checkup",
    },
    {
      id: "today-7",
      patientId: "903298702",
      patientName: "Brown, Robert",
      date: today,
      startTime: "13:00",
      endTime: "13:45",
      duration: 45,
      procedureType: "Filling",
      status: "Confirmed",
      operatory: "OP5",
      provider: "Dr. Uday",
      notes: "Composite filling",
    },
    {
      id: "today-8",
      patientId: "903298703",
      patientName: "Garcia, Maria",
      date: today,
      startTime: "11:00",
      endTime: "11:45",
      duration: 45,
      procedureType: "Cleaning",
      status: "Scheduled",
      operatory: "OP6",
      provider: "Dr. Uday",
      notes: "Deep cleaning",
    },

    // YESTERDAY'S APPOINTMENTS
    {
      id: "yesterday-1",
      patientId: "900200",
      patientName: "Anderson, Lisa",
      date: yesterday,
      startTime: "09:00",
      endTime: "10:00",
      duration: 60,
      procedureType: "Crown Prep",
      status: "Checked Out",
      operatory: "OP1",
      provider: "Dr. Jinna",
      notes: "Crown preparation completed",
    },
    {
      id: "yesterday-2",
      patientId: "900201",
      patientName: "Martinez, Carlos",
      date: yesterday,
      startTime: "10:30",
      endTime: "11:15",
      duration: 45,
      procedureType: "Filling",
      status: "Checked Out",
      operatory: "OP2",
      provider: "Dr. Smith",
      notes: "Posterior filling",
    },
    {
      id: "yesterday-3",
      patientId: "900202",
      patientName: "Thompson, James",
      date: yesterday,
      startTime: "14:00",
      endTime: "14:30",
      duration: 30,
      procedureType: "Cleaning",
      status: "Checked Out",
      operatory: "OP3",
      provider: "Dr. Jones",
      notes: "Routine prophylaxis",
    },

    // LAST WEEK'S APPOINTMENTS
    {
      id: "lastweek-1",
      patientId: "900300",
      patientName: "Lee, Jennifer",
      date: lastWeek,
      startTime: "09:00",
      endTime: "10:30",
      duration: 90,
      procedureType: "Root Canal",
      status: "Checked Out",
      operatory: "OP2",
      provider: "Dr. Smith",
      notes: "Endodontic treatment",
    },
    {
      id: "lastweek-2",
      patientId: "900301",
      patientName: "Rodriguez, Diego",
      date: lastWeek,
      startTime: "11:00",
      endTime: "12:00",
      duration: 60,
      procedureType: "Extraction",
      status: "Checked Out",
      operatory: "OP4",
      provider: "Dr. Dinesh",
      notes: "Wisdom tooth extraction",
    },
    {
      id: "lastweek-3",
      patientId: "900302",
      patientName: "White, Amanda",
      date: lastWeek,
      startTime: "13:30",
      endTime: "14:15",
      duration: 45,
      procedureType: "Cleaning",
      status: "Checked Out",
      operatory: "OP1",
      provider: "Dr. Jinna",
      notes: "Periodontal maintenance",
    },

    // NEXT WEEK'S APPOINTMENTS
    {
      id: "nextweek-1",
      patientId: "900400",
      patientName: "Taylor, David",
      date: nextWeek,
      startTime: "09:00",
      endTime: "10:00",
      duration: 60,
      procedureType: "New Patient",
      status: "Confirmed",
      operatory: "OP1",
      provider: "Dr. Jinna",
      notes: "Comprehensive exam",
    },
    {
      id: "nextweek-2",
      patientId: "900401",
      patientName: "Harris, Rebecca",
      date: nextWeek,
      startTime: "10:30",
      endTime: "11:15",
      duration: 45,
      procedureType: "Filling",
      status: "Scheduled",
      operatory: "OP2",
      provider: "Dr. Smith",
      notes: "Anterior restoration",
    },
    {
      id: "nextweek-3",
      patientId: "900402",
      patientName: "Clark, William",
      date: nextWeek,
      startTime: "14:00",
      endTime: "15:30",
      duration: 90,
      procedureType: "Crown Seat",
      status: "Confirmed",
      operatory: "OP3",
      provider: "Dr. Jones",
      notes: "Crown cementation",
    },

    // ONE YEAR AGO
    {
      id: "1year-1",
      patientId: "900500",
      patientName: "Lewis, Patricia",
      date: oneYearAgo,
      startTime: "09:00",
      endTime: "10:00",
      duration: 60,
      procedureType: "Cleaning",
      status: "Checked Out",
      operatory: "OP1",
      provider: "Dr. Jinna",
      notes: "Annual cleaning",
    },
    {
      id: "1year-2",
      patientId: "900501",
      patientName: "Walker, Christopher",
      date: oneYearAgo,
      startTime: "11:00",
      endTime: "11:45",
      duration: 45,
      procedureType: "Exam",
      status: "Checked Out",
      operatory: "OP2",
      provider: "Dr. Smith",
      notes: "Periodic exam",
    },

    // TWO YEARS AGO
    {
      id: "2years-1",
      patientId: "900600",
      patientName: "Hall, Margaret",
      date: twoYearsAgo,
      startTime: "10:00",
      endTime: "11:00",
      duration: 60,
      procedureType: "Cleaning",
      status: "Checked Out",
      operatory: "OP1",
      provider: "Dr. Jinna",
      notes: "Routine prophylaxis",
    },
    {
      id: "2years-2",
      patientId: "900601",
      patientName: "Young, Daniel",
      date: twoYearsAgo,
      startTime: "13:00",
      endTime: "14:30",
      duration: 90,
      procedureType: "Bridge Prep",
      status: "Checked Out",
      operatory: "OP3",
      provider: "Dr. Jones",
      notes: "Fixed bridge preparation",
    },

    // NEXT MONTH
    {
      id: "nextmonth-1",
      patientId: "900700",
      patientName: "King, Jessica",
      date: nextMonth,
      startTime: "09:00",
      endTime: "10:00",
      duration: 60,
      procedureType: "Crown Delivery",
      status: "Scheduled",
      operatory: "OP2",
      provider: "Dr. Smith",
      notes: "Final crown placement",
    },
    {
      id: "nextmonth-2",
      patientId: "900701",
      patientName: "Wright, Steven",
      date: nextMonth,
      startTime: "14:00",
      endTime: "14:45",
      duration: 45,
      procedureType: "Checkup",
      status: "Scheduled",
      operatory: "OP1",
      provider: "Dr. Jinna",
      notes: "6-month recall",
    },
  ]);

  // Operatories configuration
  const operatories = [
    {
      id: "OP1",
      name: "OP 1 - Hygiene",
      provider: "Dr. Jinna",
      office: "Moon, PA",
    },
    {
      id: "OP2",
      name: "OP 2 - Major",
      provider: "Dr. Smith",
      office: "Moon, PA",
    },
    {
      id: "OP3",
      name: "OP 3 - Minor",
      provider: "Dr. Jones",
      office: "Moon, PA",
    },
    {
      id: "OP4",
      name: "OP 4 - Regular Checkup",
      provider: "Dr. Dinesh",
      office: "Moon, PA",
    },
    {
      id: "OP5",
      name: "OP 5 - Rescheduled",
      provider: "Dr. Uday",
      office: "Moon, PA",
    },
    {
      id: "OP6",
      name: "OP 6 - Surgery",
      provider: "Dr. Shravan",
      office: "Moon, PA",
    },
  ];

  // Generate time slots (8:00 AM to 5:00 PM in 10-minute increments)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 10) {
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // ===== TIME BLOCKING & OVERLAP LOGIC =====

  // Convert time string (HH:MM) to minutes since midnight
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
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

  // Check if a specific slot is blocked by any appointment
  const isSlotBlocked = (
    slotTime: string,
    operatoryId: string,
    date: string,
  ): boolean => {
    // Calculate slot end time (10 minutes after start)
    const slotEndTime = calculateEndTime(slotTime, 10);

    // Get all appointments for this operatory on this date
    const operatoryAppointments = appointments.filter(
      (appt) =>
        appt.operatory === operatoryId && appt.date === date,
    );

    // Check if any appointment overlaps with this slot
    return operatoryAppointments.some((appt) =>
      timeRangesOverlap(
        slotTime,
        slotEndTime,
        appt.startTime,
        appt.endTime,
      ),
    );
  };

  // Get the appointment that occupies a specific slot (if any)
  const getSlotOccupyingAppointment = (
    slotTime: string,
    operatoryId: string,
    date: string,
  ): Appointment | null => {
    const slotEndTime = calculateEndTime(slotTime, 10);

    const operatoryAppointments = appointments.filter(
      (appt) =>
        appt.operatory === operatoryId && appt.date === date,
    );

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

  // Status colors
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
    const [hours, minutes] = appointment.startTime
      .split(":")
      .map(Number);
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
    console.log("Scheduler date changed:", formatDateYYYYMMDD(selectedDate));
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

  // ✅ STEP 4: Extract handler for CalendarPicker (single source of truth)
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
  const handleSaveAppointment = (appointmentData: any) => {
    if (editingAppointment) {
      // Update existing appointment
      const updatedAppointment: Appointment = {
        ...editingAppointment,
        patientId:
          appointmentData.patientId ||
          editingAppointment.patientId,
        patientName: `${appointmentData.lastName}, ${appointmentData.firstName}`,
        date: appointmentData.date || editingAppointment.date,
        startTime:
          appointmentData.time || editingAppointment.startTime,
        endTime: calculateEndTime(
          appointmentData.time || editingAppointment.startTime,
          appointmentData.duration,
        ),
        duration: appointmentData.duration,
        procedureType: appointmentData.procedureType,
        status:
          appointmentData.status || editingAppointment.status,
        operatory:
          appointmentData.operatory ||
          editingAppointment.operatory,
        provider:
          appointmentData.provider ||
          editingAppointment.provider,
        notes: appointmentData.notes || "",
      };

      setAppointments(
        appointments.map((appt) =>
          appt.id === editingAppointment.id
            ? updatedAppointment
            : appt,
        ),
      );
      setEditingAppointment(null);
    } else {
      // Create new appointment
      const newAppointment: Appointment = {
        id: Date.now().toString(),
        patientId: appointmentData.patientId || "NEW",
        patientName: `${appointmentData.lastName}, ${appointmentData.firstName}`,
        date: selectedDate.toISOString().substring(0, 10),
        startTime: selectedSlot?.time || appointmentData.time,
        endTime: calculateEndTime(
          selectedSlot?.time || appointmentData.time,
          appointmentData.duration,
        ),
        duration: appointmentData.duration,
        procedureType: appointmentData.procedureType,
        status: "Scheduled",
        operatory:
          selectedSlot?.operatory || appointmentData.operatory,
        provider: appointmentData.provider || "Dr. Jinna",
        notes: appointmentData.notes || "",
      };
      setAppointments([...appointments, newAppointment]);
    }
  };

  // Calculate end time from start time and duration
  const calculateEndTime = (
    startTime: string,
    duration: number,
  ): string => {
    const [hours, minutes] = startTime.split(":").map(Number);
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
  const handleSetStatus = (
    appointment: Appointment,
    status: Appointment["status"],
  ) => {
    setAppointments(
      appointments.map((appt) =>
        appt.id === appointment.id ? { ...appt, status } : appt,
      ),
    );
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      type: "empty",
    });
  };

  // Delete appointment
  const handleDeleteAppointment = (
    appointment: Appointment,
  ) => {
    if (
      window.confirm(
        `Delete appointment for ${appointment.patientName}?`,
      )
    ) {
      setAppointments(
        appointments.filter(
          (appt) => appt.id !== appointment.id,
        ),
      );
    }
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      type: "empty",
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <GlobalNav
        onLogout={onLogout}
        currentOffice={currentOffice}
        setCurrentOffice={setCurrentOffice}
      />

      {/* Scheduler Header */}
      <div className="bg-white shadow-md border-b border-[#E2E8F0] sticky top-0 z-10">
        {/* Slate Blue Header Bar */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
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

          {/* Center: Date Navigation */}
          <div className="flex items-center gap-2">
            {/* Date Picker Button */}
            <button
              ref={calendarBtnRef}
              onClick={() =>
                setShowCalendarPicker(!showCalendarPicker)
              }
              className="px-3 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors flex items-center gap-2 text-white text-sm font-medium"
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
              className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium flex items-center gap-1"
            >
              <ChevronLeft
                className="w-3.5 h-3.5"
                strokeWidth={2}
              />
              Prev Day
            </button>
            <button
              onClick={() => changeDate(1)}
              className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium flex items-center gap-1"
            >
              Next Day
              <ChevronRight
                className="w-3.5 h-3.5"
                strokeWidth={2}
              />
            </button>

            {/* Week Navigation */}
            <button
              onClick={() => changeDate(-7)}
              className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium"
            >
              <ChevronLeft
                className="w-3.5 h-3.5"
                strokeWidth={2}
              />
              Prev Week
            </button>
            <button
              onClick={() => changeDate(7)}
              className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium"
            >
              Nxt Week
              <ChevronRight
                className="w-3.5 h-3.5"
                strokeWidth={2}
              />
            </button>

            {/* Month Navigation */}
            <button
              onClick={() => changeDate(-30)}
              className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium"
            >
              -1 Month
            </button>
            <button
              onClick={() => changeDate(30)}
              className="px-2.5 py-1.5 bg-white/10 border border-white/30 rounded-md hover:bg-white/20 transition-colors text-white text-xs font-medium"
            >
              +1 Month
            </button>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAddNewAppointment()}
              className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              NEW APPOINTMENT
            </button>
            <button className="px-3 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm">
              <Search className="w-4 h-4" strokeWidth={2.5} />
              QUICK FILL
            </button>
            <button className="px-3 py-1.5 bg-[#64748B] hover:bg-[#475569] text-white rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm">
              <Printer className="w-4 h-4" strokeWidth={2.5} />
              PRINT
            </button>
          </div>
        </div>
      </div>

      {/* Scheduler Grid */}
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
              ))}
            </div>

            {/* Operatory Columns */}
            {operatories.map((operatory) => (
              <div
                key={operatory.id}
                className="border-r-2 border-[#E2E8F0]"
                style={{ minWidth: "250px" }}
              >
                {/* Column Header - Sticky */}
                <div className="h-12 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white px-4 py-2 border-b-2 border-[#16293B] sticky top-0 z-20">
                  <div className="text-sm font-bold">
                    {operatory.name}
                  </div>
                  <div className="text-xs opacity-90">
                    {operatory.provider}
                  </div>
                </div>

                {/* Time Slots */}
                <div className="relative bg-white">
                  {timeSlots.map((time) => {
                    const currentDate =
                      formatDateYYYYMMDD(selectedDate);
                    const slotBlocked = isSlotBlocked(
                      time,
                      operatory.id,
                      currentDate,
                    );
                    const occupyingAppt =
                      getSlotOccupyingAppointment(
                        time,
                        operatory.id,
                        currentDate,
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
                      ></div>
                    );
                  })}

                  {/* Appointments */}
                  {appointments
                    .filter(
                      (appt) =>
                        appt.operatory === operatory.id &&
                        appt.date ===
                          formatDateYYYYMMDD(selectedDate),
                    )
                    .map((appointment) => {
                      const { top, height } =
                        getAppointmentPosition(appointment);
                      return (
                        <div
                          key={appointment.id}
                          className={`absolute left-1 right-1 border-2 rounded px-2 py-1 cursor-pointer overflow-hidden ${getStatusColor(appointment.status)}`}
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
              >
                Add New Appointment
              </button>
              <button className="w-full px-4 py-2 text-left hover:bg-[#F7F9FC] text-[#1E293B] font-medium text-sm border-b border-[#E2E8F0]">
                Search Quick-Fill
              </button>
              <button className="w-full px-4 py-2 text-left hover:bg-[#F7F9FC] text-[#1E293B] font-medium text-sm">
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
              >
                Edit
              </button>
              <button className="w-full px-4 py-2 text-left hover:bg-[#F7F9FC] text-[#1E293B] font-medium text-sm border-b border-[#E2E8F0]">
                Cut
              </button>
              <button className="w-full px-4 py-2 text-left hover:bg-[#F7F9FC] text-[#1E293B] font-medium text-sm border-b border-[#E2E8F0]">
                Copy
              </button>
              <button className="w-full px-4 py-2 text-left hover:bg-[#F7F9FC] text-[#1E293B] font-medium text-sm border-b border-[#E2E8F0]">
                Reschedule
              </button>
              <button
                onClick={() =>
                  handleDeleteAppointment(
                    contextMenu.appointment!,
                  )
                }
                className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 font-medium text-sm border-b border-[#E2E8F0]"
              >
                Delete
              </button>

              {/* Go To Submenu */}
              <div className="relative group">
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900 flex items-center justify-between">
                  Go To
                  <span>›</span>
                </button>
                <div
                  className="hidden group-hover:block absolute left-full top-0 bg-white border border-gray-300 rounded shadow-lg py-1 ml-1"
                  style={{ minWidth: "180px" }}
                >
                  <button
                    onClick={() =>
                      handleGoToPatient(
                        "overview",
                        contextMenu.appointment!,
                      )
                    }
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                  >
                    Patient Overview
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
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
                  >
                    Ledger
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                    Progress Notes
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                    Notes
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                    Email
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
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
                  >
                    Restorative Chart
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                    Perio Chart
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                    Imaging System
                  </button>
                </div>
              </div>

              {/* Set Status Submenu */}
              <div className="relative group">
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900 flex items-center justify-between">
                  Set Status
                  <span>›</span>
                </button>
                <div
                  className="hidden group-hover:block absolute left-full top-0 bg-white border border-gray-300 rounded shadow-lg py-1 ml-1"
                  style={{ minWidth: "180px" }}
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
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Print Submenu */}
              <div className="relative group">
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900 flex items-center justify-between">
                  Print
                  <span>›</span>
                </button>
                <div
                  className="hidden group-hover:block absolute left-full top-0 bg-white border border-gray-300 rounded shadow-lg py-1 ml-1"
                  style={{ minWidth: "180px" }}
                >
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                    Routing Slip
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
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
      {showCalendarPicker && calendarBtnRef.current && createPortal(
        <CalendarPicker
          selectedDate={selectedDate}
          onDateChange={handleSchedulerDateChange}
          onClose={() => setShowCalendarPicker(false)}
          position={{
            top: calendarBtnRef.current.getBoundingClientRect().bottom + window.scrollY + 6,
            left: calendarBtnRef.current.getBoundingClientRect().left + window.scrollX,
          }}
        />,
        document.body
      )}
    </div>
  );
}