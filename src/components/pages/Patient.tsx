import GlobalNav from '../GlobalNav';
import { Users, Search, Plus, Phone, Mail, MapPin, Calendar } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface PatientProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

export default function Patient({ onLogout, currentOffice, setCurrentOffice }: PatientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const navigate = useNavigate();

  const patients = [
    {
      id: 1,
      name: 'John Smith',
      dob: '05/15/1980',
      phone: '(555) 123-4567',
      email: 'john.smith@email.com',
      address: '123 Main St, Pittsburgh, PA 15201',
      insurance: 'Delta Dental - Premium',
      lastVisit: '03/15/2024',
      nextAppointment: '04/20/2024',
      balance: '$150.00'
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      dob: '08/22/1975',
      phone: '(555) 234-5678',
      email: 'sarah.j@email.com',
      address: '456 Oak Ave, Pittsburgh, PA 15202',
      insurance: 'Cigna Dental',
      lastVisit: '03/18/2024',
      nextAppointment: '04/15/2024',
      balance: '$0.00'
    },
    {
      id: 3,
      name: 'Michael Brown',
      dob: '11/30/1992',
      phone: '(555) 345-6789',
      email: 'mbrown@email.com',
      address: '789 Pine Rd, Pittsburgh, PA 15203',
      insurance: 'MetLife Dental',
      lastVisit: '03/10/2024',
      nextAppointment: '05/05/2024',
      balance: '$225.50'
    },
    {
      id: 4,
      name: 'Emily Davis',
      dob: '03/12/1988',
      phone: '(555) 456-7890',
      email: 'emily.davis@email.com',
      address: '321 Elm St, Pittsburgh, PA 15204',
      insurance: 'Aetna Dental',
      lastVisit: '03/20/2024',
      nextAppointment: '04/25/2024',
      balance: '$75.00'
    },
  ];

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone.includes(searchQuery) ||
    patient.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalNav 
        onLogout={onLogout} 
        currentOffice={currentOffice}
        setCurrentOffice={setCurrentOffice}
      />
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Users className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-gray-900">Patient Management</h1>
              <p className="text-gray-600">Search and manage patient records</p>
            </div>
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow">
            <Plus className="w-5 h-5" />
            Add New Patient
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient.id)}
                  className={`p-4 border-b cursor-pointer transition-colors ${
                    selectedPatient === patient.id
                      ? 'bg-red-50 border-l-4 border-l-red-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="text-gray-900 mb-1">{patient.name}</div>
                  <div className="text-gray-600">DOB: {patient.dob}</div>
                  <div className="text-gray-600">{patient.phone}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Patient Details */}
          <div className="lg:col-span-2">
            {selectedPatient ? (
              <div className="space-y-6">
                {(() => {
                  const patient = patients.find(p => p.id === selectedPatient);
                  if (!patient) return null;
                  
                  return (
                    <>
                      {/* Patient Info Card */}
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-start justify-between mb-6">
                          <div>
                            <h2 className="text-gray-900 mb-2">{patient.name}</h2>
                            <div className="text-gray-600">Patient ID: {patient.id.toString().padStart(6, '0')}</div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => navigate('/patient-overview')}
                              className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg hover:bg-yellow-600">
                              View Overview
                            </button>
                            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                              Edit
                            </button>
                            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                              Print
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="text-gray-500 mb-1">Date of Birth</div>
                            <div className="text-gray-900">{patient.dob}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-1">Insurance</div>
                            <div className="text-gray-900">{patient.insurance}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <div>
                              <div className="text-gray-500">Phone</div>
                              <div className="text-gray-900">{patient.phone}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <div>
                              <div className="text-gray-500">Email</div>
                              <div className="text-gray-900">{patient.email}</div>
                            </div>
                          </div>
                          <div className="col-span-2 flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-500 mt-1" />
                            <div>
                              <div className="text-gray-500">Address</div>
                              <div className="text-gray-900">{patient.address}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Appointment & Balance Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="flex items-center gap-3 mb-2">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <div className="text-gray-700">Last Visit</div>
                          </div>
                          <div className="text-gray-900">{patient.lastVisit}</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="flex items-center gap-3 mb-2">
                            <Calendar className="w-5 h-5 text-green-600" />
                            <div className="text-gray-700">Next Appointment</div>
                          </div>
                          <div className="text-gray-900">{patient.nextAppointment}</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="text-gray-700 mb-2">Account Balance</div>
                          <div className={`${
                            patient.balance === '$0.00' ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {patient.balance}
                          </div>
                        </div>
                      </div>

                      {/* Tabs */}
                      <div className="bg-white rounded-lg shadow">
                        <div className="border-b">
                          <div className="flex gap-4 px-6">
                            <button className="px-4 py-3 border-b-2 border-red-600 text-red-600">
                              Treatment History
                            </button>
                            <button className="px-4 py-3 text-gray-600 hover:text-gray-900">
                              Documents
                            </button>
                            <button className="px-4 py-3 text-gray-600 hover:text-gray-900">
                              Insurance
                            </button>
                            <button className="px-4 py-3 text-gray-600 hover:text-gray-900">
                              Notes
                            </button>
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="text-center py-12 text-gray-500">
                            Treatment history and details will be displayed here
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-gray-600 mb-2">No Patient Selected</h3>
                <p className="text-gray-500">Select a patient from the list to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}