# AI Data Extraction - Marketing & Sales

**Feature:** Menu Review Draft Extraction
**Audience:** Sales Team, Marketing, Partners
**Last Updated:** January 2026
**Status:** Historical marketing draft; not current sales, publication, or launch certification

---

## Current Sales/Launch Boundary

This document preserves January 2026 positioning notes only. Do not use it as current sales collateral, website copy, partner copy, or launch approval until release-specific evidence is recorded.

Current AI Data Extraction collateral approval requires:

- Active production-readiness audit evidence.
- External Certification Runbook evidence.
- `npm run verify:menu-extraction-pipeline`.
- `npm run verify:ai-accounting`.
- Provider smoke for the target extraction model and environment.
- Authenticated desktop/mobile upload and extraction-review QA.
- QA Firebase Functions and Storage deploy evidence where the release depends on worker or Storage behavior.
- Target deploy evidence and production-host smoke.
- Release-specific evidence for any numeric speed, accuracy, page-count, language-count, provider, or volume claims before those claims are used.

---

## Elevator Pitch

### One-Liner

> "Upload a clear menu photo or PDF, review the extracted draft, and publish only the approved menu."

### 30-Second Pitch

> "Typing a paper menu into a digital editor takes time. MenuList prepares a structured review draft from a clear photo or supported PDF, then the owner checks items, prices, categories, and descriptions before publishing. The draft saves typing, but owner review stays part of the flow."

---

## Feature Narrative

### The Problem

Digitizing a menu manually is tedious and easy to get wrong:

- **Time:** Owners do not want to type every item from scratch.
- **Prices:** Small typos can create customer confusion.
- **Descriptions:** Existing descriptions are easy to skip during manual entry.
- **Updates:** New source material still needs a reviewed digital version.

### The Solution

MenuList prepares an extraction review draft:

- **Source upload:** Start from a clear photo or supported PDF.
- **Structured draft:** Menu fields are prepared for review after processing.
- **Owner review:** Items, categories, prices, and descriptions stay editable before publishing.
- **Source-bound workflow:** Published output comes from approved menu data, not raw extraction output.

### The Result

Less typing from scratch, with owner approval before customer-facing menu output changes.

---

## Competitive Positioning

### vs. Manual Data Entry

| Aspect                | Manual Entry       | MenuList |
| --------------------- | ------------------ | -------- |
| Entry effort          | Type item by item  | Review a prepared draft |
| Price checks          | Manual             | Owner review before publish |
| Descriptions          | Manually retyped   | Drafted from source when available |
| Updates               | Repeat manual work | Re-upload or edit, then approve |

### vs. Generic OCR Tools

| Aspect        | Generic OCR | MenuList |
| ------------- | ----------- | -------- |
| Output        | Raw text    | Menu review draft |
| Categories    | Manual sorting | Structured fields when detected |
| Prices        | Manual association | Draft associations for review |
| Menu workflow | Separate tool | Built into the menu editor path |

---

## Pitch Deck Outline

### Slide 1: The Problem

**"Menu digitization creates avoidable typing work"**

- Paper menus need a digital version.
- Manual entry makes price and category mistakes easy.
- Updates should still stay under owner control.

### Slide 2: The Solution

**"A review draft from the uploaded menu source"**

- Upload a clear photo or supported PDF.
- Processing prepares structured menu fields.
- Owner review happens before publishing.

### Slide 3: How It Works

**"Upload, review, publish"**

1. Upload a menu photo or supported PDF.
2. Review extracted items, prices, categories, and descriptions.
3. Publish only the approved menu.

### Slide 4: Provider Boundary

**"Provider claims require target-run evidence"**

- Do not name a provider in sales copy without release-specific evidence.
- Do not quote timing or accuracy without target-run evidence.
- Do not imply publish-without-review behavior.

### Slide 5: Quality You Can Trust

**"Owner review is the quality gate"**

- Extraction output is a draft.
- Low-quality sources can need more correction.
- The owner has final say before customers see changes.

### Slide 6: Evidence Before Claims

**"Release copy follows release evidence"**

- Speed claims require target-run timing evidence.
- Accuracy claims require target-run evaluation evidence.
- Page-count, file-size, language-count, and provider claims require release-specific support evidence.

### Slide 7: CTA

**"Review a menu draft from your source"**

- Upload a clear source menu.
- Check the extracted fields.
- Publish only approved output.

---

## Landing Page Copy Hooks

### Hero Headline

> **"Menu draft from your uploaded source."**

### Subheading

> "Upload a clear menu photo or supported PDF, review extracted items and prices, then publish the approved menu."

### Key Benefit Bullets

- **Less typing from scratch** - Start with a review draft after processing.
- **Review before publish** - Check items, prices, categories, and descriptions.
- **Source-bound** - Draft output starts from the uploaded menu source.
- **Editable** - Fix any field before customer-facing output changes.
- **Evidence-bound** - Speed, accuracy, provider, and volume claims require release-specific proof.

### Social Proof Placeholders

Do not use testimonials, accuracy claims, speed claims, or customer-behavior claims without approved customer evidence.

### CTA Copy Variants

- **Primary:** "Review a Menu Draft"
- **Secondary:** "See the Upload Flow"
- **Subtle:** "Upload Your Menu Source"

---

## Go-to-Market Messaging

### India Messaging

> "Upload the menu. Review the draft."

**Focus:** Less typing, owner review, approved publishing.

### Non-India Messaging

> "A structured menu draft from your uploaded source."

**Focus:** Menu workflow, review control, approved output.

---

## Sales Talking Points

### Objection: "Can it read my handwritten menu?"

**Response:** "Clear printed sources work best. Handwritten or low-quality sources can need more correction, so treat the output as a review draft before publishing."

### Objection: "What if the extraction makes mistakes?"

**Response:** "That is why the flow keeps owner review before publishing. You can edit extracted fields before customers see the menu."

### Objection: "My menu has multiple languages"

**Response:** "Use release-specific evidence before promising language coverage. Mixed-language sources should be reviewed carefully before publishing."

### Objection: "I tried OCR before and it was terrible"

**Response:** "Generic OCR gives you raw text. MenuList keeps the work inside the menu editor path so you review menu fields instead of copying text between tools."

---

## Approved Language

### Terms to Use

- "Review draft after processing"
- "Clear photo or supported PDF"
- "Review extracted fields"
- "Publish only the approved menu"
- "No typing from scratch"

### Terms to Avoid

- "In seconds"
- "Instant"
- "Every item, every price, every description"
- "Google Gemini" or other provider names without release-specific provider evidence
- "100% accurate"
- "Automatic" alone
- "No more data entry"
- "No more typos"

---

## Demo Script (Historical Draft)

### Setup

"Let me show you how the upload flow starts from a menu source and prepares a draft for review."

### Upload

"I upload a clear menu photo or supported PDF. The flow processes the source and prepares menu fields for review."

### Results

"Now I check the extracted categories, items, prices, and descriptions. Anything uncertain stays editable before publishing."

### Edit

"If a price or item name needs correction, I fix it in the editor before the customer-facing menu changes."

### Close

"MenuList reduces typing from scratch, while the owner still approves the menu before customers see it."

---

## Visual Assets Needed

| Asset                  | Purpose                      | Spec               |
| ---------------------- | ---------------------------- | ------------------ |
| Before/after           | Menu source -> review draft  | Side-by-side image |
| Processing state       | Upload flow in progress      | Short demo         |
| Review UI              | Owner checking extracted fields | Screenshot      |
| Mixed-language example | Source that needs careful review | Review screenshot |
| Edit workflow          | Owner correcting one item     | Screen recording   |

---

## Key Stats for Marketing

| Stat                      | Value                             | Source |
| ------------------------- | --------------------------------- | ------ |
| Time to process source    | Requires target-run evidence      | Target release QA |
| Manual time comparison    | Do not use without current evidence | Market evidence |
| Accuracy on printed menus | Requires target-run evaluation evidence | Target release QA |
| Quality score threshold   | Use only if confirmed in current UI/runtime | Product spec and QA |
| Multi-language support    | Requires release-specific language evidence | Product spec and QA |

---

_Document Status: Historical marketing draft; not current sales or launch certification._
