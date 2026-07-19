# Knowledge Intake Command Center — Owner Helpdoc

> **Status:** IMPLEMENTED — owner help copy for day-one intake
> **Version:** 1.6.0
> **Created:** 2026-05-31
> **Audience:** Answerlattice workspace owners and staff

---

## Teach Answerlattice Your Product

Knowledge Intake is where you add the material Answerlattice can use to create your first support layer.

Start with:

- product website
- app URL
- support email
- product pages where users get stuck
- docs, files, FAQs, policies, changelog entries, setup notes, or support macros if you already have them

You do not need a perfect help center before starting.

---

## Before You Start

Real intake processing uses Firebase infrastructure. You need an active Answerlattice beta or subscription before Answerlattice imports sources, prepares drafts, embeds article output, or publishes accepted content.

Prepare:

- your product website
- docs/help, pricing, changelog, terms, privacy, or security links if you have them
- the URL where users log into your app
- any help docs or FAQ files, including TXT, Markdown, CSV, JSON, DOCX, or text-based PDF
- important policy answers: refunds, cancellation, billing, roles, permissions, data deletion
- 2-5 app pages where support questions happen often

---

## What You Can Add

| Source | Use it for |
| --- | --- |
| Product website | Features, pricing, positioning, policies, public product truth |
| App URL and product pages | Page-aware widget support |
| Docs/help center | Article and FAQ source material |
| Text-based PDF/DOCX/Markdown/TXT | Existing written support knowledge |
| CSV/FAQ CSV/JSON | FAQs, support macros, structured exports |
| Screenshots/images | UI context and troubleshooting evidence |
| Transcript/video/audio | Workflows and common explanations; transcripts are preferred, short raw media is credit-charged |
| Changelog/release notes | Source material for reviewed support drafts |
| Helpdesk export | Repeated questions and support gaps |
| Policy/owner notes | Important evidence that still requires review before publication |

---

## Starting From A Product Link

Your product website is usually the best first source.

Answerlattice uses it carefully:

1. You paste the main product link.
2. Answerlattice finds candidate support pages such as pricing, features, docs, FAQ, changelog, terms, privacy, security, or API docs.
3. You choose which pages Answerlattice should process.
4. Only selected pages consume processing allowance and become source material.

The app login URL is different. Answerlattice stores it as intake context, but it does not log in, use demo credentials, crawl private screens, or scan customer data.

If you add the same selected page with identical extracted text again in the same intake job, Answerlattice reuses the existing source instead of creating duplicate source and review records. It does not currently run background freshness checks.

---

## How Answerlattice Uses Sources

Answerlattice keeps source links so you can judge whether a draft is supported. It does not currently assign automatic authority tiers or run a general source-conflict detector inside Knowledge Intake.

Example:

If your pricing page says the Pro plan has API access but an old deck says API access is Enterprise-only, do not accept a draft until you confirm the correct policy. Use the linked evidence and reject or edit unsupported output.

---

## What You Review

Answerlattice tries to keep the first review small.

You may see source-backed KB articles, FAQs, product-surface mappings, and canonical-answer proposals. Each review card can show linked source excerpts and missing-evidence notes.

Review especially carefully when the content covers:

- pricing
- billing
- refunds
- cancellation
- security
- privacy
- legal
- data deletion
- plan limits
- roles and permissions
- API limits

---

## What Answerlattice Can Publish

Only after acceptance, Knowledge Intake can publish to:

- Knowledge Base
- FAQs
- canonical-answer proposals for the separate Governance workflow
- product page/surface support

Generated drafts do not become official answers automatically.

Publishing also runs the destination refresh work Answerlattice needs: approved articles attempt search embedding, FAQs become available to the answer layer, product-surface content is refreshed, and canonical proposals wait for the separate Governance approval flow.

---

## Intake Status

The current summary shows aggregate intake progress: source count, ready sources, review items, accepted/rejected items, published items, usage units, and latest job status where available. It does not currently certify topic-level readiness.

Before relying on support for a sensitive topic, review the published destination, verify its evidence, and test the real question through the deployed answer surface.

---

## Safe Upload Rules

Do not upload or paste:

- passwords
- tokens
- API keys
- payment card data
- private customer records
- database dumps
- production secrets
- internal credentials

Screenshots can contain visible sensitive data. Review them before upload. Answerlattice extracts only support-relevant text and does not keep the raw image as a source artifact.

For video/audio, use transcripts when possible. Raw media extraction is available for short support recordings, consumes Answerlattice support credits, and stores only extracted support text.

Answerlattice redacts supported common secret and personal-data patterns from extracted text and bounded metadata before storage. This is a safeguard, not a guarantee; review source material before upload and review every draft before acceptance.

---

## Deleting Sources

Source-level deletion is not available in the current Knowledge Intake screen. Do not assume that deleting one source would safely delete dependent drafts or published answers.

Until a governed deletion lifecycle is implemented, owners should reject unapproved review items, edit or retire published destination content through its owning workflow, and use the established workspace/privacy request process when broader data removal is required. Raw screenshot, audio, and video files are not retained by the current intake flow after support text is extracted.

---

## Common Questions

**Do I need docs first?**

No. Start with your product link, app URL, product pages, and policy answers.

**Can I import support tickets?**

Yes through exports such as CSV/JSON/txt when enabled. Native helpdesk connectors are not required for first setup.

**Can I upload screenshots or short recordings?**

Yes. Screenshots/images use OCR and short audio/video can be transcribed into source text. Screenshots currently cost 1 support credit; audio/video costs 2 support credits. If extraction fails, the reserved credits are refunded.

**Can Answerlattice scan my whole site?**

No. Answerlattice returns a bounded candidate list from the starting page and sitemap. Only pages you select are fetched into source records.

**Will Answerlattice crawl my app after I paste the app URL?**

No. The app URL is stored as intake context only. Private app screens should be added as reviewed page names, route patterns, screenshots, or safe context examples.

**Can I approve everything at once?**

The current screen supports deliberate item-by-item review. Do not assume an automatic low-risk/high-risk bulk-approval policy.

**Will Answerlattice answer from unapproved drafts?**

No. Drafts need approval before becoming official support truth.

**What should I check before accepting a draft?**

Check the linked source excerpt, where the answer applies, and any missing-evidence warning. If the source does not support the proposed answer, add evidence or reject the draft. A repeated ticket or owner note is a signal, not automatically approved truth.

---

## Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-05-31 | 1.0.0 | Initial owner helpdoc for Knowledge Intake Command Center. |
| 2026-05-31 | 1.1.0 | Added product link intake guidance, owner page selection, and app URL crawl boundary. |
| 2026-05-31 | 1.2.0 | Added owner-facing privacy filter expectation before AI draft generation. |
| 2026-05-31 | 1.3.0 | Added plain-language runtime readiness note for search, widget, FAQs, canonical answers, and hosted-help publishing. |
| 2026-07-17 | 1.4.0 | Added the linked-source evidence review rule for accept/reject decisions. |
| 2026-07-18 | 1.5.0 | Corrected source-deletion and raw-media retention guidance to current runtime behavior. |
| 2026-07-18 | 1.6.0 | Removed unimplemented authority, conflict, topic-readiness, widget-setup, and bulk-approval claims. |
