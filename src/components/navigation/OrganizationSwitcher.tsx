import { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, Settings, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { components } from '../../styles/theme';
// import { mockOrganizations} from '../../data/organizationData';
// import type { Organization } from '../../data/organizationData';
// import { fetchOrganizations } from '../../services/organizationApi';

interface Office {
  id: string;
  name: string;
  code: string;
  address: string;
  displayName: string; // For dropdown display: "Office Name [Code]"
  is_current: boolean
}

interface Organization {
  id: string;
  name: string;
  code: string;
  offices: Office[];
  is_current: boolean;
}



export default function OrganizationSwitcher() {
  const { user, organizations, currentOrganization, setCurrentOrganization } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get current organization object
  const activeOrg = organizations.find(org => 
    org.name === currentOrganization || org.code === currentOrganization || org.id === currentOrganization
    ) || organizations[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // CRITICAL: Only render for OWNER role
  // if (!user || (user.role !== 'owner' && !user.isOrgOwner)) {
  //   return null;
  // }

  const handleOrgSwitch = (org: Organization) => {
    setCurrentOrganization(org.name);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Organization Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border-2 border-[#E2E8F0] hover:border-[#3A6EA5] hover:bg-[#F7F9FC] transition-all duration-200 group"
        title="Switch or manage organizations"
      >
        <Building2 className="w-5 h-5 text-[#3A6EA5]" strokeWidth={2} />
        <div className="flex flex-col items-start">
          <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
            Organization
          </span>
          <span className="text-sm font-bold text-[#1F3A5F]">
            {activeOrg?.name}
          </span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          strokeWidth={2}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[380px] bg-white rounded-lg shadow-2xl border-2 border-[#E2E8F0] overflow-hidden z-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-4 py-3 border-b-2 border-[#E2E8F0]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                <h3 className="font-bold text-white">
                  My Organizations
                </h3>
              </div>
              <span className="text-xs font-semibold text-white/80 bg-white/20 px-2 py-1 rounded">
                {organizations.length} Total
              </span>
            </div>
            <p className="text-xs text-white/70 mt-1">
              Select an organization to view its offices
            </p>
          </div>

          {/* Organizations List (WITHOUT nested offices) */}
          <div className="max-h-[400px] overflow-y-auto">
            {organizations.map((org) => {
              const isActive = org.id === activeOrg?.id;
              
              return (
                <button
                  key={org.id}
                  onClick={() => handleOrgSwitch(org)}
                  className={`w-full border-b-2 border-[#E2E8F0] last:border-b-0 ${
                    isActive ? 'bg-[#E8EFF7]' : 'bg-white hover:bg-[#F7F9FC]'
                  } transition-colors`}
                >
                  {/* Organization Item */}
                  <div className="px-4 py-3 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isActive
                          ? 'bg-gradient-to-br from-[#3A6EA5] to-[#5A8EC5]'
                          : 'bg-gradient-to-br from-[#64748B] to-[#94A3B8]'
                      } shadow-md`}>
                        <Building2 className="w-6 h-6 text-white" strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className={`font-bold text-base ${
                          isActive ? 'text-[#1F3A5F]' : 'text-[#1E293B]'
                        }`}>
                          {org.name}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-white bg-[#3A6EA5] px-2 py-0.5 rounded">
                            {org.code}
                          </span>
                          <span className="text-xs text-[#64748B] font-medium">
                            {org.offices.length} {org.offices.length === 1 ? 'Office' : 'Offices'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <Check className="w-6 h-6 text-[#2FB9A7]" strokeWidth={3} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="border-t-2 border-[#E2E8F0] bg-[#F7F9FC] px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => {
                alert('Manage Organizations feature - would open full management panel');
                setIsOpen(false);
              }}
              className={components.buttonSecondary + " text-xs flex items-center gap-2"}
            >
              <Settings className="w-4 h-4" strokeWidth={2} />
              Manage All
            </button>
            <button
              onClick={() => {
                alert('Add Organization feature - would open creation form');
                setIsOpen(false);
              }}
              className={components.buttonPrimary + " text-xs flex items-center gap-2"}
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Add Organization
            </button>
          </div>
        </div>
      )}
    </div>
  );
}