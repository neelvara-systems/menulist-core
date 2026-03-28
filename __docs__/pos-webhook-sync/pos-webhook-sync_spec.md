# POS Webhook Sync — Specification

> **Document Type:** Business Requirements (CEO/PM readable)
> **Status:** Implemented (Feature flag: `ENABLE_POS_SYNC: false`)
> **Last Updated:** March 14, 2026
> **Version:** 2.1

---

## Executive Summary

### What

MenuList automatically sends the full, authoritative menu to a store's POS system whenever menu-affecting changes occur. One edit in MenuList = POS updated. No manual replication.

### Why

Businesses using both MenuList and a POS system currently must update menus in two places. This causes price mismatches, missing items, and daily operational friction. For chains with multiple outlets, the problem multiplies. POS Webhook Sync eliminates this entirely.

### For Whom

- **Primary:** Restaurants, cafes, QSRs using any POS system alongside MenuList
- **Secondary:** Multi-outlet chains where each store may use a different POS vendor
- **Long-term:** Any business where MenuList manages menu and POS executes orders

### Strategic Position

MenuList is NOT building POS integrations. MenuList is becoming the **upstream menu authority**. POS systems consume MenuList's authoritative menu feed. This is a one-way broadcast of truth — not a bidirectional sync, not middleware, not a connector.

---

## Goals & Success Metrics

| Goal                              | Success Metric                                                |
| --------------------------------- | ------------------------------------------------------------- |
| Eliminate manual POS menu updates | Owner never manually replicates menu changes to POS           |
| Reliable delivery                 | 99%+ successful webhook deliveries                            |
| Zero owner friction               | Silent operation — owner forgets POS sync exists              |
| Enterprise-grade trust            | HMAC-SHA256 signatures, versioned payloads, atomic versioning |
| Activation ease                   | "Send instructions" email reduces POS setup time              |

**The success sentence:** "We don't worry about POS menu anymore — it's handled."

---

## Target Customers (ICP)

| Segment                  | Why They Need This                                     |
| ------------------------ | ------------------------------------------------------ |
| Single-store restaurants | Tired of updating menu in two places                   |
| Multi-outlet chains      | Each outlet may use different POS; consistency is pain |
| Premium SMBs             | Expect infrastructure-grade reliability                |
| Franchise operations     | Need central menu control with local POS execution     |

---

## Scope

### In-Scope

1. **Store-level webhook configuration** — toggle, URL, secret, test button
2. **Full menu snapshot delivery** — always full menu, never partial/delta
3. **Debounce system** — 25 sec after last edit, send one snapshot
4. **Menu versioning** — integer version incremented on every menu change
5. **HMAC-SHA256 signature** — every payload signed with store secret
6. **Async delivery** — via API route (Cloud Function deferred), never blocks UI
7. **Retry logic** — Single attempt per delivery (multi-attempt retry deferred to Cloud Functions)
8. **Delivery logs** — last 20 deliveries visible in store settings
9. **Test webhook button** — sends realistic test payload
10. **"Send instructions" email** — structured setup instructions to POS provider
11. **Status indicators** — Connected / Connection Issue / Disabled
12. **Public documentation page** — `menulist.ai/pos-sync` developer reference
13. **Sample payload download** — JSON file for POS vendors to test against
14. **Copy technical summary** — one-click copy for WhatsApp/email sharing

### Out-of-Scope (Never Build)

| Feature                   | Reason                                              |
| ------------------------- | --------------------------------------------------- |
| POS-specific integrations | We are not a connector. We broadcast truth.         |
| Item ID mapping UI        | Creates maintenance nightmare, breaks calm design   |
| Two-way sync (POS → Menu) | MenuList must remain upstream source of truth       |
| POS analytics/dashboard   | Not our responsibility. We deliver; they consume.   |
| Manual "Sync Now" button  | Contradicts automation philosophy                   |
| Per-POS format adapters   | One standard format. POS adapts to us.              |
| Delta/event-based updates | Full snapshot is permanent architecture decision    |
| POS debugging tools       | Not our responsibility                              |
| Master-level webhook push | Store-level only. Each outlet controls its own POS. |

---

## User Stories & Flows

### Story 1: First-Time Setup

**As** a restaurant owner using Petpooja POS,
**I want** to connect my MenuList menu to POS,
**So that** menu changes reach POS automatically.

**Flow:**

1. Owner goes to Business Settings → POS Sync tab
2. Toggles "Enable POS Sync" ON
3. System auto-generates signing secret
4. Owner enters webhook URL (provided by POS vendor)
5. Owner clicks "Send Test" → sees success/failure
6. Done — all future menu changes auto-sync

### Story 2: Ongoing Silent Operation

**As** a store owner with POS sync enabled,
**I want** menu changes to reach my POS automatically,
**So that** I never think about POS sync again.

**Flow:**

1. Owner edits menu (price, item, category change)
2. System debounces (waits 25 sec for more edits)
3. System creates versioned full snapshot
4. Client calls `/api/pos-sync/deliver` → server POSTs to webhook
5. POS receives, verifies signature, applies menu
6. Owner sees nothing — silent operation

> **Implementation note (Feb 14, 2026):** Delivery is handled by API route directly, not Cloud Function. Single attempt per delivery. Cloud Function retry scheduler is deferred — see `_impl.md` §14 ADR.

### Story 3: POS Provider Onboarding

**As** a store owner who doesn't understand webhooks,
**I want** to send setup instructions to my POS vendor,
**So that** they configure their system to receive my menu.

**Flow:**

1. Owner enters POS provider email in settings
2. Clicks "Send Instructions"
3. System sends professional email with:
   - Client/store details
   - Payload format and sample
   - Signature verification steps
   - Setup steps for POS developer
   - Link to public documentation
4. Owner is CC'd on the email
5. Max 3 sends per day (abuse protection)

### Story 4: Webhook Failure Handling

**As** a system,
**When** a webhook delivery fails,
**I want** to mark the connection as having issues,
**So that** the owner is informed without being alarmed.

**Flow (current implementation — single attempt):**

1. Webhook returns non-200 or times out (5 sec max)
2. Log delivery failure in posDeliveryLogs
3. After 3 consecutive failures → mark status "connection_issue"
4. Show calm warning in settings: "Menu updates are not reaching your POS"
5. When owner fixes URL and clicks "Send Test" → status recovers

> **Why 3, not 1:** Network glitches happen. A single timeout or 5xx shouldn't alarm the owner. 3 consecutive failures = genuine connectivity issue. (ChatGPT audit, Mar 14, 2026)

> **Deferred (Cloud Function retry):** Multi-attempt retry with exponential backoff (5 attempts: 0s → 30s → 2min → 10min → 1hr) is designed but deferred until Cloud Functions are implemented. See `_impl.md` §14 ADR.

---

## Requirements

### Functional Requirements

| ID    | Requirement                                              | Priority |
| ----- | -------------------------------------------------------- | -------- |
| FR-01 | Store-level POS sync toggle (enable/disable)             | P0       |
| FR-02 | Webhook URL input with validation                        | P0       |
| FR-03 | Auto-generated signing secret (HMAC-SHA256)              | P0       |
| FR-04 | Full menu snapshot on every menu-affecting change        | P0       |
| FR-05 | Debounce: 25 sec after last edit before sending          | P0       |
| FR-06 | Menu version integer, incremented on change              | P0       |
| FR-07 | Async delivery via API route (CF deferred)               | P0       |
| FR-08 | Single attempt per delivery (multi-retry deferred to CF) | P0       |
| FR-09 | Mark "connection_issue" after 3 consecutive failures     | P0       |
| FR-10 | Test webhook button with realistic payload               | P0       |
| FR-11 | Delivery logs: last 20 deliveries per store              | P0       |
| FR-12 | Status display: Connected / Connection Issue / Disabled  | P0       |
| FR-13 | Signature header: `X-MenuList-Signature`                 | P0       |
| FR-14 | Event header: `X-MenuList-Event`                         | P0       |
| FR-15 | Version header: `X-MenuList-Version`                     | P0       |
| FR-16 | "Send instructions" email to POS provider (CC owner)     | P1       |
| FR-17 | Public documentation page at `/pos-sync`                 | P1       |
| FR-18 | Download sample payload button                           | P1       |
| FR-19 | Copy technical summary (one-click for WhatsApp)          | P1       |
| FR-20 | Regenerate secret button with confirmation modal         | P1       |
| FR-21 | Global dashboard badge when connection failing           | P1       |
| FR-22 | Email send limit: max 3 per day per store                | P1       |

### Non-Functional Requirements

| Requirement      | Target                                                   |
| ---------------- | -------------------------------------------------------- |
| Delivery latency | < 60 sec from last edit to webhook sent                  |
| Payload timeout  | 5 seconds max per delivery attempt                       |
| Payload size     | Support up to 5 MB (gzip allowed)                        |
| Retry ceiling    | Single attempt (multi-retry deferred to Cloud Functions) |
| UI impact        | Zero — webhook delivery never blocks owner's UI          |
| Availability     | Matches Cloud Functions SLA                              |
| Security         | HMAC-SHA256 signed, secret never transmitted in payload  |

---

## Trigger Conditions

### Core Principle: Send Everything About the Menu, Exclude Only UI/Theme

POS systems need the **complete menu truth** — not a filtered subset. Every field on every item and category is sent as-is. The only exclusions are visual/theme settings that have zero relevance to POS operations.

### Events That Trigger POS Sync

| Event                             | Triggers Sync? | Rationale                                      |
| --------------------------------- | -------------- | ---------------------------------------------- |
| Item created                      | Yes            | POS needs new items                            |
| Item deleted / deactivated        | Yes            | POS must remove unavailable items              |
| Item name changed                 | Yes            | POS displays item names                        |
| Item price changed                | Yes            | POS charges these prices                       |
| Item description changed          | Yes            | POS may display descriptions                   |
| Item availability toggled         | Yes            | POS needs to mark sold out                     |
| Item tags changed (dietary, etc.) | Yes            | POS may filter/display dietary info            |
| Item images changed               | Yes            | POS may display item images (kiosk, KDS)       |
| Item attributes/variants changed  | Yes            | POS needs variant names and prices             |
| Item isBestSeller changed         | Yes            | POS may highlight popular items                |
| Item duration (prep time) changed | Yes            | POS/KDS may use prep time estimates            |
| Category created                  | Yes            | POS needs category structure                   |
| Category deleted / deactivated    | Yes            | POS must remove category                       |
| Category name changed             | Yes            | POS displays category names                    |
| Category images changed           | Yes            | POS may display category images                |
| Category timeSlots changed        | Yes            | POS may enforce time-based availability        |
| Category/item order changed       | Yes            | POS may respect display ordering               |
| Translation added/changed         | Yes            | POS may serve multi-language menus             |
| AI-generated description accepted | Yes            | Once accepted, it's menu content — POS gets it |
| Menu published                    | Yes            | Full menu state refresh                        |

### Events That Do NOT Trigger POS Sync

| Event                              | Triggers Sync? | Rationale                                 |
| ---------------------------------- | -------------- | ----------------------------------------- |
| Theme/layout changes               | No             | Visual design — irrelevant to POS         |
| Color/font/style changes           | No             | UI presentation only                      |
| `ownerBoost` score changed         | No             | Internal ML scoring — not menu data       |
| `descriptionSource` field          | No             | Internal metadata (ai vs manual tracking) |
| Processing metadata (tokens, etc.) | No             | Internal cost tracking                    |
| Analytics events                   | No             | Tracking data, not menu data              |
| Decision Intelligence scores       | No             | Internal recommendation logic             |
| File processing status             | No             | Upload/extraction pipeline state          |

### Rule: When in doubt, SEND IT

If a field exists on an item or category and it's not explicitly in the "Do NOT trigger" list above, it gets included in the payload. POS systems can ignore fields they don't need — but they can't use fields we don't send.

---

## Payload Structure (Locked)

### Design Principle: Send All Item/Category Data As-Is

The payload mirrors the actual `ExtractedDataItem` and `ExtractedDataCategory` structures from the codebase. No filtering, no transformation, no field omission (except internal metadata fields listed in exclusions above). POS gets the raw menu truth.

This follows the same pattern as the existing `getOutputJson()` in `ShareModal.tsx` — but includes ALL fields instead of the Excel-friendly subset.

```json
{
  "event": "menu.full.sync",
  "version": 31,
  "timestamp": "2026-02-13T18:21:00Z",
  "tenantId": "t_123",
  "projectId": "p_123",
  "storeId": "s_123",
  "currency": "INR",
  "languages": [
    { "code": "en", "name": "English", "isPrimary": true },
    { "code": "hi", "name": "Hindi", "isPrimary": false }
  ],
  "menu": {
    "categories": [
      {
        "id": "cat_1",
        "active": true,
        "name": { "en": "Starters", "hi": "स्टार्टर्स" },
        "images": [],
        "timeSlots": [],
        "orderIndex": 0
      }
    ],
    "items": [
      {
        "id": "item_1",
        "category": "cat_1",
        "active": true,
        "available": true,
        "name": { "en": "Paneer Tikka", "hi": "पनीर टिक्का" },
        "description": {
          "en": "Cottage cheese marinated in spices",
          "hi": "मसालों में मैरीनेट किया हुआ पनीर"
        },
        "price": "280",
        "images": [
          {
            "url": "https://storage.example.com/paneer.jpg",
            "name": "paneer.jpg"
          }
        ],
        "tags": ["Vegetarian", "Bestseller"],
        "isBestSeller": true,
        "duration": 15,
        "attributes": [
          {
            "id": "item_1a1",
            "name": { "en": "Half", "hi": "हाफ" },
            "price": "180",
            "active": true
          },
          {
            "id": "item_1a2",
            "name": { "en": "Full", "hi": "फुल" },
            "price": "280",
            "active": true
          }
        ],
        "orderIndex": 0
      }
    ]
  }
}
```

### Fields Explicitly Excluded from Payload

These internal-only fields are stripped before sending:

| Field                | Reason                                           |
| -------------------- | ------------------------------------------------ |
| `descriptionSource`  | Internal tracking (ai vs manual) — not menu data |
| `ownerBoost`         | Internal ML scoring — not menu data              |
| `inputToken`         | Processing cost tracking                         |
| `ouputToken`         | Processing cost tracking                         |
| `charges`            | Processing cost tracking                         |
| `chargePerToken`     | Processing cost tracking                         |
| `processingTime`     | Processing metadata                              |
| `combinedWithFileId` | File processing reference                        |
| `processingMessages` | Internal extraction messages                     |

### Headers Sent

```
X-MenuList-Signature: HMAC_SHA256(raw_body, store_secret)
X-MenuList-Event: menu.full.sync
X-MenuList-Version: 31
X-MenuList-Timestamp: 1707847260
X-MenuList-Delivery-Id: del_abc123
Content-Type: application/json
```

**Note:** Signature is computed on the **raw JSON body** (not parsed+re-stringified). This is critical for verification — see Security section.

**Test payload uses:** `event: "test.ping"` with realistic sample data

---

## UI Design

### Location

Business Settings → "POS Sync" tab (new tab, sits after "Integrations")

### Page Structure (5 sections)

**Section 1 — Status Header**

- Disabled: "POS Sync is not enabled"
- Connected: "● Connected — Menu updates are being sent automatically — Last sent: 2 min ago"
- Failing: "⚠ Connection issue — Menu updates are not reaching your POS"

**Section 2 — Enable & Config**

- Toggle: Enable POS Sync (ON/OFF)
- Webhook URL input with helper text
- Signing Secret (auto-generated, copy button, regenerate button)

**Section 3 — Test Connection**

- "Send Test" button
- Inline result: success or failure message

**Section 4 — Delivery Status**

- Last delivery time, status, menu version

**Section 5 — Recent Deliveries**

- Table: Time | Status | Response Code (last 20, no pagination)

### Activation Helpers (below config)

- "Send setup instructions to POS provider" button
- POS provider email field
- "Download Sample Payload" button
- "Copy Technical Summary" button

### UX Philosophy

- **Silent when healthy** — no toasts, no notifications on successful sync
- **Visible only when broken** — calm warning, not aggressive alert
- **Calm, infrastructure feel** — like Stripe webhook settings
- **No analytics, no graphs** — just reliability visibility

---

## Architectural Decisions (Locked)

| Decision               | Choice                  | Rationale                                                                            |
| ---------------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| Sync strategy          | Full snapshot only      | Eliminates sync corruption, simplest for POS, no delta logic                         |
| Webhook scope          | Store-level only        | Each outlet may use different POS vendor                                             |
| Delivery mechanism     | API route (CF deferred) | Never blocks UI; Cloud Function retry deferred                                       |
| UI feedback on success | None (silent)           | Infrastructure should be invisible when healthy                                      |
| Failure handling       | Mark after 3 failures   | 3 consecutive failures = connection_issue; single glitch = silent retry on next edit |
| Master webhook control | Not supported           | Store-level isolation is industry standard                                           |
| Delta/event streaming  | Rejected permanently    | Full snapshot is simpler, more reliable, better for SMBs                             |
| POS-specific adapters  | Rejected permanently    | One standard format; POS adapts to MenuList                                          |

---

## Risks & Open Questions

### Risks

| Risk                       | Mitigation                                 |
| -------------------------- | ------------------------------------------ |
| POS vendor ignores webhook | Not our problem. We deliver; they consume. |
| Large menus (500+ items)   | Gzip compression, 5MB limit, 5s timeout    |
| Rapid menu edits           | Debounce system (20-30 sec)                |
| Wrong webhook URL          | Test button catches it before real sync    |
| Secret key compromise      | Regenerate button with confirmation        |
| Email abuse (spam)         | Max 3 sends per day per store              |

### Open Questions (Resolved)

| Question                                                  | Status   | Resolution                                                      |
| --------------------------------------------------------- | -------- | --------------------------------------------------------------- |
| Exact debounce duration (20s vs 30s)?                     | RESOLVED | 25 sec — implemented in `eventBuilder.ts`                       |
| Should delivery logs be stored in subcollection or array? | RESOLVED | Subcollection at `stores/{storeId}/posDeliveryLogs` — see ADR-4 |
| Email template: use SendGrid or Firebase Extension?       | DEFERRED | Email integration deferred; counter tracking implemented        |
| Public docs page: static or dynamic?                      | DEFERRED | Low priority — POS vendor technical docs                        |

---

## Feature Rejection Gate Result

| Question                    | Answer                                                         | Result |
| --------------------------- | -------------------------------------------------------------- | ------ |
| Removes decision?           | Owner no longer decides when/how to update POS menu            | PASS   |
| Would notice absence?       | Chains and premium SMBs absolutely need menu-POS consistency   | PASS   |
| Strengthens core moment?    | Correct POS = customer orders match reality = faster decisions | PASS   |
| One sentence without "and"? | "Menu changes automatically reach your POS system."            | PASS   |
| Still matters in 3 years?   | POS sync is fundamental infrastructure for food businesses     | PASS   |

**Score: 5/5 — Approved**

**Note on pre-rejected "POS integration":** The Feature Rejection Gate pre-rejects "POS integration — We're not a connector." This feature is fundamentally different: it is one-way authoritative broadcast, not integration. No adapters, no mapping, no bidirectional sync, no POS-specific logic. MenuList stays upstream.

---

## Strategic Context (from ChatGPT Conversation)

### MenuList Identity (Locked)

- **MenuList = a calm system businesses depend on daily**
- **Not:** feature-rich SaaS, experimental AI toy, growth-hack product
- **Product personality:** When owners open MenuList, they feel calm because the system handles things
- **North star:** "We don't worry about menu anymore."
- **Build filter:** Only build what makes MenuList more dependable

### POS Sync's Role in That Identity

- Makes MenuList the **upstream menu authority** over POS
- POS becomes a **downstream consumer** of MenuList's truth
- Quiet infrastructure that serious businesses appreciate
- Not a growth lever — a trust and credibility builder

### Approach to This Feature

- **Build once properly → freeze unless real demand appears**
- **A = treat as done infrastructure** (not continuously improved)
- **Silent operation** — no success toasts, no "menu synced" messages
- **Reliability > features** — perfect debounce, versioning, retries matter more than UI polish

### Future Scope (Only If Organic Demand)

- POS vendor recognition (detect which POS is consuming)
- ~~Public API (read-only menu endpoint)~~ → **BUILT** as Platform Pull API (`ENABLE_PUBLIC_API: false`). See `__docs__/platform-pull-api/`
- Scheduled menu publishing (auto-switch breakfast/lunch/dinner menus)
- Time-window availability (daypart-based item visibility: breakfast/lunch/dinner)
- These are NOT planned. Only build if real-world pressure appears.

### POS Feature Ceiling (Permanent Boundary)

**Allowed zone** (within ceiling):

- Menu structure push (categories, items, modifiers, prices, availability)
- Full snapshot delivery (never delta)
- HMAC-SHA256 signed payloads
- Delivery logging and status tracking
- Platform Pull API (POS pulls FROM us)

**Gray zone** (evaluate carefully if demand appears):

- POS vendor recognition (identify which POS consumes)
- Availability intelligence (binary only, if POS exposes availability API)
- Price anomaly detection using POS-confirmed prices (requires POS read-back)

**Hard no zone** (never build under MenuList):

- Inventory quantities / stock counts / reorder alerts
- Revenue analytics / sales dashboards / margin tracking
- Order flow control / kitchen display sync
- Procurement / supply chain / vendor management
- Two-way sync (POS → MenuList menu mutation)
- POS-specific connector adapters
- Real-time websocket sync

**The boundary rule:** MenuList may read operational systems to improve public representation. MenuList may not influence or manage operational systems.

---

---

## Existing Infrastructure Synergies

### Menu Observation Log (MOL) as Event Ledger

MenuList already has an append-only menu event system — the **Menu Observation Log (MOL)** — that tracks every menu mutation:

- **Collection:** `menuChangeLog/{tId}/{sId}/{entryId}` — immutable change entries
- **Collection:** `menuSnapshots/{tId}/{sId}/{snapshotId}` — immutable publish snapshots
- **Types:** `MenuChangeType` union (PRICE, AVAILABILITY, ITEM_ADDED, ITEM_DELETED, CATEGORY_ADDED, NAME, DESCRIPTION, IMAGE, TAG, ATTRIBUTE, REORDER, PUBLISH, EXTRACTION_CORRECTION)

This means MenuList already has the "event ledger" that infrastructure-grade webhook systems use. POS Sync can leverage MOL for:

- **Audit trail** — every menu change is already recorded
- **Self-healing** — if a delivery fails, MOL proves what changed
- **Future event streaming** — other systems can subscribe to MOL events

POS Sync does NOT need a separate `menu_events` collection — MOL already serves this purpose.

### Menu Hash for No-Op Detection

A `menuHash` (sha256 of the serialized payload) can be computed before delivery to:

- **Skip redundant deliveries** — if hash matches last delivery, no webhook needed
- **Debug mismatches** — POS vendor can compare their hash with ours
- **Detect data drift** — compare hashes over time

This is stored on the delivery log entry as `payloadHash`, not on the store document.

---

**Document Signature:** Feature Specification
**Author:** Cascade + Founder
**Last Updated:** March 14, 2026
