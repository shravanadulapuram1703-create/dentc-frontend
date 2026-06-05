import { Plus, Edit2, Trash2, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { type OfficeForm, type OperatoryUi } from "../../../../data/officeData";
import { fetchProviders, type Provider } from "../../../../services/schedulerApi";

interface OperatoriesTabProps {
  formData: Partial<OfficeForm>;
  updateFormData: (updates: Partial<OfficeForm>) => void;
}

export default function OperatoriesTab({
  formData,
  updateFormData,
}: OperatoriesTabProps) {
  const [newOpName, setNewOpName] = useState("");
  const [editingOpId, setEditingOpId] = useState<string | null>(null);
  const [editOpName, setEditOpName] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [providersLoading, setProvidersLoading] = useState(false);

  // Load this office's providers from the backend (/api/v1/providers, scoped by
  // office id) so the "Default provider" dropdown is backend-driven.
  useEffect(() => {
    if (formData.id == null) {
      setProviders([]);
      setProvidersError(null);
      return;
    }
    let cancelled = false;
    const loadProviders = async () => {
      setProvidersLoading(true);
      setProvidersError(null);
      try {
        const data = await fetchProviders(String(formData.id));
        if (!cancelled) setProviders(data);
      } catch (error) {
        console.error("Error loading providers for operatories:", error);
        if (!cancelled) setProvidersError("Unable to load providers for this office.");
      } finally {
        if (!cancelled) setProvidersLoading(false);
      }
    };
    void loadProviders();
    return () => {
      cancelled = true;
    };
  }, [formData.id]);

  const operatories: OperatoryUi[] =
    [...(formData.operatories ?? [])].sort((a, b) => a.display_order - b.display_order);

  /* -------------------- ADD -------------------- */
  const handleAddOperatory = () => {
    if (!newOpName.trim()) return;

    const tempOp: OperatoryUi = {
      id: `temp-${Date.now()}`, // replaced by backend on save
      name: newOpName.trim(),
      display_order: operatories.length + 1,
      is_active: true,
    };

    updateFormData({ operatories: [...operatories, tempOp] });
    setNewOpName("");
  };

  /* -------------------- EDIT -------------------- */
  const handleEditOperatory = (opId: string) => {
    const op = operatories.find((o) => o.id === opId);
    if (!op) return;
    setEditingOpId(opId);
    setEditOpName(op.name);
  };

  const handleSaveEdit = () => {
    if (!editOpName.trim() || !editingOpId) return;
    updateFormData({
      operatories: operatories.map((op) =>
        op.id === editingOpId ? { ...op, name: editOpName.trim() } : op
      ),
    });
    setEditingOpId(null);
    setEditOpName("");
  };

  /* -------------------- DELETE (SOFT) -------------------- */
  const handleDeleteOperatory = (opId: string) => {
    const op = operatories.find((o) => o.id === opId);
    if (!op) return;

    if (op.has_future_appointments) {
      alert("This operatory has future appointments and cannot be deleted.");
      return;
    }

    if (!confirm("Are you sure you want to delete this operatory?")) return;

    const updated = operatories
      .map((o) => (o.id === opId ? { ...o, is_active: false } : o))
      .filter((o) => o.is_active)
      .map((o, index) => ({ ...o, display_order: index + 1 }));

    updateFormData({ operatories: updated });
  };

  /* -------------------- REORDER -------------------- */
  const updateOrder = (updated: OperatoryUi[]) => {
    const normalized = updated
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map((op, index) => ({ ...op, display_order: index + 1 }));
    updateFormData({ operatories: normalized });
  };

  const handleMoveUp = (opId: string) => {
    const index = operatories.findIndex((o) => o.id === opId);
    if (index <= 0) return;

    const updated = [...operatories];
    const prevOp = updated[index - 1];
    const currentOp = updated[index];
    if (!prevOp || !currentOp) return;

    const tempOrder = prevOp.display_order;
    updated[index - 1] = { ...prevOp, display_order: currentOp.display_order };
    updated[index] = { ...currentOp, display_order: tempOrder };

    updateOrder(updated);
  };

  const handleMoveDown = (opId: string) => {
    const index = operatories.findIndex((o) => o.id === opId);
    if (index === -1 || index >= operatories.length - 1) return;

    const updated = [...operatories];
    const nextOp = updated[index + 1];
    const currentOp = updated[index];
    if (!nextOp || !currentOp) return;

    const tempOrder = nextOp.display_order;
    updated[index + 1] = { ...nextOp, display_order: currentOp.display_order };
    updated[index] = { ...currentOp, display_order: tempOrder };

    updateOrder(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">Operatory Guidelines:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Operatories represent physical treatment rooms</li>
            <li>They auto-map to Scheduler columns (OP1, OP2, etc.)</li>
            <li>Cannot delete operatories with future appointments</li>
            <li>Scheduler updates dynamically when operatories change</li>
            <li>
              Default provider is populated from this office's providers, but the
              choice is not yet saved (the operatory API has no provider field —
              backend gap #23)
            </li>
          </ul>
        </div>
      </div>

      {/* Add Operatory */}
      <div className="p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
        <h3 className="font-bold text-slate-900 mb-3">Add New Operatory</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newOpName}
            onChange={(e) => setNewOpName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddOperatory()}
            placeholder="Operatory name (e.g., OP 1, Hygiene 1)"
            className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleAddOperatory}
            disabled={!newOpName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Operatory List */}
      <div>
        <h3 className="font-bold text-slate-900 mb-3">
          Current Operatories ({operatories.length})
        </h3>

        {operatories.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No operatories defined</p>
            <p className="text-sm text-slate-500 mt-1">Add operatories to configure scheduler columns</p>
          </div>
        ) : (
          <div className="space-y-2">
            {operatories.map((op, idx) => (
              <div
                key={op.id}
                className="flex items-center gap-3 p-4 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                  {op.display_order}
                </div>

                {editingOpId === op.id ? (
                  <input
                    type="text"
                    value={editOpName}
                    onChange={(e) => setEditOpName(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSaveEdit()}
                    onBlur={handleSaveEdit}
                    autoFocus
                    className="flex-1 px-3 py-1.5 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="flex-1 space-y-1">
                    {/* Screenshot columns: Operatory Name (bold) + Operatory ID */}
                    <p className="font-bold text-slate-900">{op.name}</p>
                    <p className="text-xs text-slate-500">
                      Operatory ID: <span className="font-semibold">{op.id}</span>
                      <span className="mx-1">•</span>
                      Order: {op.display_order}
                    </p>

                    {/* Default provider selector (backend-driven, /api/v1/providers) */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-600">Default provider:</span>
                      {providersLoading ? (
                        <span className="text-slate-400 italic">Loading providers…</span>
                      ) : providersError ? (
                        <span className="text-red-600">{providersError}</span>
                      ) : (
                        <>
                          <select
                            className="border border-slate-300 rounded px-2 py-1 text-xs bg-white disabled:bg-slate-100"
                            value={op.default_provider_id ?? ""}
                            disabled={providers.length === 0}
                            onChange={(e) => {
                              const providerId = e.target.value || undefined;
                              const provider = providers.find((p) => String(p.id) === providerId);
                              const updated = operatories.map((o) =>
                                o.id === op.id
                                  ? {
                                      ...o,
                                      default_provider_id: providerId,
                                      default_provider_name: provider?.name ?? undefined,
                                    }
                                  : o
                              );
                              updateFormData({ operatories: updated });
                            }}
                          >
                            <option value="">None</option>
                            {providers.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          {providers.length === 0 && (
                            <span className="text-slate-400 italic">No providers configured for this office</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {/* Order controls */}
                  <div className="flex flex-col gap-1 mr-2">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveUp(op.id)}
                      className="px-1 py-0.5 text-xs rounded border border-slate-300 disabled:opacity-40"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={idx === operatories.length - 1}
                      onClick={() => handleMoveDown(op.id)}
                      className="px-1 py-0.5 text-xs rounded border border-slate-300 disabled:opacity-40"
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>

                  {editingOpId === op.id ? (
                    <button onClick={handleSaveEdit} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Save
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEditOperatory(op.id)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit operatory"
                      >
                        <Edit2 className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteOperatory(op.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete operatory"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scheduler Mapping Preview */}
      {operatories.length > 0 && (
        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <h4 className="font-bold text-blue-900 mb-2">Scheduler Column Mapping Preview</h4>
          <div className="flex flex-wrap gap-2">
            {operatories.map((op) => (
              <div
                key={op.id}
                className="px-3 py-1.5 bg-white border-2 border-blue-300 rounded-lg text-sm font-semibold text-blue-700"
              >
                {op.name}
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-700 mt-2">These operatories will appear as columns in the Scheduler</p>
        </div>
      )}
    </div>
  );
}
