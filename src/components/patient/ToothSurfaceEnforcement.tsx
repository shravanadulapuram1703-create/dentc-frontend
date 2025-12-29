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
  requirements: {
    tooth?: boolean;
    surface?: boolean;
    quadrant?: boolean;
    materials?: boolean;
  };
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
  requirements,
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
    if (requirements.tooth && !toothNumber) {
      alert('Tooth # is required');
      return;
    }

    if (requirements.quadrant && !selectedQuadrant) {
      alert('Quadrant is required');
      return;
    }

    if (requirements.surface && selectedSurfaces.length === 0) {
      alert('At least one surface must be selected');
      return;
    }

    if (requirements.materials && selectedMaterials.length === 0) {
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
    <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl border-4 border-[#3A6EA5]">
        {/* Header - Medical Slate Theme */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-3 flex items-center justify-between rounded-t-lg border-b-4 border-[#1F3A5F]">
          <h2 className="text-xl font-bold text-white">TOOTH / SURFACE / QUADRANT</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-[#16314d] rounded p-1 transition-colors"
          >
            <X className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>

        {/* Instruction - Medical Slate Theme */}
        <div className="px-6 py-3 bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
          <p className="text-sm font-bold text-[#1F3A5F] uppercase">
            Please specify tooth# and/or surface(s) for the procedure.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 bg-white">
          {/* Procedure Info */}
          <div className="mb-6 pb-4 border-b-2 border-[#E2E8F0]">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white">
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
                <tr className="border-b border-[#E2E8F0]">
                  <td className="px-4 py-3">
                    <span className="text-[#3A6EA5] font-bold text-base">{procedureCode}</span>
                  </td>
                  <td className="px-4 py-3 text-[#1E293B]">{procedureDescription}</td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={toothNumber}
                      onChange={(e) => setToothNumber(e.target.value)}
                      className="w-20 px-3 py-2 border-2 border-[#3A6EA5] rounded text-center font-semibold focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent"
                      placeholder="##"
                      maxLength={2}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={selectedQuadrant}
                      onChange={(e) => setSelectedQuadrant(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-[#3A6EA5] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-transparent"
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
                              ? 'bg-[#3A6EA5] text-white'
                              : 'bg-[#E2E8F0] text-[#64748B] hover:bg-[#CBD5E1]'
                          }`}
                        >
                          {surface}
                        </button>
                      ))}
                    </div>
                    {selectedSurfaces.length > 0 && (
                      <div className="text-xs text-[#3A6EA5] font-semibold mt-1">
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
                            className="w-4 h-4 rounded border-2 border-[#3A6EA5] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                          />
                          <span className="text-sm text-[#1E293B]">{material.label}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Validation Messages - Medical Slate Theme */}
          <div className="bg-[#FEF3C7] border-2 border-[#F59E0B] rounded-lg p-4">
            <h3 className="font-bold text-[#92400E] mb-2">⚠️ Required Fields:</h3>
            <ul className="space-y-1 text-sm text-[#92400E]">
              {requirements.tooth && (
                <li className={toothNumber ? 'line-through text-[#2FB9A7]' : ''}>
                  ✓ Tooth # {!toothNumber && '(Required)'}
                </li>
              )}
              {requirements.quadrant && (
                <li className={selectedQuadrant ? 'line-through text-[#2FB9A7]' : ''}>
                  ✓ Quadrant {!selectedQuadrant && '(Required)'}
                </li>
              )}
              {requirements.surface && (
                <li className={selectedSurfaces.length > 0 ? 'line-through text-[#2FB9A7]' : ''}>
                  ✓ At least one Surface {selectedSurfaces.length === 0 && '(Required)'}
                </li>
              )}
              {requirements.materials && (
                <li className={selectedMaterials.length > 0 ? 'line-through text-[#2FB9A7]' : ''}>
                  ✓ At least one Material {selectedMaterials.length === 0 && '(Required)'}
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer Actions - Medical Slate Theme */}
        <div className="bg-[#F7F9FC] border-t-2 border-[#E2E8F0] px-6 py-3 flex items-center justify-end gap-3 rounded-b-lg">
          <button
            onClick={handleSave}
            className="px-8 py-2 bg-[#2FB9A7] hover:bg-[#26a396] text-white rounded font-bold transition-colors"
          >
            ✓ SAVE
          </button>
          <button
            onClick={onClose}
            className="px-8 py-2 bg-[#64748B] hover:bg-[#475569] text-white font-bold rounded transition-colors"
          >
            ✗ CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
