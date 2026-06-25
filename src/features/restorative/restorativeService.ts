import type { ChartMaterialRead } from '@/api/generated/model';
import type { NumberingSystem } from './numbering';
import type { MaterialMeta } from './chartModel';
import type { DentitionMode } from './dentition';

// Non-hook concerns for the restorative chart. Data fetching/mutation use the
// generated React Query hooks directly in the component (idiomatic); this module
// owns persistence seams that the backend doesn't expose yet, so the swap to the
// REST-* resources is localized here.

// ---- Chart settings (REST-3 interim: localStorage, swap to /chart-settings) --
export interface ChartSettings {
  numbering_system: NumberingSystem;
  dentition: DentitionMode;
  wisdom_visible: boolean;
  occlusal_visible: boolean;
  show_base: boolean;
  show_healthy_pulp: boolean;
  edentulous: boolean;
  arch_mode: 'both' | 'upper' | 'lower';
}

export const DEFAULT_CHART_SETTINGS: ChartSettings = {
  numbering_system: 'UNIVERSAL',
  dentition: 'permanent-17',
  wisdom_visible: true,
  occlusal_visible: true,
  show_base: true,
  show_healthy_pulp: false,
  edentulous: false,
  arch_mode: 'both',
};

const key = (patientId: number | string) => `restorative:settings:${patientId}`;

export function loadChartSettings(patientId: number | string): ChartSettings {
  try {
    const raw = localStorage.getItem(key(patientId));
    if (!raw) return { ...DEFAULT_CHART_SETTINGS };
    return { ...DEFAULT_CHART_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CHART_SETTINGS };
  }
}

export function saveChartSettings(patientId: number | string, settings: ChartSettings): void {
  try {
    localStorage.setItem(key(patientId), JSON.stringify(settings));
  } catch {
    /* storage unavailable — settings revert to defaults next load */
  }
}

// ---- Material resolution --------------------------------------------------
/** Build a resolver from chart_materials rows: material_id -> {color,pattern}. */
export function materialMetaResolver(
  materials: ChartMaterialRead[],
): (id: number | null | undefined) => MaterialMeta | undefined {
  const byId = new Map<number, ChartMaterialRead>();
  for (const m of materials) byId.set(m.id, m);
  return (id) => {
    if (id == null) return undefined;
    const m = byId.get(id);
    return m ? { color: m.color, pattern: m.pattern } : undefined;
  };
}

/** Resolve a template material NAME to a chart_materials id (case-insensitive). */
export function materialIdByNameResolver(
  materials: ChartMaterialRead[],
): (name: string | undefined) => number | null {
  const byName = new Map<string, number>();
  for (const m of materials) byName.set(m.name.trim().toLowerCase(), m.id);
  return (name) => (name ? byName.get(name.trim().toLowerCase()) ?? null : null);
}
