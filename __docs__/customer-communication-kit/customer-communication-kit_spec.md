# Customer Communication Kit — Spec

> **Version:** 1.0
> **Last Updated:** March 15, 2026
> **Audience:** CEO, PM, Business stakeholders

---

## 1. Executive Summary

**What:** Pre-generated, ready-to-send message templates that owners copy-paste into WhatsApp, SMS, or any messaging app. Each template dynamically combines the menu link with store data (name, address, hours) so the owner never manually types the same response twice.

**Why:** SMB owners respond to the same customer questions 20-50 times daily: "Send menu", "Where are you?", "Are you open?" Each response requires typing the same info. This feature eliminates that repetition with one-tap copy of polished, pre-filled messages.

**For Whom:** All MenuList business owners who communicate with customers via WhatsApp, SMS, or messaging apps.

**Success Metric:** Owners use the communication kit 5+ times per week for customer responses.

---

## 2. Goals

1. Eliminate repetitive typing for common customer questions
2. Ensure every customer gets a consistent, professional response with the correct menu link
3. Make it faster to respond during busy service hours (copy → paste → send)
4. Use existing store data — zero manual template setup

## 3. Non-Goals (Out of Scope)

- ❌ Automated message sending (no scheduled messages, no broadcasts)
- ❌ Message tracking or analytics (no "read receipts" or "delivery tracking")
- ❌ Marketing campaigns or promotional messages
- ❌ WhatsApp Business API integration
- ❌ Custom template editor (v1 uses fixed templates only)
- ❌ Multi-language templates (v1 uses English only, future: i18n)

---

## 4. Target Users

**ICP:** Non-tech SMB owner at a busy restaurant/salon/cafe receiving WhatsApp messages from customers.
**Moment:** Customer sends "Send menu" on WhatsApp → Owner opens MenuList → copies pre-generated message → pastes in WhatsApp → done in 3 seconds.
**Environment:** Often on mobile, during service, time-pressed.

---

## 5. Message Templates (v1.1 — 6 Templates)

> **v1.1 changes (ChatGPT review):** Reordered Quick Reply to #1 (most used). Added "Are you open?" template. Added "latest version" reinforcement to Staff Share. Added closed-today and 24h business handling.

### Template 1: Quick Reply (Primary)

**Use case:** Fast reply — just the link. Most frequently used by owners.

```
{offering_title}: {menu_link}
```

### Template 2: Send Menu

**Use case:** Customer asks "Send menu" / "Can you share the menu?"

```
Hi! Here is our {offering}:

{menu_link}

Let us know if you need anything else.
```

Example rendered:

```
Hi! Here is our menu:

https://pizzahouse.menulist.menu/menu

Let us know if you need anything else.
```

### Template 2: Menu + Location

**Use case:** Customer asks "Where are you?" / "Send menu and address"

```
Hi! Here is our {offering}:

{menu_link}

📍 {address}

We are open today until {closing_time}.
```

Example rendered:

```
Hi! Here is our menu:

https://pizzahouse.menulist.menu/menu

📍 12 Main Street, Downtown

We are open today until 11:00 PM.
```

### Template 4: Are You Open?

**Use case:** Customer asks "Are you open?" / "What are your timings?"

```
Hi! We are open today.

🕐 {today_hours}

Here is our {offering}:

{menu_link}

📍 {address}
```

If closed today:

```
Hi! We are closed today.

Here is our {offering}:

{menu_link}
```

### Template 5: Business Info

**Use case:** Customer asks "Tell me about your restaurant" / "What are your details?"

```
{store_name}

{offering_title}: {menu_link}
📍 {address}
📞 {phone}
🕐 {today_hours}
```

Example rendered:

```
Pizza House

Menu: https://pizzahouse.menulist.menu/menu
📍 12 Main Street, Downtown
📞 +91 98765 43210
🕐 Open today: 11:00 AM – 11:00 PM
```

### Template 6: Share with Staff

**Use case:** Owner shares menu link with staff team

```
Team — here is our updated {offering} link:

{menu_link}

Please share this link with any customer who asks for the {offering}.
This link always shows the latest version.
```

---

## 6. Data Sources

All template fields come from existing store data:

| Field                             | Source                                                                |
| --------------------------------- | --------------------------------------------------------------------- |
| `{offering}` / `{offering_title}` | `getOfferingLabels(businessType)` → `offeringLower` / `offeringTitle` |
| `{menu_link}`                     | Use MenuList data → `menuLink` or `obpLink`                           |
| `{address}`                       | Store document → `address` field                                      |
| `{phone}`                         | Store document → `phone` field                                        |
| `{store_name}`                    | Store document → `name` field                                         |
| `{closing_time}`                  | Store working hours → today's closing time                            |
| `{today_hours}`                   | Store working hours → today's open/close range                        |

If a field is missing (e.g., no address stored), that line is omitted from the template.

---

## 7. UI Design

### 7.1 Section on Use MenuList Page

Below the Share links section:

```
┌─────────────────────────────────────────────┐
│ Customer Messages                            │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ Send Menu                                │ │
│ │ Hi! Here is our menu:                    │ │
│ │ https://pizzahouse.menulist.menu/menu    │ │
│ │ Let us know if you need anything else.   │ │
│ │                                          │ │
│ │ [Copy Message]  [Send via WhatsApp]      │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ Menu + Location                          │ │
│ │ ...                                      │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ (3 more templates)                           │
└─────────────────────────────────────────────┘
```

### 7.2 Each Message Card

- **Title** (e.g., "Send Menu")
- **Preview** of the rendered message (read-only, styled as message bubble)
- **Copy Message** button — copies full text to clipboard
- **Send via WhatsApp** button — opens `wa.me/?text={encoded_message}`

### 7.3 Mobile UX

On mobile, add "Send via WhatsApp" as the primary action (WhatsApp-first market in India). Copy is secondary.

---

## 8. Risks & Open Questions

1. **Missing store data** — Address or phone may be empty. Template must gracefully omit those lines.
2. **Working hours computation** — Need to derive today's closing time from store working hours data. Check existing working hours utility.
3. **Template language** — v1 is English-only. Future versions should support i18n through `next-intl`.
4. **Mobile priority** — This is a mobile-first feature. Many owners will use it from their phone during service.

---

## 9. Success Criteria

- 5 pre-generated templates available on Use MenuList page
- Each template renders with live store data (no placeholders visible)
- Copy Message works on all browsers
- WhatsApp deep link works on mobile
- Missing data fields gracefully omitted
- Zero new Firebase collections or API routes
- Feature flag OFF by default

---

**Document Signature:** Product Specification
**Created:** March 15, 2026
