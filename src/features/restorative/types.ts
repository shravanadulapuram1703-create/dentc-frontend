import type { SurfaceKey } from './toothLayout';

export type ChartTab = 'pre-existing' | 'completed' | 'tx-plans';

// Tooth-selection areas (root = a specific root when ActiveSelection.root is set).
export type ToothArea = 'whole' | 'crown' | 'junction' | 'root' | 'surface';

// A palette condition/procedure tool. `action` items (conditions/legend) are
// utility buttons; everything else applies a condition_code to the selection.
export interface PaletteItem {
  id: string;
  label: string;
  condition_code?: string;
  /** Maps to ChartCondition.chart_as. */
  chart_as?: string;
  action?: 'open-conditions' | 'open-legend' | 'open-explosion';
  /** Selection areas that activate this button (undefined = active for any selection). */
  areas?: ToothArea[];
  /** Only active when a full arch (all upper or all lower teeth) is selected. */
  requiresArch?: boolean;
}

// A normalized row for the bottom transaction grid, unioned from
// chart-conditions / patient-procedures / treatment-plan-items.
export interface GridRow {
  id: string;
  source: 'condition' | 'procedure' | 'tx-plan';
  type: string; // PRE-EXISTING / COMPLETED / TX-PLAN
  date: string;
  status: string;
  code: string;
  description: string;
  tooth: string;
  surface: string;
  provider: string;
  est_ins: string;
  fee: string;
  office: string;
  notes?: string;
  inactive?: boolean;
}

export interface ActiveSelection {
  area: ToothArea;
  /** Selected teeth (string ids: Universal "1".."32" or primary "A".."T"). */
  teeth: string[];
  /** Surfaces selected when area === 'surface' (applies to teeth[0]). */
  surfaces: Set<SurfaceKey>;
  /** Selected root labels when area === 'root' (empty = all roots; supports multi-select). */
  roots?: string[];
}
