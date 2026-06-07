import type { ReactNode } from "react";
import { Loader2, AlertTriangle, Inbox, Wrench } from "lucide-react";
import { components, utils } from "../../../styles/theme.js";

interface WidgetCardProps {
  title: string;
  icon?: ReactNode;
  /** Right-aligned header content (refresh button, "view all" link, etc.). */
  actions?: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  /**
   * When true the widget renders an honest "awaiting backend" state instead of
   * data — used for widgets whose backend endpoint does not exist yet (see
   * docs/dashboard/dashboard_backend_devreport.md). No mock data.
   */
  awaitingBackend?: boolean;
  awaitingMessage?: string;
  className?: string;
  bodyClassName?: string;
  footer?: ReactNode;
  children?: ReactNode;
}

/**
 * Standard dashboard widget container: slate header bar + body with built-in
 * loading / error / empty / awaiting-backend states. Keeps every widget visually
 * consistent and removes per-widget state boilerplate.
 */
export default function WidgetCard({
  title,
  icon,
  actions,
  isLoading,
  isError,
  errorMessage,
  isEmpty,
  emptyMessage = "Nothing to show right now.",
  awaitingBackend,
  awaitingMessage = "This widget is waiting on a backend endpoint that doesn't exist yet.",
  className,
  bodyClassName,
  footer,
  children,
}: WidgetCardProps) {
  return (
    <section className={utils.cn(components.card, "flex flex-col overflow-hidden", className)}>
      <header className="flex items-center justify-between gap-3 bg-[#F1F5F9] px-4 py-3 border-b-2 border-[#E2E8F0]">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-[#1F3A5F] shrink-0">{icon}</span>}
          <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide truncate">
            {title}
          </h3>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </header>

      <div className={utils.cn("flex-1 p-4", bodyClassName)}>
        {awaitingBackend ? (
          <div className="flex flex-col items-center justify-center text-center gap-2 py-8">
            <Wrench className="w-7 h-7 text-[#94A3B8]" strokeWidth={1.75} />
            <p className="text-sm font-semibold text-[#475569]">Awaiting backend</p>
            <p className="text-xs text-[#64748B] max-w-xs">{awaitingMessage}</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#3A6EA5]" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center text-center gap-2 py-8">
            <AlertTriangle className="w-7 h-7 text-[#EF4444]" strokeWidth={1.75} />
            <p className="text-sm font-semibold text-[#DC2626]">
              {errorMessage || "Couldn't load this widget."}
            </p>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center text-center gap-2 py-8">
            <Inbox className="w-7 h-7 text-[#94A3B8]" strokeWidth={1.75} />
            <p className="text-sm text-[#64748B]">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>

      {footer && !awaitingBackend && (
        <footer className="border-t border-[#E2E8F0] px-4 py-2.5 bg-[#F7F9FC]">{footer}</footer>
      )}
    </section>
  );
}
