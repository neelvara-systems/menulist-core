# Messaging Onboarding — Product Specification

**Feature:** Messaging Onboarding — Zero-Friction SMB Acquisition Engine
**Status:** Source-implemented, provider-disabled — not a current launch or deploy certification
**Last Updated:** July 10, 2026
**Source:** ChatGPT Brainstorm (Feb 16, 2026) + Cascade Architecture Validation + Deep Codebase Cross-Check (Feb 17) + Review #5 Final Spec Walkthrough + Review #6 Blocks/Stress-Test Cross-Check + Runtime Code Audit (May 17, 2026)

> **Launch boundary:** Not current launch certification or deploy approval. Current source registers WhatsApp only, while checked-in Functions environments keep provider processing disabled. `/whatsapp` is informational and routes its actions to the signed-in `/create-menu` photo or public-link intake. Production use still requires current audit/runbook/local aggregate evidence, a final owned provider account, real Meta secrets, webhook registration, explicit target enablement and scoped deploy evidence, provider smoke, browser/device QA, and production-host smoke.

---

## Executive Summary

Messaging Onboarding is MenuList's primary global acquisition engine. It allows an SMB owner to go from **no digital presence** to a **fully live MenuList presence** in minutes of perceived effort through the active WhatsApp Cloud API path when the Cloud Function flag, real Meta credentials, and webhook registration are enabled for the target environment.

The owner sends menu photos or a PDF via their messaging app. The system automatically extracts the menu, generates a preview, and on approval publishes a live MenuList presence: store, menu project, public menu URL, and claimable dashboard account. Official Business Page and QR surfaces use the existing store/public-link infrastructure after publish; they are not separately generated inside the approval transaction.

The messaging channel is the **intake pipe only**. After publish, all management happens in the MenuList dashboard. The messaging tunnel is permanently closed — never used for editing, support, or ongoing communication.

> **Provider Boundary:** The core is provider-agnostic, but current source registers WhatsApp only. Telegram, LINE, Viber, or any other provider require a separate adapter, secrets, webhook registration, docs, cost review, deploy evidence, and provider smoke before they are runtime behavior. See `_impl.md §2` for the `IMessagingProvider` interface.

### What It Does

- Receives menu images/PDFs via WhatsApp
- Validates uploads (filters junk, identifies actual menu pages)
- Extracts business info (name, phone, address) from menu images
- Structures menu using existing Gemini AI extraction pipeline
- Generates a preview page for owner review
- On approval, atomically creates: tenant, store, project, project summary, user account, and public URL routing
- Sends live link + dashboard login via WhatsApp
- Permanently closes WhatsApp tunnel

### What It Does NOT Do

- ❌ Does not allow menu editing via WhatsApp
- ❌ Does not provide ongoing support via WhatsApp
- ❌ Does not send marketing messages
- ❌ Does not handle multi-outlet onboarding (one outlet per session)
- ❌ Does not process link imports (v1 — images/PDF only)
- ❌ Does not require payment before publish (free publish, billing later)
- ❌ Does not use manual human review (automation-only)

---

## Goals & Success Metrics

| Goal                         | Success Metric                                          |
| ---------------------------- | ------------------------------------------------------- |
| **Zero-friction onboarding** | Owner effort ≤ 5 actions (send menu → approve → live)   |
| **Fast activation**          | Median publish path feels short and predictable          |
| **High completion rate**     | ≥ 60% of sessions reach successful publish              |
| **Low fix loop count**       | Average corrections before publish < 2                  |
| **Fully automated**          | 0% manual intervention rate                             |
| **Cost efficient**           | < ₹25 per successful onboarding (Gemini + WhatsApp API) |

---

## Target Customers (ICP)

**Primary:** SMB owner/manager who:

- Has menu images or PDF on their phone
- Wants a digital presence today
- Doesn't want to learn dashboard software
- Trusts WhatsApp more than websites
- Located in India (launch market), expandable globally

**Business types:** Restaurants, cafes, salons, spas, bakeries, service providers — any business with a service/product list.

**NOT for:** Existing MenuList users (redirected to dashboard), agencies, bulk onboarders.

---

## Scope

### In Scope (P0)

| ID   | Requirement                                                           | Priority |
| ---- | --------------------------------------------------------------------- | -------- |
| S-01 | Receive images via WhatsApp                                           | P0       |
| S-02 | Receive PDF via WhatsApp                                              | P0       |
| S-03 | Asset Intelligence Layer (validate menu files, extract business info) | P0       |
| S-04 | Menu extraction using existing Gemini pipeline                        | P0       |
| S-05 | Preview page with approve/request-fix actions                         | P0       |
| S-06 | Atomic publish (tenant + store + project + project summary + user + session finalization) | P0       |
| S-07 | WhatsApp confirmation with live link + dashboard login                | P0       |
| S-08 | Session state machine with expiry                                     | P0       |
| S-09 | Rate limiting and abuse prevention                                    | P0       |
| S-10 | Existing store detection (redirect to dashboard)                      | P0       |
| S-11 | Cleanup scheduler for expired sessions                                | P0       |

### Out of Scope (Permanent)

| Feature                     | Reason                                            |
| --------------------------- | ------------------------------------------------- |
| Menu editing via WhatsApp   | Destroys product discipline, creates agency model |
| Support chat via WhatsApp   | Not a support channel                             |
| Marketing messages          | Not a marketing tool                              |
| Multi-outlet in one session | Complexity explosion                              |
| Voice note processing       | Unreliable, not needed                            |
| Excel/spreadsheet import    | Different pipeline, low demand                    |
| Payment before publish      | Kills conversion                                  |
| Human review/correction     | Automation-only design                            |

### Conditional Candidate Scope (Not Current Runtime)

| Feature                                    | When                                                       |
| ------------------------------------------ | ---------------------------------------------------------- |
| Link import (URL → menu extraction)        | Separate implementation and validation required            |
| WhatsApp Flows for structured fix requests | Separate provider/product review required                  |
| Multi-language auto-detection              | Already supported by extraction pipeline                   |
| Basic content moderation (offensive text)  | Separate rule set and public-output review required        |
| Auto-rotate detection for sideways PDFs    | Gemini handles orientation implicitly                      |
| Additional providers such as Telegram or LINE | Separate adapter, secrets, webhook registration, deploy evidence, and provider smoke required |

---

## Multi-Provider Architecture

### Design Principle

The messaging onboarding system is built on a **provider-agnostic core**. The choice of messaging platform (WhatsApp, Telegram, LINE, Viber, etc.) only affects three thin adapter layers:

1. **Inbound Webhook** — Parsing the incoming message format (provider-specific payload)
2. **Media Download** — Downloading uploaded files from provider API (provider-specific auth + endpoints)
3. **Outbound Messaging** — Sending replies via provider API (provider-specific message format)

Everything else is shared and provider-independent:

| Component             | Provider-Specific? | Notes                                                     |
| --------------------- | ------------------ | --------------------------------------------------------- |
| Session state machine | ❌ No              | Same states, transitions, timers regardless of provider   |
| Asset Intelligence    | ❌ No              | Validates images/PDFs — doesn't care where they came from |
| Extraction pipeline   | ❌ No              | Reuses existing `processMenuImagesJobLogic`               |
| Preview page          | ❌ No              | Same UI, same approve/fix flow                            |
| Publish pipeline      | ❌ No              | Same atomic store creation                                |
| Cleanup scheduler     | ❌ No              | Same expiry, reminder, storage cleanup logic              |
| Rate limiting         | ❌ No              | Per-user limits (user ID normalized per provider)         |
| Webhook handler       | ✅ Yes             | Different payload format per provider                     |
| Media downloader      | ✅ Yes             | Different API per provider                                |
| Message sender        | ✅ Yes             | Different API per provider                                |
| Webhook verification  | ✅ Yes             | Different signature scheme per provider                   |

### Adding a New Provider

To add a new messaging provider, the following changes are required:

1. **Implement `IMessagingProvider` adapter** — ~200 lines of provider-specific code
2. **Add provider webhook endpoint** — New Cloud Function route
3. **Add provider environment variables** — API keys/tokens
4. **Add provider to enabled list** only after code, secrets, docs, deployment evidence, and provider smoke are complete

**Current source truth:** `functions/src/messagingOnboarding/providers/providerRegistry.ts` registers only `whatsapp`. Additional providers are reserved extension candidates, not active code.

### Provider Inventory

| Provider                      | Status      | Notes                                    |
| ----------------------------- | ----------- | ---------------------------------------- |
| **WhatsApp** (Meta Cloud API) | Active source adapter; Functions processing defaults off in checked-in env templates | Requires real Meta credentials and webhook registration before runtime smoke |
| **Telegram** (Bot API)        | Reserved candidate | No active adapter registered             |
| **LINE**                      | Reserved candidate | No active adapter registered             |
| **Viber**                     | Reserved candidate | No active adapter registered             |

### Provider Selection Strategy (Global Expansion)

When expanding to a new country:

1. **Market penetration** — Which app has >60% penetration in the target country?
2. **API capabilities** — Does the provider support: webhooks, media download, outbound messaging?
3. **Cost** — Per-message costs? (Telegram is free, WhatsApp charges per conversation)
4. **Business account requirements** — Verification/approval timeline?

---

## User Stories & Flows

### Story 1: Restaurant Owner Onboards via WhatsApp

> "As a restaurant owner, I want to send my menu photos on WhatsApp and get a live digital menu link without signing up for any software."

**Flow:**

```
1. Owner sends 4 menu photos to MenuList WhatsApp number
   → System: "Got it. Preparing your menu."

2. System waits for more uploads (10 min window)
   → No more uploads after 90 seconds with 4+ images
   → Fast-start triggers processing

3. Asset Intelligence Layer validates files
   → 3 valid menu pages, 1 restaurant interior (ignored)
   → Business name "Spice Garden" detected from menu header
   → Phone "+91 98xxxx" detected from menu footer

4. Extraction pipeline processes 3 valid files
   → 8 categories, 45 items extracted
   → Quality score: 78/100

5. Preview generated and link sent
   → System: "Your menu preview is ready: [link]"

6. Owner opens preview
   → Sees menu with all items
   → Business name "Spice Garden" pre-filled (editable)
   → Phone pre-filled (editable)
   → Clicks "Approve & Publish"

7. System creates everything atomically
   → Tenant, store, project, project summary, public URL, user account

8. System sends final message
   → "Your menu is live: spice-garden.menulist.online"
   → "Manage anytime: menulist.ai/login"

9. WhatsApp tunnel closed permanently
```

### Story 2: Owner Sends Blurry Photos

> "As an owner with bad phone camera, I want clear guidance when my photos can't be read."

**Flow:**

```
1. Owner sends 2 blurry photos
   → System: "Got it. Preparing your menu."

2. Asset Intelligence Layer finds no valid menu content
   → System: "Send clearer menu photos or a menu PDF."

3. Owner sends 3 clearer photos
   → Processing succeeds
   → Normal flow continues
```

### Story 3: Existing MenuList User Messages

> "As an existing user, I should be redirected to my dashboard."

**Flow:**

```
1. User sends message from phone linked to existing store
   → System: "Your menu is already live. Manage here: [dashboard link]"
   → No session created
```

### Story 3B: Phone Exists as User But Without Store

> "As a user who created a dashboard account but never completed onboarding, I should be able to use messaging onboarding."

**Flow:**

```
1. User sends message from phone linked to existing user doc (but NO store)
   → System: Treat as new onboarding session (no store = no redirect)
   → Normal flow continues
   → On publish: link new tenant/store to EXISTING user doc (update, not create)
```

> **Edge case:** The phone may exist in the `users` collection from a previous incomplete dashboard signup. The existing store detection checks for a store linked to the phone, not just a user doc. No store = proceed with onboarding. On publish, the existing user doc is updated (not a new user created).

### Story 4: Owner Disappears After Preview

> "As a system, I should clean up abandoned sessions."

**Flow:**

```
1. Preview sent, owner doesn't respond
2. After ~12 hours: reminder sent
   → "Your menu preview is ready: [link]"
3. After 24 hours: session expires
   → All uploaded media cleaned up
   → No store created
```

### Story 5: Owner Requests Fix

> "As an owner who sees wrong prices in preview, I want to request a correction."

**Flow:**

```
1. Owner opens preview, sees incorrect prices
2. Clicks "Request Fix"
3. Sees structured form (checkboxes):
   - ☑ Price incorrect
   - ☐ Item missing
   - ☐ Spelling error
   - ☐ Wrong category
   - Optional note (max 200 chars)
4. Submits fix request
5. System re-processes or asks for new photos
   → "Send updated menu photos for best results."
6. Owner sends new photos → new extraction → new preview
```

---

## State Machine

### Session Creation Trigger

**A session starts ONLY when the first valid media (image or PDF) is received.**

The following do NOT create a session:

| Input Type                            | System Behavior                                   |
| ------------------------------------- | ------------------------------------------------- |
| Text message ("hi", "hello", "start") | Ignored — no session created                      |
| Emoji / sticker                       | Ignored — no session created                      |
| Voice note / video                    | Ignored — reply: "Send menu photos or PDF"        |
| Contact card / location               | Ignored — no session created                      |
| First valid image or PDF              | **Session created** → state: `COLLECTING_INPUT`   |

This prevents junk sessions from casual messages and ensures every session has at least one usable upload from the start.

### Session States

| State                   | Description                                  | Next States                                                           |
| ----------------------- | -------------------------------------------- | --------------------------------------------------------------------- |
| `COLLECTING_INPUT`      | Accepting uploads, intake window active      | `VALIDATING_ASSETS`, `EXPIRED`, `COOLDOWN`                                        |
| `VALIDATING_ASSETS`     | AI checking which files are valid menu pages | `PROCESSING_MENU`, `AWAITING_MORE_UPLOADS`, `FAILED`, `COOLDOWN`                  |
| `AWAITING_MORE_UPLOADS` | Menu too partial, accepting more uploads     | `VALIDATING_ASSETS`, `EXPIRED`, `COOLDOWN`                                        |
| `PROCESSING_MENU`       | Extraction pipeline running                  | `PREVIEW_READY`, `FAILED`, `COOLDOWN`                                             |
| `PREVIEW_READY`         | Preview generated, link sent                 | `AWAITING_APPROVAL`, `COLLECTING_INPUT` (full resend), `EXPIRED`, `COOLDOWN`      |
| `AWAITING_APPROVAL`     | Owner viewing preview                        | `PUBLISHING`, `COLLECTING_INPUT` (restart via full resend), `EXPIRED`, `COOLDOWN` |
| `PUBLISHING`            | Atomic publish in progress                   | `LIVE`, `AWAITING_APPROVAL` (on failure after retry), `FAILED`        |
| `LIVE`                  | Published successfully, tunnel closed        | Terminal                                                              |
| `FAILED`                | Processing failed, asked for reupload        | `COLLECTING_INPUT`, `EXPIRED`, `COOLDOWN`                                         |
| `EXPIRED`               | Session timed out (24h inactivity)           | Terminal                                                              |
| `COOLDOWN`              | Phone exceeded attempt limits                | Terminal (24h)                                                        |

### Forbidden State Transitions (Safety Guard)

These transitions MUST NEVER occur. If detected, log as a system error and do not execute:

| Forbidden Transition                                                        | Why                                                                                                       |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `COLLECTING_INPUT` → `LIVE`                                                 | Cannot skip validation, extraction, preview, and publish                                                  |
| `PROCESSING_MENU` → `COLLECTING_INPUT` (without explicit full-resend reset) | Processing must complete or fail before restart                                                           |
| `LIVE` → any onboarding state                                               | Terminal state — tunnel permanently closed                                                                |
| `EXPIRED` → `PROCESSING_MENU` (without new session)                         | Expired sessions cannot be revived — must start fresh                                                     |
| `COOLDOWN` → `PROCESSING_MENU`                                              | Cooldown must expire before any new activity                                                              |
| `PUBLISHING` → `COLLECTING_INPUT`                                           | Publish failure must not lose extraction data — recovery only to `AWAITING_APPROVAL` or terminal `FAILED` |

Enforce strictly in the state machine transition function. Any transition not explicitly listed in the Session States table above is forbidden by default.

The third invalid upload atomically moves the active session to `COOLDOWN` and writes the per-user cooldown timestamp. A valid re-upload from `FAILED` atomically appends the source, clears stale validation/extraction/preview output, clears the bound failed job, and reopens `COLLECTING_INPUT`; it is never split across two writes.

### State Transition Diagram

```
                    ┌─────────────────┐
                    │ COLLECTING_INPUT │◄────────────────────┐
                    └────────┬────────┘                      │
                             │ intake closes                 │ restart
                             ▼                               │ (full resend)
                    ┌─────────────────────┐                  │
                    │ VALIDATING_ASSETS   │                  │
                    └────────┬────────────┘                  │
                     ┌───────┼───────┐                       │
                     ▼       ▼       ▼                       │
              ┌──────────┐ ┌───────────────────┐ ┌────────┐ │
              │ FAILED   │ │AWAITING_MORE_UPLOADS│ │PROCESS │ │
              └────┬─────┘ └─────────┬─────────┘ │_MENU   │ │
                   │ reupload        │ more files └───┬────┘ │
                   └─────────────────┘                │      │
                                                      ▼      │
                                              ┌──────────────┐│
                                              │PREVIEW_READY ││
                                              └──────┬───────┘│
                                                     ▼        │
                                              ┌──────────────┐│
                                              │AWAITING_     ││◄──────┐
                                              │APPROVAL      │┘       │
                                              └──────┬───────┘        │
                                                     ▼                │ publish
                                              ┌──────────────┐        │ failure
                                              │ PUBLISHING   │────────┘ (recovery)
                                              └──────┬───────┘
                                                     ▼
                                              ┌──────────────┐
                                              │    LIVE      │
                                              └──────────────┘
```

---

## Smart Intake Logic

### When Processing Starts

Processing is triggered automatically when ANY of these conditions are met:

| Condition          | Rule                                               | Rationale                      |
| ------------------ | -------------------------------------------------- | ------------------------------ |
| **Fast Start**     | ≥ 4 valid uploads AND no new upload for 90 seconds | Most menus are 3-6 pages       |
| **PDF Fast Start** | PDF received AND no new upload for 60 seconds      | PDF usually contains full menu |
| **Max Wait**       | 10 minutes since last upload with no new activity  | Catch-all fallback             |

### Intake Processor Timing

The intake processor runs every 2 minutes via `onSchedule`. This means there's a **0-2 minute delay** between when an intake condition is met and when processing actually starts.

| Scenario                | Condition Met At | Processor Checks At | Actual Delay |
| ----------------------- | ---------------- | ------------------- | ------------ |
| Fast-start (best case)  | T+1:30           | T+2:00              | 30 seconds   |
| Fast-start (worst case) | T+1:30           | T+4:00              | 2.5 minutes  |
| Max wait (best case)    | T+10:00          | T+10:00             | 0 seconds    |
| Max wait (worst case)   | T+10:00          | T+12:00             | 2 minutes    |

**Owner perception:** Total time from last photo to preview = intake delay + AI validation (~5s) + extraction (~30-60s) + preview generation (~2s). Typical: **2-5 minutes**. This is acceptable — the owner expects to wait ("preparing your menu").

### AWAITING_MORE_UPLOADS Behavior

When the system asks for more uploads (partial menu detected), the session enters `AWAITING_MORE_UPLOADS`. In this state:

- **New media uploads** are accepted and stored (same as `COLLECTING_INPUT`)
- Each new upload **resets the intake timer** (`intakeExpiresAt = now + 10 min`)
- When intake timer expires again → transition to `VALIDATING_ASSETS` with ALL uploads (old + new)
- **Text messages** receive no reply (system already asked for more photos)
- **Session expiry** still applies (24h from creation)

This state behaves identically to `COLLECTING_INPUT` for incoming media, but exists as a distinct state for tracking purposes (shows the owner was prompted for more uploads).

### Publish Failure Recovery (CRITICAL)

When publish fails (Firestore transaction error, network issue, etc.):

1. **First attempt fails** → retry once automatically (silent)
2. **Retry succeeds** → proceed to `LIVE` normally
3. **Retry also fails** → session transitions to `AWAITING_APPROVAL` (NOT `FAILED`)
4. Owner's preview and extraction data are preserved
5. System sends: "Publishing is temporarily unavailable. Try again."
6. Owner can re-open preview and click "Approve & Publish" again

**Why not FAILED?** Publish failure is a system error, not a menu quality issue. The extraction data is still valid. Forcing the owner to re-upload photos after a system error destroys trust. Recovery to `AWAITING_APPROVAL` allows simple retry.

**Terminal FAILED only if:** The error is unrecoverable (e.g., data corruption detected, validation gate fails). In that case: `PUBLISHING` → `FAILED` → owner re-uploads.

### Full Resend Detection

When an owner sends images AFTER a preview is already generated:

| Images Sent After Preview | System Action                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------ |
| 1-2 images                | Reply: "Your preview is ready. Send full menu photos again to update." Keep preview. |
| 3+ images                 | **Full resend detected.** Session resets to COLLECTING_INPUT. New processing cycle.  |

Threshold: `FULL_RESEND_THRESHOLD = 3` (configurable constant). Rationale: 3+ images strongly signals "I'm sending a whole new menu," not "I want to add one more page."

### Media Limits

| Limit                     | Value        | Rationale                      |
| ------------------------- | ------------ | ------------------------------ |
| Max images per session    | 15           | Cost control + practical limit |
| Max PDF pages             | 40           | Covers largest menus           |
| Max file size per upload  | 10 MB        | WhatsApp limit                 |
| Max session total storage | 50 MB        | Cost control                   |
| Duplicate detection       | SHA-256 hash | Silent dedupe                  |

---

## Asset Intelligence Layer

A single Gemini AI call validates ALL uploaded files before extraction.

### What It Does

1. **Classifies files**: Identifies which are actual menu pages vs junk (logos, interiors, selfies)
2. **Checks completeness**: Estimates if full menu is present or partial
3. **Extracts business info**: Name, phone, address, logo presence, cuisine hint

### Decision Logic

| AI Result                     | System Action                                                        |
| ----------------------------- | -------------------------------------------------------------------- |
| No valid menu files           | Reply: "Send clearer menu photos or a menu PDF." Stay in session. |
| Valid but very partial (<50%) | Reply: "Send the full menu for best result." Wait for more.       |
| Usable menu (≥60%)            | Proceed to extraction immediately.                                   |
| Complete menu                 | Proceed to extraction immediately.                                   |

### PDF-Specific Validation

For PDF uploads, Gemini also identifies which pages are actual menu content vs non-menu pages (title pages, terms & conditions, GST certificates, etc.). Only valid menu pages are sent to extraction.

### Blank Prevention Gate

After extraction, if the result contains **0 categories or 0 items**, the preview is NOT generated. Instead:

- Session returns to `FAILED` state
- System replies: "Send clearer menu photos or a menu PDF."
- Owner can retry with new uploads

This prevents blank or nearly-empty previews from being shown — a blank preview destroys trust.

### Business Info Extraction

Extracted aggressively but treated as **editable suggestions only**.

- `business_name` — Pre-fills preview, editable before publish
- `phone_number` — Pre-fills preview, editable before publish
- `address` — Pre-fills preview, editable before publish
- `logo_present` — Reserved boolean flag
- `cuisine_hint` — Used for `businessType` mapping
- `detected_business_type` — AI-detected from menu content (e.g., "Restaurant", "Salon", "Cafe"). Uses existing `BUSINESS_TYPES` from `src/data/shared/businessTypes.ts` (60+ types plus canonical `Other`, 7 categories). Pre-fills editable dropdown on preview page. Drives: schema.org mapping, OBP structure, time slot defaults, UI labels, menu filters. Confidence-based: HIGH/MEDIUM → use directly, LOW/missing → fallback to `Other` with the best known business category, or `specialty` if category is unknown.

---

## Preview Page

The preview page is the most critical conversion surface.

### Design Principles

- Must feel **already finished** — "This is basically live already"
- Clean, professional, minimal
- Shows actual menu rendering (reuses existing digital menu components)
- Business info pre-filled from AI (editable)
- Two actions only: Approve & Publish, Request Fix
- "Preview — Not Live Yet" label
- Mobile-first design (most owners will open on phone)
- Tokenized URL tied to session (expires with session)
- View-only for anyone except session owner
- `noindex, nofollow` meta tag (temporary preview, not for search engines)

### Business Info Section

```
┌─────────────────────────────────┐
│  Confirm your business details  │
│                                 │
│  Business Name: [Spice Garden]  │ ← editable
│  Business Type: [Restaurant ▾]  │ ← editable dropdown (AI-detected, pre-filled)
│  Phone: [+91 98xxxxx]          │ ← editable
│  Address: [MG Road, Bangalore] │ ← editable
│                                 │
│  You can edit anytime after     │
│  publishing.                    │
│                                 │
│  [Approve & Publish]  [Fix]    │
└─────────────────────────────────┘
```

### Security (INV-2, ADR-13)

- Preview URL: `https://app.menulist.digital/msg-preview/{sessionId}?token={previewToken}` in QA/staging, and `https://app.menulist.ai/msg-preview/{sessionId}?token={previewToken}` in production.
- Token is a unique 20+ char cryptographically random string, sent ONLY to owner's WhatsApp
- Approve action validates: `request.token === session.previewToken` (token-only, no WhatsApp confirmation)
- If owner forwards link → recipient can view AND approve (owner's delegation choice — data is non-sensitive)
- Expires with session (24h)
- `noindex, nofollow` — not indexed by search engines

---

## Publish Pipeline

When owner clicks "Approve & Publish", system creates everything atomically:

### What Gets Created (Single Firestore Transaction)

1. **Tenant** — New tenant with business name, detected businessType (actual type like "Restaurant", not "B2C"), email, and tenant subdomain
2. **Store** — New store with: business info, default roles, time slot presets, businessCategory, detected businessType, phoneNumber (from WhatsApp), defaultLanguage (from extraction), country/currency (inferred from phone country code), `onboardingSource: 'MESSAGING_ONBOARDING'`, `starterActivationStatus: 'starter_active'`, `activationDeadline` (7 days from publish), and public subdomain
3. **User account** — Created or linked (using WhatsApp phone as identifier)
4. **platformSummary** — Collision-checked tenant/store IDs allocated and canonical counters advanced
5. **storesSummary** — Store synced for Cloud Function optimization
6. **Project** — Menu project with extracted data from session
7. **projectsSummary** — Default menu slug for public URL resolution
8. **Session LIVE finalization** — `publishedResult`, `confirmationPending`, and publish timestamps are written in the same transaction

### What Gets Sent

9. **WhatsApp message**: "Your menu is live: {link}. Manage anytime: {dashboard login link}"
10. **Public cache invalidation**: `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`

---

## Abuse Prevention & Rate Limits

| Control                                 | Value              | Rationale              |
| --------------------------------------- | ------------------ | ---------------------- |
| Sessions per phone per day              | 2                  | Prevents spam          |
| Sessions per phone per week             | 5                  | Long-term throttle     |
| Max processing runs per week per phone  | 5                  | Cost control           |
| Max invalid upload attempts per session | 3                  | Abuse detection        |
| Max corrections per session             | 3                  | Prevents loop          |
| Session expiry                          | 24 hours           | Cleanup                |
| Cooldown on limit exceeded              | 24 hours           | Rate limit enforcement |
| Preview link expiry                     | With session (24h) | Security               |

---

## WhatsApp Message Templates

All messages follow Language Governance — no hype, no AI language, calm professional tone.

| Trigger                                  | Message                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| First upload received                    | "Got it. Preparing your menu."                                             |
| Extraction starts (progress signal)      | "Your menu is being prepared..."                                           |
| Ask for more uploads (partial menu)      | "Send the full menu for best result."                                      |
| Ask for clearer photos (validation fail) | "Send clearer menu photos or a menu PDF."                                  |
| Preview ready                            | "Your menu preview is ready: {link}"                                       |
| Reminder (12h after preview)             | "Your menu preview is ready: {link}"                                       |
| Published successfully                   | "Your menu is live: {link}\nManage anytime: {dashboard}"                   |
| Existing store detected                  | "Your menu is already live. Manage here: {dashboard}"                      |
| Session expired                          | (No message — silent expiry)                                               |
| Rate limit / cooldown                    | "Try again later."                                                         |
| Post-publish message attempt             | "Your menu is live! Manage it here: {dashboard}"                           |
| Non-menu file detected                   | "Send menu photos or a menu PDF."                                          |
| Upload limit reached (>15 images)        | "Combine remaining pages into a PDF or send fewer clearer photos."         |
| Extraction cap reached (INV-3)           | "Send all menu photos again in a new message to update your menu."         |
| Publish failed (after retry)             | "Publishing is temporarily unavailable. Try again."                        |

---

## Failure Handling

| Scenario                                     | System Response                                                                                                                                                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI validation fails (API error)              | Retry once. If still fails: "Send your menu photos again."                                                                                                                                                              |
| Extraction fails                             | "Send clearer menu photos or a menu PDF." Return to collecting.                                                                                                                                                         |
| Preview link send fails                      | Session stays `AWAITING_APPROVAL` with `previewMessagePending=true`. The 2-minute intake processor retries the preview link until provider delivery succeeds.                                                           |
| Publish fails mid-transaction                | Rollback. Retry once. If still fails: session returns to `AWAITING_APPROVAL` (not `FAILED`). Reply: "Publishing is temporarily unavailable. Try again." Owner can retry approve from preview page. See §Publish Failure Recovery. |
| Owner sends video                            | "Send menu photos or a menu PDF."                                                                                                                                                                                       |
| Owner sends text commands                    | If preview ready: "Your preview is ready: {link}." Otherwise: "Send menu photos."                                                                                                                                       |
| Owner sends new images after preview         | "Your preview is ready. Send full menu photos again to update."                                                                                                                                                         |
| Password-protected PDF                       | "This PDF is locked. Send an unlocked PDF or photos."                                                                                                                                                                   |
| Owner sends video                            | "Send menu photos or a menu PDF." (video not supported)                                                                                                                                                                 |
| Owner sends audio/voice note                 | "Send menu photos or a menu PDF."                                                                                                                                                                                       |
| Owner sends location/contact/sticker         | Ignored silently. No reply.                                                                                                                                                                                             |
| Owner sends new menu WHILE processing        | Queue uploads. When current processing finishes, if new uploads exist, restart validation with full set. **Max 2 extraction runs per session (INV-3).**                                                                 |
| Extraction cap reached (2 runs used)         | New uploads accepted but no new extraction. Reply: "Send all menu photos again in a new message to update your menu."                                                                                                   |
| Extraction produces 0 items (blank)          | Never show blank preview. Reply: "Send clearer menu photos." Return to COLLECTING_INPUT.                                                                                                                                |
| Publish attempted with missing critical data | Block publish. Show inline validation: "Menu must have at least 1 category and 1 item with a price."                                                                                                                    |
| Personal/sensitive document uploaded         | Asset Intelligence flags as non-menu. Auto-delete from storage after session expiry. Never stored permanently.                                                                                                          |
| Duplicate or batched webhook from provider   | Traverse every entry/change/message and BulkWriter-create each SHA-256 provider-message ID before ACK. Retry creates only missing rows. Queue retries reuse the checkpointed reply instead of rerunning completed session logic. |

---

## Isolation & Feature Gating

### Feature Flags

| Flag                             | Type     | Default        | Purpose                                                                                                   |
| -------------------------------- | -------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| `ENABLE_MESSAGING_ONBOARDING`    | boolean  | App config currently `true`; checked-in Cloud Function runtime env templates default `false` | App/preview surfaces are available; Cloud Function webhooks and schedulers process only after real WhatsApp secrets and webhook registration exist and the target runtime flag is set `true`. |
| `MESSAGING_ONBOARDING_PROVIDERS` | string[] | `['whatsapp']` | Runtime env comma-separated provider list. Only enabled providers accept and process webhooks.             |

### Zero-Impact Guarantees

This feature is designed for **absolute zero impact** on existing MenuList systems:

| Guarantee                          | How                                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **No existing file modifications** | All code in new, isolated directories (`functions/src/messagingOnboarding/`, `src/app/(global-pages)/msg-preview/`)         |
| **No existing collection changes** | New Firestore collections only: `messagingOnboardingSessions`, `messagingOnboardingInboundMessages`, `messagingOnboardingRateLimits`, `messagingOnboardingEvents`; operational health uses existing `systemHealth`/`systemAlerts` |
| **No existing API route changes**  | New API routes only: `/api/msg-preview/[sessionId]/*`                                                                       |
| **No shared state mutation**       | Only writes to existing collections during publish (same pattern as existing onboarding)                                    |
| **No auth dependency**             | Webhook uses signature verification, preview uses tokens — no NextAuth interaction                                          |
| **Independent deployment**         | Cloud Functions deployable independently from dashboard                                                                     |
| **Feature flag gated**             | Master flag off = zero code execution, zero cost                                                                            |

### Existing Flows Protected

| Existing Flow                    | Impact  | Verification                                                                 |
| -------------------------------- | ------- | ---------------------------------------------------------------------------- |
| Dashboard onboarding (PONR flow) | ❌ None | No shared code, no shared state                                              |
| AI data extraction               | ❌ None | Reuses `processMenuImagesJobLogic` (read-only dependency, same as dashboard) |
| Store creation                   | ❌ None | Publish executor uses the shared onboarding transaction helper from a token-gated Next API route |
| User authentication              | ❌ None | No NextAuth dependency                                                       |
| Billing (Razorpay)               | ❌ None | Billing happens post-onboarding on dashboard login                           |
| OBP / QR surfaces                | ❌ None | Store + public URL are created; existing public/share surfaces handle OBP and QR availability after publish |
| Digital menu rendering           | ❌ None | Preview page reuses components (read-only)                                   |

### Clean Teardown

If the feature needs to be removed entirely:

**Step 1: Disable** (Instant — 1 line change)

```
ENABLE_MESSAGING_ONBOARDING=false
```

All webhooks return 200 (no processing). No new sessions created. Existing sessions expire naturally (24h).

**Step 2: Cleanup Data** (Scheduled task — ~10 min)

- Delete all docs in `messagingOnboardingSessions`
- Delete all docs in `messagingOnboardingInboundMessages`
- Delete all docs in `messagingOnboardingRateLimits`
- Delete all docs in `messagingOnboardingEvents` (tracking data)
- Delete all files in `messagingOnboarding/` Storage bucket
- Published stores/tenants/users remain (they are real entities created during publish)

**Step 3: Remove Code** (Optional — ~1 hour)

- Delete `functions/src/messagingOnboarding/` directory
- Delete `src/app/(global-pages)/msg-preview/` directory
- Delete `src/app/api/msg-preview/` directory
- Remove exports from `functions/src/index.ts`
- Remove feature flags from `src/config/features.ts`

**Total teardown time:** <1 hour. Zero impact on any other feature.

---

## v1 Scope Discipline

> **Source:** ChatGPT stress-test review (Feb 17, 2026) — validated by Cascade.

**v1 builds WhatsApp-India perfectly. Global infrastructure is architecturally ready but dormant.**

| Aspect        | v1 (Build Now)                                 | Dormant (Architecture Ready)         |
| ------------- | ---------------------------------------------- | ------------------------------------ |
| Provider      | WhatsApp only                                  | Telegram, LINE, Viber adapters       |
| Country       | India-first (INR, +91, Hindi/English)          | Global currencies, phone patterns    |
| Language      | English + Hindi primary                        | Full multi-language                  |
| Detection     | Basic business type from menu                  | Advanced multi-signal detection      |
| Tracking      | Core funnel events                             | Full analytics pipeline              |
| Adapter       | `WhatsAppAdapter` implemented                  | `IMessagingProvider` interface ready |
| Feature flags | `MESSAGING_ONBOARDING_PROVIDERS: ['whatsapp']` | Add providers to array to enable     |

**Discipline rule:** Do NOT build Telegram/LINE adapters in v1. Do NOT add multi-country logic in v1. The architecture supports it — build it when there's demand.

---

## System Presence Principle

> **Source:** ChatGPT stress-test review (Feb 17, 2026) — validated by Cascade.

Onboarding is an emotional moment. The system must **always feel alive, not silent.**

During extraction (30-120 seconds of silence), send a progress signal:

| Trigger           | Message                                      |
| ----------------- | -------------------------------------------- |
| Extraction starts | "Your menu is being prepared..."             |
| Preview ready     | "Your menu preview is ready: {link}"         |
| 12h reminder      | "Your menu preview is still waiting: {link}" |

Not spam. Just presence. Owner should never wonder "did it break?"

---

## Success Criteria

This feature is successful when:

1. An owner can go from zero to live digital presence in minutes via WhatsApp
2. No manual intervention needed for standard menus
3. ≥ 60% of started sessions reach successful publish
4. Owners share their live link immediately after publish
5. Referral onboarding begins naturally (owner tells other owners)
6. System runs at < ₹25 cost per successful onboarding
7. Health snapshots show normal publish rate, failure rate, and retained-source storage growth

---

## Risks & Mitigations

| Risk                               | Impact                           | Mitigation                                                                                                             |
| ---------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| WhatsApp becomes support channel   | High — kills scalability         | Hard boundary: tunnel closes after publish, all later messages get dashboard link                                      |
| Extraction quality too low         | High — trust collapse            | Quality scoring + preview approval gate. Owner sees before publish.                                                    |
| Identity ambiguity (who approves?) | Medium — wrong person publishes  | Token-based approval (INV-2). Token sent only to owner's WhatsApp. If forwarded, owner's delegation choice.            |
| Cost explosion from reprocessing   | Medium — burns money             | **Max 2 extraction runs per session (INV-3).** Per-phone rate limits. Per-session correction cap.                      |
| WhatsApp API changes / pricing     | Medium — breaks feature          | Provider-agnostic adapter layer. Swap provider by implementing new `IMessagingProvider` — zero session engine changes. |
| Single-provider dependency         | Medium — blocks global expansion | Multi-provider architecture from day one. Adding Telegram/LINE requires only adapter code (~200 lines).                |
| Spam/abuse                         | Medium — resource waste          | Rate limits, cooldown, invalid attempt tracking                                                                        |
| Webhook interruption after ACK      | High — lost onboarding message   | Durable inbound queue writes before provider ACK and retries from scheduler                                             |
| Published source storage growth     | Medium — cumulative Firebase cost | Retain files while referenced by projects; monitor sampled LIVE source bytes and alert before deletion policy is needed |

---

## Open Questions

| #   | Question                                                          | Impact                       | Status                                                                                                                                                                                                |
| --- | ----------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | WhatsApp Business Account setup — need Meta Business verification | Blocks launch                | To do                                                                                                                                                                                                 |
| 2   | WhatsApp template message approval timeline                       | Affects proactive messages   | To research                                                                                                                                                                                           |
| 3   | User account creation method — phone-based auth or magic link?    | Affects dashboard login flow | **Decision: Claim link via WhatsApp. Owner can claim with Google, email/password, or WhatsApp number/passcode; phone number stays linked to user.**                                                   |
| 4   | Free setup duration — how long before billing required?            | Affects business model       | **Decision (ADR-12): Verified publish → 7-day starter activation → focused starter workspace → owner pays via existing Razorpay to keep the same public URL and QR live. See `_impl.md §17`.** |
| 5   | Preview page domain — dedicated subdomain or path?                | Affects infrastructure       | **Decision: the tokenized owner approval flow uses `/msg-preview/{sessionId}` on the canonical owner-app host: `app.menulist.digital` in QA and `app.menulist.ai` in production.** |

---

## Related Documents

| Document                                | Purpose                            |
| --------------------------------------- | ---------------------------------- |
| `_impl.md`                              | Technical implementation blueprint |
| `_firebase.md`                          | Firebase cost tracking             |
| `_marketing.md`                         | Sales and marketing collateral     |
| `_website.md`                           | Landing page content               |
| `_helpdoc.md`                           | Customer help documentation        |
| `__docs__/projects/ai-data-extraction/` | Existing extraction pipeline docs  |
| `__docs__/onboarding/`                  | Existing PONR onboarding spec      |

---

_Document Status: Implementation-Complete (v3.1 — All spec requirements verified against codebase: 15/15 message templates, 8/8 rate limits, 12/12 failure handlers, 11 session states, 6 forbidden transitions, 8 invariants. 4 post-implementation bugs found and fixed (Fast Start logic, file size limit, noindex meta, preview UI). Last verified: Feb 17, 2026.)_
