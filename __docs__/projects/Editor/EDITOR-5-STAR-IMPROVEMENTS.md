# 🎯 Editor Feature — 5-Star Learning Curve Assessment

**Assessment Date:** February 5, 2026  
**Current Rating:** ⭐⭐⭐⭐ (4/5) — _Improved from 3/5_  
**Target Rating:** ⭐⭐⭐⭐⭐ (5/5)  
**Scope:** Complete Editor Feature UX Analysis

> **Implementation Status:** Phase 0-2 implemented. See `__docs__/editor-ux-improvements/` for details.

---

## Executive Summary

The Editor's learning curve is rated **3 stars** because:

1. **Scattered Operations** — Override/editing operations spread across 8+ modals
2. **No Guided Onboarding** — Users dropped into complex interface without guidance
3. **Power-User Bias** — Keyboard shortcuts assume technical familiarity
4. **Contextual Help Gaps** — Tooltips exist but no progressive disclosure
5. **No First-Run Experience** — No walkthrough for new users

---

## Part I: Root Cause Analysis

### Why 3 Stars (Not 5)?

| Issue                       | Impact                                  | User Type Affected |
| --------------------------- | --------------------------------------- | ------------------ |
| **8 modals to learn**       | Overwhelming                            | All users          |
| **3 view modes**            | Confusing choice                        | Non-tech users     |
| **12+ keyboard shortcuts**  | Invisible to beginners                  | Non-tech users     |
| **No empty state guidance** | "What do I do now?"                     | First-time users   |
| **Technical terminology**   | "Attributes", "Override", "Inheritance" | Non-tech owners    |
| **Multi-outlet complexity** | Locked fields without explanation       | Outlet managers    |

### User Journey Pain Points

```
User Opens Editor
      │
      ├─→ "Which view should I use?" (3 options, no guidance)
      │
      ├─→ "Where do I change prices?" (must find More Actions → or inline)
      │
      ├─→ "Why can't I edit this field?" (lock icon but no onboarding)
      │
      ├─→ "What's a keyboard shortcut?" (Shift+? but who knows that?)
      │
      └─→ "Did my changes save?" (auto-save exists but status subtle)
```

---

## Part II: Current State vs 5-Star Standard

### A. Onboarding & First-Run Experience

| Feature              | Current State | 5-Star Standard                | Gap         |
| -------------------- | ------------- | ------------------------------ | ----------- |
| First-run tutorial   | ❌ None       | ✅ Guided walkthrough          | **MISSING** |
| Welcome message      | ❌ None       | ✅ "Here's how to get started" | **MISSING** |
| Empty state guidance | ⚠️ Minimal    | ✅ Action-oriented prompts     | **PARTIAL** |
| Progress indicator   | ❌ None       | ✅ "3 of 5 steps complete"     | **MISSING** |
| Video tutorials      | ❌ None       | ✅ Embedded help videos        | **MISSING** |

### B. View Mode Selection

| Feature             | Current State   | 5-Star Standard                  | Gap         |
| ------------------- | --------------- | -------------------------------- | ----------- |
| View descriptions   | ⚠️ Icons only   | ✅ "Best for..." labels          | **PARTIAL** |
| Auto-recommend view | ❌ None         | ✅ Based on menu size/user type  | **MISSING** |
| View comparison     | ❌ None         | ✅ "What's the difference?" help | **MISSING** |
| Remember preference | ❌ Session only | ✅ Persisted per user            | **MISSING** |

### C. Modal Complexity

| Modal                      | Purpose          | Learning Difficulty | Improvement Needed            |
| -------------------------- | ---------------- | ------------------- | ----------------------------- |
| LanguageSelectorModal      | Add languages    | Medium              | Add "Why add languages?"      |
| DescriptionGenerationModal | AI descriptions  | Low                 | Good as-is                    |
| ImageUploadModal           | Add images       | Medium              | Simplify assignment flow      |
| BulkStatusMenuModal        | Mass show/hide   | High                | Add use-case examples         |
| ReorderMenuModal           | Drag to sort     | Medium              | Add "When to reorder" tips    |
| EditItemModal              | Full item edit   | High                | Progressive disclosure needed |
| EditCategoryModal          | Category edit    | Low                 | Good as-is                    |
| StoreCustomizationModal    | Outlet overrides | High                | **NEW** - needs onboarding    |

### D. Contextual Help

| Location           | Current Help        | 5-Star Standard             | Gap          |
| ------------------ | ------------------- | --------------------------- | ------------ |
| Locked fields      | Lock icon + tooltip | ✅ Acceptable               | Minor polish |
| Inheritance badges | Color-coded         | ⚠️ Need "What's this?" link | **PARTIAL**  |
| Price fields       | None                | ✅ Format hint              | **MISSING**  |
| Image requirements | None                | ✅ "Best: 800x600, JPG/PNG" | **MISSING**  |
| AI features        | Disclaimers exist   | ✅ Add "How it works"       | **PARTIAL**  |

### E. Save & Feedback

| Feature             | Current State     | 5-Star Standard                   | Gap         |
| ------------------- | ----------------- | --------------------------------- | ----------- |
| Auto-save indicator | ⚠️ Subtle text    | ✅ Clear toast/badge              | **PARTIAL** |
| Undo confirmation   | ❌ None           | ✅ "Undid: price change"          | **MISSING** |
| Publish preview     | ❌ Direct publish | ✅ Preview before publish         | **MISSING** |
| Change history      | ❌ None           | ✅ "What changed since last save" | **MISSING** |

---

## Part III: 5-Star Improvement Roadmap

### Phase 1: Quick Wins (1-2 days each)

#### 1.1 Add Welcome Banner (New Users)

```typescript
// Show on first Editor visit
{isFirstVisit && (
  <Alert
    type="info"
    message="Welcome to your Menu Editor!"
    description="This is where you'll review and edit your menu. Start by checking the extracted data is correct."
    action={<Button>Take a Tour</Button>}
    closable
  />
)}
```

**Impact:** ⭐ +0.5

#### 1.2 Add View Mode Descriptions

```typescript
// Replace icon-only segmented control
options={[
  { label: 'Side-by-Side', value: 'advanced', description: 'Best for verifying extraction' },
  { label: 'Traditional', value: 'traditional', description: 'Best for large menus' },
]}
```

**Impact:** ⭐ +0.25

#### 1.3 Add "First Item" Guidance

```typescript
// When no items selected
<Empty
  description={
    <Flex vertical gap={8}>
      <Text>Click any item to edit it</Text>
      <Text type="secondary">Or use ↑↓ arrows after clicking the list</Text>
    </Flex>
  }
/>
```

**Impact:** ⭐ +0.25

#### 1.4 Enhance Save Status Visibility

```typescript
// Replace subtle text with prominent badge
<Badge status={isSaving ? 'processing' : 'success'} text={isSaving ? 'Saving...' : 'All changes saved'} />
```

**Impact:** ⭐ +0.25

### Phase 2: Guided Onboarding (3-5 days)

#### 2.1 Interactive Tour Component

```typescript
// Use react-joyride or similar
const tourSteps = [
  {
    target: ".view-switcher",
    content: "Switch between different editing views",
  },
  { target: ".search-input", content: "Search for any item or category" },
  {
    target: ".more-actions",
    content: "Bulk operations like generating descriptions",
  },
  {
    target: ".item-card",
    content: "Click to edit. Lock icon means master-controlled.",
  },
];
```

**Impact:** ⭐ +0.5

#### 2.2 Keyboard Shortcut Discovery

```typescript
// Show floating hint on first use
{!hasUsedShortcuts && (
  <FloatingHint position="bottom-right">
    💡 Pro tip: Press Shift+? to see all keyboard shortcuts
  </FloatingHint>
)}
```

**Impact:** ⭐ +0.25

#### 2.3 Smart View Recommendation

```typescript
// Auto-suggest based on context
const recommendedView = useMemo(() => {
  if (projectData.files.length === 1) return "focus";
  if (totalItemCount > 50) return "traditional";
  return "advanced";
}, [projectData]);
```

**Impact:** ⭐ +0.25

### Phase 3: Progressive Disclosure (1 week)

#### 3.1 Simplified Edit Item Modal

```typescript
// Show basic fields by default, advanced in collapsible
<Collapse defaultActiveKey={['basic']}>
  <Panel key="basic" header="Basic Info">
    {/* Name, Description, Price, Category */}
  </Panel>
  <Panel key="advanced" header="Advanced Options">
    {/* Attributes, Duration, Owner Boost, etc. */}
  </Panel>
</Collapse>
```

**Impact:** ⭐ +0.5

#### 3.2 Contextual "What's This?" Links

```typescript
// Add info icons with popovers
<Flex align="center" gap={4}>
  <Text>Inheritance State</Text>
  <Popover content={
    <Flex vertical gap={8} style={{ maxWidth: 250 }}>
      <Text strong>Understanding Inheritance</Text>
      <Text>• Inherited: From master menu (locked)</Text>
      <Text>• Overridden: Modified locally</Text>
      <Text>• Local-only: Created at this store</Text>
    </Flex>
  }>
    <LuInfo size={14} style={{ cursor: 'help' }} />
  </Popover>
</Flex>
```

**Impact:** ⭐ +0.25

### Phase 4: Non-Tech User Language (Ongoing)

#### 4.1 Terminology Simplification

| Technical Term  | User-Friendly Term   |
| --------------- | -------------------- |
| Attributes      | Variations / Options |
| Override        | Local changes        |
| Inheritance     | Linked to main menu  |
| Duration        | Prep time            |
| Owner Boost     | Promotion priority   |
| Active/Inactive | Show/Hide on menu    |

#### 4.2 Action-Oriented Labels

| Current                      | Improved                     |
| ---------------------------- | ---------------------------- |
| "BulkStatusMenuModal"        | "Show or Hide Items"         |
| "ReorderMenuModal"           | "Rearrange Your Menu"        |
| "DescriptionGenerationModal" | "Write Descriptions with AI" |
| "Language Selector"          | "Add Menu Languages"         |

---

## Part IV: Multi-Outlet Specific Improvements

### Current Issues (Why 3 Stars for Outlets)

1. **No explanation of master/outlet relationship**
2. **Locked fields confuse users** — "Why can't I change this?"
3. **StoreCustomizationModal is new** — Users don't know it exists
4. **Override operations scattered** — Some in modal, some inline

### Recommended Improvements

#### 4.1 Outlet Onboarding Banner

```typescript
{isMasterLinked && isFirstOutletVisit && (
  <Alert
    type="info"
    icon={<LuLink />}
    message="This store's menu is linked to your main menu"
    description={
      <Flex vertical gap={4}>
        <Text>• Brand items (name, description, images) stay consistent</Text>
        <Text>• You CAN change: prices, availability, bestsellers</Text>
        <Text>• Look for the 🔧 Store Customization button for quick changes</Text>
      </Flex>
    }
    closable
  />
)}
```

#### 4.2 Highlight StoreCustomizationModal Access

```typescript
// Pulse animation on first visit for outlet stores
{isMasterLinked && !hasOpenedStoreCustomization && (
  <Badge dot>
    <Button onClick={openStoreCustomization}>
      <LuSettings2 /> Store Customization
    </Button>
  </Badge>
)}
```

#### 4.3 Visual Diff for Overrides

```typescript
// In StoreCustomizationModal, show master value vs local
{record.inheritanceState === 'overridden' && (
  <Tooltip title={`Master price: ${record.masterPrice}`}>
    <Text delete type="secondary">{record.masterPrice}</Text>
    <Text> → {record.price}</Text>
  </Tooltip>
)}
```

---

## Part V: Implementation Priority Matrix

| Improvement                      | Impact | Effort | Priority |
| -------------------------------- | ------ | ------ | -------- |
| Welcome banner for new users     | High   | Low    | **P0**   |
| View mode descriptions           | Medium | Low    | **P0**   |
| Enhanced save status             | Medium | Low    | **P0**   |
| Empty state guidance             | Medium | Low    | **P0**   |
| Outlet onboarding banner         | High   | Low    | **P1**   |
| Interactive tour                 | High   | Medium | **P1**   |
| Progressive disclosure in modals | High   | Medium | **P1**   |
| Keyboard shortcut discovery      | Medium | Low    | **P2**   |
| Smart view recommendation        | Medium | Medium | **P2**   |
| Contextual "What's This?" links  | Medium | Medium | **P2**   |
| Visual diff for overrides        | Low    | Medium | **P3**   |
| Terminology simplification       | Medium | Low    | **P3**   |

---

## Part VI: Success Metrics

### How to Measure 5-Star Achievement

| Metric                   | Current (Est.) | Target  | Measurement         |
| ------------------------ | -------------- | ------- | ------------------- |
| Time to first edit       | ~3 min         | < 1 min | Analytics           |
| Tour completion rate     | N/A            | > 70%   | Tour tracking       |
| Help modal opens         | High           | Low     | Indicates confusion |
| Support tickets (Editor) | Unknown        | -50%    | Support tracking    |
| User satisfaction survey | 3/5            | 5/5     | In-app survey       |

---

## Part VII: Files to Modify

| File                          | Changes Needed                        |
| ----------------------------- | ------------------------------------- |
| `Editor.tsx`                  | Add welcome banner, first-visit state |
| `EditorActionsPopover.tsx`    | Already good - add descriptions       |
| `StoreCustomizationModal.tsx` | Add visual diff, master value display |
| `editItemModal.tsx`           | Progressive disclosure with Collapse  |
| `views/TraditionalView.tsx`   | Better empty state                    |
| `views/AdvancedView.tsx`      | View description                      |
| `KeyboardShortcutsHelp.tsx`   | Discovery hint system                 |
| NEW: `EditorTour.tsx`         | Interactive onboarding tour           |
| NEW: `OutletOnboarding.tsx`   | Outlet-specific guidance              |

---

## Conclusion

To achieve **5 stars**, the Editor needs:

1. **Onboarding** — Guide new users through first experience
2. **Progressive Disclosure** — Hide complexity until needed
3. **Plain Language** — Replace technical terms
4. **Outlet Clarity** — Explain master/outlet relationship clearly
5. **Discovery** — Help users find features they don't know exist

**Estimated Timeline:** 2-3 weeks for full implementation  
**Expected Rating After:** ⭐⭐⭐⭐⭐ (5/5)

---

_Assessment conducted per comprehensive review request._
