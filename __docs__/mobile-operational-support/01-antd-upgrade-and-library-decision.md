# Ant Design Upgrade & Mobile Library Decision

**Created:** February 14, 2026  
**Status:** 🔒 LOCKED — Decision final  
**Author:** Lead Architect (Cascade)  
**Source:** Ant Design Changelog Analysis + Codebase Audit + Migration Guide Review

---

## Current State

| Package | Current Version | Latest v5 | Latest v6 |
| --- | --- | --- | --- |
| `antd` | 5.23.1 | **5.29.2** | 6.3.0 |
| `@ant-design/icons` | (peer dep) | 5.x | 6.x |
| `@ant-design/nextjs-registry` | (in use) | compatible | needs verification |

---

## Decision 1: Antd Version — Update to 5.29.2, NOT v6

### What We Will Do

```
npm install antd@5.29.2
```

Update from `5.23.1` → `5.29.2` (latest v5 stable, released December 15, 2025).

### Why NOT v6

Antd v6.0.0 was released November 22, 2025 (only ~3 months old). After thorough analysis of the [migration guide](https://ant.design/docs/react/migration-v6), here are the breaking changes that make v6 **too risky right now**:

#### 1. DOM Structure Changes (HIGH RISK)
> "v6 upgrades and optimizes the DOM structure of many components to improve maintainability and consistency."

Our codebase has extensive custom SCSS modules that target internal component DOM nodes:
- `layoutWrapper.module.scss`
- `sidebarComponent.module.scss`
- `horizontalSidebarComponent.module.scss`
- `headerComponent.module.scss`
- Multiple editor-specific stylesheets

Any DOM restructuring could silently break these custom styles.

#### 2. @ant-design/icons v6 Required (INCOMPATIBLE)
> "@ant-design/icons@6 is not compatible with antd@5."

We use `react-icons` extensively but also depend on `@ant-design/icons` via internal antd components. Upgrading icons requires upgrading antd — it's all-or-nothing.

#### 3. API Deprecations (LARGE SURFACE AREA)
v6 deprecates dozens of APIs across Alert, AutoComplete, Avatar, Breadcrumb, Button, Calendar, Card, Carousel, Cascader, Collapse, DatePicker, Descriptions, Divider, Drawer, Dropdown, Form, Image, Input, InputNumber, Layout, Menu, Modal, Notification, Pagination, Popconfirm, Popover, Progress, Radio, Select, Skeleton, Slider, Steps, Table, Tabs, Tag, TimePicker, Tooltip, Transfer, Tree, TreeSelect, Typography, Upload.

Our codebase uses many of these with the old API patterns. Migration would require:
- Auditing every component usage
- Updating `dropdownClassName` → `classNames.popup.root`
- Updating `bordered` → `variant`
- Updating `bodyStyle` → `styles.body`
- And many more

#### 4. Modal/Drawer Mask Blur (VISUAL CHANGE)
v6 enables blur on Modal/Drawer masks by default. Our current UI was designed without blur. This would change the look of every modal and drawer in the system.

#### 5. Tag Margin Changes (LAYOUT RISK)
v6 removes trailing default margin from Tag component. We use Tags extensively in the editor. This could break tag-based layouts.

#### 6. Form.List onFinish Behavior Change (DATA RISK)
v6 changes how `onFinish` handles `Form.List` data. Our business settings and editor forms use `Form.List`. This could cause data loss in forms.

### Why 5.29.2 Is Safe

Versions 5.23.1 → 5.29.2 contain only:
- Bug fixes
- Minor improvements
- Accessibility improvements (aria attributes)
- No breaking changes (semver guaranteed)

Key improvements in 5.24–5.29:
- Splitter panel fixes
- Input.Search improvements
- Breadcrumb link priority fixes
- Notification color fixes
- Carousel vertical mode fixes
- Drawer accessibility (aria-labelledby)

### When to Consider v6

**After mobile support is stable and live** (estimated: 4-6 weeks from now). At that point:
1. Create a dedicated branch for v6 migration
2. Run full visual regression testing
3. Update deprecated APIs methodically
4. Test every form, modal, drawer, and editor workflow
5. Ship as a separate release

---

## Decision 2: Mobile UI Library — Add antd-mobile

### What We Will Do

```
npm install antd-mobile@latest
```

Add `antd-mobile` (v5.42.3, latest) as a NEW dependency alongside existing `antd`.

### Why antd-mobile

#### The Problem with antd on Mobile

`antd` was designed for desktop web applications. Its components have fundamental UX issues on mobile:

| antd Component | Mobile Problem |
| --- | --- |
| `Menu` (sidebar) | No bottom navigation support |
| `Drawer` | Desktop-oriented, no bottom sheet pattern |
| `Select` | Tiny dropdown, hard to tap |
| `DatePicker/TimePicker` | Desktop calendar overlay, not mobile-friendly |
| `Modal` | Centered overlay, not bottom sheet |
| `message` | Top notification, not mobile toast |
| `Notification` | Desktop-oriented position |
| `Table` | Horizontal scroll nightmare on mobile |

#### What antd-mobile Provides

`antd-mobile` is built by the **same Ant Group team** specifically for mobile web applications. It provides native-feeling mobile components:

| antd-mobile Component | Purpose for MenuList Mobile |
| --- | --- |
| **TabBar** | Bottom navigation (Menu, Hours, Feedback, More) |
| **Popup** | Bottom sheets for item editing, add item |
| **SearchBar** | Mobile-optimized search with cancel button |
| **SwipeAction** | Swipe to reveal actions on feedback cards |
| **PullToRefresh** | Pull down to refresh menu/feedback lists |
| **ActionSheet** | Mobile-native action selection (share options) |
| **Switch** | Touch-optimized toggle (availability, open/closed) |
| **Stepper** | Touch-optimized number input (price editing) |
| **Dialog** | Mobile-native confirmation dialogs |
| **Toast** | Mobile-native toast notifications |
| **List** | Mobile-optimized list with swipe support |
| **FloatingBubble** | Floating action button (add item) |
| **InfiniteScroll** | Infinite scroll for long menus/feedback |
| **DotLoading** | Mobile-appropriate loading indicators |
| **Empty** | Mobile-friendly empty states |
| **Card** | Touch-friendly card layout |
| **Form** | Mobile-optimized form with large tap areas |
| **Input** | Mobile-optimized input with clear button |
| **TextArea** | Mobile-optimized textarea |
| **Selector** | Touch-friendly option selection (categories) |
| **CapsuleTabs** | Compact tab switching |
| **SafeArea** | iPhone notch/safe area handling |
| **NavBar** | Mobile navigation bar with back button |

#### Coexistence Strategy

Both libraries coexist cleanly in the same project:

```
Desktop screens → import from 'antd'
Mobile screens  → import from 'antd-mobile'
```

- Different CSS namespaces — no style conflicts
- Different component names — no import confusion
- Tree-shakeable — only imported components are bundled
- Same design philosophy (Ant Group) — visual consistency

#### Bundle Impact

antd-mobile uses tree-shaking. Only imported components are included:
- Estimated mobile bundle addition: ~50-80KB gzipped (for the components we need)
- Desktop bundle: ZERO impact (desktop pages don't import antd-mobile)

### Why NOT Other Options

| Option | Reason to Reject |
| --- | --- |
| **Make antd responsive** | antd was never designed for touch. You'd fight the library constantly. |
| **Use only Tailwind** | Building TabBar, Popup, SwipeAction, PullToRefresh from scratch = weeks of work |
| **Use MUI/Chakra** | Different design system. Visual inconsistency. Learning curve. |
| **Use React Native Web** | Completely different paradigm. Overkill for a responsive PWA. |
| **Use Ionic** | Heavy framework. Opinionated routing. Doesn't fit Next.js well. |

---

## Decision 3: Styling Strategy

| Surface | Primary UI Library | Layout/Styling |
| --- | --- | --- |
| **Desktop** | `antd` (existing, unchanged) | SCSS modules (existing) |
| **Mobile** | `antd-mobile` (new) | Tailwind CSS (already configured) |
| **Shared** | None (DAL layer, hooks) | N/A |

### Why Tailwind for Mobile Layouts

- Already configured in project (`tailwind.config.ts`)
- Already used in some components (e.g., `FeedbackInbox` uses `md:p-6`, `md:flex-row`)
- Perfect for responsive layouts and spacing
- Utility-first approach is fast for building mobile UIs
- No new SCSS modules needed for mobile

---

## Implementation Steps

### Step 1: Update antd (5 minutes)

```bash
npm install antd@5.29.2
```

Verify: Run dev server, check desktop dashboard works correctly.

### Step 2: Install antd-mobile (5 minutes)

```bash
npm install antd-mobile
```

No configuration needed. Tree-shakeable by default.

### Step 3: Verify Coexistence (10 minutes)

Create a simple test component that imports from both libraries. Verify no conflicts.

### Step 4: Add Feature Flag

Add `ENABLE_MOBILE_UI: false` to `src/config/features.ts`.

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| antd 5.29.2 breaks something | Very Low | Medium | Semver guarantees backward compat. Revert if needed. |
| antd-mobile CSS conflicts with antd | Very Low | Low | Different CSS namespaces. Tested by Ant team. |
| antd-mobile bundle size impact | Low | Low | Tree-shaking. Only mobile pages load it. |
| antd-mobile maintenance risk | Low | Medium | Actively maintained (v5.42.3, Dec 2025). Same Ant Group team. |

---

## v6 Migration — Future Plan (NOT NOW)

When ready (after mobile is live):

1. **Create branch**: `feature/antd-v6-migration`
2. **Update packages**: `antd@6`, `@ant-design/icons@6`
3. **Fix deprecated APIs**: Use codemod if available
4. **Fix DOM-dependent styles**: Audit all SCSS modules
5. **Fix Form.List usage**: Verify all forms
6. **Configure mask blur**: Decide per-modal/drawer
7. **Fix Tag margins**: Add ConfigProvider override if needed
8. **Full regression test**: Every page, every modal, every form
9. **Ship separately**: As dedicated release with rollback plan

Estimated effort: 3-5 focused days for migration + testing.

### v6 Features Worth Having (Eventually)

- **Semantic structure**: `classNames` and `styles` props on ALL components — much better for theming
- **ConfigProvider granularity**: Component-level style overrides via ConfigProvider
- **Mask blur**: Nice visual upgrade for modals/drawers (if desired)
- **Cleaner DOM**: More consistent component structure
- **React 19 native support**: No patch package needed

These are "nice to have" improvements, not blockers for current work.

---

**Document Signature:** Antd Upgrade & Library Decision  
**Last Updated:** February 14, 2026
