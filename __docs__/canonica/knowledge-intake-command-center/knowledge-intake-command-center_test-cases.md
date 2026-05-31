# Knowledge Intake Command Center — Test Cases

> **Status:** IMPLEMENTED — day-one regression matrix plus future extension matrix
> **Version:** 2.0.0
> **Created:** 2026-05-31
> **Audience:** QA / Engineering / Product

---

## 0. Day-One Implemented Acceptance Tests

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-D1-001 | Open `/canonica/knowledge-intake` with Canonica management permission | Page loads the Canonica-owned **Teach Canonica** command center. |
| KICC-D1-002 | Open legacy `/canonica/kb-generation` | Route redirects to `/canonica/knowledge-intake`. |
| KICC-D1-003 | Non-licensed workspace attempts create/source/discover/analyze/review/publish mutation | API blocks with `402` before URL fetch, draft analysis, or publish writes. |
| KICC-D1-004 | Owner imports a public website link | API rejects private/local hosts, fetches only capped public content, and creates a selected source only after owner action. |
| KICC-D1-005 | Owner imports browser-extracted file text | Source doc stores capped extracted text and compact metadata; no raw Storage upload occurs. |
| KICC-D1-006 | Owner analyzes ready sources | Review items are bounded by job caps and remain owner-reviewable. |
| KICC-D1-007 | Owner accepts and publishes a KB item | Writes `kb_articles`, updates `kb_categories`, bumps KB freshness, and triggers context summary rebuild/cache invalidation. |
| KICC-D1-008 | Owner publishes an FAQ item | Writes `canonica_faqs`; runtime search can use FAQ/custom-answer retrieval before vector fallback. |
| KICC-D1-009 | Owner publishes a canonical-answer draft | Creates `canonica_mutationProposals`; no active canonical answer is auto-published and compiled `canonical` runtime context is not marked stale. |
| KICC-D1-010 | Owner publishes product surface/changelog items | Writes existing product-surface/changelog paths and marks related compiled-context sources stale. |
| KICC-D1-011 | User loads jobs/review lists | Reads are bounded and API-driven; no realtime Firestore listener is used. |
| KICC-D1-012 | Owner uploads a supported screenshot | API reserves 1 support credit, validates signature, extracts support text, writes a source, logs AI operation, settles ledger, and does not retain raw media. |
| KICC-D1-013 | Owner uploads a short supported audio/video file | API reserves 2 support credits, validates signature, extracts support transcript/summary, writes a source, logs AI operation, and settles ledger. |
| KICC-D1-014 | Media extraction fails after credit reservation | Ledger marks `failed_refunded` and monthly/top-up credits are returned. |
| KICC-D1-015 | Canonica nightly runs with intake scheduler flag on | It refreshes `platformSummary/knowledgeIntakeSummary_{tId}_{sId}` from latest bounded job docs only; it does not retry failed jobs, crawl, call AI, or publish. |
| KICC-D1-016 | Platform admin opens `/platform/canonica-intake` | Screen loads `canonicaTenantsSummary` and recent scheduler logs first; intake jobs and ledger rows are not read until one workspace is selected. Non-platform users are denied. |
| KICC-D1-017 | TypeScript validation | `npx tsc --noEmit --incremental false` passes. |

The sections below preserve the broader long-term matrix. Native helpdesk/OAuth connectors, retained raw-media Storage artifacts, and scheduler directory repair remain future-extension tests. Screenshot OCR, short media transcription, support-credit ledger charging, and summary-only scheduler analytics are implemented runtime claims.

## 1. Entitlement And Cost Gates

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-ENT-001 | User has no active paid subscription and starts URL import | API blocks before source fetch; no Storage write, AI call, or job execution. |
| KICC-ENT-002 | Active plan has no remaining intake allowance | Job status becomes `paused_limit`; no hidden processing continues. |
| KICC-ENT-003 | User adds source above file/page cap | Preflight rejects with exact limit message. |
| KICC-ENT-004 | Static demo viewed by anonymous visitor | No customer data processing and no Firestore write. |
| KICC-ENT-005 | User starts a second expensive intake job while one is active | API rejects or queues according to plan cap; no duplicate provider work starts. |
| KICC-ENT-006 | Job is cancelled before provider work | Reserved unused credits are released and job cannot continue hidden processing. |

---

## 2. Source Intake

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-SRC-001 | Add product website and app URL | Website discovery manifest is created; app URL is stored as setup/surface context and is not crawled behind login. |
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
| KICC-URL-003 | Site has sitemap with many pages | Import selects only capped support-relevant pages. |
| KICC-URL-004 | Page response exceeds size cap | Source marked failed/too-large with retry/manual option. |
| KICC-URL-005 | Robots disallow crawling | Source marked blocked; owner can paste/upload content manually. |
| KICC-URL-006 | Site has sitemap, llms.txt, pricing, docs, legal, and changelog links | Candidate manifest groups pages by role; no Firestore source docs are created until owner selects pages. |
| KICC-URL-007 | Owner selects 8 pages from 80 discovered links | Only 8 selected pages create source docs and count against URL page allowance. |
| KICC-URL-008 | URL contains tracking params or fragments | Canonical URL normalization strips tracking params/fragments before dedupe/hash. |
| KICC-URL-009 | Selected page has unchanged ETag, Last-Modified, content hash, and normalized text hash | Freshness metadata updates only; extraction, draft generation, embeddings, and AI calls are skipped. |
| KICC-URL-010 | Product app login URL is supplied | URL is used for widget/surface setup only; no credentialed crawl or private dashboard scan occurs. |

---

## 4. Source Audit And Product Map

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-AUD-001 | Pricing page conflicts with old PDF | Review item created; pricing page recommended by authority. |
| KICC-AUD-002 | Product has no refund policy | Missing launch info review item created. |
| KICC-AUD-003 | Product has clean docs | Product map created with features, roles, plans, workflows, surfaces, and few/no conflicts. |
| KICC-AUD-004 | No docs, only product URL and policy pack | Product map still created from product context and starter templates. |

---

## 5. Review And Approval

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-REV-001 | Support staff approves billing answer | Blocked unless user has owner/admin high-risk approval permission. |
| KICC-REV-002 | Owner approves high-risk billing answer | Approval succeeds and audit trail records actor/time/source. |
| KICC-REV-003 | Owner bulk-approves safe low-risk FAQs | Only safe group items are approved; high-risk items remain open. |
| KICC-REV-004 | Owner rejects product concept | Dependent unapproved drafts become stale/excluded. |

---

## 6. Publishing

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-PUB-001 | Publish article and FAQ | Writes `kb_articles`, `kb_categories`, `canonica_faqs`, embeddings, cache/source versions, public cache invalidation, surface-summary refresh/stale marker, and lineage. |
| KICC-PUB-002 | Publish canonical answer draft | Creates/updates canonical answer only after approval and lineage is attached. |
| KICC-PUB-003 | Publish product surface suggestion | Creates/updates `canonica_productSurfaces` with source lineage and summary rebuild. |
| KICC-PUB-004 | Partial publish failure | Publish manifest records successful/failed writes; retry is idempotent. |
| KICC-PUB-005 | Publish approved changelog/release output | Existing changelog page updates, public changelog/context cache invalidates, `releases` source version changes only when release context changed. |
| KICC-PUB-006 | Publish entity candidates and one approved entity | Candidate stays review-only; approved entity updates entity search index and marks `entities`/`entityRelations` only after approval. |

---

## 7. Runtime Search And Help Center Alignment

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-RUN-001 | Owner approves canonical answer for a billing entity | Widget/help search returns the active canonical answer before FAQ or RAG fallback. |
| KICC-RUN-002 | No canonical match, but approved FAQ matches the question | Runtime returns the published `canonica_faqs` result before vector/RAG fallback. |
| KICC-RUN-003 | Article is published but embedding has not completed | Hosted help can show the article, but topic search readiness is `partial` and RAG does not claim ready coverage. |
| KICC-RUN-004 | Article embedding completes after publish | Vector/RAG fallback can retrieve the article and readiness updates without reprocessing the source. |
| KICC-RUN-005 | Product surface, article, FAQ, and changelog are published in one batch | `contextContent_{tId}_{sId}` is rebuilt or marked stale once, and widget related content shows the new surface links after refresh. |
| KICC-RUN-006 | Published output changes only intake readiness counters | Public context bundle is not rebuilt unless an approved runtime destination source key also changed. |
| KICC-RUN-007 | Runtime image/search question is submitted after screenshot intake source was approved into content | Image-assisted query still uses the normal canonical/FAQ/RAG path; screenshot evidence is searchable only through approved outputs. |
| KICC-RUN-008 | Owner tries to PATCH a review item directly to `published` | API rejects the patch; only the publish action can mark review items published and write runtime destinations. |
| KICC-RUN-009 | Owner updates a review item through a different job URL in the same workspace | API rejects the update because the review item must belong to the requested job. |

---

## 8. Readiness

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-READY-001 | Onboarding has approved article + surface + answer | Topic readiness shows `ready`. |
| KICC-READY-002 | Billing has unresolved refund policy | Topic readiness shows `partial` or `needs_review`, not ready. |
| KICC-READY-003 | Widget not installed | Runtime readiness shows not ready even if content is approved. |
| KICC-READY-004 | Dashboard opens after a large import | First screen reads `knowledgeIntakeSummary_{tId}_{sId}` only before paginated tabs are opened. |
| KICC-READY-005 | Article, FAQ, surface, and canonical answer publish succeeds but surface summary rebuild fails | Topic readiness shows `partial`; directory remains dirty for bounded scheduler repair. |

---

## 9. Deletion And Retention

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-DEL-001 | Delete source before publish | Source artifacts and dependent unapproved drafts/review items are removed or marked deleted. |
| KICC-DEL-002 | Delete source after publish | Approved outputs remain but are marked stale/needs source review through lineage. |
| KICC-DEL-003 | Retention set to delete originals after processing | Original Storage file removed after normalized/evidence manifests are written. |

---

## 10. Mobile

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-MOB-001 | Open intake on mobile | Summary/readiness/review cards fit without horizontal scroll. |
| KICC-MOB-002 | Approve high-risk item on mobile | Explicit confirmation required; target size >=44px. |
| KICC-MOB-003 | Try multi-file upload on mobile | UI recommends desktop when bulk upload is complex. |

---

## 11. Regression Against Current Pipeline

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-REG-001 | Existing KB generation route opened | Route still works or redirects intentionally to intake without 404. |
| KICC-REG-002 | Existing published KB articles searched | Canonical/RAG search still finds published articles. |
| KICC-REG-003 | Existing FAQ generation from article | Existing FAQ management flow still works. |
| KICC-REG-004 | Existing founder onboarding bootstrap | Entity/canonical answer draft pipeline still respects human approval. |
| KICC-REG-005 | Large multi-source import retries after worker failure | Retry resumes from saved manifests and idempotency keys without duplicate source docs or provider calls. |
| KICC-REG-006 | Existing manual FAQ create/update/archive | Existing FAQ DAL still bumps KB cache version and public cache tags after intake is added. |
| KICC-REG-007 | Existing article embedding API | Intake-published articles can use the same embedding readiness path without a duplicate embedding collection. |
| KICC-REG-008 | Existing product-surface summary API | Intake-published articles/FAQs/changelog/surfaces are reflected in the same compact surface summary. |

---

## 12. Summary And Scheduler Cost

| ID | Scenario | Expected result |
| --- | --- | --- |
| KICC-SUM-001 | Source/review/job state changes | Workspace summary and bucketed directory update in the same server transition. |
| KICC-SUM-002 | Summary hash is unchanged | Summary write is skipped. |
| KICC-SUM-003 | Canonica scheduler looks for intake repair work | Scheduler uses normal tenant discovery and reads only latest bounded intake job docs for that workspace; it does not read source/review lists, retry failed jobs, crawl URLs, call providers, or publish outputs. |
| KICC-SUM-004 | Directory entry is dirty | Summary repair reads bounded workspace data and clears dirty only after successful write. |
| KICC-SUM-005 | Source content changes | `sourceVersions_{tId}_{sId}.knowledgeIntakeSources` increments. |
| KICC-SUM-006 | Approved output publishes | `sourceVersions_{tId}_{sId}.knowledgeIntakeOutputs` increments and the matching runtime source key (`kb`, `canonical`, `surfaces`, `releases`, `entities`, or `entityRelations`) changes only when destination content changed. |
| KICC-SUM-007 | Intake readiness changes but runtime content does not | Intake summary/source fields update; public bundle manifest remains ready and is not marked stale. |
| KICC-SUM-008 | Publish batch affects 20 articles and 15 FAQs | Product-surface summary rebuild runs once for the batch, not once per output item. |
| KICC-SUM-009 | Platform monitor refreshes with no selected workspace | It reads one tenant summary and recent scheduler logs only; it does not read intake jobs, ledger rows, source/review collections, or start provider work. |
| KICC-SUM-010 | Platform admin selects one workspace | It reads only capped job and ledger rows for the selected `tId/sId`. |
| KICC-SUM-011 | Platform admin clicks Retry selected nightly | It calls `triggerCanonicaNightly` with the selected `tId/sId`; Canonica scheduler processes that workspace only and writes normal scheduler state/run logs. |

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
