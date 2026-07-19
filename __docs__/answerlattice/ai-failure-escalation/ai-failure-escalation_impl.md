# AI Failure Escalation - Implementation

> **Version:** 2.1.0
> **Last Updated:** 2026-07-18
> **Status:** Explicit widget path implemented; automatic evaluator flag off

## Active Widget Runtime

### Search And Feedback

- `src/app/api/widget/search/route.ts` authenticates the public widget credential, enforces product/purpose/scope/origin, uses bounded request parsing, calls canonical-first `coreSearch()`, projects public-safe citations and related-content labels, and returns `fallbackSuggested` without exposing internal escalation debug.
- `src/app/api/widget/feedback/route.ts` persists the outcome and returns authoritative `success`, `resolutionOutcome`, `isGood`, and `created` fields.
- `src/app/widget/[apiKey]/WidgetClient.tsx` uses those authoritative fields, exposes an explicit support form for unresolved answers, runs related items as follow-up questions, and tells the user when an attached screenshot could not be used.

### Support Request Route

`POST /api/widget/escalation`:

1. requires `ENABLE_ANSWERLATTICE_WIDGET`;
2. rate-limits by pre-auth IP hash and widget-key hash with fail-closed provider behavior;
3. accepts only an `al_` widget credential with `widget:feedback` scope;
4. resolves exact Answerlattice `tId` and `sId` from the credential-owned store;
5. verifies direct origin or the origin-bound widget runtime token;
6. caps JSON at 4 KiB and validates `{ searchHistoryId, email, name?, details? }` strictly;
7. delegates to `executeAnswerlatticeWidgetEscalation()`;
8. returns private, no-store responses.

### Transactional Ticket Creation

`src/lib/answerlattice/widgetEscalationServer.ts`:

- creates a deterministic ticket ID from `tId + sId + searchHistoryId`;
- transactionally reads the search-history record and ticket;
- requires exact `AL` product/workspace scope and `mountContext: 'widget'`;
- rejects solved history, malformed history, and conflicting ticket linkage;
- derives the question, bounded references, confidence, matched entities, image-derived query context, and allowlisted product context from persisted history;
- creates a validated `supportTickets` document only when absent;
- links the history to the ticket and records `resolutionOutcome: 'not_resolved'` when feedback is not already present;
- emits one deterministic best-effort `ESCALATION` signal after the transaction.

The public request cannot set ticket status, priority, category, product/workspace scope, source, knowledge-candidate state, retrieval debug, or signal metadata.

## Ticket Shape

The created ticket uses existing support-ticket lifecycle fields plus:

- `source: 'ai_escalation'`;
- `knowledgeCandidate: true`;
- `escalationContext.triggerTypes: ['explicit_user_request']`;
- persisted query, bounded product context, canonical result summary, up to five persisted references, and optional image-derived effective query;
- `widgetEscalation.searchHistoryId`, reply email, optional submitted name, and a details-present boolean.

The initial widget form does not upload attachments and does not retain a raw page DOM or arbitrary client state.

## Automatic Evaluator Path

`src/lib/answerlattice/escalationEvaluator.ts` and `escalationTypes.ts` remain wired into `coreSearch()`, the authenticated Help Center response, Help Chat UI, and existing ticket DAL. This path runs only when `ENABLE_ANSWERLATTICE_AI_ESCALATION` is enabled. The explicit widget support-request route does not depend on that flag.

## Public Projection Boundaries

- RAG reference URLs pass through `normalizeAnswerlatticePublicCitationUrl`; unsafe or private URLs are omitted.
- Related articles, FAQs, and changelog entries expose only bounded public labels/IDs/version metadata and become follow-up searches rather than raw internal navigation.
- `imageProcessed: false` is handled visibly; the answer is identified as text-only rather than silently implying screenshot use.
- Internal escalation triggers and debug payloads are never returned by the widget search route.

## Failure Behavior

- rate-limit provider unavailable: `503` with retry guidance;
- ordinary rate limit: `429`;
- bad credential: `401`;
- origin denial: `403`;
- invalid body/email: `400`;
- missing/out-of-scope history: `404`;
- solved or conflicting history/ticket: `409`;
- unexpected server failure: generic `500` plus bounded diagnostics.

Signal failure is observable but non-blocking after a valid ticket transaction.

## Verification

- static answer/projection contract: `scripts/verification/test-answerlattice-widget-answer-contracts.ts`;
- Firestore transaction and replay contract: `scripts/verification/test-answerlattice-widget-escalation-emulator.ts`;
- feedback boundary: `scripts/verification/verify-answerlattice-feedback-boundary.js`;
- aggregate source/runtime gate: `scripts/verification/verify-answerlattice-runtime-truth.js`.
