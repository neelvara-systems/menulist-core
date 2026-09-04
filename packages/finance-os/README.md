# Finance Operating System Package

FinanceOS is the repository-local governance contract for founder-operated portfolio expenses, subscriptions, prepaid balances, assets, evidence, forecasts, and reconciliation.

Version 1 is frozen as an independent operating contract as of August 24, 2026.

## Boundary

- Internal-only and founder-operated.
- No public route, product UI, Firebase collection, automatic payment, or vendor mutation.
- No real financial evidence or ledger exports in Git.
- No authentication/payment-authorization secrets. Redacted evidence is the routine default; exact business/KYC records may be retained only as owner-authorized `restricted-original` evidence in the founder-controlled private store.
- No claim that an invoice, reminder, or forecast proves payment or current provider state.

## Repository Sources

- `.codex/rules/FINANCE_OPERATING_SYSTEM_RULES.md` — canonical operating and safety rules.
- `.agents/skills/finance-os/SKILL.md` — agent workflow.
- `templates/ledger-schema.md` — record contracts and naming rules.
- `private/.gitignore` — local containment guard for accidental evidence placed under this package.
- `__docs__/finance-operating-system/` — governed decision and usage documentation.

## Private Store

The intended evidence store is a founder-controlled `Neelvara-Finance` folder under the local Documents directory, organized by year and month. That store is created and maintained outside Git. Its precise filesystem path is machine-local and must not be hardcoded into product runtime code.

Restricted originals use a dedicated `Restricted-Originals/` directory with non-identifying filenames, directory mode `0700`, file mode `0600`, an evidence-index hash, and a redacted derivative for routine use when practical. They never enter Git, product runtime, Firebase, public/cloud evidence surfaces, chat output, or ordinary shared folders. PINs, OTPs, passwords, API/private keys, cookies/tokens, recovery codes, QR authorization payloads, CVV, and full payment-card credentials are prohibited even when the founder authorizes exact record retention.

## Operating Principle

Record the obligation before payment, attach evidence after payment, reconcile against an authoritative statement, and forecast only from dated observations. Missing evidence and unknown dates remain visible rather than being guessed closed.

Provider accounts use a separate register so free plans, trials, prepaid services, paid subscriptions, transaction-fee providers, and gated integrations do not become one misleading obligation list.

The private store also keeps a canonical manifest, system control, period-close log, exception/decision log, evidence index, and backup/restore log. Core records use open, exportable fields and remain usable without browser access, scheduled tasks, Firebase, product runtime, or a specific spreadsheet vendor.
