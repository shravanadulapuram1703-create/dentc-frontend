import { Plus, Edit2, Trash2, Activity } from "lucide-react";
import { useState } from "react";
import { type Office } from "../../../../data/officeData";

interface OperatoriesTabProps {
  formData: Partial<Office>;
  updateFormData: (updates: Partial<Office>) => void;
}

export default function OperatoriesTab({
  formData,
  updateFormData,
}: OperatoriesTabProps) {
  const [newOpName, setNewOpName] = useState("");
  const [editingOpId, setEditingOpId] = useState<string | null>(null);
  const [editOpName, setEditOpName] = useState("");

  const operatories = formData.operatories || [];

  const handleAddOperatory = () => {
    if (!newOpName.trim()) return;

    const newOp = {
      id: `op-${Date.now()}`,
      name: newOpName,
      order: operatories.length + 1,
    };

    updateFormData({
      operatories: [...operatories, newOp],
    });

    setNewOpName("");
  };

  const handleEditOperatory = (opId: string) => {
    const op = operatories.find((o) => o.id === opId);
    if (op) {
      setEditingOpId(opId);
      setEditOpName(op.name);
    }
  };

  const handleSaveEdit = () => {
    if (!editOpName.trim()) return;

    const updated = operatories.map((op) =>
      op.id === editingOpId ? { ...op, name: editOpName } : op
    );

    updateFormData({ operatories: updated });
    setEditingOpId(null);
    setEditOpName("");
  };

  const handleDeleteOperatory = (opId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this operatory? This cannot be undone if there are future appointments."
      )
    )
      return;

    const updated = operatories
      .filter((op) => op.id !== opId)
      .map((op, index) => ({ ...op, order: index + 1 }));

    updateFormData({ operatories: updated });
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
            <p className="text-sm text-slate-500 mt-1">
              Add operatories to configure scheduler columns
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {operatories.map((op) => (
              <div
                key={op.id}
                className="flex items-center gap-3 p-4 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                  {op.order}
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
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{op.name}</p>
                    <p className="text-xs text-slate-500">
                      Order: {op.order} • ID: {op.id}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  {editingOpId === op.id ? (
                    <button
                      onClick={handleSaveEdit}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
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
          <h4 className="font-bold text-blue-900 mb-2">
            Scheduler Column Mapping Preview
          </h4>
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
          <p className="text-xs text-blue-700 mt-2">
            These operatories will appear as columns in the Scheduler
          </p>
        </div>
      )}
    </div>
  );
}
