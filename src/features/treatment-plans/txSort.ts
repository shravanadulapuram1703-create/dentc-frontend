import { STATUS_LABEL, type TxRow } from './txModel';

/** Grid columns that can be sorted — each is a `TxRow` field. */
export type TxSortKey =
  | 'diag_date'
  | 'tid'
  | 'phase'
  | 'order'
  | 'status'
  | 'code'
  | 'tooth'
  | 'surface'
  | 'description'
  | 'provider_label'
  | 'est_pat'
  | 'est_ins'
  | 'fee';

/** `null` = the legacy default order (Tx Plan ID → Phase → Order). */
export type TxSort = { key: TxSortKey; dir: 'asc' | 'desc' } | null;

const textCollator = new Intl.Collator('en-US', { numeric: true, sensitivity: 'base' });

/**
 * Sort rows by one column. Blank values always sink to the bottom; ties fall
 * back to the legacy order (Tx Plan → Phase → Order) so the result is stable.
 */
export function sortTxRows(rows: TxRow[], sort: TxSort): TxRow[] {
  if (!sort) return rows;
  const { key, dir } = sort;
  const sign = dir === 'asc' ? 1 : -1;
  const legacy = (a: TxRow, b: TxRow) => a.tid - b.tid || a.phase - b.phase || a.order - b.order;
  const value = (r: TxRow): string | number | null => {
    switch (key) {
      case 'status':
        return STATUS_LABEL[r.status] ?? r.status;
      case 'tooth': {
        // Numeric teeth (1–32) sort numerically; letters (A–T, quadrants) after them.
        const t = (r.tooth ?? '').trim();
        return t === '' ? null : t;
      }
      default: {
        const v = r[key];
        if (v == null || v === '') return null;
        return v as string | number;
      }
    }
  };
  return [...rows].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va == null && vb == null) return legacy(a, b);
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp =
      typeof va === 'number' && typeof vb === 'number' ? va - vb : textCollator.compare(String(va), String(vb));
    return cmp !== 0 ? cmp * sign : legacy(a, b);
  });
}
