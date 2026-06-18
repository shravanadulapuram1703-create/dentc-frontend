import { useMemo } from 'react';
import { useListPatientInsurance } from '@/api/generated/endpoints/patients/patients';
import { useGetInsurancePlan, useListInsuranceCoverageRules } from '@/api/generated/endpoints/insurance/insurance';

interface InsuranceBenefitsModalProps {
  patientId: number;
  insuranceType: 'primary' | 'secondary';
  onTypeChange: (t: 'primary' | 'secondary') => void;
  onClose: () => void;
}

/** Read-only patient insurance benefits (Benefits + Coverage/Limitation), legacy GTP pop-out. */
export default function InsuranceBenefitsModal({ patientId, insuranceType, onTypeChange, onClose }: InsuranceBenefitsModalProps) {
  const insQuery = useListPatientInsurance({ patient_id: patientId, size: 50 });
  const record = useMemo(
    () => (insQuery.data?.items ?? []).find((i) => (i.insurance_type ?? '').toLowerCase() === insuranceType),
    [insQuery.data, insuranceType],
  );
  const planId = record?.ins_plan_id ?? undefined;
  const planQuery = useGetInsurancePlan(planId as number, { query: { enabled: planId != null } });
  const rulesQuery = useListInsuranceCoverageRules({ ins_plan_id: planId, size: 200 }, { query: { enabled: planId != null } });
  const plan = planQuery.data;
  const rules = rulesQuery.data?.items ?? [];

  const money = (v?: string | null) => (v == null || v === '' ? '—' : `$${Number(v).toFixed(2)}`);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />
      <div className="relative w-[640px] rounded-lg border border-slate-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-2 text-white">
          <span className="text-sm font-semibold">Insurance Benefits</span>
          <button onClick={onClose} aria-label="Close" className="rounded px-1.5 hover:bg-white/15">✕</button>
        </div>

        <div className="flex border-b border-slate-200">
          {(['primary', 'secondary'] as const).map((t) => (
            <button key={t} onClick={() => onTypeChange(t)} className="flex-1 py-2 text-xs font-semibold capitalize"
              style={{ background: insuranceType === t ? '#fff' : '#eef2f7', color: insuranceType === t ? '#16406e' : '#64748b', borderBottom: insuranceType === t ? '2px solid #2566a8' : '2px solid transparent' }}>
              {t}
            </button>
          ))}
        </div>

        {!record ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">No {insuranceType} insurance on file for this patient.</p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto p-4">
            {/* Benefits */}
            <div className="mb-4 grid grid-cols-3 gap-3">
              <Stat label="Individual Max" value={money(plan?.individual_max)} />
              <Stat label="Max Remaining" value={money(record.max_remaining)} />
              <Stat label="Family Max" value={money(plan?.family_max)} />
              <Stat label="Individual Deductible" value={money(plan?.individual_deductible)} />
              <Stat label="Deductible Remaining" value={money(record.deductible_remaining)} />
              <Stat label="Ortho Max" value={money(plan?.ortho_max)} />
            </div>

            {/* Coverage / Limitation */}
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Coverage &amp; Limitations</div>
            {rules.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">No coverage rules configured for this plan.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600">
                    <th className="px-2 py-1.5 text-left font-semibold">Codes</th>
                    <th className="px-2 py-1.5 text-center font-semibold">Cov %</th>
                    <th className="px-2 py-1.5 text-center font-semibold">Ded Waived</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Frequency</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Age</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Wait</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="px-2 py-1.5 text-slate-700">{r.start_code}{r.end_code && r.end_code !== r.start_code ? `–${r.end_code}` : ''}</td>
                      <td className="px-2 py-1.5 text-center text-slate-600">{r.coverage_pct ?? '—'}</td>
                      <td className="px-2 py-1.5 text-center text-slate-600">{r.ded_waived ? 'Yes' : 'No'}</td>
                      <td className="px-2 py-1.5 text-slate-600">{r.freq_limit ?? '—'}</td>
                      <td className="px-2 py-1.5 text-slate-600">{r.age_limit ?? '—'}</td>
                      <td className="px-2 py-1.5 text-slate-600">{r.wait_period ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}
