# Description Generation — Product Specification

**Feature:** AI-Powered Menu Item Description Generation  
**Parent Feature:** Projects (Menu Digitization)  
**Status:** ✅ Production Ready  
**Last Updated:** January 2026

---

## Executive Summary

Description Generation uses AI to create professional, appetizing menu item descriptions automatically. Users can generate descriptions in multiple sizes and languages with various tones.

### What It Does

- **Single Generation** → Generate description for one item
- **Batch Generation** → Generate for multiple items at once
- **Content Sizes** → Small (20-30 words), Medium (40-60), Large (80-120)
- **Tone Selection** → Professional, Casual, Elegant, Playful
- **Multi-Language** → Generate in multiple languages simultaneously
- **Regeneration** → Rewrite if unsatisfied

### What It Does NOT Do

- ❌ Does not include allergen information (legal compliance)
- ❌ Does not make health claims (legal liability)
- ❌ Does not translate existing descriptions (that's Translation feature)

---

## Goals

| Goal                     | Success Metric                             |
| ------------------------ | ------------------------------------------ |
| **Professional quality** | Descriptions suitable for restaurant menus |
| **Fast generation**      | < 5 seconds per item                       |
| **Multi-language**       | Same quality across all languages          |
| **Safety**               | No inappropriate or harmful content        |
| **Customizable**         | Multiple tones and sizes                   |

---

## User Stories

### Restaurant Owner

> "As a restaurant owner who's not a copywriter, I want AI to write appetizing descriptions for my menu items."

**Acceptance Criteria:**

- Select item → Generate description
- Choose size (short, medium, long)
- Choose tone (professional, casual, etc.)
- Preview and edit before accepting
- Multi-language output

### Batch Owner

> "As an owner with 50 items missing descriptions, I want to generate them all at once."

**Acceptance Criteria:**

- Select items without descriptions
- Start batch generation
- Progress indicator shows completion
- Review results
- Accept all or edit individually

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User clicks "Generate Description" in Editor                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ DESCRIPTION GENERATOR MODAL                                      │
│   • Item name displayed                                         │
│   • Content size: Small / Medium / Large                        │
│   • Tone: Professional / Casual / Elegant / Playful             │
│   • Target languages (checkboxes)                               │
│   • Item count preview (X items, Y with descriptions)           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ GENERATION                                                       │
│   • POST /api/descriptions                                      │
│   • Gemini 2.5 Flash generates text                             │
│   • Progress: "Processing file X of Y..."                       │
│   • Returns descriptions in all languages                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ RESULT                                                           │
│   • Descriptions displayed for each language                    │
│   • Options: Accept / Edit / Regenerate                         │
│   • Accept → Saved to item                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Functional Requirements

| ID    | Requirement                         | Priority | Status |
| ----- | ----------------------------------- | -------- | ------ |
| FR-01 | Generate description from item name | P0       | ✅     |
| FR-02 | Multiple content sizes              | P0       | ✅     |
| FR-03 | Multi-language generation           | P0       | ✅     |
| FR-04 | Batch generation                    | P1       | ✅     |
| FR-05 | Tone selection                      | P1       | ✅     |
| FR-06 | Progress indicator                  | P1       | ✅     |
| FR-07 | Regenerate option                   | P1       | ✅     |
| FR-08 | Edit before accepting               | P1       | ✅     |
| FR-09 | Item count preview                  | P2       | ✅     |

### Non-Functional Requirements

| ID     | Requirement              | Target                    | Status |
| ------ | ------------------------ | ------------------------- | ------ |
| NFR-01 | Generation time per item | < 5 seconds               | ✅     |
| NFR-02 | Content safety           | No harmful content        | ✅     |
| NFR-03 | Legal compliance         | No allergen/health claims | ✅     |

---

## Content Sizes

| Size       | Word Count   | Use Case                    |
| ---------- | ------------ | --------------------------- |
| **Small**  | 20-30 words  | Mobile views, quick menus   |
| **Medium** | 40-60 words  | Standard menu descriptions  |
| **Large**  | 80-120 words | Premium items, storytelling |

---

## Tone Options

| Tone             | Description                 | Best For                  |
| ---------------- | --------------------------- | ------------------------- |
| **Professional** | Clean, informative, elegant | Fine dining, business     |
| **Casual**       | Friendly, approachable      | Cafés, casual restaurants |
| **Elegant**      | Sophisticated, refined      | Upscale venues            |
| **Playful**      | Fun, quirky, energetic      | Youth-focused, themed     |

---

## Content Safety

### Blocked Content

| Category               | Reason                              |
| ---------------------- | ----------------------------------- |
| Allergen information   | Legal liability—must be accurate    |
| Health claims          | Cannot claim "cures" or "prevents"  |
| Medical advice         | Restaurant menu, not medical source |
| Inappropriate language | Professional content only           |

### Safety Implementation

- Gemini AI safety filters (BLOCK_MEDIUM_AND_ABOVE)
- System prompt enforces restrictions
- No manual moderation required

---

## Error Messages

| Scenario          | Message                                                    |
| ----------------- | ---------------------------------------------------------- |
| Generation failed | `"Description generation failed. Please try again."`       |
| Rate limit        | `"Too many requests. Please wait before generating more."` |
| Empty item name   | `"Item name is required to generate description."`         |

---

## Out of Scope

| Feature                | Reason      | Alternative             |
| ---------------------- | ----------- | ----------------------- |
| Cost tracking per user | Phase 2     | Global rate limiting    |
| Preview before batch   | Complexity  | Review after generation |
| Template library       | Phase 2     | Regenerate option       |
| Custom prompts         | Consistency | Tone selection          |

---

## Related Documents

| Document          | Purpose                          |
| ----------------- | -------------------------------- |
| `_impl.md`        | Technical implementation details |
| `_marketing.md`   | Sales and marketing collateral   |
| `../data-editor/` | Where descriptions are edited    |

---

_Document Status: ✅ PRODUCTION READY_
