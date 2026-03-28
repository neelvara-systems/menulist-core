# Internal Feedback System — Product Specification

**Document Type:** Non-Technical Product Requirements Document (PRD)  
**Audience:** CEO, Product Managers, Clients, Non-Developers  
**Version:** 1.0  
**Date:** February 1, 2026

---

## Executive Summary

### What Is This?

The Internal Feedback System is a **private feedback inbox** that allows restaurant guests to share their experience directly with the owner — before posting a public Google Review.

### Why Does It Matter?

| Without This Feature                                                     | With This Feature                                                                 |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Guest has bad experience → Posts 1-star Google Review → Permanent damage | Guest has bad experience → Submits private feedback → Owner can learn and improve |
| Owner discovers issues from public reviews                               | Owner discovers issues privately first                                            |
| No way to capture silent unhappy customers                               | Silent customers have a low-friction outlet                                       |

### Who Is It For?

- **Restaurant owners** who want to understand guest sentiment before it becomes public
- **Multi-outlet chains** who need visibility into per-location feedback
- **Premium restaurants** who value reputation protection

### The Core Insight

> **"Premium owners want a private channel first. That is a real market truth in India and globally."**

This feature is a **reputation firewall** — not a review management tool.

---

## Goals

### Primary Goal

Enable guests to submit private feedback to owners, creating a pressure-release valve before public reviews.

### Internal Tracking (MOL Events Only)

This feature has **no owner-facing metrics**. It exists to provide a private intake channel.

MOL logs these events for internal analytics only:

- `FEEDBACK_SUBMITTED` — Guest submitted feedback
- `FEEDBACK_RESOLVED` — Owner marked feedback as resolved
- `FEEDBACK_GOOGLE_CTA_CLICKED` — Guest clicked Google Review link

> **Doctrine Note:** Metrics create dashboards. Dashboards create explanations. Explanations kill authority. We track internally but never expose to owners.

### Non-Goals (What This Is NOT)

- ❌ **NOT** a review aggregation dashboard
- ❌ **NOT** a sentiment analysis tool
- ❌ **NOT** an AI-powered response system
- ❌ **NOT** a customer relationship management (CRM) system
- ❌ **NOT** a way to "gate" or filter reviews

---

## Target Customers (ICP)

| Segment                        | Need                    | How This Helps                                 |
| ------------------------------ | ----------------------- | ---------------------------------------------- |
| **Single-location restaurant** | Catch issues early      | Private inbox before public damage             |
| **Multi-outlet chain**         | Per-location visibility | HQ sees all, managers see own store            |
| **Premium/fine dining**        | Reputation protection   | Silent, professional feedback channel          |
| **Cloud kitchens**             | Only feedback channel   | No in-person interaction, need digital channel |

---

## Scope

### In-Scope (Will Build)

| #   | Feature                 | Description                                                  |
| --- | ----------------------- | ------------------------------------------------------------ |
| 1   | Guest feedback form     | Rating (1-5) + optional message + optional contact           |
| 2   | Menu footer link        | Small "Share Feedback" link on every enabled menu            |
| 3   | Feedback QR Surface     | Downloadable QR code as standalone surface (tables/receipts) |
| 4   | Owner feedback inbox    | List view with "Needs attention" filter                      |
| 5   | Contact info indicator  | Badge showing if guest provided contact details              |
| 6   | WhatsApp recovery link  | Deep link to WhatsApp if phone number provided               |
| 7   | Mark resolved action    | Owner can mark feedback as addressed                         |
| 8   | Google Review CTA       | Post-submit prompt to leave Google Review (all ratings)      |
| 9   | Per-project toggle      | Enable/disable feedback per menu (Advanced Settings)         |
| 10  | Contact field defaults  | Store-level configuration for contact fields                 |
| 11  | 90-day retention        | Auto-archive feedback after 90 days                          |
| 12  | Multi-outlet visibility | HQ sees all stores, manager sees own                         |

### Out-of-Scope (Will NOT Build)

| #   | Feature                 | Reason                                 |
| --- | ----------------------- | -------------------------------------- |
| 1   | AI summary/insights     | Violates Law 3 (No Explanations)       |
| 2   | Sentiment analysis      | Violates Law 7 (No Dashboard Features) |
| 3   | Auto-response templates | We're not a CRM                        |
| 4   | Review gating           | Illegal per FTC/Google policy          |
| 5   | Email notifications     | Violates Law 2 (Silence Is a Feature)  |
| 6   | Export functionality    | Not a CRM                              |
| 7   | Tips/payments           | Not in scope (focus on feedback only)  |

---

## User Stories & Flows

### User Story 1: Guest Submits Feedback

**As a** restaurant guest  
**I want to** share my feedback privately  
**So that** I can communicate issues without posting a public review

**Flow:**

```
1. Guest views menu on phone
2. Guest scrolls to footer, sees "Share Feedback" link
3. Guest taps link → Feedback form opens
4. Guest selects rating (1-5 stars) [REQUIRED]
5. Guest optionally adds message (max 300 chars)
6. Guest optionally adds contact info (if enabled for this menu)
7. Guest taps "Submit"
8. Success message appears
9. Guest sees "Leave a Google Review" button (shown to ALL ratings)
10. Guest either clicks Google CTA or closes
```

**Acceptance Criteria:**

- [ ] Rating is mandatory (1-5 stars)
- [ ] Message is optional, max 300 characters
- [ ] Contact fields shown based on project settings
- [ ] Google Review CTA shown to ALL ratings (no gating)
- [ ] Form works without login (public submission)

---

### User Story 2: Owner Reviews Feedback

**As a** restaurant owner  
**I want to** see feedback from my guests  
**So that** I can understand issues and improve

**Flow:**

```
1. Owner logs into dashboard
2. Owner navigates to "Feedback" section
3. Owner sees list of feedback items (newest first)
4. Owner can filter: All | Needs Attention (rating ≤3) | Resolved
5. Owner clicks feedback item to expand
6. Owner reads message and contact info (if provided)
7. Owner clicks "Mark Resolved" when addressed
8. Feedback moves to "Resolved" filter
```

**Acceptance Criteria:**

- [ ] List shows: date, rating (stars), message preview, status, contact indicator
- [ ] "Needs Attention" = rating 1, 2, or 3
- [ ] Contact indicator badge: "📞 Contact provided" if phone/email exists
- [ ] Expanding shows full message and contact info
- [ ] If phone provided: Show "Open WhatsApp" button (deep link)
- [ ] "Mark Resolved" is single-click action
- [ ] Resolved items can be unmarked

---

### User Story 3: Owner Configures Feedback Settings

**As a** restaurant owner  
**I want to** control what information I collect  
**So that** I respect guest privacy while getting useful feedback

**Flow:**

```
1. Owner goes to Store Settings
2. Owner finds "Guest Feedback Defaults" section
3. Owner sees toggles:
   - ☐ Collect customer name
   - ☑ Collect phone number
   - ☑ Collect email address
4. Owner saves settings
5. Settings apply to ALL menus in that store

(Optional: To disable feedback for a specific menu)
6. Owner goes to Project Settings → Advanced
7. Owner toggles "Disable feedback for this menu"
```

**Acceptance Criteria:**

- [ ] Contact field settings are per-store (not per-project)
- [ ] Defaults: name=false, phone=true, email=true
- [ ] Per-project toggle (`menuSettings.feedback`) is in Advanced Settings
- [ ] Default: `true` (feedback enabled unless explicitly set to `false`)
- [ ] Changes apply immediately to live menus

---

### User Story 4: Owner Downloads Feedback QR Code

**As a** restaurant owner  
**I want to** download a QR code for feedback collection  
**So that** I can place it on tables/receipts to collect feedback independently of the menu

**Flow:**

```
1. Owner goes to Dashboard → Feedback section (or Surfaces)
2. Owner sees "Feedback QR Code" card
3. Owner clicks "Download QR Code"
4. QR code downloads as PNG (high-res, print-ready)
5. Owner prints and places on tables/receipts/reception
6. Guest scans → Opens feedback form directly (not menu)
```

**Acceptance Criteria:**

- [ ] QR code links to standalone feedback URL (not menu)
- [ ] URL format: `menulist.app/f/{storeSlug}` (short, memorable)
- [ ] QR code is high-resolution (300 DPI minimum for print)
- [ ] Download includes store branding (logo if available)
- [ ] Source tracked as `feedback_qr` in MOL events

---

### User Story 5: Multi-Outlet Visibility

**As a** multi-outlet chain owner (HQ)  
**I want to** see feedback across all my stores  
**So that** I can identify systemic issues

**Flow:**

```
1. HQ user logs into dashboard
2. HQ navigates to "Feedback" section
3. HQ sees aggregated feedback from ALL stores
4. HQ can filter by specific store
5. Individual store managers only see their own store's feedback
```

**Acceptance Criteria:**

- [ ] Role-based visibility (HQ vs Manager)
- [ ] Store name shown on each feedback item
- [ ] Filter dropdown for store selection (HQ only)

---

## Requirements

### Functional Requirements

| ID    | Requirement                                          | Priority |
| ----- | ---------------------------------------------------- | -------- |
| FR-01 | Guest can submit feedback without authentication     | P0       |
| FR-02 | Guest must provide rating (1-5 stars)                | P0       |
| FR-03 | Guest can optionally provide message (max 300 chars) | P0       |
| FR-04 | Contact fields configurable per store                | P0       |
| FR-05 | Google Review CTA shown to ALL ratings after submit  | P0       |
| FR-06 | Owner can view feedback list in dashboard            | P0       |
| FR-07 | Owner can filter by: All, Needs Attention, Resolved  | P0       |
| FR-08 | Owner can mark feedback as resolved                  | P0       |
| FR-09 | Owner can enable/disable feedback per project        | P0       |
| FR-10 | Feedback auto-archives after 90 days                 | P0       |
| FR-11 | Multi-outlet: HQ sees all, manager sees own          | P0       |
| FR-12 | Rate limiting: 10 submissions per 10 minutes per IP  | P0       |
| FR-13 | Contact indicator badge shown in inbox list          | P0       |
| FR-14 | WhatsApp deep link if phone number provided          | P0       |
| FR-15 | Owner can download Feedback QR Code (PNG, 300 DPI)   | P0       |
| FR-16 | Feedback QR links to standalone URL (not menu)       | P0       |
| FR-17 | Source tracking: menu_footer vs feedback_qr          | P0       |

### Non-Functional Requirements

| ID     | Requirement          | Target                   |
| ------ | -------------------- | ------------------------ |
| NFR-01 | Form load time       | < 2 seconds              |
| NFR-02 | Submit response time | < 1 second               |
| NFR-03 | Inbox list load time | < 1 second for 100 items |
| NFR-04 | Mobile responsive    | 100% mobile-friendly     |
| NFR-05 | Accessibility        | WCAG 2.1 AA compliant    |

### Firebase Cost Analysis

| Operation             | Frequency  | Reads/Writes  | Monthly Cost (Est.) |
| --------------------- | ---------- | ------------- | ------------------- |
| Submit feedback       | 1000/month | 1 write each  | $0.02               |
| Load inbox (50 items) | 500/month  | 50 reads each | $0.15               |
| Mark resolved         | 800/month  | 1 write each  | $0.01               |
| **Total**             | —          | —             | **< $0.25/month**   |

_Cost per 1000 operations: Reads = $0.006, Writes = $0.018_

---

## Google Review Compliance

### What Is Review Gating? (ILLEGAL)

Review gating is filtering customers based on their feedback sentiment:

- ❌ "Happy? Leave a review!" → "Unhappy? Tell us privately"
- ❌ Only showing Google Review link to 4-5 star ratings
- ❌ Redirecting negative feedback away from Google

### Google's Policy (2024-2025)

> "Businesses must not discourage or prohibit negative reviews, or selectively solicit positive reviews from customers."
> — Google Business Profile Review Policy

### FTC Rules (2025)

The FTC has rules prohibiting:

- Fake review solicitation
- Review suppression
- Using threats to remove negative reviews

### Our Compliance Approach

| Requirement               | Our Implementation                       |
| ------------------------- | ---------------------------------------- |
| No selective solicitation | Google CTA shown to ALL ratings          |
| No gating                 | Same flow for 1-star and 5-star feedback |
| Transparency              | Feedback goes to owner, not filtered     |

**Result:** ✅ Fully compliant with Google policy and FTC rules.

---

## Retention Policy (90 Days)

### Why 90 Days?

| Reason        | Explanation                                         |
| ------------- | --------------------------------------------------- |
| Not a CRM     | This is an operational inbox, not customer database |
| Not analytics | We don't trend or analyze historical data           |
| Privacy       | Guest data shouldn't persist indefinitely           |
| Cost          | Reduces Firestore storage costs over time           |

### What Happens After 90 Days?

1. Feedback document is **deleted** from `guestFeedback` collection
2. MOL (Menu Observation Layer) retains **event metadata only**:
   - Event type: `FEEDBACK_SUBMITTED`
   - Timestamp
   - Store ID
   - Rating (anonymized)
3. **No content** (message, contact info) is retained after 90 days

### Owner Communication

When viewing feedback older than 80 days, show subtle indicator:

> "This feedback will be archived in X days"

---

## Disagreements with ChatGPT Recommendations

| #   | ChatGPT Said                          | We Decided                                  | Reason                                                                                                            |
| --- | ------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | "No per-project toggles"              | **Per-project toggle in Advanced Settings** | Compromise: Owner can disable for promotional menus, but toggle is not prominent (discourages casual use).        |
| 2   | "No configuration for contact fields" | **Store-level defaults**                    | Compromise: Regional privacy requirements handled at store level (GDPR vs India), not per-menu decision overload. |
| 3   | Data path: `stores/{sId}/feedback`    | **Flat `guestFeedback` collection**         | Existing codebase pattern uses flat collections with tId/sId fields for query efficiency.                         |
| 4   | "Remove Success Metrics"              | **Internal MOL events only**                | Agreed: No owner-facing metrics. MOL tracks internally for analytics.                                             |

---

## Risks & Mitigations

| Risk                       | Likelihood | Impact | Mitigation                                      |
| -------------------------- | ---------- | ------ | ----------------------------------------------- |
| Spam/bot submissions       | Medium     | Low    | Rate limiting (10/10min per IP), honeypot field |
| Negative feedback overload | Low        | Medium | "Needs attention" filter helps prioritize       |
| Owner ignores feedback     | Medium     | Low    | Silent by design — no pressure                  |
| Privacy concerns           | Low        | High   | Contact fields optional, 90-day retention       |

---

## Open Questions (None — All Resolved)

All open questions from the critical review have been resolved:

| Question          | Decision                               | Decided By             |
| ----------------- | -------------------------------------- | ---------------------- |
| Collection name   | Separate `guestFeedback`               | User + ChatGPT         |
| Google Review URL | Manual entry + GBP sync                | User                   |
| Menu integration  | Per-project toggle (Advanced Settings) | User + ChatGPT Round 2 |
| Contact fields    | Store-level defaults                   | User + ChatGPT Round 2 |
| Retention         | 90 days hard retention                 | Architect              |

---

## Appendix A: Competitive Landscape

| Competitor           | Approach                           | Our Differentiation              |
| -------------------- | ---------------------------------- | -------------------------------- |
| Toast                | Built-in feedback, heavy analytics | We're simple inbox, no analytics |
| Yelp for Business    | Public reviews only                | We offer private channel         |
| Reputation.com       | Full CRM, AI responses             | We're not a CRM                  |
| Manual (paper cards) | Slow, no digital record            | We digitize without complexity   |

---

## Appendix B: Glossary

| Term                | Definition                                                 |
| ------------------- | ---------------------------------------------------------- |
| **Feedback**        | Private guest rating and message submitted to owner        |
| **Review**          | Public rating on Google/Yelp (not part of this system)     |
| **Review Gating**   | Illegal practice of filtering who can leave public reviews |
| **Needs Attention** | Feedback with rating 1, 2, or 3                            |
| **Resolved**        | Feedback that owner has marked as addressed                |
| **MOL**             | Menu Observation Layer — internal event logging system     |
| **GBP**             | Google Business Profile                                    |

---

_Document Owner: Product Team_  
_Last Updated: February 1, 2026_  
_Next Review: Upon implementation completion_
