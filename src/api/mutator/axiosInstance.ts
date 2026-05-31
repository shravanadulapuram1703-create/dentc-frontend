import { type AxiosRequestConfig } from "axios";
import api from "@/services/api";

/**
 * Mutator used by all Orval-generated endpoints.
 *
 * It reuses the single shared axios instance (`src/services/api.ts`) so the
 * generated client and any remaining hand-written services share the same
 * baseURL, auth-header injection, and 401 handling during the migration.
 *
 * Orval (react-query client) forwards TanStack Query's `AbortSignal` via the
 * request config; axios 1.x honours `config.signal` natively, so query
 * cancellation on unmount / key-change works without any extra plumbing.
 */
export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  return api({ ...config, ...options }).then(({ data }) => data as T);
};

export default customInstance;

// Type aliases Orval references for error/body typing in generated hooks.
export type ErrorType<Error> = import("axios").AxiosError<Error>;
export type BodyType<BodyData> = BodyData;
