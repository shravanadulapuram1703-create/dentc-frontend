// Bridge / denture preset catalog. Reimplemented natively in snake_case using
// Universal tooth numbers (our backend persistence), inspired by the MIT
// React-Odontogram-Modul preset set (no code copied). Interim home for the
// presets until the REST-2 `chart_status_templates` resource exists; applying a
// template expands into grouped chart_conditions rows via chartModel.

export type TemplateType = 'span' | 'arch-bridge' | 'partial-removable' | 'full-removable' | 'bar-denture';
export type CrownMaterial = 'zircon' | 'metal-ceramic' | 'emax' | 'gold' | 'acrylic';

export interface RestorationTemplate {
  id: string;
  label: string;
  template_type: TemplateType;
  arch: 'upper' | 'lower';
  material?: CrownMaterial;
  /** Abutment teeth (carry the bridge) — Universal numbers. */
  pillars: number[];
  /** Replacement units between/over the span. */
  pontics: number[];
  /** Teeth marked missing by the preset. */
  missing?: number[];
  /** Implant fixtures (bar dentures). */
  implants?: number[];
}

const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const UPPER_ALL = range(1, 16);
const LOWER_ALL = range(17, 32);

export const RESTORATION_TEMPLATES: RestorationTemplate[] = [
  // ---- Upper spans ----
  { id: 'u-ant-4-zircon', label: 'Upper Anterior 4-Unit (Zircon)', template_type: 'span', arch: 'upper', material: 'zircon', pillars: [6, 11], pontics: [7, 8, 9, 10] },
  { id: 'u-ant-4-metal', label: 'Upper Anterior 4-Unit (Metal-Ceramic)', template_type: 'span', arch: 'upper', material: 'metal-ceramic', pillars: [6, 11], pontics: [7, 8, 9, 10] },
  { id: 'u-cc-zircon', label: 'Upper Canine–Canine (Zircon)', template_type: 'span', arch: 'upper', material: 'zircon', pillars: [5, 12], pontics: [6, 7, 8, 9, 10, 11] },
  { id: 'u-cc-metal', label: 'Upper Canine–Canine (Metal-Ceramic)', template_type: 'span', arch: 'upper', material: 'metal-ceramic', pillars: [5, 12], pontics: [6, 7, 8, 9, 10, 11] },
  { id: 'u-full-bridge', label: 'Upper Full-Arch Bridge (Zircon)', template_type: 'arch-bridge', arch: 'upper', material: 'zircon', pillars: [2, 5, 12, 15], pontics: [3, 4, 6, 7, 8, 9, 10, 11, 13, 14] },
  // ---- Lower spans ----
  { id: 'l-ant-4-zircon', label: 'Lower Anterior 4-Unit (Zircon)', template_type: 'span', arch: 'lower', material: 'zircon', pillars: [22, 27], pontics: [23, 24, 25, 26] },
  { id: 'l-ant-4-metal', label: 'Lower Anterior 4-Unit (Metal-Ceramic)', template_type: 'span', arch: 'lower', material: 'metal-ceramic', pillars: [22, 27], pontics: [23, 24, 25, 26] },
  { id: 'l-cc-zircon', label: 'Lower Canine–Canine (Zircon)', template_type: 'span', arch: 'lower', material: 'zircon', pillars: [21, 28], pontics: [22, 23, 24, 25, 26, 27] },
  { id: 'l-full-bridge', label: 'Lower Full-Arch Bridge (Zircon)', template_type: 'arch-bridge', arch: 'lower', material: 'zircon', pillars: [18, 21, 28, 31], pontics: [19, 20, 22, 23, 24, 25, 26, 27, 29, 30] },
  // ---- Removable ----
  { id: 'u-partial', label: 'Upper Partial Denture', template_type: 'partial-removable', arch: 'upper', material: 'acrylic', pillars: [], pontics: [4, 5, 12, 13], missing: [4, 5, 12, 13] },
  { id: 'l-partial', label: 'Lower Partial Denture', template_type: 'partial-removable', arch: 'lower', material: 'acrylic', pillars: [], pontics: [20, 21, 28, 29], missing: [20, 21, 28, 29] },
  { id: 'u-full-denture', label: 'Upper Full Denture', template_type: 'full-removable', arch: 'upper', material: 'acrylic', pillars: [], pontics: UPPER_ALL, missing: UPPER_ALL },
  { id: 'l-full-denture', label: 'Lower Full Denture', template_type: 'full-removable', arch: 'lower', material: 'acrylic', pillars: [], pontics: LOWER_ALL, missing: LOWER_ALL },
  // ---- Bar dentures (implant-supported) ----
  { id: 'u-bar', label: 'Upper Bar Denture (4 Implants)', template_type: 'bar-denture', arch: 'upper', material: 'acrylic', pillars: [], pontics: UPPER_ALL.filter((t) => ![4, 6, 11, 13].includes(t)), missing: UPPER_ALL.filter((t) => ![4, 6, 11, 13].includes(t)), implants: [4, 6, 11, 13] },
  { id: 'l-bar', label: 'Lower Bar Denture (4 Implants)', template_type: 'bar-denture', arch: 'lower', material: 'acrylic', pillars: [], pontics: LOWER_ALL.filter((t) => ![20, 22, 27, 29].includes(t)), missing: LOWER_ALL.filter((t) => ![20, 22, 27, 29].includes(t)), implants: [20, 22, 27, 29] },
];
