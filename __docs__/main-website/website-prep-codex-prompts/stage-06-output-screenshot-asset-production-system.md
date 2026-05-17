# Stage 6 Output - Screenshot + Asset Production System

**Date:** May 17, 2026  
**Status:** Completed  
**Base implementation:** v3.2 Official Source Authority + Conversion Recovery  
**Scope:** Screenshot planning, asset production system, composite strategy, OG/social asset plan, and launch asset priority matrix

## Scope Guardrail

- This stage does **not** redesign the homepage.
- This stage does **not** edit pricing, payment, subscription, Razorpay, auth wrappers, onboarding payment behavior, or `/create-menu` runtime implementation.
- This stage does **not** generate fake customer proof, fake metrics, fake logos, or fake automatic external-platform sync.
- The current codebase remains the source of truth. Old website content remains useful psychology only.
- Real screenshots should come from staged demo states, not from invented dashboards.

## Browser Review

Fresh local browser review against `http://127.0.0.1:3002/?stage6=asset-review` confirmed:

- Page title: `MenuList - The Official Source for What Customers See`
- H1: `The official source for what your customers see.`
- Homepage renders 15 sections, matching `src/components/website/home/HomePage.tsx`.
- Key recovered sections are present:
  - `Most setup work is prepared before you publish.`
  - `One source for the places customers check.`
  - `Customers find what they want faster.`
  - `See what customers do after publishing.`
  - `Not only restaurants.`

## PART 1 - Marketing Visual Inventory

| Page section | Visual purpose | Strategic role | Supporting message | Ideal visual type | Why this is correct |
| --- | --- | --- | --- | --- | --- |
| Hero | Establish official source in 5 seconds | Primary proof | One owner-approved source can feed public customer surfaces | Editorial composite from real OBP + public menu screenshots | The current coded hero is clear, but real UI proof will increase credibility |
| Problem | Show public information drift | Pain proof | Customers see old PDFs, stale links, and inconsistent prices | Typography-led before/after strip with document/link snippets | Avoids fake platform screenshots while making the pain concrete |
| Solution | Explain one source to many surfaces | Category bridge | Public surfaces stay aligned from one controlled source | Lightweight propagation diagram using product labels | Diagram is enough here; raw screenshot would overcomplicate the concept |
| Stats | Reduce owner effort quickly | Conversion proof | One source, many places, clear steps, no technical setup | Typography-led proof cards | Keep as coded UI; no screenshot needed |
| Workflow | Show menu-to-public sequence | Operational proof | Start, review, publish, deploy | Annotated workflow strip | Good candidate for a section composite later |
| Setup Relief | Prove effort removal | Buyer-relief proof | Upload, images, descriptions, language, brand, launch materials are prepared | 2-panel owner setup composite | This is the strongest old-site psychology restored in v3.2 |
| Public Proof Surfaces | Show where customer-facing output goes | Public-presence proof | QR, official page, customer app, screens, PDF, link | Screenshot-led surface matrix | Icon cards are usable, but launch-quality should show real output |
| Customer Browse | Show customer value | End-user proof | Customers search, browse, switch language, and decide | Mobile public-menu screenshot | This should become the strongest supporting screenshot after hero |
| Analytics | Show post-publish owner value | Owner confidence proof | Owners see customer actions after publishing | Cropped owner-dashboard screenshot | Must feel like confirmation, not surveillance or vanity analytics |
| Quiet Reliability | Signal infrastructure underneath | Trust proof | Owner-approved publishing, freshness, change memory, presence visibility | Small product-truth callout strip | Coded proof cards are enough for launch; visual can stay restrained |
| Real-World Deployment | Show MenuList leaves the browser | Deployment proof | QR, packaging, WhatsApp, customer app, screens | Composite of QR/menu/screen/share surfaces | Good V2 asset after hero + public screenshots |
| Business Fit | Show operational fit | ICP proof | Pricing, brand, locations, festival menus, temporary status | Typography-led checklist | No screenshot needed unless multi-location becomes a page focus |
| Industry | Widen beyond restaurants | Category breadth proof | MenuList fits any public list customers need to trust | Typography-led industry grid | Avoid fake industry photos; keep broad and clean |
| FAQ | Reduce objections | Trust support | Safety, setup, updates, branding, business types | No visual required | FAQ should stay readable |
| Final CTA | Close with trust | Conversion close | Make one public source customers can trust | Small hero-derived source badge or no visual | Avoid visual clutter at the close |

## PART 2 - Screenshot Source Map

| Workflow/screen | Strategic value | User outcome communicated | Where used | Ideal framing | Treatment |
| --- | --- | --- | --- | --- | --- |
| Hero coded source composite, `HeroSection` | Current hero IA and asset composition | Owner source -> OBP -> customer menu -> surfaces | Hero and OG | Desktop hero crop | Use as layout reference, then replace visual contents with screenshot-led composite |
| Public menu route, `src/app/client/[[...slug]]/page.tsx` | Real customer menu routing, slug/permanent QR behavior, special-menu resolution | Customers land on the correct current menu | Hero, Customer Browse, OG | Mobile first | Real screenshot, lightly framed |
| Public menu renderer, `src/components/templates/website/clientWebsite/index.tsx` | Language, freshness, customer app, analytics, and public menu state | Customers can browse without staff help | Customer Browse, workflow proof | Mobile and desktop crop | Real screenshot with staged menu data |
| OBP route, `src/app/client/obp/OBPContent.tsx` | Official Business Page data resolution and menu CTA | Business has an official public page | Hero, surfaces, OG | Desktop browser + mobile crop | Real screenshot, browser-framed |
| OBP resolved components, `OBPResolvedSurface`, `BrandOBPContent`, `OBPActions`, `OBPMenuCTA`, `OBPLanguageSwitcher` | Public presence, actions, multi-location brand routing, language | Customers can act from one official page | Public proof, hero | Browser frame | Real screenshot with founder-approved demo business |
| Mobile Share screen, `src/components/mobile/screens/MobileShareScreen.tsx` | Official page link, menu link, QR, feedback, customer app link | Owner can deploy the public source | Real-world deployment | Mobile owner screenshot | Cropped/annotated screenshot |
| Official Page settings, `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx` | Owner-controlled OBP content, actions, photos, Google placement guide | Owner controls public presence without technical setup | Setup relief, public presence proof | Desktop admin crop | Cropped screenshot only after demo data cleanup |
| Mobile menu upload, `src/components/mobile/sheets/MenuUploadSheet.tsx` | Owner starts from existing menu/photo/PDF | Setup starts from the current menu | Setup relief | Mobile sheet crop | Real screenshot or composite with uploaded menu preview |
| Extraction review screen, `ExtractionJobReviewScreen.tsx` | Owner approval before changes apply | Nothing publishes unchecked | Workflow, trust proof | Desktop crop | Annotated crop; do not overemphasize technical diff details |
| Owner dashboard, `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx` | Menu + OBP + Customer App confirmation | Owner sees what customers opened and acted on | Analytics section | Desktop dashboard crop | Cropped proof-grade screenshot |
| Mobile dashboard, `src/components/mobile/screens/MobileDashboardScreen.tsx` | Mobile owner confirmation and OBP metrics parity | Owner can check from phone | Analytics section, mobile launch proof | Mobile screenshot | Real screenshot after demo analytics are staged |
| Digital screen display, `src/app/screen/[token]/ScreenDisplay.tsx` | Public source can leave the browser | Store screen can reflect published menu | Real-world deployment | Wide display crop | V2 composite, not launch blocker |
| Customer App controller, `src/components/customerApp/CustomerAppController.tsx` | Repeat customer install surface | Customers can keep the business on phone | Hero/supporting asset | Mobile crop | Use only if demo PWA state is clean |

## PART 3 - Screenshot Staging Plan

### Demo Business State

- Use one founder-approved demo business across all assets.
- Recommended sample: `The Daily Plate` or another neutral business name already used in staged copy.
- Avoid real customer names, private phone numbers, real addresses, internal IDs, raw Firestore IDs, or personal emails.
- Use INR prices and believable menu/service items.
- Keep item count moderate: 3-5 categories, 12-20 items, 4-6 strong item images.
- Use a public business profile with:
  - clear logo or simple mark
  - cover image
  - business hours
  - WhatsApp/call/directions actions
  - one language switcher state
  - freshness/update signal

### Screenshot-Specific Requirements

| Screenshot | Ideal UI state | Demo data | Hide/clean | Capture type |
| --- | --- | --- | --- | --- |
| Hero OBP crop | Official page with menu CTA and actions visible | Demo business, hours, photos, language | Remove admin/debug overlays and private contacts | Desktop browser crop |
| Hero menu phone | Public menu with search, category chips, two item cards, visible prices | Clean categories and item images | Avoid empty images and long labels | Mobile screenshot |
| Setup upload | Upload sheet with one menu image/PDF staged and ready for review | Menu photo/PDF with realistic items | Hide file system names and private metadata | Mobile crop |
| Extraction review | Review screen with approved changes and one price/item update | Safe extracted items, no real menu source | Avoid noisy warnings and long tables | Desktop crop |
| Public surfaces matrix | OBP, menu, QR, customer app, screen, PDF/export | Same demo business | Do not imply Google/Instagram auto-sync | Composite from real screenshots |
| Customer browse | Customer menu with search and sections | 2-3 visible items, language option, freshness | No placeholder gray blocks | Mobile screenshot |
| Analytics proof | Owner dashboard Today/Overview with menu + OBP cards | Non-sensitive demo metrics | No real revenue or customer PII | Cropped dashboard screenshot |
| Share/deployment | Mobile Share screen with OBP/menu link and QR options | Demo links only | Hide real tenant URLs if not approved | Mobile crop |
| Industry breadth | Industry chips | Current locale-backed industry list | No photos required | Typography-led asset |

## PART 4 - Hero Visual Production System

### Primary Hero Recommendation

Use a screenshot-led editorial composite:

- Left/center: real OBP browser frame.
- Right/front: real mobile public-menu screenshot.
- Small source card: owner-approved source.
- Bottom row: surface pills for QR, official page, customer app, digital screen, PDF, public link.

This preserves the current coded hero structure while replacing artificial UI details with product truth.

### Alternate Hero Systems

1. **Public Menu First**
   - Dominant phone menu screenshot, with OBP and surface pills secondary.
   - Best if founder wants faster customer-understandable selling.

2. **Source-To-Surface Map**
   - Owner source card in center with arrows to real mini screenshots.
   - Best if infrastructure positioning needs to be strongest.

### Hero Must Communicate Instantly

- MenuList is not only a QR/menu builder.
- One owner-approved source creates the official customer-facing version.
- Customers see the menu/page/actions in the places they already check.
- Setup does not require website-building or technical work.

### Hero Must Never Show

- Fake analytics dashboard.
- Generic AI prompts.
- Unapproved automatic Google/Instagram/WhatsApp sync.
- Real customer data.
- Overcrowded enterprise architecture diagrams.
- Stock restaurant photography as the main proof.

## PART 5 - Workflow Visual System

| Workflow | Visual strategy | Screenshot style | Framing | Annotation strategy | Trust reinforcement |
| --- | --- | --- | --- | --- | --- |
| Onboarding | Show upload -> review -> publish | Mobile upload + desktop review | Split crop | 3 short labels only | Owner starts from what they already have |
| Extraction | Show source menu becoming structured | Upload preview + review screen | Before/after | Highlight owner review, not automation | Nothing publishes unchecked |
| Menu publishing | Show current source becoming public menu | Public menu route | Mobile screenshot | Highlight freshness/current status | Customer-facing truth is visible |
| Synchronization | Show same menu on OBP/menu/QR/screen/PDF | Composite | Multi-panel | Label each MenuList-controlled surface | One source powers many outputs |
| Translation | Show language switcher/menu text | Public menu mobile crop | Zoomed detail | One label: language is part of menu | Customers can understand without staff help |
| Image generation/media | Show item cards with clean imagery | Public menu item cards | Cropped detail | No AI-hype labels | Menu looks complete without design work |
| Public page generation | Show OBP with business actions | Browser screenshot | Desktop + mobile | Highlight call, WhatsApp, directions, menu CTA | Business presence has one official link |
| Chain governance | Show master/outlet concept when ready | Multi-location page or owner location screen | Diagram or screenshot | Label inherited vs local | Chains need consistency without heaviness |
| Multi-surface consistency | Show public surfaces matrix | Composite | Editorial | Small source badge in center | Surface consistency is the category story |
| Operational updates | Show status/freshness/dashboard confirmation | Owner dashboard crop | Desktop/mobile | Highlight last update/customer action | The system keeps working after launch |

## PART 6 - Composite & Editorial Visual System

| Composite | Strategic purpose | Source screenshots | Composition style | Background | Tone | Use |
| --- | --- | --- | --- | --- | --- | --- |
| Hero official-source composite | First-screen credibility | OBP + mobile menu + source card | Layered editorial product visual | White/off-white, no decorative blobs | Premium utility | Hero, OG base |
| Public surfaces matrix | Show product breadth | OBP, menu, QR/share, customer app, digital screen/PDF | 2x3 grid with one source marker | Light neutral band | Infrastructure calm | Surfaces section |
| Setup relief proof | Show effort removed | Upload sheet + review screen + prepared cards | Before/after workflow strip | White cards on neutral | Practical SMB relief | Setup section |
| Customer browse proof | End-customer value | Public menu mobile screenshot | Phone frame + zoomed search/category detail | Clean white | Customer-readable | Customer Browse |
| Analytics proof | Post-publish owner confidence | Owner dashboard + mobile dashboard | Cropped dashboard, not full analytics page | Subtle blue-gray band | Confirmation, not data overload | Analytics section |
| Real-world deployment proof | Offline/online distribution | QR sheet, OBP link, screen display | Editorial collage | Light surface, minimal labels | Deployment confidence | V2 or lower homepage |

Do **not** use composites for FAQ, final CTA, or industry chips unless a campaign asset needs a standalone graphic.

## PART 7 - OG & Supporting Asset Pack

| Asset | Purpose | Dimensions | Message | Source material | Treatment |
| --- | --- | --- | --- | --- | --- |
| Open Graph image | Default social/link preview | 1200x630 | The official source for what customers see | Hero composite | Screenshot-led with MenuList logo and one headline |
| X/Twitter image | Social post preview | 1200x675 | One source. Many places. Less repeated work. | Hero or public surfaces matrix | Screenshot-led, less text |
| LinkedIn image | Founder/product launch post | 1200x627 | Customer-facing business truth from one source | OBP + menu + surface row | Editorial product visual |
| Launch announcement | First public launch creative | 1080x1080 | Start with your current menu. Publish one official source. | Workflow strip | Square composite |
| Product update image | Stage 5.5/v3.2 update | 1600x900 | Setup, surfaces, analytics, industry breadth restored | Section collage | Typography + screenshot crop |
| Email header | Newsletter/onboarding | 1200x400 | Make one public source customers can trust | Hero source card + public menu crop | Wide, calm, little text |
| Onboarding banner | Owner setup flow | 1600x500 | Review before publishing | Upload/review screenshot | Product-led, no marketing headline |
| Feature launch: Official Page | Product update | 1200x630 | Your business page, menu, hours, actions | OBP screenshot | Browser frame |
| Feature launch: Customer Browse | Product update | 1200x630 | Customers find what they want faster | Mobile menu screenshot | Phone frame |
| Optional ad creative | Retargeting only | 1080x1350 | Stop sending old menu screenshots | Problem -> MenuList output | Before/after, no fake claims |

## PART 8 - Production-Quality Image Generation Prompts

Use these only after real screenshots are captured. The product UI should be the dominant material; image generation should help composite, frame, and polish, not invent the interface.

### Hero Composite Prompt

Create a premium SaaS editorial product composite for MenuList, a customer-facing business truth infrastructure product for SMB businesses. Use the provided real screenshots as the only product UI: an Official Business Page browser screenshot, a mobile public menu screenshot, and a small owner-approved source card. Arrange the OBP screenshot as the main browser frame, overlap the mobile menu screenshot on the right, and place a restrained source card behind them. Add small surface labels for QR menu, official page, customer app, digital screen, PDF, and public link. Use a calm white/off-white background, subtle shadows, crisp spacing, no decorative blobs, no fake dashboards, no fake analytics, no AI prompt UI, no stock photos. Tone: trustworthy, premium, operationally calm, product-led. The product screenshots must remain readable and believable.

### Feature Visual 1 - Setup Relief

Create a clean product-led workflow visual showing an SMB owner starting from an existing menu and reviewing the prepared source before publishing. Use the provided real screenshots only: mobile upload sheet, extraction review screen, and prepared menu preview. Compose as a 3-step horizontal strip with tiny labels: upload, review, publish. White background, subtle blue accent, light borders, no extra fake UI, no AI-themed graphics, no exaggerated automation. The emotional tone should be relief and control.

### Feature Visual 2 - Public Surfaces

Create a calm multi-surface publishing composite for MenuList. Use real screenshots only: Official Business Page, mobile public menu, QR/share screen, customer app prompt, digital screen preview, and PDF/export preview if available. Place a small central label reading owner-approved source, with thin lines to each surface. Do not imply automatic Google, Instagram, or WhatsApp syncing. The visual should communicate MenuList-controlled public surfaces and manual placement confidence. Use restrained shadows, clean spacing, and high readability.

### Feature Visual 3 - Customer Browse

Create a mobile-first product visual from a real public menu screenshot. Emphasize search, category chips, item cards, visible prices, language choice, and freshness status. Use a simple phone frame and one zoomed callout of the search/category area. Keep the image clean, bright, and readable. No stock restaurant imagery, no fake interface elements, no dashboard charts.

### Feature Visual 4 - Analytics Proof

Create a restrained owner-dashboard proof visual from real MenuList dashboard screenshots. Show a cropped desktop owner dashboard with menu and Official Business Page confirmation cards, plus a small mobile dashboard crop. The visual should feel like owner confirmation, not surveillance analytics. Avoid large chart-heavy dashboards, fake metrics, revenue claims, or private customer data. Use subtle blue-gray background and clean card framing.

### Feature Visual 5 - Industry Breadth

Create a typography-led campaign visual for MenuList showing that it is not only for restaurants. Use no stock photos. Build a clean grid of business chips: restaurant, cafe, bakery, cloud kitchen, salon, spa, retail shop, gym, hotel, service business. Center the message around public menu, price list, catalogue, or service list that customers need to trust. Keep it calm and premium.

### Synchronization Visual

Create a simple infrastructure-style propagation visual for MenuList. Use one owner-approved source card on the left and real product screenshots on the right: public menu, Official Business Page, QR/share, digital screen, and PDF. Use thin lines and small status labels like current, published, visible. Do not use technical architecture boxes, server diagrams, fake cloud icons, or generic AI visuals.

### Public-Presence Visual

Create an Official Business Page-focused marketing visual using a real OBP screenshot as the main frame. Show menu CTA, hours, photos, directions/call/WhatsApp actions, and language control if visible. Add one small caption area for one official link. Avoid claiming external-platform sync. Tone should be authoritative public presence, not restaurant website builder.

### Chain-Governance Visual

Create a clean multi-location governance visual using real owner screens if available. Show master source, outlet cards, and local override labels. The visual should communicate consistency plus local flexibility. Avoid enterprise heaviness, complex org charts, fake data, and excessive arrows.

### OG/Social Visual

Create a social share image for MenuList using the hero composite screenshots. Text should be minimal: MenuList and The official source for what customers see. Use 1200x630 composition, strong readability at small preview size, logo top-left or bottom-left, screenshot composite on the right, calm white/off-white background, subtle blue accent, no decorative gradients, no fake UI.

### Launch Visual

Create a launch announcement square visual for MenuList. Use a real workflow strip: current menu upload, owner review, official public page/menu. Message: Start with your current menu. Publish one official source. Keep the UI screenshots readable, no fake dashboards, no stock photos, no hype language.

## PART 9 - Asset Production Workflow

1. **Product UI cleanup**
   - Confirm current homepage and public menu render cleanly in a cache-clean browser.
   - Remove debug overlays, test badges, private emails, internal IDs, raw tenant/store IDs, and stale locale text.
   - Confirm no old `en-GB` strings reappear.

2. **Demo-data preparation**
   - Create or select one founder-approved demo store.
   - Prepare realistic menu/service data, INR prices, item photos, hours, OBP photos, actions, and language settings.
   - Seed safe analytics demo values if analytics screenshots are needed.

3. **Screenshot staging**
   - Stage each surface in the order: OBP, public menu, upload/review, share/QR, dashboard, digital screen/PDF.
   - Use the same demo business and same active menu across all captures.

4. **Screenshot capture order**
   - P0: mobile public menu.
   - P0: desktop/mobile OBP.
   - P0: owner source/setup state.
   - P1: dashboard analytics proof.
   - P1: share/QR/deployment.
   - P2: digital screen/PDF/customer app supporting visuals.

5. **Screenshot cleanup**
   - Crop to the smallest region that proves the point.
   - Keep text readable at 1440 desktop and 390 mobile widths.
   - Avoid full dashboards unless the whole dashboard is the point.

6. **Composite generation order**
   - Hero composite first.
   - OG/social derivative second.
   - Customer browse and public surfaces third.
   - Setup relief and analytics fourth.
   - Campaign/ad assets last.

7. **Annotation production**
   - Use no more than 3 labels per image.
   - Labels must explain owner/customer outcomes, not technical internals.
   - Approved annotation language:
     - Owner-approved source
     - Public menu
     - Official page
     - QR and link assets
     - Customer actions
     - Menu and page activity

8. **Export workflow**
   - Save source captures under a private working folder, not public web assets, until approved.
   - Save launch-ready public assets under `public/images/website/`.
   - Use lowercase kebab-case filenames.
   - Prefer WebP for section images and PNG for OG/social when platform compatibility matters.

9. **Responsive verification**
   - Check hero composite on desktop, tablet, and mobile.
   - Check text is readable and does not overlap.
   - Check sticky CTA does not cover visual proof.
   - Check mobile screenshots do not become tiny inside nested frames.

10. **Homepage insertion**
   - Replace coded visual details only when the screenshot composite is stronger.
   - Keep current coded visuals as fallback.
   - Do not block launch on lower-page V2 campaign assets.

11. **QA checklist**
   - Product truth verified.
   - No fake proof.
   - No automatic external-sync implication.
   - No private data.
   - Same demo business across images.
   - Locale copy aligned.
   - File sizes compressed.
   - OG tags verified.

## PART 10 - Launch Asset Priority Matrix

### Must-Have For Launch

| Asset | Strategic value | Complexity | Launch importance | Dependencies | Founder approval |
| --- | --- | ---: | ---: | --- | --- |
| Hero official-source composite | Makes homepage believable fast | Medium | P0 | OBP + menu screenshots | Yes |
| OG image | Prevents stale/generic social preview | Medium | P0 | Hero composite | Yes |
| Mobile public-menu screenshot | Strongest customer proof | Low-medium | P0 | Demo menu data | Yes |
| OBP screenshot | Strongest public-presence proof | Low-medium | P0 | Demo OBP data/photos/actions | Yes |
| Setup relief proof strip | Restores old-site effort-removal conversion | Medium | P0 | Upload/review screenshots | Yes |

### High-Value V2 Assets

| Asset | Strategic value | Complexity | Launch importance | Dependencies | Founder approval |
| --- | --- | ---: | ---: | --- | --- |
| Analytics proof crop | Shows value after publishing | Medium | P1 | Demo analytics data | Yes |
| Public surfaces matrix | Makes surface breadth tangible | Medium-high | P1 | 4-6 screenshots | Yes |
| Share/QR deployment screenshot | Shows real-world deployment | Low-medium | P1 | Demo links/QR | Optional |
| Customer app/PWA visual | Shows repeat-customer retention surface | Medium | P1 | Clean PWA state | Optional |
| Digital screen proof | Shows beyond-phone deployment | Medium | P2 | Screen token/staged display | Optional |

### Campaign Assets

| Asset | Strategic value | Complexity | Launch importance | Dependencies | Founder approval |
| --- | --- | ---: | ---: | --- | --- |
| LinkedIn founder launch visual | Awareness and category framing | Medium | P1 | Hero composite | Yes |
| X/Twitter image | Social preview | Low | P2 | Hero composite | Optional |
| Square launch visual | Instagram/WhatsApp launch | Medium | P2 | Workflow screenshots | Yes |
| Before/after ad creative | Paid/retargeting test | Medium | P2 | Demo menu source + public result | Yes |
| Email header | Onboarding/newsletter | Low | P2 | Hero source crop | Optional |

### Optional Future Assets

- Chain governance composite.
- Industry-specific page hero variants.
- Integration/Presence Monitor explainer visual.
- Product Hunt gallery images.
- Screenshot refresh pack for supporting `/product`, `/multi-location`, and `/trust-security` pages.

## Biggest Visual Quality Risks

- Using screenshots with empty data, placeholder images, or long unreadable labels.
- Showing a full owner dashboard when a crop would prove the point faster.
- Letting AI image generation invent UI that the product does not have.
- Reintroducing old automatic external-sync claims through visuals.
- Making the product look like generic restaurant SaaS instead of public-source infrastructure.

## Biggest Product-Truth Risks

- Showing Google/Instagram/WhatsApp as automatically synced surfaces.
- Showing dashboard metrics that are not backed by staged demo data or runtime analytics.
- Using real business/customer data without approval.
- Using a menu screenshot from an old public renderer instead of the current route.
- Mixing demo businesses across assets, which weakens trust.

## Final Stage 6 Recommendation

Stage 6 should move forward with **P0 screenshot capture and hero/OG composite production** before Stage 7 launch polish. The current coded homepage is acceptable as a fallback, but the page will sell materially faster once the hero, customer menu, OBP, and setup-relief sections contain real product-derived visuals.
