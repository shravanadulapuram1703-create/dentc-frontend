// The signed-in user's full backend profile (`/api/v1/auth/me/full`).
//
// AuthContext keeps a trimmed `{ id, name, role, email }`. My Page wants the
// richer `UserRead` fields the profile card and "my schedule" scoping need —
// phone, image_url, last_login_at, short_id, and crucially
// `report_access_provider_id`, which links the user account to a provider row
// so we can show *their* appointments rather than the whole office's.
import { useQuery } from "@tanstack/react-query";
import { getMeFull } from "@/api/generated/endpoints/auth/auth";
import type { MeFull } from "@/api/generated/model";

export function useMyProfile() {
  return useQuery<MeFull>({
    queryKey: ["my-page", "me-full"],
    queryFn: ({ signal }) => getMeFull(undefined, signal),
    staleTime: 5 * 60_000,
  });
}
