# B2B View — Product Specification

**Feature:** JSON Editor & Developer Integration  
**Parent Feature:** Projects (Menu Digitization)  
**Status:** ⚠️ Needs Review  
**Last Updated:** January 2026

---

## Executive Summary

B2B View provides a developer-friendly interface for businesses that want to integrate menu data into their own systems. Includes JSON editor for power users and technical teams.

### What It Does

- **JSON Editor** → View and edit raw menu data
- **Data Export** → Download menu data as JSON
- **Developer Access** → Technical view of data structure
- **Debugging** → Inspect and modify data directly

### What It Does NOT Do

- ❌ Does not provide public API access (internal use only)
- ❌ Does not support webhook integrations (Phase 2)
- ❌ Does not generate API keys (Phase 2)

---

## Goals

| Goal                   | Success Metric          |
| ---------------------- | ----------------------- |
| **Developer-friendly** | Easy data inspection    |
| **Safe editing**       | Validation before save  |
| **Data export**        | One-click JSON download |
| **No data corruption** | Schema validation       |

---

## User Stories

### Technical User

> "As a developer, I want to view the raw JSON structure of menu data for debugging."

**Acceptance Criteria:**

- View full JSON structure
- Collapsible/expandable nodes
- Search within JSON
- Copy to clipboard

### Power User

> "As a power user, I want to make bulk edits by modifying JSON directly."

**Acceptance Criteria:**

- Edit JSON in editor
- Validation before save
- Preview changes
- Undo if needed

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User switches to B2B View tab in Editor                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ JSON EDITOR                                                      │
│   • Full menu data displayed as JSON                            │
│   • Collapsible nodes for categories, items                     │
│   • Read-only by default                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ ACTIONS                                                          │
│   • Copy JSON → Clipboard                                       │
│   • Download → JSON file                                        │
│   • Edit Mode → Enable editing (with warning)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │ (if editing)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SAVE FLOW                                                        │
│   • JSON schema validation                                      │
│   • Preview diff (what changed)                                 │
│   • Confirm and save                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Functional Requirements

| ID    | Requirement               | Priority | Status          |
| ----- | ------------------------- | -------- | --------------- |
| FR-01 | Display JSON structure    | P0       | ✅              |
| FR-02 | Collapsible nodes         | P0       | ✅              |
| FR-03 | Copy to clipboard         | P1       | ✅              |
| FR-04 | Download as JSON          | P1       | ✅              |
| FR-05 | Edit mode with warning    | P1       | ⚠️ Needs review |
| FR-06 | Schema validation         | P0       | ⚠️ Needs review |
| FR-07 | Readonly fields protected | P0       | ⚠️ Needs review |
| FR-08 | Diff preview before save  | P2       | Pending         |

### Non-Functional Requirements

| ID     | Requirement        | Target      | Status |
| ------ | ------------------ | ----------- | ------ |
| NFR-01 | JSON render time   | < 1 second  | ✅     |
| NFR-02 | Large data support | 1000+ items | ✅     |

---

## Security Considerations

### JSON Editor Security

| Risk                     | Mitigation             | Status    |
| ------------------------ | ---------------------- | --------- |
| Malicious code injection | Schema validation      | ⚠️ Verify |
| ID/timestamp tampering   | Readonly fields        | ⚠️ Verify |
| Data corruption          | Validation before save | ⚠️ Verify |
| Undo capability          | Rollback support       | ⚠️ Verify |

### Export Data Privacy

| Check         | Requirement                | Status    |
| ------------- | -------------------------- | --------- |
| PII removal   | No emails/phones in export | ⚠️ Verify |
| Internal IDs  | Sanitized or removed       | ⚠️ Verify |
| Audit logging | Export actions logged      | Pending   |

---

## Error Messages

| Scenario                 | Message                                            |
| ------------------------ | -------------------------------------------------- |
| Invalid JSON syntax      | `"Invalid JSON syntax. Please fix before saving."` |
| Schema validation failed | `"Data doesn't match expected structure."`         |
| Protected field modified | `"Cannot modify system fields (IDs, timestamps)."` |

---

## Out of Scope (Phase 2)

| Feature               | Reason             |
| --------------------- | ------------------ |
| Public API access     | Enterprise feature |
| API key generation    | Enterprise feature |
| Webhook integrations  | Enterprise feature |
| Rate limiting per key | Enterprise feature |

---

## Related Documents

| Document          | Purpose                          |
| ----------------- | -------------------------------- |
| `_impl.md`        | Technical implementation details |
| `../data-editor/` | Visual editing alternative       |
| `../b2c-view/`    | Customer-facing output           |

---

_Document Status: ⚠️ NEEDS SECURITY REVIEW_
