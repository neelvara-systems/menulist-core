# SignalDesk Outcome Bridge - Compliance Policy

**Status:** Runtime-enforced policy; local emulator verified
**Created:** June 23, 2026
**Runtime reconciled:** July 13, 2026

## Principle

SignalDesk can measure growth outcomes, but it must not become a hidden backdoor into MenuList owner/customer data.

## Route Safety

- Route tokens must be opaque and scoped.
- Tokens must expire.
- Tokens must be revocable.
- Tokens must not expose target IDs, operator IDs, email addresses, or phone numbers.
- Tokens must not bypass MenuList auth or owner approval.
- New events must revalidate scope, token hash, target binding, active state, revocation state, and expiry in the same transaction as outcome writes.
- Exact accepted retries may return `duplicate` after revocation so providers can stop retrying without creating new state.

## Data Boundary

SignalDesk may store:

- target ID,
- source action,
- channel,
- route token hash/reference,
- outcome event type,
- linked MenuList reference ID when needed,
- attribution summary.

SignalDesk must not copy:

- full MenuList owner account data,
- full menu/store documents,
- customer PII from public usage,
- billing details,
- raw customer scan behavior beyond compact allowed signals.

## Manual Outcome Rules

- Operator-entered outcomes require evidence note or linked MenuList reference.
- Manual paid-plan or partner outcomes require admin role.
- Outcome corrections require append-only correction event, not silent edits.

## Suppression Interaction

If a suppressed target creates an outcome, record the outcome but keep outreach blocked until admin review. Conversion does not erase opt-out history.
