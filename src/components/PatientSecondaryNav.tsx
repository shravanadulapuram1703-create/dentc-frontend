import { useNavigate } from 'react-router-dom';
import { 
  Calendar,
  User, 
  CreditCard, 
  BookOpen, 
  Activity, 
  Stethoscope,
  FileText, 
  ClipboardList,
  UserPlus,
  Users,
  Pill,
  StickyNote,
  FolderOpen,
  Mail,
  MessageCircle,
  MessageSquare,
  Clock,
  Globe,
  Share2,
  Image as ImageIcon,
  Printer,
  History,
  Search,
  UserSearch
} from 'lucide-react';

interface PatientSecondaryNavProps {
  patientId: string;
}

export default function PatientSecondaryNav({ patientId }: PatientSecondaryNavProps) {
  const navigate = useNavigate();

  const handleSchedulerClick = () => {
    window.open('/scheduler', '_blank');
  };

  const handleNavigation = (path: string) => {
    // Navigate within patient context
    console.log('Navigating to:', `/patient/${patientId}${path}`);
    navigate(`/patient/${patientId}${path}`);
  };

  const patientActions = [
    { 
      icon: Calendar, 
      label: 'Scheduler', 
      gradient: 'from-blue-600 to-cyan-600',
      onClick: handleSchedulerClick,
      description: 'Open Scheduler (New Window)'
    },
    { 
      icon: User, 
      label: 'Overview', 
      gradient: 'from-blue-600 to-cyan-600',
      onClick: () => handleNavigation('/overview'),
      description: 'Patient Overview'
    },
    { 
      icon: CreditCard, 
      label: 'Transaction', 
      gradient: 'from-green-600 to-teal-600',
      onClick: () => handleNavigation('/transaction'),
      description: 'Transaction Entry'
    },
    { 
      icon: BookOpen, 
      label: 'Ledger', 
      gradient: 'from-teal-600 to-cyan-600',
      onClick: () => handleNavigation('/ledger'),
      description: 'Patient Ledger'
    },
    { 
      icon: Activity, 
      label: 'Restorative', 
      gradient: 'from-blue-600 to-indigo-600',
      onClick: () => handleNavigation('/restorative'),
      description: 'Restorative Charting'
    },
    { 
      icon: Stethoscope, 
      label: 'Perio', 
      gradient: 'from-purple-600 to-pink-600',
      onClick: () => handleNavigation('/perio'),
      description: 'Periodontal Charting'
    },
    { 
      icon: FileText, 
      label: 'Progress', 
      gradient: 'from-indigo-600 to-purple-600',
      onClick: () => handleNavigation('/progress-notes'),
      description: 'Clinical Progress Notes'
    },
    { 
      icon: ClipboardList, 
      label: 'Treatment', 
      gradient: 'from-violet-600 to-purple-600',
      onClick: () => handleNavigation('/treatment'),
      description: 'Treatment Plan Entry'
    },
    { 
      icon: UserPlus, 
      label: 'New Patient', 
      gradient: 'from-green-600 to-emerald-600',
      onClick: () => {
        // Open in new window or navigate to global context
        window.open('/patient/new', '_blank');
      },
      description: 'Add New Patient'
    },
    { 
      icon: Users, 
      label: 'New Member', 
      gradient: 'from-teal-600 to-cyan-600',
      onClick: () => {
        // Navigate to global patient search, not within patient context
        navigate('/patient?action=add-member&familyOf=' + patientId);
      },
      description: 'Add Family Member'
    },
    { 
      icon: Pill, 
      label: 'Prescriptions', 
      gradient: 'from-orange-600 to-amber-600',
      onClick: () => handleNavigation('/prescriptions'),
      description: 'Prescription Module'
    },
    { 
      icon: StickyNote, 
      label: 'Notes', 
      gradient: 'from-amber-600 to-yellow-600',
      onClick: () => handleNavigation('/notes'),
      description: 'Patient Notes'
    },
    { 
      icon: FolderOpen, 
      label: 'Documents', 
      gradient: 'from-slate-600 to-gray-600',
      onClick: () => handleNavigation('/documents'),
      description: 'Document Management'
    },
    { 
      icon: Mail, 
      label: 'Letters', 
      gradient: 'from-blue-600 to-indigo-600',
      onClick: () => handleNavigation('/letters'),
      description: 'Generate Letters'
    },
    { 
      icon: MessageCircle, 
      label: 'Messages', 
      gradient: 'from-green-600 to-emerald-600',
      onClick: () => handleNavigation('/messages'),
      description: 'Internal Messaging'
    },
    { 
      icon: MessageSquare, 
      label: 'SMS/Email', 
      gradient: 'from-teal-600 to-cyan-600',
      onClick: () => handleNavigation('/communication'),
      description: 'SMS & Email Communication'
    },
    { 
      icon: Share2, 
      label: 'Referrals', 
      gradient: 'from-violet-600 to-purple-600',
      onClick: () => handleNavigation('/referrals'),
      description: 'Manage Referrals'
    },
    { 
      icon: ImageIcon, 
      label: 'Imaging', 
      gradient: 'from-cyan-600 to-blue-600',
      onClick: () => alert('Launch Imaging System - Coming Soon'),
      description: 'Launch Imaging (XVW Web)'
    },
    { 
      icon: Globe, 
      label: 'Websites', 
      gradient: 'from-gray-600 to-slate-600',
      onClick: () => alert('Websites - Coming Soon'),
      description: 'Quick Links'
    },
    { 
      icon: Users, 
      label: 'Members', 
      gradient: 'from-indigo-600 to-purple-600',
      onClick: () => handleNavigation('/family'),
      description: 'View Family Members'
    },
    { 
      icon: Printer, 
      label: 'Print', 
      gradient: 'from-gray-600 to-slate-700',
      onClick: () => alert('Print Reports - Coming Soon'),
      description: 'Print Patient Reports'
    },
    { 
      icon: History, 
      label: 'Recent', 
      gradient: 'from-amber-600 to-orange-600',
      onClick: () => navigate('/patient/recent'),
      description: 'Recent Patients'
    },
    { 
      icon: Search, 
      label: 'Search', 
      gradient: 'from-blue-600 to-cyan-600',
      onClick: () => navigate('/patient'),
      description: 'Search Patient'
    },
    { 
      icon: UserSearch, 
      label: 'Search RP', 
      gradient: 'from-green-600 to-teal-600',
      onClick: () => alert('Search Responsible Party - Coming Soon'),
      description: 'Search Responsible Party'
    },
  ];

  return (
    <div className="bg-white border-t-2 border-slate-200">
      {/* Patient Action Icons - Medical Theme */}
      <div className="px-6 py-3 overflow-x-auto">
        <div className="flex items-center gap-2.5 min-w-max">
          {patientActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="group relative flex flex-col items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-slate-50"
              title={action.description}
            >
              {/* Solid Icon with Gradient Background */}
              <div className={`
                relative flex items-center justify-center w-11 h-11 rounded-lg
                bg-gradient-to-br ${action.gradient}
                shadow-md group-hover:shadow-lg group-hover:scale-110
                transition-all duration-200
              `}>
                <action.icon className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              
              {/* Label - High Contrast */}
              <span className="text-[10px] text-slate-700 whitespace-nowrap font-semibold tracking-wide group-hover:text-slate-900 transition-colors">
                {action.label}
              </span>
              
              {/* Tooltip */}
              <div className="
                absolute bottom-full mb-3 hidden group-hover:block
                px-3 py-1.5 rounded-lg
                bg-slate-900 border border-slate-800
                text-white text-xs font-semibold whitespace-nowrap
                shadow-xl z-50
                animate-in fade-in slide-in-from-bottom-2 duration-200
              ">
                {action.description}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 rotate-45 bg-slate-900 border-r border-b border-slate-800" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}