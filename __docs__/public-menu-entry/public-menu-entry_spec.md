# Public Menu Entry — Business Requirements (Spec)

**Version:** 1.0
**Status:** ✅ IMPLEMENTED — Active funnel
**Feature Flag:** `ENABLE_PUBLIC_MENU_ENTRY`
**Last Updated:** June 3, 2026

---

## 1. Executive Summary

### Goal

Allow any business owner to reach a public upload entry point, sign in, upload a menu image or paste a permission-confirmed public menu link, and see a structured preview before payment. After previewing the result, the owner confirms business basics and publishes a 7-day starter activation on the permanent public URL.

### Scope

| In Scope | Out of Scope |
|----------|-------------|
| Public upload/link page at `/create-menu` | Public multi-image upload |
| Authenticated menu extraction from image or owner-provided public menu link | Anonymous AI extraction or upload loops |
| Live preview of extracted menu | Editor/editing capability on public page |
| Confirm business basics + publish starter activation | Payment/billing during upload/extraction |
| QR code + share link generation post-publish | Public directory/listing pages |
| Mobile-first responsive design | WhatsApp onboarding integration |
| Phone/WhatsApp OTP as primary sign-in path, with direct Google fallback on `/create-menu` and password/passcode fallback on `/signin` | Anonymous auth bypass |
| Rate limiting (5/day per signed-in owner, with draft reuse/dedupe) | Separate auth session system |
| 24-hour unclaimed draft TTL; 7-day claimed starter activation | Custom domain setup |

### Success Metric

**Primary:** Number of verified starter activations created through `/create-menu`
**Secondary:** Conversion rate from phone verification/sign-in → upload → preview → starter activation → payment

---

## 2. User Stories

### US-1: First Visit (Discovery)
> As a restaurant owner, I want to understand the setup before committing payment, so I can decide if MenuList can become my official customer menu source.

**Flow:**
1. Owner lands on `/create-menu` (from Google, social media, or referral)
2. Sees a simple page: "Start with your current menu"
3. Signs in to protect the setup before source processing
4. Uploads one menu image or pastes a public menu link they have permission to import
5. Waits a short moment for extraction
6. Sees a structured preview and CTA to continue setup

### US-2: Claim & Publish
> As a restaurant owner who saw the preview, I want to quickly create an account and publish my menu page so customers can access it.

**Flow:**
1. Owner reviews the owner-bound preview page
2. Owner confirms business name + location (pre-filled from extraction if detected)
3. Clicks "Create official menu source"
4. MenuList starter page created at the permanent customer URL from `getMenuUrl(subdomain)`
5. Owner sees: share link + QR code + "Add to Google Maps" hint
6. The same URL and QR remain after payment

### US-3: Abandon & Return
> As a restaurant owner who uploaded from the public entry page, I want to come back within 24 hours and still find my extracted preview.

**Flow:**
1. Owner uploads menu, sees preview
2. Leaves without publishing starter activation
3. Returns within 24 hours using the same draft URL while signed in to the same account
4. Preview still available
5. Can proceed to confirm business basics and publish starter activation

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
| FR-2 | Single authenticated image upload (JPEG, PNG, WebP, max 10MB) | P0 |
| FR-3 | Permission-confirmed authenticated public menu link import, gated by `ENABLE_MENU_LINK_IMPORT` | P0 |
| FR-4 | AI extraction using the configured public-route model and existing extraction patterns | P0 |
| FR-5 | Live preview using existing menu renderer components | P0 |
| FR-6 | Draft stored with unique token URL (not guessable) | P0 |
| FR-7 | Draft expires after 24 hours (auto-cleanup) | P0 |
| FR-8 | Rate limit: 5 new extractions per user per 24 hours, with active draft reuse and same-source dedupe before new AI work | P0 |
| FR-9 | Authenticated claim converts draft to real project + store with `onboardingSource: 'PUBLIC_MENU_ENTRY'` | P0 |
| FR-10 | Published starter page gets permanent subdomain via shared URL helper | P0 |
| FR-11 | QR code + share link shown after publish | P1 |
| FR-12 | "Add to Google Maps" guidance shown after publish | P1 |
| FR-13 | Business name + type detected from menu source (AI) | P1 |
| FR-14 | Mobile-first responsive design | P0 |

### 3.2 Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Source submission to preview time | < 30 seconds for typical image/text sources |
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
Owner signs in
      ↓
Upload image → Client-side optimization
or paste public menu link → permission confirmation + SSRF-safe acquisition
      ↓
POST /api/public/create-menu (authenticated, SAFE_MODE + user rate-limited + draft reuse/dedupe)
      ↓
Upload source artifact to Firebase Storage (temp path)
      ↓
Gemini extraction (server-side, public-route model/cost tracked)
      ↓
Store result in publicMenuDrafts/{draftId}
      ↓
Return draftId + preview URL
      ↓
/create-menu/preview/{draftId} (authenticated owner-bound preview)
      ↓
Owner confirms business basics → draft claimed → converted to real project/store
      ↓
Published starter activation: permanent customer URL from getMenuUrl(subdomain)
```

### Key Architectural Decision

**This feature keeps extraction narrow and isolated.** It reuses the shared Gemini client, AI operation logging, and category/language helpers, but does not reuse the authenticated job queue because public drafts do not have tenant/store context until claim. The new code is:
- A public-facing upload page
- A thin API route that creates a lightweight draft (not a full project)
- A preview page that renders the extracted data
- A claim/convert flow that bridges public draft → authenticated project/store starter activation

---

## 5. Risks & Open Questions

| # | Risk/Question | Mitigation/Decision |
|---|---|---|
| R1 | Abuse: bots uploading garbage images or URLs | Auth before upload + user rate limit + image validation + permission checkbox + SSRF-safe URL acquisition |
| R2 | Cost: repeated extraction by non-converting users | SAFE_MODE + user rate limiting + active draft reuse + source dedupe + 24h TTL cleanup |
| R3 | Quality: poor extraction from phone photos or unreadable links | Show clear fallback: upload a photo or try another public menu link |
| R4 | Privacy: menu sources submitted by non-owners | Permission confirmation, 24h draft TTL, no raw IP storage, sign-in before public claim/publish |
| R5 | Storage: unclaimed source artifacts accumulate | 24h TTL auto-cleanup via nightly scheduler |
| R6 | SSRF/crawler abuse from public URLs | Same bounded acquisition helper as authenticated Menu Link Import; blocks unsafe protocols, private IPs, unsafe redirects, and unbounded crawling |
| OQ1 | Should we support PDF file upload in v1? | DECISION: Direct public file upload remains image-only; public links may resolve to readable PDFs through Menu Link Import. |
| OQ2 | Should preview be editable before publish? | DECISION: No. Edit after publish in dashboard. Keeps flow simple. |
| OQ3 | Should we require account before extraction? | DECISION: Yes. Phone/WhatsApp OTP or existing sign-in happens before upload/extraction so free processing stays owner-bound. |

### 5.1 Physical Claim Acquisition Boundary

A printed owner-claim postcard can be a valid acquisition input for Public Menu Entry, but no signed physical claim-link resolver exists in the current implementation.

Current safe targets:

- Print acquisition QR -> `/create-menu?utm_source=print&utm_medium=postcard&utm_campaign=pilot`
- Offer variant -> `/create-menu?utm_source=print&utm_medium=postcard&utm_campaign=pilot&utm_content=offer`
- No-offer variant -> `/create-menu?utm_source=print&utm_medium=postcard&utm_campaign=pilot&utm_content=no_offer`

Future signed resolver target, requiring a separate implementation plan:

- `go.menulist.ai/claim?m={merchant_id}&audit={audit_id}&exp={exp}&sig={hmac}`

The future resolver must not be treated as Menu Kit. It would need feature flagging, Zod validation, HMAC expiry, replay protection, public rate limiting, privacy-bounded scan logging, generic error handling, and Firebase cost documentation before code.

---

## 6. Feature Rejection Gate

| Question | Answer | Pass/Fail |
|---|---|---|
| Removes a decision? | Yes — removes "how do I get my menu online?" | ✅ PASS |
| Would anyone notice absence? | Yes — primary acquisition funnel | ✅ PASS |
| Strengthens core moment? | Yes — creates canonical public page | ✅ PASS |
| One sentence without "and"? | "Start from your current menu source." | ✅ PASS |
| Still matters in 3 years? | Yes — page creation is foundational | ✅ PASS |

**Result: 5/5 — APPROVED**

---

**Document Signature:** MenuList Feature Spec
**Audience:** CEO / PM / Business stakeholders
