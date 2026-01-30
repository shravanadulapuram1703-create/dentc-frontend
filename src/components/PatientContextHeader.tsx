import { User, FileText, DollarSign, Activity, ClipboardList, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PatientContextHeaderProps {
  patientName: string;
  patientId: string;
  age?: number;
  sex?: string;
  office?: string;
}

export default function PatientContextHeader({ 
  patientName, 
  patientId, 
  age = 34, 
  sex = 'M', 
  office = 'Cranberry Dental Arts [108]'
}: PatientContextHeaderProps) {
  const navigate = useNavigate();

  const handleIconClick = (module: string) => {
    // Navigate using patient ID from props
    switch (module) {
      case 'overview':
        navigate(`/patient/${patientId}/overview`);
        break;
      case 'ledger':
        navigate(`/patient/${patientId}/ledger`);
        break;
      case 'charting':
        navigate(`/patient/${patientId}/restorative`);
        break;
      case 'treatment':
        // Navigate to treatment plans
        navigate(`/patient/${patientId}/overview`);
        break;
      case 'notes':
        navigate(`/patient/${patientId}/notes`);
        break;
      case 'imaging':
        // Navigate to imaging
        navigate(`/patient/${patientId}/overview`);
        break;
      default:
        break;
    }
  };

  const patientModules = [
    { icon: User, label: 'Overview', path: '/patient-overview', color: 'text-blue-600' },
    { icon: DollarSign, label: 'Ledger', path: '/transactions', color: 'text-green-600' },
    { icon: Activity, label: 'Charting', path: '/charting', color: 'text-red-600' },
    { icon: ClipboardList, label: 'Treatment', path: '/patient-overview', color: 'text-purple-600' },
    { icon: MessageSquare, label: 'Notes', path: '/patient-overview', color: 'text-yellow-600' },
    { icon: ImageIcon, label: 'Imaging', path: '/patient-overview', color: 'text-cyan-600' }
  ];

  return (
    <div className="bg-white border-b shadow-sm">
      {/* Patient Info Bar */}
      <div 
        onClick={() => navigate('/patient-overview')}
        className="bg-red-600 text-white px-6 py-3 cursor-pointer hover:bg-red-700 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <User className="w-6 h-6" />
            <div>
              <div className="flex items-center gap-3">
                <span className="text-lg">{patientName}</span>
                <span className="text-sm opacity-90">({age} / {sex})</span>
              </div>
              <div className="text-sm opacity-90">
                Patient ID: {patientId} | Office: {office}
              </div>
            </div>
          </div>
          <div className="text-sm opacity-90">
            Click to view Patient Overview
          </div>
        </div>
      </div>

      {/* Patient Module Icons */}
      <div className="px-6 py-3">
        <div className="flex items-center gap-6">
          {patientModules.map((module) => (
            <button
              key={module.label}
              onClick={() => handleIconClick(module.label.toLowerCase())}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded hover:bg-gray-100 transition-colors group"
            >
              <module.icon className={`w-6 h-6 ${module.color} group-hover:scale-110 transition-transform`} />
              <span className="text-xs text-gray-700">{module.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}