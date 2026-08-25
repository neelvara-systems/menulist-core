# Data Editor — Implementation

**Feature:** Visual Menu Data Editor  
**Status:** Implemented source evidence; not current launch certification
**Last Updated:** July 5, 2026

**Launch boundary:** This implementation note documents the menu data editor. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, browser/mobile editor QA, publish/cache evidence for edited public truth, and deploy evidence for the target environment.

Direct desktop editor links wait for the selected project document before mounting the editor. While that scoped read is pending the owner sees a loading state; a rejected read provides `Try again` and `Back to menus` recovery. The editor is mounted only after `activeProject` is present, so a valid empty menu can open without crossing the editor's missing-project invariant.

MOL scope and flush hardening (July 13, 2026): the Menu Observation Layer remains fire-and-forget and non-blocking for editor saves. Enabled calls without a valid active tenant/store session or with malformed explicit scope log bounded `menu_change_log_session_missing` or `menu_change_log_scope_invalid` diagnostics. Each pending change stores the validated scope captured at queue time, so batch logging and `flushPendingChanges()` cannot retarget an event after an active-store/session switch. Query helpers apply a default limit and a hard cap; valid writes, owner UI behavior, and feature-flag disabled no-ops remain unchanged.

Default summary mode now preserves nightly drift input without restoring one write per changed item: each revision records a bounded per-item price/availability contribution list, recently extracted price corrections count as price drift, and only contributions above the compact cap fall back to detailed events. Revision summaries and publish events bypass replacement-style debouncing because they represent completed operations; detailed item/category changes retain the existing cost-control debounce.

Project update and publish operations capture one validated tenant/store session before their first read and reuse it for document paths, persistence metadata, MOL events, and publish snapshots. A mid-operation active-store switch therefore cannot redirect the observation ledger or snapshot away from the project write. Linked-outlet and standalone publishes both execute the common post-publish observation handoff after their authoritative save succeeds.

Snapshot rules mirror that operation boundary: same-tenant users without assignment to the path store cannot read or create its snapshots; creates require owner/manager authority, exact path/payload tenant and store IDs, an existing project, a bounded count-consistent payload, and append-only semantics.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Editor.tsx (Main Container - 748 LOC)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Header                                                   │    │
│  │  • Search Input (Ctrl+F)                                │    │
│  │  • EditorFiltersPopover                                 │    │
│  │  • View Switcher (Advanced/Traditional/Focus)           │    │
│  │  • EditorActionsPopover (More Actions)                  │    │
│  │  • Undo/Redo Buttons                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Views (Conditional)                                      │    │
│  │  • AdvancedView (Side-by-side: Image + Editor)          │    │
│  │  • TraditionalView (Category-based panels)              │    │
│  │  • FocusView (Full-width with file tabs)                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Modals (7 Total)                                         │    │
│  │  • LanguageSelectorModal (Ctrl+L)                       │    │
│  │  • DescriptionGenerationModal (Ctrl+G)                  │    │
│  │  • ImageUploadModal (Ctrl+U)                            │    │
│  │  • BulkStatusMenuModal (Ctrl+B)                         │    │
│  │  • ReorderMenuModal (Ctrl+R)                            │    │
│  │  • EditItemModal, EditCategoryModal                     │    │
│  │  • KeyboardShortcutsHelp (Shift+?)                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Footer                                                   │    │
│  │  • Save Status (Saved/Saving/Unsaved)                   │    │
│  │  • Keyboard Shortcuts Hint                              │    │
│  │  • Reset / Publish / Continue Buttons                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/components/templates/main-app/projects/editorView/
├── Editor.tsx                    # Main container (36KB, 748 LOC)
├── EditorContent.tsx             # Item/category editor (27KB)
├── EditorActionsPopover.tsx      # "More Actions" menu
├── EditorFiltersPopover.tsx      # Filter controls
├── editorShortcuts.config.ts     # Keyboard shortcuts config
├── KeyboardShortcutsHelp.tsx     # Shortcuts help modal
├── KeyboardShortcutDisplay.tsx   # Key display component
├── KeyboardKey.tsx               # Single key component
├── ZoomableImage.tsx             # Zoomable image viewer
├── AiDisclaimerAlert.tsx         # AI disclaimer
│
├── components/
│   └── FileImagePreview.tsx      # Image preview with controls
│
├── views/
│   ├── AdvancedView.tsx          # Side-by-side view
│   ├── TraditionalView.tsx       # Category-based view (54KB)
│   └── FocusView.tsx             # Full-width view
│
├── hooks/
│   ├── useEditorKeyboardShortcuts.ts  # Keyboard handling
│   └── useEditorLogic.ts              # Shared editor logic
│
├── utils/
│   ├── editorOperations.ts       # CRUD operations
│   └── itemFilters.ts            # Filtering utilities
│
├── Modals/
│   ├── LanguageSelectorModal.tsx
│   ├── DescriptionGenerationModal.tsx
│   ├── ImageUploadModal.tsx
│   ├── BulkStatusMenuModal.tsx
│   ├── ReorderMenuModal.tsx      # 307 LOC
│   ├── ReorderSortableItem.tsx   # 35 LOC
│   ├── editItemModal.tsx
│   ├── editCategoryModal.tsx
│   └── uploadedImagesList.tsx
│
└── AiImageGenerator/             # AI image generation (14 files)
```

---

## Key Components

### 1. Auto-Save System

```typescript
// Constants (constants.ts)
export const AUTOSAVE_DEBOUNCE_MS = 15000; // 15s after last change
export const AUTOSAVE_MIN_INTERVAL_MS = 30000; // Min 30s between saves

// Auto-save effect (Editor.tsx)
useEffect(() => {
  if (!hasChanges) return;

  const now = Date.now();
  const last = lastAutoSaveRef.current;
  const timeSinceLast = last ? now - last : Number.POSITIVE_INFINITY;

  const baseDelay = AUTOSAVE_DEBOUNCE_MS;
  const minIntervalDelay =
    timeSinceLast >= AUTOSAVE_MIN_INTERVAL_MS
      ? 0
      : AUTOSAVE_MIN_INTERVAL_MS - timeSinceLast;

  const delay = Math.max(baseDelay, minIntervalDelay);

  const timeoutId = window.setTimeout(async () => {
    if (!hasChangesRef.current) return;
    await syncChanges();
    lastAutoSaveRef.current = Date.now();
  }, delay);

  return () => window.clearTimeout(timeoutId);
}, [projectData, hasChanges]);
```

### 2. Undo/Redo System

```typescript
// State refs (in-memory for performance)
const historyRef = useRef<Project[]>([]); // Last 10 undo states
const redoRef = useRef<Project[]>([]); // Last 10 redo states
const lastSnapshotTimeRef = useRef<number | null>(null);

// Snapshot creation (throttled to 1 per second)
useEffect(() => {
  const changesFound = !isSameObjects(activeProject, projectData);
  setHasChanges(changesFound);

  if (changesFound) {
    const lastSnapshot = historyRef.current[historyRef.current.length - 1];
    const now = Date.now();
    const enoughTimeElapsed =
      !lastSnapshotTimeRef.current || now - lastSnapshotTimeRef.current >= 1000;

    if (
      !lastSnapshot ||
      (!isSameObjects(lastSnapshot, projectData) && enoughTimeElapsed)
    ) {
      const newSnapshot = removeObjRef(projectData);
      historyRef.current = [...historyRef.current.slice(-9), newSnapshot];
      lastSnapshotTimeRef.current = now;

      // Clear redo stack on new changes
      redoRef.current = [];
    }
  }
}, [activeProject, projectData]);

// Undo handler
const handleUndo = () => {
  if (historyRef.current.length === 0) return;

  const previous = historyRef.current[historyRef.current.length - 1];
  historyRef.current = historyRef.current.slice(0, -1);

  // Save current to redo stack
  const currentSnapshot = removeObjRef(projectData);
  redoRef.current = [...redoRef.current.slice(-9), currentSnapshot];

  setProjectData(removeObjRef(previous));
  setHasChanges(true);
};

// Redo handler
const handleRedo = () => {
  if (redoRef.current.length === 0) return;

  const next = redoRef.current[redoRef.current.length - 1];
  redoRef.current = redoRef.current.slice(0, -1);

  // Save current back to history
  const currentSnapshot = removeObjRef(projectData);
  historyRef.current = [...historyRef.current.slice(-9), currentSnapshot];

  setProjectData(removeObjRef(next));
  setHasChanges(true);
};
```

### 3. Validation System

```typescript
const validateProject = (data: Project): string[] => {
  const errors: string[] = [];
  const activeLang = data.languages?.[0] || "en";

  data.files?.forEach((file, fileIndex) => {
    const fileLabel = file.name || `File ${fileIndex + 1}`;
    const items = file.extractedData?.data?.items || [];

    items.forEach((item, itemIndex) => {
      const itemName = item.name?.[activeLang] || "";
      const itemLabel = itemName || `Item ${itemIndex + 1}`;

      // Check name
      if (!itemName) {
        errors.push(
          `${fileLabel} → ${itemLabel}: Name is required (${activeLang})`
        );
      }

      // Check category
      if (!item.category) {
        errors.push(`${fileLabel} → ${itemLabel}: Category is required`);
      }

      // Check price
      if (typeof item.price === "number" && item.price < 0) {
        errors.push(`${fileLabel} → ${itemLabel}: Price cannot be negative`);
      }
    });
  });

  return errors;
};

// Usage in publish flow
const confirmPublishChanges = async () => {
  const validationErrors = validateProject(projectData);

  if (validationErrors.length > 0) {
    AntdModal.error({
      title: "Please fix these issues before publishing",
      content: (
        <ul>
          {validationErrors.map((err, idx) => (
            <li key={idx}>{err}</li>
          ))}
        </ul>
      ),
    });
    return; // Block publish
  }

  // Proceed with publish...
};
```

### 4. Keyboard Shortcuts

```typescript
// editorShortcuts.config.ts
export const EDITOR_SHORTCUTS = [
  { key: "s", ctrlKey: true, action: "save", description: "Save changes" },
  { key: "z", ctrlKey: true, action: "undo", description: "Undo" },
  {
    key: "z",
    ctrlKey: true,
    shiftKey: true,
    action: "redo",
    description: "Redo",
  },
  { key: "f", ctrlKey: true, action: "search", description: "Focus search" },
  { key: "n", ctrlKey: true, action: "newItem", description: "Add new item" },
  {
    key: "n",
    ctrlKey: true,
    shiftKey: true,
    action: "newCategory",
    description: "Add category",
  },
  {
    key: "l",
    ctrlKey: true,
    action: "languageModal",
    description: "Language modal",
  },
  {
    key: "g",
    ctrlKey: true,
    action: "descriptionModal",
    description: "Description generator",
  },
  {
    key: "u",
    ctrlKey: true,
    action: "imageUpload",
    description: "Image upload",
  },
  { key: "b", ctrlKey: true, action: "bulkStatus", description: "Bulk status" },
  { key: "r", ctrlKey: true, action: "reorder", description: "Reorder menu" },
  { key: "?", shiftKey: true, action: "help", description: "Show shortcuts" },
];

// useEditorKeyboardShortcuts.ts
useKeyboardShortcuts(
  [
    {
      key: "s",
      ctrlKey: true,
      action: () => {
        if (!isSaving) {
          void syncChanges();
        }
      },
      description: "Save editor changes",
    },
    // ... more shortcuts
  ],
  true
);
```

### 5. Drag-Drop Reordering

```typescript
// ReorderMenuModal.tsx (using @dnd-kit)
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  if (active.id !== over?.id) {
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over?.id);

    const reordered = arrayMove(items, oldIndex, newIndex);
    const reindexed = reordered.map((item, index) => ({
      ...item,
      index,
    }));

    setItems(reindexed);
  }
};

// Usage
<DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={items} strategy={verticalListSortingStrategy}>
    {items.map((item) => (
      <ReorderSortableItem key={item.id} item={item} />
    ))}
  </SortableContext>
</DndContext>;
```

---

## State Management

### Context Provider

```typescript
// ProjectsDataProvider wraps Editor
<ProjectsDataProvider>
  <Editor />
</ProjectsDataProvider>;

// Access in Editor
const { activeProject, updateProject } = useProjectsData();
```

### Local State (Editor.tsx)

```typescript
const [projectData, setProjectData] = useState<Project>(activeProject);
const [hasChanges, setHasChanges] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">(
  "saved"
);
const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

// View state
const [activeView, setActiveView] = useState<
  "advanced" | "traditional" | "focus"
>("advanced");
const [activeCategory, setActiveCategory] = useState<string | null>(null);
const [activeItem, setActiveItem] = useState<string | null>(null);
const [searchQuery, setSearchQuery] = useState("");

// Modal state
const [languageModalOpen, setLanguageModalOpen] = useState(false);
const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
const [imageUploadOpen, setImageUploadOpen] = useState(false);
const [reorderModalOpen, setReorderModalOpen] = useState(false);
const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
```

---

## Database Operations

### Save Changes

```typescript
const syncChanges = async () => {
  if (!hasChangesRef.current) return;

  setIsSaving(true);
  setSaveStatus("saving");

  try {
    await updateProject({
      projectId: projectData.projectId,
      files: projectData.files,
      languages: projectData.languages,
    });

    setHasChanges(false);
    hasChangesRef.current = false;
    setSaveStatus("saved");
    setLastSaveTime(new Date());
  } catch (error) {
    console.error("Save failed:", error);
    message.error("Failed to save changes");
    setSaveStatus("unsaved");
  } finally {
    setIsSaving(false);
  }
};
```

### Change Detection

```typescript
// Using isSameObjects utility for deep comparison
const hasRealChanges = !isSameObjects(activeProject, projectData);
setHasChanges(hasRealChanges);
```

---

## Validation Checklist

| Requirement             | Implementation            | Location             | Status |
| ----------------------- | ------------------------- | -------------------- | ------ |
| Auto-save with debounce | useEffect with setTimeout | Editor.tsx:237-266   | ✅     |
| Auto-save throttle      | Min interval check        | Editor.tsx:241-246   | ✅     |
| Undo/redo stacks        | In-memory refs            | Editor.tsx:37-39     | ✅     |
| Keyboard shortcuts      | useKeyboardShortcuts      | Editor.tsx:78-105    | ✅     |
| Validation on publish   | validateProject()         | Editor.tsx:177-202   | ✅     |
| Drag-drop reorder       | @dnd-kit integration      | ReorderMenuModal.tsx | ✅     |
| Multiple view modes     | Conditional rendering     | Editor.tsx:450-470   | ✅     |
| Save status UI          | Footer component          | Editor.tsx:614-634   | ✅     |

---

## Testing Guide

### Quick Tests (10 min)

| Test       | Steps                     | Expected            |
| ---------- | ------------------------- | ------------------- |
| Auto-save  | Edit item, wait 15s       | "All changes saved" |
| Undo       | Make change, Ctrl+Z       | Change reverted     |
| Redo       | Undo, then Ctrl+Shift+Z   | Change restored     |
| Validation | Remove item name, Publish | Error modal blocks  |
| Reorder    | Ctrl+R, drag items        | Order changes       |

### Manual Test Commands

```bash
# Open editor in browser
# DevTools → Network tab → Watch for Firestore writes
# DevTools → Console → Check for auto-save logs
```

---

## Related Documents

| Document                                                  | Purpose                           |
| --------------------------------------------------------- | --------------------------------- |
| `_spec.md`                                                | Product specification             |
| `_marketing.md`                                           | Sales collateral                  |
| `../editor/`                                              | Detailed component docs (8 files) |
| `../assessments/assessment-03-editor.md`                  | Original assessment               |
| `../development_done/3-implementation-editor-complete.md` | Implementation details            |

---

## Recommendations & Future Improvements

### Code Quality Observations

| Finding                | Current State                            | Recommendation                    | Priority |
| ---------------------- | ---------------------------------------- | --------------------------------- | -------- |
| **Auto-save**          | 15s debounce + 30s throttle              | ✅ Well-tuned for Firestore costs | -        |
| **Undo/Redo**          | In-memory history (10 snapshots)         | ✅ Good UX, appropriate depth     | -        |
| **Keyboard Shortcuts** | Custom hook `useEditorKeyboardShortcuts` | ✅ Clean implementation           | -        |
| **Validation**         | Pre-publish checks with modal            | ✅ Prevents bad data              | -        |
| **View Modes**         | Advanced, Traditional, Focus             | ✅ Flexible for different users   | -        |

### Suggested Improvements

1. **Collaborative Editing Indicators**

   - **Current**: No indication if another user is editing
   - **Suggested**: Show "last edited by X at Y" badge, consider Firestore real-time listener
   - **File**: `Editor.tsx`
   - **Priority**: P2

2. **Bulk Edit Operations**

   - **Current**: Edit items one at a time
   - **Suggested**: Select multiple items → bulk price change, category move
   - **File**: New component `BulkEditModal.tsx`
   - **Priority**: P2

3. **Undo History Persistence**

   - **Current**: History lost on page refresh
   - **Suggested**: Save last 3 undo states to localStorage
   - **File**: `Editor.tsx`
   - **Priority**: P3

4. **Change Highlighting**
   - **Current**: No visual diff of unsaved changes
   - **Suggested**: Highlight modified fields with subtle color
   - **Priority**: P3

### Technical Debt

| Item                    | Description                                        | Effort |
| ----------------------- | -------------------------------------------------- | ------ |
| `isSameObjects` utility | Deep comparison could be expensive for large menus | Medium |
| Modal state management  | Multiple modal states could use reducer pattern    | Low    |
| View mode persistence   | Remember user's preferred view across sessions     | Low    |

---

_Document Status: Historical data-editor implementation evidence - not current launch certification_
