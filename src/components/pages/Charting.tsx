import GlobalNav from '../GlobalNav';
import { FileText, Printer, Save } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

interface ChartingProps {
  onLogout?: () => void;
  currentOffice?: string;
  setCurrentOffice?: (office: string) => void;
}

export default function Charting(props?: ChartingProps) {
  // If used in patient context, get patient from outlet
  const outletContext = useOutletContext<{ patient: any } | null>();
  const patient = outletContext?.patient;

  // Tooth numbers (universal numbering system)
  const upperTeeth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const lowerTeeth = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17];

  return (
    <div className={props ? "min-h-screen bg-gray-50" : "p-6 bg-slate-50"}>
      {props && props.onLogout && (
        <GlobalNav 
          onLogout={props.onLogout} 
          currentOffice={props.currentOffice!}
          setCurrentOffice={props.setCurrentOffice!}
        />
      )}
      
      <div className={props ? "p-6" : ""}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <FileText className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-gray-900">Dental Charting</h1>
              <p className="text-gray-600">Patient: {patient ? `${patient.firstName} ${patient.lastName} - DOB: ${patient.dob}` : "John Smith - DOB: 05/15/1980"}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shadow">
              <Printer className="w-5 h-5" />
              Print Chart
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow">
              <Save className="w-5 h-5" />
              Save Changes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Odontogram */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-gray-900 mb-6">Odontogram</h2>
            
            {/* Upper Teeth */}
            <div className="mb-8">
              <div className="text-gray-600 mb-4">Upper Arch</div>
              <div className="flex justify-center gap-2 mb-2">
                {upperTeeth.map((tooth) => (
                  <button
                    key={tooth}
                    className="w-12 h-16 border-2 border-gray-300 rounded hover:border-red-500 hover:bg-red-50 transition-colors flex flex-col items-center justify-center group"
                  >
                    <div className="text-gray-600 mb-1">{tooth}</div>
                    <div className="w-8 h-10 bg-white border border-gray-300 rounded-sm group-hover:bg-red-50"></div>
                  </button>
                ))}
              </div>
            </div>

            {/* Lower Teeth */}
            <div>
              <div className="text-gray-600 mb-4">Lower Arch</div>
              <div className="flex justify-center gap-2 mb-2">
                {lowerTeeth.map((tooth) => (
                  <button
                    key={tooth}
                    className="w-12 h-16 border-2 border-gray-300 rounded hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center group"
                  >
                    <div className="text-gray-600 mb-1">{tooth}</div>
                    <div className="w-8 h-10 bg-white border border-gray-300 rounded-sm group-hover:bg-blue-50"></div>
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <div className="text-gray-700 mb-3">Chart Symbols</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded"></div>
                  <span className="text-gray-600">Filling</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-500 rounded"></div>
                  <span className="text-gray-600">Cavity</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-yellow-500 rounded"></div>
                  <span className="text-gray-600">Crown</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-500 rounded"></div>
                  <span className="text-gray-600">Missing</span>
                </div>
              </div>
            </div>
          </div>

          {/* Treatment Notes */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-gray-900 mb-4">Treatment Tools</h2>
              <div className="space-y-2">
                <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Add Filling
                </button>
                <button className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                  Add Crown
                </button>
                <button className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                  Add Root Canal
                </button>
                <button className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                  Mark Extraction
                </button>
                <button className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                  Add Implant
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-gray-900 mb-4">Clinical Notes</h2>
              <textarea
                className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter clinical notes here..."
              ></textarea>
              <button className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Add Note
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-gray-900 mb-4">Recent Treatments</h2>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-gray-900 mb-1">Tooth #14 - Filling</div>
                  <div className="text-gray-600">03/15/2024</div>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-gray-900 mb-1">Tooth #3 - Crown</div>
                  <div className="text-gray-600">02/10/2024</div>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-gray-900 mb-1">Routine Cleaning</div>
                  <div className="text-gray-600">01/05/2024</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}