import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, User, CalendarClock, Stethoscope, Shield } from "lucide-react";
import { useListPatients } from "@/api/generated/endpoints/patients/patients";
import { useListAppointments } from "@/api/generated/endpoints/appointments/appointments";
import { useListProviders } from "@/api/generated/endpoints/organization/organization";
import { useListInsuranceCarriers } from "@/api/generated/endpoints/insurance/insurance";
import WidgetCard from "../components/WidgetCard";
import { formatTime } from "../lib/dashboardUtils";
import { components, utils } from "../../../styles/theme.js";

type Scope = "all" | "patients" | "appointments" | "providers" | "insurance";

const SCOPES: { value: Scope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "patients", label: "Patients" },
  { value: "appointments", label: "Appointments" },
  { value: "providers", label: "Providers" },
  { value: "insurance", label: "Insurance" },
];

const SIZE = 6;

/**
 * Global quick search. There is no unified backend search endpoint, so this fans
 * out to each entity's list endpoint in parallel and merges the results.
 */
export default function GlobalSearchWidget() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [term, setTerm] = useState("");

  // Debounce the committed search term.
  useEffect(() => {
    const id = setTimeout(() => setTerm(input.trim()), 350);
    return () => clearTimeout(id);
  }, [input]);

  const active = term.length >= 2;
  const want = (s: Scope) => active && (scope === "all" || scope === s);

  const patients = useListPatients(
    { search: term, is_active: true, size: SIZE },
    { query: { enabled: want("patients") } },
  );
  const appts = useListAppointments(
    { search: term, size: SIZE },
    { query: { enabled: want("appointments") } },
  );
  const providers = useListProviders(
    { search: term, is_active: true, size: SIZE },
    { query: { enabled: want("providers") } },
  );
  const carriers = useListInsuranceCarriers(
    { search: term, size: SIZE },
    { query: { enabled: want("insurance") } },
  );

  const isFetching =
    patients.isFetching || appts.isFetching || providers.isFetching || carriers.isFetching;

  const totalResults =
    (want("patients") ? patients.data?.items.length ?? 0 : 0) +
    (want("appointments") ? appts.data?.items.length ?? 0 : 0) +
    (want("providers") ? providers.data?.items.length ?? 0 : 0) +
    (want("insurance") ? carriers.data?.items.length ?? 0 : 0);

  const showEmpty = active && !isFetching && totalResults === 0;

  const chip = (s: Scope, label: string) => (
    <button
      key={s}
      type="button"
      onClick={() => setScope(s)}
      className={utils.cn(
        "px-3 py-1 rounded-full text-xs font-bold transition-colors",
        scope === s
          ? "bg-[#1F3A5F] text-white"
          : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]",
      )}
    >
      {label}
    </button>
  );

  const groups = useMemo(
    () => [
      {
        key: "patients" as Scope,
        title: "Patients",
        icon: <User className="w-3.5 h-3.5" />,
        items: (patients.data?.items ?? []).map((p) => ({
          id: `p-${p.id}`,
          primary: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || `Patient #${p.id}`,
          secondary: [p.chart_no && `Chart ${p.chart_no}`, p.cell_phone || p.phone, p.dob]
            .filter(Boolean)
            .join(" · "),
          onClick: () => navigate(`/patient/${p.id}/overview`),
        })),
      },
      {
        key: "appointments" as Scope,
        title: "Appointments",
        icon: <CalendarClock className="w-3.5 h-3.5" />,
        items: (appts.data?.items ?? []).map((a) => ({
          id: `a-${a.id}`,
          primary: `${a.date} · ${formatTime(a.start_time)}`,
          secondary: [a.status, a.procedure_label].filter(Boolean).join(" · "),
          onClick: () => navigate("/scheduler"),
        })),
      },
      {
        key: "providers" as Scope,
        title: "Providers",
        icon: <Stethoscope className="w-3.5 h-3.5" />,
        items: (providers.data?.items ?? []).map((p) => ({
          id: `pr-${p.id}`,
          primary: p.name,
          secondary: [p.specialty, p.role].filter(Boolean).join(" · "),
          onClick: undefined,
        })),
      },
      {
        key: "insurance" as Scope,
        title: "Insurance Carriers",
        icon: <Shield className="w-3.5 h-3.5" />,
        items: (carriers.data?.items ?? []).map((c) => ({
          id: `c-${c.id}`,
          primary: c.name,
          secondary: [c.payer_id && `Payer ${c.payer_id}`, c.phone].filter(Boolean).join(" · "),
          onClick: undefined,
        })),
      },
    ],
    [patients.data, appts.data, providers.data, carriers.data, navigate],
  );

  return (
    <WidgetCard title="Quick Search" icon={<Search className="w-4 h-4" />} bodyClassName="p-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search patients, appointments, providers, insurance…"
          className={utils.cn(components.input, "pl-9")}
        />
        {isFetching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#3A6EA5]" />
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">{SCOPES.map((s) => chip(s.value, s.label))}</div>

      {!active ? (
        <p className="text-xs text-[#94A3B8] py-2">Type at least 2 characters to search across the practice.</p>
      ) : showEmpty ? (
        <p className="text-sm text-[#64748B] py-2">No results for “{term}”.</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {groups
            .filter((g) => (scope === "all" || scope === g.key) && g.items.length > 0)
            .map((g) => (
              <div key={g.key}>
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-1">
                  {g.icon} {g.title} ({g.items.length})
                </p>
                <ul className="divide-y divide-[#E2E8F0] rounded-lg border border-[#E2E8F0]">
                  {g.items.map((it) => (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={it.onClick}
                        disabled={!it.onClick}
                        className={utils.cn(
                          "w-full text-left px-3 py-2",
                          it.onClick ? "hover:bg-[#F7F9FC] cursor-pointer" : "cursor-default",
                        )}
                      >
                        <p className="text-sm font-semibold text-[#1E293B] truncate">{it.primary}</p>
                        {it.secondary && (
                          <p className="text-xs text-[#64748B] truncate">{it.secondary}</p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}
    </WidgetCard>
  );
}
