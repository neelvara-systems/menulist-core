# 📊 System Strengthening - Baseline Assessment

**Created:** January 4, 2026  
**Status:** 🔍 Stage 1 Complete  
**Purpose:** Document current system state before strengthening

---

## Executive Summary

This document captures the **current baseline state** of MenuListAi's systems across all hardening areas identified in the ChatGPT strategic discussion. This baseline serves as the foundation for gap analysis and improvement planning.

**Overall Assessment:** The system has **strong security foundations** but requires hardening in **reliability, monitoring, and trust psychology** areas.

---

## 1. Security Layer (Current State)

### 1.1 API Protection ✅ STRONG

| Component               | Status           | Evidence                |
| ----------------------- | ---------------- | ----------------------- |
| `withAuth()` middleware | ✅ 100% coverage | 15/15 protected routes  |
| Input validation (Zod)  | ✅ Complete      | All AI routes validated |
| Rate limiting (Upstash) | ✅ Implemented   | 6 rate limit configs    |
| Security logging        | ✅ Complete      | Sentry integration      |
| OWASP compliance        | ✅ 90%           | A01-A10 covered         |

**Docs Found:** `@__docs__/security/comprehensive-security-audit.md`

### 1.2 Rate Limit Configurations ✅ EXISTS

```typescript
// src/lib/rateLimit/configs.ts
AI_OPERATION; // 30 req/min
AI_EXPENSIVE; // 5 req/min
DATA_WRITE; // 50 req/min
FILE_UPLOAD; // 10 req/min
BATCH_OPERATION; // 3 per 5 min
KB_SEARCH; // 60 req/min
```

**Files:**

- `src/lib/rateLimit/index.ts`
- `src/lib/rateLimit/helpers.ts`
- `src/lib/rateLimit/configs.ts`
- `src/lib/rateLimit/tiers.ts`

### 1.3 Multi-Tenant Isolation ✅ IMPLEMENTED

- `verifyTenantAccess()` enforced
- Path structure: `{collection}/{tId}/{sId}/...`
- Firestore rules: Default deny

---

## 2. Data Integrity Layer (Current State)

### 2.1 Availability System ⚠️ PARTIAL

| Component                       | Status            | Notes                    |
| ------------------------------- | ----------------- | ------------------------ |
| `available` field on items      | ✅ Exists         | Boolean toggle           |
| Runtime availability check      | ✅ Implemented    | DecisionBlocks.tsx       |
| Scheduler availability-agnostic | ✅ Fixed Dec 2025 | Correct separation       |
| Availability at render-time     | ⚠️ Partial        | Some surfaces miss check |

**Docs Found:** `@__docs__/projects/DECISION-BLOCKS-SCHEDULER.md`

**Key Insight (from docs):**

> Scheduler ranks candidates based on **historical data** (slow, expensive)
> Runtime gate filters by **current availability** (fast, cheap)
> **CRITICAL**: Never mix these concerns

### 2.2 Confidence Scoring System ✅ EXISTS

```typescript
// src/types/campaigns.ts
export const CONFIDENCE_THRESHOLDS = {
  active: 0.6, // Active campaigns
  passive: 0.5, // Passive campaigns
  menu_highlight: 0, // Evergreen fallback (always qualifies)
};

// Screen confidence (higher bar)
DIGITAL_SCREENS_CONFIDENCE_THRESHOLD: 0.7;
```

**Files:**

- `src/lib/campaigns/engine.ts` (31 matches)
- `src/types/campaigns.ts` (17 matches)
- `src/lib/screen/slideGenerator.ts` (10 matches)

### 2.3 Summary Document Pattern ✅ EXTENSIVELY USED

| Summary Doc        | Collection      | Purpose                        |
| ------------------ | --------------- | ------------------------------ |
| `projects_{sId}`   | platformSummary | Project listing (1 read)       |
| `campaigns_{sId}`  | platformSummary | Today campaigns + screen state |
| `analytics_{date}` | analytics       | Daily aggregated stats         |

**Reads Optimized:** 90%+ reduction via summary docs

---

## 3. Caching Layer (Current State)

### 3.1 Client-Side Caching ✅ EXISTS

| Cache Type                | Implementation | Files                        |
| ------------------------- | -------------- | ---------------------------- |
| SWR localStorage provider | ✅ Complete    | `swrLocalStorageProvider.ts` |
| Article cache             | ✅ Complete    | `useArticleCache.ts`         |
| Ticket cache              | ✅ Complete    | `useTicketCache.ts`          |
| Changelog cache           | ✅ Complete    | `useChangelogCache.ts`       |
| Owner Dashboard cache     | ✅ Complete    | `useOwnerDashboard.ts`       |
| Query embeddings cache    | ✅ Complete    | `queryEmbeddings/index.ts`   |
| AI search history cache   | ✅ Complete    | `aiSearchHistory/index.ts`   |

**Total Cache Files:** 70+ files with localStorage/sessionStorage usage

### 3.2 Server-Side Caching ⚠️ MISSING

| Component          | Status             | Impact                  |
| ------------------ | ------------------ | ----------------------- |
| Redis caching      | ❌ Not implemented | Per-request computation |
| API response cache | ❌ Not implemented | Repeated queries        |
| Menu data cache    | ❌ Not implemented | Firebase reads          |

### 3.3 Offline Caching ✅ PLANNED FOR SCREENS

**Digital Screens Spec:**

- IndexedDB for slide cache
- 24-hour offline support
- Service Worker planned

---

## 4. Feature Flag System ✅ COMPREHENSIVE

**File:** `src/config/features.ts` (456 lines)

### Current Feature Flags

| Flag                                   | Default | Purpose                 |
| -------------------------------------- | ------- | ----------------------- |
| `ENABLE_STREAMING_RESPONSES`           | false   | AI streaming toggle     |
| `ENABLE_RATE_LIMITING`                 | true    | Upstash rate limits     |
| `ENABLE_APP_CHECK`                     | false   | Firebase bot protection |
| `ENABLE_SENTRY`                        | false   | Error tracking          |
| `ENABLE_EDITOR_KEYBOARD_SHORTCUTS`     | true    | Power user feature      |
| `ENABLE_DECISION_BLOCKS`               | true    | Recommendation engine   |
| `SOCIAL_CONTENT_ENABLED`               | true    | Today/Campaigns         |
| `DIGITAL_SCREENS_ENABLED`              | true    | Screen feature          |
| `DIGITAL_SCREENS_CONFIDENCE_THRESHOLD` | 0.7     | Screen quality bar      |
| `DIGITAL_SCREENS_UPLOAD_EXPIRY_DAYS`   | 14      | Auto-expire uploads     |
| `DIGITAL_SCREENS_MAX_UPLOADS`          | 3       | Owner upload limit      |

### Kill Switch Capability ⚠️ PARTIAL

**Exists:**

- Feature flags can disable features
- Rate limiting toggle

**Missing:**

- Global AI disable switch
- Per-store kill switch
- Emergency campaign disable

---

## 5. Monitoring & Observability (Current State)

### 5.1 Error Tracking ✅ EXISTS

| Tool                   | Status        | Coverage            |
| ---------------------- | ------------- | ------------------- |
| Sentry                 | ✅ Configured | Dev + Prod projects |
| Security logging       | ✅ Complete   | `logger.security()` |
| Performance monitoring | ✅ Sentry     | 10% sample rate     |

### 5.2 Health Monitoring ⚠️ PARTIAL

| Component            | Status      | Notes                       |
| -------------------- | ----------- | --------------------------- |
| Network status       | ✅ Complete | `useNetworkStatus.ts`       |
| Offline blocker      | ✅ Complete | `NetworkStatusProvider.tsx` |
| Screen health        | ⚠️ Planned  | Not implemented             |
| AI health            | ⚠️ Missing  | No dedicated monitoring     |
| Firebase cost alerts | ⚠️ Missing  | No automation               |

**Docs Found:** `@__docs__/network-status-monitoring.md`

### 5.3 Internal Metrics ⚠️ PARTIAL

**Exists:**

- Analytics aggregation (Cloud Functions)
- Owner Dashboard metrics
- Chat analytics

**Missing:**

- Campaign success rate tracking
- Screen offline duration
- AI failure rate dashboard
- Cost per operation tracking

---

## 6. Campaign & Today System (Current State)

### 6.1 Campaign Engine ✅ COMPLETE

**File:** `src/lib/campaigns/engine.ts` (467 lines)

| Component              | Status                               |
| ---------------------- | ------------------------------------ |
| Confidence scoring     | ✅ `calculateConfidence()`           |
| Suppression logic      | ✅ `suppressedTypes` in context      |
| Evergreen fallback     | ✅ `menu_highlight` always qualifies |
| Multi-project fairness | ✅ `getProjectRecencyDecay()`        |

### 6.2 Campaign Types ✅ DEFINED

**Active (5):** meal_push, bestseller_boost, slow_item_rescue, festival, new_item  
**Passive (4):** todays_special, weekend_pick, now_available, menu_highlight

### 6.3 Execution Surfaces ✅ COMPLETE

- WhatsApp Status
- WhatsApp Message
- Printable Poster
- QR Tent
- Digital Screen

---

## 7. Digital Screens (Current State)

### 7.1 Implementation Status ⚠️ IN PROGRESS

**Docs Found:** `@__docs__/digital-screens/digital-screens_impl.md`

| Component           | Status         | Notes                           |
| ------------------- | -------------- | ------------------------------- |
| Types & Schema      | ⬜ Not Started | ScreenSlide, DigitalScreenState |
| Screen API          | ⬜ Not Started | GET /api/screen/[token]         |
| Screen Page         | ⬜ Not Started | /screen/[token]/page.tsx        |
| Offline Cache       | ⬜ Not Started | Service Worker                  |
| Owner Settings      | ⬜ Not Started | DigitalScreenSettings component |
| Evergreen Generator | ⬜ Not Started | evergreenSlides.ts              |

### 7.2 Spec Decisions Locked

- Token-based URLs (not storeId)
- 8-second slide duration
- 5-minute refresh interval
- Min 3 slides guarantee
- No blank screen ever

---

## 8. Owner Dashboard (Current State)

### 8.1 Confirmation Dashboard ✅ COMPLETE

**Docs Found:** `@__docs__/projects/owner-dashboard.md`

**Philosophy:**

> "The owner dashboard is NOT analytics. It is confirmation."
> Owners don't want to analyze data. They want to know their business tool is functioning.

| View           | Status      |
| -------------- | ----------- |
| Overview       | ✅ Complete |
| Daily          | ✅ Complete |
| Weekly         | ✅ Complete |
| Monthly        | ✅ Complete |
| Overall Footer | ✅ Complete |

### 8.2 UI Language Rules ✅ DOCUMENTED

| ❌ Don't Say               | ✅ Say Instead          |
| -------------------------- | ----------------------- |
| "High engagement detected" | "Your menu is working!" |
| "Page Views"               | "Menu Scans"            |
| "Click Events"             | "Item Taps"             |
| "Conversion Rate"          | (Don't show this)       |

---

## 9. Decision Blocks (Current State)

### 9.1 Scheduler ✅ FIXED

**Docs Found:** `@__docs__/projects/DECISION-BLOCKS-SCHEDULER.md`

**Critical Fix Applied (Dec 28, 2025):**

- Scheduler now availability-agnostic
- Only checks `active === false`
- Does NOT check `available === false` (runtime's job)

### 9.2 Runtime Gate ✅ COMPLETE

```typescript
// 4 checks at runtime
1. item.active === false → skip
2. item.available === false → skip
3. category time-slot → skip if outside hours
4. usedItemIds.has(itemId) → skip for diversity
```

---

## 10. Menu Data Integrity (Current State)

### 10.1 Menu Schema ✅ EXISTS

| Field        | Type    | Validation         |
| ------------ | ------- | ------------------ |
| `active`     | boolean | Permanent disable  |
| `available`  | boolean | Temporary sold out |
| `price`      | number  | Required           |
| `categoryId` | string  | Required           |

### 10.2 Data Validation ⚠️ PARTIAL

**Exists:**

- Zod validation on API inputs
- Type definitions

**Missing:**

- Orphan item detection
- Ghost category auto-hide
- Menu version snapshots
- Rollback capability

---

## 11. Copy & Language (Current State)

### 11.1 Internationalization ✅ EXISTS

- `next-intl` configured
- Locales in `/public/locales/`
- Decision block translations in `decisionBlockTranslations.ts`

### 11.2 Copy Registry ⚠️ MISSING

**ChatGPT Recommendation:**

> All owner-facing text in one file
> No inline strings in components
> Enforced via lint rule

**Current State:** Inline strings scattered across components

### 11.3 Forbidden Phrase Guard ❌ MISSING

No runtime check for forbidden words like:

- "worked"
- "improved"
- "analytics"
- "best time"
- "AI says"

---

## 12. Performance & Cost (Current State)

### 12.1 Firebase Cost Controls ⚠️ PARTIAL

| Control             | Status            |
| ------------------- | ----------------- |
| Summary doc pattern | ✅ Reduces reads  |
| Rate limiting       | ✅ Prevents abuse |
| Daily AI caps       | ⚠️ Not per-store  |
| Cost anomaly alerts | ❌ Missing        |

### 12.2 AI Cost Guardrails ⚠️ PARTIAL

**Exists:**

- Rate limiting on AI routes
- Batch operation limits

**Missing:**

- Per-store daily AI quota
- AI backoff on failure
- Fallback captions if AI fails

---

## Summary: What's Strong vs What's Missing

### ✅ STRONG (No Action Needed)

1. **Security Layer** - 90% OWASP, withAuth(), rate limiting
2. **Summary Document Pattern** - Optimized reads
3. **Client-Side Caching** - Comprehensive SWR + localStorage
4. **Feature Flag System** - Well-documented toggles
5. **Campaign Engine** - Confidence scoring, suppression
6. **Network Monitoring** - Offline blocker exists
7. **Decision Blocks Scheduler** - Correct separation fixed

### ⚠️ PARTIAL (Needs Strengthening)

1. **Availability at render-time** - Some surfaces miss check
2. **Health Monitoring** - No screen/AI health tracking
3. **Kill Switches** - No emergency disable
4. **Menu Data Validation** - No orphan detection
5. **AI Cost Guardrails** - No per-store quotas
6. **Internal Metrics** - No failure rate dashboards

### ❌ MISSING (Must Build)

1. **Copy Registry** - Centralized text not implemented
2. **Forbidden Phrase Guard** - No enforcement
3. **Server-Side Caching** - No Redis/API cache
4. **Cost Anomaly Alerts** - No Firebase budget alerts
5. **Screen Health Monitoring** - No blank detection
6. **Menu Versioning** - No rollback capability
7. **Data Repair Scripts** - No recovery tools

---

## Next Steps

1. **Stage 2:** Create `alignment.md` - Map ChatGPT suggestions to this baseline
2. **Stage 3:** Create `improvements_spec.md` - Detailed improvement plans
3. **Stage 4:** Create `improvements_checklist.md` - Actionable implementation tasks
4. **Stage 5:** Create `metrics.md` - Before/after measurement plan

---

**Document Status:** ✅ Stage 1 Complete  
**Last Updated:** January 4, 2026
