// Prescription print (legacy Denticon M11 "Print" / "Print All Prescription For Today").
//
// There is no backend prescription print/export endpoint, so each prescription is
// rendered client-side with jsPDF as the legacy slip — one prescription per page,
// laid out from the coordinates of the legacy PDF so a script printed here drops
// onto the same pre-printed stock the practice already buys:
//
//   ┌──────────────────────────────────────────────┐
//   │ Cranberry Dental Arts      Prescriber : ...  │
//   │ 20215 Rt 19, Suite 100            Ph : ...   │
//   │ Cranberry Township, PA     DEA # :   NPI #:  │
//   │ Ph:  Fax:                  License # :       │
//   │ - - - - - - - - - - - - - - - - - - - - - -  │
//   │ Patient:: <name>              DOB : <dob>    │
//   │ Address: <lines>              Date : <date>  │
//   │                                              │
//   │ ℞  <drug name>                               │
//   │    Dispense - <qty>                          │
//   │    SIG - <sig>                               │
//   │    Refill - 0 (Zero) times                   │
//   │    Notes : <notes>                           │
//   │ ☐ DISPENSE AS WRITTEN.                       │
//   │ ☒ VOLUNTARY FORMULARY PERMITTED.             │
//   │                          ________________    │
//   │                       SIGNATURE OF PRESCRIBER│
//   └──────────────────────────────────────────────┘
//
// Exactly one of the two boxes is marked: `is_as_written` picks DISPENSE AS
// WRITTEN, otherwise substitution is permitted — which is how the legacy report
// encodes the field, and why it is a pair of boxes rather than one.

import jsPDF from 'jspdf';
import type { RxRow } from './rxModel';

// ---- Inputs ---------------------------------------------------------------

export interface RxPrintOffice {
  name: string;
  addressLine: string;
  cityStateZip: string;
  phone: string;
  fax: string;
}

export interface RxPrintPrescriber {
  name: string;
  phone: string;
  dea: string;
  npi: string;
  license: string;
}

export interface RxPrintPatient {
  name: string;
  /** Display-formatted DOB ("Jul 06 1995"). */
  dob: string;
  addressLines: string[];
}

/** One prescription plus the prescriber it resolves to. */
export interface RxSlip {
  rx: RxRow;
  prescriber: RxPrintPrescriber;
}

export type RxPrintSize = 'wide' | 'thin';

/** The legacy PRINT PRESCRIPTION dialog's settings. */
export interface RxPrintOptions {
  /** Stock already carries the practice letterhead — suppress the header block. */
  prePrintedForm: boolean;
  /** Print "Number of drugs prescribed : N" (N = slips in this run). */
  showDrugCount: boolean;
  size: RxPrintSize;
}

export const DEFAULT_RX_PRINT_OPTIONS: RxPrintOptions = {
  prePrintedForm: false,
  showDrugCount: false,
  size: 'wide',
};

// ---- Geometry -------------------------------------------------------------
// Every y is top-down on a 612×792 portrait page; every x is the legacy
// "wide" coordinate and passes through `sx()` so the thin slip is the same
// layout compressed toward the left edge.

const PAGE = { w: 612, h: 792 };
const SLIP = { x: 18, y: 14.5, w: 361.8, h: 398.2 };
const THIN_SCALE = 0.8;

const Y = {
  officeName: 25.3,
  officeAddr: 39.4,
  officeCity: 53.8,
  officePhone: 68.0,
  officeFax: 82.4,
  prescriber: 24.5,
  prescriberPhone: 38.9,
  deaNpi: 69.0,
  license: 82.4,
  dashed: 89.4,
  patient: 99.5,
  address: 114.9,
  addressLine: 9, // leading between the address lines
  drug: 153.6,
  rxGlyph: 156.7,
  dispense: 170.2,
  sig: 187.6,
  refill: 204.9,
  notes: 220.3,
  drugCount: 229.8,
  asWritten: 239.3,
  formulary: 252.1,
  signatureLine: 291.8,
  signatureLabel: 300.0,
  credit: 333.6,
} as const;

const X = {
  left: 20,
  officeValue: 43.3,
  labelRight: 73.6, // right edge the Patient:: / Address: labels align to
  fieldValue: 77.6,
  zip: 118.9,
  licenseLabel: 175.0,
  deaLabel: 140.4,
  prescriberLabel: 203.0,
  prescriberValue: 250.4,
  prescriberPhoneLabel: 231.3,
  npiLabel: 259.8,
  npiValue: 287.4,
  dobLabelRight: 242.8,
  dobValue: 246.8,
  body: 56.2,
  dispenseValue: 106.6,
  sigValue: 81.5,
  refillValue: 88.3,
  checkbox: 23.4,
  checkLabel: 39.8,
  glyph: 30.8,
  signatureFrom: 229.7,
  signatureTo: 359.3,
} as const;

const CHECKBOX = 10.05;

// ---- Formatting -----------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * "2026-08-20" → "Aug 20 2026", the legacy slip's date format. Read from the
 * date PARTS: `new Date("YYYY-MM-DD")` parses as UTC midnight and prints the
 * previous day in every negative-offset timezone.
 */
export function fmtSlipDate(value?: string | null): string {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  const month = MONTHS[Number(m[2]) - 1] ?? m[2];
  return `${month} ${m[3]} ${m[1]}`;
}

const NUMBER_WORDS = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six',
  'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
];

/** Legacy refill wording: "0 (Zero) times". */
export function refillText(refills?: number | null): string {
  const n = Number.isFinite(refills) ? Math.max(0, Math.trunc(refills as number)) : 0;
  const word = NUMBER_WORDS[n];
  return word ? `${n} (${word}) times` : `${n} times`;
}

// ---- Drawing --------------------------------------------------------------

interface Pen {
  /** Scale an x from the legacy wide layout onto the selected slip width. */
  sx: (x: number) => number;
  /** Scale a font size the same way, so a thin slip reads as a reduction. */
  fs: (pt: number) => number;
  k: number;
  width: number;
}

function pen(size: RxPrintSize): Pen {
  const k = size === 'thin' ? THIN_SCALE : 1;
  return {
    k,
    sx: (x) => SLIP.x + (x - SLIP.x) * k,
    fs: (pt) => pt * k,
    width: SLIP.w * k,
  };
}

function drawHeaderBlock(doc: jsPDF, p: Pen, office: RxPrintOffice, presc: RxPrintPrescriber) {
  const label = (t: string, x: number, y: number) => {
    doc.setFont('helvetica', 'normal').setFontSize(p.fs(8.5));
    doc.text(t, p.sx(x), y);
  };
  const value = (t: string, x: number, y: number) => {
    if (!t) return;
    doc.setFont('helvetica', 'normal').setFontSize(p.fs(9));
    doc.text(t, p.sx(x), y);
  };

  // Practice (left column).
  doc.setFont('helvetica', 'bold').setFontSize(p.fs(9));
  doc.text(office.name, p.sx(X.left), Y.officeName);
  value(office.addressLine, X.left, Y.officeAddr);
  value(office.cityStateZip, X.left, Y.officeCity);
  value('Ph: ', X.left, Y.officePhone);
  value(office.phone, X.officeValue, Y.officePhone);
  value('Fax: ', X.left, Y.officeFax);
  value(office.fax, X.officeValue, Y.officeFax);

  // Prescriber (right column).
  label('Prescriber :', X.prescriberLabel, Y.prescriber);
  value(presc.name, X.prescriberValue, Y.prescriber);
  label('Ph :', X.prescriberPhoneLabel, Y.prescriberPhone);
  value(presc.phone, X.prescriberValue, Y.prescriberPhone);
  label('DEA # :', X.deaLabel, Y.deaNpi);
  value(presc.dea, X.licenseLabel, Y.deaNpi);
  label('NPI #:', X.npiLabel, Y.deaNpi);
  value(presc.npi, X.npiValue, Y.deaNpi);
  label('License # :', 128.6, Y.license);
  value(presc.license, X.licenseLabel, Y.license);

  // Dashed rule closing the letterhead.
  doc.setDrawColor(0).setLineWidth(0.5);
  doc.setLineDashPattern([7, 4], 0);
  doc.line(p.sx(18), Y.dashed, p.sx(378), Y.dashed);
  doc.setLineDashPattern([], 0);
}

function drawPatientBlock(doc: jsPDF, p: Pen, patient: RxPrintPatient, dateText: string) {
  const label = (t: string, rightX: number, y: number) => {
    doc.setFont('helvetica', 'normal').setFontSize(p.fs(8.5));
    doc.text(t, p.sx(rightX), y, { align: 'right' });
  };
  // Values are confined to the legacy field boxes: the name/address column is
  // 125.6 wide and the DOB/Date column 122. Without the clamp a long street
  // address runs straight through the Date value on the right.
  const value = (t: string, x: number, y: number, boxW: number) => {
    doc.setFont('helvetica', 'normal').setFontSize(p.fs(8));
    if (!t) return;
    const [first] = doc.splitTextToSize(t, boxW * p.k) as string[];
    doc.text(first ?? t, p.sx(x), y);
  };
  const NAME_W = 125.6;
  const DATE_W = 122;

  label('Patient::', X.labelRight, Y.patient);
  value(patient.name, X.fieldValue, Y.patient, NAME_W);
  label('DOB :', X.dobLabelRight, Y.patient);
  value(patient.dob, X.dobValue, Y.patient, DATE_W);

  label('Address:', X.labelRight, Y.address);
  doc.setFont('helvetica', 'normal').setFontSize(p.fs(8));
  const addressLines = patient.addressLines
    .flatMap((l) => doc.splitTextToSize(l, NAME_W * p.k) as string[])
    .slice(0, 3);
  addressLines.forEach((l, i) => doc.text(l, p.sx(X.fieldValue), Y.address + i * Y.addressLine * p.k));

  label('Date :', X.dobLabelRight, Y.address);
  value(dateText, X.dobValue, Y.address, DATE_W);
}

/** The ℞ glyph: an R with a small x at its foot, exactly as the legacy draws it. */
function drawRxGlyph(doc: jsPDF, p: Pen) {
  doc.setFont('times', 'normal').setFontSize(p.fs(18));
  doc.text('R', p.sx(X.glyph), Y.rxGlyph);
  doc.setFontSize(p.fs(7));
  doc.text('X', p.sx(43.2), Y.rxGlyph + 2.4);
  doc.setFont('helvetica', 'normal');
}

function drawCheckbox(doc: jsPDF, p: Pen, y: number, marked: boolean) {
  const size = CHECKBOX * p.k;
  const x = p.sx(X.checkbox);
  doc.setDrawColor(0).setLineWidth(0.25);
  doc.rect(x, y, size, size, 'S');
  if (!marked) return;
  doc.setFont('times', 'normal').setFontSize(p.fs(7));
  doc.text('X', x + size / 2, y + size / 2, { align: 'center', baseline: 'middle' });
  doc.setFont('helvetica', 'normal');
}

function drawSlip(
  doc: jsPDF,
  slip: RxSlip,
  office: RxPrintOffice,
  patient: RxPrintPatient,
  opts: RxPrintOptions,
  drugCount: number,
) {
  const p = pen(opts.size);
  const { rx } = slip;
  const rightEdge = SLIP.x + p.width;

  if (!opts.prePrintedForm) {
    doc.setDrawColor(0).setLineWidth(0.4);
    doc.rect(SLIP.x, SLIP.y, p.width, SLIP.h, 'S');
    drawHeaderBlock(doc, p, office, slip.prescriber);
  }

  drawPatientBlock(doc, p, patient, fmtSlipDate(rx.rx_date));

  // ---- Rx body ----
  drawRxGlyph(doc, p);

  const bodyRight = rightEdge - 8;
  const bodyW = bodyRight - p.sx(X.body);

  // Drug name: one line, shrunk to fit rather than wrapped into the Dispense row.
  let drugSize = 9;
  doc.setFont('helvetica', 'bold');
  while (drugSize > 6.5) {
    doc.setFontSize(p.fs(drugSize));
    if (doc.getTextWidth(rx.drug_name) <= bodyW) break;
    drugSize -= 0.5;
  }
  doc.text(rx.drug_name, p.sx(X.body), Y.drug, { maxWidth: bodyW });
  doc.setFont('helvetica', 'normal').setFontSize(p.fs(9));

  doc.text('Dispense  - ', p.sx(X.body), Y.dispense);
  if (rx.dispense) doc.text(rx.dispense, p.sx(X.dispenseValue), Y.dispense, { maxWidth: bodyRight - p.sx(X.dispenseValue) });

  doc.text('SIG -', p.sx(X.body), Y.sig);
  if (rx.sig) {
    const sigLines = doc.splitTextToSize(rx.sig, bodyRight - p.sx(X.sigValue)).slice(0, 2) as string[];
    sigLines.forEach((l, i) => doc.text(l, p.sx(X.sigValue), Y.sig + i * p.fs(9)));
  }

  doc.text('Refill -', p.sx(X.body), Y.refill);
  doc.text(refillText(rx.refills), p.sx(X.refillValue), Y.refill);

  doc.text('Notes : ', p.sx(X.body), Y.notes);
  if (rx.notes) {
    const noteX = p.sx(X.body) + doc.getTextWidth('Notes : ');
    const noteLines = doc.splitTextToSize(rx.notes, bodyRight - noteX).slice(0, 2) as string[];
    noteLines.forEach((l, i) => doc.text(l, noteX, Y.notes + i * p.fs(9)));
  }

  // "Number of drugs prescribed" pushes the two boxes down so it can never
  // collide with them on a slip whose notes already wrapped.
  let shift = 0;
  if (opts.showDrugCount) {
    doc.setFontSize(p.fs(8));
    doc.text(`Number of drugs prescribed : ${drugCount}`, p.sx(X.body), Y.drugCount);
    shift = 11;
  }

  // ---- Substitution boxes ----
  doc.setFontSize(p.fs(8));
  drawCheckbox(doc, p, Y.asWritten - 8 + shift, !!rx.is_as_written);
  doc.text('DISPENSE AS WRITTEN.', p.sx(X.checkLabel), Y.asWritten + shift);
  drawCheckbox(doc, p, Y.formulary - 8 + shift, !rx.is_as_written);
  doc.text('VOLUNTARY FORMULARY PERMITTED.', p.sx(X.checkLabel), Y.formulary + shift);

  // ---- Signature ----
  doc.setDrawColor(0).setLineWidth(0.25);
  doc.line(p.sx(X.signatureFrom), Y.signatureLine, p.sx(X.signatureTo), Y.signatureLine);
  doc.setFontSize(p.fs(8));
  doc.text(
    'SIGNATURE OF PRESCRIBER',
    (p.sx(X.signatureFrom) + p.sx(X.signatureTo)) / 2,
    Y.signatureLabel,
    { align: 'center' },
  );

  if (!opts.prePrintedForm) {
    doc.setFontSize(p.fs(5)).setTextColor(90, 90, 90);
    doc.text('DentC', SLIP.x + p.width / 2, Y.credit, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }
}

// ---- Entry points ---------------------------------------------------------

/** Build the prescription PDF — one slip per page, in the order given. */
export function buildRxPdf(
  slips: RxSlip[],
  office: RxPrintOffice,
  patient: RxPrintPatient,
  opts: RxPrintOptions = DEFAULT_RX_PRINT_OPTIONS,
): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: [PAGE.w, PAGE.h] });
  slips.forEach((slip, i) => {
    if (i > 0) doc.addPage([PAGE.w, PAGE.h]);
    drawSlip(doc, slip, office, patient, opts, slips.length);
  });
  return doc;
}

/** Open the print/preview window for the given prescriptions. */
export function printPrescriptions(
  slips: RxSlip[],
  office: RxPrintOffice,
  patient: RxPrintPatient,
  opts: RxPrintOptions = DEFAULT_RX_PRINT_OPTIONS,
): void {
  if (!slips.length) return;
  const doc = buildRxPdf(slips, office, patient, opts);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}
