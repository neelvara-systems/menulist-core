# Messaging Onboarding — Test Cases & Use Cases

**Feature:** Messaging Onboarding — Zero-Friction SMB Acquisition Engine
**Status:** Source-backed test matrix — not current target or provider certification
**Last Updated:** July 16, 2026
**Sources:** ChatGPT conversation (Feb 16, 2026), Cascade architecture review, codebase cross-check, multi-provider architecture design, May 17 runtime audit

> **Launch boundary:** Not current launch certification or deploy approval. Current source registers WhatsApp only, while checked-in Functions environments keep provider processing disabled. Test-case definitions and historical results do not replace current target enablement/deploy evidence, real-provider smoke, browser/device QA, production-host smoke, or External Certification Runbook evidence.

## July 13, 2026 Ops Monitor Regression Matrix

`npm run verify:messaging-onboarding-monitor-boundary` now includes a pure runtime contract suite for the platform monitor.

| Case | Expected result |
| --- | --- |
| Real health producer retention shape includes `retainPublishedSourceFiles: true` | Route projection omits producer-only booleans and the browser contract accepts the resulting snapshot |
| Health snapshot contains more than 8 alerts | Response contains only 8 generic, bounded alert summaries |
| `lastSnapshotId` has whitespace, control characters, path separators, reserved syntax, or a coercible object | No snapshot document reference is built; health remains unknown |
| Stored event contains raw identifier text, PII metadata, control characters, negative counters, or raw provider error text | Identifier is re-masked; PII becomes presence/length metadata; invalid fields and raw error text are dropped |
| Stored session counters are strings, negative, nonfinite, or unsafe integers | Values are not coerced; monitor receives safe zero/default values |
| Generated-at or row timestamps are malformed/noncanonical | Browser response guard rejects the snapshot and clears stale state |
| A superseded refresh resolves after the current refresh | Superseded response is ignored and cannot overwrite current data |
| Events are future-dated | Closed 24-hour query excludes them from rows and counts |
| More than 30 unrelated alerts are newer than a messaging alert | Indexed subsystem query still returns the recent messaging alert, capped at 8 reads |

The source verifier also pins platform authorization, the composite alert index, closed-window query clauses, response caps, no-store behavior, hashed rate-limit keys, desktop/mobile route wiring, and the absence of raw persisted-object forwarding.

---

## Test Case Categories

| Category                           | Count   | Priority |
| ---------------------------------- | ------- | -------- |
| A. Happy Path Flows                | 5       | P0       |
| B. Input & Media Edge Cases        | 16      | P0       |
| C. State Machine & Session Logic   | 13      | P0       |
| D. Asset Intelligence Layer        | 8       | P0       |
| E. Menu Extraction Edge Cases      | 9       | P1       |
| F. Preview Page                    | 9       | P0       |
| G. Publish Pipeline                | 10      | P0       |
| H. WhatsApp Message Handling       | 11      | P0       |
| I. Security & Abuse Prevention     | 10      | P0       |
| J. Cleanup & Lifecycle             | 6       | P1       |
| K. Performance & Scale             | 5       | P2       |
| L. Multi-Provider & Isolation      | 14      | P0       |
| M. Publish Pipeline & Identity     | 13      | P0       |
| N. Internal Tracking               | 10      | P0       |
| O. Firestore & Data Consistency    | 4       | P0       |
| P. Extraction & AI Failure Cascade | 3       | P0       |
| Q. Multi-Tab / Multi-Device Chaos  | 3       | P0       |
| R. WhatsApp Delivery Reality       | 3       | P0       |
| S. Extreme Abuse & Cost Attacks    | 2       | P0       |
| T. Session Edge Corruption         | 5       | P0       |
| U. Production Hardening            | 21      | P0       |
| **Total**                          | **175** |          |

---

## A. Happy Path Flows

| ID   | Scenario                           | Steps                                                                                 | Expected Outcome                                                                                    | Priority |
| ---- | ---------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------- |
| A-01 | **Single image, complete menu**    | Owner sends 1 clear photo of complete menu → waits → preview → approves               | Session: LIVE. Store, tenant, project, project summary, public URL, and claimable owner account created. Final message with live link sent.          | P0       |
| A-02 | **Multiple images, standard menu** | Owner sends 4 menu page photos within 2 min → fast-start triggers → preview → approve | All 4 images validated, extraction combines results, preview shows full menu, publish succeeds.     | P0       |
| A-03 | **PDF upload, complete menu**      | Owner sends single PDF with 6 pages → PDF fast-start (60s) → preview → approve        | PDF pages validated, valid pages extracted, preview shows structured menu.                          | P0       |
| A-04 | **Mixed upload (images + PDF)**    | Owner sends 2 images then 1 PDF within intake window                                  | All files collected, validated together, extraction processes all valid files.                      | P0       |
| A-05 | **Business info auto-detected**    | Owner sends menu with business name, phone, address visible in header/footer          | Preview pre-fills business name, phone, address from AI extraction. Owner confirms without editing. | P0       |

---

## B. Input & Media Edge Cases

| ID   | Scenario                                      | Steps                                                                         | Expected Outcome                                                                                                                                                 | Priority |
| ---- | --------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| B-01 | **Blurry/unreadable photo**                   | Owner sends 2 blurry images                                                   | Asset Intelligence: no valid menu files. Reply: "Send clearer menu photos or a menu PDF." Session stays in COLLECTING_INPUT.                                    | P0       |
| B-02 | **Cropped photo (half menu)**                 | Owner sends photo of only half a menu page                                    | AI detects partial menu. Reply: "Send the full menu for best result." Wait for more.                                                                             | P0       |
| B-03 | **Too many images (>15)**                     | Owner sends 16+ images in one session                                         | After 15th image, reply: "Combine remaining pages into a PDF or send fewer clearer photos." Additional images not stored.                                        | P0       |
| B-04 | **Images out of order**                       | Owner sends page 3, then page 1, then page 2                                  | System collects all, processes by upload timestamp. Extraction combines data regardless of order (categories/items merged).                                      | P1       |
| B-05 | **Duplicate image sent twice**                | Owner sends same photo twice (identical content)                              | SHA-256 hash matches → second upload silently deduplicated. Only 1 copy processed.                                                                               | P0       |
| B-06 | **Rotated/sideways PDF**                      | Owner sends PDF with pages rotated 90°                                        | Gemini AI handles orientation implicitly during extraction. If fails, ask for clearer photos.                                                                    | P1       |
| B-07 | **Password-protected PDF**                    | Owner sends encrypted/locked PDF                                              | Detection during download/parse. Reply: "This PDF is locked. Send an unlocked PDF or photos."                                                                    | P0       |
| B-08 | **Very large file (>10MB)**                   | Owner sends a 15MB image                                                      | WhatsApp itself limits file sizes (~16MB images, 100MB documents). If oversized, WhatsApp won't deliver. If received, store and process normally up to 10MB cap. | P1       |
| B-09 | **Non-image file (Excel, Word, etc.)**        | Owner sends .xlsx or .docx file                                               | MIME type check rejects. Reply: "Send menu photos or a menu PDF."                                                                                                | P0       |
| B-10 | **Extremely small image**                     | Owner sends a 50x50px thumbnail                                               | Asset Intelligence flags as unreadable (low confidence). Ask for clearer photos.                                                                                 | P1       |
| B-11 | **Menu photos with watermarks**               | Owner sends photos of menu from aggregator app (with Zomato/Swiggy watermark) | Extraction processes best-effort. Watermarks may reduce quality score. If score < 40, ask for clearer photos.                                                    | P2       |
| B-12 | **Screenshot of menu (not photo)**            | Owner sends screenshot of their menu from phone                               | Valid image format. Process normally. May have lower quality than direct photo.                                                                                  | P2       |
| B-13 | **Menu written on whiteboard/chalkboard**     | Owner sends photo of handwritten menu on board                                | Gemini AI attempts OCR. Quality depends on handwriting clarity. Low confidence → ask for clearer image.                                                          | P1       |
| B-14 | **Menu in image with dark/poor lighting**     | Owner sends photo taken in dim restaurant                                     | Low OCR confidence. If validation fails, ask for clearer photos. If passes, extraction runs (may have lower quality score).                                      | P1       |
| B-15 | **Multiple menus from different restaurants** | Owner sends photos from 2 different restaurants                               | Asset Intelligence processes as one menu. Business info may be confused. Preview shows mixed data. Owner can fix via Request Fix or restart.                     | P2       |
| B-16 | **Menu image is actually a visiting card**    | Owner sends business card instead of menu                                     | Asset Intelligence classifies as invalid (no menu items/prices). Reply: "Send menu photos or a menu PDF."                                                        | P0       |

---

## C. State Machine & Session Logic

| ID   | Scenario                                        | Steps                                                                                                                                                     | Expected Outcome                                                                                                                                                                                | Priority |
| ---- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| C-01 | **Fast-start trigger (4+ images, 90s gap)**     | Owner sends 5 images within 1 min, then stops                                                                                                             | After 90 seconds of no new upload, processing auto-starts (fast-start condition met).                                                                                                           | P0       |
| C-02 | **PDF fast-start trigger (PDF + 60s gap)**      | Owner sends 1 PDF, then stops                                                                                                                             | After 60 seconds of no new upload, processing auto-starts.                                                                                                                                      | P0       |
| C-03 | **Max wait trigger (10 min)**                   | Owner sends 1 image, no more uploads for 10 min                                                                                                           | Processing starts after 10 min inactivity (max wait trigger).                                                                                                                                   | P0       |
| C-04 | **Slow sender resets timer**                    | Owner sends 1 image at T+0, 1 at T+4min, 1 at T+8min                                                                                                      | Each upload resets the 10-min inactivity timer. Processing starts at T+18min (10 min after last upload).                                                                                        | P0       |
| C-05 | **New uploads arrive DURING processing**        | Owner sends 3 images → processing starts → owner sends 2 more images                                                                                      | New uploads stored, `pendingUploadsWhileProcessing = true`. After current processing finishes, if new uploads exist, restart validation with entire upload set.                                 | P0       |
| C-06 | **New uploads arrive AFTER preview ready**      | Preview sent → owner sends 1 more image                                                                                                                   | Reply: "Your preview is ready. Send full menu photos again to update." New image NOT auto-added to current preview.                                                                             | P0       |
| C-07 | **Full resend after preview (restart)**         | Preview sent → owner sends 6 new images (full menu resend)                                                                                                | Session resets to COLLECTING_INPUT. Old extraction discarded. New intake window starts. Full re-processing with new images.                                                                     | P0       |
| C-08 | **Session expiry (24h)**                        | Owner sends photos → preview generated → owner doesn't respond for 24h                                                                                    | Session state → EXPIRED. No store created. Uploaded media queued for deletion.                                                                                                                  | P0       |
| C-09 | **Session expiry BEFORE preview**               | Owner sends 2 images → disappears for 24h before processing triggers                                                                                      | If intake never closes (no more uploads, 10 min never reached because session expires first), session → EXPIRED.                                                                                | P1       |
| C-10 | **Multiple active sessions same provider+user** | Owner has session in PREVIEW_READY, sends new menu images                                                                                                 | System finds existing active session for this provider+user. New uploads handled per state rules (C-06: reply with existing preview link). Only 1 active session per provider+user combination. | P0       |
| C-11 | **Session state audit trail**                   | Complete full flow from COLLECTING → LIVE                                                                                                                 | `stateHistory` array contains all transitions with timestamps. Every state change logged.                                                                                                       | P1       |
| C-12 | **Concurrent processing safety**                | Two messages arrive simultaneously for same session                                                                                                       | Firestore transaction on session doc ensures atomic state updates. No race condition.                                                                                                           | P0       |
| C-13 | **Forbidden state transitions rejected**        | Attempt invalid transitions: COLLECTING_INPUT→LIVE, LIVE→COLLECTING_INPUT, EXPIRED→PROCESSING_MENU, COOLDOWN→PROCESSING_MENU, PUBLISHING→COLLECTING_INPUT | State machine rejects all. Error logged. Session state unchanged. No data corruption.                                                                                                           | P0       |

---

## D. Asset Intelligence Layer

| ID   | Scenario                                         | Steps                                                                          | Expected Outcome                                                                                                                       | Priority |
| ---- | ------------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| D-01 | **All valid menu files**                         | Owner sends 4 photos, all are menu pages                                       | `valid_menu_files: [1,2,3,4]`, `invalid_files: []`, proceed to extraction.                                                             | P0       |
| D-02 | **Mix of valid and invalid files**               | Owner sends 5 photos: 3 menu pages + 1 interior + 1 selfie                     | `valid_menu_files: [1,2,3]`, `invalid_files: [4,5]`. Only 3 files sent to extraction. No user notification about ignored files.        | P0       |
| D-03 | **No valid menu files at all**                   | Owner sends 3 photos: all logos/interiors/people                               | `valid_menu_files: []`. Reply: "Send clearer menu photos or a menu PDF." Session stays active. `invalidUploadAttempts` incremented. | P0       |
| D-04 | **Partial menu detected**                        | Owner sends 2 photos covering only appetizers section                          | `menu_completeness: "partial"`. Reply: "Send the full menu for best result." State → AWAITING_MORE_UPLOADS.                        | P0       |
| D-05 | **Usable menu (≥60% complete)**                  | Owner sends 3 photos covering most categories, missing desserts                | `menu_completeness: "likely_complete"`, `confidence: "medium"`. Proceed to extraction. Don't wait for perfect.                         | P0       |
| D-06 | **Business info extracted with high confidence** | Menu has "Spice Garden" header, "+91 98xxxxx" footer, "MG Road" address        | `extracted_business_info.business_name: "Spice Garden"`, phone and address filled, `confidence: "high"`.                               | P0       |
| D-07 | **No business info found**                       | Menu pages have no headers, no phone numbers, no address                       | `extracted_business_info` fields all null, `confidence: "low"`. Preview shows empty business fields (owner fills manually).            | P0       |
| D-08 | **PDF with mixed pages (menu + T&C)**            | Owner sends 8-page PDF: 5 menu pages + title page + T&C page + GST certificate | Gemini identifies valid pages: [2,3,4,5,6]. Pages 1,7,8 skipped. Only valid pages sent to extraction.                                  | P0       |

---

## E. Menu Extraction Edge Cases

| ID   | Scenario                                       | Steps                                                                                 | Expected Outcome                                                                                                                            | Priority |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| E-01 | **Multiple prices per item (Half/Full)**       | Menu has "Paneer Tikka: Half ₹199, Full ₹349"                                         | Extraction creates item with attributes: [{name:"Half", price:"199"}, {name:"Full", price:"349"}]. Handled by existing extraction pipeline. | P1       |
| E-02 | **Ambiguous prices (Market Price, Seasonal)**  | Menu has "Lobster: Market Price"                                                      | Extraction stores price as "Market Price" string. Preview shows as-is. Accepted as valid price format.                                      | P1       |
| E-03 | **Weird currency formats**                     | Menu shows "₹ 99/-", "Rs. 100", "100 INR", "$5"                                       | Extraction normalizes to clean price string. Currency detected from menu locale/store defaults.                                             | P1       |
| E-04 | **Combos/sets/meal deals**                     | Menu has "Family Combo: Pizza + Garlic Bread + 2 Cokes — ₹599"                        | Treated as normal item under "Combos" category. Single price.                                                                               | P1       |
| E-05 | **Non-English menu (Hindi, Gujarati, Arabic)** | Menu entirely in Hindi/Devanagari script                                              | Full Unicode support. Extraction handles multi-script text. Preview renders correctly. Languages detected and stored.                       | P1       |
| E-06 | **Mixed language menu (Hindi + English)**      | Same item has Hindi and English names                                                 | Extraction captures both languages. Multi-language fields populated.                                                                        | P1       |
| E-07 | **Menu with decorative emojis/symbols**        | Menu has "🌶️ Spicy Paneer" and "★ Chef's Special"                                     | DOMPurify sanitization strips unsafe characters. Emojis in item names preserved (they're valid Unicode).                                    | P2       |
| E-08 | **Very long item names/descriptions**          | Item name: "Grandma's Special Homestyle Slow-Roasted Heritage Chicken..." (80+ chars) | Extraction truncates: name max 100 chars, description max 300 chars per existing schema.                                                    | P2       |
| E-09 | **Extraction produces 0 items (blank result)** | Gemini AI returns empty categories/items despite valid-looking images                 | **BLANK PREVENTION GATE:** Never generate preview. Session → FAILED. Reply: "Send clearer menu photos or a menu PDF." Owner can retry.       | P0       |

---

## F. Preview Page

| ID   | Scenario                                            | Steps                                                                                                                  | Expected Outcome                                                                                                                        | Priority |
| ---- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| F-01 | **Preview loads correctly**                         | Open preview URL with valid token                                                                                      | Full menu displayed. Business info pre-filled. "Preview — Not Live Yet" label visible. Two buttons: Approve & Publish, Request Fix.     | P0       |
| F-02 | **Preview with editable business info**             | Owner changes business name from "Spice Garden" to "The Spice Garden" in preview                                       | Updated name saved in session. Used as store name on publish.                                                                           | P0       |
| F-03 | **Preview opened on mobile (WhatsApp link)**        | Owner taps preview link in WhatsApp on phone                                                                           | Page renders correctly on 320px+ screens. Buttons are 44px+ touch targets. No horizontal scroll. Menu readable.                         | P0       |
| F-04 | **Preview opened by someone else (forwarded link)** | Owner forwards preview link to friend. Friend opens it.                                                                | Preview page loads. Friend CAN approve if they have the valid token (INV-2, ADR-13 — owner's delegation choice, data is non-sensitive). | P0       |
| F-05 | **Preview token expired**                           | Open preview URL after session expired (24h)                                                                           | 404 or "This preview has expired" page. No menu data shown.                                                                             | P0       |
| F-06 | **Preview with invalid/tampered token**             | Open preview URL with wrong token                                                                                      | 403 Forbidden. No data shown.                                                                                                           | P0       |
| F-07 | **Request Fix flow**                                | Owner clicks "Request Fix" → selects "Price incorrect" + "Item missing" → adds note "butter chicken missing" → submits | Fix request saved in session. Session state update. WhatsApp message sent: "Send updated menu photos for best results."                 | P0       |
| F-08 | **Request Fix with empty selection**                | Owner clicks "Request Fix" → tries to submit without selecting any checkbox                                            | Client-side validation blocks: "Select at least one issue."                                                                             | P0       |
| F-09 | **Approve clicked twice rapidly**                   | Owner double-clicks "Approve & Publish"                                                                                | First click triggers publish. Second click gets "Already publishing" or idempotent response. Only 1 store created.                      | P0       |
| F-10 | **Post-publish copy blocked by browser**            | Open a LIVE preview success page and force Clipboard API failure with no acknowledged textarea fallback                                                       | Page keeps the menu live state, shows fixed copy failure text, does not show copied state, and logs only session/link presence-length plus clipboard/fallback support metadata.                     | P1       |
| F-11 | **Post-publish WhatsApp open blocked by browser**   | Open a LIVE preview success page and block the WhatsApp popup                                                          | Page keeps the menu live state, shows fixed WhatsApp failure text, opens with `noopener,noreferrer` when allowed, and logs only session/link presence-length plus message/URL lengths. | P1       |
| F-12 | **Malformed successful preview response**           | Force preview load, approve, or fix API to return malformed JSON or a successful response missing required envelope fields | Page keeps fixed owner-facing failure copy, does not mark publish/fix state complete, and logs only bounded parser/shape diagnostics. | P1       |

---

## G. Publish Pipeline

| ID   | Scenario                                       | Steps                                                                                                                          | Expected Outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Priority |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| G-01 | **Successful publish (full atomicity)**        | Owner approves preview                                                                                                         | One transaction creates tenant (with incremented tId), store (with sId, default roles, timeSlotPresets, businessCategory), user (linked to phone), project, project summary, platformSummary/storesSummary sync, and session LIVE finalization. Public cache tags are revalidated after commit. Final WA message is queued.                                                                                                                                                                                                                                     | P0       |
| G-02 | **Publish fails mid-transaction**              | Database error during Firestore transaction                                                                                    | Transaction rolls back. No partial tenant/store/user/project and no LIVE session. Retry attempted once. If retry fails: session returns to AWAITING_APPROVAL (not FAILED). Preview + extraction data preserved. Error message: "Publishing failed. Try again." Owner can re-open preview and retry approve.                                                                                                                                                                                                                                                | P0       |
| G-03 | **Publish with empty business name**           | Owner clears business name field in preview → tries to approve                                                                 | Client-side validation blocks: "Business name is required." Approve button disabled until filled.                                                                                                                                                                                                                                                                                                                                                                                                                                           | P0       |
| G-04 | **Publish when menu has critical gaps**        | Extracted menu has categories but 0 items with prices                                                                          | **PUBLISH VALIDATION GATE:** Publish blocked. Inline message: "Menu must have at least 1 category and 1 item with a price."                                                                                                                                                                                                                                                                                                                                                                                                                 | P0       |
| G-05 | **Publish creates correct store data**         | Verify store document after publish                                                                                            | Store has: name, businessType (AI-detected actual type e.g. "Restaurant", or canonical "Other" when type confidence is low — NOT "B2C"), businessCategory, email, phoneNumber, defaultLanguage, country/currency, active: true, roles, timeSlotPresets, tenantId, storeId, storeKey, isMaster: true, onboardingSource: 'MESSAGING_ONBOARDING', starterActivationStatus: 'starter_active', activationDeadline (7 days from publish), public subdomain, logo: ''. | P0       |
| G-06 | **Publish creates correct user data**          | Verify user document after publish                                                                                             | User has: phone number linked, tenantId, storeId, stores array with role 'owner'.                                                                                                                                                                                                                                                                                                                                                                                                                                                           | P0       |
| G-07 | **Publish idempotency**                        | Session already in LIVE state, approve endpoint called again                                                                   | Returns conflict/no-op response. No duplicate tenant/store/project created.                                                                                                                                                                                                                                                                                                                                                                                                                                                            | P0       |
| G-08 | **Publish with OBP/QR surfaces unavailable**                  | Existing public/share surfaces disabled or unavailable                                                                                             | Store, project, project summary, and public menu URL still publish. OBP/QR setup does not block messaging publish.                                                                                                                                                                                                                                                                                                                                                                                                                                            | P1       |
| G-09 | **Publish fails → owner retries successfully** | Publish fails twice (Firestore timeout) → session returns to AWAITING_APPROVAL → owner re-opens preview → clicks Approve again | First attempt: PUBLISHING → fail → retry → fail → state returns to AWAITING_APPROVAL. Second attempt: PUBLISHING → success → LIVE. Only 1 store created. Preview and extraction data preserved across retry.                                                                                                                                                                                                                                                                                                                                | P0       |
| G-10 | **Extraction cap reached + continued uploads** | processingRuns=2 (both attempts resulted in low-quality preview) → owner sends 5 more photos                                   | New uploads stored but NO new extraction triggered. Reply: "To update your menu, please send all menu photos again in a new message." Session stays in current state. Owner must wait for session to expire (24h) then start fresh with new session.                                                                                                                                                                                                                                                                                        | P0       |

---

## H. WhatsApp Message Handling

| ID   | Scenario                                  | Steps                                                                | Expected Outcome                                                                                                                    | Priority |
| ---- | ----------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- |
| H-01 | **Owner sends "Hi" only (no menu)**       | Owner sends text "Hello" or "Hi" as first message                    | Reply: "Send menu photos or a menu PDF." No session created (session only starts on first valid media).                            | P0       |
| H-02 | **Owner sends text AFTER sending photos** | Owner sends images, then texts "is my menu ready?"                   | If preview ready: reply with preview link. If processing: no reply (silent processing). If collecting: no reply (waiting for more). | P0       |
| H-03 | **Owner sends "change price to 199"**     | Owner sends text command to edit menu via WhatsApp                   | If preview ready: "Your preview is ready: {link}." Otherwise: "Send menu photos." Never process text as edit command.              | P0       |
| H-04 | **Owner sends video**                     | Owner records and sends a video of their menu                        | Reply: "Send menu photos or a menu PDF." Video not stored.                                                                         | P0       |
| H-05 | **Owner sends voice note**                | Owner sends audio message describing their menu                      | Reply: "Send menu photos or a menu PDF." Audio not stored.                                                                         | P0       |
| H-06 | **Owner sends location pin**              | Owner shares their Google Maps location                              | Silently ignored. No reply. No session impact.                                                                                      | P1       |
| H-07 | **Owner sends contact card**              | Owner shares a contact from their phone                              | Silently ignored. No reply. No session impact.                                                                                      | P1       |
| H-08 | **Owner sends sticker/GIF**               | Owner sends WhatsApp sticker or GIF                                  | Silently ignored. No reply. No session impact.                                                                                      | P1       |
| H-09 | **Existing store owner messages**         | Owner whose phone is linked to existing live store sends any message | Reply: "Your menu is already live. Manage here: {dashboard link}." No session created.                                              | P0       |
| H-10 | **Post-publish message from same owner**  | Owner who just published sends another message                       | Reply: "Your menu is live! Manage it here: {dashboard link}" (INV-7). Tunnel permanently closed. Same reply every time.             | P0       |
| H-11 | **Duplicate webhook from provider**       | Provider sends same message ID twice (retry behavior)                | Inbound queue doc ID dedup skips the duplicate silently. No duplicate upload, session write, or reply.                             | P0       |

---

## I. Security & Abuse Prevention

| ID   | Scenario                                     | Steps                                                               | Expected Outcome                                                                                                                                                   | Priority |
| ---- | -------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| I-01 | **Rate limit: 3rd session same day**         | Same phone creates 2 sessions (both expired), tries 3rd             | 3rd session blocked. Reply: "Try again later." Phone enters 24h cooldown.                                                                                          | P0       |
| I-02 | **Rate limit: 6th session same week**        | Same phone creates 5 sessions in a week, tries 6th                  | Blocked. Reply: "Try again later."                                                                                                                                 | P0       |
| I-03 | **Invalid uploads exceed limit (3)**         | Same session: owner sends junk 3 times, each time told to send menu | After 3rd invalid attempt, session → EXPIRED. Reply: "Try again later." Cooldown applied.                                                                          | P0       |
| I-04 | **Corrections exceed limit (3)**             | Owner requests fix 3 times, all with new photos                     | 3rd fix request allowed. 4th fix attempt blocked. Reply: "Use your dashboard to edit after publishing." Owner must approve current or let session expire.          | P0       |
| I-05 | **Webhook signature invalid**                | POST request to webhook endpoint without valid X-Hub-Signature-256  | Request rejected with 403. Logged as security event. No processing.                                                                                                | P0       |
| I-06 | **Preview token tampering**                  | Someone modifies the token parameter in preview URL                 | Server validates token against session. Invalid token → 403 Forbidden. No data exposed.                                                                            | P0       |
| I-07 | **Forwarded preview link → approve attempt** | Non-owner opens forwarded link and clicks Approve                   | If valid token present: approval succeeds (INV-2, ADR-13 — token-only auth, owner’s delegation). If no/wrong token: 403 Forbidden.                                 | P0       |
| I-08 | **Bot spam: rapid messages**                 | Bot sends 50 messages per minute to WhatsApp number                 | Rate limit per phone. After limit exceeded: cooldown. Messages during cooldown silently ignored (after 1 reply).                                                   | P0       |
| I-09 | **Competitor uploads offensive content**     | Someone sends inappropriate/offensive images                        | Asset Intelligence flags as non-menu. Stored temporarily. Auto-deleted on session expiry. Never published. Preview never generated for non-menu content.           | P1       |
| I-10 | **Personal document accidentally uploaded**  | Owner sends government ID or bank statement by mistake              | Asset Intelligence: "invalid file" (not a menu). Reply: "Send menu photos or a menu PDF." File stored temporarily, auto-deleted on expiry. Never published.        | P1       |

---

## J. Cleanup & Lifecycle

| ID   | Scenario                                 | Steps                                                     | Expected Outcome                                                                                                                                        | Priority |
| ---- | ---------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| J-01 | **12h reminder sent**                    | Preview generated, owner doesn't respond for 12 hours     | Cleanup scheduler detects: state=PREVIEW_READY, reminderSentAt=null, age>12h. Sends reminder WhatsApp message with preview link. Sets `reminderSentAt`. | P0       |
| J-02 | **No double reminder**                   | Reminder already sent, 6 more hours pass without response | `reminderSentAt` is set. Scheduler skips. Only 1 reminder per session.                                                                                  | P0       |
| J-03 | **24h expiry cleanup**                   | Session expires after 24h                                 | Scheduler sets state → EXPIRED. No WhatsApp message sent (silent expiry, per ChatGPT design).                                                           | P0       |
| J-04 | **Storage cleanup for expired sessions** | Session expired 30 days ago                               | Daily cleanup scheduler: find sessions expired >30 days ago, delete session doc, delete all files from `messagingOnboarding/{sessionId}/` in Storage.   | P1       |
| J-05 | **Rate limit counter reset**             | New day/week starts                                       | `messagingOnboardingRateLimits` doc: `sessionsToday` reset at `dayResetAt`, `sessionsThisWeek` reset at `weekResetAt`.                                  | P0       |
| J-06 | **Published session NOT deleted**        | Session reached LIVE state                                | Published sessions kept for audit trail. NOT auto-deleted. Media can be cleaned after 30 days (menu data already in project doc).                       | P1       |

---

## K. Performance & Scale

| ID   | Scenario                        | Steps                                          | Expected Outcome                                                                                                                                                        | Priority |
| ---- | ------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| K-01 | **100 concurrent sessions**     | 100 different phones uploading simultaneously  | Each gets own session. Intake processor handles in batches. Extraction jobs queue in menuImageProcessingJobs. No session conflicts.                                     | P2       |
| K-02 | **Webhook response time (<5s)** | Meta sends webhook → measure response time     | Webhook handler responds 200 immediately. All processing (media download, session update) happens async after response. Must respond <5s or Meta marks delivery failed. | P0       |
| K-03 | **Preview page load time**      | Open preview URL → measure time to interactive | Page renders in <3s on 3G connection. Menu data loaded server-side. No client-side Firestore reads. Cacheable for repeated visits.                                      | P1       |
| K-04 | **Extraction processing time**  | Measure time from intake close → preview ready | Target: <90 seconds for 3-5 images. Includes: AI validation (~5s) + extraction (~15-30s per image) + preview generation (~2s).                                          | P1       |
| K-05 | **Cost per session under ₹25**  | Track total API costs for 100 onboardings      | Average cost per successful onboarding: <₹7. Per session (including failures): <₹15. Total monthly cost at 1000 sessions: <₹5000.                                       | P1       |

---

## L. Multi-Provider & Isolation

| ID   | Scenario                                   | Steps                                                                            | Expected Outcome                                                                                                                | Priority |
| ---- | ------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------- |
| L-01 | **Provider adapter resolves correctly**    | Send webhook to `/messagingOnboarding/whatsapp`                                  | WhatsAppAdapter loaded. Webhook parsed with WA-specific logic. NormalizedMessage created.                                       | P0       |
| L-02 | **Unknown provider rejected**              | Send webhook to `/messagingOnboarding/sms`                                       | 200 response (no processing). Logged as unknown provider. No session created.                                                   | P0       |
| L-03 | **Disabled provider rejected**             | Remove 'whatsapp' from `MESSAGING_ONBOARDING_PROVIDERS` → send WA webhook        | 200 response (no processing). Provider not in enabled list. No session created.                                                 | P0       |
| L-04 | **Master flag OFF → all webhooks ignored** | Set runtime env `ENABLE_MESSAGING_ONBOARDING=false` → send any webhook           | 200 response. Zero processing. Zero Firestore reads/writes. Zero cost.                                                          | P0       |
| L-05 | **Session stores provider field**          | Complete full onboarding via WhatsApp                                            | Session doc has `provider: 'whatsapp'`, `providerUserId: '+919876543210'`, `providerDisplayId: '+919876543210'`.                | P0       |
| L-06 | **Provider-agnostic session engine**       | Create session with `provider: 'whatsapp'` → verify state machine                | All state transitions work identically regardless of provider value. Session engine never reads `provider` for logic decisions. | P0       |
| L-07 | **Provider-agnostic preview page**         | Open preview URL for WhatsApp session vs hypothetical Telegram session           | Preview page renders identically. No provider-specific UI. Business info, menu, approve/fix — all the same.                     | P0       |
| L-08 | **Provider-agnostic publish pipeline**     | Publish from WhatsApp session vs hypothetical Telegram session                   | Same atomic transaction: tenant, store, user, project, project summary, public URL, and session LIVE finalization. Only outbound confirmation message uses provider adapter. | P0       |
| L-09 | **Rate limits per provider+user**          | Same phone creates session via WhatsApp (2/day) then via Telegram                | Separate rate limit docs: `hash(whatsapp:+91...)` and `hash(telegram:chatId)`. Independent limits.                              | P0       |
| L-10 | **Cleanup handles multiple providers**     | Sessions from WhatsApp and Telegram both expire                                  | Cleanup scheduler processes all expired sessions regardless of provider. Reminders sent via correct provider adapter.           | P0       |
| L-11 | **Zero existing code impact**              | Run full test suite with runtime env `ENABLE_MESSAGING_ONBOARDING=true`          | All existing tests pass. No regressions in dashboard onboarding, extraction, store creation, auth, billing.                     | P0       |
| L-12 | **Clean teardown: disable**                | Set runtime env `ENABLE_MESSAGING_ONBOARDING=false`                              | All webhooks return 200. Existing sessions expire in 24h. Published stores unaffected.                                          | P0       |
| L-13 | **Clean teardown: data cleanup**           | Delete `messagingOnboardingSessions` + `messagingOnboardingRateLimits` + Storage | All messaging onboarding data removed. Published stores/tenants/users remain. No orphaned references.                           | P0       |
| L-14 | **Clean teardown: code removal**           | Delete `messagingOnboarding/` dirs + remove exports from index.ts                | Dashboard builds and deploys successfully. All existing features work. Zero references to deleted code.                         | P0       |

---

## M. Publish Pipeline & Identity (NEW — Gap Analysis)

| ID   | Scenario                                         | Steps                                                                                  | Expected Outcome                                                                                                                                                                                             | Priority |
| ---- | ------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| M-01 | **Phone exists as user without store**           | User with existing user doc (from incomplete dashboard signup) but NO store sends menu | System checks stores for phone → NOT FOUND (no store). Normal onboarding proceeds. On publish: UPDATES existing user doc (adds tenantId, storeId, stores array) instead of creating new user.                | P0       |
| M-02 | **Placeholder email generation**                 | Owner with phone +919876543210 completes onboarding                                    | Tenant/store/user created with `email: '919876543210@msg.menulist.ai'`. Deterministic: same phone always generates same email. Format passes existing email validation.                                      | P0       |
| M-03 | **No subscription record at publish**            | Owner approves preview → publish completes                                             | Tenant, store, user, project created. NO subscription record in `subscriptions` collection. Owner gets free access to single store.                                                                          | P0       |
| M-04 | **Dashboard claim via WhatsApp phone**           | Owner clicks dashboard claim link from WhatsApp after publish                          | Dashboard login page offers WhatsApp number/passcode setup. After claim, owner can sign in with the WhatsApp number. Owner is linked to existing user doc by phone.                                            | P0       |
| M-05 | **storeKey generated correctly**                 | Business name "The Spice Garden" published                                             | Store doc has `storeKey: 'the_spice_garden_-_main_store'`. Generated from `storeName.toLowerCase().replaceAll(" ", "_")` per existing codebase pattern.                                                      | P0       |
| M-06 | **Tenant storesList populated**                  | Publish completes                                                                      | Tenant doc has `storesList: [{ storeId, name: '{business} - Main Store', isMaster: true }]`. Matches exact codebase pattern.                                                                                 | P0       |
| M-07 | **Full resend threshold (3+ images)**            | Preview ready → owner sends 3 new images                                               | `FULL_RESEND_THRESHOLD = 3` met. Session resets to COLLECTING_INPUT. Old extraction discarded. New intake window.                                                                                            | P0       |
| M-08 | **Partial send after preview (1-2 images)**      | Preview ready → owner sends 1 image                                                    | Below threshold. Reply: "Your preview is ready. Send full menu photos again to update." Preview NOT regenerated. Image NOT added to current extraction.                                                      | P0       |
| M-09 | **Extraction watcher fires on job completion**   | Extraction job for `msg-onboarding-{sessionId}` status changes to 'completed'          | `msgExtractionWatcher` onDocumentUpdated fires. Detects prefix `msg-onboarding-`. Extracts sessionId. Updates session with extracted data. Generates preview token. Sends preview link via provider adapter. | P0       |
| M-10 | **Extraction watcher ignores dashboard jobs**    | Extraction job for regular dashboard project completes                                 | `msgExtractionWatcher` fires but `projectId` doesn't start with `msg-onboarding-`. Returns immediately. No session update.                                                                                   | P0       |
| M-11 | **Intake processor concurrent run safety**       | Intake processor takes 3 min (slow). Next scheduled run starts at 2 min.               | Session state checked atomically via Firestore transaction before processing. If already VALIDATING_ASSETS, skip. No double-processing.                                                                      | P1       |
| M-12 | **Quality score below threshold**                | Extraction completes with quality score 15/100 (2 items, very partial)                 | Blank prevention gate checks items > 0. With 2 items: PASSES gate (not blank). Preview generated with warning note: "This menu looks incomplete." Quality score stored for analytics.                        | P1       |
| M-13 | **Preview token only generated at preview time** | Session in COLLECTING_INPUT state                                                      | `previewToken` is null. `previewUrl` is null. Token only generated when state transitions to PREVIEW_READY via extraction watcher.                                                                           | P0       |
| M-14 | **Concurrent existing-owner claim**             | Two publish transactions target the same phone-matched, unscoped legacy user           | Exactly one transaction assigns tenant/store and commits its tenant. The other re-reads assigned scope, returns owner-claim conflict, and leaves no tenant/store/project.                                      | P0       |
| M-15 | **Concurrent new phone identity claim**         | Two publish transactions target one phone with no existing user                        | Both derive the same canonical `phone_{digest}` user ID. Exactly one creates the user and tenant; the other rolls back without a second business.                                                             | P0       |
| M-16 | **Phone owner already scoped or mismatched**    | Publish finds a user whose phone differs or whose tenant/store/store mapping is present | Owner claim fails before tenant/store creation. Approve recovers the session to `AWAITING_APPROVAL` and returns 409 without retrying the non-retryable identity conflict.                                      | P0       |

---

## N. Internal Tracking / Observability (NEW — MOL-Inspired)

| ID   | Scenario                                                  | Steps                                                                        | Expected Outcome                                                                                                                                                                                   | Priority |
| ---- | --------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| N-01 | **Event logged for every state transition**               | Complete full onboarding flow (happy path)                                   | `messagingOnboardingEvents` collection has 15-20 events for this session. Each `SESSION_STATE_CHANGED` event has `metadata.fromState` and `metadata.toState`. All events have correct `sessionId`. | P0       |
| N-02 | **Tracking is fire-and-forget (non-blocking)**            | Simulate Firestore write failure in `logOnboardingEvent`                     | Main onboarding flow continues unaffected. Error logged to Cloud Functions logger. No user-facing impact. No retry.                                                                                | P0       |
| N-03 | **Tracking flag OFF → zero events written**               | Set runtime env `ENABLE_MESSAGING_ONBOARDING_TRACKING=false` → complete full onboarding | `messagingOnboardingEvents` collection has 0 new docs. Onboarding works normally. Zero tracking cost.                                                                                              | P0       |
| N-04 | **PII protection in events**                              | Check `userIdMasked` field in any event                                      | Only last 4 characters of `providerUserId` stored. Full ID never in event doc. Example: `'3210'` not `'+919876543210'`.                                                                            | P0       |
| N-05 | **Error events include code-only error details**          | Trigger `ASSET_VALIDATION_FAILED` or `PUBLISH_FAILED`                        | Event has `error` object with `code` and `retryable` only, plus optional `retryCount`. Code is machine-readable (e.g., `'GEMINI_API_ERROR'`). Raw provider/runtime messages are not stored.          | P0       |
| N-06 | **sessionAgeMs calculated correctly**                     | Check `PUBLISH_COMPLETED` event for a session that took 5 minutes            | `sessionAgeMs` is ~300000 (±10000ms). Calculated from `session.createdAt` to event `timestamp`.                                                                                                    | P0       |
| N-07 | **Funnel analysis query works**                           | Query events: `sessionId = X` ordered by `timestamp ASC`                     | Returns chronological event stream for the session. Can derive: time per stage, drop-off point, error patterns.                                                                                    | P1       |
| N-08 | **Provider comparison query works**                       | Query events: `provider = 'whatsapp'`, `eventType = 'PUBLISH_COMPLETED'`     | Returns all successful publishes for WhatsApp. Count gives conversion for this provider. Same query with `'telegram'` gives Telegram conversion.                                                   | P1       |
| N-09 | **Event cleanup: old events for expired sessions purged** | Session expired 400 days ago                                                 | Cleanup scheduler deletes events for this session (>365 days old). Events for LIVE sessions kept permanently.                                                                                      | P1       |
| N-10 | **Clean teardown includes events collection**             | Full teardown procedure executed                                             | `messagingOnboardingEvents` collection deleted along with sessions and rate limits. No orphaned tracking data.                                                                                     | P0       |

---

## Simulation Scenarios (End-to-End)

These are full user journey simulations from the ChatGPT conversation, translated into test scenarios.

### Simulation 1: Perfect User (Best Case)

```
T+0:00  Owner sends 6 menu photos
        → System: "Got it. Preparing your menu."
T+0:02  No more uploads. Fast-start (6 > 4, 90s gap) triggers.
        → State: VALIDATING_ASSETS
T+0:02  Gemini validates: 5 valid menu, 1 interior (ignored).
        Business name: "Spice Garden", phone found, address found.
        → State: PROCESSING_MENU
T+0:03  Extraction job created → processMenuImagesJobLogic runs
T+0:04  Extraction completes. 8 categories, 45 items. Quality: 78.
        Blank prevention gate: PASSES (45 items > 0).
        → State: PREVIEW_READY
T+0:04  WhatsApp: "Your menu preview is ready: {link}"
T+0:06  Owner opens preview. Sees complete menu. Business info pre-filled.
        → State: AWAITING_APPROVAL
T+0:07  Owner clicks "Approve & Publish"
        → State: PUBLISHING
T+0:08  Transaction completes: tenant, store, user, project, project summary, public URL, and session LIVE finalization.
        → State: LIVE
T+0:08  WhatsApp: "Your menu is live: spice-garden.menulist.ai
        Manage anytime: menulist.ai/login"

RESULT: ✅ Full onboarding in ~8 minutes (5 min perceived effort)
```

### Simulation 2: Messy Gallery User

```
T+0:00  Owner sends: selfie, restaurant exterior, logo, 2 menu photos
        → System: "Got it. Preparing your menu."
T+0:10  Inactivity → processing starts
        → State: VALIDATING_ASSETS
T+0:10  Gemini: 2 valid, 3 invalid. Completeness: "partial" (<50%)
        → State: AWAITING_MORE_UPLOADS
T+0:10  WhatsApp: "Send the full menu for best result."
T+0:12  Owner sends 4 more menu photos
        → State: COLLECTING_INPUT (re-entered)
T+0:14  Fast-start triggers (total valid: 6 files now)
        → State: VALIDATING_ASSETS
T+0:14  Gemini: 6 valid. Completeness: "likely_complete"
        → State: PROCESSING_MENU
T+0:16  Extraction completes → preview generated → normal flow

RESULT: ✅ System handled junk silently, guided owner, succeeded
```

### Simulation 3: Slow Sender

```
T+0:00  Owner sends 1 image
        → System: "Got it. Preparing your menu."
T+0:04  Owner sends 1 more image (resets timer)
T+0:08  Owner sends 1 more image (resets timer)
T+0:18  10 min inactivity → max wait trigger
        → State: VALIDATING_ASSETS
T+0:18  Gemini: 3 valid. Completeness: "partial"
        Decides: usable (≥60%) → proceed anyway
        → State: PROCESSING_MENU

RESULT: ✅ Timer correctly reset. No premature processing.
```

### Simulation 4: Wrong Menu, Corrects

```
T+0:00  Owner sends wrong restaurant's menu (forwarded photos)
T+0:03  Processing → preview generated
T+0:05  Owner opens preview, sees wrong restaurant
T+0:05  Owner sends 5 NEW photos of their own menu
        → System: "Your preview is ready. Send full menu photos again to update."
T+0:06  Owner sends all 5 photos (full resend detected: >3 images)
        → Session resets to COLLECTING_INPUT
        → Old extraction discarded
T+0:08  New fast-start → new validation → new extraction → new preview
T+0:10  Owner approves correct preview → publish succeeds

RESULT: ✅ Restart via full resend. Clean. No leftover data.
```

### Simulation 5: Spammy User

```
T+0:00  User sends random photos (memes, selfies)
        → System: "Got it. Preparing your menu."
T+0:10  Processing → AI validation: 0 valid menu files
        → invalidUploadAttempts = 1
        → System: "Send clearer menu photos or a menu PDF."
T+0:11  User sends more junk
T+0:21  Processing → AI validation: still 0 valid
        → invalidUploadAttempts = 2
        → System: "Send clearer menu photos or a menu PDF."
T+0:22  User sends more junk
T+0:32  Processing → AI validation: still 0 valid
        → invalidUploadAttempts = 3 → LIMIT REACHED
        → State: EXPIRED
        → Cooldown applied (24h)
        → System: "Try again later."
T+0:33  User sends more messages → silently ignored (cooldown active)

RESULT: ✅ Abuse contained. 3-strike limit. 24h cooldown.
```

### Simulation 6: Never Approves

```
T+0:00  Owner sends menu → preview generated
T+0:00  WhatsApp: "Your menu preview is ready: {link}"
T+12:00 Cleanup scheduler runs → detects PREVIEW_READY + age>12h
        → Sends reminder: "Your menu preview is ready: {link}"
        → Sets reminderSentAt
T+24:00 Cleanup scheduler runs → detects PREVIEW_READY + age>24h
        → State: EXPIRED (silent, no message)
        → Media queued for deletion
T+30d   Cleanup scheduler → deletes expired session + media from Storage

RESULT: ✅ Clean lifecycle. No zombie sessions. Silent expiry.
```

### Simulation 7: Existing Store Owner

```
T+0:00  Owner (phone linked to existing store) sends message
        → System checks: phone → store lookup → FOUND
        → Reply: "Your menu is already live. Manage here: {dashboard}"
        → No session created. No processing.

RESULT: ✅ No duplicate store. Clean redirect.
```

### Simulation 8: Post-Publish Message

```
T+0:00  Owner onboarded successfully → LIVE
T+1:00  Owner sends new message "change my price"
        → System detects: phone has LIVE session
        → Reply: "Use your dashboard to update your menu: {dashboard link}"
        → No new session. No processing.
T+2:00  Owner sends another message
        → Same reply. Every time. Forever.

RESULT: ✅ Hard boundary. WhatsApp tunnel permanently closed.
```

### Simulation 9: Uploads During Processing

```
T+0:00  Owner sends 3 images → fast-start triggers at T+0:02
        → State: PROCESSING_MENU
T+0:03  Owner sends 2 more images (while processing)
        → Images stored in uploads[]
        → pendingUploadsWhileProcessing = true
T+0:04  Processing completes
        → System detects pendingUploadsWhileProcessing = true
        → INSTEAD of generating preview, reset to VALIDATING_ASSETS
        → Re-validate ALL 5 images together
        → New extraction with full set
T+0:06  New preview generated with all 5 images

RESULT: ✅ No lost uploads. No partial menu. Clean restart.
```

---

## O. Firestore & Data Consistency Failures

| ID   | Scenario                                           | Steps                                                                               | Expected Outcome                                                                                                      | Priority |
| ---- | -------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------- |
| O-01 | **Firestore write succeeds but response lost**     | Tenant/store created in transaction, but response lost before session → LIVE update | Retry must not create duplicate tenant. Idempotency holds via session state check (already PUBLISHING → skip create). | P0       |
| O-02 | **Session doc deleted mid-flow**                   | Manually delete session doc while state = PROCESSING_MENU                           | Extraction watcher: session not found → log error, return. No orphan publish. No infinite retries.                    | P0       |
| O-03 | **Duplicate approve + network retry**              | Approve API called, client retries automatically, both requests hit server          | Only 1 tenant/store created. 2nd call returns "Already published" (session already LIVE/PUBLISHING).                  | P0       |
| O-04 | **Firestore partial outage (read ok, write fail)** | Session read succeeds, session update fails                                         | No stuck state. Error caught, safe message sent. No infinite retry loop. Session stays in pre-transition state.       | P0       |

---

## P. Extraction & AI Failure Cascade

| ID   | Scenario                                        | Steps                                                                              | Expected Outcome                                                                                                                 | Priority |
| ---- | ----------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------- |
| P-01 | **Validation success + extraction crash**       | Gemini validation passes, extraction job fails halfway (API error, timeout, crash) | Session → FAILED safely. Owner asked for clearer images. No stuck PROCESSING_MENU. processingRuns still incremented.             | P0       |
| P-02 | **Extraction returns corrupt structure**        | Gemini returns `categories: null`, `items: undefined`                              | Blank prevention gate catches null/undefined. Session → FAILED. Preview never generated. No crash.                               | P0       |
| P-03 | **Extraction extremely slow (5-8 min timeout)** | Extraction takes 5-8 minutes, exceeding normal ~90s window                         | No duplicate processing triggered by intake processor. No new session created. Job eventually completes or times out gracefully. | P0       |

---

## Q. Multi-Tab / Multi-Device Human Chaos

| ID   | Scenario                                       | Steps                                                                                             | Expected Outcome                                                                                                                      | Priority |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Q-01 | **Preview opened on 3 devices simultaneously** | Owner opens preview on phone + tablet + friend's phone. All 3 click "Approve & Publish".          | Only 1 publish succeeds (Firestore transaction). Other 2 see "Already published" or idempotent response. Only 1 tenant/store created. | P0       |
| Q-02 | **Approve + Fix clicked simultaneously**       | One device clicks Approve, other device clicks Request Fix at exact same time                     | One wins (Firestore transaction on session state). No corrupt session. Loser gets safe error or stale-state response.                 | P0       |
| Q-03 | **Preview opened before extraction finished**  | User opens cached preview link while session still in PROCESSING_MENU (link from earlier attempt) | Preview page shows loading/not-ready state. No crash. No partial data exposed.                                                        | P0       |

---

## R. WhatsApp Delivery Reality

| ID   | Scenario                              | Steps                                                                                    | Expected Outcome                                                                                                                          | Priority |
| ---- | ------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| R-01 | **Message delivery delay (5-10 min)** | Preview-ready message delayed by WhatsApp. User sends new images in the gap.             | System still safe. New uploads stored with `pendingUploadsWhileProcessing` or added to session. No double preview. No restart corruption. | P0       |
| R-02 | **WhatsApp send message failure**     | WhatsApp API returns error when sending reply (network issue, rate limit, token expired) | Session continues unblocked. Send failure logged but does not block state transitions. Non-blocking fire-and-forget pattern.              | P0       |
| R-03 | **Out-of-order webhook delivery**     | User sends images 1,2,3 but webhooks arrive as 3,1,2                                     | System stable. All images stored. Order irrelevant — extraction processes by content, not arrival sequence.                               | P0       |
| R-04 | **Provider redirects authenticated request** | Meta lookup, download, text-send, or interactive-send endpoint returns a redirect. | Adapter does not follow the redirect. The bearer token is not forwarded; the provider operation fails through the existing bounded failure path. | P0 |
| R-05 | **Provider stalls** | Meta lookup/send stalls past 15 seconds or media download stalls past 30 seconds. | Abort signal ends the request; the worker does not wait indefinitely and the existing retry/delivery state remains authoritative. | P0 |

---

## S. Extreme Abuse & Cost Attacks

| ID   | Scenario                                     | Steps                                                          | Expected Outcome                                                                                                                         | Priority |
| ---- | -------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| S-01 | **500-image attack across rotating numbers** | Bot rotates phone numbers, sends 500 images across 50 sessions | Each number rate-limited independently. Weekly cap (5/number) holds. Cost limits hold via processingRuns cap. No runaway Gemini calls.   | P0       |
| S-02 | **Same user start → expire loop (50x/day)**  | User tries: start → let expire → start → let expire, 50 times  | Daily cap (2/day) blocks after 2. Weekly cap (5/week) provides secondary guard. Cooldown applied. Max damage: 2 Gemini calls/day/number. | P0       |

---

## T. Session Edge Corruption & Recovery

| ID   | Scenario                                          | Steps                                                                  | Expected Outcome                                                                                                                  | Priority |
| ---- | ------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| T-01 | **Session stuck in PROCESSING_MENU**              | Manually set session to PROCESSING_MENU with no active extraction job  | Cleanup scheduler detects: PROCESSING_MENU + no job activity + age > threshold → session → FAILED. No permanent stuck state.      | P0       |
| T-02 | **Session stuck in PUBLISHING**                   | Crash during publish: session remains in PUBLISHING state indefinitely | Cleanup scheduler detects: PUBLISHING + age > 5 min → session → AWAITING_APPROVAL (safe recovery). No duplicate store on retry.   | P0       |
| T-03 | **AWAITING_APPROVAL with previewToken = null**    | Corrupt state: session in AWAITING_APPROVAL but previewToken is null   | Preview page: safe error "Preview unavailable." No crash. Owner can send new photos to trigger re-processing.                     | P0       |
| T-04 | **300 sessions batch simulation**                 | Run 300 onboarding sessions in rapid succession                        | All rate limits hold. No runaway costs. No zombie sessions. Avg cost < ₹15/session. Extraction count capped.                      | P1       |
| T-05 | **Memory leak / orphan check after 100 sessions** | Run 100 sessions to various terminal states, then audit                | Zero zombie sessions (non-terminal, stale). Zero orphan jobs. Zero leftover uploads for expired sessions. Collections consistent. | P0       |

---

## U. Production Hardening & Cost Guardrails

| ID   | Scenario                                      | Steps                                                                                  | Expected Outcome                                                                                                                                           | Priority |
| ---- | --------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| U-01 | **Duplicate provider message delivery**       | Send the same provider message ID twice, including one retry after webhook ACK         | Only one `messagingOnboardingInboundMessages/{messageId}` document is created by atomic create. Second delivery is acknowledged and skipped. No duplicate upload/session/publish side effect. | P0       |
| U-02 | **Webhook processing interrupted after ACK**  | Enqueue inbound message, stop processing before `PROCESSED`, then run intake processor | Scheduler drains PENDING message and processes it. Failed attempts back off up to max attempts.                                                             | P0       |
| U-03 | **Approve retry after successful publish**    | Force client retry after session is already `LIVE` with `publishedResult`              | Approve route returns success with existing `publishedResult`. No second tenant/store/user/project is created.                                              | P0       |
| U-04 | **Runtime feature flag disabled**             | Set `ENABLE_MESSAGING_ONBOARDING=false`, send provider webhook                         | Webhook returns 200 and does not enqueue/process. No session, queue, extraction, or provider reply work happens.                                            | P0       |
| U-05 | **Oversized file size precheck**              | Send media metadata with `fileSize > MAX_FILE_SIZE_BYTES`                              | File is rejected before provider media download. `UPLOAD_REJECTED` is logged with precheck metadata.                                                       | P0       |
| U-06 | **Hourly health/cost snapshot**               | Run intake processor after health interval                                             | `systemHealth/messaging_onboarding_{hour}` contains publish-rate, failure, cost, and source-retention metrics; alerts are created only when thresholds hit. | P0       |
| U-06A | **Hourly snapshot retry/schema cleanup** | Seed an unknown field in the deterministic current-hour snapshot, then recompute | The complete snapshot exact-replaces the document and removes stale/unknown fields while the mutable control document retains its partial-update semantics. | P1 |
| U-06B | **Independent threshold alert failure** | Make the first of several threshold alert writes fail | Every later alert is still attempted; one bounded `MESSAGING_HEALTH_ALERT_EMIT_FAILED` diagnostic identifies the failed alert, and the committed health snapshot is not reported as failed. | P1 |
| U-07 | **Published source retention visibility**     | Publish sessions with retained source uploads, then run health monitor                 | LIVE-session media remains available for project source preview; health snapshot reports sampled retained bytes and warns before deletion is considered.     | P1       |
| U-08 | **Batched provider webhook** | One signed webhook contains multiple entries, changes, and messages | Every valid message is normalized in source order and bulk-created before ACK. Partial persistence returns 500; retry creates only missing rows. | P0 |
| U-09 | **Reply delivery fails after state mutation** | Session handling succeeds, but the provider send fails | Queue checkpoints the fixed reply before delivery. Retry sends that reply without rerunning the session mutation. | P0 |
| U-10 | **Upload arrives during asset validation** | Media is appended while the model evaluates the prior upload set | Stale validation is discarded. Session atomically returns to `AWAITING_MORE_UPLOADS` with the current upload set. | P0 |
| U-11 | **Concurrent first uploads** | Multiple first media messages race for one provider user | Exactly one active session wins. Session creation, rate counters, and `activeSessionId` commit together. | P0 |
| U-12 | **Concurrent upload cap** | Multiple appends race near 15 files | Transactional append stores at most 15 distinct uploads; duplicate/rejected Storage files are cleaned. | P0 |
| U-13 | **Stored upload integrity before model use** | Persist a wrong bucket/path, MIME extension, byte length, signature, or SHA-256 and run Asset Intelligence | Record or bytes are rejected before Gemini. The server reads only the exact Admin Storage path and does not fetch the persisted public URL. | P0 |
| U-14 | **Gemini inline request ceiling** | Validate files whose base64-expanded request estimate exceeds 18 MiB | Files use bounded Gemini Files API uploads instead of an oversized inline request. Known provider files and local temp files are cleaned on success and partial failure. | P0 |
| U-15 | **Re-upload after failed extraction** | Leave a `FAILED` session with a bound failed job, then upload a valid replacement | Append, stale extraction/preview reset, job unbinding, timer reset, and `FAILED` → `COLLECTING_INPUT` commit atomically. A crash cannot leave an appended file in `FAILED`. | P0 |
| U-16 | **Invalid upload abuse in every active media state** | Send invalid bytes in collecting, processing, and post-preview states; reach the third rejection | Every rejection increments the same transactional counter. The third rejection atomically writes session `COOLDOWN` plus the per-user 24-hour cooldown and later messages cannot bypass it through the active session. | P0 |
| U-17 | **Full resend isolates the replacement cycle** | Start from a preview with old uploads, append three replacement uploads, and trigger restart | The session retains only the three post-preview uploads, clears stale extraction and outbound-delivery state, and does not send the old menu through the next validation/extraction cycle. | P0 |
| U-18 | **Crash after handler mutation but before queue checkpoint** | Persist the initial-session or invalid-upload mutation, leave the inbound row without `handlerCompletedAt`, then replay it | The deterministic original reply is checkpointed and sent; the session/upload/invalid-attempt mutation is not repeated. | P0 |
| U-19 | **Poison, expired, and stale outbound delivery claims** | Exhaust five claims, claim an expired preview/fix row, and attempt completion with an older lease token | Poison/expired rows are discarded and stop matching the pending query; a stale token cannot clear a newer claim; the next healthy pending row remains reachable. | P0 |
| U-20 | **Hard expiry races active runtime work** | Let a non-terminal session cross `expiresAt` immediately before active lookup, upload/rejection commit, intake claim, validation commit/enqueue, or extraction finalization | The authoritative transaction records `EXPIRED` (and `FAILED` first for interrupted validation/processing), clears pending delivery/job state, and prevents another upload, model/job run, preview, or provider recovery message before the daily cleanup sweep. | P0 |
| U-21 | **Full resend from a 15-source preview and old-preview publish cleanup** | Start with 15 authoritative source files, stage three replacements, then separately publish an old preview with two staged replacements | All three replacement files remain admissible and become the only next extraction input. Publishing retains only authoritative project sources, moves staged paths to the durable cleanup queue, deletes them idempotently, and clears the queue without deleting authoritative files. | P0 |
| U-22 | **Malformed upload-cleanup row cannot poison the retry batch** | Persist a cleanup selector with a cross-session or otherwise invalid raw Storage path, then run the cleanup worker | The worker deletes no unvalidated path, retains the raw pointer for investigation or later safe recovery, transactionally clears only the retry selector, and leaves later valid rows reachable by the bounded daily query. | P0 |
| U-23 | **Cleanup completion infrastructure fails after core mutation commit** | Commit full resend/publish/fix cleanup pointers, then fail the cleanup completion transaction | The cleanup worker returns a retryable failure without escaping into the already-committed owner flow; pointers and selector remain durable for the scheduler. | P0 |
| U-24 | **Concurrent orphan cleanup accounting** | Let two cleanup workers read and delete the same two queued paths before either completion transaction commits | Both workers converge on an empty queue, while the aggregate drained count records each removed queue pointer exactly once. | P0 |
| U-25 | **Terminal cooldown retention cleanup** | Leave a valid `COOLDOWN` session beyond the 48-hour cleanup safety threshold | The scheduler deletes its validated session-owned uploads and session document without reopening or transitioning the terminal cooldown state. | P0 |
| U-26 | **Invalid terminal row cannot recycle through retention cleanup** | Leave an expired terminal document with a forged embedded session ID beyond the retention threshold | The scheduler never follows its unvalidated Storage or target identifiers, precondition-deletes only the queried document, emits a bounded orphan warning, and leaves the other session untouched. | P0 |
| U-27 | **Hourly health control read window and outbound retry metrics** | Run enabled intake inside/outside the first four UTC minutes, then succeed and fail preview/confirmation/fix delivery | Outside the window there is no health-control read. Inside it the existing lease allows at most one snapshot. Successful sends increment scheduler activity; query/provider failures increment the returned error count. | P1 |

---

## QA Matrix Summary

| Category                           | P0 Tests | P1 Tests | P2 Tests | Total   |
| ---------------------------------- | -------- | -------- | -------- | ------- |
| A. Happy Path                      | 5        | 0        | 0        | 5       |
| B. Input & Media                   | 7        | 5        | 4        | 16      |
| C. State Machine & Session         | 10       | 2        | 1        | 13      |
| D. Asset Intelligence              | 7        | 0        | 1        | 8       |
| E. Menu Extraction                 | 1        | 6        | 2        | 9       |
| F. Preview Page                    | 7        | 1        | 1        | 9       |
| G. Publish Pipeline                | 8        | 2        | 0        | 10      |
| H. WhatsApp Messages               | 7        | 4        | 0        | 11      |
| I. Security & Abuse                | 8        | 2        | 0        | 10      |
| J. Cleanup & Lifecycle             | 4        | 2        | 0        | 6       |
| K. Performance & Scale             | 1        | 3        | 1        | 5       |
| L. Multi-Provider & Isolation      | 14       | 0        | 0        | 14      |
| M. Publish & Identity              | 11       | 2        | 0        | 13      |
| N. Internal Tracking               | 7        | 3        | 0        | 10      |
| O. Firestore & Data Consistency    | 4        | 0        | 0        | 4       |
| P. Extraction & AI Failure Cascade | 3        | 0        | 0        | 3       |
| Q. Multi-Tab / Multi-Device Chaos  | 3        | 0        | 0        | 3       |
| R. WhatsApp Delivery Reality       | 5        | 0        | 0        | 5       |
| S. Extreme Abuse & Cost Attacks    | 2        | 0        | 0        | 2       |
| T. Session Edge Corruption         | 4        | 1        | 0        | 5       |
| U. Production Hardening            | 25       | 1        | 0        | 26      |
| **Total**                          | **143**  | **34**   | **10**   | **187** |

---

## Pre-Launch Checklist (Run All P0 Tests)

Before any real users touch this system:

- [ ] A-01 through A-05: All happy paths work
- [ ] B-01, B-05, B-07: Critical input handling
- [ ] C-01 through C-06, C-10, C-12, C-13: State machine correctness
- [ ] D-01 through D-06, D-08: Asset Intelligence accuracy
- [ ] E-09: Blank prevention gate works
- [ ] F-01 through F-09: Preview page fully functional
- [ ] G-01, G-02, G-04, G-07, G-09, G-10: Publish pipeline atomicity + validation + failure recovery
- [ ] H-01 through H-05, H-09 through H-11: Message handling
- [ ] I-01 through I-08: Security controls
- [ ] J-01, J-03, J-05: Lifecycle management
- [ ] K-02: Webhook response time <5s
- [ ] L-01 through L-14: Multi-provider isolation + clean teardown
- [ ] M-01 through M-10, M-13: Publish pipeline, identity, extraction watcher
- [ ] N-01 through N-06, N-10: Internal tracking, fire-and-forget, PII protection

- [ ] O-01 through O-04: Firestore & data consistency under failure
- [ ] P-01 through P-03: Extraction & AI failure cascade
- [ ] Q-01 through Q-03: Multi-tab / multi-device chaos
- [ ] R-01 through R-05: WhatsApp delivery reality
- [ ] S-01, S-02: Extreme abuse & cost attacks
- [ ] T-01 through T-03, T-05: Session edge corruption & recovery
- [ ] U-01 through U-06 and U-08 through U-26: Production hardening, queue, concurrency, delivery leases, replacement staging/cleanup convergence, terminal cooldown retention and poison-row retirement, hard-expiry enforcement, snapshot, model-input, storage-integrity, state-recovery, and cost guardrails

**Total P0 tests: 143. ALL must pass before controlled testing.**

---

_Document Status: Implementation-Complete (v5.0 — 187 total test cases (143 P0). July 16 provider-network hardening adds redirect refusal and bounded abort regressions for every authenticated WhatsApp lookup, download, and send path.)_
