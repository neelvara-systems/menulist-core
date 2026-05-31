# Knowledge Intake Command Center — Feature Documentation

> **Status:** PLANNED — Day-one implementation contract
> **Created:** 2026-05-31
> **Audience:** Product, Engineering, Firebase/Ops, Website, Support
> **Source of Truth:** Runtime audit + Canonica doctrine + reviewed ChatGPT conversation

---

## What Is This

Knowledge Intake Command Center is the planned replacement architecture for Canonica's current document-upload-first KB generation screen.

Owner-facing name:

**Teach Canonica your product.**

Product definition:

Canonica intake lets a solo founder or product owner add product links, docs, files, policies, screenshots, transcripts, changelog entries, support exports, and starter answers. Canonica turns those inputs into source-backed product understanding, approved support drafts, page-aware support suggestions, and launch readiness without auto-publishing authoritative answers.

This is not a generic upload widget. It is the entry point into Canonica's Support Knowledge Control Plane:

- website link discovery
- source registry
- product context
- product map
- source authority
- conflict and gap review
- article, FAQ, canonical answer, workflow, and widget suggestions
- safe publishing into KB, FAQ, ontology, product surfaces, canonical answers, and readiness summaries

---

## Current Runtime Audit

The current implementation is useful but too narrow for Canonica's long-term intake promise.

| Area | Current runtime evidence | Current behavior |
| --- | --- | --- |
| Canonica route | `src/app/(canonica)/canonica/kb-generation/page.tsx:10-17` | Canonica lazy-loads the shared platform `KBGeneration` component. |
| Main UI | `src/components/templates/platform/KBGeneration/index.tsx:95-153` | Shows one active generation job, upload CTA, review/reconciliation modals, and previous job history. |
| Upload modal | `src/components/templates/platform/KBGeneration/UploadModal.tsx:140-205` | Uploads files/pasted text sources, then creates a `kb_generation_jobs` document. |
| Storage path | `src/components/templates/platform/KBGeneration/UploadModal.tsx:183-187` | Stores files under `ingestion_source_files/{tId}/{sId}/{uuid}-{filename}` in Canonica Storage. |
| URL handling | `src/components/templates/platform/KBGeneration/UploadModal.tsx:271-276` | Pasted URLs are stored as source text; no URL crawl/classification exists. |
| Active listener | `src/hooks/useIngestionJobsListener.ts:36-48` | Uses Firestore `onSnapshot` for active job state. |
| DAL | `src/database/kb-generation/jobs.ts:22-31`, `49-75`, `202-220` | Active/history queries are scoped by `tId/sId`; new jobs are created in `kb_generation_jobs`. |
| Generation function | `functions/src/logic/startGeneration.ts:19-27` | Reads source files and passes them to the existing KB prompt. |
| Article writes | `functions/src/logic/startGeneration.ts:50-70`, `117-136` | Writes generated article docs before owner review. |
| Publish function | `functions/src/logic/publishApprovedJob.ts:193-343` | Publishes reviewed articles, writes generated FAQs, updates categories, and embeds. |
| Current onboarding mismatch | `src/app/api/canonica/onboard/route.ts:74`, `547-621` | Runtime still supports free beta workspace creation. Intake processing must be paid-gated before implementation. |

Conclusion:

The current pipeline should remain as a compatibility article-generation output path, but Canonica needs a higher-level source-backed intake engine above it.

---

## Product Decision Summary

Accepted from the ChatGPT discussion:

- Start with product context, not files.
- Treat every input as a `Source`, then normalize into evidence/facts/product map/review/drafts.
- Add URL/docs import as a first-class, bounded source path.
- Treat the main product website link as a discovery pack: discover candidate pages cheaply, store candidate manifests in Storage, and create source docs only for owner-selected pages.
- Support multiple file families, screenshots/images, transcripts/media, helpdesk exports, changelog material, product surfaces, support macros, and policy answers.
- Use source authority and risk domains before generating/publishing.
- Make a tiny review queue the owner UX, not a long governance dashboard.
- Publish only after explicit owner approval.
- Store raw/heavy artifacts in Storage and compact metadata/summaries in Firestore.
- Paid entitlement must be checked before any expensive scan, parse, transcription, AI generation, embedding, or readiness simulation.

Adjusted for Canonica:

- No free real workspace processing. Public demo can stay static/sample-only.
- No broad default website crawl. URL import is capped, robots-aware, sitemap-guided, and owner-approved.
- No Firestore materialization of discovered-but-skipped website URLs.
- No credentialed crawling of app dashboards, demo accounts, admin areas, or private customer data.
- Unchanged selected website pages skip extraction, draft generation, embeddings, and AI/provider calls.
- No per-source function fanout for provider work; expensive intake uses a bounded job worker, lease, idempotency, and credit settlement.
- Unsafe secrets/private data are filtered before provider prompts by default.
- Dashboards and scheduler repair use summary/directory docs instead of scanning intake jobs, sources, or review items.
- No native helpdesk/OAuth connector is required for day-one; exports/import files cover support history without credential risk.
- Video/audio support is transcript-first; raw media transcription is paid, capped, and explicitly confirmed before processing.
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
| 7 | `knowledge-intake-command-center_helpdoc.md` | Canonica owners | How founders use intake safely |
| 8 | `knowledge-intake-command-center_mobile-support.md` | Mobile / QA | Mobile admission, responsive behavior, limitations |
| 9 | `knowledge-intake-command-center_test-cases.md` | QA / Engineering | Acceptance and regression test matrix |
| 10 | `_archive/chatgpt-review.md` | Product / History | Reviewed external-suggestion notes |

---

## Non-Negotiable Implementation Doctrine

1. **Paid before processing:** no scan, parse, transcription, extraction, draft generation, readiness simulation, embedding, or source sync runs without active paid entitlement or explicit paid processing allowance.
2. **Source-backed:** every generated draft and published output keeps lineage back to source ids, source versions, and evidence manifests.
3. **Owner-approved:** high-risk and authoritative outputs require human approval. Generated content is never official by default.
4. **Founder-simple:** owner UI says "launch decisions", "source", "ready", "needs review", and "approved answers"; internal terms such as chunks, RAG, embeddings, mutation proposals, and ontology stay behind the scenes.
5. **Cost-bounded:** Firestore stores metadata, summaries, review decisions, and live records. Storage stores originals, parsed text, chunks, evidence, draft bodies, manifests, and transcripts.
6. **One product per workspace by default:** a workspace represents one product/app support brain. Studio plans can create multiple workspaces, not mix unrelated products into one support graph.
7. **Bounded execution:** expensive jobs run under workspace concurrency, lease, retry, cancellation, and credit settlement rules.
8. **Provider-safe evidence:** provider prompts use selected, redacted evidence instead of raw source bodies.
9. **Summary-first reads:** first-screen UI and scheduler discovery use `platformSummary` summaries before detailed list queries.

---

## Relationship To Existing Features

| Existing area | Intake relationship |
| --- | --- |
| `kb_generation_jobs` | Compatibility output path for article + FAQ draft generation. New intake jobs should create article drafts through this path or a successor adapter, not duplicate KB publishing logic. |
| Knowledge Base | Receives approved help articles generated from source-backed drafts. |
| FAQ Management | Receives owner-reviewed short answers linked to articles, surfaces, tags, and entities. |
| Product Surfaces | Receives page/workflow mappings from source templates, app URL context, and owner-selected screens. |
| Website Link Discovery | Feeds selected public product/docs/pricing/legal pages into intake without turning Canonica into a crawler. |
| Product Ontology | Receives product concepts after review/approval; entity candidates remain human-governed. |
| Canonical Answers | Receives approved answer drafts; canonical-first retrieval remains the runtime priority. |
| Drift / Signal Mutation | Uses source lineage and source-version manifests to know what content may be stale. |
| Widget / Hosted Help | Uses approved KB, FAQ, product surface, and canonical-answer outputs. |
| Billing | Owns paid entitlement and processing allowance checks before intake jobs run. |

## Runtime Alignment Contract

Knowledge Intake must publish into Canonica's existing runtime paths. It must not create parallel retrieval stores.

| Runtime path | Intake alignment requirement |
| --- | --- |
| Help center / hosted KB | Approved article output writes `kb_articles` and `kb_categories`; public content cache is invalidated for `kb`, `faqs`, `changelog`, and `context` as applicable. |
| Help center and widget search | Published articles must have embeddings before a topic is marked search-ready. Runtime search remains canonical-first, FAQ/custom-answer second, and vector/RAG fallback last. |
| FAQ/custom Q&A | Approved short answers write `canonica_faqs` with `status: published`, `active: true`, `articleId`, `contextKeys`, `entityIds`, and `tags` when available. |
| Canonical answer engine | Intake creates reviewable drafts/proposals first. Active canonical answers are written only after approval and must bump the canonical cache/source version. |
| Product surface related content | Article, FAQ, changelog, and surface changes must rebuild or mark stale `platformSummary/contextContent_{tId}_{sId}` so page-aware widget suggestions can see the new output. |
| Compiled context bundles | Published output must mark the existing destination source keys stale: `kb`, `docsNav`, `canonical`, `surfaces`, `releases`, `entities`, or `entityRelations`. Intake-only readiness changes must not force public bundle rebuilds. |
| Changelog and release drift | Changelog output writes existing changelog pages; release-aware output writes `canonica_releases` only when entity changes are known and owner-approved. Activation remains the drift trigger. |
| Support Board | Intake may create selected support-gap cards only when the Support Board feature is enabled. It must not mirror every source fact, ticket, or raw signal. |

---

## Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-05-31 | 1.0.0 | Initial day-one documentation contract for founder-first, paid-gated, source-backed Canonica intake. |
| 2026-05-31 | 1.1.0 | Added product-link-first intake doctrine, selected-page source creation, and unchanged-link cost controls. |
| 2026-05-31 | 1.2.0 | Added bounded execution and provider-safe evidence doctrine. |
| 2026-05-31 | 1.3.0 | Added summary-first read model and bucketed scheduler directory doctrine. |
| 2026-05-31 | 1.4.0 | Added runtime alignment contract for KB, FAQ, canonical answers, widget search, surface summaries, public cache, releases, and compiled context bundles. |
