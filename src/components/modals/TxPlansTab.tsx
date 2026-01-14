import { ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';

interface TxPlanProcedure {
  id: string;
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
  onSelectProcedures: (procedures: TxPlanProcedure[]) => void;
}

export default function TxPlansTab({ onSelectProcedures }: TxPlansTabProps) {
  // Mock Tx Plans data - matching the screenshot structure
  const [txPlans, setTxPlans] = useState<TxPlan[]>([
    {
      id: 'plan-1',
      name: 'Plan 1',
      expanded: true,
      phases: [
        {
          id: 'phase-1',
          name: 'Phase 1',
          expanded: true,
          procedures: [
            {
              id: 'proc-1',
              code: 'Z6000',
              description: 'Impressions Diagnosed (6963/JN, Ahmed, Mary)',
              tooth: '',
              surface: '',
              diagnosedProvider: 'Dr. Ahmed',
              fee: 250.00,
              insuranceEstimate: 0,
              status: 'Planned'
            },
            {
              id: 'proc-2',
              code: 'Z6000',
              description: 'Impressions Diagnosed (6963/JN, Ahmed, Meier)',
              tooth: '',
              surface: '',
              diagnosedProvider: 'Dr. Ahmed',
              fee: 250.00,
              insuranceEstimate: 0,
              status: 'Planned'
            }
          ]
        }
      ]
    }
  ]);

  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);

  const togglePlan = (planId: string) => {
    setTxPlans(txPlans.map(plan => 
      plan.id === planId ? { ...plan, expanded: !plan.expanded } : plan
    ));
  };

  const togglePhase = (planId: string, phaseId: string) => {
    setTxPlans(txPlans.map(plan => 
      plan.id === planId 
        ? {
            ...plan,
            phases: plan.phases.map(phase =>
              phase.id === phaseId ? { ...phase, expanded: !phase.expanded } : phase
            )
          }
        : plan
    ));
  };

  const toggleProcedureSelection = (procedureId: string) => {
    if (selectedProcedures.includes(procedureId)) {
      setSelectedProcedures(selectedProcedures.filter(id => id !== procedureId));
    } else {
      setSelectedProcedures([...selectedProcedures, procedureId]);
    }
  };

  const handleAddTxPlan = () => {
    alert('Open Treatment Plan creation modal');
  };

  const getAllSelectedProcedures = () => {
    const allProcedures: TxPlanProcedure[] = [];
    txPlans.forEach(plan => {
      plan.phases.forEach(phase => {
        phase.procedures.forEach(proc => {
          if (selectedProcedures.includes(proc.id)) {
            allProcedures.push(proc);
          }
        });
      });
    });
    return allProcedures;
  };

  const handleApplyToAppointment = () => {
    const selected = getAllSelectedProcedures();
    if (selected.length === 0) {
      alert('Please select at least one procedure');
      return;
    }
    onSelectProcedures(selected);
    alert(`${selected.length} procedure(s) added to appointment`);
  };

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-[#1F3A5F]">TX PLANS (Treatment Plans)</h4>
        <button
          onClick={handleAddTxPlan}
          className="bg-[#2FB9A7] text-white px-3 py-1 rounded text-xs font-medium hover:bg-[#26a396] transition-colors flex items-center gap-1"
        >
          Add...
        </button>
      </div>

      {/* Tree View */}
      <div className="border-2 border-[#E2E8F0] rounded-lg bg-white max-h-96 overflow-y-auto">
        {txPlans.length === 0 ? (
          <div className="p-8 text-center text-[#64748B] text-sm">
            No treatment plans found. Click "Add..." to create a new treatment plan.
          </div>
        ) : (
          <div className="p-2">
            {txPlans.map(plan => (
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

                {/* Phases (if plan is expanded) */}
                {plan.expanded && (
                  <div className="ml-5">
                    {plan.phases.map(phase => (
                      <div key={phase.id} className="mb-1">
                        {/* Phase Level */}
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

                        {/* Procedures (if phase is expanded) */}
                        {phase.expanded && (
                          <div className="ml-5">
                            {phase.procedures.map(procedure => (
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
                                    <span className="text-xs font-semibold text-[#3A6EA5]">{procedure.code}</span>
                                    <span className="text-xs text-[#1E293B]">{procedure.description}</span>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-xs text-[#64748B]">
                                    <span>Provider: {procedure.diagnosedProvider}</span>
                                    <span>Fee: ${procedure.fee.toFixed(2)}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      procedure.status === 'Planned' ? 'bg-blue-100 text-blue-700' :
                                      procedure.status === 'Scheduled' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>
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
        <p><strong className="text-[#1F3A5F]">Note:</strong> Treatment Plans show diagnosed procedures that have been planned but not yet completed. 
        Selecting procedures here will link them to this appointment. Once the appointment is completed, these procedures will be posted to the ledger and removed from the treatment plan.</p>
      </div>
    </div>
  );
}
