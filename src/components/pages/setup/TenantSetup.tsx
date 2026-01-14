import { useState, useMemo } from "react";
import { Search, Plus, Save, X, Building, AlertCircle } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface Tenant {
  id: string;
  tenantName: string;
  shortCode: string;
  primaryContactName: string;
  contactEmail: string;
  contactPhone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  timeZone: string;
  status: "Active" | "Inactive";
  createdDate: string;
  lastModifiedDate?: string;
  organizationCount: number;
  officeCount: number;
}

export default function TenantSetup() {
  const { user } = useAuth();
  const [searchText, setSearchText] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showTenantList, setShowTenantList] = useState(true);
  const [mode, setMode] = useState<"view" | "add" | "edit">("view");
  const [formData, setFormData] = useState<Partial<Tenant>>({});

  // Super Admin check
  const isSuperAdmin = user?.role === "owner" || user?.email?.toLowerCase().includes("superadmin");

  // Access control - redirect if not super admin
  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Mock tenant data
  const mockTenants: Tenant[] = [
    {
      id: "T-001",
      tenantName: "Cranberry Dental Group",
      shortCode: "CDG",
      primaryContactName: "John Smith",
      contactEmail: "admin@cranberrydental.com",
      contactPhone: "(555) 123-4567",
      addressLine1: "123 Medical Plaza Drive",
      addressLine2: "Suite 200",
      city: "Cranberry Township",
      state: "PA",
      zipCode: "16066",
      country: "United States",
      timeZone: "America/New_York",
      status: "Active",
      createdDate: "2020-01-15",
      lastModifiedDate: "2024-12-01",
      organizationCount: 3,
      officeCount: 8,
    },
    {
      id: "T-002",
      tenantName: "Pittsburgh Dental Partners",
      shortCode: "PDP",
      primaryContactName: "Sarah Johnson",
      contactEmail: "info@pittsburghdental.com",
      contactPhone: "(555) 987-6543",
      addressLine1: "456 Healthcare Blvd",
      city: "Pittsburgh",
      state: "PA",
      zipCode: "15212",
      country: "United States",
      timeZone: "America/New_York",
      status: "Active",
      createdDate: "2021-06-10",
      lastModifiedDate: "2024-11-20",
      organizationCount: 2,
      officeCount: 5,
    },
    {
      id: "T-003",
      tenantName: "North Shore Dental Corp",
      shortCode: "NSDC",
      primaryContactName: "Michael Chen",
      contactEmail: "admin@northshoredental.com",
      contactPhone: "(555) 234-5678",
      addressLine1: "789 Lakeside Avenue",
      city: "Erie",
      state: "PA",
      zipCode: "16501",
      country: "United States",
      timeZone: "America/New_York",
      status: "Inactive",
      createdDate: "2019-03-22",
      lastModifiedDate: "2023-08-15",
      organizationCount: 0,
      officeCount: 0,
    },
  ];

  // Filter and sort tenants
  const filteredTenants = useMemo(() => {
    return mockTenants.filter((tenant) => {
      if (searchText.trim()) {
        const search = searchText.toLowerCase();
        return (
          tenant.tenantName.toLowerCase().includes(search) ||
          tenant.shortCode.toLowerCase().includes(search) ||
          tenant.id.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [mockTenants, searchText]);

  const handleSelectTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData(tenant);
    setMode("view");
    setShowTenantList(false);
  };

  const handleAddTenant = () => {
    const newTenantTemplate: Partial<Tenant> = {
      tenantName: "",
      shortCode: "",
      primaryContactName: "",
      contactEmail: "",
      contactPhone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
      timeZone: "America/New_York",
      status: "Active",
      organizationCount: 0,
      officeCount: 0,
    };

    setSelectedTenant(null);
    setFormData(newTenantTemplate);
    setMode("add");
    setShowTenantList(false);
  };

  const handleEdit = () => {
    setMode("edit");
  };

  const handleSave = () => {
    if (!formData.tenantName || !formData.shortCode || !formData.contactEmail) {
      alert("Tenant Name, Short Code, and Contact Email are required");
      return;
    }

    console.log("Saving tenant:", formData);
    alert(`Tenant ${mode === "add" ? "created" : "updated"} successfully!`);
    setMode("view");
  };

  const handleDelete = () => {
    if (!selectedTenant) return;

    if (selectedTenant.organizationCount > 0 || selectedTenant.officeCount > 0) {
      alert(
        `Cannot delete tenant "${selectedTenant.tenantName}".\n\n` +
          `This tenant has ${selectedTenant.organizationCount} organization(s) and ${selectedTenant.officeCount} office(s) linked to it.\n\n` +
          `Please remove all organizations and offices before deleting the tenant.`
      );
      return;
    }

    if (
      confirm(
        `Are you sure you want to delete tenant "${selectedTenant.tenantName}"?\n\nThis action cannot be undone.`
      )
    ) {
      console.log("Deleting tenant:", selectedTenant.id);
      alert("Tenant deleted successfully!");
      handleBackToList();
    }
  };

  const handleCancel = () => {
    if (mode === "add") {
      setShowTenantList(true);
      setSelectedTenant(null);
      setFormData({});
      setMode("view");
    } else {
      setMode("view");
      if (selectedTenant) {
        setFormData(selectedTenant);
      }
    }
  };

  const handleBackToList = () => {
    setShowTenantList(true);
    setSelectedTenant(null);
    setFormData({});
    setMode("view");
  };

  const updateFormData = (updates: Partial<Tenant>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const isEditable = mode === "edit" || mode === "add";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1800px] mx-auto p-6">
        {showTenantList ? (
          // Tenant List View
          <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
            {/* Header */}
            <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-[#1F3A5F]">Tenant Setup</h1>
                    <p className="text-xs text-[#64748B] font-bold">
                      Manage top-level organizational entities (Super Admin Only)
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleAddTenant}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] transition-colors font-bold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Tenant
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="text"
                  placeholder="Search by tenant name, short code, or ID..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border-2 border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                />
              </div>
            </div>

            {/* Access Control Notice */}
            <div className="bg-[#FEF3C7] border-l-4 border-[#F59E0B] p-4 m-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-[#92400E]">Super Admin Access Only</p>
                  <p className="text-xs text-[#78350F] mt-1">
                    Tenant management is restricted to Super Admin users. Tenants represent the
                    highest level organizational entity and own multiple organizations and offices.
                  </p>
                </div>
              </div>
            </div>

            {/* Tenant Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                      Tenant ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                      Tenant Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                      Short Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                      Primary Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                      Organizations
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                      Offices
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center">
                        <Building className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                        <p className="text-[#64748B] font-bold text-sm">No tenants found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <tr
                        key={tenant.id}
                        onClick={() => handleSelectTenant(tenant)}
                        className="hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-bold text-[#3A6EA5]">
                          {tenant.id}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[#1E293B]">
                          {tenant.tenantName}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">
                          {tenant.shortCode}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">
                          {tenant.primaryContactName}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">
                          {tenant.organizationCount}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">
                          {tenant.officeCount}
                        </td>
                        <td className="px-4 py-3">
                          {tenant.status === "Active" ? (
                            <span className="px-2 py-1 bg-[#D1FAE5] text-[#059669] text-xs font-bold rounded">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-[#FEE2E2] text-[#DC2626] text-xs font-bold rounded">
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Tenant Detail View (INFO Tab Only)
          <div className="bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm">
            {/* Header */}
            <div className="bg-[#F7F9FC] border-b-2 border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToList}
                    className="p-2 hover:bg-[#E8EFF7] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-[#64748B]" />
                  </button>
                  <div>
                    <h1 className="text-xl font-bold text-[#1F3A5F]">
                      {mode === "add" ? "Add New Tenant" : `Tenant: ${formData.tenantName}`}
                    </h1>
                    <p className="text-xs text-[#64748B] font-bold">
                      {mode === "add"
                        ? "Configure new tenant entity"
                        : `${formData.shortCode} • ${formData.id}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {mode === "view" ? (
                    <>
                      <button
                        onClick={handleEdit}
                        className="px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold transition-all text-sm"
                      >
                        Edit Tenant
                      </button>
                      <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] font-bold transition-all text-sm"
                      >
                        Delete Tenant
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold transition-all text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg hover:bg-[#1F3A5F] font-bold transition-all text-sm"
                      >
                        <Save className="w-4 h-4" />
                        Save Tenant
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Single Tab - INFO */}
              <div className="flex">
                <div className="flex items-center gap-2 px-4 py-2 bg-white text-[#3A6EA5] border-t-4 border-[#3A6EA5] font-bold text-xs rounded-t-lg">
                  <Building className="w-4 h-4" />
                  TENANT INFO
                </div>
              </div>
            </div>

            {/* Tab Content - Tenant Info */}
            <div className="p-6 max-h-[calc(100vh-240px)] overflow-y-auto scrollbar-visible">
              <div className="max-w-4xl space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-sm font-bold text-[#3A6EA5] mb-3 uppercase tracking-wide">
                    Basic Information
                  </h3>
                  <table className="w-full">
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {mode !== "add" && (
                        <tr>
                          <td className="py-3 pr-8 text-sm font-bold text-[#1E293B] w-1/3">
                            Tenant ID
                          </td>
                          <td className="py-3">
                            <span className="text-sm text-[#64748B] font-mono">
                              {formData.id}
                            </span>
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className="py-3 pr-8 text-sm font-bold text-[#1E293B] w-1/3">
                          Tenant Name <span className="text-[#DC2626]">*</span>
                        </td>
                        <td className="py-3">
                          {isEditable ? (
                            <input
                              type="text"
                              value={formData.tenantName || ""}
                              onChange={(e) => updateFormData({ tenantName: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                              placeholder="Enter tenant legal name"
                            />
                          ) : (
                            <span className="text-sm text-[#1E293B]">{formData.tenantName}</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-8 text-sm font-bold text-[#1E293B]">
                          Short Code <span className="text-[#DC2626]">*</span>
                        </td>
                        <td className="py-3">
                          {isEditable ? (
                            <input
                              type="text"
                              value={formData.shortCode || ""}
                              onChange={(e) =>
                                updateFormData({ shortCode: e.target.value.toUpperCase() })
                              }
                              maxLength={6}
                              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm uppercase"
                              placeholder="4-6 characters (e.g., CDG)"
                            />
                          ) : (
                            <span className="text-sm text-[#1E293B] font-mono">
                              {formData.shortCode}
                            </span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-8 text-sm font-bold text-[#1E293B]">Status</td>
                        <td className="py-3">
                          {isEditable ? (
                            <select
                              value={formData.status || "Active"}
                              onChange={(e) =>
                                updateFormData({ status: e.target.value as "Active" | "Inactive" })
                              }
                              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] text-sm"
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          ) : (
                            <span
                              className={`px-2 py-1 text-xs font-bold rounded ${
                                formData.status === "Active"
                                  ? "bg-[#D1FAE5] text-[#059669]"
                                  : "bg-[#FEE2E2] text-[#DC2626]"
                              }`}
                            >
                              {formData.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-sm font-bold text-[#3A6EA5] mb-3 uppercase tracking-wide">
                    Primary Contact Information
                  </h3>
                  <table className="w-full">
                    <tbody className="divide-y divide-[#E2E8F0]">
                      <tr>
                        <td className="py-3 pr-8 text-sm font-bold text-[#1E293B] w-1/3">
                          Contact Name
                        </td>
                        <td className="py-3">
                          {isEditable ? (
                            <input
                              type="text"
                              value={formData.primaryContactName || ""}
                              onChange={(e) =>
                                updateFormData({ primaryContactName: e.target.value })
                              }
                              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                              placeholder="Full name"
                            />
                          ) : (
                            <span className="text-sm text-[#1E293B]">
                              {formData.primaryContactName}
                            </span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-8 text-sm font-bold text-[#1E293B]">
                          Contact Email <span className="text-[#DC2626]">*</span>
                        </td>
                        <td className="py-3">
                          {isEditable ? (
                            <input
                              type="email"
                              value={formData.contactEmail || ""}
                              onChange={(e) => updateFormData({ contactEmail: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                              placeholder="email@example.com"
                            />
                          ) : (
                            <span className="text-sm text-[#1E293B]">
                              {formData.contactEmail}
                            </span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-8 text-sm font-bold text-[#1E293B]">
                          Contact Phone
                        </td>
                        <td className="py-3">
                          {isEditable ? (
                            <input
                              type="tel"
                              value={formData.contactPhone || ""}
                              onChange={(e) => updateFormData({ contactPhone: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                              placeholder="(555) 123-4567"
                            />
                          ) : (
                            <span className="text-sm text-[#1E293B]">
                              {formData.contactPhone}
                            </span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Address Information */}
                <div>
                  <h3 className="text-sm font-bold text-[#3A6EA5] mb-3 uppercase tracking-wide">
                    Legal Address
                  </h3>
                  <table className="w-full">
                    <tbody className="divide-y divide-[#E2E8F0]">
                      <tr>
                        <td className="py-3 pr-8 text-sm font-bold text-[#1E293B] w-1/3">
                          Address Line 1
                        </td>
                        <td className="py-3">
                          {isEditable ? (
                            <input
                              type="text"
                              value={formData.addressLine1 || ""}
                              onChange={(e) => updateFormData({ addressLine1: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                              placeholder="Street address"
                            />
                          ) : (
                            <span className="text-sm text-[#1E293B]">
                              {formData.addressLine1}
                            </span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-8 text-sm font-bold text-[#1E293B]">
                          Address Line 2
                        </td>
                        <td className="py-3">
                          {isEditable ? (
                            <input
                              type="text"
                              value={formData.addressLine2 || ""}
                              onChange={(e) => updateFormData({ addressLine2: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                              placeholder="Suite, unit, etc. (optional)"
                            />
                          ) : (
                            <span className="text-sm text-[#64748B]">
                              {formData.addressLine2 || "(empty)"}
                            </span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-8 text-sm font-bold text-[#1E293B]">City</td>
                        <td className="py-3">
                          {isEditable ? (
                            <input
                              type="text"
                              value={formData.city || ""}
                              onChange={(e) => updateFormData({ city: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                              placeholder="City name"
                            />
                          ) : (
                            <span className="text-sm text-[#1E293B]">{formData.city}</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-8 text-sm font-bold text-[#1E293B]">State</td>
                        <td className="py-3">
                          {isEditable ? (
                            <input
                              type="text"
                              value={formData.state || ""}
                              onChange={(e) => updateFormData({ state: e.target.value })}
                              maxLength={2}
                              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm uppercase"
                              placeholder="PA"
                            />
                          ) : (
                            <span className="text-sm text-[#1E293B]">{formData.state}</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-8 text-sm font-bold text-[#1E293B]">ZIP Code</td>
                        <td className="py-3">
                          {isEditable ? (
                            <input
                              type="text"
                              value={formData.zipCode || ""}
                              onChange={(e) => updateFormData({ zipCode: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                              placeholder="16066"
                            />
                          ) : (
                            <span className="text-sm text-[#1E293B]">{formData.zipCode}</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-8 text-sm font-bold text-[#1E293B]">Country</td>
                        <td className="py-3">
                          {isEditable ? (
                            <input
                              type="text"
                              value={formData.country || ""}
                              onChange={(e) => updateFormData({ country: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm"
                              placeholder="United States"
                            />
                          ) : (
                            <span className="text-sm text-[#1E293B]">{formData.country}</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* System Settings */}
                <div>
                  <h3 className="text-sm font-bold text-[#3A6EA5] mb-3 uppercase tracking-wide">
                    System Settings
                  </h3>
                  <table className="w-full">
                    <tbody className="divide-y divide-[#E2E8F0]">
                      <tr>
                        <td className="py-3 pr-8 text-sm font-bold text-[#1E293B] w-1/3">
                          Time Zone
                        </td>
                        <td className="py-3">
                          {isEditable ? (
                            <select
                              value={formData.timeZone || "America/New_York"}
                              onChange={(e) => updateFormData({ timeZone: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] text-sm"
                            >
                              <option value="America/New_York">Eastern (America/New_York)</option>
                              <option value="America/Chicago">Central (America/Chicago)</option>
                              <option value="America/Denver">Mountain (America/Denver)</option>
                              <option value="America/Los_Angeles">Pacific (America/Los_Angeles)</option>
                              <option value="America/Anchorage">Alaska (America/Anchorage)</option>
                              <option value="Pacific/Honolulu">Hawaii (Pacific/Honolulu)</option>
                            </select>
                          ) : (
                            <span className="text-sm text-[#1E293B]">{formData.timeZone}</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* System Audit (Read-only) */}
                {mode !== "add" && (
                  <div>
                    <h3 className="text-sm font-bold text-[#3A6EA5] mb-3 uppercase tracking-wide">
                      System Audit
                    </h3>
                    <table className="w-full">
                      <tbody className="divide-y divide-[#E2E8F0]">
                        <tr>
                          <td className="py-3 pr-8 text-sm font-bold text-[#1E293B] w-1/3">
                            Created Date
                          </td>
                          <td className="py-3">
                            <span className="text-sm text-[#64748B]">
                              {formData.createdDate}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 pr-8 text-sm font-bold text-[#1E293B]">
                            Last Modified
                          </td>
                          <td className="py-3">
                            <span className="text-sm text-[#64748B]">
                              {formData.lastModifiedDate || "Never"}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 pr-8 text-sm font-bold text-[#1E293B]">
                            Organizations
                          </td>
                          <td className="py-3">
                            <span className="text-sm text-[#64748B]">
                              {formData.organizationCount}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 pr-8 text-sm font-bold text-[#1E293B]">
                            Offices
                          </td>
                          <td className="py-3">
                            <span className="text-sm text-[#64748B]">
                              {formData.officeCount}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
