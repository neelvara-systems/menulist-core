# CampaignCue Product - Website Content

**Last production-site pass:** June 21, 2026
**Source of truth:** `src/app/sites/campaigncue/page.tsx`, `src/app/sites/campaigncue/features/[featureSlug]/page.tsx`, `src/app/sites/campaigncue/use-cases/small-business/page.tsx`, `src/app/sites/campaigncue/components/CampaignCueMobileNavigation.tsx`, `src/app/sites/campaigncue/styles.css`, `src/constants/campaigncue/website.ts`, and `src/constants/campaigncue/websiteFeatures.ts`

## Current Verdict

The CampaignCue public website is now a focused product site, not a status shell or rough feature catalog. It communicates:

- CampaignCue as a daily campaign desk for local businesses.
- The first-viewport contract: business fact -> today cue -> source-checked pack -> manual handoff and result memory.
- CampaignCue's difference from broad design/template tools, social schedulers, and generic AI copy tools.
- The complete loop: read business data, find the cue, prepare the pack, check risk, optionally edit/reuse assets, export manually, and record what happened.
- The day-one boundary: export/download/manual handoff only; no direct social posting, WhatsApp send, Google publish, account posting, or ad spend mutation.
- The owner value: start without a blank prompt, keep source facts attached, move faster on mobile, and control risk/cost.
- The output value: Campaign Packs include channel copy, creative files, print/in-store material, staff sharing text, email/SMS handoff, QR/offer-page notes, trust checks, and result prompts instead of only social posts.
- The explanation value: the homepage now uses a flow-map and Campaign Pack Room so first-time SMB owners can understand the connected workflow before reading deeper feature sections.
- The editor value: Creative Studio and CueLayers make assets reusable while preserving source checks.
- The visual-output value: Creative Output System cards now show named artifacts inside the mini previews, such as WhatsApp, Google draft, poster, source photo, QR note, staff line, price check, and result-memory states, instead of generic placeholder blocks.
- The proof value: Brand Playbook guidance, a proof deck preview, reusable-template loop, proof deck review briefs, UGC/reel disclosure notes, avoid-list checks, and a concrete claim/source/risk/action trust matrix stay visible with the pack without replacing source facts.
- Dedicated public feature pages now explain the strongest CampaignCue workflows one-by-one: Daily Campaign Desk, Campaign Pack Studio, Creative Studio, CueLayers, Creative Trust Center, Brand Playbook and Proof Deck, and Reusable Pack Templates. These pages use static dashboard/editor previews only; owner data and owner routes stay inside the CampaignCue app.
- A dedicated `/use-cases/small-business` page now explains the SMB owner journey with AdCreative-style visual output sequencing adapted to CampaignCue's source-backed, export-first boundary.

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
| AdCreative home: https://www.adcreative.ai/ | Strong marketing-product taxonomy, owner-fit entry, visible feature clusters, proof story, scan-website CTA, and repeated product preview surfaces. | Adapt the owner-fit idea into a CampaignCue problem band and workflow explanation; keep proof/source checks instead of fake logos or unsupported conversion metrics. |
| AdCreative feature pages: https://www.adcreative.ai/ad-creatives, https://www.adcreative.ai/instant-ads, https://www.adcreative.ai/generate-texts-headlines, https://www.adcreative.ai/ai-ugc-videos | Each nested page has one capability promise, an input/output demo, proof logos, and benefit sections for performance, multi-platform outputs, customization, and speed. | Keep CampaignCue's homepage preview and output ledgers concrete: source input -> checked pack -> export, while rejecting direct account push and guaranteed performance language. |
| AdCreative analysis/trust pages: https://www.adcreative.ai/creative-insights, https://www.adcreative.ai/competitor-insights-ai, https://www.adcreative.ai/compliance-checker, https://www.adcreative.ai/creative-scoring | The analysis pages explain creative insights, competitor monitoring, compliance checks, and pre-launch scoring as separate proof surfaces. | CampaignCue should make Trust Center, result memory, source checks, and blocked claims obvious; do not claim predictive ad scoring until real model/evidence infrastructure exists. |
| AdCreative asset/tool pages: https://www.adcreative.ai/generate-product-photoshoots, https://www.adcreative.ai/product-videoshoot-ai, https://www.adcreative.ai/creative-utility-suite, https://www.adcreative.ai/custom-templates | Upload-based product photos, product videos, utility tools, and templates are shown with before/after or layer-style demos. | Use this as support for Creative Studio and CueLayers messaging: reuse uploaded/generated assets and export safely, but do not imply rendered provider video/photo generation is active. |
| AdCreative use-case/ROI pages: https://www.adcreative.ai/use-case/small-business, https://www.adcreative.ai/use-case/e-commerce, https://www.adcreative.ai/use-case/agencies, https://www.adcreative.ai/roi-calculator | Separate use-case pages and calculator frame the product by customer type and business value. | CampaignCue can use owner-type examples and future ROI education, but the current public site must avoid pricing/savings calculators until billing and real benchmark assumptions are configured. |
| AdCreative small-business page: https://www.adcreative.ai/use-case/small-business | The small-business page is easy to understand because each promise is paired with a visible creative/output surface: ad creative, photo use, generated visuals, copy, scoring, URL scan, asset gallery, and pricing. | Add CampaignCue's own small-business use-case page: facts -> cue -> pack outputs -> creative reuse -> review -> manual export. Adopt the visual sequencing, not the ROI, direct-account, stock-image, predictive scoring, or pricing claims. |
| AdCreative full-page visual system screenshot review | The page feels creative because it shows floating artifacts around the hero, colorful product tiles, visual feature cards, a mid-page asset wall, and real product screenshots before heavy explanation. | CampaignCue must not remain a text-only ledger page. Add creative artifact visuals that show campaign work being produced while preserving the export-first and source-check boundaries. |
| AdCreative Compliance Checker: https://www.adcreative.ai/compliance-checker | Compliance is shown as its own visible product surface with platform, legal, brand, issue, and suggested-revision rows. | Make CampaignCue's Trust Center concrete with claim/source/risk/action rows, but do not claim legal-platform precision, policy monitoring, or predictive scoring. |
| Canva Brand Kit: https://www.canva.com/pro/brand-kit/ | Brand assets, brand guidelines, and multi-brand management are presented directly inside the creative workflow. | Keep Brand Playbook visible beside the pack as guidance and provenance, but do not let brand guidance replace campaign source facts or approval. |
| Planable home: https://planable.io/ | Create, discuss, approve, schedule, agency, multi-location, and multi-brand flows are visible as operational workflows. | Show review and handoff as part of the CampaignCue pack loop while preserving that direct publishing remains disabled on day one. |
| Rocketium Creative Automation: https://rocketium.com/products/creative-automation.html | Creative automation pages emphasize on-brand templates, platform variants, and reuse of existing design assets. | Add a reusable-template loop and proof-deck preview for CampaignCue; reject Photoshop/source-file import claims and broad enterprise creative automation promises until those runtimes exist. |
| Overflow: https://overflow.io/ | Visual workflow storytelling explains complex product value through connected flow maps instead of only feature lists. | Add a CampaignCue workflow map from business facts to cue, pack, review, manual export, and result memory. Do not imply CampaignCue is a diagramming/prototyping product. |
| Proto.io: https://proto.io/ | Prototype/product-tool pages make the output tangible with clear screens and "do not start from scratch" reuse framing. | Use this for CueLayers/reusable-pack framing and compact product previews; do not claim interactive prototyping or a generic design-builder scope. |
| Dock: https://www.dock.us/ | Portal-style product pages organize resources, content, action plans, and handoff materials in one clean customer workspace. | Add a Campaign Pack Room showing owner-ready pieces, proof beside the work, and manual delivery controls in one grouped surface. Do not position CampaignCue as a CRM, sales room, or customer-portal product. |
| Outseta: https://www.outseta.com/ | All-in-one SaaS pages explain system value through clear product grouping, strong navigation, and boundary clarity. | Use "one source-backed campaign desk" and grouped navigation language, while avoiding billing/auth/CRM/member-management promises. |
| Supahub: https://supahub.com/ | Restrained product-led SaaS page: centered hero, one visual surface, clear feature sections, and simple benefit blocks. | Use cleaner product-led pacing and fewer equal-weight cards; keep CampaignCue's source-backed/export-first boundary instead of feedback-roadmap claims. |
| Peppermint: https://paywithpeppermint.com/ | Bold brand confidence, oversized type, strong color fields, and expressive illustration make the product feel memorable. | Borrow confidence and color discipline sparingly through navy/pink bands and large product moments; do not turn CampaignCue into an illustrative fintech-style page. |
| Front: https://front.com/ | Mature SaaS framing: problem cards, dark hero/bands, proof rows, and alternating product examples explain operational complexity clearly. | Use a strong owner-problem band and clearer workflow contrast; reject support-platform, AI-agent, customer-service, and enterprise-logo claims. |

## Implemented Homepage Structure

| Section | Purpose |
| --- | --- |
| Navigation | Product anchors plus app CTA. Public site only; owner app remains outside `sites/`. |
| Hero | H1 is `CampaignCue`; supporting copy promises today's promotion, multi-channel pack, and source-backed checks with one primary CTA rhythm. |
| Product preview | A compact screenshot-like Daily Desk and Campaign Pack preview shows a lunch-combo campaign with price check, Google draft, WhatsApp copy, and poster download. |
| Floating hero artifacts | CampaignCue-specific visual thumbnails around the hero show story, poster, Google update, reel script, and trust review outputs. They are illustrative UI artifacts, not proof logos or external results. |
| Flow strip | Today cue, checked facts, WhatsApp + Google, creative + print, manual handoff, and result memory appear as a quiet proof row instead of boxed micro-cards. |
| Workflow map | Supahub/Overflow-inspired loop diagram explains the simplest product story: business facts -> today cue -> campaign pack -> visible review -> manual handoff -> result memory. On desktop it is a diagram with a central pack preview; on mobile it collapses into readable rows. |
| Owner problem band | Front-inspired dark problem section explains the three reasons CampaignCue exists: blank prompts waste time, creative files lose proof, and direct posting is risky before trust is clear. |
| Campaign Pack Room | Dock-inspired grouped preview keeps owner-ready pieces, proof/context, and manual delivery controls in one surface. This is a website explanation pattern, not a CRM/customer-portal claim. |
| Creative powerhouse | Colorful six-card product system section: campaign packs, existing image reuse, local/in-store outputs, video briefs, trust checks, and result memory. Each card includes named artifact mini-previews so the section feels like concrete campaign output, not generic design-tool decoration. |
| Real work proof | Dark proof band with ledger rows: concrete local-business examples name the fact, output, and proof note behind each campaign pack without using separate example cards. |
| Pack index | Seesaw-inspired compact catalog with Start, Pack, Review, and Handoff categories shown as grouped ledger rows so owners can scan what CampaignCue prepares. |
| Owner path | Connected four-step sequence: open Today, confirm facts, download the pack, and mark what happened. |
| Brand and proof layer | Makes implemented Brand Playbook guidance, a Campaign Proof Deck preview, reusable-template loop, UGC/reel disclosure notes, and avoid-list checks visible without promising autopilot publishing or source-proof replacement. |
| Workflow | Continuous ledger: read business, find cue, prepare pack, check risk, optionally edit/reuse assets, export manually, record result. |
| Daily Campaign Desk | Explains the first owner screen and why it removes blank-prompt confusion. |
| Outputs | WhatsApp, Google local, social creative, print/staff, reel brief, local creator brief, email/SMS/QR, and ad handoff shown as one output ledger. |
| Creative Studio | Shows the shared editor, source-locked design context, Design Cue actions, and export checks. |
| CueLayers | Explains image upload/generated-flat reuse with editable layer candidates and flat-safe fallback. |
| Examples | Restaurant, salon, retail, local-service, fitness, clinic, agency, and multi-location examples shown as compact prompt-start rows. |
| Campaign artifact wall | Visual wall of example handoff artifacts: WhatsApp status, story, poster, Google draft, reel list, QR card, UGC prompt, spend-gated ad copy, clinic reminder, and agency approval note. |
| Trust and Safety | Source checks, unsafe claim warnings, spend gates, and a concrete claim/source/risk/action matrix. |
| Delivery Boundary | Explicit no-direct-posting section aligned with day-one product rules. |
| Use Cases | Product capability ledger for Daily Desk, Business Brain, Campaign Studio, Creative Studio, CueLayers, and Trust Center. |
| Product and use-case menus | Desktop uses two owner-readable dropdowns: `Product` for CampaignCue surfaces and `Use cases` for business-type journeys. Mobile uses a hamburger button that opens a right-to-left drawer with product links, review/reuse links, use-case links, quick anchors, and the workspace CTA. |
| Small-business use-case link | A homepage callout links to `/use-cases/small-business` so SMB visitors can see the full audience journey without reading every feature page. |
| FAQ | Answers direct publishing, MenuList relationship, generic design-tool difference, full pack scope, and image reuse. |
| CTA | Owner-simple close: open workspace, pick cue, export pack. |
| Footer | Gamma-style depth with Product, Workflows, Trust, and Company link groups, but all links point to live anchors or the app. |

## Dedicated Feature Pages

CampaignCue now has feature pages under `src/app/sites/campaigncue/features/[featureSlug]/page.tsx`, backed by product-scoped data in `src/constants/campaigncue/websiteFeatures.ts`. The homepage `Product` mega menu, capability rows, and footer link to these routes, and the sitemap includes every feature page through `CAMPAIGNCUE_PUBLIC_PAGES`.

| Route | Purpose | Dashboard/preview boundary |
| --- | --- | --- |
| `/features/daily-campaign-desk` | Explain the first owner screen, one daily cue, missing-input prompts, export, and result memory. | Static Daily Desk preview only; no workspace reads. |
| `/features/campaign-pack-studio` | Explain the multi-output Campaign Pack from one source-backed cue. | Static pack preview only; no direct posting, provider connection, or ad-spend claim. |
| `/features/creative-studio` | Explain editor value, protected business text, Design Cue, resize/export checks, and CampaignCue adapter scope. | Static editor preview only; owner editor remains under `src/app/(campaigncue)/campaigncue/app`. |
| `/features/cuelayers` | Explain safe image reuse, editable candidates, source snapshots, review flags, and flat-safe fallback. | Static CueLayers preview only; no perfect source-file recovery claim. |
| `/features/creative-trust-center` | Explain claim/source/risk/action review, rights, consent, spend gates, and blocked states. | Static trust matrix only; no legal-platform certification or predictive scoring. |
| `/features/brand-playbook-proof-deck` | Explain Brand Playbook guidance and Campaign Proof Deck review brief. | Static proof-deck preview only; not a final rendered ad, video, website, or legal approval. |
| `/features/reusable-pack-templates` | Explain repeatable approved packs, fact refresh, review, and export. | Static template-loop preview only; not a generic public template marketplace. |

Public feature pages are part of the product website, not the owner dashboard. They may show dashboard-like placeholder screens to make the product self-explanatory, but they must not import owner workspace components, read Firestore, expose authenticated data, or create routes below `src/app/sites/campaigncue/app`.

## Dedicated Use-Case Pages

CampaignCue now has an audience-focused small-business page under `src/app/sites/campaigncue/use-cases/small-business/page.tsx`, backed by product-scoped data in `src/constants/campaigncue/websiteUseCases.ts`. The homepage `Use cases` mega menu, Workflows footer, sitemap registry, and use-case callout link to this route.

| Route | Purpose | Dashboard/preview boundary |
| --- | --- | --- |
| `/use-cases/small-business` | Explain the SMB owner journey from real facts to a checked campaign pack, with examples for restaurants, salons, retail shops, clinics, fitness studios, and local services. | Static product previews only; no workspace reads, no owner data, no direct posting, no pricing/ROI claim, and no predictive creative scoring. |

Use-case pages are not feature pages and are not owner dashboard pages. They may reuse static CampaignCue product-preview vocabulary, but they must not import authenticated workspace components, call CampaignCue APIs, read Firestore, or claim provider integrations that are outside the active export-first delivery mode.

## Hero Contract

- **Headline:** `CampaignCue`
- **Eyebrow:** `Daily campaign desk for local businesses`
- **Core promise:** Every day, know what to promote, what fact is missing, what is ready to use, and how to record the result.
- **Primary CTA:** `Open workspace` -> `/app` on product host, `/__campaigncue/app` locally through product base path handling.
- **Secondary CTA:** `See pack examples` -> `#studio`
- **Boundary pills:** Starts from real business facts, exports before it posts, risky claims stay visible.
- **Hero preview rule:** One clean product-preview surface in the first viewport. Avoid stacked hero checkpoint boxes, oversized dashboard chrome, or multiple card bands before the product story starts.
- **Subpage hero rule:** Feature and use-case pages use one-column, multi-row heroes: product copy first, preview second. Do not return to the two-column oversized-heading layout that forces long titles into single-word stacks.
- **Fit-check rule:** If a page uses an interactive-style chooser, the options must map to real owner bottlenecks and active CampaignCue outputs. Do not add fake ROI, predictive conversion score, or direct-posting promises.
- **Mobile-first rule:** Assume most public visitors are on phones. Mobile navigation uses the `CampaignCueMobileNavigation` hamburger drawer instead of wrapping desktop mega menus into the hero. The drawer opens from normal tap/click activation only, uses grouped link rows rather than repeated oversized cards, keeps the overview row aligned with explicit icon/text/arrow placement, hides the CampaignCue cookie panel while the drawer is open, and must not use `touchstart` activation that can immediately re-hit the close/scrim area. Primary/secondary hero actions should stack full width, long badges/headings must wrap at word boundaries, visible links/buttons should keep at least a 44px touch target with implementation margin, and subpage previews should drop cramped desktop-only chrome before text clips.

## SEO Meta

- **Page title:** `CampaignCue - Daily Campaign Desk for Local Businesses`
- **Meta description:** CampaignCue turns real local-business facts into source-checked campaign packs for WhatsApp, Google, social, print, video, and manual handoff.
- **Structured data:** `SoftwareApplication` and `FAQPage`. No pricing claim is included because billing is not configured.
- **Sitemap:** Homepage plus the small-business use-case page and the seven dedicated feature pages from `CAMPAIGNCUE_PUBLIC_PAGES`.
- **Robots:** Product app paths remain disallowed.

## Visual Direction

The site uses an operational SaaS layout with product and campaign artifacts as the primary visuals. The current production pass follows Blank for restraint, Supahub for product-led pacing, Front for mature problem framing, Peppermint for controlled brand confidence, Ploy for proof/activity records, Linear for editorial product rhythm, Seesaw for fast scanning, AdCreative for creative artifact density and compliance-surface clarity, Canva for brand-guidance visibility, Planable for approval-loop clarity, and Rocketium for reusable-template framing. The homepage should feel like a creative operating desk: restrained first viewport, large brand-led typography, screenshot-like product surfaces, colorful campaign thumbnails, connected sequences, proof ledgers, proof deck preview, reusable-template loop, and a concrete trust matrix. Use ledgers instead of repeated card grids when listing source proof, owner steps, or output inventories, but use visual product tiles when showing CampaignCue's creative moat. It intentionally avoids:

- Generic abstract AI imagery.
- Broad "make anything" claims.
- Fake social proof, fake metrics, unsupported customer outcomes, or unverified logos.
- Vague automation phrases without showing the exact owner action and output.
- One-note purple/blue gradient branding.
- Text-only ledgers that make CampaignCue feel like a documentation page instead of a campaign asset product.
- Overbuilt first-viewport card clusters, repeated equal-weight card grids without product visuals, random accent colors, or decorative gradients that make the page feel like a student collage.
- Public claims about billing, direct integrations, direct account posting, or social-account connection.
- Legal/platform compliance precision, predictive creative scoring, or ROI/ROAS promises without active evidence infrastructure.
- Internal implementation or Firebase wording.

The final visual polish should feel closer to a finished creative product than a documentation page. The AdCreative screenshot comparison is adopted at detail level, not claim level: floating centered white navigation, pale-pink page atmosphere, deep navy display type, rose primary CTAs with white text, white secondary CTAs, very light navy/pink borders, soft layered shadows, screenshot-like preview panels, and product cards that feel rendered rather than wireframed. Keep the product promise CampaignCue-specific: source-backed packs, manual export, visible review, and no fake metrics, sale banners, proof logos, direct posting, or unsupported performance claims.

The design should stay practical and owner-readable: concrete output examples, short headings, visible safety state, proof notes, and no broken footer links. Every major section should answer one SMB-owner question: what fact is used, what pack is prepared, what review is required, and what the owner can do next.

Homepage sections use a stacked section pattern: eyebrow first, heading on its own full-width row, supporting description beneath it, and the product surface, ledger, or visual content below. Do not trap long section headings in narrow left rails or two-column copy blocks. Split layouts are allowed only when the heading row remains full-width and the visual/content area starts after the intro.

Mobile is the primary public-site reading context. Any homepage, feature-page, or use-case-page change should be checked at 390px, 360px, and 320px for document-level overflow, clipped hero copy/actions, readable preview text, and 44px-or-larger visible interactive targets. Phone previews are allowed to simplify desktop dashboard/editor chrome when keeping every desktop detail would create clipped labels, oversized first screens, or hidden action text.

### CampaignCue Palette

The active CampaignCue website palette follows the provided business-card reference: deep navy for authority surfaces, navy for primary text and product UI, rose pink for campaign accents, soft pink for supporting surfaces, and white for clean workspace contrast. Current CSS tokens:

- `--cc-ink: #011b6d`
- `--cc-deep-navy: #020c4f`
- `--cc-navy-soft: #152567`
- `--cc-pink: #d96e9b`
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

### Public Cookie Banner

CampaignCue uses `src/components/shared/publicCookieConsent/PublicCookieConsentBanner.tsx` in the public website layout for essential-storage acknowledgement only. The current CampaignCue public site does not load analytics, ad, personalization, or owner-workspace scripts from `src/app/sites/campaigncue`, so the banner copy must not claim those behaviors. Do not add the banner to the protected CampaignCue owner app without a separate privacy review.

### Public AI Summary Links

CampaignCue uses `src/components/shared/publicAiSummaryLinks/PublicAiSummaryLinks.tsx` through `src/app/sites/campaigncue/components/CampaignCueAiSummary.tsx` in the public homepage, feature pages, and small-business use-case page footers. The strip links to Claude, ChatGPT, and Gemini with a CampaignCue-specific prompt that asks for a summary from `https://campaigncue.ai` while explicitly rejecting direct account posting, ad automation, auto-spend software, generic AI design-tool framing, and owner-review replacement claims.

This is a footer-level visitor shortcut only. It does not change crawler policy, metadata, CampaignCue runtime behavior, owner workspace flows, analytics, Firebase rules, or Vercel deployment. Keep the copy low in the footer so the primary conversion path remains setup/app entry, not "AI summary" exploration.

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
- predictive creative scoring and platform/legal compliance precision before dedicated evidence and policy infrastructure exists;
- broad all-in-one creative-tool positioning that hides CampaignCue's source-backed campaign-pack boundary.

## Competitor Follow-Up Decisions

| Pattern | Adopted as | Boundary |
| --- | --- | --- |
| Compliance surface with issues and suggested fixes | Trust matrix with claim/source/risk/action rows. | CampaignCue shows owner review posture, not legal advice or platform-certification. |
| Brand kit and guidelines inside the editor/workflow | Brand Playbook and proof deck preview beside the pack. | Brand Playbook guides creative direction; source facts still decide campaign truth. |
| Approval-first team workflow | Proof deck and owner review language. | Direct publishing, auto-scheduling, and account posting remain inactive. |
| Reusable on-brand templates | Reusable-template loop: save pack, update facts, export again. | No source-file import, Photoshop recovery, or generic template marketplace claim. |

## Route And Product Boundary

| Surface | Rule |
| --- | --- |
| Public homepage | Files live under `src/app/sites/campaigncue`. |
| Public product/use-case menus | Live inside the homepage header and link only to existing feature pages, the small-business use-case page, active homepage anchors, or `/app`. They must not add fake pricing, ROI, direct-posting, or account-connection claims. |
| Public feature pages | Files live under `src/app/sites/campaigncue/features/[featureSlug]` and must use product-scoped website feature data from `src/constants/campaigncue/websiteFeatures.ts`. |
| Public use-case pages | Files live under `src/app/sites/campaigncue/use-cases/*` and must use product-scoped website use-case data from `src/constants/campaigncue/websiteUseCases.ts`. |
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
| Brand Playbook guidance | Brand guidance replaces source proof |
| Campaign Proof Deck review brief | Proof deck is a final rendered ad, video, website, or legal approval |
| Reusable pack templates | Template library that ignores source facts |
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

**Q:** Do packs include a review record?
**A:** Yes. Campaign packs can include a proof deck with brand direction, source trace, trust checks, UGC or reel references, and manual delivery notes so an owner, agency, or client can review before use.
