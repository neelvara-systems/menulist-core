# Knowledge Intake Command Center — Test Cases

> **Status:** IMPLEMENTED — day-one regression matrix plus future extension matrix
> **Version:** 2.3.0
> **Created:** 2026-05-31
> **Audience:** QA / Engineering / Product

---

## 0. Day-One Implemented Acceptance Tests

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-D1-001 | Open `/answerlattice/knowledge-intake` with Answerlattice management permission | Page loads the Answerlattice-owned **Teach Answerlattice** command center. |
| KICC-D1-002 | Open legacy `/answerlattice/kb-generation` | Route redirects to `/answerlattice/knowledge-intake`. |
| KICC-D1-003 | Non-licensed workspace attempts create/source/discover/analyze/review/publish mutation | API blocks with `402` before URL fetch, draft analysis, or publish writes. |
| KICC-D1-004 | Owner imports a public website link | API rejects private/local hosts, fetches only capped public content, and creates a selected source only after owner action. |
| KICC-D1-005 | Owner imports browser-extracted file text | Source doc stores capped extracted text and compact metadata; no raw Storage upload occurs. |
| KICC-D1-006 | Owner analyzes ready sources | Review items are bounded by job caps and remain owner-reviewable. |
| KICC-D1-007 | Owner accepts and publishes a KB item | Writes `kb_articles`, updates `kb_categories`, bumps KB freshness, and triggers context summary rebuild/cache invalidation. |
| KICC-D1-008 | Owner publishes an FAQ item | Writes `answerlattice_faqs`; runtime search can use FAQ/custom-answer retrieval before vector fallback. |
| KICC-D1-009 | Owner publishes a canonical-answer draft | Creates `answerlattice_mutationProposals`; no active canonical answer is auto-published and compiled `canonical` runtime context is not marked stale. |
| KICC-D1-010 | Owner publishes a product surface item | Writes the existing product-surface path and marks related compiled-context sources stale. Changelog entries are not an intake publish target. |
| KICC-D1-011 | User loads jobs/review lists | Reads are bounded and API-driven; no realtime Firestore listener is used. |
| KICC-D1-012 | Owner uploads a supported screenshot | API reserves 1 support credit, validates signature, extracts support text, writes a source, logs AI operation, settles ledger, and does not retain raw media. |
| KICC-D1-013 | Owner uploads a short supported audio/video file | API reserves 2 support credits, validates signature, extracts support transcript/summary, writes a source, logs AI operation, and settles ledger. |
| KICC-D1-014 | Media extraction fails after credit reservation | Ledger marks `failed_refunded`; same-period monthly and top-up debits return exactly once. After a billing-period rollover, expired monthly credits are recorded but not added to the new cycle, while top-up credits still return. |
| KICC-D1-015 | Finalize/refund receives a ledger ID from another workspace, or races the other transition | Reject the scope mismatch; only the first transaction from `reserved` may settle or refund, with no cross-workspace balance write. |
| KICC-D1-016 | Answerlattice nightly runs with intake scheduler flag on | It refreshes `platformSummary/knowledgeIntakeSummary_{tId}_{sId}` from latest bounded job docs only; it does not retry failed jobs, crawl, call AI, or publish. |
| KICC-D1-017 | Platform admin opens `/platform/answerlattice-intake` | Screen loads `answerlatticeTenantsSummary` and recent scheduler logs first; intake jobs and ledger rows are not read until one workspace is selected. Non-platform users are denied. |
| KICC-D1-018 | Owner tries to accept or select a changelog review target | UI keeps legacy changelog drafts display-only, disables acceptance, and the API rejects crafted changelog publish-target updates because changelog entries are owner-managed release content. |
| KICC-D1-019 | TypeScript validation | `npx tsc --noEmit --incremental false` passes. |
| KICC-D1-020 | A second source produces the same review draft | Existing owner edits/status remain unchanged while the bounded top-level `sourceIds` union gains the corroborating source. |
| KICC-D1-021 | Nested source or usage metadata contains credentials, tokens, emails, or card-like values | Recursive sanitizer redacts sensitive strings and enforces depth/key/array/string caps before Firestore writes. |
| KICC-D1-022 | URL source contains credentials, sensitive query keys, or local/private/reserved destination | Source creation rejects before persistence or fetch, including when `contentText` was supplied directly. |
| KICC-D1-023 | Owner publishes an FAQ from Knowledge Intake | Destination stores declared `knowledge_intake` source plus intake lineage and remains eligible for normal FAQ retrieval. |
| KICC-D1-024 | DOCX archive metadata uses strings/booleans or a throwing getter | Browser extraction fails closed before expansion; only exact safe-integer compressed/uncompressed sizes reach ratio and byte checks. |
| KICC-D1-025 | Source metadata contains non-finite numbers, invalid Dates or a hostile object | Invalid scalar edges become `null` or the hostile top-level object becomes `{}`; Firestore writes and diagnostics do not retain coerced/infinite values. |
| KICC-D1-026 | Required product-surface summary rebuild fails after a deterministic article/FAQ/surface destination is created | Publish rejects; the review item remains accepted with the exact target marker. Retry rebuilds the summary, runs cache/source/public freshness, and only then marks the item published without duplicating the destination. |
| KICC-D1-027 | A summary source has a malformed, coercible or throwing timestamp value | Related-content ordering contains the invalid edge and completes; strings/booleans cannot become invented Firestore chronology. |

The sections below preserve the broader long-term matrix. Native helpdesk/OAuth connectors, retained raw-media Storage artifacts, discovery/evidence/publish manifests, source deletion/retention, cancellation, intake-specific source-version counters, and scheduler directory repair remain future-extension tests. Screenshot OCR, short media transcription, support-credit ledger charging, bounded multi-source lineage, nested metadata redaction, selected-URL admission, FAQ retrieval, and summary-only scheduler analytics are implemented runtime claims.

## 1. Entitlement And Cost Gates

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-ENT-001 | User has no active paid subscription and starts URL import | API blocks before source fetch; no Storage write, AI call, or job execution. |
| KICC-ENT-002 | Active plan has insufficient support credits for a paid intake operation | API rejects before provider work; no `paused_limit` state is claimed and the owner receives the fixed credits/payment response. |
| KICC-ENT-003 | User adds source above file/page cap | Preflight rejects with exact limit message. |
| KICC-ENT-004 | Static demo viewed by anonymous visitor | No customer data processing and no Firestore write. |
| KICC-ENT-005 | User starts an overlapping analysis/launch-pack/publish or media run before its current lease expires | API rejects the overlapping run; no duplicate provider work starts for that job/source operation. |
| KICC-ENT-006 (future) | Job is cancelled before provider work | Reserved unused credits are released and job cannot continue hidden processing. No current cancellation API exists. |

---

## 2. Source Intake

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-SRC-001 | Add product website and app URL | Bounded discovery candidates are returned without persistence; selected URLs can become sources, while the app URL is setup/surface context and is not crawled behind login. |
| KICC-SRC-002 | Upload text-based PDF, DOCX, Markdown, TXT, CSV, or JSON | Accepted files are extracted before server source creation and no raw Storage artifact is retained. |
| KICC-SRC-003 | Upload unsupported ZIP/XLSX/PPTX/YAML/HTML file | UI/API rejects or requires owner to convert to a supported text/export format. |
| KICC-SRC-004 | Upload screenshot with visible sensitive data warning | UI warning shown before upload; source treated as evidence, not direct truth. |
| KICC-SRC-005 | Upload transcript file | Transcript source normalizes without raw media processing. |
| KICC-SRC-006 | Upload raw video over plan duration cap | Preflight rejects or asks for plan upgrade before upload/transcription. |
| KICC-SRC-007 | Import helpdesk CSV export | Treated as support history/evidence; PII redaction warning shown. |
| KICC-SRC-008 | Uploaded source contains API keys or private customer data | Deterministic privacy filter redacts sensitive values before storage/provider use and records redaction metadata on the source. |
| KICC-SRC-009 | Upload the same screenshot/audio/video twice in one job | Raw media hash dedupe returns the existing source without provider extraction, usage-ledger writes, or source counter increments. |
| KICC-SRC-010 | Upload an oversized browser-extracted text file | UI rejects before parsing/sending; accepted text is capped to the server source-text limit before API submission. |

---

## 3. URL Security

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-URL-001 | URL points to localhost/private IP | Server rejects before fetch. |
| KICC-URL-002 | URL redirects to private IP | Server validates the redirect target before following it and rejects the import. |
| KICC-URL-003 | Site has sitemap with many pages | Discovery returns only the capped candidate count and creates no source documents. |
| KICC-URL-004 | Page response exceeds size cap | Fetch fails with fixed safe copy before a source document is created; owner can paste reviewed text instead. |
| KICC-URL-005 (future) | Robots policy support is introduced | The approved robots contract is enforced before crawl. Current discovery does not claim robots.txt interpretation. |
| KICC-URL-006 | Site has sitemap, pricing, docs, legal, and changelog links | Bounded response candidates carry heuristic roles; no manifest or Firestore source docs are created until the owner selects pages. |
| KICC-URL-007 | Owner selects 8 pages from 80 discovered links | Only 8 selected pages create source docs and count against URL page allowance. |
| KICC-URL-008 | URL contains tracking params or fragments | Canonical URL normalization strips tracking params/fragments before dedupe/hash. |
| KICC-URL-009 | Selected page is re-imported with identical normalized URL and extracted text in the same job | Deterministic source ID returns the existing source; counters and review evidence do not duplicate. |
| KICC-URL-010 | Product app login URL is supplied | URL is stored as job context only; no credentialed crawl or private dashboard scan occurs. |

---

## 4. Source Governance And Product Map

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-AUD-001 | Pricing page conflicts with old PDF | Owner can link the conflicting same-job sources; canonical acceptance and publication stay blocked without silently choosing authority. |
| KICC-AUD-002 (future) | Product has no refund policy | Evidence-backed knowledge-gap review is created. |
| KICC-AUD-003 (future) | Product has clean docs | A reviewed product map can be proposed without becoming automatic truth. |
| KICC-AUD-004 (future) | No docs, only product URL and policy notes | Missing evidence stays explicit; no product map is invented. |
| KICC-AUD-005 | Owner reviews a source | Authority, owner, approval, access, citation, applicability, dates, conflicts, reviewer, and review time are stored on the existing source. |
| KICC-AUD-006 | Governance mutation is replayed with the same request ID and payload | Existing source state is returned and no second audit event is created. |
| KICC-AUD-007 | Conflict source belongs to another job or workspace | Server rejects before source or audit mutation. |
| KICC-AUD-008 | Private source is marked publicly citable | Server rejects the incompatible access/citation contract. |

---

## 5. Review And Approval

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-REV-001 | User without `MANAGE_KNOWLEDGE` opens or mutates intake | Route/API denies before tenant data mutation. |
| KICC-REV-002 | Authorized owner accepts an editable review item | Status and actor/modified time update while bounded evidence links remain. |
| KICC-REV-003 | Owner edits an accepted item and reruns analysis | Existing owner content/status is preserved; only missing evidence/context is backfilled. |
| KICC-REV-004 | Owner rejects a review item | Item remains rejected and cannot be selected for publish. |

---

## 6. Publishing

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-PUB-001 | Publish article and FAQ | Writes `kb_articles`, `kb_categories`, and `answerlattice_faqs`; requires one product-surface summary rebuild plus cache/source-version and public-cache freshness before review settlement; attempts article embedding afterward; and preserves lineage. |
| KICC-PUB-002 | Publish canonical answer draft | Creates a canonical mutation proposal with source lineage; active canonical truth still requires the Governance approval flow. |
| KICC-PUB-003 | Publish product surface suggestion | Creates/updates `answerlattice_productSurfaces` with source lineage and summary rebuild. |
| KICC-PUB-004 | Partial publish failure | Successful item destination IDs/status remain, failures stay visible, and retry uses deterministic destination IDs; no persisted publish manifest is required. |
| KICC-PUB-005 | Attempt to publish approved changelog/release output through intake | API blocks changelog/release publication from intake and directs the owner to the Changelog workflow. |
| KICC-PUB-006 | Destination commit succeeds but the required summary rebuild, cache/source-version effect, public-cache revalidation or acknowledgement fails | The review item remains accepted with its deterministic target ID; retry verifies the exact target, reruns required freshness effects, and only then marks it published without creating duplicate destination truth. |
| KICC-PUB-007 | Client explicitly sends `itemIds: []` or duplicate IDs | Request fails validation and no accepted item changes; only omitted `itemIds` means publish all accepted items. |
| KICC-PUB-008 (future) | Publish entity candidates and one approved entity | Candidate stays review-only; any future entity destination must use the ontology approval flow. Entity publishing is not a current intake target. |

---

## 7. Runtime Search And Help Center Alignment

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-RUN-001 | Owner approves canonical answer for a billing entity | Widget/help search returns the active canonical answer before FAQ or RAG fallback. |
| KICC-RUN-002 | No canonical match, but approved FAQ matches the question | Runtime returns the published `answerlattice_faqs` result before vector/RAG fallback. |
| KICC-RUN-003 | Article publish succeeds but embedding fails | Hosted help can show the article and `embeddingStatus` is `failed`; no topic-level partial-readiness record is claimed. |
| KICC-RUN-004 | Article embedding completes after publish | Vector/RAG fallback can retrieve the article without reprocessing the source. |
| KICC-RUN-005 | Product surface, article, and FAQ are published in one batch | `contextContent_{tId}_{sId}` is rebuilt once before item finalization, then target-specific compiled-source markers and public caches are refreshed before terminal review state. |
| KICC-RUN-006 | Intake summary counters change without a destination publish | Public context bundle/source versions remain unchanged. |
| KICC-RUN-007 | Runtime image/search question is submitted after screenshot intake source was approved into content | Image-assisted query still uses the normal canonical/FAQ/RAG path; screenshot evidence is searchable only through approved outputs. |
| KICC-RUN-008 | Owner tries to PATCH a review item directly to `published` | API rejects the patch; only the publish action can mark review items published and write runtime destinations. |
| KICC-RUN-009 | Owner updates a review item through a different job URL in the same workspace | API rejects the update because the review item must belong to the requested job. |

---

## 8. Topic Readiness — Future Extension

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-READY-001 (future) | Onboarding has approved article + surface + answer | Topic readiness may show `ready` only after evaluation and deployment checks pass. |
| KICC-READY-002 (future) | Billing has unresolved refund policy | Topic readiness shows `partial` or `needs_review`, not ready. |
| KICC-READY-003 (future) | Widget not installed | Deployment readiness stays incomplete even if content is approved. |
| KICC-READY-004 | Owner command center opens after a large import | It reads the capped job list and then the selected active-job bundle; it does not scan source/review collections or rely on the operations aggregate summary as the primary UI model. |
| KICC-READY-005 (future) | Destination publish succeeds but a required deployment/evaluation refresh fails | Readiness remains incomplete and the failure is visible without inventing successful coverage. |

---

## 9. Deletion And Retention — Future Extension

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-DEL-001 | Delete source before publish | Source artifacts and dependent unapproved drafts/review items are removed or marked deleted. |
| KICC-DEL-002 | Delete source after publish | Approved outputs remain but are marked stale/needs source review through lineage. |
| KICC-DEL-003 | Retention set to delete originals after processing | Original Storage file removed after normalized/evidence manifests are written. |

---

## 10. Mobile

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-MOB-001 | Open intake on mobile | Job/source/review cards fit without horizontal scroll. |
| KICC-MOB-002 | Accept, edit or reject an item on mobile | Linked evidence remains readable and action targets are at least 44px. |
| KICC-MOB-003 | Try multi-file upload on mobile | UI recommends desktop when bulk upload is complex. |

---

## 11. Regression Against Current Pipeline

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-REG-001 | Existing KB generation route opened | Route still works or redirects intentionally to intake without 404. |
| KICC-REG-002 | Existing published KB articles searched | Canonical/RAG search still finds published articles. |
| KICC-REG-003 | Existing FAQ generation from article | Existing FAQ management flow still works. |
| KICC-REG-004 | Existing founder onboarding bootstrap | Entity/canonical answer draft pipeline still respects human approval. |
| KICC-REG-005 (future) | Large multi-source import retries after background worker failure | Retry resumes from saved artifacts and idempotency keys without duplicate source docs or provider calls. No background intake worker exists today. |
| KICC-REG-006 | Existing manual FAQ create/update/archive | Existing FAQ DAL still bumps KB cache version and public cache tags after intake is added. |
| KICC-REG-007 | Existing article embedding API | Intake-published articles can use the same embedding readiness path without a duplicate embedding collection. |
| KICC-REG-008 | Existing product-surface summary API | Intake-published articles/FAQs/surfaces are reflected in the same compact surface summary. Owner-managed changelog entries remain available through the existing changelog summary path. |
| KICC-REG-009 | A runtime caller supplies string/boolean/fractional workspace IDs | Service scope admission fails closed instead of coercing the values into tenant/workspace authority. |
| KICC-REG-010 | A legacy processing lease contains an invalid or throwing timestamp getter/conversion | Runtime validation and lease comparison contain the failure; the malformed lease cannot crash the workflow or block it as active. |
| KICC-REG-011 | A fetched `/guides/start/` page links to relative `setup` | Discovery returns `/guides/start/setup`, not the site-root `/setup`, while cross-origin links remain excluded. |
| KICC-REG-012 | A response value contains a throwing timestamp getter or a cycle | Serialization returns a bounded null at the invalid edge and does not crash the private route response. |

---

## 12. Summary And Scheduler Cost

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-SUM-001 | Source/review/job state changes | Workspace summary updates through bounded server transitions; no bucketed intake directory is written today. |
| KICC-SUM-002 | Nightly aggregate summary hash is unchanged | The scheduler skips the aggregate summary write; normal job/source/review transitions retain their own bounded transactional patches. |
| KICC-SUM-003 | Answerlattice scheduler looks for intake repair work | Scheduler uses normal tenant discovery and reads only latest bounded intake job docs for that workspace; it does not read source/review lists, retry failed jobs, crawl URLs, call providers, or publish outputs. |
| KICC-SUM-004 (future) | Directory entry is dirty | A future repair directory reads bounded workspace data and clears dirty only after successful write. |
| KICC-SUM-005 (future) | Source content changes | An intake-specific source-version design, if adopted, increments without forcing public bundle rebuilds. No such counter is currently written. |
| KICC-SUM-006 | Approved output publishes | Articles/FAQs update KB freshness; articles also mark `docsNav`; product surfaces mark `surfaces`. Canonical proposals do not mark active canonical truth stale, and intake does not own `entities`, `entityRelations`, or `releases`. |
| KICC-SUM-007 | Aggregate intake counters change but runtime content does not | Intake summary/source fields update; public bundle source versions remain unchanged. |
| KICC-SUM-008 | Publish batch affects 20 articles and 15 FAQs | Product-surface summary rebuild runs once for the batch, not once per output item. |
| KICC-SUM-009 | Platform monitor refreshes with no selected workspace | It reads one tenant summary and recent scheduler logs only; it does not read intake jobs, ledger rows, source/review collections, or start provider work. |
| KICC-SUM-010 | Platform admin selects one workspace | It reads only capped job and ledger rows for the selected `tId/sId`. |
| KICC-SUM-011 | Platform admin clicks Retry selected nightly | It calls `triggerAnswerlatticeNightly` with the selected `tId/sId`; Answerlattice scheduler processes that workspace only and writes normal scheduler state/run logs. |

---

## Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-05-31 | 1.0.0 | Initial test matrix for Knowledge Intake Command Center. |
| 2026-05-31 | 1.1.0 | Added website link discovery, selected URL source creation, and unchanged-source skip tests. |
| 2026-05-31 | 1.2.0 | Added concurrency, cancellation, credit release, privacy filter, and idempotent retry tests. |
| 2026-05-31 | 1.3.0 | Added summary-first dashboard, bucketed directory, scheduler repair, and source-version tests. |
| 2026-05-31 | 1.4.0 | Added runtime search/help-center alignment tests for canonical-first retrieval, FAQ retrieval, vector readiness, surface summaries, public bundle skip behavior, and existing pipeline regression. |
| 2026-05-31 | 2.0.0 | Added implemented screenshot/media/usage-ledger/scheduler tests. |
| 2026-05-31 | 2.1.0 | Added platform-owner intake monitor tests and cost guardrail expectations. |
| 2026-07-18 | 2.2.0 | Added current evidence/privacy/FAQ retrieval expectations, fixed duplicate day-one IDs, and marked cancellation, deletion, manifests, and intake-specific source versions as future-only. |
| 2026-07-26 | 2.2.1 | Added strict runtime workspace-scope and malformed persisted timestamp/lease regression cases. |
| 2026-07-26 | 2.2.2 | Added interrupted destination-publication freshness recovery and deterministic retry coverage. |
| 2026-07-26 | 2.2.3 | Added fetched-page-relative discovery and hostile/cyclic response serialization coverage. |
| 2026-07-26 | 2.2.4 | Added explicit empty/duplicate publish-selection rejection at route and service boundaries. |
| 2026-07-26 | 2.2.5 | Added exact DOCX archive-size, invalid metadata scalar and diagnostic coercion regression coverage. |
| 2026-07-26 | 2.3.0 | Reconciled owner/mobile read models and exact destination freshness keys; added required context-summary recovery and hostile summary-timestamp cases. |
