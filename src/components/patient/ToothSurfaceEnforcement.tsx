import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    tooth: string;
    quadrant: string;
    surfaces: string[];
    materials: string[];
  }) => void;
  procedureCode: string;
  procedureDescription: string;
  initialTooth?: string;
  initialQuadrant?: string;
  initialSurfaces?: string[];
  initialMaterials?: string[];
}

export default function ToothSurfaceEnforcement({
  isOpen,
  onClose,
  onSave,
  procedureCode,
  procedureDescription,
  initialTooth = '',
  initialQuadrant = '',
  initialSurfaces = [],
  initialMaterials = []
}: Props) {
  const [toothNumber, setToothNumber] = useState(initialTooth);
  const [selectedQuadrant, setSelectedQuadrant] = useState(initialQuadrant);
  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>(initialSurfaces);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>(initialMaterials);

  // Available surfaces
  const surfaces = ['M', 'O', 'D', 'B', 'L', 'I', 'F'];
  
  // Available quadrants
  const quadrants = [
    { value: 'UR', label: 'UR - Upper Right' },
    { value: 'UL', label: 'UL - Upper Left' },
    { value: 'LR', label: 'LR - Lower Right' },
    { value: 'LL', label: 'LL - Lower Left' }
  ];

  // Materials for this procedure (code-driven)
  const materials = [
    { value: 'High Noble Metal', label: 'Cast High Noble Metal' },
    { value: 'Base Metal', label: 'Cast Base Metal' },
    { value: 'Noble Metal', label: 'Cast Noble Metal' },
    { value: 'Titanium', label: 'Titanium' },
    { value: 'Resin', label: 'Resin Based Composite' }
  ];

  const toggleSurface = (surface: string) => {
    setSelectedSurfaces(prev => 
      prev.includes(surface)
        ? prev.filter(s => s !== surface)
        : [...prev, surface]
    );
  };

  const toggleMaterial = (material: string) => {
    setSelectedMaterials(prev => 
      prev.includes(material)
        ? prev.filter(m => m !== material)
        : [...prev, material]
    );
  };

  const handleSave = () => {
    // STEP 5.4: Validation
    if (!toothNumber) {
      alert('Tooth # is required');
      return;
    }

    if (!selectedQuadrant) {
      alert('Quadrant is required');
      return;
    }

    if (selectedSurfaces.length === 0) {
      alert('At least one surface must be selected');
      return;
    }

    if (selectedMaterials.length === 0) {
      alert('At least one material must be selected');
      return;
    }

    // All validations passed
    onSave({
      tooth: toothNumber,
      quadrant: selectedQuadrant,
      surfaces: selectedSurfaces,
      materials: selectedMaterials
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl border-4 border-blue-500">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-3 flex items-center justify-between rounded-t-lg border-b-4 border-blue-700">
          <h2 className="text-xl font-bold text-white">TOOTH / SURFACE / QUADRANT</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 rounded p-1 transition-colors"
          >
            <X className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>

        {/* Instruction */}
        <div className="px-6 py-3 bg-blue-50 border-b-2 border-blue-200">
          <p className="text-sm font-bold text-blue-900 uppercase">
            Please specify tooth# and/or surface(s) for the procedure.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Procedure Info */}
          <div className="mb-6 pb-4 border-b-2 border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-blue-700 text-white">
                <tr>
                  <th className="px-4 py-2 text-left font-bold">CODE</th>
                  <th className="px-4 py-2 text-left font-bold">Description</th>
                  <th className="px-4 py-2 text-left font-bold">Tooth#</th>
                  <th className="px-4 py-2 text-left font-bold">Quadrant</th>
                  <th className="px-4 py-2 text-left font-bold">Surfaces</th>
                  <th className="px-4 py-2 text-left font-bold">Materials</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-3">
                    <span className="text-blue-700 font-bold text-base">{procedureCode}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-900">{procedureDescription}</td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={toothNumber}
                      onChange={(e) => setToothNumber(e.target.value)}
                      className="w-20 px-3 py-2 border-2 border-blue-400 rounded text-center font-semibold"
                      placeholder="##"
                      maxLength={2}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={selectedQuadrant}
                      onChange={(e) => setSelectedQuadrant(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-blue-400 rounded text-sm"
                    >
                      <option value="">-- Select --</option>
                      {quadrants.map((quad) => (
                        <option key={quad.value} value={quad.value}>
                          {quad.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {surfaces.map((surface) => (
                        <button
                          key={surface}
                          onClick={() => toggleSurface(surface)}
                          className={`w-8 h-8 rounded font-bold text-sm transition-colors ${
                            selectedSurfaces.includes(surface)
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {surface}
                        </button>
                      ))}
                    </div>
                    {selectedSurfaces.length > 0 && (
                      <div className="text-xs text-blue-700 font-semibold mt-1">
                        Selected: {selectedSurfaces.join('')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {materials.map((material) => (
                        <label key={material.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedMaterials.includes(material.value)}
                            onChange={() => toggleMaterial(material.value)}
                            className="w-4 h-4 rounded border-2 border-blue-400"
                          />
                          <span className="text-sm text-slate-900">{material.label}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Validation Messages */}
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
            <h3 className="font-bold text-yellow-900 mb-2">⚠️ Required Fields:</h3>
            <ul className="space-y-1 text-sm text-yellow-900">
              <li className={toothNumber ? 'line-through text-green-700' : ''}>
                ✓ Tooth # {!toothNumber && '(Required)'}
              </li>
              <li className={selectedQuadrant ? 'line-through text-green-700' : ''}>
                ✓ Quadrant {!selectedQuadrant && '(Required)'}
              </li>
              <li className={selectedSurfaces.length > 0 ? 'line-through text-green-700' : ''}>
                ✓ At least one Surface {selectedSurfaces.length === 0 && '(Required)'}
              </li>
              <li className={selectedMaterials.length > 0 ? 'line-through text-green-700' : ''}>
                ✓ At least one Material {selectedMaterials.length === 0 && '(Required)'}
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 border-t-2 border-slate-300 px-6 py-3 flex items-center justify-end gap-3 rounded-b-lg">
          <button
            onClick={handleSave}
            disabled={!toothNumber || !selectedQuadrant || selectedSurfaces.length === 0 || selectedMaterials.length === 0}
            className={`px-8 py-2 rounded font-bold ${
              toothNumber && selectedQuadrant && selectedSurfaces.length > 0 && selectedMaterials.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            ✓ SAVE
          </button>
          <button
            onClick={onClose}
            className="px-8 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded"
          >
            ✗ CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
