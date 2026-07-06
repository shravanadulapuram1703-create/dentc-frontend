import type { ReactNode } from "react";
import GlobalNav from "../GlobalNav";

export interface AppShellProps {
  onLogout: () => void;
  currentOffice: string;
  setCurrentOffice: (office: string) => void;
  children: ReactNode;
  /**
   * Tailwind background class for the shell root. Defaults to the app's
   * secondary surface so every screen shares one canvas color.
   */
  bgClassName?: string;
  /**
   * When true, AppShell wraps children in a centered, padded container
   * (good for dashboards / forms / setup screens). Leave false for full-bleed
   * screens such as the Scheduler that manage their own width and padding.
   */
  contained?: boolean;
  /** Extra classes for the inner content wrapper (below the nav offset). */
  contentClassName?: string;
}

/**
 * The single application layout shell.
 *
 * Responsibilities:
 *  - Render the fixed GlobalNav exactly once.
 *  - Reserve space for it via `pt-[var(--app-nav-height)]`. GlobalNav measures
 *    its own height at runtime and publishes it to `--app-nav-height`, so the
 *    reserved space is always correct — across breakpoints, line wraps, and
 *    browser zoom — with no hard-coded pixel offsets to drift.
 *  - Provide one consistent canvas + min-height so the page fills the viewport.
 *
 * Every top-level route that shows the global navigation should render through
 * AppShell instead of hand-rolling `<GlobalNav/>` + a `pt-[120px]` wrapper.
 */
export default function AppShell({
  onLogout,
  currentOffice,
  setCurrentOffice,
  children,
  bgClassName = "bg-[#F7F9FC]",
  contained = false,
  contentClassName = "",
}: AppShellProps) {
  return (
    <div className={`min-h-screen ${bgClassName}`}>
      <GlobalNav
        onLogout={onLogout}
        currentOffice={currentOffice}
        setCurrentOffice={setCurrentOffice}
      />

      {/* Reserve space for the fixed nav. Self-correcting via --app-nav-height. */}
      <div className={`pt-[var(--app-nav-height)] ${contentClassName}`}>
        {contained ? (
          <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6">
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
