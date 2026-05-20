# Public Menu Entry — Business Requirements (Spec)

**Version:** 1.0
**Status:** 📝 DRAFT — Pending review
**Feature Flag:** `ENABLE_PUBLIC_MENU_ENTRY`
**Last Updated:** March 10, 2026

---

## 1. Executive Summary

### Goal

Allow any business owner to upload a menu image and instantly see a structured digital menu — without creating an account. After previewing the result, the owner signs up to claim and publish the page.

### Scope

| In Scope | Out of Scope |
|----------|-------------|
| Public upload page at `/create-menu` | PDF upload (Phase 2 — image only for v1) |
| AI menu extraction from image | Multi-image upload (single image v1) |
| Live preview of extracted menu | Editor/editing capability on public page |
| Sign up to claim + publish | Payment/billing during this flow |
| QR code + share link generation post-publish | Public directory/listing pages |
| Mobile-first responsive design | WhatsApp onboarding integration |
| Rate limiting (3/day per IP) | Social login (Google only + email) |
| 24-hour draft TTL | Custom domain setup |

### Success Metric

**Primary:** Number of published MenuList pages created through `/create-menu`
**Secondary:** Conversion rate from free account → upload → publish

---

## 2. User Stories

### US-1: First Visit (Discovery)
> As a restaurant owner, I want to see what MenuList does for my menu without signing up, so I can decide if it's worth creating an account.

**Flow:**
1. Owner lands on `/create-menu` (from Google, social media, or referral)
2. Sees a simple page: "Start with your current menu"
3. Creates or signs into a free account before upload
4. Uploads one menu image (photo from phone or file from desktop)
5. Waits a short moment for AI extraction
6. Sees a structured preview and CTA: "Create official menu source"

### US-2: Claim & Publish
> As a restaurant owner who saw the preview, I want to quickly create an account and publish my menu page so customers can access it.

**Flow:**
1. Owner reviews the authenticated preview page
2. Owner confirms business name + location (pre-filled from AI if detected)
3. Clicks "Create official menu source"
4. MenuList page created: `{subdomain}.menulist.site`
5. Owner sees: share link + QR code + "Add to Google Maps" hint

### US-3: Abandon & Return
> As a restaurant owner who uploaded from my account, I want to come back within 24 hours and still find my extracted menu.

**Flow:**
1. Owner uploads menu, sees preview
2. Leaves without signing up
3. Returns within 24 hours using the same draft URL (saved in browser/bookmarked)
4. Preview still available
5. Can proceed to sign up and publish

### US-4: Expired Draft
> As a restaurant owner who waited too long, I should understand that my draft expired and can easily start over.

**Flow:**
1. Owner returns after 24 hours
2. Sees: "This draft has expired. Upload your current menu again to create a fresh review."
3. CTA: "Upload Menu" (returns to step 1)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Public page accessible without authentication | P0 |
| FR-2 | Single image upload after free account sign-in (JPEG, PNG, WebP, max 10MB) | P0 |
| FR-3 | AI extraction using existing Gemini 2.5 Flash pipeline | P0 |
| FR-4 | Live preview using existing menu renderer components | P0 |
| FR-5 | Draft stored with unique token URL (not guessable) | P0 |
| FR-6 | Draft expires after 24 hours (auto-cleanup) | P0 |
| FR-7 | Rate limit: 3 extractions per IP per 24 hours | P0 |
| FR-8 | Authenticated draft converted to real project + store | P0 |
| FR-9 | Published page gets subdomain: `{slug}.menulist.site` | P0 |
| FR-10 | QR code + share link shown after publish | P1 |
| FR-11 | "Add to Google Maps" guidance shown after publish | P1 |
| FR-12 | Business name + type detected from menu image (AI) | P1 |
| FR-13 | Mobile-first responsive design | P0 |

### 3.2 Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Upload to preview time | < 30 seconds |
| NFR-2 | Draft storage cost per unclaimed draft | < ₹0.01 |
| NFR-3 | Max concurrent drafts in system | 10,000 |
| NFR-4 | Page load time (create-menu page) | < 2 seconds |
| NFR-5 | Image optimization before upload | Client-side (existing compressor.js) |
| NFR-6 | Zero impact on existing authenticated flows | MANDATORY |

---

## 4. Architecture Overview (High-Level)

```
/create-menu (public page)
      ↓
Upload image → Client-side optimization
      ↓
POST /api/public/create-menu (withAuth, rate-limited)
      ↓
Upload to Firebase Storage (temp path)
      ↓
Gemini 2.5 Flash extraction (server-side)
      ↓
Store result in publicMenuDrafts/{draftId}
      ↓
Return draftId + preview URL
      ↓
/create-menu/preview/{draftId} (public preview)
      ↓
Owner signs up → draft claimed → converted to real project
      ↓
Published: {slug}.menulist.site
```

### Key Architectural Decision

**This feature creates ZERO new extraction logic.** It reuses the existing `processMenuImagesJobLogic` from Cloud Functions. The only new code is:
- A public-facing upload page
- A thin API route that creates a lightweight draft (not a full project)
- A preview page that renders the extracted data
- A claim/convert flow that bridges authenticated draft → project

---

## 5. Risks & Open Questions

| # | Risk/Question | Mitigation/Decision |
|---|---|---|
| R1 | Abuse: bots uploading garbage images | Rate limit 3/IP/day + image validation (min dimensions, file type) |
| R2 | Cost: Gemini API calls for non-converting users | Free account before upload + rate limiting + 24h TTL cleanup |
| R3 | Quality: poor extraction from phone photos | Show "Best results with clear, well-lit photos" guidance |
| R4 | Privacy: menu images uploaded by non-owners | Account gate before upload; Terms acceptance remains in auth flow |
| R5 | Storage: unclaimed images accumulate | 24h TTL auto-cleanup via nightly scheduler |
| OQ1 | Should we support PDF upload in v1? | DECISION: No. Image-only for v1. PDF adds complexity. |
| OQ2 | Should preview be editable before publish? | DECISION: No. Edit after publish in dashboard. Keeps flow simple. |
| OQ3 | Should we require account before extraction? | DECISION: Yes. Show public proof first, then require a free account before AI processing. |

---

## 6. Feature Rejection Gate

| Question | Answer | Pass/Fail |
|---|---|---|
| Removes a decision? | Yes — removes "how do I get my menu online?" | ✅ PASS |
| Would anyone notice absence? | Yes — primary acquisition funnel | ✅ PASS |
| Strengthens core moment? | Yes — creates canonical public page | ✅ PASS |
| One sentence without "and"? | "Upload your menu photo, get a live page." | ✅ PASS |
| Still matters in 3 years? | Yes — page creation is foundational | ✅ PASS |

**Result: 5/5 — APPROVED**

---

**Document Signature:** MenuList Feature Spec
**Audience:** CEO / PM / Business stakeholders
