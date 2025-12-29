import { Appointment } from './types';

interface AppointmentsTableProps {
  appointments: Appointment[];
}

export default function AppointmentsTable({ appointments }: AppointmentsTableProps) {
  return (
    <div className="mb-4">
      <h3 className="text-[#1F3A5F] font-bold uppercase tracking-wide mb-3 text-sm">APPOINTMENTS</h3>
      <div className="overflow-x-auto border-2 border-[#E2E8F0] rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white border-b-2 border-[#16293B]">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Appt Date</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Appt Time</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Office</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Operator</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Provider</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Duration</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Status</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Last Updated</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Member</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Current</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Over 30</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Over 60</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Over 90</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Over 120</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Balance</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Est Pat</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Est Ins</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] bg-white">
            {appointments.map((appt, index) => (
              <tr key={index} className="hover:bg-[#F7F9FC] transition-colors">
                <td className="px-3 py-2 text-[#1E293B]">{appt.date}</td>
                <td className="px-3 py-2 text-[#1E293B]">{appt.time}</td>
                <td className="px-3 py-2 text-[#1E293B]">{appt.office}</td>
                <td className="px-3 py-2 text-[#1E293B]">{appt.operator}</td>
                <td className="px-3 py-2 text-[#1E293B]">{appt.provider}</td>
                <td className="px-3 py-2 text-[#1E293B]">{appt.duration}</td>
                <td className="px-3 py-2 text-[#1E293B]">{appt.status}</td>
                <td className="px-3 py-2 text-[#1E293B]">{appt.lastUpdated}</td>
                <td className="px-3 py-2 text-[#1E293B]">{appt.member}</td>
                <td className="px-3 py-2 text-[#1E293B]">{appt.current}</td>
                <td className="px-3 py-2 text-[#1E293B]">{appt.over30}</td>
                <td className="px-3 py-2 text-[#1E293B]">{appt.over60}</td>
                <td className="px-3 py-2 text-[#1E293B]">{appt.over90}</td>
                <td className="px-3 py-2 text-[#1E293B]">{appt.over120}</td>
                <td className="px-3 py-2 text-[#1E293B]">{appt.balance}</td>
                <td className="px-3 py-2 text-[#1E293B]">{appt.estPat}</td>
                <td className="px-3 py-2 text-[#1E293B]">{appt.estIns}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
