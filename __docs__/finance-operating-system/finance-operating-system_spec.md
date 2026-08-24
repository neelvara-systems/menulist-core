# Finance Operating System Specification

## Outcome

The founder can answer, from one evidence-linked system:

- what has been paid and whether it is reconciled;
- what payment is due next;
- which subscriptions renew automatically;
- what prepaid balances remain and when they may be exhausted;
- which product or shared cost centre owns each expense;
- which business assets exist and where their evidence is stored;
- which providers are paid, free, trial, prepaid, usage-based, transaction-fee, or explicitly gated;
- which free/trial provider is approaching an evidence-backed upgrade trigger;
- which records need evidence or professional review.
- whether each period is open, closed, or closed with explicit exceptions;
- how planned, committed, actual, and forecast costs differ by product/cost centre and currency;
- whether the private store has a verified backup and tested restore;
- which corrections, provider exits, and policy decisions changed prior understanding.

## Requirements

- One stable record ID links each financial row to its evidence.
- Expected, invoiced, paid, refunded, and reconciled states remain distinct.
- Original and charged currencies remain separate.
- Fixed and usage-based obligations use different forecasting rules.
- Prepaid depletion estimates use dated observations and disclose their window.
- Shared costs remain `portfolio-shared` unless evidence supports allocation.
- Real financial data stays outside Git in an encrypted, backed-up local store.
- No payment or vendor-account mutation occurs without exact current authorization.
- Provider relevance from code/docs remains separate from confirmed account and plan evidence.
- FinanceOS proactively suggests small workflow improvements while preserving owner control and historical records.
- Core records remain readable in open formats without product runtime, Firebase, Chrome, scheduled tasks, or a specific finance application.
- Closed-period corrections, exceptions, and schema migrations remain append-only and traceable.
- Monthly backup checks and quarterly sample restores provide evidence of recoverability.

## Non-goals

- Customer billing or entitlement logic
- Automatic bank or UPI ingestion
- Autonomous payment execution
- Tax filing, legal certification, or accounting opinions
- Public routes, product dashboards, or Firebase persistence
- Reopening CampaignCue product or deployment work
- Silent historical rewrites, guessed accounting policy, or unverified claims of backup health
