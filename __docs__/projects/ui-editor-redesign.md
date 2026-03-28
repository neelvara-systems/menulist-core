# Digital Menu UI Editor Redesign

**Purpose:** Simplify the B2C View UI editor for SMB users who are non-technical  
**Created:** December 18, 2025  
**Status:** 🟡 Planning Phase

---

## Current State Analysis

### What Exists Today

**Home Page Editor:**

- Theme Style selector (color + font)
- Frame Style selector (5 options):
  - Double Square
  - Double Circle
  - Double Diamond
  - Ornate Corners
  - Simple Lines

**Menu Page Editor:**

- Theme Style selector (color + font)
- Layout Style selector (4 options):
  - Modern Card
  - Elegant Gold
  - Minimal
  - Horizontal Tabs
- Page Styles drawer (5 themed presets):
  - Modern Elegance
  - Classic Roundel
  - Diamond Luxe
  - Minimalist
  - Modern Victorian
- Advanced controls (Image 5):
  - Category: Text Styles, Border, Background
  - Item: Text Styles, Border, Background

---

## Problem Statement

### The Core Issue: **Taste Anxiety**

Current implementation asks SMB owners too many simultaneous aesthetic decisions:

1. "Modern vs Classic?"
2. "Double Square or Diamond?"
3. "Minimal vs Elegant Gold?"
4. "Frame style AND layout style?"
5. "What combination even looks good?"

**Result:** Decision fatigue → procrastination → low publish rate

### Jobs Filter Violation

| Question                                      | Current Answer                                     |
| --------------------------------------------- | -------------------------------------------------- |
| Does this remove a decision from user's life? | ❌ **NO** - Adds multiple design decisions         |
| Could we cut 50% and no one would notice?     | ✅ **YES** - Most options don't affect conversion  |
| Can it be explained in one sentence?          | ❌ **NO** - Requires understanding design taxonomy |

---

## What We Got Right ✅

| Aspect                                 | Why It's Good                                                 |
| -------------------------------------- | ------------------------------------------------------------- |
| **Home vs Menu separation**            | Correct conceptual split - brand moment vs transaction moment |
| **Live preview**                       | Real-time updates create confidence and speed                 |
| **Theme vs Layout distinction**        | Matches design system thinking                                |
| **Segmented control (Home/Menu tabs)** | Clear navigation                                              |

**DO NOT UNDO THESE.**

---

## What's Over-Engineered ❌

### 1. Home Page Frame Styles

- Double Square, Double Circle, Double Diamond, Ornate Corners, Simple Lines
- These are **designer toys**, not user needs
- Don't increase conversion or create auto-sell moments

### 2. Too Many Named Styles

- "Modern Elegance", "Classic Roundel", "Diamond Luxe", "Modern Victorian"
- SMBs don't think in **design taxonomy**
- They think: "Simple", "Premium", "Bold", "Clean"

### 3. Home Page Customization Depth

- Home page is a **trust gate**, not a design playground
- Customer decides in 3-5 seconds: "Is this legit or cheap?"
- Advanced controls here are diminishing returns

### 4. Advanced Controls Exposed by Default (Image 5)

- Category/Item level: Text Styles, Border, Background
- Too granular for SMB users
- Leads to ugly results when owners make poor choices

---

## Redesign Strategy

### Mental Model Shift

**FROM:** "A flexible design editor"  
**TO:** "A controlled design system with opinionated choices"

> SMBs don't want freedom. They want **confidence**.
> Our job: "This will look good. Trust us."

---

## Phase 1: Home Page Simplification

### Current → New

| Before                                  | After                       |
| --------------------------------------- | --------------------------- |
| Theme Style + Frame Style (2 decisions) | **Home Style** (1 decision) |
| 5 frame options                         | 3 style presets             |
| Font/color controls                     | Locked internally           |

### New Home Style Options (MAX 3)

| Style       | Best For                     | Internal Behavior                          |
| ----------- | ---------------------------- | ------------------------------------------ |
| **Simple**  | Cafés, salons, fast service  | Sans-serif, no frame, flat background      |
| **Premium** | Fine dining, lounges, hotels | Serif headline, subtle frame, muted colors |
| **Bold**    | Bars, youth brands           | Strong accent, bigger CTA, high contrast   |

### UI Presentation

```
Choose how your menu feels to customers

[ Simple ]
Clean & professional

[ Premium ]
Elegant & refined

[ Bold ]
Confident & eye-catching
```

**Click = applied instantly. No sub-settings.**

### What Gets Killed (Home Page)

- ❌ Frame Style picker
- ❌ Shape variants (diamond, ornate, etc.)
- ❌ Manual font selection
- ❌ Manual spacing controls

---

## Phase 2: Menu Page - Mood + Layout Model

### Current → New

| Before                                                            | After                                               |
| ----------------------------------------------------------------- | --------------------------------------------------- |
| Theme Style + Layout Style + Page Styles (3 overlapping concepts) | **Menu Mood** + **Menu Layout** (2 clear decisions) |
| 5+ theme options                                                  | 3 mood presets                                      |
| 4 layout options                                                  | 4 layout options (keep)                             |
| Advanced controls visible                                         | Hidden under "Advanced"                             |

### Menu Mood Options (MAX 3)

| Mood                | Best For                   | Internal Behavior                                |
| ------------------- | -------------------------- | ------------------------------------------------ |
| **Clean** (Default) | Fast service, high-traffic | High readability, tight spacing, strong contrast |
| **Elegant**         | Fine dining, premium       | More whitespace, softer contrast, serif headline |
| **Vibrant**         | Bars, youth brands         | Strong accent colors, higher visual energy       |

### Menu Layout Options (MAX 4)

| Layout             | Best For                    | Description                 |
| ------------------ | --------------------------- | --------------------------- |
| **List** (Default) | Speed, scanning, long menus | Items stacked, clear prices |
| **Card**           | Visual menus, medium-sized  | Image + text cards          |
| **Grid**           | Catalogs, salons, services  | Image-forward, less text    |
| **Tabs**           | Very large menus            | Category navigation         |

### Mood × Layout Lock (CRITICAL)

**Not all combinations allowed:**

| Mood    | Allowed Layouts |
| ------- | --------------- |
| Clean   | List, Tabs      |
| Elegant | List, Card      |
| Vibrant | Card, Grid      |

If layout disabled: Grey out with tooltip "Works best with Elegant mood"

### What Gets Killed (Menu Page)

- ❌ "Page Styles" drawer (Modern Elegance, Classic Roundel, etc.)
- ❌ Font selector
- ❌ Border selector
- ❌ Frame styles in menu context
- ❌ Manual spacing

### What Gets Hidden (Not Killed)

Move to "Brand" section (collapsed by default):

- Logo placement
- Brand Accent (Optional)
- Background image

---

## Data Model Changes

### Old (Fragmented)

```typescript
interface ProjectStyles {
  themeStyle: string;
  frameStyle: string;
  fontConfig: {...};
  borderConfig: {...};
  layoutStyle: string;
  pageStyles: string;
}
```

### New (Clean)

```typescript
interface ProjectStyles {
  home: {
    style: 'simple' | 'premium' | 'bold';
  };
  menu: {
    mood: 'clean' | 'elegant' | 'vibrant';
    layout: 'list' | 'card' | 'grid' | 'tabs';
  };
  brand?: {
    accentColor?: string;
    backgroundImage?: string;
  };
  legacyStyle?: {...}; // Backward compatibility
}
```

---

## Migration Strategy

### For Existing Menus

1. Infer mood from current theme
2. Keep exact rendering (legacy styles preserved)
3. Hide deprecated controls in UI

### For New Menus

1. Default: Simple (Home) + Clean + List (Menu)
2. No access to old controls
3. Faster path to publish

### Theme → Mood Mapping

| Old Theme Style     | New Mood |
| ------------------- | -------- |
| Modern              | Clean    |
| Minimal             | Clean    |
| Classic             | Elegant  |
| Modern Elegance     | Elegant  |
| Elegant Gold        | Elegant  |
| Diamond Luxe        | Elegant  |
| Modern Victorian    | Elegant  |
| Bold/Vibrant themes | Vibrant  |

---

## Defaults Philosophy

> Your default menu should be so good that **50% of users never customize anything**.

If people feel forced to tweak → we failed.

**Defaults are product philosophy, not placeholders.**

### Default Settings

| Page        | Default |
| ----------- | ------- |
| Home        | Simple  |
| Menu Mood   | Clean   |
| Menu Layout | List    |

---

## Success Metrics

| Metric                                  | Target      |
| --------------------------------------- | ----------- |
| % users who publish without customizing | > 50%       |
| Time from signup to first publish       | < 5 minutes |
| Support tickets about "design"          | -70%        |
| Number of edits before publish          | < 3         |

---

## Implementation Phases

### Phase 1: Home Page (Priority: HIGH)

- [ ] Create `HomeStyle` enum: `simple`, `premium`, `bold`
- [ ] Create internal style mappings for each HomeStyle
- [ ] Replace Frame Style picker with Home Style cards
- [ ] Kill Theme Style selector for Home Page
- [ ] Hide advanced home controls
- [ ] Migrate existing data

### Phase 2: Menu Page (Priority: HIGH)

- [ ] Create `MenuMood` enum: `clean`, `elegant`, `vibrant`
- [ ] Create internal style mappings for each mood
- [ ] Replace Theme Style/Page Styles with Mood selector
- [ ] Keep Layout selector (clean up to 4 options)
- [ ] Implement Mood × Layout lock
- [ ] Move advanced controls to collapsible section
- [ ] Migrate existing data

### Phase 3: Polish (Priority: MEDIUM)

- [ ] Smooth transitions when switching styles
- [ ] Update preview to reflect changes instantly
- [ ] Remove deprecated code paths
- [ ] Update documentation

---

## Files to Modify

### Home Page

- `b2cView/homePage/homeFrameTemplates.ts` → Replace with HomeStyle
- `b2cView/homePage/homePageSettings.tsx` → Simplify UI
- `b2cView/homePage/homeFrameDrawer.tsx` → Kill or repurpose
- `b2cView/pageThemeTypes.ts` → Update types

### Menu Page

- `b2cView/menuPage/layouts/menuLayoutTemplates.ts` → Add Mood system
- `b2cView/menuPage/menuPageSettings.tsx` → Simplify UI
- `b2cView/menuPage/stylesSettings.tsx` → Move to Advanced
- `b2cView/menuPage/layouts/layoutsDrawer.tsx` → Update layout options
- `b2cView/pageThemeDrawer.tsx` → Kill or repurpose

### Data/Types

- `b2cView/types.ts` → New ProjectStyles interface
- Project data model → Add new fields

---

## Decision Log

| Decision                    | Status      | Why                                      |
| --------------------------- | ----------- | ---------------------------------------- |
| Collapse Home to 1 decision | ✅ Approved | Removes 70% cognitive load               |
| 3 Home styles max           | ✅ Approved | Simple/Premium/Bold covers all use cases |
| Replace Theme with Mood     | ✅ Approved | "Vibe" is more intuitive than "theme"    |
| Lock Mood × Layout          | ✅ Approved | Prevents ugly menus, reduces support     |
| Hide advanced controls      | ✅ Approved | Most users don't need granular control   |
| Keep Live Preview           | ✅ Approved | Essential for confidence                 |
| Keep Home/Menu split        | ✅ Approved | Conceptually correct                     |

---

## Removed vs Preserved Features

### ❌ REMOVED (Simplified Away)

| Feature                                  | Old Location           | Why Removed                                                                                                                             |
| ---------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Frame Style Picker**                   | `homeFrameDrawer.tsx`  | 5 decorative frame options (Double Square, Double Circle, Double Diamond, Ornate Corners, Simple Lines) - designer toys, not user needs |
| **Theme Style Picker**                   | `pageThemeDrawer.tsx`  | 4 theme presets with confusing names - replaced with simpler "Mood" concept                                                             |
| **Page Styles Drawer**                   | `layoutsDrawer.tsx`    | 5 named presets (Modern Elegance, Classic Roundel, Diamond Luxe, Minimalist, Modern Victorian) - too much design taxonomy               |
| **Font Family Selector**                 | `stylesSettings.tsx`   | Manual font picker with 50+ options - fonts now locked to mood presets                                                                  |
| **Font Size Control**                    | `stylesSettings.tsx`   | Manual sizing (12-72px) - now locked to responsive presets                                                                              |
| **Font Weight Toggle**                   | `stylesSettings.tsx`   | Bold/Normal toggle - now locked to mood                                                                                                 |
| **Font Style Toggle**                    | `stylesSettings.tsx`   | Italic toggle - removed (rarely used)                                                                                                   |
| **Text Decoration**                      | `stylesSettings.tsx`   | Underline toggle - removed                                                                                                              |
| **Text Transform**                       | `stylesSettings.tsx`   | Uppercase toggle - now locked to mood                                                                                                   |
| **Text Shadow**                          | `stylesSettings.tsx`   | Shadow toggle - removed (rarely used)                                                                                                   |
| **Letter Spacing**                       | `stylesSettings.tsx`   | Manual spacing (0-10px) - now locked to mood                                                                                            |
| **Line Height**                          | `stylesSettings.tsx`   | Manual line height - now locked to mood                                                                                                 |
| **Text Alignment**                       | `stylesSettings.tsx`   | Left/Center/Right - now locked to mood                                                                                                  |
| **Border Style Picker**                  | `borderSettings.tsx`   | 9 border styles (none, solid, dashed, dotted, double, groove, ridge, inset, outset) - simplified to mood presets                        |
| **Border Width**                         | `borderSettings.tsx`   | Manual width (0-20px) - now locked to mood                                                                                              |
| **Border Radius**                        | `borderSettings.tsx`   | Manual radius (0-50px) - now locked to mood                                                                                             |
| **Border Color Picker**                  | `borderSettings.tsx`   | Manual color selection - now locked to mood                                                                                             |
| **Category Text Styles**                 | `menuPageSettings.tsx` | Separate category styling - now unified in mood                                                                                         |
| **Item Text Styles**                     | `menuPageSettings.tsx` | Separate item styling - now unified in mood                                                                                             |
| **Category Border Settings**             | `menuPageSettings.tsx` | Separate category borders - now unified in mood                                                                                         |
| **Item Border Settings**                 | `menuPageSettings.tsx` | Separate item borders - now unified in mood                                                                                             |
| **Category Background**                  | `menuPageSettings.tsx` | Separate category backgrounds - moved to Advanced                                                                                       |
| **Item Background**                      | `menuPageSettings.tsx` | Separate item backgrounds - moved to Advanced                                                                                           |
| **View Type Segmented (List/Grid/Card)** | `menuPageSettings.tsx` | Redundant with Layout selector                                                                                                          |
| **Gradient Picker (Full)**               | `GradientPicker.tsx`   | Complex gradient builder - simplified presets only                                                                                      |

### ✅ PRESERVED (Still Available)

| Feature                      | Old Location             | New Location       | Notes                                                  |
| ---------------------------- | ------------------------ | ------------------ | ------------------------------------------------------ |
| **Background Image Upload**  | `backgroundSettings.tsx` | `Advanced` section | Image upload, gallery, replace, remove - all preserved |
| **Background Image Gallery** | `imageGalleryDrawer.tsx` | `Advanced` section | Gallery selection preserved                            |
| **Color Presets**            | `colorPresetsDrawer.tsx` | `Advanced` section | Quick color selection preserved                        |
| **Show Images Toggle**       | `menuPageSettings.tsx`   | Main settings      | Preserved as top-level option                          |
| **Live Preview**             | `b2cView/index.tsx`      | Same               | Real-time preview - critical feature                   |
| **Home/Menu Tab Split**      | `sidebar/index.tsx`      | Same               | Conceptual separation preserved                        |
| **Publish Flow**             | `sidebar/index.tsx`      | Same               | Base64 image upload on publish preserved               |

### 🔄 MOVED TO ADVANCED (Hidden by Default)

| Feature                     | Old Location  | Why Moved                            |
| --------------------------- | ------------- | ------------------------------------ |
| **Background Image**        | Main settings | Most users don't need custom images  |
| **Solid Color Background**  | Main settings | Mood handles this automatically      |
| **Gradient Background**     | Main settings | Simplified presets in mood           |
| **Brand Accent (Optional)** | N/A (new)     | For power users who want brand color |

---

## Background Image Flow (Preserved)

The `onPublish` function in `sidebar/index.tsx` handles base64 → Firebase Storage conversion:

```typescript
// Home page background
const homeBg = projectCopy?.config?.homePage?.container?.backgroundImage;
if (homeBg && homeBg.includes('base64')) {
    projectCopy.config.homePage.container.backgroundImage = await uploadFile(...);
}

// Menu page background
const menuBg = projectCopy?.config?.menuPage?.backgroundImage;
if (menuBg && menuBg.includes('base64')) {
    projectCopy.config.menuPage.backgroundImage = await uploadFile(...);
}

// Category background
const categoryBg = projectCopy?.config?.menuPage?.categoryStyle?.container?.backgroundImage;
if (categoryBg && categoryBg.includes('base64')) {
    projectCopy.config.menuPage.categoryStyle.container.backgroundImage = await uploadFile(...);
}

// Item background
const itemBg = projectCopy?.config?.menuPage?.itemStyle?.container?.backgroundImage;
if (itemBg && itemBg.includes('base64')) {
    projectCopy.config.menuPage.itemStyle.container.backgroundImage = await uploadFile(...);
}
```

**New Implementation Must:**

- Store background images in same config paths
- Use same base64 detection pattern
- Preserve `uploadFile` integration

---

## Design Principles (FINAL)

### Core Philosophy: Restraint Over Cleverness

| Principle              | Implementation                           |
| ---------------------- | ---------------------------------------- |
| **Calm, not flashy**   | Solid backgrounds, no gradients/glow     |
| **Speed is design**    | No heavy animations, 150ms transitions   |
| **Mobile-first**       | Tailwind responsive classes              |
| **Opinionated taste**  | 3 moods, 4 layouts, no granular controls |
| **Professional trust** | Clean typography, clear hierarchy        |

### What We Removed (Simplification)

| Removed                  | Why                     |
| ------------------------ | ----------------------- |
| Glow effects             | Flashy, not calm        |
| Glassmorphism            | Heavy, poor performance |
| Complex hover animations | Distracting             |
| Gradient backgrounds     | Over-designed           |
| Neon colors              | Not professional        |
| Framer Motion (most)     | Unnecessary weight      |

### What Remains (Essential)

| Kept                    | Why                    |
| ----------------------- | ---------------------- |
| Solid dark backgrounds  | Clean, readable        |
| Brand accent            | Brand identity         |
| Typography pairing      | Professional hierarchy |
| Simple border frames    | Subtle structure       |
| Mobile-first responsive | Works on all devices   |
| Minimal fade animation  | Smooth page load       |

### Brand Accent Rules

- Brand accent is **optional** and defaults to a neutral tone
- It is used **only** for actions, highlights, and focus states
- It **never** affects body text, prices, or large surfaces
- Mood controls _how_ the accent appears, not _which color it is_
- If brand accent is removed entirely, the UI must still work perfectly

### Mood Signatures (Behavior-Based)

**Clean:**

- Neutral dark background (`#18181b` example)
- Accent used minimally (underlines, outlines, focus)
- Inter font family

**Elegant:**

- Dark/navy background (`#0f172a` example)
- Accent auto-desaturated and softened
- Thin strokes and icon highlights only
- Playfair Display for headings

**Vibrant:**

- Dark background (`#000000` example)
- Accent more visible
- Filled primary CTA allowed
- Poppins font family

### Responsive Breakpoints

| Device  | Breakpoint     | Behavior                     |
| ------- | -------------- | ---------------------------- |
| Mobile  | Default        | Base styles, compact spacing |
| Tablet  | `md:` (768px)  | Larger text, more padding    |
| Desktop | `lg:` (1024px) | Max-width container          |

---

## Technical Decision: UI Framework for Customer Menu

### Decision: **Tailwind CSS + Framer Motion** (No Ant Design)

| Area                    | Framework                | Reason                            |
| ----------------------- | ------------------------ | --------------------------------- |
| **Dashboard/Editor**    | Ant Design               | Complex UI, forms, admin patterns |
| **Customer Menu (B2C)** | Tailwind + Framer Motion | Performance, visual control       |
| **Landing Page**        | Tailwind + shadcn        | Already built this way            |

### Why NOT Ant Design for Customer Menu

- **Bundle size**: Ant Design ~1MB+ vs Tailwind ~10KB (purged)
- **Performance**: Heavy JS runtime vs zero JS overhead for styling
- **Design control**: Hard to override vs full control
- **Mobile speed**: Slow on 3G vs fast everywhere

### Implementation Approach

- Keep style objects from design system
- Use Framer Motion for animations (already installed)
- Plain HTML elements with inline styles
- No Ant Design imports in B2C output components

---

## Implementation Progress

### ✅ Completed

**Design System Core (`b2cView/designSystem/index.ts`):**

- [x] `HomeStyle` enum: `simple`, `premium`, `bold`
- [x] `HOME_STYLES` config with all internal styling tokens
- [x] `MenuMood` enum: `clean`, `elegant`, `vibrant`
- [x] `MENU_MOODS` config with all internal styling tokens
- [x] `MenuLayout` enum: `list`, `card`, `grid`, `tabs`
- [x] `MENU_LAYOUTS` config
- [x] `MOOD_LAYOUT_COMPATIBILITY` matrix
- [x] Migration helpers for old styles → new system
- [x] `DEFAULTS` configuration
- [x] `DesignConfig` interface for project data

**Editor UI Components (Dashboard - Ant Design):**

- [x] `HomeStyleSelector.tsx` - 3 style cards (Simple/Premium/Bold)
- [x] `MenuMoodSelector.tsx` - 3 mood cards (Clean/Elegant/Vibrant)
- [x] `MenuLayoutSelector.tsx` - 4 layout cards with compatibility tooltips
- [x] `homePageSettingsNew.tsx` - Simplified home settings with 1 decision
- [x] `menuPageSettingsNew.tsx` - Simplified menu settings with 2 decisions

**B2C Output Components (Customer-facing - NO Ant Design):**

- [x] `output/HomePage.tsx` - Customer home page with mood styling
- [x] `output/MenuPage.tsx` - Full menu with categories and items
- [x] `output/MenuCategory.tsx` - Category headers with dividers
- [x] `output/MenuItem.tsx` - Item cards with hover effects
- [x] `output/SearchBar.tsx` - Lightweight search input
- [x] `output/PDPModal.tsx` - Product detail modal with image carousel
- [x] `output/MenuFilters.tsx` - Bottom search bar + category popup
- [x] `output/MenuHeader.tsx` - Logo, language selector, view toggle, LiveIndicator
- [x] `output/index.ts` - Exports for all components
- [x] `menuPage/menuPageNew.tsx` - Complete menu page integrating all output components

### 🔄 In Progress

- [ ] Integrate new settings into sidebar
- [ ] Wire up live preview with new output components

### ⏳ Pending

- [ ] Update Project types to include `design` config
- [ ] Test migration from old styles
- [ ] Remove deprecated components

---

## Functional Logic Preserved (Critical)

All functional logic from old Ant Design components has been preserved in new Tailwind components:

### PDPModal (`output/PDPModal.tsx`)

| Logic                 | Description                                   | Status       |
| --------------------- | --------------------------------------------- | ------------ |
| `trackMenuItemView()` | Analytics tracking from AnalyticsContext      | ✅ Preserved |
| Category lookup       | Find category from projectData.files          | ✅ Preserved |
| Image carousel        | Multiple images with navigation               | ✅ Preserved |
| Availability status   | Show unavailable label based on business type | ✅ Preserved |

### MenuFilters (`output/MenuFilters.tsx`)

| Logic                   | Description                                     | Status       |
| ----------------------- | ----------------------------------------------- | ------------ |
| `findVisibleCategory()` | Auto-detect which category is visible on screen | ✅ Preserved |
| Auto-select on open     | Select visible category when popup opens        | ✅ Preserved |
| Scroll to category      | Scroll page to selected category                | ✅ Preserved |
| Debounced search        | Search with 300ms debounce                      | ✅ Preserved |

### MenuHeader (`output/MenuHeader.tsx`)

| Logic             | Description                        | Status       |
| ----------------- | ---------------------------------- | ------------ |
| `LiveIndicator`   | Shows "🟢 Live · updated just now" | ✅ Preserved |
| Language selector | Multi-language dropdown            | ✅ Preserved |
| View toggle       | List/Grid view switch              | ✅ Preserved |
| Navigate to home  | Logo click → home page             | ✅ Preserved |

### MenuPageNew (`menuPage/menuPageNew.tsx`)

| Logic                        | Description                           | Status       |
| ---------------------------- | ------------------------------------- | ------------ |
| `isCategoryVisibleByTime()`  | Time-based category visibility        | ✅ Preserved |
| `getUnavailableLabel()`      | Dynamic labels based on business type | ✅ Preserved |
| `data-category-id` attribute | For findVisibleCategory to work       | ✅ Preserved |
| Brand color override         | `getMoodWithBrandColor()` helper      | ✅ Preserved |

---

## Old vs New Component Mapping

| Old Component (Ant Design)              | New Component (Tailwind)             | Location   |
| --------------------------------------- | ------------------------------------ | ---------- |
| `menuPage/components/PDPModal.tsx`      | `output/PDPModal.tsx`                | ✅ Created |
| `menuPage/components/MenuFilters.tsx`   | `output/MenuFilters.tsx`             | ✅ Created |
| `menuPage/components/CategoryPopup.tsx` | Merged into `output/MenuFilters.tsx` | ✅ Merged  |
| `menuPage/MenuPageHeader.tsx`           | `output/MenuHeader.tsx`              | ✅ Created |
| `menuPage/layouts/menuLayout.tsx`       | `menuPage/menuPageNew.tsx`           | ✅ Created |

---

**Last Updated:** December 18, 2025
