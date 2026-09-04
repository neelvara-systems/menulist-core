# FinanceOS Founder Guide

## When A Payment Is Expected

Provide the vendor, purpose, expected amount/currency, due date if known, cost centre, and whether it renews automatically. FinanceOS records an obligation and schedules reviews only when requested.

## After A Payment

Provide:

1. the original invoice or receipt;
2. a redacted payment proof for normal viewing;
3. the actual charged amount and currency if not visible safely;
4. the payment date;
5. any refund, credit, or renewal information.

If an exact record will be needed later, explicitly say that FinanceOS may keep the unredacted original. It will be indexed as `restricted-original`, permission-locked in the private store, and kept separate from the redacted working copy. Necessary bank-account/IFSC, UPI, tax/KYC, registered-address, phone, and proprietor identifiers may remain in that exact record.

Never provide PINs, OTPs, passwords, API/private keys, cookies/tokens, recovery codes, QR authorization payloads, CVV, full payment-card credentials, or unrelated personal balances. These are prohibited secrets, not record evidence, and owner authorization does not make them admissible.

## Restricted Originals

Use restricted originals only when the exact source will materially help a later KYC, tax, banking, provider, reconciliation, or audit task. The ordinary evidence and ledger remain redacted or masked. Restricted originals use non-identifying filenames, mode `0600` inside a mode-`0700` `Restricted-Originals/` directory, a SHA-256 index entry, and a linked owner decision. Do not share them through chat, Git, product runtime, Firebase, public/cloud evidence surfaces, or ordinary shared folders.

## For A Free Plan Or Trial

Provide a dated billing/usage screenshot showing the provider, plan name, included limit, current usage, trial end if any, and billing state. Redact identifiers and payment details for routine use; use the Restricted Originals process only when exact future-use evidence is necessary and explicitly authorized. FinanceOS records the plan separately, reviews it monthly by default, and warns before an evidence-backed limit. A warning never authorizes an upgrade or billing-method change.

## For GCP, AI, Or Other Prepaid Services

Provide the deposit evidence once, then provide a dated current balance during each review. FinanceOS retains observations, calculates a transparent burn estimate after at least two observations, forecasts possible exhaustion, and marks the result as estimated.

## Month Close

Review missing invoices, missing payment proofs, unreconciled rows, refunds, credits, current prepaid balances, the next month’s obligations, and questions requiring an accountant. Close only evidence-backed items.

## When FinanceOS Reminds You To Run A Provider Review

1. Approve that specific review in the current conversation.
2. Open Chrome with the `admin@neelvara.com` profile and sign in to the providers you want checked.
3. Complete MFA, reauthentication, recovery, or consent yourself. Never paste those secrets into chat.
4. FinanceOS checks the approved providers one by one in read-only mode and records dated non-secret status evidence.
5. Review the findings and separately authorize any payment, upgrade, cancellation, billing, quota, alert, IAM, API, or Firebase change you actually want.

The browser session is not continuous access. If Chrome is closed, signed out, or unavailable, the affected provider is recorded as `AUTH_REQUIRED` or `BLOCKED`, never as checked.

## If FinanceOS Or A Reminder Is Unavailable

Open the private `00-Ledger/register-manifest.md` and follow the operating calendar in `system-control.md`. The files remain the source of truth; missed automation does not close an obligation or prove that nothing happened.

## Corrections

Do not erase the original row. Add a correction or decision entry, link it to the original ID, state what changed and why, then update the current view while preserving the earlier evidence and period-close history.

## Backup And Recovery

Once a month, verify that the complete private store is present in the owner-selected encrypted backup. Once a quarter, restore a small non-sensitive sample to a temporary location, confirm it opens, record the result, and remove the temporary sample safely. A sync icon alone is not proof of recovery.

## Closing A Month

Check transactions, obligations, prepaid balances, assets, evidence, reconciliation, open exceptions, and backup status. Use `CLOSED_WITH_EXCEPTIONS` only when each unresolved item has an owner, date, and carry-forward ID. Reopening creates a new log entry; it never rewrites the old close.

## Cancelling Or Replacing A Provider

Record the final invoice, refund or credit, auto-renewal state, available export, provider data-retention/deletion state, replacement dependency, and any affected licence or asset. Do not delete historical ledger evidence.
