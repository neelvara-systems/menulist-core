# Read-Only Result Evidence Test Cases

## Deterministic builder

- valid metrics are retained;
- zero is retained;
- negative, fractional, non-finite, and unsafe values are removed defensively;
- notes are trimmed;
- fingerprint is deterministic;
- note changes do not change fingerprint;
- source-number or date-window changes do change fingerprint.

## Request validation

- evidence action without evidence fails;
- evidence on another action fails;
- invalid calendar date fails;
- end before start fails;
- more than 92 inclusive days fails;
- empty metrics fail;
- negative, fractional, too-large, and unknown metrics fail;
- unknown provider or scope fails;
- future end date fails at the server boundary.

## Authorization and tenancy

- owner, admin, marketer, local manager, and agency member pass;
- reviewer, billing admin, absent member, and unknown role fail;
- local manager cannot write to a campaign outside the assigned location;
- campaign and workspace mismatch fails through the persisted record boundary.

## Idempotency and concurrency

- same key and same request replay;
- same key and changed metrics conflict;
- duplicate latest fingerprint does not increment evidence count;
- concurrent action transaction rechecks current campaign and claim ownership.

## Privacy and cost

- no provider call;
- no new collection or Storage object;
- no analytics-summary write;
- audit event contains metric names but not metric values or source note;
- no token, signed URL, raw payload, or personal data is persisted.

## UX

- form appears only in Results;
- unauthorized roles do not see the save form;
- save is disabled without a campaign, dates, or metric;
- copy states no live connection, no attribution, and no Campaign Memory effect;
- layout remains usable on mobile.
