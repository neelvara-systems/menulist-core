# ChatGPT Feedback Audit Report — Special Menu Switching

**Audited:** February 21, 2026  
**Source:** ChatGPT strategic + architectural review of feature docs  
**Auditor:** Cascade (codebase authority)

---

## Summary: 5 Valid | 4 Improve | 5 Log | 8 Reject/Already-Done

---

## Feedback Classification Table

| # | ChatGPT Point | Status | Spec/Impl Reference | Action | Code Impact |
|---|---------------|--------|---------------------|--------|-------------|
| 1 | **Remove stored `behaviorTemplate` from `_specialMenu` metadata** — derive at runtime from `store.businessType` | ✅ VALID | Impl ADR-7: "derived from getBusinessCategory()" — storing contradicts derivation principle | **Implement** | `project.types.ts`, `projects/index.ts`, `useSpecialMenus.ts`, `CreateSpecialMenuModal.tsx` |
| 2 | **Remove `activeSpecialMenuMode` from store** — derive from project doc | ✅ VALID | Impl §Store Document: caches mode for "resolver performance" but resolver already fetches project | **Implement** | `store.ts`, `projects/index.ts` (activate/deactivate), resolver |
| 3 | **Add base project deletion guard** — block delete if non-expired special references it | ✅ VALID | Spec INV-1: "Base menu is NEVER modified" — deletion is modification. Gap in current enforcement | **Implement** | `projects/index.ts` (deleteProject or equivalent) |
| 4 | **Add invariant: special menu cannot be `isDefault: true`** | ✅ VALID | Not in spec but logically required — default project determines routing | **Implement** | `projects/index.ts` (setDefaultProject or equivalent) |
| 5 | **Overlay ID namespacing** — prefix special menu IDs with `SM_` to prevent collision | 🔄 IMPROVE | Impl §Overlay Merge: appends categories/items. ID collision risk in overlay mode only | **Log** — implement before overlay mode flag ON. Replace mode (primary) is safe. | Future: `createSpecialMenuProject` ID remapping |
| 6 | **5-minute scheduler instead of nightly-only** — deterministic activation loop | 🔄 IMPROVE | Impl ADR-4: "Nightly + client-side DAL hybrid". Client DAL handles immediate activation. ChatGPT concern about "owner never opens dashboard" is valid for future | **Log** — implement before flag ON for production. Current hybrid is acceptable for testing | Future: `decisionBlocksScoring.ts` or new CF |
| 7 | **Activation must be atomic (Firestore transaction)** — all-or-nothing state | 🔄 IMPROVE | Impl §Activation Flow lists 6 writes. Currently separate `setDoc` calls. Transaction safer | **Log** — refactor before flag ON. Current separate writes acceptable for testing | Future: `activateSpecialMenuInternal` |
| 8 | **Version bump on activation/deactivation** — trigger screen refresh, POS, cache | 🔄 IMPROVE | Impl §Activation Flow line 275: "Bump menuVersion" — documented but NOT yet coded | **Log** — must implement before flag ON | Future: `activateSpecialMenuInternal`, `deactivateSpecialMenu` |
| 9 | **Temp status banner tone must be neutral** — no emoji, no hype | ✅ ALREADY DONE | Spec INV-7: "Not a campaign engine". Code at `projects/index.ts:1418` sets `message: displayName` — neutral | None | Already compliant |
| 10 | **Frozen snapshot model (independent after creation)** | ✅ ALREADY DONE | Spec INV-1: "Base menu is NEVER modified". Code uses `duplicateProject` pattern — full copy, no live sync | None | Already implemented |
| 11 | **Multi-chain: special menu always outlet-scoped** | ✅ ALREADY DONE | Spec §Multi-Outlet: "Each outlet manages own special menus independently". DAL uses session.sId scoping | None | Already implemented |
| 12 | **Activation idempotency** — safe to run twice | ✅ ALREADY DONE | Code at `projects/index.ts:1440`: `if (data._specialMenu.status === "active") return { success: true }` | None | Already implemented |
| 13 | **UTC timezone discipline** | ✅ ALREADY DONE | All `startsAt`/`endsAt` stored as ISO 8601 strings. Scheduler comparisons use `new Date()` | None | Already implemented |
| 14 | **Resolver double-check project status** — not just store field | ✅ ALREADY DONE | Impl §Resolver: pseudocode checks `specialProject?._specialMenu?.status === 'active'` | None | Already in resolver code |
| 15 | **Add analytics tracking (internal only)** | ❌ REJECT | Spec §Out-of-Scope: "Customer analytics for special menus". Internal analytics is scope creep for pre-launch | None — log as future consideration | N/A |
| 16 | **Process expiries before activations in scheduler** | 📝 LOG | Not yet relevant — scheduler not yet enhanced. Important ordering for Phase 4 implementation | **Log** in impl.md as invariant | Future: scheduler enhancement |
| 17 | **All surfaces use same resolver** | ✅ ALREADY DONE | Impl ADR-3: "Resolver at getProjectBySlugOrDefault() level". Validation FR-08: all surfaces downstream | None | Already designed |
| 18 | **PDF regeneration on activation** | 📝 LOG | Future consideration — PDF not yet auto-generated on activation. Existing publish flow handles it | **Log** | Future |
| 19 | **Do not ship before launch** — keep flag OFF | ✅ ALREADY DONE | Feature flag `ENABLE_SPECIAL_MENU_SWITCHING: false` in both frontend + backend | None | Already flagged OFF |
| 20 | **Chain-level special menus should NOT exist (v1)** | ✅ ALREADY DONE | Spec §Multi-Outlet: outlet-scoped only. No master-level special menus | None | Already designed |
| 21 | **Base + special must share zero object references** | ✅ ALREADY DONE | `createSpecialMenuProject` clones via `requestBodyComposer` which creates new objects | None | Already implemented |
| 22 | **Bulk operations should not affect active special** | ✅ ALREADY DONE | Bulk ops target selected project. Special is separate project — not affected unless explicitly opened | None | Already safe by architecture |

---

## Implementation Plan

### Priority 1 — Ship Blockers (Implement Now)

1. **Remove `behaviorTemplate` from stored `_specialMenu` metadata** — derive at runtime
2. **Remove `activeSpecialMenuMode` from store** — derive from project  
3. **Add base project deletion guard** — check for non-expired special menus
4. **Add special menu cannot be default project guard**
5. **Fix validation.md stale security section** — still references "API routes"

### Priority 2 — Must-Have Before Flag ON (Log Now, Implement Later)

6. Activation atomicity (Firestore transaction)
7. Version bump (`menuVersion`) on activation/deactivation
8. 5-minute scheduler (or at minimum, more frequent than nightly)
9. Overlay ID namespacing for overlay mode
10. Process expiries before activations in scheduler ordering

### Priority 3 — Rejected (with reasoning)

11. Analytics tracking — out of scope per spec, future consideration
12. All other items — already implemented or already in design

---

**Last Updated:** February 21, 2026
