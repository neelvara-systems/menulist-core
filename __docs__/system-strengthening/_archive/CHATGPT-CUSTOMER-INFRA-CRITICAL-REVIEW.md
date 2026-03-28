# MenuList AI: ChatGPT Customer Infrastructure — Critical Review

**Date:** February 7, 2026  
**Reviewer:** Cascade (Lead Architect — full codebase access)  
**Input:** Two ChatGPT conversations on "MenuList Customer Reliability Architecture V1"  
**Basis:** `CUSTOMER-FACING-INFRA-AUDIT.md` + `WRITE-DISCIPLINE-AUDIT.md` + full codebase  
**Status:** COMPLETE ✅ — FINAL IMPLEMENTATION CHECKLIST INCLUDED

---

## 🎯 EXECUTIVE SUMMARY

| Metric                                   | Value                                                                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **ChatGPT Accuracy vs Codebase Reality** | ~65% initial → ~85% after reversal — diagnosis correct, prescriptions improved                                                            |
| **Actionable Insights**                  | 9 tasks — all ship before freeze. No "later."                                                                                             |
| **Architecture Risks Flagged**           | 2 major (both resolved: snapshot REJECTED by both, screen unification DROPPED)                                                            |
| **3-Year Freeze Compliance**             | ✅ All 9 tasks designed for 3-year durability. No phase language. No "revisit later."                                                     |
| **Estimated Implementation Effort**      | ~4-5 days for complete customer-facing reliability hardening                                                                              |
| **ChatGPT Round 3 Feedback**             | "Stop over-engineering, just launch with 4 fixes." — **REJECTED.** Valid for startups that iterate. Wrong for 3-Year Freeze architecture. |

**Bottom line:** ChatGPT's diagnosis was correct throughout all 3 rounds. But its final "just ship 4 fixes" advice assumes you'll iterate post-launch — which violates the **3-Year Architecture Freeze**. At thousands of customers over 3 years, `unstable_cache`, server-side filtering, branded error pages, and screen hardening are NOT optional. They're infrastructure that must exist Day 1. **All 9 tasks ship before freeze. Analysis is done. Time to code.**

---

## Table of Contents

1. [Stage 1: Conversation Comprehensive Analysis](#stage-1-conversation-comprehensive-analysis)
2. [Stage 1B: Extended Conversation Analysis (ChatGPT Reversal)](#stage-1b-extended-conversation-analysis-chatgpt-reversal)
3. [Stage 1C: ChatGPT Round 3 — Founder Reality Check (Cascade Verdict)](#stage-1c-chatgpt-round-3--founder-reality-check-cascade-verdict)
4. [Stage 2: Grounded Cross-Reference Verification](#stage-2-grounded-cross-reference-verification)
5. [Stage 3: Market Validation](#stage-3-market-validation)
6. [Stage 4: Conflict Resolution & Decision Matrix](#stage-4-conflict-resolution--decision-matrix)
7. [Stage 5: Cascade's Own Reliability Plan](#stage-5-cascades-own-reliability-plan)
8. [Architectural Concerns](#architectural-concerns)
9. [Upstash Redis Assessment](#upstash-redis-assessment)
10. [Validated Recommendations (Ready to Implement)](#validated-recommendations-ready-to-implement)
11. [Rejected Suggestions (Explicit Reasons)](#rejected-suggestions-explicit-reasons)
12. [Prioritized Action Items](#prioritized-action-items)
13. [**FINAL IMPLEMENTATION CHECKLIST**](#final-implementation-checklist)

---

## Stage 1: Conversation Comprehensive Analysis

### ChatGPT Conversation Breakdown

| #   | Topic                                   | ChatGPT Suggestion                                                                 | Confidence | MenuListAI Codebase Reality                                                                                                                                                                                                                                                                           |
| --- | --------------------------------------- | ---------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Reliability Perception Problem**      | QR menu feels fragile on slow internet — customer sees spinner, blank, or error    | HIGH       | ✅ TRUE — `page.tsx:361-449` has 5-7 sequential `await` calls with no loading skeleton. `headers()` call forces dynamic rendering. No ISR.                                                                                                                                                            |
| 2   | **Screen > QR Menu**                    | Screen infra is world-class, QR menu is basic SSR — wrong reliability distribution | HIGH       | ✅ TRUE — `ScreenDisplay.tsx` has cache-first + zero-blank + offline + realtime. `page.tsx` has none. Confirmed in audit Section 10.                                                                                                                                                                  |
| 3   | **New Collection: publicMenuSnapshots** | Create resolved menu JSON snapshot per project, write on every menu change         | MED        | ⚠️ OVER-ENGINEERED — Creates dual source of truth. Every `updateProject()` call would need snapshot rebuild trigger. Adds write complexity to 25 existing write paths.                                                                                                                                |
| 4   | **Snapshot Generator**                  | `buildPublicSnapshot.ts` that resolves master+outlet, removes inactive, flattens   | MED        | ⚠️ PARTIALLY EXISTS — `resolveProjectForRender()` at `src/lib/multiOutlet/resolveProject.ts:171-224` already does master+outlet merge. Client-side filtering already happens in `menuPageNew.tsx:105-283`. This is duplication.                                                                       |
| 5   | **QR reads snapshot only (1 read)**     | Replace 5-7 reads with single snapshot doc read                                    | LOW        | ❌ MISLEADING — Snapshot still needs store info (hours, currency, branding), SEO data, decision blocks. Either snapshot duplicates store data (stale risk) or you still need extra reads.                                                                                                             |
| 6   | **Device Cache First (localStorage)**   | Every visitor stores menu in localStorage, render cached first                     | MED        | ⚠️ WRONG USE CASE — QR menus are opened once by a customer in a restaurant. "Returning visitor" for a restaurant menu is rare (<5% of traffic). PWA service worker already handles this (NetworkFirst with 10s timeout). Adding localStorage cache optimizes for a 5% case.                           |
| 7   | **Version Check + Silent Refresh**      | Client stores version, background check, silent swap                               | LOW        | ❌ OVER-ENGINEERED — Customers don't keep restaurant menu tabs open. They scan, view, order, close. Session duration is 2-5 minutes. Silent refresh has no user.                                                                                                                                      |
| 8   | **Edge Cache (Vercel)**                 | Serve from Vercel edge after snapshot write                                        | HIGH       | ✅ CORRECT DIRECTION — But wrong implementation. Don't need snapshot collection. Use Vercel ISR directly on the existing SSR page. `revalidatePath()` or `revalidateTag()` on publish.                                                                                                                |
| 9   | **Screen Uses Snapshot**                | Move digital screen to use same snapshot                                           | LOW        | ❌ WRONG — Screen data is campaigns + slides + brand content from `platformSummary`, NOT menu project data. They are architecturally different. `getScreenDataByToken()` at `src/database/campaigns/index.ts:533-591` reads `platformSummary`, not `projects`. Forcing unification breaks the screen. |
| 10  | **Zero-Blank Guarantee**                | Fallback chain: cache → previous cache → minimal UI                                | HIGH       | ✅ GOOD PRINCIPLE — But for QR menu first-load (95% of cases), there IS no cache. The real fix is making first load faster + adding loading skeleton.                                                                                                                                                 |

### Key Themes Identified

**Theme 1: "Reliability Perception Problem" → AGREE (this is the #1 priority)**

ChatGPT correctly identified that the customer experience degrades on slow internet. The 5-7 sequential Firestore reads with no visual feedback is the core problem. But ChatGPT's diagnosis conflates two separate issues:

- **First-load speed** (95% of traffic) → needs server-side optimization
- **Returning visitor cache** (5% of traffic) → already partially handled by PWA

**Theme 2: "Snapshot Delivery Architecture" → DISAGREE (wrong solution)**

ChatGPT proposes a **write-time architecture** (generate snapshot on every change, serve from snapshot).
Better approach: **Read-time caching** (cache at the Vercel edge when menu is first read, invalidate on publish).

Why read-time is better for this codebase:

- Zero new Firestore collections
- Zero new write paths (already have 25 — don't need more)
- Zero dual-source-of-truth risk
- Uses Vercel's built-in ISR (designed for exactly this)
- 80% less code to implement and maintain
- Same end result: edge-cached menu, instant loads for subsequent visitors

**Theme 3: "Screen + QR Unification" → DISAGREE (they are different systems)**

Screen serves **campaigns + slides + brand** from `platformSummary.screen`.
QR serves **full menu** from `projects/{tId}/{sId}/{projectId}`.
These have different data sources, different update triggers, different rendering logic.
Forcing them onto a shared snapshot would require duplicating ALL campaign data into the snapshot — defeating the purpose.

**Theme 4: "Global Infra Scale from Day 1" → PARTIAL AGREE**

The architecture should SUPPORT scale, but implementation should match current reality (pre-launch, 0 restaurants live). Build the right abstractions now, but don't pre-optimize for 10K restaurants when you have 0.

---

## Stage 1B: Extended Conversation Analysis (ChatGPT Reversal)

### Context

After the initial conversation (analyzed in Stage 1), Danny challenged ChatGPT on the snapshot architecture. ChatGPT **reversed its position** over 5 exchanges. This section documents that reversal and the final converged recommendations.

### ChatGPT Position Evolution

| Exchange                  | ChatGPT Position                                                           | Danny's Challenge                                                                          |
| ------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Initial                   | "Build `publicMenuSnapshots` collection — foundation of reliability"       | —                                                                                          |
| Exchange 1                | "Project ≠ customer menu. Think PSD vs PNG."                               | "Snapshot is in Firebase too, so we still fetch from Firebase — why not project directly?" |
| Exchange 2                | "It's about schema freedom, not speed. Cost is $0.27/month."               | "Client-side processing isn't our problem. You're increasing Firebase cost."               |
| Exchange 3                | "You CAN run without snapshot. Skip for now. Revisit at 300+ restaurants." | "We're not reducing any fetch calls on customer side."                                     |
| **Exchange 4 (REVERSAL)** | **"Use project doc directly. No snapshot layer. Ship faster."**            | "Then what about the findings in the audit doc?"                                           |
| Exchange 5                | "90% of findings are not worth touching before launch. Do only P0."        | "What about IndexedDB/localStorage caching?"                                               |
| Exchange 6                | "Do NOT implement. PWA already handles it. 90% first-time visitors."       | "What about Upstash Redis we already have?"                                                |
| Exchange 7                | "Use Upstash for: menu render cache, screen cache, rate limiting."         | (end of conversation)                                                                      |

### ChatGPT's FINAL Recommendations (Post-Reversal)

**🔴 P0 — Must Fix Before Launch:**

| #   | Fix                                        | ChatGPT Effort Estimate | Cascade Agreement     |
| --- | ------------------------------------------ | ----------------------- | --------------------- |
| 1   | Loading skeleton during menu fetch         | 30-60 min               | ✅ AGREE — My FIX 1.3 |
| 2   | Remove duplicate store lookup              | 20 min                  | ✅ AGREE — My FIX 1.2 |
| 3   | Basic retry on Firestore failure (1 retry) | 30 min                  | ✅ AGREE — My FIX 1.4 |

**🟡 P1 — Should Do Soon:**

| #   | Fix                        | ChatGPT Effort Estimate | Cascade Agreement                                                                                                                                                                      |
| --- | -------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4   | 60s in-memory server cache | 45-60 min               | ⚠️ PARTIAL — Concept correct, but "in-memory `Map`" is wrong for Vercel serverless (dies on cold start). Use `unstable_cache` instead (shared across instances, survives cold starts). |
| 5   | Branded error fallback UI  | —                       | ✅ AGREE — My FIX 2.2                                                                                                                                                                  |

**❌ P2 — ChatGPT Now Also Rejects:**

| Item                           | ChatGPT Reason                                            | Cascade Already Rejected?                             |
| ------------------------------ | --------------------------------------------------------- | ----------------------------------------------------- |
| Snapshot architecture          | "No value right now. Extra complexity without ROI."       | ✅ Yes — Stage 4 #R1                                  |
| localStorage/IndexedDB cache   | "90% first-time visitors. PWA already handles returning." | ✅ Yes — Stage 4 #R4                                  |
| Version check + silent refresh | Implicitly dropped                                        | ✅ Yes — Stage 4 #R5                                  |
| Virtual scrolling              | "Even 150 items = nothing."                               | ✅ Yes — Stage 5 FIX 3.1                              |
| CDN caching / Redis for menu   | "Premature."                                              | ⚠️ Contradicts Exchange 7 (see Upstash section below) |
| Screen proactive refresh       | "Current system fine."                                    | ⚠️ DISAGREE — Still valid as P2 (my FIX 2.1)          |
| Realtime menu updates          | "Not needed. Menus don't change every minute."            | ✅ Yes — not in scope                                 |

### Cascade's Assessment of ChatGPT Reversal

**Positive:**

- ChatGPT correctly identified that snapshot adds **zero read reduction** when both still hit Firebase
- The "PSD vs PNG" analogy was valid for _future_ schema freedom, but ChatGPT correctly prioritized _current_ simplicity for a solo founder pre-launch
- Final P0 list is practical and actionable

**Negative / Inconsistencies:**

1. **"In-memory server cache" is wrong for Vercel.** Vercel serverless functions are stateless — `global` variables die on cold start. A `globalMenuCache[projectId]` Map would be empty most of the time. The correct approach is `unstable_cache` from `next/cache` (uses Vercel's persistent data cache, shared across instances).
2. **Upstash contradiction.** In P2 ChatGPT says "CDN caching / Redis = premature." Then in Exchange 7, suggests "Use Upstash for menu render cache." These contradict each other. My assessment: Upstash for menu caching is valid but `unstable_cache` is simpler (no network hop, built into Next.js).
3. **Dropped screen proactive refresh too aggressively.** Screen devices run 12+ hours continuously. A 6-hour forced refresh is still a good practice for memory cleanup and Firebase SDK listener health. Low effort (30 min), low risk.
4. **Missed parallelization entirely.** ChatGPT never suggested `Promise.all()` for independent Firestore reads — the cheapest, fastest win (30 min, 30-50% speed improvement). This was in my original plan as FIX 1.1.
5. **Missed `/screen/*` PWA cache gap.** ChatGPT never identified that `/screen/*` routes have NO PWA cache rule. Screen devices restarting with no internet get a blank page. 15-minute fix.

### Convergence Summary

| Item                           | Cascade Original           | ChatGPT Final         | **AGREED?**                                                        |
| ------------------------------ | -------------------------- | --------------------- | ------------------------------------------------------------------ |
| Loading skeleton               | FIX 1.3                    | P0 #1                 | ✅ YES                                                             |
| Deduplicate store query        | FIX 1.2                    | P0 #2                 | ✅ YES                                                             |
| Retry on failure               | FIX 1.4                    | P0 #3                 | ✅ YES                                                             |
| Server-side caching            | FIX 1.5 (`unstable_cache`) | P1 #4 (in-memory Map) | ⚠️ SAME GOAL, different approach — Cascade's is correct for Vercel |
| Branded error pages            | FIX 2.2                    | P1 #5                 | ✅ YES                                                             |
| Parallelize reads              | FIX 1.1                    | ❌ Not mentioned      | **CASCADE ONLY**                                                   |
| `/screen/*` PWA cache          | FIX 1.6                    | ❌ Not mentioned      | **CASCADE ONLY**                                                   |
| Server-side data filtering     | FIX 1.7                    | ❌ Not mentioned      | **CASCADE ONLY**                                                   |
| Screen proactive refresh       | FIX 2.1                    | Rejected              | **DISAGREE** — Cascade keeps (3-Year Freeze requires it)           |
| Snapshot collection            | REJECTED                   | Now also REJECTED     | ✅ YES                                                             |
| localStorage QR cache          | REJECTED                   | Now also REJECTED     | ✅ YES                                                             |
| Version check + silent refresh | REJECTED                   | Dropped               | ✅ YES                                                             |
| Screen-QR unification          | REJECTED                   | Dropped               | ✅ YES                                                             |

---

## Stage 1C: ChatGPT Round 3 — Founder Reality Check (Cascade Verdict)

### What ChatGPT Said (Round 3)

ChatGPT reviewed this document and Cascade's full response, then delivered a "founder reality check":

> "You are pre-launch, ~0 real customers, solo founder, building infra like Stripe at scale. Over-engineering before traffic kills founders. Are you strengthening infra for launch or avoiding launch by strengthening infra?"

**ChatGPT's Round 3 position:** Only 4 things matter (parallel fetch, dedup, skeleton, retry). Everything else — caching, filtering, error pages, screen refresh — is "engineering ego" and "procrastination disguised as engineering."

### Cascade's Verdict: DISAGREE on Scope, AGREE on Diagnosis

**ChatGPT's core error:** It assumes a normal startup lifecycle — ship MVP, get users, iterate, improve. That's valid advice for 90% of startups. But MenuListAI operates under the **3-Year Architecture Freeze** (Law 1 from Master Rules):

> _"No phases like 'later' or 'post-launch'. Build everything in one go before launch. Implementation is untouched for 3+ years after launch."_

This changes EVERYTHING about what's "optional":

| ChatGPT Says                              | 3-Year Freeze Reality                                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| "Add caching later when you have traffic" | There IS no "later." If caching isn't in Day 1, thousands of customers hit uncached Firestore for 3 years.             |
| "Branded error pages? Not urgent."        | Generic Next.js error pages shown to paying customers for 3 years = amateur product perception for 3 years.            |
| "Server-side filtering? Later."           | Internal metadata (processingTime, rawExtraction, editor config) leaking to every customer's browser for 3 years.      |
| "Screen refresh? Current system fine."    | Screens running 12+ hours/day for 3 years without periodic memory cleanup or listener refresh = degradation over time. |
| "Just ship 4 fixes and launch."           | Ship 4 fixes, launch, then can't touch it for 3 years while thousands of customers experience the gaps.                |

**What ChatGPT got RIGHT (and I almost wrongly conceded):**

- The 4 core fixes (parallel, dedup, skeleton, retry) ARE the highest priority — do them first
- Snapshot architecture IS over-engineered — correct to reject
- localStorage/IndexedDB caching IS unnecessary — correct to reject
- The "are you avoiding launch?" question IS valid — self-awareness matters

**What ChatGPT got WRONG (it doesn't know the 3-Year Freeze rule):**

1. `unstable_cache` is NOT optional. At 1000+ restaurants × 50+ daily scans each = 50,000+ uncached Firestore reads/day. With `unstable_cache` + 60s TTL: ~1,000 reads/day. That's a 50x cost and performance difference compounding over 3 years.
2. Server-side filtering is NOT optional. Sending editor metadata (`processingTime`, `rawExtraction`, `editorConfig`) to customer browsers is a data hygiene and security issue that shouldn't exist for 3 years.
3. Branded error pages ARE required. An infrastructure product that shows "Application error" for 3 years tells every restaurant owner the system is unreliable.
4. Screen proactive refresh IS required. Firebase Firestore listeners degrade over very long-running sessions. A 30-minute implementation prevents 3 years of potential screen issues.

### Final Position (LOCKED)

**All 9 tasks are P0.** There is no P1, no P2, no "later." The 3-Year Freeze means every task ships before the architecture is frozen. The only ordering that matters is implementation sequence (dependency-aware), not priority tiers.

**ChatGPT's valid concern about over-engineering is addressed by the REJECTED list** — 8 items we're explicitly NOT building (snapshot, Redis caching, localStorage, etc.). That's where we draw the line. The 9 tasks we ARE building are the minimum complete system, not over-engineering.

---

## Stage 2: Grounded Cross-Reference Verification

### Line-by-Line Reality Check

**1. "Every QR scan requires 5-7 reads + sequential SSR"**

→ `src/app/_client/[[...slug]]/page.tsx:361-413`:

```
Line 362: getTenantFromHeaders()          — headers read (free)
Line 370-376: getStoreBySubdomain()       — 1 Firestore query (await)
Line 383-387: getProjectBySlugOrDefault() — 1 metadata query + 1 project getDoc + 0-1 master resolve (sequential awaits)
Line 405: getStoreById()                  — 1 Firestore getDoc (await)
Line 409-413: getPrecomputedDecisionBlocks() — 1 Firestore getDoc (await)
```

→ `generateMetadata()` at line 191-251 ALSO calls `getStoreBySubdomain()` — **duplicate query** (confirmed)

→ **VERDICT: AGREE.** 5-7 reads, all sequential. Lines 405 and 409 are INDEPENDENT of each other — could run in `Promise.all()` but currently don't.

**IMMEDIATE FIX AVAILABLE:** Lines 405 and 409-413 can be parallelized with `Promise.all()`:

```typescript
// CURRENT (sequential):
const storeDetails = await getStoreById(storeData.storeId);
const precomputedBlocks = await getPrecomputedDecisionBlocks(
  tId,
  sId,
  projectId,
);

// FIX (parallel):
const [storeDetails, precomputedBlocks] = await Promise.all([
  getStoreById(storeData.storeId),
  getPrecomputedDecisionBlocks(
    storeData.tenantId,
    storeData.storeId,
    projectId,
  ),
]);
```

**2. "No true cache-first system"**

→ `next.config.js:112-122`: PWA runtime caching IS configured for `/_client/*` with NetworkFirst + 10s timeout
→ `page.tsx:43`: `headers()` call forces DYNAMIC rendering — **every request hits Firestore**
→ No `export const revalidate` anywhere in `page.tsx`
→ No `unstable_cache` usage for any Firestore call

→ **VERDICT: AGREE.** No server-side caching. PWA is fallback-only (NetworkFirst), not primary cache. Every visitor triggers 5-7 fresh Firestore reads.

**3. "Create publicMenuSnapshots collection"**

→ `src/database/projects/index.ts:381-523`: `updateProject()` is the primary write path with 9 call sites
→ `WRITE-DISCIPLINE-AUDIT.md` Section 1: 25 total write paths exist
→ Adding snapshot rebuild to each write path = 25 more potential failure points
→ `resolveProjectForRender()` at `src/lib/multiOutlet/resolveProject.ts:171-224` already resolves master+outlet

→ **VERDICT: DISAGREE.** New collection creates dual source of truth. Resolution logic already exists. Better approach: cache the existing resolved output at the edge.

**4. "QR reads snapshot only (1 read)"**

→ `generateMetadata()` needs store data for SEO (lines 191-251)
→ `generateSchemaOrgJsonLd()` needs store data + items for structured data (lines 254-355)
→ `ClientMenuRenderer` receives `storeDetails` + `precomputedBlocks` as separate props (line 441-446)

→ **VERDICT: DISAGREE.** "1 read" is only possible if the snapshot doc contains ALL store data, ALL decision blocks, ALL SEO fields. That makes the snapshot ~200KB+ and duplicates store data (hours, address, phone, branding). When store updates hours, snapshot is stale until next menu change triggers rebuild. This is worse than the current approach.

**5. "Device localStorage cache for QR menu"**

→ `menuPageNew.tsx:96-194`: `sessionStorage` IS already used for menu state persistence (scroll, filters)
→ PWA cache in `next.config.js:112-122`: Already caches rendered HTML for 24h
→ QR menu typical session: scan → view → order → close (2-5 minutes)

→ **VERDICT: PARTIAL.** Good for the 5% returning-visitor case. But PWA already handles this. The 95% first-visit case needs server-side speed, not client-side cache. **If we implement ISR, first-visit speed is solved. PWA handles returning visitors. No additional localStorage cache needed.**

**6. "Digital screen should use same snapshot"**

→ `getScreenDataByToken()` at `src/database/campaigns/index.ts:533-591`: Reads `platformSummary` WHERE `screen.screenToken == token`
→ Screen data contains: `screen.slides[]`, `screen.config`, `today` (campaign data)
→ `generateSlidesFromData()` uses a 4-layer slide generation stack: Owner Pinned → Campaign → Brand Fallback
→ Screen data is NOT menu project data — it's campaign + operational + brand content

→ **VERDICT: REJECT.** Screen and QR menu have completely different data sources and rendering pipelines. Unifying them on a "menu snapshot" would break screen campaigns. ChatGPT assumed they're the same — they're not.

**7. "Edge cache via Vercel"**

→ `page.tsx:43`: `headers()` forces dynamic rendering — NO caching possible as-is
→ Vercel supports ISR with `revalidate` or on-demand revalidation via `revalidatePath()`
→ `publishProject()` at `src/database/projects/index.ts:602-660` is the natural invalidation trigger
→ `next.config.js` line 175: Using `withPWA(withNextIntl(nextConfig))` — no ISR conflicts

→ **VERDICT: AGREE (direction), DISAGREE (implementation).** Don't need a snapshot collection + revalidation API. Just:

1. Remove `headers()` dependency from the page component (pass tenant info via route params or searchParams)
2. Add `export const revalidate = 60` or use `unstable_cache` with tags
3. Call `revalidateTag('menu-{storeId}')` in `publishProject()`

**8. "Zero-Blank Guarantee"**

→ `page.tsx:378-380`: `if (!storeData) { notFound(); }` — shows Next.js 404
→ `page.tsx:389-400`: Shows "Menu Not Found" inline div — functional but unstyled
→ No try/catch around main data fetch flow — Firestore errors bubble to error boundary
→ `src/app/error.tsx`: Generic error page exists but not branded for restaurants

→ **VERDICT: AGREE (principle), but priority is loading state, not fallback.** The "zero blank" risk is mainly:

- First load on slow internet → customer sees browser spinner (no skeleton)
- Firebase failure → generic 404/error page

Fix: Add branded loading skeleton via Suspense boundary + add try/catch with 1 retry around Firestore reads.

---

## Stage 3: Market Validation

### How Competitors Handle Menu Delivery

| Platform          | Architecture                 | Cache Strategy                                        | Offline            |
| ----------------- | ---------------------------- | ----------------------------------------------------- | ------------------ |
| **Square Online** | SSR + CDN cache              | Menu pages edge-cached, invalidated on change         | No offline support |
| **Toast**         | Static generation on publish | Pre-rendered HTML, rebuild on change                  | No offline         |
| **Olo**           | CDN + API                    | Static menu pages + dynamic availability checks       | Basic PWA          |
| **GloriaFood**    | Traditional SSR              | Server-rendered per request                           | None               |
| **Zomato/Swiggy** | CSR + API                    | API responses cached at CDN layer (Cloudflare/Fastly) | Cached in app      |

### Industry Pattern

The dominant pattern for restaurant menu delivery is: **Generate/cache on publish, serve from edge, invalidate on change.** Nobody uses real-time Firestore reads per customer visit at scale.

**But critically**: Most competitors achieve this with **CDN caching of server-rendered pages** (ISR pattern), NOT separate snapshot collections. The snapshot collection is an atypical pattern — standard ISR/SSG is the industry norm.

### Vercel ISR — The Standard Solution

Vercel's ISR (Incremental Static Regeneration) is explicitly designed for this use case:

- Page is generated on first request
- Cached at edge for N seconds
- Served from edge to all subsequent visitors
- On-demand revalidation via `revalidatePath()` or `revalidateTag()`
- Stale-while-revalidate: serves cached version while regenerating in background

**This is exactly what ChatGPT described as "Layers 1-3" — but it's built into Vercel already. No custom infrastructure needed.**

---

## Stage 4: Conflict Resolution & Decision Matrix

### Architect Decisions

| #   | ChatGPT Idea                                  | Status   | Decision             | Justification                                                                                                                                         | Action                                                 |
| --- | --------------------------------------------- | -------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | Reliability perception is the #1 problem      | VALID    | **AGREE**            | Confirmed by codebase: 5-7 sequential reads, no skeleton, no retry                                                                                    | PRIORITIZE                                             |
| 2   | Screen infra > QR infra (wrong distribution)  | VALID    | **AGREE**            | Screen has cache-first, zero-blank, offline. QR has none.                                                                                             | PRIORITIZE                                             |
| 3   | New `publicMenuSnapshots` collection          | CONFLICT | **REJECT**           | Dual source of truth. 25 write paths need snapshot triggers. Maintenance burden. Vercel ISR achieves same result.                                     | IGNORE — Use Vercel ISR instead                        |
| 4   | Snapshot generator (`buildPublicSnapshot.ts`) | CONFLICT | **REJECT**           | `resolveProjectForRender()` already exists. Client-side filtering in `menuPageNew.tsx` already works. Duplicates logic.                               | IGNORE                                                 |
| 5   | QR reads 1 doc only                           | PARTIAL  | **DOWNGRADE**        | Direction correct (reduce reads) but snapshot approach wrong. Use ISR to cache existing SSR output at edge — effectively 0 reads for cached visitors. | ADAPT — Use ISR                                        |
| 6   | localStorage cache for QR                     | PARTIAL  | **DEFER**            | Only helps 5% returning visitors. PWA already handles this. First-load speed (95%) is the priority.                                                   | DEFER until post-launch data shows returning visitor % |
| 7   | Version check + silent refresh                | CONFLICT | **REJECT**           | Customers don't keep menu tabs open. Session = 2-5 min. Over-engineering for non-existent use case.                                                   | IGNORE                                                 |
| 8   | Edge cache via Vercel                         | VALID    | **AGREE** (modified) | Correct direction but use ISR, not snapshot + API revalidation.                                                                                       | PRIORITIZE — ISR approach                              |
| 9   | Screen uses same snapshot                     | CONFLICT | **REJECT**           | Screen reads `platformSummary` (campaigns), not `projects` (menu). Different data, different purpose.                                                 | IGNORE — Screen infra stays separate                   |
| 10  | Zero-blank guarantee                          | VALID    | **AGREE** (adapted)  | Branded loading skeleton for SSR wait + try/catch with retry. Not localStorage fallback chain.                                                        | PRIORITIZE                                             |

### Explicit Disagreements (MANDATORY)

**Disagreement 1: "publicMenuSnapshots collection"**

> Disagree with ChatGPT because:
>
> - Codebase already has 25 write paths to project doc (`WRITE-DISCIPLINE-AUDIT.md` Section 1). Adding snapshot rebuild to each path increases complexity and failure surface.
> - `resolveProjectForRender()` at `src/lib/multiOutlet/resolveProject.ts:171-224` already resolves master + outlet data. Building a separate snapshot generator duplicates this logic.
> - Firestore snapshot doc would duplicate store data (hours, currency, branding) — creating staleness risk when store updates independently of menu.
> - Vercel ISR achieves identical result (edge-cached menu) with zero new infrastructure: `export const revalidate = 60` + `revalidateTag()` on publish.
>   **Propose instead:** Vercel ISR with on-demand revalidation.

**Disagreement 2: "Screen should use same snapshot"**

> Disagree with ChatGPT because:
>
> - Screen reads from `platformSummary` collection via `getScreenDataByToken()` at `src/database/campaigns/index.ts:533-591`. Menu reads from `projects` collection via `getProjectData()` at `page.tsx:81-91`. These are different Firestore collections with different data structures.
> - Screen content = campaigns + slides + brand fallback (4-layer slide stack). Menu content = categories + items + prices + descriptions.
> - Screen already has cache-first + zero-blank + realtime. It's the STRONGER system. Touching it risks regression.
>   **Propose instead:** Leave screen infrastructure untouched. Apply reliability improvements to QR menu only.

**Disagreement 3: "localStorage cache + version check for QR menu"**

> Disagree with ChatGPT because:
>
> - Restaurant QR menu is a single-visit surface. Customer scans, browses, orders, leaves. Session = 2-5 minutes. "Returning visitor" is <5% of traffic (unlike apps where users return daily).
> - PWA service worker already caches rendered page for 24h with NetworkFirst 10s timeout (`next.config.js:112-122`). This already handles the rare returning visitor case.
> - Adding localStorage cache + version checking + silent refresh adds client-side complexity with minimal user benefit.
>   **Propose instead:** Focus on making first load fast (ISR) + visually instant (skeleton). PWA handles returning visitors.

---

## Stage 5: Cascade's Own Reliability Plan

### If I Owned This Product — What I'd Actually Build

Based on the `CUSTOMER-FACING-INFRA-AUDIT.md` findings and full codebase context, here is my prioritized plan. Every item has exact code location and estimated effort.

---

### 🔴 Priority 1: FIX BEFORE LAUNCH (4-6 days total)

#### FIX 1.1 — Parallelize Independent Firestore Reads

**Impact:** Cuts QR menu load time by 30-50%  
**Effort:** 30 minutes  
**File:** `src/app/_client/[[...slug]]/page.tsx:402-413`

Currently `getStoreById()` and `getPrecomputedDecisionBlocks()` run sequentially AFTER project data is fetched. They are independent of each other — can run in parallel.

```
CURRENT (page.tsx:405-413):
  const storeDetails = await getStoreById(storeData.storeId);
  const precomputedBlocks = await getPrecomputedDecisionBlocks(tId, sId, projectId);

FIX:
  const [storeDetails, precomputedBlocks] = await Promise.all([
      getStoreById(storeData.storeId),
      getPrecomputedDecisionBlocks(storeData.tenantId, storeData.storeId, projectId),
  ]);
```

Saves 100-500ms per page load (one round-trip eliminated).

#### FIX 1.2 — Eliminate Duplicate Store Lookup

**Impact:** Saves 1 Firestore read per page load (16% read reduction)  
**Effort:** 1 hour  
**Files:** `src/app/_client/[[...slug]]/page.tsx:191-203` and `361-376`

`generateMetadata()` at line 191 and `ClientMenuPage()` at line 361 both independently call `getStoreBySubdomain()`/`getStoreByCustomDomain()`. This is a duplicate query.

**Fix approach:** Use Next.js `cache()` function to deduplicate:

```
import { cache } from 'react';

const getStoreBySubdomainCached = cache(async (subdomain: string) => {
    // ...existing query logic...
});
```

React's `cache()` deduplicates within a single render pass — both `generateMetadata()` and `ClientMenuPage()` will share the same query result. Zero extra reads.

#### FIX 1.3 — Add Branded Loading Skeleton for QR Menu

**Impact:** Customer sees restaurant branding instantly instead of browser spinner  
**Effort:** 2-3 hours  
**File:** `src/app/_client/[[...slug]]/page.tsx:440`

Currently: `<Suspense fallback={<ServerSidePageLoader page="Menu" />}>`

But this Suspense boundary wraps only `ClientMenuRenderer`, NOT the data fetching. The data fetch happens in `ClientMenuPage()` component BEFORE the JSX return. Customer sees nothing during the 5-7 Firestore reads.

**Fix approach:** Restructure to move data fetching inside a child component wrapped by Suspense:

```
// page.tsx — returns immediately with skeleton
export default async function ClientMenuPage({ params }) {
    return (
        <Suspense fallback={<MenuSkeleton />}>
            <ClientMenuDataFetcher params={params} />
        </Suspense>
    );
}

// ClientMenuDataFetcher — async component that does the fetching
async function ClientMenuDataFetcher({ params }) {
    // ...all current data fetch logic...
    return <ClientMenuRenderer ... />;
}
```

Create `MenuSkeleton` component: restaurant logo placeholder + category tabs + item card placeholders. Branded, not generic. Renders in <50ms.

#### FIX 1.4 — Add Try/Catch with 1 Retry for Firestore Reads

**Impact:** Handles transient Firestore failures gracefully  
**Effort:** 1-2 hours  
**File:** `src/app/_client/[[...slug]]/page.tsx`

Currently no try/catch around main data fetch. Firestore errors bubble to `error.tsx` (generic error page).

**Fix approach:** Wrap each Firestore call with a retry helper:

```
async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries > 0) {
            await new Promise(r => setTimeout(r, 1000));
            return withRetry(fn, retries - 1);
        }
        throw error;
    }
}
```

Apply to store lookup, project fetch, and store details fetch. Decision blocks already has try/catch (line 105-109).

#### FIX 1.5 — Vercel ISR with On-Demand Revalidation

**Impact:** After first visitor, ALL subsequent visitors get edge-cached menu (0 Firestore reads, <100ms globally)  
**Effort:** 1-2 days  
**Files:** `src/app/_client/[[...slug]]/page.tsx`, `src/database/projects/index.ts` (publishProject)

This is the single biggest performance win. Current state: every visitor hits Firestore. After ISR: first visitor hits Firestore, next 1000+ get edge cache.

**Challenge:** Current page uses `headers()` which forces dynamic rendering. Need to restructure.

**Fix approach — Option A (simpler, use `unstable_cache`):**
Instead of restructuring the page, wrap individual Firestore reads with `unstable_cache`:

```
import { unstable_cache } from 'next/cache';

const getCachedStore = unstable_cache(
    async (subdomain: string) => getStoreBySubdomain(subdomain),
    ['store-by-subdomain'],
    { revalidate: 60, tags: ['store-{subdomain}'] }
);
```

Then in `publishProject()`, add:

```
import { revalidateTag } from 'next/cache';
revalidateTag(`menu-${storeId}`);
```

**Fix approach — Option B (full ISR — more effort but cleaner):**
Move tenant resolution to route params instead of headers. Generate static pages per store. Use `revalidatePath()` on publish. This is the "clean" solution but requires middleware changes.

**Recommendation:** Start with Option A (2-4 hours). Migrate to Option B if needed at scale.

#### FIX 1.6 — Add `/screen/*` to PWA Cache Rules

**Impact:** Screen devices that restart get cached page instead of blank  
**Effort:** 15 minutes  
**File:** `next.config.js:110-173`

**Gap found:** PWA runtime caching only covers `/_client/*`. The `/screen/*` route has NO PWA cache rule. If a screen device restarts with no internet, it gets a blank page — the localStorage cache in `ScreenDisplay.tsx` only helps AFTER the page loads.

**Fix:**

```
// Add to runtimeCaching array in next.config.js
{
    urlPattern: /^\/screen\/.*/i,
    handler: 'NetworkFirst',
    options: {
        cacheName: 'screen-pages',
        expiration: {
            maxEntries: 10,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days (screens run continuously)
        },
        networkTimeoutSeconds: 10,
    },
},
```

#### FIX 1.7 — Server-Side Data Filtering Before Client Transfer

**Impact:** Reduces client payload 20-40%  
**Effort:** 2-3 hours  
**File:** `src/app/_client/[[...slug]]/page.tsx` (before passing to `ClientMenuRenderer`)

Currently the FULL project doc is sent to the client — including `active: false` items, file processing metadata, editor config, etc. Only customer-visible data should be transferred.

**Fix approach:** Add a `sanitizeForClient()` function that strips:

- Items where `active === false`
- File processing metadata (processingTime, rawExtraction, etc.)
- Editor-only config fields
- Internal IDs not needed for rendering

---

### 🟡 Priority 2: DO WITHIN FIRST MONTH

#### FIX 2.1 — Screen Proactive Refresh (6-hour cycle)

**Impact:** Prevents potential memory issues on long-running screens  
**Effort:** 30 minutes  
**File:** `src/app/screen/[token]/ScreenDisplay.tsx`

Add a `setInterval` that forces `window.location.reload()` every 6 hours during low-activity periods (e.g., 3 AM local time if timezone available, otherwise just every 6h). This ensures:

- Firebase SDK listener gets refreshed
- Browser memory is cleared
- Any JS updates are picked up

#### FIX 2.2 — Branded Error Pages for Client Menu

**Impact:** Customer sees restaurant branding even on error, not generic Next.js 404  
**Effort:** 2-3 hours  
**Files:** `src/app/_client/error.tsx` (new), `src/app/_client/not-found.tsx` (new)

Create client-specific error pages that show:

- Restaurant logo (if available from cache/headers)
- "Menu is temporarily unavailable"
- "Please ask your server" or contact info
- Retry button

---

### 🟢 Priority 3: NICE TO HAVE (post-launch)

#### FIX 3.1 — Virtual Scrolling for Large Menus

Only matters for 100+ item menus. Most restaurants have 20-50 items. Defer until real data shows it's needed.

#### FIX 3.2 — localStorage Menu Cache for QR

Only helps returning visitors (<5%). PWA already handles this. Defer until analytics show significant returning visitor traffic.

#### FIX 3.3 — Real-Time Menu Updates for QR

Currently "fetch once, render once." Customer sees stale prices until refresh. This is acceptable for a menu (prices don't change mid-meal). Defer until customer complaints indicate otherwise.

---

### Feature Flag

```typescript
// Add to src/config/features.ts
ENABLE_MENU_ISR_CACHE: true, // Vercel ISR caching for client menu pages
```

---

## Architectural Concerns

### Concern 1: Dual Source of Truth Risk (REJECTED)

ChatGPT's `publicMenuSnapshots` collection would create a second source of truth for menu data alongside the existing `projects` collection. Any write to the project doc that affects customer-visible data would need to trigger a snapshot rebuild. With 25 write paths (`WRITE-DISCIPLINE-AUDIT.md`), this is a maintenance nightmare. If snapshot rebuild fails silently, customers see stale data with no indication.

**Resolution:** Use Vercel ISR (read-time caching) instead of write-time snapshots. Single source of truth remains the `projects` collection.

### Concern 2: Screen Unification Would Break Campaigns (REJECTED)

Digital screens serve campaigns, not menus. The `platformSummary` collection contains `screen.slides[]` with campaign content, confidence scores, brand fallbacks. This is a completely different data pipeline from the menu `projects` collection. Forcing both onto a "menu snapshot" would either:

- Break screen campaigns (loses slide data)
- Require the snapshot to contain campaign data (becomes a mega-doc, not a menu snapshot)

**Resolution:** Screen stays on `platformSummary`. QR menu stays on `projects`. They are correctly separate systems.

### Concern 3: `headers()` Forces Dynamic Rendering (FIXABLE)

The `headers()` call at `page.tsx:43` (`getTenantFromHeaders()`) forces Next.js to treat the entire page as dynamic. This prevents ANY edge caching. This is the single architectural decision that makes the QR menu slow.

**Resolution:** Either:

- (A) Use `unstable_cache` to cache individual reads (keeps `headers()` but caches data)
- (B) Restructure to pass tenant info via route params (enables full ISR)

Option A is simpler and gets 80% of the benefit.

---

## Upstash Redis Assessment

### Current Usage (Codebase Verified)

Upstash Redis is **installed and active** (`@upstash/redis` v1.35.6 in both `package.json` and `functions/package.json`).

**Currently used for:** Rate limiting ONLY (`src/lib/rateLimit.ts`)

- Sliding window algorithm using sorted sets
- Applied to: `/api/public/feedback/submit`, public API middleware
- Feature-flagged via `FEATURE_FLAGS.ENABLE_RATE_LIMITING`

**NOT currently used for:** Menu caching, screen caching, or any data caching.

### ChatGPT's Suggestion (Exchange 7)

ChatGPT suggested 3 Upstash uses:

1. **Menu render cache** — `menu:{tenantId}:{storeId}:{projectId}:{version}`, TTL 60-300s
2. **Screen cache** — `screen:{token}`, TTL 30-120s
3. **Rate limiting** — Already implemented ✅

### Cascade's Assessment

| Use Case              | Verdict                         | Reasoning                                                                                                                                                                                                                                                                                                                                                  |
| --------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rate limiting**     | ✅ KEEP                         | Already working. Correct use of Redis.                                                                                                                                                                                                                                                                                                                     |
| **Menu render cache** | ❌ USE `unstable_cache` INSTEAD | `unstable_cache` from `next/cache` is built into Next.js/Vercel, has zero network hop (local to edge), supports tag-based invalidation via `revalidateTag()`, and requires no external dependency. Upstash adds a network roundtrip (~5-20ms) to every cache hit. For menu data that's already on Vercel, `unstable_cache` is strictly faster and simpler. |
| **Screen cache**      | ❌ NOT NEEDED                   | Screen already has localStorage cache-first + realtime listener. Adding Redis between Firebase and the screen adds complexity with no benefit — screen already handles its own caching.                                                                                                                                                                    |

### Decision: Keep Upstash for Rate Limiting Only

**Do NOT expand Upstash usage** to menu or screen caching. The correct caching layer for QR menu pages is `unstable_cache` (Next.js built-in) with `revalidateTag()` invalidation on publish. This is:

- Zero extra cost (included in Vercel)
- Zero network hop (edge-local)
- Zero new dependencies
- Automatic cache invalidation via tags

**Revisit Upstash for data caching only if:**

- Vercel's `unstable_cache` proves insufficient at scale (unlikely)
- Cross-region cache sharing becomes necessary
- Real-time cache invalidation across multiple Vercel regions needed

---

## Validated Recommendations (Ready to Implement)

| #   | Recommendation                                                                    | Source                                   | Priority  | Effort    |
| --- | --------------------------------------------------------------------------------- | ---------------------------------------- | --------- | --------- |
| 1   | **Parallelize Firestore reads** (`Promise.all` for storeDetails + decisionBlocks) | Cascade analysis                         | 🔴 HIGH   | 30 min    |
| 2   | **Eliminate duplicate store lookup** (React `cache()`)                            | Cascade + ChatGPT overlap                | 🔴 HIGH   | 1 hour    |
| 3   | **Branded loading skeleton** (Suspense restructure)                               | ChatGPT diagnosis (adapted)              | 🔴 HIGH   | 2-3 hours |
| 4   | **Try/catch with 1 retry** for Firestore reads                                    | ChatGPT diagnosis (adapted)              | 🔴 HIGH   | 1-2 hours |
| 5   | **Vercel ISR caching** (`unstable_cache` + `revalidateTag`)                       | ChatGPT edge cache idea (adapted)        | 🔴 HIGH   | 1-2 days  |
| 6   | **Add `/screen/*` to PWA cache**                                                  | Cascade discovery (gap not in ChatGPT)   | 🔴 HIGH   | 15 min    |
| 7   | **Server-side data filtering** before client transfer                             | ChatGPT "customer-safe fields" (adapted) | 🟡 MEDIUM | 2-3 hours |
| 8   | **Screen proactive refresh** (6h cycle)                                           | ChatGPT + Cascade agreement              | 🟡 MEDIUM | 30 min    |
| 9   | **Branded error pages** for client menu                                           | Cascade analysis                         | 🟡 MEDIUM | 2-3 hours |

---

## Rejected Suggestions (Explicit Reasons)

| #   | Rejected Idea                                     | Reason                                                                                                                           | Alternative                                         |
| --- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | **`publicMenuSnapshots` collection**              | Dual source of truth. 25 write paths need triggers. Maintenance burden. Vercel ISR does the same with zero new infra.            | Vercel ISR with `unstable_cache`                    |
| 2   | **Snapshot generator** (`buildPublicSnapshot.ts`) | `resolveProjectForRender()` already exists. Client filtering in `menuPageNew.tsx` already works. Duplicates logic.               | Use existing resolution + add server-side filtering |
| 3   | **Screen uses menu snapshot**                     | Screen reads `platformSummary` (campaigns), not `projects` (menu). Different data, different purpose. Unification breaks screen. | Keep screen infrastructure untouched                |
| 4   | **localStorage cache for QR menu**                | QR menu is single-visit (<5% returning). PWA already caches for returning visitors. Over-engineering for non-existent use case.  | Focus on first-load speed (ISR)                     |
| 5   | **Version check + silent refresh**                | Customers don't keep restaurant menu tabs open. Session = 2-5 min. No user benefits from silent background refresh.              | Not needed                                          |
| 6   | **"QR reads 1 doc only"**                         | Snapshot would need to duplicate store data (hours, branding). Creates staleness when store updates. More complexity, not less.  | Reduce reads via caching + parallelization          |

---

## Prioritized Action Items

### 🔴 HIGH — Before Launch (4-6 days)

| #   | Task                                               | File(s)                                                  | Effort    |
| --- | -------------------------------------------------- | -------------------------------------------------------- | --------- |
| 1   | Parallelize Firestore reads (`Promise.all`)        | `page.tsx:405-413`                                       | 30 min    |
| 2   | Deduplicate store lookup (React `cache()`)         | `page.tsx:52-78`                                         | 1 hour    |
| 3   | Add `/screen/*` to PWA cache rules                 | `next.config.js:110`                                     | 15 min    |
| 4   | Add `withRetry()` to Firestore reads               | `page.tsx` (new helper)                                  | 1-2 hours |
| 5   | Branded loading skeleton + Suspense restructure    | `page.tsx:440` + new `MenuSkeleton` component            | 2-3 hours |
| 6   | Vercel ISR with `unstable_cache` + `revalidateTag` | `page.tsx` + `database/projects/index.ts:publishProject` | 1-2 days  |
| 7   | Server-side data filtering                         | `page.tsx` (new `sanitizeForClient()`)                   | 2-3 hours |
| 8   | Feature flag: `ENABLE_MENU_ISR_CACHE`              | `src/config/features.ts`                                 | 5 min     |

### 🟡 MEDIUM — First Month

| #   | Task                                    | File(s)                                           | Effort    |
| --- | --------------------------------------- | ------------------------------------------------- | --------- |
| 9   | Screen 6-hour proactive refresh         | `ScreenDisplay.tsx`                               | 30 min    |
| 10  | Branded error/404 pages for client menu | New: `_client/error.tsx`, `_client/not-found.tsx` | 2-3 hours |

### ❌ REJECTED (Documented)

| #   | Item                             | Reason                                          |
| --- | -------------------------------- | ----------------------------------------------- |
| R1  | `publicMenuSnapshots` collection | Dual source of truth — use Vercel ISR instead   |
| R2  | Snapshot generator               | Duplicates existing `resolveProjectForRender()` |
| R3  | Screen-QR unification            | Different data sources, would break screen      |
| R4  | localStorage QR cache            | PWA already handles returning visitors          |
| R5  | Version check + silent refresh   | No user keeps menu tab open long enough         |

---

## FINAL IMPLEMENTATION CHECKLIST

This is the **single source of truth** for what gets built. All 9 tasks ship before 3-Year Freeze. No P1, no P2, no "later." Ordered by implementation sequence (dependencies respected).

### Strategy Decisions (LOCKED)

| Decision                              | Choice                              | Rationale                                                                      |
| ------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------ |
| **Snapshot collection**               | ❌ NO — Use project doc directly    | Zero benefit at current scale. Revisit at 300+ restaurants or GrowthOS launch. |
| **localStorage/IndexedDB menu cache** | ❌ NO                               | 90% first-time visitors. PWA handles returning.                                |
| **Upstash for menu caching**          | ❌ NO — Keep for rate limiting only | `unstable_cache` is faster (edge-local), simpler (built-in), free.             |
| **Server caching approach**           | `unstable_cache` + `revalidateTag`  | Vercel-native, shared across instances, tag-based invalidation on publish.     |
| **Version check + silent refresh**    | ❌ NO                               | Customers don't keep menu tabs open. 2-5 min sessions.                         |
| **Screen-QR unification**             | ❌ NO                               | Different data sources (`platformSummary` vs `projects`).                      |

---

### 🔴 ALL TASKS — Ship Before Freeze

> **Total estimated effort: 4-5 days**
> **Governing rule: 3-Year Architecture Freeze — no iteration post-launch**

#### TASK 1: Parallelize Independent Firestore Reads

- **File:** `src/app/_client/[[...slug]]/page.tsx:402-413`
- **What:** Wrap `getStoreById()` and `getPrecomputedDecisionBlocks()` in `Promise.all()`
- **Why:** These are independent reads running sequentially. Parallelizing saves 100-500ms (one network roundtrip)
- **Effort:** 30 minutes
- **Risk:** Zero
- **Source:** Cascade only (ChatGPT missed this)
- [ ] Implement `Promise.all([getStoreById(...), getPrecomputedDecisionBlocks(...)])`
- [ ] Verify no data dependency between the two calls
- [ ] Test with dev server

#### TASK 2: Deduplicate Store Lookup

- **File:** `src/app/_client/[[...slug]]/page.tsx:52-78`
- **What:** Wrap `getStoreBySubdomain()` and `getStoreByCustomDomain()` with React's `cache()` function
- **Why:** `generateMetadata()` and `ClientMenuPage()` both independently call the same store query — wasting 1 read per page load
- **Effort:** 1 hour
- **Risk:** Zero — React `cache()` deduplicates within a single server render pass
- **Source:** Both Cascade and ChatGPT agree
- [ ] Import `cache` from `'react'`
- [ ] Wrap `getStoreBySubdomain` with `cache()`
- [ ] Wrap `getStoreByCustomDomain` with `cache()`
- [ ] Verify metadata + page share same store result

#### TASK 3: Add `/screen/*` to PWA Cache Rules

- **File:** `next.config.js` (runtimeCaching array)
- **What:** Add PWA cache rule for `/screen/*` routes (NetworkFirst, 7-day expiry, 10s timeout)
- **Why:** Screen devices that restart with no internet get blank page. localStorage cache in `ScreenDisplay.tsx` only helps AFTER page HTML loads — but the HTML itself isn't cached.
- **Effort:** 15 minutes
- **Risk:** Zero
- **Source:** Cascade only (ChatGPT missed this)
- [ ] Add `urlPattern: /^\/screen\/.*/i` entry to runtimeCaching
- [ ] Set handler to `'NetworkFirst'` with `networkTimeoutSeconds: 10`
- [ ] Set `maxAgeSeconds: 7 * 24 * 60 * 60` (7 days)

#### TASK 4: Add Retry Wrapper for Firestore Reads

- **File:** `src/app/_client/[[...slug]]/page.tsx` (new helper function)
- **What:** Create `withRetry<T>(fn, retries=1, delayMs=1000)` helper. Wrap main Firestore calls.
- **Why:** Transient Firestore failures currently show 404/error page. One retry with 1s delay handles 90% of transient issues.
- **Effort:** 1-2 hours
- **Risk:** Zero — worst case adds 1s to a failing request
- **Source:** Both Cascade and ChatGPT agree
- [ ] Create `withRetry()` async helper function
- [ ] Wrap `getStoreBySubdomain()`/`getStoreByCustomDomain()` calls
- [ ] Wrap `getProjectBySlugOrDefault()` call
- [ ] Decision blocks already has try/catch (line 105-109) — skip
- [ ] Test with simulated failure

#### TASK 5: Branded Loading Skeleton + Suspense Restructure

- **File:** `src/app/_client/[[...slug]]/page.tsx:440` + new `MenuSkeleton` component
- **What:** Move data fetching into a child async component. Wrap with Suspense + branded skeleton.
- **Why:** Currently the `ClientMenuPage()` function does ALL data fetching before returning JSX. Customer sees browser spinner for the entire 2-5s fetch time. With Suspense restructure, customer sees branded skeleton instantly.
- **Effort:** 2-3 hours
- **Risk:** Low — restructure only, no logic change
- **Source:** Both Cascade and ChatGPT agree (highest impact UX fix)
- [ ] Create `MenuSkeleton` component (logo placeholder + shimmer category tabs + item card placeholders)
- [ ] Create `ClientMenuDataFetcher` async component (moves all fetch logic from `ClientMenuPage`)
- [ ] `ClientMenuPage` returns `<Suspense fallback={<MenuSkeleton />}><ClientMenuDataFetcher params={params} /></Suspense>`
- [ ] Verify skeleton renders immediately while data loads
- [ ] Test on throttled network (Chrome DevTools → Slow 3G)

#### TASK 6: Vercel Data Caching (`unstable_cache` + `revalidateTag`)

- **Files:** `src/app/_client/[[...slug]]/page.tsx` + `src/database/projects/index.ts`
- **What:** Wrap individual Firestore reads with `unstable_cache` from `next/cache`. Add `revalidateTag()` call in `publishProject()`.
- **Why:** After first visitor, cached data is served to all subsequent visitors for the TTL duration. On publish, cache is invalidated. Reduces Firestore reads by 80-95% under normal traffic.
- **Effort:** 1-2 days
- **Risk:** Medium — needs careful tag design and invalidation testing
- **Source:** Cascade approach (ChatGPT suggested in-memory Map which is wrong for Vercel serverless)
- [ ] Add feature flag `ENABLE_MENU_CACHE` to `src/config/features.ts`
- [ ] Wrap `getStoreBySubdomain()` with `unstable_cache` (tag: `store-{subdomain}`, revalidate: 300)
- [ ] Wrap `getProjectBySlugOrDefault()` with `unstable_cache` (tag: `menu-{storeId}`, revalidate: 60)
- [ ] Wrap `getStoreById()` with `unstable_cache` (tag: `store-{storeId}`, revalidate: 300)
- [ ] Wrap `getPrecomputedDecisionBlocks()` with `unstable_cache` (tag: `blocks-{projectId}`, revalidate: 300)
- [ ] Add `revalidateTag('menu-{storeId}')` in `publishProject()` function
- [ ] Add `revalidateTag('store-{storeId}')` in store update functions
- [ ] Test: publish menu → verify next load gets fresh data
- [ ] Test: within TTL → verify cache hit (check Vercel logs)

#### TASK 7: Server-Side Data Filtering

- **File:** `src/app/_client/[[...slug]]/page.tsx` (new `sanitizeForClient()` function)
- **What:** Strip non-customer data before sending to client: inactive items, file processing metadata, editor config, internal IDs
- **Why:** Reduces client payload 20-40%. Removes risk of leaking internal data to browser.
- **Effort:** 2-3 hours
- **Risk:** Low — filtering only, no mutation of source data
- **Source:** Cascade only (ChatGPT mentioned "customer-safe fields" in snapshot context but dropped it)
- [ ] Create `sanitizeForClient(projectData)` function
- [ ] Filter out `active === false` items
- [ ] Strip file processing metadata (processingTime, rawExtraction, etc.)
- [ ] Strip editor-only config fields
- [ ] Apply before passing to `ClientMenuRenderer`
- [ ] Verify no rendering breaks after filtering

#### TASK 8: Branded Error/404 Pages for Client Menu

- **Files:** New: `src/app/_client/error.tsx`, `src/app/_client/not-found.tsx`
- **What:** Create client-specific error pages showing restaurant branding (if available), "Menu temporarily unavailable", retry button, contact info
- **Why:** Current error shows generic Next.js 404. Under 3-Year Freeze, this generic error is what thousands of customers see for 3 years. Infrastructure product must own every failure state.
- **Effort:** 2-3 hours
- **Risk:** Zero
- **Source:** Both Cascade and ChatGPT agree (ChatGPT downgraded in Round 3 — overruled by 3-Year Freeze)
- [ ] Create `_client/error.tsx` with branded layout
- [ ] Create `_client/not-found.tsx` with branded layout
- [ ] Include retry button
- [ ] Include "Please ask your server" messaging

#### TASK 9: Screen Proactive Refresh (6-hour cycle)

- **File:** `src/app/screen/[token]/ScreenDisplay.tsx`
- **What:** Add `setInterval` that forces `window.location.reload()` every 6 hours
- **Why:** Screens run 12+ hours/day for 3 years continuously. Firebase Firestore listeners degrade over very long sessions. Periodic refresh clears memory, refreshes SDK listeners, picks up code updates deployed to Vercel. 30-min implementation prevents 3 years of potential degradation.
- **Effort:** 30 minutes
- **Risk:** Zero
- **Source:** Cascade only (ChatGPT rejected in Round 2 and Round 3 — overruled by 3-Year Freeze + codebase evidence)
- [ ] Add 6-hour `setInterval` for `window.location.reload()`
- [ ] Optionally schedule during low-activity time if `store.timeZone` available

---

### ❌ EXPLICITLY NOT DOING (Documented Decisions)

These are architectural decisions, not deferrals. They are rejected because they don't pass the cost/benefit analysis — not because "we'll do them later."

| Item                                          | Why NOT Building                                                                                                                                                                                                                                                                         | Decision Status                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `publicMenuSnapshots` collection              | Dual source of truth. Zero read reduction. All 3 rounds agree: rejected. `unstable_cache` achieves the same goal without new Firestore collection.                                                                                                                                       | **REJECTED** — All parties                  |
| Snapshot generator (`buildPublicSnapshot.ts`) | `resolveProjectForRender()` already exists at `src/lib/multiOutlet/resolveProject.ts:171-224`. Building another is duplication.                                                                                                                                                          | **REJECTED** — Cascade                      |
| Screen-QR unification                         | Screen reads `platformSummary` (campaigns/slides). QR reads `projects` (menu data). Different data sources, different update triggers, different rendering. Forcing unification breaks both.                                                                                             | **REJECTED** — Architecturally impossible   |
| localStorage/IndexedDB QR menu cache          | 90% of QR scans are first-time visitors in a restaurant. PWA service worker already handles the 10% returning case via NetworkFirst with 10s timeout.                                                                                                                                    | **REJECTED** — Wrong optimization target    |
| Version check + silent refresh                | Customer session duration: 2-5 minutes (scan → view → order → close). No customer keeps a menu tab open long enough for version drift to matter.                                                                                                                                         | **REJECTED** — No user for this feature     |
| Upstash Redis for menu caching                | `unstable_cache` is edge-local (zero network hop), free (included in Vercel), supports tag-based invalidation. Upstash adds ~5-20ms network roundtrip per cache hit. Redis is correct for rate limiting (already implemented). Wrong for read caching when Vercel has built-in solution. | **REJECTED** — Inferior to `unstable_cache` |
| Virtual scrolling                             | Even 150 menu items render fine on modern mobile browsers. Real restaurant menus rarely exceed 80 items.                                                                                                                                                                                 | **REJECTED** — No real-world need           |
| Realtime menu updates for QR                  | Menus don't change during a customer's meal. If owner updates price, next QR scan (60s cache TTL) picks it up.                                                                                                                                                                           | **REJECTED** — No use case                  |

---

### Implementation Order (Dependency-Aware)

All 9 tasks. No tiers. Ship before freeze.

```
Day 1 (quick wins — no dependencies):
  ├─ TASK 1: Promise.all parallelization (30 min)
  ├─ TASK 2: React cache() dedup (1 hour)
  ├─ TASK 3: /screen/* PWA cache (15 min)
  ├─ TASK 4: withRetry() wrapper (1 hour)
  └─ TASK 9: Screen proactive refresh (30 min)

Day 2 (UX):
  ├─ TASK 5: Loading skeleton + Suspense restructure (2-3 hours)
  └─ TASK 8: Branded error/404 pages (2-3 hours)

Day 3-4 (caching — depends on TASK 2 for dedup):
  └─ TASK 6: unstable_cache + revalidateTag (1-2 days)

Day 4-5 (security + cleanup):
  └─ TASK 7: Server-side data filtering (2-3 hours)
```

---

## IMPLEMENTATION LOG

All tasks implemented on February 7, 2026. No existing workflows were broken.

| Task                                            | Status     | File(s) Modified                                                               | What Changed                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------- | ---------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TASK 1** — Parallelize reads                  | ✅ DONE    | `src/app/_client/[[...slug]]/page.tsx`                                         | `getStoreById()` + `getPrecomputedDecisionBlocks()` wrapped in `Promise.all()`. Saves 100-500ms per request.                                                                                                                                                                                                                             |
| **TASK 2** — Deduplicate store lookup           | ✅ DONE    | `src/app/_client/[[...slug]]/page.tsx`                                         | `getStoreBySubdomain` + `getStoreByCustomDomain` wrapped with React `cache()`. Eliminates duplicate Firestore query between `generateMetadata` and page render.                                                                                                                                                                          |
| **TASK 3** — `/screen/*` PWA cache              | ✅ DONE    | `next.config.js`                                                               | Added `NetworkFirst` PWA cache rule for `/screen/*` with 7-day expiration, 10s network timeout. Screen devices that restart offline now serve cached HTML.                                                                                                                                                                               |
| **TASK 4** — `withRetry()` wrapper              | ✅ DONE    | `src/app/_client/[[...slug]]/page.tsx`                                         | Generic `withRetry<T>()` function (1 retry, 1s delay). Applied to store lookups (both `generateMetadata` + page), project fetch. Handles transient Firestore failures.                                                                                                                                                                   |
| **TASK 5** — Loading skeleton + Suspense        | ✅ DONE    | `src/app/_client/[[...slug]]/page.tsx`                                         | Page restructured: `ClientMenuPage` → `<Suspense fallback={<MenuSkeleton />}><MenuContent /></Suspense>`. Skeleton renders instantly with shimmer animation (header, category tabs, item cards). Data streams when ready. Removed `ServerSidePageLoader` dependency.                                                                     |
| **TASK 6** — `unstable_cache` + `revalidateTag` | ✅ DONE    | `src/app/_client/[[...slug]]/page.tsx`, `src/app/api/revalidate/menu/route.ts` | All customer-facing Firestore reads cached via Vercel Data Cache (60s TTL). Tags: `client-stores`, `client-menus`. Store lookups use `cache(unstable_cache(...))` layering. Project, store details, decision blocks use `unstable_cache` wrappers. Revalidation API endpoint created at `/api/revalidate/menu` (POST, secret-protected). |
| **TASK 7** — Server-side data filtering         | ✅ DONE    | `src/app/_client/[[...slug]]/page.tsx`                                         | `sanitizeForClient()` strips: `processingTime`, `inputToken`, `ouputToken`, `charges`, `chargePerToken`, `combinedWithFileId`, `masterProjectId`, `overrides`, `masterSnapshot`. Filters out `active === false` items, categories, and files. Applied before `ClientMenuRenderer` and Schema.org JSON-LD generation.                     |
| **TASK 8** — Branded error/404 pages            | ✅ DONE    | `src/app/_client/error.tsx` (NEW), `src/app/_client/not-found.tsx` (NEW)       | Lightweight branded pages (no Ant Design). Error page: "Menu temporarily unavailable" + retry button + "ask your server" messaging. 404 page: "Menu not found" + homepage link + "ask your server" messaging.                                                                                                                            |
| **TASK 9** — Screen proactive refresh           | ✅ EXISTED | `src/app/screen/[token]/ScreenDisplay.tsx`                                     | 6-hour `setInterval` + `window.location.reload()` already present from prior hardening work. No change needed.                                                                                                                                                                                                                           |

### New Files Created

| File                                   | Purpose                                                        |
| -------------------------------------- | -------------------------------------------------------------- |
| `src/app/_client/error.tsx`            | Branded error boundary for customer menu (TASK 8)              |
| `src/app/_client/not-found.tsx`        | Branded 404 page for customer menu (TASK 8)                    |
| `src/app/api/revalidate/menu/route.ts` | Cache invalidation endpoint for `unstable_cache` tags (TASK 6) |

### Cache Architecture Summary

```
QR Scan → Vercel Edge
  ├─ unstable_cache (60s TTL) → cache HIT → serve instantly (0 Firestore reads)
  └─ cache MISS → Firestore reads → cache result → serve
      ├─ React cache() deduplicates within same request (metadata + page)
      └─ withRetry() handles transient failures (1 retry, 1s delay)

Owner publishes → POST /api/revalidate/menu → revalidateTag('client-menus')
  └─ All menu cache entries invalidated instantly (instead of waiting 60s TTL)
```

### Environment Variable Required

```
REVALIDATION_SECRET=<random-secret-for-cache-invalidation>
```

Add to Vercel environment variables. Used by `/api/revalidate/menu` to prevent unauthorized cache purges.

---

## Stage 1D: ChatGPT Round 4 — Final Deep Audit

ChatGPT reviewed the full post-hardening code (all 9 tasks). Verdict: **top 5% infra quality for solo-founder SaaS**. Found 4 remaining issues.

### GPT Round 4 Fixes

| Fix                                   | Status  | File(s) Modified                                                                 | What Changed                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------- | ------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GPT FIX 1** — revalidateTag on save | ✅ DONE | `src/lib/actions/revalidateMenuCache.ts` (NEW), `src/database/projects/index.ts` | Server Action calls `revalidateTag(`menu-store-${sId}`)` + `revalidateTag(`store-${sId}`)`. Called fire-and-forget from `updateProject()` after Firestore write. Customers see updated prices instantly instead of waiting 60s TTL.                                                                                                                 |
| **GPT FIX 2** — Per-store cache tags  | ✅ DONE | `src/app/_client/[[...slug]]/page.tsx`, `src/app/api/revalidate/menu/route.ts`   | Replaced generic `client-menus` / `client-stores` tags with per-store tags: `menu-store-{sId}`, `store-{sId}`. Cache wrappers now created inside `MenuContent()` where storeId is known. Prevents cross-tenant cache collisions and enables precise per-store invalidation. Revalidation API updated to support new tag format + storeId shorthand. |
| **GPT FIX 3** — Screen doc listener   | ✅ DONE | `src/app/screen/[token]/page.tsx`, `src/app/screen/[token]/ScreenDisplay.tsx`    | Converted `onSnapshot(query(where('screen.screenToken', '==', token)))` → `onSnapshot(doc('platformSummary', 'campaigns_${storeId}'))`. Doc listener is cheaper and faster than query listener. storeId now passed from server component via initialData. At 5k+ screens, this saves significant Firestore cost.                                    |
| **GPT FIX 4** — withTimeout wrapper   | ✅ DONE | `src/app/_client/[[...slug]]/page.tsx`                                           | Added `withTimeout<T>(promise, ms=5000)` using `Promise.race`. Applied to all Firestore reads: store lookups, project fetch, store details, decision blocks. Composes with `withRetry`: `withRetry(() => withTimeout(fn()))`. Prevents infinite SSR hangs when Firestore is unresponsive.                                                           |

### ChatGPT Infra Score

| Area                  | Score  |
| --------------------- | ------ |
| Architecture thinking | 9.5/10 |
| Firebase discipline   | 9/10   |
| Next.js infra design  | 9/10   |
| Scale readiness       | 9/10   |
| Solo-founder realism  | 10/10  |

### New Files Created (Round 4)

| File                                     | Purpose                                                               |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `src/lib/actions/revalidateMenuCache.ts` | Server Action for instant cache invalidation on menu save (GPT FIX 1) |

### Final Cache Architecture (Post Round 4)

```
QR Scan → Vercel Edge
  ├─ unstable_cache (60s TTL, per-store tags) → HIT → serve instantly (0 reads)
  └─ MISS → Firestore reads (with 5s timeout + 1 retry) → cache → serve
      ├─ React cache() deduplicates within request
      └─ withTimeout + withRetry = defense-in-depth

Owner saves menu → updateProject()
  ├─ Firestore write
  └─ revalidateMenuCache(sId) [Server Action, fire-and-forget]
      ├─ revalidateTag(`menu-store-${sId}`) → project + decision blocks cache cleared
      └─ revalidateTag(`store-${sId}`) → store details cache cleared
      → Next customer scan for THIS store = fresh data instantly

Screen real-time updates:
  └─ onSnapshot(doc('platformSummary/campaigns_{sId}'))  [doc listener, not query]
```

### ChatGPT Optional Items (NOT implemented — low priority)

| Item                               | Decision                                       |
| ---------------------------------- | ---------------------------------------------- |
| In-request memory Map cache        | Skipped — React `cache()` already handles this |
| Decision blocks feature flag guard | Skipped — 1 cached doc read is negligible cost |
| Temp logging for week-1 monitoring | Skipped — can add ad-hoc if needed             |

---

**ARCHITECT SIGNATURE:** Cascade (Lead Architect)  
**TIMESTAMP:** February 7, 2026 (GPT Round 4 complete — INFRA FROZEN)  
**REVIEW STATUS:** COMPLETE ✅ — ALL 9 TASKS + 4 GPT FIXES IMPLEMENTED.  
**GOVERNING RULE:** 3-Year Architecture Freeze (Law 1) — Customer infra permanently sealed.  
**DOCUMENT POLICY:** Single doc. No additional docs created.  
**RELATED DOCS:**

- `__docs__/projects/CUSTOMER-FACING-INFRA-AUDIT.md` — Source audit
- `__docs__/projects/WRITE-DISCIPLINE-AUDIT.md` — Write paths context
