# Answerlattice Guided Workflows Validation

> **Date:** 2026-07-18
> **Verdict:** Hardened local source-ready; deployed-client smoke pending

## Verified

- Structured procedures remain embedded in canonical answers.
- Existing answers remain backward compatible.
- Target/event identifiers use strict bounded contracts.
- Procedures are returned only for canonical widget results.
- Owner opt-in defaults off.
- The owner toggle and install option require both the structured-workflow parent flag and guided-runtime child flag.
- Host guidance cannot click, evaluate code, or intercept pointer input.
- Widget/host messaging checks source and origin.
- Public outcomes use validated widget credentials and exact stored workspace scope.
- Outcomes require a canonical widget search-history proof.
- Search history retains the exact validated served procedure snapshot, and terminal evidence must match its procedure/session/context fields.
- Expired history is rejected even before TTL deletion completes.
- Outcome writes are rate-limited, byte-bounded, strict-schema validated, and deduplicated.
- No new collection, listener, scheduler, AI call, Firestore rule, index, Storage path, or Cloud Function was added.
- MenuList desktop and mobile equivalents use one typed semantic registry.
- Menu import/retry/review and publish/share/open workflows emit only fixed, payload-free events after acknowledged transitions.
- Intake preserves validated procedure drafts through the mutation-proposal handoff without bypassing governance approval.
- Generated target/event IDs are retained only when the exact values occur in cited owner source material.
- Canonical governance rejects mismatched answer-type/procedure pairs and removes stale procedure data when a reviewed proposal changes back to explanation or navigation.
- The host selects only visible semantic targets, hides the overlay if a selected target becomes invisible, and prevents event-gated steps from being manually marked complete.
- Target lookup allows a bounded 800 ms for asynchronous rendering and cancels on step/session reset.
- **Still stuck** opens the explicit support form; guide escalation is recorded only after the ticket request succeeds.

## Commands

| Command | Result |
|---|---|
| `node --check public/widget/answerlattice-widget.js` | PASS |
| `npx next lint --file <each touched TS/TSX file>` | PASS, no warnings |
| `npm run test:answerlattice-guided-resolution` | PASS |
| `npm run test:answerlattice-menulist-reference-client` | PASS |
| `npm run test:answerlattice-knowledge-intake-contracts` | PASS |
| `npm run verify:answerlattice-founder-support-controls` | PASS |
| `npm --prefix packages/answerlattice-web run build` | PASS |
| `npm run verify:dependency-freeze` | PASS |
| `npm run test:answerlattice-widget-runtime-token` | PASS |
| `npm run test:answerlattice-signal-contracts` | PASS |
| `npm run test:answerlattice-governance-contracts` | PASS |
| `npm run test:answerlattice-retrieval-contracts` | PASS |
| `npm run verify:answerlattice-runtime-truth` | PASS, including dedicated/shared Firestore and Storage rule emulators |
| `npx tsc --noEmit --pretty false` | PASS |
| `git diff --check` | PASS |

The runtime-truth chain was rerun on the final source state after malformed nested procedure handling, contiguous step-order validation, answer-type/procedure parity, visible-target selection, and event-gated completion enforcement were added.

## Residual Verification

The following require a deployed Answerlattice environment and an instrumented client product:

- real allowed-origin/runtime-token round trip;
- desktop and mobile browser interaction;
- behavior across the client router;
- real terminal signal inspection;
- measured task-completion benefit;
- target drift after a client release;
- real MenuList desktop guidance with an approved canonical procedure;
- a separate decision before enabling the currently suppressed MenuList mobile widget.

These items block broad public performance claims, not source integration or controlled workspace testing.
