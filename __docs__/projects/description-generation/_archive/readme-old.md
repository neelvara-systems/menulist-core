> **Historical archive evidence; not current launch certification.** This file is retained for historical context only and is not current production approval, deploy approval, launch approval, or release certification. Current readiness is decided by the active production-readiness audit, External Certification Runbook evidence, current source verifiers, browser/device QA, provider/deploy evidence, and production-host smoke.

# Description Generation

**Sub-feature of:** Projects (Menu Digitization)  
**Status:** ✅ Production Ready

---

## Overview

AI-powered description generation creates professional, appetizing menu item descriptions using Gemini 2.5 Flash. Supports multiple content sizes, tones, and languages.

---

## Documentation

| Document        | Audience          | Purpose                               |
| --------------- | ----------------- | ------------------------------------- |
| `_spec.md`      | Product, Business | Requirements, content options, safety |
| `_impl.md`      | Developers        | API route, prompts, configuration     |
| `_marketing.md` | Sales, Marketing  | Pitch, copy, objection handling       |

---

## Quick Reference

### API Route

`POST /api/descriptions`

### Content Sizes

| Size   | Words  |
| ------ | ------ |
| Small  | 20-30  |
| Medium | 40-60  |
| Large  | 80-120 |

### Tones

- Professional, Casual, Elegant, Playful

### Key Files

```
src/app/api/descriptions/
├── route.ts       # API endpoint
└── prompt.ts      # Prompt templates

src/components/.../editorView/Modals/
└── DescriptionGenerationModal.tsx
```

### Safety

- No allergen information (legal)
- No health claims (liability)
- Gemini safety filters enabled

---

## Legacy Documentation

| Legacy File                                           | Status         |
| ----------------------------------------------------- | -------------- |
| `Assessments/assessment-09-description-generation.md` | → Consolidated |
| `07-DESCRIPTION-GENERATION.md`                        | → Consolidated |

---

## Related Features

| Feature                    | Relationship                     |
| -------------------------- | -------------------------------- |
| Data Editor                | Where descriptions are added     |
| Multi-Language Translation | Translates existing descriptions |
| B2C View                   | Displays descriptions in menu    |

---

_Last Updated: January 2026_
