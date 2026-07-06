import AppShell from '../layout/AppShell';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Building2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { components } from '../../styles/theme';
import { useListPatients } from '@/api/generated/endpoints/patients/patients';
import { useListOffices } from '@/api/generated/endpoints/organization/organization';
import type { ListPatientsParams, PatientRead } from '@/api/generated/model';
import { useDefinitions } from '../../hooks/useDefinitions';

interface PatientProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
}

const PAGE_SIZE = 25;

// Search modes. `any` is free-text `search` (ILIKE over name/chart_no/email/
// phone); the rest map to typed exact filters on listPatients.
const searchByOptions = [
  { value: 'any', label: 'Name / Any', placeholder: 'Search name, email, or phone…' },
  { value: 'chart_no', label: 'Chart #', placeholder: 'Enter exact chart number…' },
  { value: 'ssn', label: 'SSN', placeholder: 'Enter SSN…' },
  { value: 'medicaid_id', label: 'Medicaid ID', placeholder: 'Enter Medicaid ID…' },
  { value: 'email', label: 'Email', placeholder: 'Enter email…' },
  { value: 'phone', label: 'Phone', placeholder: 'Enter phone…' },
  { value: 'dob', label: 'Birth Date', placeholder: 'YYYY-MM-DD' },
] as const;

type SearchBy = (typeof searchByOptions)[number]['value'];
type SearchScope = 'current' | 'all';
type SortOrder = 'asc' | 'desc';

// Maps a non-'any' searchBy to its ListPatientsParams key.
const SEARCH_FIELD_PARAM: Record<Exclude<SearchBy, 'any'>, keyof ListPatientsParams> = {
  chart_no: 'chart_no',
  ssn: 'ssn',
  medicaid_id: 'medicaid_id',
  email: 'email',
  phone: 'phone',
  dob: 'dob',
};

interface SearchSnapshot {
  searchText: string;
  searchBy: SearchBy;
  scope: SearchScope;
  includeInactive: boolean;
  order: SortOrder;
  gender: string;
  regFrom: string;
  regTo: string;
  dobFrom: string;
  dobTo: string;
}

// Extract a numeric office id from the app's "OFF-3" display id.
function extractOfficeIdNumber(officeId?: string): number | undefined {
  if (!officeId) return undefined;
  const match = officeId.match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
}

// YYYY-MM-DD -> MM/DD/YYYY for display.
function formatDob(dob?: string | null): string {
  if (!dob) return '—';
  const parts = dob.split('-');
  return parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0]}` : dob;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

// Show only the last 4 of the SSN; never render it in full.
function maskSsn(ssn?: string | null): string {
  if (!ssn) return '—';
  const digits = ssn.replace(/\D/g, '');
  return digits.length >= 4 ? `***-**-${digits.slice(-4)}` : '***-**-****';
}

function patientName(p: PatientRead): string {
  const last = p.last_name ?? '';
  const first = p.first_name ?? '';
  const base = [last, first].filter(Boolean).join(', ') || `Patient #${p.id}`;
  return p.preferred_name ? `${base} (${p.preferred_name})` : base;
}

function preferredPhone(p: PatientRead): string {
  return p.cell_phone || p.phone || p.work_phone || '—';
}

function buildParams(snap: SearchSnapshot, currentOffice: string, page: number): ListPatientsParams {
  const params: ListPatientsParams = {
    page,
    size: PAGE_SIZE,
    sort: 'last_name',
    order: snap.order,
  };

  const text = snap.searchText.trim();
  if (text) {
    if (snap.searchBy === 'any') {
      params.search = text;
    } else {
      (params as Record<string, string | undefined>)[SEARCH_FIELD_PARAM[snap.searchBy]] = text;
    }
  }

  if (snap.scope === 'current') {
    const officeId = extractOfficeIdNumber(currentOffice);
    if (officeId) params.home_office_id = officeId;
  }

  // Exclude inactive unless explicitly requested.
  if (!snap.includeInactive) params.is_active = true;

  // Advanced filters (combinable).
  if (snap.gender) params.gender = snap.gender;
  if (snap.regFrom) params.created_at_from = snap.regFrom;
  if (snap.regTo) params.created_at_to = snap.regTo;
  if (snap.dobFrom) params.dob_from = snap.dobFrom;
  if (snap.dobTo) params.dob_to = snap.dobTo;

  return params;
}

/**
 * Persistent-default-patient guard for the `/patient` entry point.
 *
 * If the signed-in user already has a patient in context, we reopen it instead
 * of showing the search picker — the app must never prompt for a patient when
 * one is remembered. Reaching the picker on purpose (Search Patient / Close
 * Patient) is done via `?switch=1`, which bypasses the redirect.
 */
export default function Patient(props: PatientProps) {
  const { activePatient } = useAuth();
  const [searchParams] = useSearchParams();
  const wantsSwitch = searchParams.get('switch') === '1';

  if (activePatient?.id && !wantsSwitch) {
    return <Navigate to={`/patient/${activePatient.id}/overview`} replace />;
  }

  return <PatientSearchPage {...props} />;
}

function PatientSearchPage({ onLogout, currentOffice, setCurrentOffice }: PatientProps) {
  const navigate = useNavigate();

  // Form state (uncommitted until SEARCH is pressed).
  const [searchText, setSearchText] = useState('');
  const [searchBy, setSearchBy] = useState<SearchBy>('any');
  const [scope, setScope] = useState<SearchScope>('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [order, setOrder] = useState<SortOrder>('asc');
  // Advanced filters.
  const [gender, setGender] = useState('');
  const [regFrom, setRegFrom] = useState('');
  const [regTo, setRegTo] = useState('');
  const [dobFrom, setDobFrom] = useState('');
  const [dobTo, setDobTo] = useState('');

  // Gender values are stored as the label ("Male"), so use the definition's
  // description (not key1) as the filter value.
  const { definitions: genderDefs } = useDefinitions('gender');

  // Committed search (drives the query) + the snapshot LAST SEARCH restores.
  const [committed, setCommitted] = useState<SearchSnapshot | null>(null);
  const [lastSnapshot, setLastSnapshot] = useState<SearchSnapshot | null>(null);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const params = committed ? buildParams(committed, currentOffice, page) : undefined;

  const patientsQuery = useListPatients(params, {
    query: { enabled: committed != null },
  });

  // Resolve home_office_id -> office name without per-row calls.
  const officesQuery = useListOffices({ size: 200 });
  const officeName = useMemo(() => {
    const map = new Map<number, string>();
    for (const o of officesQuery.data?.items ?? []) map.set(o.id, o.name);
    return (id?: number | null) => (id != null ? map.get(id) ?? '—' : '—');
  }, [officesQuery.data]);

  const items = patientsQuery.data?.items ?? [];
  const meta = patientsQuery.data?.meta;
  const totalPages = meta?.pages ?? 0;

  const runSearch = (snap: SearchSnapshot) => {
    setCommitted(snap);
    setLastSnapshot(snap);
    setPage(1);
    setExpandedId(null);
  };

  const handleSearch = () => {
    runSearch({ searchText, searchBy, scope, includeInactive, order, gender, regFrom, regTo, dobFrom, dobTo });
  };

  const handleLastSearch = () => {
    if (!lastSnapshot) return;
    // Restore the form to the last executed search and re-run it.
    setSearchText(lastSnapshot.searchText);
    setSearchBy(lastSnapshot.searchBy);
    setScope(lastSnapshot.scope);
    setIncludeInactive(lastSnapshot.includeInactive);
    setOrder(lastSnapshot.order);
    setGender(lastSnapshot.gender);
    setRegFrom(lastSnapshot.regFrom);
    setRegTo(lastSnapshot.regTo);
    setDobFrom(lastSnapshot.dobFrom);
    setDobTo(lastSnapshot.dobTo);
    runSearch(lastSnapshot);
  };

  const goToPage = (next: number) => {
    setPage(Math.min(Math.max(1, next), Math.max(1, totalPages)));
    setExpandedId(null);
  };

  const handleAddNewPatient = () => navigate('/patient/new');
  const handleViewOverview = (p: PatientRead) => navigate(`/patient/${p.id}/overview`);
  const toggleExpand = (id: number) => setExpandedId(expandedId === id ? null : id);

  const placeholder =
    searchByOptions.find((o) => o.value === searchBy)?.placeholder ?? 'Search…';

  return (
    <AppShell onLogout={onLogout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-md border-2 border-[#E2E8F0] overflow-hidden">
          <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Users className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Patient Management</h1>
                <p className="text-white/80 text-sm font-medium">Search and manage patient records</p>
              </div>
            </div>

            <button
              onClick={handleAddNewPatient}
              className={components.buttonSuccess + ' flex items-center gap-2'}
            >
              <UserPlus className="w-5 h-5" strokeWidth={2} />
              ADD NEW PATIENT
            </button>
          </div>
        </div>

        {/* Search Panel */}
        <div className="bg-white rounded-xl shadow-md border-2 border-[#E2E8F0]">
          {/* Search Input & Action Buttons */}
          <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-4 py-2.5 text-sm border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] focus:border-[#3A6EA5] transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={patientsQuery.isFetching}
                className="px-5 py-2.5 bg-[#3A6EA5] text-white text-sm font-bold rounded-lg hover:bg-[#2d5080] transition-colors shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {patientsQuery.isFetching ? (
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                ) : (
                  <Search className="w-4 h-4" strokeWidth={2} />
                )}
                {patientsQuery.isFetching ? 'SEARCHING...' : 'SEARCH'}
              </button>

              <button
                onClick={handleLastSearch}
                disabled={!lastSnapshot}
                className="px-5 py-2.5 bg-[#475569] text-white text-sm font-bold rounded-lg hover:bg-[#1E293B] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                LAST SEARCH
              </button>
            </div>
          </div>

          {/* Search Options */}
          <div className="p-4 grid grid-cols-3 gap-4">
            {/* Search By */}
            <div className="bg-[#F7F9FC] rounded-lg border border-[#E2E8F0] p-3">
              <h3 className="text-xs font-bold text-[#1F3A5F] uppercase mb-2 tracking-wide">Search By</h3>
              <div className="space-y-1">
                {searchByOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 cursor-pointer hover:bg-white/50 px-2 py-1 rounded transition-colors"
                  >
                    <input
                      type="radio"
                      name="searchBy"
                      value={option.value}
                      checked={searchBy === option.value}
                      onChange={() => setSearchBy(option.value)}
                      className="w-4 h-4 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
                    />
                    <span className="text-sm font-medium text-[#1E293B]">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Search In */}
            <div className="bg-[#F7F9FC] rounded-lg border border-[#E2E8F0] p-3">
              <h3 className="text-xs font-bold text-[#1F3A5F] uppercase mb-2 tracking-wide">Search In</h3>
              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 px-2 py-1 rounded transition-colors">
                  <input
                    type="radio"
                    name="scope"
                    value="current"
                    checked={scope === 'current'}
                    onChange={() => setScope('current')}
                    className="w-4 h-4 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-sm font-medium text-[#1E293B]">Current Office</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 px-2 py-1 rounded transition-colors">
                  <input
                    type="radio"
                    name="scope"
                    value="all"
                    checked={scope === 'all'}
                    onChange={() => setScope('all')}
                    className="w-4 h-4 text-[#3A6EA5] border-[#CBD5E1] focus:ring-[#3A6EA5]"
                  />
                  <span className="text-sm font-medium text-[#1E293B]">All Offices</span>
                </label>
              </div>
            </div>

            {/* Options */}
            <div className="bg-[#F7F9FC] rounded-lg border border-[#E2E8F0] p-3">
              <h3 className="text-xs font-bold text-[#1F3A5F] uppercase mb-2 tracking-wide">Options</h3>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 px-2 py-1 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                  className="w-4 h-4 rounded border-[#CBD5E1] text-[#3A6EA5] focus:ring-[#3A6EA5]"
                />
                <span className="text-sm font-medium text-[#1E293B]">Include Inactive</span>
              </label>
              <div className="mt-2 pt-2 border-t border-[#E2E8F0]">
                <label className="block text-xs font-bold text-[#475569] uppercase mb-1 tracking-wide">
                  Sort (Last Name)
                </label>
                <select
                  value={order}
                  onChange={(e) => setOrder(e.target.value as SortOrder)}
                  className="w-full px-3 py-1.5 text-sm border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]"
                >
                  <option value="asc">A → Z</option>
                  <option value="desc">Z → A</option>
                </select>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="px-4 pb-4">
            <div className="bg-[#F7F9FC] rounded-lg border border-[#E2E8F0] p-3">
              <h3 className="text-xs font-bold text-[#1F3A5F] uppercase mb-2 tracking-wide">
                Advanced Filters
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#475569] uppercase mb-1 tracking-wide">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]"
                  >
                    <option value="">Any</option>
                    {genderDefs.map((d) => (
                      <option key={d.id} value={d.description}>
                        {d.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#475569] uppercase mb-1 tracking-wide">
                    Registered From
                  </label>
                  <input
                    type="date"
                    value={regFrom}
                    onChange={(e) => setRegFrom(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#475569] uppercase mb-1 tracking-wide">
                    Registered To
                  </label>
                  <input
                    type="date"
                    value={regTo}
                    onChange={(e) => setRegTo(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#475569] uppercase mb-1 tracking-wide">
                    DOB From
                  </label>
                  <input
                    type="date"
                    value={dobFrom}
                    onChange={(e) => setDobFrom(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#475569] uppercase mb-1 tracking-wide">
                    DOB To
                  </label>
                  <input
                    type="date"
                    value={dobTo}
                    onChange={(e) => setDobTo(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {committed && (
          <div className="bg-white rounded-xl shadow-md border-2 border-[#E2E8F0]">
            {/* Results Header */}
            <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-wide">Search Results</h2>
                <p className="text-white/80 text-sm font-medium">
                  {patientsQuery.isError ? (
                    <span className="text-red-200">Failed to load patients</span>
                  ) : meta ? (
                    `${meta.total} patient(s) found`
                  ) : (
                    'Searching…'
                  )}
                </p>
              </div>
            </div>

            {/* Results body */}
            {patientsQuery.isLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-12 h-12 text-[#3A6EA5] animate-spin mx-auto mb-4" />
                <p className="text-[#64748B] font-medium">Loading patients…</p>
              </div>
            ) : patientsQuery.isError ? (
              <div className="p-12 text-center">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" strokeWidth={1.5} />
                <h3 className="font-bold text-[#64748B] mb-2">Couldn't load patients</h3>
                <button
                  onClick={() => patientsQuery.refetch()}
                  className="text-sm font-bold text-[#3A6EA5] hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-[#CBD5E1] mx-auto mb-4" strokeWidth={1.5} />
                <h3 className="font-bold text-[#64748B] mb-2">No Patients Found</h3>
                <p className="text-[#94A3B8]">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="divide-y-2 divide-[#E2E8F0]">
                {items.map((patient) => {
                  const isExpanded = expandedId === patient.id;
                  return (
                    <div key={patient.id} className="bg-white hover:bg-[#F7F9FC] transition-colors">
                      {/* Collapsed Row */}
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <button
                            onClick={() => toggleExpand(patient.id)}
                            className="p-2 hover:bg-[#E8EFF7] rounded-lg transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-[#1F3A5F]" strokeWidth={2.5} />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-[#64748B]" strokeWidth={2.5} />
                            )}
                          </button>

                          <div className="grid grid-cols-4 gap-6 flex-1">
                            <div>
                              <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                                Patient Name
                              </div>
                              <div className="font-bold text-[#1E293B]">{patientName(patient)}</div>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                                Chart #
                              </div>
                              <div className="font-semibold text-[#3A6EA5]">
                                {patient.chart_no || `PT-${patient.id}`}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                                Office
                              </div>
                              <div className="font-semibold text-[#1E293B]">
                                {officeName(patient.home_office_id)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1">
                                Status
                              </div>
                              <span
                                className={
                                  'inline-block px-2 py-0.5 rounded text-xs font-bold ' +
                                  (patient.is_active
                                    ? 'bg-[#DCFCE7] text-[#15803D]'
                                    : 'bg-[#FEE2E2] text-[#B91C1C]')
                                }
                              >
                                {patient.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleViewOverview(patient)}
                          className={components.buttonPrimary + ' flex items-center gap-2 text-sm'}
                          title="Open Patient"
                        >
                          <Eye className="w-4 h-4" strokeWidth={2} />
                          OVERVIEW
                        </button>
                      </div>

                      {/* Expanded Section — real PatientRead fields only */}
                      {isExpanded && (
                        <div className="border-t-2 border-[#E2E8F0] bg-[#F7F9FC] p-6 space-y-6">
                          {/* Demographics */}
                          <div>
                            <h3 className="font-bold text-[#1F3A5F] uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
                              <Users className="w-4 h-4" strokeWidth={2.5} />
                              Demographics
                            </h3>
                            <div className="grid grid-cols-4 gap-4">
                              <DetailCard label="Date of Birth" value={formatDob(patient.dob)} />
                              <DetailCard label="SSN" value={maskSsn(patient.ssn)} />
                              <DetailCard label="Gender" value={patient.gender || '—'} />
                              <DetailCard label="Marital Status" value={patient.marital_status || '—'} />
                            </div>
                          </div>

                          {/* Contact */}
                          <div>
                            <h3 className="font-bold text-[#1F3A5F] uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
                              <Phone className="w-4 h-4" strokeWidth={2.5} />
                              Contact Information
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                              <DetailCard icon={Phone} label="Phone" value={preferredPhone(patient)} />
                              <DetailCard icon={Mail} label="Email" value={patient.email || '—'} />
                              <DetailCard
                                icon={MapPin}
                                label="Address"
                                value={
                                  [
                                    patient.address_line1,
                                    patient.city,
                                    [patient.state, patient.zip].filter(Boolean).join(' '),
                                  ]
                                    .filter(Boolean)
                                    .join(', ') || '—'
                                }
                              />
                            </div>
                          </div>

                          {/* Record */}
                          <div>
                            <h3 className="font-bold text-[#1F3A5F] uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
                              <Calendar className="w-4 h-4" strokeWidth={2.5} />
                              Record
                            </h3>
                            <div className="grid grid-cols-4 gap-4">
                              <DetailCard icon={Calendar} label="Last Visit" value={formatDate(patient.last_visit)} />
                              <DetailCard icon={Calendar} label="Next Recall" value={formatDate(patient.next_recall)} />
                              <DetailCard label="Patient Type" value={patient.patient_type || '—'} />
                              <DetailCard
                                icon={Building2}
                                label="Office"
                                value={`${officeName(patient.home_office_id)}${
                                  patient.home_office_id != null ? ` [${patient.home_office_id}]` : ''
                                }`}
                              />
                            </div>
                          </div>

                          {/* Guardian / Emergency */}
                          {(patient.guardian_name || patient.guardian_phone) && (
                            <div>
                              <h3 className="font-bold text-[#1F3A5F] uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
                                <Phone className="w-4 h-4" strokeWidth={2.5} />
                                Guardian / Emergency Contact
                              </h3>
                              <div className="grid grid-cols-2 gap-4">
                                <DetailCard label="Name" value={patient.guardian_name || '—'} />
                                <DetailCard label="Phone" value={patient.guardian_phone || '—'} />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-[#E2E8F0]">
                            <button
                              onClick={() => handleViewOverview(patient)}
                              className={components.buttonPrimary + ' flex items-center gap-2'}
                            >
                              <Eye className="w-5 h-5" strokeWidth={2} />
                              OPEN OVERVIEW
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {!patientsQuery.isError && items.length > 0 && totalPages > 1 && (
              <div className="border-t-2 border-[#E2E8F0] px-4 py-3 bg-[#F7F9FC] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PagerButton onClick={() => goToPage(1)} disabled={page === 1} title="First">
                    <ChevronsLeft className="w-4 h-4" strokeWidth={2} />
                  </PagerButton>
                  <PagerButton onClick={() => goToPage(page - 1)} disabled={page === 1} title="Previous">
                    <ChevronLeft className="w-4 h-4" strokeWidth={2} />
                  </PagerButton>
                  <PagerButton onClick={() => goToPage(page + 1)} disabled={page >= totalPages} title="Next">
                    <ChevronRight className="w-4 h-4" strokeWidth={2} />
                  </PagerButton>
                  <PagerButton onClick={() => goToPage(totalPages)} disabled={page >= totalPages} title="Last">
                    <ChevronsRight className="w-4 h-4" strokeWidth={2} />
                  </PagerButton>
                </div>
                <span className="text-sm font-bold text-[#1F3A5F]">
                  Page {page} of {totalPages}
                  {patientsQuery.isFetching && (
                    <Loader2 className="inline w-4 h-4 ml-2 animate-spin text-[#3A6EA5]" />
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {!committed && (
          <div className="bg-white rounded-xl shadow-md border-2 border-[#E2E8F0] p-12 text-center">
            <Search className="w-16 h-16 text-[#CBD5E1] mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="font-bold text-[#64748B] mb-2">Ready to Search</h3>
            <p className="text-[#94A3B8]">Enter your search criteria above and click SEARCH to find patients</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function DetailCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="bg-white rounded-lg border-2 border-[#E2E8F0] p-3">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-4 h-4 text-[#3A6EA5]" strokeWidth={2} />}
        <div className="text-xs font-bold text-[#64748B] uppercase tracking-wide">{label}</div>
      </div>
      <div className="font-semibold text-[#1E293B] text-sm truncate" title={value}>
        {value}
      </div>
    </div>
  );
}

function PagerButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-2 rounded-lg border-2 border-[#CBD5E1] text-[#1F3A5F] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
