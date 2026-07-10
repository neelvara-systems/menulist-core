# Description Generation — Product Specification

**Feature:** AI-Powered Menu Item Description Generation  
**Parent Feature:** Projects (Menu Digitization)  
**Status:** Implemented source evidence; not current launch certification
**Last Updated:** January 31, 2026  
**Version:** 2.0

**Launch boundary:** This spec documents the description-generation feature. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, target feature-flag/provider review, AI accounting/source gates, provider smoke, browser/mobile editor QA, and deploy evidence for the target environment.

---

## Executive Summary

Description Generation uses Gemini AI to create professional, appetizing menu item descriptions automatically. Restaurant owners and business operators can generate descriptions in multiple sizes, tones, and languages with a single click.

### What It Does

| Capability           | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| **Generate Empty**   | Create descriptions for items without any description      |
| **Rewrite All**      | Regenerate all descriptions (replaces existing)            |
| **Content Sizes**    | Standard (25-35 words), Detailed (50+ words)               |
| **Tone**             | Professional (locked internally, not user-selectable)      |
| **Multi-Language**   | Generate in all project languages simultaneously           |
| **Batch Processing** | Process multiple files sequentially with progress tracking |

### What It Does NOT Do

| Limitation                   | Reason                                       |
| ---------------------------- | -------------------------------------------- |
| ❌ Allergen information      | Legal compliance—must be verified manually   |
| ❌ Health/medical claims     | Legal liability—no "cures", "prevents", etc. |
| ❌ Preview before apply      | Complexity—can regenerate if unsatisfied     |
| ❌ Individual item selection | Simplicity—operates on file or all files     |
| ❌ Custom prompts            | Consistency—uses tone selection instead      |

---

## Goals & Success Metrics

| Goal                     | Success Metric                                  |
| ------------------------ | ----------------------------------------------- |
| **Professional quality** | Descriptions suitable for customer-facing menus |
| **Fast generation**      | < 5 seconds per item on average                 |
| **Multi-language**       | Same quality and tone across all languages      |
| **Safety**               | Zero inappropriate or harmful content           |
| **Customizable**         | Users can select description length             |
| **Easy to use**          | One-click generation with minimal configuration |

---

## Target Users

| User Type              | Use Case                                                    |
| ---------------------- | ----------------------------------------------------------- |
| **Restaurant Owner**   | Generate descriptions for 50+ menu items without copywriter |
| **Spa/Salon Manager**  | Create service descriptions in professional tone            |
| **Multi-Location**     | Consistent descriptions across all outlets                  |
| **Non-Native Speaker** | Generate descriptions in local language(s)                  |

---

## User Stories

### Story 1: First-Time Description Generation

> "As a restaurant owner who uploaded my menu, I want AI to write appetizing descriptions for all my items without descriptions."

**Acceptance Criteria:**

- Click "Generate Descriptions" in editor
- Select length (Standard/Detailed)
- Tone is Professional (internally locked, no selection needed)
- See count of items needing descriptions
- Click "Generate" to process
- Descriptions appear in all project languages
- Changes auto-saved to database

### Story 2: Rewriting Existing Descriptions

> "As a business owner who wants to change the tone of my descriptions, I want to regenerate all of them with a different style."

**Acceptance Criteria:**

- Click "Generate Descriptions" in editor
- Select new length if desired (Standard/Detailed)
- Click "Rewrite All" to regenerate all descriptions
- All existing descriptions replaced with new ones
- Changes auto-saved to database

### Story 3: Per-File Generation

> "As a user with multiple menu files, I want to generate descriptions for just one specific file."

**Acceptance Criteria:**

- Click retry/description button on specific file preview
- Modal opens with that file pre-selected
- Only items in that file are processed
- Other files remain unchanged

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ ENTRY POINTS                                                         │
│   1. More Actions → "Generate Descriptions"                          │
│   2. Keyboard shortcut                                               │
│   3. Per-file retry button                                           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ DESCRIPTION GENERATOR MODAL                                          │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Stats Bar:                                                     │  │
│  │   "42 items • 15 need description"                            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Description Length:                                            │  │
│  │   ┌──────────────────┐ ┌──────────────────┐                    │  │
│  │   │   Standard       │ │   Detailed       │                    │  │
│  │   │ One clear        │ │ Rich, expressive │                    │  │
│  │   │ sentence         │ │ descriptions     │                    │  │
│  │   └──────────────────┘ └──────────────────┘                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  (Tone locked to Professional internally — not shown to user)        │
│                                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐                   │
│  │  ✨ Generate (15)   │  │  🔄 Rewrite All     │                   │
│  └─────────────────────┘  └─────────────────────┘                   │
│                                                                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PROCESSING                                                           │
│   • "Processing file 1 of 3..."                                      │
│   • Sequential file processing                                       │
│   • Rate limited (20 req/min)                                        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ COMPLETION                                                           │
│   • "Descriptions generated and saved!"                              │
│   • Modal closes automatically                                       │
│   • Editor shows updated descriptions                                │
│   • Changes already saved to database                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Functional Requirements

| ID    | Requirement                            | Priority | Status |
| ----- | -------------------------------------- | -------- | ------ |
| FR-01 | Generate description from item name    | P0       | ✅     |
| FR-02 | Two content sizes (Standard/Detailed)  | P0       | ✅     |
| FR-03 | Multi-language generation              | P0       | ✅     |
| FR-04 | Batch generation for all files         | P0       | ✅     |
| FR-05 | Per-file generation                    | P0       | ✅     |
| FR-06 | Tone locked to Professional internally | P1       | ✅     |
| FR-07 | Progress indicator for batch           | P1       | ✅     |
| FR-08 | Rewrite existing descriptions          | P1       | ✅     |
| FR-09 | Item count preview                     | P2       | ✅     |
| FR-10 | Auto-save after generation             | P1       | ✅     |

### Non-Functional Requirements

| ID     | Requirement              | Target                    | Status |
| ------ | ------------------------ | ------------------------- | ------ |
| NFR-01 | Generation time per item | < 5 seconds average       | ✅     |
| NFR-02 | Content safety           | No harmful content        | ✅     |
| NFR-03 | Legal compliance         | No allergen/health claims | ✅     |
| NFR-04 | Rate limiting            | 20 requests/minute        | ✅     |
| NFR-05 | Input sanitization       | Prompt injection blocked  | ✅     |

---

## Content Configuration

### Content Sizes

| Size         | Word Count  | Prompt Instruction                           | Use Case                    |
| ------------ | ----------- | -------------------------------------------- | --------------------------- |
| **Standard** | 25-35 words | "one or two clear and informative sentences" | Standard menu descriptions  |
| **Detailed** | 45-60 words | "detailed description, multiple sentences"   | Premium items, storytelling |

### Tone

Tone is **locked to Professional** internally. Not exposed to users. This is a locked decision per doctrine — infrastructure means deterministic, predictable output.

### AI Temperature/TopP Matrix

Fixed deterministic values (no tone adjustment):

| Length   | Temperature | TopP | Rationale                |
| -------- | ----------- | ---- | ------------------------ |
| Standard | 0.70        | 0.90 | Focused, concise         |
| Detailed | 0.75        | 0.92 | Slightly more expressive |

---

## Content Safety Rules

### Blocked Content (Legal Compliance)

| Category           | Examples                                   | Reason                              |
| ------------------ | ------------------------------------------ | ----------------------------------- |
| **Allergen info**  | "gluten-free", "nut-free", "dairy-free"    | Must be verified manually for legal |
| **Health claims**  | "cures", "treats", "prevents disease"      | Medical claims require verification |
| **Medical advice** | "good for diabetics", "lowers cholesterol" | Not a medical source                |
| **Inappropriate**  | Vulgar, offensive, or explicit language    | Professional content only           |

### Safety Implementation

1. **Gemini Safety Filters** - `BLOCK_MEDIUM_AND_ABOVE` for all harm categories
2. **System Prompt Rules** - Explicit instructions to never include blocked content
3. **Input Sanitization** - Dangerous prompt patterns removed before processing

---

## Error Messages

| Scenario            | Message                                            |
| ------------------- | -------------------------------------------------- |
| Generation failed   | "Description generation failed. Please try again." |
| Rate limit exceeded | "Too many requests. Please wait X seconds."        |
| No items to process | (Silent skip - shows success with 0 items)         |
| API timeout         | "Description generation failed. Please try again." |

---

## Out of Scope (Phase 2+)

| Feature                   | Reason               | Alternative                  |
| ------------------------- | -------------------- | ---------------------------- |
| Cost tracking per user    | Complexity for MVP   | Global rate limiting         |
| Preview before apply      | Complexity           | Regenerate if unsatisfied    |
| Template library          | Scope creep          | Tone selection covers needs  |
| Custom prompts            | Consistency concerns | Tone locked to Professional  |
| Individual item selection | UI complexity        | Per-file selection available |
| Description history       | Storage cost         | Can regenerate               |
| Cancel mid-generation     | Technical complexity | Wait for completion          |

---

## 🔒 Locked Decisions (Non-Negotiable)

These design decisions are **permanently locked** to maintain MenuList's infrastructure positioning and prevent feature drift.

| Decision                              | Rationale                                                            | Status    |
| ------------------------------------- | -------------------------------------------------------------------- | --------- |
| **No custom prompts**                 | Consistency—bounded tone selection preserves authority               | 🔒 Locked |
| **No custom keywords**                | Authority—reintroduces prompting behavior, breaks authority transfer | 🔒 Locked |
| **No preview/edit loop**              | Simplicity—edit after generation if needed                           | 🔒 Locked |
| **No description analytics**          | Silence—don't train users to monitor AI output                       | 🔒 Locked |
| **No per-item regeneration**          | Consistency—batch operations only                                    | 🔒 Locked |
| **No explanation of wording choices** | Authority—AI decided, no justification needed                        | 🔒 Locked |
| **No A/B testing of descriptions**    | Stability—one output, no comparison                                  | 🔒 Locked |
| **No allergen/health claims**         | Legal—manual verification required                                   | 🔒 Locked |
| **No tone selection UI**              | Authority—system owns tone, internally locked to Professional        | 🔒 Locked |

### Why These Are Locked

MenuList positions itself as **infrastructure**, not a tool. These constraints prevent:

- User doubt ("should I try different settings?")
- Comparison loops ("which version is better?")
- Monitoring behavior ("is the AI doing well?")

**Test:** Does adding this feature make the owner feel MORE or LESS responsible?

- More → Don't add it
- Less → Consider it

---

## Related Documents

| Document                                                 | Purpose                          |
| -------------------------------------------------------- | -------------------------------- |
| `description-generation_impl.md`                         | Technical implementation details |
| `description-generation_marketing.md`                    | Sales and marketing copy         |
| `../assessments/assessment-09-description-generation.md` | Original security assessment     |

---

_Document Status: Historical description-generation source evidence - not current launch certification_
_Follows `IDE_PROMPTS/6. DOCUMENTATION STRUCTURE PROMPT.md` standards._
