# 🧪 PRODUCTION TESTING GUIDE

**Purpose:** Historical manual spot-check guide for MenuList intelligence features
**Audience:** Founder/QA running supplementary manual checks before production launch
**Date:** January 11, 2026
**Status:** Companion manual checklist only. The active launch authority is [External Certification Runbook](./production-readiness/external-certification-runbook.md) plus [MenuList Production Readiness Audit](./audits/menulist-production-readiness-audit.md).
**Estimated Time:** 2-3 hours for complete manual spot-checking

**Launch boundary:** Not current launch certification or deploy approval. This manual testing guide collects supplementary QA evidence only; production readiness still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.

> This guide is not a production-launch approval checklist. Use it only after the local source gates in `npm run verify:production-readiness-local` pass and the relevant External Certification Runbook gate is ready to collect manual evidence.

---

## 📋 PRE-TESTING CHECKLIST

Before starting, ensure:

| Requirement           | How to Verify                                | Status |
| --------------------- | -------------------------------------------- | ------ |
| Dev server running    | `npm run dev` at `localhost:3000`            | ☐      |
| Firebase connected    | Check console for connection logs            | ☐      |
| Test store exists     | At least 1 store with menu data              | ☐      |
| Menu has 10+ items    | Items with images, prices, categories        | ☐      |
| Analytics data exists | At least 7 days of simulated views/clicks    | ☐      |
| Feature flags reviewed | Verify the target environment uses the documented launch flag state in `src/config/features.ts`; do not force all flags on. | ☐      |

### Quick Feature Flag Review

Feature flags are part of the launch surface, not a blanket "enable everything" switch. Before using this manual checklist:

```bash
npm run verify:production-readiness-local
```

Then review `src/config/features.ts` for the specific feature under test and record the exact flag state in the production-readiness audit evidence. If a feature is intentionally disabled, do not mark that as a code failure.

---

# FEATURE 1: DECISION BLOCKS

## What It Does

Shows 3 smart recommendation blocks at the top of customer menu (Popular, Quick Pick, Best Value).

## Where to Test

**Customer Menu:** `https://{subdomain}.menulist.ai` or `localhost:3000/_client/{subdomain}`

## Test Cases

### TEST 1.1: Decision Blocks Appear

| Step | Action                             | Expected Result                                 |
| ---- | ---------------------------------- | ----------------------------------------------- |
| 1    | Open customer menu URL             | Page loads successfully                         |
| 2    | Look at top of menu (below header) | See 3 Decision Block cards                      |
| 3    | Check block titles                 | "Popular Right Now", "Quick Pick", "Best Value" |
| 4    | Verify each block shows item       | Name, image, price, reason text                 |

**Pass Criteria:** All 3 blocks visible with real menu items

### TEST 1.2: Runtime Availability Filtering

| Step | Action                                | Expected Result                      |
| ---- | ------------------------------------- | ------------------------------------ |
| 1    | In admin, mark an item as unavailable | Save changes                         |
| 2    | Refresh customer menu                 | Unavailable item NOT shown in blocks |
| 3    | Mark item available again             | Item may reappear in blocks          |

**Pass Criteria:** Unavailable items never appear in Decision Blocks

### TEST 1.3: Click Tracking

| Step | Action                                         | Expected Result            |
| ---- | ---------------------------------------------- | -------------------------- |
| 1    | Open browser dev tools → Network tab           | Filter by "analytics"      |
| 2    | Click on a Decision Block item                 | See analytics request fire |
| 3    | Verify request contains `recommendationClicks` | Data being tracked         |

**Pass Criteria:** Clicks are tracked to analytics

### TEST 1.4: Scroll to Item

| Step | Action                                 | Expected Result           |
| ---- | -------------------------------------- | ------------------------- |
| 1    | Note the item shown in "Popular" block | Remember item name        |
| 2    | Click on the block                     | Page scrolls to that item |
| 3    | Observe item highlight                 | 2-second visual highlight |

**Pass Criteria:** Smooth scroll + highlight animation

### TEST 1.5: Owner Pin Controls

| Step | Action                                       | Expected Result                  |
| ---- | -------------------------------------------- | -------------------------------- |
| 1    | Go to Project Editor → Smart Recommendations | Settings modal opens             |
| 2    | Pin a specific item to "Popular"             | Save settings                    |
| 3    | Refresh customer menu                        | Pinned item appears in "Popular" |

**Pass Criteria:** Owner pins override AI selection

### TEST 1.6: Block Disable

| Step | Action                                         | Expected Result        |
| ---- | ---------------------------------------------- | ---------------------- |
| 1    | In Smart Recommendations, disable "Quick Pick" | Toggle off             |
| 2    | Refresh customer menu                          | Only 2 blocks visible  |
| 3    | Re-enable "Quick Pick"                         | 3 blocks visible again |

**Pass Criteria:** Owner can hide individual blocks

---

## Decision Blocks Verification Checklist

| Test                    | Status | Notes |
| ----------------------- | ------ | ----- |
| 1.1 Blocks Appear       | ☐      |       |
| 1.2 Availability Filter | ☐      |       |
| 1.3 Click Tracking      | ☐      |       |
| 1.4 Scroll to Item      | ☐      |       |
| 1.5 Owner Pin           | ☐      |       |
| 1.6 Block Disable       | ☐      |       |

---

# FEATURE 2: CONTINUOUS MENU INTELLIGENCE (CMI)

## What It Does

Runs nightly at 2:30 AM UTC, scores every menu item, stores confidence in Firestore.

## Where to Test

**Admin:** Check Firebase Console → Firestore → `menuIntelligence` collection

## Test Cases

### TEST 2.1: Intelligence Document Exists

| Step | Action                                   | Expected Result           |
| ---- | ---------------------------------------- | ------------------------- |
| 1    | Open Firebase Console                    | Navigate to Firestore     |
| 2    | Go to `menuIntelligence` collection      | Collection exists         |
| 3    | Find document: `{tId}_{sId}_{projectId}` | Document with item scores |

**Pass Criteria:** Document exists with `itemScores` array

### TEST 2.2: Item Scores Structure

| Step | Action                           | Expected Result                                              |
| ---- | -------------------------------- | ------------------------------------------------------------ |
| 1    | Open a menuIntelligence document | View data                                                    |
| 2    | Check `itemScores` array         | Each item has: `itemId`, `confidence`, `stableDays`, `trend` |
| 3    | Verify confidence values         | Between 0.0 and 1.0                                          |

**Pass Criteria:** Valid score structure for all items

### TEST 2.3: Scheduler Runs (Manual Trigger)

| Step | Action                                     | Expected Result                 |
| ---- | ------------------------------------------ | ------------------------------- |
| 1    | Open Firebase Console → Functions          | Find `decisionBlocksScoring`    |
| 2    | Trigger manually (or wait for 2:30 AM UTC) | Function executes               |
| 3    | Check logs                                 | "CMI computed" message          |
| 4    | Check Firestore                            | `lastUpdated` timestamp updated |

**Pass Criteria:** Scheduler updates intelligence data

### TEST 2.4: Confidence Thresholds Applied

| Step | Action                              | Expected Result                            |
| ---- | ----------------------------------- | ------------------------------------------ |
| 1    | Find an item with high views/clicks | Note its `confidence`                      |
| 2    | Find an item with low views/clicks  | Note its `confidence`                      |
| 3    | Compare values                      | High-engagement item has higher confidence |

**Pass Criteria:** Confidence correlates with engagement

---

## CMI Verification Checklist

| Test                   | Status | Notes |
| ---------------------- | ------ | ----- |
| 2.1 Document Exists    | ☐      |       |
| 2.2 Scores Structure   | ☐      |       |
| 2.3 Scheduler Runs     | ☐      |       |
| 2.4 Thresholds Applied | ☐      |       |

---

# FEATURE 3: DIGITAL SCREENS

## What It Does

Auto-generates slideshow content for in-store TVs. Runs itself with zero owner effort.

## Where to Test

**Screen URL:** `localhost:3000/screen/{token}` (get token from store settings)

## Test Cases

### TEST 3.1: Screen Loads

| Step | Action                               | Expected Result    |
| ---- | ------------------------------------ | ------------------ |
| 1    | Get screen token from store settings | Copy the URL       |
| 2    | Open screen URL in browser           | Screen renders     |
| 3    | See rotating slides                  | 8-second intervals |

**Pass Criteria:** Screen loads and rotates content

### TEST 3.2: Slide Content Hierarchy

| Step | Action                     | Expected Result                     |
| ---- | -------------------------- | ----------------------------------- |
| 1    | Watch screen for 1 minute  | Observe slide types                 |
| 2    | Check for campaign slides  | Items with confidence ≥ 0.7         |
| 3    | Check for evergreen slides | Meal-based (Breakfast/Lunch/Dinner) |
| 4    | Check for brand fallback   | Store name/logo slide               |

**Pass Criteria:** 4-layer stack (Owner → Campaign → Evergreen → Brand)

### TEST 3.3: Zero-Blank Guarantee

| Step | Action                           | Expected Result            |
| ---- | -------------------------------- | -------------------------- |
| 1    | Create a store with no campaigns | Fresh store                |
| 2    | Open screen URL                  | Screen still shows content |
| 3    | Verify brand fallback            | Store name appears         |

**Pass Criteria:** Screen NEVER shows blank

### TEST 3.4: Minimum/Maximum Slides

| Step | Action                   | Expected Result   |
| ---- | ------------------------ | ----------------- |
| 1    | Count slides in rotation | Note the count    |
| 2    | Verify minimum           | At least 3 slides |
| 3    | Verify maximum           | At most 8 slides  |

**Pass Criteria:** 3-8 slides always

### TEST 3.5: Offline Resilience (Cache)

| Step | Action                                      | Expected Result            |
| ---- | ------------------------------------------- | -------------------------- |
| 1    | Load screen URL                             | Wait for first render      |
| 2    | Open dev tools → Application → localStorage | See `menulist-screen-data` |
| 3    | Disconnect network                          | Go offline                 |
| 4    | Refresh page                                | Screen loads from cache    |

**Pass Criteria:** Works offline with cached data

### TEST 3.6: Real-Time Updates

| Step | Action                                  | Expected Result                 |
| ---- | --------------------------------------- | ------------------------------- |
| 1    | Keep screen open                        | In one browser tab              |
| 2    | In admin, trigger campaign regeneration | Save/update data                |
| 3    | Watch screen                            | Content updates without refresh |

**Pass Criteria:** Firebase listener updates content

### TEST 3.7: Owner Uploads (Max 3)

| Step | Action                        | Expected Result            |
| ---- | ----------------------------- | -------------------------- |
| 1    | Go to Digital Screen settings | In admin                   |
| 2    | Upload 3 custom images        | All upload successfully    |
| 3    | Try to upload 4th             | Blocked with limit message |

**Pass Criteria:** Maximum 3 owner uploads enforced

### TEST 3.8: Upload Expiry (14 Days)

| Step | Action                | Expected Result                             |
| ---- | --------------------- | ------------------------------------------- |
| 1    | Upload a custom image | Note the date                               |
| 2    | Check upload metadata | Has expiry timestamp                        |
| 3    | After 14 days         | Image auto-removed (or test with mock date) |

**Pass Criteria:** Uploads expire after 14 days

---

## Digital Screens Verification Checklist

| Test                  | Status | Notes |
| --------------------- | ------ | ----- |
| 3.1 Screen Loads      | ☐      |       |
| 3.2 Slide Hierarchy   | ☐      |       |
| 3.3 Zero-Blank        | ☐      |       |
| 3.4 Min/Max Slides    | ☐      |       |
| 3.5 Offline Cache     | ☐      |       |
| 3.6 Real-Time Updates | ☐      |       |
| 3.7 Max 3 Uploads     | ☐      |       |
| 3.8 Upload Expiry     | ☐      |       |

---

# FEATURE 4: SOCIAL CONTENT (TODAY TAB)

## What It Does

Shows owner ONE action per day. Generates campaigns based on menu intelligence.

## Where to Test

**Admin:** Sidebar → "Today" tab

## Test Cases

### TEST 4.1: Today Screen Loads

| Step | Action                   | Expected Result         |
| ---- | ------------------------ | ----------------------- |
| 1    | Login to admin           | Dashboard loads         |
| 2    | Click "Today" in sidebar | Today screen appears    |
| 3    | Check for primary card   | Campaign or empty state |

**Pass Criteria:** Today screen renders without errors

### TEST 4.2: Primary Campaign Card

| Step | Action              | Expected Result                      |
| ---- | ------------------- | ------------------------------------ |
| 1    | If campaign exists  | See PrimaryCard component            |
| 2    | Check card content  | Item image, name, action buttons     |
| 3    | Check campaign type | One of 9 types (5 active, 4 passive) |

**Pass Criteria:** Primary card shows relevant campaign

### TEST 4.3: Empty State (Silence)

| Step | Action                          | Expected Result                   |
| ---- | ------------------------------- | --------------------------------- |
| 1    | If no campaign meets confidence | See EmptyState component          |
| 2    | Check message                   | "Nothing urgent today" or similar |
| 3    | No action required              | Silence is valid                  |

**Pass Criteria:** Graceful empty state (not an error)

### TEST 4.4: Campaign Actions

| Step | Action                                    | Expected Result             |
| ---- | ----------------------------------------- | --------------------------- |
| 1    | On PrimaryCard, click "Share to WhatsApp" | WhatsApp share intent opens |
| 2    | Click "Download Poster"                   | Image downloads             |
| 3    | Click "Skip"                              | Campaign dismissed          |

**Pass Criteria:** All action buttons work

### TEST 4.5: Post-Action State

| Step | Action                     | Expected Result          |
| ---- | -------------------------- | ------------------------ |
| 1    | Complete a campaign action | Click "Done"             |
| 2    | See PostActionState        | "Nice work" message      |
| 3    | Check for outcome message  | Non-comparative feedback |

**Pass Criteria:** Post-action feedback shown

### TEST 4.6: Operational Section

| Step | Action                          | Expected Result                         |
| ---- | ------------------------------- | --------------------------------------- |
| 1    | Scroll below primary card       | See secondary campaigns                 |
| 2    | Check for passive campaigns     | "Today's Special", "Weekend Pick", etc. |
| 3    | Verify these are below the fold | Not competing with primary              |

**Pass Criteria:** Operational campaigns show as secondary

### TEST 4.7: Silence Governor

| Step | Action                            | Expected Result            |
| ---- | --------------------------------- | -------------------------- |
| 1    | Complete 4+ actions in 7 days     | Track in test data         |
| 2    | Check for intentional silence     | Some days show empty state |
| 3    | Verify no "always something" trap | System chooses quiet days  |

**Pass Criteria:** Active owners get silence days

---

## Social Content Verification Checklist

| Test                    | Status | Notes |
| ----------------------- | ------ | ----- |
| 4.1 Today Loads         | ☐      |       |
| 4.2 Primary Card        | ☐      |       |
| 4.3 Empty State         | ☐      |       |
| 4.4 Campaign Actions    | ☐      |       |
| 4.5 Post-Action         | ☐      |       |
| 4.6 Operational Section | ☐      |       |
| 4.7 Silence Governor    | ☐      |       |

---

# FEATURE 5: PHYSICAL SURFACES

## What It Does

Generates downloadable tent cards (PDF) and counter stickers (PNG) for printing.

## Where to Test

**Admin:** Today tab → Physical Surfaces section (when eligible)

## Test Cases

### TEST 5.1: Tent Card Eligibility

| Step | Action              | Expected Result             |
| ---- | ------------------- | --------------------------- |
| 1    | Go to Today tab     | Check for Tent Card section |
| 2    | If confidence ≥ 0.7 | Tent Card section visible   |
| 3    | If confidence < 0.7 | Section hidden (not error)  |

**Pass Criteria:** Shows only when confident

### TEST 5.2: Tent Card Download

| Step | Action                     | Expected Result                  |
| ---- | -------------------------- | -------------------------------- |
| 1    | Click "Download Tent Card" | PDF generates                    |
| 2    | Open downloaded PDF        | Valid A6/A5 layout               |
| 3    | Check content              | Item name, QR code, brand footer |

**Pass Criteria:** Valid PDF with correct content

### TEST 5.3: Counter Sticker Eligibility

| Step | Action                     | Expected Result                 |
| ---- | -------------------------- | ------------------------------- |
| 1    | Check confidence threshold | Must be ≥ 0.8                   |
| 2    | If eligible                | Counter Sticker section visible |
| 3    | Higher bar than tent card  | Fewer items qualify             |

**Pass Criteria:** Only ultra-confident items get stickers

### TEST 5.4: Counter Sticker Download

| Step | Action                   | Expected Result          |
| ---- | ------------------------ | ------------------------ |
| 1    | Click "Download Sticker" | PNG generates            |
| 2    | Open downloaded PNG      | 80mm × 80mm at 300dpi    |
| 3    | Check content            | Copy, QR code, item name |

**Pass Criteria:** Valid PNG with correct size

### TEST 5.5: Template Variety

| Step | Action                 | Expected Result           |
| ---- | ---------------------- | ------------------------- |
| 1    | Note the template used | System-selected           |
| 2    | Check template copy    | Matches defined templates |
| 3    | Verify no Template 5   | Banned per spec           |

**Pass Criteria:** Only templates 1-4 used

---

## Physical Surfaces Verification Checklist

| Test                      | Status | Notes |
| ------------------------- | ------ | ----- |
| 5.1 Tent Card Eligibility | ☐      |       |
| 5.2 Tent Card Download    | ☐      |       |
| 5.3 Sticker Eligibility   | ☐      |       |
| 5.4 Sticker Download      | ☐      |       |
| 5.5 Template Variety      | ☐      |       |

---

# FEATURE 6: STAFF PROMPT

## What It Does

Shows ONE sentence for staff to repeat when customers ask "What's good?"

## Where to Test

**Admin:** Today tab → Staff Prompt section (rare appearance)

## Test Cases

### TEST 6.1: Staff Prompt Eligibility (8 Gates)

| Step | Action                            | Expected Result              |
| ---- | --------------------------------- | ---------------------------- |
| 1    | Check primary campaign confidence | Must be ≥ 0.8                |
| 2    | Check item stability              | Must be 10+ days             |
| 3    | Check prior surface validation    | Must have appeared elsewhere |
| 4    | If all gates pass                 | Staff Prompt section visible |

**Pass Criteria:** Only ultra-confident, stable items qualify

### TEST 6.2: Sentence Structure

| Step | Action                | Expected Result                    |
| ---- | --------------------- | ---------------------------------- |
| 1    | Read the prompt text  | "Most people take the {itemName}." |
| 2    | Verify NO variants    | No "Many customers", no "Regulars" |
| 3    | Same structure always | Immutable                          |

**Pass Criteria:** Single sentence structure only

### TEST 6.3: Read-Only Display

| Step | Action                    | Expected Result   |
| ---- | ------------------------- | ----------------- |
| 1    | Check for edit buttons    | NONE should exist |
| 2    | Check for copy buttons    | NONE should exist |
| 3    | Check for "send to staff" | NONE should exist |

**Pass Criteria:** Completely read-only

### TEST 6.4: Inertia Rules

| Step | Action                    | Expected Result       |
| ---- | ------------------------- | --------------------- |
| 1    | Note the item shown today | Record it             |
| 2    | Check tomorrow            | Same item for 3+ days |
| 3    | Check weekly appearances  | Max 2 days per week   |

**Pass Criteria:** Stable, not flickering

### TEST 6.5: Rare Appearance

| Step | Action                         | Expected Result       |
| ---- | ------------------------------ | --------------------- |
| 1    | Track appearances over 10 days | Record each day       |
| 2    | Calculate appearance rate      | < 30% of days         |
| 3    | Silence is normal              | Not showing = correct |

**Pass Criteria:** Authority through scarcity

---

## Staff Prompt Verification Checklist

| Test                   | Status | Notes |
| ---------------------- | ------ | ----- |
| 6.1 8-Gate Eligibility | ☐      |       |
| 6.2 Sentence Structure | ☐      |       |
| 6.3 Read-Only          | ☐      |       |
| 6.4 Inertia Rules      | ☐      |       |
| 6.5 Rare Appearance    | ☐      |       |

---

# CROSS-FEATURE TESTS

## Test A: Confidence Hierarchy

| Surface            | Threshold | Test                                  |
| ------------------ | --------- | ------------------------------------- |
| Campaign (Passive) | 0.3       | Items with 0.3+ appear in operational |
| Campaign (Active)  | 0.6       | Items with 0.6+ become primary        |
| Decision Blocks    | 0.65      | Items with 0.65+ appear in blocks     |
| Digital Screen     | 0.7       | Items with 0.7+ appear on screen      |
| Tent Card          | 0.7       | Items with 0.7+ get tent cards        |
| Counter Sticker    | 0.8       | Items with 0.8+ get stickers          |
| Staff Prompt       | 0.8       | Items with 0.8+ AND 10 days stable    |

**Test:** Verify an item with confidence 0.5 appears in campaigns but NOT on screens.

## Test B: Data Flow

| Step | Action                     | Expected Result                 |
| ---- | -------------------------- | ------------------------------- |
| 1    | Update menu item in editor | Save changes                    |
| 2    | Check Decision Blocks      | Item available status reflected |
| 3    | Check Today tab            | Campaign updated                |
| 4    | Check Digital Screen       | Slide updated                   |

**Pass Criteria:** Changes propagate across all surfaces

## Test C: Multi-Project Fairness

| Step | Action                       | Expected Result                     |
| ---- | ---------------------------- | ----------------------------------- |
| 1    | Store with 2+ projects       | Both have campaigns                 |
| 2    | Track which project features | Over 7 days                         |
| 3    | Verify rotation              | No single project dominates forever |

**Pass Criteria:** Recency decay works

---

# MANUAL SPOT-CHECK SUMMARY

## Before Recording Manual Evidence

| Category       | Item                                 | Status |
| -------------- | ------------------------------------ | ------ |
| **Local gates** | `npm run verify:production-readiness-local` passes immediately before the manual run | ☐      |
| **External gate** | Relevant External Certification Runbook gate is identified | ☐      |
| **Config**     | Feature flags match the target environment and are recorded in audit evidence | ☐      |
| **Environment** | Required provider/Firebase/Vercel credentials are real for the target environment | ☐      |
| **Evidence**   | Exact routes, accounts, devices, and expected results are recorded before testing | ☐      |

## Evidence Sequence

1. Run the relevant local source gates from the External Certification Runbook.
2. Run only the manual checks that match the active external gate.
3. Record evidence in `__docs__/audits/menulist-production-readiness-audit.md`.
4. Keep the gate open if credentials, devices, provider assets, deploy approval, or production-host evidence are missing.
5. Do not use this manual guide to approve Firebase deploys, Vercel deploys, or full production launch.

---

## Test Results Summary

| Feature           | Tests  | Passed | Failed |
| ----------------- | ------ | ------ | ------ |
| Decision Blocks   | 6      | ☐      | ☐      |
| CMI               | 4      | ☐      | ☐      |
| Digital Screens   | 8      | ☐      | ☐      |
| Social Content    | 7      | ☐      | ☐      |
| Physical Surfaces | 5      | ☐      | ☐      |
| Staff Prompt      | 5      | ☐      | ☐      |
| Cross-Feature     | 3      | ☐      | ☐      |
| **TOTAL**         | **38** | ☐      | ☐      |

---

## Manual Evidence Sign-Off

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║  TESTER: ____________________                                                  ║
║  DATE:   ____________________                                                  ║
║                                                                                ║
║  EXTERNAL RUNBOOK GATE: ____________________                                  ║
║                                                                                ║
║  RESULT: [ ] PASSED  [ ] BLOCKED  [ ] FAILED                                  ║
║                                                                                ║
║  AUDIT EVIDENCE LOCATION: ____________________________________________         ║
║                                                                                ║
║  NOTES: _______________________________________________________________        ║
║                                                                                ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

_Testing Guide Generated: January 11, 2026_  
_Version: 1.0.0_
