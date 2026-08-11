# Answerlattice Feature Flow Audit Tracker

**Status:** Active strict-order ledger  
**Last updated:** July 26, 2026
**Authority:** Current code, runtime contracts, maintained Answerlattice docs, Firebase configuration, and focused verifiers outrank historical guides and assumptions.

This tracker freezes the agreed 44-feature audit order. Do not start a later item until the current item has completed its local code/docs verification. Provider, deployment, authenticated-browser, device, DNS, IAM, billing-console, and production evidence remains separate and must not be reported as source completion.

## Completion contract

For each feature, the audit must cover the complete connected flow where applicable:

- owner/customer UI, hooks, DAL, API routes, server helpers, Cloud Functions, and public/runtime consumers;
- types, constants, feature flags, data ownership, tenant isolation, permissions, validation, audit history, and failure recovery;
- Firestore/Storage reads, writes, deletes, indexes, retention, cost, scale, and cache/read-model invalidation;
- maintained docs, public claims, mobile/responsive behavior, product separation, and focused tests;
- an explicit docs-to-code parity diff and a current-worktree verification result.

“Local source complete” means those source, docs, logic, security, cost, failure, and focused local verification boundaries are complete. It does not mean approved release, live provider, authenticated hosted browser, physical device, DNS, IAM, remote Firebase, billing-console, or production-host evidence has been completed.

## Frozen feature order

| # | Feature flow | Size | Queue status | Primary audit boundary |
| --- | --- | --- | --- | --- |
| 1 | Canonical answer creation, scope, approval, versioning, and audit | Large | Local source complete | Manual create/update proposal -> governed approval -> canonical truth -> audit snapshots -> cache/source/bundle invalidation -> version history |
| 2 | Answer retrieval, citations, confidence, clarification, and abstention | Large | Local source complete | Canonical-first resolution -> scope/version applicability -> evidence/citations -> confidence -> clarification/abstention -> fallback |
| 3 | Knowledge Intake, source discovery, media, and repeated replies | Large | Local source complete | Source connection/intake -> normalization -> review items -> approved destinations -> provenance and permissions |
| 4 | KB generation, embedding jobs, review, and publishing | Large | Local source complete | Upload/job lifecycle -> generation -> review -> publish -> embedding -> retry/deletion/retention |
| 5 | KB articles, categories, and content feedback | Medium | Local source complete | Authoring and navigation -> article lifecycle -> feedback -> publishing/cache behavior |
| 6 | FAQ creation, linkage, review, and retrieval | Medium | Local source complete | FAQ authoring/generation -> article/entity/surface linkage -> review/publish -> retrieval/freshness |
| 7 | Product ontology, entities, relations, and graph operations | Large | Local source complete | Entity/candidate lifecycle -> relations/search index -> merge/deprecation -> dependent references |
| 8 | Product surfaces, safe context, and applicability | Large | Local source complete | Route/workflow mapping -> context content -> runtime applicability -> privacy and cache behavior |
| 9 | Answer Tests, proposal impact, release regression, and rollback | Large | Local source complete | Test-set management -> evaluation -> proposal comparison -> release gate -> rollback proposal |
| 10 | Drift, conflict, staleness, and deprecation | Large | Local source complete | Drift/conflict signals -> review queue -> validation/deprecation -> affected answer propagation |
| 11 | Releases, changelog, and dependency propagation | Medium | Local source complete | Release creation/activation -> entity changes -> drift evaluation -> changelog/public propagation |
| 12 | Signals, mutation proposals, automatic drafts, and ticket knowledge loop | Large | Local source complete | Signal admission -> clustering/draft -> review queue -> governed mutation -> impact follow-up |
| 13 | Coverage, trust, readiness, and friction analytics | Large | Local source complete | Compact read models -> metric definitions -> owner surfaces -> actionability and cost |
| 14 | Compiled context bundles, instant cache, and freshness | Large | Local source complete | Source versions -> bundle build/lock -> cache keys -> stale behavior -> runtime distribution |
| 15 | Widget configuration, keys, origins, access, and branding | Large | Local source complete | Owner config/key lifecycle -> origin/route policy -> install config -> runtime security |
| 16 | Embedded widget answering, fallback, feedback, and escalation capture | Large | Local source complete | Script mount -> public admission -> answer -> feedback -> fallback/ticket/escalation evidence |
| 17 | Guided workflows and interactive resolution | Large | Local source complete | Approved procedure -> semantic targets/events -> stateful guide -> outcome/escalation -> audit |
| 18 | Predictive support and known issues | Medium | Local source complete | Trigger definition -> eligibility -> suggestion delivery -> dismissal/outcome -> governance signals |
| 19 | Customer Help Center | Medium | Local source complete | Customer navigation/search -> KB/FAQ/changelog/tickets -> permissions and mobile shell behavior |
| 20 | Hosted Help Center, custom domain, and SEO | Large | Local source complete | Host resolution/config -> public content -> caching -> sitemap/robots -> tenant isolation |
| 21 | Tickets, conversations, attachments, handoff, and email | Large | Local source complete | Intake -> thread/status/SLA -> attachments -> notifications -> escalation and retention |
| 22 | Support Board, internal notes, and Needs Answer | Medium | Local source complete | Source synchronization/manual cards -> internal review -> governed answer handoff -> bounded history and exact summary |
| 23 | Feedback, ratings, feature requests, and reactions | Medium | Local source complete | Public/customer submission -> owner review -> support/signal handoff -> counters and audit |
| 24 | Install Center, developer pack, web SDK, and agent packet | Medium | Local source complete | Install contract -> generated packet/snippets -> context rules -> verification and recovery |
| 25 | Activation, readiness, and Test-as-Customer | Large | Local source complete | Summary inputs -> launch journey -> proof checklist -> next action -> activation evidence |
| 26 | First Trusted Answers, starter questions, and Launch Answers | Medium | Local source complete | Starter source/questions -> draft generation -> review -> retained proof -> launch decision |
| 27 | Pre-Onboarding Input Kit and AI IDE guides | Medium | Local source complete | Public intake guidance -> product-shape handling -> owner/agent output -> safe handoff |
| 28 | Self-service onboarding, account, and workspace provisioning | Large | Local source complete | Signup/payment -> provisional scope -> workspace/subscription/widget creation -> recovery/compensation |
| 29 | Workspace profile and settings | Small | Local source complete | Product profile fields -> validation/permissions -> stored config -> downstream use |
| 30 | Subscription, billing, payment recovery, and transactions | Large | Local source complete | Plan selection -> provider/local state -> entitlement -> recovery -> ledger/history |
| 31 | Team, custom roles, permissions, and session controls | Large | Local source complete | Member lifecycle -> roles -> claims/access revisions -> route/API/rule enforcement |
| 32 | Weekly Digest, Founder Daily Brief, and Owner Support Assistant | Medium | Local source complete | Summary generation -> read-only guidance -> action handoff -> feedback and operational evidence |
| 33 | Public website, deterministic demo, pricing, trust, and legal | Large | Local source complete | Public claims -> demo truth -> conversion/onboarding -> security/legal accuracy |
| 34 | Slack, email, GitHub, and Linear integrations | Large | Local source complete | Configuration/ownership -> delivery/circuit breaker -> secrets -> audit and recovery |
| 35 | Public API v1 | Medium | Local source complete | API key/auth -> answer/signal contract -> rate limit -> tenant isolation -> rollout gate |
| 36 | MCP | Medium | Local source complete | Tool contracts -> evidence retrieval -> auth/scope -> stable structured outputs -> rollout gate |
| 37 | Support Truth Export | Small | Local source complete | Permission -> scoped export -> sensitive-field exclusion -> delivery and audit |
| 38 | Multi-language articles | Medium | Local source complete | Locale configuration -> translation -> review/publish -> fallback and rollout gate |
| 39 | Advanced white label | Medium | Local source complete | Private branding inputs -> validated storage -> explicit non-delivery -> safe defaults and rollout gate |
| 40 | AI failure escalation | Small | Local source complete | Failure classification -> safe fallback -> handoff context -> audit and rollout gate |
| 41 | Native Knowledge Intake Connectors | Medium | Local source complete | GitHub verified install -> owner repository policy -> signed event -> private intake evidence -> existing governed review; rollout remains gated |
| 42 | Signal-quality scoring | Small | Local source complete | Reserved flag/contract -> evidence/metric definition -> implement only if justified |
| 43 | Native Zendesk, Intercom, Freshdesk, Help Scout, and Jira connectors | Large | Local source complete | Market/customer validation -> connector boundary -> source permissions -> avoid connector-count scope |
| 44 | Autonomous browser and account-changing actions | Large | Local source complete | Deliberate non-goal audit -> authorization/action policy -> reconsider only after trustworthy answering proof |

## Cross-cutting audits

These contracts are audited across every relevant feature and receive a final system-wide pass after item 44. They do not change the frozen feature numbering.

| ID | Cross-cutting contract |
| --- | --- |
| C1 | Product doctrine, product separation, environment naming, and Firebase target identity |
| C2 | Authentication, tenant/source permissions, privacy, ticket PII, and cross-tenant isolation |
| C3 | Firestore/Storage schema, rules, indexes, TTL, retention, deletion, and restore behavior |
| C4 | Schedulers, operations, observability, summary documents, Firebase cost, and scale |
| C5 | AI safety, provider accounting, rate limits, prompt injection, and evidence boundaries |
| C6 | Responsive/mobile behavior, accessibility, localization, and timezone handling |
| C7 | CI, dependency freeze, Firebase deployment, backup, and recovery evidence |
| C8 | Feature flags, docs, public website claims, packaging, and rollout truth |

## Completed items

### Feature 1 — Canonical answer creation, scope, approval, versioning, and audit

**Status:** Local source complete on July 18, 2026  
**Dossier:** `__docs__/answerlattice/canonical-answer-governance/README.md`

**Verified flow:** `CanonicalAnswerEditor` and hooks -> canonical/mutation DAL -> governed action API -> server transaction -> canonical/proposal/audit/cache/source/bundle documents -> Firestore rules/indexes -> version-history UI and focused verifiers.

**Hardening completed:**

- added manual-update base fingerprints and stale-revision rejection during impact review and approval;
- fail-closed handling for legacy manual updates, plus timestamp-based revision protection for legacy signal, ticket, Support Board, and rollback updates;
- fixed reviewer-edit precedence over generated `proposedContent` and supported explicit optional-field clearing;
- preserved bounded server guidance through the governance client and owner hooks without rethrowing raw exceptions;
- restored custom Error prototype behavior required by the API boundary;
- exposed plan, role, state, and bounded version applicability in create/edit flows;
- aligned version-history action labels with server-emitted audit actions;
- added the maintained feature doc set, current system inventory entries, client contract test, and Firestore emulator behavior test.

**Verification passed:**

- `npm run test:answerlattice-governance-contracts`
- `npm run test:answerlattice-governance-client`
- `npm run test:answerlattice-canonical-scope`
- `npm run test:answerlattice-governance:emulator`
- `npm run test:answerlattice-governance:rules`
- `npm run test:answerlattice-governance:shared-rules`
- `npm run typecheck:answerlattice`
- focused ESLint on every changed TypeScript/TSX verifier and runtime file
- `npm run verify:answerlattice-runtime-truth`
- `npm run verify:dependency-freeze`
- `git diff --check`

**Deployment:** Not required. No Firestore rules, indexes, Storage rules, or Answerlattice Cloud Functions changed.  
**External evidence:** Authenticated hosted desktop and narrow-width create/update/review smoke remains pending and is not included in local source completion.

### Feature 2 — Answer retrieval, citations, confidence, clarification, and abstention

**Status:** Local source complete on July 18, 2026  
**Dossier:** `__docs__/answerlattice/answer-retrieval-quality/README.md`

**Verified flow:** public/widget/Help Center question admission -> canonical entity/scope/version resolution -> governed answer or clarification/abstention -> public citation projection -> search/chat/cache persistence -> Help Chat/widget/AI Search delivery -> Answer Tests and Knowledge Intake evidence handoff.

**Hardening completed:**

- separated private source IDs from reviewer-approved public citations and preserved that boundary across governance, Knowledge Intake, context bundles, Support Truth Export, caches, and public/customer surfaces;
- added bounded public citation URL admission for credentials, sensitive query keys, local/private/link-local/multicast/reserved networks, and IPv4-mapped private IPv6 addresses;
- added structured plan/role/state clarification and allowlisted public fallback reasons;
- made canonical confidence depend on validation score plus entity-match evidence;
- moved Redis canonical entries to `canon:v5` (superseding `canon:v4`) so normalized query, complete context and raw entity/applicability segments are hashed, distinct request identities cannot collide, graph-aware selection stays live until independently versioned, and cached payloads are runtime-validated while retaining evaluated confidence and approved citations;
- kept canonical citations separate from KB references in widget, Help Center, Help Chat, and AI Search;
- enabled Answer Tests to evaluate canonical evidence and approved runtime citations;
- made search emulator commands clear inherited ADC so their separate Firebase proof is reproducible;
- added the maintained feature doc set, inventory entry, changelog, and runtime source-gate assertions.

**Verification passed:**

- `npm run verify:answerlattice-runtime-truth`
- `npm run test:answerlattice-retrieval-contracts`
- `npm run test:answerlattice-chat-session-contracts`
- `npm run test:answerlattice-canonical-scope`
- `npm run test:answerlattice-knowledge-intake:emulator`
- `npm run test:answerlattice-search-cache:emulator`
- `npm run test:answerlattice-support-search-accounting:emulator`
- `npm run typecheck:answerlattice`
- focused ESLint on every changed Feature 2 TypeScript/TSX/verifier file
- `npm run verify:dependency-freeze`
- `git diff --check`

**Deployment:** Not required. No Firestore rules, indexes, Storage rules, or Answerlattice Cloud Functions changed.  
**External evidence:** Configured Upstash `canon:v5` read/write with distinct query/context identities, authenticated hosted desktop and narrow-width governance review, deployed widget/Help Center/Help Chat/public API citation and clarification smoke, and a representative first-client Answer Test set remain pending and are not included in local source completion.

### Feature 3 — Knowledge Intake, source discovery, media, and repeated replies

**Status:** Local source complete on July 18, 2026; Source Governance hardening overlay locally verified on July 26, 2026
**Dossiers:** `__docs__/answerlattice/knowledge-intake-command-center/README.md`, `__docs__/answerlattice/source-governance/README.md`

**Verified flow:** owner route and API admission -> job/source creation -> bounded URL discovery/fetch, browser file extraction, protected media extraction, and repeated-reply intake -> deterministic/launch-pack review generation -> evidence-preserving owner edit/accept/reject -> KB/FAQ/product-surface/canonical-proposal publish -> embedding/cache/source-summary updates -> usage ledger, scheduler summary, platform monitor, rules, docs, and focused verifiers.

**Hardening completed:**

- preserved a bounded multi-source evidence union across deterministic dedupe and re-analysis without overwriting owner-edited content or review status;
- added destination-native intake job/review/source lineage to KB articles, FAQs, and product surfaces, and bounded proposal evidence to canonical mutation proposals;
- prevented private intake source IDs from being stored as public citation URLs;
- declared `knowledge_intake` as an FAQ source and kept intake-published FAQs eligible for normal FAQ retrieval;
- recursively bounded and redacted source/usage metadata before persistence;
- rejected credentialed, sensitive-query, local/private/link-local/multicast/reserved URL sources even when source text is supplied directly;
- aligned the maintained docs with the current no-manifest, no-raw-retention, deterministic-dedupe runtime and explicitly marked source deletion, cancellation, automatic authority/conflict resolution, product maps, topic readiness, and freshness polling as separate or reserved work;
- expanded contract, emulator, and source-gate coverage for evidence backfill, owner-edit preservation, FAQ provenance/retrieval, privacy bounds, and URL admission.

**Source Governance hardening overlay:**

- added an optional governed-evidence map to existing source records for authority, ownership, approval, access, citation eligibility, effective/review dates, bounded applicability, same-job conflicts, reviewer, and review time;
- kept authority human-declared and feature-gated off by default; support tickets, feedback, imported content, and repeated replies remain signals rather than automatic product truth;
- made each save a server-owned, exact-workspace transaction with `MANAGE_KNOWLEDGE`, active-license, strict-body, exact job/source/conflict, idempotency-fingerprint, reciprocal conflict, and compact audit checks;
- blocked canonical proposal acceptance and publication unless every linked source is approved and conflict-free, while leaving KB, FAQ, and product-surface review behavior unchanged;
- preserved current rules and storage shape: browser source writes remain denied, no collection/index/listener/scheduler/provider call was added, and compact target/peer governance patches reconcile the loaded bundle without a reread;
- prevented one-sided conflict truth by requiring reviewed peers and transactionally adding or removing reciprocal links, so either source remains ineligible evidence until resolution;
- made committed reciprocal updates recoverable after a lost response: unchanged browser retries retain one bounded request identity, server replay rereads only audit-recorded peers without writing, stale responses cannot settle, and malformed or divergent patch bundles fail closed;
- bounded common saves to 2-7 transaction reads/writes and worst-case five-to-five conflict replacement to 12 reads/writes, plus up to five direct evidence reads when accepting or publishing a canonical proposal;
- added focused contract, emulator, dedicated/shared rule, runtime-source, strict TypeScript, lint, dependency-freeze, and documentation evidence without claiming hosted-browser or real-client rollout proof.

**Verification passed:**

- `npm run test:answerlattice-knowledge-intake-contracts`
- `npm run test:answerlattice-knowledge-intake:emulator`
- `npm run test:answerlattice-source-governance`
- `npm run test:answerlattice-knowledge-intake:rules`
- `npm run test:answerlattice-knowledge-intake:shared-rules`
- `npm run typecheck:answerlattice`
- focused ESLint on every changed Feature 3 TypeScript/TSX/verifier file
- `npm run verify:answerlattice-runtime-truth`
- `node scripts/verification/verify-answerlattice-runtime-truth.js` after final docs parity
- `npm run verify:dependency-freeze`
- `git diff --check`

**Current-worktree verification note:** The concurrent Gemini/package migration is now reconciled. Root/Answerlattice TypeScript, focused and full lint, the updated dependency-freeze contract, source-governance emulator, runtime-truth verifier, documentation links, and diff integrity pass on the final worktree.

**Deployment:** Not required. No Firestore rules, indexes, Storage rules, or Answerlattice Cloud Functions changed.  
**External evidence:** Authenticated hosted desktop and narrow-width intake/review/media/publish/source-governance smoke, one real SaaS workspace reviewing bounded evidence, measured review burden and blocked-proposal behavior, configured provider OCR/transcription/launch-pack accounting and refund evidence, deployed embedding/cache invalidation evidence, and representative founder sources/questions remain pending and are not included in local source completion.

### Feature 4 — KB generation, embedding jobs, review, and publishing

**Status:** Local source complete on July 18, 2026  
**Dossier:** `__docs__/answerlattice/kb-generation-pipeline/README.md`

**Verified flow:** internal platform upload and job creation -> generation/review reconciliation -> inactive article/FAQ staging -> deterministic embedding tasks -> completion/failure settlement -> atomic article/FAQ/navigation/replacement publication -> cache/source/bundle invalidation -> retry, watchdog, deletion, Storage cleanup, rules, and shared-runtime compatibility.

**Hardening completed:**

- changed publishing from incremental visibility to one fail-closed final transaction after every staged article has a valid embedding;
- kept approved replacement articles and existing navigation live until the new publication set is complete;
- staged generated articles and FAQs as inactive `needs_review` records and prevented embedding workers from publishing customer-visible content;
- persisted bounded replacement IDs and revalidated product, tenant, store, job, article, FAQ, category-placement, and embedding ownership before final publication;
- made explicit job deletion inventory at most 100 exact-workspace jobs, delete only unreferenced source objects, preserve shared references, and retain a retryable failed deletion state when cleanup cannot be confirmed;
- synchronized the dedicated Answerlattice Functions and MenuList compatibility Functions byte-for-byte for the shared lifecycle files;
- corrected the maintained dossier, system inventory, commercial/public boundary, Firebase cost model, source retention behavior, and internal-platform route ownership.

**Verification passed:**

- `npm run typecheck:answerlattice`
- focused ESLint on every changed Feature 4 runtime, Function, type, and verifier file
- `npm run test:answerlattice-ingestion-job-deletion-boundary`
- `npm run test:answerlattice-kb-article-id-boundary`
- `npm run test:answerlattice-article-mutation-boundary`
- `npm run test:answerlattice-kb-category-mutations`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-kb-generation-watchdog`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-kb-publishing:emulator`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:shared-kb-publishing:emulator`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-storage:rules`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-storage:shared-rules`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- both dedicated and shared Functions TypeScript builds
- `npm run verify:dependency-freeze`
- mirrored lifecycle source comparison and `git diff --check`

**Deployment:** Required and attempted for `finalizePublish`, `embedArticleWorker`, and `publishApprovedJobFn` in both `answerlattice-qa` and `menulist-qa`. Both narrow Firebase deploys are blocked before upload by `Error: Failed to authenticate, have you run firebase login?`.  
**External evidence:** Authenticated QA Functions deployment and hosted internal-platform upload/review/publish/delete smoke remain pending and are not included in local source completion.

### Feature 5 — KB articles, categories, and content feedback

**Status:** Local source complete on July 18, 2026  
**Dossier:** `__docs__/answerlattice/knowledge-base/README.md`

**Verified flow:** scoped category/article load -> article create/edit -> atomic navigation and freshness update -> embedding regeneration -> publish/archive eligibility -> customer retrieval visibility -> article feedback admission -> nightly feedback retention -> safe archive/delete and linked FAQ review.

**Hardening completed:**

- made live article and category-navigation writes transactional and returned the authoritative navigation map to the UI;
- isolated KB Generation review edits from live navigation through an explicit `generation_review` mode;
- cleared the active vector and embedding metadata whenever live article truth or placement changes, and required both embedded status and vector presence for search-ready UI;
- moved linked published FAQs back to review when an article changes and archived their linkage when an article is deleted;
- rejected non-empty category/section deletion instead of cascading article loss, bounded category maps, and propagated label renames to affected article display metadata;
- admitted content feedback only for exact-workspace active published articles, added server-owned 365-day expiry fields, and extended the existing nightly retention path without a new scheduler;
- tightened dedicated feedback reads and shared category mutations to knowledge/support-control permissions;
- aligned the maintained dossier, Firebase cost model, responsive behavior, public claim boundary, system inventory, changelog, and focused source gates.

**Verification passed:**

- `npm run test:answerlattice-kb-category-mutations`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-content-feedback:emulator`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-feedback:rules`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-feedback:shared-rules`
- `npm run test:answerlattice-article-mutation-boundary`
- `npm run test:answerlattice-kb-article-id-boundary`
- `npm run verify:answerlattice-feedback-boundary`
- `npm run typecheck:answerlattice`
- focused ESLint on every changed Feature 5 runtime and verifier file
- both dedicated and shared Functions TypeScript builds
- `npm run verify:answerlattice-runtime-truth`
- `npm run verify:dependency-freeze`
- `git diff --check`

**Deployment:** Required and attempted for dedicated `firestore:rules` plus `answerlatticeNightly` in `answerlattice-qa`, and shared `firestore:rules` in `menulist-qa`. Both narrow deploys are blocked before upload by `Error: Failed to authenticate, have you run firebase login?`.  
**External evidence:** Authenticated QA deployment, hosted article/category edit and delete smoke, public retrieval visibility smoke, and nightly expired-feedback cleanup readback remain pending and are not included in local source completion.

### Feature 6 — FAQ creation, linkage, review, and retrieval

**Status:** Local source complete on July 18, 2026  
**Dossier:** `__docs__/answerlattice/faq-management/README.md`

**Verified flow:** owner FAQ create/edit and article generation -> exact-scope article/entity/tag/product-surface linkage -> review/publish/archive/delete -> canonical-miss FAQ retrieval -> live freshness and article-citation validation -> authenticated reaction admission -> bounded owner review evidence -> nightly retention.

**Hardening completed:**

- made FAQ provenance, generation lineage, counters, article title, and active state server- or system-owned instead of browser-authorable;
- required every linked FAQ publication to reference an exact-workspace active published article, with the article title derived from live article truth;
- re-read compact product-surface FAQ candidates and linked articles before answering so stale summaries, archived FAQs, draft articles, moved scope, and phantom citations fail closed;
- moved FAQ reactions through the authenticated idempotent content-feedback transaction, retained bounded audit evidence for 365 days, and exposed recent reactions in the owner review tab;
- changed article-to-FAQ generation to revalidate the source fingerprint, scope, capacity, and duplicates transactionally after provider output, preventing source-change, deletion, and over-capacity races;
- tightened dedicated and shared Firestore rules so browser FAQ writes cannot forge source, lineage, counters, article metadata, or publication eligibility while generated/imported provenance remains preserved;
- aligned the maintained FAQ dossier, system inventory, Firebase cost model, mobile behavior, public boundary, retention behavior, changelog, and focused source gates.

**Verification passed:**

- `npm run verify:answerlattice-faq-boundary`
- `npm run verify:answerlattice-feedback-boundary`
- `npm run test:answerlattice-content-feedback-contracts`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-content-feedback:emulator`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-feedback:rules`
- shared-rules FAQ emulator against `firestore.rules`
- focused ESLint on every changed Feature 6 runtime and verifier file
- both dedicated and shared Functions TypeScript builds
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `npm run verify:dependency-freeze`
- `git diff --check`

**Deployment:** Required and attempted for dedicated `firestore:rules` plus `answerlatticeNightly` in `answerlattice-qa`, and shared `firestore:rules` in `menulist-qa`. Both narrow deploys are blocked before upload by `Error: Failed to authenticate, have you run firebase login?`.  
**External evidence:** Authenticated QA deployment, hosted FAQ authoring/generation/review smoke, public related-FAQ freshness smoke, and nightly expired-reaction cleanup readback remain outside local source completion.

### Feature 7 — Product ontology, entities, relations, and graph operations

**Status:** Local source complete on July 18, 2026  
**Dossier:** `__docs__/answerlattice/entity-system/README.md`

**Verified flow:** entity/candidate creation and review -> persisted-article extraction -> exact active-entity matching -> article link and freshness transaction -> alias/search-index governance -> relation creation/removal -> bounded same-type merge -> dependency-safe deprecation -> compact nightly graph rebuild -> retrieval consumers, rules, docs, and focused verifiers.

**Hardening completed:**

- made extraction use persisted article truth only, fingerprint it across provider latency, revalidate matched active entities, and reject stale/deleted/cross-scope state before changing article links;
- routed rich-text extraction through the shared bounded TipTap projector, capped provider-bound article text, and contained cyclic, accessor-backed, proxy-backed, malformed, and oversized content;
- made candidate-name deduplication Unicode-aware so distinct non-Latin product concepts remain separate review candidates instead of collapsing to an empty ASCII key;
- committed changed article `entityIds`, KB cache version, compiled source version, and bundle-stale state in one Firestore transaction, while candidate writes remain human-reviewed signals after source validation;
- prevented ambiguous name/slug/alias matches from silently linking to whichever entity Firestore returned first;
- made deprecation fail closed while active canonical answers, KB articles, FAQs, product surfaces, incoming relations, or outgoing relations still depend on the entity;
- expanded bounded merge to rewrite FAQ and product-surface links, deduplicate/self-remove relation edges, merge aliases, rebuild a complete survivor search index, remove duplicate/merged indexes, audit transferred counts, and invalidate every affected source family;
- exposed alias editing, relation maintenance, same-type merge, load retry, and accurate mutation completion in the governance dashboard;
- made nightly graph rebuild detect entity/relation/answer overflow with cap-plus-one reads, require exact `AL` scope, and preserve the prior graph on invalid or truncated input;
- added the day-one Knowledge Map: a compact governance view for entity relationships, answer coverage, drift, and review state, plus a public article topic map derived only from sanitized published headings and existing navigation data;
- preserved incoming and outgoing direction for all six governed relation types while keeping the legacy bidirectional compatibility map, so the owner view distinguishes `Requires` from `Required by` without re-reading relation rows;
- compared the graph's entity/relation/canonical source-version snapshot with current existing control-plane counters, exposed current/stale/unverified states, and linked directly to the existing Entity Candidates queue;
- made nightly reconciliation write an empty graph after the final active entity is removed instead of preserving stale nodes indefinitely;
- exposed current product version and textual approved, missing-answer, drift, and review states on every visible owner node, with a 44px accessible relationship disclosure on narrow screens;
- hardened the graph-summary parser to require exact rebuild metadata, declared counts, known entity/relation/interaction types, complete graph references, bounded counters, and explicit field projection;
- added dedicated and shared Firestore-rule evidence that only the exact authorized workspace can read the graph summary and that client mutation remains denied;
- kept map cost bounded to two parallel governance point reads and zero incremental public reads, with one additional nightly source-version point read but no listener, map collection, collection query, mutation-time map write, AI call, embedding, vector query, or per-node fetch;
- aligned the entity dossier, system inventory, public/commercial claim boundary, Firebase cost model, responsive assessment, changelog, and runtime source gate.

**Verification passed:**

- `npm run test:answerlattice-ontology-contracts`
- `npm run test:answerlattice-entity-extraction-contracts`
- `npm run test:answerlattice-governance-contracts`
- `npm run verify:answerlattice-knowledge-map`
- `npm run test:answerlattice-runtime-summary-contracts`
- dedicated and shared platform-summary Firestore-rule emulators
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-ontology:emulator`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-governance:emulator`
- dedicated and shared ontology Firestore-rule emulators
- dedicated and shared governance Firestore-rule emulators
- `npm run typecheck:answerlattice`
- focused ESLint on every changed Feature 7 runtime and verifier file
- `npm --prefix functions-answerlattice run build`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npm run verify:dependency-freeze`
- `git diff --check`

**Deployment:** Required and re-attempted on July 28 for `answerlatticeNightly` and `triggerAnswerlatticeNightly` in `answerlattice-qa` because the Knowledge Map adds fields to their shared graph-summary builder. The narrow deploy stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; authenticated deployment evidence remains separate from local source completion.
**Monitored limit:** The governance dashboard reads at most 500 workspace relation rows and does not paginate. Add pagination or selected-entity loading before a workspace needs broader graph administration.  
**External evidence:** Authenticated QA deployment, hosted entity create/edit/alias/relation/merge/deprecation smoke, post-nightly graph-summary readback, and the maintained five-founder 90-second map-comprehension test remain outside local source completion.

### Feature 8 — Product surfaces, safe context, and applicability

**Status:** Local source complete on July 18, 2026  
**Dossier:** `__docs__/answerlattice/product-surface-contexts/README.md`

**Verified flow:** Product Surface management UI -> exact workspace DAL -> transaction-backed create/update/archive -> dedicated/shared Firestore rules -> active-surface summary rebuild -> exact/wildcard route matching -> server context validation -> web SDK/public loader/iframe parity -> canonical applicability and compact search-history projection.

**Hardening completed:**

- made deterministic context keys duplicate-safe and immutable after creation, removed document IDs from mutable payloads, and rechecked exact stored ownership inside create/update/archive transactions;
- specialized dedicated/shared Firestore rules to allow only bounded surface fields, exact deterministic IDs, owner-editable updates, and no client-forged Knowledge Intake lineage;
- implemented exact route, longest wildcard route, and global route matching while preserving target visibility and semantic feature/page/workflow/entity scoring;
- added `state` and numeric `version` parity across server validation, source and built web SDKs, public loader attributes, iframe sanitization, cache identity, and canonical current-version applicability;
- kept raw `path` transient: wildcard request paths fail, route paths are not copied into compact `page`, widget config no longer receives unused raw route parameters, and widget search no longer persists raw request paths;
- moved active filtering before the summary cap, added overflow detection for surfaces/articles/FAQs and the management list, rejected duplicate active keys, omitted undefined nested fields, and replaced the complete summary document so archived or renamed surfaces cannot survive a rebuild;
- added contract, SDK distribution, dedicated/shared rules, and Firestore emulator coverage for route precedence, hidden targets, context parity, ownership, complete replacement, duplicate rejection, and unchanged-summary behavior after a rejected rebuild.

**Verification:**

- `npm --prefix packages/answerlattice-web run build`
- `npm run test:answerlattice-runtime-summary-contracts`
- `npm run test:answerlattice-product-surface-summary:emulator`
- dedicated and shared platform-summary Firestore-rule emulators with Product Surface ownership cases
- `npm run test:answerlattice-menulist-reference-client`
- `npx tsc --noEmit`
- `npm run typecheck:answerlattice`
- focused ESLint on every changed Feature 8 runtime and verifier file
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npm run verify:dependency-freeze`
- `git diff --check`

**Deployment:** Required and attempted for `firestore:rules` in both `answerlattice-qa` with `firebase-answerlattice.json` and `menulist-qa` with `firebase.json`. Both scoped deploys stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; authenticated remote deployment remains separate from local source completion.  
**Monitored limits:** A workspace is maintained at 300 Product Surfaces; the owner list and summary rebuild now fail visibly above that boundary. Published article/FAQ summary inputs fail above 500 instead of truncating. Add pagination/partitioning before a customer needs larger maintained sets.  
**External evidence:** Authenticated QA rules deployment/readback and hosted Product Surface create/edit/archive plus page-context widget smoke remain outside local source completion.

### Feature 9 — Answer Tests, proposal impact, release regression, and rollback

**Status:** Local source complete on July 18, 2026  
**Dossier:** `__docs__/answerlattice/founder-support-controls/README.md`

**Verified flow:** Answer Tests management UI -> strict suite save/revision transaction -> input-bound run/release request fingerprint -> reservation -> canonical-only or capped full-runtime execution -> deterministic claim/evidence/proof evaluation -> retained historical/current proof -> proposal impact preview -> strict release selection -> rollback proposal/audit pair -> Activation/public wording, rules, docs, and focused verifiers.

**Hardening completed:**

- upgraded the persisted summary contract to schema version 4 with exact deterministic ID, `AL` product identity, numeric tenant/store scope, supported schema, strict revision, valid cases, and unique case IDs; malformed stored truth now fails closed instead of partially normalizing;
- rejected duplicate reference IDs, duplicate required/blocked phrases, impossible required/blocked phrase overlap, duplicate selected case IDs, and malformed run identity;
- bound request idempotency to SHA-256 fingerprints over run kind, mode, suite revision, ordered selected cases, and optional release ID, preventing one request ID from returning an unrelated prior run;
- made test-suite revision ownership explicit: case saves increment revision, retained-run saves do not, and runs record the suite revision they executed;
- invalidated Activation and owner proof when the suite revision differs, retained legacy runs only as historical evidence, and made the UI label stale results visibly;
- parsed stored releases through the strict release schema instead of casting raw Firestore data;
- validated deterministic rollback proposal and audit identities together, repaired a valid missing half transactionally, and rejected conflicting product, scope, target answer, mutation type, source audit, action, or entity identity without changing the live answer;
- renamed the result adoption action to **Adopt current route and evidence**, preserved required/blocked phrase checks, and aligned owner/public copy so deterministic tests are regression evidence rather than an independent factual-correctness, completeness, or verified-resolution guarantee;
- added focused runtime integrity tests, expanded contract tests, added dedicated/shared platform-summary rule proof that Answer Tests remain server-owned, and extended the canonical runtime source gate.

**Verification passed:**

- `npm run test:answerlattice-answer-test-runtime`
- `npm run verify:answerlattice-founder-support-controls`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-platform-summary:rules`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-platform-summary:shared-rules`
- `npx tsc --noEmit --pretty false`
- `npm run typecheck:answerlattice`
- focused ESLint on every changed Feature 9 runtime, public, and verifier file
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npm run verify:dependency-freeze`
- `git diff --check`

**Deployment:** Not required for Feature 9. No Firestore rules, indexes, Storage rules, or Answerlattice Cloud Functions changed; only emulator coverage was expanded for the existing server-owned summary rule.  
**Monitored limits:** One summary document retains at most 100 cases, 10 runs, five reservations, 25 selected cases, and 10 full-runtime cases. Partition the suite before a customer needs broader retained coverage. Deterministic proof does not replace representative human factual, completeness, and usefulness review.  
**External evidence:** Authenticated hosted desktop/narrow-width suite create/edit/run/release/rollback smoke, configured provider-backed accounting/readback, real customer question-set reviewer judgments, and QA rollback proposal/audit readback remain outside local source completion.

### Feature 10 — Drift, conflict, staleness, and deprecation

**Status:** Local source complete on July 18, 2026  
**Dossier:** `__docs__/answerlattice/drift-governance/README.md`

**Verified flow:** release activation, manual owner evaluation, and nightly tenant evaluation -> exact-scope active answers/entities/recent signals -> shared four-class policy -> monotonic drift and review-required state -> deterministic audit plus canonical cache/source/bundle invalidation -> single-query owner review queue -> explicit human attestation and governed revalidation.

**Hardening completed:**

- removed client-authored automated drift reasons and replaced them with an authenticated `evaluate_drift` action that derives current reasons from server-owned primitives;
- made the application and dedicated Functions use one byte-identical four-class policy with fixed five-negative and eleven-ticket thresholds, deterministic scope conflicts, deprecation checks, and all-bound-entity evaluation;
- made manual and nightly evaluation fail closed on cap-plus-one overflow, malformed stored scope, invalid timestamps/versions, missing entity bindings, and cross-workspace evidence;
- kept automated state monotonic and idempotent so evaluation adds deduplicated reasons but never silently clears review work;
- made release-version drift set `reviewRequired` and invalidate canonical cache/source state in the same governed activation transaction;
- changed the dashboard to one canonical query, explicit evaluated/updated counts, honest failure state, bounded errors, responsive actions, and required reviewer attestation before revalidation;
- made nightly changed-answer writes include deterministic audit evidence and compact invalidation in capped 200-answer batches, with manual server transactions capped at 150 changed answers;
- added the maintained drift dossier, corrected stale activation/certification/strategy documents, updated the inventory and changelog, and extended policy, contract, emulator, and source-gate coverage.

**Verification passed:**

- `npm run test:answerlattice-drift-state`
- `npm run test:answerlattice-governance-contracts`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-governance:emulator`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-release:emulator`
- `npx tsc --noEmit --pretty false`
- `npm run typecheck:answerlattice`
- focused ESLint on every changed Feature 10 runtime and verifier file
- `npm --prefix functions-answerlattice run build`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `npm run verify:dependency-freeze`
- `git diff --check`

**Deployment:** Required and attempted for the changed dedicated `answerlatticeNightly` Function in `answerlattice-qa`. The narrow deploy stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote revision changed.  
**Monitored limits:** One workspace evaluation stops above 500 active answers, 1,000 entities, or 1,000 recent signal rows; partition the evaluation before a customer needs larger maintained sets.  
**External evidence:** Authenticated QA Function deployment and scheduled-run readback, plus hosted desktop/narrow-width evaluate/review/revalidate smoke and real reviewer false-positive evidence, remain outside local source completion.

### Feature 11 — Releases, changelog, and dependency propagation

**Status:** Local source complete on July 18, 2026  
**Dossier:** `__docs__/answerlattice/changelog-system/README.md`

**Verified flow:** owner draft/create/update -> canonical version normalization -> deterministic pending release registration -> server-owned activation and dependency drift propagation -> release-linked publication -> explicit public/context visibility -> failure-safe draft recovery -> cache/source/bundle invalidation and retained audit evidence.

**Hardening completed:**

- made release labels and normalized integer versions one strict contract for action input and stored releases;
- changed versioned publication to a draft-first lifecycle so a failed release registration or activation cannot leave a public changelog note without dependency propagation;
- added deterministic activation request identity so retrying a stranded draft reuses the same release and safely finishes publication;
- required every published versioned entry to reference an exact-scope active release whose version, release time, and changed-entity set match the changelog payload;
- made draft visibility explicit across public pages, Product Surface summaries, application context bundles, and the dedicated Functions bundle builder; legacy unlinked versioned entries normalize as drafts;
- made public page projection require exact `AL` product and tenant/store scope, and scan a bounded 25 physical pages so draft-only latest pages do not hide older public updates;
- added release/changelog contract, emulator, rules, public-boundary, Product Surface summary, context-bundle, and canonical source-gate evidence;
- rebuilt the maintained changelog dossier and synchronized the Answerlattice inventory and project changelog.

**Verification passed:**

- `npm run test:answerlattice-release-contracts`
- `npm run test:answerlattice-changelog-contracts`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-release:emulator`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-changelog:emulator`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-release:rules`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-release:shared-rules`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-product-surface-summary:emulator`
- `npm run test:answerlattice-context-bundle-version-boundary`
- `npm run verify:answerlattice-public-content-boundary`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npx tsc --noEmit --pretty false`
- `npm run typecheck:answerlattice`
- focused ESLint on every changed Feature 11 runtime and verifier file
- `npm --prefix functions-answerlattice run build`
- `npm run verify:dependency-freeze`
- `git diff --check`

**Deployment:** Required and attempted for the changed dedicated `answerlatticeNightly` Function in `answerlattice-qa`. The narrow deploy stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote revision changed.  
**Monitored limits:** Public changelog retrieval scans at most 25 physical pages per request; Product Surface summaries inspect the newest three changelog pages; compiled bundles inspect the newest five pages and retain at most 100 compact entries. Partition or add a governed public index before a customer needs history beyond those maintained windows.  
**External evidence:** Authenticated QA Function deployment and scheduled bundle readback, hosted desktop/narrow-width draft -> activation failure -> retry -> publish/unpublish smoke, and real workspace dependency-review evidence remain outside local source completion.

### Feature 12 — Signals, mutation proposals, automatic drafts, and ticket knowledge loop

**Status:** Local source complete on July 18, 2026  
**Dossiers:** `__docs__/answerlattice/automatic-knowledge-creation/README.md` and `__docs__/answerlattice/ticket-knowledge-loop/README.md`

**Verified flow:** ticket/chat/feedback/runtime event -> bounded privacy-filtered signal admission -> stable payload and lifecycle identity -> entity-scoped clustering -> exact canonical target selection -> deterministic proposal creation or compatible evidence merge -> validated automatic draft -> human governance -> exact bounded impact follow-up.

**Hardening completed:**

- added stable signal payload fingerprints, same-session fingerprint deduplication, deterministic replay validation, exact numeric scope, and lifecycle-specific ticket resolution identity;
- added a byte-identical app/Functions support-evidence privacy helper and declared ticket conversation content untrusted in the extraction prompt;
- constrained generated procedures to sequential bounded steps and an allowlisted action/target schema, with invalid procedures discarded;
- made ticket signal and pending-proposal reads cap-plus-one and fail closed instead of creating proposals from truncated evidence;
- resolved one exact active canonical target before merge, required exact entity/mutation/target compatibility, and sent ambiguous or unrelated cases to owner triage;
- bounded unique ticket/signal lineage, reset stale generated drafts when evidence changes, and wrote deterministic merge audit in the same transaction;
- made Support Board proposal creation deterministic and proposal-plus-audit atomic, with changed request replays rejected;
- changed impact tracking to like-for-like exact 14-day pre/post windows with saturation failure rather than partial improvement claims;
- aligned dedicated/shared Firestore rules, owner wording, feature flags, data inventory, maintained dossiers, changelog, and runtime source gates with the implemented authority boundary.

**Verification passed:**

- `npm run test:answerlattice-signal-contracts`
- `npm run test:answerlattice-ticket-knowledge-contracts`
- `npm run test:answerlattice-signals:rules`
- `npm run test:answerlattice-signals:shared-rules`
- `npm run test:answerlattice-governance:rules`
- `npm run test:answerlattice-governance:shared-rules`
- `npx tsc --noEmit --pretty false`
- focused ESLint on every changed Feature 12 app, Functions, UI, and verifier file
- `npm --prefix functions-answerlattice run build`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `npm run verify:answerlattice-runtime-truth`
- `npm run verify:dependency-freeze`
- `git diff --check`

**Deployment:** Required and attempted for dedicated `firestore:rules` and `answerlatticeNightly` in `answerlattice-qa`, plus shared `firestore:rules` in `menulist-qa`. All three scoped deploys stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote revision changed.  
**External evidence:** Authenticated QA deployment and scheduled-run readback, hosted proposal review and ticket lifecycle smoke, approved provider-processing evidence, real founder ticket-resolution judgments, and measured post-implementation outcomes remain outside local source completion.

### Feature 13 — Coverage, trust, readiness, and friction analytics

**Status:** Local source complete on July 18, 2026  
**Dossiers:** `__docs__/answerlattice/founder-trust-layer/README.md` and `__docs__/answerlattice/product-friction-intelligence/README.md`

**Verified flow:** bounded search history, active answers, active entities, support signals, canonical misses, and daily friction rows -> exact complete-window aggregation -> schema-v2 compact summaries -> strict client parsing -> dashboard, activation, weekly digest, governance, and founder-assistant evidence views -> advisory-only friction synthesis and human review.

**Hardening completed:**

- introduced a byte-identical app/Functions support-metrics contract for schema version, source caps, completed UTC windows, weighted load, trends, and friction levels;
- made coverage, answer, entity, signal, miss, and friction-history inputs cap-plus-one and exact-scope, with incomplete or saturated tasks preserving the previous valid summary instead of publishing truncated evidence;
- aligned trust inputs to the exact coverage window and replaced owner-facing composite trust, entity-health, and resolution language with explicit canonical coverage, no escalation, confirmed outcomes, drift, and active-entity answer coverage;
- kept zero denominators unavailable instead of presenting no questions, no active answers, no active entities, or no explicit outcomes as a failing zero-percent result;
- changed friction to completed UTC seven-day comparisons, all-entity totals before top-ten display, exact active-entity mapping, unmapped-evidence counts, legacy-row counts, deterministic volume-sensitive labels, and visible stale/failure states;
- constrained weekly friction AI output to bounded advisory text and known entity IDs, prohibited model-defined metrics, treated source material as untrusted, and rechecked the source snapshot before publication;
- added strict coverage, answer-evidence, friction-snapshot, and advisory parsers; optional advisory failure no longer hides a valid deterministic snapshot;
- synchronized dashboard, activation, weekly digest, governance, founder assistant, dossiers, data inventory, source inventory, changelog, feature flags, and focused regression coverage.

**Verification passed:**

- `npm run test:answerlattice-support-metrics-contracts`
- `npm run typecheck:answerlattice`
- focused ESLint on every changed Feature 13 app, Functions, UI, and verifier file
- `npm --prefix functions-answerlattice run build`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-platform-summary:rules`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-platform-summary:shared-rules`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npm run verify:dependency-freeze`
- byte-identical shared-helper comparison
- `git diff --check`

**Deployment:** Required and attempted for the changed dedicated `answerlatticeNightly` Function in `answerlattice-qa`. The narrow deploy stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote revision changed.  
**Monitored limits:** The rolling coverage window stops above 500 search rows; trust stops above 500 active answers, 1,000 active entities, or 1,000 signal rows; daily friction stops above 500 signals or 500 canonical misses; the two seven-day friction windows stop above 500 daily rows. Friction retains ten ranked entities and five emerging topics, and daily rows are cleaned after 90 days. Partition before a customer needs larger maintained evidence windows.  
**External evidence:** Authenticated QA Function deployment and scheduled-run readback, hosted desktop/narrow-width dashboard and governance smoke, real support-event/entity-mapping coverage, explicit customer outcome volume, provider-processing approval, and founder judgments that review ordering reduces support work remain outside local source completion.

### Feature 14 — Compiled context bundles, instant cache, and freshness

**Status:** Local source complete on July 19, 2026; reserved-counter boundary reverified on July 26, 2026

**Dossiers:** `__docs__/answerlattice/compiled-context-distribution/README.md` and `__docs__/answerlattice/instant-response-infrastructure/README.md`

**Verified flow:** governed source/cache-version writes -> exact source/manifest initialization -> transactional build lease and unique version -> cap-plus-one approved-source reads -> public/private projection -> file-specific UTF-8 size checks -> immutable Storage publication -> source recheck and ready/superseded selection -> exact manifest/ref validation -> public API/MCP reads or documented fallback -> `canon:v5` query/context/payload/freshness validation or graph-aware live bypass -> live retrieval fallback.

**Hardening completed:**

- made source-version and manifest initialization transactional and non-destructive so onboarding cannot reset existing counters or active pointers;
- made app and Functions builders fail on source overflow instead of silently publishing truncated entities, relations, answers, surfaces, articles, FAQs, or releases;
- separated public-safe product/surface/citation projections from private server context and prevented tenant/workspace IDs, private paths, source versions, stats, and limits from leaking through public `manifest.json`;
- removed manifest objects from the Firestore bundle ref map, avoiding self-referential/stale hashes, while documenting that manifest-copy bytes are excluded from bundle stats;
- enforced 50 KB public bootstrap/route, 512 KiB other public, and 2 MiB private upload limits before ready publication;
- validated ready manifest product/scope/version/source/ref/hash/byte contracts and derived exact immutable Storage paths instead of trusting arbitrary persisted refs;
- preserved the last-ready version on source changes and failures, marked mid-build source changes superseded, and cleaned only the failed version's unreferenced prefixes best effort;
- aligned Functions citation, store, context-summary, predictive-summary, and source-limit behavior with the app builder;
- moved canonical Redis keys to `canon:v5`, hashing normalized query, complete context and raw entity/plan/role/state segments, bypassing graph-aware selection until independently versioned, and validating untrusted IDs, version, timestamp, confidence, procedure, source versions, citations, and UTF-8 payload bytes before delivery;
- limited Redis writes to active reviewer-cleared canonical truth, made invalid-entry cleanup observable, rejected non-canonical history without references, and enforced persisted search-history expiry;
- disabled widget bundle bootstrap because the widget does not consume those files, while preserving rollout-gated Public API bundle preference and disabled-by-default MCP;
- verified and source-gated `branding` and `mcpPolicy` as reserved invalidation counters only: their numeric values remain in private source-version metadata, but neither builder reads or serializes the rollout-gated advanced-branding profile or an MCP authorization policy, and private branding saves do not trigger bundle work;
- removed unsupported latency, hit-rate, free-tier, cost-savings, zero-configuration, and zero-staleness claims from maintained dossiers and public website copy.

**Verification passed:**

- `npm run test:answerlattice-context-bundle-version-boundary`
- `npm run test:answerlattice-canonical-scope`
- `npm run typecheck:answerlattice`
- focused ESLint on every changed Feature 14 app, public-site, and verifier file
- `npm --prefix functions-answerlattice run build`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npm run verify:dependency-freeze`
- `git diff --check`

**July 26 reserved-counter cross-check:** `npm run test:answerlattice-context-bundle-version-boundary`, `node --check scripts/verification/verify-answerlattice-runtime-truth.js`, `node scripts/verification/verify-answerlattice-runtime-truth.js`, focused verifier ESLint, `npm run typecheck:answerlattice`, full `npm run lint`, `npm run docs:check-links`, `npm run verify:dependency-freeze`, and `git diff --check` passed. The documentation checker found zero broken links and retained 62 unrelated existing video-artifact naming warnings.

**Deployment:** The July 26 reserved-counter cross-check changes tests and documentation only, so it requires no deployment. The historical Feature 14 Functions hardening still requires the dedicated `answerlatticeNightly` QA deployment; its narrow attempt stopped before upload with `Error: Failed to authenticate, have you run firebase login?`, so no remote revision changed.

**Monitored limits:** Public bootstrap/routes stop at 50 KB, other public objects at 512 KiB, private objects at 2 MiB, MCP output at 24 KB, manifest memory cache at 60 seconds, and bundle-object memory cache at 10 minutes. Builder source caps fail closed; partition before a workspace exceeds them. `branding` and `mcpPolicy` remain reserved invalidation counters whose numeric values appear only in private source-version metadata; compiled context does not serialize either feature payload.

**External evidence:** Authenticated QA Function deployment and scheduled repair readback, configured Upstash `canon:v5` read/write plus query/context separation and latency/cost evidence, Storage/CDN/fallback metrics, rollout-gated Public API/MCP smoke, and any future widget bundle-consumption proof remain outside local source completion.

### Feature 15 — Widget configuration, keys, origins, access, and branding

**Status:** Local source complete; concurrency, secret-retention, and shared-rules refresh completed July 26, 2026

**Dossier:** `__docs__/answerlattice/help-widget/README.md`

**Verified flow:** authenticated widget management -> exact Answerlattice workspace/permission admission -> private configuration and activity reads -> strict config/origin/route save -> one-time raw-key generation -> hash-only transactional key storage -> rename/revoke with retained bounded audit -> public config admission by key/product/purpose/scope/origin -> short origin-bound runtime authorization -> fixed key-free iframe bootstrap -> bounded branding/capability projection -> terminal-denial hiding and monitored install state.

**Hardening completed:**

- rejected malformed origins and loose wildcard routes as a whole save instead of silently weakening the submitted policy;
- kept empty origins as an explicit warned open-origin mode rather than silently changing existing customer behavior;
- made config, key, and recent-activity management responses private/no-store, including local permission and rate-limit responses;
- made every public config error response no-store so a corrected key or origin is not held behind heuristic denial caching;
- unified supported revoke and legacy delete on the retained-audit revocation path and removed the hard-delete store helper;
- moved the maintained loader to `/widget/embed`, kept the raw key out of the iframe request URL, added exact-origin bootstrap and no-referrer requests, and preserved the legacy route only for compatibility;
- made terminal `401/403/404` config admission a separate runtime-denied state that closes/hides the widget and cannot be bypassed by public `show()`;
- aligned loader/server blocked-route semantics and removed loose prefix-wildcard matching;
- retained only bounded public branding fields and raised key/origin/route mobile controls to the 44px touch contract;
- corrected public/security language so exact origins are admission controls while blocked routes are presentation controls;
- moved configuration saves into one exact-scope transaction with browser-held `configVersion`, exact retry/no-op acknowledgement, and `409` refusal for stale differing edits;
- ordered the save limiter before permission, Firestore access, and body parsing;
- stopped normalizing historical widget-key ciphertext back into current state, so the next legitimate key mutation removes legacy recoverable fields without a cleanup-only write;
- protected widget config, origins, schema/version/update fields, runtime status, and credentials from direct browser create/update in maintained shared Firestore rules while retaining unrelated store updates;
- rebuilt the complete help-widget dossier, synchronized inventories and changelog, and added focused source assertions.

**Verification passed:**

- `npm run test:answerlattice-widget-config-contracts`
- `npm run test:answerlattice-widget-runtime-token`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-widget-key:emulator`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-public-api:rules`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-public-api:shared-rules`
- `npm run typecheck:answerlattice`
- focused ESLint on every changed Feature 15 app, public-site, runtime, and verifier file
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npm run verify:dependency-freeze`
- `git diff --check`

**Deployment:** The July 26 refresh changes shared `firestore.rules` only. It adds no dedicated Answerlattice rule, index, Storage rule, Cloud Function, collection, or scheduler. The scoped `firebase deploy --only firestore:rules --project menulist-qa` attempt stopped before upload with `Failed to authenticate, have you run firebase login?`; no remote shared-rules revision changed.

**Monitored limits:** At most 10 active widget keys and 30 retained key records; at most 25 exact origins and 50 blocked routes; config save body 32 KiB; key mutation body 4 KiB; runtime config process cache 500 entries and at most 15 seconds; public config/browser TTL 60 seconds; origin-bound runtime token 15 minutes. Partition or revise the contract before customers require materially larger installation policy sets.

**External evidence:** Hosted allowed-origin and denied-origin browser smoke, live production key rotation/revocation propagation, CDN/proxy header readback, mobile-device management smoke, and real client installation recovery evidence remain outside local source completion.

### Feature 16 — Embedded widget answering, fallback, feedback, and escalation capture

**Status:** Local source complete on July 18, 2026

**Dossiers:** `__docs__/answerlattice/help-widget/README.md`, `__docs__/answerlattice/ai-qna-chatbot/README.md`, and `__docs__/answerlattice/ai-failure-escalation/README.md`

**Verified flow:** maintained public loader and key-free iframe bootstrap -> exact widget credential, product, purpose, scope, origin, and runtime-token admission -> canonical-first search with FAQ/RAG fallback -> bounded public answer, citations, confidence, clarification, related follow-up questions, and visible image-processing fallback -> authoritative feedback persistence and replay -> explicit unresolved support form -> one deterministic ticket transaction against the exact stored widget search record -> bounded server-derived support evidence, linked history, review signal, and collision-safe ticket reference.

**Hardening completed:**

- projected only positively validated public citation URLs and omitted unsafe or private RAG links;
- converted related articles, FAQs, and changelog items into bounded follow-up searches instead of exposing internal objects;
- disclosed when a screenshot could not be processed so text-only answers do not imply visual evidence;
- returned persisted feedback truth from the server and rendered that authoritative outcome after replay;
- added an explicit required-email support path that creates one idempotent asynchronous ticket from one exact unresolved widget history record;
- derived ticket scope, lifecycle, answer evidence, context, and signal metadata on the server rather than trusting public debug fields;
- rejected solved, non-widget, missing, expired, malformed, and cross-scope histories before ticket creation;
- retained automatic low-confidence escalation as a separate default-off Feature 40 gate;
- replaced ambiguous deterministic ticket prefixes with a shared `WE-<hash-segment>` display reference across widget, ticket, notification, and product-surface views;
- raised related-content, image, feedback, and support controls to the 44px touch contract and reconciled maintained docs/public claims with the implemented asynchronous fallback.

**Verification passed:**

- `npm run test:answerlattice-widget-answer-contracts`
- `npm run verify:answerlattice-feedback-boundary`
- `npm run test:answerlattice-widget-escalation:emulator`
- `npm run test:answerlattice-widget-config-contracts`
- `npm run test:answerlattice-widget-runtime-token`
- `npm run test:answerlattice-retrieval-contracts`
- `npm run test:answerlattice-ticket-contracts`
- `npm run verify:ticket-notification-boundary`
- `npm run test:ticket-notification-boundary`
- `npm run test:answerlattice-product-surface-summary:emulator`
- `npx tsc --noEmit --pretty false`
- focused ESLint on every changed Feature 16 runtime, shared ticket-reference, and verifier file
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npm run verify:dependency-freeze`
- `git diff --check`

**Deployment:** Not required. Feature 16 changes no Firestore rule, index, Storage rule, or Answerlattice Cloud Function.

**Monitored limits:** Widget answer body and search-history retention remain governed by the existing search contracts; explicit escalation body is 4 KiB; public references and citations are capped at 8; related content is capped server-side and rendered as at most 3 articles, 3 FAQs, and 2 changelog items; reply email is 254 characters, name 160, and optional details 1,000; one deterministic ticket may be linked to one exact search history; widget search history retains the configured 90-day TTL. Revise the contract before customers require materially larger public evidence or support-intake payloads.

**External evidence:** Hosted allowed-origin and denied-origin end-to-end ticket creation, real support-inbox handling, production rate-limit-provider behavior, mobile-browser support-form smoke, real founder judgment of context usefulness, and measured verified-resolution/recontact outcomes remain outside local source completion.

### Feature 17 — Guided workflows and interactive resolution

**Status:** Local source complete on July 18, 2026

**Dossier:** `__docs__/answerlattice/guided-workflows/README.md`

**Verified flow:** reviewed canonical procedure -> strict write-time procedure validation -> canonical-first search and validated search-history procedure snapshot -> workspace and feature gate -> bounded public widget projection -> stateful iframe guide -> semantic host target lookup and non-interactive highlight -> client-emitted expected event or explicit manual completion where allowed -> completed, abandoned, target-missing, or actual support-handoff outcome -> exact retained-history evidence match -> deduplicated governed signal -> SDK/reference-client instrumentation and review evidence.

**Hardening completed:**

- retained the exact validated procedure snapshot on canonical widget search history so terminal analytics cannot be attached to a different answer or later procedure revision;
- bound every recorded outcome to the served procedure slug, total step count, active step, semantic target, expected event, widget session, and normalized context key;
- rejected expired or malformed retained history across feedback, explicit support fallback, and guided outcomes, with a bounded legacy retention fallback;
- made malformed timestamp-like values fail closed instead of surfacing a generic runtime error;
- added one immediate semantic-target lookup plus four bounded retries over 800 milliseconds for normal asynchronous client rendering, with cancellation on step/reset/clear and no DOM observer;
- preserved event-gated advancement: steps with an expected client event cannot be manually completed;
- changed **Still stuck** to open the existing explicit support form and record `escalated` only after deterministic ticket creation succeeds;
- retained the product boundary: the host highlights and observes registered semantic targets/events but never clicks controls, evaluates arbitrary code, reads unrestricted application state, or changes client data;
- synchronized the complete guided-workflow dossier, data/system inventories, changelog, public claim boundaries, mobile behavior, and focused source assertions.

**Verification passed:**

- `npm run test:answerlattice-guided-resolution`
- `npm run test:answerlattice-menulist-reference-client`
- `npm run test:answerlattice-widget-config-contracts`
- `npm run test:answerlattice-widget-runtime-token`
- `npm run test:answerlattice-widget-answer-contracts`
- `npm run test:answerlattice-widget-escalation:emulator`
- `npm run test:answerlattice-retrieval-contracts`
- `npm run test:answerlattice-signal-contracts`
- `npm run test:answerlattice-governance-contracts`
- `npx tsc --noEmit --pretty false`
- focused ESLint on every changed Feature 17 runtime and verifier file
- stale-claim scan across maintained guided-workflow, widget, SDK, and public-site sources
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npm run verify:dependency-freeze`
- `git diff --check`

**Deployment:** Not required. Feature 17 changes no Firestore rule, index, Storage rule, or Answerlattice Cloud Function.

**Monitored limits:** Procedures contain 1–12 contiguous steps; instructions are capped at 80 characters, results at 120, troubleshooting hints at 200, and warning/prerequisite lists at 5 each; semantic target/event IDs are capped at 120 characters; the host scans at most 500 marked targets and makes at most 5 lookup attempts over 800 milliseconds; outcome bodies are capped at 4 KiB; signal-enabled terminal handling uses one exact retained-history read and at most one deduplicated signal; widget history remains subject to the configured 90-day retention boundary; one guide/session is active in memory at a time. Revise the contract before clients require materially larger procedures or dynamic rendering delays beyond the bounded lookup window.

**External evidence:** Hosted allowed-origin browser proof with real asynchronous components and routers, approved customer procedures, desktop/mobile Chrome and Safari target alignment, actual signal/ticket readback, accessibility review, and measured task-completion, target-mismatch, abandonment, escalation, and time-to-completion outcomes remain outside local source completion. MenuList mobile intentionally suppresses its widget and is not evidence for a general mobile host.

### Feature 18 — Predictive support and known issues

**Status:** Local source complete on July 18, 2026

**Dossier:** `__docs__/answerlattice/predictive-support/README.md`

**Verified flow:** owner-created or system-suggested trigger -> strict exact-scope and shape admission -> mandatory owner review and exact page before activation -> cap-plus-one runtime summary rebuild -> widget capability discovery -> safe structured product context -> fail-closed key/rate/origin/runtime-token admission -> deterministic trigger/window/cooldown evaluation -> bounded loader and iframe projection -> stale-context clearing -> shown, opened, or dismissed interaction -> current-trigger revalidation -> optional deduplicated governed signal -> advisory owner evidence and manual edit/disable/archive/delete.

**Hardening completed:**

- introduced one shared strict contract for trigger conditions, action, kind, source, timestamps, known-issue URL/window, runtime projection, suggestion projection, interaction body, matching, and applicability;
- required exact page context for every active trigger and changed generated friction records to review-only suggestions with no page, so they cannot be activated before owner review;
- enforced the 200-trigger workspace cap with cap-plus-one detection in app and Functions summary builders, preserving the prior summary on overflow;
- moved predictive help behind fail-closed pre-auth and key rate limits, exact product/purpose/scope checks, origin/runtime-token authorization, strict 4 KiB body parsing, and a bounded required anonymous session ID;
- added the predictive-interaction route, which repeats admission and proves the trigger is still active, current, and context-matching before optional signal emission;
- made the loader use a non-PII per-tab cooldown identity, send only allowlisted context, cap and normalize responses, clear stale suggestions on context/config/auth changes, and report shown/opened/dismissed evidence;
- normalized widget-iframe suggestions and governed procedures again before rendering;
- made known-issue timestamps fail closed and restricted optional status links to the shared public HTTPS URL boundary;
- renamed management output to engagement evidence and removed automatic disabling, reprioritization, activation, publication, and resolution claims from runtime and maintained docs;
- added strict dedicated/shared Firestore rules and emulator coverage for source/scope/server-field forgery, exact-page activation, immutable kind, and one-time missing-kind migration;
- synchronized the predictive-support dossier, system/data inventories, runtime verifier, package gates, and public claim boundaries.

**Verification passed:**

- `npm run test:answerlattice-predictive-support`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-predictive:rules`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-predictive:shared-rules`
- `npm run test:answerlattice-runtime-summary-contracts`
- `npm run test:answerlattice-widget-config-contracts`
- `npm run test:answerlattice-widget-runtime-token`
- `npm run test:answerlattice-widget-answer-contracts`
- `npm run test:answerlattice-guided-resolution`
- `npm run test:answerlattice-signal-contracts`
- `npm run test:answerlattice-governance-contracts`
- `node --check public/widget/answerlattice-widget.js`
- `npx tsc --noEmit --pretty false`
- `npm --prefix functions-answerlattice run build`
- focused ESLint on every changed Feature 18 TypeScript/TSX and verifier file
- stale-claim scan across maintained predictive-support and connected runtime sources
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npm run verify:dependency-freeze`
- `git diff --check`

**Deployment:** Required and attempted separately for `answerlattice-qa` dedicated Firestore rules, `menulist-qa` shared Firestore rules, and `answerlattice-qa` `functions:answerlatticeNightly`. Each command stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote rule release or Function revision changed.

**Monitored limits:** At most 200 triggers per workspace; generated nightly suggestions at most 5; priority 0-100; cooldown 1-720 hours; condition strings at most 100 characters; custom summary at most 200; entity hints at most 5 of 64 characters; public request bodies 4 KiB; public response consumption 32 KiB; active summary cache 60 seconds and empty cache 5 minutes; loader context cache 60 seconds; interaction types limited to shown/opened/dismissed. Revise the contract before customers require broader applicability expressions or materially larger rule sets.

**External evidence:** Authenticated QA rule/Function deployment and readback, hosted allowed-origin browser behavior, configured Redis cooldown persistence and failure behavior, real iOS/Android and desktop browser interruption/accessibility review, approved customer trigger wording, and measured downstream verified resolution/task-completion outcomes remain outside local source completion.

### Feature 19 — Customer Help Center

**Status:** Local source complete

**Current audit boundary:** customer entry and workspace resolution -> navigation and content discovery -> KB/FAQ/changelog/search rendering -> authentication and customer visibility -> ticket/conversation access -> responsive/mobile behavior -> cache, SEO, privacy, and failure recovery -> docs and focused verification.

**Implemented and hardened:**

- Preserved `/help-center` as the authenticated MenuList owner/reference-client surface while search, public content, FAQs, changelog, chat and tickets resolve the explicit Answerlattice product-account workspace. `/answerlattice/help` remains a compatibility shell; hosted public help-center behavior remains Feature 20.
- Corrected Contact Us Help Chat context from the nonexistent `contact` key to `contact-us -> contact_support`, so live questions retain the intended workflow context.
- Translated tab titles, breadcrumbs, FAQ actions/failure recovery, feedback summaries, ticket tooltip and the Mobile Help header through existing maintained locale keys. Broader legacy Help Chat conversational copy remains an explicit monitored localization limit rather than a false full-localization claim.
- Replaced unscoped Help Chat draft keys with exact workspace plus consistent authenticated-user scope. Drafts use a strict versioned envelope, maximum 2,000 characters and 24-hour retention; hydration completes before autosave, screenshots are never persisted, and malformed, expired, legacy or foreign-scope values are purged.
- Bound category, article, changelog and ticket caches to exact workspace keys and separated platform ticket cache through an explicit platform audience. Category/changelog in-flight request coalescing now uses per-scope maps, so another workspace response cannot satisfy the active request.
- Changed managed FAQ request failure from silent static-answer substitution to a visible failure state with Knowledge Base and ticket recovery. Static MenuList FAQ copy remains only when FAQ management is deliberately disabled.
- Retained authenticated/noindex routing, bounded search/public-content response parsing, internal article/changelog destinations, published customer DTOs, exact ticket scope, append-only ticket history, trusted attachment opening and MobileShell deep-link/back behavior.
- Refreshed the maintained Help Center dossier, removed stale claims about module-cached ticket sessions and unauthenticated Help Center APIs, and added focused test cases.

**Focused verification:**

- `npm run verify:help-center-boundary`
- `npm run test:help-center-runtime-boundaries`
- `npm run test:ticket-attachment-boundary`
- `npx tsc --noEmit --pretty false`
- focused ESLint on every changed Feature 19 TypeScript/TSX and verifier file
- hardcoded customer-label scan across the maintained Help Center and mobile wrapper
- stale-claim scan across maintained Help Center docs and cache sources
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npm run verify:dependency-freeze`
- `git diff --check`

**Deployment:** No Firestore rule, index, Storage rule or Cloud Function changed for Feature 19. Local source completion therefore requires no Firebase deploy. App/website deployment remains owner-approved only under the Vercel guard.

**Monitored limits:** Managed FAQ reads cap at 80; customer ticket list/listener caps at 100; article browser cache caps at 20; Help Chat drafts cap at 2,000 characters and 24 hours. The current Help Chat conversation UI still contains legacy English-only strings outside the audited shared Help Center labels. Do not claim fully localized Help Chat until a maintained translation pack and multilingual browser QA exist.

**External evidence:** Authenticated QA product-account provisioning and claim sync, direct and MobileShell route behavior on real devices, non-English locale review, browser-storage account/workspace switching, offline/slow-provider recovery, attachment upload/open behavior against the configured QA bucket, email/provider delivery, accessibility review, and real customer task-resolution/recontact outcomes remain outside local source completion.

### Feature 20 — Hosted Help Center, Custom Domain, and SEO

**Status:** Local source complete on July 19, 2026

**Dossier:** `__docs__/answerlattice/hosted-help/README.md`

**Implemented and hardened:**

- Restricted owner domain input to the exact help-domain labels the shared middleware can route, reserved Answerlattice product/service hosts, and blocked the same support labels in MenuList custom-domain admission.
- Made domain ownership registry-proven: existing domains require exact `AL`, tenant and workspace scope, new domains require successful provider addition, and Vercel `409` is not accepted as ownership proof.
- Added complete registry-ownership preflight before manual DNS refresh so stale or foreign workspace config cannot overwrite another registry assignment.
- Projected provider DNS/config responses through a bounded allowlist before persistence or browser delivery; provider exception text and server environment instructions remain outside owner/public responses.
- Made public routing strict: unknown, disabled, malformed and unlisted article routes return 404, and inactive section articles are omitted without collapsing otherwise valid navigation.
- Unified encoded article paths across browser links, metadata and sitemap; added article-specific titles, explicit canonical URLs and URL deduplication.
- Preserved Host-authoritative tenant resolution, request-specific rate-limit admission, visible temporary-unavailability behavior and compact public DTOs.
- Removed the no-op scope-cache invalidation contract and stopped shared-CDN caching of the full dynamic HTML response while preserving scoped registry/content data caches.
- Added a complete hosted-help documentation dossier, focused runtime-contract test and source verifier.

**Focused verification:**

- `npm run verify:answerlattice-hosted-help`
- `node scripts/verification/verify-custom-domain-boundary.js`
- `npx tsc --noEmit --pretty false`
- focused ESLint on every changed Feature 20 TypeScript/TSX and verifier file
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npm run verify:dependency-freeze`
- `git diff --check`

**Deployment:** No Firestore rule, index, Storage rule or Cloud Function changed for Feature 20. Local source completion therefore requires no Firebase deploy. App/website deployment remains owner-approved only under the Vercel guard.

**Monitored limits:** Five domains per workspace; 20 bounded DNS records per provider projection; 60-second server data caches; client-side search over loaded public content; sitemap/article/category/query caps inherited from existing public-content readers. Domain mutation intentionally performs bounded explicit Firestore reads/writes and provider calls rather than background polling.

**External evidence:** Authenticated QA settings load/save/refresh, real Vercel add/conflict/status/removal behavior, DNS propagation, TLS readiness, custom-domain browser routing, live CDN cache headers and multi-IP admission, search-engine indexing, mobile/accessibility review, and customer search/resolution outcomes remain outside local source completion.

### Feature 21 — Tickets, Conversations, Attachments, Handoff, and Email

**Status:** Local source complete on July 18, 2026

**Dossiers:** `__docs__/answerlattice/ticket-system/README.md`, `__docs__/answerlattice/chat-monitoring/README.md`, and `__docs__/answerlattice/email-notifications/README.md`

**Verified flow:** customer/widget/guided/operator intake -> scoped ticket transaction -> bounded attachment upload -> append-only message/status/satisfaction lifecycle -> customer/operator queues and operational SLA indicators -> explicit widget/guided handoff evidence -> strict notification request -> current support permission and exact ticket projection -> claimed SMTP delivery -> conversation review/feedback/private note -> governed gap/signal handoff -> soft delete, restore, platform-only hard delete, and retention boundaries.

**Hardening completed:**

- changed dedicated and shared Firestore access for `supportTickets`, `chatSessions`, and `chatAnalytics` from generic membership to Answerlattice support-control authority;
- admitted `PLATFORM_SUPPORT` for cross-workspace support operations while preserving ticket hard delete for `PLATFORM` only;
- applied the same support authority to dedicated/shared Storage paths for ticket documents, message attachments, and chat images;
- optimized update-scope and affected-key rule evaluation so valid 50-message/25-status ticket histories remain under Firestore's expression ceiling while append-only validation stays intact;
- required positive `tId/sId` in the strict notification request and checked `MANAGE_SUPPORT` against that exact scope before the Admin ticket read;
- kept recipient, event evidence, template fields, product, and deterministic reference server-derived from persisted ticket truth;
- retained deterministic delivery claims, recipient-day fail-closed limiting, finite SMTP deadlines, escaped templates, and claim-bound finalization;
- aligned the DAL so `PLATFORM_SUPPORT` can operate support flows but only `PLATFORM` can invoke hard delete;
- preserved transactional self-reply suppression for reply notifications and one status notification request per real status transition;
- aligned the four-file/10 MiB creation and reply contract across the DAL, persisted ticket parser, dedicated/shared rule caps, Storage rules, trusted download projection, and boundary tests;
- derived first-response and resolution indicators from recorded non-requester replies and Resolved/Closed status timestamps so late resolved tickets remain visibly breached;
- documented that persisted chat-image cleanup is deferred because one session cannot prove workspace-wide non-reference, while failed unpersisted uploads are removed immediately;
- documented browser-triggered email as best-effort, SMTP acceptance as non-resolution evidence, bearer-style Firebase attachment URL residual risk, and the absence of inbound email threading;
- rebuilt the complete ticket, conversation-monitoring, and email-notification dossiers and corrected data inventory, master index, changelog, and CSV spreadsheet-formula export truth.

**Verification passed:**

- `npm run test:answerlattice-ticket-contracts`
- `npm run test:answerlattice-chat-session-contracts`
- `npm run test:answerlattice-chat-analytics-contracts`
- `npm run test:ticket-attachment-boundary`
- `npm run verify:ticket-notification-boundary`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:notification-delivery-claim:emulator`
- dedicated/shared ticket, chat-session, chat-analytics, and Storage rule emulator suites
- `npm run typecheck:answerlattice`
- focused ESLint on every changed Feature 21 TypeScript and verifier file
- `npm run docs:check-links` (pass; unrelated tracked video filename warnings remain)
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npm run verify:dependency-freeze`
- `git diff --check`

**Deployment:** Required and attempted separately for dedicated `answerlattice-qa` Firestore/Storage rules and shared `menulist-qa` Firestore/Storage rules. All four commands stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote rule release changed.

**Monitored limits:** Ticket documents are capped at 4 per create/message action and 10 MiB each; retained ticket history is capped at 50 messages and 25 statuses; user conversation history is capped at 50 sessions, admin pages at 100, broad scans at 500, and volume charts at 1,000/90 days; direct notification requests are 16 KiB and 120/user/hour, direct sent mail is 20/recipient/day, and Activation tests are 3/workspace/hour. Revisit the ticket array model before materially increasing history limits because Firestore rule validation is near the expression ceiling for deliberately invalid maximum-size rewrites.

**External evidence:** Authenticated QA rule deployment/readback, SMTP provider and inbox placement, hosted desktop/mobile ticket and conversation smoke, real attachment open/delete behavior against configured buckets, support-role claim propagation, browser-close notification loss rate, and verified customer resolution/recontact outcomes remain outside local source completion.

### Feature 22 — Support Board, Internal Notes, and Needs Answer

**Status:** Local source complete on July 19, 2026

**Dossier:** `__docs__/answerlattice/support-board/README.md`

**Verified flow:** feature-gated manual/source intake -> strict positive tenant/workspace normalization -> deterministic source-card identity and transactional deduplication -> support-authorized private board -> bounded card metadata, notes and status history -> Needs Answer review -> governance-authorized mutation proposal link -> human review outside the board -> exact compact count refresh -> optional bounded nightly source/breakdown enrichment.

**Hardening completed:**

- made non-manual source-card IDs deterministic from exact tenant, workspace, source type and bounded source ID, then used transactions for single and bulk creation so retries cannot create duplicate work;
- rejected invalid scopes, missing non-manual source IDs, resolved-at-create cards and source-identity conflicts before persistence;
- bounded titles, descriptions, source identifiers, copied customer fields, assignee fields, due dates, tags, related references, notes, status remarks and loaded card counts in the DAL and strict Firestore rules;
- restricted board and compact-summary reads/writes to exact Support Board authority rather than widget-only access, while preserving cross-workspace operations for platform support;
- constrained client writes to valid manual creation, bounded metadata edits, prepend-only private notes, coupled status/history/resolution changes, governance-authorized proposal links and one-way copied-source identity redaction; client delete, sync-field forgery, source reassignment and history rewrites remain denied;
- kept the 50-entry embedded status cap fail-closed rather than allowing an unbounded audit array, and kept notes capped at 25;
- added truthful proposal partial-success handling so a created mutation proposal is reported even if the optional private note cannot be added;
- moved a successfully linked proposal card to `Draft Ready` while preserving the human governance review and publication boundary;
- classified unresolved evidence without treating successful FAQ answers as gaps or copied support records as approved truth;
- added an Answerlattice write trigger that refreshes exact open, Needs Answer, high-priority and total counts only after count-relevant changes, ignores note/title-only writes, and prevents older events from overwriting newer summary state;
- aligned nightly preparation with the same exact aggregate counts while marking bounded source/card windows as saturated or stale instead of presenting partial breakdowns as exhaustive;
- added dedicated/shared index parity for priority-scoped board queries, complete Support Board docs including the missing marketing file, data-inventory evidence and focused contract/rule tests.

**Verification passed:**

- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-support-board`
- dedicated/shared Support Board Firestore rule emulators
- dedicated/shared platform-summary Firestore rule emulators
- dedicated/shared governance Firestore rule emulators
- `npm run typecheck:answerlattice`
- Answerlattice Functions TypeScript build
- focused ESLint on every changed Feature 22 TypeScript/TSX and verifier file
- `npm run docs:check-links` (0 broken links; unrelated tracked video naming warnings remain)
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- governance contract/client tests and Founder Daily Brief boundary verifier
- `npm run verify:dependency-freeze`
- index JSON validation and `git diff --check`

The first aggregate runtime run reached the ticket-rule stage before a stale local Firestore emulator retained port `8080`. After that stale emulator exited, the full aggregate gate was rerun from the beginning and passed end to end.

**Deployment:** Required targets were attempted for dedicated `answerlattice-qa` Firestore rules/indexes, shared `menulist-qa` Firestore rules/indexes, and `answerlatticeSupportBoardSummaryOnWrite` plus `answerlatticeNightly`. Each attempt stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote rules, indexes or Functions changed.

**Monitored limits:** Board load is capped at 120 cards; explicit source scans read at most 50 rows and prepare at most 20 cards; notes cap at 25, status history at 50, and tags/context keys at 8; the live count trigger performs four aggregate count queries plus one summary transaction for count-relevant changes; optional nightly breakdown reads cap-plus-one card/source windows and records saturation. Cards have no client delete or TTL; copied source identity can be redacted, while original-source deletion follows that source's retention contract.

**External evidence:** Authenticated QA rule/index/function deployment and readback, live event-order/count behavior, owner/support-role claims, desktop/mobile board workflow, copied-source redaction, deterministic retry behavior under concurrency, large-workspace saturation messaging, governance proposal review, and measured time-to-close/support-workload outcomes remain outside local source completion.

### Feature 23 — Feedback, Ratings, Feature Requests, and Reactions

**Status:** Local source complete on July 19, 2026

**Dossier:** `__docs__/answerlattice/feedback-system/README.md`

**Verified flow:** selectable Help Center feedback category -> authenticated bounded request -> deterministic server-owned private `feedback` transaction -> exact replay acknowledgement or changed-replay conflict -> retry-safe identity-minimized review signal -> exact-self acknowledgement or support-authorized workspace review -> Product Surface assignment -> deterministic Support Board handoff -> entity-linked human-governed proposal; and authenticated article/changelog/FAQ reaction -> strict body/scope/actor/rate admission -> replay-safe server transaction -> authoritative active-actor transition -> source counter plus hidden actor state, bounded visible audit and deterministic negative signal -> authoritative client reconciliation -> owner audit read -> 365-day visible-audit cleanup.

**Hardening completed:**

- moved Help Center creation behind an authenticated 16 KiB server route with fail-closed 12-per-actor/workspace/hour admission, server-derived scope/actor/timestamps, deterministic document identity, exact payload fingerprinting, exact replay acknowledgement, and changed-replay conflict;
- made private-feedback reads exact submitter or exact `canManageSupport`/platform support authority in both dedicated and shared Firebase, while direct browser create/delete remains denied;
- added dedicated/shared rule coverage proving support-permission reads while widget-only managers, unrelated same-workspace team members, cross-workspace members and unauthenticated actors remain denied;
- made the Help Center submit flow ref-locked so rapid clicks cannot create duplicate rows, and disabled category navigation/cancel while the write is in flight;
- derived feature-request vote state from the resettable Ant Design form authority so successful submit and Cancel clear both persisted form values and visible controls;
- made feature-usage choices responsive from one column to two and applied 44px touch targets to checklist, vote, reaction and modal actions;
- reconciled optimistic article/changelog/FAQ counters to the validated server response, bounded rollback at zero, and retained failed detailed dislike comments for a real retry;
- kept content reaction mutation behind the authenticated, 16 KiB body-capped, 30/scoped-actor/minute server route and one exact-source transaction with 20-request replay state, a hidden authoritative actor-sentiment map capped at 5,000 active actors, 200 visible audit events, publication eligibility, and a deterministic negative signal;
- made duplicate adds/removals authoritative no-ops even with fresh request IDs and required explicit removal before a sentiment switch, preventing cleared browser state from inflating or corrupting counters;
- removed submitter `uId` and `sourceContext` duplication from derived Help Center signal metadata while preserving the original private feedback row as the authorized identity source;
- removed the obsolete dedicated-rule customer feedback-signal create path so browser clients cannot bypass server submission admission by writing review evidence directly;
- labelled owner metrics as the latest 200 loaded rows rather than implying all-time totals;
- preserved the product boundary: Help Center feedback and reactions are review evidence, unresolved signals cannot auto-mutate truth, workflow reactions remain unsupported, and no content change auto-publishes;
- reconciled all eight feedback-system documents with FAQ support, server-owned reaction writes, exact access, costs, retention, mobile behavior, and remote-deployment truth.

**Verification passed:**

- `npm run verify:answerlattice-feedback-boundary`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-feedback`
- `npm run test:answerlattice-content-feedback-contracts`
- feedback-submission deterministic create/replay/conflict/signal emulator suite
- dedicated/shared feedback Firestore rule emulator suites
- dedicated/shared signal Firestore rule emulator suites proving customer feedback-signal creates remain denied
- content-feedback server emulator suite
- `npm run typecheck:answerlattice`
- focused ESLint on every changed Feature 23 TypeScript/TSX and verifier file
- `npm run docs:check-links` (0 broken links; unrelated tracked video naming warnings remain)
- `npm run verify:dependency-freeze`
- index JSON validation and `git diff --check`

The current aggregate source verifier is temporarily blocked later in the frozen sequence by the in-progress Feature 25 activation-summary legacy-scope assertion. Feature 23's focused source, contract, rule, submission and reaction gates pass; the aggregate gate will be rerun after Feature 25 is reconciled rather than weakening or bypassing its assertion.

**Deployment:** Dedicated `answerlattice-qa` and shared `menulist-qa` Firestore rules/index targets are required because both rule mirrors changed. The repository Firebase CLI attempts stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote rule or index release changed. Feature 23 changed no Answerlattice Cloud Function logic, so no Function deployment was required. App/UI/API changes remain undeployed under the Vercel opt-in guard.

**Monitored limits:** Private Help Center text is capped at 1,000 normalized characters, issue choices at 10, request votes at 5, request IDs at the shared bounded contract, submission JSON at 16 KiB, admission at 12 submissions per scoped actor/workspace/hour, client pending request identities at 100, and owner/platform result queries at 200 rows; content mutation bodies cap at 16 KiB and 30 changes per scoped actor per minute; comments cap at 500 characters, visible audit history at 200 events, source replay state at 20 requests, hidden actor state at 5,000 active actors per content item, content client pending requests at 200, browser acknowledgement state at 500 items, and visible-audit retention at 365 days. Private `feedback` rows and non-empty internal actor-state rows remain durable with no client delete or feature-local cleanup; full workspace erasure is a cross-cutting account-lifecycle requirement.

**External evidence:** Authenticated QA rule deployment/readback, hosted customer submission and owner review across desktop/mobile, role-claim propagation, reaction retries under real network loss/concurrency, server counter/audit/signal consistency, nightly audit expiry, full workspace erasure, and measured feedback-to-knowledge/support-resolution outcomes remain outside local source completion.

## Completed item

### Feature 24 — Install Center, Developer Pack, Web SDK, and Agent Packet

**Status:** Local source complete

**Verified flow:** canonical install contract -> generated public human/Markdown/agent/framework artifacts -> HTML-escaped embed snippet -> protected workspace packet/kit -> actor/workspace limiter -> `MANAGE_WIDGET` -> exact-scope store read -> private no-store artifact -> bounded Install Center setup projection -> same-origin ZIP validation/download -> copy/open/retry recovery -> runtime/context verification -> activation handoff.

**Hardening completed:**

- Preserved the supported v1 first-party browser SDK boundary (`/widget/v1/answerlattice-widget.js`, `window.AnswerlatticeWidget`, `setContext`, and `page`) while rejecting unsupported npm or broad public SDK claims.
- Confirmed the six documented unsigned page-context fields are deliberately narrower than internal normalized plan/state/version fields; trusted applicability claims remain server-verified identity/context work rather than copied browser truth.
- HTML-escaped script URL, widget key, and blocked-route attributes in generated embed snippets.
- Scoped packet/kit quotas by actor + tenant + workspace, retained limiter-before-permission/read order, and applied private `no-store` plus `nosniff` to every protected response path.
- Capped generated ZIP output at 2 MiB server-side. The Install Center now uses a same-origin no-store fetch, validates status/content type/declared size/blob size, prevents parallel taps, and shows fixed failure copy.
- Bounded Install Center widget-config arrays, per-item strings, key prefix, error text, runtime timestamps, and non-negative safe-integer counters before state replacement.
- Applied wrap-safe 44px command targets across desktop/mobile Install Center actions.
- Reconciled all Developer Install Pack maintained docs and extended focused source/contract assertions.

**Local verification:**

- `npm run typecheck:answerlattice`
- focused ESLint on changed Feature 24 TypeScript/TSX and verifier files
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- focused install-contract assertions through the repository TypeScript loader
- `git diff --check` for the Feature 24 change set

`npm run verify:agent-readiness` remains blocked by an unrelated current-worktree package invariant: `package.json` exposes `tsc --noEmit --incremental --pretty false`, while the verifier requires the exact `--incremental false` script. Feature 24 does not change root package governance.

**Firebase/deployment:** Feature 24 changed no Firestore rules, indexes, Storage rules, or Cloud Functions, so no Firebase deploy was required. App/UI/API route changes remain undeployed under the Vercel opt-in guard.

**Monitored limits:** widget-config response 64 KiB; 25 allowed origins x 300 characters; 50 blocked routes x 180 characters; runtime markers 120-180 characters; protected packet 30 requests/minute and kit 10 requests/minute per actor/workspace; generated/downloaded kit 2 MiB. Each admitted protected packet or kit request performs one exact store read.

**External evidence:** Authenticated hosted Install Center smoke, real key creation/one-time key handoff, production/staging origin admission, SPA route updates, real browser ZIP download across desktop/mobile, blocked-route suppression, remote rate-limit behavior, and production-host v1 loader caching remain outside local source completion.

## Completed item

### Feature 25 — Activation, Readiness, and Test-as-Customer

**Status:** Local source complete

**Verified flow:** dashboard read admission -> `VIEW_READINESS` -> exact Answerlattice session scope -> one exact store-ownership read -> seven scoped compact summary reads -> bounded activation derivation -> retained snapshot -> 64 KiB browser validation -> founder journey and next action -> manual customer-path checklist -> Founder Daily Brief handoff only after strict launch proof.

**Hardening completed:**

- Read and exact-validated `stores/{sId}` before all compact summary data, and replaced the permissive legacy subscription fallback with exact Answerlattice product, tenant, store, and document scope validation.
- Parsed coverage, trust, Answer Tests, and compiled-context inputs through their maintained scoped contracts. Compiled bundles count as ready only when the manifest and bundle reference are valid for the current scope.
- Added a seven-day freshness boundary for widget-install and context-update runtime proof, with a five-minute future-clock tolerance. Stale proof becomes `attention` and cannot satisfy launch readiness.
- Required strict `launchProof.ready` before the internal stage can become `live`; a score of 85 or more is no longer sufficient.
- Deep-validated the activation response in the browser, including canonical timestamps, bounded arrays and counters, runtime scope, answer-test and compiled-context summaries, launch-proof consistency, and rejection of a `live` stage without ready proof.
- Reworded customer-facing readiness as controlled testing, made the manual known-answer and unresolved-fallback checks explicit, and avoided presenting configuration completion as verified customer resolution.
- Applied wrap-safe, full-width mobile actions with at least 44px command targets across Activation, Readiness, Customer Flow, and Surface Readiness.
- Reconciled all nine maintained Client Activation Command Center documents and expanded focused runtime, stale-boundary, malformed-response, and contradictory-proof tests.

**Local verification:**

- `npm run typecheck:answerlattice`
- root `npx tsc --noEmit --incremental false --pretty false`
- focused ESLint on the Feature 25 TypeScript/TSX and verifier change set
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-founder-support-controls`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npm run docs:check-links` with zero broken links and 62 pre-existing video-name warnings
- `npm run verify:dependency-freeze`
- scoped `git diff --check`

The first focused contract run inherited a stale local `GOOGLE_APPLICATION_CREDENTIALS` path (`/Users/danny/Downloads/gcloud/service-account.json`). Removing that inherited variable produced a clean pass; this is a local environment condition, not an Answerlattice defect.

**Firebase/deployment:** Feature 25 changed no Firestore rules, indexes, Storage rules, or Cloud Functions, so no Firebase deploy was required. App/API/UI changes remain undeployed under the Vercel opt-in guard.

**Monitored limits:** shared dashboard `DATA_READ` rate policy; eight reads for a valid activation summary and one store read for an invalid scope; legacy fallback capped at five subscription rows; retained snapshot writes only when the signature changes or after 30 minutes; browser response capped at 64 KiB; eight surfaces; 20 steps; ten proof items; 25 origins; runtime proof valid for seven days; widget telemetry writes bounded by 15-minute install and one-minute changed-context intervals.

**External evidence:** Authenticated QA activation loading, real fresh-to-stale telemetry transitions, manual known-answer plus unresolved-fallback and ticket-context execution, real signal creation, desktop/mobile hosted smoke, stage-aware base-route behavior, retained snapshot behavior after seven days, and remote rate-limit headers remain outside local source completion.

### Feature 26 — First Trusted Answers, Starter Questions, and Launch Answers

**Status:** Local source complete on July 19, 2026

**Verified flow:** bounded Knowledge Intake source packet -> one-credit/cached product starter generation -> exact generic or product First 10 identity -> draft Intake review and canonical Governance handoff -> dedicated canonical-only launch run -> retained suite/source proof -> current/stale launch projection -> Activation and owner guidance.

**Hardening completed:**

- Replaced prefix-based product launch identity with the exact registered `product_launch_01` through `product_launch_10` slots.
- Required one coherent generic or product set, one common generation-input hash, unique review-item provenance, valid active cases, and exact ordering before ten-question product launch coverage is complete.
- Added a dedicated **Run First 10 checks** path that submits the exact active launch IDs; the run API rejects selected cases that changed, disappeared, or became inactive instead of executing a silent subset.
- Made Activation reject malformed case timestamps, duplicate or partial results, changed suites/sources, and runs completed more than five minutes in the future.
- Derived critical failures conservatively from retained and current case evidence rather than trusting contradictory retained summary totals.
- Added strict browser summary/run contracts and exact-scope parsing. Browser projections remove reservations, request fingerprints, and internal governed-source counters while the server retains them for concurrency and freshness.
- Applied private/no-store and `nosniff` response headers across Answer Tests management, run, release-check, and product launch-pack paths.
- Reconciled all eleven maintained First Trusted Answers documents and expanded source-gate and adversarial contract coverage.

**Local verification:**

- `npm run typecheck:answerlattice`
- root `npx tsc --noEmit --incremental false --pretty false`
- focused ESLint on the Feature 26 TypeScript/TSX, API, and verifier change set
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-founder-support-controls`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-answer-test-runtime`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-knowledge-intake:emulator`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npm run docs:check-links` with zero broken links and 62 unrelated video-name warnings
- `npm run verify:dependency-freeze`
- repository-wide `git diff --check`

The first aggregate attempt met a transient local Firestore emulator port conflict on `8080` immediately after another emulator shutdown. The port was already free when inspected; the clean rerun passed the complete aggregate. This was a local process-timing condition, not a Feature 26 contract failure.

**Firebase/deployment:** Feature 26 changed no Firestore rules, indexes, Storage rules, or Answerlattice Cloud Functions, so no Firebase deploy was required. App/API/UI changes remain undeployed under the Vercel opt-in guard.

**Monitored limits:** exactly ten launch slots; 100 stored Answer Tests; 25 cases per run; ten full-runtime cases; ten retained runs; five active reservations; one provider call and one support credit per changed prompt-bounded product pack; 30 ready source documents; 32,000 source characters; 120 review items per intake job; 512 KiB browser response cap; five-minute future-clock tolerance.

**External evidence:** Configured Gemini generation, active paid-credit settlement, authenticated desktop/narrow-width launch review, real Governance acceptance and approval, deployed widget verification, source-change stale transition, and customer outcome evidence remain outside local source completion.

## Completed item

### Feature 27 — Pre-Onboarding Input Kit and AI IDE Guides

**Status:** Local source complete on July 19, 2026

**Verified flow:** public `/pre-onboarding` owner route and tool-specific wrapper -> explicit product/source mode and target-product boundary -> authorized source inspection -> fixed 26-source package -> governed source evidence and review-only/API-ready payload distinction -> owner privacy/conflict review -> authenticated Knowledge Intake handoff -> draft review and launch gates.

**Hardening completed:**

- Corrected the generated add-source JSONL from rejected `sourceUrls` to the strict API's singular `originUrl`, listed every supported runtime source type, and required reviewed `contentText` before a non-website skeleton is considered API-ready.
- Clarified that payload files are review artifacts, authenticated runtime injects `pId`/`tId`/`sId`, and raw screenshot/audio/video uses the existing media upload path rather than JSONL.
- Required source authority, approval status, access scope, citation eligibility, effective/verified dates, applicability, and conflict evidence while keeping tickets, chats, macros, repeated replies, and support exports as signals until reviewed.
- Added explicit owner permission for private-source processing in the selected AI tool and prohibited public citation of private source URLs or text.
- Restricted "patch gaps" to the generated package so pre-onboarding cannot silently modify client product code, source docs, policies, or production data.
- Reused one public Markdown response-header contract across all eight prompt/guide/tool routes, including `nosniff`.
- Made the prompt modal reject a missing MIME type, placed deterministic initial focus on the in-dialog close action, removed the backdrop from the tab order/accessibility tree, trapped keyboard focus, and restored focus to the trigger.
- Exposed private-source processing permission, support-signal status, and private-citation boundaries consistently on both public pre-onboarding routes.
- Added a dedicated contract verifier for source modes, the exact 26-source sequence, live 40,000-character/50-source limits, source types, payload fields, governance rules, private-source handling, wrapper parity, and response headers.
- Reconciled the specification, implementation, owner guide, agent guide, help doc, website notes, Firebase/cost note, test matrix, master-prompt summary, and README.

**Local verification:**

- `npm run typecheck:answerlattice`
- root `npx tsc --noEmit --incremental false --pretty false`
- focused ESLint on Feature 27 runtime, route, and verifier files
- `npm run test:answerlattice-pre-onboarding-contracts`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-founder-support-controls`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npm run docs:check-links` with zero broken links and 62 unrelated pre-existing video-name warnings
- `npm run verify:dependency-freeze`
- rendered-prompt inspection: 22,680 bytes, 338 lines, exactly 26 source families, no recommended `sourceUrls`
- local browser smoke at desktop and exact 390x844 mobile metrics for `/pre-onboarding` and `/pre-onboarding/guide`, with zero horizontal overflow
- live `/pre-onboarding.md` response inspection confirming `text/markdown`, bounded cache policy, `nosniff`, and a 22,680-byte body
- local modal interaction smoke confirming initial focus, closed tab cycle, Escape restoration, prompt loading, blocked-clipboard fallback, and granted-clipboard success
- repository-wide `git diff --check`

The first founder-support aggregate inherited a stale `GOOGLE_APPLICATION_CREDENTIALS` path at `/Users/danny/Downloads/gcloud/service-account.json`. Removing that inherited variable produced a clean pass; this is a local shell condition, not a Feature 27 defect.

**Firebase/deployment:** Feature 27 changed no Firestore rules, indexes, Storage rules, or Answerlattice Cloud Functions, so it requires no Firebase deploy. Public route/UI/doc changes remain undeployed under the Vercel opt-in guard.

**Monitored limits:** one package fits one intake job; 26 standard sources within the live 50-source cap; 40,000 characters per source; 128 KiB modal response cap; 22,680-byte current master prompt; eight public Markdown routes; five explicit tool wrappers; private-source use requires owner authorization.

**External evidence:** A deployed public-route/header smoke, an actual downloaded-file check in a user browser, and one founder-generated package in each materially different source mode remain outside local source completion. The generated package still requires owner review and authenticated Knowledge Intake testing before any live-support claim.

## Completed item

### Feature 28 — Self-Service Onboarding, Account, and Workspace Provisioning

**Status:** Local source complete on July 19, 2026

**Verified flow:** public paid-plan entry -> Google-authenticated Answerlattice account -> normalized request fingerprint -> transactional provisional tenant/store/user scope -> exact Razorpay plan and attempt notes -> created-only exact provider recovery or creation -> transactional subscription/widget/payment-pending finalization -> default-auth product bridge and product-surface/bootstrap work -> strict private browser result -> provider-recovery, payment-pending, rotation, or pre-provider compensation path.

**Hardening completed:**

- Added a durable `provider_recovery_pending` state and 15-minute hold when provider creation may have happened but cannot be confirmed.
- Required provider candidates to be status `created` and to match the exact Answerlattice product, plan, attempt, tenant, and store notes; an active provider subscription cannot masquerade as a new checkout.
- Added a separate status-independent ownership check for a known provider ID; only an exact recognized terminal checkout deactivates its owned provisional scope and returns the checkout-expired recovery code.
- Made a known provider ID directly verifiable, preserved it across transient provider-fetch failures, and required bounded exact-note recovery before any same-attempt create after the hold.
- Removed onboarding-route provider cancellation. Exact-scope compensation now runs only when provider creation is proven not to have occurred or the exact owned provider checkout is confirmed terminal.
- Made local `payment_pending` finalization the rollback boundary so product-account bridge or bootstrap failure is safely recoverable rather than destructive.
- Persisted provider-recovery ownership transactionally across tenant, store, and user; different request fingerprints cannot claim that scope.
- Required HTTP(S)-only product URLs without embedded credentials and failed closed when normalized-email fallback found duplicate Answerlattice user records.
- Cleared stale provider ID, recovery time/reason, and cancellation fields before a compensated user begins a new attempt.
- Strictly parsed persisted payment summaries without falling back to newly submitted plan, amount, currency, or provider data.
- Required browser success to include a current plan, pending/created subscription, safe checkout URL, and widget-key/rotation-consistent shape.
- Added private/no-store and `nosniff` headers to one-time key and recovery responses, emitted widget-key analytics only when a raw key was returned, and added fixed recovery/rate-limit guidance.
- Reconciled the complete onboarding doc set, corrected the shared transaction cost model, and documented that `payment_pending` does not grant paid AI or Knowledge Intake entitlement.

**Local verification:**

- `npm run test:answerlattice-onboarding-provisioning`
- `npm run test:answerlattice-onboarding-provisioning:emulator`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- root `npx tsc --noEmit --pretty false --incremental false`
- focused ESLint on the onboarding route, form, provisioning helpers, contract/emulator tests, and source verifier
- `npm run docs:check-links` with zero broken links and 62 unrelated pre-existing video-name warnings
- `npm run verify:dependency-freeze`
- repository-wide `git diff --check`

The emulator proves exact recovery-state preservation, changed-fingerprint rejection, known-provider atomic finalization, widget state persistence, recovery-field clearing, and pre-provider compensation. The contract suite also covers exact provider ownership and terminal/non-terminal statuses. The source gate excludes `subscriptions.cancel(` from the onboarding route and checks finalization ordering, terminal recovery, strict recovery parsing, retry headers, response privacy, client shape admission, and package test registration.

**Firebase/deployment:** Feature 28 changed no Firestore rules, indexes, Storage rules, or Answerlattice Cloud Functions, so no Firebase deploy is required. API, public setup UI, helper, and docs changes remain undeployed under the Vercel opt-in guard.

**Monitored limits:** three attempts per user/hour; 32 KiB request body; 16 KiB browser result; monthly plans only; INR/USD only; 15-minute provider-recovery hold; bounded provider list search; exact one-time widget-key display; roughly 11+ normal Firestore reads and 13-18 writes before optional transaction retries/fallbacks/bootstrap work.

**External evidence:** Hosted QA Google OAuth, session refresh and product-account bridge behavior; Razorpay test-mode timeout, exact-note search, checkout, payment activation, webhook readback, and deliberate response loss; physical mobile/browser recovery; owner support recovery; and provider dashboard confirmation of no duplicate subscription remain outside local source completion.

The first full aggregate attempt reached the rules suites but found a transient local Firestore emulator listener on port `8080`. The listener was gone when inspected, and the clean rerun passed the complete aggregate. This was a local process-timing condition, not a Feature 28 contract failure.

## Completed item

### Feature 29 — Workspace Profile and Settings

**Status:** Local source complete on July 20, 2026
**Dossier:** `__docs__/answerlattice/workspace-profile/README.md`

**Verified flow:** authenticated Settings profile -> bounded GET and strict browser response -> product identity/support/timing edit -> bounded PUT -> exact `AL` product/tenant/store admission -> expected-revision check -> atomic store, scheduler-registry, source-version, and stale-manifest commit -> downstream scheduler, notification, and compiled-context use -> conflict reload or bounded failure.

**Hardening completed:**

- Added one shared strict profile contract for product name, credential-free HTTP(S) URL, support email, paid billing context, normalized main-page labels, valid IANA timezone, support-day `HH:mm`, response shape, and revision.
- Replaced the non-transactional save plus swallowed downstream failures with one transaction covering the store, one tenant-summary shard, compiled source version, and bundle stale marker.
- Added `answerlatticeWorkspaceProfileRevision`; onboarding initializes revision `0`, existing workspaces normalize missing revision to `0`, changed saves increment once, stale saves return fixed `409` conflict, and unchanged saves write nothing.
- Required exact stored `AL` product, tenant, store aliases, and document ID on both GET and PUT.
- Made every route-owned response private/no-store and `nosniff`, added write `Retry-After`, and retained bounded diagnostics without raw profile values.
- Moved signed-scope resolution, write limiting, and dedicated-database availability before permission reads, body parsing, and the profile transaction.
- Preserved the original launch-profile creation timestamp; a missing compiled source/manifest control plane is initialized with complete valid documents, while malformed or cross-workspace records abort without partial writes.
- Hardened the browser to accept only a strict bounded `{ profile, revision }` response, disable save before verified load, validate URL/email/length/surface constraints, and reload current values after conflict.
- Kept widget configuration, detailed Product Surfaces, workflow notifications, billing entitlement, and team access in their existing feature boundaries rather than expanding a generic settings model.
- Added a dedicated complete doc set and corrected onboarding, scheduler, inventory, data-map, changelog, and runtime-verifier parity.

**Local verification:**

- `npm run test:answerlattice-workspace-profile-contracts`
- `npm run test:answerlattice-workspace-profile:emulator`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- root `npx tsc --noEmit --pretty false --incremental false`
- focused ESLint on route, Settings client, contracts, transaction helpers, shared writers, and tests
- `npm run docs:check-links`
- `npm run verify:dependency-freeze`
- repository-wide `git diff --check`

The emulator proves the changed-save four-document transaction, revision increment, launch-history preservation, exact scheduler metadata, complete source-version shape, valid missing-manifest initialization, stale-editor rejection, no-op zero-version-bump behavior, malformed cross-workspace manifest rollback, and wrong-tenant rejection.

The clean current-worktree aggregate passed from the source verifier through dedicated/shared rule suites, onboarding, workspace-profile, retrieval, widget, guided-resolution, ticket, drift, governance, Answer Tests, founder-support, and recent-viewed boundaries. Expected negative-path Firestore permission logs remained test evidence, not failures.

**Firebase/deployment:** Feature 29 changed no Firestore rules, indexes, Storage rules, or Answerlattice Cloud Functions, so no Firebase deploy is required. Root app/API/helper/docs changes remain undeployed under the Vercel opt-in guard.

**Monitored limits:** permission admission reads the scoped store and, for non-platform users, performs the bounded scoped staff-user lookup. Profile-owned work then uses one GET store read, one transaction read for no-op/conflict saves, or three transaction reads and four writes for a changed save. Other limits are 20 PUT attempts per workspace/minute, 32 KiB request, 64 KiB browser response, and 8 main-page labels; Firestore transaction retries may add reads under contention.

**External evidence:** Authenticated hosted QA desktop and narrow-width Settings load/save/conflict behavior, real scheduler execution under a non-UTC support-day boundary, configured notification delivery to the updated support email, and deployed compiled-bundle rebuild/serve after a profile change remain outside local source completion.

## Completed item

### Feature 30 — Subscription, Billing, Payment Recovery, and Transactions

**Status:** Local source complete on July 19, 2026

**Current audit boundary:** paid plan selection -> provider plan/subscription/payment identity -> local subscription and store entitlement mirrors -> checkout/payment-pending/active/recovery transitions -> webhook and verification idempotency -> support credits and top-ups -> billing dashboard and transaction history -> cancellation/failure/renewal recovery -> exact product/workspace scope, security, audit, Firebase cost, docs, tests, deployment, and external provider evidence.

**Completed source work:**

- retained the existing shared-provider/separate-product architecture, current persisted `canManageBilling` admission, checkout coordination, provider/local compensation, signed webhook recovery, transaction-serialized entitlement, replacement carry-forward, and exactly-once support-credit settlement;
- projected provider subscription and order entities into strict minimal browser responses containing only admitted `sub_...` or `order_...` IDs, and made the payment hook reject extra outer or nested fields;
- normalized subscription and invoice links at server persistence, webhook enrichment, and billing-history projection through exact credential-free HTTPS `rzp.io` admission with fragment removal;
- added exact `pId == 'AL'` constraints to browser subscription fallback and transaction-history queries and updated both dedicated/shared payment-history indexes;
- aligned dedicated and shared Firestore rules with current billing permission, exact Answerlattice identity, and exact workspace scope while retaining same-scope MenuList reads and denying Answerlattice tenant reads of `topups`;
- replaced Billing-screen raw exception logging with stable `answerlattice_billing_*` diagnostics and bounded tenant/store presence-length metadata;
- distinguished an absent subscription from a failed read: Billing now clears unverified state, blocks plan mutation, and requires explicit retry instead of exposing a false empty-account checkout;
- centralized exact persisted Answerlattice record-scope resolution and applied it to direct subscription lookup plus payment, lifecycle, webhook, and upgrade transaction admission;
- made the checkout-concurrency and coordination-rule npm commands clear inherited Application Default Credentials before emulator execution;
- added pure response/URL tests, dedicated/shared rule emulator suites, source-verifier coverage, a complete feature dossier, inventory/data evidence, external Razorpay reference boundaries, and changelog parity.

**Local verification:**

- `npm run test:answerlattice-billing-contracts`
- `npm run test:answerlattice-billing:rules`
- `npm run test:answerlattice-billing:shared-rules`
- `npm run test:billing-settlement-boundaries`
- `npm run test:billing-checkout-concurrency:emulator`
- `npm run test:billing-coordination:rules`
- `npm run verify:billing-entitlement-boundary`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- root `npx tsc --noEmit --pretty false --incremental false`
- focused ESLint on billing routes, contracts, DAL, hook, Billing client, and tests
- index/package JSON parsing
- `npm run docs:check-links` with zero broken links and only the repository's pre-existing naming warnings
- repository-wide `git diff --check`

The rule emulators prove exact owner/custom-role reads, default Manager and cross-tenant denial, conflicting product denial, product-scoped list queries, browser-write denial, server-only Answerlattice top-up visibility, and preserved generic MenuList reads in shared mode.

The first checkout-concurrency command inherited a stale local `GOOGLE_APPLICATION_CREDENTIALS` path and stopped before test execution. Both shared billing emulator scripts now clear ADC internally; the direct npm commands and the complete Answerlattice aggregate pass from the current worktree.

**Firebase/deployment:** Feature 30 changes dedicated/shared Firestore rules and billing-history indexes. Required QA deploys were attempted with:

- `firebase deploy --only firestore:rules,firestore:indexes --project answerlattice-qa --config firebase-answerlattice.json --non-interactive`
- `firebase deploy --only firestore:rules,firestore:indexes --project menulist-qa --config firebase.json --non-interactive`

Both stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote revision changed. App/API code remains undeployed under the Vercel opt-in guard.

**Monitored limits:** valid-path read caps remain one store summary plus direct subscription or at most 10 fallback subscriptions, at most 25 payment-history rows, and at most 50 AI-operation rows per usage-history page. The new response projection, URL normalization, diagnostics, and rules add no Firestore operation; `pId` changes query/index admission only.

**External evidence:** real disposable Razorpay test-mode subscription, interrupted-browser recovery, support-credit purchase, signed webhook replay, failure/past-due/pause/resume/cancel/upgrade behavior, hosted invoice opening, authenticated desktop/mobile QA, and deployed rule/index readback remain outside local source completion.

## Completed item

### Feature 31 — Team, Custom Roles, Permissions, and Session Controls

**Status:** Local source complete on July 19, 2026

**Current audit boundary:** member invitation/setup -> current membership and role lifecycle -> default/custom permission definition -> owner/platform authority -> access revision and Firebase claim synchronization -> session refresh, store/product switching, and stale-session invalidation -> route/API/Firestore/Storage enforcement -> removal/deactivation/recovery -> setup-email delivery -> exact tenant/workspace scope, privacy, audit, cost, docs, tests, deployment, and external hosted-auth evidence.

**Completed source work:**

- retained the existing transaction-backed membership lifecycle, exact tenant/workspace/product aliases, immutable default roles, custom-role cap, role-in-use and last-owner protection, delegated-owner restrictions, account-global multi-workspace controls, idempotent create/re-add behavior, and all-settled bridge/claim/revocation repair;
- corrected post-commit claim repair so a multi-workspace user retains the current Auth workspace when that membership is still valid, otherwise selecting the affected workspace and then the canonical primary membership;
- reduced Answerlattice Auth tokens to one selected workspace while preserving the complete membership set in governed user/default-auth records; a workspace switch requests a fresh scoped token instead of carrying cross-workspace rule authority in one token;
- normalized unsupported Answerlattice `platformRole` values to `USER` before claim emission and added a maximum bounded claim test against Firebase Auth's 1,000-byte custom-claim limit;
- added a deterministic claim-state signature covering account status, tenant, selected workspace, store activity, role, platform role, admin authority, workspace list, and all permissions;
- reread the authoritative user and selected store after a claim write, retrying when either access revision or full claim-state signature changed so an older concurrent custom-role save cannot remain authoritative;
- retained the existing three-attempt repair bound and replaced revision-only exhaustion wording with explicit `ANSWERLATTICE_STAFF_CLAIM_SYNC_STATE_CONFLICT`;
- verified the current official Firebase Auth contract: refresh-token revocation blocks future tokens, custom claims propagate on new/forced token issuance, and already-issued ID tokens may remain valid until their approximately one-hour expiry;
- deliberately avoided a new billed Firestore revocation lookup on every protected request, documented the non-instant invalidation boundary, and narrowed public copy from “revoke active sessions” to refresh-access revocation;
- cross-checked the custom-role dependency graph and made `canAssignRoles` fail closed unless the same role also has `canManageTeam`; the role editor now enables the prerequisite and clears the dependent authority instead of saving an unreachable/API-only combination;
- centralized private `no-store, max-age=0` plus `nosniff` headers across Answerlattice access, staff success/failure, role, and one-time temporary-login-detail responses;
- made the staff concurrency emulator command clear inherited `GOOGLE_APPLICATION_CREDENTIALS` both before emulator startup and inside the executed test, matching the self-contained proof standard established by the billing audit;
- updated the full staff-access dossier, source inventory, data evidence, system inventory, public security copy, contract/runtime verifiers, and Feature 31 audit evidence.

**Local verification:**

- `npm run test:answerlattice-staff-access-contracts`
- `npm run test:answerlattice-access-user-scope`
- `npm run test:answerlattice-staff-client-contracts`
- `npm run test:set-claims-workspace-boundary`
- `npm run test:answerlattice-staff-concurrency:emulator`
- `npm run test:answerlattice-storage:rules`
- `npm run test:answerlattice-storage:shared-rules`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `node scripts/verification/verify-auth-onboarding-flow.js`
- root `npx tsc --noEmit --pretty false --incremental false`
- focused ESLint on staff claims/server, set-claims, public wording, tests, and source verifiers
- `npm run docs:check-links` with zero broken links and only the repository's pre-existing naming warnings
- repository-wide `git diff --check`

The staff concurrency emulator proves last-owner safety, multi-workspace mutation boundaries, replay behavior, role assignment/deactivation serialization, bridge revision ordering, and removal repair. Pure contracts prove current-workspace claim selection, fail-closed platform-role normalization, deterministic claim signatures, singleton claim scope, the bounded Firebase claim payload, and the `canAssignRoles -> canManageTeam` dependency. Runtime source verification proves private no-store and `nosniff` response admission for sensitive access/staff payloads.

**Broad current-worktree gates:** `verify-agent-readiness` remains blocked by the unrelated missing incremental-safe root package typecheck script. The previously blocked auth/security and tenant-safety gates now pass after their owning Chat Monitoring, Guest Feedback, and website-pricing assertions were reconciled during Feature 32.

**Firebase/deployment:** Feature 31 changes no Firestore rules, indexes, Storage rules, or Answerlattice Cloud Functions, so no Firebase deploy is required. The final cross-check changes shared permission normalization, Team Access UI behavior, and route response headers only. Root app/API/public-copy changes remain undeployed under the Vercel opt-in guard.

**Monitored limits:** normal claim-writing repair performs one initial user read, one selected-store projection read, then one user and one selected-store convergence read. A no-change repair performs two user reads and no store read. Custom-role refresh discovers at most 500 retained assignees, processes Auth work in groups of five, and retries at most three times per changed member; pathological contention can therefore multiply reads and provider calls but fails visibly rather than running unbounded.

**External evidence:** a real hosted QA invite/setup-email journey, owner-passcode first login/reset, selected-workspace switching for a multi-workspace user, simultaneous custom-role saves against live Firebase Auth, measured refresh-token revocation/ID-token expiry behavior, deployed Auth claim inspection, and authenticated desktop/mobile Team Access journeys remain outside local source completion.

## Completed item

### Feature 32 — Weekly Digest, Founder Daily Brief, and Owner Support Assistant

**Status:** Local source complete on July 19, 2026

**Verified flow:** exact settled daily chat analytics -> deterministic completed seven-day UTC aggregation -> source-completeness and hash evidence -> existing weekly insight -> strict workspace browser admission -> partial/stale/future handling -> permission-filtered governed review handoff; plus six exact compact summaries -> strict source health -> deterministic Daily Brief and ten-intent guidance -> caller capability projection -> bounded browser response -> no-provider/no-write owner review.

**Completed source work:**

- made the weekly summary contract require exact `AL` product/workspace identity, an exact seven-day inclusive window, deterministic generation mode, bounded content, valid timestamps, and reconciled current/previous source-day evidence;
- kept legacy deterministic weekly rows readable only as incomplete, so missing completeness evidence cannot silently produce comparisons;
- required source-complete daily rows, persisted current/previous day counts, computed comparison completeness only from two complete seven-day windows, and hash-skipped unchanged scheduler writes;
- retained weekly preparation inside the existing `answerlatticeNightly` scheduler and replaced the app compatibility path with a deterministic, exact-scope, two-per-minute, `MANAGE_SUPPORT` route that performs no provider or AI-accounting work;
- made the Answerlattice Weekly Digest read one exact insight document through the separate client, show current/partial/stale/future states, hide unavailable comparisons, wrap long repeated questions, and project review links through current route permissions;
- kept the legacy platform digest read-only and corrected its export so incomplete volume/recorded-feedback comparisons remain `Not available` instead of leaking stored values;
- centralized Owner Support Assistant and Founder Daily Brief source, status, route, capability, support-board, and browser-response contracts in `ownerSupportAssistantContracts.ts`;
- strictly parsed coverage, trust, Support Board, friction, Knowledge Intake, and Activation summaries; reported each source as available, missing, invalid, or stale; treated scheduled evidence older than 48 hours as stale and timestamps beyond a five-minute future tolerance as invalid;
- prevented complete-but-empty packets and missing evidence from becoming false zero metrics or a healthy status;
- filtered evidence, next actions, Daily Brief actions, launch verification, changelog entry, and prepared-review-card capability against the caller's actual Answerlattice permissions;
- retained the six-read cold packet, zero-read 60-second warm packet, 300-workspace cache cap, ten deterministic intents, four-action Daily Brief cap, no raw ticket/conversation scan, no provider call, and no assistant write;
- made the browser fail closed on malformed, oversized, redirected, wrong-enum, or wrong-route assistant and weekly-prepare responses with fixed local recovery copy;
- aligned dedicated and shared weekly-insight rules to exact product/workspace, readiness permission, and platform-support operator access; support-only tenant staff cannot read readiness insights;
- added the complete Weekly Digest dossier and updated Founder Daily Brief, Owner Support Assistant, source/data/system inventories, changelog, and static runtime gates.

**Local verification:**

- `npm run verify:answerlattice-founder-daily-brief`
- `npm run test:answerlattice-chat-analytics:rules`
- `npm run test:answerlattice-chat-analytics:shared-rules`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `node scripts/verification/verify-system-strengthening-boundary.js`
- `node scripts/verification/verify-auth-security-failure-matrix.js`
- `node scripts/verification/verify-menulist-api-tenant-safety.js`
- root `npx tsc --noEmit --pretty false --incremental false`
- focused ESLint across weekly, assistant, routes, Functions, contracts, and tests
- `npm --prefix functions-answerlattice run build`
- `npm run typecheck:answerlattice`
- `npm run verify:dependency-freeze`
- `npm run docs:check-links` with zero broken links and only the repository's pre-existing naming warnings
- repository-wide `git diff --check`

The Feature 32 aggregate proves strict owner-assistant response/status/permission contracts, deterministic weekly source windows, legacy incompleteness behavior, stale/future handling, source-hash idempotency, incomplete-source rejection, and the self-contained scheduler emulator. Dedicated/shared rule emulators prove exact owner and platform-support reads, support-only/viewer/cross-tenant/forged-product denial, and browser-write denial.

**Broad current-worktree gates:** `verify-system-strengthening-boundary`, `verify-auth-security-failure-matrix`, and `verify-menulist-api-tenant-safety` pass on the current worktree. `verify-agent-readiness` remains blocked by the unrelated missing incremental-safe root package typecheck script.

**Firebase/deployment:** Feature 32 changes `answerlatticeNightly` logic plus dedicated/shared Firestore weekly-insight rules. Required QA deploys were attempted with:

- `firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive`
- `firebase deploy --only firestore:rules --project menulist-qa --config firebase.json --non-interactive`
- `firebase deploy --only functions:answerlatticeNightly --project answerlattice-qa --config firebase-answerlattice.json --non-interactive`

All three stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote revision changed. App/API/UI changes remain undeployed under the Vercel opt-in guard.

**Monitored limits:** one browser weekly load is one existing insight read. Manual preparation performs permission admission, two queries limited to seven daily rows, one insight read, and at most one hash-skipped write. Scheduled chat intelligence performs one query limited to 14 daily rows, existing feedback/weekly insight reads, and only changed writes. The Daily Brief/assistant cold packet performs six summary reads; a 60-second exact-workspace cache hit performs zero reads and the process cache holds at most 300 packets.

**External evidence:** an authenticated hosted desktop/mobile journey for readiness-only and support-only roles, a real `answerlattice-qa` scheduled Sunday run, deployed rule/function readback, workspace-local settlement timing across timezones, real summary freshness/source-day evidence, exported partial/complete digest review, owner usefulness, and measured repeated weekly use remain outside local source completion.

### Feature 33 — Public website, deterministic demo, pricing, trust, and legal

**Status:** Local source complete on July 19, 2026  
**Dossier:** `__docs__/answerlattice/answerlattice-website/README.md`

**Verified flow:** public content registry and claim guardrails -> route registry/navigation/metadata/structured data/sitemap/robots -> disclosed deterministic product demo -> plan source of truth -> semantic Get Started form -> existing authenticated onboarding/provider checkout boundary -> trust/security/privacy/terms/contact evidence -> mobile navigation/accessibility -> focused source verifier and local browser proof.

**Hardening completed:**

- made the public Starter offer derive from the maintained Answerlattice plan source instead of duplicating INR pricing inside structured data;
- converted authenticated onboarding details into a native form with bound labels, native input types, server-matching limits, required company/surface evidence, legal links, and existing strict response and allowlisted-provider checkout admission;
- added mobile drawer initial focus, forward/reverse focus containment, Escape close, trigger restoration, and one click activation path;
- removed synthetic build-time sitemap modification claims and prohibited the unsupported `the first 24/7 support layer` superlative while retaining the supported product-surface description;
- added explicit telephone/URL semantics to contact intake without changing its bounded response, rate-limit, Turnstile, consent, or retention contracts;
- aligned Pricing, FAQ, Billing projection, and the pricing resource with operation-level support-credit accounting so charged and zero-credit paths are not implied from answer volume alone;
- rendered shared retention constants on Trust and Privacy, preserved the Gemini no-training/zero-retention non-claim, and bounded Terms to the verified Neelvara Systems operating trade-name, cancellation, deletion-review, and counsel-pending facts;
- replaced vulnerable direct root Nodemailer `7.0.13` with a typed `nodemailer9` runtime alias at `9.0.3`, kept NextAuth 4's unused incompatible optional mail peer absent, and retained the Answerlattice Functions `9.0.3` pin;
- added a complete website dossier and the dedicated `verify:answerlattice-public-website` source gate, included in the Answerlattice runtime aggregate.

**Local verification:**

- `npm run verify:answerlattice-public-website`
- `npm run verify:answerlattice-public-content-boundary`
- `npm run verify:answerlattice-pwa`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `npm run verify:dependency-freeze`
- `npm run verify:answerlattice-security-audit`
- `npm ls nodemailer nodemailer9 --all`
- root Nodemailer JSON-transport smoke using the `nodemailer9` alias
- `npm run test:signaldesk:provider-adapters`
- `npm run test:owner-notification-delivery-boundaries`
- `npm run verify:ticket-notification-boundary`
- root `npx tsc --noEmit --pretty false --incremental false`
- focused ESLint across changed public-site, mail-runtime, and verifier source
- `npm run docs:check-links` with zero broken links and the repository's 62 pre-existing naming warnings
- repository-wide `git diff --check`
- local alias-route checks proving 74 sitemap URLs, no synthetic `lastmod`, private-route robots exclusions, and an alias-aware sitemap URL.

**Browser evidence:** local desktop and `390 x 844` browser checks covered the homepage, deterministic six-stage demo, pricing, unauthenticated Get Started, contact, trust, security, privacy, and terms routes. There was no document-level horizontal overflow. The demo's wide stage rail remained inside its intentional scroll container. The mobile drawer focused Close on open, contained Tab and Shift+Tab, closed on Escape, restored focus to Open navigation, and reset body scrolling. Browser logs contained no runtime error; the only warning was development Fast Refresh after source editing.

**Firebase/deployment:** no Firestore rule, index, Storage rule, Cloud Function, collection, listener, provider integration, or deployment target changed, so no Firebase deploy is required. The only package change replaces vulnerable direct root Nodemailer `7.0.13` with the compatible `nodemailer9` alias at `9.0.3`; it adds no provider path or Firebase operation. Public app changes remain undeployed under the Vercel opt-in guard.

**Cost boundary:** the deterministic demo performs no Firebase or model call. Plan projection, form semantics, claim checks, structured data, sitemap generation, and navigation focus behavior add no database read, write, delete, Storage operation, model call, support-credit debit, or provider request. Existing authenticated onboarding/payment and contact admission retain their audited operational boundaries.

**External evidence:** production/preview host routing, DNS and canonical-host readback, consent analytics, search indexing, real Google identity, Razorpay test/live checkout completion, email/contact delivery, formal legal-entity and counsel-approved commercial terms, accessibility/device testing outside the local browser, buyer comprehension, conversion, and paid-customer outcome evidence remain outside local source completion.

### Feature 34 — Slack, email, GitHub, and Linear integrations

**Status:** Local source complete on July 19, 2026  
**Dossier:** `__docs__/answerlattice/workflow-integrations/README.md`

**Verified flow:** permission-gated Workflow Notifications route -> strict owner-safe Slack/email configuration -> exact workspace ownership and server-only webhook retention -> deterministic integration event -> transactional claim -> active event filter/test bypass -> adapter shaping and provider delivery -> deterministic attempt audit -> rate limits, circuit state, compact health -> owner refresh and governed recovery. Linear and GitHub remain controlled adapters without self-service credential entry.

**Hardening completed:**

- moved Slack/email configuration into the dedicated responsive Workflow Notifications surface and retained the dashboard permission/navigation boundary;
- centralized a strict browser/server response contract, bounded browser responses, private no-store headers, actor/workspace rate limits, fixed recovery copy, and post-save health preservation;
- limited self-service filters to the three event classes with active producers: coverage drop, repeated AI workflow failure, and nightly governance summary; formatter-only reserved event types remain unavailable;
- kept raw Slack webhook URLs server-side, validated exact `hooks.slack.com/services/...` HTTPS destinations, and prevented removing a webhook while Slack remains enabled;
- denied direct browser reads and writes of raw integration configuration in dedicated and shared Firestore rules, including the broad platform-admin branch, while preserving server/Admin SDK access;
- encoded Slack dynamic `&`, `<`, and `>` control text, set `verbatim: true`, and retained payload secret redaction so event content cannot become a mention or injected link;
- corrected recurring AI-failure payload semantics from query-like content to failed workflow phases and added explicit email/Slack/GitHub/Linear rendering instead of the email raw-JSON fallback;
- retained exact event identity, transactional ownership claim, partial-delivery failure, create-only attempt logs, persistent per-workspace/provider rate limits, serialized circuit probes, TTL retention, and provider-specific bounded retry behavior;
- fixed compact health writes to use a real nested adapter map inside the ownership transaction, and made recipient rate admission atomic so email is delivered to all configured recipients or none;
- aligned public integrations/FAQ/product-feature copy and the complete dossier with digest timing, active producer truth, controlled rollout, provider/privacy limits, and the distinction between internal idempotency and external exactly-once delivery;
- added strict contract and adapter safety tests and extended the runtime source verifier for active-only filters, limiter order, response privacy, secret-rule boundaries, Slack rendering/retry, nested health, atomic recipient admission, and `failurePhases` production;
- made founder-support aggregate verification clear inherited local ADC for each child command, so the current-worktree proof is reproducible without a deleted credential file.

**Local verification:**

- `npm run test:answerlattice-workflow-integration-contracts`
- `npm run test:answerlattice-integration-config-ownership`
- `npm run test:answerlattice-integration-adapter-boundaries`
- `npm run test:answerlattice-integration-delivery-state`
- `npm run test:answerlattice-integration-event-identity`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-integration-config:emulator`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-integrations:rules`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-integrations:shared-rules`
- `npm --prefix functions-answerlattice run build`
- `npm run typecheck:answerlattice`
- root `npx tsc --noEmit --pretty false --incremental false`
- focused ESLint across the owner route/component, API contracts/routes, Functions producer/adapters/safety/state, and verifiers
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npm run verify:dependency-freeze`
- `npm run docs:check-links` with zero broken links and the repository's 62 pre-existing naming warnings
- repository-wide `git diff --check`

The config/delivery emulator proves legacy ownership claim, conflicting ownership rejection, exact replay suppression, payload-conflict rejection, invalid-event failure, serialized circuit opening, nested multi-adapter health preservation, all-recipient email admission, and fail-closed event/health lifecycle mismatch. Dedicated and shared rules emulators prove exact-scope health read admission plus integration-secret denial for tenant members, platform admins, and browser writes.

**Firebase/deployment:** Feature 34 changes `answerlatticeNightly`, code used by `processIntegrationEvent`, and both dedicated and shared Firestore rules. The scoped Answerlattice QA deploy `firebase deploy --only functions:answerlattice:answerlatticeNightly,functions:answerlattice:processIntegrationEvent,firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` and the shared-rules deploy `firebase deploy --only firestore:rules --project menulist-qa --config firebase.json --non-interactive` were attempted after local validation. Both stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote function or rule revision changed. App/UI/public-copy changes remain undeployed under the Vercel opt-in guard.

**Cost boundary:** owner GET reads one exact config summary and one compact health summary; save uses one transactional config read/write and no health reread; test uses one config transaction read and one event write. Runtime delivery retains bounded event, attempt-log, rate-counter, health, and circuit-state operations with TTL cleanup. Slack webhook delivery has no Answerlattice connector fee; SMTP and controlled provider costs remain provider-dependent.

**External evidence:** authenticated hosted desktop/narrow-width configuration, real Slack webhook and Answerlattice SMTP delivery, secret provisioning/rotation/disconnect, provider outage/cooldown recovery, QA function readback, delivery receipt ambiguity, owner usefulness, and any Linear/GitHub least-privilege rollout remain outside local source completion.

## Current item

### Feature 35 — Public API v1

**Status:** Local source complete on July 20, 2026  
**Dossier:** `__docs__/answerlattice/public-api/README.md`

**Verified flow:** rollout flag and integration-management permission -> one-time API-key generation/rotation/revocation -> hash-only exact-scope authentication and rate admission -> canonical answer, entity-list, and governed-signal endpoints -> bounded public projection -> transactional audit and browser-denied credential storage.

**Hardening completed:**

- added a dedicated permission-correct Public API management route instead of placing integration-key controls behind the broader Workspace Settings permission;
- constrained key issuance to exact Answerlattice product, tenant, workspace, purpose, and scopes, stored only the credential hash, exposed the raw key once, and transactionally audited rotation and revocation without raw or hashed secret material;
- kept the feature default-disabled and rollout-gated, enforced same-origin management, exact signed session scope, workspace/actor rate admission, bounded private responses, and one active key per workspace;
- made public answering canonical-first and removed knowledge-graph expansion from the public projection because interaction explanations and related suggestions are not independently approved canonical truth;
- bounded entity listing, exposed a truthful `truncated` result when the v1 no-cursor response can be partial, and included that state in cache identity;
- restricted public signal types to supported governed inputs, blocked reserved identity/source metadata, rejected header/body idempotency disagreement, and distinguished an exact replay from a conflicting replay through typed persistence errors;
- protected both Public API and widget credential families from browser create/update/delete paths in dedicated and shared rules, including the broad platform-admin branch, while reserving the two server audit actions from browser forgery;
- added strict contracts, key-lifecycle emulator proof, dedicated/shared rules tests, governance-rule coverage, runtime source assertions, and the complete maintained feature dossier.

**Local verification:**

- `npm run verify:answerlattice-public-api`
- root `npx tsc --noEmit --pretty false --incremental false`
- `npm run typecheck:answerlattice`
- focused ESLint across Public API routes, contracts, key storage, owner UI/navigation/permissions, signal persistence, and focused verifiers
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-governance:rules`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:answerlattice-governance:shared-rules`
- `npm run verify:dependency-freeze`
- `npm run docs:check-links` with zero broken links and the repository's 62 pre-existing naming warnings
- repository-wide `git diff --check`

The focused aggregate proves strict API credential/scope contracts, key rotation and revocation invalidation, hash-only persistence, secret-free audit rows, cross-product and cross-scope denial, deterministic idempotency conflicts, dedicated/shared browser credential denial, and reserved-audit-action denial. Shared-rule emulator evaluation diagnostics appear only on expected denied protected-field updates; an ordinary same-scope store update succeeds, and the rule follows Firebase's documented `Map.diff(...).affectedKeys()` field-restriction pattern.

**Firebase/deployment:** Feature 35 changes both dedicated and shared Firestore rules. The scoped deploys `firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` and `firebase deploy --only firestore:rules --project menulist-qa --config firebase.json --non-interactive` were attempted after local validation. Both stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote rule revision changed. App/API/UI changes remain undeployed under the Vercel opt-in guard.

**Cost boundary:** owner management performs one bounded credential-state read plus a transactional key/audit mutation when rotating or revoking. Runtime requests retain exact key lookup, bounded rate admission, existing canonical/entity reads, and one governed signal write when applicable. No collection family, index, Storage path, Function, scheduler, provider, autonomous action, or broad connector was added.

**External evidence:** an issued QA key, real external consumer, hosted endpoint behavior, remote quota enforcement, rotation/revocation readback, customer usefulness, responsive owner-screen proof, and production release approval remain outside local source completion.

### Feature 36 — MCP

**Status:** Local source complete

**Verified flow:** disabled rollout gate -> trusted server/desktop client presents one-time managed `al_*` credential -> exact `mcp:read`, product, purpose, active-workspace, rate, signing-secret, and ready-private-bundle admission -> five-minute audience-bound session -> MCP initialize/version negotiation -> initialized notification/ping -> scope-filtered tool discovery -> strict tool arguments -> current ready-bundle read -> stable bounded structured result -> optional governed missing-context signal with `signals:write`.

**Hardening completed:**

- implemented strict JSON-RPC request, initialize, ping, list, call, notification, Accept, Origin, and supported protocol-version contracts aligned to MCP `2025-11-25`, with compatibility for `2025-06-18` and `2025-03-26`;
- rejected null/fractional request IDs, extra envelope/tool fields, unknown tools, malformed exact IDs, unsupported protocol headers, oversized bodies, and broken oversized tool output;
- replaced broad `public:read` bootstrap authority with explicit rollout-gated `mcp:read`; kept `signals:write` optional and tool-specific;
- audience-bound exact signed claims, required a 32-character signing secret, shortened issued sessions to five minutes, disabled positive credential caching, and fail-closed rate-limited session exchange/tool/signal work;
- exposed only approved compiled product, route, entity, canonical-answer, search, and release evidence through stable `answerlattice.mcp.tool.v1` results with current bundle metadata;
- moved missing-context reporting from the unretained daily dynamic summary map to redacted, retained, replay-safe governed signal events;
- documented that the private bundle is workspace-wide, custom auth is not MCP OAuth, GET/SSE and per-user/per-source ACL projection are absent, and arbitrary/account-changing tools are deliberate non-goals.

**Verification passed:** `npm run verify:answerlattice-mcp`, `npm run test:answerlattice-public-api-contracts`, focused ESLint, strict root TypeScript, Answerlattice typecheck, runtime truth, dependency freeze, docs links, and diff checks.

**Deployment:** No Firestore rule, index, Storage rule, or Cloud Function changed, so no Firebase deploy is required. The Next.js API/UI changes require an explicit Vercel deployment before hosted proof; that deployment is not authorized by the current request.

**Cost and retention:** Successful read calls use the existing private compiled-bundle manifest/object path and in-process object cache. Missing-context reports create at most one existing retained signal row per workspace/query/hour after a separate 30/hour cap. No collection family, summary family, scheduler, listener, or model call was added.

**External evidence:** real MCP client initialize/discovery/calls, an issued QA `mcp:read` credential, hosted Origin/Accept/version behavior, credential rotation/revocation readback, workspace-wide source-audience approval, client-version compatibility, customer usefulness, and production release evidence remain separate from local source completion.

### Feature 37 — Support Truth Export

**Status:** Local source complete

**Verified flow:** enabled Settings action -> POST-only generation -> exact session workspace and hashed user/workspace two-per-hour admission -> fail-closed limiter-provider handling -> `canExportData` permission -> parallel exact `AL`/tenant/store projected reads -> approved/status and translation-review filtering -> explicit citation/content projection -> deterministic section ordering -> cap-plus-one and 8 MiB completeness checks -> server-reserved metadata-only append-only generation audit -> bounded private/no-store browser download.

**Findings and changes:**

- fixed a live projection mismatch: canonical export rows already projected bounded evidence, but the Firestore `.select()` omitted `evidence`, so approved source IDs and citations were always empty;
- added exact `pId = AL` filtering to ordinary collection queries so same tenant/store IDs from another product cannot enter the package;
- replaced arbitrary citation-map export with explicit approved citation fields and safe URL normalization;
- excluded unreviewed AI article translations and reviewer identity while retaining human or human-reviewed translations;
- preserved changelog changed-entity and release linkage so version applicability survives portability;
- kept private source context, embeddings, product/tenant/user identifiers, actor metadata, tickets, conversations, raw audit rows, and unrestricted source records outside the package;
- made rate limiting fail closed when its provider is unavailable and separated that temporary `503 RATE_LIMIT_UNAVAILABLE` result from ordinary `429 RATE_LIMITED` exhaustion;
- added one awaited `support_truth_export_generated` audit row per successful package, containing only product/workspace, actor, schema/type, generated time, counts, completeness, and serialized byte size; export content is never duplicated into audit state, and dedicated/shared rules reserve the action against client forgery;
- made the package self-describing with `exportType`, selection policy, and excluded-data metadata, and changed generation to POST because it writes audit state;
- preserved all-or-nothing behavior: exactly-at-cap data is exportable, collection cap-plus-one or response overflow fails, and audit-write failure prevents delivery;
- added an executable fake-Firestore contract suite for projected evidence, recursive redaction, approved-only filtering, deterministic ordering, exact-cap success, collection overflow, response overflow, and metadata-only auditing;
- retained the existing private Settings surface, `canExportData` permission, streaming browser byte cap, no-store/nosniff response, owner-readable recovery, and no unbounded `response.blob()` path;
- documented that this is governed support-truth portability/review, not a legal data export, backup/restore, account closure, erasure workflow, ticket/chat export, or raw source archive.

**Verification passed:** `npm run test:answerlattice-support-truth-export-contracts`, `npm run test:answerlattice-governance:rules`, `npm run test:answerlattice-governance:shared-rules`, `npm run typecheck:answerlattice`, strict root TypeScript, focused ESLint, Answerlattice runtime truth, documentation-link validation, dependency-freeze verification, and diff integrity.

**Deployment:** Dedicated and shared Firestore rules changed to reserve the export audit action. The scoped commands `firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` and `firebase deploy --only firestore:rules --project menulist-qa --config firebase.json --non-interactive` were attempted after local validation. Both stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote rule revision changed. No index, Storage rule, or Cloud Function changed. The Next.js route/helper/docs require an explicit Vercel deployment before hosted proof; that deployment is not authorized by the current request.

**Cost and retention:** One explicit export performs the existing bounded projected reads and now adds one durable row to the existing append-only audit collection after a valid package is built. It adds no collection, index, Storage object, Function, scheduler, listener, connector, model call, support-credit debit, or exported-content duplication.

**External evidence:** an authenticated hosted founder export, real permission denial, limiter outage/restore, QA audit readback, mobile/desktop download behavior, large-workspace latency, downstream import usefulness, customer value, and production release evidence remain separate from local source completion.

### Feature 38 — Multi-language Articles

**Status:** Local source complete

**Verified flow:** default-off rollout gate -> exact session workspace -> safe mode with private response handling -> fail-closed user/workspace AI rate admission -> `MANAGE_KNOWLEDGE` -> strict 4 KiB request -> normalized article ID and exact `AL` product/workspace scope -> absent target-locale check -> English source extraction and 8,000-character cap -> Gemini -> 64 KiB response cap and strict two-field JSON -> post-provider transaction re-read with repeated product/workspace checks -> unchanged source fingerprint and absent-locale revalidation -> one private source-fingerprinted `draft` write -> bounded private/no-store owner acknowledgement -> single-article refresh.

**Findings and changes:**

- corrected the product classification: current code prepared article translations but had no locale ownership, approval/publish action, fallback, translated retrieval/indexing, public-content projection, widget/hosted-help delivery, or compiled-bundle propagation;
- removed raw provider-text fallback and English-content fallback; malformed, partial, extra-field, empty, truncated, or oversized model output now writes nothing;
- added explicit `draft` status, fixed `en-US` source locale, and SHA-256 source fingerprint to the translation record;
- added a post-provider Firestore transaction that revalidates exact workspace, current source fingerprint, and absence of an existing locale record, preventing stale writes and direct-call overwrite of a draft or future approval;
- required exact `pId: AL` on both the initial and transaction-current article reads so a shared-project ID collision cannot enter the Admin SDK translation path;
- preserved private/no-store and `nosniff` response behavior for safe-mode rejection instead of returning the generic early response directly;
- made limiter-provider failure explicit and fail-closed, retained existing safe mode/permission/body/article/content gates, and made every route response private/no-store with `nosniff`;
- moved provider accounting into a provider-completed `finally` path so malformed output or rejected final writes do not hide model usage;
- removed the KB/context-version bump from private draft generation because no approved customer/runtime consumer reads the draft;
- changed the owner surface from translation/coverage claims to draft/approved state, with an explicit warning that customer publication is absent;
- tightened Support Truth Export so only explicit `approved` plus reviewed translations can enter the governed package; drafts and reviewer identity remain excluded;
- added a complete feature dossier and executable contracts for source hashing, strict parsing, draft content, source/overwrite conflicts, approval classification, public draft exclusion, and approved-export behavior.

**Verification passed:** `npm run test:answerlattice-multi-language-contracts`, `npm run test:answerlattice-support-truth-export-contracts`, focused ESLint, strict root TypeScript, `npm run typecheck:answerlattice`, Answerlattice runtime truth, and focused diff checks.

**Deployment:** No Firestore rule, index, Storage rule, or Cloud Function changed, so no Firebase deploy is required. The Next.js API/UI/helper/docs need an explicitly authorized Vercel deployment before hosted proof; that deployment is not authorized by the current request.

**Cost and retention:** A successful owner draft uses one initial article read, one post-provider transaction read, one article field write, one model call, optional limiter-provider work, up to one existing AI-accounting write, and one single-article UI refresh. Removing the cache/context bump saves two writes. Drafts inherit article retention; no collection, index, Storage object, Function, scheduler, listener, connector, or customer runtime read was added.

**External evidence:** customer demand, fluent review, an approval/publish workflow, locale-aware retrieval/delivery, source-change staleness UX, RTL/accessibility/mobile/browser proof, deployed QA, provider behavior, and production release evidence remain separate from local source completion. The flag stays false.

### Feature 39 — Advanced White Label

**Status:** Local source complete
**Dossier:** `__docs__/answerlattice/advanced-white-label/README.md`

**Verified flow:** default-off rollout flag -> hidden advanced Governance tab -> exact-workspace profile read -> strict stored fallback -> bounded owner fields -> strict client parse -> Answerlattice metadata composition -> exact `branding_{tId}_{sId}` merge write -> dedicated/shared rule validation -> acknowledged private owner state.

**Findings and changes:**

- corrected the product classification: the repository had an owner form and stored profile but no widget, hosted-help, KB, email, public-site, or compiled-context consumer;
- kept the feature default-disabled and separated it from the implemented bounded widget branding authority at `stores/{sId}.widgetConfig`;
- added exact positive scope normalization and exact stored `pId/tId/sId` ownership checks before accepting data;
- added a strict client schema for required name/color/visibility, optional bounded colors, support email, and HTTPS asset/legal URLs without credentials or fragments;
- invalid stored profiles now use safe defaults instead of being cast into trusted UI state;
- removed custom CSS and free-form font fields from the type and owner UI so a future rollout cannot become arbitrary style/code injection;
- removed the false DAL success fallback: Firestore must acknowledge the write before the UI reports a saved profile;
- narrowed both dedicated and shared Firestore rules to an exact top-level and nested allowlist with type, size, color, email, HTTPS, permission, tenant, and document-scope checks;
- made the owner surface responsive and explicitly state that the profile is private and not applied to customer surfaces;
- added focused contract, rules, runtime-truth, data-inventory, cost, mobile, help, marketing, website, and activation-gate documentation.

**Verification passed:** `npm run test:answerlattice-advanced-branding-contracts`, `npm run test:answerlattice-platform-summary:rules`, `npm run test:answerlattice-platform-summary:shared-rules`, focused ESLint, strict root TypeScript, `npm run typecheck:answerlattice`, Answerlattice runtime truth, documentation links, dependency freeze, and diff integrity. The documentation checker reported zero broken links; its existing unrelated uppercase video-artifact naming warnings remain outside this feature.

**Deployment:** Both Firestore rule files changed. The scoped commands `firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` and `firebase deploy --only firestore:rules --project menulist-qa --config firebase.json --non-interactive` were attempted after local validation. Both stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote rule revision changed. App/UI/helper changes require an explicitly authorized Vercel deployment before hosted proof; that deployment is not authorized by the current request.

**Cost and retention:** When disabled, there is no runtime operation. A controlled owner tab load would use one exact document read and a save one merge write. No collection, index, Storage object, Function, scheduler, listener, provider call, cache invalidation, or customer runtime read was added. The private profile has no TTL/client delete and must participate in workspace lifecycle deletion before activation.

**External evidence:** repeated paying-client demand beyond widget branding, one selected consuming surface, asset ownership/availability, accessibility/contrast, cache propagation, mobile/desktop browser behavior, deployed QA rule readback, and production approval remain separate from local source completion.

### Feature 40 — AI Failure Escalation

**Status:** Local source complete
**Dossier:** `__docs__/answerlattice/ai-failure-escalation/README.md`

**Verified flow:** active widget unresolved-answer action -> exact persisted widget search evidence -> strict stored escalation context -> deterministic/idempotent ticket and best-effort signal, independently of automatic evaluator; default-off automatic flag -> bounded canonical/entity/final-answer-cited RAG evidence -> refusal/empty-answer handling -> deterministic soft/hard metadata -> minimal browser suggestion projection with no debug context and no Help Chat ticket callback.

**Findings and changes:**

- preserved the active public widget fallback as the authoritative production-shaped escalation path already audited in Feature 16;
- confirmed the separate automatic evaluator remains disabled by `ENABLE_ANSWERLATTICE_AI_ESCALATION: false` and cannot activate a customer handoff by itself;
- removed browser-supplied `sessionFailureCount` and the `repeated_failure` trigger from request, search, evaluator, and type contracts;
- normalized, bounded, and validated query, canonical, RAG, entity, and product-context evidence; malformed evidence now fails to no automatic suggestion;
- changed automatic evaluation to use only references actually cited by the final answer, so ignored candidate documents cannot mask a refusal or unsupported answer;
- prevented an ordinary canonical miss from creating a false suggestion when the final answer is non-empty and uses strong cited RAG evidence;
- treated empty answers and safe knowledge-base refusals as insufficient evidence and validated projected escalation context with a strict bounded schema;
- removed the Help Chat explicit-intent shortcut, browser ticket DAL call, and suggestion callback instead of leaving a disabled client-authority path available for accidental activation;
- removed internal escalation context from the authenticated Help Center response;
- reserved `source`, `knowledgeCandidate`, `escalationContext`, and `widgetEscalation` to trusted server writers in the browser DAL and both Firestore rule sets; browser tickets always emit ordinary `TICKET` evidence;
- retained the activation requirement for a server-authoritative, explicitly confirmed, deterministic, idempotent Help Chat handoff plus representative quality/usefulness proof;
- added focused evaluator tests, runtime-truth guards, a validation record, and docs/cost/public-claim parity.

**Verification passed:** `npm run test:answerlattice-ai-failure-escalation`, `npm run test:answerlattice-ticket-contracts`, `npm run test:answerlattice-widget-answer-contracts`, `npm run test:answerlattice-widget-escalation:emulator`, dedicated/shared ticket-rules emulators, focused ESLint, strict root TypeScript, `npm run typecheck:answerlattice`, and Answerlattice runtime truth. Documentation links, dependency freeze, and final diff integrity are rerun in the closing gate.

**Deployment:** Both Firestore rule files changed. The scoped commands `firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` and `firebase deploy --only firestore:rules --project menulist-qa --config firebase.json --non-interactive` were attempted after local validation. Both stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote rule revision changed. App/runtime changes require an explicitly authorized Vercel deployment before hosted proof; that deployment is not authorized by the current request.

**Cost and retention:** The disabled automatic path performs no runtime read/write/provider operation. Its evaluator is pure and reuses already loaded final-answer evidence. The active widget path retains the existing Feature 16 exact-document transaction and bounded ticket/signal lifecycles; stricter validation and rules add no read, write, collection, index, listener, scheduler, Function, or retention extension.

**External evidence:** automatic suggestion precision, false-interruption rate, context-complete Help Chat handoff, deterministic server ticket replay, hosted allowed-origin behavior, founder workload reduction, and verified customer resolution remain separate from local source completion.

### Feature 41 — Native Knowledge Intake Connectors

**Status:** Local source complete
**Decision:** Implement one GitHub provider; keep rollout disabled until hosted QA
**Dossier:** `__docs__/answerlattice/native-knowledge-intake-connectors/README.md`

**Verified flow:** owner with integration permission and active subscription -> signed GitHub App install state -> canonical stage callback -> GitHub user authorization verifies installation ownership -> pending installation remains separate from any active connection -> owner selects up to ten repositories and event policy -> bounded signed webhook -> exact repository binding -> active-subscription and replay/daily-cap claim -> compact current-job pointer -> deterministic existing Knowledge Intake job/source -> owner-triggered analysis -> existing source governance, Release-to-Truth, Answer Tests, and publication controls.

**Findings and changes:**

- admitted GitHub only and kept the implementation provider-specific instead of creating a connector framework or catalog;
- added short-lived HMAC state bound to purpose, user, tenant, and workspace, then verified installation ownership through GitHub user authorization before any repository choice is stored;
- fixed callback and return destinations to the stage-specific canonical Answerlattice deployment target instead of trusting an incoming request host;
- bounded every GitHub JSON response and used a GraphQL path-only selection for merged pull requests, avoiding the REST files response that includes patch text;
- separated pending installation data from active connection data, so starting and abandoning a reconnect does not pause the last confirmed repository binding;
- added owner-confirmed repository and event policy, with published Releases on by default and merged default-branch pull-request summaries off by default;
- added a bounded signed webhook with stable delivery hashes, ten-minute failed-processing leases, a 100-event daily workspace cap, and retry-safe deterministic source identity;
- reused the existing active-subscription authority before setup, policy changes, or event claims, preventing provider-triggered writes after entitlement ends;
- stored one bounded monthly rolling-job slot in the compact integration summary, avoiding an increasing scan across earlier full jobs while retaining enough theoretical capacity for the daily cap;
- made that slot pointer monotonic under concurrent completion and collapsed repository-removal handling from up to 100 binding queries to one installation-scoped query plus one transaction per affected workspace;
- reused existing Knowledge Intake redaction, limits, source/job/summary counters, owner-triggered model analysis, source governance, Release-to-Truth, Answer Tests, Daily Brief, and publication controls;
- added one server-only repository-binding collection for exact event fanout and included it in workspace teardown; browser rules deny all reads and writes;
- excluded polling, schedulers, repository clones, content/blob/diff/patch reads, source-code indexing, token retention, event-time model calls, GitHub write-back, and automatic truth/publication;
- kept the outbound GitHub issue adapter independent and kept all public website claims deferred;
- retained the false app flag until GitHub App credentials, exact callback URLs, permission review, signed hosted webhook behavior, and one real workspace are verified.

**Verification passed:** `npm run verify:answerlattice-native-intake-connectors`, strict root TypeScript, `npm run typecheck:answerlattice`, focused ESLint, dedicated and shared Knowledge Intake Firestore rule suites, documentation links with zero broken links, dependency freeze, package parse, and diff integrity.

**Deployment:** The dedicated Firestore rules add an explicit server-only binding collection. The scoped QA deploy was attempted after local verification with `firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` and stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote rule revision changed. App routes and the owner card require an explicitly authorized Vercel deployment for hosted QA; no Vercel deployment is authorized by this task.

**Cost and retention:** No polling, scheduler, listener, Storage object, repository index, or event-time model call exists. Connection load is one existing summary-document read. A selected event performs one bounded binding query, the existing active-subscription lookup, a compact replay/config transaction, and existing job/source/summary writes; inactive, duplicate, ignored, and capped deliveries create no source. One compact month/slot pointer keeps rolling-job lookup effectively constant instead of rescanning prior full jobs. At most 50 delivery hashes remain in the integration summary. Bindings are removed on disconnect, repository removal, installation deletion, and workspace teardown; imported evidence follows existing Knowledge Intake retention.

**External evidence:** GitHub App registration, hosted callback/webhook behavior, real private-repository permission scope, redelivery, repository access changes, one authenticated owner flow, and reduced release-maintenance work remain pending before flag activation or public claims.

### Feature 42 — Signal-Quality Scoring

**Status:** Local source complete
**Decision:** Validate before development
**Dossier:** `__docs__/answerlattice/signal-quality-scoring/README.md`

**Verified flow:** reserved false app flag -> no runtime consumer or Functions mirror -> existing signal mutation flag -> normalized/deduped retained evidence -> bounded production nightly entity clusters -> transparent ticket/negative-chat/escalation counts -> human-reviewed proposal -> manual canonical validation authority; no usage-based confidence mutation.

**Findings and changes:**

- confirmed the separately named signal-quality flag enables nothing and corrected its comment to a reserved-only contract;
- distinguished the production Functions scheduler, which currently uses transparent recent evidence counts, from a legacy/manual app utility that contains severity/time-decay math but has no caller;
- rejected an opaque overall quality or signal-strength score because current data cannot distinguish product defects, user error, customer-specific cases, spam, or knowledge gaps reliably;
- added the escalation count already held by the nightly cluster to newly generated proposal summaries without another read, write, collection, index, or model call;
- updated stored-proposal validation to accept only a bounded non-negative optional escalation count while preserving older proposals;
- changed the review queue to show explicit ticket, negative-chat, and escalation evidence and removed the generic `Signal strength` percentage;
- renamed the ticket-resolution review aid to `Extractor score`, not answer confidence or proof of correctness;
- found and retired a nightly path that raised canonical confidence after 30 serves with no recorded negative feedback, because usage and silence are not correctness evidence;
- found and removed proposal-score propagation into canonical validation during human approval; approved proposal content now uses manual validation authority;
- removed misleading proposal-confidence labels from Slack, email, GitHub, and Linear notifications while preserving transparent signal counts;
- preserved the historical `signal_cluster` validation-source value for read compatibility but removed it as the approval default;
- identified existing canonical answers stamped by `system:confidence_auto_adjust` as a controlled data-verification cohort rather than silently rewriting tenant data;
- added a calibration gate requiring at least 100 reviewed proposals across at least three active workspaces plus segmented approval/edit/rejection evidence before ranking is reconsidered;
- added a complete dossier and executable source gate covering the no-runtime flag, production/legacy split, evidence projection, confidence authority, notification labels, UI claim, public claim, cost, and validation boundary.

**Verification passed:** `npm run verify:answerlattice-signal-quality`, `npm run test:answerlattice-governance-contracts`, `npm run test:answerlattice-governance:emulator`, `npm run test:answerlattice-integration-adapter-boundaries`, Answerlattice Functions TypeScript build, focused ESLint, strict root TypeScript, `npm run typecheck:answerlattice`, the Answerlattice runtime aggregate, dependency freeze, package parse, documentation links, and diff integrity.

**Deployment:** The existing Answerlattice nightly Function source now adds an optional evidence count and retires usage-based canonical-confidence mutation. The scoped QA command `firebase deploy --only functions:answerlatticeNightly,functions:triggerAnswerlatticeNightly --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` was attempted after local verification and stopped before upload with `Error: Failed to authenticate, have you run firebase login?`. No remote revision changed. No Firestore rule, index, or Storage rule changed. No Vercel deployment is authorized.

**Cost and retention:** The reserved scoring feature costs zero. The evidence field reuses an in-memory count and adds no Firestore operation. Retiring confidence adjustment removes one bounded canonical-answer query per processed tenant and removes its possible cache-version write plus canonical-answer batch update. Existing signal TTL and durable proposal retention are unchanged. Historical auto-adjusted answers require verification but no automatic migration was introduced.

**External evidence:** real proposal acceptance, material-edit/rejection, duplicate, false-priority, hidden-high-risk, founder review-time, and customer usefulness evidence remains required before any score or calibrated ranking is built.

### Feature 43 — Native Zendesk, Intercom, Freshdesk, Help Scout, and Jira Connectors

**Status:** Local source complete
**Decision:** Do not build now
**Dossier:** `__docs__/answerlattice/native-helpdesk-and-jira-connectors/README.md`

**Verified flow:** no provider flag/runtime -> no OAuth, credential, provider adapter, webhook, poller, sync worker, setup UI, rule, index, or public claim; selected helpdesk/Jira export, macro, canned reply, or resolved example -> existing bounded intake -> evidence -> human review -> existing governed destination.

**Findings and changes:**

- confirmed no provider-named source file, feature flag, Functions flag, provider credential contract, setup route, or background job exists;
- distinguished existing outbound Slack/email/Linear/GitHub governance delivery from helpdesk/Jira source ingestion;
- confirmed selected exports and repeated replies already serve day-one activation without broad private-system access;
- rejected five-provider breadth because connector count does not prove approved-answer coverage, founder workload reduction, or customer resolution;
- added a complete provider-family dossier with exact permission, revocation, deletion, retry, PII, retention, cost, and human-review admission requirements;
- added an executable recursive source gate for runtime absence, provider logic hidden in generic files, provider-credential absence, alternate public availability wording, documentation, and tracker state;
- set attachments, internal notes, requester profiles, private provider URLs, system events, and unrestricted conversation history outside the first-connector boundary by default;
- set the future threshold to at least three paying workspaces requesting one provider plus demonstrated export friction and a successful concierge proof;
- limited any future implementation to one read-only, selected-resource provider with manual refresh before background sync and no write-back or automatic publication.

**Verification passed:** `npm run verify:answerlattice-native-helpdesk-connectors`, Answerlattice runtime truth, package parse, dependency freeze, documentation links, focused lint, and diff integrity.

**Deployment:** No app runtime, Firebase rule/index/Storage/Functions, provider, or Vercel-deployable customer surface was added. No deployment applies.

**Cost and retention:** Current feature cost is zero. No source, credential, cursor, webhook, provider call, Firestore row, Storage object, scheduler work, or cleanup obligation exists.

**External evidence:** paying-client provider concentration, measured export/import activation friction, provider-specific scopes and limits, concierge outcome quality, ongoing sync demand, and reduced founder maintenance remain required before reconsideration.

### Feature 44 — Autonomous Browser and Account-Changing Actions

**Status:** Local source complete
**Decision:** Do not build
**Dossier:** `__docs__/answerlattice/autonomous-browser-and-account-actions/README.md`

**Verified flow:** approved canonical procedure -> exact semantic target -> non-interactive highlight/scroll -> user action -> exact payload-free client-reported event -> bounded completion/escalation evidence; no independent backend-state proof, action registration, arbitrary selector, code evaluation, synthetic host event, target click, product mutation, or account-changing authority.

**Findings and changes:**

- confirmed Guided Resolution is Explain + Guide only and the end user remains in control of every product action;
- confirmed procedure `action` values are display vocabulary and strict schemas contain no executable action ID, arguments, callback, code, selector, or confirmation authority;
- confirmed the SDK exposes payload-free workflow-event emission and read-only guidance state but no registration or execution method;
- confirmed guidance messages require the configured widget origin and active iframe source, and loader code cannot click elements or submit forms;
- corrected `client-verified` language: the runtime matches a client-reported semantic event to the active served step, but does not independently verify backend state or customer resolution;
- confirmed the host finds exact declared targets, scans a bounded set, uses a non-interactive overlay, and performs only `scrollIntoView`;
- added source comments that prevent future maintainers from treating instructional verbs as an execution dispatch table;
- added a complete non-goal dossier covering product, security, Firebase, mobile, public-claim, help, test, and future admission boundaries;
- added an executable source gate proving no host click/eval/synthetic-event path, no SDK action surface, no executable procedure fields, and no action broker/API paths;
- preserved a separate future option for one reversible registered assist action only after trustworthy answering and guided task completion are proven, with server authorization, confirmation, idempotency, result verification, audit, rollback, and human recovery;
- permanently excluded refunds, charges, subscription changes, roles/permissions, credentials, destructive deletion, irreversible actions, and automatic knowledge publication.

**Verification passed:** `npm run verify:answerlattice-autonomous-action-boundary`, `npm run test:answerlattice-guided-resolution`, Answerlattice runtime truth, widget syntax, Answerlattice web SDK build, focused lint, strict TypeScript, dependency freeze, documentation links, package parse, and diff integrity.

**Deployment:** Only comments, docs, and verifier wiring changed. No Firebase rule/index/Storage/Functions or Vercel deploy applies.

**Cost and retention:** No action runtime exists, so action-specific cost and retention are zero. Existing guided-outcome evidence retains its current bounded search-history/signal behavior.

**External evidence:** real-client task completion, target mismatch, completion time, escalation, support workload, authorization usability, and reversible-action demand remain external. They do not justify autonomous browser or account-changing actions.

## Final C1-C8 System Pass — Refreshed July 26, 2026

**Status:** Local source complete
**Audit:** `__docs__/answerlattice/system-inventory/answerlattice-final-cross-cutting-audit.md`

All 44 feature flows have completed the frozen local audit order. The final cross-cutting pass verified product separation, authorization and tenant isolation, dedicated/shared Firebase policy, retention and recovery contracts, scheduler/cost controls, AI/evidence safety, responsive/mobile source contracts, CI/dependency controls, feature flags, docs, and rollout claims. The July 26 refresh treats Source Governance as a Feature 3 hardening overlay, not Feature 45. The reviewed close/recover/legal-hold/erasure path is C3 lifecycle hardening, not a new numbered feature or customer self-service surface.

The final Functions build found and fixed one compile regression: Slack/email coverage formatting still used the shared bounded ratio helper after its imports were removed with unrelated confidence output. The imports were restored without restoring opaque confidence percentages.

The final July 26 C1 current-worktree recheck preserved the existing product-separation architecture and corrected one stale `verify:env-targets` assertion after the production-readiness checklist adopted the newer provider-resilience and Upstash preflight wording. No Answerlattice runtime, Firebase, cost, or deployment contract changed.

**Final verification passed:** full Answerlattice runtime/emulator truth, final-readiness source gates, dependency/security policy, backup/recovery contracts, founder-support controls, Answerlattice and root strict TypeScript, Functions build, Answerlattice web SDK build, focused adapter contracts, documentation links, and diff integrity. The July 26 refresh additionally passed the Source Governance emulator, Knowledge Intake contract/rule tests, and the workspace-lifecycle contract, dedicated/shared Firestore, dedicated/shared Storage, and service-emulator gates. Dependency freeze also passes on the current worktree after the Gemini runtime migration was reconciled with the pinned dependency contract.

**Deployment evidence:** dedicated QA rules plus `answerlatticeNightly`/`processIntegrationEvent`, shared MenuList QA rules, and the final dedicated/shared Firestore-plus-Storage rule sets were attempted after validation. Every attempt stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote revision changed.

**External release evidence still required:** successful remote CI, QA deploy/readback, managed backup plus isolated restore rehearsal, a disposable QA workspace close/recover/erase rehearsal including dedicated staff Auth and cross-service Storage rule permission, first-client answer evaluation, browser/device/accessibility, live payment/email/provider/DNS journeys, production telemetry, and 1,000+ due-workspace scheduler load evidence.

## Post-Inventory Owner-Relief Expansion — August 10, 2026

The frozen 44-feature inventory remains unchanged. These are additive owner
decision overlays over audited systems, not Features 45+.

### Expansion Items 1-4 — Support Truth Change Control

The existing pending-release flow now contains Release-to-Truth Review, Source
Freshness & Conflict Watch, Cross-Surface Dependency Review, and Truth
Propagation Proof. The dossier is
`__docs__/answerlattice/support-truth-change-control/README.md`.

### Expansion Item 5 — Plan, Role, State & Version Coverage Matrix

**Status:** Local source complete; authenticated hosted responsive QA pending.

**Verified flow:** existing Answer Tests route -> explicit
`includeScopeCoverage=1` -> one Answer Tests summary plus one compact current
source-version document -> pure bounded projection -> strict private browser
admission -> responsive matrix -> existing edit, canonical-only run, and
Canonical Answer Governance handoffs.

**Boundaries:** active owner-defined questions only; explicit contexts only;
no Cartesian context generation, canonical-answer scan, new collection,
persisted matrix, listener, scheduler, Storage object, model call, score,
automatic answer creation, approval, or publication.

**Cost:** the standard requested matrix load is two compact document reads and
zero writes. Existing save/run/release-check operations add one compact
source-version response read when matrix proof is requested; their existing
transaction and test execution costs remain unchanged.

**Dossier:** `__docs__/answerlattice/scope-coverage-matrix/README.md`.

### Expansion Item 6 — Post-Change Support Evidence Review

**Status:** Local source complete; authenticated hosted responsive QA pending.

**Verified flow:** Product Friction Evidence -> explicit **Review recent
changes** action -> bounded active-release and implemented-correction list ->
exact selected-change revalidation -> complete 14-day UTC before/after windows
over directly linked entities -> strict private response -> responsive count
comparison with waiting, insufficient-evidence, source-saturation, and
retention states.

**Boundaries:** support-evidence events only; no unique-user, question,
product-health, root-cause, or causal-release claim. The selected change day is
excluded. Legacy nightly `impactResult.improvementPercent` is not read or
displayed. No automatic 7/14/30-day workflow, persisted outcome, owner action,
notification, issue creation, or publication is added.

**Cost:** zero incremental reads on Product Friction Evidence mount; at most 16
reads when recent changes are explicitly loaded; one exact change plus at most
201 rows per complete window for an eligible comparison. No write, collection,
index, listener, scheduler, Storage object, cache, model, embedding, or external
integration operation is added.

**Dossier:**
`__docs__/answerlattice/post-change-support-evidence-review/README.md`.

### Expansion Item 7 — Owner-Selected Friction Review Continuation

**Status:** Local source complete; authenticated hosted responsive QA pending.

**Verified flow:** Product Friction Evidence -> prepare one bounded evidence
brief -> choose one admitted owner review path -> read the explicit next-action
consequence -> continue into entity-scoped Knowledge Map or trusted answers,
copy locally for product/engineering review, or close without state.

**Boundaries:** the path is a handoff instruction, not a diagnosis. Product
behavior remains an export to the owner's existing execution system. Watch
creates no reminder; no action creates no saved decision. Invalid entity
context and unknown runtime paths fail closed to local copy. No product problem,
task, owner-decision, notification, issue-delivery, or review-path record is
created.

**Cost:** route resolution, helper copy, local export, close, and client
navigation add zero Firebase reads, writes, collections, listeners, schedulers,
Storage objects, providers, integrations, or cache entries. Existing destination
pages retain their bounded reads only after explicit owner navigation.

**Dossier:**
`__docs__/answerlattice/product-friction-intelligence/README.md`.
