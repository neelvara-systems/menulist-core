# B2B View

**Sub-feature of:** Projects (Menu Digitization)  
**Status:** ⚠️ Needs Review

---

## Overview

Developer-friendly JSON editor view for technical users. View, edit, and export raw menu data. Intended for debugging, bulk edits, and integration testing.

---

## Documentation

| Document   | Audience          | Purpose                               |
| ---------- | ----------------- | ------------------------------------- |
| `_spec.md` | Product, Business | Requirements, security considerations |
| `_impl.md` | Developers        | JSON viewer, validation, export       |

---

## Quick Reference

### Features

- JSON viewer with collapsible nodes
- Copy to clipboard
- Download as JSON
- Edit mode (with warning)

### Key Files

```
src/components/templates/main-app/projects/b2bView.tsx
```

### Library

- `react18-json-view` for JSON rendering

---

## Security Items to Verify

| Item                               | Status    |
| ---------------------------------- | --------- |
| JSON schema validation before save | ⚠️ Verify |
| Protected fields (IDs, timestamps) | ⚠️ Verify |
| PII removal in exports             | ⚠️ Verify |
| Undo/rollback capability           | ⚠️ Verify |

---

## Legacy Documentation

| Legacy File                             | Status         |
| --------------------------------------- | -------------- |
| `Assessments/ASSESSMENT-10-B2B-VIEW.md` | → Consolidated |

---

## Related Features

| Feature     | Relationship               |
| ----------- | -------------------------- |
| Data Editor | Visual editing alternative |
| B2C View    | Customer-facing output     |

---

_Last Updated: January 2026_
