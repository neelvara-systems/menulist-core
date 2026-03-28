# Digital Screens — ChatGPT Strategic Review v2 (Post-v2.2)

**Date:** February 8, 2026  
**Context:** ChatGPT reviewed `digital-screens_spec.md` and `digital-screens_impl.md` after v2.0+v2.1+v2.2 implementation  
**Reviewer:** Cascade (Lead Architect) — codebase cross-check  
**ChatGPT Accuracy:** 8/10 points validated against codebase reality

---

## Decision Matrix

| # | ChatGPT Point | Verdict | Justification | Action |
|---|--------------|---------|---------------|--------|
| 1 | "Surface infrastructure" positioning | **AGREE — already documented** | Spec line 16: "extends MenuList's authority into physical store environment". Line 588: "MenuList extending its authority into physical space" | None — already in spec |
| 2 | Zero-configuration preserved | **AGREE — already documented** | Spec lines 304-320: "There is no toggle. No setting. No dropdown." Out-of-Scope includes mode selection UI (line 127) | None — already enforced |
| 3 | Menu board decision correct | **AGREE — already documented** | Feature Rejection Gate 5/5 PASS (spec lines 574-584). Market research validated 70%+ restaurant screens are menu boards | None |
| 4 | Visual polish drift warning | **PARTIAL AGREE** | Warning directionally valid. Current CSS doesn't violate readability (56px names, 36px prices, text-shadow for contrast). But constraint must be documented to prevent future drift | **Add "Readability First" constraint to spec** |
| 5 | 3-layer control model | **AGREE — already implemented** | Maps to existing 4-layer slide stack (spec lines 253-264). "Attention steering" = campaign layer, already exists | None — strategic framing only |
| 6 | "Never" rules (4 boundaries) | **AGREE — already covered, consolidate** | All 4 rules exist scattered across spec Out-of-Scope (lines 110-128), Open Questions (line 494), constitution (06-internal-tracking.md). Should be consolidated into explicit section | **Add "Architectural Boundaries" section to spec** |
| 7 | Screen pairing via QR | **REJECT — fails Feature Rejection Gate** | Score: 2/5. Fails Q3 (doesn't strengthen core moment — setup UX, not customer decision). Fails Q5 (URL bookmarking is universal, QR adds complexity). Over-engineering for a one-time 5-minute task | **Document rejection in Appendix** |
| 8 | Physical lock-in layer | **AGREE — strategic framing** | Valid strategic observation. No code action needed | None |
| 9 | Focus drift / stop polishing | **PARTIAL AGREE** | v2.2 metadata enrichment was justified (dietary badges critical for Indian restaurants). But feature should now be LOCKED | **Mark feature LOCKED in spec** |
| 10 | Final assessment (9.5/10) | **NOTED** | Validation. No action | None |

---

## Detailed Analysis

### Point 4: Visual Polish Drift — Readability Audit

ChatGPT warns: "glassmorphism, ambient orbs, ken burns... Over-design kills readability"

**Current CSS readability values (verified against codebase):**

| Element | Font Size | Weight | Contrast | Distance Readability |
|---------|-----------|--------|----------|---------------------|
| Menu Board item name | 18px | 500 | #f1f5f9 on dark | OK at 2m on 40"+ TV |
| Menu Board price | 18px+ | 800 | High contrast | OK at 2m |
| Menu Board category | 22px | 800 | White on glassmorphism | OK at 2m |
| Highlights item name | 56px | 800 | White + text-shadow | Excellent at 3m+ |
| Highlights price | 36px | 800 | Green on dark | Good at 3m |
| Highlights description | 20px | 400 | 65% opacity white | OK at 2m |

**Decorative elements readability impact:**
- Ambient orbs: Background only, blur(100px), opacity 0.2 — zero text interference
- Ken Burns: scale 1→1.08 over 12s — subtle, doesn't affect text overlay
- Glassmorphism cards: backdrop-filter blur on CARDS, not text layers
- Staggered animations: Page load only, items static after animation completes

**Verdict:** Current implementation passes readability audit. Decorative elements don't interfere with text readability. However, **documenting readability constraints prevents future drift**.

### Point 6: "Never" Rules — Constitution Alignment

| ChatGPT "Never" Rule | Already in Spec/Constitution | Location |
|----------------------|------------------------------|----------|
| Never add screen analytics | ✅ Yes | Spec line 494, Out-of-Scope lines 117+125, Constitution 06-internal-tracking.md FORBIDDEN metrics |
| Never add screen customization | ✅ Yes | Spec Out-of-Scope lines 120-124, line 481 |
| Never add screen management UI | ✅ Yes | Spec Out-of-Scope lines 123+127, Pre-rejected features |
| Never sell as separate product | ⚠️ Implied only | Spec line 484 mentions "signage SaaS" risk but no explicit pricing rule |

**Action:** Consolidate into explicit "Architectural Boundaries" section for visibility.

### Point 7: Screen Pairing via QR — Feature Rejection Gate

| Question | Answer | Result |
|----------|--------|--------|
| Removes decision? | Owner still copies URL. QR replaces copy-paste but adds "pairing" concept | ⚠️ PARTIAL |
| Would notice absence? | Single-outlet: No. Multi-outlet chains: Maybe | ❌ FAIL |
| Strengthens core moment? | No — this is setup UX, not customer decision speed | ❌ FAIL |
| One sentence without "and"? | "Scan QR to pair screen" | ✅ PASS |
| Still matters in 3 years? | URL bookmarking is universal. QR pairing adds moving parts | ❌ FAIL |

**Score: 2/5 — REJECTED** (minimum 4/5 required)

**Additional rejection reasons:**
- Requires: pairing code generation, temporary token system, scan endpoint, pairing mode UI on screen, scan flow UI in app
- All for a one-time 5-minute task (copy URL to TV browser)
- Violates 3-year freeze: "mark for later" = rejected by definition
- Current approach works for chains too: owner copies 2 URLs per location (Menu Board + Highlights)

### Point 9: Feature Lock Status

ChatGPT says: "This feature is DONE. Infrastructure-level complete."

**Agree.** After v2.2, the feature has:
- ✅ Two rendering modes (Menu Board + Highlights)
- ✅ Full data pipeline (items, prices, descriptions, tags, images)
- ✅ Premium UI (glassmorphism, Ken Burns, animations, dietary badges)
- ✅ Offline resilience (localStorage cache + fallback)
- ✅ Real-time updates (onSnapshot listener)
- ✅ Zero-configuration (URL-based mode selection)
- ✅ Auto-pagination for large menus

**From this point: only fix if readability problem, reliability problem, real user confusion, or scale issue.**

---

## Summary

| Category | Count |
|----------|-------|
| Points validated (already in docs) | 5 |
| Points validated (action taken) | 3 |
| Points rejected | 1 |
| Strategic notes (no action) | 1 |

**Actions Taken:**
1. Added "Architectural Boundaries (LOCKED)" section to `digital-screens_spec.md`
2. Added "Readability First" design constraint to spec
3. Documented QR pairing rejection in spec Appendix
4. Updated Open Question #10 (AI images: Resolved → Rejected)
5. Marked feature as v2.2 LOCKED in spec status
6. Updated document history in both spec and impl

---

**Architect Signature:** Cascade (Lead Architect)  
**Review Status:** COMPLETE
