# Founder Monitor Help

## What To Check First

1. Trusted Live Stores
2. Net New MRR
3. Cash Collected Today
4. Onboarding Stuck
5. Stale / Broken Stores
6. Failed Payments Today
7. Critical Tickets

## How To Read It

Trusted Live Stores is the main operating metric. It is stricter than "clients onboarded" because it checks store-level live, paid/entitled, and freshness signals.

Net New MRR comes from the founder revenue movement ledger and precomputed daily summaries. It is the operating revenue view, not a replacement for accounting exports.

Source Coverage shows which precomputed summaries and ledgers were available for the current refresh. If a source is `error`, fix the summary, ledger, index, or scheduler path before treating that section as complete.

## When To Act

- Paid store not live: unblock onboarding.
- Store Truth Score below 70: check menu/public business data.
- Payment failed: handle billing recovery.
- Critical ticket: handle support risk before churn.
- Distribution surface not recorded: confirm QR, website, social, or public link placement.
