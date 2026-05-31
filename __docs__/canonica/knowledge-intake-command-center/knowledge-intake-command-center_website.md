# Knowledge Intake Command Center — Website Content Plan

> **Status:** PLANNED — update public website only after implementation
> **Version:** 1.0.0
> **Created:** 2026-05-31
> **Audience:** Website / Product / SEO

---

## Claim Boundary

Until this feature is implemented, the public website must not claim live support for the full intake engine.

Current website can mention:

- starter knowledge import
- KB generation
- article-backed FAQ generation
- product surface templates
- owner-approved answers
- no auto-publishing
- current upload/import screen where already true

After implementation, add the intake story across homepage, product, pricing, get-started, install, FAQ, security, and a dedicated product/feature page.

---

## Dedicated Page

Create:

```text
/product/knowledge-intake
```

Page title:

**Knowledge Intake for AI-built SaaS**

Meta description:

Teach Canonica your product from links, docs, files, policies, changelog entries, screenshots, transcripts, and support exports. Generate source-backed support drafts with owner approval.

Hero:

**Teach Canonica your product before users need support.**

Body:

Paste your product link, choose the support-worthy pages Canonica finds, add any docs or files you already have, and answer a few launch policy questions. Canonica builds a source-backed product map, flags conflicts, drafts help content and approved answers, then shows what is ready before your widget goes live.

CTA:

Create paid workspace

Secondary CTA:

See sample intake

---

## Homepage Placement

Add a section after the product loop/demo:

Title:

**Start with your product link, not a blank help center.**

Cards:

1. **Add sources** — Product website, selected public pages, app URL, docs, files, policies, changelog, screenshots, transcripts, and support exports.
2. **Review what Canonica found** — Source trust, duplicates, conflicts, and missing launch information.
3. **Approve launch decisions** — Pricing, refunds, billing, roles, permissions, and other high-risk answers require owner approval.
4. **Publish support** — Help articles, FAQs, approved answers, product-page help, and readiness summaries become available to the support layer.

Small note:

Real intake processing starts after paid workspace activation so AI and Firebase usage stay bounded.

Claim boundary:

Do not say imported content is instantly "live in AI support" until implementation proves the full runtime refresh path: article embedding, FAQ publication, canonical answer approval, product-surface summary refresh, public content cache invalidation, and compiled context source-version updates.

---

## Pricing Page

Add once entitlement/limits are implemented:

Section title:

**Processing is included, but never unlimited.**

Copy:

Each plan includes a bounded intake allowance for pages scanned, files processed, drafts generated, and approved support content. Public help page views and normal widget loading are separate from intake processing.

Avoid:

- "Start free"
- "Unlimited documents"
- "Unlimited scan"

---

## Get Started Page

Replace free-beta language after onboarding is updated:

Headline:

**Create your paid Canonica workspace.**

Copy:

Canonica runs AI and Firebase processing for your product, so real workspaces start with a paid plan. After payment, you can teach Canonica your product with a website, app URL, starter policy answers, docs, files, and support exports.

First-session checklist:

- choose plan
- create workspace
- add product website and app URL
- add docs/files if available
- answer launch policy questions
- review first decisions
- publish approved support

---

## FAQ Additions

**Can Canonica import my website?**

Yes, after paid workspace activation and within plan limits. Canonica discovers candidate public pages, lets you choose support-relevant pages, and processes only the selected pages instead of crawling your entire site by default.

**Does Canonica crawl my app after I paste the app URL?**

No. The app URL helps with widget setup and page mapping. Canonica does not log in, use demo credentials, crawl private dashboards, or scan customer data.

**Can I start without docs?**

Yes. Start with your product link, app URL, product surfaces, and launch policy questions. Docs and files improve the result, but they are not required for the first support layer.

**Will Canonica publish generated answers automatically?**

No. Canonica can draft help articles, FAQs, and approved-answer candidates, but owner approval is required before authoritative answers go live.

**Can I upload video or screenshots?**

Yes, with limits. Screenshots are treated as evidence and should not contain secrets. Video/audio works best through transcripts; raw media transcription is paid and capped.

**Why do I need to pay before import?**

Real import uses AI processing, file storage, parsing, and Firebase infrastructure. Paid activation prevents surprise cost and keeps the product sustainable.

---

## Security Page Additions

Section:

**Safe source intake**

Bullets:

- Source files are private workspace data.
- Raw/heavy artifacts live in Storage, not public Firestore documents.
- URL import blocks private/internal addresses and uses capped fetches.
- Discovered-but-skipped website URLs are stored as a manifest, not Firestore source documents.
- Unchanged selected website pages skip expensive reprocessing.
- Screenshots and videos should not contain passwords, tokens, card data, or private customer records.
- Owner approval is required before high-risk answers become official.
- Sources can be deleted with dependent unapproved drafts.

---

## Public Copy Rules

Do say:

- source-backed
- owner-approved
- paid processing
- selected pages
- topic readiness
- support launch decisions

Do not say:

- free import
- unlimited import
- AI autopublish
- full crawl
- handles all support
- no review needed

---

## Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-05-31 | 1.0.0 | Initial website content plan for Knowledge Intake Command Center. |
| 2026-05-31 | 1.1.0 | Added selected-page website import and app URL crawl boundary for public messaging. |
| 2026-05-31 | 1.2.0 | Added runtime claim boundary for search, widget, hosted help, FAQ, canonical, surface-summary, and compiled-context readiness. |
