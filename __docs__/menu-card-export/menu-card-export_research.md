# Menu Card Export — Market And Print Research

**Status:** Research complete
**Reviewed:** June 2, 2026
**Boundary Reviewed:** July 10, 2026
**Visual Quality Recheck:** August 30, 2026
**Decision-symbol Standards Recheck:** September 3, 2026
**Purpose:** Convert web research into product decisions for the routed Menu Card Export feature.

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated Menu Card Export evidence only. Market research and product-direction notes do not approve implementation or release. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, Digital Menu Output Constitution checks for print/menu outputs, `npm run verify:menu-card-export`, authenticated desktop/mobile browser QA, visual PDF and print-shop artifact review, provider smoke for the AI advisor where enabled, applicable target deploy evidence, and production-host smoke.

---

## Executive Findings

The best version of this feature is not a larger `Download PDF` button. It is a routed print workflow that turns the current menu source into files an owner can actually use: home-printer PDF, WhatsApp PDF, print-shop packet, QR handoff, freshness history, and preflight checks.

The market already has strong template editors. MenuList should not compete by becoming another Canva. The stronger position is:

> Current menu truth to print-ready files, with fewer owner decisions and fewer stale print mistakes.

Fresh June 2026 recheck: the feature is on the right track if it stays an operational print workflow. SMB owners still need physical menus, staff/WhatsApp PDFs, print-shop handoff, and QR links back to the current menu. The risk is not that the feature is too small; the risk is drifting into a design editor, public PDF hosting, print ordering, or AI-generated final artwork before the core export workflow is excellent.

June 2 no-designer recheck: the market repeatedly sells the same promise: templates, brand reuse, QR, print-ready PDF, and no design skills. MenuList should go one step further because it already has the business type, brand color, logo, menu/service/catalog data, descriptions, prices, and live URL. The owner should start from an auto-picked print design, not a blank style decision.

## September 2026 Decision-symbol Standards Recheck

The symbols must be familiar at a glance, but MenuList must not turn an owner-entered fact into a false certification claim. The implementation therefore uses conventional category pictograms and explicit short labels where certification marks are controlled:

- Vegetarian and non-vegetarian keep the already accepted square-and-dot marks.
- Vegan uses the installed React Icons Lucide `LuVegan` pictogram. The [FSSAI vegan-food page](https://www.fssai.gov.in/standards/vegan-food) and [official Vegan Foods Regulations](https://fssai.gov.in/upload/notifications/2022/06/62ac3f9dba33cGazette_Notification_Vegan_Food_17_06_2022.pdf) establish an endorsement process for the official vegan logo, so MenuList uses this generic pictogram rather than reproducing the official mark from an unverified owner fact.
- Gluten-free uses the installed React Icons Lucide `LuWheat` pictogram supplied for this menu treatment. [AOECS](https://www.aoecs.org/working-with-food/) identifies the Crossed Grain Trademark as globally registered and available through licensing, so MenuList does not imitate that certification artwork; the footer legend explicitly supplies the meaning of this generic wheat pictogram.
- Spice intensity uses one to four red installed React Icons Game Icons `GiChiliPepper` silhouettes, giving the mark the conventional heat colour plus the long body and stem customers recognize as a chilli rather than a flame or compact pepper badge.
- Men, women, and unisex use conventional [Mars](https://fontawesome.com/icons/classic/thin/mars), [Venus](https://fontawesome.com/icons/venus), and [combined Venus-Mars](https://fontawesome.com/icons/venus-mars) symbols. Kids, adults, and seniors use [child](https://fontawesome.com/icons/classic/solid/child-reaching), [person](https://fontawesome.com/icons/person), and [person-with-cane](https://fontawesome.com/icons/classic/solid/person-cane) pictograms.
- The public React surface uses the installed [react-icons](https://github.com/react-icons/react-icons/blob/master/README.md) package's Lucide, Game Icons, and Font Awesome 6 components. The PDF renderer draws equivalent print-safe vector geometry from the same SVG paths so exported files remain deterministic and require no network or raster icon fetch.

---

## Sources Reviewed

| Source | Relevant finding | MenuList decision |
| --- | --- | --- |
| [MustHaveMenus pricing/features](https://www.musthavemenus.com/menu/pricing.do) | Combines print, digital signage, web, template library, PDF/full-bleed downloads, brand assets, POS sync, QR codes, printing, and multi-location controls. | Treat print export as an operating surface, not a file utility. Support brand consistency, export history, QR, print-shop packet, and multi-location batch mode. |
| [Canva restaurant menu maker](https://www.canva.com/create/restaurant-menus/) | Emphasizes templates, mobile access, keeping menus updated, and print-ready PDF download. | Do not copy freeform editing; copy the simple owner path to updated printable output. |
| [Adobe Express menu maker](https://www.adobe.com/express/create/menu) | Emphasizes templates, brand colors/logos/fonts, images, download/share/print, and standard menu sizes. | Provide controlled brand tokens and use-case sizes, without arbitrary design editing. |
| [PosterMyWall menu maker](https://www.postermywall.com/index.php/l/menu-design) | Offers menu templates, saved menu item lists, brand kits, QR sharing, email/social/signage distribution. | Add saved export history and distribution presets; keep menu data sourced from MenuList instead of a duplicate item list. |
| [PosterMyWall menu item/POS article](https://www.postermywall.com/blog/2022/06/15/how-to-create-a-menu-with-postermywall/) | Shows the value of reusable item lists, sizes/add-ons, icons, and Square import. | Preserve variants/add-ons and dietary/icon metadata in the print source. Do not retype menu content inside export UI. |
| [PosterMyWall QR help](https://support.postermywall.com/hc/en-us/articles/40850702169357-How-do-I-share-my-design-via-QR-code) | QR can be downloaded/printed and used across print and digital surfaces. | QR should be a first-class export block with scan checks, not a decorative footer. |
| [iMenuPro QR menus](https://imenupro.com/qr-code-menus) | Strong emphasis on live updates, one QR for multiple menus, privacy, no trackers, and no pinch/zoom. | Printed PDF should link back to a mobile menu. Do not make QR open a print-style PDF on phones. |
| [iMenuPro printing help](https://help.imenupro.com/getting-started/menu-printing/) | High-resolution, lightweight PDFs can be printed in-house, uploaded, emailed, or sent to a local print shop. | Support distinct home-print, WhatsApp, and print-shop outputs. |
| [iMenuPro FAQ/pricing](https://imenupro.com/faq) | Differentiates content-aware auto-formatting from template/text-box tools. | Build a layout engine and template registry around menu data, not draggable boxes. |
| [VistaPrint crop marks and bleed](https://www.vistaprint.com/hub/crop-marks-explained) | Print quality depends on trim, bleed, safety lines, and crop marks; 0.125 inch / 3 mm is a common safety/bleed reference. | Print-shop preset must support bleed, crop marks, and safe-area validation. |
| [Adobe Acrobat printer marks](https://helpx.adobe.com/uk/acrobat/using/printer-marks-hairlines-acrobat-pro.html) | PDFs can carry trim, bleed, art, and media boxes used for print production. | Renderer interface should model print boxes explicitly, not only visual page size. |
| [DENSO WAVE QR module size](https://www.qrcode.com/en/howto/cell.html) | Larger modules are more stable; DENSO recommends at least 4 printer dots per module for stable operation. | Export preflight must verify module size and avoid overly dense QR codes. |
| [DENSO WAVE QR quiet zone](https://www.qrcode.com/en/howto/code.html/index.html) | QR codes require a four-module clear margin on all sides. | Template validation must reserve quiet zone around QR. |
| [DENSO WAVE QR error correction](https://www.qrcode.com/en/about/error_correction.html) | Higher error correction increases resilience but also increases symbol size; level M is common, Q/H fit dirtier environments. | Use short URLs and choose error correction by preset; default print QR should favor resilience without becoming too dense. |
| [Adobe PDF accessibility](https://helpx.adobe.com/uk/acrobat/using/create-verify-pdf-accessibility.html) | Accessibility checks include tagged PDF, reading order, and content tagging. | Do not ship screenshot-only PDFs. Preserve selectable text and plan tagged PDF checks before claiming accessibility compliance. |
| [PDF Association accessibility](https://pdfa.org/accessibility/) | Accessible PDF depends on tagged PDF standards such as PDF/UA. | Treat PDF/UA as a verification target, not a marketing claim until the renderer can prove it. |
| [National Restaurant Association inflation research](https://restaurant.org/research-and-media/research/inflation/) | Food and labor costs have each risen 35% in the last five years, while average menu prices rose 31% from February 2020 to April 2025. | Price/menu changes are not rare edge cases; stale print is a real operating problem. |
| [National Restaurant Association menu price tracker](https://restaurant.org/research-and-media/research/restaurant-economic-insights/economic-indicators/menu-prices/) | Menu prices were still up year over year in April 2026, even though inflation had moderated from earlier peaks. | Printed files need freshness checks and easy regeneration, not one-time PDF creation. |
| [Toast 2025 Voice of the Restaurant Industry Survey](https://www.businesswire.com/news/home/20251009135658/en/The-Toast-2025-Voice-of-the-Restaurant-Industry-Survey) | Surveyed 712 decision-makers at restaurants with 16 or fewer locations; profitability, inflation, marketing, hiring, and staff efficiency are core concerns. | The feature should save owner/staff time and protect margins through fewer reprints and fewer stale-menu mistakes. |
| [Toast QR menu sentiment survey](https://pos.toasttab.com/blog/on-the-line/qr-code-menu-insights) | 81% of respondents preferred physical menus; QR menu complaints centered on small phone text, phone use, and unreliable technology. | Keep physical menu export first-class. QR should bridge to a phone-native live menu, not replace printed menus or open a print-layout PDF. |
| [Square Future of Restaurants 2025](https://squareup.com/us/en/the-bottom-line/series/foc/future-of-restaurants) | Square frames restaurant technology as a way to handle operational heavy lifting and changing guest expectations. | Use automation to remove print preparation work; do not add owner-facing design complexity. |
| [iMenuPro menu maker](https://imenupro.com/) | Positions no-manual-alignment auto-formatting, design switching without losing text, print sizes, QR, logo/color branding, and no-design-skills output as the core value. | Add deterministic auto print design so owners start from a sensible layout without using AI or hiring a designer. |
| [OMenu](https://www.omenu.io/) | Combines templates, brand customization, QR, responsive digital menus, and professional print-ready PDFs for non-technical users. | Keep the QR bridge and print-ready output together; make brand/business profile automatic. |
| [Restaurant Menu Studio](https://www.restaurantmenustudio.com/) | Combines professional templates, print-ready PDFs, QR menus, AI suggestions, and brand-kit lock. | Treat Pro/Multi-location AI as a refinement layer over deterministic safe settings, not as the final renderer. |
| [IAMenu PDF generator](https://www.iamenu.ai/en/features/pdf-generator) | Sells the outcome as professional menus without a designer and emphasizes PDF/QR/logo/template controls. | Keep owner controls constrained and move design choice into automatic settings wherever possible. |
| [MustHaveMenus easy menu design](https://www.musthavemenus.com/feature/easy-menu-design-for-restaurants.html) | Emphasizes many templates, print/download formats, editable QR, brand fonts/colors/logos, and printing. | Do not compete on template count. Compete on MenuList's current source of truth, auto-picked layout, QR freshness, and print packet. |
| [Visme menu maker](https://www.visme.co/menu-maker/) | Highlights brand kit, templates, print-ready PDF with bleed marks, high-resolution downloads, and QR handoff. | Keep brand reuse and print-shop readiness first-class; avoid manual brand-kit setup inside this feature. |
| [Toast restaurant menu templates](https://pos.toasttab.com/blog/on-the-line/restaurant-menu-templates) | Recommends clear sections, concise descriptions, consistent hierarchy, readable type/contrast, intentional whitespace, selective highlights, and layouts chosen for actual menu size rather than shrinking text. | Keep category and price structure fixed, choose columns from content volume, and create visual character through typography, paper tone, spacing, and brand detail rather than more decoration. |
| [Toast menu design guide](https://pos.toasttab.com/blog/on-the-line/how-to-make-a-restaurant-menu) | Frames category grouping, manageable item counts, whitespace, brand fit, and one/two-page usability as core print-menu quality. | Prevent orphan pages and anonymous category continuations; preserve natural category/order flow and make the default output feel composed without owner layout work. |
| [MustHaveMenus printing guidance](https://www.musthavemenus.com/guide/menu-basics/menu-printing.html) | Prioritizes easy reading, logical item organization, restrained imagery, and avoiding overloaded sections. | Keep the renderer text-first, cap visual ornament, and treat section pacing/readability as hard layout behavior rather than optional advice. |
| [Four Seasons New York Downtown Spa Menu](https://www.fourseasons.com/content/dam/fourseasons/images/web/NYD/PDFs/NYD-Spa-Menu.pdf) | Uses treatment name, narrative benefit, duration, price, category navigation, etiquette, and a dedicated contact page rather than compressing everything into a rate table. | Preserve service descriptions and duration/price hierarchy; keep contact details on the dedicated closing page for full themed menus. |
| [The Imperial New Delhi Salon Menu](https://www.theimperialindia.com/pdf/the-imperial-salon-menu.pdf) | Separates ladies' beauty, hair treatments, men's grooming, facial, massage, and junior services with INR price and duration columns. | Salon fixtures must handle many service categories, price variants, durations, and gender/service groupings without losing a consistent price axis. |
| [Hyatt Regency Beauty Salon Menu](https://www.hyatt.com/content/dam/hotel/propertysites/assets/regency/sofrs/documents/en_us/spa/Beauty_Salon_Menu.pdf) | Long-form hair/scalp treatment explanations coexist with concise price and duration metadata across multiple pages. | The service renderer must retain readable descriptions and avoid decorative artwork behind dense treatment copy. |
| [Six Senses Elounda Spa](https://www.sixsenses.com/en/spas/europe/greece/elounda/) | Frames treatments as personalized wellness journeys rather than a generic price list. | Spa visual direction should feel calm and restorative while the underlying service/price structure remains scannable. |
| [24 Society Salon & Wellness rate card](https://24societysalonandwellness.com/rates) | Uses transparent INR pricing, stylist levels, onwards pricing, and clear category anchors. | Keep aligned prices and support variants/attributes without forcing one price format or hiding qualification notes. |
| [Four Seasons Ocean Club salon services](https://www.fourseasons.com/oceanclub/spa/salon-services/) | Combines hair, colour, styling, makeup, waxing, and treatment categories with base-rate and length-dependent pricing notes. | Salon print output must support broad service mixes and qualification copy while keeping the action and prices easy to scan. |

## August 2026 Salon And Spa Theme Study

The recurring useful pattern is not a particular hotel logo, proprietary typeface, or illustration. It is a disciplined information hierarchy: a composed cover, clear service categories, treatment or service name, optional benefit description, duration and price aligned consistently, restrained material texture, and a separate etiquette/contact close when required.

MenuList therefore adds three original theme families:

- **Rosewater Editorial** for salons and makeup studios: warm porcelain, dusty rose, plum, sculptural curves, and restrained brass with a large quiet copy field.
- **Mineral Sanctuary** for spas and spa resorts: limestone paper, mineral sage, water contours, and calm whitespace that supports longer treatment descriptions.
- **Noir Studio** for premium unisex salons and grooming studios: smoked charcoal, black-plum depth, architectural copper lines, and high-contrast pearl copy.

The implementation does not copy restaurant or hotel branding, logos, wording, proprietary fonts, or exact artwork. Each family uses a MenuList-owned full-page master, cover/content/closing composition rules, preserved-aspect cropping, and a protected content panel where edge artwork would otherwise approach names, descriptions, durations, or prices.

Business-type selection is intentionally exact. `Salon`, `Makeup Studio`, `Spa`, and `Spa Resort` resolve through the shared business-type registry; strings that merely contain “salon” do not inherit beauty recommendations. Gallery Ledger, Vital Current, and Workshop Atlas add category-led coverage for retail/professional/creative, health/wellness, and practical service/specialty contexts, with selected exact types overriding their broad category. The resulting recommended themes are ordered first, but all 17 governed themes remain renderer-supported and every non-Craft theme remains owner-eligible. Resolution remains `menu theme -> business theme -> exact business-type/category recommendation -> Botanical Heritage fallback`, and the one resolved parent theme is passed to every asset and Complete Menu Kit file.

## August 2026 Visual Output Recheck

Representative Classic, Premium, and Compact A4 PDFs were generated from the same realistic 24-item menu and inspected page by page. The former renderer could create an anonymous second page containing one dessert item, force a normal Compact menu into three cramped columns, and repeat decorative plaques/boxes that made the output feel templated.

Decisions from the recheck:

- Classic remains two-column but uses editorial identity, left-anchored section markers, measured leaders, and compact inline dietary markers.
- Premium stays single-column and accepts deliberate continuation pages; every added page repeats business/menu identity.
- Compact uses two A4 columns below 40 items and three only from 40 items upward. WhatsApp remains single-column.
- Short categories stay together where they fit. Larger categories start only with room for the heading and at least two items; any split repeats a `(continued)` heading.
- The QR handoff becomes a composed information card with the current-menu action, short URL, and compact V/VG/GF legend.
- Visible menus show freshness and page count, not an internal generation timestamp. Technical generation evidence remains in the filename, PDF metadata, and print-shop instructions.
- The deterministic fixture is `scripts/verification/render-menu-card-visual-fixtures.ts`; generated review artifacts live under `output/menu-card-visual-audit/` and are not deployment evidence.

---

## June 2026 Fresh Market Recheck

### What SMB Owners Actually Do

| Observed workflow | What it means for Menu Card Export |
| --- | --- |
| Owners adjust prices, portions, items, and suppliers as costs move. | Export freshness is not optional. Owners need to know whether a file still matches the saved menu. |
| Many restaurants still hand customers physical menus, especially full-service and older-guest contexts. | PDF/print output is not a legacy afterthought. It must be clean, readable, and fast to recreate. |
| QR menus are useful, but guests dislike being forced into tiny phone text or unreliable scans. | QR should open the live mobile menu. The printed PDF itself should not become the QR destination. |
| Owners use Canva/Adobe/PosterMyWall when they need design freedom. | MenuList should not compete as a design editor. It should win on source-of-truth accuracy and low owner effort. |
| No-designer tools win by starting from templates and auto-formatting text. | MenuList should start from deterministic auto design based on business type and content shape, not a blank style decision. |
| Owners email/WhatsApp PDFs to staff, customers, printers, and local partners. | WhatsApp PDF and print-shop packet are real use cases, not feature bloat. |
| Local print shops need trim/bleed/safe-margin clarity and one clean file package. | The packet should include print instructions, QR checklist, file/source summary, and scan-before-run instruction. |
| Multi-location operators want consistency and fewer repeated updates. | Batch remains valuable, but should stay flag-gated until access checks, caps, and costs are proven. |

### Need Ranking

| Priority | Need | Verdict |
| --- | --- | --- |
| P0 | Current-menu PDF from canonical MenuList data | Keep. This is the core. |
| P0 | Freshness/stale detection | Keep. Market pressure makes stale print likely. |
| P0 | Readable physical menu output | Keep. Physical menus remain important. |
| P0 | QR bridge to live phone menu | Keep. It solves stale print without making the PDF the digital menu. |
| P0 | Home print + WhatsApp PDF | Keep. Matches owner behavior and phone workflows. |
| P0 | Auto-picked style/density/toggles | Add. This directly removes the designer decision while keeping output deterministic and free. |
| P1 | Print-shop packet with instructions and QR checklist | Keep, flag-gated until print QA stays clean. |
| P1 | Metadata/filename/source summary | Keep. Useful for support and printers; no Firebase cost. |
| P1 | Pro/Multi-location layout suggestion | Keep only as bounded settings advice. It should not generate final artwork. |
| P2 | Staff reference / daily specials one-pager | Worth considering as controlled presets if they reuse the same print source. |
| P2 | Multi-location batch | Useful for larger accounts, but keep behind caps, permission checks, and cost proof. |
| Reject | Canva-style freeform editing | Feature slop. It duplicates stronger products and increases owner burden. |
| Reject | Public hosted PDF library by default | Cost and stale-public-truth risk. Keep browser-local unless a separate storage mode is approved. |
| Reject | Automatic print ordering/email-to-printer | Operational liability and support load before core export quality is proven. |
| Reject | QR that opens a print-layout PDF on phones | Bad customer experience; phone menu should be mobile-native. |

### Are We On The Right Track?

Yes, with a strict scope boundary.

Current track is right because it already focuses on:

- dedicated route instead of one hidden button
- current MenuList menu truth instead of duplicate item entry
- physical PDF plus live QR bridge
- home/WhatsApp/print-shop jobs instead of technical PDF jargon
- deterministic auto design before paid AI or manual style choice
- preflight and freshness instead of "download and hope"
- browser-local artifacts to protect Firebase cost
- Pro/Multi-location AI as bounded layout advice, not final output generation

### What Would Be Feature Slop

Do not add:

- arbitrary templates just to increase count
- drag/drop page editing
- font uploads and manual style controls
- custom backgrounds
- AI-generated final menu designs
- public PDF SEO pages
- printer marketplace/order flow
- export approval workflows for small single-location owners
- report/deck-style ToC, executive summary, confidentiality labels, or audit appendices

These make the owner think more, move the feature away from MenuList truth, or add cost/support paths before the core workflow needs them.

### What We Might Be Missing

The only meaningful gaps to evaluate after production smoke are controlled presets, not new systems:

1. **Daily specials / price-change one-pager** — for owners who print a small sheet often.
2. **Staff reference PDF** — useful for counter/WhatsApp staff groups, with no customer-facing design promise.
3. **Table tent / QR insert** — smaller print artifact that mostly points customers to the live menu.
4. **Photo policy** — photos help menus, but print photo quality can fail. Keep photo presets blocked until image resolution and file size preflight are reliable.

### June 2 Decision: Auto Print Design

Add a deterministic auto-design layer before the owner reaches the style controls.

Inputs:

- business category and offering kind
- item count and category count
- description coverage
- variant/add-on presence
- selected job preset

Outputs:

- approved style: Classic, Compact, or Premium
- density: Comfortable, Balanced, or Compact
- description, QR, and contact defaults

Rules:

- Food defaults to menu-style output, compact for long menus, premium for short descriptive menus.
- Service, professional, and wellness businesses default to calmer service-list output.
- Retail/product businesses default to catalog/price-list output.
- WhatsApp keeps QR on and prefers phone-readable or compact output by item count.
- This layer must run client-side from already-loaded source data and must not call an AI provider.
- Pro/Multi-location AI advice may refine this baseline, but the final renderer remains deterministic.

All four should reuse the same source builder, preflight, renderer, and cost model. None should create a new editor or new menu database.

---

## Competitive Lessons

### August 2026 Salon Menu Reference Review

The supplied salon PDFs were treated as visual references only; no instruction or claim inside them was adopted as product truth.

- `Styluxe Mens Menu Aug 2026.pdf` uses a dedicated brand cover, two focused service/price pages, and a separate review/QR back page. The useful lesson is document rhythm and clear identity, not its decorative botanical treatment or review solicitation.
- `Mens Rate Card.pdf` uses a contact-led identity cover, service pages, and a restrained branded closing page. The useful lesson is that phone/address grounding belongs in a deliberate identity surface instead of competing with every service row.
- `NEW ARRA SALON MENU.pdf` uses a logo-led opening page followed by visually consistent service pages. The useful lesson is cover-to-content separation; its low-contrast gold-on-gradient text should not be copied.

Decision: MenuList customer-facing print jobs use a dedicated, truth-safe typographic cover by default. The renderer uses the existing business logo/name, menu label, live-menu QR/public link, and available contact facts. It does not invent slogans, ratings, images, or claims, and it keeps WhatsApp/utility presets content-first to avoid unnecessary page cost and sharing friction.

#### August 2026 Styluxe Background-System Review

The four-page `Styluxe Mens Menu Aug 2026.pdf` was re-rendered page by page and treated only as visual reference evidence. Its strongest reusable pattern is not a single background image: it is a coordinated page system with warm paper, sparse botanical washes, fine contour artwork, and alternating corner placement that protects the central service-and-price column.

MenuList decision:

- use original MenuList-owned botanical artwork rather than copying Styluxe assets;
- rotate among three deterministic content-page compositions so a long menu feels handcrafted without owner layout work;
- reserve the system for Premium and service/wellness print output, while staff-reference output remains plain;
- keep a wider 24 mm content margin wherever the artwork is active;
- keep every ornament outside the menu name/description/price reading column and above the footer;
- treat missing/undecodable artwork as a non-blocking fallback to the existing clean paper-and-border layout.

This is controlled decoration, not a freeform background uploader or a new editor surface.

### What To Copy

- Dedicated print workspace, not hidden utility action.
- A small set of high-quality style families.
- Print-ready outputs with paper sizes, safe margins, bleed/crop marks where needed.
- QR bridge from print to live menu.
- Reusable menu data so owners do not re-enter items.
- Export history and recoverable downloads.
- Multi-location support for operators with more than one location.
- Print-shop handoff bundle with instructions.

### What To Avoid

- Freeform template editor.
- Manual text boxes and drag/drop page placement.
- Separate menu item database inside the export tool.
- QR that opens a non-mobile print PDF.
- Screenshot-only PDFs with unselectable text.
- Public claims such as PDF/UA or professional print compliance before automated verification exists.
- Heavy server renderer dependency before runtime, font, image, and deployment constraints are proven.

---

## World-Class Feature Shape

| Layer | Capability | Owner value |
| --- | --- | --- |
| Route | `/use-menulist/menu-card-export` | Enough room for preview, preflight, presets, and history. |
| Presets | Home print, WhatsApp PDF, print-shop packet, table menu, takeaway insert, staff reference, multi-location batch | Owners choose the job, not technical settings. |
| Styles | Classic, Compact, Premium at launch; Takeaway, Folded, Photo, Drinks held until QA passes | Better output without template overload. |
| Brand tokens | Logo, brand color, typography pack, contact block | Consistency without design work. |
| Safe overrides | Keep category together, start category on new page, hide descriptions by category, compact category, include photos where safe | Solves real layout issues without turning into a design editor. |
| Preflight | Missing prices, long text, low-res photos, QR quiet zone/module size, contrast, bleed/safety, page overflow, stale menu, file size | Prevents expensive print mistakes. |
| QR bridge | Vector QR, short URL, scan-safe size, live menu destination, export-specific UTM/source label | Printed menu can lead customers to current menu. |
| Print-shop packet | PDF, optional home-printer PDF, print instructions, proof checklist, QR test note | Owner can send one clean package to a printer. |
| History | Device-local export history, hash reuse, freshness state, regenerate action | Owner knows whether an old file still matches the menu without creating Firebase cost. |
| Accessibility | Selectable text, logical reading order target, metadata, no image-only text | More usable PDFs and fewer compliance traps. |
| Batch | Generate the same preset for multiple locations | Reduces repeated work for multi-location owners. |

---

## Recommended Launch Scope

Ship as a complete architecture with flags, but expose only the stable surface first.

| Capability | Launch exposure | Reason |
| --- | --- | --- |
| Dedicated route | On | Core product decision. |
| Classic, Compact, Premium | On | Enough style range without weak templates. |
| Home print PDF | On | Common, low-risk output. |
| WhatsApp PDF | On | Important SMB workflow. |
| Preflight warnings | On | The biggest quality upgrade over a button. |
| QR bridge | On | Connects paper back to live menu. |
| Export history/freshness | On as browser-local history | Valuable for stale-file checks; keep server artifact history behind separate approval because it adds Firestore/Storage cost. |
| Print-shop packet | Flag-gated | Needs bleed/crop/file-size validation. |
| Page images | Flag-gated | Adds storage and QA surface. |
| Multi-location batch | Flag-gated | Useful for operators, but needs careful data access and cost checks. |
| AI advisor | Pro/Multi-location only | Useful value-add when JSON-only, owner-applied, and kept outside final rendering truth. |

---

## Final Product Decision

Build Menu Card Export as a routed Print Menu workflow under Use MenuList. The route should feel like an operational print surface:

1. Select menu.
2. Choose job preset.
3. Choose controlled style.
4. Review preflight.
5. Preview pages.
6. Create PDF or packet.
7. Reuse or regenerate from history.

This was the research decision that established Menu Card Export as the successor to PDF Surface. Route parity is now implemented; PDF Surface remains only as a compatibility bridge for legacy or flag-off callers.
