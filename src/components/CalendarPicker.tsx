import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarPickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS_OF_WEEK = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

export default function CalendarPicker({
  selectedDate,
  onDateChange,
  onClose,
  position,
}: CalendarPickerProps) {
  const [viewDate, setViewDate] = useState<Date>(
    new Date(selectedDate),
  );
  const [viewMode, setViewMode] = useState<
    "week" | "2weeks" | "6months"
  >("week");

  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();

  /* ------------------------------------------------------------------ */
  /* 🔑 SINGLE SOURCE OF TRUTH                                           */
  /* ------------------------------------------------------------------ */
  const applyDateChange = (newDate: Date, shouldClose = false) => {
    setViewDate(newDate);
    onDateChange(newDate); // 🔥 updates scheduler
    if (shouldClose) onClose(); // Only close if explicitly requested
  };

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */
  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();

  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(
      currentYear,
      currentMonth,
    );
    const firstDay = getFirstDayOfMonth(
      currentYear,
      currentMonth,
    );
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return days;
  };

  const calendarDays = generateCalendarDays();

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const isSelected = (day: number | null) => {
    if (!day) return false;
    return (
      day === selectedDate.getDate() &&
      currentMonth === selectedDate.getMonth() &&
      currentYear === selectedDate.getFullYear()
    );
  };

  /* ------------------------------------------------------------------ */
  /* Day Click                                                          */
  /* ------------------------------------------------------------------ */
  const handleDayClick = (day: number | null) => {
    if (!day) return;
    const newDate = new Date(currentYear, currentMonth, day);
    applyDateChange(newDate, true);
  };

  /* ------------------------------------------------------------------ */
  /* Period Navigation (Day / 5 Days / 5 Months)                        */
  /* ------------------------------------------------------------------ */
  const handlePrevPeriod = () => {
    const newDate = new Date(viewDate);

    if (viewMode === "week")
      newDate.setDate(newDate.getDate() - 1); // prev day
    else if (viewMode === "2weeks")
      newDate.setDate(newDate.getDate() - 5); // 5 days back
    else if (viewMode === "6months")
      newDate.setMonth(newDate.getMonth() - 5); // 5 months back

    applyDateChange(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(viewDate);

    if (viewMode === "week")
      newDate.setDate(newDate.getDate() + 1); // next day
    else if (viewMode === "2weeks")
      newDate.setDate(newDate.getDate() + 5); // 5 days forward
    else if (viewMode === "6months")
      newDate.setMonth(newDate.getMonth() + 5); // 5 months forward

    applyDateChange(newDate);
  };

  /* ------------------------------------------------------------------ */
  /* Month / Year Navigation                                            */
  /* ------------------------------------------------------------------ */
  const handlePrevMonth = () => {
    applyDateChange(
      new Date(
        currentYear,
        currentMonth - 1,
        selectedDate.getDate(),
      ),
    );
  };

  const handleNextMonth = () => {
    applyDateChange(
      new Date(
        currentYear,
        currentMonth + 1,
        selectedDate.getDate(),
      ),
    );
  };

  const handleMonthChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    applyDateChange(
      new Date(
        currentYear,
        parseInt(e.target.value),
        selectedDate.getDate(),
      ),
    );
  };

  const handleYearChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    applyDateChange(
      new Date(
        parseInt(e.target.value),
        currentMonth,
        selectedDate.getDate(),
      ),
    );
  };

  const handleToday = () => {
    applyDateChange(new Date(), true);
  };

  /* ------------------------------------------------------------------ */
  /* Close on Outside Click                                             */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".calendar-picker")) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
  }, [onClose]);

  /* ------------------------------------------------------------------ */
  /* RENDER                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <div
      className="calendar-picker-container calendar-picker fixed bg-white rounded-lg shadow-2xl border-2 border-[#3A6EA5] p-4 z-[9999] w-[400px]"
      style={{ top: position.top, left: position.left }}
    >
      {/* View Mode */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b-2">
        <button onClick={handlePrevPeriod}>
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>

        <div className="flex gap-2">
          {["week", "2weeks", "6months"].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              className={`px-3 py-1 text-xs rounded ${
                viewMode === mode
                  ? "bg-[#3A6EA5] text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {mode === "week"
                ? "Day"
                : mode === "2weeks"
                  ? "5 Days"
                  : "5 Mos"}
            </button>
          ))}
        </div>

        <button onClick={handleNextPeriod}>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Month / Year */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrevMonth}>
          <ChevronLeft className="w-5 h-5 text-[#1F3A5F]" />
        </button>

        <div className="flex gap-2">
          <select
            value={currentMonth}
            onChange={handleMonthChange}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>
                {m.substring(0, 3)}
              </option>
            ))}
          </select>

          <select
            value={currentYear}
            onChange={handleYearChange}
          >
            {Array.from(
              { length: 100 },
              (_, i) => currentYear - 50 + i,
            ).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <button onClick={handleNextMonth}>
          <ChevronRight className="w-5 h-5 text-[#1F3A5F]" />
        </button>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-bold text-slate-600"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {calendarDays.map((day, idx) => (
          <button
            key={idx}
            onClick={() => handleDayClick(day)}
            disabled={!day}
            className={`aspect-square rounded-md text-sm
              ${!day ? "invisible" : ""}
              ${isSelected(day) ? "bg-[#3A6EA5] text-white font-bold" : ""}
              ${isToday(day) && !isSelected(day) ? "bg-blue-100 text-blue-700" : ""}
              ${day && !isSelected(day) ? "hover:bg-slate-100" : ""}
            `}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="flex justify-between border-t pt-3">
        <button
          onClick={handleToday}
          className="text-[#3A6EA5]"
        >
          Today
        </button>
        <button
          onClick={onClose}
          className="bg-[#3A6EA5] text-white px-4 py-1 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}