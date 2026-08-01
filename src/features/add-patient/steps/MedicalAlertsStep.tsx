import { useEffect, useState } from "react";
import { StepSection, GapNotice, YesNoToggle } from "../stepUi";
import {
  DEFAULT_MEDICAL_ALERT_GROUPS,
  MEDICAL_ALERT_COMMENTS_MAX,
  MIN_TENANT_CATALOG_ITEMS,
  type MedicalAlertGroup,
  type MedicalAlertItem,
  type MedicalAlertsForm,
} from "../wizardModel";
import { GROUP_TYPE, listGroupsByType, listDefinitionsByGroup } from "@/components/setup/medical/definitionsService";

interface Props {
  value: MedicalAlertsForm;
  onChange: (next: MedicalAlertsForm) => void;
  /** Reports the resolved alert catalog (code → label) so Finish can send labels. */
  onCatalog?: (labels: Record<string, string>) => void;
}

const labelMap = (groups: MedicalAlertGroup[]): Record<string, string> =>
  Object.fromEntries(groups.flatMap((g) => g.items).map((a) => [a.code, a.label]));

/**
 * Step — Medical Alerts (legacy Denticon "Medical Information" → Medical Alerts).
 * Renders the legacy groups ("Allergic To", "Check, if applicable", "Other") with a
 * Y / N choice per row. The catalog is loaded from the tenant's MEDALERT
 * `definitions` when seeded, otherwise the full legacy list is used.
 * "No to all med alerts" sets every unanswered row to No **without overriding a
 * Yes** — legacy behaviour. Comments are capped at 100 characters, as in legacy.
 */
export default function MedicalAlertsStep({ value, onChange, onCatalog }: Props) {
  const [groups, setGroups] = useState<MedicalAlertGroup[]>(DEFAULT_MEDICAL_ALERT_GROUPS);
  const [source, setSource] = useState<"catalog" | "legacy">("legacy");

  useEffect(() => {
    let cancelled = false;
    onCatalog?.(labelMap(DEFAULT_MEDICAL_ALERT_GROUPS));
    (async () => {
      try {
        const defGroups = await listGroupsByType(GROUP_TYPE.MEDICAL_ALERT);
        const loaded: MedicalAlertGroup[] = [];
        for (const g of defGroups) {
          const defs = await listDefinitionsByGroup(g.group_code);
          if (defs.length === 0) continue;
          loaded.push({
            title: g.description,
            items: defs.map((d) => ({ code: d.key1 || String(d.id), label: d.description })),
          });
        }
        // Only let a *plausibly seeded* tenant catalog replace the legacy list —
        // see MIN_TENANT_CATALOG_ITEMS / gap LEG-1.
        const itemCount = loaded.reduce((n, g) => n + g.items.length, 0);
        if (cancelled || itemCount < MIN_TENANT_CATALOG_ITEMS) return;
        setGroups(loaded);
        setSource("catalog");
        onCatalog?.(labelMap(loaded));
      } catch {
        /* keep the legacy catalog */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allItems: MedicalAlertItem[] = groups.flatMap((g) => g.items);
  const answered = allItems.filter((a) => value.responses[a.code]).length;
  const yesCount = allItems.filter((a) => value.responses[a.code] === "yes").length;

  const setResponse = (code: string, ans: "yes" | "no") =>
    onChange({ ...value, responses: { ...value.responses, [code]: ans } });

  /** Legacy: "Clicking No to all med alerts will select all `No` checkboxes, but will not override a `Yes`." */
  const noToAll = () => {
    const next = { ...value.responses };
    for (const a of allItems) if (next[a.code] !== "yes") next[a.code] = "no";
    onChange({ ...value, responses: next });
  };

  const clearAll = () => onChange({ ...value, responses: {} });

  return (
    <div className="space-y-3">
      <GapNotice>
        Alert answers persist per patient via <code>patient-medical-alerts</code> (responses are
        constrained to yes/no; an unanswered row is simply not sent). The tenant's MEDALERT catalog is{" "}
        {source === "catalog" ? "seeded" : "not yet seeded, so the full legacy list is shown"} — see
        gap LEG-1.
      </GapNotice>

      <StepSection
        title="Medical Alerts"
        right={
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64748B]">
              {answered}/{allItems.length} answered · {yesCount} Yes
            </span>
            <button
              type="button"
              onClick={noToAll}
              className="text-xs font-semibold text-[#3A6EA5] hover:text-[#1F3A5F]"
            >
              No to all med alerts
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-[#64748B] hover:text-[#1F3A5F]"
            >
              Clear
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.title}>
              <div className="bg-[#F1F5F9] px-3 py-1.5 rounded text-xs font-bold text-[#1F3A5F] uppercase tracking-wide mb-2">
                {group.title}
              </div>
              {/* Legacy shows these in dense multi-column blocks. */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6">
                {group.items.map((a) => (
                  <div
                    key={a.code}
                    className="flex items-center justify-between gap-2 py-1 border-b border-[#F1F5F9]"
                  >
                    <span
                      className={`text-sm ${
                        value.responses[a.code] === "yes"
                          ? "text-[#B91C1C] font-semibold"
                          : "text-[#1E293B]"
                      }`}
                    >
                      {a.label}
                    </span>
                    <YesNoToggle
                      value={value.responses[a.code] ?? ""}
                      onChange={(ans) => setResponse(a.code, ans)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </StepSection>

      <StepSection
        title="Additional Comments"
        right={
          <span className="text-xs text-[#64748B]">
            {value.comments.length}/{MEDICAL_ALERT_COMMENTS_MAX}
          </span>
        }
      >
        <textarea
          value={value.comments}
          onChange={(e) =>
            onChange({ ...value, comments: e.target.value.slice(0, MEDICAL_ALERT_COMMENTS_MAX) })
          }
          rows={3}
          placeholder="Any further medical information pertaining to the patient…"
          className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6EA5] text-sm resize-none"
        />
      </StepSection>
    </div>
  );
}
