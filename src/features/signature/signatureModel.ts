// One captured signature, whichever device produced it.
//
// Field names are snake_case because most of them are written straight into
// backend bodies (`signature_data`, `device_source`, `signature_len`). The
// backend currently persists only the image; `sig_string` and the device
// identity travel with the result so the callers can send them the day the
// backend grows the columns (gaps SIG-1..3 in
// docs/signature/topaz_signature_backend_devreport.md).

/** `patient_signatures.device_source` / `user.signature.device_source` values. */
export const DEVICE_SOURCE = {
  /** Topaz pad through SigPlusExtLite. */
  TOPAZ: "topaz",
  /** Mouse / stylus / touch on an HTML canvas. */
  WEB_PAD: "web-pad",
} as const;

export type DeviceSource = (typeof DEVICE_SOURCE)[keyof typeof DEVICE_SOURCE];

export interface SignatureResult {
  /** Image data URL — PNG from the on-screen pad, JPEG from Topaz. */
  signature_data: string;
  device_source: DeviceSource;
  /** Topaz SigString (vector strokes). `null` for on-screen captures. */
  sig_string: string | null;
  point_count: number | null;
  stroke_count: number | null;
  device_model: string | null;
  device_serial: string | null;
  /** ISO timestamp of the moment the capture was accepted on this workstation. */
  captured_at: string;
}

/** Body fragment shared by `PatientSignatureCreate` and `UserSignatureUpdate`. */
export function signatureBodyFields(r: SignatureResult): {
  signature_data: string;
  signature_len: number;
  device_source: DeviceSource;
} {
  return {
    signature_data: r.signature_data,
    signature_len: r.signature_data.length,
    device_source: r.device_source,
  };
}

/** Wrap a plain data URL (legacy callers, "Load my sig.") as a web-pad result. */
export function signatureFromDataUrl(
  data_url: string,
  device_source: DeviceSource = DEVICE_SOURCE.WEB_PAD,
): SignatureResult {
  return {
    signature_data: data_url,
    device_source,
    sig_string: null,
    point_count: null,
    stroke_count: null,
    device_model: null,
    device_serial: null,
    captured_at: new Date().toISOString(),
  };
}
