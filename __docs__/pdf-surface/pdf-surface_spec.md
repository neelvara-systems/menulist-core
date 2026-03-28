# PDF Surface — Product Specification

**Feature:** PDF Surface (Enhanced Menu PDF Generation)
**Version:** 2.2 — Professional Bistro Layout with Michelin Typography
**Status:** Active
**Last Updated:** 2026-03
**Feature Flag:** `ENABLE_PDF_SURFACE`

---

## 1. What This Is

The PDF Surface is the printable representation of a MenuList digital menu. It generates a print-ready A4 PDF from live menu data, guaranteeing that prices on printed menus always match prices online.

This is infrastructure. It runs automatically. Owners do not configure it.

---

## 2. Problem It Solves

Printed menus go stale. Owners print a PDF, prices change online, and customers are quoted wrong prices. The PDF Surface eliminates this problem by:

1. Generating PDFs on-demand from live data (no stale content)
2. Stamping every PDF with a version hash and generation timestamp
3. Printing the official menu URL so stale PDFs can be identified
4. Warning owners when menu data has changed since their last download

---

## 3. What Owners See

Owners access PDF download from the **Share Modal** on any project. No new UI surface. No new settings page.

The generated PDF:

- Has the business name prominently in the header
- Groups items by category
- Shows prices in the configured currency
- Has a footer with "Updated on: [date]", the official menu URL, and a version ID
- Works at A4 size, portrait orientation

---

## 4. Density Modes

The system auto-detects the appropriate density mode based on total item count. Owners do not choose.

| Mode         | Item Count  | Line Spacing | Font Size (item) | Description Font |
| ------------ | ----------- | ------------ | ---------------- | ---------------- |
| Standard     | ≤ 40 items  | 5mm          | 11pt             | 9pt              |
| Compact      | 41–80 items | 3.5mm        | 10pt             | 8pt              |
| High-Density | 81+ items   | 2.5mm        | 9pt              | 7pt              |

Auto-detection runs at generation time. No stored preference.

---

## 5. Versioning / Content Hash

Every PDF carries a **content-based menu version** in the footer:

```
m-[crc32-base36]
```

Example: `m-x9af2`

The version is a CRC32 hash of the canonical menu snapshot (store name, currency, language, all categories, items, prices, descriptions, attributes). Two identical menus always produce the same version. Two different menus always produce different versions.

A separate **generation ID** (`g-[base36-timestamp]`) is created internally but not shown in the PDF footer — only the content version appears publicly.

Purpose: Identify which "version" of the menu a printed PDF represents. If a customer disputes a price, the version ID pinpoints the exact menu state.

This is stored in `localStorage` as `menulist_last_pdf_version_{projectId}` alongside the existing freshness tracking.

---

## 6. Footer (All Pages)

Every page of the PDF has a footer with three zones:

**Left zone:** Menu version (`m-x9af2`)
**Center zone:** Page number (`Page 1 of 3`)
**Right zone:** "Menu Updated: [date]" (Pricing Integrity FR-7.3)

First page only — below the standard footer — adds:

- Official menu URL (`menuUrl`)
- Print instruction: "Print at 100% scale for best results" (right-aligned, very light)

---

## 7. Header

Page 1 has a **full-width charcoal band** (`#2d2d2d`) — not a plain text header:

- Store name in white, 20pt bold uppercase, centered inside the band
- Address line (if provided): 8pt, light gray (`rgb(190,190,190)`), centered
- Contact line (if provided): 8pt, light gray, centered
- Band height: 22mm (no subtext) or 28mm (with address/contact)

Design rationale: dark band creates immediate visual authority on the page. Prints cleanly on all printer types. No owner configuration.

---

## 8. Pagination Rules

Block-based pagination: the system never breaks mid-category or mid-item.

**Rules (in priority order):**

1. A category header + at least `min(2, categoryItemCount)` items must fit on the same page, or the whole category block moves to next page
2. An item name + description must stay together (no widow description line)
3. Attributes are treated as part of the item block
4. Extra 6mm padding when a category starts at the top of a new page
5. Auto-switch to high-density mode if generated PDF exceeds 6 pages

**Orphan control:**

- If ≤ 2 items remain on a page after the last category, they are pulled to the next page with their category header

**Micro-spacing:**

- Every 6 items within a long category, a subtle 1.5mm breathing break is inserted to improve scan readability

---

## 9. Freshness Warning

The ShareModal shows a "stale PDF" warning when:

- `localStorage.menulist_last_pdf_download_{projectId}` exists
- The project's `updatedAt` timestamp is newer than that stored download time

This is existing behavior (preserved). The version hash adds a second layer of identification.

---

## 10. Item Row Layout

Item rows use **density-conditional leader lines**:

- **Standard density** (≤40 items): Clean alignment, no leaders — Michelin style
- **Compact / High-density** (41+ items): Dashed leader lines drawn between name and price

```
Bruschetta                              ₹ 180.00
  Toasted bread with tomatoes and basil (italic, gray)
  · Large portion  ₹ 220.00
```

- Name: bold, dark (`rgb(20,20,20)`)
- Leaders: drawn dashed lines (not text dots) — compact/high-density only
- Price: **normal weight** (not bold), right-aligned in fixed 22mm column
- Description: italic, indented 4mm, `rgb(110,110,110)`, clamped at 400 characters
- Attributes: `·` prefix, smaller font, `rgb(130,130,130)`, max 6 per item
- Long item names: truncated with ellipsis so price stays on the first line
- Currency: space after symbol (`₹ 180` not `₹180`)

This layout creates professional restaurant typography that prints cleanly on any printer.

## 11. Category Header Style

Each category uses:

- **Left accent bar**: 3mm wide × 8mm tall filled charcoal rectangle
- **Category name**: bold uppercase, charcoal, beside the bar
- **Full-width rule**: thin horizontal line below, `rgb(80,80,80)`

This gives clear visual hierarchy without decorative excess.

## 12. QR Code in Footer (Future)

Deferred. `menuUrl` appears as plain text on page 1 footer — readable and scannable by smart phones.

---

## 11. Out of Scope

- Owner configuration of PDF layout, colors, fonts — **never**
- Logo embedding — requires external image fetch, cross-origin issues, deferred
- Background regeneration / auto-email of PDFs — flagged off in Pricing Integrity spec
- QR code per page — deferred
- Custom paper sizes (A5, letter) — deferred
- Password-protected PDFs — not planned
- Item reordering by readability score — violates menu truth principle
- "Powered by MenuList" branding — violates language governance
- MOL PDF_GENERATED event — breaks $0 cost model
- Hide descriptions for large menus — violates truth principle
- Menu language label in header — unnecessary cognitive load

---

## 12. Dependencies

| Library  | Already in bundle        | Purpose              |
| -------- | ------------------------ | -------------------- |
| `jspdf`  | ✅ Yes                   | PDF generation       |
| `qrcode` | ✅ Yes (via Share Modal) | Future: QR in footer |

No new dependencies required for v2.0.

---

## 13. Feature Flag

`ENABLE_PDF_SURFACE` in `src/config/features.ts`

When `false`: PDF download still works using the legacy generator path. The enhanced generator is not used.
When `true`: Enhanced generator with versioning, density detection, and improved header/footer.

Default: `true` (improvement is safe and backward-compatible).

---

## 14. Related Docs

- `__docs__/pricing-integrity-system/pricing-integrity-system_spec.md` — FR-7.3 (PDF Updated On footer)
- `__docs__/physical-surfaces/physical-surfaces_spec.md` — Tent cards and stickers (separate surface)
- `src/lib/export/menuPdfGenerator.ts` — Implementation
- `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx` — Integration point
