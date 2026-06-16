/**
 * Tooth associations persist in `image_detail.teeth` as a comma-separated string
 * of Universal Numbering System codes ("1".."32"). These helpers convert to and
 * from the string[] the UI works with.
 */

/** Universal Numbering System: permanent teeth 1–32, in arch order for the picker. */
export const UNS_TEETH: string[] = Array.from({ length: 32 }, (_, i) => String(i + 1));

/** Upper arch (patient's right → left): 1–16. Lower arch (left → right): 17–32. */
export const UPPER_ARCH: string[] = UNS_TEETH.slice(0, 16);
export const LOWER_ARCH: string[] = UNS_TEETH.slice(16);

export const parseTeeth = (teeth?: string | null): string[] => {
  if (!teeth) return [];
  return teeth
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
};

export const formatTeeth = (teeth: string[]): string =>
  Array.from(new Set(teeth.map((t) => t.trim()).filter(Boolean)))
    .sort((a, b) => Number(a) - Number(b))
    .join(',');
