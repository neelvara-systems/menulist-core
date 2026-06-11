# AI Data Extraction — Product Specification

**Feature:** OCR & Menu Extraction with Gemini AI
**Parent Feature:** Projects (Menu Digitization)
**Status:** Controlled owner testing ready; production deploy pending for the legacy callable hardening
**Last Updated:** June 11, 2026

---

## Executive Summary

AI Data Extraction transforms owner-provided menu, service, or catalog images into structured public-business data. After users upload photos or PDFs, this feature uses Google Gemini AI through the MenuList job queue to read and extract items, categories, prices, and descriptions.

### What It Does

- **OCR Processing** → Reads text from menu images using Gemini 2.5 Flash
- **Structured Extraction** → Outputs categories, items, prices, descriptions
- **Category Icon Defaults** → Adds clear matching category icons after extraction without asking Gemini to invent them
- **Multi-Language Detection** → Identifies languages present in the menu
- **Quality Scoring** → Rates extraction quality (0-100 score)
- **Job Queue Processing** → Reliable async processing via Firebase Cloud Functions
- **Review Safety** → Re-extraction applies only from an owned `preview_ready` job; linked outlets use the validated server outlet-save path

### What It Does NOT Do

- ❌ Does not generate images (that's AI Image Generation)
- ❌ Does not translate content (that's Multi-Language Translation)
- ❌ Does not edit extracted data (that's the Data Editor)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT                                                          │
│   1. User clicks "Upload & Continue"                            │
│   2. Files uploaded to Firebase Storage                         │
│   3. Job document created in menuImageProcessingJobs            │
│   4. Client listens for job status updates                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ FIREBASE CLOUD FUNCTION                                         │
│   • PROD: onCreate trigger (automatic)                          │
│   • DEV: dev_triggerProcessMenuImages (callable)                │
│                                                                  │
│   Processing Steps:                                              │
│   1. Update status → "processing"                               │
│   2. For each file:                                             │
│      a. Send image to Gemini 2.5 Flash                          │
│      b. Validate response with Zod                              │
│      c. Sanitize output (XSS protection)                        │
│      d. Calculate quality score                                 │
│   3. Combine all file results                                   │
│   4. Apply deterministic category icon defaults                 │
│   5. Save to project document                                   │
│   6. Update status → "completed"                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Goals

| Goal                     | Success Metric                         |
| ------------------------ | -------------------------------------- |
| **Accurate extraction**  | > 90% of items correctly identified    |
| **Fast processing**      | < 30 seconds per image                 |
| **Reliable operation**   | > 99% job completion rate              |
| **Cost control**         | Per-user rate limiting prevents abuse  |
| **Quality transparency** | Users see quality score before editing |

---

## User Stories

### SMB Owner

> "As an owner, I want MenuList to read my menu or service photo so I don't have to type everything manually."

**Acceptance Criteria:**

- Upload menu image → See extracted categories and items
- Items have names, prices, descriptions where visible
- Can edit any extraction errors in the Editor
- Processing completes within reasonable time

### Multi-Menu Owner

> "As an owner with multiple menus, I want to process several pages at once."

**Acceptance Criteria:**

- Batch processing of multiple files
- Progress shown per file
- Combined results in a single project
- Quality score helps identify pages needing review

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User clicks "Upload & Continue" (View 1)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ JOB CREATION                                                     │
│   • Job document created in menuImageProcessingJobs             │
│   • Status: "pending" → "processing"                            │
│   • Client receives jobId for tracking                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ AI PROCESSING (per file)                                         │
│   1. Image sent to Gemini 2.5 Flash                             │
│   2. AI returns JSON with:                                       │
│      • languages[] - Detected languages                         │
│      • categories[] - Menu sections                             │
│      • items[] - Individual menu items                          │
│   3. Response validated with Zod schema                         │
│   4. All text sanitized for XSS                                 │
│   5. Deterministic category icons applied for clear matches     │
│   6. Quality score calculated (0-100)                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ COMPLETION                                                       │
│   • Results saved to project.files[].extractedData              │
│   • Status: "completed"                                         │
│   • Client navigates to Editor (View 2)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Functional Requirements

| ID    | Requirement                          | Priority | Status |
| ----- | ------------------------------------ | -------- | ------ |
| FR-01 | Extract categories from menu images  | P0       | ✅     |
| FR-02 | Extract items with names and prices  | P0       | ✅     |
| FR-03 | Extract descriptions where present   | P1       | ✅     |
| FR-04 | Detect languages in menu             | P1       | ✅     |
| FR-05 | Process multiple files in one job    | P1       | ✅     |
| FR-06 | Show processing progress             | P1       | ✅     |
| FR-07 | Calculate and display quality score  | P1       | ✅     |
| FR-08 | Handle failed extractions gracefully | P1       | ✅     |
| FR-09 | Assign category icons after extraction when there is a clear deterministic match | P2 | ✅ |

### Non-Functional Requirements

| ID     | Requirement                 | Target                | Status |
| ------ | --------------------------- | --------------------- | ------ |
| NFR-01 | Processing time per image   | < 30 seconds          | ✅     |
| NFR-02 | Job completion rate         | > 99%                 | ✅     |
| NFR-03 | Per-user rate limit         | 5 requests/minute     | ✅     |
| NFR-04 | Retry on transient failures | 2 retries             | ✅     |
| NFR-05 | XSS protection              | All outputs sanitized | ✅     |

### Security Requirements

| ID    | Requirement            | Implementation                                      | Status |
| ----- | ---------------------- | --------------------------------------------------- | ------ |
| SR-01 | Per-user rate limiting | Upstash Redis                                       | ✅     |
| SR-02 | Input validation       | Zod schemas                                         | ✅     |
| SR-03 | Output sanitization    | `stripHtml()` (server-side, `redistributeUtils.ts`) | ✅     |
| SR-04 | Multi-tenant isolation | {tId}/{sId} in job docs                             | ✅     |

---

## Extracted Data Structure

### Categories

```json
{
  "id": "c1",
  "name": {
    "en": "Appetizers",
    "hi": "स्टार्टर्स"
  },
  "active": true
}
```

### Items

```json
{
  "id": "i1",
  "name": {
    "en": "Spring Rolls",
    "hi": "स्प्रिंग रोल"
  },
  "description": {
    "en": "Crispy vegetable rolls served with sweet chili sauce"
  },
  "category": "c1",
  "attributes": [
    { "id": "a1", "name": { "en": "Regular" }, "price": "199" },
    { "id": "a2", "name": { "en": "Large" }, "price": "299" }
  ],
  "active": true
}
```

---

## Quality Scoring

| Component           | Max Points | Calculation                   |
| ------------------- | ---------- | ----------------------------- |
| Category quality    | 25         | Valid category names detected |
| Item existence      | 10         | At least 1 item extracted     |
| Price quality       | 50         | Items with valid prices       |
| Description quality | 25         | Items with descriptions       |
| **Total**           | **100**    |                               |

### Quality Thresholds

| Score  | Status    | User Action                              |
| ------ | --------- | ---------------------------------------- |
| 0-40   | ⚠️ Low    | Warning shown, manual review recommended |
| 40-70  | 🟡 Medium | OK, some manual editing expected         |
| 70-100 | ✅ High   | Good extraction, minimal editing needed  |

---

## Error Messages

| Scenario           | Message                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Processing timeout | `"Processing took too long. Please try with a clearer or smaller image."`                        |
| AI rate limit      | `"Too many requests. Please wait a moment and try again."`                                       |
| Invalid image      | `"Could not read this image. Please try a clearer photo."`                                       |
| Low quality        | `"The extracted data quality is low. Please review carefully or try uploading a clearer image."` |

---

## Out of Scope

| Feature                    | Reason              | Alternative                   |
| -------------------------- | ------------------- | ----------------------------- |
| Budget tracking per tenant | Phase 2             | Global rate limiting in place |
| Caching of results         | Each menu is unique | Not needed                    |
| Custom AI prompts          | Standardization     | Fixed extraction prompt       |

---

## Related Documents

| Document                                                 | Purpose                          |
| -------------------------------------------------------- | -------------------------------- |
| `_impl.md`                                               | Technical implementation details |
| `_marketing.md`                                          | Sales and marketing collateral   |
| `../upload-file-processing/`                             | What happens before extraction   |
| `../Assessments/MENU-IMAGE-PROCESSING-JOB-QUEUE-SPEC.md` | Full job queue specification     |

---

## Version History

| Version | Date     | Changes                            |
| ------- | -------- | ---------------------------------- |
| 1.0     | Nov 2025 | Initial API route implementation   |
| 2.0     | Dec 2025 | Migrated to Job Queue architecture |
| 2.1     | Dec 2025 | Added quality scoring, retry logic |

---

_Document Status: ✅ PRODUCTION READY — Last updated March 13, 2026_
