import { ShieldCheck } from 'lucide-react';
import { DentalInsurance } from './types';

interface Props {
  dentalInsurance: DentalInsurance;
  showMedical?: boolean;
}

export default function InsuranceCard({ dentalInsurance, showMedical = false }: Props) {
  return (
    <>
      {/* Dental Insurance */}
      <div className="bg-white rounded-lg shadow-md border-2 border-[#E2E8F0]">
        <div className="px-4 py-2.5 border-b-2 border-[#E2E8F0] bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]">
          <h2 className="text-white font-bold uppercase tracking-wide text-sm">
            DENTAL INS PRI / SEC
          </h2>
        </div>

        <div className="p-4 grid grid-cols-2 gap-4 text-sm">
          {/* Primary */}
          <div>
            <div className="font-bold text-[#1F3A5F] mb-2 uppercase tracking-wide text-xs">
              Primary
            </div>
            <div className="space-y-1">
              <div><span className="text-[#64748B]">Carrier:</span> {dentalInsurance.primary.carrierName}</div>
              <div><span className="text-[#64748B]">Group #:</span> {dentalInsurance.primary.groupNumber}</div>
              <div><span className="text-[#64748B]">Subscriber:</span> {dentalInsurance.primary.subscriber}</div>
              <div className="text-[#2FB9A7] font-semibold">
                Max Remaining: {dentalInsurance.primary.indMaxRemain}
              </div>
            </div>
          </div>

          {/* Secondary */}
          <div>
            <div className="font-bold text-[#1F3A5F] mb-2 uppercase tracking-wide text-xs">
              Secondary
            </div>
            <div className="italic text-[#94A3B8]">
              No secondary insurance
            </div>
          </div>
        </div>
      </div>

      {/* Medical Insurance */}
      {showMedical && (
        <div className="bg-white rounded-lg shadow-md border-2 border-[#E2E8F0]">
          <div className="px-4 py-2.5 border-b-2 border-[#E2E8F0] bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]">
            <h2 className="text-white font-bold uppercase tracking-wide text-sm">
              MEDICAL INS PRI / SEC
            </h2>
          </div>

          <div className="p-4 text-[#94A3B8] italic text-sm">
            No medical insurance configured
          </div>
        </div>
      )}
    </>
  );
}
