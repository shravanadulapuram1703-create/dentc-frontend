// Render an ADA Dental Claim Form (Version 2024) with jsPDF.
//
// The layout follows the front side of the 2024 paper form: the same section
// order, item numbers and captions, laid out on US Letter so Item 3 (payer
// name/address) sits in the #9 window-envelope position (rule A). Two modes:
//
//   "form"    draws the full form (boxes, captions, section bars) and the data —
//             printable on plain paper and mailable as-is;
//   "overlay" prints the data only, for offices that load pre-printed ADA
//             claim stock into the printer.
//
// Claims with more than 10 procedures are printed as several fully completed
// forms (rule E) — every page repeats the header/patient/provider blocks with
// its own Item 32 total.

import jsPDF from "jspdf";
import {
  MISSING_TEETH_BOTTOM,
  MISSING_TEETH_TOP,
  LINES_PER_FORM,
  adaMoney,
  chunkServiceLines,
  formatAddressLines,
  totalFee,
  type AdaAddressBlock,
  type AdaClaimForm,
  type AdaServiceLine,
} from "./adaClaimFormModel";

export type AdaRenderMode = "form" | "overlay";

export interface AdaRenderOptions {
  mode?: AdaRenderMode;
  /** Horizontal / vertical nudge (pt) for overlay alignment on pre-printed stock. */
  offset_x?: number;
  offset_y?: number;
  /** Append the form's reverse side (general instructions) as a final page. */
  include_instructions?: boolean;
}

/**
 * Item 30 abbreviations — the catalog nomenclature is long; the column is 194pt.
 * Applied before the font is shrunk, so most descriptions print whole.
 */
const DESCRIPTION_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/periodontal/gi, "perio"],
  [/radiographic images?/gi, "x-rays"],
  [/radiographic/gi, "x-ray"],
  [/comprehensive/gi, "compr."],
  [/evaluation/gi, "eval"],
  [/resin-based composite/gi, "composite"],
  [/porcelain\/ceramic/gi, "porc/ceramic"],
  [/permanent/gi, "perm."],
  [/primary/gi, "prim."],
  [/surfaces?/gi, "surf"],
  [/posterior/gi, "post."],
  [/anterior/gi, "ant."],
  [/maxillary/gi, "max."],
  [/mandibular/gi, "mand."],
  [/four or more/gi, "4+"],
  [/one to three/gi, "1–3"],
  [/per quadrant/gi, "/quad"],
  [/procedure/gi, "proc."],
  [/\s+-\s+/g, " - "],
];

export function abbreviateDescription(text: string): string {
  let t = text.trim();
  for (const [re, rep] of DESCRIPTION_ABBREVIATIONS) t = t.replace(re, rep);
  return t.replace(/\s{2,}/g, " ");
}

// ---------------------------------------------------------------------------
// Geometry (points, US Letter 612 × 792)
// ---------------------------------------------------------------------------
const X0 = 20;
const X1 = 592;
const W = X1 - X0; // 572
const SPLIT = X0 + 312; // left column 312pt, right column 260pt
const RW = X1 - SPLIT;

const GRAY: [number, number, number] = [110, 110, 110];
const BAR: [number, number, number] = [222, 222, 222];
const LINE: [number, number, number] = [90, 90, 90];

const LABEL_PT = 5.2;
const VALUE_PT = 7.6;
const BAR_H = 9;

class Canvas {
  constructor(
    readonly doc: jsPDF,
    readonly mode: AdaRenderMode,
    readonly dx: number,
    readonly dy: number,
  ) {}

  get full(): boolean {
    return this.mode === "form";
  }

  rect(x: number, y: number, w: number, h: number): void {
    if (!this.full) return;
    this.doc.setDrawColor(...LINE).setLineWidth(0.5).rect(x + this.dx, y + this.dy, w, h);
  }

  bar(x: number, y: number, w: number, title: string, note?: string): void {
    if (!this.full) return;
    const { doc } = this;
    doc.setFillColor(...BAR).rect(x + this.dx, y + this.dy, w, BAR_H, "F");
    doc.setDrawColor(...LINE).setLineWidth(0.5).rect(x + this.dx, y + this.dy, w, BAR_H);
    doc.setFont("helvetica", "bold").setFontSize(6.2).setTextColor(0);
    doc.text(title, x + this.dx + 3, y + this.dy + 6.6);
    if (note) {
      const tw = doc.getTextWidth(title);
      doc.setFont("helvetica", "normal").setFontSize(5);
      doc.text(note, x + this.dx + 5 + tw, y + this.dy + 6.6);
    }
  }

  label(x: number, y: number, text: string, opts: { size?: number; bold?: boolean } = {}): void {
    if (!this.full) return;
    this.doc
      .setFont("helvetica", opts.bold ? "bold" : "normal")
      .setFontSize(opts.size ?? LABEL_PT)
      .setTextColor(...GRAY);
    this.doc.text(text, x + this.dx + 2, y + this.dy + 5.6);
    this.doc.setTextColor(0);
  }

  /** Static explanatory text (consent paragraphs); wrapped to `w`. */
  paragraph(x: number, y: number, w: number, text: string, size = 5): number {
    if (!this.full) return y;
    this.doc.setFont("helvetica", "normal").setFontSize(size).setTextColor(0);
    const lines: string[] = this.doc.splitTextToSize(text, w - 4);
    this.doc.text(lines, x + this.dx + 2, y + this.dy + 5.4, { lineHeightFactor: 1.15 });
    return y + lines.length * size * 1.15 + 2;
  }

  fit(text: string, w: number): string {
    const { doc } = this;
    if (doc.getTextWidth(text) <= w) return text;
    let t = text;
    while (t.length > 1 && doc.getTextWidth(`${t}…`) > w) t = t.slice(0, -1);
    return `${t}…`;
  }

  /** Single-line value inside a box; baseline near the bottom edge. */
  value(
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    opts: { align?: "left" | "right" | "center"; size?: number; bold?: boolean; baseline?: number } = {},
  ): void {
    if (!text) return;
    const { doc } = this;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal").setFontSize(opts.size ?? VALUE_PT).setTextColor(0);
    const t = this.fit(text, w - 6);
    const by = y + this.dy + (opts.baseline ?? h - 3.6);
    if (opts.align === "right") doc.text(t, x + this.dx + w - 3, by, { align: "right" });
    else if (opts.align === "center") doc.text(t, x + this.dx + w / 2, by, { align: "center" });
    else doc.text(t, x + this.dx + 3, by);
  }

  /** Multi-line value block (name/address) under the caption. */
  lines(x: number, y: number, w: number, texts: string[], opts: { top?: number; leading?: number; size?: number } = {}): void {
    const { doc } = this;
    doc.setFont("helvetica", "normal").setFontSize(opts.size ?? VALUE_PT).setTextColor(0);
    const leading = opts.leading ?? 9;
    let by = y + this.dy + (opts.top ?? 14);
    for (const t of texts) {
      if (!t) continue;
      doc.text(this.fit(t, w - 6), x + this.dx + 3, by);
      by += leading;
    }
  }

  /** Checkbox with caption; `checked` prints an X. */
  check(x: number, y: number, caption: string, checked: boolean, opts: { size?: number } = {}): number {
    const { doc } = this;
    const box = 6;
    if (this.full) {
      doc.setDrawColor(...LINE).setLineWidth(0.5).rect(x + this.dx, y + this.dy, box, box);
      doc.setFont("helvetica", "normal").setFontSize(opts.size ?? LABEL_PT).setTextColor(0);
      doc.text(caption, x + this.dx + box + 2, y + this.dy + 5);
    }
    if (checked) {
      doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(0);
      doc.text("X", x + this.dx + box / 2, y + this.dy + 5.2, { align: "center" });
    }
    doc.setFont("helvetica", "normal").setFontSize(opts.size ?? LABEL_PT);
    return box + 2 + doc.getTextWidth(caption) + 6;
  }

  /** Fit a signature image (data URL) into a box, keeping its aspect ratio, bottom-left anchored. */
  image(data_url: string, x: number, y: number, w: number, h: number): void {
    if (!data_url) return;
    try {
      const props = this.doc.getImageProperties(data_url);
      const ratio = props.width && props.height ? props.width / props.height : 3;
      let iw = w;
      let ih = iw / ratio;
      if (ih > h) {
        ih = h;
        iw = ih * ratio;
      }
      const fmt = /^data:image\/png/i.test(data_url) ? "PNG" : "JPEG";
      this.doc.addImage(data_url, fmt, x + this.dx, y + this.dy + (h - ih), iw, ih);
    } catch {
      /* unreadable image (legacy SigString in signature_data) — leave the line for a wet signature */
    }
  }

  hline(x: number, y: number, w: number): void {
    if (!this.full) return;
    this.doc.setDrawColor(...LINE).setLineWidth(0.4).line(x + this.dx, y + this.dy, x + this.dx + w, y + this.dy);
  }
}

/** A captioned box with a single-line value. */
function box(
  c: Canvas,
  x: number,
  y: number,
  w: number,
  h: number,
  caption: string,
  text: string,
  opts: { align?: "left" | "right" | "center"; size?: number } = {},
): void {
  c.rect(x, y, w, h);
  c.label(x, y, caption);
  c.value(x, y, w, h, text, opts);
}

/** A captioned box holding a name + address block. */
function addressBox(c: Canvas, x: number, y: number, w: number, h: number, caption: string, block: AdaAddressBlock): void {
  c.rect(x, y, w, h);
  c.label(x, y, caption);
  const lines = formatAddressLines(block);
  const leading = Math.min(9.5, Math.max(7.5, (h - 16) / Math.max(1, lines.length)));
  c.lines(x, y, w, lines, { top: 15, leading });
}

/** Gender box — M / F / U checkboxes. */
function genderBox(c: Canvas, x: number, y: number, w: number, h: number, caption: string, gender: string): void {
  c.rect(x, y, w, h);
  c.label(x, y, caption);
  let cx = x + 4;
  const cy = y + h - 8.5;
  cx += c.check(cx, cy, "M", gender === "M") - 2;
  cx += c.check(cx, cy, "F", gender === "F") - 2;
  c.check(cx, cy, "U", gender === "U");
}

function relationshipBox(
  c: Canvas,
  x: number,
  y: number,
  w: number,
  h: number,
  caption: string,
  rel: string,
  captions: [string, string, string, string] = ["Self", "Spouse", "Dependent Child", "Other"],
): void {
  c.rect(x, y, w, h);
  c.label(x, y, caption);
  let cx = x + 4;
  const cy = y + h - 8.5;
  const keys = ["self", "spouse", "dependent", "other"];
  captions.forEach((cap, i) => {
    cx += c.check(cx, cy, cap, rel === keys[i]) - 1;
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function renderPage(c: Canvas, form: AdaClaimForm, lines: AdaServiceLine[], page: number, pages: number): void {
  const { doc } = c;

  // ---- Title ---------------------------------------------------------------
  if (c.full) {
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(0);
    doc.text("ADA", X0 + c.dx, 34 + c.dy);
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.text("American Dental Association®", X0 + 26 + c.dx, 34 + c.dy);
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("Dental Claim Form", X0 + 168 + c.dx, 34 + c.dy);
    doc.setFont("helvetica", "normal").setFontSize(6).setTextColor(...GRAY);
    doc.text("Version 2024", X1 + c.dx, 34 + c.dy, { align: "right" });
    doc.setTextColor(0);
  }

  // =========================== LEFT COLUMN ===================================
  const L = X0;
  const LW = SPLIT - X0;

  // Header information — Item 1 / 2
  c.bar(L, 42, LW, "HEADER INFORMATION");
  c.rect(L, 51, LW, 24);
  c.label(L, 51, "1. Type of Transaction (Mark all applicable boxes)");
  c.check(L + 6, 60, "Statement of Actual Services", form.transaction.actual_services);
  c.check(L + 118, 60, "Request for Predetermination/Preauthorization", form.transaction.predetermination);
  c.check(L + 6, 68, "EPSDT / Title XIX", form.transaction.epsdt);
  box(c, L, 75, LW, 16, "2. Predetermination/Preauthorization Number", form.predetermination_number);

  // Dental benefit plan information — Item 3 / 3a (window-envelope position)
  c.bar(L, 91, LW, "DENTAL BENEFIT PLAN INFORMATION");
  addressBox(c, L, 100, LW, 54, "3. Company/Plan Name, Address, City, State, Zip Code", form.payer);
  box(c, L, 154, LW, 16, "3a. Payer ID", form.payer.payer_id, { size: 7 });

  // Other coverage — Items 4–11a
  c.bar(L, 170, LW, "OTHER COVERAGE", "(Mark applicable box and complete Items 5–11. If none, leave blank.)");
  c.rect(L, 179, LW, 14);
  c.label(L, 179, "4.");
  const oc = form.other_coverage;
  c.check(L + 10, 183, "Dental?", oc.dental);
  c.check(L + 52, 183, "Medical?", oc.medical);
  c.label(L + 96, 179, "(If both, complete 5–11 for dental only.)");
  box(c, L, 193, LW, 20, "5. Name of Policyholder/Subscriber in #4 (Last, First, Middle Initial, Suffix)", oc.subscriber_name);
  box(c, L, 213, 96, 20, "6. Date of Birth (MM/DD/CCYY)", oc.dob);
  genderBox(c, L + 96, 213, 64, 20, "7. Gender", oc.gender);
  box(c, L + 160, 213, LW - 160, 20, "8. Policyholder/Subscriber ID (Assigned by Plan)", oc.subscriber_id);
  box(c, L, 233, 96, 20, "9. Plan/Group Number", oc.group_number);
  relationshipBox(c, L + 96, 233, LW - 96, 20, "10. Patient's Relationship to Person named in #5", oc.patient_relationship, [
    "Self",
    "Spouse",
    "Dependent",
    "Other",
  ]);
  addressBox(c, L, 253, LW, 42, "11. Other Insurance Company/Dental Benefit Plan Name, Address, City, State, Zip Code", oc.payer);
  box(c, L, 295, LW, 16, "11a. Other Payer ID", oc.payer.payer_id, { size: 7 });

  // =========================== RIGHT COLUMN ==================================
  const R = SPLIT;

  c.bar(R, 75, RW, "POLICYHOLDER/SUBSCRIBER INFORMATION", "(Assigned by Plan Named in #3)");
  addressBox(c, R, 84, RW, 58, "12. Policyholder/Subscriber Name (Last, First, Middle Initial, Suffix), Address, City, State, Zip Code", form.subscriber);
  box(c, R, 142, 88, 20, "13. Date of Birth (MM/DD/CCYY)", form.subscriber.dob);
  genderBox(c, R + 88, 142, 56, 20, "14. Gender", form.subscriber.gender);
  box(c, R + 144, 142, RW - 144, 20, "15. Policyholder/Subscriber ID (Assigned by Plan)", form.subscriber.subscriber_id);
  box(c, R, 162, 100, 20, "16. Plan/Group Number", form.subscriber.group_number);
  box(c, R + 100, 162, RW - 100, 20, "17. Employer Name", form.subscriber.employer_name);

  c.bar(R, 182, RW, "PATIENT INFORMATION");
  relationshipBox(c, R, 191, 192, 24, "18. Relationship to Policyholder/Subscriber in #12 Above", form.patient.relationship);
  c.rect(R + 192, 191, RW - 192, 24);
  c.label(R + 192, 191, "19. Reserved For");
  c.label(R + 192, 198, "Future Use");
  addressBox(c, R, 215, RW, 76, "20. Name (Last, First, Middle Initial, Suffix), Address, City, State, Zip Code", form.patient);
  box(c, R, 291, 88, 20, "21. Date of Birth (MM/DD/CCYY)", form.patient.dob);
  genderBox(c, R + 88, 291, 56, 20, "22. Gender", form.patient.gender);
  box(c, R + 144, 291, RW - 144, 20, "23. Patient ID/Account # (Assigned by Dentist)", form.patient.patient_id);

  // ====================== RECORD OF SERVICES PROVIDED ========================
  c.bar(X0, 311, W, "RECORD OF SERVICES PROVIDED");
  const cols: Array<{ w: number; cap: string[]; align?: "left" | "right" | "center" }> = [
    { w: 12, cap: [""] },
    { w: 58, cap: ["24. Procedure Date", "(MM/DD/CCYY)"], align: "center" },
    { w: 24, cap: ["25. Area", "of Oral", "Cavity"], align: "center" },
    { w: 22, cap: ["26.", "Tooth", "System"], align: "center" },
    { w: 66, cap: ["27. Tooth Number(s)", "or Letter(s)"], align: "center" },
    { w: 40, cap: ["28. Tooth", "Surface"], align: "center" },
    { w: 44, cap: ["29. Procedure", "Code"], align: "center" },
    { w: 30, cap: ["29a. Diag.", "Pointer"], align: "center" },
    { w: 24, cap: ["29b.", "Qty."], align: "center" },
    { w: 0, cap: ["30. Description"] },
    { w: 58, cap: ["31. Fee"], align: "right" },
  ];
  const fixed = cols.reduce((a, col) => a + col.w, 0);
  const descCol = cols[9];
  if (descCol) descCol.w = W - fixed;
  const HEAD_Y = 320;
  const HEAD_H = 20;
  const ROW_H = 12;
  let cx = X0;
  const colX: number[] = [];
  for (const col of cols) {
    colX.push(cx);
    c.rect(cx, HEAD_Y, col.w, HEAD_H);
    if (c.full) {
      doc.setFont("helvetica", "normal").setFontSize(4.8).setTextColor(0);
      const start = HEAD_Y + HEAD_H / 2 - (col.cap.length - 1) * 2.7 + 1.6;
      col.cap.forEach((t, i) => {
        if (col.align === "center" || col.align === "right") doc.text(t, cx + col.w / 2, start + i * 5.4, { align: "center" });
        else doc.text(t, cx + 2, start + i * 5.4);
      });
    }
    cx += col.w;
  }
  for (let r = 0; r < LINES_PER_FORM; r += 1) {
    const y = HEAD_Y + HEAD_H + r * ROW_H;
    const line = lines[r];
    cols.forEach((col, i) => {
      c.rect(colX[i] ?? X0, y, col.w, ROW_H);
    });
    if (c.full) c.value(X0, y, cols[0]?.w ?? 12, ROW_H, String(r + 1), { size: 5.2, align: "center" });
    if (!line) continue;
    const cellsText = [
      "",
      line.procedure_date,
      line.area_of_oral_cavity,
      line.tooth_system,
      line.tooth_numbers,
      line.tooth_surface,
      line.procedure_code,
      line.diagnosis_pointer,
      line.quantity,
      line.description,
      adaMoney(line.fee),
    ];
    cellsText.forEach((t, i) => {
      const col = cols[i];
      const x = colX[i];
      if (i === 0 || !col || x == null) return;
      if (i === 9) {
        // Item 30: abbreviate, then shrink the font before truncating (UI-20).
        const text = abbreviateDescription(t);
        let size = 7;
        doc.setFont("helvetica", "normal").setFontSize(size);
        while (size > 5.4 && doc.getTextWidth(text) > col.w - 6) {
          size -= 0.4;
          doc.setFontSize(size);
        }
        c.value(x, y, col.w, ROW_H, text, { size, align: col.align, baseline: ROW_H - 3.6 });
        return;
      }
      c.value(x, y, col.w, ROW_H, t, { size: 7, align: col.align });
    });
  }

  // ---- Items 33 / 34 / 34a / 31a / 32 -------------------------------------------
  const MT_Y = HEAD_Y + HEAD_H + LINES_PER_FORM * ROW_H; // 460
  const MT_H = 36;
  c.rect(X0, MT_Y, LW, MT_H);
  c.label(X0, MT_Y, '33. Missing Teeth Information (Place an "X" on each missing tooth.)');
  const missing = new Set(form.missing_teeth);
  const cellW = (LW - 12) / 16;
  const drawTeeth = (row: string[], by: number) => {
    row.forEach((t, i) => {
      const tx = X0 + 6 + i * cellW + cellW / 2;
      if (c.full) {
        doc.setFont("helvetica", "normal").setFontSize(5.6).setTextColor(0);
        doc.text(t, tx + c.dx, by + c.dy, { align: "center" });
      }
      if (missing.has(t)) {
        doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(0);
        doc.text("X", tx + c.dx, by + 1.2 + c.dy, { align: "center" });
      }
    });
  };
  drawTeeth(MISSING_TEETH_TOP, MT_Y + 17);
  drawTeeth(MISSING_TEETH_BOTTOM, MT_Y + 29);

  const DX_X = SPLIT;
  const DX_W = RW - 60;
  c.rect(DX_X, MT_Y, DX_W, 18);
  c.label(DX_X, MT_Y, "34. Diagnosis Code List Qualifier");
  c.rect(DX_X + 112, MT_Y + 4, 20, 10);
  c.value(DX_X + 112, MT_Y + 4, 20, 10, form.diagnosis_code_list_qualifier, { align: "center", size: 7, baseline: 8 });
  c.label(DX_X + 134, MT_Y + 5, "( ICD-10 = AB )");
  c.rect(DX_X, MT_Y + 18, DX_W, 18);
  c.label(DX_X, MT_Y + 18, "34a. Diagnosis Code(s)");
  c.label(DX_X, MT_Y + 25, "(Primary diagnosis in \"A\")");
  const dxCol = DX_X + 74;
  const dxW = (DX_W - 76) / 2;
  const dxLetters = ["A", "B", "C", "D"];
  form.diagnosis_codes.forEach((code, i) => {
    const colIdx = i % 2;
    const rowIdx = Math.floor(i / 2);
    const lx = dxCol + colIdx * dxW;
    const ly = MT_Y + 18 + rowIdx * 9;
    c.label(lx, ly, `${dxLetters[i]}.`);
    c.hline(lx + 8, ly + 8, dxW - 12);
    c.value(lx + 8, ly, dxW - 12, 9, code, { size: 7, baseline: 7.2 });
  });

  const FEE_X = X1 - 60;
  box(c, FEE_X, MT_Y, 60, 18, "31a. Other Fee(s)", form.other_fees == null ? "" : adaMoney(form.other_fees), { align: "right", size: 7 });
  const pageTotal = totalFee(lines, page === 1 ? form.other_fees : null);
  box(c, FEE_X, MT_Y + 18, 60, 18, "32. Total Fee", adaMoney(pageTotal), { align: "right", size: 7.6 });

  // ---- Item 35 remarks ----------------------------------------------------------
  const RM_Y = MT_Y + MT_H; // 496
  c.rect(X0, RM_Y, W, 22);
  c.label(X0, RM_Y, "35. Remarks");
  const remarks = pages > 1 ? `${form.remarks} (Form ${page} of ${pages})`.trim() : form.remarks;
  if (remarks) {
    doc.setFont("helvetica", "normal").setFontSize(6.4).setTextColor(0);
    const rl: string[] = doc.splitTextToSize(remarks, W - 70);
    doc.text(rl.slice(0, 2), X0 + 46 + c.dx, RM_Y + 8.5 + c.dy, { lineHeightFactor: 1.2 });
  }

  // ====================== AUTHORIZATIONS / ANCILLARY ==========================
  const AU_Y = RM_Y + 22; // 518
  c.bar(X0, AU_Y, LW, "AUTHORIZATIONS");
  c.bar(SPLIT, AU_Y, RW, "ANCILLARY CLAIM/TREATMENT INFORMATION", "(all dates in MM/DD/CCYY format)");

  // Item 36
  const A36_Y = AU_Y + BAR_H; // 527
  c.rect(X0, A36_Y, LW, 58);
  c.paragraph(
    X0,
    A36_Y + 1,
    LW,
    "36. I have been informed of the treatment plan and associated fees. I agree to be responsible for all charges for dental services and materials not paid by my dental benefit plan, unless prohibited by law, or the treating dentist or dental practice has a contractual agreement with my plan prohibiting all or a portion of such charges. To the extent permitted by law, I consent to your use and disclosure of my protected health information to carry out payment activities in connection with this claim.",
  );
  c.label(X0, A36_Y + 42, "X", { size: 8 });
  c.hline(X0 + 12, A36_Y + 49, LW - 100);
  c.hline(X0 + LW - 84, A36_Y + 49, 80);
  c.label(X0 + 10, A36_Y + 50, "Patient/Guardian Signature");
  c.label(X0 + LW - 84, A36_Y + 50, "Date");
  if (form.authorizations.patient_signature_image) {
    c.image(form.authorizations.patient_signature_image, X0 + 14, A36_Y + 36, LW - 104, 12.5);
    c.value(X0 + LW - 84, A36_Y + 36, 80, 12, form.authorizations.patient_signature_date, { size: 7.6 });
  } else if (form.authorizations.patient_signature_on_file) {
    c.value(X0 + 12, A36_Y + 36, LW - 100, 12, "Signature on File", { size: 7.6 });
    c.value(X0 + LW - 84, A36_Y + 36, 80, 12, form.authorizations.patient_signature_date, { size: 7.6 });
  }

  // Item 37
  const A37_Y = A36_Y + 58; // 585
  c.rect(X0, A37_Y, LW, 38);
  c.paragraph(
    X0,
    A37_Y + 1,
    LW,
    "37. I hereby authorize and direct payment of the dental benefits otherwise payable to me, directly to the below named dentist or dental entity.",
  );
  c.label(X0, A37_Y + 22, "X", { size: 8 });
  c.hline(X0 + 12, A37_Y + 29, LW - 100);
  c.hline(X0 + LW - 84, A37_Y + 29, 80);
  c.label(X0 + 10, A37_Y + 30, "Subscriber Signature");
  c.label(X0 + LW - 84, A37_Y + 30, "Date");
  if (form.authorizations.subscriber_signature_image) {
    c.image(form.authorizations.subscriber_signature_image, X0 + 14, A37_Y + 16, LW - 104, 12.5);
    c.value(X0 + LW - 84, A37_Y + 16, 80, 12, form.authorizations.subscriber_signature_date, { size: 7.6 });
  } else if (form.authorizations.subscriber_signature_on_file) {
    c.value(X0 + 12, A37_Y + 16, LW - 100, 12, "Signature on File", { size: 7.6 });
    c.value(X0 + LW - 84, A37_Y + 16, 80, 12, form.authorizations.subscriber_signature_date, { size: 7.6 });
  }

  // Ancillary — Items 38–47
  const an = form.ancillary;
  const AN_Y = AU_Y + BAR_H; // 527
  c.rect(R, AN_Y, 120, 24);
  c.label(R, AN_Y, "38. Place of Treatment");
  c.label(R, AN_Y + 6, '(Use "Place of Service Codes for Professional Claims")');
  c.rect(R + 6, AN_Y + 13.5, 20, 9);
  c.value(R + 6, AN_Y + 13.5, 20, 9, an.place_of_treatment, { align: "center", size: 7.4, baseline: 7.4 });
  c.label(R + 28, AN_Y + 14, "(e.g. 11=office; 22=O/P Hospital)");
  c.rect(R + 120, AN_Y, RW - 120, 12);
  c.label(R + 120, AN_Y, "39. Enclosures (Y or N)");
  c.value(R + 120, AN_Y, RW - 120, 12, an.enclosures, { align: "right", size: 7.6 });
  c.rect(R + 120, AN_Y + 12, RW - 120, 12);
  c.label(R + 120, AN_Y + 12, "39a. Date Last SRP");
  c.value(R + 120, AN_Y + 12, RW - 120, 12, an.date_last_srp, { align: "right", size: 7.4 });

  const A40_Y = AN_Y + 24; // 551
  c.rect(R, A40_Y, 130, 18);
  c.label(R, A40_Y, "40. Is Treatment for Orthodontics?");
  c.check(R + 6, A40_Y + 9, "No (Skip 41-42)", an.is_orthodontics === false);
  c.check(R + 66, A40_Y + 9, "Yes (Complete 41-42)", an.is_orthodontics === true);
  box(c, R + 130, A40_Y, RW - 130, 18, "41. Date Appliance Placed (MM/DD/CCYY)", an.appliance_placed_date);

  const A42_Y = A40_Y + 18; // 569
  box(c, R, A42_Y, 70, 18, "42. Months of Treatment", an.months_of_treatment, { align: "center" });
  c.rect(R + 70, A42_Y, 92, 18);
  c.label(R + 70, A42_Y, "43. Replacement of Prosthesis");
  c.check(R + 74, A42_Y + 9, "No", an.replacement_of_prosthesis === false);
  c.check(R + 98, A42_Y + 9, "Yes (Complete 44)", an.replacement_of_prosthesis === true);
  box(c, R + 162, A42_Y, RW - 162, 18, "44. Date of Prior Placement (MM/DD/CCYY)", an.prior_placement_date);

  const A45_Y = A42_Y + 18; // 587
  c.rect(R, A45_Y, RW, 18);
  c.label(R, A45_Y, "45. Treatment Resulting from");
  const tr = an.treatment_resulting_from;
  c.check(R + 6, A45_Y + 9, "Occupational illness/injury", tr.occupational_illness);
  c.check(R + 92, A45_Y + 9, "Auto accident", tr.auto_accident);
  c.check(R + 150, A45_Y + 9, "Other accident", tr.other_accident);

  const A46_Y = A45_Y + 18; // 605
  box(c, R, A46_Y, 150, 18, "46. Date of Accident (MM/DD/CCYY)", an.accident_date);
  box(c, R + 150, A46_Y, RW - 150, 18, "47. Auto Accident State", an.auto_accident_state, { align: "center" });

  // ====================== BILLING / TREATING DENTIST ==========================
  const BD_Y = A46_Y + 18; // 623
  c.bar(X0, BD_Y, LW, "BILLING DENTIST OR DENTAL ENTITY", "(Leave blank if the dentist/entity is not submitting the claim for the patient or subscriber.)");
  c.bar(SPLIT, BD_Y, RW, "TREATING DENTIST AND TREATMENT LOCATION INFORMATION");

  const B48_Y = BD_Y + BAR_H; // 632
  addressBox(c, X0, B48_Y, LW, 70, "48. Name, Address, City, State, Zip Code", form.billing);
  const B49_Y = B48_Y + 70; // 702
  box(c, X0, B49_Y, 104, 18, "49. NPI", form.billing.npi);
  box(c, X0 + 104, B49_Y, 104, 18, "50. License Number", form.billing.license_number);
  box(c, X0 + 208, B49_Y, LW - 208, 18, "51. SSN or TIN", form.billing.ssn_or_tin);
  const B52_Y = B49_Y + 18; // 720
  box(c, X0, B52_Y, 156, 18, "52. Phone Number", form.billing.phone);
  box(c, X0 + 156, B52_Y, LW - 156, 18, "52a. Additional Provider ID", form.billing.additional_provider_id);

  const T53_Y = BD_Y + BAR_H; // 632
  c.rect(R, T53_Y, RW, 36);
  c.paragraph(
    R,
    T53_Y + 1,
    RW,
    "53. I hereby certify that the procedures as indicated by date are in progress (for procedures that require multiple visits) or have been completed.",
  );
  c.label(R, T53_Y + 21, "X", { size: 8 });
  c.hline(R + 12, T53_Y + 28, RW - 90);
  c.hline(R + RW - 74, T53_Y + 28, 70);
  c.label(R + 10, T53_Y + 29, "Signed (Treating Dentist)");
  c.label(R + RW - 74, T53_Y + 29, "Date");
  if (form.treating.signature_image) {
    // Image between the certification text and the line; printed name to its right.
    c.image(form.treating.signature_image, R + 14, T53_Y + 14, 60, 13.5);
    c.value(R + 76, T53_Y + 15, RW - 154, 12, form.treating.name, { size: 6.8 });
  } else {
    c.value(R + 12, T53_Y + 15, RW - 90, 12, form.treating.name, { size: 7.6 });
  }
  c.value(R + RW - 74, T53_Y + 15, 70, 12, form.treating.signature_date, { size: 7.6 });

  const T53A_Y = T53_Y + 36; // 668
  c.rect(R, T53A_Y, RW, 10);
  c.label(R, T53A_Y - 0.5, "53a. Locum Tenens Treating Dentist?");
  c.check(R + 120, T53A_Y + 2, "", form.treating.is_locum_tenens);

  const T54_Y = T53A_Y + 10; // 678
  box(c, R, T54_Y, 130, 14, "54. NPI", form.treating.npi);
  box(c, R + 130, T54_Y, RW - 130, 14, "55. License Number", form.treating.license_number);

  const T56_Y = T54_Y + 14; // 692
  c.rect(R, T56_Y, 160, 30);
  c.label(R, T56_Y, "56. Address, City, State, Zip Code");
  const loc = formatAddressLines({ ...form.treating.location, name: "" });
  c.lines(R, T56_Y, 160, loc, { top: 12.5, leading: 7.4, size: 6.6 });
  box(c, R + 160, T56_Y, RW - 160, 30, "56a. Provider Specialty Code", form.treating.specialty_code);

  const T57_Y = T56_Y + 30; // 722
  box(c, R, T57_Y, 130, 16, "57. Phone Number", form.treating.phone);
  box(c, R + 130, T57_Y, RW - 130, 16, "58. Additional Provider ID", form.treating.additional_provider_id);

  // ---- Footer -------------------------------------------------------------------
  const F_Y = T57_Y + 16 + 10; // 748
  doc.setFont("helvetica", "normal").setFontSize(5.6).setTextColor(...GRAY);
  if (c.full) {
    doc.text("©2024 American Dental Association — J43024 (Same as ADA Dental Claim Form – J43124, J43224, J43324, J43424, J43024T)", X0 + c.dx, F_Y + c.dy);
  }
  const stamp = [
    `Claim ${form.meta.claim_number || form.meta.claim_id} (${form.meta.billing_order})`,
    `Patient ${form.meta.patient_id}`,
    `Generated ${new Date(form.meta.generated_at).toLocaleString("en-US")}`,
    pages > 1 ? `Form ${page} of ${pages}` : "",
  ]
    .filter(Boolean)
    .join("  ·  ");
  doc.text(stamp, X1 + c.dx, F_Y + 8 + c.dy, { align: "right" });
  doc.setTextColor(0);
}

// ---------------------------------------------------------------------------
// Reverse side — general instructions (static text from the 2024 form back)
// ---------------------------------------------------------------------------

function renderInstructionsPage(doc: jsPDF): void {
  doc.addPage();
  let y = 40;
  const x = X0;
  const w = W;
  const h = (t: string) => {
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(0);
    doc.text(t, x, y);
    y += 11;
  };
  const p = (t: string, indent = 0) => {
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(0);
    const lines: string[] = doc.splitTextToSize(t, w - indent);
    doc.text(lines, x + indent, y, { lineHeightFactor: 1.25 });
    y += lines.length * 7 * 1.25 + 3;
  };
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("ADA American Dental Association® — Dental Claim Form (Version 2024): Instructions", x, y);
  y += 16;
  p("The following information highlights certain form completion instructions. Comprehensive ADA Dental Claim Form completion instructions are posted on the ADA's web site (https://www.ADA.org/en/publications/cdt/ada-dental-claim-form).");
  h("GENERAL INSTRUCTIONS");
  p("A. The form is designed so that the name and address (Item 3) of the third-party payer receiving the claim (insurance company/dental benefit plan) is visible in a standard #9 window envelope (window to the left). Please fold the form using the 'tick-marks' printed in the margin.", 8);
  p("B. Complete all items unless noted otherwise on the form or in the instructions posted on the ADA's web site (ADA.org).", 8);
  p("C. Enter the full name of an individual or a full business name, address and zip code when a name and address field is required.", 8);
  p("D. All dates must include the four-digit year.", 8);
  p("E. If the number of procedures reported exceeds the number of lines available on one claim form, list the remaining procedures on a separate, fully completed claim form.", 8);
  p("F. GENDER Codes (Items 7, 14 and 22) – M = Male; F = Female; U = Unknown", 8);
  h("COORDINATION OF BENEFITS (COB)");
  p("When a claim is being submitted to the secondary payer, complete the entire form and attach the primary payer's Explanation of Benefits (EOB) showing the amount paid by the primary payer. You may also note the primary carrier paid amount in the \"Remarks\" field (Item 35).");
  h("DIAGNOSIS CODING");
  p("The form supports reporting up to four diagnosis codes per dental procedure. This information is required when the diagnosis may affect claim adjudication when specific dental procedures may minimize the risks associated with the connection between the patient's oral and systemic health conditions. Diagnosis codes are linked to procedures using the following fields:");
  p("Item 29a – Diagnosis Code Pointer (\"A\" through \"D\" as applicable from Item 34a)", 12);
  p("Item 34 – Diagnosis Code List Qualifier (AB for ICD-10-CM)", 12);
  p("Item 34a – Diagnosis Code(s) / A, B, C, D (up to four, with the primary adjacent to the letter \"A\")", 12);
  h("PLACE OF TREATMENT");
  p("Enter the 2-digit Place of Service Code for Professional Claims, a HIPAA standard maintained by the Centers for Medicaid and Medicare Services. Frequently used codes are:");
  p("11 = Office; 12 = Home; 21 = Inpatient Hospital; 22 = Outpatient Hospital; 31 = Skilled Nursing Facility; 32 = Nursing Facility; 02 = Telehealth", 12);
  p("The full list is available online at: https://www.cms.gov/Medicare/Medicare-Fee-for-Service-Payment/PhysicianFeeSched/Downloads/Website-POS-database.pdf");
  h("PROVIDER SPECIALTY");
  p("This code is entered in Item 56a and indicates the type of dental professional who delivered the treatment. The general code listed as \"Dentist\" may be used instead of any of the other codes.");
  const rows: Array<[string, string]> = [
    ["Dentist — a person qualified by a doctorate in dental surgery (D.D.S.) or dental medicine (D.M.D.) licensed by the state to practice dentistry, and practicing within the scope of that license.", "122300000X"],
    ["General Practice", "1223G0001X"],
    ["Dental Public Health", "1223D0001X"],
    ["Endodontics", "1223E0200X"],
    ["Orthodontics", "1223X0400X"],
    ["Pediatric Dentistry", "1223P0221X"],
    ["Periodontics", "1223P0300X"],
    ["Prosthodontics", "1223P0700X"],
    ["Oral & Maxillofacial Pathology", "1223P0106X"],
    ["Oral & Maxillofacial Radiology", "1223X0008X"],
    ["Oral & Maxillofacial Surgery", "1223S0112X"],
  ];
  doc.setDrawColor(...LINE).setLineWidth(0.4);
  const tx = x + 40;
  const tw = w - 80;
  const codeW = 90;
  doc.setFont("helvetica", "bold").setFontSize(7);
  doc.rect(tx, y - 8, tw, 11);
  doc.text("Category / Description", tx + (tw - codeW) / 2, y, { align: "center" });
  doc.text("Code", tx + tw - codeW / 2, y, { align: "center" });
  y += 3;
  doc.setFont("helvetica", "normal");
  for (const [label, code] of rows) {
    const lines: string[] = doc.splitTextToSize(label, tw - codeW - 8);
    const rh = lines.length * 8.5 + 3;
    doc.rect(tx, y, tw - codeW, rh);
    doc.rect(tx + tw - codeW, y, codeW, rh);
    doc.text(lines, tx + 4, y + 7.5, { lineHeightFactor: 1.2 });
    doc.text(code, tx + tw - codeW / 2, y + 7.5, { align: "center" });
    y += rh;
  }
  y += 6;
  p("Provider taxonomy codes listed above are a subset of the full code set that is posted at: https://www.nucc.org/index.php/code-sets-mainmenu-41/provider-taxonomy-mainmenu-40");
  doc.setFont("helvetica", "normal").setFontSize(5.6).setTextColor(...GRAY);
  doc.text("©2024 American Dental Association — reverse side text reproduced for the patient / office copy.", x, 760);
  doc.setTextColor(0);
}

/** Build the PDF document (one page per 10 service lines). */
export function renderAdaClaimForm(form: AdaClaimForm, opts: AdaRenderOptions = {}): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
  const c = new Canvas(doc, opts.mode ?? "form", opts.offset_x ?? 0, opts.offset_y ?? 0);
  const chunks = chunkServiceLines(form.service_lines);
  chunks.forEach((lines, i) => {
    if (i > 0) doc.addPage();
    renderPage(c, form, lines, i + 1, chunks.length);
  });
  if (opts.include_instructions) renderInstructionsPage(doc);
  doc.setProperties({
    title: `ADA Dental Claim Form – ${form.meta.claim_number || form.meta.claim_id}`,
    subject: "ADA Dental Claim Form (Version 2024)",
    creator: "DentC",
  });
  return doc;
}

/** Open the rendered form in a new tab with the print dialog. Must run inside a user gesture. */
export function openAdaClaimFormForPrint(form: AdaClaimForm, opts: AdaRenderOptions = {}): void {
  const doc = renderAdaClaimForm(form, opts);
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
}

/**
 * Alignment test for pre-printed stock (UI-14): the full form outline drawn at
 * the given offsets with every box filled with a marker, plus corner crosses.
 * Print it on plain paper, hold it against an ADA J430 sheet, and adjust the
 * X / Y offsets until the boxes coincide.
 */
export function renderAdaCalibrationPage(offset: { offset_x: number; offset_y: number }): jsPDF {
  const sample: AdaClaimForm = {
    transaction: { actual_services: true, predetermination: true, epsdt: true },
    predetermination_number: "XXXXXXXXXX",
    payer: { name: "XXXXXXXXXX PAYER NAME", address_line1: "XXXX ADDRESS LINE 1", address_line2: "XXXX LINE 2", city: "XXXX CITY", state: "XX", zip: "XXXXX", payer_id: "XXXXX" },
    other_coverage: {
      dental: true, medical: true, subscriber_name: "XXXX, XXXX, X", dob: "XX/XX/XXXX", gender: "U", subscriber_id: "XXXXXXXX", group_number: "XXXXXX", patient_relationship: "other",
      payer: { name: "XXXXXXXXXX OTHER PAYER", address_line1: "XXXX ADDRESS", address_line2: "", city: "XXXX", state: "XX", zip: "XXXXX", payer_id: "XXXXX" },
    },
    subscriber: { name: "XXXX, XXXX, X", address_line1: "XXXX ADDRESS", address_line2: "XXXX", city: "XXXX", state: "XX", zip: "XXXXX", dob: "XX/XX/XXXX", gender: "U", subscriber_id: "XXXXXXXX", group_number: "XXXXXX", employer_name: "XXXX EMPLOYER" },
    patient: { name: "XXXX, XXXX, X", address_line1: "XXXX ADDRESS", address_line2: "", city: "XXXX", state: "XX", zip: "XXXXX", relationship: "other", dob: "XX/XX/XXXX", gender: "U", patient_id: "XXXXXX" },
    service_lines: Array.from({ length: LINES_PER_FORM }, (_, i) => ({
      procedure_id: String(i), procedure_date: "XX/XX/XXXX", area_of_oral_cavity: "XX", tooth_system: "JP", tooth_numbers: "XX", tooth_surface: "XXXXX", procedure_code: "DXXXX", diagnosis_pointer: "ABCD", quantity: "XX", description: "XXXXXXXXXX XXXXXXXXXX XXXXXXXXXX", fee: 0,
    })),
    other_fees: 0,
    missing_teeth: [...MISSING_TEETH_TOP, ...MISSING_TEETH_BOTTOM],
    diagnosis_code_list_qualifier: "AB",
    diagnosis_codes: ["XXXXXXX", "XXXXXXX", "XXXXXXX", "XXXXXXX"],
    remarks: "XXXXXXXXXX XXXXXXXXXX XXXXXXXXXX XXXXXXXXXX",
    authorizations: { patient_signature_on_file: true, patient_signature_date: "XX/XX/XXXX", subscriber_signature_on_file: true, subscriber_signature_date: "XX/XX/XXXX", patient_signature_image: "", subscriber_signature_image: "" },
    ancillary: {
      place_of_treatment: "XX", enclosures: "Y", date_last_srp: "XX/XX/XXXX", is_orthodontics: true, appliance_placed_date: "XX/XX/XXXX", months_of_treatment: "XX",
      replacement_of_prosthesis: true, prior_placement_date: "XX/XX/XXXX", treatment_resulting_from: { occupational_illness: true, auto_accident: true, other_accident: true }, accident_date: "XX/XX/XXXX", auto_accident_state: "XX",
    },
    billing: { name: "XXXX BILLING ENTITY", address_line1: "XXXX ADDRESS", address_line2: "XXXX", city: "XXXX", state: "XX", zip: "XXXXX", npi: "XXXXXXXXXX", license_number: "XXXXXX", ssn_or_tin: "XX-XXXXXXX", phone: "(XXX) XXX-XXXX", additional_provider_id: "XXXXXX" },
    treating: { name: "XXXX TREATING DENTIST", signature_date: "XX/XX/XXXX", is_locum_tenens: true, npi: "XXXXXXXXXX", license_number: "XXXXXX", location: { name: "", address_line1: "XXXX ADDRESS", address_line2: "XXXX", city: "XXXX", state: "XX", zip: "XXXXX" }, specialty_code: "XXXXXXXXXX", phone: "(XXX) XXX-XXXX", additional_provider_id: "XXXXXX", signature_image: "" },
    meta: { claim_id: "calibration", claim_number: "ALIGNMENT TEST", billing_order: "primary", patient_id: 0, generated_at: new Date().toISOString() },
  };
  const doc = renderAdaClaimForm(sample, { mode: "form", offset_x: offset.offset_x, offset_y: offset.offset_y });
  doc.setPage(1);
  doc.setDrawColor(0).setLineWidth(0.5);
  const dx = offset.offset_x;
  const dy = offset.offset_y;
  for (const [cx, cy] of [
    [X0, 30],
    [X1, 30],
    [X0, 770],
    [X1, 770],
  ] as Array<[number, number]>) {
    doc.line(cx + dx - 8, cy + dy, cx + dx + 8, cy + dy);
    doc.line(cx + dx, cy + dy - 8, cx + dx, cy + dy + 8);
  }
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(0);
  doc.text(`ALIGNMENT TEST — offset X ${offset.offset_x} pt, Y ${offset.offset_y} pt (1 pt = 1/72 in). Compare against pre-printed ADA stock; adjust in the print pre-flight.`, X0 + dx, 22 + dy);
  return doc;
}
