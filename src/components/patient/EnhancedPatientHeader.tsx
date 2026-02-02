import { AlertCircle, DollarSign, Shield, Home, Calendar, Phone, Mail } from 'lucide-react';

interface PatientData {
  id: string;
  name: string;
  dob: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
}

interface PatientBalances {
  patientBalance: number;
  insuranceBalance: number;
  familyBalance: number;
  totalBalance: number;
}

interface InsuranceInfo {
  primary?: {
    carrier: string;
    planName: string;
    memberId: string;
    groupNumber?: string;
    status: 'Active' | 'Inactive' | 'Pending';
  };
  secondary?: {
    carrier: string;
    planName: string;
    memberId: string;
    status: 'Active' | 'Inactive' | 'Pending';
  };
}

interface EnhancedPatientHeaderProps {
  patient: PatientData;
  balances?: PatientBalances;
  insurance?: InsuranceInfo;
  homeOffice?: string;
  responsibleParty?: string;
  lastVisit?: string;
  nextAppointment?: string;
  compact?: boolean;
}

export default function EnhancedPatientHeader({
  patient,
  balances,
  insurance,
  homeOffice,
  responsibleParty,
  lastVisit,
  nextAppointment,
  compact = false,
}: EnhancedPatientHeaderProps) {
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getBalanceColor = (balance: number) => {
    if (balance === 0) return 'text-green-700';
    if (balance > 0 && balance < 100) return 'text-yellow-700';
    return 'text-red-700';
  };

  const getBalanceBgColor = (balance: number) => {
    if (balance === 0) return 'bg-green-50 border-green-200';
    if (balance > 0 && balance < 100) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getInsuranceStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'Inactive':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  if (compact) {
    return (
      <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Patient
            </div>
            <div className="font-bold text-slate-900">{patient.name}</div>
            <div className="text-xs text-slate-600">{patient.id}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              DOB / Age
            </div>
            <div className="font-semibold text-slate-900">
              {patient.dob} ({patient.age}y)
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Home Office
            </div>
            <div className="font-semibold text-slate-900">{homeOffice || 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Total Balance
            </div>
            <div className={`font-bold text-lg ${balances ? getBalanceColor(balances.totalBalance) : 'text-slate-900'}`}>
              {balances ? formatCurrency(balances.totalBalance) : '$0.00'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6 mb-6">
      {/* Primary Patient Information */}
      <div className="grid grid-cols-5 gap-4 pb-4 border-b-2 border-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Patient Name
          </div>
          <div className="font-bold text-slate-900 text-lg">{patient.name}</div>
          <div className="text-xs text-slate-600 font-medium">ID: {patient.id}</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            DOB / Age / Gender
          </div>
          <div className="font-semibold text-slate-900">
            {patient.dob}
          </div>
          <div className="text-sm text-slate-600">
            {patient.age}y • {patient.gender}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Contact
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-900 mb-1">
            <Phone className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
            {patient.phone}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-900">
            <Mail className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
            {patient.email}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Home Office
          </div>
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-slate-500" strokeWidth={2} />
            <span className="font-semibold text-slate-900">{homeOffice || 'Not Set'}</span>
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {lastVisit && `Last Visit: ${lastVisit}`}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Responsible Party
          </div>
          <div className="font-semibold text-slate-900">{responsibleParty || 'Self'}</div>
          {nextAppointment && (
            <div className="flex items-center gap-1 text-xs text-blue-700 mt-1">
              <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
              Next: {nextAppointment}
            </div>
          )}
        </div>
      </div>

      {/* Financial & Insurance Information */}
      <div className="grid grid-cols-2 gap-6 pt-4">
        {/* Balances */}
        {balances && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-slate-600" strokeWidth={2} />
              <h3 className="font-bold text-slate-900">Account Balances</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={`px-3 py-2 rounded-lg border-2 ${getBalanceBgColor(balances.patientBalance)}`}>
                <div className="text-xs font-semibold text-slate-700 uppercase mb-1">
                  Patient Balance
                </div>
                <div className={`font-bold text-lg ${getBalanceColor(balances.patientBalance)}`}>
                  {formatCurrency(balances.patientBalance)}
                </div>
              </div>
              <div className={`px-3 py-2 rounded-lg border-2 ${getBalanceBgColor(balances.insuranceBalance)}`}>
                <div className="text-xs font-semibold text-slate-700 uppercase mb-1">
                  Insurance Balance
                </div>
                <div className={`font-bold text-lg ${getBalanceColor(balances.insuranceBalance)}`}>
                  {formatCurrency(balances.insuranceBalance)}
                </div>
              </div>
              <div className={`px-3 py-2 rounded-lg border-2 ${getBalanceBgColor(balances.familyBalance)}`}>
                <div className="text-xs font-semibold text-slate-700 uppercase mb-1">
                  Family Balance
                </div>
                <div className={`font-bold text-lg ${getBalanceColor(balances.familyBalance)}`}>
                  {formatCurrency(balances.familyBalance)}
                </div>
              </div>
              <div className={`px-3 py-2 rounded-lg border-2 ${getBalanceBgColor(balances.totalBalance)}`}>
                <div className="text-xs font-semibold text-slate-700 uppercase mb-1">
                  Total Balance
                </div>
                <div className={`font-bold text-lg ${getBalanceColor(balances.totalBalance)}`}>
                  {formatCurrency(balances.totalBalance)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Insurance Information */}
        {insurance && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-slate-600" strokeWidth={2} />
              <h3 className="font-bold text-slate-900">Insurance Coverage</h3>
            </div>
            
            {insurance.primary ? (
              <div className="space-y-3">
                {/* Primary Insurance */}
                <div className="px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-900 uppercase">Primary Insurance</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getInsuranceStatusColor(insurance.primary.status)}`}>
                      {insurance.primary.status}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 mb-1">{insurance.primary.carrier}</div>
                  <div className="text-sm text-slate-700">{insurance.primary.planName}</div>
                  <div className="text-xs text-slate-600 mt-2">
                    Member ID: <span className="font-semibold">{insurance.primary.memberId}</span>
                    {insurance.primary.groupNumber && (
                      <span className="ml-3">
                        Group: <span className="font-semibold">{insurance.primary.groupNumber}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Secondary Insurance */}
                {insurance.secondary && (
                  <div className="px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-purple-900 uppercase">Secondary Insurance</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getInsuranceStatusColor(insurance.secondary.status)}`}>
                        {insurance.secondary.status}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 mb-1">{insurance.secondary.carrier}</div>
                    <div className="text-sm text-slate-700">{insurance.secondary.planName}</div>
                    <div className="text-xs text-slate-600 mt-2">
                      Member ID: <span className="font-semibold">{insurance.secondary.memberId}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border-2 border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600" strokeWidth={2} />
                <div>
                  <div className="font-semibold text-amber-900">No Insurance on File</div>
                  <div className="text-sm text-amber-700">Patient is self-pay</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
