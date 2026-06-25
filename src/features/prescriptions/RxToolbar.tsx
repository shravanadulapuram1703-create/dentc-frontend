// Prescription footer toolbar (legacy M11 button row):
//   Strike-off | Quick Print (All today's Rx) | Print ▾ | Add New | Save | Cancel | ePrescribe
//
// Print ▾ offers the legacy three choices: highlighted item / checked items /
// all of today's Rx. ePrescribe is gated on a DoseSpot subscription.

import { useState } from 'react';
import { Ban, Printer, Plus, Save, X, Send, ChevronDown, Zap } from 'lucide-react';

interface Props {
  mode: 'add' | 'view' | 'empty';
  canStrikeOff: boolean;
  canSave: boolean;
  hasChecked: boolean;
  hasSelected: boolean;
  saving: boolean;
  ePrescribeEnabled: boolean;
  onStrikeOff: () => void;
  onQuickPrint: () => void;
  onPrintHighlighted: () => void;
  onPrintChecked: () => void;
  onPrintToday: () => void;
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
  const [printOpen, setPrintOpen] = useState(false);
  const adding = props.mode === 'add';

  const pick = (fn: () => void) => () => {
    setPrintOpen(false);
    fn();
  };

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

      <button className={neutral} onClick={props.onQuickPrint} title="Print all of today's prescriptions">
        <Zap className="h-4 w-4" /> Quick Print
      </button>

      <div className="relative">
        <button className={neutral} onClick={() => setPrintOpen((o) => !o)}>
          <Printer className="h-4 w-4" /> Print <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {printOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setPrintOpen(false)} />
            <div className="absolute bottom-full left-0 z-20 mb-1 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
              <button
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 disabled:opacity-40"
                disabled={!props.hasSelected}
                onClick={pick(props.onPrintHighlighted)}
              >
                The highlighted item
              </button>
              <button
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 disabled:opacity-40"
                disabled={!props.hasChecked}
                onClick={pick(props.onPrintChecked)}
              >
                Only the checked items
              </button>
              <button
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                onClick={pick(props.onPrintToday)}
              >
                All entered today
              </button>
            </div>
          </>
        )}
      </div>

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
