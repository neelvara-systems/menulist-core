# PDF Surface — Implementation Guide

**Feature:** PDF Surface (Enhanced Menu PDF Generation)
**Version:** 2.2 — Professional Bistro Layout with Michelin Typography
**Feature Flag:** `ENABLE_PDF_SURFACE`
**Last Updated:** 2026-03

---

## 1. Architecture

**Pattern:** Client-side only. No server. No new API routes. No Firestore reads.

```
ShareModal
  └── generateMenuPdf(options)      ← src/lib/export/menuPdfGenerator.ts
        ├── buildPdfSnapshot()      ← canonical snapshot (strip internal, resolve language)
        ├── createMenuVersion()     ← CRC32 content hash for footer
        ├── detectDensity(n)        ← auto-detect Standard/Compact/High-Density
        ├── generateWithDensity()   ← core render loop (header/categories/items/footer)
        ├── page-count guard        ← re-run at high-density if >6 pages
        └── FOOTER LOOP             ← separator + m-version | page | "Menu Updated:"
  └── downloadPdf(result)          ← creates blob URL, triggers download
```

### Design Tokens (v2.2)

```typescript
const ACCENT = { r: 45, g: 45, b: 45 }; // charcoal #2d2d2d — header band, accent bars
const ACCENT_LIGHT = { r: 80, g: 80, b: 80 }; // dark gray — category rules
const MARGIN = 18; // mm
const FOOTER_RESERVE = 20; // mm — space held at bottom for footer
const PRICE_COL_WIDTH = 22; // mm — fixed right column for price alignment
const MAX_DESC_LENGTH = 400; // chars — prevent layout overflow
const MAX_ATTRS_PER_ITEM = 6; // max visible attributes per item
const MAX_PAGES_BEFORE_DENSITY_FALLBACK = 6; // auto-switch to high-density above this
const MICRO_SPACING_INTERVAL = 6; // insert breathing space every N items
const CATEGORY_TOP_SPACING = 6; // mm — breathing room before each category
const PAGE_TOP_CATEGORY_PAD = 6; // mm — extra padding when category at page top
```

Decision rationale: charcoal was chosen over color for universality — prints cleanly on any printer (laser/inkjet/office), works for every restaurant type, and will not bleed or look unprofessional when printed in grayscale.

---

## 2. File: `src/lib/export/menuPdfGenerator.ts`

### 2.1 Types

```typescript
interface MenuPdfOptions {
  projectName: string;
  storeName: string;
  language: string;
  menuUrl?: string;
  currency?: string;
  showDescriptions?: boolean;
  showQrCode?: boolean; // reserved — v2.1
  headerColor?: string; // reserved — not used in v2
  address?: string; // NEW: optional address line
  contactLine?: string; // NEW: optional phone/website line
  items: MenuItem[];
  categories: Category[];
  showUpdatedOn?: boolean; // FR-7.3: default true
}
```

### 2.2 Density Mode Detection

```typescript
type DensityMode = "standard" | "compact" | "high-density";
interface DC {
  item: number;
  desc: number;
  itemGap: number;
  descLH: number;
  catH: number;
}

function detectDensity(n: number): DensityMode {
  if (n <= 40) return "standard";
  if (n <= 80) return "compact";
  return "high-density";
}

const DENSITY: Record<DensityMode, DC> = {
  standard: { item: 11, desc: 9, itemGap: 6, descLH: 4.2, catH: 13 },
  compact: { item: 10, desc: 8, itemGap: 4.5, descLH: 3.8, catH: 12 },
  "high-density": { item: 9, desc: 7.5, itemGap: 3.5, descLH: 3.2, catH: 11 },
};
```

### 2.3 Content-Based Versioning (CRC32)

```typescript
// CRC32 lookup table (precomputed at module load)
const CRC32_TABLE = /* Uint32Array(256) */;

function crc32(str: string): number { /* standard CRC32 */ }

/** Content hash: deterministic from menu data */
function createMenuVersion(snapshot: string): string {
  const hash = crc32(snapshot).toString(36);
  return `m-${hash}`;  // Example: m-x9af2
}

/** Generation instance: when the PDF was created */
function createGenerationId(): string {
  return `g-${Date.now().toString(36)}`;  // Example: g-lkj3x2a
}
```

The menu version is derived from the full canonical snapshot JSON. Identical menus always produce the same version. The generation ID is created internally but not displayed in the PDF footer.

### 2.4 Block-Based Pagination

Block estimator uses the canonical snapshot (not raw Firestore data):

```typescript
const CAT_HEADER_H = 20; // mm

function itemBlockHeight(item: SnapshotItem, cw, d, doc, showDesc): number {
  const desc = showDesc ? item.description : "";
  const descLines = desc ? doc.splitTextToSize(desc, cw - 6).length : 0;
  const attrs = item.attributes.length;
  return d.itemGap + descLines * d.descLH + attrs * d.descLH + 2;
}

function catBlockHeight(items, cw, d, doc, showDesc): number {
  return items.reduce(
    (h, it) => h + itemBlockHeight(it, cw, d, doc, showDesc),
    CAT_HEADER_H + CATEGORY_TOP_SPACING,
  );
}
```

Category block rendering:

- Estimate full block height before rendering
- Category header + `min(2, items.length)` items must fit on same page
- If `blockH <= pageUsable` AND `blockH > remaining page space` → `doc.addPage()` before rendering
- If `blockH > full page` → allow split (large categories will paginate naturally)
- **Page count guard:** If PDF exceeds 6 pages, regenerate with high-density mode
- **Micro-spacing:** Every 6 items, insert 1.5mm breathing break

### 2.5 Visual Hierarchy: Header → Category → Item

**Header band (page 1):**

```
[FULL-WIDTH CHARCOAL FILLED RECT  ─────────────────────────────────────]
[        STORE NAME IN WHITE UPPERCASE, 20pt bold, centered             ]
[        address line, 8pt, rgb(190,190,190), centered (if provided)    ]
[        contact line, 8pt, rgb(190,190,190), centered (if provided)    ]
```

**Category header:**

```
[■ 3mm accent bar]  CATEGORY NAME UPPERCASE  ←── bold, charcoal, 11-13pt
[──────────────────────────────────────────] ←── thin full-width rule, rgb(80,80,80)
```

**Item row (standard density — clean, no leaders):**

```
Item Name                               ₹ 180.00
  Description in italic, indented 4mm, gray
  · Variant name  ₹ 200.00
```

**Item row (compact/high-density — dashed leaders):**

```
Item Name  - - - - - - - - - - - - - -  ₹ 180.00
  Description in italic, indented 4mm, gray
  · Variant name  ₹ 200.00
```

### 2.6 Footer Layout (All Pages)

```
────────────────────────────────────────────────  ← separator line (rgb(200,200,200))
[m-x9af2]    [Page 1 of 3]    [Menu Updated: Mar 1, 2026]
[First page only:  View online: https://joespizza.menulist.ai]
[First page only:               Print at 100% scale for best results]
```

Implementation: Rendered in a post-processing loop (`doc.setPage(i)`) after all content pages are created.

### 2.7 localStorage Version Tracking

On every successful PDF generation, store:

```typescript
// Already stored (existing):
localStorage.setItem(
  `menulist_last_pdf_download_${projectId}`,
  Date.now().toString(),
);

// NEW — content-based menu version:
localStorage.setItem(`menulist_last_pdf_version_${projectId}`, menuVersion);
```

---

## 3. Feature Flag Integration

`src/config/features.ts`:

```typescript
ENABLE_PDF_SURFACE: true,
```

`src/lib/export/menuPdfGenerator.ts` — the flag is checked inside `generateMenuPdf()`:

```typescript
import { FEATURE_FLAGS } from "@/config/features";

// Inside generateMenuPdf():
const enhanced = FEATURE_FLAGS.ENABLE_PDF_SURFACE;
```

The flag gates:

- Dark header band with letter spacing (vs legacy plain text header)
- Density-conditional dashed leader lines (compact/high-density only)
- Left accent bars on category headers
- Content-based CRC32 versioning + three-zone footer + print instruction
- Density auto-detection + page-count guard
- Price column lock (22mm fixed), normal weight prices
- Description clamping (400 chars), attribute limiting (6 max)
- Emoji/glyph stripping, long name truncation
- Category top spacing, page-top padding, micro-spacing

Core PDF generation (jsPDF, categories, items, prices) runs regardless of flag.

---

## 4. ShareModal Integration

`src/components/templates/main-app/projects/b2cView/shareModal/index.tsx`

ShareModal imports `generateMenuPdf` + `downloadPdf` (not `generateAndDownloadMenuPdf`) so it can capture `snapshotHash`:

```typescript
const { generateMenuPdf, downloadPdf } = await import('@lib/export/menuPdfGenerator');
const pdfResult = await generateMenuPdf({ ... });
downloadPdf(pdfResult);
localStorage.setItem(`menulist_last_pdf_download_${projectId}`, Date.now().toString());
if (pdfResult.snapshotHash) {
    localStorage.setItem(`menulist_last_pdf_version_${projectId}`, pdfResult.snapshotHash);
}
```

Optional — pass store address/contact when available for richer header:

```typescript
address: storeSettings?.address,
contactLine: storeSettings?.phone || storeSettings?.website,
```

---

## 5. Version History

| Version | Date    | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0     | 2024    | Initial jsPDF generator, basic header/footer                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2.0     | 2026-02 | Density detection, snapshot hash, improved footer layout, address/contact header, block-based pagination                                                                                                                                                                                                                                                                                                                                                                       |
| 2.1     | 2026-03 | Professional bistro layout: full-width charcoal header band, dotted leader lines, left category accent bars, italic descriptions, refined typography hierarchy                                                                                                                                                                                                                                                                                                                 |
| 2.2     | 2026-03 | Michelin typography: CRC32 content versioning, extracted snapshot builder, density-conditional leaders (clean standard / dashed compact), price column lock (22mm), normal-weight prices, letter-spaced header, description clamping (400 chars), attribute cap (6), emoji stripping, long name truncation, page-count guard (>6 pages → high-density), micro-spacing every 6 items, category breathing room, page-top padding, "Menu Updated:" footer text, print instruction |
