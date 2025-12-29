import { Plus } from 'lucide-react';
import { AccountMember } from './types';

interface AccountMembersTableProps {
  members: AccountMember[];
  onAddMember?: () => void;
}

export default function AccountMembersTable({ members, onAddMember }: AccountMembersTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-md border-2 border-[#E2E8F0] mb-4">
      <div className="px-4 py-2.5 border-b-2 border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]">
        <h2 className="text-white font-bold uppercase tracking-wide text-sm">ACCOUNT MEMBERS</h2>
        {onAddMember && (
          <button 
            onClick={onAddMember}
            className="px-3 py-1.5 bg-white text-[#1F3A5F] border-2 border-white rounded hover:bg-[#F7F9FC] transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            ADD NEW MEMBER
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Member</th>
              <th className="px-4 py-2 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Age / Sex</th>
              <th className="px-4 py-2 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Next Visit</th>
              <th className="px-4 py-2 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Next Recall</th>
              <th className="px-4 py-2 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Sched Recall</th>
              <th className="px-4 py-2 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Last Visit</th>
              <th className="px-4 py-2 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {members.map((member, index) => (
              <tr key={index} className="hover:bg-[#F7F9FC] transition-colors">
                <td className="px-4 py-3 text-[#1E293B] font-medium">{member.name}</td>
                <td className="px-4 py-3 text-[#1E293B]">{member.age} / {member.sex}</td>
                <td className="px-4 py-3 text-[#1E293B]">{member.nextVisit}</td>
                <td className="px-4 py-3 text-[#1E293B]">{member.recall}</td>
                <td className="px-4 py-3 text-[#1E293B]">-</td>
                <td className="px-4 py-3 text-[#1E293B]">{member.lastVisit}</td>
                <td className="px-4 py-3 text-[#1E293B]">{member.active}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
