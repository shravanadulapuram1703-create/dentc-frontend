// Prescription footer toolbar (legacy M11 button row):
//   Strike-off | Print All Prescription For Today | Print | Add New | Save | Cancel | ePrescribe
//
// "Print All Prescription For Today" is the legacy one-click path; "Print" opens
// the PRINT PRESCRIPTION dialog, where the same today-scope is one of three
// choices alongside the pre-printed-stock, drug-count and slip-width settings.
// ePrescribe is gated on a DoseSpot subscription.

import { Ban, Printer, Plus, Save, X, Send, CalendarCheck } from 'lucide-react';

interface Props {
  mode: 'add' | 'view' | 'empty';
  canStrikeOff: boolean;
  canSave: boolean;
  saving: boolean;
  ePrescribeEnabled: boolean;
  onStrikeOff: () => void;
  onPrintToday: () => void;
  onOpenPrintDialog: () => void;
  onAddNew: () => void;
  onSave: () => void;
  onCancel: () => void;
  onEprescribe: () => void;
}

const btn =
  'inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
const neutral = `${btn} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
const primary = `${btn} border-blue-600 bg-blue-600 text-white hover:bg-blue-700`;
const danger = `${btn} border-rose-300 bg-white text-rose-700 hover:bg-rose-50`;

export default function RxToolbar(props: Props) {
  const adding = props.mode === 'add';

  return (
    <div className="flex flex-wrap items-center gap-2 px-1 py-2">
      <button
        className={danger}
        disabled={!props.canStrikeOff}
        onClick={props.onStrikeOff}
        title="Strike-off the selected prescription (irreversible)"
      >
        <Ban className="h-4 w-4" /> Strike-off
      </button>

      <button
        className={neutral}
        onClick={props.onPrintToday}
        title="Print every prescription entered today"
      >
        <CalendarCheck className="h-4 w-4" /> Print All Prescription For Today
      </button>

      <button className={neutral} onClick={props.onOpenPrintDialog} title="Choose what to print">
        <Printer className="h-4 w-4" /> Print
      </button>

      <button className={neutral} onClick={props.onAddNew}>
        <Plus className="h-4 w-4" /> Add New
      </button>

      <div className="flex-1" />

      {adding && (
        <>
          <button className={primary} disabled={!props.canSave || props.saving} onClick={props.onSave}>
            <Save className="h-4 w-4" /> {props.saving ? 'Saving…' : 'Save'}
          </button>
          <button className={neutral} onClick={props.onCancel}>
            <X className="h-4 w-4" /> Cancel
          </button>
        </>
      )}

      <button
        className={neutral}
        disabled={!props.ePrescribeEnabled}
        onClick={props.onEprescribe}
        title={
          props.ePrescribeEnabled
            ? 'Open the electronic prescription application'
            : 'ePrescribe is only available with a DoseSpot subscription'
        }
      >
        <Send className="h-4 w-4" /> ePrescribe
      </button>
    </div>
  );
}
