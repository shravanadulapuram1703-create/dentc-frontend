// Tx Plans tab of the Add / Edit Appointment screen.
//
// Shows the patient's real treatment plans (plan → phase → procedure) so
// diagnosed work can be pulled onto the appointment, and lets a new procedure
// be planned without leaving the appointment. "Add…" runs the same flow as the
// patient's Treatment Plan screen: pick a code, price it from the fee schedule,
// POST a treatment_plan_item (creating the plan when the patient has none).

import { ChevronRight, ChevronDown, Loader2, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { TreatmentPlan as ApiTreatmentPlan, Provider, ProcedureCode } from '../../services/schedulerApi';
import {
  createTreatmentPlan,
  createTreatmentPlanItem,
  listTreatmentPlans,
} from '@/api/generated/endpoints/treatment-plans/treatment-plans';
import { resolveProcedureFee, type FeeScheduleContext } from '../../services/feeScheduleResolver';

interface TxPlanProcedure {
  id: string;
  /** Owning plan — carried onto the appointment line as treatment_plan_id. */
  planId: string;
  code: string;
  description: string;
  tooth: string;
  surface: string;
  diagnosedProvider: string;
  fee: number;
  insuranceEstimate: number;
  status: 'Planned' | 'Scheduled' | 'Completed';
}

interface TxPlanPhase {
  id: string;
  name: string;
  procedures: TxPlanProcedure[];
  expanded: boolean;
}

interface TxPlan {
  id: string;
  name: string;
  phases: TxPlanPhase[];
  expanded: boolean;
}

interface TxPlansTabProps {
  treatmentPlans: ApiTreatmentPlan[];
  isLoading?: boolean;
  /** Numeric backend patient id (never the chart_no). */
  patientId: number | null;
  officeId: number | null;
  providers: Provider[];
  defaultProviderId: string;
  procedureCodes: ProcedureCode[];
  feeContext: FeeScheduleContext;
  onRefresh: () => void;
  providerLabel: (id: string) => string;
  onSelectProcedures: (procedures: TxPlanProcedure[]) => void;
}

const genId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tp-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export default function TxPlansTab({
  treatmentPlans: initialTreatmentPlans,
  isLoading = false,
  patientId,
  officeId,
  providers,
  defaultProviderId,
  procedureCodes,
  feeContext,
  onRefresh,
  providerLabel,
  onSelectProcedures,
}: TxPlansTabProps) {
  const transformTreatmentPlans = (plans: ApiTreatmentPlan[]): TxPlan[] => {
    if (!plans || !Array.isArray(plans)) return [];
    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      expanded: true,
      phases: (plan.phases || []).map((phase) => ({
        id: phase.id,
        name: phase.name,
        expanded: true,
        procedures: (phase.procedures || []).map((proc) => ({
          id: proc.id,
          planId: plan.id,
          code: proc.code,
          description: proc.description,
          tooth: proc.tooth || '',
          surface: proc.surface || '',
          diagnosedProvider: proc.diagnosedProvider || '',
          fee: proc.fee || 0,
          insuranceEstimate: proc.insuranceEstimate || 0,
          status: proc.status || 'Planned',
        })),
      })),
    }));
  };

  const [txPlans, setTxPlans] = useState<TxPlan[]>(
    transformTreatmentPlans(initialTreatmentPlans || []),
  );

  useEffect(() => {
    setTxPlans(transformTreatmentPlans(initialTreatmentPlans || []));
  }, [initialTreatmentPlans]);

  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);

  // "Add…" panel state
  const [showAdd, setShowAdd] = useState(false);
  const [addCode, setAddCode] = useState('');
  const [addProviderId, setAddProviderId] = useState(defaultProviderId);
  const [addPlanId, setAddPlanId] = useState<string>('');
  const [addPhase, setAddPhase] = useState(1);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => setAddProviderId(defaultProviderId), [defaultProviderId]);
  useEffect(() => {
    if (!addPlanId && txPlans[0]) setAddPlanId(txPlans[0].id);
  }, [txPlans, addPlanId]);

  const togglePlan = (planId: string) => {
    setTxPlans(
      txPlans.map((plan) =>
        plan.id === planId ? { ...plan, expanded: !plan.expanded } : plan,
      ),
    );
  };

  const togglePhase = (planId: string, phaseId: string) => {
    setTxPlans(
      txPlans.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              phases: plan.phases.map((phase) =>
                phase.id === phaseId ? { ...phase, expanded: !phase.expanded } : phase,
              ),
            }
          : plan,
      ),
    );
  };

  const toggleProcedureSelection = (procedureId: string) => {
    setSelectedProcedures((prev) =>
      prev.includes(procedureId)
        ? prev.filter((id) => id !== procedureId)
        : [...prev, procedureId],
    );
  };

  /** Create the treatment-plan item — same call the Treatment Plan screen makes. */
  const handleCreatePlanItem = async () => {
    setAddError(null);
    if (patientId == null) {
      setAddError('This patient has no backend id, so a plan cannot be created.');
      return;
    }
    const code = procedureCodes.find(
      (c) => c.code.toLowerCase() === addCode.trim().toLowerCase(),
    );
    if (!code) {
      setAddError(`"${addCode}" is not a known procedure code.`);
      return;
    }

    setSaving(true);
    try {
      // Reuse the selected plan, or create the patient's first one.
      let planId = addPlanId;
      if (!planId) {
        const existing = await listTreatmentPlans({ patient_id: patientId, size: 200 }).catch(
          () => null,
        );
        planId = existing?.items?.[0]?.id ?? '';
        if (!planId) {
          planId = genId();
          await createTreatmentPlan({
            id: planId,
            patient_id: patientId,
            office_id: officeId,
            name: 'Treatment Plan 1',
            status: 'active',
          });
        }
      }

      const priced = await resolveProcedureFee(feeContext, code.code, {
        default_fee: code.defaultFee,
      }).catch(() => null);

      await createTreatmentPlanItem({
        id: genId(),
        plan_id: planId,
        procedure_code: code.code,
        description: code.description,
        fee: priced?.fee ?? code.defaultFee,
        insurance_estimate: priced?.insurance_estimate ?? 0,
        priority: 1,
        phase_id: addPhase,
        billing_order: String(addPhase),
        status: 'diagnosed',
        provider_id: addProviderId || null,
        diagnosed_by: addProviderId || null,
      });

      setAddCode('');
      setShowAdd(false);
      onRefresh();
    } catch (err: any) {
      console.error('Error creating treatment plan item:', err);
      setAddError(
        err?.response?.data?.detail || err?.message || 'Failed to add the procedure to a plan',
      );
    } finally {
      setSaving(false);
    }
  };

  const getAllSelectedProcedures = () => {
    const allProcedures: TxPlanProcedure[] = [];
    txPlans.forEach((plan) => {
      plan.phases.forEach((phase) => {
        phase.procedures.forEach((proc) => {
          if (selectedProcedures.includes(proc.id)) allProcedures.push(proc);
        });
      });
    });
    return allProcedures;
  };

  const handleApplyToAppointment = () => {
    const selected = getAllSelectedProcedures();
    if (selected.length === 0) return;
    onSelectProcedures(selected);
    setSelectedProcedures([]);
  };

  const inputCls =
    'px-2 py-1 border border-[#CBD5E1] rounded text-xs focus:outline-none focus:border-[#3A6EA5]';

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-[#1F3A5F]">TX PLANS (Treatment Plans)</h4>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="bg-[#2FB9A7] text-white px-3 py-1 rounded text-xs font-medium hover:bg-[#26a396] transition-colors flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          {showAdd ? 'Cancel' : 'Add…'}
        </button>
      </div>

      {/* Add a diagnosed procedure to a plan */}
      {showAdd && (
        <div className="rounded-lg border-2 border-[#3A6EA5] bg-[#E8F4F8] p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1F3A5F]">
            Plan a procedure
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-0.5 text-[11px] font-semibold text-[#1E293B]">
              Procedure code
              <input
                list="txplan-code-options"
                value={addCode}
                onChange={(e) => setAddCode(e.target.value)}
                placeholder="e.g. D2391"
                className={`${inputCls} w-40 bg-white`}
              />
              <datalist id="txplan-code-options">
                {procedureCodes.slice(0, 1200).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.description}
                  </option>
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-0.5 text-[11px] font-semibold text-[#1E293B]">
              Plan
              <select
                value={addPlanId}
                onChange={(e) => setAddPlanId(e.target.value)}
                className={`${inputCls} w-48 bg-white`}
              >
                <option value="">New plan</option>
                {txPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-0.5 text-[11px] font-semibold text-[#1E293B]">
              Phase
              <input
                type="number"
                min={1}
                value={addPhase}
                onChange={(e) => setAddPhase(Math.max(1, Number(e.target.value) || 1))}
                className={`${inputCls} w-16 bg-white`}
              />
            </label>
            <label className="flex flex-col gap-0.5 text-[11px] font-semibold text-[#1E293B]">
              Diagnosing provider
              <select
                value={addProviderId}
                onChange={(e) => setAddProviderId(e.target.value)}
                className={`${inputCls} w-52 bg-white`}
              >
                <option value="">— Select provider —</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => void handleCreatePlanItem()}
              disabled={saving || !addCode.trim()}
              className="flex items-center gap-1 rounded bg-[#3A6EA5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1F3A5F] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add to plan
            </button>
          </div>
          {addError && <p className="mt-2 text-xs text-[#B91C1C]">{addError}</p>}
        </div>
      )}

      {/* Tree View */}
      <div className="border-2 border-[#E2E8F0] rounded-lg bg-white max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-[#64748B] text-sm">
            Loading treatment plans...
          </div>
        ) : txPlans.length === 0 ? (
          <div className="p-8 text-center text-[#64748B] text-sm">
            No treatment plans found. Click "Add…" to plan a procedure for this patient.
          </div>
        ) : (
          <div className="p-2">
            {txPlans.map((plan) => (
              <div key={plan.id} className="mb-2">
                {/* Plan Level */}
                <div
                  className="flex items-center gap-1 cursor-pointer hover:bg-[#F7F9FC] p-1 rounded group"
                  onClick={() => togglePlan(plan.id)}
                >
                  {plan.expanded ? (
                    <ChevronDown className="w-4 h-4 text-[#64748B]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#64748B]" />
                  )}
                  <span className="text-sm font-semibold text-[#1F3A5F]">{plan.name}</span>
                </div>

                {plan.expanded && (
                  <div className="ml-5">
                    {plan.phases.length === 0 && (
                      <div className="p-2 text-xs text-[#64748B]">
                        This plan has no procedures.
                      </div>
                    )}
                    {plan.phases.map((phase) => (
                      <div key={phase.id} className="mb-1">
                        <div
                          className="flex items-center gap-1 cursor-pointer hover:bg-[#F7F9FC] p-1 rounded group"
                          onClick={() => togglePhase(plan.id, phase.id)}
                        >
                          {phase.expanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
                          )}
                          <span className="text-sm font-medium text-[#3A6EA5]">{phase.name}</span>
                        </div>

                        {phase.expanded && (
                          <div className="ml-5">
                            {phase.procedures.map((procedure) => (
                              <div
                                key={procedure.id}
                                className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                                  selectedProcedures.includes(procedure.id)
                                    ? 'bg-[#E8EFF7] border border-[#3A6EA5]'
                                    : 'hover:bg-[#F7F9FC]'
                                }`}
                                onClick={() => toggleProcedureSelection(procedure.id)}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedProcedures.includes(procedure.id)}
                                  onChange={() => {}}
                                  className="mt-0.5 w-3.5 h-3.5 rounded border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-[#3A6EA5]">
                                      {procedure.code}
                                    </span>
                                    <span className="text-xs text-[#1E293B]">
                                      {procedure.description}
                                    </span>
                                    {(procedure.tooth || procedure.surface) && (
                                      <span className="text-xs text-[#64748B]">
                                        #{procedure.tooth}
                                        {procedure.surface ? ` ${procedure.surface}` : ''}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-xs text-[#64748B]">
                                    <span>
                                      Provider:{' '}
                                      {providerLabel(procedure.diagnosedProvider) ||
                                        procedure.diagnosedProvider ||
                                        '—'}
                                    </span>
                                    <span>Fee: ${procedure.fee.toFixed(2)}</span>
                                    <span>Est. ins: ${procedure.insuranceEstimate.toFixed(2)}</span>
                                    <span
                                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        procedure.status === 'Planned'
                                          ? 'bg-blue-100 text-blue-700'
                                          : procedure.status === 'Scheduled'
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-green-100 text-green-700'
                                      }`}
                                    >
                                      {procedure.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selection Summary and Action */}
      {selectedProcedures.length > 0 && (
        <div className="bg-[#E8EFF7] border-2 border-[#3A6EA5] rounded-lg p-3 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold text-[#1F3A5F]">{selectedProcedures.length}</span>
            <span className="text-[#64748B] ml-1">procedure(s) selected</span>
          </div>
          <button
            onClick={handleApplyToAppointment}
            className="bg-[#3A6EA5] text-white px-4 py-2 rounded-lg hover:bg-[#1F3A5F] transition-colors text-sm font-medium"
          >
            Apply to Appointment
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg p-3 text-xs text-[#64748B]">
        <p>
          <strong className="text-[#1F3A5F]">Note:</strong> Treatment Plans show diagnosed
          procedures that have been planned but not yet completed. Applying them here attaches
          them to this appointment (they keep their link back to the plan). The plan itself is
          managed on the patient's Treatment Plan screen.
        </p>
      </div>
    </div>
  );
}
