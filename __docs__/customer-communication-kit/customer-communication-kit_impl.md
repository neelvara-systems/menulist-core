# Customer Communication Kit — Implementation Plan

> **Version:** 1.1
> **Last Updated:** July 2, 2026
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

Desktop copy and WhatsApp handoff failures are logged through bounded Use MenuList diagnostics before fixed owner-facing failure copy is shown. The component receives parent output context from `UseMenuList` and adds only template ID/title presence-length metadata plus generated message lengths and generated WhatsApp URL length. WhatsApp handoffs open with `noopener,noreferrer`.

Diagnostic codes:

- `use_menulist_communication_kit_copy_failed`
- `use_menulist_communication_kit_whatsapp_open_failed`

Do not log raw generated messages, WhatsApp URLs, phone numbers, addresses, store names, project names, public URLs, menu text, or browser exception text.

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

  // Staff daily replies: one staff handoff for menu, address, and hours.
  const staffDailyLines = [
    'Team - customer replies for today',
    '',
    `${labels.offeringTitle}: ${input.menuLink}`,
  ];
  if (input.address) staffDailyLines.push(`Address: ${input.address}`);
  if (input.todayHours) staffDailyLines.push(`Hours today: ${input.todayHours.open} - ${input.todayHours.close}`);

  templates.push({
    id: 'staff_daily_replies',
    title: 'Staff Daily Replies',
    description: 'One handoff for menu, address, and hours questions',
    message: buildMessage(staffDailyLines),
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

src/config/features.ts           # ENABLE_CUSTOMER_COMMUNICATION_KIT is currently true
```

---

## 4. Implemented Runtime

### Template Engine

1. `src/lib/communication/messageTemplates.ts` owns `generateMessageTemplates()`.
2. Missing data is handled by omitting unavailable address, phone, or hours lines.
3. `ENABLE_CUSTOMER_COMMUNICATION_KIT` is currently enabled in `src/config/features.ts`.

### Today's Hours Utility

1. `getTodayHours()` derives the current-day copy from store working hours and timezone.
2. Closed-day and missing-hours states omit unavailable time copy.
3. Today-hours diagnostics log bounded `communication_kit_today_hours_timezone_fallback_failed` metadata when invalid timezone resolution falls back to the browser-local day.
4. Malformed current-day time ranges log bounded `communication_kit_today_hours_range_invalid` metadata and omit hours copy instead of generating unsafe customer-facing text.

### Desktop UI

1. `CommunicationKit.tsx`:
   - Receives store data from Use MenuList context
   - Calls `generateMessageTemplates(input)`
   - Renders each template as a card with:
     - Title + description
     - Message preview (styled as chat bubble, read-only)
     - "Copy Message" button → `navigator.clipboard.writeText(message)`
     - "Send via WhatsApp" button → `window.open(\`https://wa.me/?text=\${encodeURIComponent(message)}\`)`
2. `useMenuList/index.tsx` embeds the section after Share links and passes bounded diagnostic context.
3. Failed copy and WhatsApp handoff paths log bounded Use MenuList diagnostics before showing fixed failure copy.
4. The section is gated by `FEATURE_FLAGS.ENABLE_CUSTOMER_COMMUNICATION_KIT`.

### Mobile UI

1. Mobile `CommunicationKit.tsx` is embedded in `MobileShareScreen`.
2. Mobile supports copy, native share when available, and WhatsApp handoff.
3. Failed mobile copy/share/handoff paths log bounded mobile owner diagnostics.

### Verification

1. Run `npx tsc --noEmit --incremental false --pretty false` — zero errors
2. Test with various store data states (complete, missing address, missing hours)
3. Run `npm run verify:communication-kit-boundary` after changing Customer Communication Kit, Use MenuList sharing, Menu Kit handoffs, printable asset downloads, mobile Share, or legacy Physical Surfaces docs. This verifies source/docs wiring only; browser/device share behavior, visual print artifacts, provider handoffs, deploy evidence, and production-host smoke remain separate gates.

---

## 5. Data Sources

| Field | Source | Fallback |
|-------|--------|----------|
| `storeName` | `storeDetails.name` from PlatformGlobalDataContext | "Your Business" |
| `businessType` | `storeDetails.businessType` | "Other" when exact type is unknown |
| `businessCategory` | `storeDetails.businessCategory` | Omit when unknown |
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

1. Confirm `ENABLE_CUSTOMER_COMMUNICATION_KIT` is true
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
