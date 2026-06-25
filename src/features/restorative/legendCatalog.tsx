import type { ReactNode } from 'react';
import type { FillKind } from './glyphFills';

// Legend catalog — the procedure / condition entries the Legend renders. Each
// `sample(uid, color)` returns the same SVG shape the chart draws, so the legend
// decodes the chart 1:1. Pattern-filled entries carry a `kind`; the legend emits
// the matching <pattern> def and passes its id in as `uid`.

export interface LegendEntry { label: string; kind?: FillKind; sample: (uid: string, color: string) => ReactNode }

const swatch = (kind: FillKind) => (uid: string, color: string): ReactNode =>
  <rect x="4" y="4" width="28" height="28" rx="4" fill={kind === 'solid' ? color : `url(#${uid})`} stroke={color} strokeWidth="1.5" opacity={kind === 'solid' ? 0.85 : 1} />;

export const LEGEND_PROCEDURES: LegendEntry[] = [
  // Area fills
  { label: 'Bridge', kind: 'hatch', sample: (uid, c) => (
    <g><rect x="2" y="11" width="11" height="14" rx="2" fill={`url(#${uid})`} stroke={c} strokeWidth="1.3" /><rect x="23" y="11" width="11" height="14" rx="2" fill={`url(#${uid})`} stroke={c} strokeWidth="1.3" /><line x1="13" y1="18" x2="23" y2="18" stroke={c} strokeWidth="2.5" /></g>
  ) },
  { label: 'Crown (Gold)', kind: 'hound', sample: swatch('hound') },
  { label: 'Class V (Metal)', kind: 'hound', sample: (uid, c) => (
    <g><path d="M9,5 C7,16 8,26 18,26 C28,26 29,16 27,5 Z" fill="#fff" stroke={c} strokeWidth="1.2" /><path d="M10,20 a8 4 0 0 0 16 0 a8 4 0 0 0 -16 0 Z" fill={`url(#${uid})`} stroke={c} strokeWidth="1" /></g>
  ) },
  { label: 'Restoration / Filling', kind: 'dots', sample: swatch('dots') },
  { label: 'Denture', kind: 'solid', sample: swatch('solid') },
  // Root fills / endo
  { label: 'Root Canal: Unknown', sample: (_u, c) => <line x1="18" y1="5" x2="18" y2="31" stroke={c} strokeWidth="3.5" strokeLinecap="round" /> },
  { label: 'Root Canal: Gutta-Percha', sample: (_u, c) => <line x1="18" y1="5" x2="18" y2="31" stroke={c} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="2 3" /> },
  { label: 'Defective: Unknown', sample: (_u, c) => <g><line x1="13" y1="5" x2="13" y2="31" stroke={c} strokeWidth="3" strokeLinecap="round" /><line x1="23" y1="5" x2="23" y2="31" stroke={c} strokeWidth="3" strokeLinecap="round" /></g> },
  { label: 'Defective: Gutta-Percha', sample: (_u, c) => <g><line x1="13" y1="5" x2="13" y2="31" stroke={c} strokeWidth="3" strokeLinecap="round" strokeDasharray="2 3" /><line x1="23" y1="5" x2="23" y2="31" stroke={c} strokeWidth="3" strokeLinecap="round" strokeDasharray="2 3" /></g> },
  { label: 'Infection', sample: (_u, c) => <g><line x1="18" y1="5" x2="18" y2="24" stroke={c} strokeWidth="3" /><circle cx="18" cy="26" r="6" fill="none" stroke={c} strokeWidth="2.5" /></g> },
  // Extraction / removal
  { label: 'Extraction (TxPlan)', sample: (_u, c) => <g stroke={c} strokeWidth="3.5" strokeLinecap="round"><line x1="7" y1="7" x2="29" y2="29" /><line x1="29" y1="7" x2="7" y2="29" /></g> },
  { label: 'Removal (Completed)', sample: (_u, c) => <g stroke={c} strokeWidth="3.5" strokeLinecap="round"><line x1="7" y1="7" x2="29" y2="29" /><line x1="29" y1="7" x2="7" y2="29" /></g> },
  // Implants
  { label: 'Implant Post', sample: (_u, c) => <g stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round"><path d="M11,8 L25,8 L21,31 L15,31 Z" /><line x1="12" y1="14" x2="24" y2="14" /><line x1="13" y1="20" x2="23" y2="20" /><line x1="14" y1="26" x2="22" y2="26" /></g> },
  { label: 'Implant Cylinder', sample: (_u, c) => <g stroke={c} strokeWidth="2.2" fill="none"><rect x="12" y="7" width="12" height="24" rx="3" /><line x1="12" y1="14" x2="24" y2="14" /><line x1="12" y1="20" x2="24" y2="20" /><line x1="12" y1="26" x2="24" y2="26" /></g> },
  { label: 'Implant Blade', sample: (_u, c) => <g stroke={c} strokeWidth="2.2" fill="none"><line x1="18" y1="5" x2="18" y2="13" /><path d="M7,13 L29,13 L29,21 L24,27 L18,21 L12,27 L7,21 Z" /></g> },
  { label: 'Periosteal Implant', sample: (_u, c) => <g stroke={c} strokeWidth="1.8" fill="none"><path d="M5,12 h26 v6 a13 9 0 0 1 -26 0 Z" /><line x1="11" y1="12" x2="11" y2="22" /><line x1="18" y1="12" x2="18" y2="25" /><line x1="25" y1="12" x2="25" y2="22" /></g> },
  { label: 'Implant Crown on Post', sample: (_u, c) => <g stroke={c} strokeWidth="2" fill="none"><path d="M9,4 h18 v8 h-18 z" fill={c} opacity="0.4" /><path d="M14,12 L22,12 L20,31 L16,31 Z" /><line x1="15" y1="20" x2="21" y2="20" /></g> },
  // Status
  { label: 'Missing', sample: (_u, c) => <path d="M7,7 h22 v22 h-22 z" fill="none" stroke={c} strokeWidth="2" strokeDasharray="4 3" /> },
  { label: 'Missing: Crown', sample: (_u, c) => <path d="M9,28 C7,12 12,5 18,5 C24,5 29,12 27,28 Z" fill="none" stroke={c} strokeWidth="2" strokeDasharray="4 3" /> },
  { label: 'Erupted', sample: (_u, c) => <g stroke={c} strokeWidth="3" fill="none" strokeLinecap="round"><line x1="18" y1="28" x2="18" y2="9" /><polyline points="11,16 18,8 25,16" /></g> },
  { label: 'Supernumerary', sample: (_u, c) => <circle cx="18" cy="18" r="7" fill={c} /> },
  { label: 'Impacted', sample: (_u, c) => <g stroke={c} strokeWidth="3" fill="none" strokeLinecap="round"><line x1="18" y1="8" x2="18" y2="27" /><polyline points="11,20 18,28 25,20" /></g> },
  { label: 'Watch', sample: () => <g stroke="#dc2626" strokeWidth="3" fill="none" strokeLinecap="round"><line x1="18" y1="29" x2="18" y2="9" /><polyline points="11,16 18,8 25,16" /></g> },
];

const lettered = (ch: string) => (_u: string, c: string): ReactNode =>
  <g><circle cx="18" cy="18" r="10" fill="none" stroke={c} strokeWidth="2" /><text x="18" y="22.5" fontSize="12" fontWeight="700" textAnchor="middle" fill={c}>{ch}</text></g>;
const arrowH = (dir: 'l' | 'r') => (_u: string, c: string): ReactNode =>
  dir === 'r'
    ? <g stroke={c} strokeWidth="3" fill="none" strokeLinecap="round"><line x1="7" y1="18" x2="27" y2="18" /><polyline points="21,11 28,18 21,25" /></g>
    : <g stroke={c} strokeWidth="3" fill="none" strokeLinecap="round"><line x1="29" y1="18" x2="9" y2="18" /><polyline points="15,11 8,18 15,25" /></g>;
const arrowV = (dir: 'u' | 'd') => (_u: string, c: string): ReactNode =>
  dir === 'u'
    ? <g stroke={c} strokeWidth="3" fill="none" strokeLinecap="round"><line x1="18" y1="29" x2="18" y2="9" /><polyline points="11,16 18,8 25,16" /></g>
    : <g stroke={c} strokeWidth="3" fill="none" strokeLinecap="round"><line x1="18" y1="7" x2="18" y2="27" /><polyline points="11,20 18,28 25,20" /></g>;

// Every condition from the legacy "Legend: Conditions" pages 1 & 2. Shape encodes
// the condition; colour encodes the module (blue/green/red) on the chart.
export const LEGEND_CONDITIONS: LegendEntry[] = [
  { label: '3/4 Crown', sample: (_u, c) => <g><rect x="6" y="6" width="24" height="24" rx="4" fill="none" stroke={c} strokeWidth="1.5" /><path d="M6,19 H30 V26 a4 4 0 0 1 -4 4 H10 a4 4 0 0 1 -4 -4 Z" fill={c} opacity="0.5" /></g> },
  { label: 'Abfraction', sample: (_u, c) => <g stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round"><line x1="8" y1="22" x2="28" y2="22" /><path d="M16,22 L18,26 L20,22" /></g> },
  { label: 'Abrasion', sample: (_u, c) => <ellipse cx="18" cy="24" rx="12" ry="5" fill={c} opacity="0.6" /> },
  { label: 'Abscess', sample: (_u, c) => <circle cx="18" cy="18" r="8" fill="none" stroke={c} strokeWidth="3" /> },
  { label: 'Ankylosis', sample: (_u, c) => <path d="M14,29 V17 H10 L18,7 L26,17 H22 V29 Z" fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" /> },
  { label: 'Apicoectomy', sample: (_u, c) => <g stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round"><line x1="9" y1="24" x2="27" y2="24" /><path d="M18,24 L18,9" /><path d="M18,9 L25,12" fill={c} /></g> },
  { label: 'Avulsion', sample: (_u, c) => <g stroke={c} strokeWidth="3.5" strokeLinecap="round"><line x1="7" y1="7" x2="29" y2="29" /><line x1="29" y1="7" x2="7" y2="29" /></g> },
  { label: 'Braces', sample: (_u, c) => <g stroke={c} strokeWidth="2.5" fill="none"><rect x="11" y="12" width="14" height="12" rx="2" /><line x1="4" y1="18" x2="32" y2="18" /></g> },
  { label: 'Chipped / Fractured Surface', sample: (_u, c) => <polyline points="6,13 11,7 16,13 21,7 26,13 30,9" fill="none" stroke={c} strokeWidth="2.5" /> },
  { label: 'Chipped / Fractured (H)', sample: (_u, c) => <polyline points="18,6 12,16 22,22 14,30" fill="none" stroke={c} strokeWidth="2.5" /> },
  { label: 'Concussion', sample: (_u, c) => <circle cx="18" cy="18" r="8" fill={c} opacity="0.55" /> },
  { label: 'Congenitally Missing', sample: (_u, c) => <rect x="5" y="4" width="26" height="28" rx="9" fill="none" stroke={c} strokeWidth="2" /> },
  { label: 'Cracked Surface', sample: (_u, c) => <polyline points="14,7 19,15 14,21 20,30" fill="none" stroke={c} strokeWidth="1.8" /> },
  { label: 'Decay (Incipient)', sample: (_u, c) => <circle cx="18" cy="18" r="5" fill={c} /> },
  { label: 'Decay (Nonfunctional)', sample: (_u, c) => <circle cx="18" cy="18" r="11" fill={c} opacity="0.9" /> },
  { label: 'Decay (Recurrent)', sample: (_u, c) => <g><circle cx="18" cy="18" r="10" fill={c} opacity="0.9" /><circle cx="18" cy="18" r="10" fill="none" stroke={c} strokeWidth="1.5" strokeDasharray="3 2" /></g> },
  { label: 'Demineralization / White Spots', sample: (_u, c) => <g fill="none" stroke={c} strokeWidth="2"><circle cx="14" cy="16" r="4" /><circle cx="23" cy="21" r="3" /></g> },
  { label: 'Discoloration', sample: (_u, c) => <rect x="8" y="8" width="20" height="20" rx="4" fill={c} opacity="0.4" /> },
  { label: 'Drift Distal', sample: arrowH('r') },
  { label: 'Drift Mesial', sample: arrowH('l') },
  { label: 'Ectopic Eruption', sample: (_u, c) => <g stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round"><polyline points="22,9 15,14 22,19" /><polyline points="26,15 19,20 26,25" /></g> },
  { label: 'Fistula', sample: (_u, c) => <ellipse cx="18" cy="27" rx="8" ry="4" fill={c} /> },
  { label: 'Fluorosis', sample: (_u, c) => <g fill={c}><circle cx="13" cy="14" r="2" /><circle cx="20" cy="12" r="2" /><circle cx="17" cy="20" r="2" /><circle cx="24" cy="19" r="2" /><circle cx="13" cy="23" r="2" /></g> },
  { label: 'Fusion', sample: lettered('F') },
  { label: 'Gemination', sample: lettered('G') },
  { label: 'Hypocalcification', sample: (_u, c) => <circle cx="18" cy="16" r="5" fill={c} opacity="0.7" /> },
  { label: 'Hypoplasia', sample: lettered('H') },
  { label: 'Impacted Distal', sample: arrowH('r') },
  { label: 'Impacted Mesial', sample: arrowH('l') },
  { label: 'Intrusion', sample: arrowV('d') },
  { label: 'Lesions', sample: (_u, c) => <ellipse cx="18" cy="18" rx="12" ry="6" fill={c} opacity="0.6" /> },
  { label: 'Loose Tooth', sample: (_u, c) => <g stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="13" y1="6" x2="13" y2="30" /><line x1="23" y1="6" x2="23" y2="30" /></g> },
  { label: 'Open Contact Mesial', sample: (_u, c) => <path d="M22,13 L30,18 L22,23 Z" fill={c} /> },
  { label: 'Open Contact Distal', sample: (_u, c) => <path d="M14,13 L6,18 L14,23 Z" fill={c} /> },
  { label: 'Open Margin Mesial', sample: (_u, c) => <path d="M22,13 L30,18 L22,23 Z" fill="none" stroke={c} strokeWidth="2" /> },
  { label: 'Open Margin Distal', sample: (_u, c) => <path d="M14,13 L6,18 L14,23 Z" fill="none" stroke={c} strokeWidth="2" /> },
  { label: 'PARL', sample: (_u, c) => <circle cx="18" cy="10" r="6" fill={c} /> },
  { label: 'Partially Erupted', sample: (_u, c) => <polyline points="9,23 14,14 18,21 22,14 27,23" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /> },
  { label: 'Pericoronitis', sample: (_u, c) => <rect x="7" y="6" width="22" height="18" rx="7" fill="none" stroke={c} strokeWidth="2" /> },
  { label: 'Pins', sample: (_u, c) => <g stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="14" y1="12" x2="14" y2="24" /><line x1="22" y1="12" x2="22" y2="24" /></g> },
  { label: 'Pre-Eruptive Caries', sample: (_u, c) => <ellipse cx="18" cy="18" rx="10" ry="7" fill={c} opacity="0.8" /> },
  { label: 'Pulp Stones', sample: (_u, c) => <circle cx="18" cy="18" r="3.5" fill={c} /> },
  { label: 'Resorption Internal', sample: (_u, c) => <path d="M9,18 Q18,11 27,18 Q18,25 9,18 Z" fill={c} opacity="0.85" /> },
  { label: 'Resorption External', sample: (_u, c) => <path d="M9,18 Q18,11 27,18 Q18,25 9,18 Z" fill="none" stroke={c} strokeWidth="2" /> },
  { label: 'Retained Root', sample: (_u, c) => <path d="M13,7 C12,16 13,28 18,30 C23,28 24,16 23,7 Z" fill="none" stroke={c} strokeWidth="2" /> },
  { label: 'Root Tip', sample: (_u, c) => <circle cx="18" cy="20" r="6" fill={c} /> },
  { label: 'Rotated Distal', sample: (_u, c) => <g fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><path d="M10,12 A9 9 0 1 1 9,20" /><polyline points="10,7 10,13 16,13" /></g> },
  { label: 'Rotated Mesial', sample: (_u, c) => <g fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><path d="M26,12 A9 9 0 1 0 27,20" /><polyline points="26,7 26,13 20,13" /></g> },
  { label: 'Spacer', sample: (_u, c) => <g stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="13" y1="7" x2="13" y2="27" /><line x1="23" y1="7" x2="23" y2="27" /><rect x="10" y="27" width="6" height="4" fill={c} stroke="none" /><rect x="20" y="27" width="6" height="4" fill={c} stroke="none" /></g> },
  { label: 'Splinted', sample: (_u, c) => <g stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="7" y1="15" x2="29" y2="15" /><line x1="7" y1="21" x2="29" y2="21" /></g> },
  { label: 'Square Mesial', sample: (_u, c) => <rect x="22" y="24" width="7" height="7" fill={c} /> },
  { label: 'Square Distal', sample: (_u, c) => <rect x="7" y="24" width="7" height="7" fill={c} /> },
  { label: 'Square Middle', sample: (_u, c) => <rect x="14.5" y="24" width="7" height="7" fill={c} /> },
  { label: 'Stain', sample: (_u, c) => <path d="M11,16 Q18,12 25,16 Q22,22 18,22 Q14,22 11,16 Z" fill={c} opacity="0.6" /> },
  { label: 'Sub Erupted', sample: arrowV('d') },
  { label: 'Supra Erupted', sample: arrowV('u') },
  { label: 'Tipped Facial', sample: (_u, c) => <g fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><path d="M11,26 Q14,10 26,10" /><polyline points="21,8 27,10 25,16" /></g> },
  { label: 'Tipped Lingual', sample: (_u, c) => <g fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><path d="M25,26 Q22,10 10,10" /><polyline points="15,8 9,10 11,16" /></g> },
  { label: 'Toothbrush Abrasion', sample: (_u, c) => <g><rect x="9" y="20" width="18" height="5" rx="1.5" fill={c} opacity="0.7" /><line x1="12" y1="20" x2="12" y2="16" stroke={c} strokeWidth="1.5" /><line x1="18" y1="20" x2="18" y2="15" stroke={c} strokeWidth="1.5" /><line x1="24" y1="20" x2="24" y2="16" stroke={c} strokeWidth="1.5" /></g> },
  { label: 'Trauma', sample: (_u, c) => <g fill="none" stroke={c} strokeWidth="2"><path d="M8,18 Q18,10 28,18 Q18,26 8,18 Z" /><circle cx="18" cy="18" r="2.5" fill={c} /></g> },
  { label: 'Watch', sample: () => <g stroke="#dc2626" strokeWidth="3" fill="none" strokeLinecap="round"><line x1="18" y1="29" x2="18" y2="9" /><polyline points="11,16 18,8 25,16" /></g> },
];

// Patterns of Materials. Shape/pattern encodes the material; colour encodes the
// module on the chart. Materials not listed here fall back to a solid module fill.
export const LEGEND_MATERIALS: LegendEntry[] = [
  { label: 'Amalgam', kind: 'solid', sample: swatch('solid') },
  { label: 'Composite', kind: 'dots', sample: swatch('dots') },
  { label: 'Ceramic', kind: 'checker', sample: swatch('checker') },
  { label: 'Gold', kind: 'vert', sample: swatch('vert') },
  { label: 'Porcelain', kind: 'horiz', sample: swatch('horiz') },
  { label: 'Porcelain Fused to Metal', kind: 'checker', sample: swatch('checker') },
  { label: 'Porcelain Fused to Gold', kind: 'vert', sample: swatch('vert') },
  { label: 'Porcelain Fused to High Noble Metal', kind: 'checker', sample: swatch('checker') },
  { label: 'Porcelain Fused to Titanium', kind: 'diag', sample: swatch('diag') },
  { label: 'Resin', kind: 'dots', sample: swatch('dots') },
  { label: 'Resin on Metal', kind: 'checker', sample: swatch('checker') },
  { label: 'Resin on High Noble Metal', kind: 'hound', sample: swatch('hound') },
  { label: 'High Noble Metal', kind: 'checker', sample: swatch('checker') },
  { label: 'Metal', kind: 'hatch', sample: swatch('hatch') },
  { label: 'Stainless Steel', kind: 'vert', sample: swatch('vert') },
  { label: 'Titanium', kind: 'diag', sample: swatch('diag') },
  { label: 'Plastic', kind: 'dots', sample: swatch('dots') },
  { label: 'Bruxzir', kind: 'diag', sample: swatch('diag') },
  { label: 'Gutta-Percha', sample: (_u, c) => <line x1="18" y1="5" x2="18" y2="31" stroke={c} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="2 3" /> },
  { label: 'Sealant', sample: lettered('S') },
  { label: 'Arestin', sample: lettered('A') },
  { label: 'Veneer', sample: lettered('V') },
  { label: 'New Material', kind: 'solid', sample: swatch('solid') },
  { label: 'Other', kind: 'solid', sample: swatch('solid') },
  { label: 'Unknown', kind: 'solid', sample: swatch('solid') },
];
