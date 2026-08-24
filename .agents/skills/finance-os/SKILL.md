---
name: finance-os
description: Maintain or review the founder-operated portfolio expense ledger, subscriptions, prepaid balances, assets, payment evidence, renewal forecasts, reconciliation, or FinanceOS rules. Use for vendor invoices, UPI/card/bank proofs, GCP or AI credits, upcoming payments, recurring expense reviews, and internal cost records; not for customer billing-product implementation.
---

# FinanceOS

FinanceOS is the internal operating contract for portfolio expenses and assets. It is not MenuList or Answerlattice customer billing, an accounting product, or authority to move money.

## Required Context

1. Read `.codex/rules/FINANCE_OPERATING_SYSTEM_RULES.md`.
2. Read `__docs__/finance-operating-system/README.md`.
3. Read `packages/finance-os/README.md`.
4. For a ledger or evidence update, read `packages/finance-os/templates/ledger-schema.md`.

## Workflow

1. Classify the item as a provider account, free plan, trial, fixed recurring obligation, usage-based service, prepaid balance, one-time expense, asset, refund, credit, liability, budget, or forecast.
2. Identify the cost centre without merging product identities: `portfolio-shared`, `menulist`, `answerlattice`, `signaldesk`, `mycodex`, or an explicitly recorded historical/parked cost.
3. Record the obligation before payment when a due date, renewal, or depletion risk is known.
4. After payment, request the original invoice or receipt and a redacted payment proof. Never request or retain PINs, OTPs, full account/card numbers, passwords, recovery codes, API keys, or credentials.
5. Use one stable record ID for the ledger row and its evidence files. Preserve original currency, actual charged currency, tax, payment date, due date, and evidence/reconciliation status separately.
6. For prepaid or usage-based services, record each observed balance with its timestamp, calculate burn rate only from recorded observations, and label exhaustion dates as estimates.
7. Reconcile against an owner-provided statement or provider record; do not infer that payment occurred from a reminder, invoice, or expected renewal.
8. Report missing evidence, upcoming obligations, low balances, uncertain dates, and suggested improvements. Suggestions never authorize purchases, plan changes, cancellations, payments, or external messages.
9. Keep provider accounts in their own register. Separate confirmed accounts from source-referenced but unverified services and explicitly gated/not-active providers. Never turn a configured integration or code dependency into a claim that an account exists.
10. Before adding a record, search stable IDs, vendor references, invoice numbers, payment references, dates, and amounts for duplicates. Never silently merge uncertain matches.
11. Correct facts through an append-only correction entry linked to the original record. Never erase or overwrite historical financial meaning merely to make a period appear clean.
12. Keep each accounting period `OPEN`, `IN_REVIEW`, `CLOSED_WITH_EXCEPTIONS`, `CLOSED`, or `REOPENED`. Closing freezes the period snapshot but does not hide unresolved items.
13. Compare actual, committed, and forecast amounts only within compatible currencies or an explicitly documented reporting-currency policy. A budget approval or forecast never authorizes spend.

## Reminder Contract

- Fixed obligations: review seven days and one day before the known due date.
- Usage/prepaid balances: review weekly by default; increase review frequency when the observed balance crosses documented thresholds.
- Free plans and trials: review monthly by default, and before a documented trial end, quota threshold, retention limit, seat limit, or required upgrade. Use only owner/provider evidence for exact limits.
- Month close: reconcile missing evidence and balances by the third day of the next month.
- A reminder is not transaction detection. Without an authorized connected billing source, ask the owner for the current provider balance or redacted evidence.
- A periodic provider review begins with a reminder only. It does not imply continuous monitoring, background browser access, or a completed account check.
- After the reminder, wait for the founder to approve the exact review and open the Chrome profile signed in as `admin@neelvara.com`. Authentication, MFA, recovery, and consent prompts remain founder-operated.

## Owner-Approved Live Provider Review

1. Confirm the review scope and current-turn approval before opening any provider console.
2. Use the founder-opened Chrome session read-only and check providers one at a time. Never inspect Chrome cookies, passwords, profile storage, or saved credentials.
3. Check confirmed-current and source-evidenced providers first. Keep gated/not-active providers out of the run unless the founder explicitly reopens them; CampaignCue always remains parked.
4. For each provider, record the console/account reviewed, plan and billing state, current usage or balance, included limit, next invoice or renewal, alert state, masked payment-method presence, evidence timestamp, risk, and next review date. Unknown values remain unknown.
5. For Google Cloud and Firebase, keep MenuList, Answerlattice, and SignalDesk projects and QA/production targets separate. Review billing linkage, spend or credit, budgets/alerts, quotas, and relevant service usage without changing IAM, billing, APIs, projects, quotas, rules, indexes, Functions, Storage, or deployments.
6. Stop and ask the founder to take over when sign-in, MFA, reauthentication, payment confirmation, billing acceptance, or another sensitive action appears.
7. End with `CHECKED`, `AUTH_REQUIRED`, `BLOCKED`, or `SKIPPED` for every provider in scope. A provider notification is supporting evidence, not a substitute for dated console readback.

## Hard Stops

- Never initiate, approve, schedule, retry, or cancel a payment or subscription without explicit current-turn authorization for that exact external action.
- Never upgrade a free/trial account, add a billing method, accept a paid plan, or enable a billable integration from a reminder or quota warning.
- Never commit invoices, statements, payment screenshots, personal identifiers, bank/UPI/card details, tax identifiers, or real ledger exports to Git.
- Never present estimated burn, tax treatment, depreciation, GST treatment, or accounting classification as verified professional advice.
- Never let portfolio expense records become product runtime data, owner/customer UI, Firebase collections, or a public route without a separate architecture decision.
- Never change a plan, payment method, budget, quota, alert, IAM role, API state, Firebase configuration, or provider setting during a read-only periodic review.
- Never claim that Chrome access persists after the approved session or that FinanceOS monitors accounts while Codex is inactive.
- CampaignCue remains parked. Historical costs may be recorded, but FinanceOS must not use them to reopen setup, deployment, or product work.

## Independence And Continuity

- The private local store and open Markdown/CSV/XLSX-compatible schemas are the durable source of truth. Chrome, provider consoles, ChatGPT tasks, Firebase, product runtime, and any particular spreadsheet application are optional operating aids, not storage dependencies.
- Keep a dated system-control record, canonical register manifest, close log, exception/decision log, and backup/restore log.
- Verify an owner-controlled encrypted backup monthly and perform a non-destructive sample restore quarterly. Never claim backup health from configuration alone.
- If reminders or browser access fail, keep obligations open and use the private operating calendar/manual review path. Missed automation is not evidence of no activity.
- Keep currency conversion, tax, GST, TDS/withholding, capitalization, depreciation, fiscal-year, and statutory-retention policies `unknown` or `needs-professional-review` until the founder supplies verified policy or professional advice.
- Never delete source evidence or closed-period records because a provider account was cancelled. Record cancellation, export availability, final invoice, credit/refund, data-retention status, and asset disposition separately.

## Frozen V1 Change Control

FinanceOS v1 is an independent operating contract. After freeze, change canonical rules or schemas only for a verified legal/accounting requirement, security or data-loss risk, provider evidence incompatibility, or a founder-approved material workflow improvement. Record the reason, migration, affected records, effective date, and rollback/export impact in the decision log; convenience alone does not justify a parallel ledger or silent schema drift.

## Improvement Duty

When repeated use reveals a safer field, clearer status, better review cadence, missing evidence check, or lower-effort workflow, propose the improvement. Change the canonical rules, schema, or reminder cadence only with clear rationale, while preserving prior records and authorization boundaries.
