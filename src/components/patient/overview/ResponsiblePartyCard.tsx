import { Edit2 } from 'lucide-react';
import { ResponsibleParty } from './types';

interface ResponsiblePartyCardProps {
  responsibleParty: ResponsibleParty;
  onEdit: () => void;
}

export default function ResponsiblePartyCard({ responsibleParty, onEdit }: ResponsiblePartyCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md border-2 border-[#E2E8F0]">
      <div className="px-4 py-2.5 border-b-2 border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]">
        <h2 className="text-white font-bold uppercase tracking-wide text-sm">RESPONSIBLE PARTY</h2>
        <button
          onClick={onEdit}
          className="px-3 py-1.5 bg-white text-[#1F3A5F] border-2 border-white rounded hover:bg-[#F7F9FC] transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Edit2 className="w-4 h-4" strokeWidth={2} />
          EDIT
        </button>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Name</div>
          <div className="text-[#1E293B] font-semibold">{responsibleParty.name}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Cell</div>
          <div className="text-[#1E293B] font-semibold">{responsibleParty.cellPhone}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Responsible Party ID</div>
          <div className="text-[#1E293B] font-semibold">{responsibleParty.id}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Email</div>
          <div className="text-[#1E293B] font-semibold">{responsibleParty.email || '-'}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Type</div>
          <div className="text-[#1E293B] font-semibold">{responsibleParty.type}</div>
        </div>
        <div>
          <div className="text-[#64748B] text-xs uppercase tracking-wide mb-0.5">Home Office</div>
          <div className="text-[#1E293B] font-semibold">{responsibleParty.homeOffice}</div>
        </div>
      </div>
    </div>
  );
}
