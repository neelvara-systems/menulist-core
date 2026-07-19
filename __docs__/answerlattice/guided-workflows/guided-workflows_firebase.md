# Answerlattice Guided Workflows Firebase

> **Status:** Implemented, workspace opt-in
> **Version:** 2.2.0
> **Last verified:** 2026-07-18

## Data Model

No new collection is used.

| Existing path | Purpose | Change |
|---|---|---|
| Canonical answer document | Embedded `content.procedure` | Adds optional target/event fields |
| `stores/{sId}` | Existing `widgetConfig` map | Adds default-false `guidedResolutionEnabled` |
| AI search history | Proves a scoped canonical widget answer before outcome recording | Adds the validated `guidedProcedure` snapshot to the existing answer write; terminal handling uses one exact read |
| Signal events | Existing bounded/TTL signal path | One deduplicated terminal outcome when enabled |

No Firestore rule, index, Storage, listener, Cloud Function, or scheduler change is required.

MenuList reference-client targets and events are browser-only constants. Merely mounting them adds:

```text
Firestore reads: 0
Firestore writes: 0
listeners: 0
Functions calls: 0
AI calls: 0
```

Menu import, publish, and verification continue to use their existing MenuList operations. The semantic event helper does not duplicate those writes.

## Cost Shape

### Authoring

Procedure fields remain part of the existing canonical-answer create/update write. There is no procedure collection or step subcollection.

### Widget Search

The existing canonical retrieval writes the validated procedure snapshot into the same search-history document and projects it in the existing response only when the result is canonical. This adds no document write; it adds bounded fields to the existing answer-history write.

### Active Guide

Highlighting, step state, target lookup, and expected-event matching are browser memory operations:

```text
Firestore reads: 0
Firestore writes: 0
listeners: 0
AI calls: 0
```

### Terminal Outcome

When signal mutation is enabled:

```text
1 exact, unexpired AI search-history proof read
+ up to 1 deduplicated signal write
```

When signal mutation is disabled:

```text
0 proof reads
0 writes
```

Closing, hiding, navigating, or changing context does not write an outcome.

## Cost Controls

- 4 KB request-body limit.
- Existing feedback-submission rate-limit budget.
- One terminal submission per in-memory procedure session.
- Stable server idempotency key does not depend on the client request ID.
- One exact document read; no collection query or scan.
- Exact procedure/session evidence is checked from the retained search-history snapshot; no canonical-answer reread is required.
- No real-time listeners.
- No background processing.
- No additional AI request.
- Raw non-escalation outcomes remain operational signals and do not create proposals automatically.
- Existing signal TTL/retention policy applies.

## Recovery and Rebuild

There is no summary document or derived index to rebuild. Canonical procedures remain authoritative. Terminal outcome loss does not corrupt the procedure or client product; it only reduces operational evidence.

Dedicated owner analytics should not query raw outcomes on page load. If real-client evidence justifies a dashboard, it must use an existing bounded scheduled aggregation or compact summary rather than a new raw-event scan.

Reference procedure creation uses the existing knowledge-intake review item and mutation-proposal writes. It does not write a canonical answer directly and does not introduce another collection. A successful **Still stuck** handoff reuses the existing deterministic widget-ticket transaction audited in Feature 16; it is not a new guided-workflow collection or action system.

## Index Decision

No query filters on `answerType`, procedure fields, target IDs, or outcome metadata. No new composite or single-field index is justified.
