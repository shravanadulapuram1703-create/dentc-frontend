import { Fragment } from 'react';
import { toothLabel, type NumberingSystem } from '@/features/restorative/numbering';
import { isPrimaryId } from '@/features/restorative/dentition';
import {
  MEASURES,
  FACIAL_ROWS,
  LINGUAL_ROWS,
  SITES_PER_SURFACE,
  boolAt,
  numAt,
  cellKey,
  type MeasureType,
  type Cell,
  type PerioDetailDraft,
} from './perioModel';

// The periodontal data-entry grid. One block per arch; each block has a band of
// measurement rows above and below the centre tooth-number row. A band's row
// ORDER is fixed by position (PD sits against the tooth numbers); the SURFACE it
// reads (facial sites 0–2 vs lingual sites 3–5) flips between arches so the
// facial bands face outward — the legacy "two arches facing each other" layout.

const LABEL_W = 86;
const TOOTH_MIN = 44; // min tooth column; columns grow as 1fr to fill the container
const SURF_W = 16;
const ROW_H = 19;

interface Props {
  maxTeeth: string[];
  mandTeeth: string[];
  getDraft: (tooth: string) => PerioDetailDraft | undefined;
  active: Cell | null;
  /** Selected measure — its rows get the green highlight across every band. */
  activeMeasure: MeasureType;
  numberingSystem: NumberingSystem;
  showMgj: boolean;
  showLingual: boolean;
  pdWarn: number;
  calWarn: number;
  readOnly?: boolean;
  onCellClick: (cell: Cell) => void;
  onToggleBool: (cell: Cell) => void;
}

export default function PerioGrid(props: Props) {
  const { maxTeeth, mandTeeth } = props;
  return (
    <div className="w-full select-none text-[10px] text-slate-700">
      {/* Maxillary: facial band on top (sites 0–2), lingual below (sites 3–5). */}
      <ArchBlock arch="Maxillary" teeth={maxTeeth} topOffset={0} bottomOffset={SITES_PER_SURFACE} {...props} />
      <div className="h-3" />
      {/* Mandibular: lingual band on top (sites 3–5), facial below (sites 0–2). */}
      <ArchBlock arch="Mandibular" teeth={mandTeeth} topOffset={SITES_PER_SURFACE} bottomOffset={0} {...props} />
    </div>
  );
}

interface ArchProps extends Props {
  arch: string;
  teeth: string[];
  topOffset: number;
  bottomOffset: number;
}

function ArchBlock(props: ArchProps) {
  const { arch, teeth, topOffset, bottomOffset, showLingual, numberingSystem } = props;
  const topIsFacial = topOffset === 0;
  // Show both bands unless lingual is hidden, in which case only the facial band remains.
  const showTop = topIsFacial || showLingual;
  const showBottom = !topIsFacial || showLingual;

  const colW = `${LABEL_W}px repeat(${teeth.length}, minmax(${TOOTH_MIN}px, 1fr))`;

  return (
    <div className="flex w-full">
      {/* Vertical arch label spanning the whole block. */}
      <div
        className="flex shrink-0 items-center justify-center bg-[#1f4e79] font-semibold tracking-wide text-white"
        style={{ width: 20, writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 9 }}
      >
        {arch}
      </div>

      <div className="min-w-0 flex-1">
        {showTop && (
          <Band
            {...props}
            rows={FACIAL_ROWS}
            siteOffset={topOffset}
            surfLabel={topIsFacial ? 'FACIAL' : 'LINGUAL'}
            colW={colW}
          />
        )}

        {/* Tooth-number row. */}
        <div className="flex w-full">
          <div style={{ width: SURF_W }} className="shrink-0" />
          <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: colW }}>
            <div className="border border-slate-300 bg-[#1f4e79]" />
            {teeth.map((t) => (
              <div
                key={t}
                className="flex items-center justify-center border border-slate-400 bg-[#1f4e79] font-semibold text-white"
                style={{ height: ROW_H }}
              >
                {isPrimaryId(t) ? t : toothLabel(Number(t), numberingSystem)}
              </div>
            ))}
          </div>
        </div>

        {showBottom && (
          <Band
            {...props}
            rows={LINGUAL_ROWS}
            siteOffset={bottomOffset}
            surfLabel={topIsFacial ? 'LINGUAL' : 'FACIAL'}
            colW={colW}
          />
        )}
      </div>
    </div>
  );
}

interface BandProps extends ArchProps {
  rows: MeasureType[];
  siteOffset: number;
  surfLabel: string;
  colW: string;
}

function Band(props: BandProps) {
  const { rows, surfLabel, colW, showMgj, teeth } = props;
  const visibleRows = rows.filter((m) => showMgj || m !== 'MGJ');

  return (
    <div className="flex w-full">
      {/* Vertical surface label (FACIAL / LINGUAL) spanning the band. */}
      <div
        className="flex shrink-0 items-center justify-center bg-slate-200 font-semibold tracking-wide text-slate-500"
        style={{ width: SURF_W, writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 8 }}
      >
        {surfLabel}
      </div>

      <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: colW }}>
        {visibleRows.map((measure) => (
          <Fragment key={measure}>
            <RowLabel measure={measure} highlight={measure === props.activeMeasure} />
            {teeth.map((tooth) => (
              <ToothCells key={tooth} {...props} measure={measure} tooth={tooth} />
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function RowLabel({ measure, highlight }: { measure: MeasureType; highlight: boolean }) {
  return (
    <div
      className="flex items-center border border-slate-200 px-2 font-medium"
      style={{ height: ROW_H, background: highlight ? '#bbf7d0' : '#f1f5f9', color: highlight ? '#166534' : '#475569' }}
    >
      {MEASURES[measure].label}
    </div>
  );
}

function ToothCells(props: BandProps & { measure: MeasureType; tooth: string; siteOffset: number }) {
  const { measure, tooth, siteOffset, getDraft, active, activeMeasure, pdWarn, calWarn, readOnly, onCellClick, onToggleBool } = props;
  const meta = MEASURES[measure];
  const draft = getDraft(tooth);
  // The green band follows the selected measure (all of its rows across every
  // arch/surface band light up), rather than being pinned to Pocket.
  const rowBg = measure === activeMeasure ? '#dcfce7' : undefined;

  // Mobility: a single value spanning the tooth's 3-site width.
  if (meta.kind === 'mobility') {
    const cell: Cell = { tooth, measure, site: siteOffset };
    const v = numAt(draft, measure, siteOffset);
    const isActive = active && cellKey(active) === cellKey(cell);
    return (
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onCellClick(cell)}
        className="w-full border border-slate-200 text-center disabled:cursor-default"
        style={{ height: ROW_H, background: isActive ? '#dbeafe' : rowBg, outline: isActive ? '2px solid #2563eb' : undefined }}
      >
        {v ?? ''}
      </button>
    );
  }

  // Value / bool / derived rows render 3 site sub-cells.
  return (
    <div className="flex" style={{ height: ROW_H, background: rowBg }}>
      {Array.from({ length: SITES_PER_SURFACE }, (_, i) => {
        const site = siteOffset + i;
        const cell: Cell = { tooth, measure, site };
        const isActive = !!active && cellKey(active) === cellKey(cell);

        if (meta.kind === 'bool') {
          const on = boolAt(draft, measure, site);
          const dot = measure === 'BLD' ? '#dc2626' : '#eab308';
          return (
            <button
              key={i}
              type="button"
              disabled={readOnly}
              onClick={() => onToggleBool(cell)}
              className="flex flex-1 items-center justify-center border border-slate-200 disabled:cursor-default"
              style={{ background: isActive ? '#dbeafe' : undefined }}
              title={MEASURES[measure].label}
            >
              {on ? <span className="inline-block h-2 w-2 rounded-full" style={{ background: dot }} /> : null}
            </button>
          );
        }

        // Numeric (PD / FGM / MGJ / FUR) or derived (CAL, read-only).
        const v = numAt(draft, measure, site);
        const warn = measure === 'PD' ? pdWarn : measure === 'CAL' ? calWarn : Infinity;
        const isWarn = v != null && v >= warn;
        const editable = meta.kind === 'value' && !readOnly;
        return (
          <button
            key={i}
            type="button"
            disabled={!editable && meta.kind !== 'derived'}
            onClick={() => editable && onCellClick(cell)}
            className="flex-1 border border-slate-200 text-center disabled:cursor-default"
            style={{
              background: isActive ? '#dbeafe' : meta.kind === 'derived' ? '#f8fafc' : undefined,
              outline: isActive ? '2px solid #2563eb' : undefined,
              color: isWarn ? '#dc2626' : meta.kind === 'derived' ? '#64748b' : undefined,
              fontWeight: isWarn ? 700 : undefined,
              cursor: editable ? 'pointer' : 'default',
            }}
          >
            {v ?? ''}
          </button>
        );
      })}
    </div>
  );
}
