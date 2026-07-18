# MenuList Activation Concierge - Implementation

**Status:** Local source complete
**Last reviewed:** July 16, 2026

## Decision implemented

Use existing screens first, no new route, and SignalDesk remains observer-only.

`src/lib/onboarding/starterActivation.ts` owns signal allowlists, evidence labels, timestamp normalization, two-action summary, starter access helpers, and same-store in-memory acknowledgement projection.

## Write paths

- `recordStarterActivationSignal()` validates store/signal, checks active session store, writes one canonical store field, and returns `{ success, storeId, signal, recordedAt }`.
- Callers assert that acknowledgement before advancing loaded activation truth.
- `updateMenuPresence()` rechecks active store/tenant in its existing transaction. It derives the canonical external signal from current transaction store truth rather than trusting stale client starter status.
- Confirm writes current presence and, only for an eligible starter, its matching action in the same store transaction.
- Remove deletes both current presence and the matching action in the same transaction.
- Presence acknowledgement includes `recordedAt`; desktop/mobile update current store context only if `storeId` still matches.

## Read paths

`buildStarterActivationSummary()` counts only allowlisted keys with valid Date/ISO/Firestore-like timestamps and deduplicates a presence/action pair. It returns total, target, remaining, MenuList-recorded count, owner-confirmed count, and labeled evidence. It does not read Firebase.

The global starter banner and desktop/mobile Presence Monitor consume this summary. Menu Setup Progress uses the same `activated` result for the starter placement step.

## Separation

There is no public Activation Concierge route and no public SignalDesk route. SignalDesk workflow code must not call MenuList starter/presence mutation helpers or write MenuList stores/projects/billing/public output.
