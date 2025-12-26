import GlobalNav from '../GlobalNav';
import { CreditCard, DollarSign, Search, Plus, Filter, Download } from 'lucide-react';
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';

// No props needed when used in patient context - gets data from outlet
export default function Transactions(props?: { onLogout?: () => void; currentOffice?: string; setCurrentOffice?: (office: string) => void }) {
  // If used in patient context, get patient from outlet
  const outletContext = useOutletContext<{ patient: any } | null>();
  const patient = outletContext?.patient;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'payment' | 'charge' | 'adjustment'>('all');

  const transactions = [
    {
      id: 'TXN-001',
      date: '03/22/2024',
      patient: 'John Smith',
      type: 'payment',
      description: 'Payment - Check #1234',
      amount: -150.00,
      balance: 0.00
    },
    {
      id: 'TXN-002',
      date: '03/22/2024',
      patient: 'Sarah Johnson',
      type: 'charge',
      description: 'Root Canal Treatment',
      amount: 1200.00,
      balance: 1200.00
    },
    {
      id: 'TXN-003',
      date: '03/21/2024',
      patient: 'Michael Brown',
      type: 'payment',
      description: 'Payment - Credit Card',
      amount: -225.50,
      balance: 0.00
    },
    {
      id: 'TXN-004',
      date: '03/21/2024',
      patient: 'Emily Davis',
      type: 'charge',
      description: 'Dental Cleaning',
      amount: 150.00,
      balance: 75.00
    },
    {
      id: 'TXN-005',
      date: '03/20/2024',
      patient: 'Emily Davis',
      type: 'payment',
      description: 'Payment - Cash',
      amount: -75.00,
      balance: 75.00
    },
    {
      id: 'TXN-006',
      date: '03/20/2024',
      patient: 'David Wilson',
      type: 'charge',
      description: 'Crown Preparation',
      amount: 850.00,
      balance: 850.00
    },
    {
      id: 'TXN-007',
      date: '03/19/2024',
      patient: 'Lisa Anderson',
      type: 'adjustment',
      description: 'Insurance Adjustment',
      amount: -100.00,
      balance: 250.00
    },
  ];

  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch = txn.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         txn.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         txn.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || txn.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const totalCharges = transactions.filter(t => t.type === 'charge').reduce((sum, t) => sum + t.amount, 0);
  const totalPayments = Math.abs(transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0));
  const totalBalance = transactions.reduce((sum, t) => sum + (t.type === 'charge' ? t.amount : 0), 0) - totalPayments;

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
            <CreditCard className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-gray-900">Transactions</h1>
              <p className="text-gray-600">Manage payments, charges, and adjustments</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shadow">
              <Download className="w-5 h-5" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow">
              <Plus className="w-5 h-5" />
              New Transaction
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600">Total Charges</div>
              <DollarSign className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-red-600">${totalCharges.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600">Total Payments</div>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-green-600">${totalPayments.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600">Outstanding Balance</div>
              <DollarSign className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="text-yellow-600">${totalBalance.toFixed(2)}</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filterType === 'all' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('payment')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filterType === 'payment' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Payments
              </button>
              <button
                onClick={() => setFilterType('charge')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filterType === 'charge' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Charges
              </button>
              <button
                onClick={() => setFilterType('adjustment')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filterType === 'adjustment' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Adjustments
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700">Transaction ID</th>
                <th className="px-6 py-3 text-left text-gray-700">Date</th>
                <th className="px-6 py-3 text-left text-gray-700">Patient</th>
                <th className="px-6 py-3 text-left text-gray-700">Description</th>
                <th className="px-6 py-3 text-left text-gray-700">Type</th>
                <th className="px-6 py-3 text-right text-gray-700">Amount</th>
                <th className="px-6 py-3 text-right text-gray-700">Balance</th>
                <th className="px-6 py-3 text-center text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{txn.id}</td>
                  <td className="px-6 py-4 text-gray-600">{txn.date}</td>
                  <td className="px-6 py-4 text-gray-900">{txn.patient}</td>
                  <td className="px-6 py-4 text-gray-600">{txn.description}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full ${
                      txn.type === 'payment' ? 'bg-green-100 text-green-700' :
                      txn.type === 'charge' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right ${
                    txn.amount < 0 ? 'text-green-600' : 'text-gray-900'
                  }`}>
                    ${Math.abs(txn.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    ${txn.balance.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-blue-600 hover:text-blue-700">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}