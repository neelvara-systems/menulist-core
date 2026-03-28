# Project Management — Product Specification

**Feature:** Project CRUD Operations & Lifecycle  
**Parent Feature:** Projects (Menu Digitization)  
**Status:** ✅ Production Ready  
**Last Updated:** January 2026

---

## Executive Summary

Project Management handles the full lifecycle of menu projects: create, read, update, delete, archive, and restore. Foundation of the entire menu digitization system with multi-tenant isolation.

### What It Does

- **Create projects** → New menu digitization projects
- **List projects** → Paginated project list per tenant
- **Update projects** → Save changes to menu data
- **Soft delete** → Move to trash (recoverable)
- **Restore** → Recover deleted projects
- **Multi-tenant isolation** → Each tenant sees only their data

### What It Does NOT Do

- ❌ Does not support real-time collaboration (Phase 2)
- ❌ Does not provide version history (Phase 2)
- ❌ Does not enforce project limits per tenant (Phase 2)

---

## Goals

| Goal                 | Success Metric                      |
| -------------------- | ----------------------------------- |
| **Data safety**      | No accidental permanent deletion    |
| **Tenant isolation** | Zero cross-tenant data access       |
| **Fast operations**  | List < 500ms, Load < 1s, Save < 2s  |
| **Scalability**      | Support 10,000+ projects per tenant |

---

## User Stories

### Restaurant Owner

> "As a restaurant owner, I want to create multiple menu projects (lunch menu, dinner menu, seasonal specials)."

**Acceptance Criteria:**

- Create new project with name
- List all my projects
- Open and edit any project
- Delete projects I don't need

### Safety-Conscious User

> "As a user, I want to recover a project I accidentally deleted."

**Acceptance Criteria:**

- Deleted projects move to trash
- View trash/deleted projects
- Restore from trash
- Permanent deletion after 30 days (or manual)

---

## User Flows

### Create Project

```
┌─────────────────────────────────────────────────────────────────┐
│ User clicks "New Project"                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ PROJECT CREATION                                                 │
│   • Enter project name                                          │
│   • Select languages (optional)                                 │
│   • Create project                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ RESULT                                                           │
│   • Project created in Firestore                                │
│   • Redirected to Upload view                                   │
│   • Project appears in list                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Delete & Restore

```
┌─────────────────────────────────────────────────────────────────┐
│ User clicks "Delete Project"                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CONFIRMATION MODAL                                               │
│   • "Move to trash? You can restore within 30 days."            │
│   • Confirm / Cancel                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │ (if confirmed)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SOFT DELETE                                                      │
│   • deleted: true                                               │
│   • deletedAt: timestamp                                        │
│   • Project hidden from main list                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ RESTORE (if needed)                                              │
│   • View deleted projects                                       │
│   • Click "Restore"                                             │
│   • deleted: false, deletedAt: null                             │
│   • Project returns to main list                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Functional Requirements

| ID    | Requirement                          | Priority | Status |
| ----- | ------------------------------------ | -------- | ------ |
| FR-01 | Create project                       | P0       | ✅     |
| FR-02 | List projects (paginated)            | P0       | ✅     |
| FR-03 | Get single project                   | P0       | ✅     |
| FR-04 | Update project metadata              | P0       | ✅     |
| FR-05 | Update project data                  | P0       | ✅     |
| FR-06 | Soft delete                          | P0       | ✅     |
| FR-07 | List deleted projects                | P0       | ✅     |
| FR-08 | Restore deleted project              | P0       | ✅     |
| FR-09 | Multi-tenant isolation               | P0       | ✅     |
| FR-10 | Active/Inactive status               | P1       | ✅     |
| FR-11 | Confirmation for destructive actions | P1       | ✅     |

### Non-Functional Requirements

| ID     | Requirement         | Target      | Status |
| ------ | ------------------- | ----------- | ------ |
| NFR-01 | List projects       | < 500ms     | ✅     |
| NFR-02 | Load single project | < 1 second  | ✅     |
| NFR-03 | Save project        | < 2 seconds | ✅     |
| NFR-04 | Projects per tenant | 10,000+     | ✅     |
| NFR-05 | Items per project   | 1,000+      | ✅     |

---

## Data Model

### Project Metadata (Lightweight)

```typescript
interface ProjectMetadata {
  projectId: string;
  name: string;
  description?: string;
  thumbnail?: string;
  active: boolean;
  deleted: boolean;
  deletedAt?: number;
  createdOn: Timestamp;
  modifiedOn: Timestamp;
  // Tenant context
  tId: string;
  sId: string;
  uId: string;
}
```

### Project Data (Full)

```typescript
interface ProjectData {
  projectId: string;
  files: ProjectFileType[];
  languages: ExtractedDataLanguage[];
  themeConfig: ThemeConfig;
  menuSettings: MenuSettings;
  // ... full project content
}
```

---

## Multi-Tenant Isolation

### Firestore Rules

```javascript
// projectsMetadata - Multi-tenant isolated
match /projectsMetadata/{tId}/{sId}/{projectId} {
  allow read: if isAuthenticated() && belongsToTenant(tId);
  allow write: if isTenantAdmin(tId, sId);
}

// projectsData - Multi-tenant isolated
match /projectsData/{tId}/{sId}/{projectId} {
  allow read: if isAuthenticated() && belongsToTenant(tId);
  allow write: if isTenantAdmin(tId, sId);
}
```

### Query Pattern

```typescript
// Always filter by tId AND sId
const getProjects = async (session) => {
  const q = query(
    collection(db, "projectsMetadata", session.tId, session.sId),
    where("deleted", "==", false),
    orderBy("modifiedOn", "desc"),
    limit(20)
  );
  return getDocs(q);
};
```

---

## Error Messages

| Scenario          | Message                                               |
| ----------------- | ----------------------------------------------------- |
| Project not found | `"Project not found"`                                 |
| Delete failed     | `"Failed to delete project. Please try again."`       |
| Restore failed    | `"Failed to restore project. Please try again."`      |
| Unauthorized      | `"You don't have permission to access this project."` |

---

## Out of Scope (Phase 2)

| Feature                   | Reason                |
| ------------------------- | --------------------- |
| Real-time collaboration   | Complexity            |
| Version history           | Complexity            |
| Project limits/quotas     | Billing feature       |
| Concurrent edit detection | Low priority          |
| Automatic backups         | Firebase handles this |

---

## Related Documents

| Document                     | Purpose                          |
| ---------------------------- | -------------------------------- |
| `_impl.md`                   | Technical implementation details |
| `../data-editor/`            | Where project content is edited  |
| `../upload-file-processing/` | How files are added to projects  |

---

_Document Status: ✅ PRODUCTION READY_
