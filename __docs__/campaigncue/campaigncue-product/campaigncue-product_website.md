# CampaignCue Product - Website Content

**Last production-site pass:** June 14, 2026
**Source of truth:** `src/app/sites/campaigncue/page.tsx`, `src/app/sites/campaigncue/styles.css`, and `src/constants/campaigncue/website.ts`

## Current Verdict

The CampaignCue public website is now a self-explanatory product site, not a status shell. It communicates:

- CampaignCue as a daily campaign desk for local businesses.
- The complete loop: read business data, find the cue, prepare the pack, check risk, optionally edit/reuse assets, export manually, and record what happened.
- The day-one boundary: export/download/manual handoff only; no direct social posting, WhatsApp send, Google publish, or ad spend mutation.
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
| Modash: https://www.modash.io/ | Workflow-first layout, "why" section, clear value in minutes, deep footer, friendly product language. | Use operational workflow language and a footer that helps visitors understand the product without many pages. |
| U.S. Chamber AI marketing guide: https://www.uschamber.com/co/grow/marketing/ai-small-business-marketing-guide | AI helps with ideation, repurposing, social posts, ad variants, email drafts, content briefs, landing pages, but human review remains required. | Make human review/trust checks central, not hidden in legal copy. |
| Google helpful content guidance: https://developers.google.com/search/docs/fundamentals/creating-helpful-content | Helpful pages are people-first, original, specific, useful, trustworthy, and not made mainly to capture search traffic. | Public copy must show concrete CampaignCue workflows, proof notes, and product boundaries instead of generic AI/category claims. |
| Nielsen Norman Group GenAI content design: https://www.nngroup.com/videos/genai-content-design/ | Product-specific generated content still needs concise, scannable web writing, inverted-pyramid structure, and plain language. | Keep CampaignCue sections short, owner-readable, and evidence-led; avoid diagnostic jargon and abstract automation copy. |

## Implemented Homepage Structure

| Section | Purpose |
| --- | --- |
| Navigation | Product anchors plus app CTA. Public site only; owner app remains outside `sites/`. |
| Hero | H1 is `CampaignCue`; supporting copy explains the daily campaign desk and export-first boundary. |
| Product preview | A realistic Daily Desk/Campaign Pack/Editor preview replaces abstract hero art. |
| Fit strip | Restaurants, salons, retail, local services, fitness, clinics, agencies, multi-location teams, and manual posting workflows are visible immediately. |
| Owner path | Four plain steps: open Today, confirm facts, download the pack, and mark what happened. |
| Real work proof | Concrete local-business examples name the fact, output, and proof note behind each campaign pack. |
| Workflow | Loop: read business, find cue, prepare pack, check risk, optionally edit/reuse assets, export manually, record result. |
| Daily Campaign Desk | Explains the first owner screen and why it removes blank-prompt confusion. |
| Outputs | WhatsApp, Google local, social creative, print/staff, reel brief, UGC script, email/SMS/QR, and ad handoff output cards. |
| Creative Studio | Shows the shared editor, source-locked design context, Design Cue actions, and export checks. |
| CueLayers | Explains image upload/generated-flat reuse with editable layer candidates and flat-safe fallback. |
| Examples | Restaurant, salon, retail, local-service, fitness, clinic, agency, and multi-location examples. |
| Trust and Safety | Source checks, unsafe claim warnings, spend gates, and the concrete check matrix. |
| Delivery Boundary | Explicit no-direct-posting section aligned with day-one product rules. |
| Use Cases | Product capability cards for Daily Desk, Business Brain, Campaign Studio, Creative Studio, CueLayers, and Trust Center. |
| FAQ | Answers direct publishing, MenuList relationship, generic design-tool difference, full pack scope, and image reuse. |
| CTA | Owner-simple close: open workspace, pick cue, export pack. |
| Footer | Gamma-style depth with Product, Workflows, Trust, and Company link groups, but all links point to live anchors or the app. |

## Hero Contract

- **Headline:** `CampaignCue`
- **Eyebrow:** `Daily campaign desk for local businesses`
- **Core promise:** Every day, know what to promote, what fact is missing, what is ready to use, and how to record the result.
- **Primary CTA:** `Open workspace` -> `/app` on product host, `/__campaigncue/app` locally through product base path handling.
- **Secondary CTA:** `See workflow` -> `#workflow`
- **Boundary pills:** No blank prompt, export/download first, owner review before use.

## SEO Meta

- **Page title:** `CampaignCue - Daily Campaign Desk for Local Businesses`
- **Meta description:** CampaignCue turns real local-business facts into a daily campaign desk, export-ready packs, safe editor changes, manual delivery steps, and result memory.
- **Structured data:** `SoftwareApplication` and `FAQPage`. No pricing claim is included because billing is not configured.
- **Sitemap:** Homepage only until additional public pages exist.
- **Robots:** Product app paths remain disallowed.

## Visual Direction

The site uses an operational SaaS layout with a product preview as the primary visual. It intentionally avoids:

- Generic abstract AI imagery.
- Broad "make anything" claims.
- Fake social proof, fake metrics, unsupported customer outcomes, or unverified logos.
- Vague automation phrases without showing the exact owner action and output.
- One-note purple/blue gradient branding.
- Public claims about billing, direct integrations, provider posting, or social-account connection.
- Internal implementation or Firebase wording.

The design should stay practical and owner-readable: concrete output examples, short headings, visible safety state, proof notes, and no broken footer links. Every major section should answer one SMB-owner question: what fact is used, what pack is prepared, what review is required, and what the owner can do next.

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
| Future provider layer gated | Provider posting already active |
| Proof note, source fact, or boundary | "AI will handle everything" |

## FAQ

**Q:** Does CampaignCue publish directly to Instagram, Google, or WhatsApp?
**A:** No. The current product is export/download-first. It creates packs owners can copy, download, schedule manually, approve, or mark used. Direct provider posting is a separate future layer.

**Q:** Is this only for MenuList restaurants?
**A:** No. MenuList can be a read-only restaurant source, but salons, agencies, and non-MenuList businesses can use owner-entered sources and uploaded assets.

**Q:** How is this different from a generic design tool?
**A:** CampaignCue starts from business facts and local campaign opportunities. The editor exists to finish campaign assets, not to become a generic blank-canvas design product.

**Q:** Do owners only get social posts?
**A:** No. A campaign pack can include WhatsApp text and images, Google local fields, social assets, print and in-store material, staff messages, email or SMS copy, QR or offer-page notes, trust checks, and a result prompt.

**Q:** Can owners reuse existing images?
**A:** Yes. CueLayers is planned around uploaded or generated flat images becoming editable candidates with protected text, source truth, and safe fallback when reconstruction is uncertain.
