# Dental Practice KPI Dictionary — research reference

Research input for the Reports & Analytics module plan. Compiled 2026-11-21 / 22 from vendor help centers, vendor benchmark reports, ADA / ADA Health Policy Institute publications and trade press. This is a reference, not a design: where it recommends a default it says so.

**Contents:** 0 Reading guide · 1 Organizing model · 2 Foundational definitions and vendor variants · 3 KPI dictionary (13 groups, 159 KPIs) · 4 Benchmark tables by source · 5 Morning-huddle metric set · 6 Reporting routines (day / week / month / year) · 7 Goal setting · 8 Leading vs lagging · 9 Published glossaries · 10 Calculation-pitfall checklist · 11 Implications for the module · 12 Verification status and gaps · Sources

---

## 0. Reading guide

**Verification tags**

| Tag | Meaning |
|---|---|
| `[KEY]` | Claim read in the opened source `KEY` (see Sources). |
| `[KEY·S]` | Seen only in a search-result snippet for that URL; the page itself was not opened (blocked, 404, or not fetched). Treat as unverified until checked. |
| `[unverified]` | No source found; common industry usage or my own inference. |
| *Recommended default* | A proposal for our semantic layer, not a sourced fact. |

**Vendor abbreviations:** DI = Dental Intelligence · DPA = Denticon Practice Analytics (Planet DDS; Power BI Embedded, nightly sync ~1 AM PST `[DPA-FAQ]`) · DLY = Dentilytics Basic (older Planet DDS dashboard) · PDDS = Planet DDS industry reports (Denticon + Cloud 9 network data) · PbN = Practice by Numbers · JAR = Jarvis Analytics (Henry Schein One) · HSO-CI = Henry Schein One Catalyst Index · ADA-MS = ADA "Measuring Success" page · HPI = ADA Health Policy Institute.

**Segment codes (column "Seg")**

| Code | Dimension |
|---|---|
| ORG | Organization → region / office group → office (location) |
| PRV | Provider (treating / appointment / primary) |
| PT | Provider type (dentist, hygienist, specialist) and specialty |
| PROC | Procedure category (ADA / CDT category) → CDT code |
| PAY | Payer: carrier, plan, plan type (PPO, DHMO / capitation, Medicaid, FFS / self-pay), fee schedule |
| NE | New vs existing patient |
| AGE / GEO | Patient age band / zip code |
| APT | Appointment type, operatory |
| SRC | Referral / marketing source |
| USR | Staff user (front-office team member) |
| DOW | Day of week |
| TIME | Day, week, month, quarter, year; MTD / QTD / YTD; rolling 90 days / 12 months; same period last year |

**Date-basis codes**

| Code | Basis |
|---|---|
| DOS | Date of service (procedure date) |
| POST | Posting / entry date of the ledger transaction |
| PAYD | Payment date |
| CLM | Claim transmission date |
| APTD | Appointment date |
| CRT | Record creation date (appointment booked, treatment plan item added) |
| AS-OF | Snapshot at a point in time (balances, counts, pipeline) |

**Type:** each KPI is flagged **Lead** (moves before revenue and can still be changed this month) or **Lag** (records what already happened).

---

## 1. Organizing model

- **Profitability formula** used by Dental Intelligence to group its benchmarks: Profit = Number of Visits × Production per Visit × Collection % − Overhead `[DI-SOD26]`. Visits ← scheduling, recare, retention; Production per Visit ← diagnosis, case acceptance, clinical mix; Collection % ← RCM; Overhead ← P&L data that a PMS does not hold.
- **Planet DDS framing:** "Growth = capacity + scheduling; Margin = collections + admin" `[PDDS-DD26]`.
- **Six drivers of growth** in the Planet DDS analysis of 8,593 practices (2025): new-patient volume, operational consistency (low day-to-day production volatility), efficiency per chair, DSO size effects, case completion (more than acceptance), revenue-cycle efficiency `[PDDS-DD26]`.
- **ADA "Measuring Success"** KPI list: production, collections, profit, overhead, new patients, FFS vs insurance production, case acceptance, doctor vs hygiene production, recare activity, hygiene patients scheduled, cancellations / no-shows; also A/R, insurance claim aging, production per provider, patient demographics, patients by referral source `[ADA-MS]`.

---

## 2. Foundational definitions and vendor variants

Every KPI below depends on a handful of base definitions. Vendors disagree on all of them, which is why the same KPI name carries very different benchmark numbers (see §4.10). These must be explicit, versioned, and (where noted) configurable in our semantic layer.

### 2.1 Production, adjustments, collections

| Term | Canonical meaning | Vendor variants |
|---|---|---|
| Gross production | Sum of fees of completed (posted) procedures before any adjustment | DI: sum of procedure fees on ledgers, dated by procedure date `[DI-GL]`. ADA: all dentistry produced regardless of collectability `[ADA-MS]`. **PDDS industry reports compute gross production from expected collections, not UCR fees** `[PDDS-DD26]`. |
| Fee basis | Office (UCR) fee vs contracted / expected fee on the procedure line | Not standardized. It decides the size of write-offs and of every "% of gross production" metric. |
| Production adjustments | Reductions (or corrections) on the production side: contractual / PPO write-offs, discounts, charge corrections | DI splits **Write-offs** (negative insurance-claim adjustments) from other **Adjustments**, each reportable by entry date or procedure date `[DI-GL]`. DPA uses one signed "Production Adjustment" `[DPA]`. |
| Net (adjusted) production | Gross production less production adjustments | DPA: gross production + (signed) production adjustment `[DPA]`. PbN "Adjusted Production": gross minus discounts and write-offs `[PBN]`. JAR: "after all write-offs and adjustments" `[JAR]`. ADA "adjusted (billable) production": amount collectable after adjustments `[ADA-MS]`. AccruDent: total production − adjustments `[PDDS-26]`. DI offers **four bases**: by Procedure Date (write-offs by procedure date + other adjustments by entry date; needs adjustments linked to procedures), by Entry Date, by 90-Day Average (smoothed adjustment rate applied to current gross), Estimated (Open Dental only, estimated write-offs) `[DI-GL]` `[DI-MH]`. |
| Scheduled production | Fees attached to future or unfinished appointments | DI: fees of future / unfinished scheduled appointments; net variants subtract average or actual write-offs `[DI-GL]`. DPA: sum of appointment fees `[DPA]`. PbN: "On Schedule" `[PBN]`. |
| Gross collections | Patient payments + insurance payments posted | DPA `[DPA]`. DI: payments posted to patient ledgers (carrier scorecards: payments posted to claims) `[DI-GL]`. |
| Collection adjustments | Adjustments on the payment side (refunds, NSF, payment corrections, bad debt, collection-agency) | DPA: net collections = gross collections + collection adjustment; the dashboard shows the absolute value `[DPA]` `[DPA-MH]`. DI: Collections Net = payments ± adjustments **configured** as collection adjustments `[DI-GL]`. |

*Recommended default:* every adjustment type carries a class (`contractual_writeoff`, `discount`, `charge_correction`, `bad_debt`, `refund`, `payment_correction`, `transfer`) and a side (production vs collection). All money KPIs are built from classed adjustments, never from adjustment names.

### 2.2 Date basis

- DI lets the practice choose net production "by procedure date" or "by entry date" and warns that the procedure-date variant requires each adjustment to be linked to its procedure `[DI-MH]`.
- Denticon reports distinguish transaction date (date entered) from service date `[DEN-STX·S]`.
- Aging, cohort and "as-of" metrics need an explicit reference date; DI's glossary does not state the reference date for aging buckets `[DI-GL]`.
- *Recommended default:* production by DOS; adjustments by POST with an optional "attribute to linked procedure DOS" mode; collections by POST / PAYD; pipeline and balances AS-OF. Every KPI declares its basis in its definition.

### 2.3 Entities

| Entity | Variants |
|---|---|
| **New patient** | DI: first ledger entry with an ADA or custom code > $0 falls in the period, excluding D9986 / D9987; counted retroactively from first completed visit; notes that PMS reports may instead count newly created patient profiles `[DI-GL]` `[DI-NP]`. DPA: distinct patients whose First Visit Date falls in the range; on today's schedule a new-patient exam is D0150 with an empty First Visit Date `[DPA]` `[DPA-MH]`. DLY: patients on today's schedule with no prior ledger transactions `[DLY]`. PbN: "NP Seen" = new patients with completed appointments; "New Patients Added" = first-ever appointment created today `[PBN]`. Multi-location: de-duplicate across locations `[HSO-ASC]`. |
| **Visit** | DI: patients with completed production on a day (provider scorecard: tied to that provider) `[DI-GL]`. DPA: ledger procedures flagged "Visit Code = Yes"; visit count = distinct patients with a visit code per day, summed over the range `[DPA]` `[DPA-TP]`. PbN "Patients Seen": unique patients in the range, counted once `[PBN]`. |
| **Hygiene visit (code sets)** | DI Performance Board (codes on the scheduled appointment) and Provider Pulse (codes walked out): D1110, D1120, D4341, D4342, D4355, D4910, D4921, D4999, D6080, D6081 and "D4646" as printed (probably D4346); DI Daily Report instead uses provider role = Hygienist `[DI-HV]`. DPA Hygiene Recall: D1110, D1120, D4341, D4342, D4355, D4910 `[DPA-HR]`; DPA Front Office "hygiene appointments": D4910, D4341, D4342, D4355 or a hygienist as appointment provider `[DPA-FO]`. JAR: D1110, D1120, D4341, D4342, D4910, D4346, D4355, any provider `[JAR]`. |
| **Exam types** | DPA: new-patient exam D0150; recare D0120 or D0145; emergency D0140 or D0160 `[DPA]`. DLY: continuing care D0120; emergency D0140 `[DLY]`. DPA "Recare Patients Seen" counts **transactions**, not distinct patients, in some views `[DPA-MH]`. |
| **Working day** | DPA: per provider per day, booked appointment time ≤ 4 h = 0.5 day, > 4 h = 1.0; cancelled, blocked and missed appointments excluded `[DPA]`. DI: Working Days = days on which providers had some production posted; Clinical Hours = actual hours when recorded, else scheduled `[DI-GL]`. |
| **Available hours** | DPA: provider schedule, then (in priority order) remove enterprise holidays, remove office holidays, add office-open exceptions, remove provider holidays, add provider in-office exceptions `[DPA-FO]`. |
| **Office attribution** | DPA uses three: Outstanding A/R by patient **home office** (Morning Huddle), Total Outstanding A/R by **transaction office** (Collections), A/R of today's patients grouped by **appointment office** `[DPA]` `[DPA-MH]`. |
| **Provider attribution** | DI: the primary provider gets credit for the visit in Production per Visit; "Tx Team" metrics credit the presenting team `[DI-GOAL]` `[DI-GL]`. |

### 2.4 Variant matrix — active patient

| Source | Rule |
|---|---|
| DI | Completed ledger treatment in the last **18 months** AND PMS status Active `[DI-GL]`. Lost = no completed visit in 18 months or status changed to Inactive; Recaptured = the reverse `[DI-NP]`. |
| PbN | Unique patients who visited within the last **18 months**; "Going Inactive" = month 17; Reactivated = no appointment for 18+ months and now has one `[PBN]`. |
| DPA | Active = last visit within **12 months**; Danger Zone = last visit 12–24 months ago; Inactive = no visit in **24+ months** or no visit date `[DPA]`. |
| JAR | Active Patient # is tied to a **24-month** look-back (the page is terse — patients seen in the selected range with a visit about two years earlier; confirm the wording before copying); Patient Retention denominator = completed procedure within **36 months** `[JAR]`. |
| HSO-CI | Retention = share of active patients who return within an **18-month** window `[HSO-RET]`. |
| Brokers / transitions | 18 months typical, 12–24 months in use; no industry standard `[HS-TR·S]`. |
| Dental Economics | Attrition worked from "seen 12–24 months ago but not in the past 12" `[DE-4STEP]`. |

*Recommended default:* `active_window_months` is an organization-level parameter (default 18), reports show the window in the header, and a 12 / 18 / 24 comparison view is available because buyers, lenders and legacy reports use different windows.

### 2.5 Variant matrix — hygiene reappointment vs pre-appointment

| Source | Name | Rule |
|---|---|---|
| DI | Hygiene Re-Appointment % | Hygiene visits where another hygiene visit was booked **on or before the visit date** ÷ hygiene visits (leaves-with-next-booked) `[DI-GL]` `[DI-SOD26]`. |
| DI | Hygiene Pre-Appointment % | Active hygiene patients with an upcoming hygiene appointment ÷ active hygiene patients (point in time) `[DI-GL]`. |
| DPA | Hygiene Reappointment % | Patients with a hygiene procedure in range who **currently hold** a future hygiene appointment ÷ all such patients `[DPA]`. |
| DPA | Reappointment % (Morning Huddle) | Yesterday's patients (appointment + charge) who now have **any** future appointment, cancelled / missed excluded `[DPA]`. |
| PDDS reports | Hygiene reappointment rate | "within 12 months" (63% in 2025) `[PDDS-DD26]`. |
| PbN | Hyg Pre-appoint % | Hygiene visits where another appointment (**hygiene or doctor**) was booked at the visit ÷ hygiene visits `[PBN]`. |
| PbN | Recall Current % | Hygiene patients with an upcoming hygiene appointment ÷ hygiene patients due `[PBN]`. |
| JAR | Hygiene Reappointment | Patients with a hygiene-coded visit in range who have a future hygiene appointment; not restricted to hygiene providers `[JAR]`. |
| ADA-MS | — | "90% of the practice's recare patients scheduled for their next appointment at all times" `[ADA-MS]`. |

### 2.6 Variant matrix — case acceptance

| Source | Unit | Rule |
|---|---|---|
| DI | Patients | Patient Acceptance % = patients presented treatment who accepted all or part of it **on the day of the appointment** `[DI-GOAL]`. |
| DI | Dollars | Treatment $ Acceptance % = accepted dollars ÷ presented dollars; acceptance = scheduled or completed the same day; Same-Day variant = completed in the visit without advance planning; "Prior Tx Accepted" covers later acceptance (Open Dental only) `[DI-GL]` `[DI-MH]`. |
| DPA | Plans (count) | Distinct treatment plans in Accepted, Scheduled or Completed status ÷ all treatment plans × 100; plans marked Alternative or Referred Out are excluded `[DPA]` `[DPA-MH]`. |
| DPA | Dollars (funnel) | % Accepted, % Scheduled, % Completed = status fees ÷ diagnosed fees `[DPA-TP]`. |
| PDDS reports | Plans / dollars | Case acceptance = "marked as accepted, scheduled, or completed"; also dollar vs count acceptance by case-value tier; case completion = plans created in H1 finished by year end `[PDDS-DD26]`. |
| PbN | Dollars / patients | Tx Acceptance % = dollars accepted ÷ dollars presented; PT Accept % = patients with ≥ 1 item accepted (completed or scheduled) ÷ patients presented `[PBN]`. |
| JAR | Treatment | Share of treatment accepted in the range; accepted = completed or scheduled; Same Day and Rolling 90 Days variants `[JAR]`. |
| ADA-MS | Presentations | "at least 75–80% of case presentations accepted" `[ADA-MS]`. |

### 2.7 Variant matrix — broken appointments

| Source | Rule |
|---|---|
| DI | Cancelled and No-Show follow each PMS's status; Broken = cancelled + no-show; Cancelled % = cancelled ÷ scheduled `[DI-GL]`. |
| DPA | Missed % = missed ÷ total appointments (blocked excluded); Cancelled % = cancelled ÷ total; **"No Show Appt %" = (missed + cancelled) ÷ total** `[DPA]`. |
| JAR | No Show Rate = patients who missed, or cancelled within 24 hours `[JAR]`. |
| PDDS reports | No-show = failed "without prior notice"; cancellation = cancelled "in advance" `[PDDS-25]`. |
| ADA-MS | Cancellations and no-shows combined, 5% or less `[ADA-MS]`. |

### 2.8 Variant matrix — collection percentage and A/R days

| Source | Rule |
|---|---|
| DI | Collections % = collections ÷ ledger production; benchmark published on **net** production `[DI-GL]` `[DI-SOD26]`. |
| DPA | Net collections ÷ net production × 100, target 95% `[DPA]`. |
| ADA-MS | 98% of billable / adjusted production `[ADA-MS]`. |
| PDDS | Net-adjusted collections ÷ net production (median 88.9%); gross-basis 80.4% "should not be benchmarked directly"; its glossary nevertheless words NCR as the share of gross production collected `[PDDS-DD26]`. |
| HSO-CI | "percentage of billed or produced dollars … actually collects"; denominator and window not stated `[HSO-COL]`. |
| A/R days — PbN | Total A/R ÷ average daily collections `[PBN]`. |
| A/R days — DPA | Outstanding A/R ÷ (net collections ÷ Monday–Friday business days in range); denominator 0 treated as 1 `[DPA]`. |
| A/R days — DI | A/R compared with production using the practice's production-type setting; exact formula not stated `[DI-GL]`. |
| Days in A/R — PDDS | Average days from claim submission to payment receipt (a different metric) `[PDDS-DD26]`. |

---

## 3. KPI dictionary

Each row: stable `kpi_key` (snake_case), name with vendor aliases and plain-language definition, formula with inclusion rules and date basis, typical segments, benchmark with source, why it matters / the action it drives (with Lead / Lag), and calculation pitfalls. Where a benchmark cell says "none published", no number was found in an opened source. Rows marked "x-ref" are views of another KPI kept separate because legacy tools and scorecards list them separately.

### 3.1 Production (16)

| ID · key | KPI (aliases) — definition | Formula · rules · date basis | Seg | Benchmark / target | Why → action · Pitfalls |
|---|---|---|---|---|---|
| PRD-01 `gross_production` | **Gross production** (Production Gross — DI; Gross Production — DPA, PbN, JAR; charges). Value of completed procedures before any adjustment. | Σ fee of completed (posted) procedure lines. DOS. Exclude voided / deleted lines and non-production ledger items. State the fee basis (office UCR vs contracted). | ORG PRV PT PROC PAY NE TIME | $1,001,807 production per doctor per year incl. hygiene, 2025 `[DE-LEV25]`. Median revenue per GP dentist $698,436 (2020–24 pooled, inflation-adjusted) `[ADA-SDP]`. Avg gross daily production per practice $8,764 (2025), $8,436 (2024) `[PDDS-DD26]`. $1.5M per full-time doctor cited as a GP benchmark `[DE-4STEP]`. | **Why (Lag):** size of clinical output; denominator of write-off rate. **Pitfalls:** UCR-based gross moves when fee schedules change, not when work changes; PDDS gross is expected-collections based and not comparable with UCR gross `[PDDS-DD26]`; multi-visit procedures dated at prep vs seat; production posted to the wrong provider. |
| PRD-02 `production_adjustments` | **Production adjustments / write-offs** (Adjustments Total, Write-offs Entry Date / Procedure Date — DI; Production Adjustment — DPA). Dollars removed from production by contract, discount or correction. | Σ production-side adjustments by class (contractual write-off, discount, correction). Report by POST and, when linked, by procedure DOS `[DI-GL]`. | ORG PRV PAY PROC USR TIME | Contractual and insurance adjustments 7.8–8.2% of gross **where gross is already expected-fee based** `[PDDS-DD26]`. No universal figure on a UCR basis (payer-mix dependent). | **Why (Lag):** shows the cost of PPO participation and discount discipline → renegotiate or drop plans, audit discounts. **Pitfalls:** collection-side adjustments mixed in; adjustment posted in a later period than its procedure (use linked DOS or the 90-day smoothed rate `[DI-MH]`); positive adjustments; write-offs not yet posted because the EOB has not arrived. |
| PRD-03 `net_production` | **Net production** (Adjusted Production — PbN, ADA, AccruDent; Production Net — DI; Net Production — DPA). Collectable value of work done. | Gross production + signed production adjustments `[DPA]`. Variants: by procedure date, by entry date, 90-day average, estimated `[DI-GL]`. | ORG PRV PT PROC PAY NE TIME | "$1M baseline per practice" per year `[PDDS-26]`. | **Why (Lag):** base for collection %, goals and provider pay. **Pitfalls:** the four date-basis variants give different period totals; DPA's Front Office glossary says "minus adjustments" while the formula adds a signed value `[DPA-FO]` — fix one sign convention; pending insurance write-offs overstate net until posted (offer an "estimated net"). |
| PRD-04 `adjustment_rate` | **Adjustment / write-off rate** (Adjustment % Rolling 90 Days, Adjustments % Rolling 12 Months — DI). Share of gross production written off. | Σ production adjustments ÷ gross production. Rolling 90 days or 12 months. | ORG PRV PAY PROC TIME | None published; trend by payer. | **Why (Lag):** quantifies fee-schedule drag by carrier. **Pitfalls:** DI's own glossary lists variants with different denominators (production vs collections) and name / window mismatches `[DI-GL]`; meaningless without a stated fee basis. |
| PRD-05 `scheduled_production` | **Scheduled production** (Production Scheduled — DI; On Schedule — PbN; Scheduled Production Today / Next Working Day / 2nd Working Day — DPA). Dollars on the books for a future window. | Σ fees on appointments in the window, excluding cancelled / missed / blocked. APTD. Windows: today, next working day, 2nd working day, today + 7 days, through month end `[DPA]`. | ORG PRV PT APT TIME | Compare with the daily goal; DPA colors a day red when below the daily average needed `[DPA]`. | **Why (Lead):** the earliest production signal → fill gaps, move treatment forward. **Pitfalls:** appointments with no procedures attached count as $0; each provider's "next working day" is computed individually `[DPA-MH]`; gross unless netted by an average write-off `[DI-GL]`. |
| PRD-06 `production_vs_goal_pct` | **Production vs goal** (Net Production MTD vs Goal — DPA; Production Gross Percent to Goal — DI). Progress against the period goal. | Net production ÷ goal amount × 100; goal amount = daily goal × provider working days in the period `[DPA]`. | ORG PRV PT TIME | DPA color bands: < 85% red, 85–95% yellow, > 95% green `[DPA-MH]`. Schedule to within 90% of daily goal on 90% of days `[GOAL·S]`. | **Why (Lag, tracked daily):** the headline accountability number. **Pitfalls:** goal of 0 (DPA forces YTD vs goal to 100%) `[DPA]`; providers without scheduled hours get no goal (DI's most common cause of a missing goal) `[DI-GOAL]`; goal basis (gross vs net) must match the numerator. |
| PRD-07 `daily_avg_needed_to_goal` | **Daily average needed** (Daily Avg to Meet Monthly Goal; Total Production per Day Needed to Achieve Monthly Goal — DPA). Production per remaining day required to hit the month. | (Monthly goal − MTD net production) ÷ remaining working days. Edge cases: remaining days 0 → use 1; negative → equals daily goal; daily goal 0 → 0 `[DPA]`. | ORG PRV TIME | — | **Why (Lead):** turns a gap into a daily ask. **Pitfalls:** remaining working days must use the provider calendar, not weekdays. |
| PRD-08 `production_forecast` | **Forecasted production** (Production Net Forecast — DI; Projection — PbN; Production to Goal — DPA). Expected period-end production. | Completed production through yesterday + scheduled production from today to period end `[DI-GL]`; DPA compares with a prorated goal `[DPA]`. | ORG PRV TIME | — | **Why (Lead):** month-end expectation management. **Pitfalls:** differs from scheduled production because it includes completed work `[DI-MH2]`; ignores expected cancellations and same-day adds unless a completion factor (PRD-13) is applied. |
| PRD-09 `avg_daily_net_production` | **Average daily production** (Avg. Daily Net Production — DPA; Production Per Day / Per Working Day — DI). Production per day worked. | Net production ÷ provider working days (0.5 / 1.0 rule) `[DPA]`; DI divides by days with completed production `[DI-GOAL]`. | ORG PRV PT TIME | Avg gross per day (2025): hygienist $1,091; general dentist $3,728; pediatric $5,346; endodontist $5,795; orthodontist $6,279; prosthodontist $6,294; periodontist $6,364; oral surgeon $10,339 `[PDDS-DD26]`. | **Why (Lag):** compares providers who work different schedules. **Pitfalls:** the working-day definition changes the answer; half days; PDDS figures are expected-collections gross. |
| PRD-10 `production_per_visit` | **Production per visit, PPV** ($ per Appointment — PbN; Production / Visit — DPA). Average value of a patient visit. | DI: gross production ÷ patient visits, visit credited to the primary provider `[DI-GOAL]`. DPA: net production from visit-coded procedures ÷ visit count `[DPA]`. PbN: gross production ÷ appointments `[PBN]`. | ORG PRV PT NE PAY TIME | None published in opened sources. | **Why (Lag):** the "efficiency core" of the profitability formula `[DI-SOD26]` → diagnosis, same-day treatment. **Pitfalls:** three different denominators (visits, appointments, patient-days); hygiene vs doctor mix shifts the blend; review with PPH `[DI-GOAL]`. |
| PRD-11 `production_per_hour` | **Production per hour, PPH** (Avg Scheduled Production per Hour — DPA). Production per clinical hour. | Production ÷ clinical hours (actual when recorded, otherwise scheduled) `[DI-GL]`. | ORG PRV PT TIME | Consultant targets only: dentist about $375 average with ~20% above $500; hygienist $150–175 `[PPH·S]`. Older data: net $216 dentist, $64 hygienist per hour (2016) `[PPH·S]`. | **Why (Lag):** the basis of hourly goals (§7). **Pitfalls:** hours source (template vs time clock vs appointment length); gross vs net; DPA "Prod Chair Per Hour" divides by working days despite its name `[DPA-HR]`. |
| PRD-12 `same_day_production_pct` | **Same-day production** (Same Day Net Production % — DPA; Production Same-Day % — DI; Same Day Production — DLY). Work done today that was not on the schedule. | DPA: (net production − scheduled production) ÷ scheduled production, appointments created on or before the prior day, missed excluded `[DPA]`. DI: production from procedures not planned or scheduled in advance; denominator not stated `[DI-GL]`. DLY: actual − scheduled `[DLY]`. | ORG PRV PT TIME | See TXA-06 for dollar-acceptance benchmarks. | **Why (Lag):** measures on-the-spot conversion and schedule flexibility. **Pitfalls:** two different concepts under one name (variance to schedule vs share of unscheduled work); goes negative when scheduled work cancels. |
| PRD-13 `actual_vs_scheduled_production_pct` | **Actual vs scheduled** (Actual vs. Scheduled Production — DPA; Production Completed % — DI). How much of the booked production materialized. | Actual production ÷ scheduled production × 100 `[DPA]`; DI variant: completed scheduled production ÷ scheduled production `[DI-GL]`. | ORG PRV PT TIME | DPA target 150%: < 135% red, 135–150% yellow, ≥ 150% green `[DPA]`; an older DPA glossary used < 70% red, ≥ 90% green `[DPA-PB·S]`. | **Why (Lag):** schedule leakage vs same-day adds. **Pitfalls:** the two variants answer different questions; snapshot time of "scheduled" must be fixed (start of day). |
| PRD-14 `new_patient_production_share` | **New-patient production share** (Production for New Patients, New Patient Gross Production — DI). Production generated by new patients. | Production on new patients' ledgers ÷ total (doctor) production. The window during which a patient counts as "new" is not defined by the sources `[unverified]`. | ORG PRV SRC TIME | Levin Group: 40% of doctor production from new patients `[DE-LEV25]`. PDDS: fastest-growing offices have the highest new-patient revenue dependency (4.8% ratio, 9.0% growth) `[PDDS-DD26]`. | **Why (Lead for growth):** new patients carry the largest untreated need. **Pitfalls:** "new" window must be explicit (first visit only vs first 12 months). |
| PRD-15 `daily_production_volatility_cv` | **Daily production volatility** (coefficient of variation). Consistency of day-to-day production. | Standard deviation of daily production ÷ mean daily production over the period (working days only). | ORG PRV DOW TIME | Warning > 0.5; target 0.3–0.5; elite < 0.3. Most consistent 10% (CV ≤ 0.19) grew 6.1%; most volatile 10% (CV ≥ 0.83) shrank 3.4% `[PDDS-DD26]`. | **Why (Lead):** volatile offices lose capacity → block scheduling, fill Fridays. **Pitfalls:** exclude closed days; small offices are naturally noisier. |
| PRD-16 `day_of_week_production_index` | **Day-of-week balance** (Friday vs Tuesday production). Weak-day detection. | Average production per weekday ÷ average production on the peak weekday. | ORG PRV DOW | Network Friday = 72.8% of Tuesday peak. Warning < 60%; target 70–80%; elite > 80% `[PDDS-DD26]`. Seasonality: April peak, September trough (23% swing) `[PDDS-DD26]`. | **Why (Lead):** offices whose peak day is Friday grew 12.0% vs about 6% for others `[PDDS-DD26]`. **Pitfalls:** offices closed on a weekday need the index computed on open days only. |

### 3.2 Collections and A/R (14)

| ID · key | KPI (aliases) — definition | Formula · rules · date basis | Seg | Benchmark / target | Why → action · Pitfalls |
|---|---|---|---|---|---|
| COL-01 `gross_collections` | **Gross collections** (Collections — DI, PbN; Gross Collections — DPA; Collections Per Working Day — DI). Money received. | Σ patient payments + insurance payments posted. POST / PAYD. Per working day = ÷ working days. | ORG PRV PAY USR TIME | — | **Why (Lag):** cash in. **Pitfalls:** payment date vs deposit date; prepayments and unapplied payments count as collections with no matching production; account-to-account transfers; refunds belong in COL-02. |
| COL-02 `net_collections` | **Net collections** (Collections Net — DI; Net Collections — DPA). Collections after payment-side adjustments. | Gross collections + signed collection adjustments (refunds, NSF, corrections) `[DPA]`; DI: only adjustment types configured as collection adjustments `[DI-GL]`. | ORG PRV PAY TIME | — | **Why (Lag):** numerator of the collection rate; basis of collection-based provider pay (Denticon points to its Income Allocation report for this) `[DEN-PAY·S]`. **Pitfalls:** adjustment classification must be configurable; DPA displays the absolute value `[DPA-MH]`; provider allocation of unallocated payments. |
| COL-03 `net_collection_rate` | **Collection %** (Collections % — DI; Collections as a % of Production — DPA; net / adjusted collection rate, NCR). Share of collectable production turned into cash. | Net collections ÷ net production × 100 over the same window. Prefer rolling 90 days / 12 months `[DI-GL]`. | ORG PRV PAY TIME | 98% of adjusted production `[ADA-MS]`. ≥ 98%; below 95% = "systemic collections failures" `[DIQ-RCM]`. 95–98% `[CURVE]`. DPA target 95% `[DPA]`. 2025: bottom 93%, average 102%, top 109% `[DI-SOD26]`. Denticon DSOs median 88.9% `[PDDS-DD26]`. | **Why (Lag):** revenue-cycle health → OTC collection, claim speed, A/R follow-up. **Pitfalls:** timing mismatch pushes single periods above 100% `[DI-SOD26]`; gross vs net denominator; prepayments (ortho contracts, memberships) inflate; practices believing they are at 95% often measure 88–92% `[DIQ-RCM]`. |
| COL-04 `gross_collection_rate` | **Gross collection rate** ("collection rate" in HSO-CI). Collections against billed (gross) production. | Collections ÷ gross production × 100. | ORG PAY TIME | HSO-CI 2026: average 72% (8+ locations) and 75% (1–7 locations) vs top 10% 97% `[HSO-CL]` `[HSO-ASC]` (denominator not stated; the level implies a billed / gross basis — inference). PDDS gross basis 80.4% `[PDDS-DD26]`. | **Why (Lag):** only useful to show fee-schedule drag. **Pitfalls:** "nearly meaningless" for management `[DIQ-RCM]`; never compare with COL-03 benchmarks. |
| COL-05 `otc_collection_rate` | **Time-of-service collection** (% OTC Collections — DPA; Collections % Same-Day Patient Portion — DI; Co-Pay Collection — JAR). Patient portion collected at the visit. | Patient payments on DOS ÷ estimated patient portion of that day's procedures; DPA matches on the same transaction date, computes daily, then cumulates `[DPA]`. | ORG PRV USR PAY TIME | Mean 87.9%, median 91.3%. Warning < 80%; target 80–95%; elite > 95%; recovery target 90% `[PDDS-DD26]`. | **Why (Lead for A/R):** the cheapest dollar to collect → estimate before the visit, collect at checkout; review 2–3 times per cycle `[BURK-FO]`. **Pitfalls:** depends on the quality of the insurance estimate; payment-plan installments and prepayments; exclude visits with $0 patient portion. |
| COL-06 `patient_vs_insurance_collection_mix` | **Collection mix** (% Patient / Gross Collections — DPA; Collections Patients, Collections Insurance — DI). Who pays. | Patient payments ÷ gross collections; insurance payments ÷ gross collections. | ORG PAY TIME | — | **Why (Lag):** payer dependence. **Pitfalls:** third-party financing payments classed as patient or other. |
| COL-07 `total_ar` | **Total A/R** (AR Total — DI; Outstanding A/R — DPA). Money owed for completed work. | Σ unpaid balances AS-OF; split into estimated patient portion and estimated insurance portion `[DPA]` `[DI-GL]`. | ORG PRV PAY | < $350K per office and < $50K in 90+ days, trending down `[PDDS-26]`. A/R ≤ about one month of production `[unverified]`. | **Why (Lag):** cash at risk. **Pitfalls:** credit balances included (DPA Morning Huddle) or ignored (DPA "A/R of today's patients" drops balances ≤ $0) `[DPA-MH]`; transaction-office vs home-office attribution; the patient / insurance split is an estimate until the EOB posts. |
| COL-08 `ar_aging_distribution` | **A/R aging and A/R over 90** (AR Patients 0–30 / 31–60 / 61–90 / 90+ — DI; A/R Aging — DPA; Aging Buckets — PbN). Age profile of receivables. | Balance per bucket; `ar_over_90_pct` = A/R older than 90 days ÷ total A/R. Buckets: 0–30, 31–60, 61–90, 90+ `[DI-GL]` `[PBN]`; DPA adds 120+ and, by provider, 180+ / 270+ / 360+ `[DPA]`. AS-OF. | ORG PRV PAY | Warning > 50% of A/R over 90; target 15–30%; elite < 15% `[PDDS-DD26]`. DPA colors: ≤ 60 days green, ≤ 90 yellow, > 90 red `[DPA]`. | **Why (Lag):** the older the balance, the less collectable (PDDS assumes 45% of > 90-day A/R is recoverable) `[PDDS-DD26]` → worklists by bucket. **Pitfalls:** aging start date (DOS vs statement vs claim date) must be declared; payment-plan balances age artificially; credits netted inside a bucket hide old debits; skipping month-end close can misage `[EOM·S]`. |
| COL-09 `ar_days` | **A/R days, DSO** (AR Days — DI, PbN; Avg. Days Sales Outstanding — DPA) and **A/R ratio** (AR Ratio — DI, PbN). How long money stays in A/R. | PbN: total A/R ÷ average daily collections; A/R ratio = A/R ÷ monthly production `[PBN]`. DPA: outstanding A/R ÷ (net collections ÷ Mon–Fri business days in range) `[DPA]`. | ORG PRV PAY TIME | 2025: bottom 74, average 26, top 5 days `[DI-SOD26]`. | **Why (Lag):** one-number cash-conversion speed. **Pitfalls:** production-based vs collections-based denominators; calendar vs business days; PDDS "Days in AR" is a different metric (claim submission → payment) `[PDDS-DD26]`. |
| COL-10 `patient_ar_past_due` | **Patient A/R past due** (AR Patients Past Due, AR Patients Past Due # — DI). Patient balances older than 30 days. | Σ patient-portion A/R aged > 30 days; count of patients `[DI-GL]`. AS-OF. | ORG PRV USR | — | **Why (Lead for bad debt):** → statements, text-to-pay, payment plans. **Pitfalls:** balances still pending insurance are not yet patient responsibility. |
| COL-11 `credit_balances` | **Credit balances / unapplied credits** (Patient Credits — PbN). Money held that is not applied to charges. | Σ negative account balances + unapplied payments, aged. AS-OF. | ORG USR | None published; "aged patient credits" are a named month-end review item `[CLA-15]`. | **Why (Lag):** credits understate A/R and create refund obligations → apply or refund. **Pitfalls:** legitimate prepayments (ortho, treatment deposits, memberships) vs posting errors; credits at family-member vs guarantor level. |
| COL-12 `bad_debt_rate` | **Bad-debt rate.** Share of production written off as uncollectable. | Bad-debt write-offs ÷ production (PDDS measures against gross). POST. | ORG PRV PAY TIME | Median 3.6%. Warning > 5%; target 1–3%; elite < 1% `[PDDS-DD26]`. | **Why (Lag):** the largest addressable leakage lever in the PDDS network ($338M) `[PDDS-DD26]`. **Pitfalls:** bad debt hidden under a generic adjustment code; collection-agency transfers. |
| COL-13 `ar_of_todays_patients` | **A/R of today's patients** (Outstanding A/R of Today's Patients — DPA; AR Balance tile — DI; Account Past Due AR — CareStack `[CS-HUD·S]`). Balances owed by patients on today's schedule. | Σ balance of patients with an appointment today, patient portion > 0 `[DPA]`; DI tracks how many of the morning list were collected by end of day `[DI-GL]`. | ORG PRV USR | — | **Why (Lead):** collect while the patient is in the building. **Pitfalls:** whole-family (guarantor) balance vs patient balance `[DPA-MH]`. |
| COL-14 `days_to_payment` | **Days to payment** (Days to payment — HSO; Collections % 30 Days — DI). Lag between service and cash. | Average (payment date − DOS), payment-weighted; or collections received within N days of the period ÷ that period's production `[DI-GL]`. | ORG PAY TIME | See RCM-06 for claim-level figures. | **Why (Lag):** separates slow payers from non-payers. **Pitfalls:** requires payment-to-procedure allocation. |

### 3.3 Insurance / RCM (14)

| ID · key | KPI (aliases) — definition | Formula · rules · date basis | Seg | Benchmark / target | Why → action · Pitfalls |
|---|---|---|---|---|---|
| RCM-01 `insurance_ar_aging` | **Insurance A/R and outstanding claims** (AR Insurance 0–30 / 31–60 / 61–90 / 90+, $, count and % — DI; Total Outstanding Claims, Count of Outstanding Claims, Claims Aging — DPA). Unpaid claims by age. | Open claim amount and count per aging bucket; by claim type (primary, secondary, tertiary, quaternary) and top carriers `[DPA]`; `insurance_ar_over_90_pct` = insurance A/R > 90 days ÷ total insurance A/R. AS-OF. | ORG PRV PAY | Insurance A/R over 90 days below 20%; practices commonly show 35–50% `[DIQ-RCM]`. | **Why (Lag):** claim follow-up worklist; review claims over 30 days monthly `[BURK-FO]`. **Pitfalls:** age from DOS vs sent date; claims never sent are invisible (RCM-05); pre-authorizations are not A/R. |
| RCM-02 `clean_claim_rate` | **Clean-claim rate.** Claims accepted on first pass. | Claims accepted by clearinghouse / payer without rejection or correction ÷ claims submitted. CLM. | ORG PAY USR TIME | Above 98%; below 90% means more than 10% of claims need rework `[DIQ-RCM]`. Clearinghouse-validated claims 99% `[PDDS-25]`. | **Why (Lead for A/R):** rework delays cash. **Pitfalls:** needs clearinghouse status feedback; rejection (pre-adjudication) vs denial (post-adjudication). |
| RCM-03 `claim_denial_rate` | **Denial rate** and **denial recovery.** Claims denied, and how many are later paid. | Denied claims (or lines) ÷ adjudicated claims; recovery = denied claims later paid ÷ denied. | ORG PAY PROC TIME | Denial ≤ 4%; above 8% may trigger payer integrity review; most practices 8–15%. 54% of denied claims paid after resubmission, about three cycles of 45–60 days; appeal within five business days `[DIQ-RCM]`. | **Why (Lag):** root-cause by denial reason. **Pitfalls:** needs ERA / EOB reason codes; line-level vs claim-level counting. |
| RCM-04 `same_day_claim_rate` | **Same-day claim rate** and **submission lag.** Speed of billing. | Claims transmitted on the DOS ÷ claims; lag = average calendar days from DOS to electronic transmission `[PDDS-DD26]`. | ORG USR PAY TIME | Warning < 20%; target 40–80%; elite > 80%. Lag 10.4 days in the < 20% tier vs 3.0 days above 80%; 37.4% of DSOs send fewer than 20% same day `[PDDS-DD26]`. | **Why (Lead):** "a configuration switch, not a culture change" `[PDDS-DD26]`. **Pitfalls:** claims held for attachments or narratives; batch creation time vs transmission time. |
| RCM-05 `unbilled_production` | **Unbilled production** (unsubmitted claims; production-to-claim gap). Insured work with no claim. | Completed procedures on insured patients with no claim created ÷ insured production; list by age. | ORG PRV USR | Reviews found 5–15% of documented production generated no claim `[DIQ-RCM]`. Un-submitted insurance report reviewed monthly `[BURK-FO]`. | **Why (Lead):** pure leakage → daily unsubmitted-claims check. **Pitfalls:** procedures legitimately not billable; secondary claims waiting for primary. |
| RCM-06 `claim_days_to_payment` | **Claim turnaround** ("Days in AR" in the PDDS glossary). Days from claim to payment. | Average (payment posted date − claim sent date), by carrier `[PDDS-DD26]`. | ORG PAY TIME | 92% of U.S. dental claims paid in under 20 days, 97% in under 30 `[PDDS-25]`. | **Why (Lag):** carrier scorecard. **Pitfalls:** partial payments; resubmissions restart the clock. |
| RCM-07 `contractual_writeoff_rate` | **Contractual write-off rate by payer** (AR Insurance Avg Write-offs — DI). Discount conceded per carrier. | Contractual write-offs ÷ gross (UCR) production, per carrier / plan / fee schedule. | PAY PROC PRV TIME | 7.8–8.2% of expected-fee gross `[PDDS-DD26]`; no UCR-basis benchmark found. | **Why (Lag):** payer profitability → contract decisions. **Pitfalls:** requires a UCR fee on every line; write-off posted at payment vs at charge. |
| RCM-08 `payer_mix` | **Payer mix** (Top Insurance Carriers by Net Production / by payment / by outstanding claims — DPA; Active Patients % by carrier — DI; FFS vs insurance production — ADA). Dependence on each payer. | Share of production, collections, patients and A/R by carrier and plan type. | ORG PAY TIME | Average 57% of patients covered by dental insurance; 10% of practices fully fee-for-service `[DE-LEV25]`. | **Why (Lag):** concentration risk; ADA advises tracking the FFS-to-insurance production ratio `[ADA-MS]`. **Pitfalls:** primary carrier at time of visit vs current carrier `[DI-GL]`; dual coverage. |
| RCM-09 `eligibility_verification_rate` | **Eligibility verified before visit.** | Insured appointments with eligibility verified ≥ 24–48 hours ahead ÷ insured appointments. APTD. | ORG USR PAY | Process target: verify 24–48 hours before each appointment `[DIQ-RCM]`. | **Why (Lead):** prevents denials and OTC shortfalls. **Pitfalls:** needs a verification timestamp per appointment. |
| RCM-10 `preauthorization_rate` | **Pre-authorization** (Percentage Preauthorized — DPA; Pre-Auth Outstanding Claims — Denticon). Planned treatment with a pre-auth. | DPA: distinct covered, pre-authorized patients ÷ distinct unscheduled patients with treatment plans `[DPA-FO]`; count and age of outstanding pre-auths `[DEN-EOM]`. | ORG PAY PRV | — | **Why (Lead):** unblocks scheduling of large cases. **Pitfalls:** pre-auth expiry dates. |
| RCM-11 `insurance_estimate_accuracy` | **Estimate accuracy** (AR Insurance (Est.), Collections Insurance Estimated Amount — DI expose the estimate). | (Estimated insurance payment − actual insurance payment) ÷ estimated, by carrier and code. | PAY PROC ORG | No published benchmark `[unverified]`. | **Why (Lead):** drives OTC accuracy and patient-balance surprises. **Pitfalls:** deductible and annual-maximum timing. |
| RCM-12 `fee_schedule_gap` | **Fee-schedule gap.** Contracted fees vs market percentile. | Contracted fee ÷ benchmark fee at a chosen percentile, by CDT code. | PAY PROC GEO | 70th percentile as baseline, 80th as negotiation target; some codes lag by 10–20% `[DIQ-RCM]`. | **Why (Lag):** fee negotiation list. **Pitfalls:** needs licensed benchmark fee data. |
| RCM-13 `rcm_health_score` | **RCM health score** (composite). | Five components, 20 points each, scored relative to peers: A/R > 90 rate, Days in A/R, OTC collection rate, bad-debt rate, patient-pay collection rate `[PDDS-DD26]`. | ORG | Median 50.5; Strong (75–100) 9.1% of DSOs; Above Average 42.3%; Below Average 39.8%; Poor 8.9% `[PDDS-DD26]`. | **Why (Lag):** one number for location ranking. **Pitfalls:** relative scoring moves with the peer set. |
| RCM-14 `capitation_utilization` | **Capitation utilization** (Capitation Utilization – Detail — Denticon). For DHMO / capitation offices. | Value of services delivered to capitated members vs capitation received; formula not documented in the opened article `[unverified]`. | ORG PAY | — | **Why (Lag):** plan profitability. **Pitfalls:** capitation checks are not production; co-pay schedules. Listed as a month-end report for managed-care offices `[DEN-EOM]`. |

### 3.4 Scheduling and capacity (13)

| ID · key | KPI (aliases) — definition | Formula · rules · date basis | Seg | Benchmark / target | Why → action · Pitfalls |
|---|---|---|---|---|---|
| SCH-01 `provider_utilization_pct` | **Schedule utilization** (Utilization MTD, Provider Utilization — DPA; chair utilization). Share of available provider time that is booked. | Provider working (booked) hours ÷ provider available hours × 100. Booked excludes cancelled, blocked, missed; available hours built from schedule + holiday / exception layers (§2.3) `[DPA]` `[DPA-FO]`. APTD. | ORG PRV PT APT DOW TIME | 85–90% is a common vendor target; average 73–78% `[UTIL·S]`. | **Why (Lead when run on future dates):** capacity actually sold → fill or trim hours. **Pitfalls:** booked ≠ productive; provider-based vs operatory-based; double booking exceeds 100%; whether blocks count as booked. |
| SCH-02 `open_time_pct` | **Open time / downtime** (Scheduled Utilization % — DPA for future ranges; open schedule gaps, next 10 business days — Curve). Unfilled bookable time. | Open time units ÷ available time units × 100, excluding lunch, meetings, training `[DE-HYG15]`; or 1 − scheduled hours ÷ available hours for a future window `[DPA]`. | ORG PRV PT APT TIME | Hygiene downtime 5–8% or less `[DE-HYG15]`. | **Why (Lead):** converts to dollars (open units × production per unit; example about $96,000 a year) `[DE-HYG15]`. **Pitfalls:** unit length (10 vs 15 minutes); template accuracy. |
| SCH-03 `no_show_rate` | **No-show rate** (Appointments No-Show — DI; Missed Appointment % — DPA; failed appointments — PbN). Patients who did not arrive and gave no notice. | No-show appointments ÷ scheduled appointments, blocks excluded. APTD. | ORG PRV PT APT PAY NE DOW TIME | 6.9% in 2025, 7.4% in 2024 `[PDDS-DD26]`. Average 3%, top 10% under 1% `[HSO-CL]`. Combined with cancellations 5% or less `[ADA-MS]`. | **Why (Lag):** lost chair time → confirmations, deposits, risk flags. **Pitfalls:** status semantics differ per PMS `[DI-GL]`; JAR adds cancellations inside 24 hours `[JAR]`; DPA "No Show Appt %" is missed + cancelled `[DPA]`; PDDS found higher no-show rates correlate with higher growth (a demand symptom), so do not optimize it in isolation `[PDDS-DD26]`. |
| SCH-04 `cancellation_rate` | **Cancellation rate** (Appointments Cancelled % — DI; Cancelled Appointment % — DPA). Appointments cancelled ahead of time. | Cancelled appointments ÷ scheduled appointments; split short notice (under 24 / 48 hours) vs advance. | ORG PRV PT APT PAY DOW TIME | 12.9% in 2025, 15.5% in 2024. Warning > 20%; target 10–15%; elite < 10%; offices under 5% grew 8.9% `[PDDS-DD26]`. Average 5%, top 10% under 1% `[HSO-CL]`. | **Why (Lag):** "the only clear growth killer" among leakage types `[PDDS-DD26]`. **Pitfalls:** reschedule vs cancel; office-initiated cancellations; a cancelled appointment that is rebooked the same day. |
| SCH-05 `broken_appointment_recovery` | **Broken appointments and recovery** (Appointments Broken, Cancelled Then Rescheduled, No-Show Then Rescheduled, Cancelled Still Unscheduled — DI; Failed or Cancelled $$, Recovered $$, Lost Appointments — PbN). | Broken = cancelled + no-show `[DI-GL]`; recovery rate = broken appointments later rescheduled ÷ broken; lost dollars = value of broken appointments not rescheduled `[PBN]`. | ORG PRV USR APT TIME | Average practice loses about 1 in 11 appointments to no-shows and late cancellations `[HSO-CL·S]`. | **Why (Lead):** the worklist that wins production back. **Pitfalls:** PbN's recovery window is unspecified ("X days") `[PBN]`; value by attached procedures. |
| SCH-06 `confirmation_rate` | **Confirmation rate** (Unconfirmed Appointments, next 7 days — DPA; DI Appointments Confirmed %, Confirmed After 1st / 2nd / 3rd Try — DI). | Confirmed appointments ÷ scheduled appointments in the window; DI counts confirmations at least one day ahead `[DI-GL]`; DPA lists unconfirmed count and fee amount `[DPA-FO]`. | ORG PRV USR APT | — | **Why (Lead):** predicts no-shows. **Pitfalls:** channel (text, email, call) and timestamp needed. |
| SCH-07 `new_patient_lead_time_days` | **New-patient lead time** (appointment lead time; wait time). Days a new patient waits for the first visit. | Average (first appointment date − booking date) for new patients; HPI asks owners for business days an average new patient waits, emergencies excluded `[ADA-Q3-26]`. | ORG PRV APT TIME | Average 23 days vs top 10% 7 days `[HSO-CL]`. 12.0 business days in Q3 2026 (13.9 in Q2 2026; 14.3 in Q3 2024) `[ADA-Q3-26]`. Schedule new patients within five days `[PDDS-25]`. | **Why (Lead):** long waits lose new patients. **Pitfalls:** calendar vs business days; patient-requested delay. |
| SCH-08 `next_available_appointment` | **Next available** (Next hygiene opening, Next doctor opening on the huddle sheet). | Days from today to the next open slot of a given length, per provider / appointment type `[BURK-AM]`. "Third next available" is used in medical access measurement `[unverified]`. | ORG PRV APT | — | **Why (Lead):** access and capacity signal. **Pitfalls:** depends on slot-length rules. |
| SCH-09 `patient_visits` | **Visits and visits per day** (Visits, Visits Per Working Day — DI; Patient Visits, Avg Visits Per Day — DPA). | Count of visits (§2.3); ÷ working days. DOS. | ORG PRV PT NE TIME | Restorative practice 9–15 patients per day (average 10.38) `[JAR-BM3]`; hygienist 7–8 patients per 8-hour day `[JAR-BM2]`. | **Why (Lag):** the "visits" term of the profitability formula. **Pitfalls:** visit vs appointment vs unique patient. |
| SCH-10 `pre_appointment_rate` | **Pre-appointment %** (Pre-Appointment % — DI; Active Scheduled % — PbN). Active patients who have a future appointment. | Active patients with ≥ 1 future appointment ÷ active patients. AS-OF. | ORG PRV NE AGE PAY | 2025: bottom 28%, average 54%, top 75% `[DI-SOD26]`. | **Why (Lead):** future visits already secured. **Pitfalls:** inherits the active-patient window; recalls stored as reminders, not appointments, do not count. |
| SCH-11 `reappointment_rate` | **Reappointment %** (Reappointment % — DPA; No reappointment % — DLY; Doctor Reappoint — JAR; Patients Not Rescheduled — DI). Patients seen who left with a next appointment. | Patients seen in the period with a future appointment (cancelled / missed excluded) ÷ patients seen `[DPA]`; DLY reports the complement for yesterday `[DLY]`; DPA Patient Visit Analysis variant divides by total appointments `[DPA]`. | ORG PRV PT NE PAY TIME | Average 76%, top 10% 92% `[HSO-CL]` (definition not stated). | **Why (Lead):** "back door" control; DI splits the not-rescheduled list into new patients, existing patients, broken appointments `[DI-MH2]`; DPA groups the not-reappointed by carrier `[DPA]`. **Pitfalls:** measured at checkout vs as of today; completed-treatment patients with nothing due. |
| SCH-12 `unscheduled_active_patients` | **Unscheduled active patients** (Unscheduled Active Patients 0–6 / 6–9 / 9–12 / 12–18 Months, Opportunity — DI). Active patients with nothing booked. | Count of active patients with no future appointment, bucketed by months since last visit; opportunity $ = count × average annual collections per patient, or × average appointment value `[DI-GL]`. AS-OF. | ORG PRV AGE PAY | Implied average 46% of active patients (complement of SCH-10) `[DI-SOD26]`. | **Why (Lead):** reactivation worklist with a dollar value. **Pitfalls:** opportunity value is an average, not a forecast. |
| SCH-13 `revenue_per_operatory` | **Revenue per chair.** Output per operatory. | Annual production ÷ number of operatories; daily = ÷ working days. | ORG | DSO average $205,690 (median $156,741); solo average $236,286 (median $184,502). Warning < $100K; target $150–200K; elite $300K+ `[PDDS-DD26]`. | **Why (Lag):** "efficiency beats size"; offices above $300K per chair grew 8.73% vs 5.31% below $50K `[PDDS-DD26]`. **Pitfalls:** needs an accurate operatory count per office; hygiene vs restorative chairs. |

### 3.5 Hygiene and recare (13)

| ID · key | KPI (aliases) — definition | Formula · rules · date basis | Seg | Benchmark / target | Why → action · Pitfalls |
|---|---|---|---|---|---|
| HYG-01 `hygiene_visits` | **Hygiene visits** (Hygiene Visits, Hygiene Visits Per Hour — DI; Hyg Pts Seen — PbN; Avg Quad Per Day, Avg Visits Per Day — DPA; Average SRP per day — JAR). | Completed visits containing a hygiene code (code set per §2.3); per hour ÷ clinical hours; SRP quads per working day `[DPA-HR]`. DOS. | ORG PRV PROC AGE TIME | Hygienist 7–8 patients per 8-hour day `[JAR-BM2]`. | **Why (Lag):** hygiene throughput. **Pitfalls:** code-based vs provider-role-based counting gives different totals across DI's own dashboards `[DI-HV]`. |
| HYG-02 `hygiene_reappointment_rate` | **Hygiene reappointment %** (Hygiene Re-Appointment % — DI; Hyg Pre-appoint % — PbN; Hygiene Reappointment — DPA, JAR). Hygiene patients who leave with the next hygiene visit booked. | *Recommended default:* completed hygiene visits for which a future hygiene appointment existed by end of the DOS ÷ completed hygiene visits (DI rule) `[DI-GL]`. Variants in §2.5. | ORG PRV NE AGE PAY TIME | 2025: bottom 53%, average 87%, top 94% `[DI-SOD26]`. 85–90% "industry benchmark" `[DI-MH]`. About 90% `[RDH-KPI]`. "Within 12 months" variant: 63% (2025), 60% (2024) `[PDDS-DD26]`. | **Why (Lead):** the main defence against attrition. **Pitfalls:** checkout-based vs as-of-today vs within-12-months definitions differ by 20+ points; PbN counts a doctor appointment as a reappointment `[PBN]`; patients moved to another provider; booked appointments that later cancel (see HYG-03). |
| HYG-03 `hygiene_pre_appointment_rate` | **Hygiene pre-appointment %** (Hygiene Pre-Appointment % — DI; Recall Current % — PbN; recare patients scheduled — ADA). Active hygiene patients with a future hygiene appointment. | Active hygiene patients with an upcoming hygiene appointment ÷ active hygiene patients. AS-OF. | ORG PRV AGE PAY | 2025: bottom 26%, average 59%, top 80% `[DI-SOD26]`. 90% "at all times" `[ADA-MS]`. | **Why (Lead):** shows whether checkout bookings stick; DI notes the average practice books 87% at checkout but holds only 59% `[DI-SOD26]`. **Pitfalls:** active-hygiene-patient definition (hygiene treatment within 18 months `[DI-GL]`). |
| HYG-04 `recall_overdue_rate` | **Recall overdue** (Recall Overdue %, Not on Recall % — PbN; Recall Due / Overdue but Not Scheduled — Denticon; Unscheduled Hygiene tile — DI). Patients past their recall date with no visit booked. | Overdue recall patients ÷ active recall patients; not on recall = overdue hygiene patients with no future appointment ÷ total patients `[PBN]`. Outreach yield = recall invites sent → hygiene appointments scheduled `[DI-SC]`. AS-OF. | ORG PRV AGE PAY USR | — | **Why (Lead):** recall worklist and outreach yield. **Pitfalls:** requires a recall due date and interval per patient; Denticon expects the recallable procedure inside the future appointment `[DEN-RCL·S]`. |
| HYG-05 `recare_active_rate` | **Patients active in recare** (# of Active Patients in Hygiene Recare — JAR). Share of the active base that is in the recare system. | Active patients with a recall schedule and a hygiene visit inside their interval ÷ active patients. | ORG PRV AGE | At least 85% `[ADA-MS]`. Active patients and active recare patients within 10% of each other `[JAR-BM2]`. | **Why (Lead):** hygiene below 25% of production "usually" signals an unsystematic recare process `[ADA-MS]`. **Pitfalls:** edentulous / specialty-only patients should be excluded. |
| HYG-06 `hygiene_retention_12m` | **Hygiene retention (12 months)** (Hygiene Retention Rate % (12 Months), Total Hygiene Retention — DPA; Adult / Child Hygiene Retention 6 and 12 months — JAR). Hygiene patients who came back. | Cohort = distinct patients with a hygiene code in the window 12 months earlier; retained = returned within the following 12 months for D1110, D1120 or D4910; by type: child D1120, prophy D1110, SRP D4341 / D4342, perio D4355 / D4910 `[DPA-HR]`. | ORG PRV AGE PAY | None published. | **Why (Lag):** true cohort retention. **Pitfalls:** needs 24 months of history; perio alternation between offices. |
| HYG-07 `hygiene_production_share` | **Hygiene share of production** (Production Hygiene % — DI; doctor vs hygiene production — ADA). | Hygiene production ÷ total production. | ORG PRV TIME | Hygiene 25%, dentist at least 75% `[ADA-MS]`. 25–35% `[DE-HYG15]` `[JAR-BM3]`. | **Why (Lag):** balance check. **Pitfalls:** code-based vs provider-based hygiene production; who is credited for exams and radiographs taken in hygiene. |
| HYG-08 `hygiene_production_per_hour` | **Hygiene production per hour / visit / day** (Hygienist's Production per Hour, per Visit — DI; Average Hygiene Dollars Per Hygiene Visit — DI; Prod Per Visit — DPA). | Hygiene production ÷ hygienist clinical hours, ÷ hygiene visits, ÷ hygienist working days. | ORG PRV TIME | Average gross $1,091 per hygienist-day (2025) `[PDDS-DD26]`. Hourly: consultant targets only `[PPH·S]`. | **Why (Lag):** hygienist scorecard and hourly goal. **Pitfalls:** assisted hygiene; gross vs net in PPO-heavy offices. |
| HYG-09 `hygienist_production_to_wage_ratio` | **Hygienist production vs wages.** | Hygienist production ÷ hygienist wages; inverse = wages ÷ production. | ORG PRV TIME | About 3× wages (wages about 33% of production; 47% flagged high) `[DE-HYG15]`. | **Why (Lag):** staffing economics. **Pitfalls:** needs payroll data; benefits and taxes in or out. |
| HYG-10 `perio_pct` | **Perio %** (Perio Patient % Age 30+, Perio Visit % — DI; Perio % — DPA, JAR). Share of adult patients in periodontal care. | DI benchmark: active patients over 30 in ongoing periodontal care ÷ active patients over 30 `[DI-SOD26]`; DI visit variant: hygiene visits for patients over 30 with perio procedures ÷ perio-likely hygiene visits `[DI-GL]`; DPA: retained hygiene patients with D4355 or D4910 within 12 months ÷ hygiene cohort `[DPA-HR]`. | ORG PRV AGE | 2025: bottom 1%, average 11%, top 32% `[DI-SOD26]`. Perio codes about one third of hygiene codes `[DE-HYG15]`. Healthy range 35–60% and "average 16%" as quoted by RDH magazine `[RDH-KPI]`. | **Why (Lag):** clinical standard-of-care signal; about half of adults over 30 have periodontitis `[RDH-KPI]`. **Pitfalls:** three different denominators; the RDH figures do not match the DI report they cite. |
| HYG-11 `perio_presentation_rate` | **Perio diagnosis and acceptance** (Perio Presented % (Tx Team), Perio Acceptance % (Tx Team) — DI; SRP Opportunities — DPA). | Perio-presented patients ÷ patients 30+ seen who have never been treated for periodontitis; accepted ÷ presented `[DI-GL]`. SRP opportunities = patients scheduled today for D4910 with no D4341 / D4342 (newer DPA also D1110, D1120, D4355) in the past 24 months `[DPA]`. | ORG PRV AGE | — | **Why (Lead):** finds under-diagnosis. **Pitfalls:** needs perio charting or diagnosis codes to be more than a code-pattern proxy. |
| HYG-12 `adjunctive_therapy_rate` | **Fluoride and adjunctive therapy** (Fluoride % — DI; Fluoride / Varnish %, Laser %, Irrigation %, Arestin %, Adjunctive Therapy % — DPA; Fluoride Percentage — JAR). | Hygiene visits with fluoride completed ÷ hygiene visits `[DI-GL]`; DPA: hygiene patients with any of D1206, D1208, D4999, D7465, D4921, D4381 ÷ hygiene patients `[DPA-HR]`. | ORG PRV AGE PAY | None published. | **Why (Lag):** preventive protocol adherence. **Pitfalls:** coverage frequency limits; visit-based vs patient-based denominators. |
| HYG-13 `hygiene_capacity_vs_demand` | **Hygiene capacity vs demand.** | Monthly hygiene demand = active patients ÷ 9 `[JAR-BM2]`; supply = hygienist days × visits per day. | ORG | 800–1,000 active patients per full-time hygienist `[DE-HYG15]`. | **Why (Lead):** hire / hours decisions. **Pitfalls:** perio patients on 3–4 month intervals raise demand. |

### 3.6 Case acceptance and treatment (11)

| ID · key | KPI (aliases) — definition | Formula · rules · date basis | Seg | Benchmark / target | Why → action · Pitfalls |
|---|---|---|---|---|---|
| TXA-01 `treatment_presented` | **Treatment presented / diagnosed** (Tx Presented, Pts Presented — PbN; Presented Dollars — DI; TX $ Diag — DLY; Patient Diagnosed, Diagnosed $ — DPA). | Σ fee of procedures added to treatment plans in the period; count of patients. CRT. | ORG PRV PT PROC NE TIME | — | **Why (Lead):** the top of the treatment funnel. **Pitfalls:** alternative plans double-count; re-entered plans; fee basis. |
| TXA-02 `diagnostic_pct` | **Diagnostic %** (Diagnosed % — PbN; Patient Diagnostic %, Patient Presented %, Presented % Restorative — DI; % of new / existing patients w/ treatment plans — JAR). Share of patients examined who had treatment planned. | Patients with new treatment planned ÷ patients receiving exams `[PBN]`; DI: unique patients with treatment documented or completed that day ÷ unique patients seen `[DI-MH]`. | ORG PRV NE AGE TIME | None published; 75% of restorative need is found in hygiene visits `[DE-HYG15]`. | **Why (Lead):** separates low diagnosis from low acceptance. **Pitfalls:** exam-based vs all-patients denominators. |
| TXA-03 `avg_tx_presented_per_exam` | **Dollars presented per exam** (Average Restorative $ Presented Per Exam — DI; Avg. Treatment plan ($) per New / Existing Pts — JAR). | Restorative and elective dollars presented ÷ exams performed. | ORG PRV NE TIME | 2025: bottom $750, average $1,716, top $2,955 `[DI-SOD26]`. | **Why (Lead):** diagnostic thoroughness; fell 7.6% for average practices in 2025 `[DI-SOD26]`. **Pitfalls:** fee basis; phased plans. |
| TXA-04 `case_acceptance_rate_patients` | **Case acceptance (patients / plans)** (Patient Acceptance % — DI; PT Accept % — PbN; Case Acceptance Rate — DPA, JAR). | Patients (or plans) accepting ≥ 1 item ÷ patients (or plans) presented; DPA counts plans in Accepted / Scheduled / Completed status `[DPA]`. | ORG PRV NE PROC PAY TIME | 58% in 2025, 57% in 2024 (plan status) `[PDDS-DD26]`. Average 45%, top 10% 75% `[HSO-CL]`. 75–80% `[ADA-MS]`. | **Why (Lead):** conversion of diagnosis. **Pitfalls:** accepting one of eight items counts as full acceptance `[DI-MM·S]`; status must be maintained by staff; PDDS found acceptance does not drive growth linearly `[PDDS-DD26]`. |
| TXA-05 `case_acceptance_rate_dollars` | **Case acceptance (dollars)** (Treatment $ Case Acceptance %, Acceptance % Dollars — DI; Tx Acceptance % — PbN). | Accepted dollars ÷ presented dollars; cohort by presentation date. | ORG PRV NE PROC PAY TIME | 2025: bottom 23%, average 41%, top 62% `[DI-SOD26]`. By case value: 82.9% under $50 falling to 46.0% at $300–500 `[PDDS-DD26]`. | **Why (Lead):** the honest version of acceptance. **Pitfalls:** same-day-only rule (DI) vs any later acceptance; alternative plans inflate the denominator. |
| TXA-06 `same_day_acceptance_pct` | **Same-day acceptance** (Same-Day Treatment $ Acceptance % — DI; Case Acceptance – Same Day — JAR; Same Day Treatment — PbN). | Dollars presented and completed in the same visit ÷ dollars presented (DI help text also describes it as share of gross production from unplanned procedures `[DI-BM]`). | ORG PRV TIME | 2025: bottom 15%, average 31%, top 50% `[DI-SOD26]`. | **Why (Lead):** removes the reschedule risk. **Pitfalls:** fluoride excluded in one DI variant `[DI-GL]`. |
| TXA-07 `case_completion_rate` | **Case completion.** Plans that were actually finished. | Treatment plans created in a cohort window and completed by the cutoff ÷ plans created (PDDS: created in H1, completed by year end). | ORG PRV PROC PAY | 47% in 2025, 42% in 2024 `[PDDS-DD26]`. | **Why (Lag):** "the metric that actually pays the bills" `[PDDS-DD26]`. **Pitfalls:** cohort definition; partial completion. |
| TXA-08 `acceptance_completion_gap` | **Acceptance–completion gap.** | Case acceptance % − case completion %, in percentage points. | ORG PRV | Warning > 30pp; target 10–30pp; offices with a 50+pp gap show 77.2% acceptance but 19.7% completion `[PDDS-DD26]`. | **Why (Lead):** follow-through problem detector. **Pitfalls:** both inputs must use the same cohort. |
| TXA-09 `unscheduled_treatment` | **Unscheduled treatment** (Unscheduled Tx $ — JAR; Unscheduled TX, Unscheduled Treatment tile — DI; Unscheduled Patients with Accepted / Unaccepted Treatment Plan — DPA; Treatment Plan Status Report — Denticon). | Σ fee of planned procedures that are neither completed nor scheduled; split accepted vs not accepted; patients and dollars; age by plan date. AS-OF. | ORG PRV PROC PAY AGE | — | **Why (Lead):** the largest recoverable production pool. **Pitfalls:** stale plans (set an age cut-off); superseded alternatives; insurance maximum already used. |
| TXA-10 `treatment_funnel_pct` | **Treatment funnel** (% Accepted, % Scheduled, % Completed, % Unscheduled — DPA; Tx Accepted, Tx Scheduled — DLY). | Status fees ÷ diagnosed fees for plans in the range `[DPA-TP]`. | ORG PRV PROC TIME | — | **Why (Lag):** shows where dollars stall. **Pitfalls:** statuses overlap unless a strict hierarchy is applied. |
| TXA-11 `avg_accepted_per_patient` | **Average accepted per patient** (Avg. Accepted $ per Patient, Avg. Treatment Presented — DI; acceptance by category: hygiene, restorative, new patients — DI). | Accepted dollars ÷ unique patients who accepted; presented dollars ÷ patients presented `[DI-GOAL]`. | ORG PRV NE PROC | — | **Why (Lag):** case-size coaching. **Pitfalls:** outliers (full-mouth cases). |

### 3.7 Patients — acquisition, retention, value (12)

| ID · key | KPI (aliases) — definition | Formula · rules · date basis | Seg | Benchmark / target | Why → action · Pitfalls |
|---|---|---|---|---|---|
| PAT-01 `new_patients` | **New patients** (New Patients, New Patients Per Working Day, MTD / QTD / YTD — DI; New Patients Seen, Total New Patients Projected this Month — DPA; NP Seen — PbN). | Count per §2.3; projection = MTD + (MTD ÷ working days MTD) × remaining working days `[DPA]`. | ORG PRV SRC PAY AGE GEO TIME | Average 46 per practice per month (2025), 43 (2024). Warning < 35; target 35–75; elite 75+ `[PDDS-DD26]`. Average 39, top 10% 82 per location per month `[HSO-CL]`. Increase 10–15% a year `[ADA-MS]`. At least 20–25 per doctor per month `[DE-HYG15]`. | **Why (Lead):** the strongest predictor of revenue growth in the PDDS data `[PDDS-DD26]`. **Pitfalls:** created-profile vs first-visit counting; emergency-only patients; duplicates across locations `[HSO-ASC]`. |
| PAT-02 `active_patients` | **Active patients** (Active Patients — DI, DPA, PbN; # of Active Patients — JAR). | Count per the active window (§2.4). AS-OF. | ORG PRV AGE PAY GEO | 800–1,000 per full-time hygienist `[DE-HYG15]`. | **Why (Lag):** the asset base; valuation input. **Pitfalls:** 12 / 18 / 24-month windows; PMS status flags; duplicates. |
| PAT-03 `attrition_rate` | **Attrition / patients lost** (Patients Lost — DI; Patient Attrition — JAR; Going Inactive % — PbN; Inactive Patients — DPA). | Patients who crossed the inactivity threshold or were set inactive in the period ÷ active patients at the start. | ORG PRV AGE PAY | About 10% normal `[DE-4STEP]`. 12–15% `[JAR-BM2]`. 17% average vs 3% for the top 10% `[DT-CLV]`. | **Why (Lag):** sets the replacement need: new patients needed = attrition replacement + (revenue shortfall ÷ patient value) `[DE-4STEP]`. **Pitfalls:** status-change vs inactivity causes should be separated `[DI-NP]`. |
| PAT-04 `reactivated_patients` | **Reactivated / recaptured** (Recaptured Patients — DI; Reactivated — PbN; reactivation rate — Curve). | Patients with no visit for the active window who completed a visit (DI) or booked an appointment (PbN) in the period. | ORG PRV USR SRC | — | **Why (Lag):** outreach results. **Pitfalls:** completed vs merely booked. |
| PAT-05 `net_patient_growth_pct` | **Net patient growth** (Patient Growth % — DI; Net Growth — PbN; Patients Net Growth — DI). | (New + reactivated − lost) ÷ active patients at start `[DI-SOD26]`; PbN: (patients at end − patients at start) ÷ patients at start `[PBN]`. | ORG PRV TIME | 2025: bottom −11%, average 3%, top 17% `[DI-SOD26]`. | **Why (Lag):** "growing, or merely replacing lost patients" `[DI-SOD26]`. **Pitfalls:** all three components inherit their own definition choices. |
| PAT-06 `patient_retention_rate` | **Patient retention** (retention rate — HSO-CI; Retention % — PbN; Patient Retention — JAR; Provider Retention Rate % (12 mo) — DPA). | HSO-CI: active patients who return within 18 months ÷ active patients `[HSO-RET]`. PbN: patients active 12 months ago who still have a future appointment ÷ patients active 12 months ago `[PBN]`. JAR: exam within 18 months ÷ active (36 months) `[JAR]`. DPA: patients with D0120 / D0145 twelve months ago who returned within the next 12 months `[DPA]`. | ORG PRV AGE PAY | Average 58% (8+ locations) and 64% (1–7 locations) vs top 10% 90–92% `[HSO-CL]` `[HSO-ASC]`; fell from 72% to 64% year over year `[HSO-DT]`. | **Why (Lag):** lifetime value driver. **Pitfalls:** four incompatible formulas under one name. |
| PAT-07 `at_risk_patients` | **At-risk patients** (Danger Zone Patients — DPA; Going Inactive % — PbN; Unscheduled Active Patients 12–18 Months — DI). | Patients whose last visit was 12–24 months ago `[DPA]`; or at month 17 of an 18-month window `[PBN]`. AS-OF. | ORG PRV AGE PAY | Patients 12–18 months overdue and unscheduled are the priority group `[HSO-RET]`. | **Why (Lead):** last chance before attrition. **Pitfalls:** window alignment with PAT-02. |
| PAT-08 `new_patient_reappointment_rate` | **New-patient reappointment** (New Patient Re-Appointment %, NP Hyg Re-Appointment % — DI; NP Pre-appt % — PbN). | New patients with a future (hygiene) appointment booked on or before the first visit ÷ new patients seen `[DI-GL]`. | ORG PRV SRC TIME | 2025: bottom 22%, average 50%, top 69% `[DI-SOD26]`. | **Why (Lead):** converts acquisition spend into a patient of record. **Pitfalls:** hygiene-only vs any appointment. |
| PAT-09 `patient_value_annual` | **Annual value per patient.** | Production (or collections) over the last 12 months ÷ active patients `[DE-4STEP]`; DI uses average annual collections per patient to value unscheduled patients `[DI-GL]`. | ORG PAY AGE | — | **Why (Lag):** converts patient counts to dollars. **Pitfalls:** production vs collections. |
| PAT-10 `patient_lifetime_value` | **Patient lifetime value.** | Visits per year × tenure (1 ÷ attrition rate) ÷ (1 − referrals per patient) × production per visit × collection rate `[DT-CLV]`. | ORG SRC PAY | First-year value $850–1,300; lifetime $8,000–10,000+ (vendor-authored, unattributed) `[DE-CALLS]`. | **Why (Lag):** ceiling for acquisition cost. **Pitfalls:** very assumption-sensitive; show inputs. |
| PAT-11 `unscheduled_family_members` | **Unscheduled family members** (DI tile; CareStack Huddle `[CS-HUD·S]`). | Family members of today's patients who are active (or have planned treatment) and have no future appointment `[DI-MH2]`. AS-OF. | ORG USR | — | **Why (Lead):** same-conversation booking. **Pitfalls:** depends on family / guarantor linkage. |
| PAT-12 `patients_seen_unique` | **Unique patients seen** (Total Patients Seen — DPA; Patients Seen — PbN) and demographics (Patients by Zip Code — DPA). | Distinct patients with a visit in the range; by age band, zip, insurance status. | ORG PRV AGE GEO PAY TIME | — | **Why (Lag):** reach; ADA lists patient demographics among items to track `[ADA-MS]`. **Pitfalls:** distinct across providers and offices. |

### 3.8 Providers — doctor and hygienist scorecards (10)

A provider scorecard is mostly a provider slice of the KPIs above. The rows below are the provider-specific ones; the scorecard sets follow the table.

| ID · key | KPI (aliases) — definition | Formula · rules · date basis | Seg | Benchmark / target | Why → action · Pitfalls |
|---|---|---|---|---|---|
| PRV-01 `provider_production_vs_goal` | **Provider production vs goal** (Avg. Daily Net Production vs. Daily Goal by Providers — DPA; Dentist / Hygienist Production (Gross, Net) — DI). | Provider net production ÷ provider working days, compared with that provider's daily goal; chart top 15, bottom 15 or all `[DPA]`. | PRV PT ORG TIME | Daily gross by provider type in PRD-09 `[PDDS-DD26]`. | **Why (Lag):** the core scorecard line. **Pitfalls:** treating vs billing provider; associates working in several offices; hygiene exams credited to the doctor. |
| PRV-02 `provider_production_per_hour` | **Provider PPH and PPV** (Dentist's / Hygienist's Production per Hour and per Visit, gross and three net bases — DI; Average Doctor Production per Hour, Average Production per Doctor Appointment — JAR). | PRD-11 and PRD-10 by provider and role `[DI-MH]`. | PRV PT TIME | See PRD-11. | **Why (Lag):** normalizes for hours worked; DI advises reading PPH with PPV `[DI-GOAL]`. **Pitfalls:** actual vs scheduled hours. |
| PRV-03 `provider_clinical_hours` | **Clinical hours and days** (Clinical Hours Actual / Scheduled, Clinical Days Scheduled, Completed Clinical Days — DI; Total Doctor Days — DPA; Provider Worked Days — JAR). | Σ scheduled hours; actual hours when recorded; working days by the 0.5 / 1.0 rule `[DPA]`. | PRV PT ORG TIME | GP dentists average 36.1 hours a week in the office, 30.5 treating patients (2024); owners 37.0 vs employees 31.8 `[ADA-SDP]`. | **Why:** the denominator of every per-hour and per-day KPI and the base of goals (§7). **Pitfalls:** blank scheduled hours are the most common reason a goal fails to display `[DI-GOAL]`. |
| PRV-04 `provider_collections` | **Provider collections** (Provider Collections report — DPA; Income Allocation report — Denticon `[DEN-PAY·S]`). | Net collections allocated to the provider's production; collection %, patient / gross share, DSO, A/R aging to 360+ days and outstanding claims by provider `[DPA]`. | PRV PT ORG PAY TIME | — | **Why (Lag):** basis of collection-based pay. **Pitfalls:** allocation of unallocated payments; office "daily reports" total differs from income allocated for services rendered at the location `[DEN-PAY·S]`. |
| PRV-05 `provider_diagnosis_and_acceptance` | **Provider diagnosis and acceptance** (Patient Presented %, Patient Acceptance %, Treatment $ Acceptance %, Avg. Treatment Presented, Avg. Treatment Accepted — DI; Case Acceptance % by provider — DPA). | TXA-02, TXA-04, TXA-05 by presenting provider or treatment team `[DI-GOAL]`. | PRV PT NE TIME | See TXA rows. | **Why (Lead):** coaching focus. **Pitfalls:** who "presented" (doctor, hygienist, treatment coordinator); small denominators. |
| PRV-06 `provider_retention_rate_12m` | **Provider retention** (Provider Retention Rate % (12 mo) — DPA). | Patients with D0120 / D0145 by that provider twelve months ago who returned within the next 12 months ÷ that cohort `[DPA]`. | PRV ORG | — | **Why (Lag):** relationship quality. **Pitfalls:** recare exams performed by another provider. |
| PRV-07 `provider_adjustment_rate` | **Provider adjustments** (Adjustments by provider; review of adjustments — Burkhart). | Production adjustments attributed to the provider ÷ provider gross production; list by type and user. | PRV USR PAY TIME | — | **Why (Lag):** discount discipline; doctors are told to question unusual adjustments daily and monthly `[BURK-FO]`. **Pitfalls:** contractual write-offs reflect payer mix, not behaviour. |
| PRV-08 `provider_comp_ratio` | **Provider compensation ratio.** | Provider pay ÷ adjusted production `[PDDS-26]`. | PRV PT ORG | About 32% overall, varies by provider type `[PDDS-26]`. Owner compensation 35–40% of collections `[DE-OH]`. | **Why (Lag):** largest expense line. **Pitfalls:** needs payroll / GL data; production vs collections basis. |
| PRV-09 `hygienist_scorecard_rates` | **Hygienist rates** (Hygiene Re-Appointment %, NP Hygiene Re-Appointment %, Perio %, Fluoride % by hygienist — DI; Hygiene KPI set — JAR). | HYG-02, PAT-08, HYG-10, HYG-12 by hygienist. | PRV ORG TIME | See HYG rows. | **Why (Lead):** the hygienist-controlled levers. **Pitfalls:** attribute to the treating hygienist, not the appointment column. |
| PRV-10 `doctor_time_in_hygiene` | **Doctor time in hygiene** and **new patients per doctor.** | Doctor hours spent on hygiene exams ÷ doctor hours; new patients ÷ doctors. | PRV ORG | Concern at about 25% of doctor time; at least 20–25 new patients per doctor per month `[DE-HYG15]`. | **Why (Lag):** capacity diagnosis. **Pitfalls:** exam time is rarely recorded. |

**Scorecard sets assembled from vendor scorecards** (`[DI-GOAL]` provider goals; `[DPA]` Provider Breakdown and Hygiene Recall; `[JAR]` Doctor KPI and Hygiene KPI lists):

| Scorecard | Metrics |
|---|---|
| Doctor | Net production and % to goal; production per day, per hour, per visit; same-day production %; patients presented %; patient acceptance %; treatment $ acceptance %; average $ presented and accepted; collection %; utilization; doctor days; new patients; recare patients; missed / cancelled / no-show %; retention (12 mo); adjustments; actual vs scheduled production. |
| Hygienist | Net production and % to goal; production per day, per hour, per visit; hygiene visits per day; hygiene reappointment %; new-patient hygiene reappointment %; hygiene retention (12 mo) by patient type; perio %; SRP quads per day; fluoride and adjunctive therapy %; treatment presented in hygiene visits; open time %; production ÷ wages. |
| Team member (front office) | See §3.12; DI scorecards support a Team Members focus `[DI-SC]`. |

### 3.9 Clinical mix (9)

| ID · key | KPI (aliases) — definition | Formula · rules · date basis | Seg | Benchmark / target | Why → action · Pitfalls |
|---|---|---|---|---|---|
| CLN-01 `production_by_procedure_category` | **Production by procedure category** (Net Production by Procedure Category → ADA code — DPA; Production Hygiene / Restorative and Specialty / Other % — DI). | Net production by ADA category ÷ total; drill to CDT code. | ORG PRV PAY TIME | Network revenue and revenue per procedure: preventive $596.6M ($60); restorative $540.2M ($158); crowns $476.3M ($656); diagnostic $431.0M ($53); oral surgery $283.6M ($225); periodontics $215.9M ($128); implants $214.5M ($1,305); orthodontics $185.0M ($244 blended) `[PDDS-DD26]`. | **Why (Lag):** "volume engine" (preventive, diagnostic) vs "value engine" (implants, crowns, ortho, surgery) `[PDDS-DD26]`. **Pitfalls:** custom codes and non-standard descriptions ($267.8M "uncategorized" in the PDDS data); category mapping must be maintained centrally. |
| CLN-02 `key_procedure_counts` | **Key procedure counts** (Crowns Completed, Crowns Production, Fluorides, Bitewings, Panos, FMX, Sealants Completed — DI; RCT Count, Implant Placement Count, Stainless Steel Crowns, Pulpotomies, Whitening — JAR). | Count and production of flagged code groups; rate per 100 visits or per working day. | ORG PRV PROC TIME | — | **Why (Lag):** service-line tracking and case-mix coaching. **Pitfalls:** code groups need versioned definitions (annual CDT changes; Denticon makes offices apply yearly ADA code changes `[DEN-EOY]`). |
| CLN-03 `exam_mix` | **Exam mix** (Exams Today: new patient / recare / emergency; New vs. Recare vs. Emergency Trend — DPA; Emergency Exams, Continuing Care Exams — DLY). | Counts of D0150, D0120 + D0145, D0140 + D0160 `[DPA]`. | ORG PRV TIME | — | **Why (Lead):** demand composition for the day and trend. **Pitfalls:** recare counted as transactions, not patients, in some DPA views `[DPA-MH]`. |
| CLN-04 `revenue_per_procedure` | **Revenue per procedure / per case** by service line. | Production ÷ procedure count per category; per case for multi-code cases. | PROC ORG PRV PAY | Implants about $1,351 per case; crowns $656–942 per procedure; one implant ≈ 22 preventive visits in revenue `[PDDS-DD26]`. | **Why (Lag):** pricing and mix. **Pitfalls:** blended codes (ortho $244 is retainers, adjustments and repairs, not case fees) `[PDDS-DD26]`. |
| CLN-05 `perio_to_prophy_mix` | **Perio vs prophy mix.** | Perio codes (D4341, D4342, D4910) ÷ all hygiene codes `[DE-HYG15]`. | ORG PRV AGE | About one third (example 36%) `[DE-HYG15]`. | **Why (Lag):** under-diagnosis screen. **Pitfalls:** patient age mix. |
| CLN-06 `radiograph_rate` | **Radiograph rates** (New Patients Fmx % — JAR; Bitewings / Panos / FMX Completed — DI; Average FMX per day — JAR). | New patients with FMX or pano ÷ new patients; bitewings ÷ recare visits. | ORG PRV NE | — | **Why (Lag):** protocol adherence. **Pitfalls:** frequency limits; refused radiographs. |
| CLN-07 `referral_out_rate` | **Referrals out and internal capture** (Top Referrals: internal and external counts by specialty — DPA). | External referrals ÷ (internal + external), by specialty of the referring or referred provider `[DPA-TP]`. | ORG PRV PROC | "Reduce outside referrals" is a listed same-store growth tip `[PDDS-25]`. | **Why (Lead):** specialty production kept in-house. **Pitfalls:** referrals must be recorded as structured data. |
| CLN-08 `preventive_quality_measures` | **Quality measures** (ADA Dental Quality Alliance). | Measure families include sealant receipt on permanent first / second molars, topical fluoride for elevated caries risk, caries-risk documentation, periodontal evaluation and maintenance in adults with periodontitis, utilization of services `[DQA·S]`. | ORG PRV AGE PAY | Program-specific. | **Why (Lag):** payer and Medicaid quality reporting. **Pitfalls:** use the DQA specifications for numerators, denominators and value sets; not opened for this document. |
| CLN-09 `specialty_kpi_sets` | **Specialty KPI sets** (JAR Endo, Oral Surgery, Pedo, Perio lists). | Endo: RCT count, re-treats, consults per day. Oral surgery: implant placement count and $, extraction $, sedation $, treatment plan per exam. Pedo: fillings, fluoride, sealants, pulpotomies, stainless steel crowns, space maintainers, nitrous / sedations, production per patient. Perio: perio codes, implant placement, consults per day `[JAR]`. | ORG PRV PROC TIME | — | **Why:** specialty offices need their own scorecards. **Pitfalls:** definitions sit on individual JAR pages that were not all opened. |

### 3.10 Marketing and referrals (11)

| ID · key | KPI (aliases) — definition | Formula · rules · date basis | Seg | Benchmark / target | Why → action · Pitfalls |
|---|---|---|---|---|---|
| MKT-01 `new_patient_inquiries` | **New-patient inquiries / leads.** First contacts from prospective patients. | Count of first-time calls, web forms and online bookings. CRT. | ORG SRC USR TIME | 72.9% of new leads arrive by phone, 27.1% by online form; 58.7% from marketing channels, 41.3% direct or referral (≈ 50,000 leads, 2023) `[LIINE24]`. | **Why (Lead):** demand before it reaches the PMS; "a large portion of new patient leads never reach the EHR" `[LIINE24]`. **Pitfalls:** needs phone / web integration; existing-patient calls must be filtered out. |
| MKT-02 `lead_to_appointment_conversion` | **Inquiry-to-appointment conversion** (booking rate; call conversion). | Inquiries that result in a scheduled appointment ÷ inquiries; by channel and by staff member. | ORG SRC USR TIME | 57.1% of inquiries convert; staff with 250+ calls: best 74.1%, average 53.1%, worst 25.5%; Facebook leads convert lowest (about 36%), other channels roughly 48–73% (chart values could not be paired to channels reliably from the extracted text) `[LIINE24]`. | **Why (Lead):** the cheapest growth lever. **Pitfalls:** booked vs kept; multiple calls from one prospect. |
| MKT-03 `call_answer_rate` | **Call answer / missed-call rate.** | Answered inbound calls ÷ inbound calls during business hours; missed = complement. | ORG USR DOW TIME | 30–38% of business-hours calls missed, per unnamed "industry benchmarks" in a vendor-authored article `[DE-CALLS]`. | **Why (Lead):** every missed new-patient call is lost first-year production. **Pitfalls:** after-hours calls; abandoned vs voicemail; unverifiable vendor numbers. |
| MKT-04 `reasons_not_booked` | **Reasons not booked.** | Distribution of reasons for unconverted inquiries. | ORG SRC PAY USR | Medicaid not accepted 21.0%; caller procrastination 17.6%; out-of-network insurance 13.4%; scheduling issue 12.0%; staff took a message 7.1%; dropped call 6.0%; verifying insurance first 6.0%; treatment not offered 4.8% `[LIINE24]`. | **Why (Lead):** separates training gaps from policy gaps. **Pitfalls:** needs structured reason capture. |
| MKT-05 `new_patients_by_source` | **New patients by referral source** (Referral Sources focus, New Patients Missing Referral Source — DI; patients by referral source — ADA). | New patients, production and collections grouped by source category `[DI-SC]`; missing-source count `[DI-GL]`. | SRC ORG PRV TIME | — | **Why (Lag):** spend allocation. **Pitfalls:** source captured at registration is self-reported; "missing" must be measured. |
| MKT-06 `patient_referral_rate` | **Patient (word-of-mouth) referral rate.** | New patients referred by existing patients ÷ new patients (share) or ÷ active patients (rate per patient). | ORG PRV TIME | Example model uses 0.25 referrals per patient `[DT-CLV]`. | **Why (Lag):** lowest-cost acquisition; huddle sheets name patients to ask for referrals `[BURK-AM]`. **Pitfalls:** referring-patient link must be stored. |
| MKT-07 `cost_per_new_patient` | **Cost per new patient (acquisition cost).** | Marketing spend ÷ new patients attributed to marketing; by channel. | SRC ORG TIME | $150–300 commonly quoted; other vendor sources range from $74 to $375 `[MKT·S]`. | **Why (Lag):** compare with PAT-10. **Pitfalls:** spend data lives outside the PMS; attribution windows. |
| MKT-08 `marketing_roi` | **Marketing ROI.** | (Collections from marketing-sourced patients − spend) ÷ spend. | SRC ORG TIME | 3:1 to 5:1 commonly quoted `[MKT·S]`. | **Why (Lag):** budget decisions. **Pitfalls:** revenue-based vs profit-based; first-year vs lifetime. |
| MKT-09 `marketing_spend_pct` | **Marketing spend as % of collections.** | Marketing expense ÷ collections. | ORG TIME | 1–2% within "other business expenses" `[DE-OH]`; 3–6% in vendor guides `[OH·S]`. | **Why (Lag):** budgeting norm. **Pitfalls:** needs expense data. |
| MKT-10 `digital_engagement` | **Online scheduling and campaign engagement** (DI Appointments Online Scheduled, Online Scheduled New Patients, Campaign Emails Sent / Delivered / Opened / Link Clicked — DI). | Online-booked appointments ÷ appointments booked; email funnel rates `[DI-SC]`. | ORG SRC TIME | — | **Why (Lead):** channel shift. **Pitfalls:** only populated when the engagement product is in use `[DI-SC]`. |
| MKT-11 `reviews_and_satisfaction` | **Reviews, satisfaction, NPS** (patient satisfaction scores — Curve; net promoter score — CLA). | Review count and average rating by location; survey score by theme (wait time, communication, billing, staff) `[CURVE]`. | ORG PRV TIME | 94% of patients use reviews in choosing a provider (as cited) `[DE-4STEP]`. | **Why (Lag):** reputation. **Pitfalls:** an overall star rating is hard to act on; segment it `[CURVE]`. |

### 3.11 Orthodontics (14)

| ID · key | KPI (aliases) — definition | Formula · rules · date basis | Seg | Benchmark / target | Why → action · Pitfalls |
|---|---|---|---|---|---|
| ORT-01 `ortho_new_patient_exams` | **New-patient exams / consults** (Exams Completed, New Patients Added — Gaidge; Total Consults, Consults per day — JAR). | Count of completed new-patient ortho exams. | ORG PRV SRC AGE TIME | 633.5 exams per practice on average in 2025 (17.5% of locations above 1,000 a year); 315.8 in the 2024 report `[PDDS-DD26]` `[PDDS-25]`. | **Why (Lead):** top of the ortho funnel. **Pitfalls:** the two PDDS report years use different samples; observation re-exams must not be counted as new exams. |
| ORT-02 `ortho_starts` | **Starts** (Treatment Starts Detail — Gaidge; Comprehensive Starts, Clear Aligners Starts, Phase 1 Count — JAR). | Count of treatment starts by type (comprehensive, phase 1, phase 2, aligner, limited). | ORG PRV PROC AGE TIME | 203.5 starts per practice (2024) `[PDDS-25]`. Grow at least 10% a year `[LEV-ORTHO]`. | **Why (Lag):** "the practice's true output" `[SI-ORTHO]`. **Pitfalls:** start = banding / delivery vs contract signature. |
| ORT-03 `ortho_conversion_rate` | **Conversion / case acceptance** (Case Acceptance — Gaidge, PDDS; Conversion (Starts / Consults) — JAR; consult close rate — Levin). | Starts ÷ new-patient exams (or ÷ exams with treatment recommended). The 2024 PDDS figures are consistent with starts ÷ exams (203.5 ÷ 315.8 = 64.4%). | ORG PRV SRC AGE TIME | 68.3% in 2025, 64.4% in 2024 `[PDDS-DD26]` `[PDDS-25]`. Close rate 85% or higher `[LEV-ORTHO]`. | **Why (Lead):** "the most useful leading indicator" `[SI-ORTHO]`. **Pitfalls:** observation flow can swing it 10–20 points and push it above 100% in short windows `[ORTHOFI]`. |
| ORT-04 `ortho_same_day_start_rate` | **Same-day contract / start rate** and **45-day treatment-recommended conversion.** | Starts signed on the exam day ÷ starts; patients recommended treatment in the last 45 days who converted ÷ those recommended `[ORTHOFI]`. | ORG PRV TIME | None published; conversion likelihood drops about 20% when the patient leaves and decays 35% (children) to 45% (adults) over two weeks `[ORTHOFI]`. | **Why (Lead):** steadier than total conversion `[ORTHOFI]`. **Pitfalls:** formulas are inferred from the definitions in the source. |
| ORT-05 `ortho_observation_pool` | **Observation pool** (Pre-Treatment Observation Patients, Between Phases Observation Patients, Starts from Observation, Phase 2 to Phase 1 Starts — Gaidge). | Count of patients in observation AS-OF; starts from observation ÷ starts. | ORG PRV AGE | Grow patients in observation at least 5% a year `[LEV-ORTHO]`. | **Why (Lead):** future starts already in the building. **Pitfalls:** observation recall dates must be maintained. |
| ORT-06 `ortho_pending_starts` | **Pending / unscheduled starts.** | Patients with treatment recommended and not yet started; value = Σ proposed fees. AS-OF. | ORG PRV USR | — | **Why (Lead):** "start-ready demand already generated" `[SI-ORTHO]`. **Pitfalls:** stale records. |
| ORT-07 `ortho_avg_contract_amount` | **Average contract amount** (Average Contract Amount, Payment Arrangements, Discounts & Write-Offs — Gaidge). | Σ contract fees ÷ starts; down payment and term mix. | ORG PRV PROC PAY | D8080 comprehensive case averages about $3,600 per case start in Denticon data `[PDDS-DD26]`. | **Why (Lag):** pricing and discounting. **Pitfalls:** contract fee vs production recognized over the treatment term. |
| ORT-08 `ortho_collection_and_delinquency` | **Collections and delinquency** (Net Production vs. Net Collection, Patient / Insurance Delinquency Summary — Gaidge). | Collections ÷ contract amounts due; past-due contract installments ÷ contract A/R. | ORG PAY TIME | Collection rate 99% `[LEV-ORTHO]`. | **Why (Lag):** contract A/R behaves like payment plans. **Pitfalls:** scheduled receivables are not past-due A/R. |
| ORT-09 `ortho_debonds` | **Debonds and starts per debond** (Debonds by Treatment Type, Debonds and Starts per Debond — Gaidge; Debonds Count — JAR). | Count of debonds; starts ÷ debonds. | ORG PRV TIME | — | **Why (Lag):** above 1 means the active base is growing. **Pitfalls:** phase 1 debonds. |
| ORT-10 `ortho_patients_beyond_ecd` | **Patients beyond estimated completion** (Patients Beyond ECD, Estimated vs. Actual Months to Completion — Gaidge; overdue debond rate — Levin). | Active patients past their estimated completion date ÷ active patients. | ORG PRV | No more than 2% `[LEV-ORTHO]`. | **Why (Lag):** overtime treatment is unpaid chair time. **Pitfalls:** estimated completion dates must be set at start. |
| ORT-11 `ortho_visits_per_case` | **Visits per case and value per visit** (Average Number of Visits, Value per Visit — Gaidge). | Visits from start to debond ÷ completed cases; contract fee ÷ visits. | ORG PRV PROC | — | **Why (Lag):** efficiency of treatment mechanics. **Pitfalls:** emergency visits. |
| ORT-12 `ortho_throughput` | **Throughput and daily production** (Patients per Doctor Hour, Production per Doctor / Staff Hour — Gaidge; Active Patients seen per day, Production per Day — JAR). | Patients seen ÷ doctor hours; production ÷ working days. | ORG PRV DOW TIME | Daily production quartiles (982 practices): best $14.5K+, strong $9.4–14.5K, at risk $5.9–9.4K, high opportunity under $5.9K; network average $9,419 per practice per day `[PDDS-DD26]`. | **Why (Lag):** chair efficiency. **Pitfalls:** production recognition policy. |
| ORT-13 `ortho_active_no_appointment` | **Active patients with no appointment; retention checks** (Active Patients with No Appointment, Retention Appointments Completed — Gaidge; Ortho Reappointment % — JAR). | Active ortho patients with no future appointment ÷ active; patients overdue for retainer checks ÷ patients in retention. | ORG PRV | Overdue for retainer checks under 2% `[LEV-ORTHO]`. | **Why (Lead):** lost-in-treatment patients extend cases. **Pitfalls:** retention phase length. |
| ORT-14 `ortho_referral_sources` | **Referral sources** (Origin of Starts, Marketing Referrals — Gaidge). | Exams and starts by source (dentist, patient, marketing channel); conversion by source. | SRC ORG TIME | Increase dentist referrals by at least 10% `[LEV-ORTHO]`. | **Why (Lag):** referrer relationship management. **Pitfalls:** referring-dentist master data. |

### 3.12 Front-office productivity (10)

| ID · key | KPI (aliases) — definition | Formula · rules · date basis | Seg | Benchmark / target | Why → action · Pitfalls |
|---|---|---|---|---|---|
| FRO-01 `appointments_added` | **Appointments added** (Appointments Added, Appointments Dollars Added, New Patients Added — PbN). | Count and dollar value of new (not rescheduled) appointments created today, by user. CRT `[PBN]`. | USR ORG TIME | — | **Why (Lead):** daily scheduling output. **Pitfalls:** reschedules must be excluded; value follows attached procedures. |
| FRO-02 `follow_up_task_completion` | **Follow-up task completion** (Team Task Attempts Total, Team Task Completed %; Unscheduled Treatment / AR Balance / Unscheduled Hygiene Completed vs Not Completed — DI). | Morning-list items resolved by end of day ÷ items on the list; attempts per user `[DI-GL]`. | USR ORG TIME | — | **Why (Lead):** turns huddle lists into accountable work. **Pitfalls:** needs an activity log per contact attempt. |
| FRO-03 `unscheduled_patients_rescheduled` | **Unscheduled patients rescheduled** (Unscheduled Active Patients Rescheduled, Rescheduled %, Now Scheduled $ — DI; Reactivated — PbN). | Previously unscheduled active patients booked in the period; ÷ unscheduled active patients; dollars scheduled `[DI-GL]`. | USR ORG TIME | — | **Why (Lead):** reactivation yield. **Pitfalls:** attribution to the user who booked. |
| FRO-04 `forms_completed_before_checkin_pct` | **Forms completed before check-in** (DI Forms All Completed before Check-in, Completed at Check-in %, Outstanding before Check-in — DI). | Patients with all forms complete before arrival ÷ patients checked in `[DI-SC]`. | USR ORG | — | **Why (Lead):** on-time starts. **Pitfalls:** only with digital forms. |
| FRO-05 `front_desk_collection` | **Front-desk collection** (x-ref COL-05, COL-13). | OTC collection rate and today's-patient A/R collected, by user. | USR ORG TIME | See COL-05. | **Why (Lead):** user-level accountability. **Pitfalls:** shared logins. |
| FRO-06 `claims_timeliness` | **Claims timeliness** (x-ref RCM-04, RCM-05, RCM-09). | Same-day claim rate, unsubmitted claims, eligibility verified, by office and user. | USR ORG TIME | See RCM rows. | **Why (Lead):** billing discipline. **Pitfalls:** central billing teams vs office staff. |
| FRO-07 `day_close_compliance` | **Day-close and month-close compliance.** | Days on which the deposit was reconciled and the day sheet balanced ÷ working days; months closed on schedule. | ORG USR TIME | Daily deposit and day sheet review; month-end close report `[BURK-FO]`; close out at least monthly `[DEN-EOM]`. | **Why (Lag):** control environment; closing prevents changes to past transactions and keeps reports consistent `[DEN-EOM]`. **Pitfalls:** needs a recorded close event. |
| FRO-08 `adjustment_audit` | **Adjustment audit.** | Count and dollars of adjustments by user and type; adjustments on patients not seen in the month; unusually large adjustments `[BURK-FO]`. | USR ORG TIME | — | **Why (Lag):** fraud and error control. **Pitfalls:** needs user id and timestamp on every adjustment. |
| FRO-09 `data_completeness` | **Data completeness** (New Patients Missing Referral Source — DI). | Records missing a required field ÷ records created (referral source, insurance details, appointment procedures). | USR ORG | — | **Why (Lead):** analytics quality depends on it. **Pitfalls:** required-field list must be configurable. |
| FRO-10 `short_call_list` | **Short-call (ASAP) list.** | Patients on the short-call list AS-OF; openings filled from the list ÷ openings. | ORG USR | "Populate this list continually" `[BURK-FO]`. | **Why (Lead):** fills late cancellations. **Pitfalls:** list hygiene. |

### 3.13 Multi-location / DSO roll-ups (12)

| ID · key | KPI (aliases) — definition | Formula · rules · date basis | Seg | Benchmark / target | Why → action · Pitfalls |
|---|---|---|---|---|---|
| DSO-01 `same_store_growth_pct` | **Same-store growth.** Year-over-year production growth of locations open in both periods. | (Production this period − same period last year) ÷ last year, for locations active in both; report simple average, trimmed mean (top and bottom 10% removed) and revenue-weighted average `[PDDS-26]`. | ORG TIME | 2025 vs 2024 (3,294 locations): simple 6.6%, trimmed 4.9%, weighted 4.0%; quarterly weighted 3.5 / 4.6 / 4.8 / 3.4% `[PDDS-DD26]`. 2024 quarterly averages 2.5 / 3.2 / 5.5 / 4.6% `[PDDS-25]`. | **Why (Lag):** what investors underwrite. **Pitfalls:** acquisitions, closures and relocations must be excluded; working-day differences between years. |
| DSO-02 `pct_locations_growing` | **Share of locations growing** and growth distribution. | Locations with positive same-store growth ÷ locations; distribution by growth band. | ORG | 63% grew in 2025 (about 60% in 2024); 33.5% grew more than 10%; 13.6% declined more than 10% `[PDDS-DD26]` `[PDDS-25]`. | **Why (Lag):** shows bifurcation that an average hides. **Pitfalls:** same exclusions as DSO-01. |
| DSO-03 `production_per_location` | **Production per location** (per day and per year). | Net production ÷ locations; ÷ working days. | ORG TIME | $8,764 gross per practice per day (2025) `[PDDS-DD26]`; adjusted production $1M baseline per practice `[PDDS-26]`. | **Why (Lag):** like-for-like comparison. **Pitfalls:** office size (use DSO-04 or SCH-13 alongside). |
| DSO-04 `location_rank_percentile` | **Location ranking** (top 15 / bottom 15 — DPA; performance bands — PDDS). | Rank and percentile of each location on each KPI; quartile bands; variance to the organization median. | ORG | DPA charts top 15, bottom 15 or all providers / hygienists `[DPA]`; PDDS uses exact quartile boundaries `[PDDS-DD26]`. | **Why:** management by exception. **Pitfalls:** rank only on normalized KPIs (rates, per-day, per-chair). |
| DSO-05 `kpi_dispersion` | **Dispersion and seasonality.** | Coefficient of variation of a KPI across locations; CV of monthly production within a location. | ORG TIME | Monthly-seasonality CV: most stable ≤ 0.22 grew 9.7% vs most seasonal ≥ 0.73 at 7.9% `[PDDS-DD26]`. | **Why (Lead):** operational consistency is one of the six growth drivers `[PDDS-DD26]`. **Pitfalls:** small-office noise. |
| DSO-06 `ebitda_margin` | **EBITDA margin**, free cash flow, A/R per office. | EBITDA ÷ adjusted production; free cash flow = operating cash flow − capex `[PDDS-26]`. | ORG TIME | 18–25% healthy, 25%+ elite; A/R under $350K per office with under $50K in 90+ days `[PDDS-26]`. | **Why (Lag):** valuation. **Pitfalls:** needs general-ledger data; 4-wall vs consolidated. |
| DSO-07 `overhead_ratio` | **Overhead ratio** and expense categories. | Operating expenses ÷ collections; by category. | ORG TIME | Overhead 63% or less of total income `[ADA-MS]`; about 60% rule of thumb; staff 24–26% (maximum 28%), lab 8%, dental supplies 6%, facility and equipment about 10% (rent 5–6%), marketing 1–2%, office supplies 1% `[DE-OH]`. Median expenses per GP dentist $482,343 vs revenue $698,436, about 69% (my division of HPI medians) `[ADA-SDP]`. 58% of practices reported higher overhead in 2025, average increase 4.5% `[DE-LEV25]`. | **Why (Lag):** the fourth term of the profitability formula. **Pitfalls:** owner compensation in or out; collections vs production denominator; PMS has no expense data. |
| DSO-08 `revenue_leakage_waterfall` | **Cash-conversion waterfall.** | Gross production → less contractual adjustments → less OTC gap → less bad debt → less aged A/R at risk → estimated cash `[PDDS-DD26]`. | ORG PAY TIME | Network (497 DSOs, $6.794B gross): contractual 8.2%, OTC gap 9.5%, bad debt 2.9%, aged A/R 3.9%; addressable leakage 11.7% of gross; about $890K EBITDA per $10M gross `[PDDS-DD26]`. | **Why (Lag):** quantifies the "silent EBITDA lever". **Pitfalls:** the report's stage percentages and summary percentages are not fully consistent; treat as directional. |
| DSO-09 `cross_location_patients` | **Cross-location patients.** | Patients seen at more than one location; de-duplicated new and active patient counts at organization level. | ORG | "Deduplicated across locations" `[HSO-ASC]`. | **Why (Lag):** avoids double counting; shows internal referral flow. **Pitfalls:** needs an enterprise patient identity. |
| DSO-10 `specialty_mix_share` | **Specialty mix.** | Specialist production ÷ total production; by specialty. | ORG PT | Growth by portfolio: pure general 9.3%, low specialist 5.5%, mixed 1%, specialist-heavy 5.7%, pure specialist 9.3% `[PDDS-DD26]`. | **Why (Lag):** portfolio strategy. **Pitfalls:** provider specialty master data. |
| DSO-11 `staffing_capacity` | **Staffing and recruitment.** | Open positions; days to fill; provider and hygienist hours per location. | ORG PT | About one third of dentists were recruiting hygienists in Q3 2026; about one fifth of hygienist positions took more than six months to fill `[ADA-Q3-26]`. | **Why (Lead):** hygiene capacity constraint. **Pitfalls:** HR data outside the PMS. |
| DSO-12 `peer_cohort_benchmark` | **Peer-cohort comparison.** | A location's or group's KPI vs a cohort (size band, specialty, region). | ORG | DSO size bands and growth: 2–5 offices 9.0%, 6–10 6.9%, 11–25 8.8%, 26–50 2.8%, 51–100 7.4%, 100+ 7.1% `[PDDS-DD26]`. Gaidge compares against 1,500+ practices in 11 regions and alerts when a metric falls below benchmark `[GAIDGE]`. | **Why:** context for every number. **Pitfalls:** standardize definitions before comparing teams. |

---

## 4. Benchmark tables by source

Benchmarks are only comparable when the definition matches. Each table states the publisher's own definition basis and sample.

### 4.1 Dental Intelligence — State of Dentistry 2026 `[DI-SOD26]`

"Annual benchmark data from over 10,000 practices across 11 KPIs"; 2025 values with 2024 in brackets; three tiers (Bottom, Average, Top; the text refers once to "the top 10%", tier cut-offs are not otherwise defined). Values were read from the report's charts.

| KPI (DI definition) | Bottom | Average | Top |
|---|---|---|---|
| Pre-Appointment % — active patients (visit within 18 months) with a future appointment | 28% (29%) | 54% (54%) | 75% (75%) |
| New Patient Re-Appointment % — new patients with a future appointment at the end of the first visit | 22% (21%) | 50% (48%) | 69% (69%) |
| Hygiene Pre-Appointment % — active patients with a future hygiene appointment | 26% (31%) | 59% (60%) | 80% (80%) |
| Hygiene Re-Appointment % — hygiene patients who leave with the next hygiene appointment booked | 53% (61%) | 87% (81%) | 94% (94%) |
| Patient Growth % — new + reactivated − lost | −11% (−11%) | 3% (2%) | 17% (19%) |
| Average Restorative $ Presented Per Exam | $750 ($722) | $1,716 ($1,858) | $2,955 ($3,060) |
| Treatment $ Case Acceptance % | 23% (22%) | 41% (39%) | 62% (58%) |
| Same-Day Treatment $ Acceptance % | 15% (14%) | 31% (29%) | 50% (46%) |
| Perio Patient % Age 30+ | 1% (1%) | 11% (12%) | 32% (27%) |
| Collection % (Net Production) | 93% (93%) | 102% (102%) | 109% (104%) |
| AR Days | 74 (75) | 26 (28) | 5 (7) |

### 4.2 Planet DDS — Denticon and Cloud 9 network `[PDDS-25]` `[PDDS-26]` `[PDDS-DD26]`

Samples: 2024 data from more than 3,400 Denticon practices; 2025 data from more than 5,200 Denticon practices (8,593 practices in the Deep Dive including orthodontic practices; 3,294 with year-over-year comparison; 497 DSOs). The sample is about 97% DSO-affiliated by chair count. Production is "expected collections, not UCR fees".

| Metric (PDDS definition) | 2024 | 2025 |
|---|---|---|
| Case acceptance rate (plans marked accepted, scheduled or completed) | 57% | 58% |
| Case completion rate (plans created in H1 completed by year end) | 42% | 47% |
| New patients per month per practice (including specialty) | 43 | 46 |
| Cancellation rate (cancelled in advance) | 15.5% | 12.9% |
| No-show rate (failed without prior notice) | 7.4% | 6.9% |
| Hygiene reappointment rate "within 12 months" | 60% | 63% |
| Gross daily production per practice | $8,436 | $8,764 |
| Gross daily production per dentist / per hygienist | $3,815 / $1,058 | $3,728 (GP) / $1,091 |
| Practices with same-store production growth | about 60% | 63% |
| Orthodontic case acceptance (Cloud 9) | 64.4% | 68.3% |

"Numbers to watch" zones `[PDDS-DD26]`:

| Metric | Warning | Target | Elite |
|---|---|---|---|
| Daily production volatility (CV) | > 0.5 | 0.3–0.5 | < 0.3 |
| New patients per month | < 35 | 35–75 | 75+ |
| Revenue per chair (annual) | < $100K | $150K–$200K | $300K+ |
| Acceptance–completion gap | > 30pp | 10–30pp | < 20pp |
| Friday vs Tuesday production | < 60% | 70–80% | > 80% |
| Cancellation rate | > 20% | 10–15% | < 10% |
| OTC collection rate | < 80% | 80–95% | > 95% |
| A/R aged over 90 days | > 50% of A/R | 15–30% | < 15% |
| Same-day claim rate | < 20% | 40–80% | > 80% |
| Bad-debt rate | > 5% | 1–3% | < 1% |

Revenue-cycle figures (Denticon DSOs, 2025): OTC collection mean 87.9%, median 91.3%; net collection rate median 88.9%; bad-debt median 3.6%; contractual adjustments 7.8% of gross; 37.4% of DSO groups submit fewer than 20% of claims on the day of service `[PDDS-DD26]`.

### 4.3 Henry Schein One — 2026 Catalyst Index `[HSO-CL]` `[HSO-ASC]` `[HSO-RET]` `[HSO-COL]` `[HSO-DT]`

Published as two gated editions (1–7 locations; 8+ locations, DSOs and DPOs). The pages opened give values without formulas or sample size; a press article says the Index covers "tens of thousands" of practices.

| KPI | Average, 8+ locations | Top 10%, 8+ | Average, 1–7 locations | Top 10%, 1–7 |
|---|---|---|---|---|
| New patients per month | 39 | 82 | — | — |
| Patient retention rate (active patients returning within 18 months) | 58% | 90% | 64% | 92% |
| No-show rate | 3% | < 1% | 3% | < 1% |
| Cancellation rate | 5% | < 1% | 5% | < 1% |
| Case acceptance rate | 45% | 75% | 45% | 75% |
| Appointment lead time, new patient | 23 days | 7 days | — | — |
| Reappointment rate | 76% | 92% | — | — |
| Collection rate | 72% | 97% | 75% | 97% |

A secondary summary attributes about $10K average and about $17.9K top-10% daily production per practice, and 77% reappointment "at checkout", to Henry Schein One `[PPRISM]` `[BECK·S]`.

### 4.4 ADA "Measuring Success" targets `[ADA-MS]`

Collections 98% of billable / adjusted production · overhead 63% or less of total income · new patients up 10–15% a year · at least 75–80% of case presentations accepted · dentist at least 75% of production, hygiene 25% · at least 85% of patients active in the recare system · 90% of recare patients scheduled for the next appointment at all times · cancellations and no-shows 5% or less.

### 4.5 ADA Health Policy Institute context

| Measure | Value | Source |
|---|---|---|
| Average net income, GP dentists (2024) | $207,980 (owners $217,781; non-owners $160,891); specialists $338,900 | `[ADA-SDP]` |
| Median revenue / expenses per GP dentist (2020–24 pooled, inflation-adjusted) | $698,436 / $482,343 (2015–19: $706,966 / $468,459) | `[ADA-SDP]` |
| Average weekly hours in the office / treating patients (2024) | 36.1 / 30.5 | `[ADA-SDP]` |
| New-patient appointment wait, business days | 12.0 (Q3 2026); 13.9 (Q2 2026); 12.4 (Q3 2025); 14.3 (Q3 2024) | `[ADA-Q3-26]` |
| Busyness, Q3 2026 (704 private-practice dentists) | 8% too busy to treat all; 15% treated all but overworked; 39% treated all, not overworked; 38% not busy enough | `[ADA-Q3-26]` |
| Reimbursement index vs inflation since January 2021 | +19% vs +27% | `[ADA-Q3-26]` |
| Schedule fullness (earlier poll waves) | 77% full in January 2022; 87% full in later waves; short-notice cancellations the top reason for unfilled time | `[HPI-BUSY·S]` |

The HPI poll skews toward ADA members, general practitioners, owners, solo or small groups, mid-to-late career, urban practices `[ADA-Q3-26]`.

### 4.6 Dental Economics – Levin Group and Levin targets

| Item | Value | Source |
|---|---|---|
| Production per doctor including hygiene | $1,001,807 (2025); $1,004,178 (2024); 2.3% compound annual growth over 20 years | `[DE-LEV25]` |
| Practices reporting higher overhead; average increase | 58%; 4.5% | `[DE-LEV25]` |
| Patients covered by dental insurance; practices fully fee-for-service | 57%; 10% | `[DE-LEV25]` |
| Target share of doctor production from new patients | 40% | `[DE-LEV25]` |
| Orthodontic targets | Starts +10% a year; consult close rate ≥ 85%; dentist referrals +10%; observation pool +5% a year; overdue debonds ≤ 2%; collection rate 99%; overdue retainer checks < 2% | `[LEV-ORTHO]` |

The survey article does not report sample size, collections or no-show figures `[DE-LEV25]`.

### 4.7 Revenue-cycle targets

Adjusted collection rate ≥ 98% (below 95% systemic failure); denial rate ≤ 4% (above 8% risks payer review); clean-claim rate above 98%; insurance A/R over 90 days below 20%; eligibility verified 24–48 hours ahead; appeals within five business days; credentialing in 30 days vs about 70 typical `[DIQ-RCM]`. 92% of U.S. dental claims paid in under 20 days and 97% in under 30; about $246 million of industry savings from electronic remittance `[PDDS-25]`.

### 4.8 Hygiene economics

Hygiene 25–35% of gross production; perio about one third of hygiene codes; downtime 5–8% or less; production about 3× wages; 800–1,000 active patients per full-time hygienist; at least 20–25 new patients per doctor per month `[DE-HYG15]`. Attrition 12–15%; monthly hygiene potential = active patients ÷ 9; collections about 95% `[JAR-BM2]` `[JAR-BM3]`.

### 4.9 Inquiry handling

57.1% of new-patient inquiries convert to a scheduled appointment; phone 72.9% of leads; staff conversion 25.5–74.1% (average 53.1%); top reason not booked: Medicaid not accepted (21.0%) `[LIINE24]`.

### 4.10 Same name, different number — why published benchmarks disagree

| KPI | Published numbers | Reason |
|---|---|---|
| Case acceptance | 41% average dollars `[DI-SOD26]` · 45% average `[HSO-CL]` · 58% plan status `[PDDS-DD26]` · 75–80% target `[ADA-MS]` | Unit (dollars, patients, plans), window (same day vs any later date), and whether staff maintain plan status. |
| Hygiene reappointment | 87% at checkout `[DI-SOD26]` · 76% reappointment `[HSO-CL]` · 63% within 12 months `[PDDS-DD26]` · 59% hygiene pre-appointment `[DI-SOD26]` · 90% target `[ADA-MS]` | Leaves-with-appointment vs holds-an-appointment-now vs returned-within-12-months. |
| Collection % | 102% average `[DI-SOD26]` · 88.9% median `[PDDS-DD26]` · 72–75% average `[HSO-CL]` `[HSO-ASC]` · 98% target `[ADA-MS]` | Net vs gross denominator, fee basis of "production", period mismatch, customer base. |
| No-show | 6.9% `[PDDS-DD26]` · 3% `[HSO-CL]` · ≤ 5% including cancellations `[ADA-MS]` | Status definitions and what counts as a scheduled appointment. |
| Cancellation | 12.9% `[PDDS-DD26]` · 5% `[HSO-CL]` | Same. |
| New patients per month | 46 per practice including specialty `[PDDS-DD26]` · 39 per location `[HSO-CL]` | Customer base (DSO-heavy vs mixed) and new-patient rule. |
| Perio % | 11% average of patients 30+ `[DI-SOD26]` · 16% average and 35–60% healthy `[RDH-KPI]` · one third of hygiene codes `[DE-HYG15]` | Patient-based vs visit-based vs code-share. |
| Attrition | about 10% `[DE-4STEP]` · 12–15% `[JAR-BM2]` · 17% average vs 3% top `[DT-CLV]` | Inactivity window and denominator. |

---

## 5. Morning-huddle metric set

### 5.1 What vendor huddles contain

| Product | Views | Content |
|---|---|---|
| Denticon Practice Analytics Morning Huddle `[DPA]` `[DPA-MH]` `[PDDS-MHF]` | Today's Schedule · Previous Day's Performance · Where We Stand · Previous Month's Performance | **Today:** net production MTD vs goal; collection % of production MTD; total / new / recare patients seen MTD; outstanding A/R; case acceptance % MTD; utilization MTD; per provider: daily goal, average daily production MTD, daily average needed to meet the monthly goal, scheduled production today / next working day / 2nd working day; exams today (new, recare, emergency); outstanding A/R of today's patients; pending Tx $ of today's recare exams; SRP opportunities. **Previous day:** net production, net collections (vs same weekday last week), patients seen (total, new, recare), daily goal, same-day net production %, reappointment % with not-reappointed patients by carrier. **Where we stand:** MTD and YTD production vs goal, collections YTD, collection % YTD, production per day needed, new and recare patients YTD and projected for the month, year-over-year comparison. Filter by office group, location, provider type, provider, date. |
| Dentilytics Basic `[DLY]` | Yesterday's Production · Today's Scheduled · Where We Stand | TX $ diagnosed; no-reappointment %; same-day production; new patients, emergency exams (D0140), continuing-care exams (D0120) on today's schedule; pending Tx $ of today's continuing-care exams; new patients projected this month; Tx accepted; Tx scheduled. Not customizable; refreshed nightly. |
| Dental Intelligence Morning Huddle `[DI-MH2]` `[DI-MH]` | Yesterday · Today · Tomorrow · Last Week (Mondays) | Month-to-date production forecast (completed, scheduled, gap to goal); 44 selectable Yesterday / Last Week metrics (production gross and net, per hour, per visit, by role; collections split insurance / patient / adjustments; patient diagnostic %; treatment and patient acceptance %; hygiene and new-patient hygiene reappointment %; unscheduled patients rescheduled; unscheduled active patients; fluoride %); Patients Not Rescheduled (new, existing, broken appointments); tiles for unscheduled family members, unscheduled treatment, A/R balance, unscheduled hygiene, follow-up attempts; schedule by provider or operatory; open slots with ranked "suggested patients"; treatment-team assignment; production figures can be hidden by permission. |
| Dentrix Daily Huddle Report `[HS-DH]` | One report | Previous day's production, collections, case acceptance, new patients, scheduling; progress toward goals for today and the rest of the month; items are selectable and re-orderable. |
| Practice by Numbers home tiles `[PBN]` | Current day | On Schedule $; appointments added; appointment dollars added; new patients added. |
| Burkhart paper agenda `[BURK-AM]` | Header + roles | Daily goal and daily scheduled production; monthly goal and monthly scheduled production; next hygiene opening and next doctor opening; new-patient goal for the month and new patients scheduled MTD. Administrative lead: production schedule, progress to goal, financial conversations needed, next openings, chronic no-show patients not to pre-schedule, patients to ask for referrals. Hygienist: changes (radiographs or perio charting needed), outstanding treatment, patients to move to a perio code, support needed, personal notes, new patients and who referred them. Assistant: changes to listed treatment. |

### 5.2 Canonical huddle set (assembled from the above)

| Block | Metrics |
|---|---|
| Yesterday | Net production vs daily goal · collections (total, insurance, patient, adjustments) · patients seen (total, new, recare) · same-day production % · treatment presented $ and acceptance % (patients and dollars) · reappointment % and the not-rescheduled list (new, existing, broken) · hygiene reappointment % · no-shows and cancellations · OTC collection % · morning-list tasks completed. |
| Today | Scheduled production vs daily goal by provider · patients, new patients, emergency and recare exams · openings and next available by provider · unconfirmed appointments · utilization. |
| Next two working days | Scheduled production vs goal · openings · unconfirmed appointments. |
| Month to date / where we stand | Net production MTD vs goal · daily average needed · forecast to month end · collection % MTD · new and recare patients MTD and projected · case acceptance MTD · utilization MTD · outstanding A/R · YTD production vs goal · same period last year. |
| Per-patient flags on today's schedule | Balance due · unscheduled or pending treatment $ · unscheduled family members · overdue recall / unscheduled hygiene · SRP opportunity · new patient and referral source · unconfirmed · insurance eligibility status `[DI-WF]` · forms outstanding `[DI-SC]` · chronic no-show · financial conversation needed · referral ask · radiographs or perio charting due `[BURK-AM]` · medical alerts, sedation, special needs `[PRAC·S]` · lab case status `[unverified]`. |

### 5.3 Mechanics

- Start about 15 minutes before the day and end at least five minutes before the first patient `[DE-HUD·S]`.
- Data freshness in the legacy tools is nightly (DLY 11:59 PM PST reflecting the end of the last working day; DPA about 1 AM PST) `[DLY]` `[DPA-FAQ]`; a live huddle is an obvious improvement.
- DPA's "active provider" logic includes only providers with non-cancelled, non-missed, non-blocked appointments in the period `[DPA-MH]`.
- DI ranks "suggested patients" for an open slot using reimbursement rates, A/R balances, unscheduled treatment, treatment acceptance %, show rate, preferred day of week and other factors `[DI-MH2]`.

---

## 6. Reporting routines

| Cadence | Task | Reports / KPIs | Source |
|---|---|---|---|
| End of day | Reconcile every payment type against the day's procedures; find unposted or partially posted items | Payments by type; day sheet | `[DCS-EOD]` |
| End of day | Balance the deposit: PMS totals vs card-processor totals and cash / check counts; prepare the bank deposit | Deposit slip; credit-card settlement | `[DCS-EOD]` `[BURK-FO]` |
| End of day | Doctor reviews the day sheet: every patient seen has the right codes and fees; adjustments are warranted | Day sheet of all transactions (production, payments, adjustments) | `[BURK-FO]` |
| End of day | Confirm all claims for the day were submitted; flag follow-ups | Claims created / sent today; unsubmitted claims | `[DCS-EOD]` |
| End of day | Review patients who left with a balance; statements or payment plans in place | Today's balances; OTC collection % | `[DCS-EOD]` |
| End of day | Prepare tomorrow: schedule full and verified, high-value treatment flagged, balances and insurance pre-checked | Tomorrow's schedule with flags (§5.2) | `[DCS-EOD]` |
| End of day | Other vendor checklists add transaction-detail and deleted-transaction reports | Audit reports | `[CS-EOD·S]` |
| Daily | Huddle; work team tasks; check eligibility; submit claims; review deposits | Morning Huddle, Team Tasks, Eligibility, Payments | `[DI-WF]` |
| Weekly | Review provider and hygienist stats with them; performance and collections boards; fill openings from suggested patients; send payment requests on outstanding balances | Provider Pulse, Performance Board, Collections Board | `[DI-WF]` |
| Weekly | No-show and cancellation rate; new patients scheduled; open schedule gaps for the next 10 business days | Scheduling KPIs | `[CURVE]` |
| Weekly / per cycle | Front office reports OTC collections 2–3 times per cycle | OTC collection % | `[BURK-FO]` |
| End of month | Close out the month so past transactions cannot be changed (multi-location: close all offices) | Close-out; Month End Report | `[DEN-EOM]` `[BURK-FO]` |
| End of month | Reset insurance benefits for plans whose anniversary falls in the new month; generate batch statements | Benefits reset; statements | `[DEN-EOM]` |
| End of month | Run aging and claims reports | Aging – Detail or Aging by Home Office; Outstanding Claims; Pre-Auth Outstanding Claims | `[DEN-EOM]` |
| End of month | Run recall and treatment-plan reports | Recall Due / No Recall Date / Not Scheduled; recall postcards; Treatment Plan Status – Detail | `[DEN-EOM]` |
| End of month | Reconcile credit-card transactions; managed-care utilization | Deposit Slip – Credit Card; Capitation Utilization – Detail | `[DEN-EOM]` |
| End of month | Doctor and financial coordinator review A/R with notes per account; claims over 30 days; un-submitted claims; adjustments; short-call list | A/R aging; outstanding insurance claims; un-submitted insurance; adjustments report | `[BURK-FO]` |
| End of month | Claims aging and A/R aging; goal performance; scorecards by provider and procedure code | Collections Board, Scorecards | `[DI-WF]` |
| End of month | Net collection rate, A/R aging, overhead %, new-patient trend, recare retention, case acceptance | KPI pack | `[CURVE]` |
| Month + 15 days | Accounting close: capture and categorize (days 1–4); reconcile bank, merchant, payroll and pull collections, production, patients seen, new patients, A/R aging and aged credits (5–7); accruals (8–10); quality review (11–12); budget to actual (13–14); leadership review (15) | P&L, balance sheet, cash bridge, A/R summary, KPI snapshot | `[CLA-15]` |
| Quarterly | Review provider goals; patient satisfaction; referral-source analysis; year-over-year production benchmarking | Goals, surveys, referral sources | `[DI-GOAL]` `[CURVE]` |
| Year end | Close December; run December monthly reports and the Executive Summary; reset yearly benefits (vendor resets 1/1 plans, the office resets others); apply the new year's ADA code changes; update UCR fees and archive the prior fee schedule | Executive Summary; aging; outstanding claims; recall; treatment plan status | `[DEN-EOY]` `[DEN-EOM]` |
| Year end | Enter next year's provider goals (Denticon accepts daily goals up to 13 months ahead) | Provider Goals | `[DLY]` |

---

## 7. Goal setting

### 7.1 How the reference tools set goals

| Tool | Model |
|---|---|
| Dental Intelligence `[DI-GOAL]` `[DI-MH]` | Three layers: **Clinical Hours** (scheduled chair-side hours per provider per weekday) → **Provider Goals** → **Practice Goals**. Provider goal = production-per-hour goal × scheduled hours (example: $500 × 32 h = $16,000 a week; $450 × 24 h = $10,800; practice = $26,800). Practice production goals can be auto-calculated from provider goals; the huddle goal sums the goals of providers with activity that day. Gross or net basis (net by adjustment date, procedure date, 90-day average or estimated). Base goals on 3–6 months of history; review quarterly. Goal-able metrics besides production: production per visit, per hour, per day; same-day production %; hygiene re-appointment %; new-patient hygiene re-appointment %; patient presented %; patient acceptance %; average accepted $ per patient; average treatment presented and accepted; treatment $ acceptance %. |
| Denticon / DPA `[DLY]` `[DPA]` `[DPA-FO]` `[DPA-MH]` | Setup → Providers → Provider Goals: a **daily goal per provider**, entered up to 13 months ahead, with autofill of working days from the provider scheduler. Goal amount for a range = daily goal × provider working days (0.5 / 1.0 rule); a multi-month daily goal is the monthly daily goals weighted by each month's working days; office daily goal = Σ provider monthly goals ÷ office working days. Derived: % to goal (red < 85%, yellow 85–95%, green > 95%) and daily average needed to meet the monthly goal. |
| Top-down financial method `[GOAL·S]` | Collections needed (break-even overhead + owner compensation + debt service + profit) → production goal = collections goal ÷ collection % → daily goal = monthly production goal ÷ workdays → allocate to producers so that Σ (provider workdays × provider daily goal) = practice goal; a common split is about 65% operative, 35% hygiene. |

### 7.2 Rules of thumb used when setting targets

- Hygiene 25–35% of production `[DE-HYG15]`; dentist at least 75% `[ADA-MS]`.
- Hygienist production about three times wages `[DE-HYG15]`.
- 40% of doctor production from new patients `[DE-LEV25]`; new patients up 10–15% a year `[ADA-MS]`.
- Staff cost 24–26% of collections, maximum 28% `[DE-OH]`; overhead 63% or less `[ADA-MS]`.
- Schedule to within 90% of the daily goal on 90% of days `[GOAL·S]`.
- Tiered targets: DI bottom / average / top `[DI-SOD26]`; PDDS warning / target / elite `[PDDS-DD26]`; HSO-CI average / top 10% `[HSO-CL]`.

### 7.3 Edge cases the legacy tool already handles `[DPA]` `[DPA-MH]` `[DI-GOAL]`

- Daily goal of 0 → daily average needed returns 0; YTD vs goal forced to 100%.
- Remaining working days 0 → treated as 1; negative → result equals the daily goal.
- Providers with no month-to-date transactions are left out of the daily goal on Today's Schedule.
- Missing scheduled hours → no production goal is shown.
- A provider's next and second-next working days are computed per provider.

### 7.4 *Recommended* goal model for our module

Goals at provider × office × day grain for production (with basis), rolled up to office, region and organization; optional goals on any rate KPI; a goal calendar generated from provider schedules and holidays; goal versions with effective dates so history is not rewritten; three-zone thresholds stored per KPI with defaults from §4.2 and §7.1.

---

## 8. Leading vs lagging indicators

Published list `[CLA-LL]`: **leading** — new-patient inquiries, appointment scheduling rates, provider availability, cash-flow projections, budget forecasts, appointment fill rates by day and provider, treatment-plan acceptance rates; **lagging** — P&L, EBITDA, per-patient revenue, no-show rates, staff turnover, employee satisfaction, patient satisfaction, net promoter score, completed treatments per patient. Most dashboards show lagging figures by default because they are the easiest to extract; the leading ones are usually missing `[CLA-LL·S]`.

| Stage | Leading (still changeable) | Lagging (result) |
|---|---|---|
| Demand | MKT-01 inquiries · MKT-03 answer rate · MKT-02 inquiry conversion · SCH-07 new-patient lead time | PAT-01 new patients · MKT-07 cost per new patient |
| Schedule | PRD-05 scheduled production · PRD-07 daily average needed · SCH-01 utilization on future dates · SCH-06 confirmations · SCH-10 pre-appointment % · SCH-12 unscheduled active patients | SCH-09 visits · PRD-03 net production · SCH-03 / SCH-04 no-shows and cancellations |
| Diagnosis and acceptance | TXA-02 diagnostic % · TXA-03 dollars presented per exam · TXA-05 / TXA-06 acceptance · TXA-09 unscheduled treatment | PRD-10 production per visit · TXA-07 case completion |
| Hygiene | HYG-02 reappointment · HYG-03 hygiene pre-appointment · HYG-04 recall overdue | HYG-06 hygiene retention · HYG-07 hygiene share of production |
| Revenue cycle | RCM-09 eligibility verified · COL-05 OTC collection · RCM-04 same-day claims · RCM-02 clean claims · RCM-05 unbilled production | COL-03 collection % · COL-09 A/R days · COL-08 A/R over 90 · COL-12 bad debt |
| Retention | SCH-11 reappointment · PAT-07 at-risk patients · PAT-08 new-patient reappointment | PAT-03 attrition · PAT-05 net patient growth · PAT-06 retention |
| Consistency | PRD-15 daily volatility · PRD-16 day-of-week balance | DSO-01 same-store growth |

Review cadence proposed by one vendor explainer `[CURVE]`: daily — production vs goal, chair utilization, late cancellations; weekly — no-shows and cancellations, new patients scheduled, open gaps; monthly — net collection rate, A/R aging, overhead, new-patient trend, recare retention, case acceptance; quarterly — satisfaction; quarterly or annually — referral sources, year-over-year production.

---

## 9. Published glossaries and benchmark sets

| Publisher | Resource | What it provides | Key |
|---|---|---|---|
| ADA | Measuring Success | KPI list with target values; definitions of gross vs adjusted production | `[ADA-MS]` |
| ADA Health Policy Institute | Survey of Dental Practice (annual) | Net income, revenue and expenses per dentist, hours worked; weighted survey | `[ADA-SDP]` |
| ADA Health Policy Institute | Economic Outlook and Emerging Issues in Dentistry (quarterly poll) | Busyness, new-patient wait time, confidence, recruitment, price and reimbursement indexes | `[ADA-Q3-26]` |
| ADA Dental Quality Alliance | Dental quality measures | Practice-, plan- and program-level clinical quality measure specifications | `[DQA·S]` |
| Dental Economics / Levin Group | Annual Practice Survey | Production per doctor, overhead direction, challenges, staffing | `[DE-LEV25]` |
| Dental Intelligence | Scorecards Metrics Glossary | Several hundred named metrics with short definitions (about 106,000 characters); the most complete public list of metric variants | `[DI-GL]` |
| Dental Intelligence | Morning Huddle Metrics | 44 huddle metrics with gross and three net bases | `[DI-MH]` |
| Dental Intelligence | State of Dentistry 2026 | 11 KPIs × 3 tiers, 2025 vs 2024, over 10,000 practices | `[DI-SOD26]` |
| Practice by Numbers | Practice IQ Home Dashboard guide | About 45 metrics with formulas (production, retention, treatment acceptance, hygiene retention, A/R, revenue lost) | `[PBN]` |
| Jarvis Analytics | Jarvis University Definitions | About 150 KPI names in sets (Base, Doctor, Hygiene, Office, Endo, Ortho, Oral Surgery, Pedo, Perio), one short page each | `[JAR]` |
| Planet DDS | Denticon Practice Analytics guide and per-dashboard glossaries | Eight dashboards (Morning Huddle, Production Analysis, Collections Analysis, Provider Breakdown, Treatment Plan Analysis, Front Office, Hygiene Recall, Patient Visit Analysis) with formulas, code lists, color thresholds and common calculation rules | `[DPA]` `[DPA-MH]` `[DPA-FO]` `[DPA-TP]` `[DPA-HR]` |
| Planet DDS | Dentilytics Basic | The older three-tab daily dashboard | `[DLY]` |
| Planet DDS | Dental Industry Outlook 2025 and 2026; 2026 Deep Dive | Network benchmarks, distributions, zones, RCM waterfall, ortho benchmarks | `[PDDS-25]` `[PDDS-26]` `[PDDS-DD26]` |
| Henry Schein One | 2026 Catalyst Index | Average vs top 10% for eight KPIs, two editions (gated ebooks) | `[HSO-CL]` `[HSO-ASC]` |
| Gaidge | Gaidge Analytics | Orthodontic metric list ("80+ growth metrics"), benchmark comparison across 1,500+ practices, built-in calculation guides per chart | `[GAIDGE]` |
| Curve Dental | Dental metrics explained | 12 metrics with "what it misses" and review cadence | `[CURVE]` |

---

## 10. Calculation-pitfall checklist

1. **Gross vs net production.** Publish both; every rate states which one it uses. Net has at least four date-basis variants `[DI-GL]`.
2. **Fee basis and PPO fee schedules.** Gross at UCR vs gross at contracted or expected fee changes write-off %, gross collection % and production per visit. The largest public network benchmark uses expected collections `[PDDS-DD26]`.
3. **Adjustments.** Classify by type and by side (production vs collection); never infer from the adjustment name. Sign conventions differ within the same vendor's documents `[DPA-FO]`.
4. **Write-off timing.** A write-off posted when the EOB arrives lands in a later period than the procedure. Offer linked-procedure dating, entry-date dating and a smoothed rate `[DI-MH]`.
5. **Unapplied credits and prepayments.** They inflate collections, hide A/R and distort aging; report them separately and age them `[PBN]` `[CLA-15]`.
6. **Collection % period mismatch.** Single periods can exceed 100% `[DI-SOD26]`; default to rolling windows.
7. **Hygiene reappointment variants.** Leaves-with-next-booked, holds-an-appointment-now, returned-within-12-months and any-appointment-booked are four different KPIs (§2.5).
8. **Active-patient window.** 12, 18 and 24 months are all in use (§2.4); every count, rate and benchmark inherits the choice.
9. **New-patient rule.** First completed visit vs created profile vs first appointment; exclude missed / cancelled-appointment codes (D9986, D9987) `[DI-GL]`; de-duplicate across locations `[HSO-ASC]`.
10. **Visit definition.** Patient-day with production vs visit-coded procedure vs appointment vs unique patient (§2.3).
11. **Case acceptance.** Unit (patients, plans, dollars), window (same day vs later), treatment of alternative and referred-out plans, and dependence on staff-maintained statuses (§2.6).
12. **Broken appointments.** No-show, late cancellation and cancellation are merged differently by each vendor (§2.7); reschedules are not cancellations.
13. **Counts of transactions vs distinct patients.** The legacy tool counts recare transactions in some views and distinct patients in others `[DPA-MH]`.
14. **Provider attribution.** Treating, appointment, primary and presenting provider can all differ; pick one per KPI.
15. **Office attribution.** Transaction office, patient home office and appointment office give three different A/R totals `[DPA]`.
16. **Working days and hours.** The 0.5 / 1.0 working-day rule, production-day rule and scheduled-hours rule give different per-day and per-hour results.
17. **Code sets.** Hygiene, recare, exam and adjunctive code lists differ by vendor and change yearly; keep them versioned and central; map custom codes (DI does not recognize custom codes for new-patient detection `[DI-NP]`; PDDS could not categorize $267.8M of procedures `[PDDS-DD26]`).
18. **Goal edge cases.** Zero goals, no remaining days, providers without hours (§7.3).
19. **Back-dated entries and closed periods.** Reports change after the fact unless periods are closed `[DEN-EOM]`; snapshot AS-OF metrics daily.
20. **Benchmark comparability.** Vendor benchmarks describe that vendor's customers (PDDS about 97% DSO chairs `[PDDS-DD26]`; HPI poll skews to owners and small practices `[ADA-Q3-26]`), often without stated formulas or sample size `[HSO-COL]`.
21. **Internal inconsistencies in source glossaries.** Name / definition mismatches exist in DI's glossary `[DI-GL]`, DPA's "Prod Chair Per Hour" `[DPA-HR]`, PbN's "Lost Appointments" `[PBN]` and the PDDS waterfall totals `[PDDS-DD26]`; do not copy vendor formulas without checking them.

---

## 11. Implications for the module (for planners)

- **Metric registry.** Each KPI is a versioned definition (formula, date basis, parameters, exclusions) with a user-visible "how this is calculated" note; the reference tools all publish glossaries and Gaidge embeds a guide in every chart `[GAIDGE]`.
- **Parameters, not forks.** Active window (12 / 18 / 24), production basis and net variant, hygiene / recare / exam code sets, working-day rule, acceptance unit and window, broken-appointment statuses.
- **Legacy-parity presets.** The DPA formulas in this document are precise enough to reproduce the legacy numbers (code lists, 0.5 / 1.0 working day, 85 / 95 color bands, 12 / 24-month patient states); ship them as a preset beside modern defaults.
- **Benchmarks as reference data.** Store value, tier, source, year, sample note and definition basis; display a benchmark only beside a KPI computed on the same basis.
- **Thresholds.** Three-zone thresholds per KPI, configurable per organization, with defaults from §4.2 and §7.1.
- **Drill-through to worklists.** Every rate must open the patient or claim list behind it; "a practice manager needs to be able to drill down to the actual patients who didn't reappoint" `[PDDS-26]`.
- **Role views and segmentation.** Executive trend, regional comparison, office worklist; segment by payer type, location, service and hygienist `[PDDS-26]`.
- **Snapshots.** Point-in-time KPIs (pre-appointment %, scheduled production at start of day, A/R aging, unscheduled treatment) need daily snapshots to trend.
- **Data beyond the PMS ledger.** Clinical hours or time clock, payroll, general-ledger expenses, marketing spend, call and web-lead data, clearinghouse claim statuses, eligibility timestamps. KPIs that depend on them are marked in §3.
- **Three office attributions and two provider attributions** selectable per report.

---

## 12. Verification status and gaps

- **Opened and read:** all sources listed without `·S`. Planet DDS help-center HTML pages returned 403 to the fetch tool; their content was read through the public help-center article JSON endpoint for the same article ids. PDF reports were downloaded and text-extracted locally; the Dental Intelligence benchmark values are printed inside charts and were read from rendered pages.
- **Not opened (`·S`):** three Denticon Practice Analytics glossaries (Production Analysis, Provider Breakdown, Collections Analysis — the newer complete guide covers the same dashboards), the CareStack Huddle article, goal-setting articles, chair-utilization and production-per-hour consultant targets, marketing cost benchmarks, the Henry Schein active-patient guide, the DQA measure pages, the gated Catalyst Index ebooks.
- **No published benchmark found for:** production per visit, production per hour (only consultant targets), fluoride and adjunctive rates, hygiene cohort retention, diagnostic %, confirmation rate, estimate accuracy, capitation utilization, credit balances, orthodontic same-day start rate, front-office task completion.
- **Definitions not obtained:** most individual Jarvis definition pages (only six opened); Practice by Numbers metrics outside the Practice IQ dashboard; Dental Intelligence benchmark attachment for 2024 / 2025 (image only); Henry Schein One formulas for every Catalyst KPI.
- **Arithmetic by me, not by the source:** expenses ÷ revenue per GP dentist ≈ 69% (DSO-07); ortho starts ÷ exams = 64.4% consistency check (ORT-03); the reading that Catalyst "collection rate" is on a gross basis (COL-04).
- **Dental Economics – Levin Group survey** article gives no sample size and no collections, no-show or hygiene numbers.

---

## Sources

Opened sources:

- `[ADA-MS]` ADA, Measuring Success — https://www.ada.org/resources/practice/practice-management/measuring-success20160428t155202
- `[ADA-SDP]` ADA Health Policy Institute, Trends in Dentists' Income, Revenue, and Hours Worked (update based on the 2025 Survey of Dental Practice) — https://www.ada.org/-/media/project/ada-organization/ada/ada-org/files/resources/research/hpi/trends_in_dentists_income_revenue_hours_worked.pdf
- `[ADA-Q3-26]` ADA Health Policy Institute, The State of the U.S. Dental Economy, 3rd Quarter 2026 Update — https://www.ada.org/-/media/project/ada-organization/ada/ada-org/files/resources/research/hpi/state_us_dental_economy_q32026.pdf
- `[DI-GL]` Dental Intelligence, Scorecards Metrics Glossary — https://educate.dentalintel.com/en/articles/15773167-scorecards-metrics-glossary
- `[DI-MH]` Dental Intelligence, Morning Huddle Metrics — https://educate.dentalintel.com/en/articles/14434058-morning-huddle-metrics
- `[DI-MH2]` Dental Intelligence, Morning Huddle — https://educate.dentalintel.com/en/articles/12002688-morning-huddle
- `[DI-HV]` Dental Intelligence, How are Hygiene Visits calculated — https://learn.dentalintel.com/en/articles/6330176-how-are-hygiene-visits-calculated-in-dental-intelligence
- `[DI-NP]` Dental Intelligence, Performance Board: New Patients — https://learn.dentalintel.com/en/articles/6070093-performance-board-new-patients
- `[DI-GOAL]` Dental Intelligence, Setting Goals: From Clinical Hours to Practice Success — https://educate.dentalintel.com/en/articles/12773715-setting-goals-in-dental-intelligence-from-clinical-hours-to-practice-success
- `[DI-WF]` Dental Intelligence, Daily, Weekly, and Monthly Workflows — https://educate.dentalintel.com/en/articles/9340195-dental-intelligence-daily-weekly-and-monthly-workflows
- `[DI-SC]` Dental Intelligence, Scorecards — https://intercom.help/dental-intel/en/articles/12002695-scorecards
- `[DI-BM]` Dental Intelligence, Data-Driven Benchmarks to Guide Your Practice Growth — https://educate.dentalintel.com/en/articles/12579825-data-driven-benchmarks-to-guide-your-practice-growth
- `[DI-SOD26]` Dental Intelligence, The State of Dentistry 2026 (PDF) — https://cdn.prod.website-files.com/62bf1888d9392275bad4689b/69727bb00d9809e92ddc5bb2_State%20of%20Dentistry%202026%20Annual%20Benchmarks%20and%20Industry%20Trends.pdf
- `[DPA]` Planet DDS, Understanding the Denticon Practice Analytics Dashboards: A Complete Guide to Metrics and Reports — https://support.planetdds.com/hc/en-us/articles/49789717199771-Understanding-the-Denticon-Practice-Analytics-Dashboards-A-Complete-Guide-to-Metrics-and-Reports
- `[DPA-MH]` Planet DDS, Denticon Practice Analytics Glossary: Morning Huddle — https://support.planetdds.com/hc/en-us/articles/23592864401563-Denticon-Practice-Analytics-Glossary-Morning-Huddle
- `[DPA-FO]` Planet DDS, Denticon Practice Analytics Glossary: Front Office — https://support.planetdds.com/hc/en-us/articles/23918621538459-Denticon-Practice-Analytics-Glossary-Front-Office
- `[DPA-TP]` Planet DDS, Denticon Practice Analytics Glossary: Treatment Plan Analysis — https://support.planetdds.com/hc/en-us/articles/23917936940699-Denticon-Practice-Analytics-Glossary-Treatment-Plan-Analysis
- `[DPA-HR]` Planet DDS, Denticon Practice Analytics Glossary: Hygiene Recall — https://support.planetdds.com/hc/en-us/articles/24482040036763-Denticon-Practice-Analytics-Glossary-Hygiene-Recall
- `[DPA-FAQ]` Planet DDS, Denticon Practice Analytics FAQ — https://support.planetdds.com/hc/en-us/articles/13934611697947-Denticon-Practice-Analytics-FAQ
- `[DLY]` Planet DDS, How am I able to understand the information within "Dentilytics Basic"? — https://support.planetdds.com/hc/en-us/articles/360003797371-How-am-I-able-to-understand-the-information-within-Dentilytics-Basic
- `[DEN-EOM]` Planet DDS, Which reports and activities does Denticon recommend to generate at the end of each month, and at the end of each year? — https://support.planetdds.com/hc/en-us/articles/115002068151-Which-reports-and-activities-does-Denticon-recommend-to-generate-at-the-end-of-each-month-and-at-the-end-of-each-year
- `[DEN-EOY]` Planet DDS, What should our office consider at the end of each year — https://support.planetdds.com/hc/en-us/articles/115002069791-What-should-our-office-consider-at-the-end-of-each-year
- `[PDDS-25]` Planet DDS, 2025 Dental Industry Outlook (PDF) — https://web.planetdds.com/rs/043-AQQ-739/images/2025%20Dental%20Industry%20Outlook%20-%20Planet%20DDS.pdf
- `[PDDS-26]` Planet DDS, 2026 Dental Industry Outlook (PDF) — https://www.planetdds.com/wp-content/uploads/2026/02/PDDS-2026-Dental-Industry-Outlook-022526.pdf
- `[PDDS-DD26]` Planet DDS, 2026 Dental Industry Outlook — Deep Dive (PDF) — https://www.planetdds.com/wp-content/uploads/2026/05/PDDS-2026-DSO-Outlook-DeepDive-051526.pdf
- `[PDDS-MHF]` Planet DDS, Morning Huddle Dashboard flyer (PDF) — https://www.planetdds.com/wp-content/uploads/2023/06/Flyer-Denticon-Morning-Huddle-050923.pdf
- `[HSO-CL]` Henry Schein One, Dental Practice Performance Checklist (2026 Catalyst Index figures) — https://www.henryscheinone.com/insights/blogs/dental-practice-performance-checklist-2026
- `[HSO-RET]` Henry Schein One, DSO Patient Retention Rate: 2026 Benchmarks — https://www.henryscheinone.com/insights/blogs/dso-dental-practice-patient-retention-rate/
- `[HSO-COL]` Henry Schein One, DSO Collection Rate: 2026 Benchmarks — https://www.henryscheinone.com/insights/blogs/dso-dental-practice-collection-rate
- `[HSO-ASC]` Dentrix Ascend, Dental Practice KPIs for office managers — https://www.dentrixascend.com/insights/blogs/dental-practice-kpis-office-managers/
- `[HSO-DT]` Dentistry Today, Henry Schein One Releases 2026 Catalyst Index — https://www.dentistrytoday.com/henry-schein-one-releases-2026-catalyst-index/
- `[HS-DH]` Henry Schein, Use Daily Huddle to Track Practice Progress — https://henryschein.com/us-es/dental/business-solutions/practice-services-knowledge-center-articles/use-daily-huddle-to-track-practice-progress.aspx
- `[PBN]` Practice by Numbers, Practice IQ Home Dashboard: Complete Guide — https://help.practicenumbers.com/en/articles/11842471-practice-iq-home-dashboard-complete-guide
- `[JAR]` Jarvis University, Definitions (index plus the pages for hygiene reappointment, case acceptance rate, patient retention, active patient, net production, no-show rate) — https://www.jarvisuniversity.com/definitions/
- `[JAR-BM2]` Jarvis Analytics, Practice Benchmarks Part 2 — https://www.jarvisanalytics.com/blog/practice-benchmarks-the-value-of-your-active-dental-patient-numbers-part-2/
- `[JAR-BM3]` Jarvis Analytics, Practice Benchmarks Part 3 — https://www.jarvisanalytics.com/?p=1622
- `[DE-LEV25]` Dental Economics, Findings from the 2025 Dental Economics–Levin Group Annual Practice Survey — https://www.dentaleconomics.com/practice/article/55368689/findings-from-the-2025-dental-economics-levin-group-annual-practice-survey
- `[LEV-ORTHO]` Orthodontic Products, 7 Key Growth Targets for Orthodontic Practices (R. Levin) — https://orthodonticproductsonline.com/practice-management/business-development/7-key-growth-targets-for-orthodontic-practices/
- `[DE-HYG15]` Dental Economics, The successful hygiene department: Understanding the numbers (D. Watterson, 2015) — https://www.dentaleconomics.com/science-tech/article/16391798/the-successful-hygiene-department-understanding-the-numbers
- `[DE-4STEP]` Dental Economics, 4 steps to determine how many patients your dental practice needs each month (2025) — https://dentaleconomics.com/practice/overhead-and-profitability/article/55308467/4-steps-to-determine-how-many-patients-your-dental-practice-needs-each-month
- `[DE-OH]` Dental Economics, Tracking dental practice overhead (A. Schiff, 2021) — https://www.dentaleconomics.com/practice/overhead-and-profitability/article/14201431/how-does-your-overhead-compare-to-national-averages
- `[DE-CALLS]` Dental Economics, The economics of missed calls (2026; vendor-authored) — https://www.dentaleconomics.com/practice/article/55385634/the-economics-of-missed-calls-quantifying-revenue-loss-in-dental-practices
- `[DIQ-RCM]` DentistryIQ, The 7 revenue cycle gaps most dental practices don't know they have (H. Lai, 2026) — https://www.dentistryiq.com/revenue-cycle-management/article/55409403/the-7-revenue-cycle-gaps-most-dental-practices-dont-know-they-have
- `[CURVE]` Curve Dental, Dental Metrics Explained — https://www.curvedental.com/dental-blog/dental-metrics-explained-what-each-one-measures-what-it-misses-and-when-to-review-it
- `[CLA-LL]` CLA, Improve Your Dental Practice With Leading and Lagging KPIs — https://claconnect.com/en/resources/articles/24/improve-your-dental-practice-with-leading-and-lagging-kpis
- `[CLA-15]` CLA, Stop Running Your Dental Practice by Bank Balance: Try a 15-Day Close — https://www.claconnect.com/en/resources/articles/26/dental-practice-15-day-close
- `[BURK-FO]` Burkhart Dental Supply, Front Office Accountability Measures — Reports Doctor should review (PDF) — https://www.burkhartdental.com/wp-content/uploads/2020/07/Monthly-Financial-Review-for-the-Doctor-PV.pdf
- `[BURK-AM]` Burkhart Dental Supply, Morning Meeting Agenda (PDF) — https://www.burkhartdental.com/wp-content/uploads/2020/07/AM-Huddle-Agenda.pdf
- `[DCS-EOD]` Dental ClaimSupport, Dental office manager's end-of-day checklist — https://www.dentalclaimsupport.com/blog/dental-office-managers-end-of-day-checklist
- `[LIINE24]` Liine, Marketing Benchmark Report: Dentistry, 2024 Edition (PDF) — https://www.liine.com/wp-content/uploads/dlm_uploads/2024/02/Dentistry-Marketing-Benchmark-Report-2024.pdf
- `[GAIDGE]` Gaidge, Gaidge Analytics — https://www.gaidge.com/products/gaidge-analytics
- `[ORTHOFI]` OrthoFi, Key Leading Indicator Metrics for Your Practice — https://orthofi.com/blog/key-leading-indicator-metrics-for-your-practice/
- `[SI-ORTHO]` Scheduling Institute, 5 Orthodontic KPIs That Predict Growth — https://schedulinginstitute.com/blog/orthodontic-practice-kpis/
- `[RDH-KPI]` RDH Magazine, Caring with clarity: Using KPIs as a tool to enhance patient care — https://www.rdhmag.com/patient-care/article/55406567/caring-with-clarity-using-kpis-as-a-tool-to-enhance-patient-care
- `[DT-CLV]` Dentistry Today, How to Understand Your Patients' Customer Lifetime Value (2017) — https://www.dentistrytoday.com/how-to-understand-your-patients-customer-lifetime-value/
- `[PPRISM]` Patient Prism, Dental KPIs: 2026 Benchmarks by Practice Size (secondary aggregator; footnote digits were fused with values in the fetched text — verify before use) — https://www.patientprism.com/blog/dental-kpis-benchmarks/

Search-snippet only (`·S`; pages not opened):

- `[DPA-PB·S]` Planet DDS, Denticon Practice Analytics Glossary: Provider Breakdown — https://support.planetdds.com/hc/en-us/articles/23679982811163-Denticon-Practice-Analytics-Glossary-Provider-Breakdown (also Production Analysis — https://support.planetdds.com/hc/en-us/articles/23679680502299-Denticon-Practice-Analytics-Glossary-Production-Analysis and Collections Analysis — https://support.planetdds.com/hc/en-us/articles/23679864262299-Denticon-Practice-Analytics-Glossary-Collections-Analysis)
- `[DEN-PAY·S]` Planet DDS, We pay our providers based on collection. What is the best report to use? — https://support.planetdds.com/hc/en-us/articles/115002081992-We-pay-our-providers-based-on-collection-What-is-the-best-report-to-use
- `[DEN-STX·S]` Planet DDS, What is the Special Transaction report and what can it be used for? — https://support.planetdds.com/hc/en-us/articles/30717390364699-What-is-the-Special-Transaction-report-and-what-can-it-be-used-for
- `[DEN-RCL·S]` Planet DDS, Recall Due/Overdue but Not Scheduled Report question — https://support.planetdds.com/hc/en-us/articles/115002084712-When-we-generate-our-Recall-Due-Overdue-but-Not-Scheduled-Report-there-are-patients-on-the-list-who-are-already-scheduled-What-did-we-do-wrong
- `[DI-MM·S]` Dental Intelligence, Metric Madness 2026 — https://www.dentalintel.com/blog-posts/metric-madness-2026
- `[HSO-CL·S]` Snippet-level detail from the `[HSO-CL]` page (the "1 in 11 appointments" statement).
- `[CLA-LL·S]` Snippet-level detail from the `[CLA-LL]` page (dashboards default to lagging indicators).
- `[BECK·S]` Becker's Dental, Top 10% of dental practices produce $17K+ per day — https://www.beckersdental.com/dentists/43773-top-10-of-dental-practice-produce-17k-per-day-report.html
- `[HS-TR·S]` Henry Schein Dental Practice Transitions, active patient count — https://dentalpracticetransitions.henryschein.com/?p=8888 and https://www.henryschein.com/us-en/images/dental/ActivePatientCount.pdf
- `[HPI-BUSY·S]` DentistryIQ / ADA News summaries of earlier HPI poll waves — https://www.dentistryiq.com/dentistry/article/14293295/dental-practice-busyness-hits-12-month-high and https://adanews.ada.org/ada-news/2022/january/hpi-launches-new-economic-poll
- `[DQA·S]` ADA Dental Quality Alliance, Dental Quality Measures — https://www.ada.org/resources/research/dental-quality-alliance/dqa-dental-quality-measures
- `[CS-HUD·S]` CareStack, Explore the Huddle Feature — https://carestack-uk.zendesk.com/hc/en-us/articles/15809411950748-Explore-the-Huddle-Feature
- `[CS-EOD·S]` Carestream Dental, Performing End of Day Procedures — https://help.carestreamdental.com/rh/web/server/WinOMS/projects_responsive/WinOMS_CS_OnlineHelp/Managing_Your_Practice/Optimizing_Your_Practice/Performing_End_of_Day_Procedures.htm
- `[EOM·S]` Dentaltown magazine, May 2021 (month-end reports) — https://nxtbook.com/farran/dentaltown/dentaltown-may-2021/index.php?startid=58
- `[DE-HUD·S]` Dental Economics, The AM huddle — https://www.dentaleconomics.com/practice/article/16393494/the-am-huddle-dentistrys-secret-weapon-for-success
- `[PRAC·S]` Practicon, Agenda for Morning Huddle (PDF) — https://practicon.com/content/pdf/resources/3/3-Agenda-for-Morning-Huddle.pdf
- `[GOAL·S]` Goal-setting methods — https://www.aapd.org/assets/1/7/PMM.pdf ; https://dentalbilling.com/how-to-set-production-goals-in-the-dental-office/ ; https://www.dentalcare.com/en-us/ce-courses/ce704/the-daily-production-goal ; https://www.dentaleconomics.com/practice/article/55336101/how-to-achieve-the-goals-you-set-for-2026
- `[PPH·S]` Production-per-hour figures — https://www.dentistryiq.com/practice-management/industry/article/16366841/heres-the-current-net-production-per-hour-dollar-amount-for-dentistsand-where-the-trend-is-headed ; https://resources.rework.com/libraries/dental-clinic-growth/hygiene-department-production ; https://www.dentaltown.com/blog/post/549/doctor-production-versus-hygiene-production
- `[UTIL·S]` Chair-utilization targets — https://www.actdental.com/blog/883-barrett ; https://ustechautomations.com/resources/blog/how-to-compile-weekly-chairutilization-reports-2026 ; https://www.netsuite.com/portal/resource/articles/financial-management/dental-practice-profitability.shtml
- `[MKT·S]` Marketing cost and ROI figures — https://www.stackmatix.com/blog/dental-practice-marketing-ads-local-seo ; https://redefineweb.com/blog/dental-marketing-cost-benchmarks-roi-practice/ ; https://clerri.com/blog/dental-marketing-roi-statistics/
- `[OH·S]` Overhead category ranges — https://www.bulletproofdentalpractice.com/dental-practice-overhead-percentage/ ; https://resources.rework.com/libraries/dental-clinic-growth/key-financial-metrics-dental-practices

