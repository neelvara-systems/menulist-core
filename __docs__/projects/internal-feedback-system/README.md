# Guest Feedback System

**Feature Status:** ✅ FULLY IMPLEMENTED  
**Priority:** Medium (#5 in Expansion Surfaces)  
**Feature Flag:** `ENABLE_GUEST_FEEDBACK: true`

---

## Quick Navigation

| Document                                                     | Audience         | Purpose                                       |
| ------------------------------------------------------------ | ---------------- | --------------------------------------------- |
| [Spec](./internal-feedback-system_spec.md)                   | CEO, PM, Clients | Business requirements, user flows, scope      |
| [Implementation](./internal-feedback-system_impl.md)         | Developers       | Technical blueprint, DB schema, API contracts |
| [Marketing](./internal-feedback-system_marketing.md)         | Sales, Marketing | Pitch deck, landing page copy, messaging      |
| [Website](./internal-feedback-system_website.md)             | Website, Docs    | Public website placement and claim boundaries |
| [Validation](./internal-feedback-system_validation.md)       | QA               | Implementation validation report              |
| [Verification](./internal-feedback-system_verification.md)   | Architects       | Bug fixes and review documentation            |
| [ChatGPT Review](./_archive/chatgpt-review-session-mar14.md) | Architects       | Strategic review (Mar 14, 2026)               |

---

## One-Liner

> **A private feedback inbox where guests can report menu, business, or service issues directly to the owner so the approved source can be corrected.**

---

## What It Is

The Guest Feedback System is a **private correction channel** for guest feedback that:

- Captures customer-reported issues from public menu, QR, direct-link, and business-page surfaces
- Gives owners a calm inbox (not a dashboard) to read and resolve feedback
- Helps owners correct the same approved source that feeds customer-facing public surfaces
- Optionally prompts all guests, regardless of rating, toward the configured public review URL when enabled

**What it is NOT:**

- ❌ A review manager
- ❌ A sentiment analyzer
- ❌ A reputation dashboard
- ❌ A response automation tool
- ❌ A CRM or customer relationship system

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      GUEST SURFACES                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Menu Footer  │  │ Feedback QR  │  │ Direct Link  │          │
│  │    Link      │  │    Code      │  │   /feedback  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           ▼                                     │
│              ┌────────────────────────┐                         │
│              │   Guest Feedback Form  │                         │
│              │  • Rating (1-5 stars)  │                         │
│              │  • Message (optional)  │                         │
│              │  • Contact (optional)  │                         │
│              └───────────┬────────────┘                         │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  /api/public/feedback  │  ← Rate limited, no auth
              │      /submit           │
              └───────────┬────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │   guestFeedback        │  ← Firestore collection
              │   (flat collection)    │
              └───────────┬────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OWNER DASHBOARD                             │
│              ┌────────────────────────┐                         │
│              │    Feedback Inbox      │                         │
│              │  • List view           │                         │
│              │  • "Needs attention"   │                         │
│              │  • Contact indicator   │                         │
│              │  • WhatsApp deep link  │                         │
│              │  • Mark resolved       │                         │
│              │  • Download QR Code    │                         │
│              └────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Files in Codebase

### New Files (Created)

| File                                                                              | Purpose                                                                           | Status |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------ |
| `src/types/guestFeedback.ts`                                                      | GuestFeedback type + FeedbackDefaults + form types                                | ✅     |
| `src/database/guestFeedback/index.ts`                                             | DAL: submitGuestFeedback, getFeedbackList, updateFeedbackStatus, getFeedbackCount | ✅     |
| `src/app/api/public/feedback/submit/route.ts`                                     | Public submit endpoint (no auth, rate limited)                                    | ✅     |
| `src/app/feedback/[projectId]/page.tsx`                                           | Standalone feedback page (QR surface, server component)                           | ✅     |
| `src/middleware/publicApi.ts`                                                     | Public rate limiting + honeypot + sanitization                                    | ✅     |
| `src/lib/utils/whatsappLink.ts`                                                   | WhatsApp deep link + phone validation + formatting                                | ✅     |
| `src/lib/utils/feedbackQrCode.ts`                                                 | QR code generation + download + URL builder                                       | ✅     |
| `src/components/atoms/GuestFeedbackForm/index.tsx`                                | Guest-facing feedback form (mobile-first)                                         | ✅     |
| `src/components/atoms/GuestFeedbackForm/StarRating.tsx`                           | Star rating input + display component                                             | ✅     |
| `src/components/templates/main-app/feedback/index.tsx`                            | Owner feedback inbox page                                                         | ✅     |
| `src/components/templates/main-app/feedback/FeedbackCard.tsx`                     | Feedback card with contact/WhatsApp/resolve                                       | ✅     |
| `src/components/templates/main-app/feedback/FeedbackFilters.tsx`                  | All / Needs Attention / Resolved filters                                          | ✅     |
| `src/components/templates/main-app/feedback/FeedbackQrDownload.tsx`               | QR code preview + download modal                                                  | ✅     |
| `src/components/templates/main-app/businessSettings/tabs/FeedbackSettingsTab.tsx` | Store-level feedback settings                                                     | ✅     |
| `src/components/mobile/screens/MobileFeedbackScreen.tsx`                          | Mobile feedback list (antd-mobile)                                                | ✅     |
| `src/components/mobile/screens/MobileFeedbackDetail.tsx`                          | Mobile feedback detail view                                                       | ✅     |
| `src/hooks/useFeedback.ts`                                                        | Generic feedback hook (KB articles/changelog)                                     | ✅     |
| `functions/src/analytics/guestFeedbackRetention.ts`                               | Nightly 90-day retention cleanup CF                                               | ✅     |

Public feedback pages reuse the same temporary-status banner, business identity header, and shared public footer pattern as the customer menu. The feedback footer keeps the same Call / WhatsApp / Directions, policy, social, Share Feedback, and MenuList attribution treatment, plus the same OBP theme toggle behavior, so the footer stays consistent across the menu, OBP, and feedback surfaces.

### Modified Files

| File                                     | Change                                                          | Status |
| ---------------------------------------- | --------------------------------------------------------------- | ------ |
| `src/constants/database.ts`              | Added `GUEST_FEEDBACK` collection                               | ✅     |
| `functions/src/constants/database.ts`    | Added `GUEST_FEEDBACK` collection (CF mirror)                   | ✅     |
| `src/config/features.ts`                 | Added `ENABLE_GUEST_FEEDBACK: true`                             | ✅     |
| `src/lib/rateLimit/configs.ts`           | Added `FEEDBACK_SUBMISSION` rate limit config                   | ✅     |
| `src/lib/validation/apiSchemas.ts`       | Added `guestFeedbackSubmitSchema` + `guestFeedbackUpdateSchema` | ✅     |
| `src/constants/navigations.ts`           | Added `/feedback` route with `LuTicket` icon                    | ✅     |
| `firestore.rules`                        | Added guestFeedback collection security rules                   | ✅     |
| `firestore.indexes.json`                 | Added 3 composite indexes                                       | ✅     |
| `functions/src/decisionBlocksScoring.ts` | Added retention cleanup to nightly scheduler                    | ✅     |

---

## Feature Flag

```typescript
// src/config/features.ts
ENABLE_GUEST_FEEDBACK: true,
```

---

## Configuration

### Per-Project (MenuSettings)

```typescript
feedback?: boolean;  // default: true — feedback ON unless explicitly disabled
```

> Toggle is in Advanced Settings, framed as "Disable feedback for this menu" to discourage casual disabling.

### Per-Store (Store Settings)

```typescript
feedbackDefaults?: {
  collectName: boolean;   // default: false
  collectPhone: boolean;  // default: true (India market)
  collectEmail: boolean;  // default: true
};
feedbackEnabled?: boolean; // default: true — master store toggle
reviewUrl?: string;        // Google Review URL for CTA
```

---

## Doctrine Alignment

| Law                         | Requirement                    | Status  |
| --------------------------- | ------------------------------ | ------- |
| Law 1: Default Authority    | System handles by default      | ✅ PASS |
| Law 2: Silence Is a Feature | No notifications to owner      | ✅ PASS |
| Law 3: No Explanations      | No AI summaries or insights    | ✅ PASS |
| Law 6: No Cognitive Load    | Minimal config (2 toggles max) | ✅ PASS |
| Law 7: No Dashboard Feature | Inbox only, not analytics      | ✅ PASS |

---

## Strategic Positioning (from ChatGPT Review, Mar 14, 2026)

- **Identity:** "Operational signal captured at the point of menu consumption" — legitimate for MenuList
- **Constraint:** Must remain small, silent, inbox-based. Never expand into analytics/CRM/NPS
- **Naming:** Externally "Guest Feedback" — never "Internal Feedback System"
- **Compliance:** FTC-compliant (Google CTA shown to ALL ratings, no review gating)
- **Scalability:** Current architecture handles 10-50k submissions/day. Hardening deferred to post-launch

## Permanent Rejection List

Never add to this feature:

- Analytics dashboards or trends
- AI sentiment analysis
- CRM / response templates
- NPS scoring
- Email campaigns or follow-ups
- Review gating (rating-conditional CTA)

---

## Final Decisions (LOCKED)

| Decision          | Value                                               | Source               |
| ----------------- | --------------------------------------------------- | -------------------- |
| Collection        | Separate `guestFeedback`                            | User + ChatGPT       |
| Google Review URL | Manual entry + GBP sync (flagged)                   | User                 |
| Menu Toggle       | Per-project in Advanced Settings                    | User + ChatGPT       |
| Contact Fields    | Store-level defaults (not per-project)              | User + ChatGPT       |
| Retention         | 90 days hard deletion                               | Architect            |
| Success Metrics   | Internal MOL events only (no owner-facing)          | ChatGPT              |
| Feedback Page URL | `/feedback/{projectId}` (consistent with menu URLs) | Verification session |

---

## Version History

| Version | Date         | Changes                                                                |
| ------- | ------------ | ---------------------------------------------------------------------- |
| 1.0     | Feb 1, 2026  | Initial documentation                                                  |
| 1.1     | Feb 2, 2026  | Bug fixes (project path, store fetch), verification complete           |
| 2.0     | Mar 14, 2026 | ChatGPT strategic review, doc refresh, all files confirmed implemented |

---

## Related Features

- **GBP Sync** (`__docs__/gbp-sync/`) — Google Business Profile integration for review URL
- **MOL** (`src/types/menuObservation.ts`) — Menu Observation Layer for event logging
- **Reputation Protection** (`__docs__/reputation-protection/`) — Broader reputation strategy (Pillar 3)

---

_Last updated: March 14, 2026_
