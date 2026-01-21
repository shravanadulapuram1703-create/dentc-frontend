import { FileText } from 'lucide-react';

export default function ContractsTab() {
  const handleFutureImplementation = () => {
    alert('Contracts - future implementation');
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#F7F9FC] border-2 border-[#E2E8F0] p-8 rounded-lg text-center">
        <FileText className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
        <h3 className="text-[#1E293B] font-bold mb-2 text-lg">Payment Plans & Contracts</h3>
        <p className="text-[#64748B] text-sm mb-6">
          This section will display regular patient payment plans, ortho patient payment plans, 
          and ortho insurance payment plans.
        </p>
        <button 
          onClick={handleFutureImplementation}
          className="px-6 py-2 bg-[#3A6EA5] text-white rounded hover:bg-[#1F3A5F] transition-colors text-sm font-medium"
        >
          Configure Contracts
        </button>
      </div>
    </div>
  );
}
