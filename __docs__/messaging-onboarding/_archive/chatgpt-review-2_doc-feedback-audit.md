# Messaging Onboarding — ChatGPT Review #3 (Doc Feedback Audit)

**Source:** ChatGPT pre-build stress-test review (Feb 17, 2026)  
**Reviewed By:** Cascade (codebase cross-check)  
**Date:** February 17, 2026  
**Mode:** DOCS ONLY — No code changes

---

## Feedback Audit Table

| #        | ChatGPT Point                                                  | Valid?                       | Codebase/Doc Evidence                                                                                                                                                                                                                             | Action                                                                                | Target Doc             |
| -------- | -------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------- |
| ISSUE 1  | "Every message safely ignorable" — add as hard rule            | ✅ PARTIAL                   | Spec already handles: sticker/location → silent ignore, video/audio → reply, text → contextual. BUT: no explicit invariant stating "no message can corrupt state"                                                                                 | **ADD** implementation invariant: "safe-ignore principle"                             | `_impl.md`             |
| ISSUE 2  | "Anyone with link can publish" — require WhatsApp confirmation | ❌ REJECT                    | `previewToken` (min 20 chars) is sent ONLY to owner's WhatsApp. This IS a magic link to a verified channel. Adding "Reply YES" contradicts zero-friction goal. Menu data is not financial/sensitive. If owner forwards link, that's their choice. | **REJECT** WhatsApp confirmation. **ADD** explicit security model documentation       | `_impl.md`             |
| ISSUE 3  | "Cost explosion from repeated extractions" — max 2 cap         | ✅ VALID                     | `session.processingRuns` field exists (`_impl.md:314`) and `pendingUploadsWhileProcessing` exists (`_impl.md:317`). BUT: no explicit cap on extraction count per session. Valid cost risk.                                                        | **ADD** `MAX_PROCESSING_RUNS_PER_SESSION: 2` constant and enforcement logic           | `_spec.md`, `_impl.md` |
| ISSUE 4a | "businessType must never block system"                         | ✅ PARTIAL (already handled) | Impl §8.4, §17.8, §18.4 document fallbacks. `getDefaultTimeSlotPresets()`, `getBusinessCategory()` work with any type. Preview has editable dropdown. BUT: no explicit non-blocking rule documented.                                              | **ADD** explicit principle: "businessType never blocks publish or breaks UI"          | `_impl.md`             |
| ISSUE 4b | "Add `typeSource` field"                                       | ✅ VALID                     | No `typeSource` field exists. Useful for audit trail and future manual correction.                                                                                                                                                                | **ADD** `typeSource: 'ai' \| 'fallback' \| 'manual'` to session schema                | `_impl.md`             |
| ISSUE 5  | "Over-engineering risk — build smallest v1"                    | ✅ ALREADY HANDLED           | `MESSAGING_ONBOARDING_PROVIDERS` defaults to `['whatsapp']`. Only WhatsApp adapter built. Global infra dormant. Aligns with 3-Year Freeze law.                                                                                                    | **ADD** explicit "v1 Scope Discipline" section documenting what's built vs dormant    | `_spec.md`             |
| SUBTLE   | "System must feel alive during processing"                     | ✅ VALID                     | Spec has "Got it. Preparing your menu." but no progress signals during 30-120s extraction. Owner might think system died.                                                                                                                         | **ADD** "Your menu is being prepared..." progress message sent when extraction starts | `_spec.md`, `_impl.md` |

---

## 5 Founder Decisions — Cascade Recommendations

### Q1: Approval Security

**ChatGPT options:** A) Preview click enough, B) Require WhatsApp confirmation

**Cascade Recommendation: A (Preview click enough)**

Reasoning:

- `previewToken` is a unique 20+ char token sent ONLY to owner's verified WhatsApp number
- This IS a magic link — equivalent to email verification links used by every SaaS product
- The token never leaves the WhatsApp conversation unless the owner forwards it
- Adding "Reply YES" step: +1 WhatsApp API call cost, +latency, breaks zero-friction promise
- Menu data is not sensitive (it's public data — the menu goes live anyway)
- If owner forwards link to manager who approves → that's the business owner's delegation, which is fine

### Q2: Max Extractions Per Session

**ChatGPT options:** A) Unlimited, B) Max 2 per session

**Cascade Recommendation: B (Max 2 per session)**

Reasoning:

- `session.processingRuns` counter already exists in schema
- Each extraction costs ~₹2-5 in AI API calls (Gemini)
- Without cap: malicious/confused user could trigger 10+ extractions = ₹50+ per session
- With cap: after 2 extraction runs, system asks owner to send fresh photos in a new message
- `pendingUploadsWhileProcessing` already prevents concurrent extraction — cap prevents sequential spam

### Q3: v1 Scope Discipline

**ChatGPT options:** A) Full global-ready, B) WhatsApp-India perfect v1, global dormant

**Cascade Recommendation: B (WhatsApp-India v1, global dormant)**

Reasoning:

- Already our approach: `MESSAGING_ONBOARDING_PROVIDERS: ['whatsapp']` (only WhatsApp enabled)
- `IMessagingProvider` interface exists for future providers but only `WhatsAppAdapter` is implemented
- India-first: INR default currency, +91 phone pattern, Hindi/English primary
- Feature flags gate everything — zero code execution for disabled providers

### Q4: Business Type Usage

**ChatGPT options:** A) Hard dependency everywhere, B) Soft intelligence layer only

**Cascade Recommendation: B (Soft intelligence layer only)**

Reasoning:

- Already our approach per §8.4, §17.8, §18.4
- businessType drives: defaults, tone, schema prompts, OBP styling
- businessType NEVER: blocks publish, breaks UI, restricts features, gates access
- Fallback: "Restaurant" / "food" if detection fails or confidence low
- Preview page: editable dropdown — owner can always correct

### Q5: Confused Message Handling

**ChatGPT options:** A) Try to interpret, B) Safely ignore unless clear

**Cascade Recommendation: B (Safely ignore unless clear)**

Reasoning:

- Already our approach per spec Failure Handling table
- Sticker/location/contact → silently ignored
- Text in image-expected states → contextual reply ("Please send menu photos")
- Unknown message types → silently ignored
- No message should ever corrupt state or trigger unintended processing

---

## Summary

| Decision | ChatGPT | Cascade | Reasoning                                                | Status                               |
| -------- | ------- | ------- | -------------------------------------------------------- | ------------------------------------ |
| Q1       | A or B  | **A**   | Token = magic link to verified channel                   | ✅ Applied (INV-2, ADR-13)           |
| Q2       | A or B  | **B**   | Cost protection, `processingRuns` counter already exists | ✅ Applied (INV-3)                   |
| Q3       | A or B  | **B**   | Already our approach via feature flags                   | ✅ Applied (v1 Scope Discipline)     |
| Q4       | A or B  | **B**   | Already our approach with fallbacks                      | ✅ Applied (INV-4, typeSource field) |
| Q5       | A or B  | **B**   | Already our approach per spec                            | ✅ Applied (INV-1)                   |

---

## Doc Changes Applied

| File        | Changes                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `_impl.md`  | Added §1B Implementation Invariants (INV-1 through INV-4), `typeSource` field to session schema, Phase 4 tasks 4.5f + 4.5g, updated status line                    |
| `_spec.md`  | Added v1 Scope Discipline section, System Presence Principle, extraction cap row in Failure Handling, updated Risks table with INV references, updated status line |
| `README.md` | Version history updated to v1.8                                                                                                                                    |

---

_Audit completed: Feb 17, 2026. All items evaluated against codebase. Decisions applied. Docs updated._
