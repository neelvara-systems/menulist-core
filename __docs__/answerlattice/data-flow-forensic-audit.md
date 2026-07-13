# Answerlattice Data-Flow Forensic Audit

**Status:** Complete local forensic audit; QA deployment blocked by external IAM  
**Started:** July 11, 2026  
**Runtime authority:** current source code, Firebase rules/indexes, focused tests, and executable verifiers  
**Product boundary:** Answerlattice (`AL`); legacy Canonica names are compatibility-only unless a runtime namespace still requires them

## Completion Contract

This audit is complete only after every Answerlattice data-producing, transforming, persisting, and consuming flow has been traced in both directions; confirmed defects are fixed; affected flows are restarted from their entry points; and all objective gates either pass or have a precise external blocker.

Current convergence state:

| Measure | Current value |
| --- | --- |
| Complete Answerlattice audit passes | 1 |
| Consecutive clean Answerlattice passes | 1 |
| Current verdict | Controlled-beta-ready |
| Root lint baseline | Passed |
| Answerlattice Functions build baseline | Passed |
| Answerlattice runtime-truth baseline | Passed before changes, after remediation, and in the final clean pass |
| Root TypeScript baseline | Passed in the final clean pass |

The shared worktree was already heavily modified before this audit. Unrelated changes are user-owned and are not reverted or attributed to this audit.

## Inventory Method

The code-derived inventory is built from:

- Next.js route handlers under `src/app/api/answerlattice`, `src/app/api/widget`, and Answerlattice-compatible Help Center routes.
- Management routes under `src/app/(answerlattice)` and public routes under `src/app/sites/answerlattice`.
- Answerlattice DAL, hooks, runtime libraries, shared billing/auth bridges, and Firebase client/Admin initialization.
- `functions-answerlattice/src` exports, triggers, schedulers, services, and shared constants.
- `firestore-answerlattice.rules`, `firestore-answerlattice.indexes.json`, `storage-answerlattice.rules`, and `firebase-answerlattice.json`.
- Direct Firebase/Admin access scans plus the repository collection catalog generator. Automation inventories files and contracts; it never substitutes for the manual forward/reverse trace recorded below.

Current discovered API boundary: 62 Answerlattice, widget, and Help Center route files. Current dedicated Answerlattice index boundary: 97 composite indexes across 31 collection groups plus 12 field overrides. Counts are regenerated during the final pass and are not completion claims.

## Flow Ledger

### AL-DF-ONBOARD-001 — Public signup to paid workspace activation

**Status:** Remediated and re-audited; local contract gates pass.

**Entrypoints and consumers**

- Public form: `src/app/sites/answerlattice/get-started/OnboardingForm.tsx`
- Protected API: `src/app/api/answerlattice/onboard/route.ts`
- Scope/session bridge: `src/lib/answerlattice/sessionScope.ts`, `src/lib/auth/index.ts`
- Tenant/store allocation: `src/lib/onboarding/createTenantStore.ts`
- Provisioning state and compensation: `src/lib/answerlattice/onboardingProvisioning.ts`, `src/lib/answerlattice/onboardingProvisioningServer.ts`
- Billing/provider: Answerlattice plan constants, Razorpay plan handler/client, `subscriptions`
- Widget key state: `src/lib/answerlattice/widgetKeyManager.ts`, hashed with the public-key authentication boundary
- Post-commit summaries: tenant summary, product-surface context summary, compiled-context source versions

**Verified data flow**

Google session → bounded 32 KB JSON → strict Zod request validation → paid-plan validation → dedicated/shared Answerlattice DB selection → canonical user lookup → deterministic request fingerprint → Firestore transaction that claims user and creates provisional tenant/store/user → Razorpay plan lookup/create → Razorpay subscription create or bounded attempt recovery → Firestore transaction that validates provisional ownership and atomically writes subscription + hashed widget state + payment-pending lifecycle → default-auth `productAccounts.AL` bridge → best-effort surface/summary/compiled-context bootstrap → bounded response with one-time raw widget key.

**Auth and scope**

- Protected by `withAuth`.
- User document ID comes only from the authenticated session and passes the Firestore document-ID boundary.
- `tId` and `sId` are server allocated; browser values cannot select scope.
- The transaction re-reads the canonical user document before allocation so concurrent submissions cannot create two active workspaces.
- Subscription persistence re-reads tenant, store, user, and subscription documents and verifies attempt ID, request fingerprint, `AL` product identity, and exact tenant/store ownership.

**Lifecycle**

`provisioning` → `payment_pending` on atomic local persistence. Any pre-completion failure moves the provisional tenant/store/user to `payment_provider_failed`; access scope is removed from the Answerlattice user document and inactive summary entries are written. Paid subscription activation remains webhook-owned.

**Failure and retry behavior**

- A second request during a fresh attempt receives a stable `409` setup-in-progress response.
- A stale matching attempt can resume only when the request fingerprint is identical.
- Razorpay does not document idempotency for subscription creation. The route therefore writes a unique attempt ID into provider notes and, only after a create error or stale resume, searches a 30-minute bounded provider window (100 rows per page, maximum three pages) for the exact product/plan/tenant/store/attempt match.
- If a provider subscription ID is known but local completion fails, the route attempts immediate provider cancellation and records whether cancellation remains pending.
- If Firestore persistence completed but the HTTP response was lost, a retry repairs the auth product-account bridge without exposing a stored key. The UI explicitly requires widget-key rotation because only the hash is retained.
- Logs and nonessential surface/summary/bootstrap writes cannot falsely fail a completed workspace.

**Firestore cost boundary**

- Healthy first attempt: one canonical user read, one provisional allocation transaction, one atomic subscription/widget transaction, and bounded post-setup writes.
- No listener, collection scan, scheduler task, or per-item fan-out was added.
- Provider recovery list calls occur only after an ambiguous provider failure or stale provisioning resume; they are capped at three pages and do not add Firestore reads.
- Failure compensation adds one bounded transaction only on failed provisioning.

**Defects fixed**

| Severity | Root cause | Fix |
| --- | --- | --- |
| Critical | Tenant/store/user were committed before provider creation; a provider failure stranded an account that all retries rejected. | Added explicit provisioning lifecycle, attempt ownership, compensation, and safe retry/resume behavior. |
| Critical | Duplicate requests could pass the pre-check and allocate multiple workspaces because duplicate detection was outside the creation transaction. | The canonical user document is now read and claimed inside the allocation transaction. |
| High | Provider subscription and store widget/subscription summary were separate writes. | Persisted them in one scope-validating Firestore transaction. |
| High | The provider request sent more note fields than Razorpay's documented 15-pair maximum. | Removed duplicate/internal aliases and retained 12 bounded correlation fields. |
| High | A provider success followed by local failure could leave a billable orphan. | Added immediate cancellation and durable cancellation-pending evidence on compensation. |
| Medium | Successful API response exposed internal tenant/store identifiers that the browser did not use. | Response now returns an explicit workspace-created contract without raw scope IDs. |
| Medium | Billing types required timestamps while pending subscription documents stored `null`; Answerlattice onboarding source was missing from the union. | Aligned the shared persisted subscription type with the actual lifecycle. |

**Verification**

- `npm run test:answerlattice-onboarding-provisioning` — passed.
- Focused Next lint for route, form, provisioning helpers, and billing type — passed.
- `npm run verify:answerlattice-runtime-truth` — passed after verifier alignment.
- Full root TypeScript passed after the governance-contract remediation.

**Re-audit result**

The route was restarted from the public form after the fix. Request validation, session-derived identity, transaction ordering, provider correlation, atomic persistence, one-time key behavior, compensation, response parsing, and existing-workspace handling were re-traced. No known onboarding defect remains in the locally testable path. Real provider timeout timing, deployed Firebase credentials, and live Razorpay cancellation remain external integration proof and will be listed in the final limitations section unless exercised later.

### AL-DF-GOVERNANCE-001 — Proposal creation, review, canonical mutation, drift validation, and entity merge

**Status:** Remediated and re-audited; app, contract, and dedicated/shared rules gates pass.

**Entrypoints and consumers**

- Canonical editor and hooks: `CanonicalAnswerEditor.tsx`, `useCanonicalAnswers.ts`
- Mutation queue and hooks: `MutationProposalReview.tsx`, `useMutationProposals.ts`
- Browser DAL/read models: `canonicalAnswers.ts`, `mutationProposals.ts`, `entities.ts`
- Protected action API: `src/app/api/answerlattice/governance/actions/route.ts`
- Runtime contracts and executor: `governanceContracts.ts`, `governanceClient.ts`, `governanceServer.ts`
- Persistence boundaries: canonical answers, mutation proposals, entities, relations, entity search index, audit logs, cache version/source-version/bundle-manifest summaries
- Firebase authority: both `firestore-answerlattice.rules` and shared-mode `firestore.rules`

**Verified data flow**

Owner edit or generated draft -> browser submits a strict governance action -> authenticated route resolves the Answerlattice product account -> scoped rate limit -> `canManageGovernance` authorization -> bounded 64 KB body -> strict Zod action schema -> Admin Firestore transaction -> stored proposal/runtime candidate validation -> tenant/store/product checks -> entity binding and active-overlap checks -> canonical write plus proposal lifecycle transition plus immutable audit entry plus cache/source-version/context invalidation -> bounded, no-store response -> client Zod response validation -> owner queue refresh.

Canonical truth is never written from the browser. New and edited answers first create `pending_review` mutation proposals. Approval either applies a complete, validated answer atomically and marks the proposal `implemented`, or marks a non-applicable review item `approved` for an external/manual action. An applicable canonical change cannot be bypassed with `mark_implemented`.

**Auth, scope, and stored-data integrity**

- Trusted scope comes from the authenticated Answerlattice access context; action payloads contain no tenant/store selectors.
- Proposal, answer, entity, relation, search-index, and audit documents are checked for exact `AL` product, tenant, and store ownership before use.
- Persisted mutation proposals are decoded with a runtime schema before UI consumption and again inside the server transaction before canonical mutation.
- Governance responses are decoded with a strict runtime schema so internal fields or malformed success payloads are rejected by the client.
- Dedicated and shared Firebase rules both deny browser canonical create/update, deny browser proposal lifecycle updates, and reject cross-workspace/cross-product records.

**Concurrency and idempotency**

- Manual proposal creation uses a deterministic proposal document per scoped request ID and stores a SHA-256 payload fingerprint. Reusing a request ID with different content fails with `409` instead of returning the wrong proposal.
- Proposal approval is transactionally idempotent after implementation and returns the already implemented answer ID.
- Legacy `approved` proposals that contain an applicable canonical change can be safely resumed through approval; direct implementation marking is blocked.
- Entity merge has an operation audit lock derived from scope, entity IDs, and request ID. A retry returns the recorded transfer counts.

**Firestore cost and scale boundary**

- Normal proposal creation: one proposal read plus one proposal write and one audit write in a transaction.
- Normal approval: proposal read, target answer read when applicable, one release query, up to 25 exact entity reads, one bounded active-answer overlap query, then atomic answer/proposal/audit/invalidation writes.
- Active-answer overlap checks read at most 501 records and fail closed above the supported 500-answer review boundary instead of silently approving from an incomplete set.
- Entity merge now queries only answers, relations, and search-index rows that reference the two entities. Every query includes tenant and store filters, uses dedicated composite indexes, reads one extra sentinel row, and fails closed above 200 references or 10 search-index rows. It no longer reads up to 500 unrelated answers or cross-tenant relation/index rows.
- No realtime listener, unbounded scan, or automatic publication was added.

**Defects fixed**

| Severity | Root cause | Fix |
| --- | --- | --- |
| Critical | Shared-Firebase rules allowed direct browser canonical writes and proposal status changes although dedicated rules made governance server-authoritative. | Mirrored the canonical/proposal/audit authority boundary and role-aware access into shared rules; added emulator coverage for both modes. |
| High | Entity merge relation and search-index queries filtered tenant/store only after globally querying by entity ID, allowing cross-tenant reads to consume caps and hide in-scope rows. | Added tenant/store predicates to every merge query and required scoped composite indexes in dedicated and shared index files. |
| High | Capped overlap/merge queries silently proceeded when the cap was reached, risking partial transfer or missed overlap. | Read one sentinel row and fail closed before any write when a supported bound is exceeded. |
| High | Stored proposal documents and API success responses were trusted through TypeScript casts. | Added strict runtime decoding at Firestore and HTTP boundaries. |
| High | `mark_implemented` could bypass applying an already-approved proposal that still contained a canonical change. | Added a server lifecycle guard and safe legacy-resume path through governed approval. |
| Medium | Reusing an idempotency request ID with changed answer content returned the first proposal without detecting payload drift. | Added deterministic request fingerprints and conflict handling. |
| Medium | Knowledge Intake could create a 1,200-character canonical summary although the frozen answer contract allows 500. | Aligned intake proposal generation to the canonical 500-character bound. |

**Verification**

- `npm run test:answerlattice-governance-contracts` - passed.
- `npm run test:answerlattice-governance:rules` - passed against dedicated rules.
- `npm run test:answerlattice-governance:shared-rules` - passed against shared rules.
- `npm run verify:answerlattice-runtime-truth` - passed after replacing obsolete direct-write assertions with the server-owned governance contract.
- Focused ESLint and `git diff --check` - passed.
- Root TypeScript - passed after replacing the invalid Zod discriminated-union refinement and an invalid public-demo icon export.

**Re-audit result**

The flow was restarted from canonical create/edit, proposal list/read, proposal approval/rejection/implementation, drift record/validation, and entity merge. Browser authority, request/response contracts, persisted proposal decoding, transaction state gates, scope checks, query bounds, cache invalidation, UI messaging, and both Firebase rule modes were re-traced. No known critical/high governance-action defect remains in this locally testable flow. Release-triggered and nightly drift computation were subsequently verified under the scheduler/drift flow in the consolidated ledger.

## Consolidated Runtime Ledger

The detailed traces below summarize the forward path, reverse writer/read-model check, authority model, and bounded cost behavior verified in the current worktree. They do not replace the focused flow sections above.

| Flow | Runtime path and persisted data | Authority and bounded behavior | Current result |
| --- | --- | --- | --- |
| Public website and forms | Answerlattice host/dev rewrites -> public pages -> contact/get-started APIs -> contact enquiry or onboarding | Public contact is bounded, strict, rate-limited, TTL-backed; signup becomes authenticated before provisioning | Verified locally |
| Workspace/profile/activation | Dashboard -> access provider -> workspace/profile or activation APIs -> store + platform summaries | Session product account supplies scope; summary reads are fixed/capped and no-store | Verified locally |
| Staff and roles | Team UI -> staff APIs -> dedicated user, default-auth bridge, Auth claims, store role array | Strict 16 KB requests; tenant-before-cap query; deterministic passcode replay; transaction-backed role writes; 25 custom-role cap | Remediated; typecheck passed |
| Product surfaces/context | Surface UI/API -> scoped surface docs -> contextContent summary/source version | Knowledge permission, exact `AL/tId/sId`, bounded maps, explicit rebuild | Verified locally |
| Widget management/runtime | Owner config/key rotation -> hashed key state -> public config/search/feedback -> canonical/RAG response | Raw key is one-time only; malformed keys short-circuit; origin/route/token/rate boundaries fail closed | Verified by runtime contracts |
| Knowledge Intake | Upload/URL/manual input -> source/job/storage -> extraction/OCR/transcription -> review items -> owner action -> article/FAQ/proposal | Paid media work is ledger-backed; jobs, files, chunks, URLs, AI output, retries, and reads are capped; no auto-publish | Verified by contracts, emulator, rules |
| KB publish/embedding | Reviewed article -> server publication -> article + category/index updates -> embedding task -> vector field/status | Server-owned publication; deterministic job/article identity; failed embedding remains observable/retryable | Verified by emulator/contracts |
| Search/RAG | Query/image -> strict request -> canonical-first retrieval -> cache/embedding/vector fallback -> grounded answer -> history/analytics/signal | Trusted session/widget scope; source-version cache freshness; bounded vector/results/context; AI accounting and no-answer path | Verified by retrieval/cache/accounting tests |
| Tickets | Customer/owner action -> ticket DAL/API -> status/message history -> fallback/signal consumers | Central transition contract, bounded history/messages/listeners, exact workspace and actor rules | Verified in both rule modes |
| Chat/analytics/ROI | Chat session -> bounded messages/quality -> aggregate analytics/digest/ROI APIs | Exact product/workspace scope, bounded date ranges and lists; aggregate reads preferred | Verified in both rule modes |
| Releases/changelog | Owner release/changelog action -> server transaction/index -> public view/feedback -> drift linkage | Release/changelog lifecycle is server authoritative; pages and feedback are capped and scoped | Verified by contracts/emulators/rules |
| Feedback | General/content/widget feedback -> validated record -> signal emission/analytics | Self-actor and management permissions are separate; duplicate and list growth are bounded | Verified in both rule modes |
| Ontology | Candidate/entity/relation APIs -> counter/index updates -> governed promotion -> retrieval | Server-owned entity lifecycle, exact scope, deterministic IDs, capped counters and reference queries | Verified by contracts/emulator/rules |
| Canonical governance | Draft/edit -> mutation proposal -> human review -> answer/version/audit/cache invalidation | No browser canonical writes; no auto-publish; transaction and idempotency guards | Remediated and verified |
| Drift/signals/mutation | Search/ticket/feedback/release -> deterministic signal -> nightly bounded clustering/drift -> proposal/draft -> owner review | Human validation alone clears drift; ambiguous clusters do not mutate; generated drafts remain pending | Verified by contracts and Functions build |
| Support Board | Manual/source card -> bounded DAL -> notes/status history -> answer proposal | Source sync remains feature-gated; card shape/history/source identity now enforced in both rules modes | Remediated; emulator rules passed |
| Predictive/graph | Nightly trigger/graph summaries -> widget predictive endpoint/retrieval expansion | Exact summary scope is runtime-decoded; widget avoids unenabled path; graph/predictive inputs and outputs are capped | Verified by summary contracts |
| Workflow integrations | Nightly/test event -> deterministic event -> Function claim -> adapter -> deterministic delivery log/health | Config secrets are server-only; transaction claim prevents duplicate delivery; retries only for explicit safe transport failures | Remediated; rules and Functions build passed |
| Scheduler | Hourly/manual entry -> registry discovery -> task/tenant leases -> nightly subtasks -> run/state logs | Scoped manual trigger; independent tenant settlement; bounded fallback; one scheduler export | Remediated; scheduler contracts passed |
| Tenant registry | Lifecycle writer -> deterministic shard -> legacy+shard merge -> scheduler/platform selector | 64 fixed shards remove hot/oversize root; shard tombstones override legacy entries; reads capped at 65 | Remediated; migration-compatible |
| Public API/MCP | API key/session -> strict request -> canonical/entity/signal bundle path | Both remain rollout-gated; enabled paths validate key/session, schema, scope, rate, and durable signal acceptance | Hardened; intentionally disabled publicly |
| Retention/cleanup | TTL fields/policies + nightly Storage bundle cleanup | Firestore TTL replaces empty nightly scans; bundle version watermark skips unchanged listings and incomplete runs do not advance it | Remediated |
| Firebase modes | Dedicated client/Admin/functions/rules/index/storage plus shared recovery mode | Dedicated indexes are now an exact subset of shared indexes; TTL and managed-collection permissions are mirrored | Remediated; rule matrix passed |

## Additional Defects Fixed In The Current Pass

| Severity | Root cause | Correction and proof |
| --- | --- | --- |
| High | Staff list/last-owner/role checks applied the 500-document limit before tenant filtering. | Added tenant predicate and dedicated/shared composite index; root TypeScript and runtime verifier pass. |
| High | Owner-passcode staff creation could duplicate users after a lost response and could return a newly generated passcode for an already-existing Auth identity. | Added stable request identity/fingerprint, deterministic managed login, replay conflict detection, and no secret replay. |
| High | Shared Firebase rules granted broad same-workspace access where dedicated rules required feature permissions, and omitted three Answerlattice collections. | Mirrored integration, predictive, surfaces, FAQ, cache, readiness, Support Board, AI-operation, and notification authority; dedicated/shared emulator matrix passes. |
| High | Support Board limits existed only in client code. | Rules now cap title, description, tags, notes, status history and preserve source identity; negative emulator tests pass. |
| High | One tenant-summary map was a hot document with eventual 1 MiB failure. | New writes use 64 deterministic shards; readers merge the legacy root first and shard overrides second; fallback remains bounded. |
| Medium | Seven dedicated query indexes and eleven TTL overrides were absent in shared mode. | Mirrored the exact definitions; machine comparison reports zero missing dedicated indexes or overrides. |
| Medium | Several authenticated/public request schemas silently stripped unknown fields. | Made exposed route schemas strict, including onboarding, profile, integrations, translation, platform intake, rebuild, FAQ, and extraction boundaries. |

## Final Verification And Verdict

**Verdict: Controlled-beta-ready.** No known critical or high-severity source defect remains in the audited Answerlattice flows. The application, dedicated Functions, runtime contracts, dedicated/shared Firebase rule matrices, Storage rule compilers, index/TTL parity, documentation links, and production build pass locally. The system is not classified as production-ready because the changed Firebase infrastructure could not be uploaded to QA and live provider behavior was not exercised with production credentials.

Final source gates:

- `npx tsc --noEmit --incremental false --pretty false` - passed.
- `npm run lint` - passed with no warning or error.
- `npm run build` - passed with exit code 0 after raising the reproducible local heap ceiling from 6 GB to 10 GB; 439 static pages generated.
- `npm --prefix functions-answerlattice run build` - passed.
- `npm run verify:answerlattice-runtime-truth` - passed, including its onboarding, scheduler, integrations, summary, release, KB, retrieval, widget, MCP, ticket, signal, governance, founder-control, and recently-viewed child contracts.
- `npm run docs:check-links` - passed for 2,363 documents and 4,230 links.
- `npm run verify:dependency-freeze` - passed.
- Dedicated and shared Firestore rule emulators for governance, intake, integrations, Support Board, tickets, chats, analytics, signals, ontology, feedback, and releases - passed.
- Dedicated and shared Storage rules compilation - passed.
- Dedicated index/TTL definitions are an exact subset of shared mode: zero missing indexes and zero missing overrides.
- `git diff --check` - passed on the final shared worktree.

Deployment proof:

- `firebase deploy --only firestore:rules,firestore:indexes,storage,functions --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` completed the Functions predeploy build, then failed before upload with HTTP 403: project not found or permission denied while checking the Storage API.
- `firebase deploy --only firestore:rules,firestore:indexes --project menulist-qa --config firebase.json --non-interactive` failed before upload at the Firestore Rules API test call with HTTP 403: caller lacks permission.
- No QA infrastructure was changed by either failed command. Retry only after the active Firebase account receives project visibility, Service Usage, Firestore Rules, index, Storage, and Functions deployment permissions.

Externally unverified boundaries:

- Live Razorpay ambiguous-success recovery/cancellation, SMTP delivery, Slack webhook delivery, Gemini provider execution, and deployed scheduler behavior require valid QA secrets and project access.
- Public API and MCP remain intentionally rollout-gated. Multi-language, white-label, AI escalation, guided workflows, and optional Support Board source sync remain disabled unless explicitly enabled.
- Build-time static workers reported that some workers had no Gemini key while configured runtime workers found one. The build passed and no secret was exposed, but deployment environment parity should be checked before production traffic.

Firestore cost conclusion:

- No new realtime listener or unbounded collection scan was introduced.
- Staff queries now apply tenant scope before their 500-record cap.
- Tenant discovery uses one legacy read plus populated deterministic shard reads, capped at 65, avoiding the previous hot and eventual 1 MiB registry document.
- Integration event claiming adds one transaction read/write per event but prevents duplicate external delivery and duplicate provider cost.
- TTL policies remove expired operational documents without scheduled empty-query scans.
- Support Board rule hardening adds no reads or writes. Shared index parity adds index storage/write amplification only for matching shared-mode writes and prevents missing-index runtime failures.
