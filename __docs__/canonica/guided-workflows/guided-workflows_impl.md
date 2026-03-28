# Canonica — Guided Workflows: Technical Implementation

> **Status:** DESIGNED — Ready for Implementation
> **Version:** 1.0.0
> **Created:** 2026-03-08
> **Last Updated:** 2026-03-08
> **Audience:** Developers
> **Feature Flag:** `ENABLE_CANONICA_GUIDED_WORKFLOWS`
> **Dependencies:** Context-Aware Support (#1) — IMPLEMENTED

---

## §1 — System Goals

Convert Canonica canonical answers from text-only to optionally structured procedures. Enable deterministic, step-based answers for procedural ("how to") queries while maintaining backward compatibility, zero new collections, and 2-read retrieval cost.

---

## §2 — Position Inside Canonica Architecture

```
                    ┌─────────────────────────────────┐
                    │  PILLAR 2 — Canonical Answer     │
                    │  Engine (ENHANCED)               │
                    │                                   │
                    │  answerType: explanation          │  ← existing
                    │  answerType: navigation           │  ← new
                    │  answerType: procedure            │  ← new (this feature)
                    │    └─ procedure.steps[]           │
                    │    └─ procedure.warnings[]        │
                    │    └─ procedure.prerequisites[]   │
                    └─────────────────────────────────┘
                              ↑               ↑
                    ┌─────────┘               └──────────┐
              Pillar 1                              Pillar 3
          Product Ontology                    Drift Governance
         (entity binding)               (version drift on procedures)
                    ↑                               ↑
              Pillar 4                          Pillar 5
         Signal Mutation                    API & Integration
    (procedure refinement               (structured response
         proposals)                         in widget/API)
```

**This feature enhances Pillar 2 only.** All other pillars interact with it via existing interfaces.

---

## §3 — Data Model Changes

### §3.1 — New Types (Additive)

Add to `src/types/canonica/index.ts`:

```typescript
// ═══════════════════════════════════════════════════════════════
// GUIDED WORKFLOWS (Expansion Item #2)
// ═══════════════════════════════════════════════════════════════

export const CANONICA_ANSWER_TYPES = {
  EXPLANATION: "explanation",
  NAVIGATION: "navigation",
  PROCEDURE: "procedure",
} as const;

export type CanonicaAnswerType =
  (typeof CANONICA_ANSWER_TYPES)[keyof typeof CANONICA_ANSWER_TYPES];

export const CANONICA_PROCEDURE_ACTIONS = {
  OPEN: "open",
  NAVIGATE: "navigate",
  CLICK: "click",
  SELECT: "select",
  ENTER: "enter",
  TOGGLE: "toggle",
  SUBMIT: "submit",
  CONFIRM: "confirm",
  DOWNLOAD: "download",
  UPLOAD: "upload",
  COPY: "copy",
  PASTE: "paste",
  SCROLL: "scroll",
  EXPAND: "expand",
  COLLAPSE: "collapse",
} as const;

export type CanonicaProcedureAction =
  (typeof CANONICA_PROCEDURE_ACTIONS)[keyof typeof CANONICA_PROCEDURE_ACTIONS];

export const CANONICA_WARNING_SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  DESTRUCTIVE: "destructive",
} as const;

export type CanonicaWarningSeverity =
  (typeof CANONICA_WARNING_SEVERITY)[keyof typeof CANONICA_WARNING_SEVERITY];

export const CANONICA_PREREQUISITE_TYPE = {
  ROLE: "role",
  PLAN: "plan",
  STATE: "state",
  GENERAL: "general",
} as const;

export type CanonicaPrerequisiteType =
  (typeof CANONICA_PREREQUISITE_TYPE)[keyof typeof CANONICA_PREREQUISITE_TYPE];

export interface CanonicaProcedureStep {
  stepOrder: number; // 1-based integer
  action: CanonicaProcedureAction; // From approved vocabulary
  instruction: string; // ≤80 chars, human-readable
  target?: string; // UI element identifier (optional)
  expectedResult?: string; // What should happen (optional, ≤120 chars)
  troubleshootingHint?: string; // Fallback if step fails (optional, ≤200 chars)
}

export interface CanonicaProcedureWarning {
  message: string; // ≤200 chars
  severity: CanonicaWarningSeverity;
}

export interface CanonicaProcedurePrerequisite {
  description: string; // ≤200 chars, human-readable
  type: CanonicaPrerequisiteType;
  value?: string; // Machine-readable identifier (e.g., "admin", "pro")
}

export interface CanonicaProcedure {
  procedureSlug?: string; // Optional human-readable ID (e.g., "invite_user") for analytics/dedup
  steps: CanonicaProcedureStep[]; // 1-12 steps, required when answerType === 'procedure'
  warnings?: CanonicaProcedureWarning[]; // 0-5 warnings
  prerequisites?: CanonicaProcedurePrerequisite[]; // 0-5 prerequisites
}

// Procedure constraints (enforced at write-time)
export const CANONICA_PROCEDURE_CONSTRAINTS = {
  MAX_STEPS: 12,
  MIN_STEPS: 1,
  MAX_INSTRUCTION_LENGTH: 80,
  MAX_EXPECTED_RESULT_LENGTH: 120,
  MAX_TROUBLESHOOTING_HINT_LENGTH: 200,
  MAX_WARNING_MESSAGE_LENGTH: 200,
  MAX_PREREQUISITE_DESCRIPTION_LENGTH: 200,
  MAX_WARNINGS: 5,
  MAX_PREREQUISITES: 5,
} as const;
```

### §3.2 — Modified Type: CanonicaCanonicalAnswer

Add two new fields (additive, freeze-compliant):

```typescript
export interface CanonicaCanonicalAnswer {
  // ... all existing fields unchanged ...

  answerType?: CanonicaAnswerType; // NEW — defaults to 'explanation' if undefined

  content: {
    structuredSummary: string;
    detailedExplanation: string;
    edgeCases?: string;
    constraints?: string;
    procedure?: CanonicaProcedure; // NEW — required when answerType === 'procedure'
  };
}
```

**Backward compatibility:** `answerType` defaults to `'explanation'` when undefined. All existing answers continue working unchanged.

### §3.3 — Modified Type: CanonicaMutationProposal

Extend `suggestedChange` to support procedure structure:

```typescript
export interface CanonicaMutationProposal {
  // ... all existing fields unchanged ...

  suggestedChange: {
    structuredSummary?: string;
    detailedExplanation?: string;
    edgeCases?: string;
    constraints?: string;
    procedure?: CanonicaProcedure; // NEW — for procedure refinement proposals
  };
}
```

---

## §4 — No New Firestore Collections

**Zero new collections.** All data lives on existing `canonica_canonical_answers` documents.

Procedure data is embedded in the answer document's `content.procedure` field. Firestore document size for a typical procedure answer:

- Base answer fields: ~500 bytes
- 5 steps × ~200 bytes each: ~1,000 bytes
- 3 warnings × ~100 bytes: ~300 bytes
- 2 prerequisites × ~100 bytes: ~200 bytes
- **Total: ~2,000 bytes** (well within Firestore's 1MB limit)

---

## §5 — File Changes

### §5.1 — New Files

| File                                      | Purpose                                       | Lines (est.) |
| ----------------------------------------- | --------------------------------------------- | ------------ |
| `src/lib/canonica/procedureValidation.ts` | Write-time validation for procedure structure | ~80          |

### §5.2 — Modified Files

| File                                                                     | Change                                                                       | Impact                      |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | --------------------------- |
| `src/types/canonica/index.ts`                                            | Add procedure types, answer type enum, constraints const                     | Additive only               |
| `src/config/features.ts`                                                 | Add `ENABLE_CANONICA_GUIDED_WORKFLOWS` flag                                  | Additive only               |
| `src/database/canonica/canonicalAnswers.ts`                              | Add procedure validation on `addCanonicalAnswer` and `updateCanonicalAnswer` | Write-time guard            |
| `src/lib/canonica/canonicalRetrieval.ts`                                 | Return `answerType` in retrieval result                                      | Minor enhancement           |
| `src/app/api/widget/search/route.ts`                                     | Return structured procedure when `answerType === 'procedure'`                | Response format enhancement |
| `src/app/api/helpCenter/search-kb/route.ts`                              | Same procedure response format                                               | Response format enhancement |
| `src/components/templates/canonica/governance/CanonicalAnswerEditor.tsx` | Add step editor UI when `answerType === 'procedure'`                         | UI enhancement              |

---

## §6 — Procedure Validation Logic

New file: `src/lib/canonica/procedureValidation.ts`

Validates procedure structure at write-time (before Firestore write). Called from DAL `addCanonicalAnswer` and `updateCanonicalAnswer`.

### Validation Rules

1. If `answerType === 'procedure'`, `content.procedure` MUST exist
2. If `answerType === 'procedure'`, `content.procedure.steps` MUST have 1-12 items
3. Each step MUST have `stepOrder` (positive integer), `action` (from approved vocabulary), `instruction` (non-empty, ≤80 chars)
4. `stepOrder` values MUST be sequential (1, 2, 3...) with no gaps or duplicates
5. `action` MUST be a value from `CANONICA_PROCEDURE_ACTIONS`
6. Warnings limited to 5, each message ≤200 chars, severity from `CANONICA_WARNING_SEVERITY`
7. Prerequisites limited to 5, each description ≤200 chars, type from `CANONICA_PREREQUISITE_TYPE`
8. If `answerType` is `'explanation'` or `'navigation'` or undefined, `content.procedure` is optional (ignored if present)

### Validation Function Signature

```typescript
export function validateProcedure(
  answerType: CanonicaAnswerType | undefined,
  procedure: CanonicaProcedure | undefined,
): { valid: boolean; errors: string[] };
```

---

## §7 — Retrieval Pipeline Enhancement

### §7.1 — Current Flow (Unchanged)

```
Query → Tokenize → Entity Match → Intent Classify → Fetch Answers → Score → Return Best
```

### §7.2 — Enhancement

In `canonicalRetrieval.ts`, the `CanonicalRetrievalResult` type is extended:

```typescript
export interface CanonicalRetrievalResult {
  found: boolean;
  canonical: boolean;
  answer?: CanonicaCanonicalAnswer;
  matchedEntityIds: string[];
  confidence: "high" | "medium" | "low" | "none";
  fallbackReason?: string;
  answerType?: CanonicaAnswerType; // NEW — exposed for widget/API response
}
```

When returning result, populate `answerType`:

```typescript
return {
  found: true,
  canonical: true,
  answer: bestAnswer,
  matchedEntityIds: topEntityIds,
  confidence,
  answerType: bestAnswer.answerType || "explanation",
};
```

### §7.3 — Intent-Procedure Affinity (Optional Enhancement)

When `how_to` intent is classified and multiple answers match, prefer `answerType === 'procedure'` answers over `explanation` answers. This is a specificity scoring boost, not a hard filter.

In `scoreBySpecificity()`:

```typescript
// Procedure affinity for how_to intent
if (intent === "how_to" && answer.answerType === "procedure") {
  score += 15; // Boost procedure answers for how-to queries
}
```

---

## §8 — Widget/API Response Enhancement

### §8.1 — Widget Search Route (`/api/widget/search`)

When canonical answer has `answerType === 'procedure'`:

```typescript
if (
  canonicalResult.found &&
  canonicalResult.canonical &&
  canonicalResult.answer
) {
  const answer = canonicalResult.answer;
  const response: any = {
    answer:
      answer.content.structuredSummary || answer.content.detailedExplanation,
    canonical: true,
    confidence: canonicalResult.confidence,
    answerType: answer.answerType || "explanation",
    references: [],
  };

  // Include procedure structure when available
  if (answer.answerType === "procedure" && answer.content.procedure) {
    response.procedure = answer.content.procedure;
  }

  return NextResponse.json(response);
}
```

### §8.2 — Search KB Route (`/api/helpCenter/search-kb`)

Same pattern. When canonical answer is procedure type, include `procedure` in response.

---

## §9 — Editor UI Enhancement

### §9.1 — Answer Type Selector

Add `answerType` select field to both create modal and edit drawer in `CanonicalAnswerEditor.tsx`:

```tsx
<Form.Item name="answerType" label="Answer Type" initialValue="explanation">
  <Select
    options={[
      { label: "Explanation", value: "explanation" },
      { label: "Navigation", value: "navigation" },
      { label: "Procedure (Step-by-Step)", value: "procedure" },
    ]}
  />
</Form.Item>
```

### §9.2 — Conditional Step Editor

When `answerType === 'procedure'`, show step editor:

```tsx
{
  answerType === "procedure" && (
    <ProcedureStepEditor
      steps={steps}
      onChange={setSteps}
      maxSteps={CANONICA_PROCEDURE_CONSTRAINTS.MAX_STEPS}
    />
  );
}
```

### §9.3 — Step Editor Component

New component: inline step list with:

- Ordered list with drag-to-reorder (or up/down buttons)
- Per step: Action dropdown (from `CANONICA_PROCEDURE_ACTIONS`) + Instruction input
- Optional fields (target, expectedResult, troubleshootingHint) in collapsible section
- Add/remove step buttons
- Step count indicator (e.g., "3/12 steps")

### §9.4 — Warnings & Prerequisites Editors

Simple list editors with add/remove:

- Warnings: message input + severity select
- Prerequisites: description input + type select + optional value input

### §9.5 — Detail View Enhancement

When viewing a procedure answer in the drawer, render structured steps instead of text:

```tsx
{
  answer.answerType === "procedure" && answer.content.procedure && (
    <Card size="small" title="Procedure Steps">
      <Steps direction="vertical" size="small" current={-1}>
        {answer.content.procedure.steps.map((step) => (
          <Steps.Step
            key={step.stepOrder}
            title={step.instruction}
            description={step.expectedResult}
          />
        ))}
      </Steps>
    </Card>
  );
}
```

---

## §10 — Governance Integration

### §10.1 — Drift Detection

Procedure answers are MORE susceptible to version drift than explanation answers (UI changes break step instructions). The existing drift engine already handles this via `productBinding.lastValidatedInVersion`. No changes needed.

**Enhancement opportunity (future):** Drift detection could specifically flag procedure answers when a new release occurs, since step instructions are more likely to break than conceptual explanations.

### §10.2 — Mutation Proposals

The `suggestedChange` field on `CanonicaMutationProposal` already mirrors the answer `content` structure. Adding `procedure?: CanonicaProcedure` to `suggestedChange` allows the mutation engine to propose procedure refinements.

### §10.3 — Audit Logging

No changes needed. All canonical answer modifications are already logged via the audit trail.

---

## §11 — Feature Flag

Add to `src/config/features.ts`:

```typescript
/**
 * Canonica Guided Workflows (Structured Procedure Answers)
 *
 * true: Canonical answers support answerType (explanation/navigation/procedure)
 *       with structured steps, warnings, and prerequisites.
 *       Widget/API returns procedure structure when available.
 *       Editor UI shows step editor for procedure answers.
 * false: All answers treated as explanation type (existing behavior)
 *
 * Expansion Item #2 — converts text answers to executable procedures.
 * Additive field on existing canonical answer type (freeze-compliant).
 *
 * Requires: ENABLE_CANONICA_CANONICAL_ANSWERS = true
 * @see __docs__/canonica/guided-workflows/
 */
ENABLE_CANONICA_GUIDED_WORKFLOWS: false,
```

### Feature Flag Gating

| Location                 | Gate Logic                                                           |
| ------------------------ | -------------------------------------------------------------------- |
| `procedureValidation.ts` | Skip validation if flag OFF (allow procedure data but don't enforce) |
| Widget/API response      | Only include `procedure` object if flag ON                           |
| Editor UI                | Only show answerType selector + step editor if flag ON               |
| Retrieval scoring        | Only apply `how_to` + `procedure` affinity boost if flag ON          |

When flag is OFF:

- `answerType` field can exist on documents but is ignored
- Procedure data can exist but is not returned in API responses
- Editor shows text-only fields

---

## §12 — Edge Cases & Failure Handling

| Edge Case                                                    | Handling                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------- |
| Existing answer has no `answerType`                          | Treat as `'explanation'` (backward compatible)                        |
| `answerType === 'procedure'` but `content.procedure` is null | Validation blocks write. If read, return text-only response           |
| Procedure has 0 steps                                        | Validation blocks write (min 1 step required)                         |
| Step instruction exceeds 80 chars                            | Validation blocks write with clear error message                      |
| `action` not in approved vocabulary                          | Validation blocks write with list of valid actions                    |
| Duplicate `stepOrder` values                                 | Validation blocks write                                               |
| Non-sequential `stepOrder` (e.g., 1, 3, 5)                   | Validation normalizes to sequential (1, 2, 3)                         |
| Widget client doesn't understand procedure format            | Graceful degradation: `answer` field always contains text summary     |
| Feature flag turned OFF after procedure answers created      | Answers remain in DB. Not returned as structured. Text fallback used. |

---

## §13 — Performance Constraints

| Metric                                | Target                   | Justification                                              |
| ------------------------------------- | ------------------------ | ---------------------------------------------------------- |
| Retrieval latency                     | <300ms (same as current) | No additional reads. Procedure data embedded in answer doc |
| Firestore reads per query             | 2 (unchanged)            | Search index + answer doc                                  |
| Firestore writes per procedure create | 1 (unchanged)            | Single answer doc write                                    |
| Answer document size                  | <5KB typical             | Procedure adds ~1-2KB to answer doc                        |
| Widget response size                  | <3KB typical             | Procedure JSON adds ~500B-1KB                              |

---

## §14 — Observability

| Signal                      | Method                                                                         |
| --------------------------- | ------------------------------------------------------------------------------ |
| Procedure answer created    | Audit log: `action: 'canonical_answer_created'` with `answerType: 'procedure'` |
| Procedure answer served     | Coverage KPI: can filter by `answerType`                                       |
| Procedure validation failed | Console warn with validation errors                                            |
| Procedure answer drifted    | Drift event: same as existing, but procedure answers may drift more often      |

---

## §15 — Implementation Order

| Step | Task                                                                    | Estimated Effort |
| ---- | ----------------------------------------------------------------------- | ---------------- |
| 1    | Add types to `src/types/canonica/index.ts`                              | Small            |
| 2    | Add feature flag to `src/config/features.ts`                            | Small            |
| 3    | Create `src/lib/canonica/procedureValidation.ts`                        | Small            |
| 4    | Update `canonicalAnswers.ts` DAL with validation                        | Small            |
| 5    | Update `canonicalRetrieval.ts` with `answerType` return + scoring boost | Small            |
| 6    | Update widget search route response format                              | Small            |
| 7    | Update search-kb route response format                                  | Small            |
| 8    | Update `CanonicalAnswerEditor.tsx` with step editor UI                  | Medium           |
| 9    | Run `tsc --noEmit` — zero errors                                        | Required         |
| 10   | Update expansion tracker                                                | Small            |

**Total estimated effort: Low-Medium** (most complexity is UI, not infrastructure)

---

## §16 — ADRs (Architecture Decision Records)

### ADR-1: No Separate Procedures Collection

**Decision:** Embed procedure data in the existing `CanonicaCanonicalAnswer.content` field.

**Rationale:**

- Canonical answer is the atomic knowledge unit per Canonica doctrine
- Separate collection breaks "one authoritative answer per scope/version" invariant
- Separate collection adds 1+ read per query (violates 2-read target)
- Firebase cost: 0 additional reads vs 1+ additional read per procedure query

**Alternatives rejected:**

- ChatGPT proposed separate `procedures` collection with referencing via `procedureId`
- Intercom uses separate Procedure objects — but Intercom's procedures are agent automation, not knowledge answers

### ADR-2: No Conditional Branching in v1

**Decision:** Steps are linear only. No if/else, no branching.

**Rationale:**

- Conditional logic creates exponential complexity in authoring, testing, and rendering
- Intercom Fin 3 added branching after years of simpler procedures
- Zendesk procedures use branching but their procedures drive agent behavior, not knowledge delivery
- Prerequisites handle most conditional cases (e.g., "Requires Admin role")
- Architecture supports adding branching later without breaking existing linear procedures

### ADR-3: Action Vocabulary as TypeScript Const

**Decision:** Store approved actions as `CANONICA_PROCEDURE_ACTIONS` const, not a Firestore collection.

**Rationale:**

- Action vocabulary changes rarely (additive only)
- TypeScript const provides compile-time validation
- Zero Firestore reads
- Extensible: add new actions to const without migration

### ADR-4: Backward Compatible via Optional Fields

**Decision:** `answerType` defaults to `'explanation'` when undefined. `content.procedure` is optional.

**Rationale:**

- All existing canonical answers continue working without migration
- No batch update needed for existing documents
- Feature flag controls whether new capabilities are exposed
- Freeze-compliant: additive fields only

---

## Version History

| Date       | Version | Change                           |
| ---------- | ------- | -------------------------------- |
| 2026-03-08 | 1.0.0   | Initial implementation blueprint |
