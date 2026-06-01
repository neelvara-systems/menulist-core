# Physical Surfaces — Implementation Guide

**Created:** January 11, 2026  
**Status:** ⚠️ LEGACY — Superseded by [Menu Kit](../menu-kit/menu-kit_impl.md) for identity surfaces  
**Parent Doc:** `physical-surfaces_spec.md`  
**Note:** This implementation guide describes campaign-based recommendation surfaces. For the canonical physical surface system (identity infrastructure), see `__docs__/menu-kit/menu-kit_impl.md`.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Nightly Sync)                      │
├─────────────────────────────────────────────────────────────────┤
│  Campaign Summary Sync (2:30 AM UTC)                            │
│                                                                 │
│  1. Calculate tent card eligibility (confidence ≥ 0.7)          │
│  2. Calculate sticker eligibility (confidence ≥ 0.8, 7+ days)   │
│  3. Select template based on campaign type                      │
│  4. Store in physicalSurfaces field                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (On Demand)                        │
├─────────────────────────────────────────────────────────────────┤
│  Today Tab reads physicalSurfaces                               │
│                                                                 │
│  If eligible:                                                   │
│    Show "Tent card is ready" / "Counter sticker is ready"       │
│    [Download] → Client-side PDF/PNG generation                  │
│                                                                 │
│  If not eligible:                                               │
│    Hide section completely (no "coming soon")                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Type Definitions

```typescript
// src/types/campaigns.ts

/**
 * Physical Surface Eligibility
 * Added to CampaignsSummaryDocument
 */
export interface PhysicalSurfaceEligibility {
  tentCard?: TentCardEligibility;
  counterSticker?: CounterStickerEligibility;
}

export interface TentCardEligibility {
  eligible: boolean;
  itemId?: string;
  itemName?: string;
  itemImageUrl?: string;
  templateId: TentCardTemplate;
  confidence: number;
  qrUrl: string;
  recheckAfter: Timestamp; // Not expiry — system rechecks eligibility after this date
}

export interface CounterStickerEligibility {
  eligible: boolean;
  itemId?: string;
  itemName?: string;
  templateId: CounterStickerTemplate;
  confidence: number;
  stableSinceDays: number;
  qrUrl: string;
  recheckAfter: Timestamp; // Not expiry — system rechecks eligibility after this date
}

export type TentCardTemplate = 1 | 2 | 3 | 4 | 5;
export type CounterStickerTemplate = 1 | 2 | 3 | 4;

/**
 * Template Copy Definitions
 */
export const TENT_CARD_TEMPLATES: Record<TentCardTemplate, string> = {
  1: "Most customers order {{item_name}}",
  2: "Short on time? {{item_name}} is ready fastest",
  3: "If you're unsure, start with {{item_name}}",
  4: "{{item_a}} + {{item_b}} is the most chosen combo",
  5: "Customers often try this first",
};

export const COUNTER_STICKER_TEMPLATES: Record<CounterStickerTemplate, string> =
  {
    1: "Most customers order this first",
    2: "Regular customers choose this",
    3: "Not sure what to order? Start here.",
    4: "This combo is chosen most often",
  };
```

---

## Backend: Eligibility Calculation

```typescript
// src/lib/physical-surfaces/eligibility.ts

import {
  TodayCampaignSummary,
  PhysicalSurfaceEligibility,
} from "@type/campaigns";
import { Timestamp } from "firebase/firestore";

const TENT_CARD_THRESHOLD = 0.7; // Higher than campaigns (printed = public + persistent)
const COUNTER_STICKER_THRESHOLD = 0.8; // Highest of all surfaces
const STICKER_STABILITY_DAYS = 7;

/**
 * Calculate physical surface eligibility
 * Called during campaign summary sync
 */
export function calculatePhysicalSurfaceEligibility(
  primary: TodayCampaignSummary | undefined,
  menuQrUrl: string,
  itemStabilityDays?: number,
): PhysicalSurfaceEligibility {
  const result: PhysicalSurfaceEligibility = {};

  if (!primary || !primary.subject?.itemName) {
    return result;
  }

  // Tent Card: Lower threshold
  if (primary.confidence >= TENT_CARD_THRESHOLD) {
    result.tentCard = {
      eligible: true,
      itemId: primary.subject.itemId,
      itemName: primary.subject.itemName,
      itemImageUrl: primary.subject.itemImageUrl,
      templateId: selectTentCardTemplate(primary.type),
      confidence: primary.confidence,
      qrUrl: menuQrUrl,
      recheckAfter: getValidUntil(7), // System rechecks eligibility after 7 days
      // Invalidation by EVENTS, not time expiry:
      // - Item disabled / removed
      // - Item unavailable for N days
      // - Confidence drops below threshold
    };
  }

  // Counter Sticker: Higher threshold + stability
  const stableDays = itemStabilityDays || 0;
  if (
    primary.confidence >= COUNTER_STICKER_THRESHOLD &&
    stableDays >= STICKER_STABILITY_DAYS
  ) {
    result.counterSticker = {
      eligible: true,
      itemId: primary.subject.itemId,
      itemName: primary.subject.itemName,
      templateId: selectStickerTemplate(primary.type),
      confidence: primary.confidence,
      stableSinceDays: stableDays,
      qrUrl: menuQrUrl,
      recheckAfter: getValidUntil(30), // System rechecks eligibility after 30 days
      // Invalidation by EVENTS, not time expiry:
      // - Item disabled / removed
      // - Item unavailable
      // - Confidence drops below threshold
    };
  }

  return result;
}

function selectTentCardTemplate(campaignType: string): TentCardTemplate {
  // IMPORTANT: Template 5 is BANNED from physical surfaces
  // "Customers often try this first" = exploratory, not print-worthy
  // Only authoritative templates (1-4) are eligible for print

  switch (campaignType) {
    case "meal_push":
    case "bestseller_boost":
      return 1; // "Most customers order..." — default authority
    case "quick_pick":
      return 2; // "Short on time?" — speed-focused
    case "todays_special":
      return 3; // "If you're unsure..." — decision helper
    default:
      return 1; // Default to Template 1 (most authoritative)
    // Template 5 explicitly excluded from physical surfaces
  }
}

function selectStickerTemplate(campaignType: string): CounterStickerTemplate {
  switch (campaignType) {
    case "bestseller_boost":
      return 2; // "Regular customers choose..."
    default:
      return 1; // "Most customers order this first"
  }
}

function getValidUntil(days: number): Timestamp {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return Timestamp.fromDate(date);
}
```

---

## Backend: Current Integration

Physical-surface eligibility is stored on `platformSummary/campaigns_{sId}.physicalSurfaces` and read through `getTodayCampaigns`. The old campaign sync helper has been removed from active code; any future writer must update the summary document directly in the same write path that creates or mutates the prepared Today action.

---

## Frontend: PDF Generator

```typescript
// src/lib/physical-surfaces/tentCardGenerator.ts

import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { TENT_CARD_TEMPLATES, TentCardTemplate } from "@type/campaigns";

interface TentCardOptions {
  itemName: string;
  templateId: TentCardTemplate;
  qrUrl: string;
  size: "A6" | "A5";
  brandName?: string;
}

export async function generateTentCardPDF(
  options: TentCardOptions,
): Promise<Blob> {
  const { itemName, templateId, qrUrl, size, brandName } = options;

  // Size dimensions in mm
  const dimensions =
    size === "A6" ? { width: 105, height: 148 } : { width: 148, height: 210 };

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [dimensions.width, dimensions.height],
  });

  // Get template copy
  const template = TENT_CARD_TEMPLATES[templateId];
  const copy = template.replace("{{item_name}}", itemName);

  // Main copy (centered, large)
  doc.setFontSize(size === "A6" ? 18 : 24);
  doc.setFont("helvetica", "bold");

  const textLines = doc.splitTextToSize(copy, dimensions.width - 20);
  const textY = 40;
  doc.text(textLines, dimensions.width / 2, textY, { align: "center" });

  // QR Code
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 200,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const qrSize = size === "A6" ? 40 : 50;
  const qrX = (dimensions.width - qrSize) / 2;
  const qrY = dimensions.height - qrSize - 30;

  doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

  // Brand footer
  if (brandName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128);
    doc.text(brandName, dimensions.width / 2, dimensions.height - 10, {
      align: "center",
    });
  }

  return doc.output("blob");
}
```

---

## Frontend: Sticker Generator

```typescript
// src/lib/physical-surfaces/stickerGenerator.ts

import QRCode from "qrcode";
import {
  COUNTER_STICKER_TEMPLATES,
  CounterStickerTemplate,
} from "@type/campaigns";

interface StickerOptions {
  itemName: string;
  templateId: CounterStickerTemplate;
  qrUrl: string;
}

/**
 * Generate counter sticker as PNG (80mm x 80mm at 300dpi = 945px)
 */
export async function generateStickerPNG(
  options: StickerOptions,
): Promise<Blob> {
  const { itemName, templateId, qrUrl } = options;

  const SIZE = 945; // 80mm at 300dpi
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;

  const ctx = canvas.getContext("2d")!;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Border
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, SIZE - 40, SIZE - 40);

  // Main copy
  const template = COUNTER_STICKER_TEMPLATES[templateId];
  ctx.fillStyle = "#000000";
  ctx.font = "bold 48px system-ui";
  ctx.textAlign = "center";

  // Word wrap
  const maxWidth = SIZE - 100;
  const words = template.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  const lineHeight = 60;
  const textStartY = 150;
  lines.forEach((line, i) => {
    ctx.fillText(line, SIZE / 2, textStartY + i * lineHeight);
  });

  // QR Code
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, qrUrl, { width: 300, margin: 1 });

  const qrX = (SIZE - 300) / 2;
  const qrY = SIZE - 350;
  ctx.drawImage(qrCanvas, qrX, qrY);

  // Item name (below QR)
  ctx.font = "32px system-ui";
  ctx.fillStyle = "#666666";
  ctx.fillText(itemName, SIZE / 2, SIZE - 30);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}
```

---

## Frontend: Today Tab Components

```typescript
// src/components/templates/main-app/today/components/TentCardSection.tsx

"use client";

import { PhysicalSurfaceEligibility } from "@type/campaigns";
import { Button, Card, Radio, Space, Typography } from "antd";
import { useState } from "react";
import { LuDownload, LuPrinter } from "react-icons/lu";
import { generateTentCardPDF } from "@lib/physical-surfaces/tentCardGenerator";

const { Text } = Typography;

interface TentCardSectionProps {
  tentCard: NonNullable<PhysicalSurfaceEligibility["tentCard"]>;
  brandName?: string;
}

/**
 * System-decided size selection
 * Per spec: Owner never chooses, system decides
 */
function getSystemSize(placementHint?: "table" | "counter"): "A6" | "A5" {
  // Tables → A6 (standard), Counters → A5 (visibility)
  return placementHint === "counter" ? "A5" : "A6";
}

export default function TentCardSection({
  tentCard,
  brandName,
}: TentCardSectionProps) {
  const [downloading, setDownloading] = useState(false);

  // System-decided size (no owner selection)
  const size = getSystemSize("table");

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await generateTentCardPDF({
        itemName: tentCard.itemName!,
        templateId: tentCard.templateId,
        qrUrl: tentCard.qrUrl,
        size,
        brandName,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tent-card-${size.toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card size="small" style={{ marginTop: 16 }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LuPrinter size={20} />
          <Text strong>Table tent is ready</Text>
        </div>

        <Text type="secondary">Best for walk-in customers today</Text>

        {/* Size shown as info, not selection */}
        <Text type="secondary" style={{ fontSize: 12 }}>
          Size: {size} (recommended for tables)
        </Text>

        <Button
          type="primary"
          icon={<LuDownload />}
          onClick={handleDownload}
          loading={downloading}
          block
        >
          Download tent card
        </Button>
      </Space>
    </Card>
  );
}
```

---

## Integration with Today Screen

```typescript
// Add to src/components/templates/main-app/today/index.tsx

import TentCardSection from "./components/TentCardSection";
import StickerSection from "./components/StickerSection";

// Inside TodayScreen component, after PrimaryCard:

{
  /* Physical Surfaces */
}
{
  todayCampaigns.physicalSurfaces?.tentCard?.eligible && (
    <TentCardSection
      tentCard={todayCampaigns.physicalSurfaces.tentCard}
      brandName={storeInfo?.name}
    />
  );
}

{
  todayCampaigns.physicalSurfaces?.counterSticker?.eligible && (
    <StickerSection sticker={todayCampaigns.physicalSurfaces.counterSticker} />
  );
}
```

---

## Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "jspdf": "^2.5.1",
    "qrcode": "^1.5.3"
  }
}
```

---

## Testing Checklist

- [ ] Tent card PDF renders correctly on A6
- [ ] Tent card PDF renders correctly on A5
- [ ] QR code scans properly from PDF
- [ ] Counter sticker PNG at correct DPI (300)
- [ ] Templates display correct copy
- [ ] Eligibility gate enforced (no show when ineligible)
- [ ] Download triggers file save
- [ ] Works on mobile browser

---

**Implementation Effort:** 1 week  
**Dependencies:** jspdf, qrcode  
**Breaking Changes:** None (additive only)
