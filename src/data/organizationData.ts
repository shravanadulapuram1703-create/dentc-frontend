// Organization Data Structure for the entire application

export interface Office {
  id: string;
  name: string;
  code: string;
  address: string;
  displayName: string; // For dropdown display: "Office Name [Code]"
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  offices: Office[];
}

export const mockOrganizations: Organization[] = [
  {
    id: 'ORG-001',
    name: 'Cranberry Dental Group',
    code: 'CDG',
    offices: [
      {
        id: 'OFF-101',
        name: 'Cranberry Main',
        code: '108',
        address: '123 Main St, Cranberry, PA 16066',
        displayName: 'Cranberry Main [108]'
      },
      {
        id: 'OFF-102',
        name: 'Cranberry North',
        code: '109',
        address: '456 North Ave, Cranberry, PA 16066',
        displayName: 'Cranberry North [109]'
      },
      {
        id: 'OFF-103',
        name: 'Cranberry South',
        code: '110',
        address: '789 South Blvd, Cranberry, PA 16066',
        displayName: 'Cranberry South [110]'
      }
    ]
  },
  {
    id: 'ORG-002',
    name: 'Pittsburgh Dental Partners',
    code: 'PDP',
    offices: [
      {
        id: 'OFF-201',
        name: 'Downtown Pittsburgh',
        code: '201',
        address: '100 Liberty Ave, Pittsburgh, PA 15222',
        displayName: 'Downtown Pittsburgh [201]'
      },
      {
        id: 'OFF-202',
        name: 'Shadyside',
        code: '202',
        address: '200 Walnut St, Pittsburgh, PA 15232',
        displayName: 'Shadyside [202]'
      }
    ]
  },
  {
    id: 'ORG-003',
    name: 'Wexford Family Dentistry',
    code: 'WFD',
    offices: [
      {
        id: 'OFF-301',
        name: 'Wexford Center',
        code: '301',
        address: '300 Perry Hwy, Wexford, PA 15090',
        displayName: 'Wexford Center [301]'
      }
    ]
  }
];

// Helper function to get organization by name
export function getOrganizationByName(name: string): Organization | undefined {
  return mockOrganizations.find(org => org.name === name || org.code === name);
}

// Helper function to get all offices for an organization
export function getOfficesForOrganization(orgName: string): Office[] {
  const org = getOrganizationByName(orgName);
  return org ? org.offices : [];
}
