# B2C UI Editor — Mobile Approach Plan

**Created:** February 15, 2026  
**Status:** ✅ IMPLEMENTED — Phase 1 complete (Feb 15, 2026)  
**Purpose:** Define how the customer-facing menu design editor (theme, layout, colors, fonts, brand identity) will work on mobile

---

## What the Desktop B2C UI Editor Does

The desktop editor lets owners customize how their **customer-facing digital menu** looks:

1. **Theme/Colors** — Primary color, background, text color, accent color
2. **Layout** — Grid vs list, card style, category navigation style
3. **Typography** — Font family, heading size, body size
4. **Brand Identity** — Logo, cover image, business name display
5. **Component Toggles** — Show/hide price, description, images, category headers
6. **Live Preview** — Side-by-side editor + preview panel showing changes in real-time

The desktop uses a split-panel layout: left panel = controls, right panel = live iframe preview.

---

## Why Mobile Needs a Different Approach

The desktop editor is a **split-panel drag-and-configure** interface. On a 5" phone screen:

- No room for side-by-side editor + preview
- Drag interactions don't translate to touch
- Color pickers need full-screen treatment
- Live preview needs to be a separate step, not simultaneous

**Key insight:** The owner doesn't need to design from scratch on mobile. They need to **tweak and preview**. Most design happens once (at setup), then occasional tweaks.

---

## Proposed Mobile Approach: "Settings + Preview" Pattern

### Architecture: Two-step flow instead of split-panel

```
Step 1: Settings Screen (scrollable form)
  ├─ Theme section (color pickers)
  ├─ Layout section (radio cards)
  ├─ Typography section (font picker + size)
  ├─ Brand section (logo/cover upload)
  └─ Toggles section (show/hide switches)

Step 2: Preview (full-screen)
  └─ iframe of actual customer menu with ?preview=true
  └─ "Looks good" button → save
  └─ "Back to edit" button → return to Step 1
```

### UI Pattern: Apple Settings-style grouped sections

Each section is a collapsible card with:

- Section title (e.g., "Colors")
- Current value preview (e.g., color dot)
- Tap to expand → shows controls

### Color Picker: Full-width bottom sheet

Instead of desktop's inline color picker:

- Tap color field → opens bottom sheet
- Pre-defined palette of 12 colors (brand-safe)
- Custom hex input below
- Live preview dot showing selected color

### Layout Selector: Visual radio cards

Instead of desktop's dropdown:

- 2×2 grid of layout options
- Each card shows a mini preview illustration
- Tap to select → checkmark appears

### Font Picker: Scrollable list

Instead of desktop's dropdown:

- Bottom sheet with scrollable list
- Each font name rendered in its own font
- Currently selected font has checkmark

### Brand Identity: Camera + Gallery

Instead of desktop's drag-and-drop:

- Tap logo area → camera or gallery (same as MenuUploadSheet pattern)
- Crop modal (reuse existing `ImageUploadInput` pattern)
- Tap cover image → same flow

### Live Preview: Full-screen iframe

Instead of desktop's side-by-side:

- "Preview Menu" button at bottom of settings
- Opens full-screen iframe of the actual customer menu
- Floating bar at bottom: "Looks good ✓" / "Back to edit"
- Uses `?preview=true&theme={json}` query params

---

## Technical Implementation Plan

### File Structure

```
src/components/mobile/screens/
  MobileDesignEditorScreen.tsx    — Main settings form

src/components/mobile/sheets/
  ColorPickerSheet.tsx            — Full-width color picker
  FontPickerSheet.tsx             — Font selection list
  LayoutPickerSheet.tsx           — Visual layout cards
  DesignPreviewSheet.tsx          — Full-screen iframe preview
```

### Shared Logic (Desktop ↔ Mobile)

| What           | Shared Location               | Notes                      |
| -------------- | ----------------------------- | -------------------------- |
| Theme types    | `src/types/theme.types.ts`    | Already exists             |
| Default themes | `src/config/defaultThemes.ts` | Create if needed           |
| Save theme     | `updateProject()` DAL         | Already exists             |
| Font list      | `src/data/fonts.ts`           | Already exists             |
| Layout options | `src/config/layoutOptions.ts` | Create — shared const      |
| Color palette  | `src/config/colorPalette.ts`  | Create — brand-safe colors |

### DAL Parity

- Same `updateProject({ ...project, theme: updatedTheme })` as desktop
- Same Firestore field: `projects/{projectId}.theme`
- Same theme type: `ProjectTheme` from `@type/theme.types`

---

## What's NOT on Mobile (Desktop-Only)

| Feature                             | Reason                        |
| ----------------------------------- | ----------------------------- |
| Custom CSS injection                | Technical — needs code editor |
| Advanced spacing/padding controls   | Too granular for phone        |
| Multi-breakpoint responsive preview | Needs large screen            |
| Theme import/export                 | Rare admin task               |

---

## Implementation Priority

1. **Phase 1:** Colors + Layout + Toggles (covers 80% of customization)
2. **Phase 2:** Typography + Brand Identity (upload logo/cover)
3. **Phase 3:** Live Preview iframe

---

## Dependencies

- Existing `ProjectTheme` type and theme data structure
- Existing `updateProject()` DAL function
- Existing font list data
- Need to create: `ColorPickerSheet`, `LayoutPickerSheet`, `FontPickerSheet`

---

## Estimated Effort

- Phase 1: ~200 lines (settings form + color/layout pickers)
- Phase 2: ~150 lines (font picker + image upload integration)
- Phase 3: ~100 lines (preview iframe with floating controls)
- Total: ~450 lines across 4-5 files

---

## Decisions (Resolved Feb 15, 2026)

### Q1: Quick theme presets? → YES

**Decision:** Add 3 "Quick Start" preset bundles that set home style + mood + layout + brand color in one tap.

**Why:** Our ICP is a non-tech SMB owner. They don't want to learn what "mood" means vs "layout" vs "home style". A single tap that says "Fresh & Clean" or "Warm & Cozy" reduces cognitive load to near-zero. Power users can still tweak individual settings below.

**Presets:**

- **Fresh & Clean** → Simple home + Clean mood + List layout + green accent
- **Warm & Cozy** → Simple home + Warm mood + Card layout + orange accent
- **Bold & Modern** → Bold home + Bold mood + Grid layout + blue accent

### Q2: Preview method? → Open actual menu URL in new tab

**Decision:** Tap "Preview Menu" → `window.open(menuUrl, '_blank')` to open the actual published B2C URL.

**Why:**

- No iframe CORS complexity
- Owner sees exactly what their customer sees (true preview)
- Works on any phone browser
- Simpler implementation (~0 lines vs ~100 lines for iframe)
- Uses same `generateProjectUrl()` from `@lib/utils/slugify` as MobileShareScreen

**Trade-off:** Preview shows the _last published_ version, not unpublished changes. This is acceptable because: (a) we show a clear "Publish first to see changes" hint, (b) the publish action is one tap away, (c) desktop PreviewModal uses a React renderer which is too heavy for mobile.

### Q3: Auto-save vs explicit save? → Explicit "Publish" button

**Decision:** Accumulate all changes locally in component state → single "Publish Changes" button at bottom.

**Why:**

- Matches desktop `publishProject()` pattern exactly
- Prevents half-designed menus going live to customers
- Owner can experiment freely without fear of breaking their live menu
- Clear "unsaved changes" indicator shows when changes are pending
- One-tap publish with success toast feedback

### Implementation Simplification (vs original plan)

**Dropped from plan:**

- `FontPickerSheet` — Fonts are determined by mood selection (design system philosophy: "users choose a vibe, not parameters")
- `LayoutPickerSheet` — Layout options shown inline as tappable cards (4 options fit fine on mobile)
- `DesignPreviewSheet` — Replaced by opening actual menu URL in new tab
- Background image upload — Kept as desktop-only advanced feature (rarely changed, heavy upload flow)

**Final file list:**

- `MobileDesignEditorScreen.tsx` — All-in-one Apple Settings form (~350 lines)
- `ColorPickerSheet.tsx` — Brand color picker bottom sheet (~80 lines)
- Wire into `MobileMoreScreen.tsx`
