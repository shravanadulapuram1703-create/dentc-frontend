import { describe, expect, it } from "vitest";
import { partitionByOffice, scopeToOffice } from "@/services/providerDirectory";

const directory = [
  { id: "PRV-1", office_id: 1 },
  { id: "PRV-2", office_id: 1 },
  { id: "PRV-4", office_id: 4 },
  { id: "PRV-9", office_id: 9 },
];

describe("partitionByOffice (prefer, never exclude)", () => {
  it("puts the roster (assignment join ∪ home office) first and keeps everyone else", () => {
    const { in_office, others } = partitionByOffice(directory, 4, ["PRV-9"]);
    expect(in_office.map((p) => p.id)).toEqual(["PRV-4", "PRV-9"]);
    expect(others.map((p) => p.id)).toEqual(["PRV-1", "PRV-2"]);
  });

  it("keeps the other providers on a one-row roster (office 4 in the live tenant)", () => {
    const { in_office, others } = partitionByOffice(directory, 4, null);
    expect(in_office).toHaveLength(1);
    expect(others).toHaveLength(3);
  });

  it("returns everything as others when no office is given", () => {
    const { in_office, others } = partitionByOffice(directory, null, null);
    expect(in_office).toEqual([]);
    expect(others).toHaveLength(4);
  });

  it("scopeToOffice still falls back to the whole directory only when the roster is empty", () => {
    expect(scopeToOffice(directory, 10, null)).toHaveLength(4);
    expect(scopeToOffice(directory, 4, null)).toHaveLength(1);
  });
});
