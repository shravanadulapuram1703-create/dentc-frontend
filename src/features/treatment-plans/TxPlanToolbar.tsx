import { useState } from 'react';
import type { ProviderRead } from '@/api/generated/model';
import { STATUS_ORDER, STATUS_LABEL, type TxStatus } from './txModel';

export interface IdChange {
  tid?: number;
  phase?: number;
  order?: number;
}
export interface ReEstimateArgs {
  tid: number;
  phase: number | null;
  use_new_fees: boolean;
  use_new_billing_order: boolean;
}

interface TxPlanToolbarProps {
  selectedCount: number;
  providers: ProviderRead[];
  busy: boolean;
  statusFilter: TxStatus | 'all';
  onStatusFilter: (v: TxStatus | 'all') => void;
  tranDate: string;
  onTranDate: (v: string) => void;
  onChangeProvider: (providerId: string) => void;
  onDelete: () => void;
  onChangeStatus: (status: TxStatus) => void;
  onChangeIds: (change: IdChange) => void;
  onCopyAsNewPlan: (newTid: number) => void;
  onReEstimate: (args: ReEstimateArgs) => void;
  onPrint: () => void;
  // Additional toolbar actions
  sortByTooth: boolean;
  onClearFilters: () => void;
  onSortByTooth: () => void;
  onReferTo: () => void;
  onPostToLedger: () => void;
  onSave: () => void;
  onNewAppt: () => void;
  onPreAuth: () => void;
  onDiscount: () => void;
  onTxCounselor: () => void;
}

type Panel = 'provider' | 'status' | 'ids' | 'reestimate' | null;

const btn =
  'rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40';
const primaryBtn = 'rounded bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-40';
const cancelBtn = 'rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100';
const menuItem = 'block w-full px-3 py-1.5 text-left font-medium text-slate-700 hover:bg-sky-50';
const field = 'h-7 rounded border border-slate-300 px-2 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500';
// Global CSS forces large !important padding on <select>, clipping the selected
// text in our compact h-7 selects. The `.tx-select` override (globals.css @layer
// base) restores compact padding.
const selectField = `${field} tx-select`;

export default function TxPlanToolbar(props: TxPlanToolbarProps) {
  const { selectedCount, providers, busy } = props;
  const [panel, setPanel] = useState<Panel>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const has = selectedCount > 0;

  // local form state for the inline bars
  const [provId, setProvId] = useState('');
  const [status, setStatus] = useState<TxStatus>('accepted');
  const [idChange, setIdChange] = useState<IdChange>({});
  const [newPlanTid, setNewPlanTid] = useState<number>(2);
  const [reTid, setReTid] = useState<number>(1);
  const [rePhase, setRePhase] = useState<string>('');
  const [reNewFees, setReNewFees] = useState(true);
  const [reNewBilling, setReNewBilling] = useState(false);

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));
  const close = () => setPanel(null);
  const runMenu = (fn: () => void) => {
    setMenuOpen(false);
    fn();
  };

  return (
    <div className="border border-slate-300 bg-slate-50">
      {/* Button row */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button className={btn} disabled={busy} onClick={props.onSave}>
          Save
        </button>
        <button className={btn} disabled={busy} onClick={() => toggle('provider')}>
          Provider
        </button>
        <button className={btn} disabled={busy} onClick={props.onDelete}>
          Delete
        </button>
        <button className={btn} disabled={busy} onClick={props.onClearFilters}>
          Clear All Filters
        </button>
        <button className={btn} disabled={busy} onClick={() => toggle('ids')}>
          Change IDs
        </button>
        <button className={btn} disabled={busy} onClick={() => toggle('reestimate')}>
          Re-Estimate
        </button>
        <button className={btn} disabled={busy} onClick={props.onNewAppt}>
          New Appt
        </button>
        <button className={btn} disabled={busy} onClick={props.onPreAuth}>
          Pre-Auth
        </button>

        {/* OTHER ACTIONS dropdown */}
        <div className="relative">
          <button
            className={`${btn} inline-flex items-center gap-1`}
            disabled={busy}
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            Other Actions
            <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8l5 5 5-5" />
            </svg>
          </button>
          {menuOpen && (
            <>
              {/* click-away backdrop */}
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 min-w-44 rounded border border-slate-200 bg-white py-1 text-xs shadow-lg" role="menu">
                <button className={menuItem} role="menuitem" onClick={() => runMenu(props.onDiscount)}>
                  Discount
                </button>
                <button className={menuItem} role="menuitem" onClick={() => runMenu(props.onTxCounselor)}>
                  TX Counselor
                </button>
                <button className={menuItem} role="menuitem" onClick={() => runMenu(props.onReferTo)}>
                  Refer To
                </button>
                <button className={menuItem} role="menuitem" onClick={() => runMenu(() => toggle('status'))}>
                  Change Status
                </button>
                <button className={menuItem} role="menuitem" onClick={() => runMenu(() => toggle('ids'))}>
                  Copy Selected
                </button>
                <button className={menuItem} role="menuitem" onClick={() => runMenu(props.onSortByTooth)}>
                  {props.sortByTooth ? '✓ ' : ''}Sort By Tooth Number
                </button>
              </div>
            </>
          )}
        </div>

        <button className={btn} disabled={busy} onClick={props.onPostToLedger}>
          Post to Ledger
        </button>
        <button className={btn} disabled={busy} onClick={props.onPrint}>
          Print
        </button>

        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            Tran Date
            <input type="date" className={field} value={props.tranDate} onChange={(e) => props.onTranDate(e.target.value)} />
          </label>
          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            Show
            <select
              className={selectField}
              value={props.statusFilter}
              onChange={(e) => props.onStatusFilter(e.target.value as TxStatus | 'all')}
            >
              <option value="all">All statuses</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          {has && <span className="text-[11px] font-semibold text-sky-700">{selectedCount} selected</span>}
        </div>
      </div>

      {/* Inline action bars */}
      {panel === 'provider' && (
        <div className="flex flex-wrap items-end gap-3 border-t border-slate-200 bg-white px-3 py-2">
          <span className="text-xs font-semibold text-slate-600">Set provider on {selectedCount} selected:</span>
          <select className={`${selectField} w-56`} value={provId} onChange={(e) => setProvId(e.target.value)}>
            <option value="">— Select provider —</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.short_id ? `${p.short_id} : ${p.name}` : p.name}
              </option>
            ))}
          </select>
          <button
            className={primaryBtn}
            disabled={!provId || busy}
            onClick={() => {
              props.onChangeProvider(provId);
              close();
            }}
          >
            Change
          </button>
          <button className={cancelBtn} onClick={close}>
            Cancel
          </button>
        </div>
      )}

      {panel === 'status' && (
        <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 bg-white px-3 py-2">
          <span className="text-xs font-semibold text-slate-600">Status:</span>
          {STATUS_ORDER.map((s) => (
            <label key={s} className="flex items-center gap-1 text-xs text-slate-700">
              <input type="radio" name="tx-status" checked={status === s} onChange={() => setStatus(s)} />
              {STATUS_LABEL[s]}
            </label>
          ))}
          <button
            className={primaryBtn}
            disabled={busy}
            onClick={() => {
              props.onChangeStatus(status);
              close();
            }}
          >
            Change
          </button>
          <button className={cancelBtn} onClick={close}>
            Cancel
          </button>
        </div>
      )}

      {panel === 'ids' && (
        <div className="flex flex-col gap-2 border-t border-slate-200 bg-white px-3 py-2">
          <div className="flex flex-wrap items-end gap-3">
            <span className="text-xs font-semibold text-slate-600">Change selected treatment&apos;s:</span>
            <label className="flex flex-col gap-0.5 text-[11px] font-semibold text-slate-600">
              Tx Plan ID
              <input
                type="number"
                min={1}
                className={`${field} w-20`}
                placeholder="—"
                value={idChange.tid ?? ''}
                onChange={(e) => setIdChange((c) => ({ ...c, tid: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </label>
            <label className="flex flex-col gap-0.5 text-[11px] font-semibold text-slate-600">
              Phase ID
              <input
                type="number"
                min={1}
                className={`${field} w-20`}
                placeholder="—"
                value={idChange.phase ?? ''}
                onChange={(e) => setIdChange((c) => ({ ...c, phase: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </label>
            <label className="flex flex-col gap-0.5 text-[11px] font-semibold text-slate-600">
              Order ID
              <input
                type="number"
                min={1}
                className={`${field} w-20`}
                placeholder="—"
                value={idChange.order ?? ''}
                onChange={(e) => setIdChange((c) => ({ ...c, order: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </label>
            <button
              className={primaryBtn}
              disabled={!has || busy || (idChange.tid == null && idChange.phase == null && idChange.order == null)}
              onClick={() => {
                props.onChangeIds(idChange);
                setIdChange({});
                close();
              }}
            >
              Change
            </button>
            <button className={cancelBtn} onClick={close}>
              Cancel
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3 border-t border-dashed border-slate-200 pt-2">
            <span className="text-xs font-semibold text-slate-600">Copy selected as new plan:</span>
            <label className="flex flex-col gap-0.5 text-[11px] font-semibold text-slate-600">
              New Tx Plan ID
              <input
                type="number"
                min={1}
                className={`${field} w-20`}
                value={newPlanTid}
                onChange={(e) => setNewPlanTid(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
            <button
              className="rounded bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
              disabled={!has || busy}
              onClick={() => {
                props.onCopyAsNewPlan(newPlanTid);
                close();
              }}
            >
              Copy Plan
            </button>
          </div>
        </div>
      )}

      {panel === 'reestimate' && (
        <div className="flex flex-wrap items-end gap-3 border-t border-slate-200 bg-white px-3 py-2">
          <label className="flex flex-col gap-0.5 text-[11px] font-semibold text-slate-600">
            Tx Plan ID <span className="text-red-500">*</span>
            <input type="number" min={1} className={`${field} w-20`} value={reTid} onChange={(e) => setReTid(Math.max(1, Number(e.target.value) || 1))} />
          </label>
          <label className="flex flex-col gap-0.5 text-[11px] font-semibold text-slate-600">
            Phase ID
            <input type="number" min={1} className={`${field} w-20`} placeholder="all" value={rePhase} onChange={(e) => setRePhase(e.target.value)} />
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-700">
            <input type="checkbox" checked={reNewFees} onChange={(e) => setReNewFees(e.target.checked)} />
            Use New Fees
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-700">
            <input type="checkbox" checked={reNewBilling} onChange={(e) => setReNewBilling(e.target.checked)} />
            Use New Billing Order
          </label>
          <button
            className={primaryBtn}
            disabled={busy}
            onClick={() => {
              props.onReEstimate({
                tid: reTid,
                phase: rePhase.trim() ? Number(rePhase) : null,
                use_new_fees: reNewFees,
                use_new_billing_order: reNewBilling,
              });
              close();
            }}
          >
            Re-Estimate
          </button>
          <button className={cancelBtn} onClick={close}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
