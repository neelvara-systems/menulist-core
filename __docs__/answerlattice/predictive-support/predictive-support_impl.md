# Predictive Support And Known Issues Implementation

**Status:** Current implementation truth
**Last verified:** July 18, 2026

## Connected files

### Contracts and evaluation

- `src/lib/answerlattice/predictiveSupportContracts.ts`
- `src/lib/answerlattice/predictiveTriggerIdBoundary.ts`
- `src/lib/answerlattice/predictiveEngine.ts`
- `src/lib/answerlattice/runtimeSummaryContracts.ts`
- `src/types/answerlattice/index.ts`

### Owner management

- `src/database/answerlattice/predictiveTriggers.ts`
- `src/hooks/answerlattice/usePredictiveTriggers.ts`
- `src/components/templates/answerlattice/governance/PredictiveTriggerManager.tsx`
- `src/components/templates/answerlattice/knownIssues/AnswerlatticeKnownIssues.tsx`

### Public runtime

- `src/app/api/answerlattice/predictive-help/route.ts`
- `src/app/api/answerlattice/predictive-interaction/route.ts`
- `public/widget/answerlattice-widget.js`
- `src/app/widget/[apiKey]/WidgetClient.tsx`
- `src/app/api/widget/config/route.ts`
- `src/lib/answerlattice/widgetRuntimeTokenServer.ts`

### Signals and scheduled review evidence

- `src/lib/answerlattice/signalEmitter.ts`
- `functions-answerlattice/src/answerlattice/predictiveTriggerSync.ts`
- `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts`

### Security and tests

- `firestore-answerlattice.rules`
- `firestore.rules`
- `scripts/verification/test-answerlattice-predictive-support.ts`
- `scripts/verification/test-answerlattice-predictive-rules.ts`
- `scripts/verification/verify-answerlattice-runtime-truth.js`

## Shared contract

`predictiveSupportContracts.ts` is the common admission and projection layer. It validates:

- exact workspace ownership;
- valid trigger ID, status, source, kind, conditions, action, numeric limits, and timestamps;
- correct `known_issue` kind/action pairing;
- public HTTPS known-issue URL;
- strict interaction body and contract version;
- active applicability window and context matching;
- public suggestion and runtime trigger projections.

Legacy records without `kind` derive it from the action. The client update path and Firestore rules permit only a one-time migration from missing `kind` to the derived value; later kind changes are rejected.

## Owner mutation flow

Every create, update, activate, disable, or delete operation:

1. normalizes the trigger/document ID;
2. verifies exact stored scope;
3. validates only owner-editable fields;
4. requires `source: manual` for browser-created triggers;
5. requires an exact page before active status;
6. writes through the Answerlattice document composer;
7. rebuilds the bounded predictive summary;
8. marks compiled context source truth changed.

The update patch starts empty. It does not spread caller metadata or accept effectiveness, friction evidence, creator, or source changes.

## Summary flow

The app and Functions summary builders query at most 201 rows to detect the 200-trigger ceiling. If more than 200 rows exist, the rebuild fails and does not replace the previous valid summary.

The summary stores only the runtime projection in:

```text
platformSummary/predictiveTriggers_{tId}_{sId}
```

The server parser repeats product, scope, trigger, window, and projection checks before the result can enter the in-memory cache.

## Predictive request admission

`POST /api/answerlattice/predictive-help` performs this order:

```text
feature gate
-> al_ key shape
-> fail-closed IP pre-auth limit
-> fail-closed API-key limit
-> key validation
-> product/purpose/scope checks
-> exact workspace derivation
-> origin/runtime-token authorization
-> 4 KiB bounded body
-> strict page/context validation
-> deterministic trigger evaluation
-> 32 KiB-bounded public response consumption
```

The server hashes the API-key rate identity with the widget's non-PII session ID before cooldown evaluation. It never trusts body-supplied tenant/workspace scope.

## Interaction admission

`POST /api/answerlattice/predictive-interaction` accepts only:

- `suggestion_shown`;
- `suggestion_clicked`;
- `suggestion_dismissed`.

The route repeats the widget credential, scope, origin, runtime-token, rate-limit, and 4 KiB body checks. It then reloads the current summary and proves that the trigger is active, in-window, and still matches the submitted context. Signal mutation can be disabled independently.

## Loader and iframe behavior

The public loader:

- derives a normalized page from `context.page` or `contextKey`;
- sends only allowlisted structured context;
- assigns a per-tab non-PII session ID;
- debounces requests and caches a context result for 60 seconds;
- clears cache when runtime authorization changes;
- clears stale suggestions when context, visibility, authorization, or capability changes;
- reports shown, opened, and dismissed evidence;
- never sends raw DOM, unrestricted state, email, or customer identifiers.

The iframe normalizes the suggestion and any attached governed procedure again. A null message removes a stale predictive notice.

## Known issues

Known issues use `kind: known_issue` and `action.type: known_issue`. The owner supplies:

- an exact page;
- title and bounded summary;
- severity;
- optional start and end time;
- optional public HTTPS status URL.

The runtime enforces the time window. Known issues are excluded from ordinary cooldown and from the scheduled engagement aggregation used for predictive prompts.

## Scheduled behavior

The existing nightly predictive task may:

- generate up to five friction-based `suggested` records;
- rebuild the summary;
- aggregate shown/opened/dismissed evidence into advisory fields.

It does not activate, approve, reprioritize, auto-disable, or publish a trigger. Failure diagnostics use bounded codes and scope-presence metadata rather than raw exception or tenant data.

## Answerlattice App Predictive Trigger ID Boundary

Every browser DAL, hook, summary parser, interaction route, and rule mutation uses the shared Firestore document-ID boundary. Raw IDs are not used to construct predictive trigger document references.

## External dependencies

- Upstash Redis is used for ordinary prompt cooldown when configured.
- Firebase Auth/session permissions govern owner surfaces.
- Firestore stores triggers, compact summaries, audit history, and optional signals.

Predictive help remains non-blocking. Provider or cache failures do not prevent normal host-product or widget operation.
