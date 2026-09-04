# Printable Asset Templates - Spec

> **Last Updated:** September 3, 2026

## Executive Summary

Printable Asset Templates turns MenuList print/download files into a dedicated owner workspace called **Assets**. The owner first chooses one governed **Asset Theme** for the menu or business, then downloads the required print menu, card, poster, sticker, campaign asset, or complete Menu Kit. All 47 themes remain supported across every asset renderer. Thirty-four themes are common, five restaurant/food themes use canonical food-category visibility, and eight visually explicit themes are exact-business-type families. Eligible saved menu and business themes override deterministic type/category recommendation order, while ineligible restricted context fails closed without deleting historical preferences.

The default path is still not a blank design tool. Owners choose a finished template and download it. For non-menu printable assets, desktop also offers a governed **Customize design** path backed by the shared Creative Editor document model. Owners can adjust background, owned images, text, styles, Brand Kit values, and layout when needed, while QR destination, scan-safe QR rendering, front/back business-card frames, and MenuList attribution policy stay protected. QR/link source layers remain locked in the editor document. MenuList attribution is not stored as an editable canvas layer; it is applied at export time when the existing plan policy requires it.

## Why This Matters

Printed assets are often the first physical proof of a business. For a small restaurant, salon, spa, bakery, clinic, or service counter, a QR card on the table or counter can make the business feel current or careless. The owner should not need a designer for this.

The current Print Assets screen proves the workflow. The next system must make the output selection feel like choosing from a professional catalog.

## Goals

| Goal | Meaning |
| --- | --- |
| Give owners real choice | Provide polished template families instead of one look, without showing duplicate output options. |
| Keep owner effort low | One theme for the set, one asset type, one download, with desktop content/layout customization only when the owner asks for it. |
| Keep outputs consistent | One-click output follows eligible menu theme, eligible business theme, exact business-type/category recommendation, then the governed common fallback; no asset can silently select another theme. |
| Keep themes relevant | Every owner receives all 34 common themes, with canonical type/category context ordering the best-fit directions first; five restaurant/food systems and eight visually explicit exact-type systems remain applicability-gated. |
| Keep QR reliable | QR modules stay dark on white with required safe area. |
| Make QR surfaces actionable | Each QR surface should communicate one customer action, not just show a code. |
| Keep paired print assets aligned | Business Card front/back faces stay tied to protected print frames even after customization. |
| Keep Firebase cost low | Generation stays client-side using already-loaded data. |
| Keep template additions easy | Add a template by registering a family and editor-document renderer support, not by adding one-off UI. |

## Non-Goals

| Not Included | Reason |
| --- | --- |
| Blank free-form editor | Too much owner responsibility and support risk. Governed customization starts from a finished print template. |
| Unbounded design-suite surface | MenuList exposes only the controls needed to adapt an approved operational asset; the full campaign-creation surface remains in CampaignCue. |
| Generated Storage uploads | Adds cost and cleanup burden. |
| Print ordering marketplace | Separate operational business, not needed for this feature. |
| Designer marketplace | Scope creep and support burden. |
| Public template browsing page | Owners need this inside dashboard, not a marketing gallery. |

## Target Owner Flow

The owner workspace is admitted only after active subscription state has
settled. An owner without valid plan access sees the shared plan state before
any project summary is read; a denied read must never appear as “Create your
first menu.”

1. Owner opens **Assets** from the dashboard navigation.
2. Owner selects an active project when the store has multiple projects.
3. Owner chooses one **Asset Theme** for this menu or makes it the business theme. The same visual language carries through the print menu, cards, posters, stickers, and ZIP.
4. Owner selects an asset type and sees that asset in the currently selected parent theme.
5. Owner opens the inherited theme preview.
6. Desktop opens a modal and mobile opens a bottom sheet with the generated output preview already visible. Non-menu printable assets preview from the Creative Editor document renderer; Print Menu uses the generated menu PDF first-page image preview.
7. Content-bearing assets use one browser-local details step before download. Flyer accepts a campaign headline plus optional offer, details, validity, and terms; Postcard accepts a headline and optional message; Gift Certificate accepts optional recipient, sender, personal message, value, valid-until, and certificate-number values; Invitation accepts optional occasion, date, time, and location. MenuList uses only supplied bounded text. Empty optional content preserves the truthful brand or physical write-in fallback. These fields remain in the current open asset screen and are not a new Firestore record.
8. Owner downloads the selected template as PDF or image. Business Card image delivery packages the front and back PNG files into one ZIP; its PDF stays paired for print handoff. Complete Menu Kit remains a ZIP bundle.
9. Owner may save **Menu theme** or **Business theme**. Per-asset theme exceptions are not offered.
10. One-click downloads and Complete Menu Kit use `eligible menu theme -> eligible business theme -> exact business-type/category recommendation -> Botanical Heritage fallback`. Every included asset receives the same resolved theme ID.
11. On desktop, owner can click **Customize design** for Table Tent, Single Card, Counter Sticker, Entrance Poster, Feedback QR, Flyer, Gift Certificate, Business Card, Staff Name Badge, Invitation, Postcard, or Campaign Poster. Product Tag starts beside a saved item in the item editor and opens its own preview → edit design → download image/PDF modal, prefilled from that exact item and the resolved project/business parent theme. The shared editor opens fullscreen with the full asset visible, no protected layer selected, and only Background, Images, Text, Styles, and Brand Kit tools. Business Card opens with front and back faces in one canvas, and edited image export downloads both side images. MenuList attribution is added only to the downloaded output when the existing plan policy requires it.
12. Campaign Poster remains available in Assets for a manual promotion, where a real owner headline is required before edit/download. The existing desktop/mobile Today `print_poster` action opens the same selected-theme preview/editor/download flow using the saved campaign. Item campaigns resolve the current visible/available item from the already loaded selected project, print its current localized name and real description when available, and reuse the exact item URL; stale, missing, hidden, or unavailable item references fail closed. General campaigns use the selected customer page, and Today is marked handled only after a successful file download. Campaign Poster is not duplicated in item PDP and adds no parallel campaign or poster persistence.
13. The desktop Featured-section modal and mobile Featured-choices sheet expose the same Campaign Poster flow for each saved explicit Featured choice, Quick choice, or Value choice. The printed audience headline comes from the existing business-aware Decision Blocks label; item name and optional description come from the current selected project; the QR opens that exact item; and the parent project/business theme is inherited. Automatic choices cannot produce static print because their resolved item can change. Unsaved, disabled, missing, hidden, unavailable, or linkless selections fail closed.
13. Staff Name Badge requires an explicit active-staff selection on desktop and mobile. It prints the selected record's valid name and an active current-store role display name when resolvable; it never substitutes store contact-person data or exposes raw role IDs, contact facts, login IDs, or a fake photo.
14. Event Invitation supports optional browser-local occasion, date, time, and location entry before preview or download. Any field left empty remains a physical write-in line. It never prints sample event facts, a reply request, QR, destination hostname, menu link, event-details action, or RSVP claim.
15. MenuList keeps a browser-local recovery draft, warns before a changed design is discarded or the browser page closes, and runs the shared readiness check before PDF or image output. This applies to the reusable Product Tag/Campaign Poster workflow modal as well as the main desktop Assets editor. A repeated download with the unchanged warning set is the explicit override.
16. Before download, share, or editor entry, MenuList refreshes the visible preview from the exact current runtime draft. Preview failure blocks output and exposes Retry; one synchronous operation lock prevents overlapping generation or dismissal.
17. MenuList creates the file locally. Desktop downloads it; mobile can download or use the native Share/Save sheet. Multi-file image output is first packaged as one ZIP.

## Route and Navigation

| Surface | Decision |
| --- | --- |
| Desktop primary route | `/assets` |
| Dashboard nav label | `Assets` |
| Nav placement | Immediately after `Use MenuList` |
| Compatibility route | `/use-menulist/print-assets` remains as a redirect or shell-compatible entry until old links are cleaned. |
| Mobile entry | Existing mobile More/Share flow opens an in-shell Assets screen, not a desktop route. |

## Asset Types

| Asset Type | Output | Primary Use |
| --- | --- | --- |
| Print Menu | PDF + image | Full paper menu for print shop or in-house printing. Image export saves the preview page. |
| Table Tent | PDF + image | Folded table display, readable from both sides. |
| Single Table / Counter Card | PDF + image | Acrylic holder, counter stand, wall clip, or single-sided table card. |
| Counter Sticker | PDF + image | Billing, pickup, service counter, reception desk. |
| Entrance Poster | PDF + image | Door, window, host stand, entrance board. |
| Feedback QR | PDF + image | Exit, counter, receipt stand, customer feedback prompt. |
| Flyer | PDF + image | A5 handout, delivery insert, campaign card, or local offer. |
| Gift Certificate | PDF + image | Printable voucher design with optional recipient, sender, message, value, validity, and certificate number entered before download; empty fields remain writable. It does not track balances, redemption, or validity. |
| Business Card | PDF + image | PDF keeps both 90 x 55 mm faces paired; image delivery packages separate front and back PNG files into one ZIP. |
| Staff Name Badge | PDF + image | 54 x 85 mm portrait owner, staff, or service-team badge; no photographic or verified-credential claim without a staff record and photo source. |
| Invitation | PDF + image | A6 branded invitation with optional occasion, date, time, and location entered before download; empty fields remain writable. It does not collect RSVPs or register guests. |
| Postcard | PDF + image | A6 landscape local handout with bounded owner-authored copy and a truthful brand-and-link fallback. |
| Product Tag | PDF + image | Small item tag for retail, bakery, pickup, or counter products; shows a compact neutral summary of current active named options when present. |
| Campaign Poster | PDF + image | A4 offer poster for windows, counters, and local campaigns. |
| Complete Menu Kit | ZIP | All print and social files in one download. |

## Template Families

Each family is a finished layout system that can adapt to different business types and asset sizes. Asset screens must only show families that produce materially distinct output for that asset.

| ID | Owner Label | Visual Direction | Best Fit |
| --- | --- | --- | --- |
| `botanical-heritage` | Botanical Heritage | Deep green/cream, leaf accents, warm serif title. | Restaurants, wellness, spa, organic or local businesses. |
| `craft-kitchen` | Craft Kitchen | Warm parchment, oxblood editorial type, and original culinary ink artwork. | Restaurants, breweries, cafes, bakeries, and food-led brands. |
| `ember-house` | Ember House | Bone paper, ember copper, soot-black grill marks, aged brass, and an art-directed quiet copy field. | Steakhouses, grills, barbecue, fire-led dining, and premium meat concepts. |
| `coastal-table` | Coastal Table | Salt paper, deep marine and sea-glass linework, shells, citrus, and restrained coastal botanicals. | Seafood, Mediterranean, coastal restaurants, and light all-day dining. |
| `sunday-table` | Sunday Table | Warm linen, tomato and herb accents, enamel-blue checks, tableware, and market produce. | Neighbourhood restaurants, family dining, bistros, and comfort-food menus. |
| `counter-rush` | Counter Rush | Cream stock, paprika/cobalt/mustard geometry, ingredient stamps, and bold fast-casual hierarchy. | QSR, takeaway, street food, food counters, and high-throughput menus. |
| `roastery-ledger` | Roastery Ledger | Oatmeal paper, engraved coffee botanicals, roastery measurements, mineral blue and roasted copper. | Cafes, coffee shops, and specialty roasters. |
| `patisserie-conservatory` | Patisserie Conservatory | Clotted-cream paper, pistachio conservatory lines, pastry tools, fruit, and antique brass. | Cake shops, bakeries, and patisseries. |
| `gelateria-riviera` | Gelateria Riviera | Milk-cream paper, Riviera tile framing, gelato forms, fruit, cocoa, and cobalt. | Ice cream shops and gelaterias. |
| `salon-atelier` | Salon Atelier | Warm gallery ivory, flowing hair linework, professional tools, and restrained antique brass. | Hair salons and colour studios. |
| `petal-studio` | Petal Studio | Porcelain paper, petal blush, soft sage, and professional beauty-tool gestures. | Salons, makeup studios, nails, and bridal beauty. |
| `pearl-veil` | Pearl Veil | Luminous ivory, powder blue, pale lilac, ribbon structure, and pearl detail. | Weddings, boutiques, salons, patisserie, and premium hospitality. |
| `terracotta-glow` | Terracotta Glow | Warm ivory, muted terracotta, eucalyptus, and sculptural sun forms. | Creative studios, cafés, boutiques, salons, and lifestyle brands. |
| `glasshouse-beauty` | Glasshouse Garden | Daylight cream, celadon, architectural geometry, and controlled leaf shadows. | Boutiques, studios, hospitality, wellness, and modern services. |
| `ritual-sanctuary` | Ritual Sanctuary | Rice paper, eucalyptus, mineral textures, treatment objects, and restorative whitespace. | Spas, treatment studios, and spa resorts. |
| `eucalyptus-retreat` | Eucalyptus Retreat | Rice cream, eucalyptus, fog blue, linen, mist, and stone. | Day spas, treatment studios, and spa resorts. |
| `mineral-spring` | Mineral Spring | Chalk white, pale aqua, water contours, and limestone detail. | Wellness, hospitality, health, beauty, and calm service brands. |
| `lotus-stillness` | Lotus Stillness | Warm rice paper, lotus blush, soft jade, and pond-ripple linework. | Wellness, hospitality, weddings, cafés, and restorative services. |
| `sunlit-ritual` | Sunlit Ritual | Warm cream, turmeric light, soft terracotta, and original botanical/vessel gestures. | Hospitality, cafés, beauty, wellness, and lifestyle services. |
| `performance-circuit` | Performance Circuit | Athletic white, cobalt technical structure, training equipment, and coral energy. | Gyms, fitness centres, bootcamps, and personal trainers. |
| `ink-vine` | Ink & Vine | Warm paper, hand-drawn vine rules, restrained artisanal composition. | Rooftop restaurants, cafes, organic dining. |
| `midnight-gold` | Midnight Gold | Dark paper, disciplined Deco geometry, champagne accents. | Cocktail bars, lounges, evening venues. |
| `sunset-atelier` | Sunset Atelier | Apricot-to-teal atmosphere, watercolor edges, atelier framing. | Salons, spas, beauty and wellness. |
| `rosewater-editorial` | Rosewater Editorial | Porcelain paper, dusty-rose washes, sculptural curves, plum and restrained brass. | Beauty salons, makeup studios, nail and skin services. |
| `mineral-sanctuary` | Mineral Sanctuary | Limestone paper, mineral-sage strata, water contours, quiet restorative whitespace. | Day spas, spa resorts, massage and wellness studios. |
| `noir-studio` | Noir Studio | Smoked charcoal, black-plum depth, architectural copper lines, pearl typography. | Premium salons, grooming studios, evening beauty concepts. |
| `bombay-chronicle` | Bombay Chronicle | Old paper, oxblood editorial type, railway-green narrative details. | Indian restaurants, heritage cafes, bakeries. |
| `indian-atelier` | Indian Atelier | Gallery ivory, linen texture, jaali detail, bronze rules. | Chef-led dining, hotels, tasting menus. |
| `art-deco-garden` | Art-Deco Garden | Symmetrical Deco framing, celadon palms, geometric blooms. | Weddings, boutique hotels, upscale dining. |
| `japanese-night-luxe` | Japanese Night Luxe | Sumi/indigo field, rice-paper moon, gold ripples. | Sushi, robata, seafood, evening venues. |
| `tea-salon-heritage` | Tea Salon Heritage | Cream and duck-egg stationery with engraved botanicals. | Afternoon tea, patisserie, dessert cafes. |
| `lankan-block-print` | Lankan Block Print | Coconut paper with cinnamon, turmeric, lagoon block-print edges. | Sri Lankan, South Indian, tropical casual dining. |
| `gallery-ledger` | Gallery Ledger | Gallery-ivory paper, architectural cobalt/clay planes, precise editorial structure. | Retail, professional services, studios, galleries, and creative businesses. |
| `vital-current` | Vital Current | Chalk-white paper, marine and mineral movement, restrained coral energy. | Fitness, clinics, wellness, training, and active services. |
| `workshop-atlas` | Workshop Atlas | Flax paper, blueprint precision, material swatches, copper and workshop green. | Makers, contractors, repair, practical service, and specialty businesses. |
| `neighbourhood-standard` | Neighbourhood Standard | Warm civic paper, forest sign-painting rules, clay wayfinding blocks, and small community-service marks. | Local services, pet care, repair, cleaning, and neighbourhood businesses. |
| `field-notes` | Field Notes | Natural field paper, graphite grids, survey marks, indigo annotations, and restrained moss accents. | Mobile services, trades, landscaping, cleaning, and practical work. |
| `boutique-window` | Boutique Window | Soft gallery paper, plum display arches, blush product plinths, and champagne linework. | Fashion, jewellery, accessories, florists, and premium retail. |
| `market-label` | Market Label | Kraft-cream stock, bottle-green label geometry, ochre stamps, and hand-inked inventory details. | Independent retail, books, crafts, provisions, and product-led shops. |
| `civic-letterpress` | Civic Letterpress | Cotton paper, navy legal rules, burgundy seals, blind-emboss geometry, and restrained brass. | Law, finance, real estate, consulting, and established practices. |
| `modern-practice` | Modern Practice | Cool white paper, cobalt modular blocks, slate structure, and precise signal-red details. | Advisors, agencies, coaches, planners, and contemporary firms. |
| `studio-contact-sheet` | Studio Contact Sheet | Warm white stock, charcoal crop marks, cobalt frames, and editorial contact-sheet rhythm. | Photographers, studios, galleries, musicians, tattoo, and visual arts. |
| `maker-ledger` | Maker Ledger | Flax paper, terracotta construction marks, workshop green diagrams, and tactile material swatches. | Handmade goods, furniture, decorators, tailors, and makers. |
| `clinical-calm` | Clinical Calm | Bright mineral paper, medical blue structure, soft sage curves, and low-noise precision marks. | Clinics, dental, veterinary, therapy, and care-led health services. |
| `mindful-motion` | Mindful Motion | Pale stone paper, mineral teal flow lines, muted coral movement, and spacious wellness geometry. | Yoga, martial arts, coaching, wellness, and movement studios. |
| `hospitality-house` | Hospitality House | Cream stock, oxblood keyline arches, deep green hospitality motifs, and aged-brass details. | Hotels, coworking, childcare, venues, and hosted service concepts. |
| `future-workshop` | Future Workshop | Cool white stock, graphite technical grids, electric violet modules, and cyan prototype marks. | 3D printing, drones, automotive, technology services, and specialist workshops. |

### Visibility Policy

| Visibility | Themes | Owner Eligibility |
| --- | --- | --- |
| Common | Thirty-four families, including Pearl Veil, Terracotta Glow, Glasshouse Garden, Mineral Spring, Lotus Stillness, and Sunlit Ritual | Every canonical, `Other`, legacy, or unknown business context. Category context changes recommendation order, not availability. |
| Food category | Craft Kitchen, Ember House, Coastal Table, Sunday Table, Counter Rush | Canonical food types, or `Other` with the explicit canonical `food` category. |
| Exact business type | Roastery Ledger | `Cafe`, `Coffee Shop`, `Specialty Coffee Shop`. |
| Exact business type | Patisserie Conservatory | `Cake Shop`, `Bakery`. |
| Exact business type | Gelateria Riviera | `Ice Cream Shop`. |
| Exact business type | Salon Atelier, Petal Studio | `Salon`, `Makeup Studio`. |
| Exact business type | Ritual Sanctuary | `Spa`, `Spa Resort`. |
| Exact business type | Eucalyptus Retreat | `Spa`, `Spa Resort`. |
| Exact business type | Performance Circuit | `Gym`, `Fitness Center`, `Fitness Bootcamp`, `Personal Trainer`. |

This is an owner-catalog policy, not a renderer limitation. Every theme remains renderable across every supported asset so the system can preserve a single theme through Print Menu, compact assets, and Complete Menu Kit.

## Template Rules

| Rule | Requirement |
| --- | --- |
| Dynamic data only | Store name, branch, logo, color, URL, copy, currency, and plan state come from live inputs. |
| No fake placeholder content in output | Placeholder images/text may appear only in empty preview skeletons. |
| QR modules stay dark | Brand colors may frame the QR but must not recolor QR modules unless scan-safety tests pass. |
| QR quiet zone | Generated QR layers must use a four-module quiet zone; surrounding white panels are additional protection, not the only quiet zone. |
| Logo fallback | If no logo exists, render initials from the store name. |
| Long names fit | Template must split or fit long names without overlap. |
| Business type aware | Menu, service list, catalog, feedback, and scan copy use shared business-type labels. |
| Premium branding policy | Premium hides visible MenuList branding when the existing flag permits it; all other plans show attribution. |
| Output parity | Desktop and mobile downloads must use the same template ID and renderer. |
| No duplicate choices | If an asset renderer maps multiple families to the same output, the UI exposes only the unique supported family choices for that asset. |
| Governed customization | Desktop customization must start from an approved template document and keep QR/link source layers locked. MenuList attribution must stay out of saved editor documents and be applied only at export time when policy requires it. |
| MenuList editor scope | MenuList exposes Background, owned Images, Text, Styles, and Brand Kit only. CampaignCue retains the full creation rail and product-specific campaign actions. |
| Safe initial state | Open with the asset fitted, the left drawer collapsed, and no layer selected. Protected layers remain discoverable in Layers but never become the default inspector target. |
| Recovery and exit | Keep recovery drafts browser-local. A dirty Close or browser unload must warn before discarding; a pristine Close remains immediate. |
| Download readiness | Both Print PDF and Image use the shared readiness issue scan before the first export attempt. |
| Trust cue boundary | Use business identity, current-action copy, short link, and attribution. Do not add "official", "verified", "secure", "no spam", WhatsApp badge, or WhatsApp consent copy to normal MenuList page QR assets. |
| Theme hierarchy | Resolve `eligible menu theme -> eligible business theme -> exact business-type/category recommendation -> Botanical Heritage fallback`; never let an asset select a different family. |
| Theme visibility | Thirty-four families are `common`; Craft Kitchen, Ember House, Coastal Table, Sunday Table, and Counter Rush use canonical food-category visibility; eight visually explicit families use exact canonical business-type visibility. A concrete canonical type owns its category. `Other` requires an explicit food category for food themes, while unknown legacy types still receive all common themes. Renderer support remains complete for internal QA. |
| Business recommendation | Resolve exact-type and category ordering only through the canonical shared business-type/category registry. Do not infer verticals from partial names such as Pet Grooming Salon. Recommendations order only the eligible catalog and choose the no-preference default. |
| Historical preference | Preserve an ineligible saved value as dormant migration data, skip it during output resolution, and never silently delete it. Reject new ineligible saves before the store write. |
| Theme artwork | Every production theme uses an original full-page raster master shared by previews, editor-backed assets, Menu Kit surfaces, and Print Menu. Preserve aspect ratio and safe content space; never copy reference-menu artwork. |
| Bundle boundary | Complete Menu Kit has no independent style. It passes one resolved theme to every included asset. |
| Badge truth | `Menu theme` and `Business theme` appear only for their exact resolved source; the system fallback is `Recommended`. |

## Branded QR Action Template Boundary

[Branded QR Action Templates](../branded-qr-action-templates/README.md) is the cross-feature doctrine for physical QR action files. Printable Asset Templates owns the standard scan-safe version:

- brand frame outside the QR pattern;
- business name/logo or initials;
- one clear CTA such as menu, order, feedback, booking, offer, reorder, event, or product info;
- visible short link where space allows;
- locked QR/link source layer;
- no generated scan ledger.

Measured WhatsApp campaigns belong to [QR WhatsApp Experiments](../qr-whatsapp-experiments/README.md). Artistic QR patterns, logo overlays inside the QR, and module distortion stay rejected until scan-regression coverage exists.

## Plan and Access

The Assets workspace follows the existing paid-subscription admission boundary. Once admitted, an owner sees the same business-eligible theme set for every supported asset. Visibility depends only on canonical business applicability, not plan; there is no theme-by-theme upsell or asset-level split. Visible MenuList attribution removal continues to follow the existing branding-removal policy independently. QR reliability and core output quality are never weakened by plan.

## Market Research Notes

Sources reviewed:

- [MustHaveMenus QR Code Menu Table Card](https://www.musthavemenus.com/table-tent-template/qr-code-menu-table-card.html)
- [VistaPrint Table Tents](https://www.vistaprint.com/marketing-materials/table-tents/)
- [PosterMyWall QR menu template examples](https://id.postermywall.com/index.php/art/template/57f6557385da02d6c193efe9fbe09a61/qr-code-menu-template-design)
- [Canva menu templates](https://www.canva.com/menus/templates/)
- [Canva Brand Templates](https://www.canva.com/business/features/team-templates/)
- [Adobe Express custom templates with brand controls](https://helpx.adobe.com/in/express/web/brands-libraries-projects/create-manage-brands/template-control.html)

Market pattern:

| Observed Pattern | MenuList Decision |
| --- | --- |
| Template libraries give many styles. | Keep 34 versatile themes universally available, use canonical type/category context to order the most relevant directions first, keep five food systems food-specific, and admit eight visibly industry-specific systems only for their exact canonical types. |
| Print vendors focus on paper, stock, and uploaded designs. | Keep print instructions, but avoid becoming a print marketplace. |
| General design tools expose too many edit controls. | Give finished templates first; expose a governed editor only for practical copy/layout fixes. |
| Brand systems preserve reusable approved choices while allowing project-level work. | Keep one business baseline and sparse per-project overrides instead of copying settings into every project. |
| QR/table tent products emphasize easy scan placement. | Keep QR size, contrast, short link, and print-safe placement non-negotiable. |
| Most tools are restaurant-heavy. | Make labels and copy business-type aware for wider SMB use. |

## Success Metrics

| Metric | Target |
| --- | --- |
| Owner can download one asset | Under 3 clicks after opening Assets. |
| Owner can customize one asset | Desktop owner can open, edit, and download a non-menu print asset without leaving Assets. |
| Template coverage | All 47 parent themes support the full Print Menu, all 13 editor-renderable asset types, and Complete Menu Kit without per-asset family drift. |
| Runtime cost | No new reads for normal generation; one store write only when an owner explicitly changes or clears a default. |
| Mobile parity | Mobile and desktop produce the same file for the same asset/template/project. |
| Scan reliability | QR contrast and safe-area verification pass for every template family. |
| No hardcoded business output | Verification catches Habibis or restaurant-only text in template renderers. |

## Open Questions

| Question | Current Decision |
| --- | --- |
| Should selected theme persist across devices? | Yes. Store one business theme and sparse menu themes on the already-loaded store document. Legacy per-asset values are migration input only. |
| Should AI select the template? | Not required. Use deterministic local recommendation first; any paid advisor must be explicit and gated. |
| Should website get a big section? | No. Keep website mention light until implementation is live. |
| Should old Print Assets docs be merged? | No. This doc set stays separate until implementation is complete, then old docs can be cleaned. |
