// Shared presentation primitives for the Patient Overview panels.
//
// The legacy screen is a grid of bordered "panels" with a coloured title bar and
// dense label/value tables. These primitives reproduce that structure using the
// app's existing design tokens.

import type { ReactNode } from "react";

export function Panel({
  title,
  actions,
  children,
  className = "",
  bodyClassName = "p-0",
}: {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`bg-white rounded-lg border-2 border-[#E2E8F0] shadow-sm flex flex-col ${className}`}
    >
      <header className="px-3 py-2 flex items-center justify-between gap-2 bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] rounded-t-md">
        <h2 className="text-white font-bold uppercase tracking-wide text-xs sm:text-sm truncate">
          {title}
        </h2>
        {actions ? <div className="flex items-center gap-1.5 shrink-0">{actions}</div> : null}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Small white-on-navy panel-header button (legacy "EDIT" / "+ ADD NEW …"). */
export function PanelButton({
  children,
  onClick,
  title,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="px-2 py-1 bg-white text-[#1F3A5F] rounded text-[11px] font-bold uppercase tracking-wide inline-flex items-center gap-1 hover:bg-[#E8F0FA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
    >
      {children}
    </button>
  );
}

/** Section sub-heading used inside the SUMMARY tab (APPOINTMENTS / RECALLS). */
export function SectionBar({
  title,
  actions,
  badge,
}: {
  title: string;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
      <div className="flex items-center gap-2">
        <h3 className="text-[#1F3A5F] font-bold uppercase tracking-wide text-xs sm:text-sm">
          {title}
        </h3>
        {badge}
      </div>
      {actions ? <div className="flex items-center gap-1.5 flex-wrap">{actions}</div> : null}
    </div>
  );
}

/** Outlined action button used in section bars (legacy grey/blue buttons). */
export function ActionButton({
  children,
  onClick,
  active,
  title,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide inline-flex items-center gap-1 border-2 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
        active
          ? "bg-[#1F3A5F] text-white border-[#1F3A5F]"
          : "bg-white text-[#1F3A5F] border-[#CBD5E1] hover:bg-[#F1F5F9]"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Two-column label/value table used by Patient Information and Responsible
 * Party. Pass `null` for a cell to leave it blank (legacy leaves empty cells).
 */
export function FieldTable({ rows }: { rows: Array<[ReactNode, ReactNode, ReactNode?, ReactNode?]> }) {
  return (
    <table className="w-full text-[13px] table-fixed">
      <tbody>
        {rows.map(([l1, v1, l2, v2], i) => (
          <tr key={i} className="border-b border-[#E2E8F0] last:border-b-0 align-top">
            <th className="w-[22%] px-3 py-1.5 text-left font-medium text-[#475569] bg-[#F8FAFC]">
              {l1}
            </th>
            <td
              className={`px-3 py-1.5 text-[#1E293B] font-semibold break-words ${
                l2 === undefined ? "w-[78%]" : "w-[28%]"
              }`}
              colSpan={l2 === undefined ? 3 : 1}
            >
              {v1}
            </td>
            {l2 !== undefined && (
              <>
                <th className="w-[22%] px-3 py-1.5 text-left font-medium text-[#475569] bg-[#F8FAFC]">
                  {l2}
                </th>
                <td className="w-[28%] px-3 py-1.5 text-[#1E293B] font-semibold break-words">{v2}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Dense data grid matching the legacy tables. */
export function DataGrid({
  columns,
  children,
  empty,
  is_empty,
  min_width,
}: {
  columns: string[];
  children: ReactNode;
  empty: string;
  is_empty: boolean;
  min_width?: number;
}) {
  return (
    <div className="overflow-x-auto border-2 border-[#E2E8F0] rounded">
      <table className="w-full text-[12px]" style={min_width ? { minWidth: min_width } : undefined}>
        <thead className="bg-[#3A6EA5] text-white">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="px-2 py-1.5 text-left font-bold uppercase tracking-wide whitespace-nowrap"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0] bg-white">
          {is_empty ? (
            <tr>
              <td colSpan={columns.length} className="px-2 py-4 text-center text-[#94A3B8] italic">
                {empty}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export const Td = ({
  children,
  className = "",
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}) => (
  <td colSpan={colSpan} className={`px-2 py-1.5 text-[#1E293B] whitespace-nowrap ${className}`}>
    {children}
  </td>
);
