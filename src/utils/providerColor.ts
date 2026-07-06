/**
 * Provider-specific appointment colors.
 *
 * Each provider gets a unique, stable color used to tint their appointment
 * blocks and operatory-column accents on the scheduler, plus a legend. Colors
 * are assigned by the provider's position in a stable (id-sorted) list built
 * from the FULL master provider list — NOT the in-view subset — so a given
 * provider always renders the same color regardless of which day is showing.
 */
export interface ProviderColor {
  /** Light block background. */
  bg: string;
  /** Saturated border / legend swatch / column accent. */
  border: string;
  /** Readable foreground on `bg`. */
  text: string;
}

/** 16 visually distinct hues (light bg + saturated accent + dark text). */
const PALETTE: ProviderColor[] = [
  { bg: "#DBEAFE", border: "#3B82F6", text: "#1E40AF" }, // blue
  { bg: "#DCFCE7", border: "#22C55E", text: "#166534" }, // green
  { bg: "#FEF9C3", border: "#EAB308", text: "#854D0E" }, // yellow
  { bg: "#FCE7F3", border: "#EC4899", text: "#9D174D" }, // pink
  { bg: "#EDE9FE", border: "#8B5CF6", text: "#5B21B6" }, // violet
  { bg: "#FFEDD5", border: "#F97316", text: "#9A3412" }, // orange
  { bg: "#CCFBF1", border: "#14B8A6", text: "#115E59" }, // teal
  { bg: "#E0E7FF", border: "#6366F1", text: "#3730A3" }, // indigo
  { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B" }, // red
  { bg: "#CFFAFE", border: "#06B6D4", text: "#155E75" }, // cyan
  { bg: "#FAE8FF", border: "#D946EF", text: "#86198F" }, // fuchsia
  { bg: "#ECFCCB", border: "#84CC16", text: "#3F6212" }, // lime
  { bg: "#FFE4E6", border: "#F43F5E", text: "#9F1239" }, // rose
  { bg: "#D1FAE5", border: "#10B981", text: "#065F46" }, // emerald
  { bg: "#E0F2FE", border: "#0EA5E9", text: "#075985" }, // sky
  { bg: "#E7E5E4", border: "#78716C", text: "#44403C" }, // stone
];

/** Fallback color for appointments with no resolvable provider. */
export const DEFAULT_PROVIDER_COLOR: ProviderColor = {
  bg: "#E2E8F0",
  border: "#94A3B8",
  text: "#334155",
};

/**
 * Build a stable provider_id -> color map from the master provider ids. Sorting
 * by id makes the assignment deterministic across renders and sessions.
 */
export const buildProviderColorMap = (
  providerIds: Array<string | null | undefined>,
): Map<string, ProviderColor> => {
  const unique = [
    ...new Set(providerIds.filter((id): id is string => !!id)),
  ].sort();
  const map = new Map<string, ProviderColor>();
  unique.forEach((id, i) => map.set(id, PALETTE[i % PALETTE.length]!));
  return map;
};

export const providerColorFor = (
  providerId: string | null | undefined,
  map: Map<string, ProviderColor>,
): ProviderColor =>
  (providerId != null && map.get(providerId)) || DEFAULT_PROVIDER_COLOR;

/** Parse a "#rgb" / "#rrggbb" hex into [r,g,b], or null if unparseable. */
const parseHex = (hex: string): [number, number, number] | null => {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

/**
 * Build a ProviderColor from the hex a provider set on the Provider Setup screen
 * (scheduler_color). The block gets a light tint of that hex with the hex as the
 * border; text is chosen for contrast. Returns null for an empty/invalid hex so
 * the caller can fall back to the generated palette.
 */
export const colorFromHex = (
  hex: string | null | undefined,
): ProviderColor | null => {
  if (!hex) return null;
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  const border = `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  // Perceived luminance → readable text over the light tint.
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.16)`,
    border,
    text: lum > 0.6 ? "#334155" : border,
  };
};

/**
 * Resolve each provider's scheduler color: prefer the hex set in Provider Setup,
 * otherwise fall back to a stable palette color. `providers` is the master list.
 */
export const buildProviderColorMapFromSetup = (
  providers: Array<{ id: string; scheduler_color?: string | null }>,
): Map<string, ProviderColor> => {
  const palette = buildProviderColorMap(providers.map((p) => p.id));
  const map = new Map<string, ProviderColor>();
  providers.forEach((p) => {
    map.set(p.id, colorFromHex(p.scheduler_color) ?? palette.get(p.id) ?? DEFAULT_PROVIDER_COLOR);
  });
  return map;
};
