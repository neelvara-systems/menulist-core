# Upload & File Processing

**Sub-feature of:** Projects (Menu Digitization)  
**Status:** Implemented source evidence; not current launch certification

> **Launch Boundary:** This README records upload source evidence, not current production-launch approval. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, `npm run verify:menu-extraction-pipeline`, browser/mobile upload QA, Storage quota/rules evidence, provider/extraction smoke, target deploy evidence, and production-host smoke.

---

## Overview

Upload & File Processing is the entry point for digitizing menus. Users upload photos or PDFs, which are validated, converted (if PDF), and prepared for AI extraction.

---

## Documentation

| Document        | Audience          | Purpose                          |
| --------------- | ----------------- | -------------------------------- |
| `_spec.md`      | Product, Business | Requirements, user flows, limits |
| `_impl.md`      | Developers        | Architecture, code, validation   |
| `_marketing.md` | Sales, Marketing  | Pitch, copy, objection handling  |

---

## Quick Reference

### Supported Files

- **Images:** JPG, PNG, WebP (max 10MB each)
- **PDFs:** Up to 15 pages per extraction job (max 50MB each)
- **Session:** 200MB total per upload session

### Key Files

```
src/components/templates/main-app/projects/
├── index.tsx           # Upload View (View 1)
├── constants.ts        # Limits, allowed types
├── validation.ts       # All validation (270 LOC)
├── FileList.tsx        # Preview component
└── utils/pdfUtils.ts   # PDF conversion (198 LOC)
```

### Security

- Triple-layer validation (MIME + extension + magic bytes)
- Blocks EXE, ZIP, SVG (XSS risk)
- Multi-tenant isolation via {tId}/{sId} paths

---

## Legacy Documentation

The following files have been **consolidated** into this folder:

| Legacy File                                            | Status         |
| ------------------------------------------------------ | -------------- |
| `assessments/assessment-01-upload.md`                  | → Consolidated |
| `01-UPLOAD-FILE-PROCESSING.md`                         | → Consolidated |
| `development_done/1-implementation-upload-complete.md` | → Consolidated |
| `development_done/1-testing-guide-upload.md`           | → Consolidated |
| `development_done/1-cross-check-upload.md`             | → Consolidated |

---

## Related Features

| Feature            | Relationship             |
| ------------------ | ------------------------ |
| AI Data Extraction | Processes uploaded files |
| Data Editor        | Displays extracted data  |
| Project Management | Organizes uploaded menus |

---

_Last Updated: January 2026_
