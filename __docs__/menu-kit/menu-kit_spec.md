# Menu Kit — Specification

**Version:** 1.2  
**Status:** ✅ IMPLEMENTED — Feature flags ON (`ENABLE_MENU_KIT`, `ENABLE_MENU_KIT_UTM`)  
**Authority:** Founder  
**Source:** ChatGPT Session #11 → Cascade Review + Codebase Cross-Check  
**Last Updated:** March 14, 2026 — Entrance poster, print instructions, QR hardening, placement guide enhancements

---

## Problem Statement

When a menu goes live, owners receive a link. But the gap between "link exists" and "customers are scanning it" is where most QR menu products fail. Owners don't know:

- What to print (size? format? where to get it printed?)
- Where to place QR (tables? counter? entrance?)
- What to post online (Instagram? WhatsApp? Google Maps?)
- What to tell staff ("say this line")

Menu Kit eliminates every one of these decisions by auto-generating a complete deployment pack.

---

## Success Metric

> **"Owner receives Menu Kit → deploys QR within 24 hours → customers are scanning within 48 hours."**

If the owner has to think about what to print or where to post, Menu Kit has failed.

---

## Scope (Frozen — 10 Assets + Print Instructions)

### Print Assets (Offline Deployment)

#### 1. Table Tent — A6 PDF

| Attribute       | Value                          |
| --------------- | ------------------------------ |
| **File format** | PDF                            |
| **Size**        | 105mm × 148mm (A6 portrait)    |
| **Print spec**  | 300 GSM matte recommended      |
| **Filename**    | `{StoreName}_TableTent_A6.pdf` |

**Content layout:**

```
┌─────────────────────┐
│                     │
│  SCAN TO VIEW MENU  │  ← Bold, large
│                     │
│      ( QR CODE )    │  ← Min 40mm × 40mm
│                     │
│    {Store Name}     │  ← Medium
│                     │
│  Menu & prices      │  ← Small, secondary
│  updated regularly  │
│                     │
│  Updated on: {date} │  ← Tiny footer (optional)
│                     │
└─────────────────────┘
```

**Auto-filled fields:**

- Store name (from store document)
- QR code (encodes menu URL)
- "Updated on" date (from last publish timestamp)

#### 2. Counter Sticker — 8×8 PNG

| Attribute       | Value                                |
| --------------- | ------------------------------------ |
| **File format** | PNG (primary) + PDF (print)          |
| **Size**        | 80mm × 80mm                          |
| **Print spec**  | Matte sticker recommended            |
| **Filename**    | `{StoreName}_CounterSticker_8x8.png` |

**Content layout:**

```
┌──────────────┐
│ SCAN FOR     │  ← Bold
│ MENU         │
│              │
│  ( QR CODE ) │  ← Min 40mm
│              │
│ {Store Name} │  ← Small
└──────────────┘
```

#### 3. Entrance Poster — A4 PDF

| Attribute       | Value                               |
| --------------- | ----------------------------------- |
| **File format** | PDF                                 |
| **Size**        | 210mm × 297mm (A4 portrait)         |
| **Print spec**  | 200–300 GSM matte recommended       |
| **Filename**    | `{StoreName}_EntrancePoster_A4.pdf` |

**Content layout:**

```
┌─────────────────────────┐
│                         │
│      OUR MENU           │  ← Bold, large
│                         │
│     ( QR CODE )          │  ← 80mm × 80mm (scannable from 1–2m)
│                         │
│  Scan to view menu       │
│  Open camera → point at QR │
│  Or open: {short link}   │
│                         │
│     {Store Name}         │  ← Large
│                         │
│  Menu powered by MenuList │  ← Tiny footer
└─────────────────────────┘
```

**Purpose:** Highest discovery surface — customers check menu before entering. QR is larger than table tent for scanning from distance.

#### 4. Delivery Bag Sticker — 6×6 PNG

| Attribute       | Value                             |
| --------------- | --------------------------------- |
| **File format** | PNG                               |
| **Size**        | 60mm × 60mm                       |
| **Print spec**  | Vinyl matte sticker               |
| **Filename**    | `{StoreName}_DeliveryBag_6x6.png` |

**Content layout:**

```
┌──────────────┐
│ VIEW MENU    │  ← Bold
│              │
│  ( QR CODE ) │  ← Min 34mm
│              │
│ {Store Name} │  ← Small
│ {short link} │  ← Tiny
└──────────────┘
```

**Purpose:** Off-site discovery surface — customers receiving deliveries scan to view/reorder from the menu. Creates permanent distribution node outside the restaurant.

#### 5. Takeaway Card — 85×55 PNG

| Attribute       | Value                                  |
| --------------- | -------------------------------------- |
| **File format** | PNG                                    |
| **Size**        | 85mm × 55mm (business card, landscape) |
| **Print spec**  | 250–300 GSM matte card                 |
| **Filename**    | `{StoreName}_TakeawayCard_85x55.png`   |

**Content layout:**

```
┌────────────────────────────────────────┐
│                                        │
│  ( QR CODE )    {Store Name}           │  ← QR left, text right
│                 SAVE OUR MENU          │
│                 Scan to view menu      │
│                 {short link}           │
│                                        │
└────────────────────────────────────────┘
```

**Purpose:** Business-card-sized insert for takeaway bags/boxes. Customers keep the card and scan later — creates reorder path from home.

### Social Assets (Online Distribution)

#### 6. Instagram Story — 1080×1920 PNG

| Attribute       | Value                            |
| --------------- | -------------------------------- |
| **File format** | PNG                              |
| **Size**        | 1080 × 1920 pixels               |
| **Filename**    | `{StoreName}_InstagramStory.png` |

**Content layout:**

```
┌──────────────────┐
│                  │
│   {Store Name}   │  ← Bold, top
│                  │
│  MENU IS LIVE ✅  │  ← Medium
│                  │
│   ( QR CODE )    │  ← Center, large
│                  │
│ Scan to view     │
│ our full menu    │
│                  │
│ {short link}     │  ← Small footer
│                  │
└──────────────────┘
```

#### 7. WhatsApp Status — 1080×1920 PNG

| Attribute       | Value                            |
| --------------- | -------------------------------- |
| **File format** | PNG                              |
| **Size**        | 1080 × 1920 pixels               |
| **Filename**    | `{StoreName}_WhatsAppStatus.png` |

**Content layout:**

```
┌──────────────────┐
│                  │
│   {Store Name}   │
│                  │
│  Updated Menu ✅  │
│                  │
│   ( QR CODE )    │
│                  │
│  Scan / Tap to   │
│  view menu       │
│                  │
│  {short link}    │
│                  │
└──────────────────┘
```

#### 8. Google Maps Upload — 1200×900 PNG

| Attribute       | Value                        |
| --------------- | ---------------------------- |
| **File format** | PNG                          |
| **Size**        | 1200 × 900 pixels            |
| **Filename**    | `{StoreName}_GoogleMaps.png` |

**Content layout:**

```
┌─────────────────────────────────┐
│                                 │
│    OFFICIAL MENU                │  ← Bold, left-aligned
│                                 │
│    ( QR CODE )    {Store Name}  │  ← QR left, text right
│                                 │
│    {short link}                 │  ← Small
│    Updated regularly            │  ← Small, secondary
│                                 │
└─────────────────────────────────┘
```

### Operational Assets

#### 9. Placement Guide — PNG

| Attribute       | Value                            |
| --------------- | -------------------------------- |
| **File format** | PNG                              |
| **Size**        | 1080 × 1080 (square, shareable)  |
| **Filename**    | `{StoreName}_PlacementGuide.png` |

**Content:**

```
WHERE TO PLACE YOUR QR

✅ Tables: 1 tent per table (center)
✅ Counter: 1 sticker near payment machine
✅ Entrance: optional poster for quick scan
✅ Delivery: 1 sticker per bag/box

PRINT SIZES:
• Table QR: 5×5 cm minimum
• Counter QR: 8×8 cm
• Poster QR: 12×12 cm
```

#### 10. Staff Script — Text

Not a file. A text line included in the delivery message and optionally shown in the UI.

**Text:** `"Menu? Please scan the QR on the table or at the counter."`

**Purpose:** Standardizes staff response. Prevents paper menu fallback. Increases QR scan adoption.

---

## Auto-Fill Data Sources

| Field             | Source            | Firestore Path                                           |
| ----------------- | ----------------- | -------------------------------------------------------- |
| Store name        | Store document    | `stores/{sId}.businessName`                              |
| QR code           | Menu URL          | Generated from subdomain + project slug                  |
| Menu link         | Project URL       | `{subdomain}.menulist.ai/{slug}`                         |
| Short link        | Same as menu link | Displayed as `menulist.ai/{slug}`                        |
| "Updated on" date | Last publish      | `projects/{docId}.modifiedOn`                            |
| Store logo        | Store document    | `stores/{sId}.logoUrl` (optional, for premium templates) |

---

## Generation Trigger

Menu Kit is generated **client-side on demand** when the owner clicks "Download Menu Kit." Assets are NOT pre-generated or stored in Firestore.

**Why client-side:**

- Zero Firebase storage cost
- Zero Firebase write cost
- Assets use existing libraries (jsPDF, canvas, qrcode)
- No CDN/storage management needed

### UTM-Tagged QR Codes (Scan Attribution)

When `ENABLE_MENU_KIT_UTM` is ON (default), each asset’s QR code encodes a UTM-tagged URL:

| Asset           | QR URL                                                   | UTM Medium        |
| --------------- | -------------------------------------------------------- | ----------------- |
| Table Tent      | `menuUrl?utm_source=menu_kit&utm_medium=table_tent`      | `table_tent`      |
| Counter Sticker | `menuUrl?utm_source=menu_kit&utm_medium=counter_sticker` | `counter_sticker` |
| Entrance Poster | `menuUrl?utm_source=menu_kit&utm_medium=entrance_poster` | `entrance_poster` |
| Delivery Bag    | `menuUrl?utm_source=menu_kit&utm_medium=delivery_bag`    | `delivery_bag`    |
| Takeaway Card   | `menuUrl?utm_source=menu_kit&utm_medium=takeaway_card`   | `takeaway_card`   |
| Instagram Story | `menuUrl?utm_source=menu_kit&utm_medium=instagram_story` | `instagram_story` |
| WhatsApp Status | `menuUrl?utm_source=menu_kit&utm_medium=whatsapp_status` | `whatsapp_status` |
| Google Maps     | `menuUrl?utm_source=menu_kit&utm_medium=google_maps`     | `google_maps`     |
| Placement Guide | Plain `menuUrl` (no QR in guide)                         | —                 |

This enables the existing Unified Analytics (`viewsBySource`, `viewsByMedium`) to attribute scans to specific physical/digital placements. Zero new Firebase cost — UTM params are already captured by the existing tracking pipeline.

### Download Analytics

A lightweight GA4-only event (`MENU_KIT_DOWNLOAD`) is fired when the owner:

- Downloads the ZIP bundle (`zip_download`)
- Shares an individual asset (`share_instagram`, `share_whatsapp`, `share_google_maps`)

This is an owner-side event — **zero Firestore writes**. GA4 only.

---

## UI Integration

### Option A: Add to Share Modal (Recommended)

Add a "Menu Kit" section inside the existing Share Modal (`src/components/.../shareModal/index.tsx`):

```
Share your menu
├── Link + QR Code (existing)
├── Social Sharing (existing: WhatsApp, Instagram, Facebook)
├── Print Menu / Menu Card Export (linked route)
└── 📦 Menu Kit (NEW)
    └── "Download Menu Kit" button
    └── Downloads ZIP with all 9 asset files + shows staff script
```

### Option B: Standalone "Menu Kit" tab in Project View

Separate tab/section in project B2C view. Less discoverable but cleaner separation.

**Decision: Option A** — integrated into existing Share Modal for zero new navigation.

---

## What Is NOT in Menu Kit (Permanently Rejected)

| Rejected Item                       | Why                                           | Doctrine Reference                                 |
| ----------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| ❌ Offer/discount posters           | Feature creep → campaign management territory | Law 7: No Feature Without Autonomy                 |
| ❌ Review QR cards                  | Not core menu infrastructure                  | Product Evolution Rule 2: Customer-facing only     |
| ❌ Design editor / customization UI | Turns MenuList into Canva                     | Product Taste: "Infrastructure, not software"      |
| ❌ Full menu-card PDF workflow      | Belongs in Menu Card Export route             | Separate print workflow, not QR deployment pack    |
| ❌ Festival/seasonal templates      | Creates ongoing maintenance burden            | Feature Rejection Gate Q2: Cannot act autonomously |
| ❌ Takeaway stickers (4×4)          | Low priority, owners can crop counter sticker | P2 at best                                         |
| ❌ WiFi password field              | Scope creep, not menu infrastructure          | Product Taste: "Should this exist at all?"         |
| ❌ Custom colors/fonts/backgrounds  | Design tool territory                         | Product Taste: "No Cognitive Load"                 |

---

## Governance Alignment

| Gate                                                       | Pass? | Evidence                                                      |
| ---------------------------------------------------------- | ----- | ------------------------------------------------------------- |
| Feature Rejection Gate Q1: Reduce owner thinking?          | ✅    | Owner gets ready-to-use assets, zero decisions                |
| Feature Rejection Gate Q2: Act autonomously?               | ✅    | Auto-generated from store data, no configuration              |
| Feature Rejection Gate Q3: Strengthen behavioral adoption? | ✅    | Drives QR deployment + social sharing → first-update behavior |
| Feature Rejection Gate Q4: Customer-facing layer?          | ✅    | All assets are customer-facing (QR, social, maps)             |
| Feature Rejection Gate Q5: Right for current stage?        | ✅    | Phase 0 (Behavioral Anchoring) — creates physical dependency  |
| Product Taste: Infrastructure or software?                 | ✅    | No choices, no customization, just "download and deploy"      |
| Category Dominance Rule 1: Upstream?                       | ✅    | Owner puts QR everywhere → MenuList = canonical source        |
| 5-Minute Understanding Rule                                | ✅    | Download → Print → Place. Under 5 minutes.                    |

---

## Dependencies

| Dependency                         | Status               | Notes                                                        |
| ---------------------------------- | -------------------- | ------------------------------------------------------------ |
| `jspdf` npm package                | ✅ Already installed | Used by tentCardGenerator.ts                                 |
| `qrcode` npm package               | ✅ Already installed | Used by stickerGenerator.ts + feedbackQrCode.ts              |
| Canvas API (browser)               | ✅ Available         | Used by existing sticker generator                           |
| JSZip (for ZIP bundle)             | ✅ Installed         | Lightweight, ~100KB. Bundles all files into single download. |
| Store data (name, logo, subdomain) | ✅ Available         | Already in Redux store state                                 |
| Menu URL                           | ✅ Available         | Already computed in Share Modal                              |

---

**Document Signature:** Feature Specification  
**Created:** February 21, 2026  
**Last Updated:** March 14, 2026  
**Review:** Founder approval required before implementation
