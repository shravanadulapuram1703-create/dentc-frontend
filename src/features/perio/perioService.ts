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

// ---- Per-exam provider (client-side until PERIO-BE-14) ---------------------
// A PerioExam has no provider column, but the printed Periodontal Examination
// Record names the clinician in its Provider block (with their Tax ID / License#),
// so the choice has to survive a reload — a record reprinted next week must name
// the same provider it named today. Until the backend adds `provider_id`, the
// pick is remembered here, keyed by exam.
//
// An empty string is a REAL stored value ("no provider"), distinct from `null`
// ("never chosen"), which is what lets the screen seed a default exactly once.

const PROVIDER_KEY = 'perio:exam_provider';
/** Cap the map so a long-lived browser profile can't grow it without bound. */
const PROVIDER_LIMIT = 200;

function readProviderMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PROVIDER_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** The provider chosen for this exam, or null if none has ever been chosen. */
export function loadExamProvider(examId: number): string | null {
  const v = readProviderMap()[String(examId)];
  return typeof v === 'string' ? v : null;
}

export function saveExamProvider(examId: number, providerId: string): void {
  try {
    const map = readProviderMap();
    map[String(examId)] = providerId;
    // Newest wins: drop the oldest insertions once over the cap.
    const keys = Object.keys(map);
    const trimmed = keys.length > PROVIDER_LIMIT
      ? Object.fromEntries(keys.slice(keys.length - PROVIDER_LIMIT).map((k) => [k, map[k] as string]))
      : map;
    localStorage.setItem(PROVIDER_KEY, JSON.stringify(trimmed));
  } catch {
    /* storage unavailable — the pick simply won't survive a reload */
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
