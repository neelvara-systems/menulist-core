# Knowledge Intake Command Center — Owner Helpdoc

> **Status:** IMPLEMENTED — owner help copy for day-one intake
> **Version:** 1.0.0
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
| Changelog/release notes | Stale answer and release-impact review |
| Helpdesk export | Repeated questions and support gaps |
| Policy pack | High-authority owner answers |

---

## Starting From A Product Link

Your product website is usually the best first source.

Answerlattice uses it carefully:

1. You paste the main product link.
2. Answerlattice finds candidate support pages such as pricing, features, docs, FAQ, changelog, terms, privacy, security, or API docs.
3. You choose which pages Answerlattice should process.
4. Only selected pages consume processing allowance and become source material.

The app login URL is different. Answerlattice uses it to help you set up product pages and the widget, but it does not log in, use demo credentials, crawl private screens, or scan customer data.

If you run the same link again and the page did not change, Answerlattice should update freshness only and skip expensive reprocessing.

---

## How Answerlattice Uses Sources

Answerlattice does not trust every source equally.

Owner-approved answers and current policy answers are stronger than old PDFs, sales decks, or support chat exports. If sources disagree, Answerlattice asks you to decide.

Example:

If your pricing page says the Pro plan has API access but an old deck says API access is Enterprise-only, Answerlattice will not guess. It will create a launch decision for you to confirm.

---

## What You Review

Answerlattice tries to keep the first review small.

You may see:

- missing refund policy
- billing rule needs confirmation
- role permission conflict
- old source disagrees with current docs
- draft answer for approval
- product concept to approve
- safe articles ready for bulk approval

High-risk topics always need owner/admin approval:

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

Only after approval, Answerlattice can publish to:

- Knowledge Base
- FAQs
- approved answers
- product page/surface support
- widget suggestions
- hosted help
- support review tasks

Generated drafts do not become official answers automatically.

Publishing also runs the behind-the-scenes refresh work Answerlattice needs for search and the widget: approved articles are prepared for search, FAQs become available to the answer layer, approved answers become eligible for canonical-first retrieval, and page-aware related content is refreshed for mapped product screens.

---

## Readiness

Readiness shows where Answerlattice can safely help users.

Examples:

- Onboarding: ready
- Billing: partial, refund policy missing
- Team settings: ready
- API errors: not ready
- Security: needs review

Do not turn on support for a sensitive topic until it is ready or reviewed.

If an approved article is visible in hosted help but still waiting for search preparation, the topic should stay `partial` until Answerlattice confirms the article can be used by widget/search answers.

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

Answerlattice should also scan normalized sources for secrets and private data before building AI drafts. If risky content is found, Answerlattice asks you to review or remove it instead of using it as support truth.

---

## Deleting Sources

You can remove a source. When you do:

- unapproved drafts created from that source are removed or marked stale
- approved content keeps lineage but may need review
- original files can be deleted depending on retention settings
- Answerlattice updates readiness and source-version summaries

---

## Common Questions

**Do I need docs first?**

No. Start with your product link, app URL, product pages, and policy answers.

**Can I import support tickets?**

Yes through exports such as CSV/JSON/txt when enabled. Native helpdesk connectors are not required for first setup.

**Can I upload screenshots or short recordings?**

Yes. Screenshots/images use OCR and short audio/video can be transcribed into source text. Screenshots currently cost 1 support credit; audio/video costs 2 support credits. If extraction fails, the reserved credits are refunded.

**Can Answerlattice scan my whole site?**

No. Answerlattice scans selected support-relevant pages within your plan limits.

**Will Answerlattice crawl my app after I paste the app URL?**

No. The app URL helps with widget setup and product surface mapping. Private app screens should be added as page names, route patterns, screenshots, or safe context examples.

**Can I approve everything at once?**

Only safe low-risk groups can be bulk approved. High-risk answers require explicit owner/admin review.

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
