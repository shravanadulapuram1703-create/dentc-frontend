import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DatePickerCalendarProps {
  selectedDate: string; // Format: MM/DD/YYYY
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

export default function DatePickerCalendar({ selectedDate, onSelectDate, onClose }: DatePickerCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date(selectedDate || new Date()));
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth());
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate calendar days
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(viewMonth, viewYear);
    const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
    const days: (number | null)[] = [];

    // Add empty slots for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    const formattedDate = `${String(viewMonth + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}/${viewYear}`;
    onSelectDate(formattedDate);
    onClose();
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(viewYear, viewMonth, currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
    setViewMonth(newDate.getMonth());
    setViewYear(newDate.getFullYear());
  };

  const navigate2Weeks = (direction: number) => {
    const newDate = new Date(viewYear, viewMonth, currentDate.getDate() + (direction * 14));
    setCurrentDate(newDate);
    setViewMonth(newDate.getMonth());
    setViewYear(newDate.getFullYear());
  };

  const navigate6Months = (direction: number) => {
    const newDate = new Date(viewYear, viewMonth + (direction * 6), currentDate.getDate());
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

  const handleMonthChange = (month: number) => {
    setViewMonth(month);
  };

  const handleYearChange = (year: number) => {
    setViewYear(year);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && 
           viewMonth === today.getMonth() && 
           viewYear === today.getFullYear();
  };

  const isSelectedDate = (day: number) => {
    if (!selectedDate) return false;
    const parts = selectedDate.split('/').map(Number);
    if (parts.length !== 3) return false;
    const [month, dayNum, year] = parts;
    if (month === undefined || dayNum === undefined || year === undefined) return false;
    return day === dayNum && 
           viewMonth === month - 1 && 
           viewYear === year;
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="absolute top-full left-0 mt-1 bg-white border-2 border-[#3A6EA5] rounded-lg shadow-2xl z-50 w-[400px]">
      {/* Quick Navigation Row */}
      <div className="bg-[#F7F9FC] border-b border-[#E2E8F0] p-2 flex items-center justify-between gap-2 text-xs">
        <button
          onClick={() => navigateWeek(-1)}
          className="p-1 hover:bg-[#E2E8F0] rounded transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
        <span className="font-medium text-[#1E293B]">Wk.</span>
        <button
          onClick={() => navigateWeek(1)}
          className="p-1 hover:bg-[#E2E8F0] rounded transition-colors"
        >
          <ChevronRight className="w-3 h-3" />
        </button>

        <div className="h-4 w-px bg-[#CBD5E1]"></div>

        <button
          onClick={() => navigate2Weeks(-1)}
          className="p-1 hover:bg-[#E2E8F0] rounded transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
        <span className="font-medium text-[#1E293B]">2 Wks.</span>
        <button
          onClick={() => navigate2Weeks(1)}
          className="p-1 hover:bg-[#E2E8F0] rounded transition-colors"
        >
          <ChevronRight className="w-3 h-3" />
        </button>

        <div className="h-4 w-px bg-[#CBD5E1]"></div>

        <button
          onClick={() => navigate6Months(-1)}
          className="p-1 hover:bg-[#E2E8F0] rounded transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
        <span className="font-medium text-[#1E293B]">6 Mos.</span>
        <button
          onClick={() => navigate6Months(1)}
          className="p-1 hover:bg-[#E2E8F0] rounded transition-colors"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Month/Year Navigation */}
      <div className="bg-[#E8EFF7] border-b border-[#3A6EA5] p-2 flex items-center justify-between">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-1 hover:bg-[#3A6EA5]/10 rounded transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[#3A6EA5]" />
        </button>

        <div className="flex items-center gap-2">
          <select
            value={viewMonth}
            onChange={(e) => handleMonthChange(Number(e.target.value))}
            className="px-2 py-1 border border-[#CBD5E1] rounded text-sm font-medium focus:outline-none focus:border-[#3A6EA5]"
          >
            {monthNames.map((month, idx) => (
              <option key={idx} value={idx}>{month}</option>
            ))}
          </select>

          <select
            value={viewYear}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className="px-2 py-1 border border-[#CBD5E1] rounded text-sm font-medium focus:outline-none focus:border-[#3A6EA5]"
          >
            {Array.from({ length: 20 }, (_, i) => viewYear - 10 + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => navigateMonth(1)}
          className="p-1 hover:bg-[#3A6EA5]/10 rounded transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-[#3A6EA5]" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="p-3">
        {/* Day Headers */}
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-bold text-[#1F3A5F] py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <button
              key={index}
              onClick={() => day && handleDateClick(day)}
              disabled={day === null}
              className={`
                aspect-square flex items-center justify-center text-sm rounded transition-all
                ${day === null ? 'invisible' : ''}
                ${isToday(day!) ? 'bg-[#3A6EA5] text-white font-bold ring-2 ring-[#3A6EA5] ring-offset-1' : ''}
                ${isSelectedDate(day!) && !isToday(day!) ? 'bg-[#E8EFF7] text-[#1F3A5F] font-semibold border-2 border-[#3A6EA5]' : ''}
                ${!isToday(day!) && !isSelectedDate(day!) ? 'text-[#1E293B] hover:bg-[#F7F9FC] hover:font-semibold' : ''}
              `}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#F7F9FC] border-t border-[#E2E8F0] p-2 flex justify-between items-center">
        <button
          onClick={() => {
            const today = new Date();
            const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
            onSelectDate(todayStr);
            onClose();
          }}
          className="text-xs text-[#3A6EA5] hover:text-[#1F3A5F] font-medium"
        >
          Today
        </button>
        <button
          onClick={onClose}
          className="text-xs bg-[#3A6EA5] text-white px-3 py-1 rounded hover:bg-[#1F3A5F] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
