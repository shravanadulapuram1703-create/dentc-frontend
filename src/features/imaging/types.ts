import type {
  PatientDocumentRead,
  ImageDetailRead,
} from '@/api/generated/model';

/**
 * One gallery entry: the stored binary (a patient document) plus the optional
 * imaging metadata row (tooth association / notes) joined to it by
 * `image_detail.tile_id === String(document.id)`. `detail` is absent until the
 * user associates teeth/notes with the image.
 */
export interface GalleryImage {
  document: PatientDocumentRead;
  detail?: ImageDetailRead;
}

// ---------------------------------------------------------------------------
// Device-scan integration boundary
// ---------------------------------------------------------------------------

/**
 * Lifecycle of the local imaging device (intra-oral sensor) bridge.
 * `unavailable` is the default state when no bridge URL is configured.
 */
export type DeviceScanStatus = 'unavailable' | 'idle' | 'scanning' | 'error';

/** Parameters the bridge needs to attribute a scan to the right patient. */
export interface DeviceScanInput {
  patient_id: number;
  /** Acquisition modality, e.g. `periapical`, `bitewing`. */
  scan_type: string;
}

/** Result of a completed acquisition: the captured bytes as a browser File. */
export interface DeviceScanResult {
  scan_id: string;
  file: File;
  content_type: string;
  captured_at: string;
}

/**
 * Contract the UI depends on. The concrete implementation (`imagingDevice`) is
 * env-gated and talks ONLY to the configured bridge URL — never hardcoded hosts.
 * This is the seam where a real hardware bridge plugs in later.
 */
export interface ImagingDevice {
  checkStatus(): Promise<DeviceScanStatus>;
  startScan(input: DeviceScanInput): Promise<{ scan_id: string }>;
  pollScan(scanId: string): Promise<DeviceScanResult>;
}

/** Thrown by device calls when no bridge is configured/reachable. */
export class DeviceUnavailableError extends Error {
  constructor(message = 'Imaging device is not available') {
    super(message);
    this.name = 'DeviceUnavailableError';
  }
}
