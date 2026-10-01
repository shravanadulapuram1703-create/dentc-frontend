import { describe, expect, it } from "vitest";
import {
  allOfficesParam,
  homeOfficeFilter,
  officeFilter,
  OfficeRequiredError,
  requireOfficeId,
} from "../officeParams";

describe("office params", () => {
  it("officeFilter never emits office_id: null (axios would drop it but the query key would differ)", () => {
    expect(officeFilter(4)).toEqual({ office_id: 4 });
    expect(officeFilter(null)).toEqual({});
    expect(officeFilter(undefined)).toEqual({});
    expect("office_id" in officeFilter(null)).toBe(false);
  });

  it("homeOfficeFilter uses the /patients param name", () => {
    expect(homeOfficeFilter(4)).toEqual({ home_office_id: 4 });
    expect(homeOfficeFilter(null)).toEqual({});
  });

  it("allOfficesParam is only emitted for deliberate all-office reads", () => {
    expect(allOfficesParam(true)).toEqual({ all_offices: true });
    expect(allOfficesParam(false)).toEqual({});
  });

  it("requireOfficeId throws a typed, readable error", () => {
    expect(requireOfficeId(4, "post a charge")).toBe(4);
    expect(() => requireOfficeId(null, "post a charge")).toThrow(OfficeRequiredError);
    expect(() => requireOfficeId(undefined, "register a patient")).toThrow("Select an office to register a patient.");
  });
});
