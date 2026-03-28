# Canonica — Guided Workflows: Business Specification

> **Status:** DESIGNED — Ready for Implementation
> **Version:** 1.0.0
> **Created:** 2026-03-08
> **Last Updated:** 2026-03-08
> **Audience:** CEO, PM, Clients
> **Feature Flag:** `ENABLE_CANONICA_GUIDED_WORKFLOWS`

---

## 1. Problem Statement

Most SaaS support queries fall into three classes:

| Class | Example | Current Canonica Answer | Problem |
|-------|---------|------------------------|---------|
| 1 — Concept | "What is workspace visibility?" | Explanation text ✅ | Works well |
| 2 — Navigation | "Where do I change billing email?" | Explanation text ⚠️ | Adequate but could be more precise |
| 3 — Procedural | "How to invite a teammate?" | Explanation text ❌ | Paragraphs fail. Users need steps. |

**~60-70% of SaaS support load is Class 3 (procedural)**. These queries require deterministic, step-by-step instructions — not prose explanations. Current Canonica canonical answers serve all three classes as text blobs (`structuredSummary` + `detailedExplanation`), which is insufficient for procedural queries.

**Industry evidence:**
- Intercom Fin 3 (2025) introduced "Procedures" as first-class objects for deterministic multi-step interactions
- Zendesk AI agents use "Generative Procedures" tied to use cases for step-by-step resolution
- Schema.org defines `HowTo` + `HowToStep` as the web standard for structured instructions
- SOP documentation best practices confirm: step-based procedures allow even unfamiliar users to execute tasks reliably

---

## 2. Solution

Add a **procedure structure** to Canonica's existing canonical answer system. When a canonical answer represents a procedural workflow, it carries structured steps instead of (or in addition to) prose text.

### What Changes

| Aspect | Before | After |
|--------|--------|-------|
| Answer content | Text only (structuredSummary + detailedExplanation) | Text + optional structured procedure (steps, warnings, prerequisites) |
| Answer type | Implicit (always explanation) | Explicit: `explanation` \| `navigation` \| `procedure` |
| Widget response | Plain text | Plain text OR structured steps (based on answerType) |
| Authoring UI | Text areas only | Text areas + step editor (when procedure) |
| Retrieval | Returns text | Returns text OR structured procedure object |

### What Does NOT Change

- Canonical-first retrieval pipeline (same 3-layer stack)
- Entity matching and specificity scoring
- Governance: drift detection, mutation proposals, audit logs
- 2-read retrieval cost (search index + answer document)
- Existing text-only answers continue working unchanged
- Feature flag architecture

---

## 3. User Stories

### For SaaS Founders (Canonica Clients)

**US-1:** As a SaaS founder, I want to create step-by-step procedure answers so that my users get clear, actionable instructions instead of paragraphs.

**US-2:** As a SaaS founder, I want to add warnings to procedural answers so that users are alerted before performing destructive actions (e.g., "Deleting a workspace removes all data permanently").

**US-3:** As a SaaS founder, I want to add prerequisites to procedural answers so that users know what role/plan/state is required before attempting a workflow (e.g., "Requires Admin role").

**US-4:** As a SaaS founder, I want procedure answers to be version-tracked so that when my product UI changes, outdated procedures are flagged for review.

**US-5:** As a SaaS founder, I want the mutation engine to propose content refinements for procedure answers when users report they're unclear or outdated.

### For End Users (Users of SaaS Products Using Canonica)

**US-6:** As an end user, I want to receive numbered step-by-step instructions when I ask "how to" questions, so I can follow along without confusion.

**US-7:** As an end user, I want to see warnings before following destructive procedures, so I understand the consequences.

**US-8:** As an end user, I want to see prerequisites clearly, so I know if I have the right permissions before attempting a workflow.

### For the Canonica System

**US-9:** As the retrieval engine, when a `how_to` intent is detected and the matched canonical answer has `answerType === 'procedure'`, I return the structured procedure object instead of just text.

**US-10:** As the drift engine, when a product release occurs, I flag procedure answers whose `productBinding.lastValidatedInVersion` is below the new release version — because product UI changes frequently break procedure steps.

---

## 4. Answer Type Classification

| Answer Type | When to Use | Content Required | Example |
|-------------|-------------|------------------|---------|
| `explanation` | Concept questions, feature descriptions | `structuredSummary` + `detailedExplanation` | "What is SSO?" |
| `navigation` | Location questions | `structuredSummary` + optional `procedure` (1-3 steps) | "Where is the billing page?" |
| `procedure` | How-to questions, workflow instructions | `procedure.steps[]` (required, 1-12 steps) | "How to invite a teammate?" |

**Default:** All existing answers are `explanation` (backward compatible).

---

## 5. Procedure Step Structure

Each step represents **one atomic user action**.

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `stepOrder` | ✅ | Integer position (1-based) | `1` |
| `action` | ✅ | Verb from approved vocabulary | `"click"` |
| `instruction` | ✅ | Human-readable instruction (≤80 chars) | `"Click Team Members"` |
| `target` | Optional | UI element identifier | `"team_members_tab"` |
| `expectedResult` | Optional | What should happen after | `"Team members page opens"` |
| `troubleshootingHint` | Optional | Fallback if step fails | `"If disabled, check permissions"` |

### Approved Action Vocabulary (v1)

```
open, navigate, click, select, enter, toggle, submit, confirm, 
download, upload, copy, paste, scroll, expand, collapse
```

15 verbs. Enforced at write-time. Extensible via additive update.

### Step Constraints

- **Max steps per procedure:** 12
- **Max instruction length:** 80 characters
- **One action per step:** No compound instructions
- **Linear flow only:** No conditional branching in v1
- **No screenshots/media in v1:** Text-only steps

---

## 6. Warnings and Prerequisites

### Warnings

Displayed before or after procedure steps. For destructive or important context.

| Field | Required | Description |
|-------|----------|-------------|
| `message` | ✅ | Warning text (≤200 chars) |
| `severity` | ✅ | `info` \| `warning` \| `destructive` |

**Examples:**
- `{ message: "Deleting a workspace permanently removes all projects", severity: "destructive" }`
- `{ message: "Invited users gain access immediately", severity: "info" }`

### Prerequisites

Conditions that must be met before executing the procedure.

| Field | Required | Description |
|-------|----------|-------------|
| `description` | ✅ | Human-readable prerequisite (≤200 chars) |
| `type` | ✅ | `role` \| `plan` \| `state` \| `general` |
| `value` | Optional | Machine-readable identifier (e.g., `"admin"`, `"pro"`) |

**Examples:**
- `{ description: "You must be a workspace owner", type: "role", value: "owner" }`
- `{ description: "Requires Pro plan or higher", type: "plan", value: "pro" }`

---

## 7. Procedure Authoring Flow

### Manual Creation (v1)
1. Founder opens Canonical Answer Editor in Governance Hub
2. Creates new answer → selects `answerType: procedure`
3. Step editor appears: add steps with action dropdown + instruction input
4. Optionally adds warnings and prerequisites
5. Saves → answer enters standard governance lifecycle (draft/active/archived)

### AI-Assisted Drafting (Future — v2)
- Founder pastes documentation text
- AI segments into atomic steps using approved action vocabulary
- Founder reviews and refines
- Goes through same approval flow

---

## 8. Widget/API Response Format

When a procedure answer is returned:

```json
{
  "answer": "To invite a teammate, follow these steps:",
  "canonical": true,
  "confidence": "high",
  "answerType": "procedure",
  "procedure": {
    "steps": [
      { "stepOrder": 1, "action": "open", "instruction": "Open Settings" },
      { "stepOrder": 2, "action": "click", "instruction": "Click Team Members" },
      { "stepOrder": 3, "action": "click", "instruction": "Click Invite User" }
    ],
    "warnings": [
      { "message": "Invited users gain access immediately", "severity": "info" }
    ],
    "prerequisites": [
      { "description": "You must be a workspace admin", "type": "role", "value": "admin" }
    ]
  }
}
```

When an explanation answer is returned (unchanged):

```json
{
  "answer": "SSO allows users to authenticate using their organization's identity provider.",
  "canonical": true,
  "confidence": "high",
  "answerType": "explanation"
}
```

---

## 9. Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Procedure coverage | 30%+ of canonical answers are type `procedure` within 3 months | Count by answerType |
| Canonical hit rate for `how_to` queries | Increase by 15%+ | Coverage KPI filtered by intent |
| User satisfaction on procedure answers | Higher than text-only answers | Feedback signals on procedure vs explanation answers |
| Procedure step clarity | Average ≤5 steps per procedure | Step count aggregation |

---

## 10. Out of Scope (v1)

- Conditional branching / if-else logic in steps
- Screenshots / media attachments in steps
- Interactive guided walkthroughs / UI highlighting
- Automated step generation from documentation
- Sub-procedures / procedure chaining
- Product tour automation
- Step analytics (which step users fail on)

These are valid future enhancements. The v1 architecture supports them without redesign.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-08 | 1.0.0 | Initial specification |
