import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerCalendarProps {
  selectedDate: string; // Format: MM/DD/YYYY
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

/* ------------------ Helpers ------------------ */
const parseMMDDYYYY = (dateStr: string) => {
  const [mm, dd, yyyy] = dateStr.split('/').map(Number);
  return new Date(yyyy, mm - 1, dd);
};

export default function DatePickerCalendar({
  selectedDate,
  onSelectDate,
  onClose
}: DatePickerCalendarProps) {

  /* ------------------ State ------------------ */
  const [currentDate, setCurrentDate] = useState(
    selectedDate ? parseMMDDYYYY(selectedDate) : new Date()
  );

  const [viewMonth, setViewMonth] = useState(currentDate.getMonth());
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());

  /* ------------------ Sync on selectedDate change (STEP 2️⃣) ------------------ */
  useEffect(() => {
    if (!selectedDate) return;

    const parsedDate = parseMMDDYYYY(selectedDate);
    setCurrentDate(parsedDate);
    setViewMonth(parsedDate.getMonth());
    setViewYear(parsedDate.getFullYear());
  }, [selectedDate]);

  /* ------------------ Constants ------------------ */
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /* ------------------ Calendar Helpers ------------------ */
  const getDaysInMonth = (month: number, year: number) =>
    new Date(year, month + 1, 0).getDate();

  const getFirstDayOfMonth = (month: number, year: number) =>
    new Date(year, month, 1).getDay();

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(viewMonth, viewYear);
    const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(day);

    return days;
  };

  /* ------------------ Actions ------------------ */
  const handleDateClick = (day: number) => {
    const formattedDate = `${String(viewMonth + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}/${viewYear}`;
    onSelectDate(formattedDate);
    onClose();
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(viewYear, viewMonth, currentDate.getDate() + direction * 7);
    setCurrentDate(newDate);
    setViewMonth(newDate.getMonth());
    setViewYear(newDate.getFullYear());
  };

  const navigate2Weeks = (direction: number) => {
    const newDate = new Date(viewYear, viewMonth, currentDate.getDate() + direction * 14);
    setCurrentDate(newDate);
    setViewMonth(newDate.getMonth());
    setViewYear(newDate.getFullYear());
  };

  const navigate6Months = (direction: number) => {
    const newDate = new Date(viewYear, viewMonth + direction * 6, currentDate.getDate());
    setCurrentDate(newDate);
    setViewMonth(newDate.getMonth());
    setViewYear(newDate.getFullYear());
  };

  const navigateMonth = (direction: number) => {
    let newMonth = viewMonth + direction;
    let newYear = viewYear;

    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }

    setViewMonth(newMonth);
    setViewYear(newYear);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      viewMonth === today.getMonth() &&
      viewYear === today.getFullYear()
    );
  };

  const isSelectedDate = (day: number) => {
    if (!selectedDate) return false;
    const [month, dayNum, year] = selectedDate.split('/').map(Number);
    return day === dayNum && viewMonth === month - 1 && viewYear === year;
  };

  const calendarDays = generateCalendarDays();

  /* ------------------ UI ------------------ */
  return (
    <div
      className="absolute top-full left-0 mt-1 bg-white border-2 border-[#3A6EA5] rounded-lg shadow-2xl z-[80] w-[400px]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Quick Navigation */}
      <div className="bg-[#F7F9FC] border-b border-[#E2E8F0] p-2 flex items-center justify-between gap-2 text-xs">
        <button onClick={() => navigateWeek(-1)}><ChevronLeft className="w-3 h-3" /></button>
        <span>Wk.</span>
        <button onClick={() => navigateWeek(1)}><ChevronRight className="w-3 h-3" /></button>

        <button onClick={() => navigate2Weeks(-1)}><ChevronLeft className="w-3 h-3" /></button>
        <span>2 Wks.</span>
        <button onClick={() => navigate2Weeks(1)}><ChevronRight className="w-3 h-3" /></button>

        <button onClick={() => navigate6Months(-1)}><ChevronLeft className="w-3 h-3" /></button>
        <span>6 Mos.</span>
        <button onClick={() => navigate6Months(1)}><ChevronRight className="w-3 h-3" /></button>
      </div>

      {/* Month / Year */}
      <div className="bg-[#E8EFF7] border-b border-[#3A6EA5] p-2 flex justify-between">
        <button onClick={() => navigateMonth(-1)}><ChevronLeft /></button>

        <div className="flex gap-2">
          <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))}>
            {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))}>
            {Array.from({ length: 20 }, (_, i) => viewYear - 10 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button onClick={() => navigateMonth(1)}><ChevronRight /></button>
      </div>

      {/* Calendar */}
      <div className="p-3">
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map(d => <div key={d} className="text-center text-xs font-bold">{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => (
            <button
              key={i}
              disabled={day === null}
              onClick={() => day && handleDateClick(day)}
              className={`
                aspect-square rounded
                ${day === null ? 'invisible' : ''}
                ${isToday(day!) ? 'bg-[#3A6EA5] text-white' : ''}
                ${isSelectedDate(day!) && !isToday(day!) ? 'border-2 border-[#3A6EA5]' : ''}
              `}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#F7F9FC] border-t p-2 flex justify-between">
        <button
          onClick={() => {
            const today = new Date();
            const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
            onSelectDate(todayStr);
            onClose();
          }}
        >
          Today
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
