import { ReactNode } from "react";
import { Activity } from "lucide-react";

interface AuthShellProps {
  /** Heading inside the card-area branding block. */
  title: string;
  /** Sub-heading under the title. */
  subtitle?: ReactNode;
  children: ReactNode;
  /** Optional content rendered below the card (e.g. helper links). */
  footer?: ReactNode;
}

/**
 * Shared branding + centered-card layout for every authentication screen
 * (login, forgot/reset password, legacy activation). Responsive by default and
 * keeps the product branding consistent across the flow.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#F7F9FC] via-white to-[#E8EFF7]">
      {/* Subtle background pattern */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(31, 58, 95) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-md z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-[#1F3A5F] to-[#3A6EA5] shadow-lg mb-4">
            <Activity className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F3A5F] mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[#475569] font-medium">{subtitle}</p>
          )}
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl p-6 sm:p-8 shadow-lg border-2 border-[#E2E8F0]">
          {children}
        </div>

        {footer && <div className="mt-6">{footer}</div>}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-[#64748B] text-sm font-medium">
            DentC Practice Management Platform · Secure &amp; HIPAA Compliant
          </p>
        </div>
      </div>
    </div>
  );
}
