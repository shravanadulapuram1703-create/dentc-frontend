export const mapApiTenantToUI = (apiTenant: any): Tenant => {
  return {
    id: apiTenant.id,
    name: apiTenant.name,
    code: apiTenant.code,

    status: apiTenant.status,
    isActive: apiTenant.is_active,
    isLocked: apiTenant.is_locked,

    createdAt: apiTenant.created_at,
    updatedAt: apiTenant.updated_at,

    createdBy: apiTenant.creator
      ? {
          id: apiTenant.creator.id,
          name: `${apiTenant.creator.first_name ?? ""} ${apiTenant.creator.last_name ?? ""}`.trim(),
          email: apiTenant.creator.email,
          role: apiTenant.creator.role,
        }
      : null,
  };
};


export const mapApiOfficeToUI = (apiOffice: any): Office => {
  return {
    id: apiOffice.id,

    officeCode: apiOffice.office_code,
    officeName: apiOffice.office_name,

    phone1: apiOffice.phone1 ?? "",
    phone2: apiOffice.phone2 ?? "",
    fax: apiOffice.fax ?? "",
    email: apiOffice.email ?? "",

    addressLine1: apiOffice.address_line1 ?? "",
    city: apiOffice.city ?? "",
    state: apiOffice.state ?? "",
    zip: apiOffice.zip ?? "",

    tenantId: apiOffice.tenant_id,
    timezone: apiOffice.timezone ?? "",

    isActive: apiOffice.is_active,

    createdAt: apiOffice.created_at,
    updatedAt: apiOffice.updated_at,
  };
};
