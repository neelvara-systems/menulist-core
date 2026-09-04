# Printable Asset Templates - Test Cases

> **Last Updated:** September 4, 2026

## Automated Checks

| Check | Expected |
| --- | --- |
| `node scripts/verification/verify-printable-asset-templates.js` | Verifies the 47-theme renderer catalog, 34 common families, five food-category families, eight exact-business-type families, canonical business SSOT use, save rejection boundary, required asset support, Flyer campaign/fallback contract, QR safety constants, nav route contract, and Creative Editor Template Registry integration. |
| `npx tsx scripts/verification/test-printable-asset-delivery.ts` | Verifies single files remain single, multi-file Business Card images become one ZIP with both expected entries, archive names are safe, and empty delivery fails closed. |
| `npm run test:printable-asset-style-preferences` | Verifies 34-theme common availability across every category, all seven category recommendation mappings, five food-category families, eight exact-type families, restricted-theme non-leakage, unknown-type behavior, conflicting stored context handling, dormant ineligible fallback, rejected ineligible saves, legacy alias migration, and uniform Menu Kit resolution. |
| `npx ts-node --compiler-options '{"module":"CommonJS","target":"ES2022"}' -r tsconfig-paths/register scripts/verification/test-printable-theme-artwork.ts` | Verifies every production theme owns governed artwork; preserved-aspect placement, translucent veils, centered glyph bounds, and QR/hostname containment remain safe across all 47 themes. The complete 15-asset Koboyo suitability policy must cover every asset exactly once. Feedback QR requires its locked rating-neutral Koboyo `review-quote`, copy clearance, protected QR separation, source provenance, and absence of stars, score solicitation, or the retired hand-built smile. Gift Certificate requires the governed Koboyo `gift` source inside every current per-theme transparent master and fails closed when a master is stale against its colour tokens. |
| `npm run verify:menu-card-export` | Existing print/menu export safeguards still pass. |
| `npx ts-node --compiler-options '{"module":"CommonJS","target":"ES2022"}' -r tsconfig-paths/register scripts/verification/render-printable-theme-visual-fixtures.ts` | Generates and validates 611 governed compact-asset fixtures: all 47 themes across all 13 editor-renderable asset types. `PRINTABLE_THEME_FILTER` and `PRINTABLE_ASSET_FILTER` permit focused visual review without weakening the default full matrix. |
| `npx ts-node --compiler-options '{"module":"CommonJS","target":"ES2022"}' -r tsconfig-paths/register scripts/verification/render-menu-card-visual-fixtures.ts` | Generates one complete multipage service/menu PDF for every governed theme so every page can be reviewed for contrast, artwork overlap, pagination, aligned pricing, and the closing contact page. |
| Focused ESLint | New asset template library, desktop route, mobile shell screen, and touched generators pass. |
| TypeScript | `npx tsc --noEmit --incremental false` passes. |
| `git diff --check` | No whitespace errors. |

## Desktop QA

| Scenario | Expected |
| --- | --- |
| Nav item | `Assets` appears immediately after `Use MenuList`. |
| Route | `/assets` opens dedicated asset dashboard. |
| Desktop page header | The redundant `Assets` eyebrow is absent. Your Brand Kit, its supporting copy, and the current menu selector share one responsive row without overlap. |
| Brand Kit hero | One opaque elevated card contains a coordinated six-asset bento preview (Print Menu, Table Tent, Feedback QR, Entrance Poster, Gift Certificate, and Business Card), truthful ten-file Complete Kit count, Download complete kit, and Change brand look before the asset browser. No duplicate theme-name/description column consumes preview space. Every bento preview is a keyboard-accessible asset button with a visible preview cue; click, Enter, or Space selects that exact asset and opens its existing preview/download modal. |
| Purpose groups | Place in your business, Promote & share, and Business identity expose the complete 14-item general Assets catalog exactly once; Product Tag remains absent. Changing groups selects the first asset in that group and refreshes the focused preview. |
| Focused asset workspace | The asset browser and selected preview share one opaque elevated card over the app background. Purpose tabs use meaningful icons and a distinct selected treatment. A short `Choose an asset` header explains the interaction and reports the visible asset count. Every asset is an individually bounded card with one left-aligned icon/copy axis, compact size and readiness pills, and a directional chevron. Pointer hover lifts the row and coordinates its border, shadow, icon, and chevron; pressed, keyboard-focus, and primary-tinted selected states remain distinct. Activating an asset row selects it and updates the large preview without opening a modal; activating the large preview opens the modal. The selected row uses one symmetric border with no extra left rail. The selected details still expose size/readiness, direct supported-format downloads, Preview & edit, and the inherited-theme note. Purpose-tab changes select the group's first asset without unexpectedly opening a modal. Table Tent is the default when no valid asset query is supplied. |
| Unified asset-card interaction | Brand Kit bento items and the large selected-asset preview open the same desktop preview/download modal with the focused asset, inherited parent theme, formats, and guarded editor path. Purpose-list cards remain selection-only so browsing does not repeatedly interrupt the owner. No entry routes to a duplicate preview surface. Feedback QR may be inspected before setup, but modal download/customize actions remain disabled and recovery links to Feedback settings. |
| Theme library | Change brand look opens a full-viewport searchable library with only the modal title as its heading. The fixed header/footer frame stays visible around the independently scrollable workspace, and underlying dashboard controls cannot cover it. Recommended shows only the active/recommended eligible subset; All themes shows the full business-eligible set. Desktop presents theme choices beside a sticky six-asset bento using the same representative set as the Brand Kit home; compact layouts stack that preview before the catalog. Clicking a non-current theme refreshes the complete bento without saving and marks only that card Previewing. Clicking the same pending card again deselects it and restores the Current theme preview. Every theme preview occupies the full card width and its centered name sits below without horizontal competition. The applied family keeps a green Current badge, border, and state tint through hover; a different pending card keeps a light-blue border and tint through hover; neutral cards use a restrained light hover border and surface shade. A pending theme cannot impersonate applied state. Long names wrap within the caption row. The footer identifies the real selected menu, the primary action says Apply to the real menu name, Close is independently available at the bottom, and Apply to all menus plus return-to-business behavior retain the existing guarded preference writes. While a preference write is pending, bottom Close, header Close, backdrop dismissal, and Escape dismissal are all unavailable; they recover together after success or failure. |
| Mobile theme inspection | Asset Theme cards remain horizontally readable and do not save on tap. Current keeps a green border/tint, pending keeps a primary light-blue border/tint, and tapping the same pending card deselects it. The same six governed assets render in a compact bento before explicit **Apply to this menu** or **Apply to all menus** actions become available. Project switching and a successful save clear pending preview state. |
| Business-profile readiness | Desktop and mobile dashboard use the same eight-field overall model; an individual non-contact asset uses the four-field identity model; Business Card uses all eight fields. Store/location name alone never falsely completes shared brand name, and country alone never falsely completes a usable business address. |
| Inline business-profile editor | Authorized owners can edit canonical brand/location identity, prepared logo, localized tagline, and applicable public contact fields in the modal/sheet. Save updates store plus tenant name when needed and immediately refreshes the open preview; clearing the active-language tagline persists its removal, hidden contact fields are neither validated nor rewritten for identity-only assets, and no Assets-only profile is persisted. |
| Business-profile safety | Invalid email, absent required names, duplicate save, close while busy, and unsaved dismissal fail safely. Users without `MANAGE_STORE` cannot open the editor. |
| Project selector | Multiple projects can be selected before download, and URL/feedback/last modified metadata follow the selected project. |
| Asset rail | Print Menu, Table Tent, Single Table Card, Counter Sticker, Entrance Poster, Feedback QR, Flyer, Gift Certificate, Business Card, Staff Name Badge, Invitation, Postcard, Campaign Poster, and Complete Menu Kit appear. Product Tag is intentionally absent because it requires a source item. |
| Template count | Every renderer supports the same 47 parent themes; owner selectors show the same business-eligible subset for every asset without hiding any eligible family. |
| Common catalog | Thirty-four themes are visible and saveable for all business types, including `Other` and unknown legacy values. |
| Food category | Craft Kitchen, Ember House, Coastal Table, Sunday Table, and Counter Rush appear for canonical food businesses and `Other` with explicit `food`; none appear for non-food businesses. |
| Non-food categories | Service, retail, professional, creative, health, and specialty still prioritize their relevant common directions, but all 12 directions remain visible and saveable across every business category. |
| Coffee types | Roastery Ledger appears only for exact `Cafe`, `Coffee Shop`, and `Specialty Coffee Shop`, and resolves first for those businesses. |
| Bakery types | Patisserie Conservatory appears only for exact `Cake Shop` and `Bakery`, and resolves first for those businesses. |
| Ice cream type | Gelateria Riviera appears only for exact `Ice Cream Shop`, and resolves first for that business. |
| Salon / beauty types | Salon Atelier and Petal Studio appear only for exact canonical `Salon` and `Makeup Studio`; Pearl Veil, Terracotta Glow, and Glasshouse Garden remain common but stay in the five-theme Salon/Makeup Studio recommendation set. |
| Spa types | Ritual Sanctuary and Eucalyptus Retreat appear only for exact canonical `Spa` and `Spa Resort`; Mineral Spring, Lotus Stillness, and Sunlit Ritual remain common but stay in the five-theme Spa recommendation set. |
| Fitness types | Performance Circuit appears only for exact canonical `Gym`, `Fitness Center`, `Fitness Bootcamp`, and `Personal Trainer`. |
| Canonical category conflict | A concrete `Restaurant` remains Craft Kitchen-eligible even if a stale stored category says service; a concrete `Salon` cannot receive Craft Kitchen from a stale `food` category. |
| Preview | Template modal/sheet automatically shows a generated output preview using real store/logo/color/URL and no embedded PDF viewer. |
| Flyer content | Desktop and mobile accept the same bounded headline/offer/details/validity/terms draft, refresh preview explicitly, show campaign layers only with a real headline, and otherwise export the clean brand-flyer fallback. No value leaks to another asset type. |
| All-theme Postcard rulebook | Desktop and mobile expose the same bounded owner headline and optional message whenever Postcard is selected, and switching among all 47 themes preserves that content. Preview/download/customize always use the current shared renderer. Empty headline produces no headline or message. Real logo or truthful initials, business name, optional real tagline, and the short editorial divider share one horizontal centre and clear each other vertically. The translucent stationery field has zero stroke so it does not double-frame the parent artwork. Three locked Koboyo `flower` illustrations inherit each theme accent and form one face-free horizontal appreciation row below owner copy; every flower stays inside the stationery field, outside the scan field, aspect-ratio safe, source-provenanced, and visually subordinate. Their bottom edges share one baseline and no human/face source is rendered. Long text wraps without horizontal stretching; the wider scan column keeps 12 px decorative QR padding outside the intrinsic quiet zone, the complete canonical destination, and hostname-only recovery. Visual fixtures reject displayed `.example` links and use the `subdomain.menulist.online` pattern. No content or artwork leaks to another asset type, and no theme can restore the retired hardcoded postcard. |
| Gift Certificate runtime details | Desktop and mobile expose the same bounded recipient, sender, message, value, valid-until, and certificate-number fields. Supplied values survive parent-theme browsing and appear in preview/download/customize. Every value clears its label and stays above its writing line, including a two-line message. Empty fields preserve write-in lines, project changes clear the draft, and the object cannot leak into another asset. |
| Invitation runtime details | Desktop and mobile expose the same bounded occasion, date, time, and location fields. Supplied values survive parent-theme browsing and appear in preview/download/customize. Height-aware fitting keeps both short and maximum-length values between their labels and writing lines. Empty fields preserve write-in lines, project changes clear the draft, and the object cannot leak into another asset. |
| Format actions | Single printable assets offer separate PDF and image downloads. Business Card image action delivers one ZIP containing separate front and back PNG files. Complete Menu Kit stays ZIP-only. |
| Customize action | Table Tent, Single Card, Counter Sticker, Entrance Poster, Feedback QR, Flyer, Gift Certificate, Business Card, Staff Name Badge, Invitation, Postcard, and Campaign Poster show **Customize in editor** on desktop. Product Tag exposes the equivalent preview/edit/image/PDF flow from the saved item editor on desktop and mobile. Business Card opens front and back faces in one canvas and image export packages both side images into one ZIP. Print Menu and Complete Menu Kit do not. |
| Runtime preview truth | Editing Flyer, Poster, Postcard, Gift, or Invitation fields shows an unapplied-changes status. Download, Share, and Customize regenerate the preview from the exact current draft before continuing. |
| Preview recovery | A preview error exposes Retry and keeps every output/editor action disabled until a real preview succeeds. |
| Operation locking | A synchronous guard prevents double-tap generation. Inputs, competing actions, modal/sheet dismissal, Escape, and backdrop close remain unavailable while preview/output is active. |
| Shared editor dirty guard | Product Tag/Campaign Poster shared workflow warns before discarding a changed editor document and registers `beforeunload`; unchanged documents close directly. |
| Source summaries | Every asset names its saved business-profile readiness and offers inline correction when authorized. Business Card also names each public contact field it will use, Staff Badge identifies the selected record, Product Tag summarizes item fields/options/QR source, and Print Menu identifies the selected menu source. |
| Capability boundaries | Gift Certificate states that it has no balance/redemption/validity tracking; Invitation states that it has no RSVP or guest-registration workflow. |
| Mobile Share/Save | Native share receives the generated PDF/image; Business Card receives one ZIP; unsupported sharing downloads the same prepared file; user cancellation shows no false success. |
| Product Tag source truth | A saved item builds the tag from its localized name, optional description, display price, and active named options. Unpriced options remain visible, inactive/nameless options are excluded, and a first-three summary plus exact remaining count uses neutral `Options` wording. `VIEW DETAILS` and the QR open that exact item using `?item={id}` on the canonical tenant URL. Missing item identity or tenant URL fails closed. |
| Product Tag unsaved draft | Product Tag remains visible but disabled while the desktop or mobile item editor has unsaved changes, with a save-first explanation. After save, the same action becomes available from the persisted item. |
| Product Tag theme inheritance | Project theme override resolves first, followed by business theme and the governed recommendation. Changing the parent theme preserves the item content and applies the same theme family used by the other assets. |
| Product Tag catalogue boundary | Product Tag remains renderable and editable but is absent from the desktop/mobile general Assets catalogue and from Complete Menu Kit. |
| Campaign Poster manual truth gate | Desktop and mobile Assets keep Campaign Poster available, share the bounded campaign fields, preserve content while themes change, and block edit/download until a real headline exists. No placeholder offer, urgency, event, or destination is printed. |
| Campaign Poster Today source | Desktop/mobile Today `print_poster` builds from the existing current-project campaign and selected parent theme. An item campaign resolves the current localized name plus optional localized description from the already loaded selected project and uses the existing exact `?item=` URL; a general campaign uses the selected customer page. Missing/hidden/unavailable items, missing project/store, cross-project campaigns, dummy URLs, or non-HTTPS destinations fail closed. No extra project read is added. |
| Campaign Poster completion | Opening, editing, navigating, or closing the modal does not mark Today handled. A successful PNG/PDF download invokes the existing campaign completion flow; a completion failure is reported separately from the downloaded file. |
| Campaign Poster placement | Campaign Poster stays in Assets and Today. It is not duplicated in item PDP and creates no poster collection, generated-artifact upload, or per-poster style preference. |
| Campaign Poster Featured-choice entry | Desktop Featured-section modal and mobile Featured-choices sheet expose poster download for saved explicit Featured, Quick, and Value pins. Each uses the existing business-aware public label, current localized item name/optional description, selected parent theme, and exact-item QR destination. Automatic, unsaved, disabled, missing, hidden, unavailable, or linkless choices fail closed. Opening or downloading from this settings context does not mutate campaign completion state. |
| Campaign Poster all-theme propagation | Every governed parent theme uses the approved poster-specific renderer. No theme may fall back to the Flyer scan panel or restore the retired Terracotta-only pilot branch. |
| Campaign Poster pilot hierarchy | Real logo/initials, business name, and optional tagline form a compact centered header. Campaign headline and optional offer/item are more prominent; there is no invented claim, central plain content box, or redundant outer border. |
| Campaign Poster scan group | Business-aware CTA uses one centered line when safe, QR is 26% of A4 width with exactly 24 px decorative padding per side, and the canonical hostname follows it inside one centered vertical group. The outer group is invisible, borderless, and shadowless; only the QR keeps its scan-safe quiet-zone panel. No two-column divider or horizontal compression remains. |
| Campaign Poster long copy | Maximum admitted headline, offer, details, validity, terms, business name, tagline, CTA, QR, and hostname reflow without overlap or off-canvas text; every text line remains horizontally centered. |
| Customize editor | The fullscreen editor opens from the selected template, QR/link source layers are locked, editable copy can change, no MenuList attribution layer appears in the editor canvas, and Image/Print PDF download uses the latest edited document. |
| Business Card frame protection | Business Card generated structure layers show as protected/locked, cannot be unlocked, deleted, duplicated, copied, grouped, or dragged in Layers, and canvas size presets are disabled. |
| Business Card split safety | Moving editable front/back copy near or beyond the face boundary still exports front and back PNG files with each layer clamped into its assigned face. Newly added layers are assigned to the nearest face at export time; the side divider never appears in downloads. |
| Business Card premium rulebook | Every governed theme uses a QR-free brand front and a contact/QR back. Real logo replaces initials on both faces. Only available name, phone, email, and address render; phone, email, and address have one semantic SVG icon in the selected parent-theme accent and no redundant uppercase label. Designation and social handle remain absent even when supplied. Missing contact or tagline data removes that row without invented fallback copy. QR keeps 24 px panel padding, the complete destination, and hostname-only recovery. Every layer remains within its protected print face and inset theme safe fields. |
| Staff Name Badge all-theme rulebook | Desktop and mobile require explicit selection of one active current-store staff record. Every governed theme reserves a trim-safe lanyard slot and branded header, shows the real business logo or initials, derives one central staff monogram from the selected record name, and prints a role only after its per-store role ID resolves to an active role display name. Store contact-person fields, unresolved role IDs, placeholder names, inactive/disabled/deleted records, photo affordances, phone, email, address, login ID, URL, social handle, QR, synthetic employee/certificate numbers, and credential claims remain absent across every theme. Long business and staff names stay within their declared boxes, functional layers remain canvas-contained, and the complete 47-output visual matrix preserves each parent theme's artwork and contrast. |
| Event Invitation all-theme rulebook | Every governed parent theme uses the approved responsive composition: a locked, aspect-preserved Koboyo May garland; separate real-logo-or-truthful-initials row; real business name; optional real tagline; one readable title-case italic invitation-purpose statement; optional admitted occasion/date/time plus one full-width location value above the existing labelled lines; protected details panel; upper-perimeter Koboyo flowers; and one restrained closing celebration mark. Empty values preserve physical write-in lines. The garland never contains or overlaps the client identity. Venue and address are not presented as redundant separate fields. Every label/value clears its line; all content remains inside the protected A6 field; logo replacement and centered glyph bounds remain safe. Sample event/date/time/place, reply-by copy, QR, hostname, OBP/menu/services/event link, event-details action, and invented occasion claims are absent. Artwork is embedded in the finished composition and never exposed as a picker or standalone icon download. The complete 47-output matrix preserves the selected parent theme's background, palette, contrast, border treatment, and display typography while sharing the same truthful structure. |
| Runtime attribution | Image/Print PDF output without branding-removal entitlement includes MenuList attribution added during render, while the saved editor document remains free of MenuList branding layers. |
| Save as template | The fullscreen editor exposes **Save as template** for supported non-menu assets and saves the current neutral document to Saved designs. |
| Saved designs | Saved templates appear above Ready templates for the same asset type and can reopen in the editor. |
| Rehydration | Opening a saved template after changing selected project refreshes QR/source values from the current project. |
| Delete saved template | Deleting a Saved designs card removes it from the list without affecting generated Ready templates. |
| Interrupted save | With Storage unavailable, Save as template remains visibly pending, Close editor is disabled, and a repeated Save produces the wait acknowledgement without a second DAL call. Restoring Storage completes exactly one template record/version. |
| Edited saved title | Changing the Creative Editor document title before Save as template persists that edited title rather than the original generated family title. |
| Delete confirmation accessibility | Saved design deletion exposes the complete visible destructive title as the dialog's accessible name; Cancel retains the design and confirmation removes only the selected disposable design. |
| Inspector action accessibility | Lock/protected, duplicate, delete, seven background-alignment actions, and every gradient-stop removal button resolve by purpose. Lock/unlock restores state, duplicate/delete returns to the prior layer count, and Close editor discards unsaved alignment changes. |
| Background control truth | No permanently checked read-only checkbox or no-op Color button is exposed. Color background renders as status, Add image layer opens Images, Solid/Gradient change mode, and preset/manual dimensions can be restored before Close. |
| Preview action reachability | At 1280 x 720, the generated preview, Download PDF, Download image, and Customize design actions are visible without page scrolling. |
| MenuList editor boundary | Customize design opens a body-level fixed fullscreen editor with only Background, Images, Text, Styles, and Brand Kit. CampaignCue defaults remain unchanged. |
| Safe editor entry | The full asset is fitted, the left drawer is collapsed, and no layer or protected print guide is selected when the editor opens. |
| Unsaved recovery | After an edit, Close exposes Keep editing and Discard changes; Keep editing preserves the exact document, Discard closes, and browser unload receives a warning. A pristine Close is immediate. |
| Readiness-gated product output | Print PDF and Image open the readiness panel on the first attempt with actionable issues and permit only the intentional unchanged-warning repeat. |
| Reusable-design hierarchy | Print PDF is the primary output action; Save reusable design remains visibly secondary and a successful save resets the dirty baseline. |
| Download | File downloads with selected asset and template. |
| Business theme | Saving a theme updates all compatible assets on menus without a menu theme; repeat click is disabled and adds no write. |
| Menu theme | Saving a different theme affects the selected menu and every asset within it. |
| Theme write concurrency | While a menu-theme, business-theme, or clear-override write is pending, every theme card and adjacent preference action is disabled. A synchronous mutation lock rejects rapid taps before a second DAL call, the active card remains disabled after settlement, and the acknowledged theme survives a fresh read. |
| Salon recommendation | Exact `Salon` resolves Salon Atelier first; `Makeup Studio` resolves Petal Studio first. Both place the same five light beauty recommendations first while retaining all 34 common themes. |
| Spa recommendation | Exact `Spa` and `Spa Resort` resolve Ritual Sanctuary first, followed by four additional light spa recommendations, while retaining all 34 common themes. |
| Fitness recommendation | Exact approved gym/fitness types resolve Performance Circuit first and retain all 34 common themes. |
| Category recommendations | Service resolves Neighbourhood Standard then Field Notes; retail resolves Boutique Window then Market Label; professional resolves Civic Letterpress then Modern Practice; creative resolves Studio Contact Sheet then Maker Ledger; health resolves Clinical Calm then Mindful Motion; specialty resolves Hospitality House then Future Workshop. This changes order only. |
| Exact-type recommendations | Canonical named types may refine recommendation order. Coffee, bakery, ice cream, salon, spa, and approved fitness types still lead with their exact restricted theme; every common theme remains available. |
| Ineligible saved theme | Any saved restricted theme becomes dormant after the store changes to a non-eligible context; output resolves the next eligible layer without deleting the old value. |
| Ineligible theme save | Optimistic and DAL boundaries reject a food/coffee/bakery/ice cream/salon/spa/fitness theme outside its canonical business context before any store write. |
| Salon/spa content field | Rosewater Editorial and Mineral Sanctuary keep a visibly translucent paper field for print contrast, expose the surrounding artwork through it, and maintain at least 12 mm of top/side breathing room before headings, item names, descriptions, and prices. |
| No fuzzy vertical match | `Pet Grooming Salon` receives the service-category recommendation and is never inferred as a beauty salon; unknown free-text types without a canonical category receive common themes only. |
| New theme artwork | Salon Atelier, Ritual Sanctuary, Performance Circuit, and the eight light Salon/Beauty and Spa additions keep dedicated A4 and compact masters at preserved aspect ratio, choose responsive crops, retain translucent inset copy protection, and appear in all 13 editor-renderable assets plus full Print Menu and Complete Menu Kit. |
| One-master food artwork | Roastery Ledger, Patisserie Conservatory, and Gelateria Riviera each reuse one 1024 x 1536 master across portrait, square, and landscape editor assets plus Print Menu, with preserved-aspect cover crops and a theme-specific inset copy veil. |
| Restaurant theme artwork | Ember House, Coastal Table, Sunday Table, and Counter Rush each reuse one original 1024 x 1536 master across portrait, square, and landscape editor assets plus Print Menu, with preserved-aspect cover crops, edge-only art, and a theme-specific translucent copy veil. |
| PDF QR image cache | Every PDF QR placement uses the explicit MenuList QR image alias so large theme backgrounds cannot collide with or replace the QR in jsPDF's image cache. |
| One-master common artwork | The 12 cross-category families plus the six reclassified light Salon/Spa-inspired families reuse original 1024 x 1536 masters across portrait, square, and landscape editor assets plus Print Menu, with preserved-aspect cover crops and theme-specific copy protection. |
| Long Staff Name Badge names | Rendered business and staff-name glyph bounds stay inside their declared boxes and the 54 x 85 mm canvas across every parent theme. |
| Legacy asset style | A saved old style is mapped to one canonical parent theme and cannot split the asset set. |
| Clear menu theme | Clearing the sparse menu-theme leaf restores the next eligible business theme, exact business-type/category recommendation, or governed fallback. |
| Complete Menu Kit | Presents `Your asset set`, has no independent picker, and applies the one resolved parent theme to table tent, single card, counter sticker, entrance poster, and every other included output. |
| Craft Kitchen artwork | Print Menu, table tent, single card, counter sticker, entrance poster, previews, and editor documents use the original corner/rail artwork without stretching or covering QR safe space. |
| Compatibility | Old `/use-menulist/print-assets` does not break. |
| No reload | Use MenuList -> Assets -> Print Menu uses app navigation, not document reload. |

## Mobile QA

| Scenario | Expected |
| --- | --- |
| More tab | `QR and print assets` opens Assets inside MobileShell. |
| Share tab | Assets shortcut opens inside MobileShell. |
| Direct `/assets` | Maps into mobile shell state. |
| Back action | Returns to previous mobile screen without reload. |
| Template list | Compact touch-friendly grid/list, large touch targets, no text overlap. |
| Open-preview style browsing | Visible Previous/Next controls and horizontal swipe move through styles without closing the sheet; the title, generated preview, description, counter, and download target stay on the same family. |
| Gesture separation | Vertical movement scrolls the sheet and does not change style; horizontal movement below the swipe threshold does nothing. |
| Navigation boundaries | Previous is disabled on the first style, Next is disabled on the last style, and single-style assets show no unnecessary navigation. |
| Accessible navigation | Both arrow controls have purpose labels, are at least 44px square, and the current `x of y` position is announced politely. |
| Menu exists, customer link missing | Show customer-link setup with a direct Domain settings recovery action; do not claim that the menu is missing. |
| Project-summary read fails | Show a distinct load failure with Try again; do not replace it with the first-menu empty state. |
| Theme badges | The resolved family shows exactly `Menu theme`, `Business theme`, or `Recommended`. |
| Theme actions | Parent-theme controls are 44px touch targets with optimistic success and rollback on failure. |
| Download | Same output as desktop for same inputs. |
| Customization | Mobile does not expose drag/resize customization, but preview/download output still comes from the same editor-backed renderer. |

## Output QA

| Scenario | Expected |
| --- | --- |
| Long store name | Text fits and does not overlap the tag or QR. |
| Store with logo | Logo renders inside template badge or defined logo position. |
| Store without logo | Initials render. |
| Bright brand color | Text remains readable through derived tokens. |
| Dark brand color | Accent remains readable and QR panel stays white. |
| Multi-location plan | Visible MenuList attribution is hidden when existing flag is enabled. |
| Plan without branding removal | MenuList attribution is visible. |
| Restaurant business type | Uses menu copy. |
| Service business type | Uses service/list copy where supported. |
| Feedback disabled | Feedback QR is disabled with plain reason. |
| Missing public URL | Download disabled until URL is available. |

## Template Family QA

Every template family must be checked for:

- QR contrast.
- Quiet zone.
- Brand color use.
- Logo fallback.
- MenuList attribution placement.
- Long name fitting.
- Short link fitting.
- Print-safe margin.
- Business Card front/back frame assignment and split PNG output.
- Non-banner templates do not place a colored header rectangle behind the logo badge.
- Full Print Menu does not show duplicate family choices that render to the same PDF style.
- Low-ink readability for `clean-utility`.
- Mobile template list uses one row per family with no two-column compression or text overlap at 360-390px widths.
- Mobile template rows open their existing bottom sheet. Desktop purpose-list rows only select and refresh the focused preview; the Brand Kit bento and focused preview open the existing modal.
- Desktop preview-modal downloads and Customize share one equal-height action row at standard modal widths, preserve the primary-download hierarchy, protect every icon, and wrap without clipping on genuinely narrow screens.
- Desktop preview modals use a single `Theme · Asset` header, preserve the rendered file aspect ratio, remove the preview-stage border/padding, show size as a bottom-right stage badge, and do not repeat the theme title below the preview.

## Regression Guards

- Do not hardcode `Habibis`, restaurant-only names, or fixed URLs in renderers.
- Do not tint QR modules with brand color by default.
- Do not add generated Storage uploads for preview/download.
- Do not add Firestore writes for generated template preview/download/open actions.
- Only explicit Saved designs save/delete can use the registry write path.
- Prepared platform records are discovery metadata, not owner-export byte
  authority. Even when a record has an older persisted editor document and a
  newer themed thumbnail, modal preview, direct PNG/PDF download, first-time
  Customize, and Complete Menu Kit use the same current governed renderer.
  Static regression checks reject the retired platform-document download and
  customize paths, while explicit owner-saved designs continue to render their
  stored edited document.
- PNG serialization embeds governed same-origin theme artwork bytes before the
  temporary SVG is rasterized. Missing or unreadable printable-theme/menu-card
  artwork fails the render instead of producing an apparently valid plain
  output. Verify a real owner download contains the same theme art visible in
  the generated modal preview; PDF uses that same raster source.
- Do not add `window.location` navigation for owner shell print/download flows.
- Do not add a blank free-form template editor; governed desktop customization must start from a generated print template.
- Generate a Complete Menu Kit from a deterministic local owner fixture and
  verify that its three raster-backed PDFs use compressed streams, the ZIP opens,
  and the expected eleven PDF/PNG/instruction entries remain present. Assert that
  all 10 visual files receive the same normalized parent theme, including the six
  non-PDF delivery/social/guide renderers, and that a mixed legacy map collapses
  to one family before rendering. Run `npm run test:menu-kit-parent-theme-output`
  for ZIP inventory, cross-theme byte differentiation, raster validity, and
  generated contact-sheet evidence.
- Render every Counter Sticker family and fail when the shared close-range
  identity/action/QR/hostname hierarchy is missing, the legacy oversized accent
  circle returns, the optional tagline appears, centered glyph bounds escape the
  canvas, the CTA is not smaller than the fitted business name, its lower edge
  exceeds the live QR upper edge, QR padding changes from 24 px, or the displayed
  hostname and encoded canonical destination diverge.
- Render every governed Gift Certificate and fail when its real logo/initials
  identity, optional real tagline, framed two-column hierarchy, six separate
  write-in fields, business-aware discovery CTA, 24 px QR panel padding, full
  encoded destination, hostname-only recovery, or same-theme edge-to-edge
  gift-wrap master is missing.
- Fail when an amount, currency, expiry, recipient, certificate number,
  redemption capability, or the ambiguous combined value/validity placeholder
  is invented, and when a stored overlay is stale against its governed tokens.
- Stop and restore the local Storage emulator around Save as template; verify
  one reserved ID, one recovered index record/version, the edited title, and
  zero residual index/Storage objects after deletion.
- Fail the Creative Editor smoke verifier if any inspector icon-only action
  loses its stable or state-aware accessible name.
- Fail the smoke verifier if the false Show background checkbox returns or the
  truthful Color background/Add image layer contract disappears.
