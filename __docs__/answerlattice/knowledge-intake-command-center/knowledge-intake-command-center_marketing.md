# Knowledge Intake Command Center — Marketing Notes

> **Status:** READY — claims aligned to implemented day-one intake
> **Version:** 1.5.0
> **Created:** 2026-05-31
> **Audience:** Website / Sales / Product

---

## Positioning

Primary line:

**Teach Answerlattice your product once. Launch support that stays source-backed.**

Short line:

**Paste your product link. Answerlattice builds the first support layer.**

Long description:

Answerlattice intake helps first-time founders and solo SaaS builders turn product links, selected website pages, docs, files, FAQs, release notes, setup notes, and support macros into source-backed support knowledge. Answerlattice prepares help articles, FAQs, product-surface suggestions, and canonical answer proposals, then asks the owner to approve what should publish.

---

## What This Sells

| Founder pain | Answerlattice intake story |
| --- | --- |
| I launched fast and support is messy. | Add the product link and anything you already have. Answerlattice turns it into a support layer. |
| I have no full docs yet. | Start with product URL, app URL, starter surfaces, and policy questions. |
| I only have a marketing site. | Answerlattice finds candidate pricing, docs, FAQ, legal, security, changelog, and API pages, then processes only what you select. |
| I do not want AI guessing. | Answerlattice shows linked source evidence and requires owner review before drafts become official. |
| I cannot review 100 drafts. | Answerlattice groups drafts by destination so the owner can accept, edit, reject, and publish intentionally. |
| My product changes quickly. | Intake uses release notes as source context and publishes through the same KB, FAQ, surface, and canonical-proposal paths that the runtime already reads. Changelog entries stay owner-managed. |
| I worry about cost. | Mutating and processing actions require an active Answerlattice beta or subscription and stay bounded by source/review caps. |

---

## Buyer-Friendly Vocabulary

Use first:

- product link
- sources
- source coverage
- launch decisions
- approved answers
- source-backed drafts
- support coverage
- page-aware help
- safe to approve
- needs your confirmation

Use after the buyer understands the value, or internally:

- ontology
- canonical answer engine
- drift detection
- signal mutation
- source evidence
- freshness state
- embedding
- RAG

---

## Verified Current Claims

- Answerlattice can scan selected website/docs pages.
- Answerlattice can discover candidate product website pages without turning every discovered URL into a Firestore source document.
- Answerlattice deduplicates an identical selected-page source within the same intake job instead of creating duplicate source and review records.
- Answerlattice can import selected URLs, TXT, Markdown, CSV, JSON, DOCX, text-based PDF, screenshots/images, and short audio/video evidence. XLSX, PPTX, ZIP docs, and native connector imports are not public claims until implemented.
- Answerlattice keeps bounded source evidence on review drafts and can surface missing evidence before approval.
- Answerlattice generates source-backed article, FAQ, product-surface, and canonical-proposal drafts.
- Answerlattice shows aggregate intake progress; topic-level readiness is not a current Knowledge Intake claim.
- Answerlattice keeps source lineage on published content.

---

## Claims To Avoid

- "Unlimited import"
- "Free scan"
- "AI automatically writes your support site"
- "Zero hallucinations"
- "Answerlattice handles support for you"
- "Connect every tool instantly"
- "Autopublish answers"
- "Full website crawl"
- "No owner review needed"

---

## Website Hero Option

Headline:

**Teach Answerlattice your product. Launch support before users get stuck.**

Subheadline:

Add your product link, choose the support-worthy pages Answerlattice finds, add docs, files, policies, release notes or existing changelog entries, screenshots, transcripts, or short support recordings, and confirm only the launch decisions that matter.

Proof strip:

Paid processing · Source-backed drafts · Evidence review · Owner approval · Safe publish

CTA:

Create paid workspace

Secondary CTA:

See sample intake

---

## Differentiation

Generic import tools:

- upload docs
- generate articles
- hope the answers are right

Answerlattice intake:

- collects sources
- preserves corroborating source evidence
- shows missing evidence before approval
- drafts multiple support outputs
- requires owner approval
- publishes owner-approved help articles, FAQs, and product-page help, while canonical drafts enter the separate Governance proposal flow
- tracks aggregate intake progress and source lineage

Sales boundary:

Only claim "ready for widget/search" when the approved content has completed the runtime refresh path: embeddings for article-backed search, published FAQs, active approved answers, refreshed page-aware surface summary, and cache/source-version invalidation.

---

## Launch Story

For founders shipping with AI:

AI can help build the app. Answerlattice helps support it correctly.

The first product moment should be:

1. Founder pastes the product URL.
2. Answerlattice finds support-worthy public pages.
3. Answerlattice shows source-backed review drafts and missing evidence.
4. Founder accepts, edits, or rejects each important output.
5. Approved destinations become available to the existing widget/help/search runtime.

---

## Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-05-31 | 1.0.0 | Initial marketing notes for Knowledge Intake Command Center. |
| 2026-05-31 | 1.1.0 | Added selected-page product link story and unchanged-source cost claim boundaries. |
| 2026-05-31 | 1.2.0 | Added sales boundary for widget/search readiness after approved content publish. |
| 2026-07-18 | 1.3.0 | Removed unverified product-map, source-authority ranking, and broad conflict-detection claims; aligned marketing to evidence review and current destinations. |
| 2026-07-18 | 1.4.0 | Removed topic-readiness, conflict-display, and background freshness claims; aligned re-import messaging to deterministic source dedupe. |
| 2026-07-26 | 1.5.0 | Removed residual readiness/direct-approved-answer implications and aligned canonical output to the separate proposal workflow. |
