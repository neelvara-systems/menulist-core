# ChatGPT Feedback Audit Report — OBP Feature

**Date:** February 16, 2026  
**Source:** ChatGPT founder-level audit of OBP spec + implementation  
**Auditor:** Cascade (Lead Architect)

## Summary: 3 Valid | 5 Rejected | 1 Improve | 0 Clarify

---

## GREEN SECTION (Confirmations — No Action Needed)

| # | ChatGPT Point | Status | Spec Reference | Action | Code Changes |
|---|---------------|--------|----------------|--------|--------------|
| G1 | Positioning clarity (not website, not builder, identity layer) | ✅ Confirmed | Spec §Scope/Out-of-Scope permanent ban list | None — already enforced | N/A |
| G2 | Architecture discipline (reads from existing store doc, no new collections) | ✅ Confirmed | Impl ADR-4, ADR-6 | None — already built | N/A |
| G3 | Two-layer separation (OBP = identity, Menu = consumption) | ✅ Confirmed | Spec §Scope: "View Menu" CTA separate from identity | None — enforced by routing | N/A |
| G4 | Minimal customization (owners update info, not design) | ✅ Confirmed | Spec §Customization Rules/Not Allowed (permanent ban) | None — already enforced | N/A |
| G5 | Instant update model (no publish button) | ✅ Confirmed | Spec NFR-03: <60s data freshness. Impl §unstable_cache 60s TTL | None — already built | N/A |
| G6 | Domain + distribution logic (subdomain first, custom domain optional) | ✅ Confirmed | Spec §Routing Architecture, Impl ADR-1 | None — already built | N/A |

---

## RISK SECTION (Actionable Audit)

| # | ChatGPT Point | Status | Spec Reference | Action | Code Changes |
|---|---------------|--------|----------------|--------|--------------|
| R1 | "OBP should be treated as launch-level feature, not silent add-on" | ❌ Reject | Strategic positioning, not code. Spec already treats OBP as core with dedicated feature flag, full doc suite, 11 ADRs. | None — rollout strategy is outside code scope | N/A |
| R2a | "Show OBP link in Dashboard top card (permanent)" | ✅ Valid | Spec §Scope: "Dashboard integration: link display, copy button, QR download." Owner Dashboard is THE primary dashboard. Currently only OBPMetricsCard (analytics) is there — link card is only in Business Settings. This is an oversight. | **Implement** — Add OBPLinkCard to Owner Dashboard above OBPMetricsCard | `OwnerDashboard/index.tsx` |
| R2b | "Show in Menu publish success screen" | 🔄 Improve | Not in spec. Would modify existing publish flow. Good for adoption but touches core flow. | **Log as enhancement** — Add to spec §Future Enhancements. Do NOT modify publish flow now. | Spec update only |
| R2c | "Show in Mobile share screen" | ✅ Already Done | Spec §Scope: "Dashboard integration: link display, copy button, QR download." | None — implemented in MobileShareScreen.tsx with QR + copy + download | N/A |
| R2d | "Show after onboarding completion" | ❌ Reject | Not in spec. Would modify onboarding flow — high-risk core flow change. Onboarding already creates store → OBP auto-exists. | None — too risky, no spec basis | N/A |
| R2e | "Show in Settings header" | ✅ Already Done | OBPLinkCard already renders at top of Business Settings page. | None — already implemented | N/A |
| R2f | "Show in QR download screen" | ✅ Already Done | QR is embedded in OBPLinkCard (Business Settings) + MobileShareScreen (mobile). No separate QR screen exists. | None — already covered | N/A |
| R3a | "After publish: show 'send this link to customers'" | 🔄 Improve | Not in spec. Behavior trigger = good UX but touches publish flow. | **Log as enhancement** — Spec §Future Enhancements | Spec update only |
| R3b | "After menu edit: show 'Your link updated automatically'" | ❌ Reject | Touches menu editor flow — high-risk, unrelated to OBP code. OBP auto-updates via cache TTL (spec NFR-03). | None — auto-update already works, no nudge needed in V1 | N/A |
| R3c | "After hours edit: show 'Customers see updated hours instantly'" | ❌ Reject | Same as R3b. Business Settings already saves and OBP reflects within 60s. | None — implicit, no nudge needed | N/A |
| R4 | "Analytics scope overbuilt for V1" | ❌ Reject | Already built and lightweight. ChatGPT itself says "acceptable, just don't let it slow rollout." Analytics is behind separate `ENABLE_OBP_ANALYTICS` flag — can be turned on independently. | None — already addressed | N/A |
| R5 | "Protect minimalism post-launch (say no to gallery/offers/themes)" | ✅ Valid | Spec §Out-of-Scope already has permanent ban list. But should be explicitly documented as a POST-LAUNCH GUARDRAIL. | **Add guardrail note to spec** | Spec update only |

---

## Implementation Plan

### Priority 1 (Ship Improvement)
1. **R2a** — Add `OBPLinkCard` to Owner Dashboard (above OBPMetricsCard). The primary screen owners see daily should show their link.

### Priority 2 (Spec Updates Only)
2. **R2b/R3a** — Log "behavior triggers" as future enhancement in spec
3. **R5** — Add post-launch guardrail note to spec

### Rejected (with reasoning)
- **R1** — Strategic, not code. Already positioned correctly.
- **R2d** — Modifying onboarding is high-risk core flow change with no spec basis.
- **R3b/R3c** — Modifying menu/hours edit flows is scope creep. Auto-update already works.
- **R4** — Analytics already built, lightweight, separate flag.

---

**Document Signature:** Cascade (Lead Architect)  
**Date:** February 16, 2026
