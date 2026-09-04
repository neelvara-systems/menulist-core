# Finance Operating System

**Status:** FinanceOS v1 frozen and operationally independent
**Decision date:** August 24, 2026
**Decision:** Maintain one founder-operated, evidence-linked expense and asset system outside product runtime and outside Git

## Purpose

FinanceOS keeps portfolio operating payments understandable over the long term: what is due, what was paid, what evidence exists, what prepaid balance remains, when funds may run out, what assets are held, and what still needs reconciliation.

It covers shared infrastructure and product-attributed expenses without merging product identities. It does not replace MenuList or Answerlattice customer billing, bookkeeping software, statutory accounts, or professional tax advice.

## Core Records

1. Provider accounts and plan lifecycle
2. Transactions
3. Obligations and subscriptions
4. Prepaid and usage-based balances
5. Asset register
6. Evidence index
7. Review and reconciliation log
8. Period-close and exception logs
9. Backup/restore and system-control records
10. Budgets, commitments, actuals, forecasts, and variance

## Storage Decision

Rules, schemas, and empty templates live in the repository. Real invoices, payment proofs, statements, tax records, ledger rows, balances, and asset evidence live in the founder-controlled local Documents folder with encrypted backup. Nothing private is committed to Git.

The private files are the operational source of truth. FinanceOS remains readable and operable without Chrome, ChatGPT tasks, Firebase, any product runtime, or a particular spreadsheet application.

## Routine

- Record known obligations before they become due.
- Review fixed renewals seven days and one day before payment.
- Review usage/prepaid balances weekly and more frequently after threshold crossings.
- Review free plans and trials monthly and before any evidence-backed trial, quota, retention, or seat threshold.
- Run a weekly quick console review for active prepaid/usage services and a monthly full provider review after the founder approves the run and opens the `admin@neelvara.com` Chrome profile.
- After payment, link the original invoice and redacted payment proof to one record ID. When the founder explicitly requires exact future-use evidence, also index an owner-authorized `restricted-original` in the private restricted area; routine views remain redacted.
- Reconcile by the third day of the following month.
- Keep unknown dates, missing evidence, and professional-review questions visibly open.
- Treat provider notifications as supporting signals; use dated, read-only console observations as current-state evidence and never claim continuous monitoring.
- Verify encrypted backup coverage monthly and perform a non-destructive sample restore quarterly.
- Close each month as `CLOSED`, `CLOSED_WITH_EXCEPTIONS`, or leave it visibly open; never erase unresolved items.
- Record corrections and schema decisions append-only.

## Documents

- [Specification](./finance-operating-system_spec.md)
- [Implementation](./finance-operating-system_impl.md)
- [Founder help](./finance-operating-system_helpdoc.md)
- [Firebase boundary](./finance-operating-system_firebase.md)
- [Mobile boundary](./finance-operating-system_mobile-support.md)
- [Internal positioning](./finance-operating-system_marketing.md)
- [Public website boundary](./finance-operating-system_website.md)
- [Test cases](./finance-operating-system_test-cases.md)
- [Validation](./finance-operating-system_validation.md)
- [Frozen v1 contract](./finance-operating-system_freeze.md)

## Canonical Sources

- `.codex/rules/FINANCE_OPERATING_SYSTEM_RULES.md`
- `.agents/skills/finance-os/SKILL.md`
- `packages/finance-os/README.md`
- `packages/finance-os/templates/ledger-schema.md`
