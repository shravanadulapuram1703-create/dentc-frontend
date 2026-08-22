# Patient Prescriptions (M11) — backend dev report

Per-patient Prescriptions tab rebuilt to legacy Denticon M11 parity in
`src/features/prescriptions/` (route `/patient/:id/prescriptions`).

## Wiring (working today)

| Legacy element | Backend (`/api/v1/prescriptions`, tag **Clinical**) |
|---|---|
| Prescription List | `GET /prescriptions?patient_id=&size=200&sort=id&order=desc` |
| Rx ID / Rx Date | `id` / `rx_date` |
| Drug Name | `drug_name` (+ `library_rx_id`); options from `/prescription-library` |
| Dispense / SIG / Refill | `dispense` / `sig` / `refills` |
| Dispense As Written | `is_as_written` |
| Provider | `provider_id` (options from `/providers`, label = `short_id : name`) |
| Prescription Note (prints) | `notes` |
| Add New → Save | `POST /prescriptions` |
| Strike-off | `PATCH /prescriptions/{id}` `{ is_active:false }` (soft, irreversible) |
| Status column | `is_active` (`Active` / `Struck-off`) |
| DoseSpot? | `dosespot_rx_id` / `dosespot_status` |

A saved prescription is **immutable** (legacy rule): the panel is read-only in
`view` mode; only **Add New** creates and only **Strike-off** changes state.
Print (Quick Print / highlighted / checked / all-today) is client-side jsPDF —
there is no backend print/export endpoint.

## Gaps

- **RX-P1 — No separate "Internal Note".** The legacy form has both a
  *Prescription Note* (prints) and an *Internal Note* (does **not** print).
  `PrescriptionRead/Create` expose a single `notes` field. We map
  *Prescription Note* → `notes` and **gate** the Internal Note input (disabled).
  *Fix:* add an `internal_notes` (non-printing) column to the prescription model.

- **RX-P2 — No DoseSpot patient id.** The legacy panel shows a patient-level
  *DoseSpot Patient ID*; there is no such field on `PatientRead`. We display the
  prescription's `dosespot_rx_id` (or `0`).

- **RX-P3 — ePrescribe not integrated.** No DoseSpot launch/handoff endpoint.
  The button is enabled only when a provider carries a `dosespot_user_id`
  (subscription heuristic); the action currently only notifies.

- **RX-P4 — No print/export endpoint.** Prescription sheets are rendered
  client-side (`rxPrint.ts`) as the legacy Denticon slip — practice letterhead,
  prescriber DEA/NPI/License, patient block, ℞ body, the DISPENSE AS WRITTEN /
  VOLUNTARY FORMULARY PERMITTED pair, and the signature line — driven by the
  PRINT PRESCRIPTION dialog (pre-printed stock, scope, drug count, Wide/Thin).
  A server-rendered PDF would still be preferable for compliance, since nothing
  about the printed artifact is currently recorded (see RX-P6).

- **RX-P6 — Nothing records that a prescription was printed.** There is no
  `printed_at` / `printed_by` / print-audit endpoint on `/prescriptions`, so the
  practice cannot answer "was this script ever handed to the patient, and by
  whom" — which is exactly what a controlled-substance audit asks for.
  Ask: a `POST /prescriptions/{id}/print-log` (or `printed_at`/`printed_by`
  columns on the read model), written when the slip is generated.

- **RX-P5 — Med Status / Source Status columns** in the legacy grid have no
  backend equivalent beyond `dosespot_status`; omitted.
