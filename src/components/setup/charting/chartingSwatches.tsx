// ============================================================================
// Charting setup — swatch render components (Sample column / live previews).
// Catalogs + helpers live in chartingAssets.ts.
// ============================================================================

// A colour swatch = a box filled with `fill` and bordered with `stroke` (the
// legacy "Sample" column / live preview). Either may be null → neutral box.
export function ColorSwatch({
  stroke,
  fill,
  size = 22,
}: {
  stroke?: string | null;
  fill?: string | null;
  size?: number;
}) {
  return (
    <span
      className="inline-block rounded-sm align-middle"
      style={{
        width: size * 1.6,
        height: size,
        backgroundColor: fill || "transparent",
        border: `2px solid ${stroke || "#CBD5E1"}`,
      }}
      title={`stroke: ${stroke ?? "—"} · fill: ${fill ?? "—"}`}
    />
  );
}

// Draw a pattern directly inside a 40×22 viewBox (no <pattern>/<defs>, so there
// are no SVG id collisions when many swatches share a page).
function patternShapes(key: string, color: string) {
  const c = color || "#1E293B";
  const line = (x1: number, y1: number, x2: number, y2: number, i: number) => (
    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={1.4} />
  );
  switch (key) {
    case "hash": // diagonal /
      return [-20, -10, 0, 10, 20, 30].map((o, i) => line(o, 22, o + 22, 0, i));
    case "r5hash": // dense diagonal /
      return [-24, -16, -8, 0, 8, 16, 24, 32].map((o, i) => line(o, 22, o + 22, 0, i));
    case "r4hash": // diagonal \
      return [-20, -10, 0, 10, 20, 30].map((o, i) => line(o, 0, o + 22, 22, i));
    case "crosshatch": // both diagonals
      return [
        ...[-20, -8, 4, 16, 28].map((o, i) => line(o, 22, o + 22, 0, i)),
        ...[-20, -8, 4, 16, 28].map((o, i) => line(o, 0, o + 22, 22, i + 100)),
      ];
    case "r2hash": // vertical
      return [4, 12, 20, 28, 36].map((x, i) => line(x, 1, x, 21, i));
    case "r6hash": // dense vertical
      return [2, 7, 12, 17, 22, 27, 32, 37].map((x, i) => line(x, 1, x, 21, i));
    case "r3hash": // horizontal
      return [4, 9, 14, 19].map((y, i) => line(2, y, 38, y, i));
    case "round": // dots
      return [
        [8, 7],
        [20, 7],
        [32, 7],
        [8, 15],
        [20, 15],
        [32, 15],
      ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2} fill={c} />);
    case "round1": // dense dots
      return [6, 14, 22, 30, 38].flatMap((x, xi) =>
        [6, 12, 18].map((y, yi) => <circle key={`${xi}-${yi}`} cx={x} cy={y} r={1.5} fill={c} />),
      );
    case "sealant":
    case "veneer":
      return (
        <text
          x="20"
          y="16"
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill={c}
          fontFamily="serif"
          letterSpacing="2"
        >
          {key === "sealant" ? "s s s" : "v v v"}
        </text>
      );
    default:
      return (
        <text x="20" y="15" textAnchor="middle" fontSize="9" fill={c}>
          ?
        </text>
      );
  }
}

export function PatternSwatch({
  pattern,
  color,
  width = 48,
  height = 22,
}: {
  pattern?: string | null;
  color?: string | null;
  width?: number;
  height?: number;
}) {
  if (!pattern) {
    return <span className="text-[#94A3B8] text-xs">—</span>;
  }
  return (
    <svg
      viewBox="0 0 40 22"
      width={width}
      height={height}
      className="inline-block align-middle rounded-sm border border-[#E2E8F0] bg-white"
      preserveAspectRatio="none"
      role="img"
      aria-label={`${pattern} pattern`}
    >
      {patternShapes(pattern, color || "#1E7F5C")}
    </svg>
  );
}
