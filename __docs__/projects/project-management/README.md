# Project Management

**Sub-feature of:** Projects (Menu Digitization)  
**Status:** ✅ Production Ready

---

## Overview

CRUD operations for menu projects with soft delete, restore, and multi-tenant isolation. Uses two-collection pattern (metadata + data) for efficient list loading.

---

## Documentation

| Document   | Audience          | Purpose                         |
| ---------- | ----------------- | ------------------------------- |
| `_spec.md` | Product, Business | Requirements, data model, flows |
| `_impl.md` | Developers        | DAL functions, Firestore rules  |

---

## Quick Reference

### Collections

| Collection                          | Purpose                  |
| ----------------------------------- | ------------------------ |
| `projectsMetadata/{tId}/{sId}/{id}` | Lightweight listing data |
| `projectsData/{tId}/{sId}/{id}`     | Full project content     |

### DAL Functions

| Function                    | Purpose            |
| --------------------------- | ------------------ |
| `addProject()`              | Create new project |
| `getMetadataProjectsList()` | Paginated list     |
| `getProjectData()`          | Full project load  |
| `updateProject()`           | Save changes       |
| `deleteProject()`           | Soft delete        |
| `restoreProject()`          | Recover from trash |
| `getDeletedProjectsList()`  | List trash         |

### Performance Targets

| Operation     | Target      |
| ------------- | ----------- |
| List projects | < 500ms     |
| Load project  | < 1 second  |
| Save project  | < 2 seconds |

### Key Files

```
src/database/projects/index.ts
firestore.rules
```

---

## Legacy Documentation

| Legacy File                                       | Status         |
| ------------------------------------------------- | -------------- |
| `Assessments/ASSESSMENT-12-PROJECT-MANAGEMENT.md` | → Consolidated |

---

## Related Features

| Feature                  | Relationship             |
| ------------------------ | ------------------------ |
| Upload & File Processing | Adds files to projects   |
| Data Editor              | Edits project content    |
| B2C View                 | Displays project as menu |

---

_Last Updated: January 2026_
