# Menu Presence Monitor — Spec

> **Version:** 2.0 (post-ChatGPT feedback)
> **Last Updated:** March 16, 2026
> **Audience:** CEO, PM, Business stakeholders

---

## 1. Executive Summary

**What:** A simple status checklist showing restaurant owners where their menu is visible to customers — and where it's missing.

**Why:** Owners publish their menu once and forget to distribute it. They miss placing the link on Google Business, Instagram, WhatsApp, or printing QR cards. This means customers searching for the restaurant can't find the menu. Menu Presence Monitor surfaces these gaps with simple ✓/⚠ signals.

**For Whom:** All MenuList business owners (restaurants, salons, cafes, gyms — any business type).

**Success Metric:** Owners who see the presence checklist deploy their menu to 2+ more surfaces within the first week.

---

## 2. Goals

1. Show owners a clear picture of where their menu is visible to customers
2. Gently encourage deployment to key surfaces (Google, Instagram, WhatsApp)
3. Celebrate completed deployment (✓ signals feel like progress)
4. Zero cognitive load — no decisions required, just status signals

## 3. Non-Goals (Out of Scope)

- ❌ Automated link detection (crawling Instagram/Google to verify link exists)
- ❌ Analytics (how many views per surface)
- ❌ Marketing campaign suggestions
- ❌ Complex onboarding flows
- ❌ Notifications or reminders to add links
- ❌ Multi-outlet surface tracking (v1 = store-level only)

---

## 4. Target Users

**ICP:** Non-tech SMB owner who just published their menu.
**Moment:** Owner opens Use MenuList page and sees at a glance whether they've placed their menu everywhere important.
**Behavior:** Owner notices "⚠ Google Business — Not added" → copies link → adds to Google → comes back and marks "I added it."

---

## 5. User Flow

### 5.1 View Presence Status

1. Owner opens `/use-menulist` page
2. At the top (below Quick Actions), sees **"Menu Visibility"** card
3. Card shows 6 surface statuses with ✓/⚠ icons
4. Automatic surfaces (QR, Screens, Feedback) already show correct status
5. Manual surfaces (Google, Instagram, WhatsApp) show ⚠ until confirmed

### 5.2 Confirm Manual Surface

1. Owner sees "⚠ Google Business — Not added"
2. Taps "Copy Link" button next to it
3. Goes to Google Business, pastes link
4. Returns to MenuList, taps "I added it" on the Google row
5. Status changes to "✓ Google Business — Added"
6. Stored on the store document — persists across sessions

### 5.3 Reset Confirmation

1. Owner taps the ✓ row for a surface
2. Sees option to "Remove" (mark as not added)
3. Status reverts to ⚠

---

## 6. Surface Definitions

| Surface              | Why It Matters                                                                     | Detection                  |
| -------------------- | ---------------------------------------------------------------------------------- | -------------------------- |
| **Google Business**  | #1 discovery surface for restaurants. Customers search → see menu.                 | Manual                     |
| **Instagram Bio**    | Second most common discovery for food businesses. Bio link = menu access.          | Manual                     |
| **WhatsApp Profile** | Many Indian SMBs use WhatsApp Business. Profile description should have menu link. | Manual                     |
| **Table QR**         | Primary in-restaurant access point. Must be physically printed and placed.         | Auto (Menu Kit downloaded) |
| **Digital Screens**  | Visual menu display for counter/wall.                                              | Auto (screen token exists) |
| **Feedback QR**      | Post-dining feedback collection surface.                                           | Auto (feedback enabled)    |

---

## 7. UI Design (v2 — Guided Flow)

### 7.1 Card Layout (Grouped + Sequential)

```
┌─────────────────────────────────────────────────┐
│ Make your menu easy to find                      │
│ Add your menu to the places customers look       │
│                                     Visible in 2 │
│                                                   │
│ ONLINE DISCOVERY                                  │
│                                                   │
│ ⚠ 🌐 Google Business         [Start here]        │
│      Customers searching on Google can see it     │
│      Most businesses add their menu to Google     │
│                              [Add to Google]      │
│                                                   │
│ ⚠ 📸 Instagram Bio                               │
│      Add menu link to your bio for followers      │
│                                                   │
│ ⚠ 💬 WhatsApp Profile                            │
│      Customers messaging you can open your menu   │
│                                                   │
│ INSIDE YOUR STORE                                 │
│                                                   │
│ ✓ 📱 Table QR — QR ready to print          Auto  │
│ ✓ 🖥 Digital Screens — Screen connected     Auto  │
│ ✓ 💬 Feedback QR — Feedback available       Auto  │
└─────────────────────────────────────────────────┘
```

### 7.2 After Owner Taps "Add to Google" (Guide Opens)

```
│ ✓ Menu link copied                               │
│                                                   │
│ How to add:                                       │
│ 1. Open your Google Business profile              │
│ 2. Click "Edit profile"                           │
│ 3. Paste the menu link in Website or Menu field   │
│                                                   │
│ [Open Google]  [Mark as Added]                    │
```

### 7.3 After Owner Confirms

```
│ ✓ 🌐 Google Business — Menu link added  [Remove] │
│                                                   │
│ ⚠ 📸 Instagram Bio                      [Next]   │
```

### 7.4 Completion State

```
│                                       All set │
│ ✓ Your menu is easy to find everywhere        │
│   customers look                              │
```

---

## 8. Data Model

**Storage:** Single field `menuPresence` on existing store document. Timestamp-only — exists = confirmed, missing = not confirmed.

```typescript
menuPresence?: {
  googleBusiness?: string;   // ISO 8601 timestamp when owner confirmed
  instagramBio?: string;     // ISO 8601 timestamp when owner confirmed
  whatsappProfile?: string;  // ISO 8601 timestamp when owner confirmed
}
```

Auto-detected surfaces (QR, Screens, Feedback) derive status from existing store/screen data — no new fields needed.

Surface IDs are **IMMUTABLE** — never rename. Max **6 surfaces forever**.

---

## 9. Risks & Open Questions

1. **Manual confirmation reliability** — Owners might confirm without actually adding the link. Acceptable for v1 — the goal is awareness, not verification.
2. **Surface relevance** — Not all businesses use Instagram or WhatsApp. The checklist should feel helpful, not judgmental.
3. **Placement** — Must not crowd the Use MenuList page. Compact card design is critical.

---

## 10. Success Criteria

- Owner can see presence status in under 3 seconds
- Confirming a surface takes 1 tap
- Zero new Firebase collections
- Zero new API routes (client-side DAL only)
- Feature flag OFF by default

---

**Document Signature:** Product Specification
**Created:** March 15, 2026
