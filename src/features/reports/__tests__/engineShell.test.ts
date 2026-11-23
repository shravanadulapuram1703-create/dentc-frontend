import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { classifyCatalogError } from "../engine/engineState";
import { isChunkLoadError } from "../ReportsErrorBoundary";
import {
  ENGINE_OFF_REDIRECTS,
  ENGINE_ON_REDIRECTS,
  LEGACY_REPORT_ID_MAP,
  engineReportPath,
} from "../legacyRedirects";

function httpError(status: number, data: unknown): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError("request failed", "ERR_BAD_RESPONSE", { headers }, null, {
    status,
    statusText: String(status),
    data,
    headers: {},
    config: { headers },
  });
}

describe("engine state of the catalog probe (07 §2.3)", () => {
  it("treats the switched-off engine as off", () => {
    const e = httpError(404, { error: { code: "reports_engine_disabled", message: "x", details: null } });
    expect(classifyCatalogError(e)).toEqual({ state: "off", missing: [] });
  });

  it("treats a plain 404 (backend without the engine package) as off", () => {
    expect(classifyCatalogError(httpError(404, { detail: "Not Found" })).state).toBe("off");
  });

  it("maps 503 reports_engine_misconfigured with its missing list", () => {
    const e = httpError(503, {
      error: { code: "reports_engine_misconfigured", message: "x", details: { missing: ["GCS_BUCKET_REPORTS", 3] } },
    });
    expect(classifyCatalogError(e)).toEqual({ state: "misconfigured", missing: ["GCS_BUCKET_REPORTS"] });
  });

  it("treats other 5xx, other 503s and network errors as unknown", () => {
    expect(classifyCatalogError(httpError(500, {})).state).toBe("unknown");
    expect(classifyCatalogError(httpError(503, { error: { code: "maintenance" } })).state).toBe("unknown");
    expect(classifyCatalogError(new AxiosError("Network Error", "ERR_NETWORK")).state).toBe("unknown");
    expect(classifyCatalogError(new Error("boom")).state).toBe("unknown");
  });
});

describe("legacy report redirects (07 §2.2)", () => {
  it("maps the six old runner ids and sends unknown ids home", () => {
    expect(Object.keys(LEGACY_REPORT_ID_MAP)).toHaveLength(6);
    expect(engineReportPath("production")).toBe("/reports/r/daily.production_report");
    expect(engineReportPath("nope")).toBe("/reports");
    expect(engineReportPath(undefined)).toBe("/reports");
  });

  it("has unique sources and absolute targets inside the module", () => {
    for (const table of [ENGINE_ON_REDIRECTS, ENGINE_OFF_REDIRECTS]) {
      const froms = table.map((r) => r.from);
      expect(new Set(froms).size).toBe(froms.length);
      for (const r of table) {
        expect(r.from.startsWith("/")).toBe(false);
        expect(r.to.startsWith("/reports")).toBe(true);
      }
    }
  });

  it("keeps today's nav targets working while the engine is off", () => {
    const off = Object.fromEntries(ENGINE_OFF_REDIRECTS.map((r) => [r.from, r.to]));
    expect(off["ledger"]).toBe("/reports/run/production");
    expect(off["lists/patient-list"]).toBe("/reports/run/patient-list");
  });
});

describe("stale-deploy detection", () => {
  it("recognises failed dynamic imports across browsers", () => {
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: /assets/routes-abc.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new Error("error loading dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
  });
});
