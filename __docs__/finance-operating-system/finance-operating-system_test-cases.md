# Finance Operating System Test Cases

## Governance

- Codex and Cascade rule files are byte-identical.
- The FinanceOS skill routes expense, subscription, prepaid balance, asset, evidence, forecast, and reconciliation requests.
- Customer billing implementation requests are not misclassified as FinanceOS operations.
- Confirmed accounts, source-referenced/unverified providers, and gated/not-active providers remain separate.
- The private store has exactly one manifest for all canonical registers and no parallel ledger.
- FinanceOS remains usable from open local files when browser, reminders, Firebase, or product runtime are unavailable.

## Record Truth

- An invoice without payment proof remains `invoiced`, not `paid`.
- A paid row without statement/provider reconciliation remains unreconciled.
- Unknown amounts, currencies, due dates, and tax fields remain unknown.
- Shared infrastructure remains `portfolio-shared` unless an allocation basis is recorded.
- A prepaid forecast is not produced from one observation.
- A dependency or env name does not become a confirmed provider account or plan claim.
- Sentry and Upstash may be marked free only from the founder's dated statement or provider evidence; exact quotas remain unknown until provider evidence is supplied.
- Forecast output includes observation timestamps and an estimated label.
- Duplicate candidates are flagged for review and never silently merged.
- Corrections retain the original fact and append a linked correction/decision.
- Unknown reporting currency, FX, tax, retention, fiscal-year, or depreciation policy stays unknown or needs professional review.
- Budget, committed, actual, and forecast values remain separate, and multi-currency totals are not combined without verified FX policy.
- `approved-for-planning` never authorizes a purchase, payment, or provider mutation.
- Evidence hashes detect file changes but are not treated as authenticity or payment proof.

## Safety

- Private evidence is rejected from Git paths.
- Sensitive payment and credential fields are redacted or not requested.
- Reminders do not initiate payments or claim automatic transaction detection.
- A periodic reminder does not become `CHECKED` without a dated provider-console observation.
- Chrome review waits for current-run owner approval and a founder-opened `admin@neelvara.com` session.
- Sign-in, MFA, recovery, and consent remain founder-operated; browser cookies, passwords, tokens, and profile storage are not inspected.
- Each provider review ends as `CHECKED`, `AUTH_REQUIRED`, `BLOCKED`, or `SKIPPED`.
- Firebase billing/usage review keeps every active product and QA/production project separate and performs no billing, IAM, API, quota, configuration, secret, or deployment mutation.
- Quota or trial warnings do not upgrade a plan or add a billing method.
- FinanceOS does not create Firebase, public, owner, or customer surfaces.

## Close And Continuity

- `CLOSED` requires transaction, obligation, prepaid, asset, budget/forecast, evidence, reconciliation, and verified-backup checks.
- `CLOSED_WITH_EXCEPTIONS` names every exception and carry-forward item.
- `REOPENED` appends a new event and preserves the prior close.
- Monthly backup verification records observed scope and result; configuration alone cannot pass.
- Quarterly restore testing is non-destructive and records the restored sample and result.
- Provider exit preserves financial history and checks final invoice, credits/refunds, renewal disablement, exports, and retention state.
- A missed reminder leaves obligations and review items open.
