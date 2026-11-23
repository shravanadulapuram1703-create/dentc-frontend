import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchReportCatalog, type ReportCatalog } from "../services/catalogService";
import { classifyCatalogError, type EngineProbe } from "./engineState";

export const reportCatalogKey = (user_id: string | number | null | undefined) =>
  ["reports", "catalog", user_id ?? "anonymous"] as const;

export interface EngineAvailability extends EngineProbe {
  catalog: ReportCatalog | undefined;
  isLoading: boolean;
  retry: () => void;
}

/**
 * Engine state from the one catalog query (07 §2.3), cached for the session.
 * A 404 / 503 is an answer, not a failure: it is not retried.
 */
export function useEngineAvailable(): EngineAvailability {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: reportCatalogKey(user?.id),
    queryFn: ({ signal }) => fetchReportCatalog(signal),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    meta: { silent_error: true },
  });

  if (query.isSuccess) {
    return { state: "on", missing: [], catalog: query.data, isLoading: false, retry: () => void query.refetch() };
  }
  const probe: EngineProbe = query.isError ? classifyCatalogError(query.error) : { state: "unknown", missing: [] };
  return { ...probe, catalog: undefined, isLoading: query.isPending, retry: () => void query.refetch() };
}
