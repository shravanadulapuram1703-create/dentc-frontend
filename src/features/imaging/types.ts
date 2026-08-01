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
// DICOM archive (migrated Apteryx PACS → GCS + Postgres)
//
// The response/param shapes come straight from the generated Orval client
// (`Imaging` tag) so the frontend mirrors the backend exactly. We re-export them
// here under the names the imaging components already use, and add the one
// frontend-only helper (`DicomImage`) plus a filters alias.
// See `docs/imaging/DICOM_IMAGING_API_CONTRACT.md`.
// ---------------------------------------------------------------------------

export type {
  InstanceAssets,
  DicomInstanceOut,
  DicomSeriesOut,
  DicomStudyOut,
  PatientImagingResponse,
  PatientImagingSummary,
} from '@/api/generated/model';

import type {
  DicomInstanceOut,
  DicomSeriesOut,
  DicomStudyOut,
  GetPatientImagingParams,
} from '@/api/generated/model';

/** Server-side filters for `GET /patients/{id}/imaging` (contract §3.1). */
export type DicomImagingFilters = GetPatientImagingParams;

/**
 * A single DICOM instance flattened out of the study/series tree, carrying back-
 * references to its parents so the gallery tile and viewer can show study/series
 * context without re-walking the tree.
 */
export interface DicomImage {
  instance: DicomInstanceOut;
  series: DicomSeriesOut;
  study: DicomStudyOut;
}

// ---------------------------------------------------------------------------
// Device-scan integration boundary
// ---------------------------------------------------------------------------

/**
 * Lifecycle of the local imaging device (intra-oral sensor) bridge.
 * - `detecting`   — probing the agent on mount (transient).
 * - `unavailable` — agent not installed/running (connection refused) → show setup.
 * - `idle`        — agent reachable and ready.
 * - `scanning`    — a capture is in progress.
 * - `error`       — agent reachable but returned an error.
 */
export type DeviceScanStatus =
  | 'detecting'
  | 'unavailable'
  | 'idle'
  | 'scanning'
  | 'error';

/**
 * Agent capability info from `GET /status`. Lets the UI surface the agent
 * version (for update prompts) and whether the vendor software (EzDent-i) is
 * actually running so the dentist knows before launching a scan.
 */
export interface DeviceInfo {
  /** Agent semantic version, for update prompts. */
  version: string | null;
  /** Imaging vendor this agent drives, e.g. `vatech`. */
  vendor: string | null;
  /** True when the vendor capture software (EzDent-i) is detected as running. */
  software_running: boolean;
}

/** Result of probing the agent: connection state + capability info when reachable. */
export interface DeviceStatusResult {
  status: Extract<DeviceScanStatus, 'unavailable' | 'idle' | 'error'>;
  info: DeviceInfo | null;
}

/**
 * Deep-link the vendor software to the right patient before capture (the
 * "Open in Vatech" action — mirrors EzDent-i's `VTEzBridge /main:chart_no`).
 */
export interface DeviceLaunchInput {
  patient_id: number;
  first_name?: string;
  last_name?: string;
  dob?: string;
}

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
  checkStatus(): Promise<DeviceStatusResult>;
  launchSoftware(input: DeviceLaunchInput): Promise<void>;
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
