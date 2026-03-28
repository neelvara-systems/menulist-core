# Canonica — Guided Workflows: Mobile Support Assessment

> **Status:** DESIGNED — Ready for Implementation
> **Version:** 1.0.0
> **Created:** 2026-03-08
> **Last Updated:** 2026-03-08
> **Audience:** Developers

---

## Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|-------|
| 1 — Frequency | Is this used daily/multiple times per day? | Procedure answers are consumed by end users frequently, but AUTHORING is occasional (governance hub) | ⚠️ Partial |
| 2 — Speed | Completes in <5 seconds? | Procedure retrieval: <300ms ✅. Procedure authoring: multi-step form ❌ | ⚠️ Partial |
| 3 — Touch | Works with thumb-only? | Reading procedure steps: ✅. Authoring step editor: ❌ (requires precise input) | ❌ No |
| 4 — Value | Needed away from desk? | Reading: possibly. Authoring: no (governance is desk work) | ⚠️ Partial |

**Verdict: PARTIAL — Consumption mobile-friendly, authoring desktop-only**

---

## Mobile Assessment

### Consumption Side (Widget/End Users)
- **Mobile-friendly by default** — Widget renders procedure steps as numbered list
- **Step cards work well on mobile** — Vertical list of atomic steps is inherently mobile-friendly
- **Warnings/prerequisites display cleanly** — Simple alert boxes
- **No mobile-specific development needed for consumption**

### Authoring Side (Governance Hub)
- **Desktop-only for v1** — Step editor requires:
  - Drag-and-drop reordering
  - Action dropdown per step
  - Multiple text inputs per step
  - Optional collapsible sections
- **Mobile authoring deferred** — Governance hub is admin tool, used at desk
- **Mobile read-only view of procedure answers in governance hub** — Can view but not edit

### Shared Logic
- **DAL:** Same `canonicalAnswers.ts` functions (no separate mobile DAL)
- **Types:** Same `CanonicaProcedure`, `CanonicaProcedureStep` types
- **Validation:** Same `procedureValidation.ts` logic
- **Feature flag:** Same `ENABLE_CANONICA_GUIDED_WORKFLOWS`

---

## Mobile-Specific Considerations

| Aspect | Decision |
|--------|----------|
| Step rendering in widget | Numbered vertical list — inherently mobile-friendly |
| Warning display | Alert banner above/below steps — works on all screen sizes |
| Prerequisite display | Info banner — works on all screen sizes |
| Step editor | Desktop-only in v1 |
| Step viewer in governance | Read-only on mobile (Ant Design Steps component responsive) |

---

## No Mobile-Specific Files Required

This feature does not require a dedicated mobile screen because:
1. Consumption happens in the client's widget (their responsibility)
2. Authoring happens in governance hub (desktop admin tool)
3. The structured data format (JSON steps) is inherently device-agnostic

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-08 | 1.0.0 | Initial mobile assessment |
