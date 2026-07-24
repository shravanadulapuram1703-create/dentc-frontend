import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/shared/config/queryClient";

/**
 * Cross-cutting app providers. Kept as the outermost wrapper so server-state
 * (React Query) and toasts are available to every feature, including the
 * existing AuthProvider / ChatProvider / Router tree nested inside.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" closeButton />
    </QueryClientProvider>
  );
}
