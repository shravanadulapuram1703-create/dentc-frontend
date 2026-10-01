// One captured signature, whichever device produced it.
//
// Field names are snake_case because most of them are written straight into
// backend bodies (`signature_data`, `device_source`, `signature_len`).
// Every field is persisted by the backend since it delivered the SigString +
// device columns (SIG-1..3, docs/signature/topaz_signature_backend_devreport.md).

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

/**
 * Body fragment shared by `PatientSignatureCreate`, `UserSignatureUpdate`,
 * `MedicalHistorySignRequest` and `ConsentSignRequest` — the backend delivered
 * the SigString + device columns (SIG-1..3) on all four, so everything the pad
 * reported is persisted. On-screen captures send nulls for the Topaz-only fields.
 */
export function signatureBodyFields(r: SignatureResult): {
  signature_data: string;
  signature_len: number;
  device_source: DeviceSource;
  signed_at: string;
  sig_string: string | null;
  sig_format: string | null;
  sig_compression: number | null;
  sig_encryption: number | null;
  point_count: number | null;
  stroke_count: number | null;
  device_vendor: string | null;
  device_model: string | null;
  device_serial: string | null;
  captured_user_agent: string | null;
} {
  const topaz = r.device_source === DEVICE_SOURCE.TOPAZ;
  return {
    signature_data: r.signature_data,
    signature_len: r.signature_data.length,
    device_source: r.device_source,
    signed_at: r.captured_at,
    sig_string: r.sig_string,
    // Clear text, lossless — see topazClient.startTopazCapture.
    sig_format: r.sig_string ? SIG_FORMAT_TOPAZ : null,
    sig_compression: r.sig_string ? 1 : null,
    sig_encryption: r.sig_string ? 0 : null,
    point_count: r.point_count,
    stroke_count: r.stroke_count,
    device_vendor: topaz ? "topaz" : null,
    device_model: r.device_model,
    device_serial: r.device_serial,
    captured_user_agent: typeof navigator === "undefined" ? null : navigator.userAgent.slice(0, 255),
  };
}

/** `sig_format` value for a Topaz SigString exported by SigPlusExtLite V3. */
export const SIG_FORMAT_TOPAZ = "topaz_sigstring_v1";

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
