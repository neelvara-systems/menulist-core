# Customer Communication Kit — Implementation Plan

> **Version:** 1.0
> **Last Updated:** March 15, 2026
> **Audience:** Developers

---

## 1. Architecture Overview

Customer Communication Kit is a **pure string template layer**. It reads existing store data (name, address, phone, working hours, menu link) and generates pre-filled message strings. Zero new collections, zero new API routes. All computation is client-side.

```
Store Data (PlatformGlobalDataContext)
  ↓
messageTemplates.ts (generate messages)
  ↓
CommunicationKit.tsx (render message cards)
  ↓
Copy to clipboard / WhatsApp deep link
```

---

## 2. Template Engine

### 2.1 Message Template Function

```typescript
// src/lib/communication/messageTemplates.ts

import { getOfferingLabels } from '@lib/menu-kit/businessTypeLabels';

export interface MessageTemplateInput {
  storeName: string;
  businessType: string;
  menuLink: string;
  address?: string;
  phone?: string;
  todayHours?: { open: string; close: string } | null;
}

export interface MessageTemplate {
  id: string;
  title: string;
  description: string;
  message: string;
}

export function generateMessageTemplates(input: MessageTemplateInput): MessageTemplate[] {
  const labels = getOfferingLabels(input.businessType);
  const templates: MessageTemplate[] = [];

  // Template 1: Send Menu
  templates.push({
    id: 'send_menu',
    title: `Send ${labels.offeringTitle}`,
    description: `Quick reply when customers ask for the ${labels.offeringLower}`,
    message: buildMessage([
      `Hi! Here is our ${labels.offeringLower}:`,
      '',
      input.menuLink,
      '',
      'Let us know if you need anything else.',
    ]),
  });

  // Template 2: Menu + Location
  const locationLines = [
    `Hi! Here is our ${labels.offeringLower}:`,
    '',
    input.menuLink,
  ];
  if (input.address) locationLines.push('', `📍 ${input.address}`);
  if (input.todayHours) locationLines.push('', `We are open today until ${input.todayHours.close}.`);
  templates.push({
    id: 'menu_location',
    title: `${labels.offeringTitle} + Location`,
    description: 'Include address and hours with the link',
    message: buildMessage(locationLines),
  });

  // Template 3: Quick Reply
  templates.push({
    id: 'quick_reply',
    title: 'Quick Reply',
    description: 'Just the link — minimal text',
    message: `${labels.offeringTitle}: ${input.menuLink}`,
  });

  // Template 4: Business Info
  const infoLines = [input.storeName, ''];
  infoLines.push(`${labels.offeringTitle}: ${input.menuLink}`);
  if (input.address) infoLines.push(`📍 ${input.address}`);
  if (input.phone) infoLines.push(`📞 ${input.phone}`);
  if (input.todayHours) infoLines.push(`🕐 Open today: ${input.todayHours.open} – ${input.todayHours.close}`);
  templates.push({
    id: 'business_info',
    title: 'Business Info',
    description: 'Full details — name, link, address, phone, hours',
    message: buildMessage(infoLines),
  });

  // Template 5: Share with Staff
  templates.push({
    id: 'staff_share',
    title: 'Share with Staff',
    description: `Send to your team so everyone shares the same ${labels.offeringLower}`,
    message: buildMessage([
      `Team — here is our updated ${labels.offeringLower} link:`,
      '',
      input.menuLink,
      '',
      `Please share this link with any customer who asks for the ${labels.offeringLower}. This link always shows the latest version.`,
    ]),
  });

  return templates;
}

function buildMessage(lines: string[]): string {
  return lines.join('\n');
}
```

---

## 3. File Structure

```
src/lib/communication/
├── messageTemplates.ts          # ~100 lines — Template generation

src/components/templates/main-app/useMenuList/
├── CommunicationKit.tsx         # ~150 lines — Message cards section
└── index.tsx                    # Modified — embed CommunicationKit

src/components/mobile/components/
├── CommunicationKit.tsx         # ~120 lines — Mobile version

src/config/features.ts           # Modified — add ENABLE_CUSTOMER_COMMUNICATION_KIT
```

---

## 4. Implementation Phases

### Phase 1: Template Engine (~30 min)

1. Create `src/lib/communication/messageTemplates.ts`
2. Implement `generateMessageTemplates()` function
3. Handle missing data gracefully (omit lines when address/phone/hours absent)
4. Add feature flag `ENABLE_CUSTOMER_COMMUNICATION_KIT: false` to `src/config/features.ts`

### Phase 2: Today's Hours Utility (~20 min)

1. Check existing working hours utilities in codebase
2. Create helper to get today's open/close times from store working hours data
3. Handle edge cases: closed today, 24h, multiple slots

### Phase 3: Desktop UI (~1 hour)

1. Create `CommunicationKit.tsx`:
   - Receives store data from Use MenuList context
   - Calls `generateMessageTemplates(input)`
   - Renders each template as a card with:
     - Title + description
     - Message preview (styled as chat bubble, read-only)
     - "Copy Message" button → `navigator.clipboard.writeText(message)`
     - "Send via WhatsApp" button → `window.open(\`https://wa.me/?text=\${encodeURIComponent(message)}\`)`
2. Embed in `useMenuList/index.tsx` as "Customer Messages" section after Share links
3. Gate behind `FEATURE_FLAGS.ENABLE_CUSTOMER_COMMUNICATION_KIT`

### Phase 4: Mobile UI (~45 min)

1. Create mobile `CommunicationKit.tsx` using antd-mobile
2. WhatsApp as primary action (India market = WhatsApp-first)
3. Copy as secondary action
4. Embed in MobileShareScreen or as standalone tab

### Phase 5: Type Check + Polish (~15 min)

1. Run `npx tsc --noEmit` — zero errors
2. Test with various store data states (complete, missing address, missing hours)

---

## 5. Data Sources

| Field | Source | Fallback |
|-------|--------|----------|
| `storeName` | `storeDetails.name` from PlatformGlobalDataContext | "Your Business" |
| `businessType` | `storeDetails.businessType` | "Restaurant" |
| `menuLink` | Use MenuList data → `menuLink` or `obpLink` | Required — no fallback |
| `address` | `storeDetails.address` | Omit line |
| `phone` | `storeDetails.phone` or `storeDetails.contactPhone` | Omit line |
| `todayHours` | Compute from `storeDetails.workingHours` | Omit line |

---

## 6. Security

- **Auth:** Same as Use MenuList page — requires authenticated session
- **No API route needed** — pure client-side string generation
- **No PII exposure** — templates use owner's own store data, not customer data

---

## 7. Testing Guide

1. Set `ENABLE_CUSTOMER_COMMUNICATION_KIT: true`
2. Open `/use-menulist` — see "Customer Messages" section
3. Verify templates render with live store data
4. Click "Copy Message" → paste in text editor → verify content
5. Click "Send via WhatsApp" → verify WhatsApp opens with message pre-filled
6. Test with store missing address → verify template omits address line
7. Test with store missing hours → verify template omits hours line
8. Test on mobile → verify WhatsApp button works
9. Set flag to `false` → section disappears

---

**Document Signature:** Technical Implementation Plan
**Created:** March 15, 2026
