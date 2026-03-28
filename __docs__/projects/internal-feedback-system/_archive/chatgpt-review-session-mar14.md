# Guest Feedback System — ChatGPT Review (March 14, 2026)

**ChatGPT Accuracy:** ~55%
**Rounds:** 1 conversation covering spec review, strategic assessment, architecture hardening, UX, edge cases, destructive testing

---

## Review Summary

| Category | Accuracy | Notes |
|---|---|---|
| Spec (PRD) | 95% | Almost everything was already built exactly as described |
| Strategic Assessment | 90% | Naming fix valid, positioning correct |
| Architecture Hardening | 15% | 1 valid point out of 10 (most premature for pre-scale) |
| UX Suggestions | 40% | 2 valid items, rest already done or premature |
| Edge Cases | 90% | Mostly already handled in codebase |
| Intelligence Layer (Graph/Signals) | 0% | Pure speculation, violates "no analytics" doctrine |

---

## Detailed Assessment

### ALREADY DONE (ChatGPT unaware feature was fully built)

| # | Suggestion | Codebase Reality |
|---|---|---|
| 1 | Separate guestFeedback collection | `DB_COLLECTIONS.GUEST_FEEDBACK` exists |
| 2 | No AI summary/insights | Not built, matches doctrine |
| 3 | Google CTA to ALL ratings | Implemented in GuestFeedbackForm success state |
| 4 | 90-day retention | `guestFeedbackRetention.ts` CF in nightly scheduler |
| 5 | Per-project toggle | `menuSettings.feedback` field exists |
| 6 | Store-level feedbackDefaults | On store type + FeedbackSettingsTab |
| 7 | Rate limit 10/10min per IP | Upstash-based via `publicApi.ts` |
| 8 | Honeypot bot detection | `website` hidden field + server validation |
| 9 | WhatsApp deep link | `whatsappLink.ts` with 3 util functions |
| 10 | QR code download | `FeedbackQrDownload.tsx` + `feedbackQrCode.ts` |
| 11 | Mobile support | `MobileFeedbackScreen.tsx` + `MobileFeedbackDetail.tsx` |
| 12 | Sidebar navigation | `/feedback` route with `LuTicket` icon |
| 13 | Settings tab | `FeedbackSettingsTab.tsx` in business settings |
| 14 | Contact progressive reveal | Contact fields shown after message section |
| 15 | Large touch targets (44px) | StarRating `size={44}` prop |
| 16 | Privacy note | "Your feedback is private" text in form |

### VALID — Accepted

| # | Suggestion | Action |
|---|---|---|
| 1 | Rename to "Guest Feedback" (not "Internal Feedback System") | ✅ Docs updated. UI already uses "Guest Feedback" |
| 2 | Permanent rejection list (no analytics/CRM/NPS) | ✅ Added to README |
| 3 | Feature as "reputation firewall" positioning | ✅ Matches existing spec |
| 4 | Pre-filled WhatsApp message for owner recovery | ✅ Valid improvement — documented for future |

### PREMATURE — Rejected (Pre-Scale)

| # | Suggestion | Reason |
|---|---|---|
| 1 | Ingestion queue (Redis/PubSub) | Current arch handles 10-50k/day. No need. |
| 2 | Event stream | MOL already logs events |
| 3 | Dynamic QR redirect (`qr.menulist.app/{code}`) | Over-engineering for unproven feature |
| 4 | Write sharding | Firestore auto-distributes random doc IDs |
| 5 | CAPTCHA after 3 submissions | Adds UX friction, rate limiting sufficient |
| 6 | Feedback write compression | Fields already minimal |
| 7 | Submission idempotency token | Button disable is standard, low risk |

### REJECTED — Wrong Direction

| # | Suggestion | Reason |
|---|---|---|
| 1 | "Menu Intelligence Graph" | Speculative infrastructure, zero user demand |
| 2 | "Operational Intelligence Layer" | Violates "no analytics" doctrine |
| 3 | Signal aggregation from feedback | Feature hasn't launched — premature optimization |
| 4 | Feedback analytics pipeline | Directly contradicts Law 7 (No Dashboard Feature) |

### DEFERRED — Valid But Not Now

| # | Suggestion | When to Revisit |
|---|---|---|
| 1 | Spam detection (fingerprint, velocity) | Post-launch if spam appears |
| 2 | Edge caching for feedback page | If QR scan traffic exceeds 1k/day |
| 3 | Mid-page feedback prompt (after categories) | After testing with real users |
| 4 | Inline star rating in menu prompt | After testing with real users |
| 5 | "Needs Attention" as default filter | Consider based on owner behavior data |
| 6 | Emotion labels on stars | UX polish, low priority |

---

## Key Strategic Insight (Valid)

ChatGPT correctly identified that the feedback system is legitimate for MenuList because:

> "If feedback is positioned as operational signal captured at the point of menu consumption, then it is legitimate."

This means:
1. The menu surface is the highest-intent interaction point
2. Feedback becomes menu-adjacent operational signal
3. Not reputation analytics

The feature only works if it remains **a minimal signal capture channel tied to the menu surface**.

---

## Architecture Verdict

| Metric | Score |
|---|---|
| Correctness | 9/10 |
| Simplicity | 9/10 |
| Scalability | 7/10 (adequate for pre-scale) |
| Security | 8.5/10 |

Current architecture is **production-ready for early adoption**. Hardening improvements deferred to when real traffic data proves the need.

---

_Reviewed: March 14, 2026_
