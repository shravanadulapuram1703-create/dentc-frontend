/** Pull the backend's `detail` message off an axios error, when present. */
export const errMsg = (err: unknown): string | undefined =>
  (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
