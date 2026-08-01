// Add-Patient Wizard — LEGACY catalogs (Denticon "Medical Information" screen).
//
// Verbatim transcription of the legacy Medical Alerts / Dental Questionnaire /
// Medical Questionnaire screens so the new wizard offers the same options in the
// same order and grouping. These are the **defaults**; if the tenant has seeded
// MEDALERT / DENTQUEST / MEDQUEST `definitions`, the steps prefer that catalog.
//
// Codes are derived from the label (stable, snake_case) so answers key
// consistently and can be sent as `alert_code` / `question_code` to the backend.

export type QuestionKind = "yesno" | "text" | "date" | "textarea";

export interface MedicalAlertItem {
  code: string;
  label: string;
}

export interface MedicalAlertGroup {
  title: string;
  items: MedicalAlertItem[];
}

export interface QuestionItem {
  code: string;
  label: string;
  kind: QuestionKind;
}

export interface QuestionGroup {
  title: string;
  questions: QuestionItem[];
}

/** Label → stable snake_case code (letters/digits only, collapsed underscores). */
export function toCode(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

const alerts = (labels: string[]): MedicalAlertItem[] =>
  labels.map((label) => ({ code: toCode(label), label }));

// ---------------------------------------------------------------------------
// Medical Alerts — legacy groups (Y / N per row; blank = unanswered)
// ---------------------------------------------------------------------------

export const LEGACY_MEDICAL_ALERT_GROUPS: MedicalAlertGroup[] = [
  {
    title: "Allergic To",
    items: alerts([
      "No Known Allergies",
      "Aspirin",
      "Barbiturates / Sleeping Pills",
      "Codeine",
      "Erythromycin",
      "Iodine",
      "Latex Rubber",
      "Local Anesthetics",
      "Metals",
      "No Epinephrine",
      "Penicillin",
      "Prior Hepatitis",
      "Sulfa Drugs",
      "Other Narcotics",
    ]),
  },
  {
    title: "Check, if applicable",
    items: alerts([
      "No Change Since Last Recorded",
      "No Known Concerns or Issues",
      "Abnormal Bleeding",
      "AIDS/HIV Infection",
      "Alcohol/Drug Abuse",
      "Angina",
      "Anemia",
      "Ankles Swell",
      "Anorexia",
      "Arteriosclerosis",
      "Arthritis",
      "Asthma",
      "Autoimmune Disease",
      "Bladder Trouble",
      "Blood Clotting Problems",
      "Blood Transfusion",
      "Bulimia",
      "Bronchitis",
      "Cancer / Tumor or Growth",
      "Cardiac Pacemaker",
      "Cardiovascular Disease",
      "Chemotherapy",
      "Chest Pain Upon Exertion",
      "Color Blindness",
      "Congenital Heart Defect",
      "Contact Lenses",
      "Congestive Heart Failure",
      "Damaged Heart Valve",
      "Diabetes",
      "Emphysema",
      "Environmental Allergies",
      "Epilepsy",
      "Fainting Spells",
      "Fever Blisters",
      "Frequent Headaches",
      "Frequently Dry Mouth / Sjogren",
      "Gag Reflex",
      "Gall Bladder Trouble",
      "Hay Fever",
      "Heart Attack",
      "Heart Disease",
      "Heart Murmur",
      "Hepatitis",
      "Herpes",
      "High Blood Pressure",
      "Hives",
      "Jaundice",
      "Joint Replacement",
      "Kidney",
      "Leukemia",
      "Liver Disease",
      "Low Blood Pressure",
      "Lupus",
      "Mental Health Problems",
      "Mitral Valve Prolapse",
      "Pacemaker",
      "Persistent Diarrhea",
      "Premedicate",
      "Radiation Treatment",
      "Rheumatic Fever",
      "Rheumatic Heart Disease",
      "Rheumatoid Arthritis",
      "Seizures",
      "Sexually Transmitted Disease",
      "Shortness of Breath",
      "Skin Rash",
      "Sinus Trouble",
      "Stomach Ulcers",
      "Stroke",
      "Thyroid Problems",
      "Tuberculosis",
      "Unusual Weight Loss",
      "Urinate Frequently",
    ]),
  },
  {
    title: "Other",
    items: alerts(["See Scanned Documents: Pt Note"]),
  },
];

/** Flat list of every legacy alert (used for "No to all" and label lookup). */
export const LEGACY_MEDICAL_ALERTS: MedicalAlertItem[] =
  LEGACY_MEDICAL_ALERT_GROUPS.flatMap((g) => g.items);

/** Legacy caps the Medical-Alerts comment box at 100 characters. */
export const MEDICAL_ALERT_COMMENTS_MAX = 100;

/**
 * Minimum number of items a *tenant* catalog must contain before it replaces the
 * legacy list. The MEDALERT / DENTQUEST / MEDQUEST definition groups are not yet
 * seeded (gap LEG-1) and currently hold only a stray test row — letting that
 * single row win would silently shrink the screen from ~90 legacy alerts to 1.
 * Once the catalogs are properly seeded they clear this bar and take over.
 */
export const MIN_TENANT_CATALOG_ITEMS = 10;

// ---------------------------------------------------------------------------
// Dental Questionnaire — legacy order
// ---------------------------------------------------------------------------

const q = (label: string, kind: QuestionKind = "yesno"): QuestionItem => ({
  code: toCode(label),
  label,
  kind,
});

export const LEGACY_DENTAL_QUESTION_GROUPS: QuestionGroup[] = [
  {
    title: "Dental Questionnaire",
    questions: [
      q("Name of previous Dentist", "text"),
      q("Phone", "text"),
      q("Date of your last cleaning", "date"),
      q("Last exam date", "date"),
      q("Date of your last full series x-rays", "date"),
      q("Date of last cavity detection (bitewing) x-rays", "date"),
      q("Do your gums bleed while brushing or flossing ?"),
      q("Are your teeth sensitive to hot, cold or sweets ?"),
      q("Do you get frequent fever blisters, mouth ulcers, or sores on your lips or in your mouth ?"),
      q("Have you ever had burning of the tongue or cracking of the corners of your mouth ?"),
      q("Do you chew/smoke tobacco in any form ?"),
      q("Have you had any head, neck or jaw injuries ?"),
      q("Do you notice popping, clicking or soreness of the jaws or points just in front of the ears ?"),
      q("Do you clench or grind your teeth ?"),
      q("Have you ever had orthodontic treatment ?"),
      q("If Yes, date of placement", "date"),
      q("Do you wear dentures or partials ?"),
      q("If Yes, date of placement of dentures ?", "date"),
      q("Are you happy with your dentures ?"),
      q("Are you having any specific problems with your teeth, gums, or mouth at this time ?"),
      q("Are you happy with your smile ?"),
      q("Do you have problems with teeth/fillings breaking ?"),
      q("Do you regularly use dental floss ?"),
      q("Do you have, or have you ever been told, that you have Pyorrhea (Periodontal Disease) ?"),
      q("Do you have difficulty in opening your mouth widely ?"),
      q("Do you have an unpleasant taste or odor in your teeth/mouth ?"),
      q("Does food catch between your teeth ?"),
      q("Do you want to learn to control your dental disease and retain your teeth ?"),
    ],
  },
  {
    title: "Additional Comments",
    questions: [q("Any Disease, Condition or Problem not Listed ? Please list", "textarea")],
  },
];

// ---------------------------------------------------------------------------
// Medical Questionnaire — legacy order (incl. Emergency Contact + Women Only)
// ---------------------------------------------------------------------------

export const LEGACY_MEDICAL_QUESTION_GROUPS: QuestionGroup[] = [
  {
    title: "Emergency Contact",
    questions: [
      q("Emergency contact name", "text"),
      q("Emergency contact phone", "text"),
      q("Emergency contact relationship to patient", "text"),
    ],
  },
  {
    title: "Medical Questionnaire",
    questions: [
      q("Family Physician", "text"),
      q("Phone", "text"),
      q("Are you currently under care of a Physician ?"),
      q("If Yes, what is the condition being treated ?", "textarea"),
      q("Have you had any serious illness, operation or been hospitalized within the past 5 years ?"),
      q("If Yes, what illness or problem ?", "text"),
      q("Are you currently taking any medication ?"),
      q("If Yes, what ?", "textarea"),
      q(
        "Have you taken bisphosphonates (Fosamax, Boniva, Zometa, Actonel, Didronel, Aredia, Skelid, Reclast)",
      ),
      q("Have you ever taken the diet control drug Fen-Phen ?"),
      q("Do you use alcoholic beverages ?"),
      q("Do you smoke ?"),
    ],
  },
  {
    title: "Women Only",
    questions: [
      q("Are you pregnant?"),
      q("If Yes, what is your due date ?", "date"),
      q("Are you currently nursing ?"),
      q("Do you have menstrual period problems ?"),
      q("Are you on hormone replacement therapy ?"),
      q("Are you on birth control pills / fertility drugs ?"),
    ],
  },
  {
    title: "Additional Comments",
    questions: [q("Any Disease, Condition or Problem not Listed ? Please list", "textarea")],
  },
];

/** Flat question lists (label lookup for question_text on save). */
export const LEGACY_DENTAL_QUESTIONS: QuestionItem[] = LEGACY_DENTAL_QUESTION_GROUPS.flatMap(
  (g) => g.questions,
);
export const LEGACY_MEDICAL_QUESTIONS: QuestionItem[] = LEGACY_MEDICAL_QUESTION_GROUPS.flatMap(
  (g) => g.questions,
);

// ---------------------------------------------------------------------------
// Recall — legacy default rows (Add Recall Due Dates screen)
// ---------------------------------------------------------------------------

export interface LegacyRecallRow {
  procedure_code: string;
  interval: string;
  interval_type: "Month" | "Year";
  reason: string;
}

export const LEGACY_RECALL_ROWS: LegacyRecallRow[] = [
  { procedure_code: "D0120", interval: "6", interval_type: "Month", reason: "Periodic Oral Evaluation" },
  { procedure_code: "D0210", interval: "3", interval_type: "Year", reason: "Intraoral - Complete Series Of Radiographic" },
  { procedure_code: "D0330", interval: "3", interval_type: "Year", reason: "Panoramic Radiographic Image" },
  { procedure_code: "D1110", interval: "6", interval_type: "Month", reason: "Prophylaxis - Adult" },
  { procedure_code: "D1120", interval: "6", interval_type: "Month", reason: "Prophylaxis - Child" },
  { procedure_code: "D4910", interval: "4", interval_type: "Month", reason: "Periodontal Maintenance" },
];

// ---------------------------------------------------------------------------
// Responsible Party — legacy "Resp. Party Type" codes
// ---------------------------------------------------------------------------

export const LEGACY_RESP_PARTY_TYPES: Array<{ code: string; label: string }> = [
  { code: "CA", label: "CA - Cash" },
  { code: "CO", label: "CO - Collection" },
  { code: "DI", label: "DI - Discount" },
  { code: "IN", label: "IN - Insurance" },
  { code: "MC", label: "MC - Medicaid" },
  { code: "PP", label: "PP - Payment Plan" },
];
