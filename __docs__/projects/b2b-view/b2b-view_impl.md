# B2B View — Implementation

**Feature:** JSON Editor & Developer Integration  
**Status:** ⚠️ Needs Review  
**Last Updated:** January 2026

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ B2B VIEW                                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  b2bView.tsx                                                    │
│       │                                                          │
│       ├── react18-json-view (JSON viewer library)               │
│       ├── Copy to clipboard functionality                       │
│       ├── Download as JSON                                      │
│       └── Edit mode (if enabled)                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/components/templates/main-app/projects/
└── b2bView.tsx                    # Main B2B view component
```

---

## Key Implementation

### JSON Viewer Component

```typescript
// b2bView.tsx
import JsonView from "react18-json-view";
import "react18-json-view/src/style.css";

const B2BView = ({ projectData }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedData, setEditedData] = useState(projectData);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(projectData, null, 2));
    message.success("JSON copied to clipboard");
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectData.name || "menu"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="actions">
        <Button onClick={handleCopy} icon={<CopyOutlined />}>
          Copy JSON
        </Button>
        <Button onClick={handleDownload} icon={<DownloadOutlined />}>
          Download
        </Button>
        <Switch
          checked={isEditMode}
          onChange={setIsEditMode}
          checkedChildren="Edit"
          unCheckedChildren="View"
        />
      </div>

      <JsonView
        src={isEditMode ? editedData : projectData}
        collapsed={2}
        enableClipboard={true}
        editable={isEditMode}
        onChange={(data) => setEditedData(data)}
      />

      {isEditMode && (
        <Button type="primary" onClick={handleSave}>
          Save Changes
        </Button>
      )}
    </div>
  );
};
```

### Schema Validation (Recommended)

```typescript
// Validate before save
const validateProjectSchema = (
  data: unknown
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check required fields
  if (!data.files || !Array.isArray(data.files)) {
    errors.push('Missing or invalid "files" array');
  }

  if (!data.languages || !Array.isArray(data.languages)) {
    errors.push('Missing or invalid "languages" array');
  }

  // Check readonly fields weren't modified
  if (data.projectId !== originalData.projectId) {
    errors.push("Cannot modify projectId");
  }

  if (data.createdOn !== originalData.createdOn) {
    errors.push("Cannot modify createdOn timestamp");
  }

  return { valid: errors.length === 0, errors };
};
```

### Protected Fields

```typescript
const PROTECTED_FIELDS = [
  "projectId",
  "createdOn",
  "modifiedOn",
  "tId",
  "sId",
  "uId",
];

const hasProtectedFieldChanges = (original: any, edited: any): boolean => {
  return PROTECTED_FIELDS.some((field) => original[field] !== edited[field]);
};
```

---

## Export Format

```typescript
// Exported JSON structure
{
  "name": "Menu Name",
  "description": "...",
  "languages": [
    { "code": "en", "name": "English", "isPrimary": true }
  ],
  "files": [
    {
      "uid": "file-123",
      "name": "menu-page-1.jpg",
      "extractedData": {
        "data": {
          "categories": [...],
          "items": [...]
        }
      }
    }
  ],
  "themeConfig": {
    "homePage": {...},
    "menuPage": {...}
  }
}
```

---

## Security Checklist (To Verify)

| Check                  | Implementation                   | Status       |
| ---------------------- | -------------------------------- | ------------ |
| JSON schema validation | validateProjectSchema()          | ⚠️ Implement |
| Protected fields check | hasProtectedFieldChanges()       | ⚠️ Implement |
| Diff preview           | Show changes before save         | ⚠️ Implement |
| Undo capability        | Store previous state             | ⚠️ Implement |
| PII scrubbing          | Remove emails/phones from export | ⚠️ Verify    |
| Audit logging          | Log export actions               | ⚠️ Implement |

---

## Related Documents

| Document                                   | Purpose               |
| ------------------------------------------ | --------------------- |
| `_spec.md`                                 | Product specification |
| `../Assessments/ASSESSMENT-10-B2B-VIEW.md` | Original assessment   |

---

## Recommendations & Future Improvements

### Code Quality Observations

| Finding                | Current State                   | Recommendation          | Priority |
| ---------------------- | ------------------------------- | ----------------------- | -------- |
| **JSON Viewer**        | Uses `react18-json-view`        | ✅ Good library choice  | -        |
| **Theme Support**      | Multiple color themes available | ✅ Nice feature         | -        |
| **Reset Confirmation** | Modal.confirm before reset      | ✅ Prevents accidents   | -        |
| **Excel Export**       | Lazy loaded ExcelJS             | ✅ Good for bundle size | -        |

### Critical Issues to Address

1. **⚠️ No Schema Validation Before Save**

   - **Current**: JSON edits saved directly without validation
   - **Required**: Add Zod schema validation before `setProjectData()`
   - **File**: `b2bView.tsx` → `handleJsonEdit`
   - **Priority**: P0 (Security)

2. **⚠️ Protected Fields Not Enforced**

   - **Current**: User can edit projectId, tId, sId, timestamps
   - **Required**: Block edits to system fields, show error if attempted
   - **File**: `b2bView.tsx`
   - **Priority**: P0 (Security)

3. **⚠️ No Diff Preview**

   - **Current**: Changes applied immediately
   - **Required**: Show diff modal before saving edited JSON
   - **Priority**: P1

4. **⚠️ No Undo for JSON Edits**
   - **Current**: Only reset to original
   - **Required**: Add undo stack for JSON edits
   - **Priority**: P2

### Suggested Improvements

1. **Read-Only Mode by Default**

   - **Current**: Editable by default
   - **Suggested**: Start in read-only, require explicit "Enable Edit Mode" toggle with warning
   - **Priority**: P1

2. **Export Sanitization**

   - **Current**: Full JSON exported
   - **Suggested**: Option to strip internal IDs and metadata for cleaner export
   - **Priority**: P2

3. **Search Within JSON**
   - **Current**: Ctrl+F browser search
   - **Suggested**: Built-in search with highlight
   - **Priority**: P3

### Technical Debt

| Item        | Description                                        | Effort |
| ----------- | -------------------------------------------------- | ------ |
| Console.log | Remove debug `console.log(edit)`                   | Low    |
| Type safety | `handleJsonEdit` uses `any` types                  | Medium |
| State sync  | `isUpdated` flag needs to sync with actual changes | Low    |

---

_Document Status: ⚠️ NEEDS SECURITY REVIEW_
