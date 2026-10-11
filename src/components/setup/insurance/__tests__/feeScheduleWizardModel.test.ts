import { describe, expect, it } from "vitest";
import type { FeeScheduleAssignmentRead, ProviderRead } from "@/api/generated/model";
import {
  buildAssignmentTargets,
  buildProviderRows,
  deriveSpecialties,
  latestEntryPerCode,
  planAssignments,
} from "../feeScheduleWizardModel";

const prov = (id: string, office_id: number, extra: Partial<ProviderRead> = {}): ProviderRead =>
  ({ id, office_id, name: `Dr ${id}`, first_name: "Dr", last_name: id, is_active: true, specialty: null, ...extra }) as ProviderRead;

const directory = [
  prov("P1", 100, { specialty: "Orthodontics" }),
  prov("P2", 1),
  prov("P3", 1, { specialty: "Orthodontics" }),
  prov("P4", 101, { specialty: "Endodontics" }),
  prov("P5", 100, { is_active: false }),
];
// Office 100 roster adds P2 (multi-office provider); office 101 roster empty.
const rosters = new Map<number, string[] | null>([
  [100, ["P2"]],
  [101, []],
]);

describe("buildProviderRows", () => {
  it("derives providers from the selected offices (roster ∪ home office, active only)", () => {
    const rows = buildProviderRows(directory, "specific", [100], rosters);
    expect(rows.map((r) => r.id).sort()).toEqual(["P1", "P2"]);
    expect(rows.every((r) => r.office_ids.join() === "100")).toBe(true);
  });

  it("unions providers across multiple offices and records which offices each serves", () => {
    const rows = buildProviderRows(directory, "specific", [100, 101], rosters);
    expect(rows.map((r) => r.id).sort()).toEqual(["P1", "P2", "P4"]);
    expect(rows.find((r) => r.id === "P4")?.office_ids).toEqual([101]);
  });

  it("lists every active provider for All Offices", () => {
    expect(buildProviderRows(directory, "all", [], rosters)).toHaveLength(4);
  });

  it("appends out-of-scope providers only when asked", () => {
    const rows = buildProviderRows(directory, "specific", [100], rosters, true);
    expect(rows.filter((r) => !r.in_scope).map((r) => r.id).sort()).toEqual(["P3", "P4"]);
  });
});

describe("deriveSpecialties", () => {
  it("counts in-scope providers per exact specialty string", () => {
    const rows = buildProviderRows(directory, "specific", [100, 101], rosters, true);
    expect(deriveSpecialties(rows)).toEqual([
      { specialty: "Endodontics", provider_count: 1 },
      { specialty: "Orthodontics", provider_count: 1 },
    ]);
  });
});

describe("buildAssignmentTargets", () => {
  const rows = buildProviderRows(directory, "specific", [100, 101], rosters, true);

  it("narrows each provider to the selected offices it serves", () => {
    const t = buildAssignmentTargets(
      { office_scope: "specific", office_ids: [100, 101], provider_scope: "providers", provider_ids: ["P1", "P4"], specialties: [] },
      rows,
    );
    expect(t).toEqual([
      { provider_id: "P1", office_id: 100 },
      { provider_id: "P4", office_id: 101 },
    ]);
  });

  it("binds an out-of-scope provider to every selected office", () => {
    const t = buildAssignmentTargets(
      { office_scope: "specific", office_ids: [100, 101], provider_scope: "providers", provider_ids: ["P3"], specialties: [] },
      rows,
    );
    expect(t).toEqual([
      { provider_id: "P3", office_id: 100 },
      { provider_id: "P3", office_id: 101 },
    ]);
  });

  it("writes office_id null for All Offices and nothing for All Providers", () => {
    expect(
      buildAssignmentTargets({ office_scope: "all", office_ids: [], provider_scope: "specialties", provider_ids: [], specialties: ["Orthodontics"] }, rows),
    ).toEqual([{ specialty_id: "Orthodontics", office_id: null }]);
    expect(
      buildAssignmentTargets({ office_scope: "specific", office_ids: [100], provider_scope: "all", provider_ids: ["P1"], specialties: [] }, rows),
    ).toEqual([]);
  });
});

describe("planAssignments", () => {
  it("pairs a target with the row already owning its tuple (NULL-aware) and dedupes", () => {
    const existing = [
      { id: 9, fee_schedule_id: 3, provider_id: "P1", office_id: 100, specialty_id: null } as FeeScheduleAssignmentRead,
      { id: 10, fee_schedule_id: 3, provider_id: "P1", office_id: null } as FeeScheduleAssignmentRead,
    ];
    const plan = planAssignments(
      [
        { provider_id: "P1", office_id: 100 },
        { provider_id: "P1", office_id: 100 },
        { provider_id: "P2", office_id: 100 },
      ],
      existing,
    );
    expect(plan).toHaveLength(2);
    expect(plan[0]?.existing?.id).toBe(9);
    expect(plan[1]?.existing).toBeNull();
  });
});

describe("latestEntryPerCode", () => {
  it("picks the entry in force on the date, else the earliest future one", () => {
    const m = latestEntryPerCode(
      [
        { procedure_code: "D1", effective_date: "2025-01-01" },
        { procedure_code: "D1", effective_date: "2026-01-01" },
        { procedure_code: "D1", effective_date: "2027-01-01" },
        { procedure_code: "D2", effective_date: "2028-01-01" },
        { procedure_code: "D2", effective_date: "2027-06-01" },
      ],
      "2026-10-10",
    );
    expect(m.get("D1")?.effective_date).toBe("2026-01-01");
    expect(m.get("D2")?.effective_date).toBe("2027-06-01");
  });
});
