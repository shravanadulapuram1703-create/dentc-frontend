import { Recall } from './types';

interface RecallsTableProps {
  recalls: Recall[];
}

export default function RecallsTable({ recalls }: RecallsTableProps) {
  return (
    <div>
      <h3 className="text-[#1F3A5F] font-bold uppercase tracking-wide mb-3 text-sm">RECALLS</h3>
      <div className="overflow-x-auto border-2 border-[#E2E8F0] rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white border-b-2 border-[#16293B]">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Code</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Age</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Next Date</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Freq</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Sch Date</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Sch Time</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Appoints Req</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Last Pat Day</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Rem Amount</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Hsg</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Ortho</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] bg-white">
            {recalls.map((recall, index) => (
              <tr key={index} className="hover:bg-[#F7F9FC] transition-colors">
                <td className="px-3 py-2 text-[#1E293B]">{recall.code}</td>
                <td className="px-3 py-2 text-[#1E293B]">{recall.age}</td>
                <td className="px-3 py-2 text-[#1E293B]">{recall.nextDate}</td>
                <td className="px-3 py-2 text-[#1E293B]">{recall.freq}</td>
                <td className="px-3 py-2 text-[#1E293B]">-</td>
                <td className="px-3 py-2 text-[#1E293B]">-</td>
                <td className="px-3 py-2 text-[#1E293B]">-</td>
                <td className="px-3 py-2 text-[#1E293B]">-</td>
                <td className="px-3 py-2 text-[#1E293B]">-</td>
                <td className="px-3 py-2 text-[#1E293B]">-</td>
                <td className="px-3 py-2 text-[#1E293B]">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
