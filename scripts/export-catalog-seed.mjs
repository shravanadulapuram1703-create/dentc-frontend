/**
 * Export the legacy Medical-Alert / Dental-Questionnaire / Medical-Questionnaire
 * catalogs as a seed-ready JSON for the backend team (gap LEG-1).
 *
 * The backend asked for "the authoritative lists ... and I'll seed all three groups
 * with sections/order/input types in one pass". This emits exactly that shape,
 * derived from the single source of truth the UI already renders
 * (`src/features/add-patient/legacyCatalogs.ts`), so the two can never drift.
 *
 *   node scripts/export-catalog-seed.mjs > docs/patients/legacy_catalog_seed.json
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  join(here, "..", "src", "features", "add-patient", "legacyCatalogs.ts"),
  "utf8",
);

/** Same slug rule as `toCode()` in legacyCatalogs.ts — codes must match the UI. */
const toCode = (label) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

/** Pull the string literals out of an `alerts([...])` call. */
function parseAlertGroups() {
  const groups = [];
  const groupRe = /title:\s*"([^"]+)",\s*items:\s*alerts\(\[([\s\S]*?)\]\)/g;
  let m;
  while ((m = groupRe.exec(src))) {
    const [, title, body] = m;
    const labels = [...body.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) =>
      x[1].replace(/\\"/g, '"'),
    );
    groups.push({ title, labels });
  }
  return groups;
}

/** Pull `q("label", "kind")` calls out of a named question-groups array. */
function parseQuestionGroups(constName) {
  const start = src.indexOf(`export const ${constName}`);
  if (start === -1) return [];
  // The array ends at the first line that is exactly "];".
  const end = src.indexOf("\n];", start);
  const block = src.slice(start, end);

  const groups = [];
  const groupRe = /title:\s*"([^"]+)",\s*questions:\s*\[([\s\S]*?)\],\s*\}/g;
  let m;
  while ((m = groupRe.exec(block))) {
    const [, title, body] = m;
    const questions = [];
    // q("label") or q("label", "kind"). The label may be wrapped onto its own
    // line by the formatter, which also leaves a trailing comma before the `)`,
    // so both the kind and a dangling comma are optional.
    const qRe = /q\(\s*"((?:[^"\\]|\\.)*)"\s*(?:,\s*"(\w+)"\s*)?,?\s*\)/g;
    let qm;
    while ((qm = qRe.exec(body))) {
      questions.push({
        label: qm[1].replace(/\\"/g, '"'),
        kind: qm[2] ?? "yesno",
      });
    }
    groups.push({ title, questions });
  }
  return groups;
}

const alertGroups = parseAlertGroups();
const dentalGroups = parseQuestionGroups("LEGACY_DENTAL_QUESTION_GROUPS");
const medicalGroups = parseQuestionGroups("LEGACY_MEDICAL_QUESTION_GROUPS");

let sortOrder = 0;
const medicalAlerts = alertGroups.flatMap((g) =>
  g.labels.map((label) => ({
    group_type: "MEDALERT",
    section: g.title,
    key1: toCode(label),
    description: label,
    sort_order: ++sortOrder,
  })),
);

function questionRows(groups, groupType) {
  let order = 0;
  return groups.flatMap((g) =>
    g.questions.map((q) => ({
      group_type: groupType,
      section: g.title,
      key1: toCode(q.label),
      description: q.label,
      input_type: q.kind,
      sort_order: ++order,
    })),
  );
}

const out = {
  _source: "src/features/add-patient/legacyCatalogs.ts (frontend source of truth)",
  _note:
    "Codes (key1) are slugged from the label with the same rule the UI uses, so seeded " +
    "answers key identically to what the wizard already sends. `section` groups rows as " +
    "the legacy screen does; `sort_order` preserves legacy ordering; `input_type` is " +
    "yesno|text|date|textarea.",
  _counts: {
    MEDALERT: medicalAlerts.length,
    DENTQUEST: questionRows(dentalGroups, "DENTQUEST").length,
    MEDQUEST: questionRows(medicalGroups, "MEDQUEST").length,
  },
  MEDALERT: medicalAlerts,
  DENTQUEST: questionRows(dentalGroups, "DENTQUEST"),
  MEDQUEST: questionRows(medicalGroups, "MEDQUEST"),
};

process.stdout.write(JSON.stringify(out, null, 2) + "\n");
