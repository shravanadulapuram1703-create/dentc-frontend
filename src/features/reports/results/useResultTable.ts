// Result-table state over TanStack Table v9 (adopted by spike S-1, docs/reports/module-plan/spikes/S-1_library_spike.md).
// UX-08 builds ResultTable on it.
// Column state only (visibility, order, pinning, sizing) + row selection; sorting, grouping,
// totals and paging stay on the server (07 §10.1).
import { useState } from "react";
import {
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  rowSelectionFeature,
  tableFeatures,
  useTable,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type ColumnVisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table";

export const resultFeatures = tableFeatures({
  columnVisibilityFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  rowSelectionFeature,
});

/** A resolved result column (02 §3.3 subset). */
export interface ResultColumn {
  key: string;
  label: string;
  width: number;
  align?: "left" | "right";
}

export type ResultRow = Record<string, string | number | null>;

const helper = createColumnHelper<typeof resultFeatures, ResultRow>();

export function buildColumns(cols: readonly ResultColumn[]) {
  return helper.columns(
    cols.map((c) =>
      helper.accessor((row) => row[c.key] ?? null, {
        id: c.key,
        header: c.label,
        size: c.width,
        minSize: 48,
        meta: { align: c.align ?? "left" },
      }),
    ),
  );
}

export interface ResultTableState {
  columnVisibility: ColumnVisibilityState;
  columnOrder: ColumnOrderState;
  columnPinning: ColumnPinningState;
  columnSizing: ColumnSizingState;
  rowSelection: RowSelectionState;
}

export function useResultTable(
  columns: ReturnType<typeof buildColumns>,
  rows: ResultRow[],
  initialPinned: string[] = [],
) {
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({ start: initialPinned, end: [] });
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useTable({
    features: resultFeatures,
    columns,
    data: rows,
    getRowId: (_row, index) => String(index),
    state: { columnVisibility, columnOrder, columnPinning, columnSizing, rowSelection },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
  });

  return table;
}

export type ResultTable = ReturnType<typeof useResultTable>;
