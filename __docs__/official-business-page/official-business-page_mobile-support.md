# Official Business Page (OBP) — Mobile Support Assessment

**Date:** May 10, 2026

---

## Mobile Relevance Decision: **PARTIAL**

OBP has TWO surfaces — each assessed separately:

### Surface 1: Public OBP Page (Customer-Facing)

**Mobile relevance:** YES — inherently mobile-first (customers open on phone from WhatsApp/Instagram).  
**But:** This is a public page, NOT an owner dashboard screen. It's already mobile-responsive by design (server-rendered HTML). No mobile shell integration needed — it renders in the browser like the digital menu.

### Surface 2: OBP Settings in Dashboard (Owner-Facing)

**Mobile relevance:** Run admission test below.

---

## Feature Admission Test (4 Gates) — Dashboard OBP Settings

| Gate          | Question                                  | Answer                                                        | Pass/Fail  |
| ------------- | ----------------------------------------- | ------------------------------------------------------------- | ---------- |
| **Frequency** | Is this done daily or multiple times/day? | Link sharing is frequent. Content setup is occasional. Cover/gallery changes happen when the owner has phone photos. | ⚠️ PARTIAL |
| **Speed**     | Completes in <5 seconds on mobile?        | Copy/share is instant. Cover upload/generation is one focused action. Long text/link editing is slower but still supported. | ⚠️ PARTIAL |
| **Touch**     | Works with thumb-only?                    | Yes for link, preview, cover upload/generate, gallery upload, toggles, and simple fields. Color picker remains less ideal. | ⚠️ PARTIAL |
| **Value**     | Needed while away from desk?              | Yes for sharing, photo/cover updates, and quick public-page corrections. | ✅ PASS |

### Gate Results

**Full OBP settings editor on mobile:** ✅ IMPLEMENTED with compact controls and shared DAL, because More tab now carries owner-facing public presence management.

**Copy/Share link on mobile:** ✅ PASS (all 4 gates pass for this sub-action)

**Cover/gallery media on mobile:** ✅ PASS. Owners usually have business photos on their phone, and the shared media card keeps upload, generate, adjust, replace, and remove consistent.

---

## Decision

| Component              | Mobile                      | Rationale                                            |
| ---------------------- | --------------------------- | ---------------------------------------------------- |
| Public OBP page        | ✅ Built mobile-first       | Customer-facing, rendered in browser, responsive CSS |
| Copy link action       | ✅ DONE — MobileShareScreen | High value, daily use, one-tap action                |
| Copy message action    | ✅ DONE — OBPLinkCard       | Conversation-ready message for WhatsApp/Instagram    |
| Dual QR (Share + Menu) | ✅ DONE — OBPLinkCard       | Two QR types with Segmented toggle + download        |
| OBP settings editor    | ✅ Mobile More tab + desktop | Uses same store DAL and compact mobile cards         |
| Custom attributes      | ✅ Mobile More tab + desktop | Uses the shared category icon/emoji picker and same `publicPresence.customAttributes` save path |
| Business cover         | ✅ Mobile More tab + desktop | Upload/generate/adjust through shared media system   |
| Photo upload           | ✅ Mobile More tab + desktop | Shared media card, two-column mobile grid, modal actions |
| Google review fields   | ❌ Desktop only             | One-time setup, number inputs                        |
| Descriptor/knownFor    | ❌ Desktop only             | Rare, small text field, not urgent                   |

---

## Mobile Implementation

### What to build:

**MobileShareScreen** (existing screen) — includes:

- Official link display (prominent, top of screen)
- Copy link button
- QR download button
- "Share via WhatsApp" quick action

**Mobile More > Official Business Page** — includes:

- Official page link card
- Business cover image card with upload, replace, adjust, remove, and Generate/Regenerate
- Descriptor, known for, special note, links, rating fields, action visibility, policy links
- Business attributes and owner-defined custom attributes with the shared category icon/emoji picker
- Business photo gallery with shared media upload and per-photo action sheet

### Public OBP Page (customer-facing):

Already mobile-first by design:

- Server-rendered HTML + CSS modules
- No JS framework needed on client
- Responsive layout (mobile-first CSS)
- Touch targets ≥ 44px for action buttons
- Single-column layout, no horizontal scroll

---

## Localization

- **Inherits from desktop:** Same next-intl, RTL support, timezone, date/time format
- **OBP page language:** Uses store's `defaultLanguage` for any localized content
- **Hours display:** Uses store's `timeZone` for correct open/closed calculation

---

## Auth

- **Public OBP page:** No auth (public, like digital menu)
- **Dashboard OBP settings:** Same NextAuth session, same RBAC — no separate mobile auth
- **MobileShareScreen:** Already behind auth in MobileShell

---

## Settings Inheritance

- Theme mode (dark/light): N/A for public page (own design). Dashboard: inherits from `clientThemeConfig`
- Language, timezone, date format: All from AppSettings Redux state
- Icons: `react-icons/lu` (Lucide) — same as desktop

---

## ICP Compliance

- **Public page:** Designed for customers on mid-range Android phones. Fast load, minimal data. Large touch targets.
- **Dashboard link/QR:** Designed for non-tech SMB owner. One-tap copy. No jargon. "Your Official Business Link" — clear and direct.

---

**Document Signature:** Cascade (Lead Architect)  
**Last Updated:** March 11, 2026
