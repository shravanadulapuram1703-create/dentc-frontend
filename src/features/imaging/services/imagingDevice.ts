import { env } from '@/shared/config/env';
import {
  DeviceUnavailableError,
  type DeviceLaunchInput,
  type DeviceScanInput,
  type DeviceScanResult,
  type DeviceStatusResult,
  type ImagingDevice,
} from '../types';

/**
 * Env-gated integration boundary for the local imaging-device bridge.
 *
 * This is the ONLY module that performs network calls outside the generated
 * backend client, and it talks EXCLUSIVELY to `env.imagingBridgeUrl` — never a
 * hardcoded host. When no bridge is configured (`imagingDeviceEnabled === false`)
 * every operation degrades gracefully: status is `unavailable` and scans reject
 * with `DeviceUnavailableError`. The workflow shape (status → start → poll →
 * retrieve bytes) mirrors the desktop-bridge prototype, but persistence is NOT
 * handled here: a completed scan returns a `File` that the caller funnels into
 * the same backend upload path as a manual upload.
 *
 * `runScan` prefers the agent's `/ws` push endpoint over polling `pollScan`
 * (see agent/README.md's "Websocket contract" section) and falls back to the
 * plain HTTP start/poll below whenever the socket isn't available, so this
 * works unchanged against every agent build already installed on clinic PCs,
 * not just ones updated to the websocket-capable version.
 */

const HEALTH_TIMEOUT_MS = 2000;
const POLL_INTERVAL_MS = 2000;
const SCAN_TIMEOUT_MS = 5 * 60 * 1000; // sensor positioning + exposure can take minutes
const WS_CONNECT_TIMEOUT_MS = 1500;

interface BridgeScanStatus {
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  image_path?: string;
  content_type?: string;
  error?: string;
}

interface BridgeStatusResponse {
  status?: string;
  version?: string;
  vendor?: string;
  /** EzDent-i / vendor software detected as running. */
  software_running?: boolean;
  /** Legacy prototype field name; accepted as a fallback. */
  vatech_running?: boolean;
}

const requireBridge = (): string => {
  if (!env.imagingDeviceEnabled || !env.imagingBridgeUrl) {
    throw new DeviceUnavailableError();
  }
  return env.imagingBridgeUrl;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const imagingDevice: ImagingDevice = {
  async checkStatus(): Promise<DeviceStatusResult> {
    if (!env.imagingDeviceEnabled || !env.imagingBridgeUrl) {
      return { status: 'unavailable', info: null };
    }
    try {
      const res = await fetch(`${env.imagingBridgeUrl}/status`, {
        signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      });
      // Reachable but unhealthy (e.g. 5xx) → distinct error state.
      if (!res.ok) return { status: 'error', info: null };
      const data = (await res.json().catch(() => ({}))) as BridgeStatusResponse;
      return {
        status: 'idle',
        info: {
          version: data.version ?? null,
          vendor: data.vendor ?? null,
          software_running: Boolean(data.software_running ?? data.vatech_running),
        },
      };
    } catch {
      // Connection refused / timed out → the agent isn't installed or running.
      // Surface as "unavailable" so the UI offers the first-time setup flow.
      return { status: 'unavailable', info: null };
    }
  },

  async launchSoftware(input: DeviceLaunchInput): Promise<void> {
    const base = requireBridge();
    const res = await fetch(`${base}/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || `Failed to launch imaging software (${res.status})`);
    }
  },

  async startScan(input: DeviceScanInput): Promise<{ scan_id: string }> {
    const base = requireBridge();
    const res = await fetch(`${base}/scan/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || `Failed to start scan (${res.status})`);
    }
    const data = (await res.json()) as { scan_id?: string };
    if (!data.scan_id) throw new Error('Bridge did not return a scan id');
    return { scan_id: data.scan_id };
  },

  async pollScan(scanId: string): Promise<DeviceScanResult> {
    const base = requireBridge();
    const deadline = Date.now() + SCAN_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      const res = await fetch(`${base}/scan/${scanId}/status`);
      if (!res.ok) continue;
      const data = (await res.json()) as BridgeScanStatus;
      if (data.status === 'failed') {
        throw new Error(data.error || 'Scan failed on the device');
      }
      if (data.status === 'completed' && data.image_path) {
        return retrieveScan(base, scanId, data);
      }
    }
    throw new Error('Scan timed out — no image received from the device');
  },

  async runScan(input: DeviceScanInput): Promise<DeviceScanResult> {
    const base = requireBridge();
    try {
      return await runScanViaSocket(base, input);
    } catch (err) {
      if (!(err instanceof WsUnavailableError)) throw err;
      // Socket never came up (older agent build, or something blocking ws://
      // on this workstation) — fall back to the polling path unchanged.
      const { scan_id } = await imagingDevice.startScan(input);
      return imagingDevice.pollScan(scan_id);
    }
  },
};

/** Thrown only when the `/ws` endpoint itself couldn't be used — never for a
 * real scan failure/timeout reported over an open socket. Callers use this
 * to decide whether to fall back to HTTP polling. */
class WsUnavailableError extends Error {}

const wsUrl = (base: string): string => `${base.replace(/^http/, 'ws')}/ws`;

interface BridgeWsMessage {
  type: string;
  scan_id?: string;
  image_path?: string;
  content_type?: string;
  error?: string;
  ok?: boolean;
}

/**
 * WS-first scan path: one socket carries `start_scan` → `scan_completed`/
 * `scan_failed`, so the browser learns about a capture the instant the
 * agent's own detector (folder watcher or Vatech REST poll) sees it, instead
 * of waiting up to `POLL_INTERVAL_MS` for the next poll tick. Image bytes are
 * still fetched with a plain `GET /scan/{id}/image` — the socket only
 * replaces finding out *when* they're ready.
 */
const runScanViaSocket = (base: string, input: DeviceScanInput): Promise<DeviceScanResult> =>
  new Promise((resolve, reject) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl(base));
    } catch {
      reject(new WsUnavailableError());
      return;
    }

    let settled = false;
    const connectTimer = setTimeout(() => finish(() => reject(new WsUnavailableError())), WS_CONNECT_TIMEOUT_MS);
    const scanTimer = setTimeout(
      () => finish(() => reject(new Error('Scan timed out — no image received from the device'))),
      SCAN_TIMEOUT_MS,
    );

    function finish(fn: () => void): void {
      if (settled) return;
      settled = true;
      clearTimeout(connectTimer);
      clearTimeout(scanTimer);
      try {
        ws.close();
      } catch {
        // already closing/closed
      }
      fn();
    }

    ws.onopen = () => {
      clearTimeout(connectTimer);
      // No frontend config carries a real agent token today (the HTTP routes
      // don't send `X-DentC-Agent-Token` either) — this mirrors that as-is.
      ws.send(JSON.stringify({ type: 'auth', token: '' }));
    };

    ws.onerror = () => finish(() => reject(new WsUnavailableError()));
    ws.onclose = () => finish(() => reject(new WsUnavailableError()));

    ws.onmessage = (event) => {
      let msg: BridgeWsMessage;
      try {
        msg = JSON.parse(event.data as string) as BridgeWsMessage;
      } catch {
        return;
      }
      switch (msg.type) {
        case 'auth_result':
          if (msg.ok) {
            ws.send(
              JSON.stringify({ type: 'start_scan', patient_id: input.patient_id, scan_type: input.scan_type }),
            );
          } else {
            finish(() => reject(new Error('Imaging agent rejected the connection token')));
          }
          break;
        case 'scan_failed':
          finish(() => reject(new Error(msg.error || 'Scan failed on the device')));
          break;
        case 'scan_completed':
          finish(() => {
            retrieveScan(base, msg.scan_id!, {
              status: 'completed',
              image_path: msg.image_path,
              content_type: msg.content_type,
            }).then(resolve, reject);
          });
          break;
        case 'error':
          finish(() => reject(new Error(msg.error || 'Imaging agent error')));
          break;
        default:
          break; // scan_started / status / pong — no action needed
      }
    };
  });

/** Download the captured bytes from the bridge and wrap them as a File. */
const retrieveScan = async (
  base: string,
  scanId: string,
  status: BridgeScanStatus,
): Promise<DeviceScanResult> => {
  const url = status.image_path!.startsWith('http')
    ? status.image_path!
    : `${base}${status.image_path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to retrieve captured image (${res.status})`);
  const blob = await res.blob();
  const contentType = status.content_type || blob.type || 'image/jpeg';
  const ext = contentType.split('/')[1] || 'jpg';
  const captured_at = new Date().toISOString();
  const file = new File([blob], `scan-${scanId}.${ext}`, { type: contentType });
  return { scan_id: scanId, file, content_type: contentType, captured_at };
};
