# AI Failure Escalation - Specification

> **Version:** 2.3.0
> **Last Updated:** 2026-07-20
> **Status:** Explicit widget fallback active; automatic evaluator rollout-gated

## Problem

An unanswered or unhelpful support response must not force an end user to restart elsewhere or cause Answerlattice to invent an answer. The founder needs the original question and bounded product/search context, but the public client must not be trusted to manufacture internal retrieval evidence.

## Active User Job

When a widget answer does not resolve the question, the user can deliberately create an asynchronous support request without re-entering the original question.

### Acceptance Contract

1. Widget search stores an exact-scope `aiSearchHistory` record.
2. The answer response may expose `fallbackSuggested: true` for an empty answer, a public fallback, or a gated evaluator suggestion.
3. `Solved` and `Still need help` feedback use the server's authoritative persisted outcome.
4. An unresolved user may open a support form with required reply email and optional name/details.
5. Submission requires the current widget key, exact origin or runtime authorization, exact workspace, bounded body, and valid stored widget search-history ID.
6. The server derives ticket evidence from the stored history and creates a deterministic ticket.
7. Replay returns the same ticket and does not create another ticket or signal.
8. A search record already marked solved cannot be escalated.
9. Success copy confirms only that a support request was created; it does not promise notification or response time.

## Automatic Evaluator

The optional evaluator can add bounded internal escalation metadata to `coreSearch()`. It does not create a ticket or expose internal debug context to Help Chat. It remains disabled by `ENABLE_ANSWERLATTICE_AI_ESCALATION: false`.

When enabled in a future controlled rollout, it may classify:

1. no canonical answer plus no useful evidence actually cited by the final answer;
2. no resolved entity plus no useful final-answer evidence;
3. an empty answer or safe refusal;
4. a canonical miss whose best cited RAG score is below the configured threshold.

A canonical miss with a non-empty answer and strong cited RAG evidence is not a failure and must not interrupt the user.

Browser-provided retry or failure counters are not authority and must not trigger escalation. Malformed, unbounded, non-finite, or out-of-range evidence must fail closed to no automatic suggestion.

Activation additionally requires a server-authoritative, explicitly confirmed, deterministic, idempotent Help Chat handoff, representative answer-quality tests, hosted workflow proof, and threshold validation. Code presence is not evidence that automatic escalation performs well.

## Data Required

- persisted query and answer-source metadata;
- exact Answerlattice product, tenant, and workspace scope;
- widget mount context;
- canonical/FAQ/RAG references already retained by search history;
- bounded page/feature/workflow context when supplied through the allowlisted widget context contract;
- user-provided reply email and optional details.

## Human Review

- A founder or support operator handles the created ticket.
- Escalation signals may contribute to a review proposal only through the existing governed mutation workflow.
- No ticket, feedback row, or repeated question becomes an approved answer automatically.

## Measures

Measure actual outcomes without pre-setting marketing targets:

- support-request creation success and replay rate;
- invalid/out-of-scope/solved-record rejection rate;
- context-complete handoff rate;
- time to first human response and verified resolution;
- customer recontact after resolution;
- repeated unresolved-question rate;
- percentage of escalation evidence that results in an approved knowledge correction;
- false or intrusive automatic suggestions if the evaluator is later enabled.

## Out Of Scope

- live chat, staffing, assignment, or SLA management;
- automatic refunds, permission changes, or other account actions;
- customer-controlled retrieval-debug payloads;
- automatic answer publication;
- attachments in the public widget escalation form;
- public claims about resolution speed, escalation rate, or cost without measured evidence.

## Rejection Rules

Do not enable automatic suggestions if representative tests show increased false escalation, hidden unresolved answers, unsupported claims, incorrect citations, or excessive founder workload. Do not add autonomous actions until authorization, confirmation, audit, recovery, and task-completion evidence are separately proven.
