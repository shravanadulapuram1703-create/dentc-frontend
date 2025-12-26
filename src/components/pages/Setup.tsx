import GlobalNav from '../GlobalNav';
import { Settings, Building2, Users, CreditCard, FileText, Calendar, Printer, Bell } from 'lucide-react';

interface SetupProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

export default function Setup({ onLogout, currentOffice, setCurrentOffice }: SetupProps) {
  const setupSections = [
    {
      category: 'Practice Information',
      items: [
        { name: 'Office Details', icon: Building2, description: 'Manage office information and locations' },
        { name: 'Providers', icon: Users, description: 'Add and manage providers' },
        { name: 'Staff Management', icon: Users, description: 'Manage staff and roles' },
      ]
    },
    {
      category: 'Clinical Settings',
      items: [
        { name: 'Treatment Codes', icon: FileText, description: 'Configure procedure codes' },
        { name: 'Fee Schedule', icon: CreditCard, description: 'Set up fee schedules' },
        { name: 'Insurance Plans', icon: FileText, description: 'Manage insurance plans' },
      ]
    },
    {
      category: 'Scheduling',
      items: [
        { name: 'Appointment Types', icon: Calendar, description: 'Define appointment categories' },
        { name: 'Operatories', icon: Building2, description: 'Configure treatment rooms' },
        { name: 'Schedule Templates', icon: Calendar, description: 'Set up schedule patterns' },
      ]
    },
    {
      category: 'Communication',
      items: [
        { name: 'Notification Settings', icon: Bell, description: 'Configure notifications' },
        { name: 'Email Configuration', icon: Bell, description: 'Set up email settings' },
        { name: 'SMS Settings', icon: Bell, description: 'Configure text messaging' },
      ]
    },
    {
      category: 'Documents & Forms',
      items: [
        { name: 'Form Templates', icon: FileText, description: 'Manage patient forms' },
        { name: 'Letter Templates', icon: FileText, description: 'Configure letter templates' },
        { name: 'Print Settings', icon: Printer, description: 'Set up printer configurations' },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalNav 
        onLogout={onLogout} 
        currentOffice={currentOffice}
        setCurrentOffice={setCurrentOffice}
      />
      
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Settings className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-gray-900">Setup & Configuration</h1>
            <p className="text-gray-600">Configure practice settings and preferences</p>
          </div>
        </div>

        <div className="space-y-6">
          {setupSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-gray-900">{section.category}</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.items.map((item, itemIndex) => (
                    <button
                      key={itemIndex}
                      className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left group"
                    >
                      <item.icon className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
                      <div className="text-gray-900 mb-2">{item.name}</div>
                      <div className="text-gray-600">{item.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Settings */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-gray-900 mb-4">Quick Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-gray-900 mb-1">Enable Online Booking</div>
                <div className="text-gray-600">Allow patients to book appointments online</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-gray-900 mb-1">Automatic Reminders</div>
                <div className="text-gray-600">Send automatic appointment reminders</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-gray-900 mb-1">Two-Factor Authentication</div>
                <div className="text-gray-600">Require 2FA for all users</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
