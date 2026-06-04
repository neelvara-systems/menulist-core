# Menu Kit — Implementation Blueprint

**Version:** 1.5
**Status:** ✅ IMPLEMENTED — All code complete, feature flags ON
**Last Updated:** June 4, 2026 — Premium branded output tokens shared across Menu Kit, QR downloads, and active legacy Today cards
**Companion:** `menu-kit_spec.md` (business requirements)

---

## Architecture Overview

Menu Kit is **100% client-side**. No server endpoints. No Firebase writes. No storage uploads.

```
Owner clicks "Download Menu Kit"
    ↓
Client generates 10 asset files using:
    - jsPDF (table tent PDF, single table/counter card PDF, entrance poster PDF)
    - Canvas API (sticker PNG, social images, placement guide)
    - qrcode npm package (QR codes)
    - UTM-tagged URLs per surface (if ENABLE_MENU_KIT_UTM)
    - shared brand tokens from existing store logo/color context
    ↓
JSZip bundles into single ZIP (10 assets + PRINT_INSTRUCTIONS.txt)
    ↓
Browser downloads ZIP + GA4 event tracked
    ↓
Staff script text shown inline (not in ZIP)
```

**Zero Firebase cost. Zero server load. Zero CDN storage.**

---

## File Structure (New + Modified)

### New Files

```
src/lib/menu-kit/
├── brandTokens.ts                  # Shared premium logo/color/QR readability tokens
├── imageLoader.ts                  # Logo preloader used once per generation request
├── menuKitGenerator.ts            # Asset definitions, single-asset generation, and ZIP bundle
├── businessTypeLabels.ts          # BusinessType-aware labels (menu/services/catalog)
├── templates/
│   ├── tableTentTemplate.ts       # Compatibility wrapper for Print Menu Surfaces table tent
│   ├── counterStickerTemplate.ts  # Store-level 8×8 sticker (businessType-aware)
│   ├── entrancePosterTemplate.ts  # Store-level A4 entrance poster (businessType-aware)
│   ├── instagramStoryTemplate.ts  # 1080×1920 story image (businessType-aware)
│   ├── whatsappStatusTemplate.ts  # 1080×1920 status image (businessType-aware)
│   ├── googleMapsTemplate.ts      # 1200×900 maps image (businessType-aware)
│   └── placementGuideTemplate.ts  # 1080×1080 guide image
└── types.ts                        # MenuKit types, UTM helpers, print instructions, surface constants
```

```
src/lib/print-menu-surfaces/
└── templates/
    ├── printMenuCardFace.ts        # Shared premium face renderer for tabletop print cards
    ├── tableTentTemplate.ts        # A5 landscape PDF, folded into two A6 portrait faces
    └── singleTableCardTemplate.ts  # A6 portrait PDF for acrylic holders/counter stands
```

### Modified Files

```
src/components/templates/main-app/projects/b2cView/shareModal/index.tsx
    → Add "Menu Kit" section + businessType prop threading

src/components/templates/main-app/projects/b2cView/shareModal/MenuKitSection.tsx (NEW)
    → Menu Kit UI: ZIP download, mobile Web Share API, copy share message,
      WhatsApp quick share, GBP hint, businessType-aware staff script

src/components/templates/main-app/projects/index.tsx
    → Pass storeDetails.businessType to ShareModal

src/components/mobile/screens/MobileShareScreen.tsx
    → Menu Kit section with individual share buttons, copy share message,
      GBP hint, businessType-aware WhatsApp message

public/locales/menulist.ai/*.json
    → Added Menu Kit/Print Menu download labels for mobile Share where supported
```

---

## Implementation Details

### 1. Types (`src/lib/menu-kit/types.ts`)

```typescript
export interface MenuKitInput {
  storeName: string;
  menuUrl: string; // Full URL: {subdomain}.menulist.ai/{slug}
  shortLink: string; // Display: menulist.ai/{slug}
  logoUrl?: string; // Optional store logo
  brandColor?: string; // Store/OBP accent color
  lastPublishedAt?: Date; // For "Updated on" footer
  businessType?: string;
  businessCategory?: string;
  activePlanType?: string | null; // Premium hides visible MenuList attribution
  locale?: string;
}

export interface MenuKitAsset {
  filename: string;
  blob: Blob;
  mimeType: string;
  /** Human-readable label for UI */
  label: string;
}

export interface MenuKitResult {
  assets: MenuKitAsset[];
  staffScript: string; // Text only, not a file
  zipBlob: Blob;
}
```

### Premium Output Tokens (`src/lib/menu-kit/brandTokens.ts`)

`resolveMenuKitBrandTokens()` normalizes the store/OBP accent color and returns paper, surface, border, text, muted, softAccent, gradient, and QR colors. Brand color is used for premium framing and accents; default QR modules stay near-black (`#111827`) on a high-contrast white panel for scan reliability.

`resolveStoreBrandColor()` uses the same store fallback order as premium print output: `publicPresence.accentColor` -> `primaryColor` -> `brandColor` -> `themeColor`.

This shared contract is used by Menu Kit, standalone branded QR cards, OBP QR downloads, feedback QR downloads, and the active legacy Today/mobile Hours card generators.

`src/lib/menu-kit/platformAttribution.ts` is the shared MenuList attribution contract for generated assets. It draws the MenuList logo mark and standard text:

- `Powered by MenuList | menulist.ai`
- `Menu powered by MenuList | menulist.ai`

`src/lib/platform/menuListBranding.ts` is the entitlement gate for visible MenuList attribution. It hides printable/downloadable attribution only when `activePlanType` normalizes to `premium`; missing, Starter, Pro, and unknown plan data keep attribution visible. The check uses plan data already present in store context and does not read subscriptions.

Menu Kit templates, standalone QR cards, Menu Card Export PDFs, and active legacy physical-surface downloads use this helper or its PDF-safe logo data URL so every printed/downloaded output includes the MenuList name and domain without making the owner configure another setting.

### 2. Main Orchestrator (`src/lib/menu-kit/menuKitGenerator.ts`)

The table tent asset is bundled by Menu Kit but owned by Print Menu Surfaces. `src/lib/menu-kit/templates/tableTentTemplate.ts` remains only as a compatibility wrapper; new tabletop print layout work belongs under `src/lib/print-menu-surfaces/`.

```typescript
export const MENU_KIT_ASSET_KEYS = [
  "table_tent",
  "counter_sticker",
  "entrance_poster",
  "delivery_bag",
  "takeaway_card",
  "instagram_story",
  "whatsapp_status",
  "google_maps",
  "placement_guide",
  "single_table_card",
] as const;

const MENU_KIT_ASSET_DEFINITIONS = [
  { key: "table_tent", suffix: "TableTent_A5_Fold.pdf", generate: generatePrintMenuTableTent },
  { key: "counter_sticker", suffix: "CounterSticker_8x8.png", generate: generateCounterSticker },
  { key: "entrance_poster", suffix: "EntrancePoster_A4.pdf", generate: generateEntrancePoster },
  // ...remaining print/social assets
  { key: "single_table_card", suffix: "SingleTableCard_A6.pdf", generate: generatePrintMenuSingleTableCard },
];

export async function generateMenuKitAsset(input: MenuKitInput, assetKey: MenuKitAssetKey): Promise<MenuKitAsset> {
  const prepared = await prepareMenuKitInput(input);
  const definition = MENU_KIT_ASSET_DEFINITIONS.find((asset) => asset.key === assetKey);
  return renderMenuKitAsset(definition, prepared);
}

export async function generateMenuKit(input: MenuKitInput): Promise<MenuKitResult> {
  const prepared = await prepareMenuKitInput(input);
  const assets = await Promise.all(
    MENU_KIT_ASSET_DEFINITIONS.map((definition) => renderMenuKitAsset(definition, prepared)),
  );
  const zip = new JSZip();
  for (const asset of assets) {
    zip.file(asset.filename, await asset.blob.arrayBuffer());
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });

  return { assets, staffScript: STAFF_SCRIPT, zipBlob };
}
```

Use `generateMenuKitAsset()` for single file actions. Use `generateMenuKit()` only for the complete ZIP. This prevents a table card, social image, or counter sticker action from rendering every Menu Kit file first.

### 3. Print Menu Tabletop PDFs (`src/lib/print-menu-surfaces/templates/`)

Tabletop print PDFs are owned by Print Menu Surfaces and bundled by Menu Kit.

| Renderer | Output | Use |
| --- | --- | --- |
| `generatePrintMenuTableTent()` | A5 landscape PDF, folded into two A6 portrait faces | Center of table, readable from both sides |
| `generatePrintMenuSingleTableCard()` | A6 portrait PDF, one upright face | Acrylic holders, counter stands, wall clips, or single-sided table stands |

Both renderers use `drawPrintMenuCardFace()` so the folded tent and single card stay visually identical:

- Store name and optional logo from existing store context.
- Business-type-aware label such as MENU, SERVICES, or CATALOG.
- Large near-black QR on a white panel for scan reliability.
- Store brand color for the top band, badge, rule, and border accents.
- MenuList attribution unless `activePlanType` is Premium.

`src/lib/menu-kit/templates/tableTentTemplate.ts` remains a compatibility wrapper only. New physical tabletop layout work belongs under `src/lib/print-menu-surfaces/`.

### 4. Counter Sticker Template (`src/lib/menu-kit/templates/counterStickerTemplate.ts`)

**Extends existing pattern from** `src/lib/physical-surfaces/stickerGenerator.ts`

Key differences:

- **Store-level** (not item-specific)
- **Text:** "SCAN FOR MENU" (not campaign template text)
- **Includes:** Store name + QR
- **No confidence gate** (always available)

```typescript
// Uses Canvas API (same pattern as existing stickerGenerator.ts)
// 80mm × 80mm at 300dpi = 945px square
// White background, minimal border
```

### 5. Entrance Poster Template (`src/lib/menu-kit/templates/entrancePosterTemplate.ts`)

**NEW — added March 14, 2026.**

```typescript
// Uses jsPDF (same as tent card)
// A4: 210mm × 297mm
// QR: 80mm (large — scannable from 1–2 meters at entrance)
// Layout: "OUR MENU" heading → large QR → "Scan to view" + instruction line → short link fallback → store name → branding footer
// Highest discovery surface: customers check menu before entering
```

### 6. Instagram Story Template (`src/lib/menu-kit/templates/instagramStoryTemplate.ts`)

**NEW — no existing equivalent.**

```typescript
// Canvas API
// 1080 × 1920 pixels
// Layout: Gradient background → contained store name/logo card → "MENU IS LIVE" → black QR on white panel → short link
// Colors: White background, black text (safe for all brands)
// QR size: ~400px (scannable even from screenshot)
```

### 7. WhatsApp Status Template (`src/lib/menu-kit/templates/whatsappStatusTemplate.ts`)

**NEW — no existing equivalent.** Same dimensions as Instagram Story but different copy.

```typescript
// Canvas API
// 1080 × 1920 pixels
// Layout: Gradient background → contained store name/logo card → "UPDATED MENU" → black QR on white panel → short link
// Same white/black safe palette
```

### 8. Google Maps Upload Template (`src/lib/menu-kit/templates/googleMapsTemplate.ts`)

**NEW — no existing equivalent.**

```typescript
// Canvas API
// 1200 × 900 pixels (landscape, GBP-optimized)
// Layout: "OFFICIAL MENU" (top-left) → QR (left) + Store name (right) → link + "Updated regularly" (bottom)
// Clean, professional, machine-readable
```

### 9. Placement Guide Template (`src/lib/menu-kit/templates/placementGuideTemplate.ts`)

**NEW — no existing equivalent.**

```typescript
// Canvas API
// 1080 × 1080 pixels (square, shareable)
// Static text — does NOT include store name or QR
// Content: "WHERE TO PLACE YOUR QR" + checklist + sizes
// Generic — same for all stores (can be cached/reused)
```

### 10. UI Component (`src/components/.../shareModal/MenuKitSection.tsx`)

```typescript
// Ant Design Card inside Share Modal
// Shows: "Menu Kit" heading + "Download all print + social files"
// Button: "Download Menu Kit" → generates ZIP → browser downloads
// Below button: Staff script text (copyable)
// Loading state during generation
// Success notification after download
```

### 11. Share Modal Integration

Add MenuKitSection after existing social sharing section in `src/components/.../shareModal/index.tsx`.

**Placement:** After the social sharing buttons, before the bottom row.

**Props needed:** storeName, menuUrl (shareUrl), shortLink, logoUrl, lastPublishedAt (menuModifiedOn)

---

## Dependency: JSZip

```bash
npm install jszip
```

**Package:** `jszip` — ~100KB gzipped. Widely used, well-maintained.
**Purpose:** Bundle 9 files into single ZIP download.
**Alternative considered:** Individual file downloads. Rejected because 6 separate downloads is bad UX.

---

## Existing Code to Reuse (Direct References)

| What                     | File                                             | Lines          | Reuse How                          |
| ------------------------ | ------------------------------------------------ | -------------- | ---------------------------------- |
| jsPDF tent card pattern  | `src/lib/physical-surfaces/tentCardGenerator.ts` | 1-72           | Copy pattern, change text/layout   |
| Canvas sticker pattern   | `src/lib/physical-surfaces/stickerGenerator.ts`  | 1-85           | Copy pattern, change text/layout   |
| QR code generation       | `src/lib/utils/feedbackQrCode.ts`                | 59-76          | Reuse `QRCode.toDataURL()` pattern |
| Share Modal structure    | `src/components/.../shareModal/index.tsx`        | 212-378        | Add MenuKitSection component       |
| Store name + logo access | Share Modal props                                | Already passed | Use existing props                 |
| Menu URL computation     | `getShareUrl()` in Share Modal                   | 105-118        | Already computed                   |

---

## Testing Approach

### Manual Testing (P0)

1. Open Share Modal for any project
2. Click "Download Menu Kit"
3. Verify ZIP contains 10 asset files + PRINT_INSTRUCTIONS.txt
4. Open each file — verify store name, QR code, layout
5. Scan QR from table tent and single table/counter card PDFs -> both should open menu
6. Scan QR from sticker PNG → should open menu
7. Verify Instagram Story dimensions (1080×1920)
8. Verify Google Maps image dimensions (1200×900)
9. Verify staff script text is shown and copyable

### Edge Cases

- Store name with special characters (Arabic, Hindi, emojis)
- Very long store names (truncation)
- No logo set (should still work without logo)
- No publish date (omit "Updated on" footer)
- Mobile browser (Canvas API support — widely available)

---

## Implementation Order

1. **Install JSZip** dependency
2. **Create types** (`src/lib/menu-kit/types.ts`)
3. **Create templates** (start with tableTent + counterSticker since patterns exist)
4. **Create social templates** (Instagram, WhatsApp, Google Maps — new Canvas work)
5. **Create placement guide** (simplest — static text)
6. **Create orchestrator** (`menuKitGenerator.ts`)
7. **Create UI component** (`MenuKitSection.tsx`)
8. **Integrate into Share Modal**
9. **Test all 10 assets + ZIP download**

---

## Scope for Improvement

| Item                                                | Priority | Notes                                                                                                                                             |
| --------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~Mobile individual share buttons (Web Share API)~~ | ~~P1~~   | ✅ DONE (Mar 7, 2026) — Web Share API per-asset on mobile (desktop + MobileShareScreen)                                                           |
| ~~Copy share message template~~                     | ~~P0~~   | ✅ DONE (Mar 7, 2026) — BusinessType-aware pre-formatted message copy                                                                             |
| ~~WhatsApp quick share action~~                     | ~~P2~~   | ✅ DONE (Mar 7, 2026) — wa.me with businessType-aware message                                                                                     |
| ~~Google Business Profile hint~~                    | ~~P1~~   | ✅ DONE (Mar 7, 2026) — GBP setup instruction in Menu Kit section                                                                                 |
| ~~BusinessType-aware labels~~                       | ~~P0~~   | ✅ DONE (Mar 7, 2026) — All templates use food/service/retail/health/creative/specialty labels                                                    |
| Store logo in templates                             | P2       | `logoUrl` is in `MenuKitInput` but no template uses it yet. Could add logo to tent card and sticker for brand consistency.                        |
| Non-Latin font rendering                            | P2       | Canvas `system-ui` renders Unicode but may not look great for Hindi/Arabic. Consider loading a web font if needed.                                |
| Placement Guide caching                             | P3       | Guide is identical for all stores. Could cache the blob to avoid regenerating. Low impact — already fast.                                         |
| ~~Analytics: track kit downloads~~                  | ~~P3~~   | ✅ DONE (Mar 8, 2026) — `MENU_KIT_DOWNLOAD` event via GA4 (zip_download, share_instagram, share_whatsapp, share_google_maps). Zero Firebase cost. |
| ~~UTM-tagged QR per placement surface~~             | ~~P2~~   | ✅ DONE (Mar 8, 2026) — Each template encodes unique `utm_source=menu_kit&utm_medium={surface}`. Feature flag: `ENABLE_MENU_KIT_UTM`.             |

---

## Implementation Decisions Log

| Decision                                      | Reasoning                                                                                         | Date         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------ |
| `STAFF_SCRIPT` in `types.ts` not orchestrator | UI component imports it directly for display; sharing avoids duplication                          | Feb 21, 2026 |
| `MenuKitAsset.label` field added              | UI may need human-readable labels for future individual download buttons                          | Feb 21, 2026 |
| Feature flag default ON                       | Zero Firebase cost, zero risk. Safe for immediate use.                                            | Feb 21, 2026 |
| Empty store name → fallback `'Menu'`          | Prevents blank filenames for stores with only non-Latin characters                                | Feb 21, 2026 |
| `secureError` instead of `console.error`      | Per Master Prompt code rules (Step 2)                                                             | Feb 21, 2026 |
| `token.colorBorderSecondary` for borders      | Dark mode support — no hardcoded colors                                                           | Feb 21, 2026 |
| "Table card" not "Table tent (A6)" in UI      | SMB owners don't know paper sizes. Zero jargon rule.                                              | Feb 21, 2026 |
| UTM tagging in orchestrator not templates     | Templates don't know their surface name. Orchestrator builds per-surface input. Clean separation. | Mar 8, 2026  |
| `MENU_KIT_DOWNLOAD` GA4-only (no Firestore)   | Owner-side event, not customer-side. Zero Firebase cost. Skip Firestore write in switch.          | Mar 8, 2026  |
| Feature flag `ENABLE_MENU_KIT_UTM`            | Allows toggling UTM params without touching template code. Defaults ON.                           | Mar 8, 2026  |
| Shared premium output tokens                  | All active QR/card downloads reuse store logo/color, premium gradient accents, and a near-black scan-safe QR panel.                     | Jun 4, 2026  |
| Premium attribution removal                   | Only Premium stores hide visible MenuList logo/name/domain in generated files and public footers. | Jun 3, 2026  |

---

**Document Signature:** Implementation Blueprint
**Created:** February 21, 2026
**Last Updated:** June 4, 2026
**Review:** Implementation complete — all code matches spec. Parity audit passed.
