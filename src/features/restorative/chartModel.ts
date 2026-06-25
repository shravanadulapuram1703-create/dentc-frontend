import type { ChartConditionCreate, ChartConditionRead } from '@/api/generated/model';
import type { SurfaceKey } from './toothLayout';
import type { ToothArea } from './types';
import { lookupCondition } from './conditionTaxonomy';
import type { RestorationTemplate } from './restorationTemplates';
import { SOURCE_COLOR, type ChartSource } from './txPlanModel';

// Adapter between our row-per-condition persistence (chart_conditions) and the
// rich per-tooth view-model the UI wants. ALL interim encodings live here so the
// switch to first-class REST-* columns (group_id, grade, chart_settings,
// chart_tooth_notes) is a single-file change.

export interface ToothGlyph {
  /** Source chart_condition id (for edit/delete of e.g. a Watch arrow). */
  id?: number;
  /** Source chart_condition notes. */
  note?: string | null;
  area: ToothArea;
  code: string;
  color: string;
  drawable: boolean;
  material_id?: number | null;
  pattern?: string | null;
  grade?: string | null;
  group_id?: string | null;
  /** Whole-tooth subtype: unerupted | deciduous | supernumerary | permanent. */
  sub?: string | null;
  /** Specific root label this glyph applies to (undefined = all roots / n/a). */
  root?: string | null;
  /** Watch arrow placement (% of the figure box) + compass direction. */
  watch?: { dir: string; x: number; y: number } | null;
}

// All qualifiers we pack into chart_conditions.region until REST-1/REST-7 add columns.
export interface RegionQualifiers {
  group_id?: string | null;
  grade?: string | null;
  /** tooth_status subtype for whole-tooth Missing/Impacted/Erupted. */
  sub?: string | null;
  /** root scope: all | single. */
  roots?: string | null;
  /** root-canal fill: gutta | other | unknown. */
  rctfill?: string | null;
  /** watch arrow direction (n/ne/e/.../nw). */
  dir?: string | null;
  /** watch arrow anchor, percent of the figure box. */
  wx?: number | null;
  wy?: number | null;
  /** specific root label (anatomical) a root-area condition applies to. */
  root?: string | null;
}

export interface ToothState {
  surfaces: Set<SurfaceKey>;
  /** Per-surface charted condition (code + source colour) → drives the wedge pattern. */
  surfaceGlyphs: Map<SurfaceKey, { code: string; color: string }>;
  glyphs: ToothGlyph[];
  missing: boolean;
  note?: string;
  groups: Set<string>;
}

// ---- Interim region encoding (REST-1/REST-7: replace with first-class columns) -
const SEP = ';';
export function encodeRegion(opts: RegionQualifiers): string | null {
  const parts: string[] = [];
  if (opts.group_id) parts.push(`g=${opts.group_id}`);
  if (opts.grade) parts.push(`grade=${opts.grade}`);
  if (opts.sub) parts.push(`sub=${opts.sub}`);
  if (opts.roots) parts.push(`roots=${opts.roots}`);
  if (opts.rctfill) parts.push(`rctfill=${opts.rctfill}`);
  if (opts.dir) parts.push(`dir=${opts.dir}`);
  if (opts.wx != null) parts.push(`wx=${Math.round(opts.wx)}`);
  if (opts.wy != null) parts.push(`wy=${Math.round(opts.wy)}`);
  if (opts.root) parts.push(`root=${opts.root}`);
  return parts.length ? parts.join(SEP) : null;
}
export function decodeRegion(region: string | null | undefined): RegionQualifiers {
  if (!region) return {};
  const out: RegionQualifiers = {};
  for (const part of region.split(SEP)) {
    const [k, v] = part.split('=');
    if (!v) continue;
    if (k === 'g') out.group_id = v;
    else if (k === 'grade') out.grade = v;
    else if (k === 'sub') out.sub = v;
    else if (k === 'roots') out.roots = v;
    else if (k === 'rctfill') out.rctfill = v;
    else if (k === 'dir') out.dir = v;
    else if (k === 'wx') out.wx = Number(v);
    else if (k === 'wy') out.wy = Number(v);
    else if (k === 'root') out.root = v;
  }
  return out;
}

export interface MaterialMeta {
  color?: string | null;
  pattern?: string | null;
}

/** Project active chart_conditions into a per-tooth (Universal number) view-model. */
export function toToothStates(
  conditions: ChartConditionRead[],
  resolveMaterial?: (id: number | null | undefined) => MaterialMeta | undefined,
): Map<string, ToothState> {
  const map = new Map<string, ToothState>();
  const get = (t: string): ToothState => {
    let s = map.get(t);
    if (!s) {
      s = { surfaces: new Set<SurfaceKey>(), surfaceGlyphs: new Map(), glyphs: [], missing: false, groups: new Set<string>() };
      map.set(t, s);
    }
    return s;
  };

  for (const c of conditions) {
    if (c.is_inactive) continue;
    const t = c.tooth;
    if (!t) continue;
    const st = get(t);
    const code = (c.condition_code ?? '').toUpperCase();
    const area = (c.area as ToothArea) || 'whole';

    // Per-tooth note lives on a NOTE row (REST-4 interim).
    if (code === 'NOTE') {
      if (c.notes) st.note = c.notes;
      continue;
    }

    if ((code === 'MISSING' || code === 'MISSING_CLOSED') && area !== 'crown') st.missing = true;
    if (c.surface) {
      for (const ch of c.surface.toUpperCase().split('')) {
        if ('MDBLOIF'.includes(ch)) st.surfaces.add(ch as SurfaceKey);
      }
    }
    const { group_id, grade, sub, dir, wx, wy, root } = decodeRegion(c.region);
    if (group_id) st.groups.add(group_id);

    if (code) {
      const def = lookupCondition(code);
      const mat = resolveMaterial?.(c.material_id);
      // Consistent colour coding: chart_as drives the colour (blue/green/red).
      const sourceColor = c.chart_as ? SOURCE_COLOR[c.chart_as as ChartSource] : undefined;
      const glyphColor = sourceColor ?? mat?.color ?? def?.color ?? '#2f7ff0';
      // Record charted surfaces with their condition so the wedges render the pattern.
      if (area === 'surface' && c.surface) {
        for (const ch of c.surface.toUpperCase().split('')) {
          if ('MDBLOIF'.includes(ch)) st.surfaceGlyphs.set(ch as SurfaceKey, { code, color: glyphColor });
        }
      }
      st.glyphs.push({
        id: c.id,
        note: c.notes ?? null,
        area,
        code,
        color: glyphColor,
        drawable: def?.drawable ?? true,
        material_id: c.material_id ?? null,
        pattern: mat?.pattern ?? null,
        grade: grade ?? null,
        group_id: group_id ?? null,
        sub: sub ?? null,
        root: root ?? null,
        watch: code === 'WATCH' && dir ? { dir, x: wx ?? 50, y: wy ?? 40 } : null,
      });
    }
  }
  return map;
}

const genGroupId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 12)
    : `g${Math.abs(hashStr(JSON.stringify(Object.keys({}))))}`;

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

/**
 * Expand a bridge/denture preset into grouped chart_conditions create bodies.
 * Pillars/pontics/implants/missing become individual rows sharing a group_id
 * (encoded in `region` for now). `base` carries patient_id/office_id/etc.
 */
export function expandTemplate(
  template: RestorationTemplate,
  base: Pick<ChartConditionCreate, 'patient_id' | 'office_id' | 'activity_date' | 'chart_as'>,
  resolveMaterialId?: (name: string | undefined) => number | null,
): ChartConditionCreate[] {
  const group_id = genGroupId();
  const material_id = resolveMaterialId?.(template.material) ?? null;
  const region = encodeRegion({ group_id });
  const rows: ChartConditionCreate[] = [];

  const push = (tooth: number, condition_code: string, description: string, withMaterial: boolean) => {
    rows.push({
      ...base,
      tooth: String(tooth),
      area: 'whole',
      region,
      condition_code,
      description: `${description} (${template.label})`,
      material_id: withMaterial ? material_id : null,
      is_inactive: false,
    });
  };

  for (const t of template.pillars) push(t, 'BRIDGE_PILLAR', 'Bridge Pillar', true);
  for (const t of template.pontics) push(t, 'BRIDGE_PONTIC', 'Bridge Pontic', true);
  for (const t of template.missing ?? []) push(t, 'MISSING', 'Missing', false);
  for (const t of template.implants ?? []) push(t, 'IMPLANT', 'Implant', true);
  return rows;
}

/** Build a per-tooth NOTE create body (REST-4 interim — replace with chart_tooth_notes). */
export function noteCreateBody(
  tooth: string,
  note: string,
  base: Pick<ChartConditionCreate, 'patient_id' | 'office_id' | 'activity_date'>,
): ChartConditionCreate {
  return {
    ...base,
    tooth,
    area: 'whole',
    condition_code: 'NOTE',
    description: 'Tooth Note',
    notes: note,
    is_inactive: false,
  };
}
