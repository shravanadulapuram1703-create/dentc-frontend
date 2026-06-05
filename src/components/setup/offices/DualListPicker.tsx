import { useMemo, useState } from "react";
import {
  Search,
  ChevronRight,
  ChevronsRight,
  ChevronLeft,
  ChevronsLeft,
  Loader2,
  Inbox,
} from "lucide-react";

/**
 * A single transferable row. `id` is the stable key the parent diffs on (kept as
 * a string so it works for numeric and string backend ids alike); `primary` is
 * the bold first line, `secondary` an optional muted second line, and `meta` an
 * optional right-aligned chip (e.g. an Active/Inactive badge).
 */
export type DualListItem = {
  id: string;
  primary: string;
  secondary?: string;
  meta?: React.ReactNode;
};

export interface DualListPickerProps {
  /** Items NOT currently assigned (left pane). */
  available: DualListItem[];
  /** Items currently assigned (right pane). */
  assigned: DualListItem[];
  /**
   * Called with the full set of assigned ids whenever the selection changes.
   * The parent owns the assigned set and diffs it against the server on save.
   */
  onChange: (assignedIds: string[]) => void;
  leftTitle?: string;
  rightTitle?: string;
  /** Show the per-pane search boxes (default true). */
  searchable?: boolean;
  /** Disable all interaction (e.g. while saving). */
  disabled?: boolean;
  /** Render the loading spinner instead of the panes. */
  loading?: boolean;
  /** Empty-state copy for the available pane. */
  emptyAvailableLabel?: string;
  /** Empty-state copy for the assigned pane. */
  emptyAssignedLabel?: string;
}

/**
 * Generic "Available ↔ Assigned" transfer list, styled to match the medical-slate
 * setup screens. Stateless w.r.t. assignment — the parent passes `available` /
 * `assigned` (derived from backend data) and receives the new assigned-id set via
 * `onChange`. Multi-select with Ctrl/Cmd click; move buttons act on the
 * highlighted rows (or all filtered rows for the »/« bulk buttons). Double-click a
 * row to move it across immediately.
 */
export default function DualListPicker({
  available,
  assigned,
  onChange,
  leftTitle = "Available",
  rightTitle = "Assigned",
  searchable = true,
  disabled = false,
  loading = false,
  emptyAvailableLabel = "No items available",
  emptyAssignedLabel = "No items assigned",
}: DualListPickerProps) {
  const [leftQuery, setLeftQuery] = useState("");
  const [rightQuery, setRightQuery] = useState("");
  const [leftSelected, setLeftSelected] = useState<Set<string>>(new Set());
  const [rightSelected, setRightSelected] = useState<Set<string>>(new Set());

  const filteredAvailable = useMemo(
    () => filterItems(available, leftQuery),
    [available, leftQuery],
  );
  const filteredAssigned = useMemo(
    () => filterItems(assigned, rightQuery),
    [assigned, rightQuery],
  );

  const assignedIds = useMemo(() => new Set(assigned.map((i) => i.id)), [assigned]);

  /** Move the given ids into the assigned set. */
  const assign = (ids: string[]) => {
    if (!ids.length || disabled) return;
    const next = new Set(assignedIds);
    ids.forEach((id) => next.add(id));
    onChange(Array.from(next));
    setLeftSelected(new Set());
  };

  /** Remove the given ids from the assigned set. */
  const unassign = (ids: string[]) => {
    if (!ids.length || disabled) return;
    const next = new Set(assignedIds);
    ids.forEach((id) => next.delete(id));
    onChange(Array.from(next));
    setRightSelected(new Set());
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        <span className="text-sm font-bold">Loading…</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
      {/* Available (left) */}
      <Pane
        title={leftTitle}
        count={available.length}
        query={leftQuery}
        onQuery={setLeftQuery}
        searchable={searchable}
        items={filteredAvailable}
        selected={leftSelected}
        onSelectedChange={setLeftSelected}
        onRowDoubleClick={(id) => assign([id])}
        disabled={disabled}
        emptyLabel={emptyAvailableLabel}
      />

      {/* Move buttons (center) */}
      <div className="flex lg:flex-col items-center justify-center gap-2">
        <MoveButton
          title="Assign selected"
          disabled={disabled || leftSelected.size === 0}
          onClick={() => assign(Array.from(leftSelected))}
        >
          <ChevronRight className="w-4 h-4" />
        </MoveButton>
        <MoveButton
          title="Assign all (filtered)"
          disabled={disabled || filteredAvailable.length === 0}
          onClick={() => assign(filteredAvailable.map((i) => i.id))}
        >
          <ChevronsRight className="w-4 h-4" />
        </MoveButton>
        <MoveButton
          title="Unassign selected"
          disabled={disabled || rightSelected.size === 0}
          onClick={() => unassign(Array.from(rightSelected))}
        >
          <ChevronLeft className="w-4 h-4" />
        </MoveButton>
        <MoveButton
          title="Unassign all (filtered)"
          disabled={disabled || filteredAssigned.length === 0}
          onClick={() => unassign(filteredAssigned.map((i) => i.id))}
        >
          <ChevronsLeft className="w-4 h-4" />
        </MoveButton>
      </div>

      {/* Assigned (right) */}
      <Pane
        title={rightTitle}
        count={assigned.length}
        query={rightQuery}
        onQuery={setRightQuery}
        searchable={searchable}
        items={filteredAssigned}
        selected={rightSelected}
        onSelectedChange={setRightSelected}
        onRowDoubleClick={(id) => unassign([id])}
        disabled={disabled}
        emptyLabel={emptyAssignedLabel}
      />
    </div>
  );
}

function filterItems(items: DualListItem[], query: string): DualListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (i) =>
      i.primary.toLowerCase().includes(q) ||
      (i.secondary ?? "").toLowerCase().includes(q) ||
      i.id.toLowerCase().includes(q),
  );
}

type PaneProps = {
  title: string;
  count: number;
  query: string;
  onQuery: (q: string) => void;
  searchable: boolean;
  items: DualListItem[];
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
  onRowDoubleClick: (id: string) => void;
  disabled: boolean;
  emptyLabel: string;
};

function Pane({
  title,
  count,
  query,
  onQuery,
  searchable,
  items,
  selected,
  onSelectedChange,
  onRowDoubleClick,
  disabled,
  emptyLabel,
}: PaneProps) {
  const toggle = (id: string, e: React.MouseEvent) => {
    if (disabled) return;
    const next = new Set(selected);
    if (e.ctrlKey || e.metaKey) {
      if (next.has(id)) next.delete(id);
      else next.add(id);
    } else {
      // Plain click selects just this row (unless it was the only one selected).
      next.clear();
      next.add(id);
    }
    onSelectedChange(next);
  };

  return (
    <div className="flex flex-col border-2 border-[#E2E8F0] rounded-lg bg-white overflow-hidden">
      <div className="flex items-center justify-between bg-[#F7F9FC] border-b-2 border-[#E2E8F0] px-3 py-2">
        <span className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">{title}</span>
        <span className="px-2 py-0.5 bg-[#E8EFF7] text-[#1F3A5F] text-[10px] font-bold rounded-full">
          {count}
        </span>
      </div>

      {searchable && (
        <div className="relative p-2 border-b border-[#E2E8F0]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search…"
            disabled={disabled}
            className="w-full pl-8 pr-3 py-1.5 border-2 border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 disabled:bg-[#F7F9FC]"
          />
        </div>
      )}

      <div className="flex-1 min-h-[260px] max-h-[420px] overflow-auto divide-y divide-[#F1F5F9]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 text-center">
            <Inbox className="w-9 h-9 text-[#CBD5E1] mb-2" />
            <p className="text-xs text-[#94A3B8] font-bold">{emptyLabel}</p>
          </div>
        ) : (
          items.map((item) => {
            const isSelected = selected.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => toggle(item.id, e)}
                onDoubleClick={() => onRowDoubleClick(item.id)}
                disabled={disabled}
                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                  isSelected ? "bg-[#E8EFF7]" : "hover:bg-[#F7F9FC]"
                } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-[#1E293B] truncate">{item.primary}</span>
                  {item.secondary && (
                    <span className="block text-xs text-[#64748B] truncate">{item.secondary}</span>
                  )}
                </span>
                {item.meta && <span className="shrink-0">{item.meta}</span>}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function MoveButton({
  children,
  title,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-center w-9 h-9 rounded-lg border-2 border-[#3A6EA5] text-[#3A6EA5] transition-all ${
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "hover:bg-[#3A6EA5] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
