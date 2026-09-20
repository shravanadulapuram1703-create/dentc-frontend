import { describe, expect, it } from "vitest";
import { officeKey, officeKeyToId } from "@/services/officeLookup";

describe("officeKeyToId", () => {
  it("parses every key shape the app has used", () => {
    expect(officeKeyToId("OFF-1")).toBe(1);
    expect(officeKeyToId("OFF-108")).toBe(108);
    expect(officeKeyToId("1")).toBe(1);
    expect(officeKeyToId("office-108")).toBe(108);
    expect(officeKeyToId("O-3")).toBe(3);
    expect(officeKeyToId("Excel Dental - Moon [108]")).toBe(108);
    expect(officeKeyToId("Office 2 [5]")).toBe(5);
  });

  it("accepts numeric input (createAppointment / staffBooking pass numbers)", () => {
    expect(officeKeyToId(4)).toBe(4);
    expect(officeKeyToId(Number.NaN)).toBeUndefined();
  });

  it("returns undefined for empty / unparseable input", () => {
    expect(officeKeyToId("")).toBeUndefined();
    expect(officeKeyToId("   ")).toBeUndefined();
    expect(officeKeyToId(null)).toBeUndefined();
    expect(officeKeyToId(undefined)).toBeUndefined();
    expect(officeKeyToId("OFF-")).toBeUndefined();
    expect(officeKeyToId("N/A")).toBeUndefined();
  });

  it("round-trips through officeKey", () => {
    expect(officeKeyToId(officeKey(42))).toBe(42);
    expect(officeKey(7)).toBe("OFF-7");
  });
});
