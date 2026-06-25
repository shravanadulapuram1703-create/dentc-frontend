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
 */

const HEALTH_TIMEOUT_MS = 2000;
const POLL_INTERVAL_MS = 2000;
const SCAN_TIMEOUT_MS = 5 * 60 * 1000; // sensor positioning + exposure can take minutes

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
};

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
