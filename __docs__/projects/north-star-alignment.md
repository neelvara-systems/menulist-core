# Projects Feature: North Star Alignment Assessment

**North Star:** "Update my menu, everywhere, now."  
**Assessment Date:** December 15, 2025  
**Status:** 🟡 Partially Aligned

---

## Executive Summary

The Projects feature has solid foundations for the North Star moment. Upload and AI extraction are simple. Publishing and auto-sync exist. Key gaps remain in the "everywhere" part (live URL at `{store}.menulist.online/{slug}`).

---

## Two User Segments

| Segment | Name                   | View     | Purpose                                   |
| ------- | ---------------------- | -------- | ----------------------------------------- |
| **B2C** | Restaurant Owners      | B2C View | Direct menu publishing to customers       |
| **B2B** | POS Software Companies | B2B View | API/export integration with their systems |

This is intentional design - features like XLSX export and JSON API are B2B-specific.

---

## Priority 1: Simplify the Publish Flow

### ✅ DONE

| Feature              | Location                             | Status         |
| -------------------- | ------------------------------------ | -------------- |
| Publish Button       | `Editor.tsx:762-773`                 | ✅ Implemented |
| Auto-sync on changes | `Editor.tsx:211-233` (`syncChanges`) | ✅ Implemented |
| Changes auto-reflect | Via `updateProject()` → Firestore    | ✅ Implemented |

**Code Reference - Publish Button:**

```tsx
// @Editor.tsx:762-773
<Tooltip title="Publish Changes">
  <Button
    type="primary"
    shape="circle"
    size="large"
    icon={<LuUploadCloud />}
    onClick={confirmPublishChanges}
  />
</Tooltip>
```

**Code Reference - Auto-sync:**

```tsx
// @Editor.tsx:211-233
const syncChanges = useCallback(async (updatedData: Project = projectData) => {
    if (!activeProject || isSameObjects(activeProject, updatedData)) {
        return;
    }
    setIsSaving(true);
    const updatedProject = await updateProject({...});
    // Updates reflect immediately
}, [...]);
```

### ⏳ PENDING

| Feature                                   | Priority  | Notes                                 |
| ----------------------------------------- | --------- | ------------------------------------- |
| Live URL at `{store}.menulist.online/{slug}` | 🔴 High   | Will implement after editor is stable |
| "Updated X seconds ago" indicator         | 🟡 Medium | UX polish                             |
| Show live URL prominently in UI           | 🟡 Medium | After live URL is implemented         |

---

## Priority 2: Reduce Editor Complexity

### ✅ DONE / JUSTIFIED

| Feature                        | Status  | Justification                  |
| ------------------------------ | ------- | ------------------------------ |
| Advanced View (inline editing) | ✅ Done | Tap → type → done flow works   |
| Traditional View (modal-based) | ✅ Done | Alternative for complex edits  |
| View switcher                  | ✅ Done | User can choose preferred mode |

### 🟡 DEFERRED (Post-Release)

| Feature                        | Action   | Timeline                        |
| ------------------------------ | -------- | ------------------------------- |
| Cut theming to 3 preset themes | Simplify | After editor stable for release |
| Review modal necessity         | Audit    | Post-release                    |

---

## Priority 3: Cut Features Ruthlessly

### ✅ JUSTIFIED (Keep)

| Feature               | Reason to Keep                                |
| --------------------- | --------------------------------------------- |
| XLSX export           | B2B clients need Excel format for POS systems |
| JSON export           | B2B clients need API integration              |
| B2B View              | Required for software companies segment       |
| API POST (ShareModal) | B2B webhook integration                       |

### 🟡 DEFERRED (Post-Release Simplification)

| Feature                    | Action                | Timeline             |
| -------------------------- | --------------------- | -------------------- |
| GradientPicker             | Remove or simplify    | After editor release |
| BorderSettings             | Remove or simplify    | After editor release |
| KeyboardShortcuts          | Keep but deprioritize | After editor release |
| Color customization in B2C | Cut to 3 presets      | After editor release |

---

## Priority 4: Complete the Loop

### ✅ DONE

| Feature                        | Location                            | Status         |
| ------------------------------ | ----------------------------------- | -------------- |
| QR Code for printing           | `b2cView/shareModal/qrCodeView.tsx` | ✅ Implemented |
| QR customization (color, logo) | Same file                           | ✅ Implemented |
| Download QR as PNG             | Same file                           | ✅ Implemented |

**Code Reference - QR Code:**

```tsx
// @qrCodeView.tsx
<QRCode
    value={shareUrl}
    size={qrSize}
    errorLevel={"H"}
    color={qrColor}
    bgColor={qrBgColor}
    icon={showLogo ? LOGO_SMALL : undefined}
/>
<Button onClick={handleDownloadQRCode}>Download QR Code</Button>
```

### ⏳ PENDING

| Feature                           | Priority  | Notes                                   |
| --------------------------------- | --------- | --------------------------------------- |
| Show live URL prominently         | 🔴 High   | After hosted public links are implemented |
| "Updated 2 seconds ago" indicator | 🟡 Medium | UX polish                               |

---

## Implementation Roadmap

### Phase 1: Editor Stability (Current Focus)

- [ ] Ensure upload → extract → edit → publish flow is bug-free
- [ ] Test auto-sync reliability
- [ ] Verify B2B export formats work correctly

### Phase 2: Live URL Implementation (Next)

- [ ] Create public route: `{store}.menulist.online/{slug}`
- [ ] Menu renders from Firestore in real-time
- [ ] Changes reflect instantly (no cache issues)
- [ ] Show live URL prominently in Editor/B2C view

### Phase 3: Post-Release Polish

- [ ] Cut theming to 3 presets
- [ ] Add "Updated X ago" indicator
- [ ] Remove/simplify GradientPicker, BorderSettings
- [ ] Audit and remove unnecessary modals

---

## Files Reference

### Core Flow Files

| File                                | Purpose                               |
| ----------------------------------- | ------------------------------------- |
| `projects/index.tsx`                | Main entry, upload, view switching    |
| `editorView/Editor.tsx`             | Editor with publish button, auto-sync |
| `b2cView/index.tsx`                 | B2C preview and theming               |
| `b2bView.tsx`                       | B2B JSON view                         |
| `b2cView/shareModal/qrCodeView.tsx` | QR code generation                    |
| `ShareModal.tsx`                    | Export options (JSON, XLSX, API)      |

### Key Functions

| Function                  | File           | Purpose                |
| ------------------------- | -------------- | ---------------------- |
| `syncChanges()`           | Editor.tsx:211 | Auto-save to Firestore |
| `confirmPublishChanges()` | Editor.tsx     | Manual publish trigger |
| `handleDownloadQRCode()`  | qrCodeView.tsx | QR download            |

---

## Alignment Score

| Area              | Score   | Notes                              |
| ----------------- | ------- | ---------------------------------- |
| **Upload**        | ✅ 9/10 | Simple, clear, works               |
| **AI Extraction** | ✅ 9/10 | Automatic, removes decisions       |
| **Editing**       | 🟡 7/10 | Works, could simplify post-release |
| **Publishing**    | 🟡 6/10 | Button exists, needs live URL      |
| **"Everywhere"**  | 🔴 3/10 | Live URL not yet implemented       |
| **"Now"**         | ✅ 8/10 | Auto-sync works, instant           |

**Overall:** 🟡 **7/10** — Core works, "everywhere" (public URL) is the gap.

---

## Next Action Items

1. **Stabilize Editor** — Current focus
2. **Implement Live URL** — `{store}.menulist.online/{slug}`
3. **Surface Live URL in UI** — Prominent display after publish
4. **Add freshness indicator** — "Updated 2 seconds ago"

---

## 🆕 Priority 5: Customer-Facing Menu Auto-Sell Features

> **Key Insight (Dec 16, 2025):** The current customer-facing menu is "just an ordinary menu" — this is why word-of-mouth is zero. Customers don't notice anything different from paper menus.

**See:** [`client-menu/autosell-features/`](../client-menu/autosell-features/) for full implementation plan.

### The Auto-Sell Ladder (Build in Order)

| #   | Feature                             | Effect                   | Status   |
| --- | ----------------------------------- | ------------------------ | -------- |
| 1   | "Live / Updated just now" indicator | Creates **trust**        | To Build |
| 2   | Instant Availability Behavior       | Creates **surprise**     | To Build |
| 3   | Time-Based Menu Categories          | Creates **stories**      | To Build |
| 4   | Menu-as-Marketing Surface           | Creates **distribution** | Future   |

### Why This Matters

- **Word-of-mouth is currently zero** because customers don't notice anything special
- These features make the menu **visibly different** from paper/static QR menus
- Each feature creates a **moment** that customers talk about
- Owners don't have to promote — the **behavior explains itself**

### Critical Decision: Remove Publish Button

| Current                           | Jobs Philosophy                          |
| --------------------------------- | ---------------------------------------- |
| Explicit "Publish" button         | ❌ Creates two realities (draft vs live) |
| Auto-sync exists                  | ✅ Menu should always be live            |
| **Action:** Remove publish button | Menu = reality, not a project            |

### Validated Decision: Category = Section

> **From ChatGPT conversation validation (Dec 16, 2025)**

| Question                              | Answer                                         |
| ------------------------------------- | ---------------------------------------------- |
| Do we have sections in data model?    | ❌ No, only categories                         |
| Are categories and sections the same? | ✅ Yes (Breakfast, Lunch, Dinner = categories) |
| Would adding "section" help?          | ❌ No, adds mental overhead                    |

**Locked Decision:** Categories ARE sections. Time-based behavior applies to categories. No new abstraction introduced.

**Why:** Behavior beats structure. Customers don't care what it's called.

---

## 🆕 Priority 6: One Surface Philosophy (Future)

> **Jobs Principle:** "Why does the menu behave differently depending on who's looking?"

### Current State

- **Editor View** — Admin edits content
- **B2C View** — Admin previews/themes
- **Customer View** — Public sees menu

### Target State (Post-Release)

- **One Menu Surface** — Same URL, same layout
- **Owner sees:** Tap-to-edit affordances
- **Customer sees:** Clean menu
- **No mode switching** — Intent adapts, not the interface

This is deferred until core features are stable.

---

## Updated Alignment Score

| Area              | Score   | Notes                                   |
| ----------------- | ------- | --------------------------------------- |
| **Upload**        | ✅ 9/10 | Simple, clear, works                    |
| **AI Extraction** | ✅ 9/10 | Automatic, removes decisions            |
| **Editing**       | 🟡 7/10 | Works, could simplify post-release      |
| **Publishing**    | 🟡 6/10 | Auto-sync exists, remove publish button |
| **"Everywhere"**  | 🔴 3/10 | Live URL not yet implemented            |
| **"Now"**         | ✅ 8/10 | Auto-sync works, instant                |
| **Customer Menu** | 🔴 2/10 | **NEW:** No auto-sell features yet      |

**Overall:** 🟡 **6/10** — Core works, customer-facing menu needs auto-sell features.

---

_Last Updated: December 16, 2025_
