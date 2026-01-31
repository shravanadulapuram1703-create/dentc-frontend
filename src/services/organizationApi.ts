import api from "./api";
// import type { Organization } from '../data/organizationData_old';
type Organization = any;

export async function fetchOrganizations(): Promise<Organization[]> {
//   const response = await fetch('http://34.66.199.55:8000/api/v1/users/test', {
//     method: 'GET',
//     credentials: 'include', // important if using cookies / session
//     headers: {
//       'Content-Type': 'application/json',
//     },
//   });

//   if (!response.ok) {
//     throw new Error('Failed to fetch organizations');
//   }

//   return response.json();
// }
  const response = await api.get<Organization[]>("/api/v1/users/me/access");
  console.log("Fetching organizations...");


  return response.data;
}