// Workstation-wide Topaz availability, shared by every SignatureCapture on the
// page. Detection round-trips through the native host, so the result is cached
// for a short while and re-probed on demand ("Re-check") or when a capture
// fails — not on every mount.

import { useCallback, useEffect, useState } from "react";
import { detectTopaz, type TopazAvailability } from "./topaz/topazClient";

const CACHE_TTL_MS = 30_000;

let cached: TopazAvailability | null = null;
let cached_at = 0;
let inflight: Promise<TopazAvailability> | null = null;
const listeners = new Set<(a: TopazAvailability) => void>();

function probe(force: boolean): Promise<TopazAvailability> {
  if (!force && cached && Date.now() - cached_at < CACHE_TTL_MS) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = detectTopaz()
    .then((a) => {
      cached = a;
      cached_at = Date.now();
      listeners.forEach((l) => l(a));
      return a;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Imperative access for non-React callers (services, tests). */
export function getTopazStatus(force = false): Promise<TopazAvailability> {
  return probe(force);
}

export interface TopazStatusHook {
  status: TopazAvailability | null;
  /** True until the first probe on this page resolves. */
  checking: boolean;
  /** Pad detected — the Topaz option is offered. */
  ready: boolean;
  recheck: () => Promise<TopazAvailability>;
}

export function useTopazStatus(enabled = true): TopazStatusHook {
  const [status, setStatus] = useState<TopazAvailability | null>(cached);
  const [checking, setChecking] = useState(enabled && !cached);

  useEffect(() => {
    if (!enabled) return;
    listeners.add(setStatus);
    let alive = true;
    probe(false).finally(() => {
      if (alive) setChecking(false);
    });
    return () => {
      alive = false;
      listeners.delete(setStatus);
    };
  }, [enabled]);

  const recheck = useCallback(async () => {
    setChecking(true);
    try {
      return await probe(true);
    } finally {
      setChecking(false);
    }
  }, []);

  return { status, checking, ready: status?.state === "ready", recheck };
}
