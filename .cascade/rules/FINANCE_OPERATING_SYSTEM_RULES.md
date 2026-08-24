# FinanceOS Rules — Mandatory

**Status:** Enforced — v1 frozen August 24, 2026
**Scope:** Internal portfolio expenses, payment obligations, prepaid balances, vendor subscriptions, transaction evidence, reconciliation, and business assets

## Boundary

FinanceOS is a founder-operated internal record system. It is separate from MenuList, Answerlattice, SignalDesk, MyCodex, and their customer billing or entitlement runtimes. It must not become a public product, product database, owner/customer dashboard, autonomous purchasing agent, or substitute for an accountant or tax professional.

Repository files contain only FinanceOS rules, schemas, templates, and non-sensitive workflow documentation. Real invoices, receipts, payment screenshots, bank/card/UPI statements, ledger exports, tax records, and asset evidence belong in the founder-controlled local Documents store and its encrypted backup, never in Git.

## Canonical Records

Maintain distinct records for:

1. Provider accounts: confirmed paid, free-plan, trial, prepaid, usage-based, transaction-fee, gated/not-active, and unknown-plan providers.
2. Transactions: completed, pending, refunded, credited, failed, or disputed payments.
3. Obligations: fixed renewals, expected invoices, due dates, and amount confidence.
4. Prepaid balances: deposits, observed remaining balances, burn-rate windows, thresholds, and estimated exhaustion.
5. Assets: owned equipment, licences, domains, and other accountable business assets, with acquisition evidence and current disposition.
6. Evidence index: invoice/receipt and redacted payment-proof filenames tied to one stable record ID.
7. Review log: account checks, quota/balance checks, reconciliation results, missing evidence, and owner decisions.
8. Period close log: opening, review, exception, close, and reopen state for every month.
9. Exceptions and decisions: corrections, policy choices, provider exits, professional-review questions, and schema changes.
10. System controls: canonical-register manifest, configuration state, backups, restore tests, and schema migrations.
11. Budgets and forecasts: period/cost-centre plans, committed obligations, actuals, confidence, variance, and owner decisions without payment authority.

Do not collapse these records into a single ambiguous list.

## Status And Evidence Truth

- Expected, invoiced, paid, and reconciled are different states.
- An invoice does not prove payment. A screenshot does not replace an original invoice when one exists.
- A reminder completion does not prove a transaction occurred.
- A provider balance is current only as of its recorded observation timestamp.
- Due dates and amounts must carry `exact`, `estimated`, or `unknown` confidence.
- Forecasts must show their observation window and remain labelled estimates.
- Budget, committed, actual, and forecast values remain distinct. A budget row or approval does not authorize a payment or provider change.
- Never invent missing currency, exchange rate, tax, vendor identity, product attribution, payment reference, or renewal date.
- Search for duplicates before creating a record. Similar vendor/date/amount data is a review signal, not permission to merge.
- Corrections are append-only and link to the original record. Never silently rewrite a closed-period fact or delete an inconvenient transaction.
- Evidence integrity may use a local SHA-256 hash. A hash proves file consistency only, not authenticity, payment, tax treatment, or reconciliation.

## Source Of Truth And Period Control

- The founder-controlled private store is the canonical operational source. Repository rules and schemas define structure but contain no real ledger data.
- Open formats are mandatory: Markdown plus CSV or XLSX-compatible tables. No single provider, browser, task scheduler, product runtime, Firebase project, or proprietary finance application may be required to read the core records.
- Period states are `OPEN`, `IN_REVIEW`, `CLOSED_WITH_EXCEPTIONS`, `CLOSED`, and `REOPENED`.
- A period may be `CLOSED_WITH_EXCEPTIONS` only when every unresolved item is named, owned, dated, and carried forward. `CLOSED` requires transaction/obligation/evidence/reconciliation checks and a verified backup.
- Period totals may combine currencies only under a documented reporting-currency and FX policy. Otherwise report currency groups separately.
- Reopening a period requires a reason, timestamp, owner decision, linked correction or new evidence, and a new close entry. Never overwrite the earlier close record.

## Cost Centres

Attribute each record to the narrowest truthful cost centre: `portfolio-shared`, `menulist`, `answerlattice`, `signaldesk`, `mycodex`, or an explicitly recorded historical/parked cost. Shared infrastructure must not be silently assigned to one product. Historical CampaignCue expenses may be recorded without reopening CampaignCue work.

## Payment And Secret Safety

- Request only the minimum evidence required for the record.
- Redact PINs, OTPs, full account/card numbers, QR payloads, personal balances unrelated to the transaction, addresses when unnecessary, credentials, and recovery material.
- Store only masked payment-method descriptors in the ledger.
- Never ask the owner to paste secrets into chat or repository files.
- Never initiate, approve, schedule, retry, cancel, upgrade, downgrade, or otherwise mutate a payment or subscription without explicit current-turn authorization for the exact external action.
- Never infer that a recommendation or reminder grants spending authority.
- Never upgrade a free/trial account, add a billing method, accept a paid plan, or enable a billable provider from a quota warning without exact current-turn authorization.

## Reminder And Review Rules

- Record known obligations before payment.
- Default fixed-renewal reviews to seven days and one day before the due date.
- Review usage-based and prepaid services weekly unless the observed burn rate supports a different documented cadence.
- Review free plans and trials monthly by default and before any evidence-backed trial end, included-quota threshold, retention limit, seat limit, or required upgrade.
- Use threshold reviews for prepaid balances; the default planning thresholds are 50%, 25%, and 10% remaining.
- Reconcile each month by the third day of the next month and keep missing evidence visibly open.
- Without an authorized connected billing source, reminders must request an owner-provided current balance or redacted provider evidence; they must not claim automatic transaction detection.
- Scheduled local-folder reviews depend on the machine and required app being available. An unattended or skipped run is not evidence that no payment is due.
- A repository dependency, feature flag, env name, or setup checklist proves provider relevance, not that an account exists or which plan it uses. Store account and plan evidence with an `as_of` date and keep unverified status explicit.

## Owner-Approved Live Console Review

- Periodic FinanceOS monitoring is a reminder plus a session-bound, owner-approved review. It is not continuous background access and must never be described as monitoring while Codex is inactive.
- The reminder asks the founder to approve the specific run and open the Chrome profile signed in as `admin@neelvara.com`. The founder owns sign-in, MFA, recovery, consent, and any sensitive confirmation.
- Use the founder-opened Chrome session read-only. Never inspect cookies, passwords, saved credentials, profile storage, recovery material, or authentication tokens.
- Review providers one at a time. Start with confirmed-current and source-evidenced providers. Exclude gated/not-active providers unless the founder explicitly reopens them, and never use FinanceOS to reopen CampaignCue.
- Record dated console evidence for plan and billing state, current usage or remaining balance, included quota, next invoice or renewal, alerts, masked payment-method presence, risk, and next review. Keep unobserved values `unknown`.
- Provider emails and alerts are supporting evidence. Dated console readback is the preferred current-state evidence, but a successful page view does not prove that a future charge, balance change, or provider incident will be detected automatically.
- For Google Cloud and Firebase, keep every active product and QA/production project separate. A FinanceOS review may inspect billing linkage, current spend or credit, budgets/alerts, quotas, and relevant service usage; it must not change billing, IAM, APIs, quotas, projects, rules, indexes, Functions, Storage, secrets, or deployments.
- Allowed per-provider run outcomes are `CHECKED`, `AUTH_REQUIRED`, `BLOCKED`, and `SKIPPED`. A reminder or partial run must not be recorded as `CHECKED`.
- Stop before any plan change, payment-method change, payment, billing acceptance, cancellation, quota/budget/alert mutation, IAM change, API enablement, Firebase mutation, deploy, project creation, or deletion. Those actions require separate exact current-turn authorization and the governing product or deployment workflow.

## Accounting Boundary

FinanceOS may organize facts and calculate transparent totals or estimates. Tax treatment, GST eligibility, capitalization, depreciation, exchange-rate policy, statutory retention, and filing decisions require verified legal/accounting inputs or professional review. Use `needs-professional-review` when unresolved.

Until policies are verified, preserve original and charged currencies and keep reporting currency, exchange-rate source/date, GST, TDS/withholding, capitalization, depreciation, fiscal-year treatment, and statutory retention explicitly `unknown` or `needs-professional-review`. Do not delete financial evidence merely because a guessed retention period elapsed.

## Continuity, Backup, And Exit

- Keep a canonical register manifest, system-control record, exception/decision log, period-close log, and backup/restore log in the private store.
- Verify an owner-controlled encrypted backup at least monthly and perform a non-destructive sample restore at least quarterly. Backup configuration, sync icons, or task success are not restore evidence.
- Record backup scope, destination class without secrets, encryption state, observed timestamp, result, missing scope, and next test. Never place recovery credentials in FinanceOS.
- If scheduled reminders, Chrome, ChatGPT, or provider access is unavailable, keep obligations and reviews open and follow the manual operating calendar. FinanceOS must remain usable from the private files alone.
- Provider cancellation or migration requires final-invoice, refund/credit, export, renewal-disablement, data-retention/deletion, and replacement/asset-impact checks. Cancellation evidence never authorizes deletion of ledger history.
- Business continuity may name an owner-approved delegate, but access, recovery credentials, and legal authority remain outside FinanceOS and require a separate owner/security decision.

## Frozen V1 Change Control

FinanceOS v1 is frozen as an independent internal operating contract on August 24, 2026. Canonical rules or schemas may change only for a verified legal/accounting requirement, a security or data-loss risk, provider evidence incompatibility, or a founder-approved material workflow improvement. Every change must be recorded with reason, effective date, affected records, migration steps, compatibility/export impact, and owner decision. Do not create a parallel ledger, silently reinterpret old fields, or rewrite history for convenience.

## Improvement Rule

When use reveals a material control gap or avoidable founder effort, propose the smallest durable improvement. Preserve historical records, explain migrations, avoid parallel ledgers, and update this rule, the FinanceOS skill, schema, and governed docs together when the owner accepts a contract change.
