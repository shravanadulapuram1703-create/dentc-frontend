import GlobalNav from '../GlobalNav';
import { Settings, Database, FileText, Mail, Calendar, Users, Shield, HardDrive } from 'lucide-react';

interface UtilitiesProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

export default function Utilities({ onLogout, currentOffice, setCurrentOffice }: UtilitiesProps) {
  const utilities = [
    {
      category: 'Data Management',
      items: [
        { name: 'Database Backup', icon: Database, description: 'Create and manage database backups' },
        { name: 'Data Import/Export', icon: HardDrive, description: 'Import or export patient data' },
        { name: 'Data Archive', icon: FileText, description: 'Archive old patient records' },
      ]
    },
    {
      category: 'Communication',
      items: [
        { name: 'Email Templates', icon: Mail, description: 'Manage email templates' },
        { name: 'Appointment Reminders', icon: Calendar, description: 'Configure reminder settings' },
        { name: 'Bulk Messaging', icon: Mail, description: 'Send messages to multiple patients' },
      ]
    },
    {
      category: 'Security',
      items: [
        { name: 'User Permissions', icon: Shield, description: 'Manage user access levels' },
        { name: 'Audit Log', icon: FileText, description: 'View system activity log' },
        { name: 'Password Policy', icon: Shield, description: 'Configure password requirements' },
      ]
    },
    {
      category: 'System',
      items: [
        { name: 'System Diagnostics', icon: Settings, description: 'Run system health checks' },
        { name: 'Clear Cache', icon: Database, description: 'Clear system cache' },
        { name: 'Update Check', icon: Settings, description: 'Check for system updates' },
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
            <h1 className="text-gray-900">Utilities</h1>
            <p className="text-gray-600">System maintenance and management tools</p>
          </div>
        </div>

        <div className="space-y-6">
          {utilities.map((section, sectionIndex) => (
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

        {/* Recent Activity */}
        <div className="mt-6 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-gray-900">Recent Utility Activity</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <Database className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-gray-900">Database Backup</div>
                    <div className="text-gray-600">Completed successfully</div>
                  </div>
                </div>
                <div className="text-gray-600">Today, 2:30 AM</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-gray-900">Appointment Reminders Sent</div>
                    <div className="text-gray-600">24 messages sent</div>
                  </div>
                </div>
                <div className="text-gray-600">Yesterday, 9:00 AM</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-gray-900">System Diagnostics</div>
                    <div className="text-gray-600">All systems operational</div>
                  </div>
                </div>
                <div className="text-gray-600">Yesterday, 3:15 PM</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
