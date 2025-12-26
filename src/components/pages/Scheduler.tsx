import GlobalNav from '../GlobalNav';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, Plus, Search, Printer } from 'lucide-react';
import NewAppointmentModal from '../modals/NewAppointmentModal';
import { components } from '../../styles/theme';

interface SchedulerProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  time: string; // Start time in "HH:MM" format
  duration: number; // Duration in minutes
  procedureType: string;
  status: 'Scheduled' | 'Confirmed' | 'Unconfirmed' | 'Left Message' | 'In Reception' | 'Available' | 'In Operatory' | 'Checked Out' | 'Missed' | 'Cancelled';
  operatory: string;
  provider: string;
  notes: string;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  type: 'empty' | 'appointment';
  appointment?: Appointment;
  timeSlot?: string;
  operatory?: string;
}

export default function Scheduler({ onLogout, currentOffice, setCurrentOffice }: SchedulerProps) {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, type: 'empty' });
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; operatory: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Mock appointments data
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: '1',
      patientId: '900097',
      patientName: 'Miller, Nicolas',
      time: '09:00',
      duration: 60,
      procedureType: 'New Patient',
      status: 'Confirmed',
      operatory: 'OP1',
      provider: 'Dr. Jinna',
      notes: 'First visit'
    },
    {
      id: '2',
      patientId: '900098',
      patientName: 'Smith, John',
      time: '10:30',
      duration: 30,
      procedureType: 'Cleaning',
      status: 'Scheduled',
      operatory: 'OP1',
      provider: 'Dr. Jinna',
      notes: 'Routine cleaning'
    },
    {
      id: '3',
      patientId: '900099',
      patientName: 'Johnson, Sarah',
      time: '11:00',
      duration: 90,
      procedureType: 'Crown',
      status: 'In Operatory',
      operatory: 'OP2',
      provider: 'Dr. Smith',
      notes: 'Crown preparation'
    },
    {
      id: '4',
      patientId: '900100',
      patientName: 'Davis, Michael',
      time: '14:00',
      duration: 45,
      procedureType: 'Restorative',
      status: 'Confirmed',
      operatory: 'OP2',
      provider: 'Dr. Smith',
      notes: 'Filling replacement'
    }
  ]);

  // Operatories configuration
  const operatories = [
    { id: 'OP1', name: 'OP 1 - Hygiene', provider: 'Dr. Jinna', office: 'Moon, PA' },
    { id: 'OP2', name: 'OP 2 - Major', provider: 'Dr. Smith', office: 'Moon, PA' },
    { id: 'OP3', name: 'OP 3 - Minor', provider: 'Dr. Jones', office: 'Moon, PA' }
  ];

  // Generate time slots (8:00 AM to 5:00 PM in 10-minute increments)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 10) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Status colors
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Scheduled': 'bg-blue-100 border-blue-400 text-blue-900',
      'Confirmed': 'bg-green-100 border-green-400 text-green-900',
      'Unconfirmed': 'bg-yellow-100 border-yellow-400 text-yellow-900',
      'Left Message': 'bg-purple-100 border-purple-400 text-purple-900',
      'In Reception': 'bg-cyan-100 border-cyan-400 text-cyan-900',
      'Available': 'bg-gray-100 border-gray-400 text-gray-900',
      'In Operatory': 'bg-red-100 border-red-400 text-red-900',
      'Checked Out': 'bg-emerald-100 border-emerald-400 text-emerald-900',
      'Missed': 'bg-orange-100 border-orange-400 text-orange-900',
      'Cancelled': 'bg-slate-100 border-slate-400 text-slate-900'
    };
    return colors[status] || 'bg-gray-100 border-gray-400 text-gray-900';
  };

  // Calculate appointment position
  const getAppointmentPosition = (appointment: Appointment) => {
    const [hours, minutes] = appointment.time.split(':').map(Number);
    const startMinutes = (hours - 8) * 60 + minutes;
    const slotHeight = 40; // Height per 10-minute slot
    const top = (startMinutes / 10) * slotHeight;
    const height = (appointment.duration / 10) * slotHeight;
    return { top, height };
  };

  // Handle right-click on empty slot
  const handleEmptySlotRightClick = (e: React.MouseEvent, time: string, operatory: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'empty',
      timeSlot: time,
      operatory
    });
  };

  // Handle right-click on appointment
  const handleAppointmentRightClick = (e: React.MouseEvent, appointment: Appointment) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'appointment',
      appointment
    });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu({ visible: false, x: 0, y: 0, type: 'empty' });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Navigate to previous/next day
  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  // Handle new appointment creation
  const handleAddNewAppointment = (timeSlot?: string, operatory?: string) => {
    setSelectedSlot(timeSlot && operatory ? { time: timeSlot, operatory } : null);
    setShowNewAppointment(true);
    setContextMenu({ visible: false, x: 0, y: 0, type: 'empty' });
  };

  // Handle appointment save
  const handleSaveAppointment = (appointmentData: any) => {
    const newAppointment: Appointment = {
      id: Date.now().toString(),
      patientId: appointmentData.patientId || 'NEW',
      patientName: `${appointmentData.lastName}, ${appointmentData.firstName}`,
      time: selectedSlot?.time || appointmentData.time,
      duration: appointmentData.duration,
      procedureType: appointmentData.procedureType,
      status: 'Scheduled',
      operatory: selectedSlot?.operatory || appointmentData.operatory,
      provider: appointmentData.provider || 'Dr. Jinna',
      notes: appointmentData.notes || ''
    };
    setAppointments([...appointments, newAppointment]);
  };

  // Navigate to patient module
  const handleGoToPatient = (module: string, appointment: Appointment) => {
    setContextMenu({ visible: false, x: 0, y: 0, type: 'empty' });
    
    // Set patient context in sessionStorage
    const patientContext = {
      id: appointment.patientId,
      name: appointment.patientName,
      age: 34, // Mock data
      gender: 'M',
      dob: '03/15/1990',
      responsibleParty: 'Self',
      homeOffice: currentOffice,
      primaryInsurance: 'Delta Dental PPO',
      secondaryInsurance: '',
      accountBalance: 1245.00,
      estInsurance: 850.00,
      estPatient: 395.00,
      firstVisit: '01/15/2018',
      lastVisit: '11/20/2024',
      nextVisit: '01/15/2025',
      nextRecall: '05/20/2025'
    };
    sessionStorage.setItem('activePatient', JSON.stringify(patientContext));
    
    switch (module) {
      case 'overview':
        navigate('/patient-overview');
        break;
      case 'ledger':
        navigate('/patient-ledger');
        break;
      case 'transactions':
        navigate('/transactions');
        break;
      case 'charting':
        navigate('/charting');
        break;
      default:
        break;
    }
  };

  // Set appointment status
  const handleSetStatus = (appointment: Appointment, status: Appointment['status']) => {
    setAppointments(appointments.map(appt => 
      appt.id === appointment.id ? { ...appt, status } : appt
    ));
    setContextMenu({ visible: false, x: 0, y: 0, type: 'empty' });
  };

  // Delete appointment
  const handleDeleteAppointment = (appointment: Appointment) => {
    if (window.confirm(`Delete appointment for ${appointment.patientName}?`)) {
      setAppointments(appointments.filter(appt => appt.id !== appointment.id));
    }
    setContextMenu({ visible: false, x: 0, y: 0, type: 'empty' });
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
              <Calendar className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Scheduler</h1>
              <p className="text-sm text-white/80">Office: {currentOffice}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleAddNewAppointment()}
              className={components.buttonDanger + " flex items-center gap-2"}
            >
              <Plus className="w-5 h-5" strokeWidth={2} />
              NEW APPOINTMENT
            </button>
            <button className={components.buttonWarning + " flex items-center gap-2"}>
              <Search className="w-5 h-5" strokeWidth={2} />
              QUICK FILL
            </button>
            <button className={components.buttonSecondary + " flex items-center gap-2"}>
              <Printer className="w-5 h-5" strokeWidth={2} />
              PRINT
            </button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="bg-[#F7F9FC] px-6 py-3 flex items-center justify-between border-b border-[#E2E8F0]">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-white rounded-lg transition-colors border border-[#E2E8F0]"
          >
            <ChevronLeft className="w-6 h-6 text-[#1E293B]" strokeWidth={2} />
          </button>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-[#3A6EA5]" strokeWidth={2} />
            <span className="text-[#1E293B] font-bold">{formatDate(selectedDate)}</span>
          </div>
          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-white rounded-lg transition-colors border border-[#E2E8F0]"
          >
            <ChevronRight className="w-6 h-6 text-[#1E293B]" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Scheduler Grid */}
      <div className="overflow-auto" style={{ height: 'calc(100vh - 220px)' }}>
        <div className="inline-block min-w-full">
          <div className="flex">
            {/* Time Column */}
            <div className="sticky left-0 bg-white border-r-2 border-[#E2E8F0] z-10 shadow-md">
              <div className="h-12 border-b-2 border-[#16293B] bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]"></div>
              {timeSlots.map((time, index) => (
                <div
                  key={time}
                  className="h-10 px-3 flex items-center justify-end border-b border-slate-200 text-sm text-slate-600 font-semibold"
                  style={{ minWidth: '80px' }}
                >
                  {index % 6 === 0 && time}
                </div>
              ))}
            </div>

            {/* Operatory Columns */}
            {operatories.map((operatory) => (
              <div key={operatory.id} className="border-r-2 border-[#E2E8F0]" style={{ minWidth: '250px' }}>
                {/* Column Header */}
                <div className="h-12 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white px-4 py-2 border-b-2 border-[#16293B] sticky top-0">
                  <div className="text-sm font-bold">{operatory.name}</div>
                  <div className="text-xs opacity-90">{operatory.provider}</div>
                </div>

                {/* Time Slots */}
                <div className="relative bg-white">
                  {timeSlots.map((time) => (
                    <div
                      key={`${operatory.id}-${time}`}
                      className="h-10 border-b border-slate-200 hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                      onContextMenu={(e) => handleEmptySlotRightClick(e, time, operatory.id)}
                    ></div>
                  ))}

                  {/* Appointments */}
                  {appointments
                    .filter((appt) => appt.operatory === operatory.id)
                    .map((appointment) => {
                      const { top, height } = getAppointmentPosition(appointment);
                      return (
                        <div
                          key={appointment.id}
                          className={`absolute left-1 right-1 border-2 rounded px-2 py-1 cursor-pointer overflow-hidden ${getStatusColor(appointment.status)}`}
                          style={{ top: `${top}px`, height: `${height}px` }}
                          onContextMenu={(e) => handleAppointmentRightClick(e, appointment)}
                        >
                          <div className="text-xs truncate">
                            <strong>{appointment.time}</strong> {appointment.patientName}
                          </div>
                          <div className="text-xs truncate">{appointment.procedureType}</div>
                          {appointment.duration >= 30 && (
                            <div className="text-xs opacity-75">{appointment.duration} min</div>
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
          className="fixed bg-white border border-gray-300 rounded shadow-lg z-50 py-1"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px`, minWidth: '200px' }}
        >
          {contextMenu.type === 'empty' ? (
            <>
              <button
                onClick={() => handleAddNewAppointment(contextMenu.timeSlot, contextMenu.operatory)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
              >
                Add New Appointment
              </button>
              <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                Search Quick-Fill
              </button>
              <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                Paste
              </button>
            </>
          ) : contextMenu.appointment ? (
            <>
              <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                Edit
              </button>
              <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                Cut
              </button>
              <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                Copy
              </button>
              <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                Reschedule
              </button>
              <button
                onClick={() => handleDeleteAppointment(contextMenu.appointment!)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600"
              >
                Delete
              </button>
              <hr className="my-1" />
              
              {/* Go To Submenu */}
              <div className="relative group">
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900 flex items-center justify-between">
                  Go To
                  <span>›</span>
                </button>
                <div className="hidden group-hover:block absolute left-full top-0 bg-white border border-gray-300 rounded shadow-lg py-1 ml-1" style={{ minWidth: '180px' }}>
                  <button
                    onClick={() => handleGoToPatient('overview', contextMenu.appointment!)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                  >
                    Patient Overview
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900">
                    Treatment Plans
                  </button>
                  <button
                    onClick={() => handleGoToPatient('transactions', contextMenu.appointment!)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                  >
                    Transactions
                  </button>
                  <button
                    onClick={() => handleGoToPatient('ledger', contextMenu.appointment!)}
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
                    onClick={() => handleGoToPatient('charting', contextMenu.appointment!)}
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
                <div className="hidden group-hover:block absolute left-full top-0 bg-white border border-gray-300 rounded shadow-lg py-1 ml-1" style={{ minWidth: '180px' }}>
                  {['Scheduled', 'Confirmed', 'Unconfirmed', 'Left Message', 'In Reception', 'Available', 'In Operatory', 'Checked Out', 'Missed', 'Cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleSetStatus(contextMenu.appointment!, status as Appointment['status'])}
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
                <div className="hidden group-hover:block absolute left-full top-0 bg-white border border-gray-300 rounded shadow-lg py-1 ml-1" style={{ minWidth: '180px' }}>
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
          onClose={() => setShowNewAppointment(false)}
          onSave={handleSaveAppointment}
          selectedSlot={selectedSlot}
          currentOffice={currentOffice}
        />
      )}
    </div>
  );
}