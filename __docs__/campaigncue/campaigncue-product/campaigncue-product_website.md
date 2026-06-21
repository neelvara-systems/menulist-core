# CampaignCue Product - Website Content

**Last production-site pass:** June 21, 2026
**Source of truth:** `src/app/sites/campaigncue/page.tsx`, `src/app/sites/campaigncue/styles.css`, and `src/constants/campaigncue/website.ts`

## Current Verdict

The CampaignCue public website is now a focused product site, not a status shell or rough feature catalog. It communicates:

- CampaignCue as a daily campaign desk for local businesses.
- The first-viewport contract: business fact -> today cue -> source-checked pack -> manual handoff and result memory.
- CampaignCue's difference from broad design/template tools, social schedulers, and generic AI copy tools.
- The complete loop: read business data, find the cue, prepare the pack, check risk, optionally edit/reuse assets, export manually, and record what happened.
- The day-one boundary: export/download/manual handoff only; no direct social posting, WhatsApp send, Google publish, account posting, or ad spend mutation.
- The owner value: start without a blank prompt, keep source facts attached, move faster on mobile, and control risk/cost.
- The output value: Campaign Packs include channel copy, creative files, print/in-store material, staff sharing text, email/SMS handoff, QR/offer-page notes, trust checks, and result prompts instead of only social posts.
- The editor value: Creative Studio and CueLayers make assets reusable while preserving source checks.

Public website copy must stay owner-facing. Do not expose internal repo details, deployment target names, Firebase project ids, implementation status tables, or local route names on the homepage.

## Research Inputs

| Source | Observed pattern | CampaignCue decision |
| --- | --- | --- |
| Gamma home: https://gamma.app/ | Strong AI creation loop, product categories, social proof, clear CTA, deep footer. | Use a crisp creation loop and product-depth footer, but avoid broad "make anything" positioning. |
| Gamma marketing page: https://gamma.app/solutions/marketing | Marketer-specific page uses prompt starts and specific marketing workflows. | Add business-type prompt starts so owners understand use cases before opening the app. |
| VistaCreate help: https://support.create.vista.com/hc/en-us/articles/360025475473-What-is-VistaCreate-used-for | Broad design product covers templates, social posts, presentations, ads, flyers, AI tools, commercial asset use. | Do not compete as a generic design/template catalog. Lead with business-data-backed campaign packs. |
| VistaCreate design help: https://support.create.vista.com/hc/en-us/categories/360002030713-Creating-and-Editing-Designs | Users expect AI tools, version history, resize, text work, layers, masking, download/share. | Show Creative Studio/CueLayers as part of campaign reuse, not as a disconnected design tool. |
| VistaCreate plans: https://support.create.vista.com/hc/en-us/articles/6347917526940-VistaCreate-Plans | Users understand freemium/pro creative benefits around AI, brand kits, team seats, version history, downloads. | Do not claim pricing/billing on the public site until billing is configured; keep cost-control language. |
| Adobe Express marketing templates: https://www.adobe.com/express/collections/marketing | Template-led product page exposes many marketing formats such as ads, flyers, posters, brochures, social graphics, and coupons. | Keep CampaignCue's output breadth visible, but position it around source-checked campaign packs instead of a template library. |
| Buffer small-business page: https://buffer.com/made-for/small-business | Calm small-business copy, simple benefits, scheduling/create/analyze/community sections, and clear "no complicated workflows" language. | Keep CampaignCue owner-readable and workflow-first; do not bury the core promise under internal feature names. |
| Buffer home: https://buffer.com/ | Product story is organized by jobs: Create, Publish, Analyze, Community, Collaborate, and AI Assistant. | CampaignCue should explain its jobs as Today cue, pack, review, handoff, and memory rather than listing every module first. |
| Canva AI: https://www.canva.com/canva-ai/ | Conversational design and editing are framed as working inside the editor while the user stays in control. | Keep Design Cue/CueLayers as controlled edit support, not autopilot creative claims. |
| Modash: https://www.modash.io/ | Workflow-first layout, "why" section, clear value in minutes, deep footer, friendly product language. | Use operational workflow language and a footer that helps visitors understand the product without many pages. |
| Blank: https://useblank.design/ | Production-grade product page uses a restrained first viewport, large confident typography, fewer immediate cards, tight navigation, one primary product visual, and consistent low-noise surfaces. | Rework CampaignCue away from a collage of cards: centered brand hero, compact screenshot-like preview, one accent color, border-first product surfaces, and calmer section spacing. |
| Ploy: https://ploy.ai/ | Product story moves from hero to proof strip, narrative sections, activity-style work records, platform engines, audience fit, CTA, and deep footer instead of equal-weight feature tiles. | Use proof ledgers and owner-job records for CampaignCue so visitors see concrete work happening, not a page of disconnected boxes. |
| Linear: https://linear.app/ | Editorial product page combines a confident hero, real product UI, figure-style sections, and operational workflows with sparse but precise cards. | Keep CampaignCue sections opinionated and workflow-led: one core idea per band, product-like previews where useful, and fewer repeated cards. |
| Genie Studio: https://geniestudio.app/ | Creative-tool page explains brand-aware generation through a simple promise, style-first workflow, collections, collaboration, prompt improvement, pricing, proof, FAQ, and CTA. | CampaignCue should keep brand/source context visible and make image reuse, collections/assets, and export formats understandable without technical diagnostics. |
| U.S. Chamber AI marketing guide: https://www.uschamber.com/co/grow/marketing/ai-small-business-marketing-guide | AI helps with ideation, repurposing, social posts, ad variants, email drafts, content briefs, landing pages, but human review remains required. | Make human review/trust checks central, not hidden in legal copy. |
| Google helpful content guidance: https://developers.google.com/search/docs/fundamentals/creating-helpful-content | Helpful pages are people-first, original, specific, useful, trustworthy, and not made mainly to capture search traffic. | Public copy must show concrete CampaignCue workflows, proof notes, and product boundaries instead of generic AI/category claims. |
| Nielsen Norman Group GenAI content design: https://www.nngroup.com/videos/genai-content-design/ | Product-specific generated content still needs concise, scannable web writing, inverted-pyramid structure, and plain language. | Keep CampaignCue sections short, owner-readable, and evidence-led; avoid diagnostic jargon and abstract automation copy. |
| Seesaw design tools category: https://www.seesaw.website/category/design-tools | Search-first header, category rail, short product descriptions, and quick scanning make the page easy to browse. | Use that scan speed as a CampaignCue Pack index with owner-job categories and compact ledger rows, but do not turn the homepage into a third-party directory or a wall of cards. |
| AdCreative home: https://www.adcreative.ai/ | Strong marketing-product taxonomy, quick business fit check, visible feature clusters, proof story, scan-website CTA, and repeated product preview surfaces. | Add a CampaignCue quick fit check that starts from owner bottlenecks, not generic ad-performance claims; keep proof/source checks instead of fake logos or unsupported conversion metrics. |
| AdCreative feature pages: https://www.adcreative.ai/ad-creatives, https://www.adcreative.ai/instant-ads, https://www.adcreative.ai/generate-texts-headlines, https://www.adcreative.ai/ai-ugc-videos | Each nested page has one capability promise, an input/output demo, proof logos, and benefit sections for performance, multi-platform outputs, customization, and speed. | Keep CampaignCue's homepage preview and output ledgers concrete: source input -> checked pack -> export, while rejecting direct account push and guaranteed performance language. |
| AdCreative analysis/trust pages: https://www.adcreative.ai/creative-insights, https://www.adcreative.ai/competitor-insights-ai, https://www.adcreative.ai/compliance-checker, https://www.adcreative.ai/creative-scoring | The analysis pages explain creative insights, competitor monitoring, compliance checks, and pre-launch scoring as separate proof surfaces. | CampaignCue should make Trust Center, result memory, source checks, and blocked claims obvious; do not claim predictive ad scoring until real model/evidence infrastructure exists. |
| AdCreative asset/tool pages: https://www.adcreative.ai/generate-product-photoshoots, https://www.adcreative.ai/product-videoshoot-ai, https://www.adcreative.ai/creative-utility-suite, https://www.adcreative.ai/custom-templates | Upload-based product photos, product videos, utility tools, and templates are shown with before/after or layer-style demos. | Use this as support for Creative Studio and CueLayers messaging: reuse uploaded/generated assets and export safely, but do not imply rendered provider video/photo generation is active. |
| AdCreative use-case/ROI pages: https://www.adcreative.ai/use-case/small-business, https://www.adcreative.ai/use-case/e-commerce, https://www.adcreative.ai/use-case/agencies, https://www.adcreative.ai/roi-calculator | Separate use-case pages and calculator frame the product by customer type and business value. | CampaignCue can use owner-type examples and future ROI education, but the current public site must avoid pricing/savings calculators until billing and real benchmark assumptions are configured. |
| AdCreative full-page visual system screenshot review | The page feels creative because it shows floating artifacts around the hero, colorful product tiles, visual feature cards, a mid-page asset wall, and real product screenshots before heavy explanation. | CampaignCue must not remain a text-only ledger page. Add creative artifact visuals that show campaign work being produced while preserving the export-first and source-check boundaries. |

## Implemented Homepage Structure

| Section | Purpose |
| --- | --- |
| Navigation | Product anchors plus app CTA. Public site only; owner app remains outside `sites/`. |
| Hero | H1 is `CampaignCue`; supporting copy promises today's promotion, multi-channel pack, and source-backed checks with one primary CTA rhythm. |
| Product preview | A compact screenshot-like Daily Desk and Campaign Pack preview shows a lunch-combo campaign with price check, Google draft, WhatsApp copy, and poster download. |
| Floating hero artifacts | CampaignCue-specific visual thumbnails around the hero show story, poster, Google update, reel script, and trust review outputs. They are illustrative UI artifacts, not proof logos or external results. |
| Flow strip | Today cue, checked facts, WhatsApp + Google, creative + print, manual handoff, and result memory appear as a quiet proof row instead of boxed micro-cards. |
| Quick fit check | AdCreative-inspired bottleneck chooser adapted for CampaignCue: owners pick the problem they recognize, then see the source-backed response and safe proof tag. |
| Creative powerhouse | Colorful six-card product system section: campaign packs, existing image reuse, local/in-store outputs, video briefs, trust checks, and result memory. |
| Real work proof | Dark proof band with ledger rows: concrete local-business examples name the fact, output, and proof note behind each campaign pack without using separate example cards. |
| Pack index | Seesaw-inspired compact catalog with Start, Pack, Review, and Handoff categories shown as grouped ledger rows so owners can scan what CampaignCue prepares. |
| Owner path | Connected four-step sequence: open Today, confirm facts, download the pack, and mark what happened. |
| Workflow | Continuous ledger: read business, find cue, prepare pack, check risk, optionally edit/reuse assets, export manually, record result. |
| Daily Campaign Desk | Explains the first owner screen and why it removes blank-prompt confusion. |
| Outputs | WhatsApp, Google local, social creative, print/staff, reel brief, UGC script, email/SMS/QR, and ad handoff shown as one output ledger. |
| Creative Studio | Shows the shared editor, source-locked design context, Design Cue actions, and export checks. |
| CueLayers | Explains image upload/generated-flat reuse with editable layer candidates and flat-safe fallback. |
| Examples | Restaurant, salon, retail, local-service, fitness, clinic, agency, and multi-location examples shown as compact prompt-start rows. |
| Campaign artifact wall | Visual wall of example handoff artifacts: WhatsApp status, story, poster, Google draft, reel list, QR card, UGC prompt, spend-gated ad copy, clinic reminder, and agency approval note. |
| Trust and Safety | Source checks, unsafe claim warnings, spend gates, and the concrete check matrix. |
| Delivery Boundary | Explicit no-direct-posting section aligned with day-one product rules. |
| Use Cases | Product capability ledger for Daily Desk, Business Brain, Campaign Studio, Creative Studio, CueLayers, and Trust Center. |
| FAQ | Answers direct publishing, MenuList relationship, generic design-tool difference, full pack scope, and image reuse. |
| CTA | Owner-simple close: open workspace, pick cue, export pack. |
| Footer | Gamma-style depth with Product, Workflows, Trust, and Company link groups, but all links point to live anchors or the app. |

## Hero Contract

- **Headline:** `CampaignCue`
- **Eyebrow:** `Daily campaign desk for local businesses`
- **Core promise:** Every day, know what to promote, what fact is missing, what is ready to use, and how to record the result.
- **Primary CTA:** `Open workspace` -> `/app` on product host, `/__campaigncue/app` locally through product base path handling.
- **Secondary CTA:** `See pack examples` -> `#studio`
- **Boundary pills:** Starts from real business facts, exports before it posts, risky claims stay visible.
- **Hero preview rule:** One clean product-preview surface in the first viewport. Avoid stacked hero checkpoint boxes, oversized dashboard chrome, or multiple card bands before the product story starts.
- **Fit-check rule:** If a page uses an interactive-style chooser, the options must map to real owner bottlenecks and active CampaignCue outputs. Do not add fake ROI, predictive conversion score, or direct-posting promises.

## SEO Meta

- **Page title:** `CampaignCue - Daily Campaign Desk for Local Businesses`
- **Meta description:** CampaignCue turns real local-business facts into source-checked campaign packs for WhatsApp, Google, social, print, video, and manual handoff.
- **Structured data:** `SoftwareApplication` and `FAQPage`. No pricing claim is included because billing is not configured.
- **Sitemap:** Homepage only until additional public pages exist.
- **Robots:** Product app paths remain disallowed.

## Visual Direction

The site uses an operational SaaS layout with product and campaign artifacts as the primary visuals. The current production pass follows Blank for restraint, Ploy for proof/activity records, Linear for editorial product rhythm, Seesaw for fast scanning, and AdCreative for creative artifact density. The homepage should feel like a creative operating desk: restrained first viewport, large brand-led typography, screenshot-like product surfaces, colorful campaign thumbnails, connected sequences, and proof ledgers. Use ledgers instead of repeated card grids when listing source proof, owner steps, or output inventories, but use visual product tiles when showing CampaignCue's creative moat. It intentionally avoids:

- Generic abstract AI imagery.
- Broad "make anything" claims.
- Fake social proof, fake metrics, unsupported customer outcomes, or unverified logos.
- Vague automation phrases without showing the exact owner action and output.
- One-note purple/blue gradient branding.
- Text-only ledgers that make CampaignCue feel like a documentation page instead of a campaign asset product.
- Overbuilt first-viewport card clusters, repeated equal-weight card grids without product visuals, random accent colors, or decorative gradients that make the page feel like a student collage.
- Public claims about billing, direct integrations, direct account posting, or social-account connection.
- Internal implementation or Firebase wording.

The design should stay practical and owner-readable: concrete output examples, short headings, visible safety state, proof notes, and no broken footer links. Every major section should answer one SMB-owner question: what fact is used, what pack is prepared, what review is required, and what the owner can do next.

### CampaignCue Palette

The active CampaignCue website palette follows the provided business-card reference: deep navy for authority surfaces, navy for primary text and product UI, rose pink for campaign accents, soft pink for supporting surfaces, and white for clean workspace contrast. Current CSS tokens:

- `--cc-ink: #061a78`
- `--cc-deep-navy: #020c4f`
- `--cc-navy-soft: #152567`
- `--cc-pink: #d96f9f`
- `--cc-pink-soft: #f4d2e2`
- `--cc-bg: #fbf7fa`
- `--cc-surface: #ffffff`

Do not reintroduce the previous lime/green accent family or mixed pastel asset-wall colors on the CampaignCue public site. Visual variety should come from navy, rose, soft pink, white, spacing, product previews, and artifact composition.

### Scroll Motion

CampaignCue uses a lightweight viewport reveal on public website sections, preview panels, ledger rows, creative cards, asset tiles, trust panels, the final CTA, and footer groups. The motion should feel like finished work entering the page, not a distracting parallax or global smooth-scroll layer.

Implementation rules:

- `src/app/sites/campaigncue/styles.css` and `src/app/sites/campaigncue/scroll-reveal.css` are root-loaded from `src/app/layout.tsx` so clean local sessions do not request a missing nested `app/sites/campaigncue/layout.css` chunk.
- `CampaignCueScrollReveal` is the only public-site client island for reveal motion.
- content remains visible by default. The hidden pending state is added only after the client observer mounts.
- Reduced-motion users see static content with no blur, translate, or transition.
- Visible elements must return to `transform: none` and `will-change: auto` so the page does not keep unnecessary compositor layers while scrolling.
- Do not add global smooth scrolling, heavy animation libraries, or scroll-jacking.

## AdCreative Adoption Notes

CampaignCue should adopt:

- quick-fit entry based on owner bottlenecks;
- capability taxonomy that is easy to scan;
- concrete input/output product previews;
- floating hero artifacts when they represent real CampaignCue outputs;
- colorful product tiles and asset-wall examples that show the kinds of work CampaignCue prepares;
- separate proof surfaces for trust, results, and asset reuse;
- use-case language for small business, e-commerce-like retail, agencies, and multi-location work.

CampaignCue should reject or soften:

- guaranteed conversion/ROAS claims;
- fake or unverified logo/proof strips;
- direct ad-account push, social-account posting, or WhatsApp send language;
- pricing, trial, credit, or ROI calculator claims before billing is configured;
- broad all-in-one creative-tool positioning that hides CampaignCue's source-backed campaign-pack boundary.

## Route And Product Boundary

| Surface | Rule |
| --- | --- |
| Public homepage | Files live under `src/app/sites/campaigncue`. |
| Owner app | Files live under `src/app/(campaigncue)/campaigncue/app`. |
| App CTA | Public product host `/app` rewrites to CampaignCue owner app route. |
| API | `/api/campaigncue/*` must pass through middleware and never rewrite into the public site. |
| Footer links | Use active anchors or `/app`; do not add links to pages that do not exist. |

## Website Content Boundaries

| Do say | Do not say |
| --- | --- |
| Daily campaign desk | Generic design editor |
| Export-ready packs | Auto-publish everywhere |
| Manual posting workflow | Connected social accounts on day one |
| Source-backed checks | Guaranteed sales/ranking |
| Owner review | Full autopilot |
| CueLayers creates editable candidates | Perfect source-file recovery |
| Direct account posting outside active delivery mode | Account posting already active |
| Proof note, source fact, or boundary | "AI will handle everything" |

## FAQ

**Q:** Does CampaignCue publish directly to Instagram, Google, or WhatsApp?
**A:** No. The active product is export/download-first. It creates packs owners can copy, download, schedule manually, approve, or mark used. Direct account posting is not part of the active delivery mode.

**Q:** Is this only for MenuList restaurants?
**A:** No. MenuList can be a read-only restaurant source, but salons, agencies, and non-MenuList businesses can use owner-entered sources and uploaded assets.

**Q:** How is this different from a generic design tool?
**A:** CampaignCue starts from business facts and local campaign opportunities. The editor exists to finish campaign assets, not to become a generic blank-canvas design product.

**Q:** Do owners only get social posts?
**A:** No. A campaign pack can include WhatsApp text and images, Google local fields, social assets, print and in-store material, staff messages, email or SMS copy, QR or offer-page notes, trust checks, and a result prompt.

**Q:** Can owners reuse existing images?
**A:** Yes. CueLayers treats uploaded or generated flat images as editable candidates when reconstruction is safe, with protected text, source truth, and a flat fallback when reconstruction is uncertain.
