# Finance Operating System V1 Freeze

**Frozen:** August 24, 2026
**Scope:** Internal portfolio expense, provider, obligation, prepaid balance, asset, evidence, reconciliation, close, and continuity operations

## Freeze Decision

FinanceOS v1 is complete enough to operate independently from product runtime, Firebase, Chrome, provider notifications, scheduled tasks, and any particular spreadsheet application. The founder-controlled private store is the operational source of truth; repository rules and schemas govern it without containing private records.

## Frozen Contracts

- One canonical register manifest; no parallel ledgers.
- Stable IDs and append-only corrections.
- Evidence-linked transactions with separate expected, invoiced, paid, refunded, and reconciled states.
- Separate provider, obligation, prepaid, asset, budget/forecast, evidence, review, close, backup, exception, and system-control records.
- Product and QA/production separation for shared provider usage.
- Founder approval for live reviews and exact external mutations.
- Manual operation when reminders, browser access, or provider consoles are unavailable.
- Open-format portability and preserved historical exports.
- Monthly backup verification and quarterly sample restore evidence.
- Professional review boundary for reporting currency, FX, GST, TDS/withholding, capitalization, depreciation, fiscal year, retention, and filing.

## Allowed Future Changes

Change v1 only for a verified legal/accounting requirement, security or data-loss risk, provider evidence incompatibility, or founder-approved material workflow improvement. Record the decision, effective date, affected records, migration, compatibility/export impact, and owner approval before changing canonical meaning.

New providers, transactions, evidence, dates, balances, reminders, and review observations are normal data operations and do not unfreeze the architecture.

## Explicitly Unresolved Configuration

The following inputs are not architecture gaps and may remain unknown until evidence or professional guidance is available:

- exact reminder day and time;
- owner-selected encrypted backup destination and first verified restore;
- reporting currency and exchange-rate policy;
- fiscal-year and tax/GST/TDS treatment;
- statutory evidence-retention policy;
- optional owner-approved continuity delegate.

Unknown values stay visible in `system-control.md`. They must never be guessed.

## Recorded Additive Change — Schema 1.1

**Effective:** August 31, 2026

**Owner decision:** Approved by Danny in the current request

**Reason:** Exact provider/KYC evidence must remain useful for later operational, banking, tax, and verification work.

Schema 1.1 adds the `restricted-original` evidence state. Existing v1.0 records, IDs, fields, exports, redacted derivatives, product boundaries, and external-action authorization remain unchanged. Migration creates permission-locked `Restricted-Originals/` storage, indexes hashes and owner authorization, and retains masked routine views. Rollback may stop accepting new restricted originals but must preserve already indexed historical evidence. Authentication/payment-authorization secrets remain prohibited.
