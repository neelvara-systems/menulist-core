# AI Failure Escalation - Implementation

> **Version:** 2.3.0
> **Last Updated:** 2026-07-20
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

`src/lib/answerlattice/escalationEvaluator.ts` and `escalationTypes.ts` remain wired into `coreSearch()`. The authenticated Help Center route may project only `suggested`, `type`, and trigger labels; it does not return the internal escalation context. Help Chat has no automatic ticket callback. This path runs only when `ENABLE_ANSWERLATTICE_AI_ESCALATION` is enabled. The explicit widget support-request route does not depend on that flag.

The automatic evaluator:

- validates canonical result shape, bounded query text, finite 0..1 RAG scores, and bounded entity evidence;
- receives only references the generated answer actually used, rather than all candidate documents considered by retrieval;
- treats an empty result or safe knowledge-base refusal as an empty outcome;
- sorts up to 50 admitted used references and retains the actual best five for decision/context;
- bounds context values, entity IDs, tokens, and candidates before returning ticket metadata;
- validates the projected escalation context with a strict bounded schema;
- returns `NO_ESCALATION` on malformed evidence or evaluator failure;
- returns no suggestion for a healthy source-backed RAG answer after an ordinary canonical miss;
- does not accept `sessionFailureCount` or any other browser-owned repeated-failure authority.

The previous authenticated Help Chat explicit-intent shortcut, browser ticket DAL call, and suggestion callback were removed. Enabling the evaluator therefore cannot silently create a ticket.

Any future Help Chat handoff must use a server route that derives exact-scope evidence from persisted search history, requires explicit user confirmation, applies deterministic/idempotent ticket identity, and enforces permission/rate/admission rules. That work remains an activation blocker.

The browser ticket DAL rejects the server-reserved `source`, `knowledgeCandidate`, `escalationContext`, and `widgetEscalation` fields and always emits an ordinary `TICKET` signal. Both Firestore rule sets reject those fields on client ticket creation. The widget server uses Admin authority, validates the stored escalation shape, and emits its own deterministic `ESCALATION` signal.

## Public Projection Boundaries

- RAG reference URLs pass through `normalizeAnswerlatticePublicCitationUrl`; unsafe or private URLs are omitted.
- Related articles, FAQs, and changelog entries expose only bounded public labels/IDs/version metadata and become follow-up searches rather than raw internal navigation.
- `imageProcessed: false` is handled visibly; the answer is identified as text-only rather than silently implying screenshot use.
- Internal escalation triggers and debug payloads are never returned by the widget search route.
- Internal escalation context is not returned by the authenticated Help Center route.

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
- automatic evaluator contract: `scripts/verification/test-answerlattice-ai-failure-escalation.ts`;
- ticket lifecycle contract: `scripts/verification/test-answerlattice-ticket-contracts.ts`;
- dedicated/shared ticket rules: `scripts/verification/test-answerlattice-ticket-rules.ts`;
- feedback boundary: `scripts/verification/verify-answerlattice-feedback-boundary.js`;
- aggregate source/runtime gate: `scripts/verification/verify-answerlattice-runtime-truth.js`.
