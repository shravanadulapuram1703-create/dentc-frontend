import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle } from "lucide-react";

// ProcedureCode interface that matches backend structure
interface ProcedureCode {
  code: string;
  userCode?: string;
  description: string;
  category: string;
  requirements: {
    tooth?: boolean;
    surface?: boolean;
    quadrant?: boolean;
    materials?: boolean;
  };
  anatomyRules: {
    mode: "TOOTH" | "QUADRANT" | "ARCH" | "FULL_MOUTH" | "NONE";
    allowedToothSet: "PERMANENT_ONLY" | "PRIMARY_ONLY" | "BOTH" | "NONE";
    allowedQuadrants?: ("UR" | "UL" | "LR" | "LL" | "UA" | "LA" | "FM")[];
    allowMultipleTeeth: boolean;
  };
  surfaceRules: {
    enabled: boolean;
    min?: number;
    max?: number;
    allowedSurfaces?: string[];
  };
  materialsRules: {
    enabled: boolean;
    options?: string[];
    min?: number;
    max?: number;
  };
  defaultFee?: number;
  defaultDuration?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    tooth: string;
    quadrant: string;
    surfaces: string[];
    materials: string[];
  }) => void;
  procedure: ProcedureCode;
  initialTooth?: string;
  initialQuadrant?: string;
  initialSurfaces?: string[];
  initialMaterials?: string[];
}

// Permanent teeth (1-32) for adult dentition
const PERMANENT_TEETH = Array.from({ length: 32 }, (_, i) =>
  (i + 1).toString(),
);

// Primary teeth (A-T) for pediatric dentition
const PRIMARY_TEETH = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
];

export default function ToothSurfaceEnforcement({
  isOpen,
  onClose,
  onSave,
  procedure,
  initialTooth = "",
  initialQuadrant = "",
  initialSurfaces = [],
  initialMaterials = [],
}: Props) {
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>(
    initialTooth ? [initialTooth] : [],
  );
  const [selectedQuadrant, setSelectedQuadrant] =
    useState(initialQuadrant);
  const [selectedSurfaces, setSelectedSurfaces] =
    useState<string[]>(initialSurfaces);
  const [selectedMaterials, setSelectedMaterials] =
    useState<string[]>(initialMaterials);
  const [validationErrors, setValidationErrors] = useState<
    string[]
  >([]);

  // Reset state when modal opens or initial values change
  useEffect(() => {
    if (isOpen) {
      setSelectedTeeth(initialTooth ? [initialTooth] : []);
      setSelectedQuadrant(initialQuadrant);
      setSelectedSurfaces(initialSurfaces);
      setSelectedMaterials(initialMaterials);
      setValidationErrors([]);
    }
  }, [isOpen, initialTooth, initialQuadrant, initialSurfaces, initialMaterials]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Early return if modal is not open
  if (!isOpen) return null;

  // ✅ MUTUAL EXCLUSIVITY: Determine active mode
  // Add safety checks for procedure structure BEFORE accessing properties
  if (!procedure || !procedure.anatomyRules || !procedure.surfaceRules || !procedure.materialsRules) {
    console.error("Invalid procedure structure:", procedure);
    return createPortal(
      <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-slate-700 mb-4">
            Invalid procedure configuration. The procedure "{procedure?.code || 'Unknown'}" is missing required rules.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#3A6EA5] text-white rounded hover:bg-[#2d5080]"
          >
            Close
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // Now safe to access anatomyRules
  const activeMode = procedure.anatomyRules.mode;

  // ✅ Get allowed teeth based on procedure rules
  const getAllowedTeeth = (): string[] => {
    if (!procedure?.anatomyRules) return [];
    const toothSet = procedure.anatomyRules.allowedToothSet;
    if (toothSet === "PERMANENT_ONLY") return PERMANENT_TEETH;
    if (toothSet === "PRIMARY_ONLY") return PRIMARY_TEETH;
    if (toothSet === "BOTH")
      return [...PERMANENT_TEETH, ...PRIMARY_TEETH];
    return [];
  };

  // ✅ Get allowed quadrants from procedure rules
  const getAllowedQuadrants = () => {
    if (!procedure?.anatomyRules) return [];
    return procedure.anatomyRules.allowedQuadrants || [];
  };

  // ✅ Get allowed surfaces from procedure rules
  const getAllowedSurfaces = () => {
    if (!procedure?.surfaceRules || !procedure.surfaceRules.enabled) return [];
    return (
      procedure.surfaceRules.allowedSurfaces || [
        "M",
        "O",
        "D",
        "B",
        "L",
        "I",
        "F",
      ]
    );
  };

  // ✅ Get allowed materials from procedure rules
  const getAllowedMaterials = () => {
    if (!procedure?.materialsRules || !procedure.materialsRules.enabled) return [];
    return (
      procedure.materialsRules.options || [
        "High Noble Metal",
        "Base Metal",
        "Noble Metal",
        "Titanium",
        "Resin",
        "Porcelain/Ceramic",
        "Zirconia",
        "E.max",
      ]
    );
  };

  // ✅ MUTUAL EXCLUSIVITY ENFORCEMENT
  const handleToothSelect = (tooth: string) => {
    if (activeMode !== "TOOTH") {
      setValidationErrors([
        "This procedure requires quadrant/arch selection, not individual teeth",
      ]);
      return;
    }

    // Clear quadrant when tooth is selected
    setSelectedQuadrant("");

    if (procedure.anatomyRules.allowMultipleTeeth) {
      setSelectedTeeth((prev) =>
        prev.includes(tooth)
          ? prev.filter((t) => t !== tooth)
          : [...prev, tooth],
      );
    } else {
      setSelectedTeeth([tooth]);
    }
    setValidationErrors([]);
  };

  const handleQuadrantSelect = (quadrant: string) => {
    if (!procedure?.anatomyRules) return;
    
    if (
      activeMode !== "QUADRANT" &&
      activeMode !== "ARCH" &&
      activeMode !== "FULL_MOUTH"
    ) {
      setValidationErrors([
        "This procedure requires tooth selection, not quadrant",
      ]);
      return;
    }

    // Clear teeth when quadrant is selected
    setSelectedTeeth([]);
    setSelectedSurfaces([]);
    setSelectedQuadrant(quadrant);
    setValidationErrors([]);
  };

  const toggleSurface = (surface: string) => {
    if (!procedure?.surfaceRules || !procedure.surfaceRules.enabled) {
      setValidationErrors([
        "Surfaces are not applicable for this procedure",
      ]);
      return;
    }

    const newSelection = selectedSurfaces.includes(surface)
      ? selectedSurfaces.filter((s) => s !== surface)
      : [...selectedSurfaces, surface];

    // Check min/max constraints
    const { max } = procedure.surfaceRules;
    if (max && newSelection.length > max) {
      setValidationErrors([
        `Maximum ${max} surface(s) allowed for this procedure`,
      ]);
      return;
    }

    setSelectedSurfaces(newSelection);
    setValidationErrors([]);
  };

  const toggleMaterial = (material: string) => {
    if (!procedure?.materialsRules || !procedure.materialsRules.enabled) {
      setValidationErrors([
        "Materials are not applicable for this procedure",
      ]);
      return;
    }

    const newSelection = selectedMaterials.includes(material)
      ? selectedMaterials.filter((m) => m !== material)
      : [...selectedMaterials, material];

    // Check min/max constraints
    const { max } = procedure.materialsRules;
    if (max && newSelection.length > max) {
      setValidationErrors([
        `Maximum ${max} material(s) allowed for this procedure`,
      ]);
      return;
    }

    setSelectedMaterials(newSelection);
    setValidationErrors([]);
  };

  const handleSave = () => {
    if (!procedure?.anatomyRules || !procedure?.surfaceRules || !procedure?.materialsRules) {
      setValidationErrors(["Invalid procedure configuration"]);
      return;
    }

    const errors: string[] = [];

    // ✅ COMPREHENSIVE VALIDATION
    if (activeMode === "TOOTH") {
      if (
        procedure.requirements?.tooth &&
        selectedTeeth.length === 0
      ) {
        errors.push("At least one tooth must be selected");
      }
      if (procedure.surfaceRules.enabled) {
        const { min, max } = procedure.surfaceRules;
        if (min && selectedSurfaces.length < min) {
          errors.push(`Minimum ${min} surface(s) required`);
        }
        if (max && selectedSurfaces.length > max) {
          errors.push(`Maximum ${max} surface(s) allowed`);
        }
      }
    }

    if (
      activeMode === "QUADRANT" ||
      activeMode === "ARCH" ||
      activeMode === "FULL_MOUTH"
    ) {
      if (
        procedure.requirements?.quadrant &&
        !selectedQuadrant
      ) {
        errors.push("Quadrant/Arch must be selected");
      }
    }

    if (procedure.materialsRules.enabled) {
      const { min, max } = procedure.materialsRules;
      if (min && selectedMaterials.length < min) {
        errors.push(`Minimum ${min} material(s) required`);
      }
      if (max && selectedMaterials.length > max) {
        errors.push(`Maximum ${max} material(s) allowed`);
      }
    }

    // ✅ MUTUAL EXCLUSIVITY CHECK
    if (selectedTeeth.length > 0 && selectedQuadrant) {
      errors.push(
        "Cannot select both tooth and quadrant - they are mutually exclusive",
      );
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // All validations passed
    onSave({
      tooth: selectedTeeth.join(","),
      quadrant: selectedQuadrant,
      surfaces: selectedSurfaces,
      materials: selectedMaterials,
    });
  };

  if (!isOpen) return null;

  const allowedTeeth = getAllowedTeeth();
  const allowedQuadrants = getAllowedQuadrants();
  const allowedSurfaces = getAllowedSurfaces();
  const allowedMaterials = getAllowedMaterials();

  const modalContent = (
    <div className="fixed inset-0  flex items-center justify-center z-[100] p-4" onClick={(e) => {
      // Close on backdrop click
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-auto border-4 border-[#3A6EA5]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-3 flex items-center justify-between sticky top-0 z-10 rounded-t-lg border-b-4 border-[#1F3A5F]">
          <div>
            <h2 className="text-xl font-bold text-white">
              PROCEDURE ANATOMY ENFORCEMENT
            </h2>
            <p className="text-sm text-white/80">
              {procedure.code} - {procedure.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-[#16314d] rounded p-1 transition-colors"
          >
            <X className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>

        {/* Mode Indicator */}
        <div className="px-6 py-3 bg-[#E0F2FE] border-b-2 border-[#3A6EA5]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#3A6EA5]" />
            <span className="text-sm font-bold text-[#1F3A5F]">
              MODE: {activeMode.replace("_", " ")} |
              {procedure.anatomyRules.allowedToothSet !==
                "NONE" &&
                ` DENTITION: ${procedure.anatomyRules.allowedToothSet.replace("_", " ")}`}
              {procedure.anatomyRules.allowMultipleTeeth &&
                ` | MULTIPLE TEETH ALLOWED`}
            </span>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mx-6 mt-4 bg-red-50 border-2 border-red-400 rounded-lg p-4">
            <h3 className="font-bold text-red-800 mb-2">
              ⚠️ Validation Errors:
            </h3>
            <ul className="space-y-1">
              {validationErrors.map((error, idx) => (
                <li key={idx} className="text-sm text-red-700">
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* TOOTH SELECTION */}
          {activeMode === "TOOTH" &&
            allowedTeeth.length > 0 && (
              <div className="border-2 border-[#E2E8F0] rounded-lg p-4">
                <h3 className="font-bold text-[#1F3A5F] mb-3 uppercase tracking-wide">
                  SELECT TOOTH # (
                  {procedure.anatomyRules.allowMultipleTeeth
                    ? "Multiple Allowed"
                    : "Single Only"}
                  )
                </h3>

                {/* Permanent Teeth Grid */}
                {procedure.anatomyRules.allowedToothSet !==
                  "PRIMARY_ONLY" && (
                  <div className="mb-4">
                    <p className="text-xs text-[#64748B] mb-2 font-semibold">
                      PERMANENT DENTITION (1-32)
                    </p>
                    <div className="grid grid-cols-16 gap-1">
                      {PERMANENT_TEETH.map((tooth) => (
                        <button
                          key={tooth}
                          onClick={() =>
                            handleToothSelect(tooth)
                          }
                          disabled={
                            procedure.anatomyRules
                              .allowedToothSet ===
                            "PRIMARY_ONLY"
                          }
                          className={`
                          px-2 py-2 rounded font-bold text-sm transition-all
                          ${
                            selectedTeeth.includes(tooth)
                              ? "bg-[#3A6EA5] text-white ring-2 ring-[#1F3A5F]"
                              : procedure.anatomyRules
                                    .allowedToothSet ===
                                  "PRIMARY_ONLY"
                                ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                : "bg-[#E2E8F0] text-[#1F3A5F] hover:bg-[#CBD5E1]"
                          }
                        `}
                        >
                          {tooth}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Primary Teeth Grid */}
                {procedure.anatomyRules.allowedToothSet !==
                  "PERMANENT_ONLY" && (
                  <div>
                    <p className="text-xs text-[#64748B] mb-2 font-semibold">
                      PRIMARY DENTITION (A-T)
                    </p>
                    <div className="grid grid-cols-20 gap-1">
                      {PRIMARY_TEETH.map((tooth) => (
                        <button
                          key={tooth}
                          onClick={() =>
                            handleToothSelect(tooth)
                          }
                          disabled={
                            procedure.anatomyRules
                              .allowedToothSet ===
                            "PERMANENT_ONLY"
                          }
                          className={`
                          px-2 py-2 rounded font-bold text-sm transition-all
                          ${
                            selectedTeeth.includes(tooth)
                              ? "bg-[#2FB9A7] text-white ring-2 ring-[#1F7F73]"
                              : procedure.anatomyRules
                                    .allowedToothSet ===
                                  "PERMANENT_ONLY"
                                ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                : "bg-[#D1FAE5] text-[#1F7F73] hover:bg-[#A7F3D0]"
                          }
                        `}
                        >
                          {tooth}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTeeth.length > 0 && (
                  <div className="mt-3 p-2 bg-[#E0F2FE] rounded">
                    <span className="text-sm font-semibold text-[#3A6EA5]">
                      Selected: {selectedTeeth.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            )}

          {/* QUADRANT / ARCH / FULL MOUTH SELECTION */}
          {(activeMode === "QUADRANT" ||
            activeMode === "ARCH" ||
            activeMode === "FULL_MOUTH") &&
            allowedQuadrants.length > 0 && (
              <div className="border-2 border-[#E2E8F0] rounded-lg p-4">
                <h3 className="font-bold text-[#1F3A5F] mb-3 uppercase tracking-wide">
                  SELECT{" "}
                  {activeMode === "FULL_MOUTH"
                    ? "FULL MOUTH"
                    : activeMode === "ARCH"
                      ? "ARCH"
                      : "QUADRANT"}
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    {
                      value: "UR",
                      label: "UR - Upper Right",
                      description: "Quadrant 1",
                    },
                    {
                      value: "UL",
                      label: "UL - Upper Left",
                      description: "Quadrant 2",
                    },
                    {
                      value: "LR",
                      label: "LR - Lower Right",
                      description: "Quadrant 4",
                    },
                    {
                      value: "LL",
                      label: "LL - Lower Left",
                      description: "Quadrant 3",
                    },
                    {
                      value: "UA",
                      label: "UA - Upper Arch",
                      description: "Maxillary",
                    },
                    {
                      value: "LA",
                      label: "LA - Lower Arch",
                      description: "Mandibular",
                    },
                    {
                      value: "FM",
                      label: "FM - Full Mouth",
                      description: "All Teeth",
                    },
                  ]
                    .filter((quad) =>
                      allowedQuadrants.includes(
                        quad.value as any,
                      ),
                    )
                    .map((quad) => (
                      <button
                        key={quad.value}
                        onClick={() =>
                          handleQuadrantSelect(quad.value)
                        }
                        className={`
                      p-4 rounded-lg border-2 transition-all text-left
                      ${
                        selectedQuadrant === quad.value
                          ? "bg-[#3A6EA5] text-white border-[#1F3A5F] ring-2 ring-[#3A6EA5]"
                          : "bg-white text-[#1F3A5F] border-[#E2E8F0] hover:border-[#3A6EA5] hover:bg-[#F7F9FC]"
                      }
                    `}
                      >
                        <div className="font-bold text-lg">
                          {quad.value}
                        </div>
                        <div
                          className={`text-xs mt-1 ${selectedQuadrant === quad.value ? "text-white/90" : "text-[#64748B]"}`}
                        >
                          {quad.description}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}

          {/* SURFACE SELECTION */}
          {procedure.surfaceRules.enabled &&
            allowedSurfaces.length > 0 &&
            selectedTeeth.length > 0 && (
              <div className="border-2 border-[#E2E8F0] rounded-lg p-4">
                <h3 className="font-bold text-[#1F3A5F] mb-3 uppercase tracking-wide">
                  SELECT SURFACES
                  {procedure.surfaceRules.min &&
                    procedure.surfaceRules.max &&
                    ` (${procedure.surfaceRules.min} - ${procedure.surfaceRules.max} Required)`}
                </h3>
                <div className="flex gap-2">
                  {allowedSurfaces.map((surface) => (
                    <button
                      key={surface}
                      onClick={() => toggleSurface(surface)}
                      className={`
                      w-12 h-12 rounded font-bold text-lg transition-all
                      ${
                        selectedSurfaces.includes(surface)
                          ? "bg-[#3A6EA5] text-white ring-2 ring-[#1F3A5F]"
                          : "bg-[#E2E8F0] text-[#64748B] hover:bg-[#CBD5E1]"
                      }
                    `}
                    >
                      {surface}
                    </button>
                  ))}
                </div>
                {selectedSurfaces.length > 0 && (
                  <div className="mt-3 p-2 bg-[#E0F2FE] rounded">
                    <span className="text-sm font-semibold text-[#3A6EA5]">
                      Selected: {selectedSurfaces.join("")}
                    </span>
                  </div>
                )}
              </div>
            )}

          {/* MATERIALS SELECTION */}
          {procedure.materialsRules.enabled &&
            allowedMaterials.length > 0 && (
              <div className="border-2 border-[#E2E8F0] rounded-lg p-4">
                <h3 className="font-bold text-[#1F3A5F] mb-3 uppercase tracking-wide">
                  SELECT MATERIALS
                  {procedure.materialsRules.min &&
                    procedure.materialsRules.max &&
                    ` (${procedure.materialsRules.min} - ${procedure.materialsRules.max} Required)`}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {allowedMaterials.map((material) => (
                    <label
                      key={material}
                      className={`
                      flex items-center gap-3 p-3 rounded border-2 cursor-pointer transition-all
                      ${
                        selectedMaterials.includes(material)
                          ? "bg-[#3A6EA5]/10 border-[#3A6EA5] ring-2 ring-[#3A6EA5]/30"
                          : "bg-white border-[#E2E8F0] hover:border-[#3A6EA5] hover:bg-[#F7F9FC]"
                      }
                    `}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMaterials.includes(
                          material,
                        )}
                        onChange={() =>
                          toggleMaterial(material)
                        }
                        className="w-5 h-5 rounded border-2 border-[#3A6EA5] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                      />
                      <span className="text-sm font-semibold text-[#1E293B]">
                        {material}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

          {/* Requirements Checklist */}
          <div className="bg-[#FEF3C7] border-2 border-[#F59E0B] rounded-lg p-4">
            <h3 className="font-bold text-[#92400E] mb-2">
              ✓ Requirements Checklist:
            </h3>
            <ul className="space-y-1 text-sm text-[#92400E]">
              {activeMode === "TOOTH" &&
                procedure.requirements.tooth && (
                  <li
                    className={
                      selectedTeeth.length > 0
                        ? "line-through text-[#2FB9A7]"
                        : ""
                    }
                  >
                    • Tooth selection{" "}
                    {selectedTeeth.length === 0 && "(Required)"}
                  </li>
                )}
              {(activeMode === "QUADRANT" ||
                activeMode === "ARCH" ||
                activeMode === "FULL_MOUTH") &&
                procedure.requirements.quadrant && (
                  <li
                    className={
                      selectedQuadrant
                        ? "line-through text-[#2FB9A7]"
                        : ""
                    }
                  >
                    • {activeMode.replace("_", " ")} selection{" "}
                    {!selectedQuadrant && "(Required)"}
                  </li>
                )}
              {procedure.surfaceRules.enabled && (
                <li
                  className={
                    selectedSurfaces.length >=
                    (procedure.surfaceRules.min || 0)
                      ? "line-through text-[#2FB9A7]"
                      : ""
                  }
                >
                  • Surfaces ({procedure.surfaceRules.min || 0}{" "}
                  - {procedure.surfaceRules.max || "∞"}){" "}
                  {selectedSurfaces.length <
                    (procedure.surfaceRules.min || 0) &&
                    "(Required)"}
                </li>
              )}
              {procedure.materialsRules.enabled && (
                <li
                  className={
                    selectedMaterials.length >=
                    (procedure.materialsRules.min || 0)
                      ? "line-through text-[#2FB9A7]"
                      : ""
                  }
                >
                  • Materials (
                  {procedure.materialsRules.min || 0} -{" "}
                  {procedure.materialsRules.max || "∞"}){" "}
                  {selectedMaterials.length <
                    (procedure.materialsRules.min || 0) &&
                    "(Required)"}
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#F7F9FC] border-t-2 border-[#E2E8F0] px-6 py-3 flex items-center justify-end gap-3 sticky bottom-0 rounded-b-lg">
          <button
            onClick={handleSave}
            className="px-8 py-2 bg-[#2FB9A7] hover:bg-[#26a396] text-white rounded font-bold transition-colors"
          >
            ✓ SAVE & APPLY
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

  // Render modal using portal at document body level
  return createPortal(modalContent, document.body);
}
