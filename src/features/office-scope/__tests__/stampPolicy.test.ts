import { describe, expect, it } from "vitest";
import { resolveStamp, STAMP } from "../stampPolicy";

const ctx = { working_office_id: 9, posting_office_id: 4, home_office_id: 1, record_office_id: 2 };

describe("resolveStamp", () => {
  it("routes each source to the right office", () => {
    expect(resolveStamp("appointment", ctx)).toBe(9);
    expect(resolveStamp("procedure", ctx)).toBe(4);
    expect(resolveStamp("patient_edit", ctx)).toBe(1);
    expect(resolveStamp("claim", ctx)).toBe(2);
    expect(resolveStamp("fee_schedule", ctx)).toBeNull();
  });

  it("posting falls back to home then working; record falls back to posting", () => {
    expect(resolveStamp("procedure", { working_office_id: 9, home_office_id: 1 })).toBe(1);
    expect(resolveStamp("procedure", { working_office_id: 9 })).toBe(9);
    expect(resolveStamp("claim", { working_office_id: 9, home_office_id: 1 })).toBe(1);
    expect(resolveStamp("patient_edit", { working_office_id: 9 })).toBeNull();
  });

  it("declares the record-first rules the ledger already relies on", () => {
    expect(STAMP.claim).toBe("record");
    expect(STAMP.eob_line).toBe("record");
    expect(STAMP.sms_existing_thread).toBe("record");
    expect(STAMP.sms_new_thread).toBe("working");
    expect(STAMP.payment_plan).toBe("home");
  });
});
