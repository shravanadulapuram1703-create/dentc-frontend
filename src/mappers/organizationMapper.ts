// src/mappers/organizationMapper.ts

export interface Office {
  id: string;
  name: string;
  code: string;
  address?: string;
  displayName: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  offices: Office[];
}

/**
 * Convert /me-full response → Organization[]
 * (same shape as mockOrganizations)
 */
export function mapMeFullToOrganizations(me: any): Organization[] {
  if (!me) return [];

  const offices: Office[] = [];

  //  Home office first
  if (me.home_office_id && me.home_office_name) {
    offices.push({
      id: `OFF-${me.home_office_id}`,
      name: me.home_office_name,
      code: String(me.home_office_id),
      displayName: `${me.home_office_name} [${me.home_office_id}]`,
    });
  }

  //  Assigned offices
  (me.assigned_offices ?? []).forEach((o: any) => {
    const officeId = `OFF-${o.office_id}`;

    // Avoid duplicates (home office may appear again)
    if (offices.some(x => x.id === officeId)) return;

    offices.push({
      id: officeId,
      name: o.office_name,
      code: String(o.office_id),
      displayName: `${o.office_name} [${o.office_id}]`,
    });
  });

  return [
    {
      id: `ORG-${me.pgid}`,
      name: me.pgid_name,
      code: `PG-${me.pgid}`,
      offices,
    },
  ];
}
