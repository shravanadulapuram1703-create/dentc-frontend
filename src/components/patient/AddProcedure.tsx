import { useState } from 'react';
import { X, Search } from 'lucide-react';
import ToothSurfaceEnforcement from './ToothSurfaceEnforcement';
import { procedureCodes, type ProcedureCode } from '../../data/procedureCodes';
import { components } from '../../styles/theme';

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
}

export default function AddProcedure({ isOpen, onClose, patientName, patientId, office, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<'add-procedures' | 'payments' | 'adjustments'>('add-procedures');
  const [transactionDate, setTransactionDate] = useState(new Date().toLocaleDateString('en-US'));
  
  // Procedure search
  const [searchCode, setSearchCode] = useState('');
  const [searchUserCode, setSearchUserCode] = useState('');
  const [searchDescription, setSearchDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('PROSTTH. FIXED');
  
  // Selected procedure data
  const [selectedProcedure, setSelectedProcedure] = useState<ProcedureCode | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  
  // Tooth/Surface enforcement
  const [showEnforcement, setShowEnforcement] = useState(false);
  const [toothNumber, setToothNumber] = useState('');
  const [quadrant, setQuadrant] = useState('');
  const [surfaces, setSurfaces] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);

  // Categories
  const categories = [
    'DIAGNOSTIC',
    'PREVENTIVE',
    'RESTORATIVE',
    'ENDODONTICS',
    'PERIODONTICS',
    'PROSTTH. REMOV',
    'MAXILLO BIOSTM',
    'IMPLANT SERV',
    'PROSTTH. FIXED',
    'ORAL SURGERY',
    'ORTHODONTICS',
    'ADJUNCT SERV',
    'OTHER',
    'ALL MEDICAL'
  ];

  // Providers
  const providers: Provider[] = [
    { id: '2632', name: 'Dr. Jinna (Dhilep)' },
    { id: '7103', name: 'Dr. Smith' },
    { id: '7407', name: 'Dr. Johnson' }
  ];

  // Filter procedures
  const filteredProcedures = procedureCodes.filter(proc => {
    const matchesCategory = selectedCategory === 'ALL MEDICAL' || proc.category === selectedCategory;
    const matchesCode = searchCode === '' || proc.code.toLowerCase().includes(searchCode.toLowerCase());
    const matchesUserCode = searchUserCode === '' || proc.userCode.toLowerCase().includes(searchUserCode.toLowerCase());
    const matchesDescription = searchDescription === '' || proc.description.toLowerCase().includes(searchDescription.toLowerCase());
    
    return matchesCategory && matchesCode && matchesUserCode && matchesDescription;
  });

  const handleProcedureSelect = (procedure: ProcedureCode) => {
    setSelectedProcedure(procedure);
    
    // STEP 5: Check if enforcement is required
    if (procedure.requiresTooth || procedure.requiresSurface || procedure.requiresQuadrant || procedure.requiresMaterials) {
      setShowEnforcement(true);
    }
  };

  const handleEnforcementSave = (data: any) => {
    setToothNumber(data.tooth);
    setQuadrant(data.quadrant);
    setSurfaces(data.surfaces);
    setMaterials(data.materials);
    setShowEnforcement(false);
  };

  const handleSaveProcedure = () => {
    // STEP 9-10: Validation and Save
    if (!selectedProcedure) {
      alert('Please select a procedure code');
      return;
    }

    if (!selectedProvider) {
      alert('Please select a treating provider');
      return;
    }

    // Check enforcement requirements
    if (selectedProcedure.requiresTooth && !toothNumber) {
      alert('This procedure requires tooth/surface/quadrant selection. Please complete the required fields.');
      setShowEnforcement(true);
      return;
    }

    // Create procedure object
    const newProcedure = {
      id: `PROC-${Date.now()}`,
      date: transactionDate,
      patientName,
      patientId,
      office,
      code: selectedProcedure.code,
      description: selectedProcedure.description,
      category: selectedProcedure.category,
      tooth: toothNumber,
      quadrant,
      surfaces: surfaces.join(''),
      materials: materials.join(', '),
      provider: providers.find(p => p.id === selectedProvider)?.name || '',
      providerId: selectedProvider,
      duration,
      fee: selectedProcedure.defaultFee,
      estInsurance: 0, // Would be calculated based on insurance
      estPatient: selectedProcedure.defaultFee,
      notes,
      createdBy: 'ADMIN',
      createdOn: new Date().toISOString(),
      status: 'posted',
      type: 'procedure'
    };

    // STEP 11: Call onSave and close
    onSave(newProcedure);
    
    // Reset form
    setSelectedProcedure(null);
    setSelectedProvider('');
    setDuration('');
    setNotes('');
    setToothNumber('');
    setQuadrant('');
    setSurfaces([]);
    setMaterials([]);
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col">
          {/* Header - Slate Blue */}
          <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-3 flex items-center justify-between rounded-t-lg">
            <div>
              <h2 className="text-xl font-bold text-white">Transactions Entry</h2>
              <p className="text-sm text-white/80">
                Patient: {patientName} (Nick) | ID: {patientId} | Office: {office}
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
              <label className={components.label}>Transaction Date:</label>
              <input
                type="text"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
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
              onClick={() => setActiveTab('add-procedures')}
              className={`${components.tabButton} ${
                activeTab === 'add-procedures'
                  ? components.tabActive
                  : components.tabInactive
              }`}
            >
              ADD PROCEDURES
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`${components.tabButton} ${
                activeTab === 'payments'
                  ? components.tabActive
                  : components.tabInactive
              }`}
            >
              PAYMENTS
            </button>
            <button
              onClick={() => setActiveTab('adjustments')}
              className={`${components.tabButton} ${
                activeTab === 'adjustments'
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
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full px-4 py-2.5 text-left text-sm font-semibold transition-colors border-b border-[#E2E8F0] ${
                    selectedCategory === category
                      ? 'bg-[#3A6EA5] text-white'
                      : 'bg-white text-[#1F3A5F] hover:bg-[#F7F9FC]'
                  }`}
                >
                  {category}
                </button>
              ))}
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
                      <label className={components.label}>Code</label>
                      <input
                        type="text"
                        value={searchCode}
                        onChange={(e) => setSearchCode(e.target.value)}
                        className={components.input}
                        placeholder="Search code"
                      />
                    </div>
                    <div>
                      <label className={components.label}>User Code</label>
                      <input
                        type="text"
                        value={searchUserCode}
                        onChange={(e) => setSearchUserCode(e.target.value)}
                        className={components.input}
                        placeholder="User code"
                      />
                    </div>
                    <div>
                      <label className={components.label}>Description</label>
                      <input
                        type="text"
                        value={searchDescription}
                        onChange={(e) => setSearchDescription(e.target.value)}
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
                        <th className={components.tableHeaderCell}>Code</th>
                        <th className={components.tableHeaderCell}>User Code</th>
                        <th className={components.tableHeaderCell}>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProcedures.map((proc) => (
                        <tr
                          key={proc.code}
                          onClick={() => handleProcedureSelect(proc)}
                          className={`${components.tableRow} cursor-pointer ${
                            selectedProcedure?.code === proc.code ? 'bg-[#3A6EA5]/10' : ''
                          }`}
                        >
                          <td className="px-4 py-2 text-[#3A6EA5] font-semibold">{proc.code}</td>
                          <td className={components.tableCell}>{proc.userCode}</td>
                          <td className={components.tableCell}>{proc.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* STEP 6: Provider & Optional Data */}
              {selectedProcedure && (
                <div className={components.card}>
                  <div className={components.cardHeader}>
                    <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">Procedure Details</h3>
                  </div>

                  <div className={components.cardBody + " space-y-4"}>
                    {/* Selected Procedure Display */}
                    <div className="bg-[#3A6EA5]/10 border-2 border-[#3A6EA5] rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={components.label}>Code</label>
                          <div className="text-[#3A6EA5] font-bold text-lg">{selectedProcedure.code}</div>
                        </div>
                        <div>
                          <label className={components.label}>Description</label>
                          <div className="text-[#1E293B]">{selectedProcedure.description}</div>
                        </div>
                      </div>

                      {/* Show enforcement status */}
                      {(selectedProcedure.requiresTooth || selectedProcedure.requiresSurface) && (
                        <div className={components.alertWarning + " mt-3"}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-[#1E293B]">
                                ⚠️ This procedure requires: Tooth#{toothNumber || '?'}, Quadrant, Surfaces, Materials
                              </p>
                              {toothNumber && (
                                <p className="text-xs text-[#475569] mt-1">
                                  ✓ Selected: Tooth #{toothNumber} | {quadrant} | {surfaces.join('')} | {materials.join(', ')}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => setShowEnforcement(true)}
                              className={components.buttonWarning}
                            >
                              {toothNumber ? 'EDIT' : 'SPECIFY'}
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
                        <select
                          value={selectedProvider}
                          onChange={(e) => setSelectedProvider(e.target.value)}
                          className={components.inputRequired}
                        >
                          <option value="">-- Select Provider --</option>
                          {providers.map((provider) => (
                            <option key={provider.id} value={provider.id}>
                              {provider.id} - {provider.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={components.label}>Duration (minutes)</label>
                        <input
                          type="number"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          className={components.input}
                          placeholder="e.g. 60"
                        />
                      </div>

                      <div>
                        <label className={components.label}>Fee</label>
                        <div className="px-4 py-2.5 border-2 border-[#E2E8F0] rounded-lg text-sm bg-[#F7F9FC] text-[#1E293B] font-semibold">
                          ${selectedProcedure.defaultFee.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className={components.label}>Notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
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
          <div className="bg-[#F7F9FC] border-t-2 border-[#E2E8F0] px-6 py-3 flex items-center justify-end gap-3 rounded-b-lg">
            <button
              onClick={handleSaveProcedure}
              disabled={!selectedProcedure || !selectedProvider}
              className={
                selectedProcedure && selectedProvider
                  ? components.buttonPrimary
                  : components.inputDisabled + " cursor-not-allowed"
              }
            >
              SAVE / POST
            </button>
            <button
              onClick={onClose}
              className={components.buttonSecondary}
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>

      {/* STEP 5: Tooth/Surface/Quadrant/Materials Enforcement Modal */}
      {showEnforcement && selectedProcedure && (
        <ToothSurfaceEnforcement
          isOpen={showEnforcement}
          onClose={() => setShowEnforcement(false)}
          onSave={handleEnforcementSave}
          procedureCode={selectedProcedure.code}
          procedureDescription={selectedProcedure.description}
          initialTooth={toothNumber}
          initialQuadrant={quadrant}
          initialSurfaces={surfaces}
          initialMaterials={materials}
        />
      )}
    </>
  );
}