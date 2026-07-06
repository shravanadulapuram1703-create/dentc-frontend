// Registry of every runnable report + category metadata. The catalog page and the
// runner route both read from here, so adding a report = importing its definition
// into REPORTS (plus the definition file itself).
import { DollarSign, Users, CalendarCheck, Stethoscope, ShieldCheck, type LucideIcon } from "lucide-react";
import type { AnyReportDefinition, ReportCategory } from "./types";
import { productionReport } from "./reports/productionReport";
import { collectionsReport } from "./reports/collectionsReport";
import { patientListReport } from "./reports/patientListReport";
import { appointmentReport } from "./reports/appointmentReport";
import { treatmentPlanReport } from "./reports/treatmentPlanReport";
import { insuranceClaimReport } from "./reports/insuranceClaimReport";

export const REPORTS: AnyReportDefinition[] = [
  productionReport,
  collectionsReport,
  patientListReport,
  appointmentReport,
  treatmentPlanReport,
  insuranceClaimReport,
];

export function getReport(id: string): AnyReportDefinition | undefined {
  return REPORTS.find((r) => r.id === id);
}

export interface CategoryMeta {
  key: ReportCategory;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string; // tailwind text color for the category icon
}

export const CATEGORIES: CategoryMeta[] = [
  { key: "Financial", label: "Financial", description: "Production, collections & revenue", icon: DollarSign, accent: "text-[#2FB9A7]" },
  { key: "Patient", label: "Patient", description: "Demographics & patient lists", icon: Users, accent: "text-[#3A6EA5]" },
  { key: "Appointment", label: "Appointment", description: "Schedule & appointment activity", icon: CalendarCheck, accent: "text-[#8B5CF6]" },
  { key: "Clinical", label: "Clinical", description: "Treatment plans & procedures", icon: Stethoscope, accent: "text-[#F59E0B]" },
  { key: "Insurance", label: "Insurance", description: "Claims & receivables", icon: ShieldCheck, accent: "text-[#EC4899]" },
];

export function reportsByCategory(category: ReportCategory): AnyReportDefinition[] {
  return REPORTS.filter((r) => r.category === category);
}
