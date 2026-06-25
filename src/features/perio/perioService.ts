import type { PerioChartTemplateRead, PerioChartSettingRead } from '@/api/generated/model';
import type { NumberingSystem } from '@/features/restorative/numbering';
import type { MeasureType } from './perioModel';

// Non-hook concerns for the perio chart. Data fetching/mutation use the generated
// React Query hooks directly in the container (idiomatic); this module owns the
// local UI preferences seam and the template/setting → effective-config resolve.

// ---- Local UI preferences --------------------------------------------------
// Per-user chart preferences the backend doesn't round-trip as a single object
// (active tool, auto-advance direction, visible bands, numbering). Thresholds /
// show-MGJ default from the active template but can be overridden here.
export interface PerioPrefs {
  active_measure: MeasureType;
  /** Auto-advance direction through the probing order. */
  auto_advance: boolean;
  show_mgj: boolean;
  show_lingual: boolean;
  numbering_system: NumberingSystem;
  pd_warning_level: number;
  cal_warning_level: number;
  template_name: string | null;
  graphical: boolean;
}

export const DEFAULT_PERIO_PREFS: PerioPrefs = {
  active_measure: 'PD',
  auto_advance: true,
  show_mgj: true,
  show_lingual: true,
  numbering_system: 'UNIVERSAL',
  pd_warning_level: 4,
  cal_warning_level: 4,
  template_name: null,
  graphical: false,
};

const KEY = 'perio:prefs';

export function loadPerioPrefs(): PerioPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PERIO_PREFS };
    return { ...DEFAULT_PERIO_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PERIO_PREFS };
  }
}

export function savePerioPrefs(prefs: PerioPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable — prefs revert to defaults next load */
  }
}

// ---- Template / setting resolution ----------------------------------------
/** Pick the active template by saved name, else the first available. */
export function resolveTemplate(
  templates: PerioChartTemplateRead[],
  name: string | null,
): PerioChartTemplateRead | undefined {
  if (!templates.length) return undefined;
  if (name) {
    const hit = templates.find((t) => t.name === name);
    if (hit) return hit;
  }
  return templates[0];
}

/** Fold a chosen template's thresholds / show-MGJ into the local prefs. */
export function prefsFromTemplate(prefs: PerioPrefs, t: PerioChartTemplateRead | undefined): PerioPrefs {
  if (!t) return prefs;
  return {
    ...prefs,
    template_name: t.name,
    show_mgj: t.show_mgj,
    pd_warning_level: t.pd_warning_level || prefs.pd_warning_level,
    cal_warning_level: t.cal_warning_level || prefs.cal_warning_level,
  };
}

/** Fold the per-user backend setting (auto-advance, MGJ, thresholds) into prefs. */
export function prefsFromSetting(prefs: PerioPrefs, s: PerioChartSettingRead | undefined): PerioPrefs {
  if (!s) return prefs;
  return {
    ...prefs,
    auto_advance: s.is_forward,
    show_mgj: s.is_mgj,
    pd_warning_level: s.pd_level || prefs.pd_warning_level,
  };
}

/** Human-friendly exam-date label for the Date of Service dropdown. */
export function examDateLabel(iso: string): string {
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split('-');
  return y && m && day ? `${m}/${day}/${y}` : d;
}
