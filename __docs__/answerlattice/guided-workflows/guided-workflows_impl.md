# Answerlattice Guided Workflows Implementation

> **Status:** Implemented, workspace opt-in
> **Version:** 2.1.0
> **Last verified:** 2026-07-18

## Architecture

```text
approved canonical answer
  -> widget search response with validated procedure
  -> end user starts guide
  -> iframe sends current step to host loader
  -> loader finds exact semantic target
  -> non-interactive highlight + scroll
  -> user continues or client emits expected event
  -> iframe advances or ends
  -> optional deduplicated terminal signal
```

## Entrypoints

| Surface | File | Responsibility |
|---|---|---|
| Canonical procedure types | `src/types/answerlattice/index.ts` | Procedure fields, constraints, signal type |
| Procedure validation | `src/lib/answerlattice/procedureValidation.ts` | Write-time structure and semantic-ID checks |
| Owner editor | `src/components/templates/answerlattice/governance/CanonicalAnswerEditor.tsx` | Procedure authoring without dropping existing metadata |
| Widget config | `src/lib/answerlattice/widgetConfig.ts` | Default-off workspace setting and integration snippet |
| Owner widget UI | `src/components/templates/answerlattice/widgetManagement/AnswerlatticeWidgetManagement.tsx` | Toggle and Guided Steps instructions |
| Public config API | `src/app/api/widget/config/route.ts` | Capability is true only when both flags and owner toggle allow it |
| Public search API | `src/app/api/widget/search/route.ts` | Returns procedure only for canonical results |
| Host SDK | `public/widget/answerlattice-widget.js` | Target highlight, route reset, event emission |
| Widget iframe | `src/app/widget/[apiKey]/WidgetClient.tsx` | In-memory procedure-session state machine |
| Outcome schema | `src/lib/answerlattice/guidedResolutionContracts.ts` | Strict public payload and stable idempotency key |
| Outcome API | `src/app/api/widget/guidance-outcome/route.ts` | Credential, origin, history proof, and signal write |
| Verification | `scripts/verification/test-answerlattice-guided-resolution.ts` | Static and contract regression gate |
| Reference client registry | `src/lib/answerlattice/referenceClients/menuListGuidedResolution.ts` | MenuList targets, events, and review-only procedure drafts |
| Reference client verification | `scripts/verification/test-answerlattice-menulist-reference-client.ts` | Registry, SDK, intake, desktop, and mobile parity gate |
| Typed browser helper | `packages/answerlattice-web/src/index.ts` | Exposes `emitWorkflowEvent` and read-only `getGuidanceState` |

## Activation Gates

Guidance is active only when all are true:

1. `ENABLE_ANSWERLATTICE_WIDGET`
2. `ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS`
3. `ENABLE_ANSWERLATTICE_GUIDED_RESOLUTION`
4. `stores/{sId}.widgetConfig.guidedResolutionEnabled`
5. widget origin/runtime authorization succeeds
6. search returned an approved canonical procedure

The global feature flags are enabled in source. The per-workspace setting defaults to `false`.

## MenuList Runtime Wiring

MenuList imports one typed target/event registry across desktop and mobile. The current reference workflows are:

- menu source selection and import start;
- extraction review apply and retry;
- publish acknowledgement and optional health verification;
- Share opening and public-link opening.

An event is emitted only after the relevant local contract acknowledges the transition. For example, import start follows an accepted job, review completion follows `isAcknowledgedApplyChangesResult`, and publish verification follows a result with `status === "OK"`. A step with `expectedEvent` has no manual Next/Finish path, so the terminal `completed` outcome cannot be produced by clicking through an unverified product transition.

No event payload is accepted by the helper. This prevents accidental propagation of menu data, URLs, job IDs, tenant/store IDs, or user data.

## Intake To Governance

Structured procedures generated from intake remain non-authoritative:

```text
owner source
  -> starter-pack candidate
  -> strict procedure validation
  -> intake review item
  -> owner accepts and publishes as mutation proposal
  -> governance review
  -> canonical answer approval
  -> widget retrieval
```

The starter-pack normalizer retains a target or expected event only when the exact semantic ID appears in a cited owner source. The intake API preserves `answerType` and `procedure`, rejects mismatched pairs, and clears stale procedure data when the answer format changes.

## Host Integration

```html
<button data-answerlattice-target="billing.change_plan">
  Change plan
</button>
```

```js
// Emit only after the client product verifies the expected state transition.
window.AnswerlatticeWidget?.emitWorkflowEvent('billing.plan_changed');
```

The loader:

- accepts only bounded semantic IDs;
- scans at most 500 explicit target attributes;
- ignores hidden and zero-size duplicate candidates so the visible client control is selected;
- compares attribute values exactly;
- never evaluates the target as a selector;
- creates an overlay with `pointer-events: none`;
- respects reduced-motion preferences;
- checks iframe message source and origin;
- clears stale guidance on route/context changes.

## Widget State Machine

The iframe keeps one active session in React state and a ref:

- `messageId`
- approved procedure
- canonical search-history ID
- random procedure session ID
- current step index
- widget session ID

The state is not stored in Firestore. A matching expected event advances only the current session and current step. A stale event, stale session, invalid target, or invalid procedure is ignored.

## Outcome Boundary

`POST /api/widget/guidance-outcome`:

1. Stops if the widget or guide flags are off.
2. Rejects malformed keys before Firestore credential lookup.
3. Applies fail-closed pre-auth and key rate limits.
4. Validates a hashed Answerlattice widget key with `widget:feedback`.
5. Derives exact `pId/tId/sId` scope from the credential.
6. Checks owner opt-in.
7. Verifies allowed origin and runtime token.
8. Reads at most 4 KB of JSON and rejects unknown fields.
9. Returns without a write when signal mutation is disabled.
10. Reads one exact AI search-history document.
11. Requires exact Answerlattice workspace scope, `mountContext === "widget"`, `canonical === true`, and a valid canonical answer ID.
12. Emits one deduplicated signal keyed by search-history ID plus procedure-session ID.

An escalation uses the existing `ESCALATION` signal type. Completed, abandoned, and target-missing outcomes use `GUIDED_RESOLUTION`. These non-escalation outcomes do not automatically enter a mutation proposal or change approved knowledge.

## Backward Compatibility

- Existing explanation/navigation answers require no migration.
- Existing procedures without `target` or `expectedEvent` remain readable as written step lists.
- `guidedResolutionEnabled` defaults to false for old widget configurations.
- No collection, document path, rule, index, or Function contract changed.

## Failure Behavior

| Failure | Behavior |
|---|---|
| Target absent | Written step remains usable; user can report target missing |
| Expected event never arrives | User can continue manually or escalate |
| Route/context changes | Highlight and in-memory session are cleared |
| Outcome network failure | Product workflow remains unaffected; UI does not claim the outcome was persisted |
| Invalid/revoked key | Generic unauthorized response |
| Disallowed origin/runtime token | Fail closed |
| Signal mutation disabled | Success response with `recorded: false`, no write |
| Search history absent/non-canonical | Generic not-found response, no signal |

## Future Admission Gate

An action broker is not part of this implementation. Any later state-changing action requires a separate feature decision with client registration, trusted server authorization, confirmation, idempotency, result verification, audit history, and rollback behavior.
