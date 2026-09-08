// SMS segment math (GSM-7 vs UCS-2), mirroring how Twilio bills a message.
//
//   GSM-7 : 160 chars single segment, 153 per segment when concatenated.
//   UCS-2 : 70 chars single segment, 67 per segment when concatenated.
//   Some GSM characters (€ ^ { } [ ] ~ \ |) cost two septets.

const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXTENDED = "^{}\\[~]|€";

export type SmsEncoding = "GSM-7" | "UCS-2";

export interface SmsSegmentInfo {
  encoding: SmsEncoding;
  /** Characters as the carrier counts them (extended GSM chars count twice). */
  length: number;
  segments: number;
  /** Characters left before another segment is needed. */
  remaining: number;
  /** Per-segment capacity for the current encoding/segment count. */
  per_segment: number;
}

export function isGsm7(text: string): boolean {
  for (const ch of text) {
    if (!GSM7_BASIC.includes(ch) && !GSM7_EXTENDED.includes(ch)) return false;
  }
  return true;
}

export function countSegments(text: string): SmsSegmentInfo {
  const gsm = isGsm7(text);
  const encoding: SmsEncoding = gsm ? "GSM-7" : "UCS-2";
  let length = 0;
  if (gsm) {
    for (const ch of text) length += GSM7_EXTENDED.includes(ch) ? 2 : 1;
  } else {
    // UCS-2 counts UTF-16 code units (astral emoji = 2).
    length = text.length;
  }
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  if (length === 0) {
    return { encoding, length, segments: 0, remaining: single, per_segment: single };
  }
  if (length <= single) {
    return { encoding, length, segments: 1, remaining: single - length, per_segment: single };
  }
  const segments = Math.ceil(length / multi);
  return {
    encoding,
    length,
    segments,
    remaining: segments * multi - length,
    per_segment: multi,
  };
}

/** Hard cap we enforce in the composer (Twilio rejects bodies over 1600 chars). */
export const SMS_MAX_CHARS = 1600;
