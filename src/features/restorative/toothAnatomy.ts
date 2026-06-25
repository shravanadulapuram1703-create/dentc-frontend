import { toothMeta, type ToothMeta } from './dentition';
import type { ToothType } from './toothLayout';

// Anatomical root counts + labels per tooth, used to build the segmented tooth
// SVG and to scope root-level conditions. Source of truth = the user's reference
// chart + standard dental anatomy.

export interface ToothAnatomy extends ToothMeta {
  rootCount: number;
  /** Anatomical root labels (length === rootCount), screen left→right order. */
  rootLabels: string[];
}

const THREE_UPPER = ['mesiobuccal', 'distobuccal', 'palatal'];
const TWO_UPPER_PREMOLAR = ['buccal', 'palatal'];
const TWO_LOWER_MOLAR = ['mesial', 'distal'];
const ONE = ['root'];

// Permanent (Universal) root counts.
const UPPER_3 = new Set([1, 2, 3, 14, 15, 16]);
const UPPER_2 = new Set([5, 12]); // maxillary 1st premolars
const LOWER_2 = new Set([17, 18, 19, 30, 31, 32]); // mandibular molars

function permanentRoots(n: number, type: ToothType): { count: number; labels: string[] } {
  if (UPPER_3.has(n)) return { count: 3, labels: THREE_UPPER };
  if (UPPER_2.has(n)) return { count: 2, labels: TWO_UPPER_PREMOLAR };
  if (LOWER_2.has(n)) return { count: 2, labels: TWO_LOWER_MOLAR };
  // everything else single-rooted (incisors, canines, most premolars, #20, #29)
  void type;
  return { count: 1, labels: ONE };
}

export function toothAnatomy(id: string): ToothAnatomy {
  const meta = toothMeta(id);
  // Primary teeth: molars 2 roots, others 1 (kept simple, anatomically reasonable).
  if (meta.primary) {
    const r = meta.type === 'molar'
      ? { count: 2, labels: meta.arch === 'upper' ? TWO_UPPER_PREMOLAR : TWO_LOWER_MOLAR }
      : { count: 1, labels: ONE };
    return { ...meta, rootCount: r.count, rootLabels: r.labels };
  }
  const r = permanentRoots(Number(id), meta.type);
  return { ...meta, rootCount: r.count, rootLabels: r.labels };
}
