# Stage 2 Output - MenuList Landing Page Strategy Brief

**Status:** Stage 2 strategy output  
**Created:** May 16, 2026  
**Scope:** Strategy and planning only. No production website code changed.  
**Source prompt:** `__docs__/main-website/website-prep-codex-prompts/stage-02-landing-page-strategy-brief.md`  
**Primary input:** `stage-01-output-repo-context-synthesis-codebase-first.md`  

## Source-Of-Truth Note

This strategy uses the corrected Stage 1 hierarchy:

1. Current codebase, feature flags, public routes, DAL, APIs, UI components, and public rendering paths.
2. Current feature docs when they match code.
3. Founder/product strategy docs.
4. Existing website as historical psychology and conversion context.
5. External research only as optional support.

No external web search was used for Stage 2. The main strategic question is not "what does a generic SaaS homepage do?" It is "what is MenuList now, according to the current codebase, and how should that be translated for SMB owners without diluting infrastructure positioning?"

## Section 1 - Page Objective

- Primary objective:
  - Establish MenuList as the official customer-facing source of truth for a business, then move qualified owners into the lowest-friction setup path.
  - Confidence: high.
- Primary conversion goal:
  - Get the owner to start from their current menu and create/preview an official MenuList presence.
  - Recommended conversion action: `Create your official menu` or `Start from your menu`.
  - Confidence: high.
- Secondary conversion goal:
  - Let skeptical visitors inspect a real example public page/menu before committing.
  - Recommended action: `See a live example` or `View customer page`.
  - Confidence: high.
- Ideal visitor awareness level:
  - Problem-aware, not category-aware.
  - They know customers see stale menus, wrong links, or scattered business info, but they do not yet think in "business truth infrastructure."
- What the page must accomplish in one visit:
  - Make the visitor understand that MenuList is not another menu design tool.
  - Show that one owner-approved source can power a public menu, official page, QR/physical assets, customer app, screens, and integrations.
  - Prove the system is simple enough for a non-technical owner and serious enough to trust.
- Recommended page mode:
  - Primary: public-presence-led.
  - Secondary: workflow-led and trust-led.
  - Subtle underlayer: infrastructure-led.
  - Avoid leading as pure feature-led or AI-led.
- Ideal emotional transition:
  - Top: "My public information is probably scattered."
  - Early proof: "This creates one official place customers can trust."
  - Middle: "It reaches the places customers already check."
  - Later: "There is serious reliability underneath, but I do not need to manage it."
  - End: "I can start from my current menu and make this official."
- What not to optimize for initially:
  - Feature density.
  - Long technical credibility.
  - SEO keyword sprawl.
  - Pricing-page experimentation.
  - Chain buyer conversion at the expense of the SMB owner.
- What would create positioning dilution:
  - Calling the product a QR menu builder, AI menu generator, or restaurant website builder.
  - Leading with dashboards or analytics.
  - Leading with "all-in-one restaurant management."
  - Treating Menu Kit, AI images, reviews, POS, or public API as separate product pillars instead of proof of one public truth system.

## Section 2 - Audience Prioritization

- Best primary ICP:
  - Non-technical SMB owner/operator whose menu, services, hours, public links, and customer actions need to stay current.
  - Examples: restaurant, cafe, bakery, cloud kitchen, salon/spa, local service business with a menu/catalog.
  - Confidence: high.
- Why this audience first:
  - Current codebase has strong owner/mobile/customer-facing infrastructure.
  - This ICP understands the pain without enterprise education.
  - The old website psychology was built around this owner and remains strategically correct.
  - The product can later expand to chains and APIs, but the homepage should not begin as an enterprise infrastructure page.

Audience: non-technical SMB owner/operator.

- What they care about instantly:
  - Customers can see the right menu, hours, contact, directions, and actions.
  - Setup should be quick.
  - They should not need a designer, developer, or dashboard habit.
- Skepticism:
  - "Will this really stay updated?"
  - "Will it look professional?"
  - "Will I have to do too much setup?"
  - "Is this just another QR menu?"
- Pain already felt:
  - Stale WhatsApp PDFs, old QR menu, wrong Google info, staff answering the same questions.
- Operational fear:
  - Public embarrassment from wrong prices, closed/open mismatch, stale item availability, or untrusted links.
- Proof that reduces skepticism:
  - Real public menu + OBP screenshot.
  - Owner upload/review/publish workflow.
  - Menu Kit/QR/customer app surfaces from the same source.
  - Temp status and freshness/trust signals.
- Workflow that matters most:
  - Start from current menu -> approve -> publish official source -> deploy everywhere.

Audience: multi-location SMB/small chain.

- What they care about instantly:
  - Master menu consistency and outlet flexibility.
  - Branches should not drift without HQ knowing.
- Skepticism:
  - "Will local outlet changes be allowed?"
  - "Will this break billing or branch control?"
  - "Is this built only for single shops?"
- Pain already felt:
  - Inconsistent prices, items, menus, and public links across outlets.
- Operational fear:
  - Brand inconsistency and customer complaints at the outlet level.
- Proof that reduces skepticism:
  - Master/outlet inheritance visual.
  - Controlled overrides.
  - Chain control panel/location view.
- Workflow that matters most:
  - HQ updates master -> outlets inherit -> local exceptions stay controlled.

Audience: public-presence trust businesses beyond restaurants.

- What they care about instantly:
  - One credible public page with services/menu/catalog, hours, contact, directions, photos, reviews, status, and actions.
- Skepticism:
  - "Is MenuList only for restaurants?"
  - "Will it fit service businesses?"
- Pain already felt:
  - Scattered business info and weak public profile.
- Operational fear:
  - Customers do not trust what they find.
- Proof that reduces skepticism:
  - Business attributes, OBP actions, customer app, compliance pages, language.
- Workflow that matters most:
  - Set business info once -> public page and customer actions stay aligned.

Audience: integration-ready operators, POS vendors, resellers.

- What they care about instantly:
  - Structured menu/business truth, API reliability, POS sync, owner onboarding at scale.
- Skepticism:
  - "Is this a real data source or only a front-end menu?"
- Pain already felt:
  - Duplicate entry and stale downstream systems.
- Operational fear:
  - POS/menu/public mismatch.
- Proof that reduces skepticism:
  - Public API, POS delivery, API keys, ETags, signed payloads.
- Workflow that matters most:
  - MenuList as upstream source -> downstream systems consume current data.
- Recommendation:
  - Do not optimize the homepage primarily for this audience yet. Use proof blocks and future supporting pages.

## Section 3 - Positioning Strategy

- Recommended primary positioning direction:
  - MenuList is the official source for what your customers see.
  - Strategic upside:
    - Plain enough for SMB owners.
    - Preserves the infrastructure identity without jargon.
    - Maps directly to OBP, public menu, customer app, Menu Kit, screens, public API, POS, and cache/versioning.
  - Risk:
    - "Official source" must be shown through public outputs, not just asserted.
  - Confidence: high.
  - Emphasizes:
    - Public truth: high.
    - Synchronization: medium-high.
    - Publishing: high.
    - Infrastructure: subtle.
    - Consistency: high.
    - Operational calm: high.
    - Chain governance: secondary.
    - Presence authority: high.

- Alternative positioning direction 1:
  - One business truth across every customer surface.
  - Strategic upside:
    - Stronger infrastructure/category language.
    - Better for long-term brand authority.
  - Risk:
    - "Business truth" may be too abstract above the fold for first-time SMB visitors.
  - Confidence: medium-high.
  - Emphasizes public truth, synchronization, consistency, infrastructure, and presence authority.

- Alternative positioning direction 2:
  - Public presence that stays correct after you update the source.
  - Strategic upside:
    - Strong workflow clarity.
    - Avoids feature-listing.
  - Risk:
    - Less memorable as category framing.
  - Confidence: high.
  - Emphasizes publishing, synchronization, consistency, and operational calm.

- Alternative positioning direction 3:
  - Menu-led public presence infrastructure for local businesses and chains.
  - Strategic upside:
    - Accurately captures long-term category.
    - Opens chain and non-restaurant expansion.
  - Risk:
    - More abstract; better for about/product/infrastructure pages than primary hero.
  - Confidence: medium.
  - Emphasizes infrastructure, chain governance, and presence authority.

- Category framing recommendation:
  - Public business truth infrastructure, translated publicly as "the official source for what your customers see."
  - Use the infrastructure phrase in strategy docs, metadata, later trust pages, and selective body copy. Use the plain-language translation in the hero.
- Anti-positioning warning:
  - Do not frame MenuList as a tool for making a menu. Frame it as the system that keeps the public version correct.
- Language to avoid entirely:
  - AI-powered.
  - Smart.
  - Dynamic.
  - All-in-one.
  - Restaurant management.
  - Website builder.
  - QR menu generator.
  - Digital menu maker.
  - Growth hack.
  - Marketing automation.
  - Dashboard.
  - Conversion rate unless true order/booking/payment completion is measured.

## Section 4 - Conversion Architecture

- Primary CTA strategy:
  - Route motivated owners into the start-from-current-menu path.
  - CTA should imply official setup, not generic signup.
  - Recommended CTA territories:
    - `Create your official menu`
    - `Start from your menu`
    - `Create your official source`
  - Confidence: high.
- Secondary CTA strategy:
  - Let skeptical users inspect the public result first.
  - Recommended CTA territories:
    - `See a live example`
    - `View customer page`
    - `Preview how it works`
  - Confidence: high.
- Ideal CTA format:
  - Dual CTA in hero:
    - Primary: start/create.
    - Secondary: view example.
  - Keep email capture out of hero for now.
- Friction level:
  - Low friction, but not anonymous gimmick.
  - `/create-menu` can be the acquisition flow if parity and demo experience are verified before Stage 4.
  - If `/create-menu` is not ready as primary, use authenticated onboarding/start route and keep example CTA.
- Homepage should push:
  - Guided setup or preview-first setup.
  - Not a sales demo as primary.
  - Contact flow only for chain/integration footnote.
- Whether social proof belongs above fold:
  - Not unless real proof exists.
  - Use product proof above fold instead: "Official page + live menu + QR/customer app from one source."
  - Avoid fake logos, fake testimonials, and unsupported metrics.
- What users should not be asked too early:
  - Payment.
  - Plan choice.
  - Technical integrations.
  - API/POS setup.
  - Full business configuration.
  - Chain location setup unless they self-identify.
- What creates unnecessary onboarding friction:
  - Forcing pricing before seeing product output.
  - Asking for all business metadata before a menu/public preview.
  - Asking non-technical owners to understand "infrastructure."
  - Making them choose from too many setup modes.
- What creates trust quickly:
  - A believable live public page preview.
  - A real owner workflow: upload/review/publish.
  - A clear statement that the owner approves before publishing.
  - One source shown feeding OBP, menu, QR/Menu Kit, customer app, screens.

## Section 5 - Narrative Structure

- Ideal sequence:
  - First: customers see different versions because no single official source exists.
  - Second: MenuList creates that source from the owner's current menu/business data.
  - Third: public outputs prove it: OBP, live menu, QR/Menu Kit, customer app, screens.
  - Fourth: reliability proof explains why it stays correct: correctness checks, publish/version/cache, temp status, snapshots/change memory.
  - Fifth: advanced trust: multi-location, public API/POS, health/reputation, language.
  - Final: start from your current menu and make the public source official.
- What the visitor must understand first:
  - This is about customer-facing correctness, not menu design.
- What proof should appear early:
  - Real customer-facing surfaces, especially OBP + menu.
  - A "one source -> many surfaces" proof strip.
- What should be emotionally reinforced:
  - Relief: "I update one source."
  - Authority: "Customers see one official version."
  - Calm: "The system handles the rest quietly."
- Objections to handle mid-page:
  - "Is it just a QR menu?"
  - "Will it stay updated?"
  - "What if I have multiple locations?"
  - "Do I need technical setup?"
  - "Will customers trust it?"
- What should appear before final CTA:
  - Setup simplicity.
  - Real public output visual.
  - Proof that existing/current menu is enough to start.
  - Pricing/payment should not be forced into the narrative.
- Best order for infrastructure depth:
  - Outcome -> workflow -> public surfaces -> reliability proof -> advanced capabilities.
  - Do not start with MCE, MOL, APIs, or POS. They should support the claim after the visitor understands the public outcome.

## Section 6 - Homepage Section Architecture

1. Hero: official source.
   - Strategic purpose: establish the category and immediate value.
   - Key message: one official source for what customers see.
   - Emotional role: confidence and relief.
   - Content type: headline, subheadline, dual CTA, microtrust line.
   - Ideal visual type: real/stylized composite of OBP + live menu + source controls + surface chips.
   - CTA presence: primary + secondary.
   - Must not: say QR menu, AI menu generator, or dashboard.

2. Problem: public drift.
   - Strategic purpose: make the visitor feel the hidden cost.
   - Key message: customers see old information because no single source owns correctness.
   - Emotional role: recognition.
   - Content type: short scenario tiles.
   - Ideal visual type: wrong Google/menu/PDF/QR examples as simple tiles.
   - CTA presence: none.
   - Must not: become negative fear marketing or overstate unproven losses.

3. One-source workflow.
   - Strategic purpose: show how MenuList works without feature overload.
   - Key message: start from current menu -> approve -> publish -> deploy -> keep current.
   - Emotional role: practical relief.
   - Content type: 4-5 step flow.
   - Ideal visual type: horizontal workflow on desktop, vertical on mobile.
   - CTA presence: soft inline CTA.
   - Must not: over-explain AI/extraction or technical internals.

4. Public surfaces proof.
   - Strategic purpose: prove this is public presence, not just editing.
   - Key message: the same source powers official page, live menu, QR/Menu Kit, customer app, screens, and more.
   - Emotional role: trust through concrete output.
   - Content type: surface grid with screenshot-led visuals.
   - Ideal visual type: OBP/menu dominant with smaller surface cards.
   - CTA presence: none or "see example."
   - Must not: list every minor feature.

5. Customer experience.
   - Strategic purpose: show what end customers actually see.
   - Key message: customers browse, search, switch language, see status/freshness, and act.
   - Emotional role: pride and credibility.
   - Content type: public menu/OBP focused section.
   - Ideal visual type: phone/browser frame with real public menu.
   - CTA presence: none.
   - Must not: show admin/dashboard first.

6. Reliability under the surface.
   - Strategic purpose: explain why it stays correct.
   - Key message: correctness checks, versioning, snapshots, public cache refresh, and change memory support the public output.
   - Emotional role: quiet confidence.
   - Content type: proof cards with plain-language labels.
   - Ideal visual type: understated "under the surface" strip, not architecture diagram overload.
   - CTA presence: none.
   - Must not: use raw terms like MCE/MOL in visible primary copy unless explained.

7. Real-world deployment.
   - Strategic purpose: show MenuList leaving the screen and becoming infrastructure.
   - Key message: the official source can appear on table tents, stickers, packaging, WhatsApp, Instagram, Google, and customer phones.
   - Emotional role: momentum.
   - Content type: Menu Kit + Presence Monitor story.
   - Ideal visual type: generated physical assets and deployment checklist.
   - CTA presence: soft CTA.
   - Must not: frame it as marketing campaign software.

8. Multi-location confidence.
   - Strategic purpose: signal chain capability without making homepage enterprise-heavy.
   - Key message: one master menu, outlet control, local exceptions.
   - Emotional role: seriousness.
   - Content type: compact chain block.
   - Ideal visual type: master/outlet propagation diagram with small UI crop.
   - CTA presence: link to future chain page.
   - Must not: dominate the page or imply the product is only for chains.

9. Calm trust signals.
   - Strategic purpose: show MenuList protects public presence after launch.
   - Key message: status notices, health signals, reputation guard, customer actions, analytics without dashboard chaos.
   - Emotional role: safety.
   - Content type: restrained proof cards.
   - Ideal visual type: health signal cards and temp status/public banner pair.
   - CTA presence: none.
   - Must not: promise customer lift or show fake data.

10. Integrations and data authority.
   - Strategic purpose: prove advanced infrastructure for serious operators.
   - Key message: MenuList can feed POS/public API consumers when needed.
   - Emotional role: credibility.
   - Content type: small proof band.
   - Ideal visual type: "MenuList source -> POS/API" simple line.
   - CTA presence: link to future integrations/infrastructure page.
   - Must not: lead with API jargon for SMBs.

11. FAQ.
   - Strategic purpose: handle objections.
   - Key message: setup, approval, updates, multi-location, customer app, pricing safety, integrations.
   - Emotional role: reassurance.
   - Content type: short questions.
   - Ideal visual type: text only, calm.
   - CTA presence: optional after FAQ.
   - Must not: turn into legal or technical docs.

12. Final CTA.
   - Strategic purpose: convert after trust is built.
   - Key message: start from the menu you already have and make it official.
   - Emotional role: decision.
   - Content type: headline, CTA, microcopy.
   - Ideal visual type: small final public output preview or no visual.
   - CTA presence: primary + secondary optional.
   - Must not: introduce pricing friction.

## Section 7 - Hero Strategy

- Ideal hero message territory:
  - "The official source for what your customers see."
  - Supporting territory: "Start with your current menu. MenuList keeps your menu, business page, QR, customer app, and public surfaces aligned."
- Ideal emotional reaction:
  - "This is exactly the public mess I have, but it looks simple to fix."
- What the hero must communicate in under 5 seconds:
  - This is about public customer-facing correctness.
  - It starts from the menu/business information.
  - It produces a professional public presence.
  - It is one source across multiple surfaces.
- Recommended hero composition:
  - Dominant center: real OBP/live menu screenshot.
  - Secondary left/right: owner source/edit/publish control crop and small Menu Kit/customer app/screen chips.
  - Micro labels: Official page, Live menu, QR assets, Customer app, Screens.
  - Optional subtle caption: "One source. Public surfaces stay aligned."
- Visual structure:
  - Use real UI or a stylized composite based on real UI.
  - Do not create fantasy dashboards.
  - Public page should be more prominent than owner dashboard.
- CTA structure:
  - Primary: start/create from current menu.
  - Secondary: view live example.
  - Microcopy: no technical setup, owner approves before publishing.
- Whether logos/proof belong above fold:
  - No fake logos.
  - If no real customer logos, use product proof only.
  - A small trust strip can mention real product surfaces, not customer counts.
- Must not appear in hero:
  - Dashboard metrics.
  - AI artwork.
  - API/POS diagrams.
  - Full feature list.
  - Pricing cards.
  - Purple/blue generic AI gradients.
- What instantly commoditizes the product:
  - "Create QR menu."
  - "AI menu generator."
  - "Build your restaurant website."
  - "All-in-one restaurant platform."

## Section 8 - Proof Architecture

- Strongest proof types:
  - Real public outputs: OBP and live menu.
  - Multi-surface propagation: menu, QR/Menu Kit, customer app, screens, public links.
  - Reliability proof: correctness checks, publish/version/cache, snapshots/change memory.
  - Owner-control proof: review/approve before publish.
  - Chain proof: master/outlet inheritance.
  - Public data proof: API/POS sync.
- Strongest infrastructure proof:
  - MCE correctness validation, MOL append-only memory, menu snapshots, cache invalidation, deterministic public routing.
  - Use these as translated proof, not raw acronyms.
- Strongest operational proof:
  - Temp status, special menu, public freshness/trust signals, customer actions, mobile owner surfaces.
- Strongest workflow proof:
  - Upload/review/publish/deploy/update.
- Strongest consistency proof:
  - One source powering OBP, menu, QR/Menu Kit, customer app, screens, and integrations.
- Strongest chain-governance proof:
  - Master menu with controlled outlet overrides.
- Strongest publishing/reliability proof:
  - Versioned publish, cache refresh, customer-facing route permanence.

Proof placement:

- Above fold:
  - Product proof, not social proof.
  - OBP/menu/multi-surface composite.
- Early page:
  - One-source workflow and public surfaces proof.
- Mid-page:
  - Reliability under the surface, Menu Kit, customer experience, temp status.
- Late page:
  - Chain, integrations, health/reputation, FAQ.
- Near CTA:
  - "Start from your current menu. Owner approval before publishing. No technical setup."
- FAQ:
  - Setup, updates, customer app, multi-location, pricing, integrations, proof boundaries.
- Onboarding:
  - Show upload/review/approval path, not all infrastructure.

Proof requiring founder validation:

- Customer counts.
- Revenue lift.
- Retention lift.
- "Used by X businesses."
- Reliability percentages.
- Average setup time if not measured.
- Any claim about Google sync until GBP prerequisites are confirmed.

Proof claims to avoid:

- "Automatically updates Google" unless the exact GBP state is confirmed for production.
- "Never outdated" because owner input and external surfaces still matter.
- "No work ever" because setup and approval exist.
- "Works with every POS" unless integrations are explicit.
- "AI does everything" because owner approval is a trust boundary.

## Section 9 - Feature Storytelling System

- Workflow/feature: official public source.
  - Strategic importance: primary story.
  - User pain: no single trusted public version.
  - Visual: OBP + live menu composite.
  - Proof angle: one public identity endpoint and menu source.
  - Section weight: full section.
  - Obviousness: high.

- Workflow/feature: update once, surfaces stay aligned.
  - Strategic importance: primary operational promise.
  - User pain: repeated manual updates.
  - Visual: one-source workflow and surface fan-out.
  - Proof angle: publish/cache/versioning, public output.
  - Section weight: full section.
  - Obviousness: high.

- Workflow/feature: start from current menu.
  - Strategic importance: acquisition and friction removal.
  - User pain: setup/data entry.
  - Visual: upload -> preview -> approve.
  - Proof angle: public menu entry and owner approval.
  - Section weight: workflow strip or full onboarding section.
  - Obviousness: high.

- Workflow/feature: customer browsing experience.
  - Strategic importance: product proof.
  - User pain: customer confusion and staff questions.
  - Visual: searchable mobile menu with status, language, item cards.
  - Proof angle: customers can find and act without staff.
  - Section weight: full section.
  - Obviousness: high.

- Workflow/feature: Menu Kit / real-world deployment.
  - Strategic importance: distinctiveness and infrastructure deployment.
  - User pain: official link not placed where customers are.
  - Visual: table tent, sticker, WhatsApp/Instagram/Google image.
  - Proof angle: physical and social surfaces from same source.
  - Section weight: full or prominent supporting block.
  - Obviousness: high.

- Workflow/feature: correctness and change memory.
  - Strategic importance: trust.
  - User pain: stale/wrong menu risk.
  - Visual: calm proof strip, not code.
  - Proof angle: correctness checks, snapshots, change memory.
  - Section weight: supporting proof block.
  - Obviousness: medium; requires explanation.

- Workflow/feature: temporary status / special menu.
  - Strategic importance: public truth includes time-sensitive operations.
  - User pain: customers arrive or order at the wrong time.
  - Visual: owner temp status card + public banner.
  - Proof angle: auto-expiring public notices.
  - Section weight: supporting block.
  - Obviousness: high.

- Workflow/feature: multi-location governance.
  - Strategic importance: higher-value buyer proof.
  - User pain: outlet drift.
  - Visual: master -> outlets with overrides.
  - Proof angle: inherited master menu and local exceptions.
  - Section weight: compact full-width section.
  - Obviousness: medium.

- Workflow/feature: customer app.
  - Strategic importance: repeat customer access.
  - User pain: customers lose the link.
  - Visual: saved app icon and live menu.
  - Proof angle: one-tap access to current menu.
  - Section weight: supporting block.
  - Obviousness: high.

- Workflow/feature: public API/POS sync.
  - Strategic importance: infrastructure credibility.
  - User pain: downstream systems become stale.
  - Visual: simple source -> POS/API graphic.
  - Proof angle: external systems can consume current source.
  - Section weight: small advanced proof band.
  - Obviousness: low for primary SMB audience.

## Section 10 - Screenshot Strategy

1. Hero composite.
   - Supporting message: one official source for what customers see.
   - Source workflow/screen: OBP runtime + public menu + owner source/publish crop + surface chips.
   - Why it matters: establishes category without abstract illustration.
   - Best format: stylized composite based on real screenshots.
   - Cleanup needed: realistic demo business, no debug/test data, strong item images, visible actions/status.
   - Belongs: hero and social assets.

2. OBP official page.
   - Supporting message: official public identity.
   - Source: `src/app/client/obp/*`.
   - Best format: browser frame + mobile crop.
   - Cleanup: cover/logo/photos/actions/rating/language; avoid empty states.
   - Belongs: hero, proof, public presence section.

3. Live public menu.
   - Supporting message: customers browse a current menu.
   - Source: public menu route/rendering.
   - Best format: mobile frame plus cropped detail.
   - Cleanup: search, categories, freshness/status, language, item details.
   - Belongs: customer experience section.

4. Upload/review/approve flow.
   - Supporting message: start from current menu.
   - Source: `/create-menu`, preview, owner job review.
   - Best format: annotated workflow strip.
   - Cleanup: verify public entry parity and remove "digital menu creator" commodity framing if used publicly.
   - Belongs: workflow/onboarding.

5. Owner source control/publish.
   - Supporting message: owner updates one source.
   - Source: project editor/publish controls.
   - Best format: cropped UI detail.
   - Cleanup: hide advanced clutter, show clear publish/update state.
   - Belongs: workflow/proof.

6. Menu Kit assets.
   - Supporting message: official source deploys into physical/social surfaces.
   - Source: Menu Kit output assets.
   - Best format: editorial composite.
   - Cleanup: generate from realistic business URL/logo/menu.
   - Belongs: real-world deployment section and social.

7. Presence Monitor.
   - Supporting message: official link is deployed where customers look.
   - Source: Use MenuList page.
   - Best format: cropped checklist/detail.
   - Cleanup: show manual vs detected clearly.
   - Belongs: deployment/proof.

8. Customer App.
   - Supporting message: repeat customers keep live access.
   - Source: customer app/PWA screen and icon.
   - Best format: phone home-screen + menu.
   - Cleanup: use "Customer App" language.
   - Belongs: feature/proof.

9. Temp status.
   - Supporting message: time-sensitive truth reaches customers.
   - Source: TempStatusCard + public banner.
   - Best format: before/after or owner/public pair.
   - Cleanup: use realistic "Closed today" or "Opening late" example.
   - Belongs: operational truth section.

10. Multi-location.
   - Supporting message: chain consistency.
   - Source: location controls + inherited menu state.
   - Best format: master/outlet diagram with UI crop.
   - Cleanup: clear HQ/location names and override examples.
   - Belongs: multi-location section.

11. Health/reputation signals.
   - Supporting message: calm protection after launch.
   - Source: HealthSignalCards/ReputationGuard.
   - Best format: small proof cards.
   - Cleanup: demo data must be believable and not fake claims.
   - Belongs: trust section.

12. Public API/POS.
   - Supporting message: MenuList can feed external systems.
   - Source: POS sync tab/API settings/routes.
   - Best format: simple integration visual.
   - Cleanup: no raw JSON as primary homepage visual.
   - Belongs: advanced proof.

## Section 11 - Objections & Trust Gaps

- Objection: "Is this just a QR menu?"
  - Emotional root: commodity fatigue.
  - Operational root: many tools stop at a public menu link.
  - Answer section: hero and public surfaces proof.
  - Answer type: screenshot and positioning copy.
- Objection: "Will it stay updated everywhere?"
  - Emotional root: fear of stale public information.
  - Operational root: owners have seen old links/PDFs keep circulating.
  - Answer section: one-source workflow and reliability proof.
  - Answer type: workflow, proof cards, FAQ.
- Objection: "Do I need to learn another dashboard?"
  - Emotional root: time pressure.
  - Operational root: owner uses phone between operations.
  - Answer section: workflow and mobile/public proof.
  - Answer type: copy, screenshot, CTA microcopy.
- Objection: "Can I check before publishing?"
  - Emotional root: fear of wrong AI/extraction.
  - Operational root: extracted menu/business identity can be wrong.
  - Answer section: onboarding workflow.
  - Answer type: workflow and FAQ.
- Objection: "Will customers trust it?"
  - Emotional root: public credibility.
  - Operational root: generic menu pages look weak.
  - Answer section: OBP/customer menu/public actions.
  - Answer type: screenshot and trust proof.
- Objection: "What about multiple outlets?"
  - Emotional root: brand control anxiety.
  - Operational root: menus drift across branches.
  - Answer section: multi-location block.
  - Answer type: diagram and proof.
- Objection: "Does this replace my website?"
  - Emotional root: confusion around OBP.
  - Operational root: not every business has or wants a full website.
  - Answer section: FAQ.
  - Answer type: copy. Frame as official customer-facing presence, not website builder.
- Objection: "Does it update Google automatically?"
  - Emotional root: desire for hands-off listing management.
  - Operational root: Google profile drift.
  - Answer section: FAQ/future integrations.
  - Answer type: careful copy. Do not overclaim GBP until validated.
- Objection: "Will pricing/payment be simple?"
  - Emotional root: cost uncertainty.
  - Operational root: pricing page has real subscription logic.
  - Answer section: CTA path/pricing route.
  - Answer type: link to pricing, not homepage-heavy pricing changes.
- Objection: "Is this safe for my public business data?"
  - Emotional root: control and trust.
  - Operational root: public info and customer actions are business-critical.
  - Answer section: reliability/trust/FAQ.
  - Answer type: proof and trust language.

## Section 12 - Messaging Territories

Homepage headline territories:

1. The official source for what your customers see.
2. Keep your public menu and business information correct from one place.
3. One source for your menu, official page, QR, and customer app.
4. Your business presence, current wherever customers open it.
5. Start with your menu. Publish one official customer-facing source.
6. The public layer behind your menu, links, and customer actions.
7. Make your menu the source every customer surface follows.
8. Your menu, hours, links, and actions kept aligned.
9. One live source for every customer-facing menu link.
10. Give customers one correct place to check.
11. Turn your current menu into an official public presence.
12. One menu truth, every surface aligned.
13. Where your public business information stays current.
14. Your official menu, page, and customer app from one source.
15. Stop letting old menus speak for your business.

Subheadline territories:

1. Upload or edit your menu once, approve it, and use it across your public page, QR, customer app, screens, and more.
2. MenuList keeps the customer-facing version current while you manage one simple source.
3. Customers see the right menu, hours, contact actions, and status wherever they open your business.
4. Start with what you already have. MenuList turns it into a public presence you can trust.
5. The owner sees simple controls. Customers see a current, professional public surface.
6. Publish one official source, then deploy it to the places customers already check.
7. For growing businesses, one master source keeps outlets aligned without losing local control.
8. Correctness checks, public routing, and quiet infrastructure sit underneath the simple owner flow.
9. Built for local businesses that cannot afford stale public information.
10. A live menu, official page, customer app, and physical QR assets stay tied to the same source.
11. Your public page, customer actions, and menu updates move together.
12. MenuList helps your business look ready before customers decide.
13. Real public output first, reliable infrastructure underneath.
14. From first upload to physical table assets, one source stays in control.
15. No website builder, no dashboard habit, no scattered menu files.

CTA territories:

1. Create your official menu.
2. Start from your menu.
3. Create your official source.
4. Preview your public page.
5. See what customers will open.
6. Publish your MenuList.
7. Build your live menu.
8. Set up your customer-facing presence.
9. Make your menu official.
10. View a live example.

Proof-message territories:

1. One source powers the public page, menu, QR, customer app, and screens.
2. Correctness checks run before public output.
3. Public pages refresh after menu changes.
4. Customer actions stay tied to the official business page.
5. Physical assets point back to the same live source.
6. Customer app access keeps repeat visitors one tap away.
7. Master menus keep outlets aligned.
8. Temporary notices expire automatically.
9. API and POS surfaces can consume the same menu truth.
10. Health and reputation signals stay calm, not dashboard-heavy.

Category framings:

1. Customer-facing business truth infrastructure.
2. Official public source for local businesses.
3. Menu-led public presence system.
4. Public-output consistency layer.
5. Customer-facing source-of-truth system.
6. Official business page and menu infrastructure.
7. Local business public data layer.
8. Multi-surface publishing infrastructure.
9. Chain-capable menu governance layer.
10. Quiet infrastructure for public correctness.

What not to say:

1. "AI-powered menu generator."
2. "QR menu builder."
3. "Restaurant website builder."
4. "All-in-one restaurant management platform."
5. "Smart dynamic menus."
6. "Growth hacking for restaurants."
7. "Marketing automation platform."
8. "Restaurant CRM."
9. "Analytics dashboard for menu performance."
10. "Revolutionary future of restaurant tech."

## Section 13 - Expansion Strategy

- What should come first:
  - One core homepage with the codebase-first narrative.
  - Then a focused `/how-it-works` or product page refresh if current content no longer reflects product truth.
  - Then dedicated high-intent pages only where the current code supports the story.
- Recommended future page architecture:
  - Homepage: primary public-source narrative.
  - Public presence / Official Business Page page: high priority.
  - Multi-location / chain page: high priority after homepage.
  - How it works / onboarding page: high priority if `/create-menu` becomes the primary funnel.
  - Customer App / Menu Kit page or section: medium priority; maybe combined under "deployment."
  - Infrastructure / integrations page: medium priority for POS/public API partners.
  - Trust/security page: existing route can be strengthened later.
  - Industry pages: later, only after core positioning stabilizes.
  - Comparison pages: not yet; risk of commoditizing against QR/menu tools.
  - SEO pages: later and narrow; avoid generic restaurant blog sprawl.
- What should not exist yet:
  - Broad "AI menu generator" landing page.
  - Generic restaurant website builder page.
  - Analytics product page.
  - Growth/marketing campaign page.
  - Too many industry pages before the core category is clear.
- What risks overcomplicating positioning:
  - Separate pages for every feature.
  - Leading with POS/API for SMBs.
  - Making Menu Kit sound like marketing collateral instead of deployment infrastructure.
  - Treating health/reputation as analytics products.

## Section 14 - Information Gaps

- Founder clarification needed:
  - Should `/create-menu` be the primary homepage CTA, or should it remain a secondary acquisition flow until parity is confirmed?
  - Which real demo business should be used for screenshots?
  - Are there validated customer/store counts, setup time, or adoption proof we can publish?
  - Should non-restaurant SMBs be included in hero copy now or introduced lower on the page?
  - Which public surfaces are safe to show as fully production-ready: Google/GBP, POS, public API, health signals, reviews?
- Proof requiring validation:
  - Setup time.
  - Customer adoption lift.
  - Reliability/speed claims.
  - Live integration coverage.
  - Customer testimonials/logos.
- Missing customer evidence:
  - Real owner quotes.
  - Before/after public presence examples.
  - Real Menu Kit deployment photos.
  - Actual multi-location customer story.
  - Real public page engagement patterns.
- Unclear positioning areas:
  - How aggressively to say "infrastructure" in visible copy.
  - Whether "business truth" should appear in hero or only in strategy/metadata.
  - Whether customer app should be a primary proof or secondary proof.
- Visuals needing polish:
  - Hero-grade OBP/menu composite.
  - Public menu screenshots with realistic data.
  - Menu Kit generated assets.
  - Temp status/public banner.
  - Chain master/outlet UI.
  - Health/reputation proof without fake metrics.
- Workflows that may confuse visitors:
  - `/create-menu` if copy says digital menu creator.
  - Public API/POS if shown too early.
  - Health signals if they look like analytics.
  - Reviews if they imply review marketing.
- Infrastructure strengths hidden too deeply:
  - MCE, MOL, snapshots, cache invalidation, routing doctrine, public API, Menu Kit UTM, customer app install behavior.

## Section 15 - Strategic Recommendation

- Recommended homepage strategy:
  - Build the next homepage around "official source for what your customers see." Show public output first, then one-source workflow, then proof that the same source reaches real customer surfaces and stays current through quiet infrastructure. This is a stronger current-codebase strategy than preserving the old page as-is.
- Recommended primary positioning:
  - The official source for your customer-facing business information.
- Recommended hero direction:
  - Product-led public presence composite: OBP/live menu dominant, owner source/publish control secondary, Menu Kit/customer app/screen chips as proof.
- Recommended first 3 sections after hero:
  - Public drift problem.
  - Start-from-menu workflow.
  - Public surfaces proof: OBP, live menu, QR/Menu Kit, customer app, screens.
- Strongest screenshot candidate:
  - OBP + live public menu composite with realistic business data.
- Strongest trust block candidate:
  - "Quiet reliability underneath": correctness checks, publish/version/freshness, cache refresh, snapshots/change memory, owner approval.
- Strongest workflow narrative:
  - Start from current menu -> approve -> publish official source -> deploy everywhere -> keep current from one place.
- Strongest operational-pain narrative:
  - Customers keep seeing old information because no single system owns what is correct.
- Strongest long-term category framing:
  - Menu-led public business truth infrastructure.
- Biggest messaging mistake:
  - Letting the upload/QR/onboarding wedge define the category.
- Biggest homepage risk:
  - Feature overload. The codebase is broad enough to tempt a feature catalog; the homepage must remain one story.
- Biggest conversion opportunity:
  - Let owners see/preview the public output before pricing or technical setup.

## Section 16 - Asset Production Priorities

| Priority | Asset | Why It Matters | Where Used | Requirements |
| --- | --- | --- | --- | --- |
| P0 | OBP + live menu hero composite | Establishes official source narrative | Hero, OG | Demo data, screenshot staging, composite generation, founder approval |
| P0 | Real public menu mobile screenshot | Product proof customers understand instantly | Hero/supporting, customer section | UI cleanup, demo menu, item images, language/status |
| P0 | OBP desktop/mobile screenshot | Shows public presence authority | Hero/proof | Demo business photos/actions/status |
| P0 | One-source workflow strip | Explains value without jargon | Early workflow | Annotation, codebase-accurate steps |
| P0 | Surface fan-out visual | Shows one source across pages/app/QR/screens | Public surfaces section | Composite based on real screens |
| P1 | Menu Kit asset spread | Shows physical deployment | Deployment section/social | Generate assets from demo URL/logo/menu |
| P1 | Presence Monitor crop | Shows deployment checklist | Proof/deployment | Demo state, avoid verification overclaim |
| P1 | Owner publish/control crop | Shows simple owner source | Workflow/reliability | UI crop, cleanup advanced clutter |
| P1 | Temp status owner/public pair | Shows live operational truth | Trust/operational section | Demo status, public banner capture |
| P1 | Customer App phone visual | Shows repeat customer access | Feature/proof/social | App icon, live menu, install/access state |
| P1 | Multi-location master/outlet visual | Shows chain readiness | Multi-location section | Demo HQ/outlets, override state |
| P2 | MCE/reliability proof strip | Makes hidden reliability visible | Trust section | Plain-language labels, no acronyms as primary |
| P2 | Health/reputation signal cards | Shows calm post-launch protection | Trust section | Demo data, careful no outcome claims |
| P2 | POS/API simple visual | Advanced infrastructure proof | Late proof/future page | Simple diagram, no raw JSON |
| P2 | Public menu entry upload/preview flow | Supports onboarding CTA | Onboarding/funnel | Dedicated parity check before hero use |

## Section 17 - Backup And Change-Scope Decision

- Current website state that must be backed up before Stage 4:
  - Current content docs, design system docs, implementation docs, image/SEO docs.
  - Homepage components under `src/components/website/home/`.
  - Website shared components, header/footer, layout, locale files, and website CSS if touched.
- Existing backup:
  - Canonical cleanup removed the old restore backup; use active docs and code.
- Additional Stage 4 backup recommendation:
  - Before implementation, create an implementation note listing every file to be touched.
- Can this strategy be implemented through static content/locales/homepage components only?
  - Mostly yes for the homepage strategy, hero structure, section order, copy, and screenshot placeholders.
  - Likely touched scope:
    - `src/components/website/home/*`
    - `public/locales/menulist.ai/en-US.json`
    - `public/locales/menulist.ai/hi-IN.json`
    - `__docs__/main-website/main-website_content.md`
    - `__docs__/main-website/main-website_image-assets.md`
    - `src/styles/website.css`
  - Exact files should be decided after Stage 3 visual direction.
- Broader website pages needing changes:
  - Not required for first homepage implementation.
  - Later candidates: `/how-it-works`, `/multi-location`, `/trust-security`, `/create-menu`.
- `/pricing` and payment/auth/onboarding files:
  - Keep untouched for Stage 2-4 unless a separate pricing/payment risk review is approved.
  - This strategy does not require pricing changes.
- If pricing changes are later recommended:
  - They must be treated as production billing work, not marketing copy work.
  - Risk review must cover plan selection, currency defaults, billing interval, onboarding modal, `purchaseIntent`, session refresh, subscription lookup, Razorpay API calls, verification, top-up flow, subscription management, plan constants, and entitlement sync.
- Smallest safe implementation scope:
  - Homepage-only v3 strategy implementation using real/staged screenshots and locale-backed copy.
  - No changes to pricing/payment/auth/onboarding.
  - No changes to public menu/OBP runtime behavior unless screenshot staging requires a separate approved demo-data path.

## Stage 2 Cross-Check Log

- Confirmed Stage 2 uses `stage-01-output-repo-context-synthesis-codebase-first.md`, not the superseded first-pass Stage 1 report.
- Corrected the Stage 2 prompt guardrail from current-website-first to codebase-first.
- Re-checked current homepage section order (`src/components/website/home/HomePage.tsx:17-35`) as old website psychology/context only.
- Re-checked active codebase signals:
  - MCE (`src/lib/mce/index.ts:1-55`)
  - MOL (`src/database/menuChangeLog/index.ts:1-169`)
  - Menu Kit (`src/lib/menu-kit/menuKitGenerator.ts:1-97`)
  - OBP and mobile/public owner surfaces
  - Multi-outlet feature flags (`src/config/features.ts:640-708`)
  - Health/reputation/temp status (`src/config/features.ts:1112-1253`)
  - Customer App/Public API/Menu Kit flags (`src/config/features.ts:1534-1741`)
- Pricing/payment scope remains protected; Stage 2 recommends no pricing implementation changes.
- Web search was not used because repository truth was sufficient and external generic SaaS guidance would be secondary for this stage.
