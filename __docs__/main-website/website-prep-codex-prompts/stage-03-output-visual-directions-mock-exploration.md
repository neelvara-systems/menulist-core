# Stage 3 Output - MenuList Visual Directions + Mock Exploration

**Status:** Stage 3 visual strategy output  
**Created:** May 16, 2026  
**Scope:** Visual direction, mock planning, screenshot systems, and image-generation prompts only. No production website code changed.  
**Source prompt:** `__docs__/main-website/website-prep-codex-prompts/stage-03-visual-directions-mock-exploration.md`  
**Primary input:** `stage-02-output-landing-page-strategy-brief.md`  

## Source-Of-Truth Note

This visual exploration uses the corrected codebase-first hierarchy:

1. Current MenuList codebase, public routes, owner/mobile surfaces, feature flags, APIs, and UI components.
2. Current feature docs that match implemented product behavior.
3. Founder/product strategy docs.
4. Existing website content, design, and psychology as a preserved baseline and conversion reference.
5. External research only if needed after codebase truth.

No external web search was used for Stage 3. The visual strategy is grounded in the current product surfaces: Official Business Page, public menu/customer route, Menu Kit, Presence Monitor, Customer App/PWA, temp status, health signals, multi-outlet consistency, public API/POS proof, and the current website component system.

## Repository Context Reviewed

- Current homepage composition: `src/components/website/home/HomePage.tsx`.
- Current hero and surface visual model: `src/components/website/home/HeroSection.tsx`.
- Current website design tokens and constraints: `src/styles/website.css` and `__docs__/main-website/main-website_design-system.md`.
- Current website content psychology: `__docs__/main-website/main-website_content.md`.
- Current visual asset assumptions: `__docs__/main-website/main-website_image-assets.md`.
- Website workflow constraints: `.codex/workflows/website.md`.
- Official Business Page runtime surface: `src/app/client/obp/OBPResolvedSurface.tsx`.
- Public menu/customer route family: `src/app/client/[[...slug]]/`.
- Presence deployment surface: `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx`.
- Menu Kit production system: `src/lib/menu-kit/menuKitGenerator.ts`.
- Temp status public truth surface: `src/components/templates/main-app/businessSettings/TempStatusCard.tsx`.
- Trust/health signal UI: `src/components/templates/main-app/dashboard/OwnerDashboard/HealthSignalCards.tsx`.

## Part 1 - Visual Strategy Summary

### Primary Audience Being Optimized For

- Primary audience:
  - Non-technical SMB owners/operators who need customers to see the correct menu, hours, public link, actions, photos, and current status without managing many tools.
- Secondary audiences:
  - Growing multi-location operators who care about master/outlet consistency.
  - Integration-ready operators who need the public source to feed downstream systems later.
- Visual implication:
  - The page must look simple enough for a busy owner, but serious enough to signal that MenuList is more than a QR menu.

### Emotional Tone

- Calm, official, operationally trustworthy.
- Practical relief rather than hype.
- Product-led confidence: "this is what my customers will see" instead of "this is a dashboard I must manage."
- Quiet infrastructure: the deeper system is visible through proof, not through technical diagrams everywhere.

### Visual Qualities That Must Remain Consistent Across All Directions

- Real customer-facing output must dominate owner/admin UI.
- Product screenshots and composites must come from real MenuList surfaces.
- Section rhythm must be simple, linear, and mobile-readable.
- Visuals must be believable, not fantasy SaaS art.
- Proof must come from public output, workflow continuity, and system behavior.
- CTAs must stay low-friction and owner-friendly.
- Typography should stay close to the current Inter-based website system.
- Cards must stay sharp and restrained; avoid nested cards and decorative card-heavy clutter.
- Color should expand beyond the current blue/slate monotone through measured status accents, not through trend palettes.

### Visual Mistakes That Would Commoditize MenuList

- Hero that looks like a generic QR menu builder.
- Dashboard metrics above the fold.
- AI/automation visuals, sparkle motifs, purple gradients, or abstract "future of work" graphics.
- Random feature grids without public-output proof.
- Stock restaurant photos that do not show MenuList output.
- Fake analytics, fake customer logos, fake business counts, or fake reliability metrics.
- Screenshots that show too much owner complexity before showing customer value.
- Heavy enterprise diagrams that make the SMB owner feel this is not for them.

### What Must Communicate "Infrastructure Underneath Simplicity"

- One source visually feeding many customer surfaces.
- Owner approval/control shown as a small but important source layer.
- Public pages shown as the main trust artifact.
- Status/freshness/verified cues shown inside customer output.
- Menu Kit and Presence Monitor shown as deployment proof, not separate campaign features.
- Multi-location and API/POS proof kept late or compact.
- "Quiet reliability" visualized as checks, version/freshness, cache/update confidence, snapshots/change memory, and owner approval in plain language.

### Three Visual Territories To Explore

1. **Direction A - Official Source Authority**
   - Best for the first homepage.
   - Centers the OBP/live menu as the official customer-facing source.
   - Prioritizes clarity, conversion, and owner trust.

2. **Direction B - Deployed Presence System**
   - Best for distinctiveness and product-led storytelling.
   - Shows MenuList leaving the screen through table tents, stickers, WhatsApp, Instagram, Google, customer phones, and QR assets.
   - Makes multi-surface presence feel tangible.

3. **Direction C - Chain-Grade Control Layer**
   - Best for long-term infrastructure positioning and serious operators.
   - Emphasizes master/outlet governance, reliability signals, public API/POS readiness, health/status, and source-control confidence.
   - Strong future page candidate; riskier as the first homepage lead.

## Part 2 - Visual Direction A

## Visual Direction A - Official Source Authority

### A1 - Strategic Rationale

- Why this direction fits MenuList:
  - It directly expresses the Stage 2 recommendation: "the official source for what your customers see."
  - It uses the implemented OBP and public menu as proof instead of abstract visuals.
  - It makes MenuList feel like a public authority layer rather than a menu-design utility.
- Audience fit:
  - Best for primary SMB owners and operators.
  - Also understandable to multi-location operators because it can introduce surface consistency without enterprise framing.
- Emotional response:
  - "My customers need this one official place."
  - "This looks professional, but not difficult."
- Emphasizes:
  - Official page, live menu, current status, public actions, one-source workflow, multi-surface consistency.
- Intentionally de-emphasizes:
  - Dashboard complexity, API/POS, analytics, advanced reputation systems, deep chain governance.
- Strategic upside:
  - Highest first-visit clarity and lowest risk of commoditizing the product.
  - Easy to implement through homepage/static content and screenshot composites.
- Strategic risk:
  - If visuals are too clean or generic, it may still look like a public-page builder.
  - Must show fan-out surfaces early enough to avoid "just another business page."
- Confidence level:
  - High.

### A2 - Visual Identity System

- Visual mood:
  - Official, clean, quiet, confident, product-led.
- Typography style:
  - Keep Inter.
  - Use compact, high-confidence headings; avoid oversized hero typography that feels like a launch template.
  - No negative letter spacing beyond existing system; body text stays readable.
- Layout personality:
  - Centered hero copy above a wide product composite.
  - Linear sections with strong "source -> output -> proof" progression.
  - No decorative split hero card.
- Density level:
  - Medium-low above the fold.
  - Medium in product proof sections.
  - Low in final CTA and FAQ.
- Spacing philosophy:
  - Preserve current website breathing room.
  - Use full-width bands rather than floating section cards.
  - Keep cards only for repeated proof items and screenshot callouts.
- Screenshot treatment:
  - Real OBP browser screenshot and real public menu mobile screenshot dominate.
  - Owner/publish/control crop appears smaller as context.
  - Surface chips show QR/Menu Kit, customer app, screens, public link.
- Motion philosophy:
  - Gentle source-to-surface sequencing.
  - Small active-surface highlight, not constant animation.
  - No parallax-heavy or scroll-jacking behavior.
- Iconography style:
  - Continue `react-icons/lu`.
  - Icons are support labels, not the main visual.
- Framing system:
  - Browser frame for OBP.
  - Mobile frame for public menu.
  - Small output badges for surfaces.
  - Thin connector lines only where they explain source propagation.
- Visual rhythm:
  - Public output first, workflow second, proof third, real-world deployment fourth, advanced depth late.
- Background treatment:
  - White and soft gray base.
  - One calm off-white proof band.
  - Avoid gradients and decorative blobs.
- Color approach:
  - Base: white, slate/ink, soft gray.
  - Brand: current blue retained for CTA and source markers.
  - Trust accents: emerald for "current/verified", amber for temporary status, neutral graphite for infrastructure.
  - This reduces one-note blue while staying restrained.
- Contrast philosophy:
  - High contrast for text.
  - Low contrast for connectors and background proof layers.
- Device/mockup treatment:
  - Large desktop browser frame and mobile frame, no glossy device glamour.
  - Product UI should remain readable and inspectable.
- How this avoids generic SaaS aesthetics:
  - Uses MenuList's actual public outputs as the hero.
  - Avoids abstract dashboards, metrics, gradients, and fake cards.

### A3 - Hero Concept

- Hero narrative:
  - "MenuList becomes the official customer-facing version of your business."
- Ideal hero composition:
  - Top: headline, subheadline, dual CTA, microtrust line.
  - Below: wide product-led composite.
  - Composite center: OBP browser frame with business name, status, photos, actions, menu CTA, language/freshness.
  - Composite right: mobile public menu crop with search, section chips, item cards, price, current status.
  - Composite left/bottom: small owner source/publish control crop.
  - Bottom row: surface chips for QR/Menu Kit, Customer App, Screens, WhatsApp/Instagram/Google placement.
- What appears above fold:
  - Headline and CTA.
  - A large visible slice of the OBP/menu composite.
  - A small proof strip: "Official page", "Live menu", "QR assets", "Customer app", "Screens".
- Ideal screenshot/mockup structure:
  - Stylized composite based on real screenshots.
  - 80 percent product truth, 20 percent editorial framing.
- CTA structure:
  - Primary: `Create your official menu` or `Start from your menu`.
  - Secondary: `See a live example`.
  - Microcopy: "No technical setup. Owner approval before publishing."
- Trust element placement:
  - Product proof under CTA, not fake logos.
  - Freshness/current status inside screenshot.
- What must communicate instantly:
  - Customers get one official public place.
  - Menu and business information are aligned.
  - Setup starts from the owner's current menu.
- What must NOT appear:
  - Pricing cards.
  - Dashboard charts.
  - API/POS diagram.
  - AI terms.
  - Fake "used by" proof.
- Hero emphasis:
  - Operational calm: high.
  - Propagation: medium-high.
  - Synchronization: medium-high.
  - Public presence: very high.
  - Chain control: low.
  - Publishing: high.
  - Authority: very high.
  - Infrastructure confidence: medium, shown through proof cues.

### A4 - Section Storytelling Rhythm

- Hero:
  - Visual approach: large OBP/live menu composite.
  - Screenshot style: browser + mobile frame, realistic data.
  - Layout rhythm: copy first, visual immediately below, next section hint visible.
  - Proof presentation: product proof chips.
  - Workflow storytelling: one-source implication, not a full diagram.
  - Transition: public drift problem follows naturally.

- Workflow overview:
  - Visual approach: "current menu -> approve -> publish -> deploy -> keep current."
  - Screenshot style: compact workflow strip with one small UI crop per step.
  - Layout rhythm: horizontal desktop, vertical mobile.
  - Proof presentation: owner approval and public output.
  - Transition: from problem to practical relief.

- Synchronization story:
  - Visual approach: one source feeding official page, live menu, Menu Kit, customer app, screens.
  - Screenshot style: surface fan-out with real thumbnails.
  - Layout rhythm: central source node with restrained connectors.
  - Proof presentation: "same source" labels and current/freshness badge.
  - Transition: from workflow to public surfaces.

- Publishing flow:
  - Visual approach: owner update/publish crop paired with customer-facing result.
  - Screenshot style: owner crop small, public result larger.
  - Layout rhythm: before/after pair.
  - Proof presentation: "owner approves before publishing."
  - Transition: public output proves the system.

- Proof sections:
  - Visual approach: calm reliability strip.
  - Screenshot style: small proof cards from MCE/MOL/snapshot/cache/freshness concepts translated to owner language.
  - Layout rhythm: 4-5 compact blocks.
  - Proof presentation: no raw acronyms.
  - Transition: "what customers see" to "why it stays right."

- Multi-location systems:
  - Visual approach: compact late-page master/outlet diagram.
  - Screenshot style: UI crop plus simple branch lines.
  - Layout rhythm: one section, not a dominant homepage theme.
  - Proof presentation: "master menu, local exceptions."
  - Transition: SMB story expands to serious operators.

- Integrations:
  - Visual approach: late proof band.
  - Screenshot style: source -> POS/API line, no raw JSON.
  - Layout rhythm: narrow, optional.
  - Proof presentation: "structured source when you need it."
  - Transition: advanced credibility before FAQ.

- FAQ:
  - Visual approach: text-first, calm.
  - Screenshot style: none.
  - Layout rhythm: short accordion/list.
  - Proof presentation: answer setup, updates, multi-location, pricing, integrations honestly.
  - Transition: removes objections before CTA.

- Final CTA:
  - Visual approach: minimal.
  - Screenshot style: optional tiny public output crop or no visual.
  - Layout rhythm: focused CTA.
  - Proof presentation: "Start from your current menu."
  - Transition: decision without adding new concepts.

### A5 - Screenshot & Mockup System

| Screen / Visual | Treatment | Why It Works | Instant Message | Cleanup Required |
| --- | --- | --- | --- | --- |
| OBP official page | Browser frame, hero-grade | Strongest public authority artifact | One official business page | Real demo business, photos, actions, status, no empty states |
| Live public menu | Mobile frame and crop | Shows what customers inspect | Current menu customers can browse | Real item names, prices, images, search, sections, language/freshness |
| Owner publish/source control | Cropped UI detail | Shows owner approval without dashboard overload | Owner controls source | Hide debug/advanced clutter, show simple publish state |
| Surface fan-out | Editorial composite | Prevents "just a page" framing | Same source reaches many surfaces | Use real surface labels and screenshots |
| Temp status pair | Owner/public before-after | Shows time-sensitive truth | Public notices stay current | Realistic "Closed today" or "Opening late" data |
| Menu Kit preview | Small supporting composite | Shows real-world deployment | Official source can be printed/shared | Generate realistic table tent/sticker/social assets |
| Presence Monitor crop | Cropped checklist | Shows deployment discipline | Put official link where customers look | Avoid overclaiming auto-detection |
| Multi-location | Diagram with UI crop | Signals chain readiness | Master source, outlet control | Clear HQ/outlet names and override state |

### A6 - Asset System

| Asset | Source Type | Implementation Complexity | Strategic Importance |
| --- | --- | --- | --- |
| Hero OBP + public menu composite | Real screenshots + composite | Medium | P0 |
| Public drift tiles | Lightweight illustration + copy | Low | P0 |
| One-source workflow strip | Real UI crops + annotation | Medium | P0 |
| Surface fan-out visual | Composite from screenshots | Medium | P0 |
| Customer browse mobile visual | Real screenshot | Medium | P0 |
| Reliability proof strip | Typography-led + small UI cues | Low | P1 |
| Menu Kit deployment visual | Generated/real Menu Kit assets | Medium | P1 |
| Temp status owner/public pair | Real UI crops | Medium | P1 |
| Multi-location proof block | Diagram + UI crop | Medium | P1 |
| OG/social image | Hero composite derivative | Medium | P0 |
| Optional diagrams | Lightweight illustration | Low | P2 |

### A7 - Implementation Realism

- Implementation complexity:
  - Medium.
- Reuse potential from existing repo:
  - High.
  - Reuse `SectionWrapper`, `SectionHeading`, `WebsiteButton`, `AnimateOnScroll`, website CSS variables, and Lucide icons.
- Likely reusable components:
  - Current homepage structure and shared website primitives.
  - Current hero surface chips can be evolved into source/surface proof chips.
- Likely net-new work:
  - Hero composite component.
  - Product screenshot wrapper styles.
  - New public drift/problem tiles.
  - New reliability proof strip.
- Animation complexity:
  - Low to medium.
  - Gentle active-surface highlighting is enough.
- Asset production complexity:
  - Medium because real screenshots require staging.
- Mobile responsiveness difficulty:
  - Medium.
  - Product composite must collapse into a readable vertical sequence.
- Scope impact:
  - Can be implemented through homepage/static/content/locales/CSS and image assets.
  - Should not touch pricing, payment, auth, subscription, Razorpay, or onboarding logic.

## Part 3 - Visual Direction B

## Visual Direction B - Deployed Presence System

### B1 - Strategic Rationale

- Why this direction fits MenuList:
  - It visualizes the core idea that MenuList is not only software; it places the official source wherever customers already look.
  - It uses Menu Kit, Presence Monitor, QR/table assets, social images, customer app, and public page proof as a coherent system.
- Audience fit:
  - Best for SMB owners who think in physical operations and WhatsApp/Instagram/Google placement.
  - Useful for businesses that need a visible public presence quickly.
- Emotional response:
  - "This goes into my shop, my packaging, my phone, and my customer links."
  - "I can see how customers will actually find this."
- Emphasizes:
  - Real-world deployment, QR/menu kit assets, public link placement, customer app, WhatsApp/Instagram/Google surfaces.
- Intentionally de-emphasizes:
  - Deep reliability architecture and chain governance.
- Strategic upside:
  - Most distinctive visually.
  - Avoids dashboard sameness.
  - Shows the public-presence wedge in a tangible way.
- Strategic risk:
  - Could look like a QR/print asset generator if the official source is not visually central.
  - Generated physical scenes must not look like stock photography.
- Confidence level:
  - Medium-high.

### B2 - Visual Identity System

- Visual mood:
  - Editorial, grounded, tactile, operational.
- Typography style:
  - Inter with stronger editorial section headers.
  - Short text blocks paired with product-led scenes.
- Layout personality:
  - Full-width product scenes.
  - Alternating bands of digital output and deployed physical/social assets.
  - More immersive than Direction A but still restrained.
- Density level:
  - Medium.
  - Visual richness comes from asset variety, not from crowded UI.
- Spacing philosophy:
  - Wider visual breathing room around physical assets.
  - Avoid collage chaos; each deployment surface needs a clear role.
- Screenshot treatment:
  - OBP/live menu remain the source.
  - Menu Kit, table tent, sticker, WhatsApp/Instagram/Google images, and customer app appear as downstream outputs.
- Motion philosophy:
  - Gentle reveal from "source" to "placed in the world."
  - Optional sequential highlight of surfaces.
- Iconography style:
  - Minimal icons; real assets carry the story.
- Framing system:
  - Product source frame plus physical/social asset spread.
  - Use tabletop/phone/social contexts sparingly and with clean lighting.
- Visual rhythm:
  - Digital source -> customer places -> physical/social deployment -> proof -> CTA.
- Background treatment:
  - White and soft gray base with neutral tabletop/editorial surfaces.
  - Avoid beige/sand domination; keep product blue and trust accents visible.
- Color approach:
  - Base: white, graphite, soft gray.
  - Accents: brand blue, emerald status, amber temporary notice, restrained printed-paper neutrals.
- Contrast philosophy:
  - Public output must remain readable; physical environment stays secondary.
- Device/mockup treatment:
  - Realistic phone and print asset mockups.
  - No glossy 3D object overload.
- How this avoids generic SaaS aesthetics:
  - It shows the product becoming customer-facing infrastructure in real business contexts.

### B3 - Hero Concept

- Hero narrative:
  - "One official source, placed everywhere your customers already look."
- Ideal hero composition:
  - A large central OBP/live menu source.
  - Around it: table tent, counter sticker, WhatsApp status, Instagram story, Google image, customer app phone.
  - Subtle connector labels: "one source", "printed", "shared", "saved", "opened."
- What appears above fold:
  - Headline and CTA.
  - Hero visual as an editorial asset spread.
  - A source marker showing all assets come from the same MenuList public source.
- Ideal screenshot/mockup structure:
  - Composite led by real product screenshots plus generated physical asset staging.
- CTA structure:
  - Primary: `Start from your menu`.
  - Secondary: `See where it appears`.
- Trust element placement:
  - Product source label close to central OBP/menu.
  - "Owner approval before publishing" near source layer.
- What must communicate instantly:
  - MenuList is not only a link; it gets deployed across customer touchpoints.
- What must NOT appear:
  - A pure QR code hero.
  - Stock restaurant background without product proof.
  - Campaign/ad language.
- Hero emphasis:
  - Operational calm: medium-high.
  - Propagation: high.
  - Synchronization: medium.
  - Public presence: high.
  - Chain control: low.
  - Publishing: high.
  - Authority: medium-high.
  - Infrastructure confidence: medium.

### B4 - Section Storytelling Rhythm

- Hero:
  - Visual approach: editorial deployment spread.
  - Screenshot style: OBP/menu plus physical/social assets.
  - Layout rhythm: immersive visual under concise copy.
  - Proof presentation: source label and deployed surface labels.
  - Workflow storytelling: source-to-placement.
  - Transition: from deployment proof to public drift problem.

- Workflow overview:
  - Visual approach: menu upload/review/publish/deploy.
  - Screenshot style: flow strip with Menu Kit handoff.
  - Layout rhythm: practical, not technical.
  - Proof presentation: download/share/print actions.
  - Transition: action path from existing menu.

- Synchronization story:
  - Visual approach: assets update from source.
  - Screenshot style: public menu/mobile/OBP with matching data.
  - Layout rhythm: side-by-side source/output consistency.
  - Proof presentation: "same price, same item, same status."
  - Transition: physical proof becomes system proof.

- Publishing flow:
  - Visual approach: owner approves source, surfaces inherit.
  - Screenshot style: owner crop + deployed assets.
  - Layout rhythm: source card at top, surfaces below.
  - Proof presentation: owner approval boundary.
  - Transition: from simple setup to proof.

- Proof sections:
  - Visual approach: deployment checklist and current public output.
  - Screenshot style: Presence Monitor crop and Menu Kit asset set.
  - Layout rhythm: compact.
  - Proof presentation: "visible in the places customers check."
  - Transition: practical trust before advanced depth.

- Multi-location systems:
  - Visual approach: repeated deployment across locations.
  - Screenshot style: three branch kits from one master source.
  - Layout rhythm: concise late section.
  - Proof presentation: "same source, local place."
  - Transition: growth-readiness.

- Integrations:
  - Visual approach: "official source also feeds systems."
  - Screenshot style: small technical proof band.
  - Layout rhythm: restrained.
  - Proof presentation: POS/API as advanced layer.
  - Transition: serious operators.

- FAQ:
  - Visual approach: text-first.
  - Screenshot style: none.
  - Layout rhythm: practical answers.
  - Proof presentation: answer print, QR, link placement, updates.
  - Transition: remove hesitation.

- Final CTA:
  - Visual approach: small deployed asset row.
  - Screenshot style: table tent + public page miniature.
  - Layout rhythm: decisive but not noisy.
  - Proof presentation: "start from current menu."
  - Transition: convert.

### B5 - Screenshot & Mockup System

| Screen / Visual | Treatment | Why It Works | Instant Message | Cleanup Required |
| --- | --- | --- | --- | --- |
| OBP/live menu source | Browser/mobile frame | Prevents QR-only misunderstanding | There is one official source | Strong demo data and brand identity |
| Menu Kit asset spread | Editorial composite | Most tangible differentiator | Your official menu gets placed everywhere | Generate real table tent/sticker/social assets |
| Presence Monitor | Cropped checklist | Shows deployment discipline | Official link belongs in real customer places | Use clear incomplete/complete states |
| WhatsApp/Instagram/Google asset mockups | Generated composite from Menu Kit assets | Shows customer touchpoints owners understand | Shareable public source | Avoid unsupported Google sync claims |
| Customer App | Phone/home-screen + menu | Shows repeat access | Customers keep one-tap current access | Use real icon/name/menu state |
| Temp status on public output | Owner/public pair | Shows live operational truth | Status reaches customers | Stage "Closed today" or "Opening late" |
| Surface fan-out | Physical + digital composite | Shows system, not asset generator | One source, many placements | Keep source visually central |

### B6 - Asset System

| Asset | Source Type | Implementation Complexity | Strategic Importance |
| --- | --- | --- | --- |
| Hero deployed presence composite | Real screenshots + generated physical staging | High | P0 |
| Menu Kit asset spread | Real generated Menu Kit assets | Medium | P0 |
| Presence Monitor crop | Real screenshot | Medium | P1 |
| Social/Google/WhatsApp placement visuals | Generated/composite | Medium | P1 |
| Customer App phone visual | Real screenshot + phone frame | Medium | P1 |
| Public output source frame | Real OBP/menu screenshot | Medium | P0 |
| Workflow strip | Screenshot + icon labels | Medium | P0 |
| OG/social image | Deployment hero derivative | Medium | P0 |
| Optional real-world shop counter photo | Generated visual | Medium | P2 |

### B7 - Implementation Realism

- Implementation complexity:
  - Medium-high because hero assets require better production.
- Reuse potential from existing repo:
  - Medium-high.
  - Website sections and CSS can be reused, but visuals need new composites.
- Likely reusable components:
  - Current surface cards, workflow section primitives, shared buttons/headings.
- Likely net-new work:
  - Asset spread component.
  - Menu Kit visual gallery.
  - Presence deployment section.
- Animation complexity:
  - Medium if sequential deployment is animated; low if static.
- Asset production complexity:
  - High relative to A.
- Mobile responsiveness difficulty:
  - Medium-high; physical asset collage must collapse carefully.
- Scope impact:
  - Can still stay homepage/static/content/locales/assets only.
  - Does not require pricing/payment/auth/onboarding changes.

## Part 4 - Visual Direction C

## Visual Direction C - Chain-Grade Control Layer

### C1 - Strategic Rationale

- Why this direction fits MenuList:
  - It reveals the serious infrastructure depth behind the simple product.
  - It uses multi-outlet consistency, master/outlet behavior, health signals, temp status, public API/POS, cache/version/freshness proof, and owner approval as trust signals.
- Audience fit:
  - Best for growing operators, small chains, serious SMBs, integration partners, and future infrastructure pages.
  - Less ideal as the first homepage for single-location owners.
- Emotional response:
  - "This is built to keep operations consistent as we grow."
  - "There is real control underneath the public page."
- Emphasizes:
  - Governance, source control, public correctness, reliability, chain consistency, advanced integrations.
- Intentionally de-emphasizes:
  - Quick setup magic, physical deployment, low-friction first-time owner emotion.
- Strategic upside:
  - Strongest long-term infrastructure signal.
  - Builds credibility beyond QR/menu commodity products.
- Strategic risk:
  - Could feel too enterprise or too dashboard-heavy for primary SMB visitors.
  - Must avoid making the homepage feel like operational software.
- Confidence level:
  - Medium as homepage lead; high as later chain/infrastructure page direction.

### C2 - Visual Identity System

- Visual mood:
  - Serious, structured, calm, system-of-record oriented.
- Typography style:
  - Inter with tighter headings and more compact labels.
  - Use section labels sparingly to create operational authority.
- Layout personality:
  - Strong grid discipline.
  - Source-control strips, proof rails, and governance diagrams.
  - Public output still visible, but owner/control layer is more prominent than A/B.
- Density level:
  - Medium-high, but organized.
- Spacing philosophy:
  - Dense within proof modules, generous between sections.
  - Avoid nested UI cards; use rails and bands.
- Screenshot treatment:
  - Public output paired with control-state screenshots.
  - Master/outlet propagation diagrams with actual UI crops.
  - Health/temp status proof cards.
- Motion philosophy:
  - Minimal.
  - Optional propagation pulse from master to outlets or source to public surfaces.
- Iconography style:
  - Functional Lucide icons: shield, check, branch, refresh, clock, API/key.
- Framing system:
  - Browser frame for public output.
  - Control rail for owner source.
  - Compact diagrams for outlet propagation.
- Visual rhythm:
  - Official source -> control -> propagation -> reliability -> growth systems.
- Background treatment:
  - White/gray base with occasional graphite proof band.
  - Avoid full dark-blue site theme.
- Color approach:
  - Base: white, graphite, slate.
  - Brand blue as source marker.
  - Emerald for stable/current.
  - Amber for watch/status.
  - Red only for examples of avoided public drift, not system branding.
- Contrast philosophy:
  - More technical proof can use lower visual contrast, but headings and CTAs remain clear.
- Device/mockup treatment:
  - Less editorial, more operational.
  - Browser/mobile/public output plus admin crop in consistent frames.
- How this avoids generic SaaS aesthetics:
  - It shows governance over actual customer-facing business truth, not metrics dashboards.

### C3 - Hero Concept

- Hero narrative:
  - "One controlled source keeps every public surface consistent."
- Ideal hero composition:
  - Center: public OBP/live menu preview.
  - Top/left rail: owner-approved source status.
  - Right rail: outlet and surface states.
  - Bottom proof strip: current, published, freshness, customer app, QR assets, POS/API ready.
- What appears above fold:
  - Headline about official customer-facing source.
  - Product composite with control rail.
  - Dual CTA, but secondary may be `See how updates stay aligned`.
- Ideal screenshot/mockup structure:
  - Structured composite with actual UI crops.
  - More schematic than A, but still product-led.
- CTA structure:
  - Primary: `Create your official source`.
  - Secondary: `See how it stays aligned`.
- Trust element placement:
  - Source state/freshness label inside the hero visual.
  - No fake uptime/reliability metric.
- What must communicate instantly:
  - MenuList keeps public output controlled and consistent.
- What must NOT appear:
  - Overwhelming branch dashboards.
  - Raw API keys or developer panels above fold.
  - Enterprise jargon.
- Hero emphasis:
  - Operational calm: high.
  - Propagation: high.
  - Synchronization: high.
  - Public presence: medium-high.
  - Chain control: high.
  - Publishing: high.
  - Authority: high.
  - Infrastructure confidence: very high.

### C4 - Section Storytelling Rhythm

- Hero:
  - Visual approach: official output plus control rail.
  - Screenshot style: public output central, source/control labels around it.
  - Layout rhythm: tighter and more operational.
  - Proof presentation: current/published/approved status.
  - Workflow storytelling: control keeps public output aligned.
  - Transition: public drift problem becomes governance problem.

- Workflow overview:
  - Visual approach: source approval -> publish -> propagation -> monitoring.
  - Screenshot style: controlled steps with status labels.
  - Layout rhythm: compact rail.
  - Proof presentation: "owner approved", "current", "deployed."
  - Transition: shows how system reduces drift.

- Synchronization story:
  - Visual approach: source state fans to surfaces and outlets.
  - Screenshot style: propagation diagram plus UI crops.
  - Layout rhythm: master rail with surface/outlet grid.
  - Proof presentation: consistency labels.
  - Transition: deeper infrastructure proof.

- Publishing flow:
  - Visual approach: versioned publish moment.
  - Screenshot style: before/after public output plus publish state.
  - Layout rhythm: controlled and concise.
  - Proof presentation: freshness/cache/version language translated for owners.
  - Transition: reliability proof.

- Proof sections:
  - Visual approach: proof rail for correctness checks, change memory, snapshots, public cache refresh, owner approval.
  - Screenshot style: small UI details, not raw internals.
  - Layout rhythm: dense but readable.
  - Proof presentation: plain-language labels.
  - Transition: from hidden systems to customer trust.

- Multi-location systems:
  - Visual approach: strongest section in this direction.
  - Screenshot style: master/outlet UI and override diagram.
  - Layout rhythm: full-width proof section.
  - Proof presentation: master menu, local exceptions, outlet consistency.
  - Transition: chain readiness.

- Integrations:
  - Visual approach: source -> POS/API consumers.
  - Screenshot style: small integration diagram.
  - Layout rhythm: late-page credibility band.
  - Proof presentation: structured source for serious operators.
  - Transition: FAQ.

- FAQ:
  - Visual approach: objection handling around updates, overrides, setup, pricing, integrations.
  - Screenshot style: none.
  - Layout rhythm: compact.
  - Proof presentation: confidence without overclaiming.
  - Transition: final decision.

- Final CTA:
  - Visual approach: source-control statement.
  - Screenshot style: optional miniature source/public pair.
  - Layout rhythm: simple, not enterprise.
  - Proof presentation: official public source.
  - Transition: conversion.

### C5 - Screenshot & Mockup System

| Screen / Visual | Treatment | Why It Works | Instant Message | Cleanup Required |
| --- | --- | --- | --- | --- |
| Public output + control rail | Composite | Connects source to public result | Controlled public truth | Stage source status and public result clearly |
| Master/outlet visual | Diagram + UI crop | Strong chain proof | HQ consistency with local flexibility | Clear demo outlets and overrides |
| Owner publish/version crop | Cropped UI | Shows source authority | Owner approves source | Keep UI simple and believable |
| Health signal cards | Proof cards | Shows calm monitoring | Public presence health is watched | Avoid fake outcome claims |
| Temp status | Owner/public pair | Shows time-sensitive truth | Changes reach customers | Realistic data, no clutter |
| POS/API proof band | Simple source diagram | Shows infrastructure readiness | MenuList can feed systems | No raw developer UI as hero |
| Surface fan-out | Structured propagation diagram | Shows consistency beyond one page | Same truth across surfaces | Use real surface labels |

### C6 - Asset System

| Asset | Source Type | Implementation Complexity | Strategic Importance |
| --- | --- | --- | --- |
| Hero source/control/public composite | Real screenshots + diagram | Medium-high | P0 for C |
| Master/outlet propagation visual | Real UI crop + illustration | Medium | P0 for C |
| Reliability proof rail | Typography-led + UI cues | Low-medium | P0 for C |
| Health/temp status proof visuals | Real UI crops | Medium | P1 |
| POS/API source proof | Lightweight diagram | Low | P2 homepage, P0 future page |
| Surface consistency visual | Composite | Medium | P1 |
| OG/social image | Source-control derivative | Medium | P1 |

### C7 - Implementation Realism

- Implementation complexity:
  - Medium-high if used as homepage lead.
  - Medium if used as a later support page or late homepage section.
- Reuse potential from existing repo:
  - Medium.
  - Many visuals come from existing owner/admin surfaces, but they need careful cropping to avoid complexity.
- Likely reusable components:
  - Website wrappers/buttons/headings.
  - Existing public surface components as screenshot sources.
  - Current proof card patterns.
- Likely net-new work:
  - Control rail hero.
  - Propagation diagram component.
  - Chain proof module.
- Animation complexity:
  - Low if static; medium if propagation pulses are used.
- Asset production complexity:
  - Medium.
- Mobile responsiveness difficulty:
  - High for control/propagation visuals; needs simplified mobile-specific stacking.
- Scope impact:
  - Can be homepage/static/content/locales/assets only.
  - Should not touch pricing/payment/auth/onboarding logic.
  - Do not modify multi-outlet/payment behavior just to create marketing visuals.

## Part 5 - Cross-Direction Comparison

| Direction | Strategic Focus | Emotional Tone | Conversion Strength | Brand Distinctiveness | Infrastructure Signaling | Screenshot Dependence | Complexity | Risk | Best Audience | Long-Term Scalability | Recommended Usage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A - Official Source Authority | Official customer-facing source | Calm, official, clear | High | Medium-high | Medium-high | High, but focused | Medium | Low-medium | Primary SMB owners | High | Recommended homepage base |
| B - Deployed Presence System | Real-world multi-surface deployment | Tangible, practical, product-led | Medium-high | High | Medium | High plus generated assets | Medium-high | Medium | SMB owners who value QR/social/physical placement | Medium-high | Backup direction and strong section system |
| C - Chain-Grade Control Layer | Governance and public truth control | Serious, structured, infrastructure-grade | Medium for SMB, high for chain | Medium-high | Very high | Medium | Medium-high | Medium-high | Multi-location, serious operators, partners | Very high | Future chain/infrastructure page; late homepage proof |

### Direction Strength Readout

- Strongest strategically:
  - Direction A.
  - It best balances primary ICP clarity, product truth, public-presence authority, and implementation realism.
- Safest:
  - Direction A.
  - Lowest risk of overcomplicating the first visit.
- Most distinctive:
  - Direction B.
  - It shows the product deployed into real-world customer touchpoints instead of another SaaS screen.
- Best long-term infrastructure positioning:
  - Direction C.
  - It should inform late-page proof and future chain/infrastructure pages more than the first hero.

## Part 6 - Final Recommendation

### Recommended Direction

- Recommended direction:
  - **Direction A - Official Source Authority**.
- Recommended execution nuance:
  - Use Direction A as the base visual system.
  - Borrow one or two Direction B visual moments for the real-world deployment section and social/OG assets.
  - Keep Direction C as a compact proof layer and future page direction.

### Why Direction A Wins

- It directly supports the Stage 2 homepage strategy.
- It keeps the product understandable in under five seconds.
- It lets the current codebase's strongest proof surfaces carry the page: OBP, public menu, owner-approved source, Menu Kit/customer app/screens as proof.
- It can be implemented without touching high-risk system logic.
- It respects the old website psychology of owner relief and low cognitive load while improving the page from current product truth.

### Assets/Screens Required First

1. OBP desktop screenshot with realistic demo business.
2. Public menu mobile screenshot with search, sections, items, prices, language/status/freshness.
3. Owner source/publish control crop.
4. Surface fan-out miniatures: QR/Menu Kit, Customer App, Screens, public link.
5. One-source workflow strip.
6. Menu Kit asset spread for later section.
7. Temp status owner/public pair.

### Implementation Risks

- Hero composite may become too busy on mobile.
- Public page may look like a generic website builder if fan-out surfaces are not visible.
- Overusing blue/slate may make the page feel one-note; use emerald/amber/status accents carefully.
- Using fake screenshots would damage credibility.

### Pricing/Payment/Auth/Onboarding Scope

- Direction A can be implemented without touching pricing, payment, auth, subscription, Razorpay, or onboarding logic.
- Stage 4 should default to homepage/static/content/locales/CSS/image assets only.
- `/pricing` and payment logic remain protected and out of scope unless separately approved.

### Existing Website State To Preserve Before Implementation

- Existing content backup already exists:
  - Canonical cleanup removed the old restore backup; use active docs and code.
- Before Stage 4, create an implementation note listing exact touched runtime files.
- Preserve current website docs as historical strategy, even if the homepage evolves beyond v2.6.

### Backup Direction

- Backup direction:
  - **Direction B - Deployed Presence System**.
- Why it is the backup:
  - It is visually distinct and deeply tied to MenuList's unique deployment assets.
  - It may work best if the owner wants a more tangible, demoable homepage.
- What could go wrong:
  - If the official source is not central, it becomes "QR/print kit" marketing.
  - Generated physical scenes could feel stock-like.

### What Must Be Executed Carefully

- Real screenshots must be staged with credible demo data.
- Public output must remain more prominent than dashboard/admin UI.
- No unsupported claims about automatic Google sync, uptime, customer lift, or usage counts.
- Mobile layout must not collapse product composites into unreadable thumbnails.
- The page must not become a feature catalog.

## Part 7 - Mockup Production Plan

### Direction A Mockup Plan - Official Source Authority

- Hero mockup:
  - OBP browser frame + mobile public menu frame + small owner source/publish crop + surface chips.
- Supporting feature mockups:
  - Public drift tiles.
  - One-source workflow strip.
  - Customer browse mobile screenshot.
  - Reliability under-surface proof strip.
- Synchronization visuals:
  - Central source -> OBP/live menu/Menu Kit/customer app/screens.
- Publishing visuals:
  - Owner approves -> public output current.
- Chain-governance visuals:
  - Small master/outlet proof block late page.
- Screenshot composites:
  - Hero and surface fan-out.
- Workflow strips:
  - Current menu -> approve -> publish -> deploy -> keep current.
- Optional diagrams:
  - Simple source/fan-out connector diagram.
- Real screenshots:
  - OBP, public menu, owner publish/control, temp status, customer app.
- Composites:
  - Hero, fan-out, OG.
- Image generation:
  - Minimal; used only for polished physical/OG background treatment if needed.
- Staged demo data:
  - Required for all product screenshots.

### Direction B Mockup Plan - Deployed Presence System

- Hero mockup:
  - Central source with Menu Kit/table/social/customer app deployment assets around it.
- Supporting feature mockups:
  - Menu Kit asset spread.
  - Presence Monitor checklist crop.
  - WhatsApp/Instagram/Google placement visual.
  - Customer App phone visual.
- Synchronization visuals:
  - Same menu item/status visible across public page, phone, print, and social asset.
- Publishing visuals:
  - Source publish followed by deployment asset availability.
- Chain-governance visuals:
  - Branch deployment asset set, optional late proof.
- Screenshot composites:
  - Hero, physical/social spread, OG.
- Workflow strips:
  - Menu source -> download kit -> place/share -> customers open current source.
- Optional diagrams:
  - Placement map.
- Real screenshots:
  - OBP, menu, Menu Kit outputs, Presence Monitor, customer app.
- Composites:
  - Most major visuals.
- Image generation:
  - Used for editorial physical staging.
- Staged demo data:
  - Required for Menu Kit and customer-facing screenshots.

### Direction C Mockup Plan - Chain-Grade Control Layer

- Hero mockup:
  - Public output plus owner control rail and propagation status.
- Supporting feature mockups:
  - Master/outlet consistency visual.
  - Reliability proof rail.
  - Temp status/public banner pair.
  - POS/API proof band.
- Synchronization visuals:
  - Source -> public surfaces -> outlets.
- Publishing visuals:
  - Versioned publish/status strip, translated to owner language.
- Chain-governance visuals:
  - Main visual asset.
- Screenshot composites:
  - Hero and multi-location diagram.
- Workflow strips:
  - Approve -> publish -> propagate -> monitor.
- Optional diagrams:
  - Source authority map and integration line.
- Real screenshots:
  - Multi-outlet UI, OBP/menu, temp status, health signals, API/POS settings if used.
- Composites:
  - Hero/control rail and chain visual.
- Image generation:
  - Minimal; mostly UI/composite.
- Staged demo data:
  - Required for chain/outlet examples.

## Part 8 - Image Generation Prompts

These prompts are for visual planning. They should be used with real MenuList screenshots as references where possible. Generated output must not invent product UI; it should frame or composite real product screenshots.

### Direction A Prompts - Official Source Authority

#### A Hero Visual Prompt

Create a premium SaaS marketing hero composite for MenuList, a customer-facing business truth infrastructure product for SMB businesses. Use real product screenshot references as the dominant elements: a desktop browser frame showing an Official Business Page with business name, open status, photos, call/WhatsApp/directions actions, and a menu CTA; a mobile frame showing a live public menu with search, section chips, item cards, prices, and freshness/status; and a small owner source/publish control crop. Composition is centered and product-led, on a clean white and soft-gray background with restrained blue, emerald, and amber accents. Add small surface labels for Official Page, Live Menu, QR assets, Customer App, and Screens. Visual mood: calm, official, credible, infrastructure underneath simplicity. Do not create fake dashboards, fake metrics, purple gradients, abstract AI art, stock restaurant photos, or fantasy UI.

#### A Supporting Feature Visual 1 - Public Drift

Create a clean editorial visual showing the problem of scattered public business information for MenuList. Use four simple tiles: outdated Google listing, old WhatsApp PDF, wrong QR menu, and inconsistent price. Keep it restrained, realistic, and non-alarmist. Use white/soft-gray surfaces, graphite text, small amber warning accents, and no fake brand logos. The visual should feel like a calm problem-framing section, not fear marketing.

#### A Supporting Feature Visual 2 - One Source Workflow

Create a product-led workflow strip for MenuList: current menu input -> owner review/approval -> official public page/live menu -> QR/Menu Kit/customer app/screens -> updates stay aligned. Use real MenuList UI crops where possible, simple connector lines, and compact labels. The composition should be readable on desktop and mobile, with no technical jargon and no architecture overload.

#### A Supporting Feature Visual 3 - Reliability Underneath

Create a restrained proof strip for MenuList showing hidden reliability in plain language: owner approval, correctness check, current public version, change memory, and freshness signal. Use small UI details and status badges rather than code or infrastructure diagrams. Mood is calm, trustworthy, and operational. Avoid uptime percentages, fake claims, and developer visuals.

#### A OG/Social Visual Prompt

Create a 1200x630 Open Graph image for MenuList using the Official Source Authority direction. Center a polished product composite of the Official Business Page and live mobile menu. Add concise headline space reading "The official source for what customers see" if typography is included. Use a white background, soft gray framing, blue CTA accent, emerald current/status accents, and high readability. Product UI should dominate; no stock photos, no fake analytics, no AI-style gradients.

### Direction B Prompts - Deployed Presence System

#### B Hero Visual Prompt

Create an editorial product composite for MenuList showing one official source deployed across real customer touchpoints. Use a real MenuList Official Business Page/live menu screenshot as the central source, surrounded by realistic Menu Kit assets: table tent, counter sticker, takeaway card, Instagram story, WhatsApp status, Google image upload, and a customer app phone. The scene should feel like a clean business counter/product studio, not stock photography. Use neutral white/gray environment, restrained blue brand accents, emerald status accents, and readable product UI. Show that every asset comes from the same source. Do not make the hero look like only a QR code generator, print shop, or campaign tool.

#### B Supporting Feature Visual 1 - Menu Kit Spread

Create a premium but practical Menu Kit asset spread for MenuList. Show a table tent, counter sticker, delivery bag sticker, takeaway card, Instagram story, WhatsApp status, Google Maps image, and placement guide, all using the same demo business name and QR source. Use crisp print/product mockups with realistic proportions and clean lighting. Keep the MenuList public source visible as the origin. Avoid decorative clutter or stock restaurant background.

#### B Supporting Feature Visual 2 - Presence Monitor

Create a clean product visual showing MenuList's deployment checklist concept. Use a cropped product UI style with surfaces such as Google Business, Instagram Bio, WhatsApp Profile, Table QR, Digital Screens, and Feedback QR. Show some surfaces marked complete and one clear next step. Keep wording owner-friendly and realistic. Avoid implying automatic Google sync unless shown as manual placement.

#### B Supporting Feature Visual 3 - Customer App And Public Link

Create a product-led visual showing a customer's phone with a saved MenuList customer app icon and a live menu screen, paired with a WhatsApp/Instagram public link placement. The visual should communicate repeat access to the current menu. Keep the interface believable and derived from real MenuList public UI. No fake chat messages with fabricated testimonials.

#### B OG/Social Visual Prompt

Create a 1200x630 social image for MenuList using the Deployed Presence System direction. Show one official MenuList public source at center with printed and digital outputs around it: table tent, phone menu, WhatsApp status, Instagram story, and customer app. Keep the layout clean and premium, with headline space for "One source. Everywhere customers look." No abstract AI visuals, fake dashboards, or noisy collage.

### Direction C Prompts - Chain-Grade Control Layer

#### C Hero Visual Prompt

Create a structured SaaS product composite for MenuList showing one controlled source keeping public customer-facing surfaces aligned. Use a real Official Business Page/live menu screenshot as the central public output, a small owner source/approval rail, and compact state labels for current, approved, published, customer app, QR assets, and outlet consistency. Use a white/graphite/soft-gray system with restrained blue source accents, emerald stable/current accents, and amber status accents. Mood: infrastructure-grade, calm, serious, but still approachable for SMB owners. Avoid raw API screens, enterprise jargon, dashboard metrics, and dark one-note palettes.

#### C Supporting Feature Visual 1 - Multi-Location Governance

Create a clean master-to-outlets visual for MenuList. Show a master menu source feeding three outlet cards, with one outlet using a controlled local exception. Include a small public page/menu preview for one outlet. Use simple connectors, clear labels, and restrained color. The visual should communicate chain consistency without feeling like enterprise software.

#### C Supporting Feature Visual 2 - Public Truth Status Pair

Create a product visual pairing an owner temporary status control with the customer-facing public banner it creates. Example: "Opening late today" or "Closed today" with an expiry time. The visual should show that time-sensitive business truth reaches customers clearly. Use real UI references, amber status accent, and no exaggerated alert styling.

#### C Supporting Feature Visual 3 - Reliability Proof Rail

Create a horizontal proof rail for MenuList's hidden infrastructure using plain-language labels: owner approval, correctness check, publish state, change memory, public freshness, and cache refresh. Use small product UI details and status indicators, not code. The mood should be operationally trustworthy and quiet.

#### C OG/Social Visual Prompt

Create a 1200x630 social image for MenuList using the Chain-Grade Control Layer direction. Show a central official public source with a structured control rail and small outlet/surface status cards around it. Use headline space for "One controlled source for customer-facing truth." Keep it premium, restrained, and product-led. Avoid fake performance charts, raw developer UI, and over-technical diagrams.

## Part 9 - Final Selection Checkpoint

Choose one of the following before Stage 4 implementation:

- **Direction A - Official Source Authority**
  - Recommended homepage base.
  - Best for first-visit clarity, conversion, and faithful product positioning.

- **Direction B - Deployed Presence System**
  - Strongest visual distinctiveness.
  - Best if the homepage should feel more tangible and demoable through physical/social/customer surfaces.

- **Direction C - Chain-Grade Control Layer**
  - Strongest infrastructure signal.
  - Better suited for future chain/infrastructure pages or late homepage proof than first hero.

- **Hybrid direction**
  - Recommended hybrid:
    - Direction A as the homepage system.
    - Direction B as the deployment/OG/social visual system.
    - Direction C only as a late-page proof band and future expansion direction.
  - Risky hybrid:
    - B + C without A. This may feel visually incoherent because tactile deployment and chain-control density pull in different emotional directions.
  - Incoherent hybrid:
    - A's calm public authority plus heavy dark enterprise dashboards from C. This would weaken SMB trust and violate product truth.

## Stage 3 Cross-Check

- Three distinct directions created:
  - Yes.
- All directions grounded in current MenuList product reality:
  - Yes: OBP, public menu, Menu Kit, Presence Monitor, Customer App, temp status, health signals, multi-outlet, public API/POS.
- Generic SaaS/AI/fantasy dashboard avoided:
  - Yes.
- Existing website psychology preserved:
  - Yes: owner relief, clarity, calm confidence, product output first.
- Current website treated as ceiling:
  - No. Current codebase and newer capabilities drive the visual strategy.
- Pricing/payment/auth/onboarding touched:
  - No.
- Recommended Stage 4 scope:
  - Homepage/static/content/locales/CSS/image assets only unless a later implementation plan proves otherwise.
