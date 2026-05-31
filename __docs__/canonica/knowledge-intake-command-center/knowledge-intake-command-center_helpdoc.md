# Knowledge Intake Command Center — Owner Helpdoc

> **Status:** PLANNED — publish after feature implementation
> **Version:** 1.0.0
> **Created:** 2026-05-31
> **Audience:** Canonica workspace owners and staff

---

## Teach Canonica Your Product

Knowledge Intake is where you add the material Canonica can use to create your first support layer.

Start with:

- product website
- app URL
- support email
- product pages where users get stuck
- docs, files, FAQs, policies, changelog, screenshots, transcripts, or support exports if you already have them

You do not need a perfect help center before starting.

---

## Before You Start

Real intake processing uses paid AI and Firebase infrastructure. You need an active Canonica plan and available processing allowance before Canonica scans, parses, transcribes, generates drafts, embeds content, or runs readiness checks.

Prepare:

- your product website
- docs/help, pricing, changelog, terms, privacy, or security links if you have them
- the URL where users log into your app
- any help docs or FAQ files
- important policy answers: refunds, cancellation, billing, roles, permissions, data deletion
- 2-5 app pages where support questions happen often

---

## What You Can Add

| Source | Use it for |
| --- | --- |
| Product website | Features, pricing, positioning, policies, public product truth |
| App URL and product pages | Page-aware widget support |
| Docs/help center | Article and FAQ source material |
| PDF/DOCX/Markdown/TXT/HTML | Existing written support knowledge |
| CSV/FAQ CSV/XLSX | FAQs, support macros, structured exports |
| PPTX/sales deck | Low-authority context only; review carefully |
| JSON/YAML | Structured product or docs exports |
| ZIP of docs | Bulk docs import with path validation |
| Screenshots/images | UI context and troubleshooting evidence |
| Transcript/video/audio | Workflows and common explanations; transcripts are preferred |
| Changelog/release notes | Stale answer and release-impact review |
| Helpdesk export | Repeated questions and support gaps |
| Policy pack | High-authority owner answers |

---

## Starting From A Product Link

Your product website is usually the best first source.

Canonica uses it carefully:

1. You paste the main product link.
2. Canonica finds candidate support pages such as pricing, features, docs, FAQ, changelog, terms, privacy, security, or API docs.
3. You choose which pages Canonica should process.
4. Only selected pages consume processing allowance and become source material.

The app login URL is different. Canonica uses it to help you set up product pages and the widget, but it does not log in, use demo credentials, crawl private screens, or scan customer data.

If you run the same link again and the page did not change, Canonica should update freshness only and skip expensive reprocessing.

---

## How Canonica Uses Sources

Canonica does not trust every source equally.

Owner-approved answers and current policy answers are stronger than old PDFs, sales decks, or support chat exports. If sources disagree, Canonica asks you to decide.

Example:

If your pricing page says the Pro plan has API access but an old deck says API access is Enterprise-only, Canonica will not guess. It will create a launch decision for you to confirm.

---

## What You Review

Canonica tries to keep the first review small.

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

## What Canonica Can Publish

Only after approval, Canonica can publish to:

- Knowledge Base
- FAQs
- approved answers
- product page/surface support
- widget suggestions
- hosted help
- support review tasks

Generated drafts do not become official answers automatically.

Publishing also runs the behind-the-scenes refresh work Canonica needs for search and the widget: approved articles are prepared for search, FAQs become available to the answer layer, approved answers become eligible for canonical-first retrieval, and page-aware related content is refreshed for mapped product screens.

---

## Readiness

Readiness shows where Canonica can safely help users.

Examples:

- Onboarding: ready
- Billing: partial, refund policy missing
- Team settings: ready
- API errors: not ready
- Security: needs review

Do not turn on support for a sensitive topic until it is ready or reviewed.

If an approved article is visible in hosted help but still waiting for search preparation, the topic should stay `partial` until Canonica confirms the article can be used by widget/search answers.

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

Screenshots can contain hidden metadata or visible sensitive data. Review them before upload.

For video/audio, use transcripts when possible. Raw media processing consumes more allowance.

Canonica should also scan normalized sources for secrets and private data before building AI drafts. If risky content is found, Canonica asks you to review or remove it instead of using it as support truth.

---

## Deleting Sources

You can remove a source. When you do:

- unapproved drafts created from that source are removed or marked stale
- approved content keeps lineage but may need review
- original files can be deleted depending on retention settings
- Canonica updates readiness and source-version summaries

---

## Common Questions

**Do I need docs first?**

No. Start with your product link, app URL, product pages, and policy answers.

**Can I import support tickets?**

Yes through exports such as CSV/JSON/txt when enabled. Native helpdesk connectors are not required for first setup.

**Can Canonica scan my whole site?**

No. Canonica scans selected support-relevant pages within your plan limits.

**Will Canonica crawl my app after I paste the app URL?**

No. The app URL helps with widget setup and product surface mapping. Private app screens should be added as page names, route patterns, screenshots, or safe context examples.

**Can I approve everything at once?**

Only safe low-risk groups can be bulk approved. High-risk answers require explicit owner/admin review.

**Will Canonica answer from unapproved drafts?**

No. Drafts need approval before becoming official support truth.

---

## Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-05-31 | 1.0.0 | Initial owner helpdoc for Knowledge Intake Command Center. |
| 2026-05-31 | 1.1.0 | Added product link intake guidance, owner page selection, and app URL crawl boundary. |
| 2026-05-31 | 1.2.0 | Added owner-facing privacy filter expectation before AI draft generation. |
| 2026-05-31 | 1.3.0 | Added plain-language runtime readiness note for search, widget, FAQs, canonical answers, and hosted-help publishing. |
