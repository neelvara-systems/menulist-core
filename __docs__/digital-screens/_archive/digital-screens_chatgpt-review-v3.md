# Digital Screens — ChatGPT Strategic Review v3

**Date:** March 15, 2026
**Source:** ChatGPT system-level product + infrastructure + UX review
**Reviewer:** Cascade (cross-checked against codebase)
**ChatGPT Accuracy:** ~45% (24 items already done, 12 valid new items, 7 rejected, 4 deferred)

---

## Review Summary

ChatGPT provided a comprehensive review across 6 areas: strategic positioning, architecture, owner UX, customer UX, edge cases, and production readiness. Many suggestions were already implemented (ChatGPT lacked codebase visibility). The valid new items focused on security hardening, scale resilience, and real-world TV operation edge cases.

---

## Decision Table

| # | ChatGPT Suggestion | Decision | Rationale |
|---|---|---|---|
| **STRATEGIC** |
| S1 | Three-surface moat (Screens + QR + OBP) | ✅ DOC | Added to spec appendix |
| S2 | Google = discovery, MenuList = menu truth | ✅ DOC | Added to spec appendix |
| S3 | Menu truth > menus (canonical public truth) | ALREADY DONE | Constitution doc 11 |
| S4 | Don't fight Google, position around it | ✅ DOC | Added to spec appendix |
| S5 | QR menu is most important surface | ALREADY DONE | Already recognized |
| S6 | Digital menu as distribution engine | ✅ DOC | Added to spec appendix |
| S7 | Authority over truth is the game | ALREADY DONE | Constitution 10 Laws |
| S8 | Visual anchor items (McDonald's) | ALREADY DONE | isBestSeller + Popular tag |
| **ARCHITECTURE** |
| A1 | Token security ≥128-bit | ✅ CODE | 8→22 chars (~130-bit) |
| A2 | Edge caching (CDN) | ALREADY DONE | unstable_cache 60s TTL |
| A3 | Reload jitter (mass reload) | ✅ CODE | guardedReloadWithJitter() |
| A4 | Image optimization proxy | ❌ REJECT | Over-engineering |
| A5 | Runtime config document | ❌ REJECT | Extra read per screen load |
| A6 | Screen health monitoring | ⏳ DEFER | Internal ops only |
| A7 | Runtime event logging | ❌ REJECT | Console logs sufficient |
| A8 | Menu size guardrails | ✅ CODE | MAX_TOTAL_ITEMS=200 |
| A9 | Store-level capability flags | ❌ REJECT | No per-store need |
| A10 | Render snapshot layer | ❌ REJECT | User skipped; SSR+cache sufficient |
| **OWNER UX** |
| U1 | Screen preview card | ⏳ DEFER | Nice-to-have |
| U2 | Screen activity status | ✅ CODE | Shows screenLastSeenAt |
| U3 | "Main TV" / "Second TV" labels | ✅ CODE | Added as Tag labels |
| U4 | First-time QR scan setup | ❌ REJECT | Already rejected in spec (2/5) |
| **CUSTOMER UX** |
| C1 | Category scanning <1s | ALREADY DONE | 22px headers + accents |
| C2 | Predictable pagination | ALREADY DONE | Stable page structure |
| C3 | Limit animation noise | ALREADY DONE | Readability First rule |
| C4 | QR secondary size | ALREADY DONE | 72px/64px |
| C5 | Price prominence | ALREADY DONE | 18px tabular-nums |
| **EDGE CASES** |
| E1 | No internet → cached | ALREADY DONE | Cache-first init |
| E2 | localStorage cleared | ALREADY DONE | Brand fallback inline |
| E3 | Zero items → fallback | ALREADY DONE | Empty state exists |
| E4 | 100+ items overflow | ✅ CODE | MAX_TOTAL_ITEMS=200 |
| E5 | Broken image URLs | ✅ CODE | onError in MenuBoard |
| E6 | All items sold out | ✅ CODE | Better messaging |
| E7 | Listener disconnect | ✅ CODE | Offline+retry in MenuBoard |
| E8 | Mass reload burst | ✅ CODE | Jitter (see A3) |
| E9 | Staff exits fullscreen | ✅ CODE | Auto-recovery overlay |
| E10 | Portrait screens | ⏳ DEFER | Rare, CSS handles ok |
| E11 | TV auto-updates | ALREADY DONE | URL bookmark survives |
| E12 | Memory leak | ALREADY DONE | 6-hour refresh |
| **PRODUCTION** |
| P1 | Fast 404 for bad tokens | ALREADY DONE | Length validation |
| P2 | Rate limiting | ALREADY DONE | Server+client |
| P3 | Never blank | ALREADY DONE | Zero-blank guarantee |
| P4 | Cached-first render | ALREADY DONE | Both components |
| P5 | Image size limits | ALREADY DONE | Max 3 uploads |

---

## Code Changes Implemented

### 1. Token Security (A1)
- `src/lib/screen/utils.ts` — `generateScreenToken()`: 8-char → 22-char (~130-bit entropy)
- `src/database/campaigns/index.ts` — `initializeScreenState()`: same change
- `src/app/screen/[token]/page.tsx` — Token validation: 6-12 → 6-24 range
- `src/app/api/screen/seen/route.ts` — Same validation update
- `src/lib/screen/utils.ts` — `isValidScreenToken()`: regex updated

### 2. Reload Jitter (A3, E8)
- `src/lib/screen/utils.ts` — New `guardedReloadWithJitter()`: 0-60s random delay
- `src/app/screen/[token]/ScreenDisplay.tsx` — Content version reload uses jitter
- `src/app/screen/[token]/MenuBoardDisplay.tsx` — Same

### 3. MenuBoard Hardening (E5, E6, E7)
- Broken image fallback: `onError` handler + `.thumb-broken` CSS class
- Listener offline state: `setIsOffline(true)` on listener error + 30min retry
- Sold-out message: "All items currently unavailable" vs generic "Preparing your menu..."
- Menu size cap: `MAX_TOTAL_ITEMS = 200`

### 4. Auto-Fullscreen Recovery (E9)
- Both display components: `fullscreenchange` event listener
- Shows "Tap to return to fullscreen" overlay, auto-fades after 10s
- Click triggers `requestFullscreen()`

### 5. Settings UI (U2, U3)
- Screen activity status: Green dot + "Screen active — last seen X ago"
- Mode labels: "Main TV" and "Second TV" tags

---

## Strategic Insights Added to Spec

### Three-Surface Infrastructure Moat
Screens + QR Menu + Official Public Page form a closed presence system. Each surface leads to another, creating layered switching friction that is extremely hard for competitors to displace.

### Google Positioning
Google = discovery. MenuList = menu truth. The relationship is complementary, not adversarial. MenuList should never attempt to build discovery features.

### Distribution Engine
Every screen and QR scan is a product exposure moment. At scale, this creates ambient distribution without marketing spend.

---

## Rejected Items (with rationale)

| Item | Why Rejected |
|---|---|
| Image optimization proxy (A4) | Upload-time optimization sufficient. Proxy adds complexity + latency |
| Runtime config document (A5) | Extra Firestore read per screen load. Constants in code per 3-year freeze |
| Event logging pipeline (A7) | Console logs already exist. Structured logging adds no product value |
| Store capability flags (A9) | Global flag sufficient. Per-store adds complexity for no current need |
| QR pairing for setup (U4) | Already rejected in spec v2.2 (scored 2/5 on Feature Rejection Gate) |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-15 | Cascade | Full ChatGPT strategic review v3 — 47 items evaluated |
