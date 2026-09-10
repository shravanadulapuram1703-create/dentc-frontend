// Topaz SigPlusExtLite V3 — browser-side type surface.
//
// The extension (Chrome / Edge / Firefox / Opera, Windows only) injects a
// `SigPlusExtLiteWrapperURL` attribute on <html>; loading that script defines a
// global `Topaz` object whose methods are ALL async (they round-trip through the
// extension to the Native Messaging Host and the USB pad). Only the subset this
// app uses is declared here — see docs/signature/ for the integration guide
// references (SigPlusExtLite_V3.pdf, "Canvas → Sign" and "Global" objects).
//
// Nothing here talks to the DentC backend; the field names are Topaz's own.

export interface TopazGlobalApi {
  Connect(): Promise<number>;
  Disconnect(): Promise<number>;
  GetSigPlusExtLiteVersion(): Promise<string | null>;
  GetSigPlusExtLiteNMHVersion(): Promise<string | null>;
  GetSigPlusActiveXVersion(): Promise<string | null>;
  /** 0 none, 1 pad, 2 GemView; -1 error, -2 not installed, -3 no drivers, -4 old SigPlus. */
  GetDeviceStatus(): Promise<number>;
  GetLastError(): Promise<string>;
}

export interface TopazCanvasSignApi {
  SetTabletState(state: 0 | 1): Promise<void>;
  GetTabletState(): Promise<number>;
  StartSign(canvas: HTMLCanvasElement): Promise<void>;
  StopSign(): Promise<void>;
  ClearSign(): Promise<void>;
  GetTotalPoints(): Promise<number>;
  GetNumberOfStrokes(): Promise<number>;
  /** Base64 JPEG (no data: prefix); empty string when nothing was signed. */
  GetSignatureImage(): Promise<string>;
  /** Topaz SigString (vector stroke data); empty when nothing was signed. */
  GetSigString(): Promise<string>;
  SetSigString(
    sig_string: string,
    encryption_mode: number,
    encryption_key: string,
    sig_compression_mode: number,
  ): Promise<void>;
  SetSigStringFormat(
    encryption_mode: number,
    encryption_key: string,
    sig_compression_mode: number,
  ): Promise<number>;
  SetEncryptionMode(mode: number): Promise<void>;
  SetSigCompressionMode(mode: number): Promise<void>;
  SetImageWidth(width: number): Promise<void>;
  SetImageHeight(height: number): Promise<void>;
  SetImagePenWidth(width: number): Promise<void>;
  SetDisplayPenWidth(width: number): Promise<void>;
  SetJustifyMode(mode: number): Promise<void>;
  GetTabletModelNumber(): Promise<number>;
  GetTabletSerialNumber(): Promise<number>;
  SetTabletLogicalXSize(x: number): Promise<void>;
  SetTabletLogicalYSize(y: number): Promise<void>;
}

export interface TopazApi {
  Global: TopazGlobalApi;
  Canvas: { Sign: TopazCanvasSignApi };
}

declare global {
  interface Window {
    Topaz?: TopazApi;
  }
}

/** Return codes of `Topaz.Global.GetDeviceStatus()`. */
export const TOPAZ_DEVICE_STATUS = {
  NO_DEVICE: 0,
  SIGNATURE_PAD: 1,
  GEMVIEW: 2,
  ERROR: -1,
  NOT_INSTALLED: -2,
  NO_DRIVERS: -3,
  OLD_SIGPLUS: -4,
} as const;

/** `GetTabletModelNumber()` → human label (integration guide p.19). */
export const TOPAZ_MODEL_LABELS: Record<number, string> = {
  1: "T-L(BK)766",
  8: "T-L(BK)755 / T-L(BK)750",
  11: "T-L(BK)462",
  12: "T-L(BK)462",
  15: "T-L(BK)460",
  43: "T-LBK43LC",
  57: "T-LBK57GC",
  58: "Topaz SE series",
};

/** For model 58 the serial number identifies the SE model. */
export const TOPAZ_SE_SERIAL_LABELS: Record<number, string> = {
  550: "T-LBK766SE",
  551: "T-LBK462SE",
  553: "T-LBK755SE / T-LBK750SE",
  557: "T-LBK755SE / T-LBK750SE",
};

export function topazModelLabel(model: number | null, serial: number | null): string | null {
  if (model == null || model < 0) return null;
  if (model === 58 && serial != null && TOPAZ_SE_SERIAL_LABELS[serial]) {
    return TOPAZ_SE_SERIAL_LABELS[serial];
  }
  return TOPAZ_MODEL_LABELS[model] ?? `Topaz model ${model}`;
}
