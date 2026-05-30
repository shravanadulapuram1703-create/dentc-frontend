import { useState, useEffect, useCallback } from 'react';
import { Building2, User, Phone, Globe, AlertCircle, ArrowRight, ArrowLeft, Shield, Save, Edit, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchCommunications,
  updateCommunications,
  verifyTelecom,
  fetchPhoneAssignments,
  updatePhoneAssignments,
  accountSetupLookups,
} from '../../../services/accountSetupApi';
import type { LookupOption } from '../../../services/accountSetupTransform';

interface Office {
  id: string;
  name: string;
  isModel: boolean;
}

function mapCommRowToState(row: Record<string, unknown>) {
  return {
    businessName: String(row.business_name ?? ''),
    regionOfOperations: String(row.region_of_operations ?? ''),
    country: String(row.country ?? ''),
    addressLine1: String(row.comm_address_line_1 ?? ''),
    city: String(row.comm_city ?? ''),
    state: String(row.comm_state ?? ''),
    zip: String(row.comm_zip ?? ''),
    ein: String(row.ein ?? ''),
    website: String(row.website ?? ''),
    contactFirstName: String(row.comm_contact_first_name ?? ''),
    contactLastName: String(row.comm_contact_last_name ?? ''),
    businessTitle: String(row.business_title ?? ''),
    position: String(row.position ?? ''),
    contactEmail: String(row.comm_contact_email ?? ''),
    contactPhone: String(row.comm_contact_phone ?? ''),
    businessType: String(row.business_type ?? ''),
    companyStatus: String(row.company_status ?? ''),
    stockSymbol: String(row.stock_symbol ?? ''),
    stockExchange: String(row.stock_exchange ?? ''),
    businessIdentity: String(row.business_identity ?? ''),
    businessIndustry: String(row.business_industry ?? ''),
    telecomStatus: String(row.telecom_status ?? 'pending') as 'approved' | 'pending' | 'rejected',
  };
}

function stateToPutPayload(s: ReturnType<typeof mapCommRowToState>, einDirty: boolean, einValue: string) {
  return {
    business_name: s.businessName,
    region_of_operations: s.regionOfOperations,
    country: s.country,
    comm_address_line_1: s.addressLine1,
    comm_city: s.city,
    comm_state: s.state,
    comm_zip: s.zip,
    ...(einDirty ? { ein: einValue } : {}),
    website: s.website,
    comm_contact_first_name: s.contactFirstName,
    comm_contact_last_name: s.contactLastName,
    business_title: s.businessTitle || null,
    position: s.position || null,
    comm_contact_email: s.contactEmail,
    comm_contact_phone: s.contactPhone,
    business_type: s.businessType || null,
    company_status: s.companyStatus || null,
    stock_symbol: s.stockSymbol || null,
    stock_exchange: s.stockExchange || null,
    business_identity: s.businessIdentity || null,
    business_industry: s.businessIndustry || null,
  };
}

type CommFormSnapshot = {
  businessName: string;
  regionOfOperations: string;
  country: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  ein: string;
  website: string;
  contactFirstName: string;
  contactLastName: string;
  businessTitle: string;
  position: string;
  contactEmail: string;
  contactPhone: string;
  officeSpecific: Office[];
  multiOfficeShared: Office[];
  businessType: string;
  companyStatus: string;
  stockSymbol: string;
  stockExchange: string;
  businessIdentity: string;
  businessIndustry: string;
  telecomStatus: 'approved' | 'pending' | 'rejected';
};

function partitionAssignments(rows: { office_id: string; assignment_type: string; office_name?: string; is_model_office?: boolean }[]) {
  const officeSpecific: Office[] = [];
  const multiOfficeShared: Office[] = [];
  for (const r of rows) {
    const o: Office = {
      id: r.office_id,
      name: r.office_name ?? r.office_id,
      isModel: Boolean(r.is_model_office),
    };
    if (r.assignment_type === 'OFFICE_SPECIFIC') officeSpecific.push(o);
    else if (r.assignment_type === 'MULTI_OFFICE_SHARED') multiOfficeShared.push(o);
  }
  return { officeSpecific, multiOfficeShared };
}

type CommunicationsTabContentProps = {
  accountId: string;
};

export function CommunicationsTabContent({ accountId }: CommunicationsTabContentProps) {
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [regionOfOperations, setRegionOfOperations] = useState('');
  const [country, setCountry] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [ein, setEin] = useState('');
  const [einBaseline, setEinBaseline] = useState('');
  const [website, setWebsite] = useState('');

  const [contactFirstName, setContactFirstName] = useState('');
  const [contactLastName, setContactLastName] = useState('');
  const [businessTitle, setBusinessTitle] = useState('');
  const [position, setPosition] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [officeSpecific, setOfficeSpecific] = useState<Office[]>([]);
  const [multiOfficeShared, setMultiOfficeShared] = useState<Office[]>([]);

  const [selectedOfficeSpecific, setSelectedOfficeSpecific] = useState<string[]>([]);
  const [selectedMultiOffice, setSelectedMultiOffice] = useState<string[]>([]);

  const [businessType, setBusinessType] = useState('');
  const [companyStatus, setCompanyStatus] = useState('');
  const [stockSymbol, setStockSymbol] = useState('');
  const [stockExchange, setStockExchange] = useState('');
  const [businessIdentity, setBusinessIdentity] = useState('');
  const [businessIndustry, setBusinessIndustry] = useState('');

  const [telecomStatus, setTelecomStatus] = useState<'approved' | 'pending' | 'rejected'>('pending');

  const [usStateOptions, setUsStateOptions] = useState<LookupOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<LookupOption[]>([]);
  const [businessTypeOptions, setBusinessTypeOptions] = useState<LookupOption[]>([]);
  const [companyStatusOptions, setCompanyStatusOptions] = useState<LookupOption[]>([]);
  const [stockExchangeOptions, setStockExchangeOptions] = useState<LookupOption[]>([]);
  const [businessIndustryOptions, setBusinessIndustryOptions] = useState<LookupOption[]>([]);

  const [loadedSnapshot, setLoadedSnapshot] = useState<CommFormSnapshot | null>(null);

  const applySnapshot = useCallback((snap: CommFormSnapshot) => {
    setBusinessName(snap.businessName);
    setRegionOfOperations(snap.regionOfOperations);
    setCountry(snap.country);
    setAddressLine1(snap.addressLine1);
    setCity(snap.city);
    setState(snap.state);
    setZip(snap.zip);
    setEin(snap.ein);
    setEinBaseline(snap.ein);
    setWebsite(snap.website);
    setContactFirstName(snap.contactFirstName);
    setContactLastName(snap.contactLastName);
    setBusinessTitle(snap.businessTitle);
    setPosition(snap.position);
    setContactEmail(snap.contactEmail);
    setContactPhone(snap.contactPhone);
    setOfficeSpecific(snap.officeSpecific);
    setMultiOfficeShared(snap.multiOfficeShared);
    setBusinessType(snap.businessType);
    setCompanyStatus(snap.companyStatus);
    setStockSymbol(snap.stockSymbol);
    setStockExchange(snap.stockExchange);
    setBusinessIdentity(snap.businessIdentity);
    setBusinessIndustry(snap.businessIndustry);
    setTelecomStatus(snap.telecomStatus);
  }, []);

  const loadAll = useCallback(async () => {
    setPageLoading(true);
    try {
      const [st, countries, bt, cs, se, ind] = await Promise.all([
        accountSetupLookups.states(),
        accountSetupLookups.countries(),
        accountSetupLookups.businessTypes(),
        accountSetupLookups.companyStatuses(),
        accountSetupLookups.stockExchanges(),
        accountSetupLookups.businessIndustries(),
      ]);
      setUsStateOptions(st);
      setCountryOptions(countries);
      setBusinessTypeOptions(bt);
      setCompanyStatusOptions(cs);
      setStockExchangeOptions(se);
      setBusinessIndustryOptions(ind);

      const [comm, phones] = await Promise.all([
        fetchCommunications(accountId),
        fetchPhoneAssignments(accountId),
      ]);

      const m = mapCommRowToState(comm);
      setBusinessName(m.businessName);
      setRegionOfOperations(m.regionOfOperations);
      setCountry(m.country);
      setAddressLine1(m.addressLine1);
      setCity(m.city);
      setState(m.state);
      setZip(m.zip);
      setEin(m.ein);
      setEinBaseline(m.ein);
      setWebsite(m.website);
      setContactFirstName(m.contactFirstName);
      setContactLastName(m.contactLastName);
      setBusinessTitle(m.businessTitle);
      setPosition(m.position);
      setContactEmail(m.contactEmail);
      setContactPhone(m.contactPhone);
      setBusinessType(m.businessType);
      setCompanyStatus(m.companyStatus);
      setStockSymbol(m.stockSymbol);
      setStockExchange(m.stockExchange);
      setBusinessIdentity(m.businessIdentity);
      setBusinessIndustry(m.businessIndustry);
      setTelecomStatus(m.telecomStatus);

      const { officeSpecific: os, multiOfficeShared: ms } = partitionAssignments(
        phones as Record<string, unknown>[]
      );
      setOfficeSpecific(os);
      setMultiOfficeShared(ms);

      setLoadedSnapshot({
        businessName: m.businessName,
        regionOfOperations: m.regionOfOperations,
        country: m.country,
        addressLine1: m.addressLine1,
        city: m.city,
        state: m.state,
        zip: m.zip,
        ein: m.ein,
        website: m.website,
        contactFirstName: m.contactFirstName,
        contactLastName: m.contactLastName,
        businessTitle: m.businessTitle,
        position: m.position,
        contactEmail: m.contactEmail,
        contactPhone: m.contactPhone,
        officeSpecific: os,
        multiOfficeShared: ms,
        businessType: m.businessType,
        companyStatus: m.companyStatus,
        stockSymbol: m.stockSymbol,
        stockExchange: m.stockExchange,
        businessIdentity: m.businessIdentity,
        businessIndustry: m.businessIndustry,
        telecomStatus: m.telecomStatus,
      });
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Failed to load";
      toast.error("Could not load communications", { description: msg });
    } finally {
      setPageLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    if (loadedSnapshot) {
      applySnapshot(loadedSnapshot);
    }
    toast.info('Changes cancelled');
  };

  const handleSave = async () => {
    if (!businessName || !country || !addressLine1 || !city || !state || !zip || !website) {
      toast.error('Please fill in all required fields in Business Information');
      return;
    }

    if (!contactFirstName || !contactLastName || !contactEmail || !contactPhone) {
      toast.error('Please fill in all required fields in Business Contact');
      return;
    }

    if (officeSpecific.length > 5) {
      toast.error('Maximum 5 offices allowed for Office-Specific Number (Twilio toll-free limit)');
      return;
    }

    const s = mapCommRowToState({
      business_name: businessName,
      region_of_operations: regionOfOperations,
      country,
      comm_address_line_1: addressLine1,
      comm_city: city,
      comm_state: state,
      comm_zip: zip,
      ein,
      website,
      comm_contact_first_name: contactFirstName,
      comm_contact_last_name: contactLastName,
      business_title: businessTitle,
      position,
      comm_contact_email: contactEmail,
      comm_contact_phone: contactPhone,
      business_type: businessType,
      company_status: companyStatus,
      stock_symbol: stockSymbol,
      stock_exchange: stockExchange,
      business_identity: businessIdentity,
      business_industry: businessIndustry,
      telecom_status: telecomStatus,
    });

    const einDirty = ein !== einBaseline;

    setSaving(true);
    try {
      await updateCommunications(accountId, stateToPutPayload(s, einDirty, ein));

      const assignments = [
        ...officeSpecific.map((o) => ({
          office_id: o.id,
          assignment_type: 'OFFICE_SPECIFIC' as const,
          is_model_office: o.isModel,
        })),
        ...multiOfficeShared.map((o) => ({
          office_id: o.id,
          assignment_type: 'MULTI_OFFICE_SHARED' as const,
          is_model_office: o.isModel,
        })),
      ];
      await updatePhoneAssignments(accountId, { assignments });

      try {
        await verifyTelecom(accountId);
      } catch {
        /* optional */
      }

      await loadAll();
      setIsEditMode(false);
      toast.success('Communication settings saved successfully. Telecom provider sync initiated.');
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Save failed";
      toast.error("Save failed", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  const moveToOfficeSpecific = () => {
    const selected = multiOfficeShared.filter((o) => selectedMultiOffice.includes(o.id));

    if (officeSpecific.length + selected.length > 5) {
      toast.error('Maximum 5 offices allowed for Office-Specific Number');
      return;
    }

    setOfficeSpecific([...officeSpecific, ...selected]);
    setMultiOfficeShared(multiOfficeShared.filter((o) => !selectedMultiOffice.includes(o.id)));
    setSelectedMultiOffice([]);
  };

  const moveToMultiOfficeShared = () => {
    const selected = officeSpecific.filter((o) => selectedOfficeSpecific.includes(o.id));

    if (selected.some((o) => o.isModel)) {
      toast.error('Model office cannot be assigned to Multi-Office Shared Number');
      return;
    }

    setMultiOfficeShared([...multiOfficeShared, ...selected]);
    setOfficeSpecific(officeSpecific.filter((o) => !selectedOfficeSpecific.includes(o.id)));
    setSelectedOfficeSpecific([]);
  };

  const toggleOfficeSpecificSelection = (id: string) => {
    if (selectedOfficeSpecific.includes(id)) {
      setSelectedOfficeSpecific(selectedOfficeSpecific.filter((sid) => sid !== id));
    } else {
      setSelectedOfficeSpecific([...selectedOfficeSpecific, id]);
    }
  };

  const toggleMultiOfficeSelection = (id: string) => {
    if (selectedMultiOffice.includes(id)) {
      setSelectedMultiOffice(selectedMultiOffice.filter((sid) => sid !== id));
    } else {
      setSelectedMultiOffice([...selectedMultiOffice, id]);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        <span className="text-sm font-bold">Loading communications…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Permission Notice */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-amber-900">
            Restricted Access: Only Super Admin and Account Owner can modify communication settings.
          </p>
          <p className="text-xs text-amber-800 mt-1">
            These settings affect telecom compliance, SMS routing, and legal business identity.
          </p>
        </div>
      </div>

      {/* Telecom Status Badge */}
      {!isEditMode && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#1E293B]">Telecom Verification Status:</span>
          <span
            className={`px-3 py-1.5 text-xs font-bold rounded ${
              telecomStatus === 'approved'
                ? 'bg-green-100 text-green-700'
                : telecomStatus === 'pending'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {telecomStatus === 'approved' && '✓ Approved'}
            {telecomStatus === 'pending' && '⏳ Pending Verification'}
            {telecomStatus === 'rejected' && '✗ Rejected'}
          </span>
        </div>
      )}

      {/* BUSINESS INFORMATION SECTION */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <Building2 className="w-4 h-4 text-[#3A6EA5]" />
          Business Information
        </h3>
        <div className="bg-[#F7F9FC] p-4 rounded-lg border-2 border-[#E2E8F0] space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Business Region of Operations
              </label>
              <input
                type="text"
                value={regionOfOperations}
                onChange={(e) => setRegionOfOperations(e.target.value)}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Physical Address Country <span className="text-red-500">*</span>
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              >
                <option value="">Select country</option>
                {countryOptions.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Physical Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                disabled={!isEditMode}
                placeholder="Street address, suite, etc."
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm uppercase ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              >
                <option value="">State</option>
                {usStateOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                ZIP Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                disabled={!isEditMode}
                placeholder="90210"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                EIN / SSN
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ein}
                  onChange={(e) => setEin(e.target.value)}
                  disabled={!isEditMode}
                  placeholder={businessType === 'Sole Proprietorship' ? 'XXX-XX-XXXX (SSN)' : 'XX-XXXXXXX (EIN)'}
                  className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                    isEditMode
                      ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                      : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                  }`}
                />
                <div className="absolute right-3 top-2.5">
                  <Shield className="w-4 h-4 text-[#64748B]" title="Encrypted at rest" />
                </div>
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                {businessType === 'Corporation' ? 'EIN required for corporations' : 'Use EIN if available, otherwise SSN'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Website <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={!isEditMode}
                placeholder="https://www.example.com"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* BUSINESS CONTACT SECTION */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <User className="w-4 h-4 text-[#3A6EA5]" />
          Business Contact
        </h3>
        <div className="bg-[#F7F9FC] p-4 rounded-lg border-2 border-[#E2E8F0]">
          <p className="text-xs text-[#64748B] mb-4 font-bold">
            Principal responsible contact for telecom registration, SMS compliance, and legal correspondence.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Contact First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contactFirstName}
                onChange={(e) => setContactFirstName(e.target.value)}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Contact Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contactLastName}
                onChange={(e) => setContactLastName(e.target.value)}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Business Title
              </label>
              <input
                type="text"
                value={businessTitle}
                onChange={(e) => setBusinessTitle(e.target.value)}
                disabled={!isEditMode}
                placeholder="e.g., Practice Owner"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Position
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                disabled={!isEditMode}
                placeholder="e.g., DDS, DMD"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={!isEditMode}
                placeholder="contact@example.com"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={!isEditMode}
                placeholder="+1 (555) 123-4567"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
              <p className="text-xs text-[#64748B] mt-1">E.164 format required</p>
            </div>
          </div>
        </div>
      </div>

      {/* PHONE NUMBER SECTION */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <Phone className="w-4 h-4 text-[#3A6EA5]" />
          Phone Number Assignment
        </h3>
        <div className="bg-[#F7F9FC] p-4 rounded-lg border-2 border-[#E2E8F0]">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs font-bold text-blue-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Maximum 5 offices for Office-Specific Number (Twilio toll-free limit). Model office (marked in red) cannot be assigned to Multi-Office Shared.
              </span>
            </p>
          </div>

          <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-start">
            <div>
              <h4 className="text-xs font-bold text-[#1E293B] mb-2">
                Office Specific Number ({officeSpecific.length}/5)
              </h4>
              <div className="bg-white border-2 border-[#CBD5E1] rounded-lg p-3 min-h-[200px] space-y-2">
                {officeSpecific.map((office) => (
                  <div
                    key={office.id}
                    onClick={() => isEditMode && toggleOfficeSpecificSelection(office.id)}
                    className={`p-2 rounded border-2 text-sm transition-all cursor-pointer ${
                      office.isModel
                        ? 'bg-red-50 border-red-300 text-red-900'
                        : selectedOfficeSpecific.includes(office.id)
                        ? 'bg-[#3A6EA5] text-white border-[#3A6EA5]'
                        : 'bg-[#F7F9FC] border-[#E2E8F0] text-[#1E293B] hover:border-[#3A6EA5]'
                    } ${!isEditMode ? 'cursor-default' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{office.name}</span>
                      {office.isModel && (
                        <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">MODEL</span>
                      )}
                    </div>
                  </div>
                ))}
                {officeSpecific.length === 0 && (
                  <p className="text-xs text-[#64748B] text-center py-8">No offices assigned</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 items-center justify-center pt-8">
              <button
                onClick={moveToOfficeSpecific}
                disabled={!isEditMode || selectedMultiOffice.length === 0}
                className={`p-2 rounded-lg transition-colors ${
                  isEditMode && selectedMultiOffice.length > 0
                    ? 'bg-[#3A6EA5] text-white hover:bg-[#2C5282]'
                    : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                }`}
                title="Move to Office Specific"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={moveToMultiOfficeShared}
                disabled={!isEditMode || selectedOfficeSpecific.length === 0}
                className={`p-2 rounded-lg transition-colors ${
                  isEditMode && selectedOfficeSpecific.length > 0
                    ? 'bg-[#3A6EA5] text-white hover:bg-[#2C5282]'
                    : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                }`}
                title="Move to Multi-Office Shared"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#1E293B] mb-2">Multi-Office Shared Number</h4>
              <div className="bg-white border-2 border-[#CBD5E1] rounded-lg p-3 min-h-[200px] space-y-2">
                {multiOfficeShared.map((office) => (
                  <div
                    key={office.id}
                    onClick={() => isEditMode && toggleMultiOfficeSelection(office.id)}
                    className={`p-2 rounded border-2 text-sm transition-all cursor-pointer ${
                      selectedMultiOffice.includes(office.id)
                        ? 'bg-[#3A6EA5] text-white border-[#3A6EA5]'
                        : 'bg-[#F7F9FC] border-[#E2E8F0] text-[#1E293B] hover:border-[#3A6EA5]'
                    } ${!isEditMode ? 'cursor-default' : ''}`}
                  >
                    <span className="font-bold text-xs">{office.name}</span>
                  </div>
                ))}
                {multiOfficeShared.length === 0 && (
                  <p className="text-xs text-[#64748B] text-center py-8">No offices assigned</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BUSINESS TYPE SECTION */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <Globe className="w-4 h-4 text-[#3A6EA5]" />
          Business Type
        </h3>
        <div className="bg-[#F7F9FC] p-4 rounded-lg border-2 border-[#E2E8F0]">
          <p className="text-xs text-[#64748B] mb-4 font-bold">
            Required for telecom compliance and A2P campaign registration.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Business Type
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              >
                <option value="">Select…</option>
                {businessTypeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Company Status
              </label>
              <select
                value={companyStatus}
                onChange={(e) => setCompanyStatus(e.target.value)}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              >
                <option value="">Select…</option>
                {companyStatusOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {companyStatus === 'Publicly Traded' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-2">
                    Stock Symbol
                  </label>
                  <input
                    type="text"
                    value={stockSymbol}
                    onChange={(e) => setStockSymbol(e.target.value)}
                    disabled={!isEditMode}
                    placeholder="e.g., AAPL"
                    className={`w-full px-3 py-2 border-2 rounded-lg text-sm uppercase ${
                      isEditMode
                        ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                        : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-2">
                    Stock Exchange
                  </label>
                  <select
                    value={stockExchange}
                    onChange={(e) => setStockExchange(e.target.value)}
                    disabled={!isEditMode}
                    className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                      isEditMode
                        ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                        : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                    }`}
                  >
                    <option value="">Select...</option>
                    {stockExchangeOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Business Identity
              </label>
              <input
                type="text"
                value={businessIdentity}
                onChange={(e) => setBusinessIdentity(e.target.value)}
                disabled={!isEditMode}
                placeholder="e.g., Healthcare Provider"
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2">
                Business Industry
              </label>
              <select
                value={businessIndustry}
                onChange={(e) => setBusinessIndustry(e.target.value)}
                disabled={!isEditMode}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm ${
                  isEditMode
                    ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                    : 'border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B]'
                }`}
              >
                <option value="">Select…</option>
                {businessIndustryOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t-2 border-[#E2E8F0]">
        {!isEditMode ? (
          <button
            onClick={handleEdit}
            className="px-6 py-2.5 bg-[#3A6EA5] text-white text-sm font-bold rounded-lg hover:bg-[#2C5282] transition-colors inline-flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <>
            <button
              onClick={handleCancel}
              className="px-6 py-2.5 border-2 border-[#CBD5E1] text-[#1E293B] text-sm font-bold rounded-lg hover:bg-[#F7F9FC] transition-colors inline-flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="px-6 py-2.5 bg-[#0D9488] text-white text-sm font-bold rounded-lg hover:bg-[#0F766E] transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </>
        )}
      </div>
    </div>
  );
}
