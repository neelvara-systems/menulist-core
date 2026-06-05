# AnswerLattice Website - Final Assets Preparation

> **Status:** Implemented dummy asset contract for final website media
> **Last Updated:** 2026-06-05
> **Audience:** Product / Marketing / Design / Engineering

---

## Goal

Prepare the final videos, screenshots, and product-media placeholders needed to make the AnswerLattice website feel concrete, credible, and conversion-ready without using random stock assets, fake customers, or unsupported product claims.

The current website screen mockups are image-backed dummy assets, not live HTML/CSS product-scene drawings. This gives design and product an exact view of layout, aspect ratio, crop, and spacing before final screenshots or GIFs are approved.

---

## Current Dummy Asset Contract

- Public dummy image slots live in `public/answerlattice-website-assets/dummy/`.
- Every current screen asset is a PNG at exactly `1440 x 1200`.
- The site references screen slots through `src/app/sites/answerlattice/answerlatticeWebsiteAssets.ts`.
- Screen-like website placeholders render through `AnswerlatticeAssetImage.tsx`, which preserves the intrinsic asset aspect ratio.
- The deterministic generator is `scripts/website-assets/generate-answerlattice-website-dummy-assets.js`.
- Internal source SVGs and the generation manifest live in `packages/asset-factory/answerlattice-website-assets/dummy-sources/`.
- The public dummy folder should contain PNG screen slots only. Source SVGs, capture notes, and manifests stay internal.
- Final production screenshots or GIFs should replace the same named slots and preserve `1440 x 1200` unless the registry and this document are updated together.

---

## Asset Rules

1. Keep the current AnswerLattice theme colors: deep navy surfaces, Verdigris primary controls, primary-token signal accents, and existing logo treatment.
2. Do not use fake customer logos, fake testimonials, fake usage metrics, or stock people imagery.
3. Use one consistent demo workspace: `Sample SaaS workspace`.
4. Use generic but realistic sample product areas: Billing, Onboarding, Team Settings, Releases, Integrations, and Errors.
5. Scrub secrets, emails, customer names, API keys, widget keys, billing IDs, browser profile data, and private repo names.
6. Label any mock or sample workspace as sample/demo data in the capture, not as a real customer.
7. Capture implemented UI only. If a screen is behind a feature flag or controlled rollout, mark it as "controlled rollout" in the asset brief instead of presenting it as universally available.
8. Do not add visual assets just to decorate the page. Every asset must explain what the product is, who it is for, why it is better, how it works, proof that supports it, or what the user should do next.

---

## Required Video Assets

| Asset | Length | Where Used | UI / Route To Capture | What It Must Show |
|-------|--------|------------|-----------------------|-------------------|
| Hero product loop | 12-18 sec silent loop | Homepage first viewport, optional OG/social clips | `/answerlattice/activation`, `/answerlattice/product-surfaces`, `/answerlattice/widget`, `/answerlattice/governance` | Source imported, product page mapped, page-aware answer served, missing answer sent to review |
| Product overview walkthrough | 45-60 sec | Product page, sales follow-up, demo page | `/answerlattice/activation` plus homepage product preview tabs | Product setup readiness, mapped pages, widget status, feedback review, answer review |
| Page-aware widget demo | 30-45 sec | Homepage demo section, `/demo`, `/product/page-aware-widget` | Public `/demo` and dashboard `/answerlattice/widget` | Billing question gets billing answer; onboarding question gets onboarding answer; uncovered question opens fallback/review path |
| Product-area walkthrough set | 20-35 sec each | `/product/launch-setup`, `/product/page-aware-widget`, `/product/support-control`, `/product/knowledge-governance` | `/answerlattice/activation`, `/answerlattice/widget`, `/answerlattice/help`, `/answerlattice/governance` | One focused video per product area: setup checklist, widget controls, hosted help/ticket fallback, answer review |
| First-session setup walkthrough | 60-90 sec | `/get-started`, Pre-Onboarding, sales call follow-up | `/pre-onboarding`, `/get-started`, `/answerlattice/knowledge-intake`, `/answerlattice/product-surfaces`, `/answerlattice/widget` | Prepare sources, create workspace, import starter knowledge, map 2-5 pages, verify widget |
| Governance loop demo | 45-60 sec | Homepage closed-loop section, `/product/knowledge-governance`, proof pack | `/answerlattice/feedback`, `/answerlattice/support-board`, `/answerlattice/governance` | Feedback or ticket becomes review work, draft answer is reviewed, approved answer improves future support |
| Security and runtime controls | 25-40 sec | `/security`, `/security-one-pager`, enterprise-risk objections | `/answerlattice/widget`, `/answerlattice/install-center`, `/security-one-pager` | Allowed origins, blocked routes, safe context, manual screenshot input, install verification, owner approval |

---

## Required Screenshot Assets

| Asset | Primary Page | Capture Source | Required State |
|-------|--------------|----------------|----------------|
| Homepage hero workspace preview | `/` | `src/app/sites/answerlattice/components/HeroSection.tsx` or final dashboard capture | Billing page support, approved answer, safe context, review queue |
| Product proof tabs | `/` and `/product` | `src/app/sites/answerlattice/components/ProductPreviewSection.tsx` | Product setup, Key product pages, Widget install, Feedback review, Answer review |
| Product overview hero proof | `/product` | `src/app/sites/answerlattice/product/page.tsx` plus dashboard captures | What AnswerLattice is, what it connects, approved-answer conversion proof, safe runtime boundary |
| Activation Command Center | `/product/launch-setup`, `/get-started` | `/answerlattice/activation`, `src/app/(answerlattice)/answerlattice/activation/page.tsx` | Launch readiness, product profile, knowledge import, surfaces, widget install |
| Product Surfaces | Homepage proof, Product page | `/answerlattice/product-surfaces` | Billing, onboarding, team settings, releases, integrations with coverage states |
| Knowledge Intake | Pre-Onboarding, Product features | `/answerlattice/knowledge-intake`, `AnswerlatticeKnowledgeIntake.tsx` | Source links, docs/files, screenshot/recording text extraction, draft review state |
| Widget Management | Widget page, Security page | `/answerlattice/widget`, `AnswerlatticeWidgetManagement.tsx` | Allowed origins, blocked routes, context key, appearance, runtime checks |
| Install Center | Day-one launch pack, Install page | `/answerlattice/install-center`, `AnswerlatticeInstallCenter.tsx` | Agent packet, framework quickstarts, script install, verifier status |
| Hosted Help | Hosted help center page | `/answerlattice/help`, `HostedHelpClient.tsx` | Published docs, FAQs, release notes, custom help domain placeholder |
| FAQ Management | Product features, FAQ proof | `/answerlattice/faqs`, `AnswerlatticeFaqManagement.tsx` | Owner-written Q&A, article-backed FAQ, surface/context assignment |
| Tickets and fallback | Comparison, closed loop, Support Control | `/answerlattice/tickets` | Missing answer captured with safe page/debug context and review status |
| Feedback Review | Product preview, proof pack | `/answerlattice/feedback`, `AnswerlatticeFeedbackReview.tsx` | Rating, product-area feedback, feature request, Support Board handoff |
| Support Board | Support Control, governance loop | `/answerlattice/support-board`, `AnswerlatticeSupportBoard.tsx` | Private owner/staff support gaps, internal notes, answer-proposal handoff |
| Governance: Canonical Answers | Knowledge governance page | `/answerlattice/governance/answers`, `CanonicalAnswerEditor.tsx` | Approved answer, draft answer, source links, owner review status |
| Governance: Drift | Release-support proof | `/answerlattice/governance/drift`, `DriftDashboard.tsx` | Release changed support answer, drift pressure, review needed |
| Governance: Signals | Closed-loop proof | `/answerlattice/governance/signal-queue`, `MutationProposalReview.tsx` | Repeated misses grouped into draft improvements |
| Governance: Trust metrics | Security/trust proof | `/answerlattice/governance/trust`, `FounderTrustDashboard.tsx` | Coverage, trust readiness, widget status, failing surfaces |
| Billing and support credits | Pricing page | `/answerlattice/billing`, `AnswerlatticeBilling.tsx` | Plan, monthly support credits, top-up path, no sensitive payment IDs |
| FAQ category proof | `/faq` | Static public page capture | Four grouped FAQ sections: setup/source intake, page-aware boundaries, fallback/support work, operations/pricing/runtime |
| Contact fit proof | `/contact` | Static public page capture | Product URL, first support page, expected or recurring questions, and do-not-send private data boundary |

---

## Demo Workspace Content

Use this consistent sample data across screenshots and videos:

| Area | Sample Routes | Questions To Show | Expected Answer Path |
|------|---------------|-------------------|----------------------|
| Billing | `/settings/billing/invoices`, `/settings/billing/plan` | "Why was I charged today?", "Can a teammate manage billing?" | Approved billing answer, FAQ link, release note, fallback if uncovered |
| Onboarding | `/onboarding/import`, `/onboarding/checklist` | "Why did import fail?", "What is the next setup step?" | Setup guide, onboarding FAQ, safe error context |
| Team Settings | `/settings/team/roles`, `/settings/team/invites` | "Who can invite teammates?", "Can support users edit billing?" | Role-specific approved answer |
| Releases | `/releases/usage-limits`, `/changelog` | "What changed in this plan limit?" | Release note plus drift review if guidance changed |
| Integrations | `/integrations/slack`, `/integrations/webhooks` | "Why did Slack delivery fail?" | Integration article plus ticket fallback if unresolved |
| Errors | `/errors/payment-retry`, `/errors/import-timeout` | "How do I fix this error?" | Error-specific help, optional user-attached screenshot, fallback signal |

---

## Website Placement Plan

| Website Surface | Preferred Asset | Fallback Placeholder |
|-----------------|-----------------|----------------------|
| Homepage hero | 12-18 sec product loop or high-fidelity dashboard screenshot | `answerlattice-home-hero-workspace.png` |
| Conversion proof band | Six small UI crops or icon cards tied to product proof | Current compact icon cards, not screen mockups |
| Product preview | Final screenshots or short GIFs for tab states | Five `answerlattice-product-preview-*.png` slots |
| Product and product-area pages | Product overview image plus focused product-area screenshots | Four `answerlattice-product-area-*.png` slots plus `PageProofStrip` |
| Feature pages | One screenshot per feature family where the UI exists | Ten `answerlattice-feature-*.png` slots |
| SEO/use-case pages | Problem-to-reviewed-answer short clip or before/after image | Current diagrams and proof blocks; no screen-slot requirement yet |
| Demo section | Short screen recording from public `/demo` | Four `answerlattice-demo-surface-*.png` slots |
| Widget section | Dashboard screenshot plus widget runtime mini-video | `answerlattice-widget-runtime.png` |
| Security section | Runtime-controls screenshot and one-pager crop | Current status snapshots |
| Day-one launch pack | Install Center screenshot and source-prep screenshot | Current link cards |
| Proof pack | Full capture set with short captions | Current proof examples |

---

## Capture Checklist

- Desktop screenshots: 1440 x 1200 minimum, browser UI hidden unless the browser frame is part of the designed mock.
- Current dummy screen slots are exactly 1440 x 1200 PNGs. Final production screenshots or GIF poster frames should keep that size unless the registry changes.
- Mobile screenshots: 390 x 844 and 430 x 932 for hero, navigation, demo, widget, and pricing.
- Videos: 1440p source, export MP4 and WebM, no audio unless a narrated version is intentionally prepared.
- Cursor movement: slow, purposeful, no random scrolling.
- Text size: verify every label fits at desktop and mobile widths.
- Data privacy: no real customer, payment, email, token, workspace ID, tenant ID, or API key.
- Claim parity: each caption must match implemented behavior and must not imply helpdesk replacement, automatic publishing, broad API availability, or autonomous support.
- Accessibility: include captions or transcript for every video used on the website.

---

## Naming Convention

Use stable names so website implementation can reference assets without churn:

- `answerlattice-home-hero-product-loop.mp4`
- `answerlattice-home-hero-product-loop.webm`
- `answerlattice-home-hero-workspace.png`
- `answerlattice-product-preview-activation.png`
- `answerlattice-product-preview-surfaces.png`
- `answerlattice-product-preview-widget.png`
- `answerlattice-product-preview-feedback.png`
- `answerlattice-product-preview-governance.png`
- `answerlattice-product-area-launch-setup.png`
- `answerlattice-product-area-widget.png`
- `answerlattice-product-area-support-control.png`
- `answerlattice-product-area-governance.png`
- `answerlattice-feature-team-access.png`
- `answerlattice-feature-knowledge-intake.png`
- `answerlattice-feature-knowledge-base.png`
- `answerlattice-feature-faq-management.png`
- `answerlattice-feature-changelog.png`
- `answerlattice-feature-tickets.png`
- `answerlattice-feature-support-board.png`
- `answerlattice-feature-feedback-review.png`
- `answerlattice-feature-workflow-notifications.png`
- `answerlattice-feature-proactive-help.png`
- `answerlattice-demo-surface-billing.png`
- `answerlattice-demo-surface-onboarding.png`
- `answerlattice-demo-surface-settings.png`
- `answerlattice-demo-surface-release.png`
- `answerlattice-demo-page-aware-widget.mp4`
- `answerlattice-setup-walkthrough.mp4`
- `answerlattice-governance-loop.mp4`
- `answerlattice-security-runtime-controls.png`

Keep source briefs, raw captures, and review notes under the internal asset workflow. Move only approved optimized final media into public assets.
