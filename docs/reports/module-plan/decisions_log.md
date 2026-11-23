# Decisions log

Decisions taken by the product owner during implementation. The plan documents were written against the recommended
defaults; a row whose answer differs from the default lists what it affects. Newest decisions at the bottom.

## Before P0 (prompt 1.1 of [13_agent_prompts.md](13_agent_prompts.md))

| Id | Question | Answer | Date | Default? | Effect on the plan |
|---|---|---|---|---|---|
| STAFF | Staffing scenario behind every duration (S10 / S6) | **Agent-driven, small team**: one or two people driving coding agents | 2026-11-22 | No (default S10) | The S6 / S10 build weeks in [12_roadmap.md](12_roadmap.md) §1, [10_backend_plan.md](10_backend_plan.md) §1.2, [11_frontend_plan.md](11_frontend_plan.md) §1.4 and README §4 do not apply. Order, dependencies, gates and work items are unchanged; lanes become sequential sessions unless run in parallel worktrees. Re-estimate durations from measured agent throughput at skeleton step S8 and record the result here. Risk R-19 (single frontend engineer) and R-04 apply in a new form: review capacity of the person merging becomes the bottleneck. |
| RG-11 | Event capture start (appointment created / confirmed stamps, claim-status history, treatment-item history cannot be back-filled) | **P0 week 1** | 2026-11-22 | Yes | The additive capture parts of DATA-17 and DATA-25 move from P1 into P0 week 1 (register phase change RG-11, [10_backend_plan.md](10_backend_plan.md) G-20). Schedule them right after the walking skeleton. |
| PD-2 | In-app insurance payments in patient balances | **Fix in P0** through the canonical ledger; per-account bridge signed before switch-on | 2026-11-22 | Yes | As planned: DATA-06, DATA-07, DATA-09 (E0.07), gate G0 balance bridge. |
| PD-1 / PD-3 / BD-05 | Production and collections basis; class of each payment and adjustment code | **Brief default**: production = posted fee (UCR as compare); collections exclude adjustments and transfers, net of refunds; accountant signs the code classes before MET-04 | 2026-11-22 | Yes | Provisional seed of 03 §3.3 by DATA-03; final signed classes before MET-04 (a later change re-baselines MET-04 and the Daily golden cases). |
| PD-10 / PD-11 | Report rights model and provider restriction | **Brief default**: rights per category with per-report override; View Only runs and views; `report_access_provider_id` restricts My Reports and provider dashboards | 2026-11-22 | Yes | As planned: SEC-01..SEC-07 (E0.08); PD-11 final by the P0 mid-point (SEC-06). |
| BD-01 | Office rule for users with zero office assignments | **Strict**: no assignment, no office data in reports; `REPORT_UNGATED_OFFICE_ACCESS` per client only during the shadow window | 2026-11-22 | Yes | As planned: SEC-05 `allowed_offices()` ignores the zero-assignment hatch (08 rule S-3). Note: the rest of the app stays ungated for such users. |
| BD-07 / O-8 | Skipped migrated charges and Denticon control totals | **Reload + control totals**: reload the 87,585 skipped charges (DATA-57); offices print control totals for comparison months; export feasibility decision DATA-50 moved to P0 | 2026-11-22 | Yes | DATA-57 in E0.06; DATA-50 pulled from P1 into P0 (G-21). Needs Denticon export access and per-office control-total prints (legacy captures, README §6). |
| PILOT | Pilot organisation and signers | **Main client**; an office manager, billing lead and accountant sign comparisons | 2026-11-22 | Yes | As planned ([12_roadmap.md](12_roadmap.md) §4.2). Signer names are recorded outside the plan documents (no personal names in docs). |
| BD-03 | Reference time zone for date ranges | **Reported office's zone**; one range per run, `mixed_time_zones` flag | 2026-11-22 | Yes | As planned (02, 04 OD-4). |
| BD-04 | Read-only database role | **Read-only transactions always; dedicated role optional** per client | 2026-11-22 | Yes | As planned (02 report session, ENG-08). |
| OD-2 / OD-3 / G-26 | Result grid library, session refresh, UX-03 split | **Plan defaults**: TanStack Table if spike S-1 passes; silent refresh in P0; UX-03 not split | 2026-11-22 | Yes | As planned (UX-02 spike, UX-14, UX-03). |

### Still open

| Id | Decision | Settle by |
|---|---|---|
| Durations | Re-estimate under the agent-driven staffing (STAFF) | After skeleton step S8 |
| PD-1 / PD-3 final | Accountant signature on the payment / adjustment code classes | Before MET-04 starts |
| PD-11 final | Provider-restricted reporting details | P0 mid-point |
| Later phases | Decisions 8-17 of README §6 (PD-4..PD-9, BD-02, PD-12..PD-15, RG-04, RG-08, assistant vendor / BAA) | See the "Settle by" column of README §6 |
