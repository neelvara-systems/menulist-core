# Doc Feedback Audit — ChatGPT Review #5 (Full Spec Conversation)

**Date:** February 17, 2026
**Source:** ChatGPT comprehensive spec-building conversation (Minimal Build Spec + State Machine + Edge Cases + Asset Intelligence + Approval Authority + Payment Model + Global Defaults + Final Walkthrough)
**Evaluated by:** Cascade (full codebase access + v1.9 doc cross-check)

## Summary

**Total Sections Reviewed:** 17 major spec sections from ChatGPT
**Already Covered:** 15/17 (88%) — fully present in our v1.9 docs
**Genuine Gaps Found:** 2 — actionable items added to docs
**Conflicts with Our Decisions:** 1 — ChatGPT's approval authority model (phone+token) was already overridden by ADR-13 (token-only) in Review #3
**ChatGPT Internal Inconsistency:** 1 — correction limit says "3" in Build Spec but "2 cycles" in Cost Control section

## Audit Table

| # | ChatGPT Section | Valid? | Our Doc Evidence | Action | Target Doc |
|---|----------------|--------|-----------------|--------|-----------|
| 1 | V1 Scope (Section 0) | ✅ Already covered | spec §Scope (In-Scope, Out of Scope, Future Scope) | None | — |
| 2 | Core Entity Schema (Section 1) | ✅ Already covered | impl §3.1 — more detailed than ChatGPT's version | None | — |
| 3 | Session States (Section 2) | ✅ Already covered | spec §State Machine — same 11 states | None | — |
| 4 | Message Handling (Section 3) | ✅ Already covered | impl §4.1 webhook handler | None | — |
| 5 | Upload Collection (Section 4) | ✅ Already covered | spec §Smart Intake Logic | None | — |
| 6 | Processing Trigger (Section 5) | ✅ Already covered | spec §Smart Intake Logic (Fast Start, PDF Start, Max Wait) | None | — |
| 7 | Asset Intelligence (Section 6) | ✅ Already covered | impl §8.4 Gemini prompt + spec §Asset Intelligence Layer | None | — |
| 8 | Validation Logic (Section 7) | ✅ Already covered | spec §Asset Intelligence → Decision Logic table | None | — |
| 9 | Business Type (Section 8) | ✅ Already covered | impl §17.8 + INV-4 (non-blocking, soft intelligence) | None | — |
| 10 | Menu Extraction (Section 9) | ✅ Already covered | impl §8.1 + INV-3 (max 2 runs) | None | — |
| 11 | Preview/Publish (Sections 10-13) | ✅ Already covered | spec §Preview Page + impl §4.2 + §8.2.1 + §8.2.7 | None | — |
| 12 | Payment Model (Sections 14-16) | ✅ Already covered | impl §17 (ADR-12) — 24h grace, restricted dashboard, pay to unlock | None | — |
| 13 | Abuse Limits (Section 17) | ✅ Already covered | spec §Abuse Prevention table — same numbers (except correction limit inconsistency) | None | — |
| 14 | Session Lifecycle Decisions | ✅ Already covered | 24h expiry ✅, new session after expiry ✅, never after publish ✅ (INV-7) | None | — |
| 15 | **Forbidden State Transitions** | ⚠️ GAP | spec §State Machine has valid transitions but NOT explicit forbidden list | **Add** | spec.md |
| 16 | **Session Creation Trigger** | ⚠️ GAP | Test case H-01 says "only on first valid media" but spec doesn't state this rule explicitly | **Add** | spec.md |
| 17 | Approval Authority (phone+token match) | ❌ CONFLICT | ADR-13 (INV-2) decided token-only. ChatGPT's phone verification was rejected in Review #3. | **Reject** | — |
| 18 | Global Defaults (language, currency, timezone) | ✅ Already covered | impl §18.3 (phone→country→currency), §17.8 (business type fallback) | None | — |
| 19 | Build Order (7 phases) | ✅ Already covered | impl §7 Implementation Phases | None | — |
| 20 | pendingUploads during processing | ✅ Already covered | impl §3.1 schema: `pendingUploadsWhileProcessing: boolean` | None | — |
| 21 | State Machine Deep Dive (all states) | ✅ Already covered | spec §State Machine + impl §3.1 | None | — |
| 22 | Edge Cases (20 scenarios) | ✅ Already covered | test-cases §A through §N (136+ test cases) | None | — |
| 23 | Asset Intelligence Decision Engine | ✅ Already covered | impl §8.4 Gemini prompt + spec §Asset Intelligence Layer | None | — |
| 24 | System Personality (Strict Mode) | ✅ Already covered | INV-1 through INV-8 encode strict mode behavior | None | — |
| 25 | Visiting card detection (India-specific) | ✅ Already covered | impl §8.4 prompt: "Invalid: business cards" | None | — |
| 26 | Correction limit: "2 cycles" vs "3" | ❌ ChatGPT inconsistent | ChatGPT Build Spec §17 says "max corrections = 3", Cost Control says "2 cycles". Our spec: 3. | **Keep 3** | — |

## Decisions

### ACCEPTED (2 items — genuine gaps)

1. **Forbidden State Transitions List** → Add to spec §State Machine
   - ChatGPT lists 5 transitions that must never happen
   - Our table only shows valid transitions; having explicit forbidden list adds safety
   
2. **Session Creation Trigger Rule** → Add to spec §State Machine  
   - ChatGPT is very explicit: "Session starts when first valid media is received, NOT on text/emoji/sticker"
   - Our H-01 test case says this, but spec itself doesn't state this rule

### REJECTED (2 items — conflicts with our decisions)

1. **Approval Authority: phone+token match** → REJECT
   - ChatGPT says "friend cannot publish" and "publish requires token + owner phone match"
   - Our ADR-13 (INV-2) decided token-only authentication (founder chose option B in Review #3)
   - Forwarded links CAN approve — owner's delegation choice
   - Already fixed in spec, test cases F-04, I-07 during v1.9 audit

2. **Correction limit "2 cycles"** → REJECT (keep 3)
   - ChatGPT's own Build Spec says "max corrections = 3" (consistent with our docs)
   - The "2 cycles" in Cost Control section is ChatGPT's internal inconsistency
   - Our spec correctly says 3

## Conclusion

This ChatGPT conversation was the **foundational spec-building session** from which our docs evolved. After 4 subsequent reviews and deep codebase cross-checks, our v1.9 docs are MORE complete and MORE accurate than this original conversation. The 2 genuine gaps (forbidden transitions + session creation trigger) are minor clarifications, not missing features.
