// The one /reports/* route element (07 §2.3). Main chunk, kept small: page chrome, the error
// boundary, and a lazy import of the module's routes.
import { lazy, Suspense, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import { markPreloadFailed, ReportsErrorBoundary } from "./ReportsErrorBoundary";
import { ReportsPageSkeleton } from "./pages/StatePages";
import type { ReportsRouteProps } from "./routes";

const ReportsRoutes = lazy(() => import("./routes"));

export default function ReportsEntry(props: ReportsRouteProps) {
  useEffect(() => {
    // Vite fires this when a lazy chunk's preload fails (typically a stale deploy); let the
    // boundary show "A new version is available" instead of Vite's default reload loop.
    const onPreloadError = (event: Event) => {
      event.preventDefault();
      markPreloadFailed();
    };
    window.addEventListener("vite:preloadError", onPreloadError);
    return () => window.removeEventListener("vite:preloadError", onPreloadError);
  }, []);

  return (
    <AppShell
      onLogout={props.onLogout}
      currentOffice={props.currentOffice}
      setCurrentOffice={props.setCurrentOffice}
      bgClassName="bg-slate-50"
    >
      <ReportsErrorBoundary>
        <Suspense fallback={<ReportsPageSkeleton />}>
          <ReportsRoutes {...props} />
        </Suspense>
      </ReportsErrorBoundary>
    </AppShell>
  );
}
