// Periodontal chart print — the legacy Denticon "Periodontal Examination Record".
//
// The backend exposes no perio print/report endpoint (gap PERIO-BE-10), so the
// selected exam is rendered client-side with jsPDF onto a landscape letter sheet
// that mirrors the legacy report: a Patient / Provider header, then one block per
// arch with a measurement band above and below the tooth-number row.
//
// Row order, surface offsets, the derived CAL row and the warning-threshold
// colouring all come from the same model `PerioGrid` renders from, so the sheet
// is a faithful copy of what is on screen — which is what makes it acceptable to
// attach to an insurance claim.

import jsPDF from 'jspdf';
import type { OfficeRead, PatientRead, PerioExamRead, ProviderRead } from '@/api/generated/model';
import { toothLabel, type NumberingSystem } from '@/features/restorative/numbering';
import { isPrimaryId } from '@/features/restorative/dentition';
import { examDateLabel } from './perioService';
import {
  MEASURES,
  FACIAL_ROWS,
  LINGUAL_ROWS,
  SITES_PER_SURFACE,
  boolAt,
  numAt,
  type MeasureType,
  type PerioDetailDraft,
} from './perioModel';

// ---- Inputs ---------------------------------------------------------------

export interface PerioPrintHeader {
  patient: { name: string; account: string; addressLines: string[]; dob: string };
  provider: { name: string; addressLines: string[]; taxId: string; license: string };
  /** Display-formatted exam date (M/D/YYYY). */
  examDate: string;
  notes: string;
  /** "Charted by <user> on <date>" attribution line, or ''. */
  chartedBy: string;
  voided: boolean;
}

export interface PerioPrintChart {
  maxTeeth: string[];
  mandTeeth: string[];
  getDraft: (tooth: string) => PerioDetailDraft | undefined;
  numberingSystem: NumberingSystem;
  showMgj: boolean;
  showLingual: boolean;
  pdWarn: number;
  calWarn: number;
}

// ---- Header assembly ------------------------------------------------------

interface Addressable {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

function addressLines(a: Addressable | undefined): string[] {
  if (!a) return [];
  const street = [a.address_line1, a.address_line2].filter(Boolean).join(', ');
  const region = [a.city, [a.state, a.zip].filter(Boolean).join(' ').trim()].filter(Boolean).join(', ');
  return [street, region].filter((l) => l.trim() !== '');
}

/**
 * Compose the report header from the canonical records.
 *
 * A perio exam carries no provider of its own (backend gap PERIO-BE-14), so the
 * "Provider" block resolves to the patient's preferred provider and falls back
 * to the office's billing provider — and the provider's own address falls back
 * to the office address, which is what most tenants actually have populated.
 */
export function perioPrintHeader(args: {
  exam: PerioExamRead;
  patient: PatientRead | undefined;
  /** Display name / DOB already resolved by the patient shell. */
  patientName: string;
  patientDob: string;
  office: OfficeRead | undefined;
  provider: ProviderRead | undefined;
  /** Display name for `provider`, resolved by the caller's provider directory. */
  providerName: string;
}): PerioPrintHeader {
  const { exam, patient, office, provider } = args;

  const who = exam.updated_by_name || exam.created_by_name || '';
  const when = exam.updated_at || exam.created_at;
  const chartedBy = who
    ? `Charted by ${who}${when ? ` on ${new Date(when).toLocaleDateString('en-US')}` : ''}`
    : '';

  const provAddr = addressLines(provider);

  return {
    patient: {
      name: args.patientName,
      account: patient?.chart_no || (patient ? String(patient.id) : ''),
      addressLines: addressLines(patient),
      dob: args.patientDob,
    },
    provider: {
      name: args.providerName || office?.name || '',
      addressLines: provAddr.length ? provAddr : addressLines(office),
      taxId: provider?.tax_id || office?.tax_id || '',
      license: provider?.license || '',
    },
    examDate: examDateLabel(exam.exam_date),
    notes: exam.notes || '',
    chartedBy,
    voided: !!exam.is_voided,
  };
}

// ---- Geometry / palette ---------------------------------------------------

const PAGE = { w: 792, h: 612 };
const MARGIN = 18;
const ARCH_LABEL_W = 12;
const SURF_LABEL_W = 11;
const ROW_LABEL_W = 74;
const GRID_X = MARGIN + ARCH_LABEL_W + SURF_LABEL_W + ROW_LABEL_W;
const GRID_W = PAGE.w - MARGIN - GRID_X;
const HEADER_BOTTOM = 96; // y of the rule under the header block
const CHART_TOP = HEADER_BOTTOM + 14;
const CHART_BOTTOM = PAGE.h - 52; // leaves room for legend / notes / footer
const ARCH_GAP = 10;
const MAX_ROW_H = 12.6;

const NAVY: [number, number, number] = [31, 78, 121];
const LABEL_BG: [number, number, number] = [241, 245, 249];
const SURF_BG: [number, number, number] = [226, 232, 240];
const LINE: [number, number, number] = [176, 184, 192];
const DERIVED_BG: [number, number, number] = [248, 250, 252];
const WARN: [number, number, number] = [200, 30, 30];
const BLEED: [number, number, number] = [200, 30, 30];
const SUPP: [number, number, number] = [190, 130, 10];
const MUTED: [number, number, number] = [100, 116, 139];

interface Band {
  rows: MeasureType[];
  /** 0 = facial sites (0–2), 3 = lingual sites (3–5). */
  siteOffset: number;
  label: string;
}

interface ArchSpec {
  label: string;
  teeth: string[];
  bands: Band[];
  /** How many bands are drawn above the tooth-number row. */
  toothRowAfter: number;
}

const FACIAL_SITES = 0;
const LINGUAL_SITES = SITES_PER_SURFACE;

/**
 * Band layout per arch, matching `PerioGrid`: the band above the tooth numbers
 * always uses the `FACIAL_ROWS` order and the one below is the mirror, while the
 * SURFACE each band reads flips between arches so the facial bands face outward
 * (maxillary facial on top, mandibular facial on the bottom).
 *
 * With the lingual bands hidden only the facial band survives, and the
 * tooth-number row stays on the arch's inner edge — below it for the maxilla,
 * above it for the mandible — which is why the row position is carried
 * explicitly rather than assumed to sit after the first band.
 */
function archSpecs(chart: PerioPrintChart): ArchSpec[] {
  const rows = (order: MeasureType[]) => order.filter((m) => chart.showMgj || m !== 'MGJ');

  const maxillary: Band[] = [
    { rows: rows(FACIAL_ROWS), siteOffset: FACIAL_SITES, label: 'Facial' },
    ...(chart.showLingual ? [{ rows: rows(LINGUAL_ROWS), siteOffset: LINGUAL_SITES, label: 'Lingual' }] : []),
  ];
  const mandibular: Band[] = [
    ...(chart.showLingual ? [{ rows: rows(FACIAL_ROWS), siteOffset: LINGUAL_SITES, label: 'Lingual' }] : []),
    { rows: rows(LINGUAL_ROWS), siteOffset: FACIAL_SITES, label: 'Facial' },
  ];

  return [
    { label: 'Maxillary', teeth: chart.maxTeeth, bands: maxillary, toothRowAfter: 1 },
    { label: 'Mandibular', teeth: chart.mandTeeth, bands: mandibular, toothRowAfter: mandibular.length - 1 },
  ];
}

// ---- Drawing helpers ------------------------------------------------------

function cell(doc: jsPDF, x: number, y: number, w: number, h: number, fill?: [number, number, number]) {
  if (fill) {
    doc.setFillColor(...fill);
    doc.rect(x, y, w, h, 'FD');
  } else {
    doc.rect(x, y, w, h, 'S');
  }
}

function centered(doc: jsPDF, text: string, x: number, w: number, y: number, h: number) {
  doc.text(text, x + w / 2, y + h / 2 + 0.5, { align: 'center', baseline: 'middle' });
}

/** Vertical label (reads bottom-to-top) filling a tall, narrow column. */
function verticalLabel(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  bg: [number, number, number],
  color: [number, number, number],
  size: number,
) {
  doc.setFillColor(...bg);
  doc.rect(x, y, w, h, 'FD');
  doc.setFontSize(size).setTextColor(...color).setFont('helvetica', 'bold');
  doc.text(text, x + w / 2 + size / 3, y + h / 2, { angle: 90, align: 'center', baseline: 'alphabetic' });
  doc.setTextColor(0, 0, 0);
}

// ---- Header ---------------------------------------------------------------

function drawHeader(doc: jsPDF, h: PerioPrintHeader) {
  const line = (t: string, x: number, y: number) => doc.text(t, x, y);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold').setFontSize(13);
  line('Periodontal Examination Record', MARGIN, 36);

  doc.setFont('helvetica', 'normal').setFontSize(9);
  line('Exam Date :', MARGIN, 52);
  doc.setFont('helvetica', 'bold');
  line(h.examDate, MARGIN + 56, 52);
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED);
  if (h.chartedBy) line(h.chartedBy, MARGIN, 65);
  doc.setTextColor(0, 0, 0);

  // Patient / Provider columns.
  const px = 250;
  const vx = 520;
  doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...MUTED);
  line('Patient', px, 32);
  line('Provider', vx, 32);
  doc.setTextColor(0, 0, 0);

  doc.setFont('helvetica', 'bold').setFontSize(9);
  line(h.patient.name || '—', px, 46);
  line(h.provider.name || '—', vx, 46);

  doc.setFont('helvetica', 'normal').setFontSize(8);
  if (h.patient.account) line(`Account# : ${h.patient.account}`, 400, 46);

  const pAddr = h.patient.addressLines.slice(0, 2);
  pAddr.forEach((l, i) => line(doc.splitTextToSize(l, 140)[0], px, 58 + i * 11));
  const vAddr = h.provider.addressLines.slice(0, 2);
  vAddr.forEach((l, i) => line(doc.splitTextToSize(l, 200)[0], vx, 58 + i * 11));

  line(`DOB : ${h.patient.dob || '—'}`, px, 82);
  if (h.provider.taxId) line(`Tax ID : ${h.provider.taxId}`, vx, 82);
  if (h.provider.license) line(`License# : ${h.provider.license}`, vx + 110, 82);

  doc.setDrawColor(...LINE).setLineWidth(0.6);
  doc.line(MARGIN, HEADER_BOTTOM, PAGE.w - MARGIN, HEADER_BOTTOM);

  if (h.voided) {
    doc.setFont('helvetica', 'bold').setFontSize(48).setTextColor(220, 160, 160);
    doc.text('VOIDED', PAGE.w / 2, PAGE.h / 2, { align: 'center', baseline: 'middle', angle: 20 });
    doc.setTextColor(0, 0, 0);
  }
}

// ---- Chart ----------------------------------------------------------------

function drawArch(doc: jsPDF, arch: ArchSpec, chart: PerioPrintChart, top: number, rowH: number): number {
  const teeth = arch.teeth;
  const toothW = GRID_W / teeth.length;
  const siteW = toothW / SITES_PER_SURFACE;
  // Every band's rows plus the one tooth-number row.
  const archH = arch.bands.reduce((s, b) => s + b.rows.length * rowH, 0) + rowH;

  // Arch label spine.
  verticalLabel(doc, arch.label, MARGIN, top, ARCH_LABEL_W, archH, NAVY, [255, 255, 255], 7);

  const labelX = MARGIN + ARCH_LABEL_W + SURF_LABEL_W;
  let y = top;

  const drawBand = (band: Band, bandTop: number) => {
    verticalLabel(
      doc, band.label, MARGIN + ARCH_LABEL_W, bandTop, SURF_LABEL_W,
      band.rows.length * rowH, SURF_BG, MUTED, 6,
    );

    band.rows.forEach((measure, ri) => {
      const ry = bandTop + ri * rowH;
      const meta = MEASURES[measure];

      // Row label.
      doc.setDrawColor(...LINE).setLineWidth(0.3);
      cell(doc, labelX, ry, ROW_LABEL_W, rowH, LABEL_BG);
      doc.setFont('helvetica', 'normal').setFontSize(6.6).setTextColor(60, 72, 88);
      doc.text(meta.label, labelX + ROW_LABEL_W - 4, ry + rowH / 2 + 0.5, { align: 'right', baseline: 'middle' });
      doc.setTextColor(0, 0, 0);

      teeth.forEach((tooth, ti) => {
        const tx = GRID_X + ti * toothW;
        const draft = chart.getDraft(tooth);

        // Mobility is one value for the whole surface, spanning the tooth width.
        if (meta.kind === 'mobility') {
          cell(doc, tx, ry, toothW, rowH);
          const v = numAt(draft, measure, band.siteOffset);
          if (v != null) {
            doc.setFont('helvetica', 'normal').setFontSize(6.8);
            centered(doc, String(v), tx, toothW, ry, rowH);
          }
          return;
        }

        for (let s = 0; s < SITES_PER_SURFACE; s++) {
          const site = band.siteOffset + s;
          const cx = tx + s * siteW;
          cell(doc, cx, ry, siteW, rowH, meta.kind === 'derived' ? DERIVED_BG : undefined);

          if (meta.kind === 'bool') {
            if (!boolAt(draft, measure, site)) continue;
            doc.setFont('helvetica', 'bold').setFontSize(6.4);
            doc.setTextColor(...(measure === 'BLD' ? BLEED : SUPP));
            centered(doc, measure === 'BLD' ? 'B' : 'S', cx, siteW, ry, rowH);
            doc.setTextColor(0, 0, 0);
            continue;
          }

          const v = numAt(draft, measure, site);
          if (v == null) continue;
          const warn = measure === 'PD' ? chart.pdWarn : measure === 'CAL' ? chart.calWarn : Infinity;
          const isWarn = v >= warn;
          doc.setFont('helvetica', isWarn ? 'bold' : 'normal').setFontSize(6.8);
          if (isWarn) doc.setTextColor(...WARN);
          else if (meta.kind === 'derived') doc.setTextColor(...MUTED);
          centered(doc, String(v), cx, siteW, ry, rowH);
          doc.setTextColor(0, 0, 0);
        }
      });
    });
  };

  /** The navy tooth-number row the two bands mirror around. Returns the next y. */
  const drawToothRow = (ty: number): number => {
    doc.setDrawColor(...LINE).setLineWidth(0.3);
    cell(doc, MARGIN + ARCH_LABEL_W, ty, SURF_LABEL_W + ROW_LABEL_W, rowH, NAVY);
    doc.setFont('helvetica', 'normal').setFontSize(6.6).setTextColor(255, 255, 255);
    doc.text('Tooth number', labelX + ROW_LABEL_W - 4, ty + rowH / 2 + 0.5, { align: 'right', baseline: 'middle' });

    doc.setFont('helvetica', 'bold').setFontSize(7);
    teeth.forEach((tooth, ti) => {
      const tx = GRID_X + ti * toothW;
      cell(doc, tx, ty, toothW, rowH, NAVY);
      doc.setTextColor(255, 255, 255);
      const label = isPrimaryId(tooth) ? tooth : toothLabel(Number(tooth), chart.numberingSystem);
      centered(doc, label, tx, toothW, ty, rowH);
    });
    doc.setTextColor(0, 0, 0);
    return ty + rowH;
  };

  if (arch.toothRowAfter === 0) y = drawToothRow(y);

  arch.bands.forEach((band, bi) => {
    drawBand(band, y);
    y += band.rows.length * rowH;
    if (bi + 1 === arch.toothRowAfter) y = drawToothRow(y);
  });

  return top + archH;
}

function drawFooter(doc: jsPDF, header: PerioPrintHeader, chart: PerioPrintChart, chartBottom: number) {
  let y = chartBottom + 12;

  doc.setFont('helvetica', 'normal').setFontSize(6.6).setTextColor(...MUTED);
  const legend =
    'Pocket = probing depth (mm)   CAL = clinical attachment level (PD + FGM)   FGM = free gingival margin   ' +
    'MGJ = mucogingival junction   B = bleeding on probing   S = suppuration   ' +
    `Values in red: PD >= ${chart.pdWarn} mm, CAL >= ${chart.calWarn} mm`;
  doc.text(doc.splitTextToSize(legend, PAGE.w - MARGIN * 2)[0], MARGIN, y);
  doc.setTextColor(0, 0, 0);
  y += 12;

  if (header.notes) {
    doc.setFont('helvetica', 'bold').setFontSize(7.5);
    doc.text('Exam Notes:', MARGIN, y);
    doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(header.notes, PAGE.w - MARGIN * 2 - 56).slice(0, 2) as string[];
    wrapped.forEach((l, i) => doc.text(l, MARGIN + 56, y + i * 9));
  }

  doc.setFont('helvetica', 'normal').setFontSize(6.6).setTextColor(...MUTED);
  doc.text(`Printed ${new Date().toLocaleString('en-US')}`, MARGIN, PAGE.h - 14);
  doc.text(header.patient.name || '', PAGE.w / 2, PAGE.h - 14, { align: 'center' });
  doc.text('Page 1 of 1', PAGE.w - MARGIN, PAGE.h - 14, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

// ---- Entry points ---------------------------------------------------------

/** Build the one-page Periodontal Examination Record for the selected exam. */
export function buildPerioPdf(header: PerioPrintHeader, chart: PerioPrintChart): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'landscape' });
  const specs = archSpecs(chart);

  // One page, always: shrink the row pitch to whatever the two arches need
  // (hiding MGJ or the lingual bands simply gives the remaining rows more room,
  // capped so a short chart doesn't stretch into a poster).
  const totalRows = specs.reduce((s, a) => s + a.bands.reduce((n, b) => n + b.rows.length, 0) + 1, 0);
  const available = CHART_BOTTOM - CHART_TOP - ARCH_GAP;
  const rowH = Math.min(MAX_ROW_H, available / totalRows);

  drawHeader(doc, header);

  let y = CHART_TOP;
  for (const spec of specs) {
    y = drawArch(doc, spec, chart, y, rowH) + ARCH_GAP;
  }

  drawFooter(doc, header, chart, y - ARCH_GAP);
  return doc;
}

/** Open the browser print dialog on the exam record (Save-as-PDF included). */
export function printPerioExam(header: PerioPrintHeader, chart: PerioPrintChart): void {
  const doc = buildPerioPdf(header, chart);
  doc.autoPrint();
  const url = doc.output('bloburl');
  window.open(url, '_blank');
}
