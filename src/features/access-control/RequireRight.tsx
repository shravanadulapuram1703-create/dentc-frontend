// Access control — declarative guard component. Wraps UI that needs a right.
//
// Two modes:
//   • Inline element guard (default): omit `redirectTo`; when denied it renders
//     `fallback` (default `null` → the button/tab/menu-item simply disappears).
//   • Route guard: pass `redirectTo` to <Navigate> away, or pass <AccessDenied/>
//     as `fallback` to show an in-place message for a deep-linked URL.
//
// Frontend gating is UX only; the backend 403 is the real boundary.
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useRights } from "./useRights";
import type { RightCode } from "./rights";

export interface RequireRightProps {
  /** Required right code(s). */
  code: RightCode | RightCode[];
  /** With multiple codes: "any" (default — hold one) or "all" (hold every one). */
  mode?: "any" | "all";
  /** Route-guard: navigate here when denied, instead of rendering `fallback`. */
  redirectTo?: string;
  /** What to render when denied. Default `null` (hide the guarded element). */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Renders `children` only when the signed-in user holds the required right(s).
 * While the kill-switch is dark (default), this always renders `children`.
 */
export default function RequireRight({
  code,
  mode = "any",
  redirectTo,
  fallback = null,
  children,
}: RequireRightProps) {
  const { has, hasAny, hasAll, ready } = useRights();

  // Identity still hydrating (e.g. right after a hard reload) — rights are
  // unknown, so wait rather than flash a denial. When `me-full` resolves the
  // component re-renders and the real decision is made.
  if (!ready) return null;

  const allowed = Array.isArray(code)
    ? mode === "all"
      ? hasAll(code)
      : hasAny(code)
    : has(code);

  if (allowed) return <>{children}</>;
  if (redirectTo) return <Navigate to={redirectTo} replace />;
  return <>{fallback}</>;
}

/**
 * Standard "you don't have access" panel — hand to <RequireRight fallback> for a
 * route guard so a deep-linked URL shows a message instead of a blank screen.
 */
export function AccessDenied({
  title = "Access denied",
  message = "You don't have permission to view this screen. Contact your administrator if you believe this is a mistake.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FEE2E2]">
        <ShieldAlert className="h-7 w-7 text-[#DC2626]" strokeWidth={2} />
      </div>
      <h2 className="text-lg font-bold text-[#1E293B]">{title}</h2>
      <p className="max-w-md text-sm text-[#64748B]">{message}</p>
    </div>
  );
}
