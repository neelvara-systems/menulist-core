# Presence Dominance — Mobile Support Assessment

**Date:** February 19, 2026  
**Pillar:** 1 of 6

---

## Mobile Relevance Decision: **YES**

---

## Feature Admission Test Results

| Gate | Question | Answer | Pass? |
|------|----------|--------|-------|
| **Frequency** | Daily/multiple times per day? | YES — owners share links multiple times daily | ✅ PASS |
| **Speed** | Completes in <5 seconds? | YES — copy link or share is 1-2 taps | ✅ PASS |
| **Touch** | Works with thumb-only? | YES — copy, share, QR are single-tap actions | ✅ PASS |
| **Value** | Needed away from desk? | YES — most sharing happens from phone (WhatsApp) | ✅ PASS |

**All 4 gates pass → Mobile UI is MANDATORY.**

---

## Mobile Implementation

### Existing Mobile Support
- `MobileShareScreen.tsx` already exists with copy link and QR download
- Mobile shell with bottom navigation already built

### New Mobile Components Needed
| Component | Description |
|-----------|-------------|
| Native share button | Web Share API integration in MobileShareScreen |
| Share guidance hints | Platform-specific tips below share actions |

### Data Source
- Store subdomain from Redux session state
- OBP URL derived from subdomain
- No new DAL or hooks needed

### Localization
- Inherits from desktop: same `next-intl`, RTL support, timezone
- Share text should be localized ("Check out our menu" in user's language)

### Auth
- Same NextAuth session — no separate mobile auth
- Share actions don't require authentication (link is public)

### Icons
- `react-icons/lu` (Lucide) — `LuShare2`, `LuCopy`, `LuQrCode`

---

**Last Updated:** February 19, 2026
