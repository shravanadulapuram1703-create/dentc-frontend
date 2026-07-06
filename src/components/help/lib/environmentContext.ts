// Auto-population of the application/environment context stamped onto every
// support ticket. Everything here is derived — the user never types it — so
// support gets accurate reproduction context for free.
import { env } from "@/shared/config/env";
import type { TicketContext } from "../types";

/** Rough browser name + version from the UA string (best-effort, non-critical). */
export function detectBrowser(ua: string = navigator.userAgent): string {
  const tests: Array<[string, RegExp]> = [
    ["Edge", /Edg\/([\d.]+)/],
    ["Opera", /OPR\/([\d.]+)/],
    ["Chrome", /Chrome\/([\d.]+)/],
    ["Firefox", /Firefox\/([\d.]+)/],
    ["Safari", /Version\/([\d.]+).*Safari/],
  ];
  for (const [name, re] of tests) {
    const m = ua.match(re);
    if (m) return `${name} ${m[1]}`;
  }
  return "Unknown browser";
}

/** Rough OS from the UA string. */
export function detectOs(ua: string = navigator.userAgent): string {
  if (/Windows NT 10/.test(ua)) return "Windows 10/11";
  if (/Windows NT/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown OS";
}

/**
 * Map a route pathname to a friendly module name that matches the Help form's
 * "Module or Screen" catalog. Used to pre-select where the issue happened.
 */
export function moduleFromPath(pathname: string): string {
  const p = pathname.toLowerCase();
  const map: Array<[RegExp, string]> = [
    [/^\/dashboard/, "Dashboard"],
    [/^\/scheduler/, "Scheduler"],
    [/\/transaction|\/account-ledger|\/ledger/, "Transactions"],
    [/\/restorative|\/perio/, "Charting"],
    [/\/treatment/, "Treatment Plans"],
    [/\/prescriptions/, "Prescriptions"],
    [/\/lab-tracking/, "Lab Tracking"],
    [/\/insurance/, "Insurance"],
    [/\/imaging/, "Imaging"],
    [/^\/patient/, "Patient"],
    [/^\/reports/, "Reports"],
    [/^\/utilities/, "Utilities"],
    [/^\/setup/, "Setup"],
    [/^\/my-page/, "My Page"],
    [/^\/(login|forgot-password|reset-password|activate-legacy|signup)/, "Login / Authentication"],
    [/^\/help/, "Help"],
  ];
  for (const [re, name] of map) if (re.test(p)) return name;
  return "Other";
}

export interface BuildContextInput {
  user_name?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  office?: string | null;
  /** Current in-app location; falls back to window.location. */
  pathname?: string;
}

/** Assemble the full auto-context for a ticket at submit/open time. */
export function buildTicketContext(input: BuildContextInput): TicketContext {
  const pathname = input.pathname ?? window.location.pathname;
  return {
    user_name: input.user_name?.trim() || "Unknown user",
    user_id: input.user_id || "unknown",
    user_email: input.user_email || "",
    user_role: input.user_role || "unknown",
    office: input.office?.trim() || "No office selected",
    app_version: env.appVersion,
    browser: detectBrowser(),
    operating_system: detectOs(),
    timestamp: new Date().toISOString(),
    module: moduleFromPath(pathname),
    url: window.location.href,
  };
}
