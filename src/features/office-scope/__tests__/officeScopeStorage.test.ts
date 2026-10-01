import { beforeEach, describe, expect, it } from "vitest";
import {
  clearTabOffice,
  getLastOffice,
  getTabOffice,
  LAST_OFFICE_PREFIX,
  officeScopeKeys,
  setLastOffice,
  setTabOffice,
} from "../officeScopeStorage";

/** Minimal Storage implementation so the tests run under node (no jsdom). */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => Array.from(map.keys())[i] ?? null,
    removeItem: (k) => {
      map.delete(k);
    },
    setItem: (k, v) => {
      map.set(k, String(v));
    },
  };
}

/** Mirrors clearAuthStorageKeepRemembered: preserve the listed keys across localStorage.clear(). */
function simulateAuthWipe(preservedKeys: string[]) {
  const preserved = new Map<string, string>();
  for (const key of preservedKeys) {
    const v = localStorage.getItem(key);
    if (v !== null) preserved.set(key, v);
  }
  localStorage.clear();
  for (const [k, v] of preserved) localStorage.setItem(k, v);
}

describe("officeScopeStorage", () => {
  beforeEach(() => {
    globalThis.localStorage = memoryStorage();
    globalThis.sessionStorage = memoryStorage();
  });

  it("keeps the last-used office per user", () => {
    setLastOffice("7", "OFF-4");
    setLastOffice("8", "OFF-9");
    expect(getLastOffice("7")).toBe("OFF-4");
    expect(getLastOffice("8")).toBe("OFF-9");
    expect(getLastOffice("9")).toBeNull();
    expect(getLastOffice(null)).toBeNull();
  });

  it("survives the logout/401 wipe when registered with the preserved keys", () => {
    setLastOffice("7", "OFF-4");
    localStorage.setItem("current_office", "OFF-4");
    localStorage.setItem("access_token", "t");
    simulateAuthWipe(officeScopeKeys());
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("current_office")).toBeNull();
    expect(getLastOffice("7")).toBe("OFF-4");
  });

  it("officeScopeKeys lists only last-office keys", () => {
    setLastOffice("7", "OFF-4");
    localStorage.setItem("dentc:last_patient:7", "{}");
    expect(officeScopeKeys()).toEqual([`${LAST_OFFICE_PREFIX}7`]);
  });

  it("tab office is separate from the last-used office and cleared on logout", () => {
    setTabOffice("7", "OFF-1");
    setLastOffice("7", "OFF-4");
    expect(getTabOffice("7")).toBe("OFF-1");
    clearTabOffice("7");
    expect(getTabOffice("7")).toBeNull();
    expect(getLastOffice("7")).toBe("OFF-4");
  });

  it("treats empty strings as absent", () => {
    setLastOffice("7", "");
    expect(getLastOffice("7")).toBeNull();
  });
});
