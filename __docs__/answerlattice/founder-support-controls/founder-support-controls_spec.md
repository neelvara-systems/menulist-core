# Founder Support Controls - Specification

> **Status:** Implemented in source; deployment and browser certification remain separate release gates
> **Feature flags:** `ENABLE_ANSWERLATTICE_ANSWER_TESTS`, `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION`, `ENABLE_ANSWERLATTICE_KNOWN_ISSUES`, `ENABLE_ANSWERLATTICE_VERIFIED_CONTEXT`, `ENABLE_ANSWERLATTICE_EXTERNAL_EVIDENCE_LINKS`, `ENABLE_ANSWERLATTICE_SUPPORT_TRUTH_EXPORT`

## Problem

Answerlattice already collects product knowledge, serves approved answers, detects drift, records support misses, and prepares review work. A founder still needs safe answers to four operational questions:

1. Will the support layer answer the questions I expect before users see it?
2. Did a release break any important answer or scope?
3. How do I tell affected users about a temporary problem without changing permanent knowledge?
4. Can I trust visitor context, keep useful debugging evidence, and take my approved knowledge with me?

## Users

- Solo SaaS founders operating support themselves.
- Product owners reviewing releases and support quality.
- Trusted workspace members with the existing Answerlattice permissions.

## Functional Requirements

### Answer Test Suite

- Owners can create, edit, delete, and run up to 100 test cases per workspace.
- A test case contains a question, optional page/surface context, optional plan/role, expected result class, optional expected answer/FAQ ID, required and forbidden claims, an evidence policy, a standard/critical risk level, and optional related entity IDs.
- Expected source classes are `canonical`, `faq`, `rag`, `escalation`, and `no_answer`.
- Evidence policies are `not_required`, `at_least_one`, and `specific_sources`; the last policy requires one to eight expected article-reference IDs.
- Existing version-1 cases default to standard risk with no new evidence requirement.
- Canonical-only runs never invoke the AI fallback provider.
- Full-runtime runs use the existing search pipeline, existing SAFE_MODE, existing rate limits, and existing support-credit accounting.
- Test traffic is marked as test traffic and excluded from production search history, signals, conversations, friction, coverage, and ROI.
- The UI shows pass/fail, source, answer/version, evidence outcome, bounded reference IDs, risk level, proof status, and duration.
- A run is `blocked` when any critical case fails, `review` when only standard cases fail, and `ready` when every case passes. This is an advisory release-proof state, not an automated deployment gate.
- Only the latest 10 compact run summaries are retained.

### Release Safety

- Release checks select test cases by related entity IDs and product-surface context.
- A release check never scans all historical tests or all support collections.
- Failed release checks create no knowledge automatically.
- Critical failures mark the release-check result blocked without changing release, deployment, or product state.
- Owners can convert a failure to a mutation proposal.
- Version history offers `Propose rollback`; this creates a `version_update` mutation proposal containing the selected prior version as review material.
- Approval and implementation continue through the existing governance flow.

### Proposal Impact Preview

- A governance reviewer can check a pending answer-changing proposal before approving it.
- The preview uses the same proposal-to-canonical candidate builder as final approval, including any edits currently entered in the draft review form.
- Only active Answer Tests explicitly linked by expected canonical-answer ID or an affected old/new entity ID are eligible.
- Critical linked tests are evaluated first and the preview is capped at 10 cases.
- The response compares current and proposed deterministic outcomes and labels regressions, improvements, changed outcomes, and unchanged outcomes.
- The projected proof status remains advisory. It does not block or execute approval, change a release, publish an answer, create a retained test run, or modify deployment state.
- The preview performs no AI-provider fallback. Final approval still performs authoritative entity, state, scope, version-overlap, transaction, audit, and cache-invalidation checks.
- When no active test is explicitly linked, the UI says that proof is missing instead of scanning unrelated tests or implying safety.

### Known-Issue Notices

- Owners can create an issue with title, approved message, status, affected page/feature/workflow, optional related URL, start time, and end time.
- Status values are `investigating`, `identified`, `monitoring`, and `resolved`.
- Active notices appear contextually in the widget when the configured context matches.
- Notices do not replace, edit, or outrank canonical answers.
- Expired or resolved notices stop appearing without a client-side collection query.
- Current status remains owner-visible; notice edits reuse the existing predictive-trigger record and summary pipeline.

### Verified Visitor Context

- Owners can generate an Ed25519 key pair from Answerlattice.
- Answerlattice stores only the public key and key identifier; the private key is returned once.
- A host product signs a short-lived EdDSA JWT on its server.
- Accepted claims are limited to subject, name, email, plan, role, and locale.
- Tokens expire within 10 minutes and must use the Answerlattice widget audience and the current key identifier.
- Tenant/workspace scope always comes from the widget API key, never token claims.
- Invalid tokens fail closed to unsigned/public behavior without crashing the host product.

### External Evidence Links

- The widget can receive up to three support-safe HTTPS evidence links from owner-configured allowed evidence hosts.
- Typical links point to Sentry, PostHog, or the host product's own support-safe diagnostics page.
- Links are stored only with private widget-search activity when the user submits support input.
- Links are never fetched, crawled, rendered publicly, or used as retrieval truth.
- Only authenticated workspace members can open them from owner support surfaces.

### Support Truth Export

- Owners with export permission can download a bounded JSON package containing product surfaces, published KB articles, published FAQs, changelog entries, entities, canonical answers, and release records.
- Export is owner-triggered, tenant/store scoped, ordered, and capped by existing product limits.
- The package contains schema version, generated time, counts, and a `complete: true` marker.
- Secrets, raw widget keys, integration credentials, private visitor identity, tickets, chat transcripts, and raw audit logs are excluded.
- An oversized export fails safely with an owner-readable message instead of silently truncating authoritative data.

### Owner Support Assistant Alignment

- The shipped assistant reads six compact summaries in one bounded `getAll()` call, including the activation snapshot used for factual launch verification.
- It can explain attention, answer risk, friction, readiness, and intake status and link to governed routes.
- It does not run tests, create notices, prepare rollback proposals, start exports, or execute any mutation from free text.

### Progressive Governance Navigation

- Primary navigation keeps Answer Tests, Canonical Answers, Product Ontology, Drift Review, Signal Queue, and Trust Metrics visible.
- Analytics, entity health, history, candidates, branding, friction, languages, and predictive triggers remain available through an explicit `Advanced tools` menu when their existing permissions and feature flags allow them.
- Advanced routes remain addressable, authorized, and breadcrumb-aware. Hiding them from the primary list is presentation only and must not weaken route guards or disable their runtime.
- A direct advanced route shows the active advanced screen plus the primary governance tabs; it does not expose other advanced screens implicitly.

## Permissions

| Control | Permission |
| --- | --- |
| View/run answer tests | `canManageGovernance` |
| Preview a proposal against linked tests | `canManageGovernance` |
| Create rollback proposal | `canManageGovernance` |
| Manage known issues | `canManageGovernance` |
| Configure verified context | `canManageWidget` |
| View evidence links | `canManageSupport` |
| Export support truth | `canExportData` |

## Non-Goals

- Full status pages, subscriber notifications, or incident response management.
- Session replay capture or product analytics.
- Customer CRM, public roadmap, or issue prioritization by revenue.
- Automatic answer grading by an LLM.
- Autonomous deployment approval or release mutation from a proof status.
- Automatic rollback or auto-publishing.
- Simulating unapproved content through the provider-backed RAG pipeline.
- Exporting private support conversations or secrets.

## Success Criteria

- A founder can create five priority questions, mark material cases critical, require known article references where applicable, and run a canonical-only test in one session.
- Legacy test suites load unchanged while new runs retain deterministic evidence and proof-status fields.
- A release can check only its affected cases without a broad scan.
- A reviewer can compare a pending proposal against at most 10 explicitly linked active tests without a write or provider call.
- An active known issue appears on matching widget surfaces and disappears after resolution/expiry.
- Signed context is verified server-side and unsigned identity remains non-authoritative.
- Evidence links remain bounded and private.
- Export produces a complete, scoped package or fails explicitly.
- Invalid signed visitor tokens discard signed-only identity claims but do not block generic page-aware support.

## Suggestions And Discussion Items

No unresolved architecture decision remains. Native mobile SDKs, full status pages, session replay, inbound email, CRM, and project-management expansion are intentionally excluded by doctrine.
