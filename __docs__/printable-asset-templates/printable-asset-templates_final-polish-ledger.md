# Printable Asset Templates - Asset-by-Asset Final Polish Rules Ledger

> **Last Updated:** September 3, 2026
> **Pilot theme:** Terracotta Glow
> **Started:** September 1, 2026
> **Purpose:** Record owner-approved visual decisions asset by asset, then deliberately propagate only the applicable global rules across the governed theme catalog.

This is the durable design-governance source for final printable-asset polish. Future work must update this ledger in the same change that adjusts an asset composition or promotes an asset-specific decision into a shared rule.

## Working contract

- Review one physical asset at a time in Terracotta Glow.
- Classify every accepted change as **global**, **asset-specific**, **theme-specific**, or **sample-only**.
- Do not assume a pilot adjustment belongs everywhere. Recheck the equivalent asset across all themes before propagation.
- Preserve QR scan safety, print safe fields, canonical customer links, real store data, and fold/trim behavior during visual polish.

## Rule classification and IDs

| Prefix | Scope | Meaning |
| --- | --- | --- |
| `G-*` | Global | Applies wherever the same content role exists across printable assets. |
| `A-{asset}-*` | Asset | Applies only to one physical asset and its geometry. |
| `T-{theme}-*` | Theme | Applies only to one theme's artwork, palette, or typography. |
| `S-*` | Sample | Fixture-only presentation; never customer identity or runtime truth. |

Every accepted change must have one primary rule ID. A global rule is not considered propagated until the equivalent output has been regenerated and checked across the governed theme catalog.

## Shared global rules

| Rule | Requirement | Enforcement |
| --- | --- | --- |
| `G-IDENTITY-01` | Render the stored business logo when valid; otherwise use truthful business initials. Never replace missing client identity with the MenuList logo. | Shared identity renderer plus logo/initials regressions. |
| `G-COPY-01` | Use real business name and owner tagline. Omit an absent tagline; never invent a customer-facing claim. | Shared admitted render input and source-reference layers. |
| `G-LANGUAGE-01` | CTA nouns follow canonical business context: menu, services, catalog, or offerings. | Shared `OfferingLabels`; no asset-local hardcoded business noun. |
| `G-CENTER-01` | Centered copy never stretches horizontally. It wraps to at most two independently centered lines, then reduces type only if two lines cannot fit. | Shared centered-text layout helper plus rendered-glyph geometry tests. |
| `G-CENTER-02` | Safe hostname breaks are permitted after hyphens, dots, and slashes; every resulting line uses the same horizontal center anchor. | Shared break-unit resolver and per-line bounds tests. |
| `G-LINK-01` | QR retains the full canonical destination. Printed copy shows the actual public hostname, including QA or verified custom domains when applicable. | URL admission plus QR/display-link separation regression. |
| `G-SCAN-01` | Preserve the QR's intrinsic four-module quiet zone. Decorative panel spacing is separate and may be asset-specific. | Locked QR layer and scan-boundary tests. |
| `G-REFLOW-01` | When identity or copy wraps, following layers move vertically; they never overlap text, QR, artwork, border, trim, or footer. | Asset geometry assertions. |
| `G-PURPOSE-01` | Where a physical asset benefits from immediate recognition, communicate its purpose through restrained asset-specific perimeter artwork before relying on copy. Never paste one generic icon over every theme or place decorative art inside functional copy/QR fields. | Asset rulebook composition, protected central field, theme-token artwork masters, and all-theme visual review. |
| `G-OWNER-UI-01` | Dashboard browsing and opening are distinct. Purpose-list rows select the focused asset without interruption; Brand Kit bento previews and the focused large preview open that exact asset's existing modal. No entry creates parallel modal behavior. | Semantic buttons, separate selection/open handlers, inherited-theme template resolution, and desktop interaction regression checks. |
| `G-OWNER-UI-02` | Asset preview-modal downloads and Customize are peer actions in one compact row. The preferred download leads visually, all controls share one height, labels stay concise, icons keep a fixed 16 px box, and only genuinely narrow screens stack them. | Shared responsive action container, equal-height button contract, fixed icon geometry, static verifier tokens, and desktop cross-format browser geometry checks. |
| `G-OWNER-UI-03` | Preview modals identify context once as `Theme · Asset`, preserve the real asset ratio on a borderless stage, and place the physical/output size in a bottom-right badge. Theme names are not repeated below the preview. | Shared modal-stage classes, aspect-preserving image contract, concise asset-purpose copy, static verifier, and cross-format browser review. |
| `G-OWNER-UI-04` | Brand-look browsing is inspect-first. A theme card updates a six-asset bento without saving; the pending card can be deselected; Current remains green, pending selection remains light blue, and neither state loses its border or tint on hover. | Shared representative asset IDs, reversible pending state, explicit current/selected semantics, sticky responsive bento preview, and browser state/hover checks. |

## Owner dashboard interaction rule

- An asset preview is an action, not decorative chrome. Every bento or focused-preview card uses native button semantics, a descriptive accessible name, keyboard activation, focus treatment, and a visible preview affordance.
- Brand Kit bento clicks and focused-preview clicks select the exact asset before opening the existing preview/download modal. Purpose-list rows and purpose-tab changes update selection and the focused preview without opening a modal.
- The modal must preserve the resolved parent theme. A prepared platform record may provide catalogue metadata or a browsing thumbnail, but its persisted editor document must never override the current governed renderer for modal preview, owner download, or a new customization session. This fail-closed rule prevents stale plain documents from diverging from themed previews; explicit owner-saved designs remain separately reusable. No dashboard entry point may introduce a second preview implementation.
- Governed local theme images must be embedded into the temporary export SVG before PNG rasterization. A missing printable-theme or menu-card artwork source fails the render; it must never yield a successful-looking plain PNG/PDF.
- A recoverable asset may still be inspected. If its destination is not operational—for example Feedback QR before feedback is enabled—the modal must explain the recovery path and keep download/customize actions unavailable.
- Keep normal output choices and Customize design together as one scannable action group. Setup/recovery actions remain inside their explanatory recovery panel because they solve a different owner task.

## Self-explanatory asset pattern

- A printable asset should reveal its job before the customer reads every word when a familiar, restrained visual grammar can do that honestly.
- The visual signal belongs at the perimeter or in an intentionally reserved decorative field. The central copy, write-in, pricing, contact, and QR zones remain calm and protected.
- The asset owns the composition idea; the selected parent theme owns its colours, typography, texture, border language, and supporting artwork. This keeps the asset recognizable without making all themes identical.
- Use format-appropriate signals rather than a universal pasted icon: governed Koboyo gift purpose art for Gift Certificate, a rating-neutral Koboyo review quote inside Feedback QR's speech-bubble composition, and real owner-authored campaign hierarchy for Flyers/Posters.
- Apply this pattern only where it improves recognition. Functional documents must not receive decoration that competes with reading, writing, scan safety, trim, or truthful business information.

## Asset-by-asset baseline

The table describes what must be decided and verified when each asset reaches its polish turn. It is not permission to apply the Table Tent composition unchanged to other formats.

| Asset | Primary owner/customer job | Required identity and copy rules | Physical/layout rules to verify |
| --- | --- | --- | --- |
| Table Tent | Invite an at-table scan from normal viewing distance. | `G-IDENTITY-01`, `G-COPY-01`, `G-LANGUAGE-01`, `G-CENTER-*`, `G-LINK-01`. | Fold orientation, duplicated faces, top/frame safe zone, QR prominence, CTA-to-QR grouping. |
| Single Table Card | Provide one compact upright scan surface. | Same global identity/copy/link rules; remove duplicated instructions. | Portrait reading order, counter/table viewing distance, stable base margin. |
| Counter Sticker | Enable a close-range scan with minimal copy. | Shortest governed CTA; business identity only when it remains legible. | Die-cut/edge safe zone, QR dominance, no artwork behind QR. |
| Entrance Poster | Communicate business identity and one action from farther away. | Theme display face only for headline; CTA remains plain and readable. | Distance legibility, poster trim/bleed, strong CTA/QR grouping. |
| Feedback QR | Make feedback intent explicit before scanning. | Feedback-specific governed CTA and canonical feedback destination. | Trust wording, privacy-safe copy, QR dominance, no menu/service ambiguity. |
| Flyer | Present one owner-editable campaign message and action. | Real identity, non-deceptive offer copy, business-aware destination. | Headline hierarchy, terms readability, trim safety, no fake urgency. |
| Gift Certificate | Communicate value and redemption clearly. | Full business identity, truthful certificate label, governed contact/link. | Headline and amount fields inside safe panel; redemption copy readable. |
| Business Card | Exchange identity and contact information. | Real logo/initials plus available name, phone, email, and address only; no invented person, designation, or social handle. | Front/back frame integrity, print-safe contact type, QR optionality and scan size. |
| Staff Name Badge | Identify a real staff member and business without implying a verified credential. | Staff name/role, real business identity, and a name-derived initials monogram; no unavailable photo or credential claims. | Monogram safe zone, lanyard/trim clearance, accessible name hierarchy. |
| Event Invitation | Provide a memorable branded first impression that owners can complete after printing. | Real business identity plus blank occasion, date, time, and one location field. | Reading sequence, writing space, line clearance, trim safety, and no irrelevant QR/action. |
| Postcard | Carry one concise owner-authored message as a local handout. | Real identity, optional real tagline, bounded owner headline/message, and no invented promotion. | Single-sided A6 landscape hierarchy, separate message/scan fields, trim safety, QR quiet zone, and readable recovery link. |
| Product Tag | Identify product/business and offer a close-range action. | Minimal business/product truth with canonical link. | Hole/trim clearance, smallest permitted type, close-range QR size. |
| Campaign Poster | Promote one current campaign from viewing distance. | One non-deceptive campaign headline and governed CTA. | Large-type hierarchy, offer/terms balance, poster trim and QR scan distance. |
| Print Menu | Present full menu/service content for reading and price comparison. | Real identity, business-aware section language, exact prices and contact details. | Pagination, category integrity, price alignment, cover/closing pages, print contrast. |
| Complete Menu Kit | Deliver a coherent production packet. | Inherit one resolved parent theme and the final rules of every included asset. | Correct formats, filenames, ZIP inventory, no mixed themes or stale asset variants. |

## Koboyo suitability audit

Koboyo artwork is admitted only when it explains the customer's task faster than the existing identity, action, QR, or content. It stays locked inside the final composition, carries its official source metadata, inherits the selected theme, and is never exposed as a picker or standalone icon download.

| Asset | Decision | Governed artwork or reason |
| --- | --- | --- |
| Table Tent | Do not add | Two scan faces need maximum action and QR clarity. |
| Single Table Card | Do not add | Business identity, business-aware action, and QR already explain the purpose. |
| Counter Sticker | Do not add | Close-range QR dominance is the correct signal. |
| Entrance Poster | Do not add | Distance-readable identity and action must remain dominant. |
| Feedback QR | Use | Koboyo `review-quote`; neutral conversation cue without rating pressure. |
| Campaign Flyer | Do not add | The admitted owner-authored campaign headline is the purpose; a flyer icon would describe the medium. |
| Gift Certificate | Use | Koboyo `gift`; immediate purpose cue held at the perimeter of the writable certificate. |
| Business Card | Do not add | Real identity and admitted contact facts are the complete purpose. |
| Staff Name Badge | Do not add | Badge/access icons could falsely imply a credential. |
| Event Invitation | Use | Existing Koboyo May garland, flowers, and celebration burst provide a ceremonial signal without invented event facts. |
| Postcard | Use | Every theme uses a restrained horizontal trio of Koboyo `flower` illustrations below the message. The botanical gift cue inherits the parent-theme accent and communicates appreciation without adding the first human face to the asset system. |
| Product Tag | Do not add | The source item's real name, optional verified detail, exact display price, compact neutral option summary, direct-item QR, and inherited parent-theme artwork fully explain the tag without a generic merchandise symbol. |
| Campaign Poster | Do not add yet | The real campaign headline, optional source item, business identity, and QR explain the purpose. Reconsider only during the owner visual-polish review if the poster needs restrained theme-native ornament. |
| Print Menu | Do not add | Menu content and the parent theme's business-aware artwork already own the composition. |
| Complete Menu Kit | Do not add | The ZIP has no independent composition and inherits its included assets. |

## Global centered-copy rule

- Never horizontally stretch, squeeze, or scale text to force it into a box.
- Keep every centered copy layer—including business name, tagline, business-aware scan instruction, and displayed public host—centered within the asset's framed safe field.
- If copy does not fit naturally on one line, wrap it at a word boundary to a maximum of two lines. Allow safe hostname breaks after hyphens, dots, and slashes.
- Apply horizontal center alignment to every rendered line independently; a second line must use the same center anchor as the first line.
- Reduce type size only when two lines still cannot fit safely. Reflow the following layers vertically so wrapped copy never collides with the QR, border, artwork, or footer.
- Treat this as the shared printable-asset rule. Apply it through the common centered-text layout helper as each asset completes final polish.

## Item option and variation rule

- Use only active, named options from the current saved item. Keep an option even when it has no separate price; exclude inactive and nameless records.
- Resolve option names using the selected menu language and format valid option prices with the store currency.
- The current item contract does not classify a choice as a variant versus an add-on. Use the neutral label `Options` and never prefix prices with `+` or otherwise invent extra-charge semantics.
- Compact single-item assets may show the first three real options plus an exact remaining count. Print Menu must preserve the complete admitted set and paginate it into continued blocks rather than silently truncate or horizontally compress content.
- Share Card, Product Tag, and Print Menu must derive from the same projection rules so owner downloads cannot disagree with public item truth.

## Asset review order

| # | Asset | Pilot status | Cross-theme propagation |
| ---: | --- | --- | --- |
| 1 | Table Tent | Owner-approved final composition | Complete across 47 themes |
| 2 | Single Table Card | Owner-approved full-background composition | Complete across 47 themes |
| 3 | Counter Sticker | Owner-approved close-range composition | Complete across 47 themes; full matrix and full-size edge cases reviewed |
| 4 | Entrance Poster | Owner-approved rulebook complete across all 47 themes | Complete; full matrix and full-size edge cases reviewed |
| 5 | Feedback QR | Owner-approved rulebook complete across all 47 themes | Complete; full matrix and full-size edge cases reviewed |
| 6 | Flyer | Owner-approved rulebook plus governed campaign fields complete across all 47 themes | Complete; campaign and truthful fallback paths verified |
| 7 | Gift Certificate | Owner-approved premium composition | Complete across 47 themes; full matrix and full-size edge cases reviewed |
| 8 | Business Card | Owner-approved premium composition | Complete across 47 themes; complete matrix and inset artwork edge cases reviewed |
| 9 | Staff Name Badge | Owner-approved premium monogram composition | Complete across 47 themes; full matrix and full-size edge cases reviewed |
| 10 | Event Invitation | Owner-approved premium print-and-write composition | Complete across 47 themes; full matrix and full-size edge cases reviewed |
| 11 | Postcard | Owner-approved premium appreciation composition | Complete across 47 themes; full matrix and full-size edge cases reviewed |
| 12 | Product Tag | Context-first item workflow complete | Complete across all governed themes; desktop/mobile preview-edit-download and full theme matrix verified |
| 13 | Campaign Poster | Owner-approved campaign-first composition | Complete across 47 themes; full matrix and full-size edge cases reviewed |
| 14 | Print Menu | Owner-approved identity, masthead, and closing-page composition | Complete across 47 themes; full matrix and all-page edge cases reviewed |
| 15 | Complete Menu Kit | Singular parent-theme inheritance and truthful package boundary verified | Complete; all 10 deployment assets share one parent theme and contextual printables remain in their owning flows |

## Complete Menu Kit final inheritance and packaging rules

- Complete Menu Kit resolves exactly one parent theme: current menu theme, then business theme, then the governed default. Legacy per-asset family maps are compatibility input only and collapse to one canonical family before any file renders.
- All 10 generated visual files consume the same theme palette and responsive artwork contract: Table Tent, Single Table / Counter Card, Counter Sticker, Entrance Poster, Delivery Bag Sticker, Takeaway Card, Instagram Story, WhatsApp Status, Google Maps Upload, and Placement Guide.
- Full-page artwork uses aspect-preserving cover placement inside a clipped canvas; corner and rail artwork keep their governed contained placement. No renderer may stretch or independently recolour a family.
- The ZIP contains those 10 deployment files plus `PRINT_INSTRUCTIONS.txt`. Registry validation fails closed when a launch-pack key is missing, duplicated, or unknown.
- Complete Menu Kit is not a context-free dump of every printable type. Print Menu, Feedback QR, Staff Name Badge, Product Tag, campaign assets, and other owner-purpose printables remain in the workflow that owns their complete real data. They must never enter the ZIP with placeholder, stale, or invented values.
- Desktop and mobile use the same generator and generated ZIP filename. Delivery differs by browser capability only; content, theme, order, and filenames do not fork.

Acceptance checks:

- [x] No included asset resolves an independent family after bundle preparation.
- [x] All 10 launch-pack renderers consume the singular parent-theme contract.
- [x] ZIP inventory is fixed at 10 generated assets plus print instructions.
- [x] Context-dependent assets fail closed in their dedicated workflows rather than entering the bundle incomplete.
- [x] README, help, implementation, mobile, spec, and ledger describe the same package contract.

## Campaign Poster rules

- Campaign Poster is the A4 in-store campaign surface. Keep it in the desktop/mobile Assets catalogue for owner-created manual campaigns, and also open it from the existing Today `print_poster` action for a current suggested campaign. Do not duplicate it inside an item PDP.
- A saved explicit Featured choice, Quick choice, or Value choice is also a valid context-first poster source. Place the action beside that choice in the existing desktop/mobile settings surface instead of adding a parallel asset picker. Use the existing business-aware public block label, current item name and optional description, selected parent theme, and exact-item customer URL.
- Never print an automatic or unsaved Featured choice. Automatic resolution can change after the file is printed, and unsaved settings are not yet public truth. Disabled, missing, hidden, unavailable, and linkless choices also fail closed.
- Keep the settings surface open after its Save action. Desktop waits for the existing project autosave to settle; mobile awaits the existing explicit project-persistence path. The poster action becomes available in place only after saved project truth is current, avoiding both premature downloads and a close/reopen loop.
- Today must reuse the existing campaign record and selected project. The poster inherits the resolved project theme, followed by the business theme and governed recommendation; it never creates a parallel campaign or per-poster style preference.
- A source campaign contributes only facts already present in the campaign contract: the governed campaign-type headline and optional saved item name. Manual Assets entry uses the same bounded campaign fields and must fail closed before edit/download when no real headline is present.
- If the campaign has an item ID, reuse the existing exact-item `?item=` public destination. Otherwise use the selected project's public customer page. Reject missing projects, cross-project campaigns, non-HTTPS destinations, and dummy URLs.
- Today must not mark `print_poster` handled when the owner merely opens or closes the modal. Completion occurs only after the image or PDF has downloaded successfully; a failure to record completion must be shown separately from a successful file download.
- The shared modal owns preview, full-screen design editing, PNG, and print-ready PDF so desktop and mobile use the same generated bytes. The Assets preview may show the clean branded structure, but manual export/edit remains truth-gated.
- Keep semantic icon artwork out of the functional baseline. The real campaign message is the purpose signal; any later decoration must be theme-native, restrained, outside copy/QR safety zones, and approved during this poster's visual-polish turn.

### Campaign Poster - approved all-theme rulebook

| Observation | Product decision | Measured enforcement | Status |
| --- | --- | --- | --- |
| The functional baseline looked like an enlarged Flyer. | Give Campaign Poster its own A4 campaign-first hierarchy and bottom scan group while keeping the shared campaign data contract. | All 47 themes enter `buildPremiumCampaignPoster()`. The outer group boundary is fully invisible, borderless, and shadowless so it does not read as a second card; only the QR keeps a scan-safe quiet-zone panel. | Complete across 47 themes |
| Business identity overpowered the actual campaign. | Keep real logo/initials, business name, and optional tagline as a compact centered header; make the admitted campaign headline and optional source item the primary viewing-distance message. | Brand mark begins at 7% of height; business name uses a 3.6%-4.8% width-relative display range. When an offer/item exists, its one-line-first 4.4%-9% display range is larger than the business name. | Pilot implemented |
| The central campaign area used a generic translucent capsule. | Preserve the artwork-rich background and calm center. Use one short centered identity rule plus paired hairline headline rules only when the campaign headline fits one line. | No new central content box or outer border. Paired rules remain at the horizontal perimeter and are omitted for wrapped headlines. | Pilot implemented |
| Scan wording wrapped even when a modest font reduction could keep it cleaner. | Fit the business-aware CTA to one centered line first; wrap to two centered lines only when the translated/business-specific wording still cannot fit safely. | CTA fits within 50% of canvas width using a 2.7%-4.5% width-relative range and never stretches horizontally. | Pilot implemented |
| The Flyer-sized QR felt weak and the first horizontal scan row compressed the action. | Use a distinct lower scan ticket with the business-aware CTA, protected QR, and canonical hostname stacked vertically. | Ticket is 60% wide and 29.2% high; QR is 26% of canvas width with exactly 24 px decorative padding per side. CTA, QR panel, and hostname share the canvas centre, remain inside the ticket, and the retired divider is forbidden. | Pilot implemented |
| Minimal Today campaigns left the scan action too far from the campaign hero. | Let the scan ticket begin at 60% of poster height, but reflow it below the final optional campaign/item line when details, validity, or terms are present. | A bottom clamp and long-copy regression require every campaign layer above the scan ticket, every ticket layer inside it, and the complete ticket on canvas. | Pilot implemented |
| Today carried only an older campaign item-name snapshot and no description. | Resolve the current item from the already loaded selected project at poster-open time. Use its current localized name and include its current localized description only when present. | Exact ID/extraction-alias lookup; missing, hidden, or unavailable current items fail closed. Shared regression proves the current project value replaces a stale snapshot and requires no extra Firestore read. | Pilot implemented |

The composition is owner-approved and mandatory across the complete governed theme registry. A theme may adapt artwork, palette, typography, logo treatment, and contrast, but may not restore the Flyer-derived two-column panel, outer scan wrapper, or alternate content hierarchy.

## Print Menu - owner-approved all-theme rules

| Observation | Product decision | Measured enforcement | Status |
| --- | --- | --- | --- |
| The visual fixture substituted the MenuList platform mark when the sample business had no logo. | Use the stored client logo when valid; otherwise use the same deliberate theme-accent initials badge as the approved printable assets. Never let MenuList attribution impersonate the owner. | The badge occupies 96% of its centred identity box, uses high-contrast two-letter initials at a 0.78 type ratio, and retains measured clearance before the business name. Every parent-theme fixture exercises this no-logo path; a real client logo replaces the badge inside the identical box. | Complete across 47 themes |
| The cover showed the document label before the business identity and could not render the owner's real tagline. | Build one centred identity stack: logo/initials, business name, optional real localized tagline, document label, then restrained rules. | Business name and tagline wrap on word boundaries to at most two centred lines; missing tagline removes the row without fallback copy. | Complete across 47 themes |
| The repeated business-name/document-label masthead and double rule consumed valuable content space after an already branded cover. | Remove the masthead from cover-backed content pages, start categories inside each theme's protected top artwork field, and retain loose-sheet identity in the footer. | Every content page prints a compact, width-fitted business name beside its page number; content-field themes now use the balanced 24 mm text start while cover-off utility output retains its required header. | Complete across 47 themes |
| The translucent content field retained excessive and inconsistent space from the top, left, and right page edges, unnecessarily narrowing the menu column. | Use one balanced outer inset for the contrast field and preserve a separate calm inner text inset; do not reclaim footer space. | Every full-page content field sits 14 mm from the top, left, and right edges, with menu content another 10 mm inside it. The renderer preserves each theme's prior bottom inset, so the wider content area does not crowd the footer or icon-definition rows. | Complete across 47 themes |
| Decision symbols before the item name weakened alignment and made the label begin at a different left edge. | Keep every item name on the common content edge and place admitted symbols after the final name line, vertically centred to its visible type. Use familiar semantic forms without implying third-party certification. | Name wrapping reserves the bounded symbol width; single-line price leaders begin after the symbol cluster. Vegetarian/non-vegetarian retain their accepted square-dot marks; vegan uses green Lucide `Vegan`; gluten-free uses neutral/theme-coloured Lucide `Wheat` with an explicit legend definition; every spice intensity alone uses one to four red Game Icons chilli peppers; and audience facts use conventional gender/age pictograms. | Complete across 47 themes |
| A temporary visual-review fixture displayed every supported symbol and footer definition whether or not its sample item facts justified them. | Production and representative output must render only symbols derived from admitted facts on actual menu items; the legend must contain only the distinct symbols used by that menu. | The review fixture no longer contains a hardcoded `decisionSymbols` matrix. It resolves each item from its own realistic tags, while exhaustive symbol-shape coverage remains in isolated boundary tests. | Complete across 47 themes |
| Option labels and prices inherited description-scale type and became hard to read in print, while an explicit `OPTIONS` heading added redundant hierarchy. | Treat options as decision content, not footnotes, and let their placement beneath the item provide sufficient context. | Full-page themes use a minimum 8.8 pt option row with optional prices at the same readable scale and right alignment. The redundant `OPTIONS` heading is omitted, recovering one line without hiding any valid option. | Complete across 47 themes |
| The icon-definition row first sat too close to the paired rules, then retained too much unused space before the price metadata. | Preserve the safe rule-to-legend interval while compacting only the unused lower band. | The first legend baseline remains 5.2 mm below the lower rule; the second legend-row-to-metadata baseline is reduced from 11.9 mm to 5.9 mm, the legend footer contracts from 29 mm to 23 mm, and the recovered 6 mm returns to menu content capacity. | Complete across 47 themes |
| Item, description, and next-item spacing did not communicate which copy belonged together; the first line-box compensation pass then created too much whitespace. | Keep the item and its supporting copy as one tight unit, then separate the next item clearly without an oversized blank band. | The item-name-to-supporting-copy gap is reduced by a further 25% from the compact baseline. The independently calculated post-description break remains unchanged, preserving clear grouping across all themes. | Complete across 47 themes |
| Dark artwork could cross operational text, its internal frame could compete with the menu hierarchy, and its footer had no guaranteed backing field. | Preserve meaningful artwork at the perimeter while protecting content and footer metadata with theme-paper contrast layers; remove decorative framing that duplicates or competes with the page boundary. | Cover-backed pages no longer draw a masthead; Midnight Gold uses a balanced 78%-opacity dark content veil, keeps one outer border, and removes its internal stepped double frame while preserving stars, arcs, dotted accents, and gradient. Cover-off headers retain their shield, and symbol-bearing footers expand their panel to contain the dynamic legend and business/page identifier. | Complete across 47 themes |
| The closing page was functional but visually detached from the cover. | Repeat the same truthful identity stack, then a dedicated contact/QR hierarchy with a larger close-range QR and concise action. | Real logo/initials and optional tagline precede `CONTACT & LOCATION`; QR grows to 42 mm, keeps a quiet-zone panel, and `current` is removed only from the displayed action while the canonical destination remains unchanged. | Complete across 47 themes |
| Tagline, phone, address, admitted item decision facts, revised page composition, or revised background artwork could reuse a stale cached PDF. | Treat every printed identity, contact, decision-symbol, visual-layout, and governed-artwork contract as artifact-defining input. | Renderer contract is version 28 and the source hash includes tagline, phone, address, and projected decision symbols; the v28 bump prevents reuse of PDFs generated before each vegan, gluten-free, and chilli vector committed its intended colour independently. | Complete across 47 themes |
| Sample recovery copy used a reserved `.example` domain. | Demonstrate the live tenant-host pattern without changing runtime URL ownership. | All parent-theme fixtures show a canonical `menulist.online` tenant hostname; production continues to print the admitted project URL/hostname. | Complete across 47 themes |

The category, item-description, price, pagination, footer, and theme-artwork systems remain theme-governed. The shared identity hierarchy changes only the cover, content masthead, and dedicated closing page; propagation is complete only after every generated theme PDF is reviewed at full-page and contact-sheet scale.

## Product Tag rules

- Product Tag starts only from a saved item in the authenticated desktop or mobile item editor. It inherits that item's localized name, optional description, exact display price, project ID, and direct-item public link; the owner never retypes these facts in the generic Assets catalogue.
- If the item editor has unsaved changes, keep Product Tag visible but disabled and tell the owner to save first. Printed facts must never get ahead of the saved item record and public item destination.
- The resolved project theme wins, followed by the business theme and the governed business recommendation. Product Tag uses the same parent-theme artwork, palette, and typography as the store's other assets.
- The preview modal must preserve the owner flow: inspect the exact rendered tag, open the shared design editor when needed, then download image or print-ready PDF.
- Product Tag stays a canonical renderable asset type but is excluded from the context-free Assets rail and Complete Menu Kit. A missing item identity or canonical tenant URL fails closed instead of emitting placeholders.
- Never print synthetic badges such as `NEW`, `Customer favorite`, discount language, stock status, or urgency unless a future owner-controlled data contract explicitly admits that exact fact.
- Preserve the parent theme as the outer visual world, then use one quiet stationery field and a separate scan field. Do not add another outer border over the theme background.
- Keep the product name as the primary content, with detail and price subordinate. Use the real business logo when available and initials otherwise; print the real optional tagline only when supplied.
- Use the cross-business compact action `VIEW DETAILS` because the QR opens one exact item rather than a general menu, services page, or catalogue. Keep a practical close-range QR, compact 12px decorative padding, and a path-free canonical hostname as recovery copy.
- Apply this composition contract across every governed theme. Theme artwork may change, but the truthful hierarchy, geometry, QR protection, and no-invented-copy rules may not.

## Table Tent - Round 1

| Observation | Product decision | Classification | Status |
| --- | --- | --- | --- |
| Initials badge looks like a placeholder | Render the actual stored business logo when supplied. When the owner has no logo, keep the business initials as the truthful fallback. Never substitute the MenuList logo for the client's identity, including in governed visual fixtures. | Global identity rule | Implemented in Table Tent |
| Business name feels generic | Use the selected theme's governed display typeface with conservative single-line fitting; Terracotta Glow uses the existing editorial serif. | Theme-aware global rule | Implemented in Table Tent |
| Two scan instructions repeat the same message | Replace them with the owner's localized business tagline plus one direct governed CTA. Omit the tagline row when the owner has no tagline; never invent a public brand claim. | Global content rule | Implemented in Table Tent |
| The CTA must match the business, not always say services | Use the new compact phrase in the existing shared label system: food uses `SCAN TO VIEW MENU`, retail uses `...CATALOG`, creative uses `...OFFERINGS`, and service/wellness/professional contexts use their governed wording. Never hardcode the sample's business type. | Global business-language rule | Implemented in Table Tent |
| Logo or initials touch the top border on framed themes | Move the centered brand mark into a measured top safe zone below the frame, then flow the business name beneath it. | Global identity-spacing rule | Implemented in Table Tent |
| Long centered copy can cross the border | Keep the text box inside the frame, wrap at word boundaries to no more than two centered lines, and move following content vertically instead of horizontally compressing the text. | Global centered-copy rule | Implemented in Table Tent |
| QR card has excessive surrounding white space | Keep the QR element's protected four-module quiet zone, but reduce only the outer Table Tent panel padding to 24 px per side and soften its print shadow. | Asset-specific scan-safe spacing | Implemented |
| Footer uses a dummy or overlong path | Keep the QR destination as the full canonical project URL, but display only its real hostname. This naturally supports `subdomain.menulist.online`, QA hosts, and verified custom domains without hard-coding an environment. | Global link-truth rule | Implemented in Table Tent |
| Overall hierarchy is loose | Rebalance logo, name, tagline, CTA, QR panel, and public host into one measured vertical rhythm on both folded faces. The left face remains intentionally rotated 180 degrees for physical folding. | Asset-specific composition | Implemented |

## Table Tent - Round 2 final spacing rules

| Rule | Requirement | Measured enforcement | Status |
| --- | --- | --- | --- |
| `A-TABLE-TENT-01` | Keep the brand mark below the top frame instead of touching or visually sitting on it. | Premium face brand mark starts at 11% of face height; framed themes enforce an additional visible border-safe gap. | Implemented |
| `A-TABLE-TENT-02` | Keep the tagline related to the business name but visibly separate from the scan action. | Business-name-to-tagline gap remains 2.8% of face height; tagline-to-CTA breathing room is 4.4%. | Implemented |
| `A-TABLE-TENT-03` | Treat the CTA and QR as one action group while preserving a small, deliberate scan interval. | Final owner-approved CTA gap doubles the prior value: target 3.6% of face height, bounded between 2.8% and 4.4%. Reflow moves the QR downward instead of compressing copy; an absent tagline does not leave the CTA stranded above the scan group. | Final |
| `A-TABLE-TENT-04` | Keep the QR visually dominant without wasting panel space. | Outer panel padding is 24 px per side; the intrinsic four-module QR quiet zone remains unchanged. | Implemented |
| `A-TABLE-TENT-05` | Keep every copy role centered and prefer one line when it remains readable. | Business name, tagline, CTA, and public hostname first try one centered line down to their governed minimum font size, then wrap to at most two centered lines. Display-serif business names reserve a 12% metric safety factor and sans names reserve 4%, preventing font-bearing overflow without horizontal stretching. | Final |
| `A-TABLE-TENT-06` | Preserve the physical two-face fold contract. | Both faces contain the same hierarchy; only the left face is rotated 180 degrees around its own layers. | Implemented |
| `A-TABLE-TENT-07` | Keep the public hostname connected to the QR without crowding it. | Hostname targets 82% of face height and remains between 2.5% and 6% below the QR panel; wrapped or reflowed QR content retains the minimum gap. | Implemented |

### Table Tent acceptance gate

- [x] Logo/initials clear the frame and artwork.
- [x] Business name, tagline, CTA, and hostname stay inside the face safe field.
- [x] Wrapped lines retain one horizontal center axis.
- [x] Tagline and CTA have a visible breathing interval.
- [x] CTA remains visually grouped with the QR.
- [x] QR panel retains 24 px decorative padding and the protected intrinsic quiet zone.
- [x] QR retains the full canonical destination; printed hostname remains truthful.
- [x] Printed hostname remains visually connected to the QR while preserving post-QR and bottom safety.
- [x] Missing tagline removes the row and reflows the CTA without invented copy.
- [x] Long-copy geometry keeps the final hostname inside the face.
- [x] Terracotta Glow and Craft Kitchen fixtures regenerated and visually inspected after Round 2.
- [x] Owner approved this Table Tent as the propagation reference on September 1, 2026.
- [x] Equivalent Table Tent output was regenerated and reviewed across all 47 governed themes before marking propagation complete.

### Table Tent cross-theme propagation audit

| Audit boundary | Result | Evidence |
| --- | --- | --- |
| Governed parent-theme catalog | 47 of 47 Table Tent fixtures rendered from current source. | `output/printable-theme-visual-audit/*-table_tent.png` |
| Shared hierarchy | Every theme keeps the same two-face logo/initials, business name, optional tagline, business-aware CTA, QR, and truthful hostname contract. | `assertAllThemeTableTentRulebookGeometry` |
| Centering and wrapping | Upright and folded copy boxes stay within their physical face; every upright rendered line is glyph-bounds tested and all five centered roles retain `align: center`. | `assertCenteredPrintableTextLayerGeometry` across all 47 themes |
| Vertical rhythm | Every theme enforces the 4.4% tagline-to-CTA interval, final 2.8%-4.4% CTA-to-QR grouping, and 2.5%-6% QR-to-host interval. | All-theme geometry regression |
| QR protection | Every theme retains a live full-destination QR, four-module intrinsic quiet zone, and 24 px outer panel padding. | All-theme geometry regression plus shared QR renderer contract |
| Artwork-heavy themes | Roastery Ledger, Salon Atelier, Performance Circuit, Ritual Sanctuary, Lankan Block Print, Tea Salon Heritage, and other edge-art systems keep the action hierarchy inside a calm copy field. | Full-size spot review after the 47-theme contact-sheet pass |
| Dark themes | Japanese Night Luxe, Midnight Gold, Noir Studio, and Sunset Atelier retain readable title, CTA, hostname, and white QR contrast. | Full-size spot review after regeneration |
| Former wrapped CTA themes | Maker Ledger and Studio Contact Sheet now fit `SCAN TO VIEW OFFERINGS` on one centered line at the largest readable safe font size; genuinely oversized copy still wraps to two centered lines. | Full-size spot review plus rendered-glyph and spacing regression |

Review sheets:

- `output/printable-theme-final-polish/table-tent/10-final-gap-all-themes-1-of-3.png`
- `output/printable-theme-final-polish/table-tent/10-final-gap-all-themes-2-of-3.png`
- `output/printable-theme-final-polish/table-tent/10-final-gap-all-themes-3-of-3.png`

## How to add the next asset decision

For every next asset, append one section using this structure:

1. Record the owner observation in plain language.
2. State the product decision and why it improves real-world use.
3. Assign a `G-*`, `A-*`, `T-*`, or `S-*` rule ID.
4. Record exact dimensions, ratios, font bounds, or behavior—not only visual adjectives.
5. Add fail-closed source and rendered-output checks.
6. Regenerate the pilot theme, inspect it at full size, and compare it with the prior accepted image.
7. Recheck the equivalent asset across eligible themes before promoting any rule globally.
8. Update the asset review table and this acceptance gate in the same change.

## Verification required before propagation

- [x] Real-logo and initials-fallback code paths remain available.
- [x] Localized store tagline crosses desktop and mobile render inputs.
- [x] Display hostname is derived from the canonical project URL while the QR retains the full destination.
- [x] Both folded faces contain the same identity and CTA hierarchy.
- [x] QR quiet-zone setting remains four modules.
- [x] Geometry assertions prevent text/QR overlap and excessive Table Tent panel padding.
- [x] Terracotta Glow Table Tent fixture regenerated and visually inspected.
- [x] Craft Kitchen Table Tent fixture regenerated and visually inspected after the shared spacing change.
- [x] Owner approved the Round 2 Table Tent composition.
- [x] Equivalent Table Tent output was rechecked across all 47 governed themes before global propagation.

## Single Table Card - Round 1 final rules

### Owner observation and product decision

| Observation | Product decision | Classification | Status |
| --- | --- | --- | --- |
| Terracotta Glow's artwork covers the complete card and feels more attractive than sparse decoration. | Preserve the full-canvas responsive artwork with aspect-preserving `cover` placement and the existing calm content veil. Never stretch the image or replace it with a small decorative patch. | Theme composition rule | Implemented across 47 themes |
| The current initials badge may represent a real client logo. | Use the actual business logo when available; otherwise retain truthful business initials. Never substitute MenuList identity for the client. | `G-IDENTITY-01` | Implemented across 47 themes |
| The business name should feel premium rather than generic. | Use the parent theme's governed display typeface with the same conservative one-line-first fitting used by the finalized Table Tent. | Theme-aware typography rule | Implemented across 47 themes |
| `Scan to view current services` plus `VIEW SERVICES` repeats the same action. | Remove both legacy lines and use one business-aware CTA: `SCAN TO VIEW MENU`, `SERVICES`, `CATALOG`, or `OFFERINGS`. Use the optional owner tagline as the supporting line; omit it when absent. | `G-COPY-01`, `G-LANGUAGE-01` | Implemented across 47 themes |
| The current QR panel carries excessive outer white space. | Retain the four-module intrinsic QR quiet zone while reducing decorative panel padding to 24 px per side. | `G-SCAN-01` | Implemented across 47 themes |
| The footer exposes an unnecessary path. | Print only the truthful public hostname while retaining the complete canonical destination inside the QR. | `G-LINK-01` | Implemented across 47 themes |
| Long centered content can become oversized or overflow. | Prefer the largest readable one-line size, then wrap to at most two centered lines. Reflow following layers vertically; never stretch text. | `G-CENTER-*`, `G-REFLOW-01` | Implemented across 47 themes |

### Measured Single Table Card rules

| Rule | Requirement | Measured enforcement | Status |
| --- | --- | --- | --- |
| `A-SINGLE-CARD-01` | Preserve an artwork-rich but readable full-card composition. | Responsive theme artwork covers the complete 1240 x 1748 canvas with preserved aspect ratio; applicable content veils remain above artwork and behind copy. | Implemented |
| `A-SINGLE-CARD-02` | Keep the one-face identity clear of the top artwork/frame. | Logo or initials begin at 11% of card height; business name begins at 22%, with no overlap. | Implemented |
| `A-SINGLE-CARD-03` | Use one truthful supporting line and one direct scan action. | Optional owner tagline replaces the redundant instruction. CTA comes only from shared business-aware offering labels and never contains `CURRENT`. | Implemented |
| `A-SINGLE-CARD-04` | Preserve a calm identity-to-scan rhythm. | Name-to-tagline gap is 2.8%; tagline-to-CTA is at least 4.4%; CTA-to-QR remains 2.8%-4.4%. | Implemented |
| `A-SINGLE-CARD-05` | Keep the QR dominant without a wasteful white card. | QR size is 31% of card height; outer panel padding is 24 px per side; intrinsic QR quiet zone stays four modules. | Implemented |
| `A-SINGLE-CARD-06` | Keep the public hostname attached to the scan group. | Hostname remains 2.5%-6% below the QR panel and inside the portrait safe field. | Implemented |
| `A-SINGLE-CARD-07` | Keep all copy centered and readable. | Initials, business name, optional tagline, CTA, and hostname use the common centered layout helper, one-line preference, two-line maximum, and rendered-glyph bounds tests. | Implemented |
| `A-SINGLE-CARD-08` | Keep Feedback QR governed independently from the Single Table Card. | Single Table Card rules do not leak into Feedback QR; the separately approved Feedback QR conversation composition now applies through its own asset branch. | Implemented |

### Single Table Card acceptance gate

- [x] Full Terracotta Glow artwork still covers the complete card without stretching.
- [x] Existing content veil preserves a calm central copy field.
- [x] Real-logo and initials-fallback paths remain separate and truthful.
- [x] Business name uses the theme display typeface.
- [x] Optional owner tagline replaces redundant scan copy.
- [x] Business-aware CTA is singular, centered, and does not contain `CURRENT`.
- [x] QR panel retains 24 px outer padding and the protected four-module quiet zone.
- [x] Printed hostname is truthful; QR retains the complete destination.
- [x] Missing tagline reflows safely without invented copy.
- [x] Feedback QR remains outside this asset-specific composition and follows its separately approved rulebook.
- [x] Current baseline and revised Terracotta Glow pilot were preserved for visual comparison.
- [x] Equivalent Single Table Card output was regenerated and reviewed across all 47 governed themes.

### Single Table Card cross-theme propagation audit

| Audit boundary | Result | Evidence |
| --- | --- | --- |
| Governed parent-theme catalog | 47 of 47 Single Table Card fixtures rendered from current source. | `output/printable-theme-visual-audit/*-single_table_card.png` |
| Full-background pattern | Every parent theme retains its responsive full-canvas artwork or governed background composition; raster artwork uses aspect-preserving `cover` placement and is never stretched. | `assertPremiumSingleTableCardIdentityAndGeometry` |
| One-face hierarchy | Every theme keeps one logo/initials mark, business name, optional tagline, one business-aware CTA, QR, and truthful hostname without the legacy duplicate instruction. | All-theme source and geometry regression |
| Centering and wrapping | Every centered role stays inside the portrait safe field. One-line readable fitting is preferred, including `SCAN TO VIEW OFFERINGS`; genuinely oversized copy retains the two-line centered fallback. | Rendered-glyph bounds regression across all 47 themes |
| Vertical rhythm | Every theme enforces at least 4.4% tagline-to-CTA breathing room, 2.8%-4.4% CTA-to-QR grouping, and 2.5%-6% QR-to-host spacing. | All-theme geometry regression |
| QR protection | Every theme retains the complete destination, four-module intrinsic quiet zone, and 24 px outer panel padding. | Shared QR contract plus all-theme geometry regression |
| Artwork-heavy themes | Craft Kitchen, Lankan Block Print, Studio Contact Sheet, Maker Ledger, and other edge-art systems keep identity and scan content inside their calm copy fields. | Full-size spot review after the complete contact-sheet pass |
| Dark themes | Japanese Night Luxe, Midnight Gold, Noir Studio, and Sunset Atelier retain readable identity, CTA, hostname, and white QR contrast. | Full-size spot review after regeneration |
| Adjacent Feedback QR | Feedback QR remains on its separately governed conversation/action composition. | Explicit asset-type isolation regression |

Review sheets:

- `output/printable-theme-final-polish/single-table-card/02-all-themes-1-of-3.png`
- `output/printable-theme-final-polish/single-table-card/02-all-themes-2-of-3.png`
- `output/printable-theme-final-polish/single-table-card/02-all-themes-3-of-3.png`
- `output/printable-theme-final-polish/single-table-card/03-baseline-vs-final-pilot.png`

## Counter Sticker - Final rules

### Owner observation and product decision

| Observation | Product decision | Classification | Status |
| --- | --- | --- | --- |
| The oversized accent circle hides too much of the attractive theme artwork. | Preserve each responsive theme background and governed safe field, but remove the generic 92% accent circle. Theme artwork remains visible around the scan hierarchy without sitting behind the QR itself. | Theme-aware asset composition | Implemented across 47 themes |
| The sticker should inherit truthful client identity from the approved assets. | Render the stored client logo when available and truthful business initials otherwise. Keep the mark inside a measured top edge-safe zone. | `G-IDENTITY-01` | Implemented across 47 themes |
| The business name should belong to the selected theme. | Use the parent theme's governed display face with conservative centered one-line fitting and two-line fallback. | Theme-aware typography rule | Implemented across 47 themes |
| `SCAN SERVICES` is abrupt, while the full `SCAN TO VIEW SERVICES` visually competes with the business name. | Because the QR itself already communicates scanning on this close-range format, use the shorter business-aware outcome `VIEW MENU`, `VIEW SERVICES`, `VIEW CATALOG`, or `VIEW OFFERINGS`. Keep it smaller and lighter than the business name, including after name wrapping. | `G-LANGUAGE-01`, `G-CENTER-01` plus Counter Sticker hierarchy rule | Implemented across 47 themes |
| A sticker has less reading time and space than a Table Tent or Single Table Card. | Intentionally omit the optional tagline. Keep only business identity, one action, QR, and recovery hostname. | Counter Sticker content rule | Implemented across 47 themes |
| The QR should dominate without a wasteful white block. | Keep the intrinsic four-module quiet zone, use a QR equal to 40.5% of the square width, and reduce decorative panel padding to 24 px per side. | `G-SCAN-01` | Implemented across 47 themes |
| A failed camera scan still needs a truthful recovery path. | Print only the canonical public hostname below the QR while retaining the complete destination inside the QR. | `G-LINK-01` | Implemented across 47 themes |

### Measured Counter Sticker rules

| Rule | Requirement | Measured enforcement | Status |
| --- | --- | --- | --- |
| `A-COUNTER-STICKER-01` | Preserve the theme artwork as the sticker surface. | Responsive artwork covers the complete 945 x 945 canvas with aspect-preserving `cover` where a full-page master exists; theme-specific safe fields remain above artwork; the legacy 92% accent circle is absent in every family. | Implemented across 47 themes |
| `A-COUNTER-STICKER-02` | Keep truthful identity clear of the die-cut/top edge. | Logo or initials begin at 7.5% of sticker height, use 12% of sticker width, and clear the business name. | Implemented across 47 themes |
| `A-COUNTER-STICKER-03` | Keep the close-range reading sequence minimal. | The composition contains no tagline or duplicate instruction: identity, business name, one CTA, QR, hostname. | Implemented across 47 themes |
| `A-COUNTER-STICKER-04` | Keep the action business-aware, subordinate to the identity, and visually connected to the QR. | CTA removes only the redundant `SCAN TO` prefix from the shared compact label, dynamically caps its font below the fitted business-name size, and keeps 2.8%-4.4% spacing before the QR panel. | Implemented across 47 themes |
| `A-COUNTER-STICKER-05` | Keep the QR dominant and scan-safe. | QR is 40.5% of sticker width; panel adds exactly 24 px on each side; intrinsic quiet zone remains four modules. | Implemented across 47 themes |
| `A-COUNTER-STICKER-06` | Keep the recovery hostname truthful and edge-safe. | Only the canonical hostname is printed; it clears the QR panel and ends above 94% of sticker height. | Implemented across 47 themes |
| `A-COUNTER-STICKER-07` | Propagate only after owner approval and full-matrix review. | All 47 governed families now use the shared close-range composition while preserving their own responsive artwork, palette, safe field, and display typography. | Complete |

### Counter Sticker acceptance gate

- [x] Full Terracotta Glow artwork covers the complete square without stretching.
- [x] Oversized generic accent circle is removed.
- [x] Existing calm content veil remains behind identity and scan content.
- [x] Real-logo and initials-fallback paths remain truthful and exclusive.
- [x] Theme display typography is used for the business name.
- [x] Tagline and duplicate instruction are intentionally absent.
- [x] Short `VIEW ...` CTA is business-aware, centered, visibly smaller than the business name, and connected to the QR.
- [x] QR panel uses 24 px decorative padding and retains the four-module quiet zone.
- [x] Printed hostname is truthful and edge-safe; QR retains the full destination.
- [x] Current baseline and revised Terracotta Glow pilot are preserved for review.
- [x] Owner approved the Terracotta Glow Counter Sticker composition for governed propagation.
- [x] Equivalent Counter Sticker output was regenerated and reviewed across all 47 governed themes.
- [x] Full-size checks covered Botanical Heritage, Craft Kitchen, Japanese Night Luxe, Lankan Block Print, Performance Circuit, and Sunset Atelier in addition to the four complete contact sheets.

## Entrance Poster - Final rules

### Owner observation and product decision

| Observation | Product decision | Classification | Status |
| --- | --- | --- | --- |
| `OUR SERVICES` overpowers the client identity and repeats what the scan action already communicates. | Remove the generic poster headline. Start with truthful client identity and let one scan instruction describe the action. | Entrance Poster content rule | Implemented in pilot |
| The baseline has no client logo or initials. | Render the stored client logo when supplied and truthful business initials otherwise, centered in a top artwork-safe zone. | `G-IDENTITY-01` | Implemented in pilot |
| The business name uses generic typography. | Use the parent theme's governed display face with conservative one-line-first fitting, keeping it stronger than the CTA. | Theme-aware typography rule | Implemented in pilot |
| The poster has room to carry useful brand context. | Include the optional owner tagline below the business name; omit the row and reflow safely when absent. | `G-COPY-01`, `G-REFLOW-01` | Implemented in pilot |
| `Scan to view current services` duplicates the headline and includes an unnecessary status word. | Use one explicit distance-readable business-aware CTA: `SCAN TO VIEW MENU`, `SERVICES`, `CATALOG`, or `OFFERINGS`, without `CURRENT`. | `G-LANGUAGE-01`, `G-CENTER-01` | Implemented in pilot |
| The QR must remain usable from an entrance, doorway, or reception approach. | Keep a large 42%-width QR, retain the four-module intrinsic quiet zone, and reduce only the outer panel padding to 24 px per side. | `G-SCAN-01` | Implemented in pilot |
| The baseline footer exposes a dummy path and competes with lower artwork. | Print only the truthful canonical hostname directly below the QR, leaving the lower decorative field calm. | `G-LINK-01` | Implemented in pilot |

### Measured Entrance Poster rules

| Rule | Requirement | Measured enforcement | Status |
| --- | --- | --- | --- |
| `A-ENTRANCE-POSTER-01` | Preserve an artwork-rich full A4 surface. | Responsive artwork covers the complete 1240 x 1748 canvas with aspect-preserving `cover`; the governed veil remains above artwork and behind all copy. | Pilot implemented |
| `A-ENTRANCE-POSTER-02` | Keep truthful identity clear of the top artwork and trim. | Logo or initials begin at 8.5% of poster height, use 12% of poster width, and clear the business name at 20.5%. | Pilot implemented |
| `A-ENTRANCE-POSTER-03` | Keep the business name as the primary text. | Theme display face uses a 4%-7.2% width-relative font range and remains larger than the CTA; all rendered lines stay centered inside the content field. | Pilot implemented |
| `A-ENTRANCE-POSTER-04` | Use one optional brand line and one explicit scan action. | Tagline appears only when supplied. CTA comes from the shared compact business-aware label and never includes `CURRENT`; the legacy headline and scan-instruction layers are absent. | Pilot implemented |
| `A-ENTRANCE-POSTER-05` | Keep CTA and QR connected while preserving distance readability. | CTA-to-QR panel spacing remains between 2.8% and 5% of poster height. QR is 42% of poster width with exactly 24 px outer padding per side. | Pilot implemented |
| `A-ENTRANCE-POSTER-06` | Keep the recovery hostname truthful and away from lower artwork/trim. | Only the canonical hostname is printed below the QR; the final line ends above 88% of poster height. | Pilot implemented |
| `A-ENTRANCE-POSTER-07` | Propagate only after owner approval and all-theme review. | Every governed family now uses the same identity/CTA/QR structure while retaining its own responsive artwork, palette, typography, and safe field. | Implemented across 47 themes |

### Entrance Poster final acceptance gate

- [x] Full Terracotta Glow artwork covers the A4 poster without stretching.
- [x] Calm content veil remains above artwork and behind copy.
- [x] Real-logo and initials-fallback paths remain truthful and exclusive.
- [x] Redundant `OUR SERVICES` headline is removed.
- [x] Theme display business name leads the text hierarchy.
- [x] Optional owner tagline is truthful and safely omitted when absent.
- [x] One explicit business-aware scan CTA replaces the duplicate legacy instruction.
- [x] Large QR retains 24 px panel padding and the protected four-module quiet zone.
- [x] Printed hostname is truthful; QR retains the complete destination.
- [x] Bottom artwork remains visible and free from redundant copy.
- [x] Current baseline and revised Terracotta Glow pilot are preserved for review.
- [x] Other themes remain unchanged while this pilot awaits approval.
- [x] Owner approved the Terracotta Glow Entrance Poster composition.
- [x] Equivalent Entrance Poster output was regenerated and reviewed across all 47 governed themes.

Review sheet:

- `output/printable-theme-visual-audit/contact-sheet-entrance_poster.png`

## Feedback QR - Final rules

### Owner observation and product decision

| Observation | Product decision | Classification | Status |
| --- | --- | --- | --- |
| `Scan to leave feedback` and `LEAVE FEEDBACK` repeat the same action. | Use one warm, explicit `TELL US HOW WE DID` action. Do not add menu/services wording or a secondary scan instruction. | Feedback QR content rule | Implemented in pilot |
| The baseline uses a placeholder-like initials treatment and generic business typography. | Render the stored client logo when supplied and truthful initials otherwise, then use the selected theme's governed display face for the business name. | `G-IDENTITY-01`, theme-aware typography | Implemented in pilot |
| Omitting the business tagline makes the card less branded than the approved Table Tent and Single Table Card system. | Show the owner's real optional tagline as a quiet supporting line between the business name and feedback action. Omit and reflow the row when no tagline is supplied; never invent one. | `G-COPY-01`, `G-REFLOW-01` | Implemented in pilot |
| Changing only the words makes Feedback QR look like the Table Tent or Single Table Card. | Give Feedback QR its own unmistakable conversation composition: a rounded speech bubble with a tail and one governed Koboyo `review-quote` symbol. Avoid stars, score scales, multiple sentiment faces, and the retired hand-built smile/rays because they can imply rating pressure or add decorative noise. | Feedback-specific theme adaptation | Implemented across 47 themes |
| A functional instruction alone does not explain why the customer should respond. | Use the warmer single action `TELL US HOW WE DID` with one subordinate motivation line, `Your feedback helps us improve.` The motivation explains value without becoming a second CTA or promising an incentive. | Feedback participation hierarchy | Implemented in pilot |
| The baseline QR panel carries more white surround than the code needs. | Preserve the QR renderer's intrinsic four-module quiet zone while reducing only the decorative panel padding to 24 px per side. | `G-SCAN-01` | Implemented in pilot |
| The baseline prints a dummy feedback path. | Encode the complete real feedback URL and print only its truthful hostname as the recovery line. | `G-LINK-01` | Implemented in pilot |
| The Feedback QR should still belong to the owner's selected visual system. | Preserve responsive full-background Terracotta Glow artwork and its calm content veil; keep identity, feedback action, QR, and hostname inside the central safe field. | Theme-aware asset composition | Implemented in pilot |

### Measured Feedback QR rules

| Rule | Requirement | Measured enforcement | Status |
| --- | --- | --- | --- |
| `A-FEEDBACK-QR-01` | Preserve an artwork-rich but scan-safe portrait surface. | Responsive artwork covers the complete 1240 x 1748 canvas with aspect-preserving `cover`; the governed veil remains above artwork and behind all content. | Pilot implemented |
| `A-FEEDBACK-QR-02` | Keep truthful client identity clear of the top artwork. | Logo or initials begin at 9% of asset height, use 12% of asset width, and clear the business name beginning at 21.5%. | Pilot implemented |
| `A-FEEDBACK-QR-03` | Use one feedback-specific action without redundant functional copy. | `TELL US HOW WE DID` is the sole CTA. `Your feedback helps us improve.` is subordinate motivation, not a second action. The legacy scan instruction, `MENU`, `SERVICES`, and `CURRENT` are absent; the optional owner tagline remains brand context. | Pilot implemented |
| `A-FEEDBACK-QR-04` | Keep the business name typographically primary and the tagline subordinate. | Theme display name fits within a 3.8%-6.5% width-relative range and remains larger than both the optional 2.2%-3% tagline and 3.4%-4.6% action. Name-to-tagline spacing is 2.8% of asset height; tagline-to-conversation breathing room is at least 4.4%. Every rendered line stays centered inside the safe field. | Pilot implemented |
| `A-FEEDBACK-QR-05` | Make the feedback invitation distinct without compromising scanning. | A 72%-width rounded speech bubble contains the CTA and motivation. Its tail and locked, theme-coloured Koboyo `review-quote` make the purpose recognizable without forming a rating row or selectable scale. The CTA column clears the symbol, and all decoration ends above the QR panel. Conversation-to-QR spacing remains between 2.8% and 5% of asset height. QR uses 39% of canvas width and exactly 24 px decorative padding per side; the intrinsic quiet zone remains four modules. | Implemented across 47 themes |
| `A-FEEDBACK-QR-06` | Keep the destination truthful and away from lower artwork. | QR encodes the complete feedback URL; only its canonical hostname is printed below it, ending above 86% of canvas height. | Pilot implemented |
| `A-FEEDBACK-QR-07` | Propagate only after owner approval and all-theme review. | Every governed family now uses the same feedback-specific conversation hierarchy while preserving its own artwork, contrast, and safe-field treatment. | Implemented across 47 themes |

### Feedback QR final acceptance gate

- [x] Full Terracotta Glow artwork covers the portrait without stretching.
- [x] Calm content veil remains above artwork and behind content.
- [x] Real-logo and initials-fallback paths remain truthful and exclusive.
- [x] Theme display business name remains stronger than the action.
- [x] One explicit feedback action replaces the redundant instruction/action pair.
- [x] Real optional business tagline supports the identity without becoming a second action.
- [x] Missing tagline removes the row and reflows safely without invented copy.
- [x] Menu/services language does not compete with feedback intent.
- [x] Feedback-specific speech bubble, tail, single friendly smile, and restrained response rays differentiate the asset from menu/service scan cards.
- [x] No five-star row, score scale, multiple sentiment choices, or incentive language pressures the customer toward positive feedback.
- [x] One motivation line explains why feedback is useful without duplicating the CTA.
- [x] All feedback decoration remains outside the QR panel and protected quiet zone.
- [x] QR panel retains 24 px outer padding and the protected four-module quiet zone.
- [x] QR encodes the complete feedback destination; printed hostname remains truthful.
- [x] Centered glyph bounds, safe-field containment, vertical rhythm, and lower-artwork clearance are fail-closed.
- [x] Current baseline and revised Terracotta Glow pilot are preserved for review.
- [x] All themes now use the approved feedback-specific composition without menu/service ambiguity.
- [x] Owner approved the Terracotta Glow Feedback QR composition.
- [x] Equivalent Feedback QR output was regenerated and reviewed across all 47 governed themes.

Review images:

- `output/printable-theme-final-polish/feedback-qr/01-current-baseline.png`
- `output/printable-theme-visual-audit/terracotta-glow-feedback_qr.png`
- `output/printable-theme-visual-audit/contact-sheet-feedback_qr.png`

## Flyer - Final rules

### Owner observation and product decision

| Observation | Product decision | Classification | Status |
| --- | --- | --- | --- |
| The baseline has no client logo, uses generic business typography, and omits the stored tagline. | Apply the shared identity contract: real client logo when supplied, truthful initials otherwise, theme display typography, and the owner's real optional tagline. | `G-IDENTITY-01`, `G-COPY-01` | Implemented in pilot |
| `WEEKEND OFFER`, `SPECIAL OFFER`, and `Limited time · Terms apply` were unsupported synthetic claims. | Remove all invented promotion claims. Accept bounded owner-authored headline, offer, details, validity, and terms fields; when the owner leaves the headline empty, produce a truthful brand-and-scan Flyer with no campaign claims. | Flyer truth boundary | Implemented across 47 themes |
| The baseline QR panel overlaps the offer panel and looks accidental. | Use one contained two-column scan panel with a fixed vertical divider: centered business-aware CTA on the left and a separately protected QR on the right. | Flyer composition rule | Implemented in pilot |
| The baseline CTA and displayed URL do not follow the finalized scan rules. | Use the shared business-aware `SCAN TO VIEW ...` action, retain the complete destination in the QR, and print only the canonical hostname. | `G-LANGUAGE-01`, `G-LINK-01` | Implemented in pilot |
| The Flyer should remain distinct from compact cards and entrance signage. | Use an A5 editorial identity field, generous artwork-rich whitespace, one restrained divider, and one horizontal scan panel rather than reusing the portrait-card stack. | Asset-specific composition | Implemented in pilot |

### Measured Flyer rules

| Rule | Requirement | Measured enforcement | Status |
| --- | --- | --- | --- |
| `A-FLYER-01` | Preserve an artwork-rich A5 Flyer surface. | Responsive Terracotta Glow artwork covers the complete 1748 x 2480 canvas with aspect-preserving `cover`; the calm veil remains above artwork and behind all content. | Pilot implemented |
| `A-FLYER-02` | Keep truthful identity clear of upper artwork and trim. | Logo or initials begin at 7% of Flyer height, use 10.5% of canvas width, and clear the centered business name beginning at 19%. | Pilot implemented |
| `A-FLYER-03` | Keep optional brand context truthful and readable. | Business name uses the theme display face in a 4.2%-7% width-relative range. The owner tagline appears only when supplied, begins 3.2% of Flyer height below the name, and wraps to at most two centered lines. | Pilot implemented |
| `A-FLYER-04` | Never fabricate a promotion. | Campaign mode exists only when a normalized owner headline is present. Headline is capped at 70 characters, offer at 90, details at 180, validity at 60, and terms at 140. Empty headline removes the entire campaign group. The old synthetic offer layers are absent in every theme. | Implemented across 47 themes |
| `A-FLYER-05` | Keep the Flyer composition editorial rather than card-like. | A 30%-width editorial rule separates identity from the campaign field. Brand-only fallback keeps the horizontal scan panel at or below 47.5%; campaign mode reflows it to 66% or below the final supplied line, preserving a calm readable interval. | Implemented across 47 themes |
| `A-FLYER-06` | Keep one readable business-aware scan action. | CTA occupies the left scan column, remains centered, uses a 3.2%-4.6% width-relative font range, contains no `CURRENT`, and wraps only when one readable line cannot fit. Maximum is two centered lines. | Pilot implemented |
| `A-FLYER-07` | Keep scan mechanics protected and truthful. | QR uses 24% of canvas width with exactly 24 px decorative padding per side and retains its intrinsic four-module quiet zone. A fixed divider separates it from CTA copy. The complete canonical destination remains encoded while only its hostname prints below the panel, ending above 86% of Flyer height. | Pilot implemented |
| `A-FLYER-08` | Propagate only after owner approval and all-theme review. | All 47 governed families use the shared truthful identity, optional campaign, scan-panel, QR, and hostname contract while retaining their own responsive artwork and display system. | Implemented across 47 themes |

### Flyer final acceptance gate

- [x] Full Terracotta Glow artwork covers the A5 canvas without stretching.
- [x] Calm content veil remains above artwork and behind content.
- [x] Real-logo and initials-fallback paths remain truthful and exclusive.
- [x] Theme display business name and real optional tagline follow the shared centered-copy rules.
- [x] Unsupported synthetic offer, terms, urgency, discount, and incentive claims are absent.
- [x] Owner campaign fields are normalized, length-bounded, centered, and admitted only for Flyer output.
- [x] Empty campaign headline removes the complete campaign group and preserves a truthful brand-flyer fallback.
- [x] Editorial identity field and horizontal scan panel remain visually distinct from compact cards.
- [x] CTA is singular, business-aware, centered, and limited to two lines at a readable print size.
- [x] CTA, divider, and QR remain in separate non-overlapping scan-panel columns.
- [x] QR panel retains 24 px outer padding and the protected four-module quiet zone.
- [x] QR retains the complete destination; printed hostname remains truthful and path-free.
- [x] Missing tagline removes the row without invented brand or campaign copy.
- [x] Current baseline and revised Terracotta Glow Flyer are preserved for review.
- [x] Desktop and mobile expose the same browser-local owner campaign fields and explicit preview refresh action.
- [x] Owner approved the Terracotta Glow Flyer rulebook composition.
- [x] Equivalent Flyer output was regenerated and reviewed across all 47 governed themes.

Review images:

- `output/printable-theme-final-polish/flyer/01-current-baseline.png`
- `output/printable-theme-visual-audit/terracotta-glow-campaign_flyer.png`
- `output/printable-theme-visual-audit/contact-sheet-campaign_flyer.png`

### Final three-asset cross-theme audit

| Audit boundary | Result | Evidence |
| --- | --- | --- |
| Governed catalog | 141 of 141 current-source fixtures rendered: 47 themes x Entrance Poster, Feedback QR, and Flyer. | `output/printable-theme-visual-audit/contact-sheet-*.png` |
| Identity and copy | All three assets use real logo or truthful initials, theme display business name, optional real tagline, centered one-line-first/two-line-safe copy, and no horizontal text stretching. | `assertAllThemePosterFeedbackAndFlyerRulebookGeometry` |
| QR and recovery | Every output keeps 24 px decorative QR padding, the intrinsic four-module quiet zone, the complete canonical destination, and a path-free hostname recovery line. | All-theme geometry regression plus shared renderer boundary |
| Feedback distinction | Every theme uses one speech-bubble invitation, one friendly smile, one motivation line, and no stars, score scale, rating pressure, or menu/service ambiguity. | 47-theme Feedback QR contact sheet and full-size dark/edge-art review |
| Flyer truth | Campaign content appears only from bounded owner fields. Empty headline produces a clean brand flyer; legacy weekend/special/limited-time claims cannot render. | Input-boundary regression, campaign/fallback all-theme regression |
| Edge-art themes | Craft Kitchen, Ink Vine, Lankan Block Print, Tea Salon Heritage, Studio Contact Sheet, and other artwork-heavy families retain calm protected content fields. | Full-size visual review after the 141-output render |
| Dark themes | Japanese Night Luxe, Midnight Gold, Noir Studio, and Sunset Atelier retain readable copy, panel contrast, and white QR separation. | Full-size visual review after the 141-output render |

## Gift Certificate - Round 1 pilot rules

### Owner observation and product decision

| Observation | Product decision | Classification | Status |
| --- | --- | --- | --- |
| The baseline is a large title, floating initials, one ambiguous line, and a QR rather than a usable certificate. | Rebuild the landscape surface as a restrained two-column certificate: branded write-in area on the left and value/scan utility on the right. Preserve the complete Terracotta Glow artwork and calm veil. | Asset-specific composition | Implemented in pilot |
| Client identity should follow the approved asset rulebook. | Render the real client logo when supplied and truthful initials otherwise, paired with the theme display business name and real optional tagline. | `G-IDENTITY-01`, `G-COPY-01` | Implemented in pilot |
| `Value / valid until` combines unrelated information and provides no recipient context. | Provide separate write-in fields for `PRESENTED TO`, `FROM`, `PERSONAL MESSAGE`, `VALUE`, `VALID UNTIL`, and `CERTIFICATE NO.` | Gift Certificate content rule | Implemented in pilot |
| MenuList does not own a persisted certificate or redemption record. | Allow the owner to enter bounded recipient, sender, message, value, validity, and certificate-number copy in the browser before export, while keeping every omitted field writable after printing. Never invent a currency, amount, date, recipient, certificate number, or redemption capability. | Truth boundary | Implemented across desktop and mobile |
| The baseline QR has no explained purpose and prints a full path. | Use the shortest truthful business-aware discovery action (`VIEW MENU`, `VIEW SERVICES`, `VIEW CATALOG`, or `VIEW OFFERINGS`), encode the complete destination, and print only its canonical hostname. | `G-LANGUAGE-01`, `G-LINK-01` | Implemented in pilot |
| The QR should be useful without dominating the gift itself. | Keep the QR in a dedicated right column with exactly 24 px decorative padding and the intrinsic four-module quiet zone. | `G-SCAN-01` | Implemented in pilot |
| The usable certificate still needs an immediate emotional signal that it is a gift. | Embed the governed Koboyo `gift` symbol into a theme-derived edge composition with soft wrap fields. Remove the hand-built ribbon, bow, parcel, and curl drawing; keep the purpose art behind the frame and outside all functional content. | Gift Certificate ornament rule | Implemented across 47 themes |

### Measured Gift Certificate rules

| Rule | Requirement | Measured enforcement | Status |
| --- | --- | --- | --- |
| `A-GIFT-CERTIFICATE-01` | Preserve a premium artwork-rich landscape certificate. | Every parent theme covers the complete 1748 x 826 canvas through its aspect-preserving background composition; the calm veil, rounded certificate frame, and 65%-positioned column divider remain above the artwork. | Final |
| `A-GIFT-CERTIFICATE-02` | Keep truthful business identity compact and readable. | Logo or initials use 11.5% of canvas height. Business name uses the theme display face with one-line-first/two-line fallback; the real optional tagline reflows the title downward when required. | Final |
| `A-GIFT-CERTIFICATE-03` | Keep the document title important but not overpowering. | `GIFT CERTIFICATE` is capped at 8.6% of canvas height, remains inside the writable column, and clears both the brand lockup and editorial rule. | Final |
| `A-GIFT-CERTIFICATE-04` | Make the printed certificate operational without fabricated data. | Six separate fields appear in a deliberate recipient-to-message and value-to-certificate-number sequence. Each accepts only the bounded browser-local value the owner supplied; an omitted value leaves the writing line blank. The ambiguous combined field and every synthetic amount/date/redemption claim are absent. | Final |
| `A-GIFT-CERTIFICATE-05` | Keep discovery copy truthful and subordinate. | CTA removes redundant scan wording, resolves through shared business context, and remains centered above the QR in the utility column. | Final |
| `A-GIFT-CERTIFICATE-06` | Keep scan and recovery mechanics protected. | QR panel adds exactly 24 px on each side and retains the intrinsic quiet zone. QR stores the full canonical destination; printed recovery copy is hostname-only and clears the lower certificate edge. | Final |
| `A-GIFT-CERTIFICATE-07` | Propagate only after owner approval and complete current-source review. | The owner-approved composition is now the only Gift Certificate layout for all 47 governed parent themes; the former ambiguous legacy layout is removed. | Final |
| `A-GIFT-CERTIFICATE-08` | Communicate gifting without turning the certificate into generic stock collateral. | Every theme owns a deterministic transparent 1748 x 826 overlay generated from its governed colour tokens. Soft wrap fields reach both horizontal edges; locked Koboyo `gift` symbols stay at the perimeter and behind every functional layer. | Final |

### Gift Certificate pilot acceptance gate

- [x] Full Terracotta Glow artwork covers the complete landscape certificate without stretching.
- [x] Calm content veil, rounded frame, and column divider preserve readable structure.
- [x] Real-logo and initials-fallback paths remain truthful and exclusive.
- [x] Theme display business name and real optional tagline reflow without overlap.
- [x] Document title is prominent without overwhelming the business identity or functional fields.
- [x] Recipient, sender, personal-message, value, validity, and certificate-number fields are separate and writable.
- [x] The same bounded optional values reach desktop/mobile preview, PNG, PDF, and customization; omitted fields retain their physical writing lines.
- [x] No amount, currency, date, recipient, certificate number, or redemption capability is fabricated.
- [x] CTA is singular, business-aware, and truthful to the encoded destination.
- [x] QR panel retains 24 px outer padding and the protected four-module quiet zone.
- [x] QR retains the complete destination; printed hostname is path-free and edge-safe.
- [x] Missing tagline removes the row rather than inventing brand copy.
- [x] Current-source Terracotta Glow pilot was regenerated and reviewed at full size.
- [x] Governed Koboyo gift artwork spans the edge composition and keeps every functional field clear.
- [x] Owner approved the Terracotta Glow Gift Certificate composition on September 1, 2026.
- [x] Equivalent Gift Certificate output was regenerated and reviewed across all 47 governed themes.

Review image:

- `output/printable-theme-visual-audit/terracotta-glow-gift_certificate.png`
- `output/printable-theme-visual-audit/contact-sheet-gift-certificate.png`

### Gift Certificate cross-theme propagation audit

| Audit boundary | Result | Evidence |
| --- | --- | --- |
| Governed parent-theme catalog | 47 of 47 current-source Gift Certificate fixtures rendered and reviewed. | `output/printable-theme-visual-audit/*-gift_certificate.png` |
| Self-explanatory gift language | Every theme carries the approved soft edge fields and two theme-coloured Koboyo `gift` placements without placing artwork over the writing or scan fields. | 47 deterministic transparent overlay masters plus the complete contact sheet |
| Theme fidelity | Each overlay is generated from its parent theme's governed accent, border, and soft-accent tokens; theme background art, typography, surface, and contrast remain distinct. | `generate-printable-gift-certificate-overlays.ts` and stale-master regression |
| Functional certificate structure | Every theme keeps truthful identity, optional real tagline, six separate write-in fields, one business-aware discovery action, live QR, and hostname-only recovery. | `assertAllThemeGiftCertificateRulebookGeometry` |
| Text and scan protection | Title and every label remain inside their text boxes; utility content remains in the right column; QR retains 24 px panel padding and the complete canonical destination. | All-theme rendered-glyph, column, QR, and hostname geometry regression |
| Dark and edge-art themes | Japanese Night Luxe, Midnight Gold, Noir Studio, Craft Kitchen, Lankan Block Print, Tea Salon Heritage, and Counter Rush retain readable contrast and clear protected fields at full size. | Full-size spot review after the 47-theme matrix pass |

## Business Card - final cross-theme rules

### Owner observation and product decision

| Observation | Product decision | Classification | Status |
| --- | --- | --- | --- |
| The baseline places identity, personal contact data, business identity, QR, and a scan sentence on one crowded face. | Give each print side one job: a minimal brand-led front and a functional contact/QR back. Preserve the existing protected paired-face export contract. | Asset-specific composition | Complete across 47 themes |
| The baseline can repeat the business name as the contact person and invent `Owner / Manager`, `Phone number`, `Business address`, or `Follow / save / share`. | Limit the contact face to independently optional admitted name, phone, email, and address. Omit and reflow any missing row. Designation and social handle never render on this asset, even if other surfaces store them. | `G-COPY-01`, Business Card truth boundary | Complete across 47 themes |
| The baseline front looks like a compressed information sheet rather than a premium identity object. | Use a strong theme-coloured edge-to-edge identity field, a truthful logo/initials lockup, theme display business name, and real optional tagline. Keep the front free of QR and contact utility. | Brand-front composition | Complete across 47 themes |
| The baseline uses generic circular contact icons and weak hierarchy. | Use one restrained parent-theme-coloured semantic SVG icon followed by its readable value in a disciplined left column. Do not render uppercase field labels, designation, or social handle. | Contact-back hierarchy | Complete across 47 themes |
| `SCAN SAVE VISIT` and `Scan for services` are generic and redundant. | Use one compact business-aware action (`VIEW MENU`, `VIEW SERVICES`, `VIEW CATALOG`, or `VIEW OFFERINGS`) above the QR. | `G-LANGUAGE-01` | Complete across 47 themes |
| The baseline prints a path-heavy recovery link. | Encode the complete canonical destination in the QR and print only its truthful hostname. | `G-LINK-01` | Complete across 47 themes |
| The supplied references use decisive geometric colour fields and clear front/back role separation. | Borrow those principles without copying stock artwork, logos, wording, or exact layouts. The approved original asymmetric composition inherits responsive artwork, palette, display typography, and contrast from each governed parent theme. | Cross-theme visual direction | Complete across 47 themes |

### Measured Business Card rules

| Rule | Requirement | Measured enforcement | Status |
| --- | --- | --- | --- |
| `A-BUSINESS-CARD-01` | Preserve the physical paired-card contract. | The editor canvas retains two locked 1063 x 650 px faces separated by the existing 40 px non-export guide; PDF remains paired and PNG export remains split front/back. Every generated layer stays inside its assigned print frame. | Complete across 47 themes |
| `A-BUSINESS-CARD-02` | Keep the front brand-led and uncluttered. | The front contains the responsive theme background, an edge-to-edge 31%-width accent identity field, truthful logo/initials, theme display business name, and optional real tagline. It contains no QR or personal contact rows. | Complete across 47 themes |
| `A-BUSINESS-CARD-03` | Keep the back operational and truthful. | The back contains a compact business lockup, optional real contact name, and only admitted phone, email, and address rows. Each fact uses one parent-theme-coloured semantic SVG icon in place of a redundant text label. Designation and social handle are excluded. Missing rows collapse without placeholders. | Complete across 47 themes |
| `A-BUSINESS-CARD-04` | Keep discovery useful but subordinate to contact exchange. | A theme-coloured utility field owns one short business-aware action, one live QR, and one hostname-only recovery line. It adapts to declared inset artwork safe fields instead of crossing edge art. | Complete across 47 themes |
| `A-BUSINESS-CARD-05` | Protect scan quality at physical size. | QR uses 32% of the 650 px face height plus exactly 24 px decorative padding per side; the intrinsic four-module quiet zone remains unchanged. | Complete across 47 themes |
| `A-BUSINESS-CARD-06` | Preserve theme identity without stock-template imitation. | Geometry is original, the background and colour fields use governed parent-theme tokens, and functional text/QR zones remain calm. | Complete across 47 themes |
| `A-BUSINESS-CARD-07` | Propagate only after owner approval. | The owner-approved composition is used by all 47 governed parent themes; no theme can fall back to the retired founder/social layout. | Complete |
| `A-BUSINESS-CARD-08` | Print only valid, available contact facts. | Reject placeholder-like names and addresses, malformed email values, and phone values outside the supported printable format; never invent or substitute missing contact data. | Complete across 47 themes |

### Business Card final acceptance gate

- [x] Front and back retain exact protected print frames and split-export compatibility.
- [x] Front is brand-led and contains no QR or personal-contact clutter.
- [x] Back contains one readable contact column and one distinct QR utility field.
- [x] Real client logo replaces initials on both faces when supplied.
- [x] Contact person never falls back to the business name.
- [x] Designation and social handle never render on the Business Card.
- [x] Missing name, phone, email, address, or tagline produces no invented public copy.
- [x] Business-aware action replaces legacy generic scan wording.
- [x] QR encodes the complete destination and keeps 24 px panel padding plus intrinsic quiet zone.
- [x] Printed recovery copy is hostname-only.
- [x] Current baseline and revised current-source Terracotta Glow reference are preserved.
- [x] Source, rendered-glyph, layer-order, frame-containment, logo, minimal-data, QR, icon-theme, and truth regressions pass.
- [x] Owner approved the Terracotta Glow Business Card composition.
- [x] Equivalent theme-aware Business Card adaptations were regenerated and reviewed across all 47 governed themes.

Review images:

- `output/printable-theme-final-polish/business-card/01-current-baseline.png`
- `output/printable-theme-visual-audit/terracotta-glow-business_card.png`

## Staff Name Badge - Final rules

### Owner observation and product decision

| Observation | Product decision | Classification | Status |
| --- | --- | --- | --- |
| The baseline repeats store identity as the staff member and can invent `Owner / Manager`, phone, and address fallbacks. | Require explicit selection of one active current-store staff record. Render only its valid name and a role display name resolved from its per-store role ID; never reuse store contact-person fields or print a raw role ID. | Staff identity truth boundary | Complete across 47 themes on desktop and mobile |
| The staff summary includes an optional historical `profileImage`, but the Assets flow has no governed staff-photo capture or maintenance workflow. | Do not render a fake or stale photo field or imply verified ID binding. Present the owner-facing asset as a Staff Name Badge while retaining the internal `staff_id_card` identifier for compatibility. | Product/data boundary | Complete across 47 themes |
| Phone, address, menu/services URL, and QR do not help visual identification and can expose unrelated contact truth. | Remove them. Keep the badge focused on business identity, staff monogram, staff name, role, and one `STAFF BADGE` purpose label. | Privacy and hierarchy rule | Complete across 47 themes |
| The former photo placeholder implied an input the product cannot collect. | Replace it with a restrained circular monogram derived only from the explicitly supplied staff name, below a lanyard-safe branded header. | Truthful physical-badge composition | Complete across 47 themes |
| No real employee number or credential-verification destination is supplied. | Invent no employee number, certificate number, access state, validity claim, barcode, or QR. | `G-COPY-01` truth rule | Complete across 47 themes |

### Measured Staff Name Badge rules

| Rule | Requirement | Measured enforcement | Status |
| --- | --- | --- | --- |
| `A-STAFF-ID-01` | Respect physical trim and lanyard use. | The 54 x 85 mm portrait canvas reserves a top slot guide at least 2.5% below the trim edge, keeps every functional layer inside the canvas, and clips intentional edge-bleed artwork at export. | Complete across 47 themes |
| `A-STAFF-ID-02` | Keep business identity truthful. | Header uses the real client logo when supplied and truthful initials otherwise, paired with the parent-theme display business name. | Complete across 47 themes |
| `A-STAFF-ID-03` | Do not imply unavailable staff photography. | No photo affordance is rendered; a theme-coloured staff initials monogram appears only when a real staff name is supplied. | Complete across 47 themes |
| `A-STAFF-ID-04` | Admit only real staff identity. | Active, non-disabled, non-deleted records with a valid name and current-store mapping are selectable. Role text renders only when that mapping's role ID resolves to an active role display name; unresolved roles are omitted. | Complete across 47 themes |
| `A-STAFF-ID-05` | Protect privacy and product truth. | No photo affordance, phone, email, address, login ID, social handle, URL, QR, employee/certificate number, access claim, or validity claim is rendered in any theme. Store contact-person data is never used as staff identity. | Implemented across all themes |
| `A-STAFF-ID-06` | Propagate only after owner approval. | All 47 governed parent themes now use the approved premium hierarchy while independently inheriting their artwork, palette, display typography, contrast, and logo treatment; the retired compact fallback is removed. | Complete |

### Staff Name Badge final acceptance gate

- [x] Current baseline is preserved before redesign.
- [x] Lanyard slot, header, monogram field, staff identity, and purpose label have distinct zones.
- [x] Real client logo replaces initials without overlap when supplied.
- [x] No unavailable photo field or verified-credential claim is rendered.
- [x] Desktop and mobile require explicit staff selection; only the selected record's valid name and resolved current-store role render.
- [x] Store contact-person values and raw/unresolved role IDs never enter the badge renderer.
- [x] Phone, address, social handle, URL, QR, and synthetic identifiers are absent.
- [x] Long business and staff names remain within their text boxes.
- [x] Source, rendered-glyph, layer-order, canvas-containment, logo, minimal-data, truth, and all-theme propagation regressions pass.
- [x] Owner approved the Terracotta Glow Staff Name Badge composition and requested cross-theme propagation.
- [x] Equivalent theme-aware Staff Name Badge adaptations were regenerated and reviewed across all 47 governed themes.

Review images:

- `output/printable-theme-final-polish/staff-id-card/01-current-baseline.png`
- `output/printable-theme-visual-audit/terracotta-glow-staff_id_card.png`
- `output/printable-theme-visual-audit/contact-sheet-staff_id_card.png`

## Event Invitation - all-theme rules

### Owner observation and product decision

| Observation | Product decision | Classification | Status |
| --- | --- | --- | --- |
| The rendered review used a fixture event name, date, time, venue, and reply-by date that could be mistaken for real output. | Remove every fixture/default event fact. Admit only bounded owner-entered occasion, date, time, and location values from the current browser session; omitted values retain the branded print-and-write fallback. | `G-COPY-01` truth rule | Implemented across desktop and mobile |
| The former QR and `VIEW EVENT DETAILS` action implied an event destination that MenuList does not own. | Remove QR, hostname, menu/event link, scan action, and response language from the asset. | Capability and destination integrity | Pilot corrected |
| Invitation must still feel like a first-impression asset. | Use one locked Koboyo May garland as ceremonial top artwork, followed by separate real business identity, optional real tagline, and a calm protected writing field. Preserve source provenance and recolour the ornament from the selected parent theme. | Self-explanatory asset-purpose rule | Pilot refined |
| The corrected physical form was truthful but still felt static and plain. | Use locked Koboyo flowers at the upper perimeter with a restrained arch and small geometric details. Remove the disliked hand-built bottom floral/flourish treatment; use one small reduced-opacity Koboyo celebration burst below the writing panel as the only closing motif. | Purposeful artwork rule | Pilot refined |
| Owners need a usable card whether they type details before export or write them after printing. | Provide `OCCASION`, `DATE`, `TIME`, and one full-width `LOCATION` field. Print only bounded owner-entered values; keep each omitted field blank and writable. Venue/address remain one answer rather than separate redundant fields. | Physical usability | Implemented across desktop and mobile |
| Decorative top artwork must not consume or impersonate the client identity. | Keep May garland, real logo/truthful initials, and business name in three centered non-overlapping rows. Never place the logo inside the ornament. | Identity separation | Pilot refined |
| The ordinary OBP/menu/services page is not an event-detail destination. | Keep the physical invitation free of QR, hostname, and OBP link unless MenuList later owns a governed event-specific destination. | Destination integrity | Pilot confirmed |
| The all-caps purpose felt mechanical, and the tall side botanicals read as tree structures. | Use a readable title-case italic display treatment for `You're invited`; replace tall branches and the former floral flourish with restrained upper flower groups and one compact celebration mark from the same governed visual family. | Typography and artwork refinement | Pilot refined |
| Existing governed icon libraries already contain clearer purpose symbols than hand-built approximations. | For a self-explanatory printable motif, first prefer one reviewed library and one semantic icon family per asset. Apply theme colour, preserve aspect ratio, keep it locked inside the finished composition, retain source/licence provenance, and never expose third-party artwork as a picker, stock library, extractable layer set, or standalone download. Use custom artwork only when the governed library has no suitable symbol. | Governed artwork-source rule | Pilot implemented |

### Measured Event Invitation rules

| Rule | Requirement | Measured enforcement | Status |
| --- | --- | --- | --- |
| `A-INVITE-01` | Keep one clear first-impression sequence. | Across every governed theme, locked Koboyo May garland, separate real business identity, optional real tagline, one title-case `You're invited` purpose statement, occasion line, and protected detail panel occupy separate vertical zones. | Complete across 47 themes |
| `A-INVITE-02` | Use no sample event facts. | The shared renderer and fixtures contain no default event name, date, time, venue, address, reply date, launch claim, or special-occasion value. Only bounded owner-entered runtime values may fill the four fields. | Complete across 47 themes |
| `A-INVITE-03` | Keep physical fields useful. | Occasion uses one wide line; date and time use two equal columns; one `LOCATION` label governs one generous full-width writing line inside the protected panel. Owner-entered values sit above their lines; omitted values leave the lines writable. Separate venue, address, and continuation fields are absent. | Complete across 47 themes |
| `A-INVITE-04` | Exclude irrelevant digital actions. | Invitation renders no QR, hostname, menu/event URL, scan action, event-details action, reply request, or RSVP claim. | Complete across 47 themes |
| `A-INVITE-05` | Preserve print-safe hierarchy. | A6 artwork remains behind a 92%-height stationery field; every label clears its line; all writing lines and text remain inside their protected fields and canvas. | Complete across 47 themes |
| `A-INVITE-06` | Propagate only after approval. | The owner-approved premium composition is the only Event Invitation renderer path. All 47 parent themes retain their own responsive background artwork, palette, contrast, border treatment, and display typography. | Complete across 47 themes |
| `A-INVITE-07` | Use artwork to frame, never obstruct, the invitation. | One full-canvas vector layer uses `cover` fitting with no non-uniform scaling, declares `data-copy-safe-center` and its Koboyo source, and remains above the stationery field but below identity, purpose, and complete write-in panel. Flower groups stay at the upper perimeter; tall branch/tree silhouettes and lower floral/flourish decoration are absent. One compact celebration burst is centered below the panel, remains inside the stationery field, and uses reduced opacity. | Complete across 47 themes |
| `A-INVITE-08` | Use ceremonial typography without sacrificing clarity. | `You're invited` uses title case, a premium Bodoni/Didot/Georgia fallback stack, restrained italic styling, low tracking, and centered glyph-safe bounds. | Complete across 47 themes |

### Event Invitation all-theme acceptance gate

- [x] Fixture event name, date, time, venue, and reply-by copy are removed.
- [x] QR, hostname, event/menu URL, and `VIEW EVENT DETAILS` are removed.
- [x] Occasion, date, time, and location accept only bounded owner-entered runtime values; every omitted value remains a physical write-in field, and location uses one generous full-width line.
- [x] Desktop and mobile use the same admitted preview/download/customization contract, and project changes clear the local drafts.
- [x] Real client logo replaces initials without overlap when supplied.
- [x] Optional business tagline renders only when supplied.
- [x] Every field label clears its writing line.
- [x] No private-event, launch, special-evening, reply, destination, or RSVP fact is invented.
- [x] Every parent theme's artwork, identity motif, and writing panel remain separate and print-safe.
- [x] Locked, source-traceable Koboyo artwork frames the invitation without crossing identity, purpose, occasion, or write-in content.
- [x] Tall branch-like structures and the bottom floral/flourish decoration are removed; restrained upper flowers and one small closing celebration burst provide invitation-specific decoration.
- [x] Third-party artwork remains theme-coloured, aspect-preserved, composition-bound, and unavailable as a picker or standalone download.
- [x] `You're invited` uses a centered premium italic display treatment.
- [x] No OBP/menu/services link is substituted for a missing event-specific destination.
- [x] Source, hardcoded-fixture, no-QR/action, rendered-glyph, line, layer-order, canvas, logo, and complete-registry regressions pass.
- [x] Owner approved the corrected Terracotta Glow Event Invitation and requested propagation to all parent themes.
- [x] Equivalent theme-aware Event Invitation adaptations were regenerated and reviewed across all 47 governed themes.

Review image:

- `output/printable-theme-visual-audit/terracotta-glow-event_invitation.png`
- `output/printable-theme-visual-audit/contact-sheet-event_invitation.png`

## Final delivery workflow acceptance gate

- [x] Runtime field changes have a visible unapplied state.
- [x] Download, mobile Share/Save, and desktop editor entry refresh the current input into a successful preview before proceeding.
- [x] Preview failure is recoverable through Retry and cannot silently continue to output.
- [x] A synchronous operation lock prevents double generation and dismissal races across desktop, mobile, and reusable asset modals.
- [x] Business Card image output is one ZIP containing the separate front and back PNG files; PDF behavior is unchanged.
- [x] Shared Product Tag/Campaign Poster editor changes are protected by discard confirmation and `beforeunload`.
- [x] Mobile native sharing uses the prepared local file and falls back to download only when file sharing is unsupported.
- [x] Gift Certificate and Invitation state their non-goals beside the fields.
- [x] Business Card, Staff Badge, Product Tag, and Print Menu disclose the source data used and its recovery surface.

## Postcard - current-source premium rules

### Owner/customer job and product decision

| Observation | Product decision | Classification | Status |
| --- | --- | --- | --- |
| The baseline hardcoded `THANK YOU`, a generic note, and `SCAN FOR LATEST`, so exports could assert a campaign the owner never created. | Use one bounded owner headline and optional message on desktop and mobile. With no headline, export a clean brand postcard without synthetic promotion. | `G-COPY-01` truth rule | Complete across all 47 themes |
| The baseline looked like two unrelated boxes rather than one premium handout. | Use one calm stationery field with an asymmetric identity/message column and a wider protected scan-action field. | Asset-specific composition | Complete across all 47 themes |
| The asset has no governed postal-address or recipient workflow. | Treat Postcard as a single-sided local handout, not a fake two-sided postal mailer. Do not invent recipient, stamp, address, offer, date, or terms fields. | Capability boundary | Complete |
| The scan language was generic and could be wrong for the business. | Use the shared shortest business-aware action: `VIEW MENU`, `VIEW SERVICES`, `VIEW CATALOG`, or `VIEW OFFERINGS`. | `G-LANGUAGE-01` | Complete across all 47 themes |
| A postcard/stamp icon merely labels the medium, while a human gratitude figure breaks the otherwise face-free asset language. | Use three locked, low-emphasis Koboyo `flower` illustrations as a compact horizontal appreciation row beneath the owner message. The floral-gift cue communicates warmth without inventing a promotion, rating, or event. | Governed artwork-source rule | Complete across all 47 themes |
| Side-by-side logo, business name, and tagline make the top read like a business card and compete with the owner message. | Use a centred three-row identity lockup: real logo or truthful initials, business name, then optional real tagline. Dynamically move the message divider below wrapped identity content. | Postcard identity hierarchy | Complete across all 47 themes |

### Measured Postcard rules

| Rule | Requirement | Measured enforcement | Status |
| --- | --- | --- | --- |
| `A-POSTCARD-01` | Render only truthful public content. | Owner headline is required to activate message content and is bounded to 70 characters; optional message is bounded to 180. Empty headline removes both content layers. Values are admitted only for `postcard` and persist while the parent theme changes. | Complete across all 47 themes |
| `A-POSTCARD-02` | Keep identity clear and theme-aware. | Real logo replaces initials; missing logo uses truthful business initials. Business name uses the theme display family and optional tagline renders only when supplied. | Complete across all 47 themes |
| `A-POSTCARD-03` | Separate editorial copy from utility. | Owner copy stays inside a protected left field and ends before the widened 34%-wide scan panel. An editorial rule and measured vertical gaps separate identity, headline, and message. | Complete across all 47 themes |
| `A-POSTCARD-04` | Never distort long text. | Business name, tagline, headline, message, CTA, and hostname use bounded font fitting and word-boundary wrapping; no horizontal scaling or stretching is allowed. | Complete |
| `A-POSTCARD-05` | Protect scan and recovery. | QR retains its complete canonical destination and intrinsic four-module quiet zone; every theme adds exactly 12 px decorative panel padding on every side. Recovery copy is the path-free business hostname. | Complete across all 47 themes |
| `A-POSTCARD-06` | Preserve parent-theme identity. | Every registered theme supplies its own responsive aspect-preserved artwork, colour, and display typography behind the shared Postcard structure. | Complete across all 47 themes |
| `A-POSTCARD-07` | Use the governed current source for every theme. | Desktop preview, download, and editor entry bypass stale platform-template documents for every Postcard theme; mobile applies the same asset-level rule. | Complete across all 47 themes |
| `A-POSTCARD-08` | Keep appreciation artwork emotionally legible, face-free, subordinate, and isolated. | Three Koboyo `flower` layers use `contain`, theme accent colour, 32-42% opacity, and one shared bottom baseline below owner copy. They stay inside the stationery field, clear the scan panel, preserve source provenance, and appear in all 47 themes. A fail-closed check rejects human/face artwork in every theme renderer. | Complete across all 47 themes |
| `A-POSTCARD-09` | Keep business identity deliberate and vertically ordered. | Real logo or truthful initials, business name, and optional real tagline occupy three independent centred rows. Both logo and initials variants share the business-name centre; every row clears the next, and the final identity row clears the message divider. | Complete across all 47 themes |
| `A-POSTCARD-10` | Keep the identity stack on one visual axis. | The editorial divider is centred within the same identity column as logo/initials, business name, and tagline; all-theme geometry allows at most 2 px centre variance. | Complete across all 47 themes |
| `A-POSTCARD-11` | Avoid redundant framing. | The shared translucent stationery field uses transparent zero-width stroke. Parent-theme background artwork remains the only outer visual frame. | Complete across all 47 themes |
| `A-POSTCARD-12` | Demonstrate the real public-host contract. | Visual fixtures normalize reserved `.example` inputs to `subdomain.menulist.online` and fail closed if the displayed `Short link` still contains `.example`. Runtime continues to use the admitted project URL. | Complete across all 47 themes |

### Postcard current-source acceptance gate

- [x] Legacy hardcoded thank-you, generic note, and latest-scan copy are removed from every theme.
- [x] Desktop and mobile expose the same headline/message draft and explicit preview refresh for every Postcard theme.
- [x] Empty headline exports no headline or supporting message.
- [x] Real logo replaces initials; no MenuList logo impersonates the client.
- [x] Optional tagline renders only when available.
- [x] Owner message and scan action remain in separate non-overlapping fields.
- [x] Long copy wraps without horizontal distortion and rendered glyphs remain in their boxes.
- [x] CTA uses the shared business-aware label system.
- [x] QR retains its intrinsic quiet zone, 12 px decorative padding, and the complete canonical destination in every theme.
- [x] Printed recovery copy is hostname-only.
- [x] No recipient, address, postage, offer, expiry, discount, or terms fact is invented.
- [x] Koboyo policy records one purposeful face-free `flower` source for Postcard; its three-layer row remains locked, source-provenanced, theme-coloured, and isolated from every other asset.
- [x] Input, UI, fallback, logo, layer-order, text, scan, canvas, static-verifier, all-theme coverage, and cross-asset isolation regressions pass.
- [x] All 47 current-source Postcard fixtures were regenerated and reviewed together.
- [x] Parent-theme switching preserves the shared structure and owner content while changing artwork, colours, and typography.
- [x] Owner approved the Terracotta Glow pilot and requested propagation to all themes.
- [x] Divider, logo/initials, business name, and tagline share one horizontal centre across every theme.
- [x] The redundant shared outer stroke is removed without removing the theme artwork or protected contrast field.
- [x] Regenerated samples show the `menulist.online` tenant-host pattern and no displayed `.example` link.

Review images:

- `output/printable-theme-visual-audit/terracotta-glow-postcard.png`
- `output/printable-theme-visual-audit/contact-sheet-postcard.png`
