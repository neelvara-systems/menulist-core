# ✅ GBP SYNC — Validation Report

**Feature:** #3 — Google Business Profile Minimal Sync  
**Version:** 1.2 (Phase 0 Implementation)  
**Status:** ✅ PHASE 0 COMPLETE | 🔶 PHASES 1-3 BLOCKED  
**Last Updated:** January 19, 2026  
**Author:** Lead Architect (Cascade)

---

## 📚 DOC ↔ CODE ALIGNMENT (POST-FEEDBACK)

| Doc Section                            | Status | Code/Doc Verification                                                       |
| -------------------------------------- | ------ | --------------------------------------------------------------------------- |
| spec.md — Hours weekly only            | ✅     | Matches `workingHours` simple format in `src/types/platform/store.ts:87-89` |
| spec.md — websiteUri only              | ✅     | Clarified per GBP API reality                                               |
| impl.md — Token path `gbp/{sId}`       | ✅     | Clean namespace for future integrations                                     |
| impl.md — Algorithm overnight handling | ✅     | Prevents false mismatches                                                   |
| impl.md — specialHours ignored         | ✅     | Phase 1 scope limit                                                         |
| marketing.md — Language governance     | ✅     | Removed unverified claims, notification language                            |
| All docs — 3-Year Freeze               | ✅     | No "Phase 2" language, extensible schema                                    |

---

## 📝 Feedback Applied

| #   | ChatGPT Feedback              | Status     | Changes Made                                                                  |
| --- | ----------------------------- | ---------- | ----------------------------------------------------------------------------- |
| 1   | Hours drift underspecified    | ✅ Applied | spec.md: Added "weekly only", overnight → UNKNOWN. impl.md: Algorithm updated |
| 2   | Menu link field ambiguous     | ✅ Applied | spec.md + impl.md: Clarified `websiteUri` only                                |
| 3   | Token path naming             | ✅ Applied | impl.md: Changed `gbpTokens/{sId}` → `gbp/{sId}`                              |
| 4   | Marketing language violations | ✅ Applied | Removed "78%", "Get alerted", "No credit card"                                |

---

## ❌ Feedback Rejected

_None — all 4 points were valid improvements aligned with codebase reality._

---

## 🔒 FINAL LOCKED SCOPE (Phase 1)

### ✅ Will Do

1. Connect GBP via separate OAuth
2. Store mapping: accountId + locationId per store
3. Compute canonical MenuList URL
4. Nightly read GBP `websiteUri` + `regularHours`
5. Auto-fix `websiteUri` when safe
6. Mark hours mismatch (weekly only, overnight → UNKNOWN)
7. Manual "Apply hours to Google"
8. MOL logs for every action

### ❌ Will NOT Do

- Reviews, posts, photos, Q&A
- Performance dashboards
- Push notifications
- Auto-write hours without approval
- Holiday/special hours sync
- Separate "menu URL" field management

---

## 📋 ENGINEERING CHECKLIST

### Phase 0 Foundation Tasks (IMPLEMENTED)

| #   | Checklist Item                         | Status  | Evidence                                          |
| --- | -------------------------------------- | ------- | ------------------------------------------------- |
| 1   | Add `gbp`, `gbpState` to StoreDataType | ✅ PASS | `src/types/platform/store.ts:111-137`             |
| 2   | Add `INTEGRATIONS` to DB_COLLECTIONS   | ✅ PASS | `src/constants/database.ts:73-76`                 |
| 3   | Add GBP event types to MOL             | ✅ PASS | `src/types/mol.types.ts:27-35`                    |
| 4   | Add `ENABLE_GBP_SYNC` feature flag     | ✅ PASS | `src/config/features.ts:561-596`                  |
| 5   | Create integrations DAL skeleton       | ✅ PASS | `src/database/integrations/gbp.ts:1-146`          |
| 6   | Add UI stub in Business Settings       | ✅ PASS | `businessSettings/tabs/IntegrationsTab.tsx:1-141` |

### Phases 1-3 (BLOCKED - Awaiting GBP API Access)

| #     | Task                      | Status     | Blocking Reason         |
| ----- | ------------------------- | ---------- | ----------------------- |
| 7-11  | OAuth + Connection routes | ⏳ BLOCKED | GBP API access required |
| 12-15 | Sync + Apply              | ⏳ BLOCKED | GBP API access required |
| 16-19 | Hardening                 | ⏳ BLOCKED | GBP API access required |

---

## ✅ Architecture Checklist (6/6 PASS)

| Item                   | Status | Evidence                                          |
| ---------------------- | ------ | ------------------------------------------------- |
| Feature flag gating    | ✅     | `ENABLE_GBP_SYNC: false` in features.ts:596       |
| Extensible schema      | ✅     | `gbp`, `gbpState` fields support future expansion |
| DB collection constant | ✅     | `DB_COLLECTIONS.INTEGRATIONS` added               |
| MOL event types        | ✅     | 7 new GBP event types in mol.types.ts             |
| DAL pattern followed   | ✅     | Server-only functions, proper path helpers        |
| UI component pattern   | ✅     | IntegrationsTab follows existing tab patterns     |

---

## ✅ UI Checklist (3/3 PASS)

| Item                      | Status | Evidence                                        |
| ------------------------- | ------ | ----------------------------------------------- |
| IntegrationsTab created   | ✅     | `tabs/IntegrationsTab.tsx`                      |
| Exported in tabs/index.ts | ✅     | Line 4: `export { default as IntegrationsTab }` |
| Added to TAB_ITEMS_LIST   | ✅     | `businessSettings/index.tsx:173-183`            |

---

## ✅ Security Checklist (4/4 PASS)

| Item                        | Status | Evidence                                    |
| --------------------------- | ------ | ------------------------------------------- |
| Token storage server-only   | ✅     | DAL functions throw before API access       |
| Feature flag default OFF    | ✅     | `ENABLE_GBP_SYNC: false`                    |
| Token path uses DB constant | ✅     | `DB_COLLECTIONS.INTEGRATIONS` in path       |
| UI hidden when flag OFF     | ✅     | IntegrationsTab returns null if !gbpEnabled |

---

## ✅ Firebase Cost Checklist (3/3 PASS)

| Item                        | Status | Evidence                              |
| --------------------------- | ------ | ------------------------------------- |
| No new reads in Phase 0     | ✅     | DAL functions are stubs only          |
| No new writes in Phase 0    | ✅     | DAL functions throw, no actual writes |
| Collection constant defined | ✅     | `INTEGRATIONS: "integrations"`        |

---

## 📁 Files Created/Modified

| File                                        | Lines | Status      | Issues |
| ------------------------------------------- | ----- | ----------- | ------ |
| `src/types/platform/store.ts`               | +27   | ✅ Modified | None   |
| `src/constants/database.ts`                 | +5    | ✅ Modified | None   |
| `src/types/mol.types.ts`                    | +9    | ✅ Modified | None   |
| `src/config/features.ts`                    | +37   | ✅ Modified | None   |
| `src/database/integrations/gbp.ts`          | 146   | ✅ Created  | None   |
| `businessSettings/tabs/IntegrationsTab.tsx` | 141   | ✅ Created  | None   |
| `businessSettings/tabs/index.ts`            | +1    | ✅ Modified | None   |
| `businessSettings/index.tsx`                | +13   | ✅ Modified | None   |

---

## 🔐 Security Compliance Table

| Requirement           | Status | Evidence                                                      |
| --------------------- | ------ | ------------------------------------------------------------- |
| Tokens server-only    | ✅     | DAL in `src/database/integrations/gbp.ts` - no client exports |
| Feature flag gated    | ✅     | UI returns null when `ENABLE_GBP_SYNC: false`                 |
| Store isolation ready | ✅     | Schema includes `tId` + `sId` in token path                   |
| No tokens to client   | ✅     | IntegrationsTab only receives `storeDetails` prop             |

---

## 🏗️ 3-Year Architecture Freeze Compliance

| Criterion                | Status | Evidence                                                        |
| ------------------------ | ------ | --------------------------------------------------------------- |
| Feature flag default OFF | ✅     | `ENABLE_GBP_SYNC: false`                                        |
| Extensible schema        | ✅     | `gbp.menuLinkMode`, `gbpState.linkStatus/hoursStatus`           |
| No "Phase 2" language    | ✅     | All impl.md tasks are Phase 0/1 only                            |
| Complete at launch       | ✅     | Foundation ready for immediate implementation when API approved |

---

## 🐛 Bugs Fixed During Implementation

_None — clean implementation._

---

## ✅ FINAL VERDICT: PHASE 0 READY FOR TESTING

| Metric              | Value                     |
| ------------------- | ------------------------- |
| **Total Files**     | 8 (5 modified, 3 created) |
| **Lines of Code**   | ~379                      |
| **Spec Compliance** | 100% (6/6 Phase 0 items)  |
| **Overall Status**  | ✅ PHASE 0 COMPLETE       |

---

## 🚀 To Enable & Test

### Phase 0 (Current - Foundation Only)

1. **Feature flag is OFF** — UI stub hidden until enabled
2. To see UI stub: Set `ENABLE_GBP_SYNC: true` in `src/config/features.ts`
3. Navigate to: Business Settings → Integrations tab
4. Expected: "Coming Soon" alert with disabled "Connect Google" button

### Phase 1+ (After GBP API Access)

1. Apply for GBP API access at https://developers.google.com/my-business/content/prereqs
2. Create separate OAuth client for GBP scopes
3. Set env vars: `GOOGLE_GBP_CLIENT_ID`, `GOOGLE_GBP_CLIENT_SECRET`
4. Implement API routes per impl.md Phase 1 tasks
5. Enable feature flag and test OAuth flow

---

## 📄 Document Set (Complete)

| Document                         | Status | Version |
| -------------------------------- | ------ | ------- |
| `gbp-sync_spec.md`               | ✅     | 1.1     |
| `gbp-sync_impl.md`               | ✅     | 1.1     |
| `gbp-sync_marketing.md`          | ✅     | 1.1     |
| `gbp-sync_doc-feedback-audit.md` | ✅     | 1.0     |
| `gbp-sync_validation.md`         | ✅     | 1.2     |
| `gbp-chatgpt-critical-review.md` | ✅     | 1.0     |

---

**VALIDATION SIGNATURE:** Lead Architect (Cascade)  
**TIMESTAMP:** January 19, 2026
