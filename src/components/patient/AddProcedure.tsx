import { useState, useEffect } from "react";
import { X, Search, Loader2 } from "lucide-react";
import ToothSurfaceEnforcement from "./ToothSurfaceEnforcement";
import { components } from "../../styles/theme";
import {
  getProcedureCodes,
  addProcedure,
  type ProcedureCode as BackendProcedureCode,
  type ProcedureCodesResponse,
  type ProcedureCreateRequest,
} from "../../services/ledgerApi";
import { fetchProcedureCategories, fetchProviders, type Provider as SchedulerProvider } from "../../services/schedulerApi";

// Frontend procedure code type (matches what ToothSurfaceEnforcement expects)
interface FrontendProcedureCode {
  code: string;
  userCode: string;
  description: string;
  category: string;
  requirements: {
    tooth: boolean;
    surface: boolean;
    quadrant: boolean;
    materials: boolean;
  };
  defaultFee: number;
  defaultDuration?: number;
}

interface Provider {
  id: string;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientId: string;
  office: string;
  onSave: (procedure: any) => void;
  initialProcedure?: FrontendProcedureCode; // NEW: Preselect a procedure (from Quick Add, Tx Plans, etc.)
}

export default function AddProcedure({
  isOpen,
  onClose,
  patientName,
  patientId,
  office,
  onSave,
  initialProcedure,
}: Props) {
  // 🔹 ADD THE useEffect RIGHT HERE
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // 🔹 NEW: Handle initialProcedure (preselect from Quick Add / Tx Plans)
  useEffect(() => {
    if (initialProcedure && isOpen) {
      // Convert FrontendProcedureCode to BackendProcedureCode format for handleProcedureSelect
      const backendProc: BackendProcedureCode = {
        code: initialProcedure.code,
        user_code: initialProcedure.userCode,
        description: initialProcedure.description,
        category: initialProcedure.category,
        requirements: initialProcedure.requirements,
        is_active: true,
      };
      handleProcedureSelect(backendProc);
    }
  }, [initialProcedure, isOpen]);

  const [activeTab, setActiveTab] = useState<
    "add-procedures" | "payments" | "adjustments"
  >("add-procedures");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toLocaleDateString("en-US"),
  );

  // Procedure search
  const [searchCode, setSearchCode] = useState("");
  const [searchUserCode, setSearchUserCode] = useState("");
  const [searchDescription, setSearchDescription] =
    useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [selectedProvider, setSelectedProvider] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  // Tooth/Surface enforcement
  const [showEnforcement, setShowEnforcement] = useState(false);
  const [toothNumber, setToothNumber] = useState("");
  const [quadrant, setQuadrant] = useState("");
  const [surfaces, setSurfaces] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);

  // Backend-driven state
  const [categories, setCategories] = useState<string[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [procedureCodes, setProcedureCodes] = useState<BackendProcedureCode[]>([]);
  const [selectedProcedure, setSelectedProcedure] = useState<FrontendProcedureCode | null>(null);
  const [allProcedureCodes, setAllProcedureCodes] = useState<BackendProcedureCode[]>([]); // Store all fetched procedure codes for lookup
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingProcedures, setLoadingProcedures] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract numeric office ID from office string or use directly if it's already an ID
  // Handles formats like: "Office Name [108]" -> "108", "OFF-1" -> "1", "1" -> "1"
  // If office prop is already a numeric ID (from patient.officeId), use it directly
  const extractOfficeId = (officeStr: string): string => {
    if (!officeStr) return "";
    
    // If already just a number (officeId passed directly), return as-is
    if (/^\d+$/.test(officeStr.trim())) {
      return officeStr.trim();
    }
    
    // First, try to extract from brackets: "Office Name [108]" -> "108"
    const bracketMatch = officeStr.match(/\[(\d+)\]/);
    if (bracketMatch && bracketMatch[1]) {
      return bracketMatch[1];
    }
    
    // Try to extract number from "OFF-{number}" format: "OFF-1" -> "1"
    const offMatch = officeStr.match(/(?:OFF-|OFF\s*)(\d+)/i);
    if (offMatch && offMatch[1]) {
      return offMatch[1];
    }
    
    // Try to extract any trailing number: "Office Name 108" -> "108"
    const trailingMatch = officeStr.match(/(\d+)$/);
    if (trailingMatch && trailingMatch[1]) {
      return trailingMatch[1];
    }
    
    // If no numeric ID found, return empty string
    return "";
  };

  // Load categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const categoriesData = await fetchProcedureCategories();
        const categoryNames = categoriesData.map(cat => cat.displayName || cat.name);
        // Only use categories from database
        setCategories(categoryNames);
        // Set default category if not set
        if (!selectedCategory && categoryNames.length > 0) {
          const firstCategory = categoryNames[0];
          if (firstCategory) {
            setSelectedCategory(firstCategory);
          }
        }
      } catch (err: any) {
        console.error("Error fetching categories:", err);
        setError("Failed to load procedure categories");
      } finally {
        setLoadingCategories(false);
      }
    };
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  // Load providers from backend (using same API as scheduler)
  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoadingProviders(true);
        const officeId = extractOfficeId(office);
        if (!officeId) {
          setError("Office ID not found. Cannot load providers.");
          setLoadingProviders(false);
          return;
        }
        // Use fetchProviders from schedulerApi (same as scheduler screen)
        // Pass numeric office ID (e.g., "1", "108") not office name
        const providersList: SchedulerProvider[] = await fetchProviders(officeId);
        setProviders(
          providersList.map(p => ({
            id: p.id,
            name: p.name,
          }))
        );
      } catch (err: any) {
        console.error("Error fetching providers:", err);
        setError("Failed to load providers");
      } finally {
        setLoadingProviders(false);
      }
    };
    if (isOpen && office) {
      loadProviders();
    }
  }, [isOpen, office]);

  // Load procedure codes from backend
  useEffect(() => {
    const fetchProcedures = async () => {
      try {
        setLoadingProcedures(true);
        const searchTerm = searchCode || searchDescription || undefined;
        const response: ProcedureCodesResponse = await getProcedureCodes({
          category: selectedCategory,
          search: searchTerm,
        });
        const activeProcedures = response.procedure_codes.filter(p => p.is_active);
        setProcedureCodes(activeProcedures);
        // Store all procedure codes for lookup in ToothSurfaceEnforcement (merge with existing to avoid duplicates)
        setAllProcedureCodes(prev => {
          const existing = new Map(prev.map(p => [p.code, p]));
          activeProcedures.forEach(p => existing.set(p.code, p));
          return Array.from(existing.values());
        });
      } catch (err: any) {
        console.error("Error fetching procedure codes:", err);
        setError("Failed to load procedure codes");
      } finally {
        setLoadingProcedures(false);
      }
    };
    if (isOpen && selectedCategory) {
      fetchProcedures();
    }
  }, [isOpen, selectedCategory, searchCode, searchDescription]);

  // Filter procedures (client-side filtering for user code since API doesn't support it)
  const filteredProcedures = procedureCodes.filter((proc) => {
    const matchesCode =
      searchCode === "" ||
      proc.code
        .toLowerCase()
        .includes(searchCode.toLowerCase());
    const matchesUserCode =
      searchUserCode === "" ||
      (proc.user_code || "")
        .toLowerCase()
        .includes(searchUserCode.toLowerCase());
    const matchesDescription =
      searchDescription === "" ||
      proc.description
        .toLowerCase()
        .includes(searchDescription.toLowerCase());

    return matchesCode && matchesUserCode && matchesDescription;
  });

  const handleProcedureSelect = (procedure: BackendProcedureCode) => {
    // Map backend ProcedureCode to frontend format
    const frontendProcedure: FrontendProcedureCode = {
      code: procedure.code,
      userCode: procedure.user_code || "",
      description: procedure.description,
      category: procedure.category,
      requirements: procedure.requirements,
      defaultFee: procedure.default_fee || 0, // Get from API response
      defaultDuration: procedure.default_duration, // Get from API response
    };
    setSelectedProcedure(frontendProcedure);
    
    // Set duration from API response if available
    if (procedure.default_duration) {
      setDuration(procedure.default_duration.toString());
    }

    // STEP 5: Check if ANY field enforcement is required (data-driven)
    const req = procedure.requirements;
    const needsEnforcement =
      req.tooth || req.surface || req.quadrant || req.materials;

    if (needsEnforcement) {
      setShowEnforcement(true);
    }
  };

  const handleEnforcementSave = (data: {
    tooth: string;
    quadrant: string;
    surfaces: string[];
    materials: string[];
  }) => {
    // Handle comma-separated teeth (for multiple teeth selection)
    setToothNumber(data.tooth);
    setQuadrant(data.quadrant);
    setSurfaces(data.surfaces);
    setMaterials(data.materials);
    setShowEnforcement(false);
  };

  const handleSaveProcedure = async () => {
    // STEP 9-10: Validation and Save
    if (!selectedProcedure) {
      alert("Please select a procedure code");
      return;
    }

    if (!selectedProvider) {
      alert("Please select a treating provider");
      return;
    }

    // ✅ FIELD-SPECIFIC VALIDATION (CORRECT APPROACH)
    const req = selectedProcedure.requirements;
    const errors: string[] = [];

    if (req.tooth && !toothNumber) {
      errors.push("Tooth number");
    }
    if (req.surface && surfaces.length === 0) {
      errors.push("Surface selection");
    }
    if (req.quadrant && !quadrant) {
      errors.push("Quadrant");
    }
    if (req.materials && materials.length === 0) {
      errors.push("Materials");
    }

    if (errors.length > 0) {
      alert(
        `This procedure requires: ${errors.join(", ")}. Please complete the required fields.`,
      );
      setShowEnforcement(true);
      return;
    }

    // Convert transaction date to YYYY-MM-DD format
    const formatDateForAPI = (dateStr: string): string => {
      // If already in YYYY-MM-DD format, return as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      // Try to parse MM/DD/YYYY format
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const month = parts[0];
        const day = parts[1];
        const year = parts[2];
        if (month && day && year) {
          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
      }
      // Fallback to today's date
      return new Date().toISOString().split("T")[0] || new Date().toISOString().substring(0, 10);
    };

      // Get fee from selectedProcedure or use default
      const fee = selectedProcedure?.defaultFee || 0;

    // Create procedure request
    const officeId = extractOfficeId(office);
    if (!officeId) {
      alert("Office ID is required");
      return;
    }

    const procedureData: ProcedureCreateRequest = {
      procedure_code: selectedProcedure.code,
      date_of_service: formatDateForAPI(transactionDate),
      provider_id: selectedProvider,
      office_id: officeId,
      tooth: toothNumber || null,
      surface: surfaces.length > 0 ? surfaces.join("") : null,
      quadrant: quadrant || null,
      materials: materials.length > 0 ? materials : null,
      duration_minutes: duration ? parseInt(duration, 10) : undefined,
      fee: fee,
      est_patient: fee, // Will be calculated by backend based on insurance
      est_insurance: 0, // Will be calculated by backend
      notes: notes || null,
      apply_to: "P", // Default to Patient
    };

    try {
      setSaving(true);
      setError(null);

      // Call backend API
      const response = await addProcedure(patientId, procedureData);

      // Call onSave callback to refresh ledger
      onSave({
        id: response.procedure_id,
        ledger_entry_id: response.ledger_entry_id,
        transaction_id: response.transaction_id,
        ...procedureData,
      });

      // Reset form
      setSelectedProcedure(null);
      setSelectedProvider("");
      setDuration("");
      setNotes("");
      setToothNumber("");
      setQuadrant("");
      setSurfaces([]);
      setMaterials([]);
      setError(null);

      onClose();
    } catch (err: any) {
      console.error("Error saving procedure:", err);
      const errorMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        err.message ||
        "Failed to save procedure";
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col">
          {/* Header - Slate Blue */}
          <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-3 flex items-center justify-between rounded-t-lg">
            <div>
              <h2 className="text-xl font-bold text-white">
                Transactions Entry
              </h2>
              <p className="text-sm text-white/80">
                Patient: {patientName} | ID: {patientId}{" "}
                | Office: {office}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-[#16314d] rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>

          {/* Transaction Date */}
          <div className="px-6 py-3 bg-[#F7F9FC] border-b border-[#E2E8F0] flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className={components.label}>
                Transaction Date:
              </label>
              <input
                type="text"
                value={transactionDate}
                onChange={(e) =>
                  setTransactionDate(e.target.value)
                }
                className={components.input}
              />
            </div>
            <button className={components.buttonPrimary}>
              GO
            </button>
          </div>

          {/* Tabs */}
          <div className={components.tabList}>
            <button
              onClick={() => setActiveTab("add-procedures")}
              className={`${components.tabButton} ${
                activeTab === "add-procedures"
                  ? components.tabActive
                  : components.tabInactive
              }`}
            >
              ADD PROCEDURES
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`${components.tabButton} ${
                activeTab === "payments"
                  ? components.tabActive
                  : components.tabInactive
              }`}
            >
              PAYMENTS
            </button>
            <button
              onClick={() => setActiveTab("adjustments")}
              className={`${components.tabButton} ${
                activeTab === "adjustments"
                  ? components.tabActive
                  : components.tabInactive
              }`}
            >
              ADJUSTMENTS
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex bg-[#F7F9FC]">
            {/* Left Sidebar - Categories */}
            <div className="w-64 bg-white border-r border-[#E2E8F0] overflow-y-auto">
              <div className="p-3 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080]">
                <p className="text-white text-sm font-bold uppercase tracking-wide">
                  ADD PROCEDURES BY CATEGORIES
                </p>
              </div>
              {loadingCategories ? (
                <div className="p-4 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#3A6EA5]" />
                  <p className="text-xs text-slate-600 mt-2">Loading categories...</p>
                </div>
              ) : (
                categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full px-4 py-2.5 text-left text-sm font-semibold transition-colors border-b border-[#E2E8F0] ${
                      selectedCategory === category
                        ? "bg-[#3A6EA5] text-white"
                        : "bg-white text-[#1F3A5F] hover:bg-[#F7F9FC]"
                    }`}
                  >
                    {category}
                  </button>
                ))
              )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto p-6">
              {/* STEP 4: Procedure Code Selection */}
              <div className={components.card + " mb-6"}>
                <div className={components.cardHeader}>
                  <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">
                    ADD PROCEDURE BY: {selectedCategory}
                  </h3>
                </div>

                {/* Search Filters */}
                <div className="p-4 border-b border-[#E2E8F0] bg-[#F7F9FC]">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={components.label}>
                        Code
                      </label>
                      <input
                        type="text"
                        value={searchCode}
                        onChange={(e) =>
                          setSearchCode(e.target.value)
                        }
                        className={components.input}
                        placeholder="Search code"
                      />
                    </div>
                    <div>
                      <label className={components.label}>
                        User Code
                      </label>
                      <input
                        type="text"
                        value={searchUserCode}
                        onChange={(e) =>
                          setSearchUserCode(e.target.value)
                        }
                        className={components.input}
                        placeholder="User code"
                      />
                    </div>
                    <div>
                      <label className={components.label}>
                        Description
                      </label>
                      <input
                        type="text"
                        value={searchDescription}
                        onChange={(e) =>
                          setSearchDescription(e.target.value)
                        }
                        className={components.input}
                        placeholder="Search description"
                      />
                    </div>
                  </div>
                </div>

                {/* Procedure List */}
                <div className="max-h-64 overflow-y-auto">
                  <table className={components.table}>
                    <thead className={components.tableHeader}>
                      <tr>
                        <th
                          className={components.tableHeaderCell}
                        >
                          Code
                        </th>
                        <th
                          className={components.tableHeaderCell}
                        >
                          User Code
                        </th>
                        <th
                          className={components.tableHeaderCell}
                        >
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingProcedures ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#3A6EA5]" />
                            <p className="text-sm text-slate-600 mt-2">Loading procedures...</p>
                          </td>
                        </tr>
                      ) : filteredProcedures.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                            No procedures found
                          </td>
                        </tr>
                      ) : (
                        filteredProcedures.map((proc) => (
                          <tr
                            key={proc.code}
                            onClick={() =>
                              handleProcedureSelect(proc)
                            }
                            className={`${components.tableRow} cursor-pointer ${
                              selectedProcedure?.code ===
                              proc.code
                                ? "bg-[#3A6EA5]/10"
                                : ""
                            }`}
                          >
                            <td className="px-4 py-2 text-[#3A6EA5] font-semibold">
                              {proc.code}
                            </td>
                            <td className={components.tableCell}>
                              {proc.user_code || "-"}
                            </td>
                            <td className={components.tableCell}>
                              {proc.description}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* STEP 6: Provider & Optional Data */}
              {selectedProcedure && (
                <div className={components.card}>
                  <div className={components.cardHeader}>
                    <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">
                      Procedure Details
                    </h3>
                  </div>

                  <div
                    className={
                      components.cardBody + " space-y-4"
                    }
                  >
                    {/* Selected Procedure Display */}
                    <div className="bg-[#3A6EA5]/10 border-2 border-[#3A6EA5] rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={components.label}>
                            Code
                          </label>
                          <div className="text-[#3A6EA5] font-bold text-lg">
                            {selectedProcedure.code}
                          </div>
                        </div>
                        <div>
                          <label className={components.label}>
                            Description
                          </label>
                          <div className="text-[#1E293B]">
                            {selectedProcedure.description}
                          </div>
                        </div>
                      </div>

                      {/* Show enforcement status */}
                      {(selectedProcedure.requirements.tooth ||
                        selectedProcedure.requirements
                          .surface ||
                        selectedProcedure.requirements
                          .quadrant ||
                        selectedProcedure.requirements
                          .materials) && (
                        <div
                          className={
                            components.alertWarning + " mt-3"
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-[#1E293B]">
                                ⚠️ This procedure requires:
                                {selectedProcedure.requirements
                                  .tooth && " Tooth No"}
                                {selectedProcedure.requirements
                                  .surface && " Surfaces"}
                                {selectedProcedure.requirements
                                  .quadrant && " Quadrant"}
                                {selectedProcedure.requirements
                                  .materials && " Materials"}
                              </p>
                              {(toothNumber ||
                                quadrant ||
                                surfaces.length > 0 ||
                                materials.length > 0) && (
                                <p className="text-xs text-[#475569] mt-1">
                                  ✓ Selected:
                                  {toothNumber &&
                                    ` Tooth #${toothNumber}`}
                                  {quadrant && ` | ${quadrant}`}
                                  {surfaces.length > 0 &&
                                    ` | ${surfaces.join("")}`}
                                  {materials.length > 0 &&
                                    ` | ${materials.join(", ")}`}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("SPECIFY button clicked", { selectedProcedure, showEnforcement });
                                setShowEnforcement(true);
                              }}
                              className={
                                components.buttonWarning
                              }
                            >
                              {toothNumber ||
                              quadrant ||
                              surfaces.length > 0 ||
                              materials.length > 0
                                ? "EDIT"
                                : "SPECIFY"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Provider Selection - MANDATORY */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className={components.label}>
                          Treating Provider* (Required)
                        </label>
                        {loadingProviders ? (
                          <div className="px-4 py-2.5 border-2 border-[#E2E8F0] rounded-lg bg-[#F7F9FC] flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-[#3A6EA5]" />
                            <span className="text-sm text-slate-600">Loading providers...</span>
                          </div>
                        ) : (
                          <select
                            value={selectedProvider}
                            onChange={(e) =>
                              setSelectedProvider(e.target.value)
                            }
                            className={components.inputRequired}
                          >
                            <option value="">
                              -- Select Provider --
                            </option>
                            {providers.map((provider) => (
                              <option
                                key={provider.id}
                                value={provider.id}
                              >
                                {provider.id} - {provider.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div>
                        <label className={components.label}>
                          Duration (minutes)
                        </label>
                        <input
                          type="number"
                          value={duration}
                          onChange={(e) =>
                            setDuration(e.target.value)
                          }
                          className={components.input}
                          placeholder="e.g. 60"
                        />
                      </div>

                      <div>
                        <label className={components.label}>
                          Fee
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={selectedProcedure.defaultFee || 0}
                          onChange={(e) => {
                            const newFee = parseFloat(e.target.value) || 0;
                            setSelectedProcedure({
                              ...selectedProcedure,
                              defaultFee: newFee,
                            });
                          }}
                          className={components.input}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className={components.label}>
                        Notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) =>
                          setNotes(e.target.value)
                        }
                        className={components.textarea}
                        rows={3}
                        placeholder="Optional procedure notes..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-[#F7F9FC] border-t-2 border-[#E2E8F0] px-6 py-3 flex items-center justify-between rounded-b-lg">
            {error && (
              <div className="text-red-600 text-sm font-semibold">
                {error}
              </div>
            )}
            <div className="flex items-center justify-end gap-3 ml-auto">
              <button
                onClick={handleSaveProcedure}
                disabled={!selectedProcedure || !selectedProvider || saving}
                className={
                  selectedProcedure && selectedProvider && !saving
                    ? components.buttonPrimary
                    : components.inputDisabled +
                      " cursor-not-allowed"
                }
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    SAVING...
                  </>
                ) : (
                  "SAVE / POST"
                )}
              </button>
              <button
                onClick={onClose}
                disabled={saving}
                className={components.buttonSecondary}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 5: Tooth/Surface/Quadrant/Materials Enforcement Modal */}
      {showEnforcement && selectedProcedure && (() => {
        // Look up the full procedure from backend procedure codes to get anatomyRules, surfaceRules, materialsRules
        // First check in allProcedureCodes, then in current procedureCodes list
        let fullProcedure = allProcedureCodes.find(pc => pc.code === selectedProcedure.code) ||
                           procedureCodes.find(pc => pc.code === selectedProcedure.code);
        
        if (!fullProcedure) {
          console.error("Procedure not found in backend procedure codes:", selectedProcedure.code);
          alert(`Procedure ${selectedProcedure.code} not found. Please try selecting it again or contact support.`);
          setShowEnforcement(false);
          return null;
        }
        
        // Validate that the procedure has the required structure
        // If backend doesn't provide these, create defaults based on requirements
        const procedureWithRules: BackendProcedureCode & {
          anatomyRules: NonNullable<BackendProcedureCode['anatomyRules']>;
          surfaceRules: NonNullable<BackendProcedureCode['surfaceRules']>;
          materialsRules: NonNullable<BackendProcedureCode['materialsRules']>;
        } = {
          ...fullProcedure,
          // If backend doesn't provide anatomyRules, create defaults from requirements
          anatomyRules: fullProcedure.anatomyRules || {
            mode: fullProcedure.requirements.quadrant ? "QUADRANT" : 
                  fullProcedure.requirements.tooth ? "TOOTH" : "NONE",
            allowedToothSet: "BOTH",
            allowMultipleTeeth: false,
          },
          // If backend doesn't provide surfaceRules, create defaults from requirements
          surfaceRules: fullProcedure.surfaceRules || {
            enabled: fullProcedure.requirements.surface || false,
            min: fullProcedure.requirements.surface ? 1 : undefined,
            max: fullProcedure.requirements.surface ? 5 : undefined,
            allowedSurfaces: ["M", "O", "D", "B", "L", "I", "F"],
          },
          // If backend doesn't provide materialsRules, create defaults from requirements
          materialsRules: fullProcedure.materialsRules || {
            enabled: fullProcedure.requirements.materials || false,
            options: [
              "High Noble Metal",
              "Base Metal",
              "Noble Metal",
              "Titanium",
              "Resin",
              "Porcelain/Ceramic",
              "Zirconia",
              "E.max",
            ],
            min: fullProcedure.requirements.materials ? 1 : undefined,
            max: undefined,
          },
        };
        
        return (
          <ToothSurfaceEnforcement
            isOpen={showEnforcement}
            onClose={() => {
              console.log("Closing ToothSurfaceEnforcement");
              setShowEnforcement(false);
            }}
            onSave={handleEnforcementSave}
            procedure={procedureWithRules as any} // Type assertion needed - ToothSurfaceEnforcement accepts ProcedureCode with anatomyRules, surfaceRules, materialsRules
            initialTooth={toothNumber}
            initialQuadrant={quadrant}
            initialSurfaces={surfaces}
            initialMaterials={materials}
          />
        );
      })()}
    </>
  );
}