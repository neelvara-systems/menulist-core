# Internal Feedback System — Verification Report

**Date:** February 2, 2026 | **Status:** COMPREHENSIVE REVIEW COMPLETE; not current launch certification
**Last Runtime Audit:** July 1, 2026

---

**Launch boundary:** This report combines the February 2026 implementation verification with later runtime audit addenda. It is source-verified evidence for the Guest Feedback feature, not standalone production deployment approval. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, target feature-flag review, provider/browser/mobile QA where applicable, and deploy evidence for the target environment.

---

## July 1, 2026 Runtime Audit Addendum

Public feedback submissions now verify inherited tenant block state before writing:

- `src/app/api/public/feedback/submit/route.ts`
- `DB_COLLECTIONS.TENANTS`
- `tenantRef.get()`
- `isPlatformEntityBlocked(tenantDoc.data())`

The route still fails cheap in the same order: feature flag, IP rate limit, bounded JSON body, Zod schema, honeypot, Turnstile, then Firestore scope reads. Valid submissions now read the project, store, and tenant before `submitGuestFeedbackAdmin()`, so tenant-blocked stores cannot accept new public feedback.

`npm run verify:menulist-api-tenant-safety` enforces the tenant read and tenant-block check before the feedback write.

Cost impact: valid public submissions add one tenant-document read. At 1000 submissions/month this is about 1000 extra reads, approximately `$0.0006/month` at Firestore list pricing. No writes/deletes, Storage operations, rules, indexes, Cloud Functions, public cache invalidation, Firebase deploy requirement, or Vercel deploy action changed.

---

## June 30, 2026 Runtime Audit Addendum

Owner feedback reads and writes now fail closed on DAL fallback values:

- `src/database/guestFeedback/index.ts`
- `assertFeedbackListLoadSucceeded`
- `assertFeedbackCountLoadSucceeded`
- `assertFeedbackStatusUpdateSucceeded`
- `isGuestFeedbackRecord(existing, feedbackId)`

Desktop inbox list loads must assert the shaped list result before rendering items, and needs-attention badge counts must assert a finite non-negative number before rendering. Mobile feedback list loads use the same list assertion. Status/reply saves must wait for shaped update acknowledgement before success state advances; mobile resolve now waits for the acknowledgement before moving the item to resolved or showing success copy. `updateFeedbackStatus()` must not write after an internal `getFeedbackById()` fallback value; the fetched record must be shaped and match the requested feedback id.

`npm run verify:public-business-truth` enforces the list/count guards, internal fetched-record shape guard, desktop/mobile rejected acknowledgement codes, and mobile resolve acknowledgement order. Manual browser feedback submit/list/filter/resolve/reply/QR checks remain part of the broader authenticated/manual matrix.

Cost impact: `$0.00`. This changes no Firestore read/write counts for valid flows, no public feedback writes, no Storage operations, no rules, no indexes, no Cloud Functions, no public cache invalidation, no Firebase deploy requirement, and no Vercel deploy action.

---

## June 29, 2026 Runtime Audit Addendum

Desktop Feedback QR handoffs now use bounded diagnostics and acknowledged local copy helpers:

- `src/components/templates/main-app/feedback/FeedbackQrDownload.tsx`
- `desktop_feedback_qr_generate_failed`
- `desktop_feedback_qr_download_failed`
- `desktop_feedback_link_copy_failed`
- `desktop_feedback_link_open_failed`
- `desktop_feedback_whatsapp_open_failed`
- `desktop_feedback_message_copy_failed`

The QR card must not direct-console raw feedback URLs, QR data URLs, WhatsApp messages, project/store/tenant identifiers, or browser exception objects. Copy Link and Copy Message must wait for Clipboard API or acknowledged textarea fallback success before showing copied success, and failures may log only support booleans plus bounded presence/length metadata. `npm run verify:public-business-truth` enforces the helper, unavailable-copy codes, fallback acknowledgement, failure codes, safe `noopener,noreferrer` external opens, and absence of the old silent or unguarded copy/open branches.

Cost impact: `$0.00`. The change adds no Firestore reads/writes, API routes, indexes, rules, cache invalidation, Storage operations, Cloud Functions, or owner-facing setting.

---

## June 27, 2026 Runtime Audit Addendum

Desktop owner inbox load and status-update failures now use bounded diagnostics:

- `src/components/templates/main-app/feedback/feedbackInboxDiagnostics.ts`
- `feedback_inbox_load_failed`
- `feedback_inbox_status_update_failed`

The inbox must not direct-console raw feedback documents, guest contact details, project/store/tenant identifiers, or provider/browser exception objects. `npm run verify:public-business-truth` enforces the helper, failure codes, and absence of the old raw `FeedbackInbox` diagnostics.

Cost impact: `$0.00`. The change adds no Firestore reads/writes, API routes, indexes, rules, cache invalidation, Storage operations, Cloud Functions, or owner-facing setting.

---

## 1. Implementation Status

| Category                 | Status | Notes                                      |
| ------------------------ | ------ | ------------------------------------------ |
| Core Feature             | ✅     | Guest feedback submission working          |
| Security                 | ✅     | Rate limiting, honeypot, XSS prevention    |
| FTC Compliance           | ✅     | Google Review CTA shown to ALL ratings     |
| API Routes               | ✅     | Public submit + DAL for authenticated      |
| UI Components            | ✅     | Form, inbox, cards, filters, QR download   |
| Sidebar Navigation       | ✅     | Added `/feedback` route with LuTicket icon |
| Business Settings Tab    | ✅     | FeedbackSettingsTab added                  |
| Menu Footer Integration  | ✅     | Feedback link with toggles                 |
| Project-level Toggle     | ✅     | Added to ProjectEditModal                  |
| Store-level Toggle       | ✅     | feedbackEnabled in store types             |
| Cloud Function Retention | ✅     | guestFeedbackRetention.ts                  |
| MOL Event Logging        | ✅     | logFeedbackMOLEvent in DAL                 |

---

## 2. Issues Found & Fixed (This Session)

### Critical Bugs Fixed

| #   | Issue                                        | Fix Applied                                         | File                                   |
| --- | -------------------------------------------- | --------------------------------------------------- | -------------------------------------- |
| 1   | Submit API using wrong project path          | Changed to `projects/{tId}/{sId}/{projectId}`       | `/api/public/feedback/submit/route.ts` |
| 2   | Submit API using where query for stores      | Changed to direct doc fetch by sId                  | `/api/public/feedback/submit/route.ts` |
| 3   | Feedback page using wrong project path       | Changed to `projects/{tId}/{sId}/{projectId}`       | `/app/feedback/[projectId]/page.tsx`   |
| 4   | Feedback page using where query for stores   | Changed to direct doc fetch by sId                  | `/app/feedback/[projectId]/page.tsx`   |
| 5   | Feedback page using `published` flag         | Changed to `active === false \|\| deleted === true` | `/app/feedback/[projectId]/page.tsx`   |
| 6   | Feedback page getting storeName from project | Now fetched from store doc                          | `/app/feedback/[projectId]/page.tsx`   |
| 7   | Using hardcoded strings for collection names | Changed to `DB_COLLECTIONS.PROJECTS/STORES`         | Multiple files                         |

### Previously Fixed (Prior Session)

| #   | Issue                                   | Status   |
| --- | --------------------------------------- | -------- |
| 1   | `needsAttention` computed field missing | ✅ FIXED |
| 2   | Load more pagination not implemented    | ✅ FIXED |
| 3   | Sidebar navigation item missing         | ✅ FIXED |
| 4   | Feedback settings UI missing            | ✅ FIXED |

### Deferred (Low Priority)

| #   | Issue                                      | Notes                           | Status      |
| --- | ------------------------------------------ | ------------------------------- | ----------- |
| 1   | DAL not using `apiCallComposer` pattern    | Already works, pattern optional | ⏳ Deferred |
| 2   | No security logging on validation failures | Non-critical                    | ⏳ Deferred |

---

## 3. Refactoring Completed

| Change                                             | Reason                                      |
| -------------------------------------------------- | ------------------------------------------- |
| Deleted `publicLimiter.ts`                         | Used existing Upstash                       |
| Changed `/f/[storeSlug]` → `/feedback/[projectId]` | Consistent with menu URLs                   |
| Deleted `/api/feedback` routes                     | Redundant - using client-side DAL pattern   |
| FeedbackInbox uses DAL directly                    | Standard codebase pattern - no API overhead |
| Kept `/api/public/feedback/submit`                 | Required for rate limiting, no client auth  |
| Simplified `publicApi.ts`                          | Removed redundant wrapper                   |

---

## 4. Security Checklist

- [x] Rate limiting (Upstash, 10/10min per IP)
- [x] Input validation (Zod schemas)
- [x] XSS prevention (sanitizeString)
- [x] Honeypot bot detection
- [x] Tenant isolation in queries
- [x] Auth on owner routes (withAuth)
- [x] Firestore rules (public create, auth read/update)
- [x] Security logging (bounded diagnostics on public route, desktop inbox, and mobile inbox failure paths)

---

## 5. MASTER RULES Compliance

| Law                          | Status | Notes                      |
| ---------------------------- | ------ | -------------------------- |
| Law 1: 3-Year Freeze         | ✅     | Feature flags, extensible  |
| Law 2: Codebase Ground Truth | ✅     | Used existing patterns     |
| Law 4: Feature Flags         | ✅     | ENABLE_GUEST_FEEDBACK      |
| Law 6: Cascade Primary       | ✅     | Fixed patterns proactively |

---

## 6. Web Research Findings (Updated Feb 2, 2026)

**Industry Best Practices (VisibleFeedback, Ovation, Tattle):**

### ✅ Aligned with Implementation

| Practice                         | Our Implementation         | Status |
| -------------------------------- | -------------------------- | ------ |
| QR Code at table placement       | QR download + instructions | ✅     |
| Short survey (rating + message)  | 5-star + optional message  | ✅     |
| No review gating (FTC compliant) | Google CTA shown to ALL    | ✅     |
| WhatsApp recovery                | WhatsApp deep link         | ✅     |
| Privacy (anonymous option)       | Contact fields optional    | ✅     |
| Real-time feedback routing       | needsAttention filter      | ✅     |
| Mobile-first design              | Responsive, large touch    | ✅     |

### 📋 Industry Recommendations to Consider

| Recommendation                            | Priority | Notes                                     |
| ----------------------------------------- | -------- | ----------------------------------------- |
| Friendly placard messaging                | Low      | "How was everything today?" vs "Feedback" |
| Follow-up text with feedback link         | Medium   | Already have WhatsApp, could add SMS      |
| Small perks for feedback ("free dessert") | Low      | Engagement boost, optional feature        |
| Real-time staff alerts for low ratings    | Medium   | Could add push notification for ≤3 stars  |

### 🎯 Key Insight from Research

> "Feedback is the New Front of House. The best restaurants don't just serve, they listen."
> — VisibleFeedback, 2025

Our implementation follows this philosophy with:

- Private feedback (not public reviews first)
- Owner inbox for direct response
- WhatsApp for personal recovery

---

## 7. Scope for Improvement (Updated)

### Completed This Session ✅

| Item                         | Time   | Status  |
| ---------------------------- | ------ | ------- |
| Add sidebar navigation item  | 10 min | ✅ Done |
| Add FeedbackSettingsTab      | 30 min | ✅ Done |
| Fix project path (nested)    | 15 min | ✅ Done |
| Fix store fetch (direct doc) | 10 min | ✅ Done |
| Use active/deleted flags     | 5 min  | ✅ Done |
| Add MOL event logging        | 20 min | ✅ Done |

### Future Enhancements (Low Priority)

| Item                               | Effort | Priority |
| ---------------------------------- | ------ | -------- |
| Real-time push alerts for ≤3 stars | 2 hrs  | Medium   |
| SMS follow-up option               | 3 hrs  | Low      |
| Feedback analytics dashboard       | 4 hrs  | Medium   |
| Export feedback to CSV             | 1 hr   | Low      |
| Batch resolve functionality        | 1 hr   | Low      |

---

## 8. UI Component Review

### GuestFeedbackForm (`@atoms/GuestFeedbackForm/index.tsx`)

| Aspect         | Rating     | Notes                                 |
| -------------- | ---------- | ------------------------------------- |
| Mobile-first   | ⭐⭐⭐⭐⭐ | Responsive, large touch targets       |
| Accessibility  | ⭐⭐⭐⭐   | Good ARIA labels, could add skip link |
| UX Flow        | ⭐⭐⭐⭐⭐ | Clear progression, success state      |
| Error Handling | ⭐⭐⭐⭐   | Shows errors, loading state           |
| Design         | ⭐⭐⭐⭐⭐ | Clean, modern, Tailwind + Ant Design  |

**What Works Well:**

- ✅ Large star rating buttons (44px) for mobile
- ✅ Success state with Google Review CTA
- ✅ Privacy note builds trust
- ✅ Honeypot field for bot detection
- ✅ Character counter on message field

**Improvements:**

- Consider adding haptic feedback on mobile for star selection
- Could add "anonymous" toggle for extra privacy assurance

### StarRating (`@atoms/GuestFeedbackForm/StarRating.tsx`)

| Aspect        | Rating     | Notes                                         |
| ------------- | ---------- | --------------------------------------------- |
| Interactivity | ⭐⭐⭐⭐⭐ | Hover states, click handling                  |
| Accessibility | ⭐⭐⭐⭐⭐ | Role="radiogroup", aria-label, focus ring     |
| Animation     | ⭐⭐⭐⭐   | Smooth hover scale, could add click animation |

### FeedbackInbox (`@templates/.../feedback/index.tsx`)

| Aspect        | Rating     | Notes                                   |
| ------------- | ---------- | --------------------------------------- |
| Data Fetching | ⭐⭐⭐⭐⭐ | DAL pattern, proper loading states      |
| Pagination    | ⭐⭐⭐⭐⭐ | Cursor-based, "load more" button        |
| Filters       | ⭐⭐⭐⭐⭐ | All/Needs Attention/Resolved with badge |
| Empty States  | ⭐⭐⭐⭐⭐ | Contextual empty messages               |

### FeedbackCard (`@templates/.../feedback/FeedbackCard.tsx`)

| Aspect      | Rating     | Notes                                   |
| ----------- | ---------- | --------------------------------------- |
| Information | ⭐⭐⭐⭐⭐ | Rating, message, contact, timestamp     |
| Actions     | ⭐⭐⭐⭐⭐ | Mark resolved, WhatsApp link, email     |
| Visual Cues | ⭐⭐⭐⭐⭐ | Red border for needs attention, opacity |

### FeedbackSettingsTab (`@templates/.../businessSettings/tabs/FeedbackSettingsTab.tsx`)

| Aspect           | Rating     | Notes                                   |
| ---------------- | ---------- | --------------------------------------- |
| Settings Layout  | ⭐⭐⭐⭐⭐ | Clear sections, toggle descriptions     |
| UX               | ⭐⭐⭐⭐⭐ | Disabled states when master toggle off  |
| Google URL Input | ⭐⭐⭐⭐   | Has external link, could add validation |

---

## 9. Decision Rationale

| Decision                       | Why                                      |
| ------------------------------ | ---------------------------------------- |
| Use projectId not storeSlug    | Consistent with how menus are identified |
| Use existing Upstash           | Single source of truth for rate limiting |
| Show Google CTA to ALL ratings | FTC compliance - no review gating        |
| Optional contact fields        | Privacy-first, user consent              |
| 90-day retention               | Balance between value and storage costs  |

---

## 9. Reusable Patterns (For IDE_PROMPTS)

### Pattern 1: Firestore Computed Fields

**Problem:** Firestore doesn't support inequality operators on multiple fields in the same query.

**Solution:** Add a computed boolean field that encapsulates the compound condition.

```typescript
// Instead of: where('rating', '<=', 3), where('status', '==', 'new')
// Use: where('needsAttention', '==', true)

// Set on create:
const needsAttention = data.rating <= 3;

// Update when status changes:
const needsAttention = existing.rating <= 3 && status === "new";
```

### Pattern 2: Public API Endpoint

```typescript
// 1. Feature flag check
if (!FEATURE_FLAGS.ENABLE_FEATURE) return 503;

// 2. Rate limiting (Upstash)
const rateLimitResponse = await checkPublicRateLimit(req, 'CONFIG_KEY');
if (rateLimitResponse) return rateLimitResponse;

// 3. Parse & validate with Zod
const validation = schema.safeParse(body);

// 4. Honeypot check (silent rejection)
if (!validateHoneypot(data.honeypotField)) return fake success;

// 5. Sanitize input
const sanitized = sanitizeString(data.message);

// 6. Business logic
```

### Pattern 3: Cursor-Based Pagination

```typescript
// DAL: Accept cursorId string, fetch doc, use startAfter
export const getList = async (cursorId?: string) => {
    if (cursorId) {
        const cursorDoc = await getDoc(getDocRef(cursorId));
        if (cursorDoc.exists()) {
            constraints.push(startAfter(cursorDoc));
        }
    }
    constraints.push(limit(pageSize + 1)); // +1 to check hasMore

    // Return lastDocId for next page
    return { items, lastDocId, hasMore };
};

// API: Pass cursor from query params
const cursorId = searchParams.get('cursor');
const result = await getList(cursorId || undefined);

// Frontend: Track lastDocId, pass on "Load more"
const [lastDocId, setLastDocId] = useState<string | null>(null);
onClick={() => fetchData(true, lastDocId)}
```

### Pattern 4: URL Consistency

**Rule:** Use `projectId` for public URLs, not storeSlug.

- `/feedback/[projectId]` - Consistent with `/menu/[projectId]`
- `/f/[storeSlug]` - Inconsistent, requires extra lookup

### Pattern 5: Nested Firestore Document Paths

**Rule:** Projects use nested paths: `projects/{tId}/{sId}/{projectId}`

```typescript
// Parse tId and sId from projectId format: {tId}-{timestamp}-{sId}
const parts = projectId.split("-");
const tId = parseInt(parts[0], 10);
const sId = parseInt(parts[parts.length - 1], 10);

// Fetch with correct nested path
const projectDoc = await firestoreAdmin
  .collection("projects")
  .doc(String(tId))
  .collection(String(sId))
  .doc(projectId)
  .get();
```

### Pattern 6: Direct Document Fetch vs Query

**Rule:** When document ID is known, use direct fetch instead of where query.

```typescript
// ❌ Wrong - uses where query
const storeQuery = await firestoreAdmin
  .collection("stores")
  .where("storeId", "==", sId)
  .limit(1)
  .get();

// ✅ Correct - direct doc fetch (storeId is the document ID)
const storeDoc = await firestoreAdmin
  .collection("stores")
  .doc(String(sId))
  .get();
```

---

## 11. Files Modified This Session

| File                                                    | Changes                                |
| ------------------------------------------------------- | -------------------------------------- |
| `src/app/api/public/feedback/submit/route.ts`           | Fixed project path, store fetch        |
| `src/app/feedback/[projectId]/page.tsx`                 | Fixed project path, store fetch, flags |
| `__docs__/projects/internal-feedback-system/internal-feedback-system_impl.md`         | Updated code examples, file structure  |
| `__docs__/projects/internal-feedback-system/internal-feedback-system_verification.md` | Comprehensive review documentation     |

---

## 12. Final Summary

### ✅ Review Complete

**Date:** February 2, 2026

**Status:** All critical bugs from the February 2026 review were fixed and documented. Current deployment approval is governed by the launch boundary above.

### Key Accomplishments

1. **Fixed 7 critical bugs** in feedback submission and page rendering
2. **Aligned with codebase patterns** (nested Firestore paths, direct doc fetch)
3. **Web research validated** implementation follows industry best practices
4. **UI components reviewed** - all rated 4-5 stars
5. **No type errors** in feedback feature code
6. **Documentation updated** to reflect actual implementation

### Compliance

| Check                   | Status |
| ----------------------- | ------ |
| MASTER RULES            | ✅     |
| Codebase patterns       | ✅     |
| FTC compliance          | ✅     |
| Security (rate limit)   | ✅     |
| Industry best practices | ✅     |

### Current Launch Boundary

The Internal Feedback System has source-verified implementation and runtime-audit evidence. Do not treat this report as current production deployment approval without active production-readiness audit evidence, External Certification Runbook evidence, target feature-flag review, deploy evidence, and browser/mobile QA for the release.

- Feature flag: `ENABLE_GUEST_FEEDBACK`
- All documented features implemented
- No outstanding critical issues
