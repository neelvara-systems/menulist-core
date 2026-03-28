# Agent Readiness Strategy — ChatGPT Code/Doc Feedback Audit

**Audit Date:** February 19, 2026
**Auditor:** Cascade (Lead Architect)
**Source:** ChatGPT post-implementation review of agent-readiness-strategy docs + llms.txt/llms-full.txt implementation
**Status:** COMPLETE

---

## Summary: 4/10 Valid | 4 Rejected | 2 Already Covered

---

## Feedback Audit Table

| # | ChatGPT Point | Status | Spec/Impl Reference | Action | Doc Changes |
|---|--------------|--------|---------------------|--------|-------------|
| 1 | llms.txt + llms-full.txt = correct move, but "table stakes not moat" | ✅ VALID | Spec already says "Monitor manually, establish baseline" — but doesn't explicitly say "hygiene layer, not moat" | **Update spec** — add clarity that this is hygiene/foundation, not competitive moat | `_spec.md` |
| 2 | Documentation discipline = very good | ✅ VALID (praise) | N/A | None — affirmation, no change needed | N/A |
| 3 | Rejecting hype ideas = correct | ✅ VALID (praise) | Spec §"What We're NOT Building" already covers this | None — already documented | N/A |
| 4 | "Overestimating llms.txt importance" | ✅ VALID | Spec says "llms.txt adoption" as a success metric with "Immediate" target — this implies it's a goal, not foundation | **Update spec** — demote llms.txt from success metric to "infrastructure baseline" | `_spec.md` |
| 5 | "Too much focus on documentation layer" — 11 docs dangerous | ❌ REJECT | Law 3 (Single Documentation Rule) REQUIRES this doc set. README, spec, impl, marketing, website, helpdoc, firebase, mobile-support are MANDATORY per `00. MASTER RULES & WORKFLOW.md`. Archive docs are required by Law 3 archive rules. | None — ChatGPT doesn't know our doc structure rules | N/A |
| 6 | "Missing the core strategic lever" — primary link adoption is #1 | ✅ VALID | Spec §Long-Term Vision Year 1-2 mentions "OBP adoption pushed" but buries it in a list. Should be elevated as THE #1 priority | **Update spec** — add explicit "Primary Link Adoption" as #1 real-world priority. **Update impl** — add to Phase 2 monitoring | `_spec.md`, `_impl.md` |
| 7 | "Agent readiness framing too early" — agents aren't buying SMB menu APIs | ❌ REJECT | Spec §"MenuList's Role" already says: "MenuList is NOT selling to agents. MenuList is the canonical structured data source that agents read and trust." The spec explicitly positions this as preparation, not agent commerce. ChatGPT is arguing against a position our docs don't take. | None — our docs already frame this correctly | N/A |
| 8 | Priority 1: Primary link adoption | ✅ VALID (partially covered) | Spec §Long-Term Vision mentions OBP adoption. But not prominent enough as THE strategic priority. | **Update spec** — add "Immediate Priority" section before Long-Term Vision | `_spec.md` |
| 9 | Priority 2: Dataset quality | ❌ REJECT | Already covered. Spec §"MenuList Advantage" point 3: "Validated (MCE correctness engine)". Spec §Goals: "Structured data quality — 100% (already achieved)". Spec §Long-Term Vision: "Data accuracy obsession (MCE, validation)". Marketing §"What Makes MenuList Different": "Validated by correctness engine, Owner-maintained = always fresh". | None — extensively covered already | N/A |
| 10 | Priority 3: OBP distribution (links everywhere) | ❌ REJECT | Already covered. Spec §Long-Term Vision Year 1-2: "OBP adoption pushed (link in Google, QR, WhatsApp)". Spec §Year 2-3: "OBP URLs spread across internet (Google listings, bios, QR)". Marketing §Go-to-Market already covers India/WhatsApp + global messaging. | None — covered in spec + marketing | N/A |

---

## Detailed Analysis

### Point 1: llms.txt = "table stakes not moat"

**ChatGPT says:** llms.txt is good but treat as hygiene layer, not "agent readiness achieved."

**Codebase reality:** Our spec §Goals has "llms.txt adoption" as a success metric with target "Immediate." This implies it's a deliverable goal, when it should be framed as baseline infrastructure.

**Decision:** ✅ VALID — Add explicit "hygiene layer" framing to spec. Clarify that llms.txt is foundation, not strategic differentiator. The real differentiator is data quality + adoption.

### Point 5: "Too much documentation"

**ChatGPT says:** 11 docs + decision matrices + archives = too doc-heavy, focus on real-world usage.

**Our reality:** `00. MASTER RULES & WORKFLOW.md` Law 3 mandates: README, spec, impl, marketing, website, helpdoc, firebase, mobile-support for EVERY feature. Archive folder is REQUIRED for ChatGPT reviews and feedback audits. The 11 files are the MINIMUM compliant set, not over-documentation.

**Decision:** ❌ REJECT — ChatGPT doesn't know our documentation discipline requirements. This is not optional — it's Law 3 compliance.

### Point 6: "Missing primary link adoption lever"

**ChatGPT says:** Nothing in the implementation touches making MenuList the primary public link of SMBs. This is the real battlefield.

**Our reality:** The spec mentions OBP adoption in the Long-Term Vision (Year 1-2) but doesn't elevate it as THE core driver. ChatGPT is right that this deserves more prominence — not because we missed it, but because the spec should make the priority hierarchy clearer.

**Decision:** ✅ VALID — Add an "Immediate Priorities" section to spec that explicitly ranks: (1) Primary link adoption > (2) Dataset accuracy > (3) Agent discovery preparation. This makes the hierarchy unambiguous.

### Point 7: "Agent readiness framing too early"

**ChatGPT says:** Right now agents are not buying SMB menu APIs. Optimize for agents too early = building for non-existent demand.

**Our reality:** Spec §"MenuList's Role" line 82: *"MenuList is NOT selling to agents. MenuList is the canonical structured data source that agents read and trust. The business model doesn't change (SMB subscriptions)."* And impl §"Disagreements" explicitly rejects agent API, per-request pricing, and UCP. Our docs already frame this as *preparation*, not commerce.

**Decision:** ❌ REJECT — ChatGPT is arguing against a straw man. Our docs explicitly say we're NOT building for agents as customers. The entire feature is positioned as "make existing public pages more discoverable" — static files only, zero Firebase cost, zero new APIs.

---

## Implementation Plan

### Priority Updates (doc changes only)

1. **`_spec.md`** — Add "Immediate Priorities" section with explicit hierarchy: adoption > accuracy > agent prep
2. **`_spec.md`** — Reframe Goals table: demote llms.txt from "success metric" to "infrastructure baseline"
3. **`_spec.md`** — Add founder clarity note: this feature is hygiene/foundation, the real work is adoption
4. **`_impl.md`** — Add "Strategic Context" note in Phase 2 clarifying adoption is the real metric
5. **`_marketing.md`** — No changes needed (already correctly focused on SMB value, not agent value)

### Rejected (with reasoning)

1. "Too many docs" — REJECTED: Law 3 compliance requires this doc set
2. "Agent readiness too early" — REJECTED: Docs already frame correctly as preparation, not commerce
3. "Dataset quality missing" — REJECTED: Already covered extensively in spec + marketing
4. "OBP distribution missing" — REJECTED: Already covered in spec Year 1-2 + marketing Go-to-Market

---

## Final Status: READY — 3 doc updates needed (spec + impl, no code changes)

---

**Architect Signature:** Cascade (Lead Architect)
**Timestamp:** February 19, 2026
**Audit Status:** COMPLETE
