import { BalanceData, AccountMember } from './types';

interface BalancesTabProps {
  balanceData: BalanceData;
  accountMembers: AccountMember[];
}

export default function BalancesTab({ balanceData, accountMembers }: BalancesTabProps) {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-[#FEF2F2] border-2 border-[#EF4444] p-3 rounded-lg">
          <div className="text-[#64748B] mb-1 text-sm">Account Balance</div>
          <div className="text-[#EF4444] font-bold">{balanceData.accountBalance}</div>
        </div>
        <div className="bg-[#FEF3C7] border-2 border-[#F59E0B] p-3 rounded-lg">
          <div className="text-[#64748B] mb-1 text-sm">Today's Charges</div>
          <div className="text-[#F59E0B] font-bold">{balanceData.todayCharges}</div>
        </div>
        <div className="bg-[#DCFCE7] border-2 border-[#2FB9A7] p-3 rounded-lg">
          <div className="text-[#64748B] mb-1 text-sm">Today's Est Insurance</div>
          <div className="text-[#2FB9A7] font-bold">{balanceData.todayEstInsurance}</div>
        </div>
        <div className="bg-[#DBEAFE] border-2 border-[#3A6EA5] p-3 rounded-lg">
          <div className="text-[#64748B] mb-1 text-sm">Today's Est Patient</div>
          <div className="text-[#3A6EA5] font-bold">{balanceData.todayEstPatient}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-3">
          <h3 className="text-[#1F3A5F] font-bold text-sm">Last Insurance Payment</h3>
          <div className="bg-[#F7F9FC] border-2 border-[#E2E8F0] p-3 rounded-lg">
            <div className="text-[#64748B] text-sm">Amount: <span className="text-[#1E293B] font-semibold">{balanceData.lastInsPayment}</span></div>
            <div className="text-[#64748B] text-sm">Date: <span className="text-[#1E293B] font-semibold">{balanceData.lastInsPaymentDate}</span></div>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-[#1F3A5F] font-bold text-sm">Last Patient Payment</h3>
          <div className="bg-[#F7F9FC] border-2 border-[#E2E8F0] p-3 rounded-lg">
            <div className="text-[#64748B] text-sm">Amount: <span className="text-[#1E293B] font-semibold">{balanceData.lastPatPayment}</span></div>
            <div className="text-[#64748B] text-sm">Date: <span className="text-[#1E293B] font-semibold">{balanceData.lastPatPaymentDate}</span></div>
          </div>
        </div>
      </div>

      {/* Member Balances Table */}
      <div>
        <h3 className="text-[#1F3A5F] font-bold uppercase tracking-wide mb-3 text-sm">Member Balances</h3>
        <div className="overflow-x-auto border-2 border-[#E2E8F0] rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white border-b-2 border-[#16293B]">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Member</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Current</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Over 30</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Over 60</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Over 90</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Over 120</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {accountMembers.map((member, index) => (
                <tr key={index} className="hover:bg-[#F7F9FC] transition-colors">
                  <td className="px-3 py-2 text-[#1E293B]">{member.name}</td>
                  <td className="px-3 py-2 text-[#1E293B]">($177.73)</td>
                  <td className="px-3 py-2 text-[#1E293B]">$0.00</td>
                  <td className="px-3 py-2 text-[#1E293B]">$0.00</td>
                  <td className="px-3 py-2 text-[#1E293B]">$0.00</td>
                  <td className="px-3 py-2 text-[#1E293B]">$0.00</td>
                  <td className="px-3 py-2 text-[#1E293B]">($177.73)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
