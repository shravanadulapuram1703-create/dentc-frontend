import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  HeartPulse,
  Building2,
  Coins,
  Network,
  Percent,
  ReceiptText,
  BadgeCheck,
  Wallet,
  RefreshCw,
  Plus,
  ArrowRight,
} from "lucide-react";
import {
  listInsurancePlans,
  listInsuranceCarriers,
  listEmployers,
} from "@/api/generated/endpoints/insurance/insurance";
import { listInsuranceClaims } from "@/api/generated/endpoints/billing/billing";
import { listFeeSchedules } from "@/api/generated/endpoints/procedures/procedures";
import { getReportAccountsReceivable } from "@/api/generated/endpoints/reports/reports";
import WidgetCard from "@/components/dashboard/components/WidgetCard";
import KpiStat from "@/components/dashboard/components/KpiStat";
import { formatCurrency } from "@/components/dashboard/lib/aggregate";

// ============================================================================
// Insurance Dashboard — a modern overview landing for the Insurance module.
// Every figure is backend-driven: plan/carrier/employer/fee-schedule counts come
// from list `meta.total`, claim counts from the `status`-filtered claims list,
// and insurance receivables from /reports/accounts-receivable (insurance_ar).
// Pending Verifications is surfaced as "awaiting backend" — subscribers carry an
// elig_status but the list has no elig_status filter (devreport INS-11).
// Built on the shared dashboard WidgetCard / KpiStat components.
// ============================================================================

// Claim statuses that count as still-outstanding (not paid/closed/denied/void).
const OUTSTANDING_STATUSES = ["submitted", "pending", "draft"];
const DENIED_STATUSES = ["denied", "rejected"];

interface Metrics {
  totalPlans: number | null;
  activePlans: number | null;
  totalClaims: number | null;
  outstandingClaims: number | null;
  deniedClaims: number | null;
  insuranceAr: number | null;
  dentalCarriers: number | null;
  medicalCarriers: number | null;
  employers: number | null;
  feeSchedules: number | null;
}

const EMPTY: Metrics = {
  totalPlans: null,
  activePlans: null,
  totalClaims: null,
  outstandingClaims: null,
  deniedClaims: null,
  insuranceAr: null,
  dentalCarriers: null,
  medicalCarriers: null,
  employers: null,
  feeSchedules: null,
};

async function countPlans(params: Parameters<typeof listInsurancePlans>[0]): Promise<number | null> {
  return listInsurancePlans({ ...params, size: 1 })
    .then((r) => r.meta?.total ?? 0)
    .catch(() => null);
}
async function countClaims(status?: string): Promise<number | null> {
  return listInsuranceClaims({ size: 1, ...(status ? { status } : {}) })
    .then((r) => r.meta?.total ?? 0)
    .catch(() => null);
}
async function sumClaimStatuses(statuses: string[]): Promise<number | null> {
  const counts = await Promise.all(statuses.map((s) => countClaims(s)));
  if (counts.every((c) => c === null)) return null;
  return counts.reduce((acc: number, c) => acc + (c ?? 0), 0);
}

function fmtNum(n: number | null): string {
  return n == null ? "—" : n.toLocaleString();
}

export default function InsuranceDashboard() {
  const navigate = useNavigate();
  const [m, setM] = useState<Metrics>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [arError, setArError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setArError(false);
    const [
      totalPlans,
      activePlans,
      totalClaims,
      outstandingClaims,
      deniedClaims,
      ar,
      dentalCarriers,
      medicalCarriers,
      employers,
      feeSchedules,
    ] = await Promise.all([
      countPlans({}),
      countPlans({ is_active: true }),
      countClaims(),
      sumClaimStatuses(OUTSTANDING_STATUSES),
      sumClaimStatuses(DENIED_STATUSES),
      getReportAccountsReceivable().catch(() => null),
      listInsuranceCarriers({ size: 1, carrier_type: "True" }).then((r) => r.meta?.total ?? 0).catch(() => null),
      listInsuranceCarriers({ size: 1, carrier_type: "False" }).then((r) => r.meta?.total ?? 0).catch(() => null),
      listEmployers({ size: 1 }).then((r) => r.meta?.total ?? 0).catch(() => null),
      listFeeSchedules({ size: 1, is_active: true }).then((r) => r.meta?.total ?? 0).catch(() => null),
    ]);
    if (ar == null) setArError(true);
    setM({
      totalPlans,
      activePlans,
      totalClaims,
      outstandingClaims,
      deniedClaims,
      insuranceAr: ar?.insurance_ar ?? null,
      dentalCarriers,
      medicalCarriers,
      employers,
      feeSchedules,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const go = (path: string) => () => navigate(path);

  const quickActions: { label: string; icon: typeof Plus; path: string }[] = [
    { label: "Add Insurance Plan", icon: FileText, path: "/setup/insurance/insurance-plans" },
    { label: "Add Employer", icon: Building2, path: "/setup/insurance/employers" },
    { label: "Dental Carriers", icon: ShieldCheck, path: "/setup/insurance/dental-carriers" },
    { label: "Medical Carriers", icon: HeartPulse, path: "/setup/insurance/medical-carriers" },
    { label: "Custom Coverage", icon: Percent, path: "/setup/insurance/custom-coverage" },
    { label: "Manage Fee Schedules", icon: Coins, path: "/setup/fee-schedules/fee-schedule-setup" },
    { label: "Fee Schedule Assignments", icon: Network, path: "/setup/fee-schedules/fee-schedule-assignments" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1600px] mx-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#3A6EA5] flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1F3A5F]">Insurance Dashboard</h1>
              <p className="text-xs text-[#64748B] font-bold">Plans, carriers, claims and receivables at a glance</p>
            </div>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border-2 border-[#E2E8F0] text-[#1F3A5F] rounded-lg hover:bg-[#E8EFF7] font-bold text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* KPI cards */}
        <WidgetCard title="Key Metrics" icon={<BadgeCheck className="w-4 h-4" />}>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <KpiStat
              label="Total Plans"
              value={fmtNum(m.totalPlans)}
              icon={<FileText className="w-4 h-4" />}
              tone="blue"
              loading={loading}
              onClick={go("/setup/insurance/insurance-plans")}
              hint="All insurance plans"
            />
            <KpiStat
              label="Active Plans"
              value={fmtNum(m.activePlans)}
              icon={<FileText className="w-4 h-4" />}
              tone="teal"
              loading={loading}
              onClick={go("/setup/insurance/insurance-plans")}
              hint="is_active = true"
            />
            <KpiStat
              label="Pending Verifications"
              value="—"
              icon={<BadgeCheck className="w-4 h-4" />}
              tone="neutral"
              loading={loading}
              hint="Awaiting backend (INS-11)"
            />
            <KpiStat
              label="Claims Outstanding"
              value={fmtNum(m.outstandingClaims)}
              icon={<ReceiptText className="w-4 h-4" />}
              tone="amber"
              loading={loading}
              hint="Submitted / pending"
            />
            <KpiStat
              label="Claims Denied"
              value={fmtNum(m.deniedClaims)}
              icon={<ReceiptText className="w-4 h-4" />}
              tone="red"
              loading={loading}
              hint="Denied / rejected"
            />
            <KpiStat
              label="Insurance Receivables"
              value={m.insuranceAr == null ? (arError ? "—" : "…") : formatCurrency(m.insuranceAr)}
              icon={<Wallet className="w-4 h-4" />}
              tone="slate"
              loading={loading}
              hint={arError ? "AR report unavailable" : "Outstanding insurance AR"}
            />
          </div>
        </WidgetCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Quick actions */}
          <WidgetCard title="Quick Actions" icon={<Plus className="w-4 h-4" />} className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {quickActions.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.label}
                    onClick={go(a.path)}
                    className="group flex items-center gap-3 rounded-lg border-2 border-[#E2E8F0] bg-white p-3 text-left hover:border-[#3A6EA5] hover:shadow-sm transition-all"
                  >
                    <span className="w-9 h-9 rounded-lg bg-[#E8EFF7] flex items-center justify-center text-[#3A6EA5] shrink-0">
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="flex-1 text-sm font-bold text-[#1F3A5F]">{a.label}</span>
                    <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#3A6EA5] group-hover:translate-x-0.5 transition-all" />
                  </button>
                );
              })}
            </div>
          </WidgetCard>

          {/* Setup at a glance */}
          <WidgetCard title="Setup at a Glance" icon={<Network className="w-4 h-4" />}>
            <div className="space-y-2">
              <GlanceRow icon={<ShieldCheck className="w-4 h-4 text-[#3A6EA5]" />} label="Dental Carriers" value={fmtNum(m.dentalCarriers)} onClick={go("/setup/insurance/dental-carriers")} loading={loading} />
              <GlanceRow icon={<HeartPulse className="w-4 h-4 text-[#3A6EA5]" />} label="Medical Carriers" value={fmtNum(m.medicalCarriers)} onClick={go("/setup/insurance/medical-carriers")} loading={loading} />
              <GlanceRow icon={<Building2 className="w-4 h-4 text-[#3A6EA5]" />} label="Employers" value={fmtNum(m.employers)} onClick={go("/setup/insurance/employers")} loading={loading} />
              <GlanceRow icon={<Coins className="w-4 h-4 text-[#3A6EA5]" />} label="Fee Schedules" value={fmtNum(m.feeSchedules)} onClick={go("/setup/fee-schedules/fee-schedule-setup")} loading={loading} />
              <GlanceRow icon={<ReceiptText className="w-4 h-4 text-[#3A6EA5]" />} label="Total Claims" value={fmtNum(m.totalClaims)} loading={loading} />
            </div>
          </WidgetCard>
        </div>
      </div>
    </div>
  );
}

function GlanceRow({
  icon,
  label,
  value,
  onClick,
  loading,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-left ${
        onClick ? "hover:border-[#3A6EA5] hover:bg-[#F7F9FC] transition-all cursor-pointer" : ""
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-[#1F3A5F]">
        {icon}
        {label}
      </span>
      {loading ? (
        <span className="h-5 w-10 rounded bg-[#E2E8F0] animate-pulse" />
      ) : (
        <span className="text-base font-bold tabular-nums text-[#1E293B]">{value}</span>
      )}
    </Wrapper>
  );
}
