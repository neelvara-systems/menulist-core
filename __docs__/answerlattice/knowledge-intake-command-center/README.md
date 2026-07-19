# Knowledge Intake Command Center — Feature Documentation

> **Status:** IMPLEMENTED — day-one owner-triggered intake flow
> **Created:** 2026-05-31
> **Audience:** Product, Engineering, Firebase/Ops, Website, Support
> **Source of Truth:** Runtime audit + Answerlattice doctrine + reviewed ChatGPT conversation

---

## What Is This

Knowledge Intake Command Center is the implemented replacement for Answerlattice's document-upload-first KB generation screen.

Owner-facing name:

**Teach Answerlattice your product.**

Product definition:

Answerlattice intake lets a solo founder or product owner add product links, docs, files, policies, screenshots, transcripts, release notes or existing changelog entries, support exports, repeated replies, and starter answers. Answerlattice turns those inputs into source-backed KB, FAQ, product-surface, and canonical-proposal review drafts without auto-publishing authoritative answers.

This is not a generic upload widget. It is the entry point into Answerlattice's Governed Answer Infrastructure:

- website link discovery
- source registry
- product context
- bounded source evidence
- missing-evidence review
- article, FAQ, product-surface, and canonical-answer proposal drafts
- safe publishing into KB, FAQ, product surfaces, canonical answer proposals, and compact intake summaries

---

## Implemented Day-One Contract

| Area | Implementation truth |
| --- | --- |
| Owner route | `/answerlattice/knowledge-intake` is the canonical owner route. `/answerlattice/kb-generation` redirects for compatibility. |
| Navigation | Launch Setup shows **Teach Answerlattice** and routes to the Answerlattice-owned intake screen. |
| Inputs | Owners can add pasted text, repeated replies, selected public URLs, browser-extracted text files, screenshots/images, and short audio/video evidence. File bodies are capped before reaching the server. |
| URL discovery | Public URL discovery is bounded, same-origin, private-network guarded, and owner-selected. Discovered links are not materialized as Firestore source docs until selected. |
| Entitlement | Mutating and expensive actions require an active Answerlattice beta/subscription summary on the workspace store document. |
| Processing | Text-friendly files are extracted in the browser. Screenshots/images and short media use gated Gemini extraction with support-credit reservation, AI operation logging, and refund-on-failure. No background crawler, native connector, or scheduler import fanout is enabled. |
| Review | Drafts become review items. Owners accept, reject, or edit before publish. |
| Publishing | Accepted items publish into existing Answerlattice runtime collections: KB articles/categories, FAQs, product surfaces, and canonical mutation proposals. Changelog pages remain owner-managed release content. |
| Canonical answers | Intake creates canonical mutation proposals only. It does not auto-publish authoritative canonical answers. |
| Runtime freshness | Publish bumps existing cache/source-version paths and rebuilds the compact context-content summary for page-aware widget/search alignment. |
| Cost posture | No realtime listeners, no unbounded scans, no hidden retry workers, and no raw-file Storage retention were added. The nightly scheduler only refreshes a compact intake summary from the latest bounded job docs when enabled. |
| Platform observability | `/platform/answerlattice-intake` reads `answerlatticeTenantsSummary` first, lets platform admins select one workspace, then shows scoped intake jobs, credit ledger rows, media extraction usage, scheduler health, and an explicit selected-workspace nightly retry action. |

---

## Current Runtime Boundaries

- Review items retain a bounded union of linked `sourceIds`; re-analysis can add corroborating source evidence without overwriting an owner's title, content, or review status.
- Published KB articles, FAQs, product surfaces, and canonical mutation proposals retain intake job, review item, and source ID lineage in destination-native fields. Private source IDs are not written into public citation URLs.
- Intake-published FAQs use the declared `knowledge_intake` source and remain eligible for the normal FAQ retrieval layer.
- Source metadata is bounded and recursively redacted before persistence. Public URL intake rejects credentials, sensitive query keys, and local/private/reserved destinations even when source text is supplied directly.
- URL discovery returns bounded candidates to the owner; discovered-but-unselected URLs are not persisted as a manifest or as source documents.
- Raw screenshot, audio, and video bytes are not retained after extraction.
- Source-level deletion, cancellation APIs, retained-artifact policies, intake-specific source-version manifests, and automated per-record retention cleanup are not implemented in this feature. Those capabilities require a separate lifecycle/governance design rather than a partial delete button.
- Source authority, ownership, effective dates, expiry, and audience applicability are not first-class intake-source fields. Current intake creates reviewable evidence; the broader source-governance contract is audited separately.

---

## Pre-Implementation Runtime Audit

This was the runtime baseline before the day-one intake implementation.

| Area | Current runtime evidence | Current behavior |
| --- | --- | --- |
| Answerlattice route | `src/app/(answerlattice)/answerlattice/kb-generation/page.tsx:10-17` | Answerlattice lazy-loads the shared platform `KBGeneration` component. |
| Main UI | `src/components/templates/platform/KBGeneration/index.tsx:95-153` | Shows one active generation job, upload CTA, review/reconciliation modals, and previous job history. |
| Upload modal | `src/components/templates/platform/KBGeneration/UploadModal.tsx:140-205` | Uploads files/pasted text sources, then creates a `kb_generation_jobs` document. |
| Storage path | `src/components/templates/platform/KBGeneration/UploadModal.tsx:183-187` | Stores files under `ingestion_source_files/{tId}/{sId}/{uuid}-{filename}` in Answerlattice Storage. |
| URL handling | `src/components/templates/platform/KBGeneration/UploadModal.tsx:271-276` | Pasted URLs are stored as source text; no URL crawl/classification exists. |
| Active listener | `src/hooks/useIngestionJobsListener.ts:36-48` | Uses Firestore `onSnapshot` for active job state. |
| DAL | `src/database/kb-generation/jobs.ts:22-31`, `49-75`, `202-220` | Active/history queries are scoped by `tId/sId`; new jobs are created in `kb_generation_jobs`. |
| Generation function | `functions/src/logic/startGeneration.ts:19-27` | Reads source files and passes them to the existing KB prompt. |
| Article writes | `functions/src/logic/startGeneration.ts:50-70`, `117-136` | Writes generated article docs before owner review. |
| Publish function | `functions/src/logic/publishApprovedJob.ts:193-343` | Publishes reviewed articles, writes generated FAQs, updates categories, and embeds. |
| Current onboarding mismatch | `src/app/api/answerlattice/onboard/route.ts:74`, `547-621` | Runtime still supports free beta workspace creation. Intake processing must be paid-gated before implementation. |

Conclusion:

The shared pipeline remains as a legacy compatibility path. Answerlattice now uses the dedicated source-backed intake engine for owner setup.

---

## Product Decision Summary

Accepted from the ChatGPT discussion:

- Start with product context, not files.
- Treat every input as a `Source`, then normalize it into bounded evidence and review drafts. A generalized product map remains separate work.
- Add URL/docs import as a first-class, bounded source path.
- Treat the main product website link as a discovery pack: discover candidate pages cheaply, return them for owner selection, and create source docs only for owner-selected pages.
- Support multiple file families, screenshots/images, transcripts/media, helpdesk exports, changelog material, product surfaces, support macros, and policy answers.
- Turn one repeated user question and one founder reply into focused FAQ and canonical proposal drafts without adding a helpdesk connector.
- Preserve source evidence and keep authority/risk decisions human-governed; first-class authority/risk fields remain separate work.
- Make a tiny review queue the owner UX, not a long governance dashboard.
- Publish only after explicit owner approval.
- Store capped extracted source text/metadata in Firestore for day one; raw/heavy Storage retention stays reserved for a future native-upload path.
- Paid entitlement and available Answerlattice support credits must be checked before any expensive scan, parse, transcription, AI generation, embedding, or readiness simulation.

Adjusted for Answerlattice:

- No free real workspace processing. Public demo can stay static/sample-only.
- No broad default website crawl. URL import is capped, starting-page/sitemap-guided, private-network guarded, and owner-approved.
- No Firestore materialization of discovered-but-skipped website URLs.
- No credentialed crawling of app dashboards, demo accounts, admin areas, or private customer data.
- Identical selected-page sources deduplicate within the same intake job; no background freshness/ETag polling is implemented.
- No per-source function fanout for provider work; current expensive intake is owner-triggered through bounded server operations with job leases/idempotent destination IDs and media credit reservation/settlement.
- Text and metadata receive bounded redaction before persistence. Raw media reaches the configured extraction provider only after explicit owner action and safety/entitlement checks, then extracted text is redacted before storage.
- Dashboards use summary docs before detailed lists. The Answerlattice nightly scheduler may refresh `platformSummary/knowledgeIntakeSummary_{tId}_{sId}` from the latest bounded job docs, but it must not retry failed jobs, crawl URLs, call providers, or publish review items.
- No native helpdesk/OAuth connector is required for day-one; exports/import files cover support history without credential risk.
- Video/audio support is transcript-first when transcripts are available; raw media transcription is implemented as an owner-triggered, paid, capped, explicitly visible intake step.
- Current KB generation stays compatible but becomes one output of intake, not the product center.

Rejected:

- Auto-publishing generated answers.
- LLM deciding source conflicts silently.
- Per-fact/per-section Firestore documents.
- Unbounded website/docs crawling.
- Demo-account credential scanning as a day-one requirement.
- Full project-management or helpdesk replacement scope.

---

## Document Index

| # | Document | Audience | Purpose |
| --- | --- | --- | --- |
| 1 | `README.md` | Everyone | Index, runtime audit, product decision summary |
| 2 | `knowledge-intake-command-center_spec.md` | CEO / PM / Product | Founder-first requirements and user journey |
| 3 | `knowledge-intake-command-center_impl.md` | Engineering | Technical implementation contract |
| 4 | `knowledge-intake-command-center_firebase.md` | Firebase / Ops | Cost model, collections, rules, indexes, limits |
| 5 | `knowledge-intake-command-center_marketing.md` | Website / Sales | Positioning and buyer-facing language |
| 6 | `knowledge-intake-command-center_website.md` | Public website | Website copy requirements and claim boundaries |
| 7 | `knowledge-intake-command-center_helpdoc.md` | Answerlattice owners | How founders use intake safely |
| 8 | `knowledge-intake-command-center_mobile-support.md` | Mobile / QA | Mobile admission, responsive behavior, limitations |
| 9 | `knowledge-intake-command-center_test-cases.md` | QA / Engineering | Acceptance and regression test matrix |
| 10 | `_archive/chatgpt-review.md` | Product / History | Reviewed external-suggestion notes |

---

## Non-Negotiable Implementation Doctrine

1. **Paid before processing:** no scan, parse, transcription, extraction, draft generation, readiness simulation, embedding, or source sync runs without active paid entitlement or explicit paid processing allowance.
2. **Source-backed:** every generated draft and supported published destination keeps bounded lineage back to intake job, review item, and source ids. Intake-specific source-version and evidence manifests are reserved, not current runtime claims.
3. **Owner-approved:** high-risk and authoritative outputs require human approval. Generated content is never official by default.
4. **Founder-simple:** owner UI says "launch decisions", "source", "ready", "needs review", and "approved answers"; internal terms such as chunks, RAG, embeddings, mutation proposals, and ontology stay behind the scenes.
5. **Cost-bounded:** Firestore stores capped extracted text, bounded metadata, summaries, review decisions, ledgers, and live destination records. The current intake flow does not retain raw or normalized source artifacts in Storage.
6. **One product per workspace by default:** a workspace represents one product/app support brain. Studio plans can create multiple workspaces, not mix unrelated products into one support graph.
7. **Bounded execution:** expensive steps run under owner-triggered API routes, rate limits, caps, and credit settlement rules. Failed media extraction refunds reserved support credits; failed jobs are retried only by owner action.
8. **Provider-safe evidence:** provider prompts use selected, redacted evidence instead of raw source bodies.
9. **Summary-first reads:** first-screen UI and nightly analytics use `platformSummary` summaries before detailed list queries. Scheduler work is summary-only for intake.

---

## Relationship To Existing Features

| Existing area | Intake relationship |
| --- | --- |
| `kb_generation_jobs` | Legacy compatibility path. New Answerlattice intake uses `/answerlattice/knowledge-intake` and publishes into the same approved runtime collections without reusing the shared platform screen. |
| Knowledge Base | Receives approved help articles generated from source-backed drafts. |
| FAQ Management | Receives owner-reviewed short answers linked to articles, surfaces, tags, and entities. |
| Product Surfaces | Receives page/workflow mappings from source templates, app URL context, and owner-selected screens. |
| Website Link Discovery | Feeds selected public product/docs/pricing/legal pages into intake without turning Answerlattice into a crawler. |
| Product Ontology | Existing entity IDs can be linked to intake sources/review items. Entity-candidate creation is not a current intake publish destination. |
| Canonical Answers | Receives reviewable mutation proposals from intake; canonical-first retrieval remains the runtime priority after human approval. |
| Drift / Signal Mutation | Can use retained source IDs and destination lineage as evidence. Automated intake-source version manifests and source-change drift are not implemented by this feature. |
| Widget / Hosted Help | Uses approved KB, FAQ, product surface, and canonical-answer outputs. |
| Billing | Owns paid entitlement, support-credit reservation, settlement, refund, and ledger/audit rows before paid intake processing runs. |

## Runtime Alignment Contract

Knowledge Intake must publish into Answerlattice's existing runtime paths. It must not create parallel retrieval stores.

| Runtime path | Intake alignment requirement |
| --- | --- |
| Help center / hosted KB | Approved article output writes `kb_articles` and `kb_categories`; public content cache is invalidated for `kb`, `faqs`, and `context` as applicable. |
| Help center and widget search | Published articles must have embeddings before a topic is marked search-ready. Runtime search remains canonical-first, FAQ/custom-answer second, and vector/RAG fallback last. |
| FAQ/custom Q&A | Approved short answers write `answerlattice_faqs` with `status: published`, `active: true`, `articleId`, `contextKeys`, `entityIds`, and `tags` when available. |
| Canonical answer engine | Intake creates reviewable drafts/proposals first. Active canonical answers are written only after approval and must bump the canonical cache/source version. |
| Product surface related content | Article, FAQ, and surface changes must rebuild or mark stale `platformSummary/contextContent_{tId}_{sId}` so page-aware widget suggestions can see the new output. |
| Compiled context bundles | Published output must mark the existing destination source keys stale: `kb`, `docsNav`, `canonical`, `surfaces`, `entities`, or `entityRelations`. Intake-only readiness changes and release-note source context must not force public bundle rebuilds. |
| Changelog and release drift | Intake can use release notes or existing changelog entries as source context for support drafts, but it does not write changelog pages or release timeline records. Owners publish changelog entries through the Changelog workflow, which remains the release-drift trigger. |
| Support Board | Intake may create selected support-gap cards only when the Support Board feature is enabled. It must not mirror every source fact, ticket, or raw signal. |

---

## Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-05-31 | 1.0.0 | Initial day-one documentation contract for founder-first, paid-gated, source-backed Answerlattice intake. |
| 2026-05-31 | 1.1.0 | Added product-link-first intake doctrine, selected-page source creation, and unchanged-link cost controls. |
| 2026-05-31 | 1.2.0 | Added bounded execution and provider-safe evidence doctrine. |
| 2026-05-31 | 1.3.0 | Added summary-first read model and bucketed scheduler directory doctrine. |
| 2026-05-31 | 1.4.0 | Added runtime alignment contract for KB, FAQ, canonical answers, widget search, surface summaries, public cache, releases, and compiled context bundles. |
| 2026-05-31 | 2.0.0 | Implemented day-one owner-triggered intake route, APIs, review flow, publish wiring, Firestore rules/indexes, active-license gate, and legacy route redirect. |
| 2026-05-31 | 2.1.0 | Implemented screenshot OCR, short media transcription, Answerlattice intake usage ledger, AI operation logging, refund-on-failure, and summary-only nightly intake analytics. |
| 2026-07-18 | 2.2.0 | Hardened multi-source evidence retention, destination lineage, FAQ retrieval eligibility, nested metadata redaction, and public URL admission; separated current runtime from reserved deletion, cancellation, Storage-manifest, and source-version designs. |
