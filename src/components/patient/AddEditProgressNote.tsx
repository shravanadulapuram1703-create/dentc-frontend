import { useState, useRef } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import {
  Save,
  X,
  FileText,
  Upload,
  Scan,
  File,
  CheckCircle,
  Info,
  Plus,
  Eye,
  Calendar
} from 'lucide-react';

interface PatientData {
  id: string;
  name: string;
  dob: string;
  age: number;
  gender: string;
}

interface OutletContext {
  patient: PatientData;
}

interface Macro {
  id: string;
  name: string;
  content: string;
  category: string;
}

const clinicalCategories = [
  'Diagnostic',
  'Preventive',
  'Restorative',
  'Endodontics',
  'Periodontics',
  'Prosthodontics',
  'Maxillofacial Prosthetics',
  'Implant Services',
  'Prosthodontics – Fixed',
  'Oral & Maxillofacial Surgery',
  'Orthodontics',
  'Adjunct General Services',
  'Other Insurance',
  'Watches',
  'Appointment Notes'
];

const mockMacros: Macro[] = [
  { id: 'M001', name: 'abutment and crown', category: 'Restorative', content: 'Abutment and crown placed. Patient tolerated procedure well. Post-op instructions provided.' },
  { id: 'M002', name: 'bone graft', category: 'Oral & Maxillofacial Surgery', content: 'Bone graft procedure completed on tooth @@insert tooth number@@. Graft material placed successfully. Healing expected in 4-6 months.' },
  { id: 'M003', name: 'Cold Sensitivity', category: 'Diagnostic', content: 'Patient reports cold sensitivity on tooth @@insert tooth number@@. Clinical exam reveals @@insert findings@@.' },
  { id: 'M004', name: 'Comp exam for Periodontal', category: 'Periodontics', content: 'Comprehensive periodontal examination completed. Probing depths recorded. Mobility assessed. Treatment plan: @@insert treatment option@@.' },
  { id: 'M005', name: 'Comprehensive Evalua', category: 'Diagnostic', content: 'Comprehensive evaluation completed. Full mouth examination. Radiographs reviewed. Diagnosis: @@insert diagnosis@@.' },
  { id: 'M006', name: 'Consultation', category: 'Diagnostic', content: 'Consultation completed. Treatment options discussed with patient including risks, benefits, and alternatives. Patient questions answered.' },
  { id: 'M007', name: 'crown prep', category: 'Restorative', content: 'Crown preparation completed on tooth @@insert tooth number@@. Impressions taken. Temporary crown placed. Patient tolerated procedure well.' },
  { id: 'M008', name: 'crown prep - old crown', category: 'Restorative', content: 'Old crown removed from tooth @@insert tooth number@@. New crown preparation completed. Temporary crown placed.' },
  { id: 'M009', name: 'crown seat *', category: 'Restorative', content: 'Crown seated on tooth @@insert tooth number@@. Occlusion checked and adjusted. Patient satisfied with fit and appearance.' },
  { id: 'M010', name: 'DR. YUN EXAM TEMPLATE', category: 'Diagnostic', content: 'Clinical examination completed by Dr. Yun. Findings documented. Treatment plan reviewed with patient.' },
  { id: 'M011', name: 'Endodontic Referral', category: 'Endodontics', content: 'Patient referred to endodontist for evaluation of tooth @@insert tooth number@@. Referral slip provided.' },
  { id: 'M012', name: 'Ext and bone graft GTR', category: 'Oral & Maxillofacial Surgery', content: 'Extraction of tooth @@insert tooth number@@ completed. Bone graft and GTR membrane placed. Post-op instructions given.' },
  { id: 'M013', name: 'Ext and bridge', category: 'Prosthodontics', content: 'Tooth @@insert tooth number@@ extracted. Bridge preparation initiated. Healing time required before final prosthesis.' }
];

interface AddEditProgressNoteProps {
  mode?: 'add' | 'edit';
}

export default function AddEditProgressNote({ mode = 'add' }: AddEditProgressNoteProps) {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { patient } = useOutletContext<OutletContext>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);

  const [category, setCategory] = useState<string>('');
  const [macroSearch, setMacroSearch] = useState<string>('');
  const [selectedMacro, setSelectedMacro] = useState<Macro | null>(null);
  const [showMacroPreview, setShowMacroPreview] = useState(false);
  const [toothNumbers, setToothNumbers] = useState<string[]>([]);
  const [toothInput, setToothInput] = useState<string>('');
  const [surface, setSurface] = useState<string>('');
  const [region, setRegion] = useState<string>('');
  const [dos, setDos] = useState<string>(new Date().toISOString().split('T')[0]);
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [signatureUser, setSignatureUser] = useState<string>('');
  const [signaturePassword, setSignaturePassword] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter macros by category and search
  const filteredMacros = mockMacros.filter(macro => {
    if (category && macro.category !== category) return false;
    if (macroSearch && !macro.name.toLowerCase().includes(macroSearch.toLowerCase())) return false;
    return true;
  });

  const handleAddToothNumber = () => {
    if (toothInput.trim() && !toothNumbers.includes(toothInput.trim())) {
      setToothNumbers([...toothNumbers, toothInput.trim()]);
      setToothInput('');
    }
  };

  const handleRemoveToothNumber = (tooth: string) => {
    setToothNumbers(toothNumbers.filter(t => t !== tooth));
  };

  const handleSelectMacro = (macro: Macro) => {
    setSelectedMacro(macro);
    setShowMacroPreview(true);
  };

  const handleAddMacroToNotes = () => {
    if (selectedMacro) {
      let macroContent = selectedMacro.content;
      
      // Replace tooth number placeholder
      if (toothNumbers.length > 0) {
        macroContent = macroContent.replace(/@@insert tooth number@@/g, toothNumbers.join(', '));
      }
      
      setClinicalNotes(clinicalNotes + (clinicalNotes ? '\n\n' : '') + macroContent);
      setShowMacroPreview(false);
      setSelectedMacro(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10 MB');
        return;
      }
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only PDF, JPG, JPEG, PNG, and GIF files are allowed');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleScan = () => {
    alert('Scanner interface would open here. This feature requires hardware integration.');
  };

  const handleSign = () => {
    if (!signatureUser || !signaturePassword) {
      alert('Please enter username and password to sign');
      return;
    }
    // In production, verify credentials
    setIsSigned(true);
    alert('Progress note signed successfully');
  };

  const handleClearSignature = () => {
    setIsSigned(false);
    setSignatureUser('');
    setSignaturePassword('');
    if (signatureCanvasRef.current) {
      const ctx = signatureCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
      }
    }
  };

  const handleSave = async () => {
    if (!category) {
      alert('Please select a category');
      return;
    }
    if (!dos) {
      alert('Please enter Date of Service');
      return;
    }
    if (!clinicalNotes.trim()) {
      alert('Please enter clinical notes');
      return;
    }

    setIsSaving(true);

    setTimeout(() => {
      console.log('Saving progress note:', {
        patientId,
        category,
        toothNumbers,
        surface,
        region,
        dos,
        clinicalNotes,
        file: selectedFile?.name,
        isSigned,
        signedBy: isSigned ? signatureUser : undefined,
        createdDate: new Date().toISOString(),
        createdBy: 'CURRENT_USER'
      });

      setIsSaving(false);
      navigate(`/patient/${patientId}/progress-notes`);
    }, 800);
  };

  const handleCancel = () => {
    if ((clinicalNotes.trim() || selectedFile || toothNumbers.length > 0) && 
        !window.confirm('Discard unsaved changes?')) {
      return;
    }
    navigate(`/patient/${patientId}/progress-notes`);
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Progress Notes for {patient.name}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {mode === 'add' ? 'Create new clinical progress note' : 'Edit clinical progress note'}
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel - Category & Macros */}
          <div className="col-span-3 space-y-6">
            {/* SELECT CATEGORY */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-4">
              <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">
                Select Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setMacroSearch('');
                }}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-slate-900"
              >
                <option value="">-- Select Category --</option>
                {clinicalCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* SELECT MACRO */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-4">
              <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">
                Select Macro
              </label>
              <input
                type="text"
                value={macroSearch}
                onChange={(e) => setMacroSearch(e.target.value)}
                placeholder="Search macros..."
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mb-3"
              />
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {filteredMacros.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    {category ? 'No macros found' : 'Select a category first'}
                  </p>
                ) : (
                  filteredMacros.map((macro) => (
                    <button
                      key={macro.id}
                      onClick={() => handleSelectMacro(macro)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                        selectedMacro?.id === macro.id
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-slate-50 text-slate-900 hover:bg-blue-100'
                      }`}
                    >
                      {macro.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Main Form */}
          <div className="col-span-9 space-y-6">
            {/* Tooth, Surface, Region & DOS */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Tooth/Surface/Region */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <label className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                      Tooth#, Surf, Region
                    </label>
                    <button className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                      <Info className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={toothInput}
                      onChange={(e) => setToothInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddToothNumber()}
                      placeholder="Enter tooth number..."
                      className="flex-1 px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <button
                      onClick={handleAddToothNumber}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Add Tooth
                    </button>
                  </div>

                  {toothNumbers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {toothNumbers.map((tooth) => (
                        <span
                          key={tooth}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold"
                        >
                          #{tooth}
                          <button
                            onClick={() => handleRemoveToothNumber(tooth)}
                            className="hover:bg-purple-200 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" strokeWidth={2.5} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={surface}
                      onChange={(e) => setSurface(e.target.value)}
                      placeholder="Surface (O, M, D, etc.)"
                      className="px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <input
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="Region"
                      className="px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* DOS */}
                <div>
                  <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">
                    DOS (MM/DD/YYYY)
                  </label>
                  <input
                    type="date"
                    value={dos}
                    onChange={(e) => setDos(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Macro Preview Modal */}
            {showMacroPreview && selectedMacro && (
              <div className="bg-blue-50 rounded-xl border-2 border-blue-300 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-blue-900 uppercase">
                    Preview for Selected Macro: {selectedMacro.name}
                  </h3>
                  <button
                    onClick={() => {
                      setShowMacroPreview(false);
                      setSelectedMacro(null);
                    }}
                    className="p-1 text-blue-700 hover:bg-blue-200 rounded"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
                <div className="bg-white rounded-lg p-4 mb-4 border-2 border-blue-200">
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">{selectedMacro.content}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAddMacroToNotes}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4 inline mr-2" strokeWidth={2} />
                    Add to Notes
                  </button>
                  <button
                    onClick={() => {
                      setShowMacroPreview(false);
                      setSelectedMacro(null);
                    }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Clinical Notes Editor */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6">
              <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">
                Clinical Notes <span className="text-red-600">*</span>
              </label>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Enter clinical documentation here or select a macro from the left panel...

Clinical notes should include:
- Procedures performed
- Anesthesia details
- Treatment observations
- Patient response
- Follow-up instructions"
                rows={12}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm text-slate-900 resize-none"
              />
              <p className="text-xs text-slate-600 mt-2">{clinicalNotes.length} characters</p>
            </div>

            {/* Attachments */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6">
              <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">
                Attachments <span className="text-slate-500">(Max File Size: 10 MB, Allowed: Gif, Jpg, Jpeg, Png, Pdf)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={handleScan}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  <Scan className="w-4 h-4" strokeWidth={2} />
                  SCAN
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  <Upload className="w-4 h-4" strokeWidth={2} />
                  CHOOSE FILE
                </button>
                {selectedFile && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-2 border-green-200 rounded-lg flex-1">
                    <File className="w-4 h-4 text-green-700" strokeWidth={2} />
                    <span className="text-sm font-semibold text-green-900">{selectedFile.name}</span>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="ml-auto p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Signature Section */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6">
              <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide mb-4">
                Signature
              </label>
              
              <div className="grid grid-cols-2 gap-6">
                {/* Signature Canvas */}
                <div>
                  <div className="border-2 border-slate-300 rounded-lg p-4 bg-slate-50 mb-3">
                    <canvas
                      ref={signatureCanvasRef}
                      width={300}
                      height={150}
                      className="border border-slate-200 bg-white w-full"
                      style={{ touchAction: 'none' }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSign}
                      disabled={isSigned}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" strokeWidth={2} />
                      SIGN
                    </button>
                    <button
                      onClick={handleClearSignature}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold text-sm transition-colors"
                    >
                      CLEAR
                    </button>
                    {isSigned && (
                      <span className="flex items-center gap-1 text-green-700 font-semibold text-sm ml-auto">
                        <CheckCircle className="w-4 h-4" strokeWidth={2.5} />
                        Signed
                      </span>
                    )}
                  </div>
                </div>

                {/* Change User (Re-authentication) */}
                <div>
                  <div className="bg-blue-50 rounded-lg border-2 border-blue-200 p-4">
                    <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-3">
                      Change User (Re-authentication)
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-blue-800 mb-1">
                          User Name
                        </label>
                        <input
                          type="text"
                          value={signatureUser}
                          onChange={(e) => setSignatureUser(e.target.value)}
                          placeholder="Enter username"
                          className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-blue-800 mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          value={signaturePassword}
                          onChange={(e) => setSignaturePassword(e.target.value)}
                          placeholder="Enter password"
                          className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <p className="text-xs text-blue-700">
                        Enter credentials to authenticate and sign this progress note
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                <span className="font-semibold">Note:</span> Once signed, this progress note cannot be edited
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold transition-colors"
                >
                  <X className="w-4 h-4 inline mr-2" strokeWidth={2} />
                  CANCEL
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !category || !dos || !clinicalNotes.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  <CheckCircle className="w-5 h-5" strokeWidth={2} />
                  {isSaving ? 'SAVING...' : 'SAVE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}