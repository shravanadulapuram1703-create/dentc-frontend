import GlobalNav from '../GlobalNav';
import { BarChart3, Download, Calendar, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ReportsProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

export default function Reports({ onLogout, currentOffice, setCurrentOffice }: ReportsProps) {
  const revenueData = [
    { month: 'Jan', revenue: 45000, expenses: 28000 },
    { month: 'Feb', revenue: 52000, expenses: 30000 },
    { month: 'Mar', revenue: 48000, expenses: 29000 },
    { month: 'Apr', revenue: 61000, expenses: 32000 },
    { month: 'May', revenue: 55000, expenses: 31000 },
    { month: 'Jun', revenue: 67000, expenses: 33000 },
  ];

  const patientData = [
    { month: 'Jan', new: 45, returning: 120 },
    { month: 'Feb', new: 52, returning: 135 },
    { month: 'Mar', new: 48, returning: 142 },
    { month: 'Apr', new: 61, returning: 156 },
    { month: 'May', new: 55, returning: 148 },
    { month: 'Jun', new: 67, returning: 162 },
  ];

  const procedureData = [
    { name: 'Cleanings', value: 450 },
    { name: 'Fillings', value: 320 },
    { name: 'Crowns', value: 180 },
    { name: 'Root Canals', value: 95 },
    { name: 'Extractions', value: 75 },
    { name: 'Other', value: 130 },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

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
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-gray-900">Reports & Analytics</h1>
              <p className="text-gray-600">Practice performance and statistics</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Last 6 Months</option>
              <option>Last Year</option>
              <option>This Year</option>
              <option>Custom Range</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow">
              <Download className="w-5 h-5" />
              Export Report
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 mb-2">Total Revenue (6mo)</div>
            <div className="text-blue-600 mb-2">$328,000</div>
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span>+12.5%</span>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 mb-2">Total Patients</div>
            <div className="text-blue-600 mb-2">1,247</div>
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span>+8.3%</span>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 mb-2">Avg Revenue/Patient</div>
            <div className="text-blue-600 mb-2">$263</div>
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span>+3.8%</span>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 mb-2">Collection Rate</div>
            <div className="text-blue-600 mb-2">94.2%</div>
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span>+1.2%</span>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-gray-900 mb-4">Revenue vs Expenses</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Patient Trend Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-gray-900 mb-4">Patient Trends</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={patientData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="new" stroke="#10b981" name="New Patients" strokeWidth={2} />
                <Line type="monotone" dataKey="returning" stroke="#3b82f6" name="Returning Patients" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Procedure Distribution */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-6">
            <h2 className="text-gray-900 mb-4">Procedure Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={procedureData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {procedureData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Reports */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-gray-900 mb-4">Quick Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
                <div className="text-gray-900 mb-1">Daily Production Report</div>
                <div className="text-gray-600">View today's production summary</div>
              </button>
              <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
                <div className="text-gray-900 mb-1">Accounts Receivable</div>
                <div className="text-gray-600">Outstanding patient balances</div>
              </button>
              <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
                <div className="text-gray-900 mb-1">Insurance Aging</div>
                <div className="text-gray-600">Pending insurance claims</div>
              </button>
              <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
                <div className="text-gray-900 mb-1">Provider Production</div>
                <div className="text-gray-600">Production by provider</div>
              </button>
              <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
                <div className="text-gray-900 mb-1">Patient Demographics</div>
                <div className="text-gray-600">Patient statistics and trends</div>
              </button>
              <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
                <div className="text-gray-900 mb-1">Treatment Analysis</div>
                <div className="text-gray-600">Most common procedures</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
