# Menu Kit

**Status:** ✅ IMPLEMENTED — Feature flag ON (`ENABLE_MENU_KIT`)  
**Priority:** P0 — Pre-launch essential  
**Source:** ChatGPT Session #11 → Cascade Review + Codebase Cross-Check  
**Owner:** Founder
**Last Updated:** June 25, 2026

---

## What Is Menu Kit?

Menu Kit is an auto-generated "Launch Pack" of print-ready and social-ready assets that owners receive when their menu is published. It eliminates the gap between "menu is live" and "customers are actually scanning it."

**The problem it solves:** Owners get a menu link but don't know what to print, where to place QR, what to post online, or what to tell staff. Menu Kit removes all those decisions.

---

## Document Index

| Document                                                                                     | Purpose                                                                                        | Audience            |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------- |
| [Spec](./menu-kit_spec.md)                                                                   | Business requirements, asset definitions, frozen scope                                         | CEO/PM              |
| [Implementation](./menu-kit_impl.md)                                                         | Technical blueprint, file references, architecture                                             | Developers          |
| [Firebase](./menu-kit_firebase.md)                                                           | Read/write operations, cost estimates                                                          | Engineering         |
| [Marketing](./menu-kit_marketing.md)                                                         | Internal sales/marketing collateral                                                            | Sales/Marketing     |
| [Help Doc](./menu-kit_helpdoc.md)                                                            | Customer-facing help article                                                                   | Customers           |
| [Website](./menu-kit_website.md)                                                             | Public landing page content                                                                    | Public              |
| [Mobile Support](./menu-kit_mobile-support.md)                                               | Mobile admission test (4-gate)                                                                 | Product/Engineering |
| [ChatGPT Review #11](./_archive/chatgpt-review.md)                                           | Session #11 review + implementation plan (7 gaps)                                              | Engineering         |
| [ChatGPT Review #12](./_archive/chatgpt-review-session12.md)                                 | Session #12 ecosystem deep dive — 85% already built                                            | Engineering         |
| [ChatGPT Review #13](./_archive/chatgpt-review-session13.md)                                 | Session #13 hardening — entrance poster, print instructions, QR reliability                    | Engineering         |
| [Print Claim Pilot ChatGPT Review](./_archive/chatgpt-review-print-claim-pilot.md)            | June 2026 print acquisition proposal review: what to adopt, reject, and defer                  | Engineering         |
| [Physical Surfaces ChatGPT Review](../physical-surfaces/_archive/chatgpt-review.md)          | Session #14 — strategic validation: identity surfaces > recommendation surfaces (85% accuracy) | Engineering         |
| [Deep Architecture Review](../digital-screens/_archive/digital-screens_chatgpt-review-v4.md) | Mar 15 — scan network, growth loops, moats, 10-year evolution. 159 items, 72% accuracy         | Engineering         |

---

## Quick Reference

### What's in the Kit (Frozen — 10 Generated Asset Files + Staff Script + Print Instructions)

All visual assets use the store's existing logo and brand accent color when available. Brand color is used for gradient framing, accent panels, and borders; QR modules stay near-black on a high-contrast white scan panel with a generated four-module quiet zone for scan reliability. Printable/downloadable assets carry subtle MenuList attribution with the logo mark, name, and `menulist.ai` domain unless the store's already-loaded active plan is `premium`.

1. **Table Tent (A5 fold PDF)** — Print Menu Surfaces-owned tabletop card with QR + instruction line + short link fallback + branding
2. **Single Table / Counter Card (A6 PDF)** — Upright non-folded card for acrylic holders, counters, wall clips, and single-sided stands
3. **Counter Sticker (8×8 PNG)** — "Scan for menu" + QR + short link fallback
4. **Entrance Poster (A4 PDF)** — Large QR (80mm) for entrance/window scanning from distance
5. **Delivery Bag Sticker (6×6 PNG)** — "View menu" + QR for delivery bags/boxes (off-site discovery)
6. **Takeaway Card (85×55 PNG)** — Business-card insert for takeaway orders (reorder path from home)
7. **Instagram Story (1080×1920 PNG)** — Menu is live + QR + link + branding
8. **WhatsApp Status (1080×1920 PNG)** — Updated menu + QR + link + branding
9. **Google Maps Upload (1200×900 PNG)** — Official menu + QR + link + branding
10. **Placement Guide (PNG)** — Where to place QR + quantity guidance + QR maintenance + connectivity test
11. **Staff Script (text)** — "Menu? Please scan the QR on the table/counter."
12. **PRINT_INSTRUCTIONS.txt** — Specs for print shops (paper size, material, finish, quantity)

### What's NOT in the Kit (Permanently Rejected)

- ❌ Offer/discount posters
- ❌ Review QR cards
- ❌ Design editor / customization UI
- ❌ Festival/seasonal templates
- ❌ Campaign-based recommendation cards (see `__docs__/physical-surfaces/` — legacy system)
- ❌ Item-specific printed surfaces (volatile, undermines trust)
- ❌ A/B testing of surface copy
- ❌ Owner-claim postcards, staff PINs, and signed public claim links — those belong to a separate Public Menu Entry/acquisition extension
- ❌ Center-logo QR overlays without scan-regression coverage
- ❌ WhatsApp consent/trust copy on normal MenuList page QR outputs
- ❌ Preview interstitials before ordinary menu/page QR scans
- ❌ Artistic QR patterns, QR module distortion, or decorative QR art without scan-regression coverage

---

## Print Claim Pilot Boundary (June 2026)

A June 2026 external print-kit proposal was reviewed against the live repo. The useful pieces are QR print guardrails, acquisition-postcard copy, and print-pilot success criteria. The proposal's customer table-tent idea is already covered by Menu Kit.

Do not treat `go.menulist.ai/claim?...`, `sig={hmac}`, `audit_id`, or staff PIN handling as existing Menu Kit behavior. Those are future Public Menu Entry/acquisition-extension concepts that require docs-first security, Firebase cost, privacy, and route design before code.

Safe interim use:

- Existing Menu Kit assets for claimed stores.
- `/create-menu` for owner acquisition until a signed claim resolver exists.
- Acquisition postcard copy that says "Claim your official MenuList menu" and avoids external-platform sync claims.

## Print Menu Surfaces Boundary

Menu Kit bundles the table tent file so owners receive one complete deployment pack. The physical table tent layout itself is owned by [Print Menu Surfaces](../print-menu-surfaces/README.md). New tabletop, counter-card, folded-card, or in-store scan-first print work belongs there first, then Menu Kit can consume it.

## Print Assets Boundary

[Print Assets](../print-assets/README.md) is the owner-facing desktop/mobile workspace for downloading the printables. Menu Kit remains the bundle generator and Print Menu Surfaces remains the physical layout owner. Do not add route or mobile-shell logic to Menu Kit when the user job is "find and download printable files."

Individual asset downloads should call `generateMenuKitAsset()` with a semantic asset key. `generateMenuKit()` is for the complete ZIP bundle.

## Branded QR Action Templates Boundary

[Branded QR Action Templates](../branded-qr-action-templates/README.md) is the cross-feature doctrine for QR-heavy physical files. Menu Kit uses only the standard Tier 1 form: brand frame, CTA, short link, business identity, and a protected scan-safe QR. Menu Kit does not own artistic QR patterns or campaign action experiments.

## QR Trust-Cue Boundary

Menu Kit accepts trust cues that are already true from existing inputs: business name/logo or initials, current menu/service/catalog wording, the short link, the live MenuList page URL, placement UTM tags, and MenuList attribution where policy requires it.

Menu Kit does not own WhatsApp opt-in flows, WhatsApp preview pages, scan-to-WhatsApp consent snippets, "Verified Business" claims, "Secure" claims, "No spam" claims, or backend scan -> click -> WhatsApp-open ledgers. Those need separate route, compliance, analytics, Firebase cost, and privacy design before code.

## Existing Infrastructure (Reusable)

| Component                     | File                                             | Reusable?                           |
| ----------------------------- | ------------------------------------------------ | ----------------------------------- |
| Premium output tokens         | `src/lib/menu-kit/brandTokens.ts`                | ✅ Shared logo/color/gradient/near-black QR readability defaults |
| Platform attribution          | `src/lib/menu-kit/platformAttribution.ts`, `src/lib/platform/menuListBranding.ts` | ✅ Shared MenuList logo/name/domain footer for printable/downloadable outputs, hidden only for Premium stores |
| Table tent renderer           | `src/lib/print-menu-surfaces/templates/tableTentTemplate.ts` | ✅ Owned by Print Menu Surfaces and bundled by Menu Kit |
| Tent card PDF generator       | `src/lib/physical-surfaces/tentCardGenerator.ts` | ✅ Legacy Today cards now reuse premium output tokens |
| Counter sticker PNG generator | `src/lib/physical-surfaces/stickerGenerator.ts`  | ✅ Legacy Today stickers now reuse premium output tokens |
| QR code generation            | `qrcode` npm package + Ant Design QRCode         | ✅ Direct reuse                     |
| Share Modal                   | `src/components/.../shareModal/index.tsx`        | ✅ Add "Menu Kit" section           |
| Social sharing                | `src/lib/campaigns/executionSurfaces.ts`         | ✅ Extend for image sharing         |
| Menu PDF export               | `src/lib/export/menuPdfGenerator.ts`             | ✅ Already exists                   |

---

## Relationship To Menu Card Export

Menu Kit and Menu Card Export are related, but they solve different owner jobs.

| Feature | Owner job | Output |
| --- | --- | --- |
| Menu Kit | Put QR/MenuList surfaces around the restaurant and online. | Table tent, counter sticker, entrance poster, social assets, placement guide, staff script, print instructions. |
| Menu Card Export | Create the actual printable menu/menu-card file from current menu data. | Home-print PDF, WhatsApp PDF, print-shop packet, export history, freshness checks. |

Menu Kit should not grow into a menu design or full-menu PDF editor. Use MenuList can link owners from Menu Kit/Print assets into Menu Card Export when they need the full printable menu file.

---

## Strategic Validation (ChatGPT Session #14 — Mar 14, 2026)

An independent ChatGPT strategic review of the original Physical Surfaces spec (campaign-based recommendation cards) arrived at the same conclusions that drove Menu Kit's design:

1. **Identity surfaces > Recommendation surfaces** — "SCAN TO VIEW MENU" creates infrastructure dependency; "Most customers order Butter Chicken" creates marketing noise
2. **Physical surfaces = offline distribution nodes** — Every restaurant with Menu Kit assets becomes a MenuList discovery point
3. **"Powered by" growth loop** — Customers encountering MenuList branding across non-Premium stores builds platform recognition; Premium stores receive visible branding removal as paid value
4. **Zero campaign dependency** — Printed objects must remain valid for months/years; campaign-tied content becomes stale
5. **Staff script is critical** — Staff behavior determines whether QR systems succeed or fail

Menu Kit already implements all 5 principles. See `__docs__/physical-surfaces/_archive/chatgpt-review.md` for the full 68-point analysis (85% accuracy, 79% already implemented).

### Strategic Validation (ChatGPT Session — Mar 15, 2026)

A deep ~15,000-word ChatGPT conversation covering scan networks, growth loops, competitive moats, and 10-year evolution validated Menu Kit's role as the foundation for MenuList's physical distribution infrastructure.

**Core Rule (validated):** "If something is printed, it must remain correct for years. Campaign logic cannot guarantee that. Identity infrastructure can."

**Growth Loop Priority (validated):**

1. **Scan Distribution** (Menu Kit deployment) — Active NOW
2. **Menu Sharing** (Share Modal + social assets) — Active NOW
3. **Restaurant Identity** (OBP + canonical links) — Active NOW
4. **Data Flywheel** (menu dataset growth) — Organic, requires scale
5. **Discovery** (cross-restaurant navigation) — Future, requires 10K+ restaurants

**Moat Building Priority (validated):**

1. **Distribution** — Menu Kit physical deployment creates permanent scan nodes
2. **Canonical Database** — Structured menu data quality (MCE, extraction)
3. **Identity Layer** — OBP + social presence as official business link
4. **Workflow Integration** — Simple edit-publish habit

See `__docs__/digital-screens/_archive/digital-screens_chatgpt-review-v4.md` for the full 159-point analysis (72% accuracy, 70% already implemented).

### Validated Future Enhancements (P2-P3)

| Enhancement                                             | Priority | Notes                                                                                         |
| ------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| Full i18n of surface copy (beyond business-type labels) | P2       | Current labels handle 60+ types. Full locale-aware template rendering for non-English markets |
| Delivery bag / receipt QR surfaces                      | ✅ DONE  | Delivery bag sticker (6×6) + takeaway card (85×55) implemented Mar 15, 2026                   |
| Dual-orientation table tent layout                      | P2       | Valid for multi-direction table seating — scannable from both sides (✅ BUILT in v1)          |
| Canonical QR resolver `/scan/{storeId}`                 | P3       | Adds flexibility for future URL changes. UTM tracking + previousSlugs solve core needs now    |
| Surface Registry (track deployed QRs)                   | P3       | Database of physical QR surfaces. Only valuable at 1000+ restaurants                          |

---

## Relationship to Physical Surfaces (Legacy)

The original Physical Surfaces feature (`src/lib/physical-surfaces/`, `__docs__/physical-surfaces/`) generates **campaign-based recommendation cards** shown in the Today tab. Menu Kit **supersedes** it for all identity/infrastructure surface needs. The old code remains functional for Today/mobile Hours and is maintenance-only; it now reuses the same premium logo/color/QR treatment so active downloads do not regress to plain black-and-white output. See `__docs__/physical-surfaces/README.md` for the comparison table.

For all new physical surface work, use Menu Kit.

---

**Document Signature:** Feature Documentation  
**Created:** February 21, 2026  
**Last Updated:** June 4, 2026 — Premium branded output treatment shared across Menu Kit, QR downloads, and active legacy Today cards
**Cross-References:** `__docs__/constitution/15-category-dominance-doctrine.md` (physical dependency creation), `__docs__/constitution/11-product-evolution-doctrine.md` (5-minute rule), `__docs__/physical-surfaces/_archive/chatgpt-review.md` (strategic validation), `__docs__/digital-screens/_archive/digital-screens_chatgpt-review-v4.md` (deep architecture review)
