# 💾 Auto-Save System

**File**: `Editor.tsx`  
**Last Updated**: Nov 27, 2025

---

## 📋 Overview

The Editor implements a production-ready auto-save system that balances user experience with Firestore cost control.

---

## ⚙️ Configuration

```typescript
// In constants file
const AUTOSAVE_DEBOUNCE_MS = 2000; // Wait 2s after last change
const AUTOSAVE_MIN_INTERVAL_MS = 5000; // Min 5s between saves
```

| Setting      | Value     | Purpose                            |
| ------------ | --------- | ---------------------------------- |
| Debounce     | 2 seconds | Wait for user to stop typing       |
| Min Interval | 5 seconds | Prevent excessive Firestore writes |

---

## 🔄 How It Works

### State Management

```typescript
const [hasChanges, setHasChanges] = useState(false);
const hasChangesRef = useRef(false); // For race condition prevention
const lastAutoSaveRef = useRef<number | null>(null); // Last save timestamp
const [isSaving, setIsSaving] = useState(false);
const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
```

### Change Detection

```typescript
useEffect(() => {
  const changesFound = !isSameObjects(activeProject, projectData);
  setHasChanges(changesFound);
  hasChangesRef.current = changesFound;
}, [activeProject, projectData]);
```

Uses deep comparison (`isSameObjects`) to detect actual changes.

### Auto-Save Logic

```typescript
useEffect(() => {
  if (!hasChanges) return; // No changes = no save

  const now = Date.now();
  const last = lastAutoSaveRef.current;
  const timeSinceLast = last ? now - last : Infinity;

  // Calculate delay combining debounce + min interval
  const baseDelay = AUTOSAVE_DEBOUNCE_MS;
  const minIntervalDelay =
    timeSinceLast >= AUTOSAVE_MIN_INTERVAL_MS
      ? 0
      : AUTOSAVE_MIN_INTERVAL_MS - timeSinceLast;

  const delay = Math.max(baseDelay, minIntervalDelay);

  const timeoutId = setTimeout(async () => {
    // Double-check (race condition prevention)
    if (!hasChangesRef.current) return;

    await syncChanges();
    lastAutoSaveRef.current = Date.now();
  }, delay);

  return () => clearTimeout(timeoutId);
}, [projectData, hasChanges]);
```

---

## 📊 Timeline Example

```
0.0s:  User edits item name
       → Timer starts (2s debounce)

1.0s:  User edits price
       → Timer resets (2s debounce)

1.5s:  User edits description
       → Timer resets (2s debounce)

3.5s:  Timer fires
       → Save #1 to Firestore ✅
       → lastAutoSaveRef = 3.5s

4.0s:  User edits another item
       → Timer starts (2s debounce)

6.0s:  Timer tries to fire
       → Only 2.5s since last save
       → Wait additional 2.5s (enforce 5s minimum)

8.5s:  Save #2 to Firestore ✅
       → lastAutoSaveRef = 8.5s
```

---

## 🛡️ Unsaved Changes Warning

Prevents accidental data loss when closing tab:

```typescript
useEffect(() => {
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (hasChanges) {
      event.preventDefault();
      event.returnValue = ""; // Shows browser warning
    }
  };

  if (hasChanges) {
    window.addEventListener("beforeunload", handleBeforeUnload);
  } else {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  }

  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, [hasChanges]);
```

---

## 📱 Status Display

### Footer Status Bar

```
┌─────────────────────────────────────────────────────────┐
│ [Saving...]  or  [Unsaved changes]  or  [All changes saved] │
└─────────────────────────────────────────────────────────┘
```

### Status Logic

```typescript
const getSaveStatus = () => {
  if (isSaving) return "Saving...";
  if (hasChanges) return "Unsaved changes";
  return "All changes saved";
};
```

### Tooltip with Timestamp

```typescript
<Tooltip title={lastSavedAt ? `Saved at ${formatTime(lastSavedAt)}` : ""}>
  <Text type="secondary">{getSaveStatus()}</Text>
</Tooltip>
```

---

## 🔧 Sync Function

```typescript
const syncChanges = async () => {
  if (isSaving) return; // Prevent concurrent saves

  setIsSaving(true);
  try {
    await updateProject(tenantDetails.id, projectData.id, projectData);
    setActiveProject(projectData);
    setLastSavedAt(Date.now());
    setHasChanges(false);
  } catch (error) {
    message.error("Failed to save changes");
    console.error("Save error:", error);
  } finally {
    setIsSaving(false);
  }
};
```

---

## ⌨️ Manual Save

Users can manually save with `Ctrl+S`:

```typescript
// In useEditorKeyboardShortcuts
{
    ...EDITOR_SHORTCUTS.SAVE_CHANGES,
    action: async () => {
        if (isSaving) {
            message.info('Already saving...');
            return;
        }
        await syncChanges();
        message.success('Changes saved');
    }
}
```

---

## 💰 Cost Optimization

### Problem

Fast typing = hundreds of Firestore writes = high costs

### Solution

| Strategy     | Implementation                |
| ------------ | ----------------------------- |
| Debounce     | Wait 2s after last change     |
| Throttle     | Min 5s between saves          |
| Ref Check    | Prevent race conditions       |
| Deep Compare | Only save if actually changed |

### Result

- Smooth UX (no lag)
- Cost control (~$0.18 per 100K writes)
- No data loss

---

## 🔄 Data Flow

```
User makes edit
    ↓
setProjectData(newData)
    ↓
useEffect detects change
    ↓
hasChanges = true
    ↓
Auto-save timer starts
    ↓
(User may make more edits - timer resets)
    ↓
Timer fires after delay
    ↓
syncChanges() called
    ↓
updateProject() → Firestore
    ↓
setActiveProject(projectData)
    ↓
hasChanges = false
    ↓
lastSavedAt updated
    ↓
UI shows "All changes saved"
```

---

## 🧪 Testing Checklist

- [ ] Edit item → Wait 2s → Verify save
- [ ] Edit rapidly → Verify debounce works
- [ ] Save twice quickly → Verify 5s throttle
- [ ] Close tab with changes → Verify warning
- [ ] Press Ctrl+S → Verify manual save
- [ ] Check Firestore → Verify data persisted
- [ ] Refresh page → Verify data loaded

---

## 🔗 Related Files

- `Editor.tsx` - Auto-save implementation
- `@database/projects` - `updateProject` function
- `@util/utils` - `isSameObjects` comparison
