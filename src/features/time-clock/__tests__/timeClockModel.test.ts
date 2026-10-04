import { describe, expect, it } from "vitest";
import {
  buildReport,
  dayKey,
  entryHours,
  entryTimeZone,
  hoursForPayload,
  isActiveShift,
  isoToWallTime,
  overtimeRuleFromMethod,
  OVERTIME_RULES,
  periodRange,
  splitOvertime,
  summaryCsv,
  wallTimeToIso,
  weekStart,
  type TimeClockEntry,
} from "../timeClockModel";

const entry = (over: Partial<TimeClockEntry>): TimeClockEntry => ({
  id: 1,
  tenant_id: 1,
  user_id: 10,
  office_id: 1,
  legacy_id: null,
  clock_in: "2026-09-28T13:00:00Z",
  clock_out: "2026-09-28T21:30:00Z",
  total_hours: null,
  created_at: "2026-09-28T13:00:00Z",
  ...over,
});

const zones = (id: number) => (id === 1 ? "America/New_York" : id === 2 ? "America/Chicago" : null);

describe("hours", () => {
  it("computes decimal hours from the punch pair", () => {
    expect(entryHours(entry({}))).toBe(8.5);
    expect(entryHours(entry({ clock_out: null }))).toBeNull();
    expect(hoursForPayload("2026-09-28T13:00:00Z", "2026-09-28T20:25:00Z")).toBe("7.42");
  });

  it("reads naive server timestamps as UTC", () => {
    expect(entryHours(entry({ clock_in: "2026-09-28T13:00:00", clock_out: "2026-09-28T14:00:00Z" }))).toBe(1);
  });
});

describe("zones", () => {
  it("renders legacy rows as their stored wall clock and new rows in the office zone", () => {
    expect(entryTimeZone(entry({ legacy_id: "4341192" }), zones)).toBe("UTC");
    expect(entryTimeZone(entry({ office_id: 2 }), zones)).toBe("America/Chicago");
    expect(entryTimeZone(entry({ office_id: null }), zones)).toBe("America/New_York");
  });

  it("buckets late-evening punches on the local day", () => {
    // 02:00Z on the 29th is 22:00 on the 28th in New York.
    expect(dayKey(new Date("2026-09-29T02:00:00Z"), "America/New_York")).toBe("2026-09-28");
  });

  it("round-trips wall clock ⇄ instant, including legacy wall clock", () => {
    const iso = wallTimeToIso("2026-09-28", "09:15", "America/Chicago");
    expect(iso).toBe("2026-09-28T14:15:00.000Z");
    expect(isoToWallTime(new Date(iso), "America/Chicago")).toEqual({ day: "2026-09-28", time: "09:15" });
    expect(wallTimeToIso("2023-12-08", "09:25", "UTC")).toBe("2023-12-08T09:25:00.000Z");
    // Winter (CST, UTC-6)
    expect(wallTimeToIso("2026-01-15", "09:00", "America/Chicago")).toBe("2026-01-15T15:00:00.000Z");
  });
});

describe("active shift", () => {
  const now = new Date("2026-09-28T18:00:00Z");
  it("treats a recent open punch as running and an old one as a forgotten clock-out", () => {
    expect(isActiveShift(entry({ clock_out: null, clock_in: "2026-09-28T13:00:00Z" }), now)).toBe(true);
    expect(isActiveShift(entry({ clock_out: null, clock_in: "2026-09-26T13:00:00Z" }), now)).toBe(false);
    expect(isActiveShift(entry({ clock_out: null, legacy_id: "1" }), now)).toBe(false);
  });
});

describe("weeks & periods", () => {
  it("starts payroll weeks on Sunday", () => {
    expect(weekStart("2026-10-03")).toBe("2026-09-27"); // Saturday → Sunday before
    expect(weekStart("2026-09-27")).toBe("2026-09-27");
  });

  it("resolves presets", () => {
    expect(periodRange("this_week", "2026-10-01")).toEqual({ from: "2026-09-27", to: "2026-10-03" });
    expect(periodRange("last_week", "2026-10-01")).toEqual({ from: "2026-09-20", to: "2026-09-26" });
    expect(periodRange("this_month", "2026-02-10")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(periodRange("last_month", "2026-03-10")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });
});

describe("overtime", () => {
  const week = ["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"].map((day) => ({
    day,
    hours: 9,
  }));

  it("applies the weekly threshold after 40 regular hours", () => {
    const split = splitOvertime(week, OVERTIME_RULES.weekly_40.rule);
    expect(split.reduce((s, d) => s + d.regular, 0)).toBe(40);
    expect(split.reduce((s, d) => s + d.overtime, 0)).toBe(14);
  });

  it("never double-counts daily and weekly overtime", () => {
    const split = splitOvertime(week, OVERTIME_RULES.daily_8_weekly_40.rule);
    // 6 days × 1 h daily OT, then 6 × 8 = 48 regular → 8 more weekly OT.
    expect(split.reduce((s, d) => s + d.overtime, 0)).toBe(14);
    expect(split.reduce((s, d) => s + d.regular, 0)).toBe(40);
  });

  it("maps free-text overtime methods", () => {
    expect(overtimeRuleFromMethod(null)).toBe("weekly_40");
    expect(overtimeRuleFromMethod("Daily")).toBe("daily_8");
    expect(overtimeRuleFromMethod("Daily and Weekly")).toBe("daily_8_weekly_40");
    expect(overtimeRuleFromMethod("None")).toBe("none");
  });
});

describe("buildReport", () => {
  const now = new Date("2026-10-02T15:00:00Z");
  const entries = [
    entry({ id: 1 }),
    entry({ id: 2, clock_in: "2026-09-28T22:00:00Z", clock_out: "2026-09-29T00:00:00Z" }), // same local day, 2 h
    entry({ id: 3, clock_in: "2026-09-29T13:00:00Z", clock_out: null }), // forgotten clock-out
    entry({ id: 4, clock_in: "2026-09-30T15:00:00Z", clock_out: "2026-09-30T14:00:00Z" }), // reversed
    entry({ id: 5, clock_in: "2026-10-02T13:00:00Z", clock_out: null }), // running
    entry({ id: 6, user_id: 11, clock_in: "2026-09-20T13:00:00Z" }), // out of range
  ];
  const report = buildReport(entries, {
    from: "2026-09-27",
    to: "2026-10-03",
    zoneForOffice: zones,
    resolveUserName: (id) => `User ${id}`,
    rule: OVERTIME_RULES.weekly_40.rule,
    now,
  });

  it("groups by user and local day, trims to the range", () => {
    expect(report).toHaveLength(1);
    const u = report[0]!;
    expect(u.days.map((d) => d.day)).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-02"]);
    expect(u.days[0]!.hours).toBe(10.5);
    expect(u.total_hours).toBe(10.5);
  });

  it("flags issues and keeps the running shift out of the totals", () => {
    const u = report[0]!;
    expect(u.issue_count).toBe(2);
    expect(u.active_row?.entry.id).toBe(5);
    expect(u.active_row?.live_hours).toBe(2);
  });

  it("exports CSV with a BOM", () => {
    const csv = summaryCsv(report);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("User 10,10,4,5,10.50,0.00,10.50,2");
  });
});
