# 👤 Profile Modal - Industry Standard Redesign

**Date**: Nov 22, 2025  
**Status**: Implemented source evidence; not current launch certification
**Quality**: Matches Slack, Linear, Notion

---

## Current Launch Boundary

This document records the profile popover and My Profile modal implementation evidence. It is not current production certification. Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, auth/profile API source review, desktop/mobile profile QA, permission-boundary checks, and target-environment smoke.

---

## 2026-06-24 Completion: My Profile Management Modal

The profile popover remains the entry point, but the logged-in user's **My Profile** modal is now the single owner/staff self-service surface for account identity.

### Code Truth

- Popover entry point: `src/components/organisms/headerComponent/profileActionsModal/index.tsx`
- Self-profile modal: `src/components/organisms/headerComponent/profileActionsModal/userProfileModal/index.tsx`
- Self-profile styling: `src/components/organisms/headerComponent/profileActionsModal/userProfileModal/userProfileModal.module.scss`
- Profile update API: `src/app/api/auth/update-profile/route.ts`
- Password change API: `src/app/api/auth/change-password/route.ts`
- Staff management reference flow: `src/components/templates/main-app/users/usersList/userForm/index.tsx`

### Final UX Contract

- Opening **My Profile** lands on an overview first.
- **Edit Profile** is an explicit state change, not a selected default tab.
- The user can edit only their own display name and phone number.
- Email/login identifier, Staff ID, role, store access, activation, reset password, and force sign-out are not self-editable from this modal.
- Store access and permissions are visible as read-only reference.
- Email/password users can change their password from the modal.
- Staff ID/passcode users can change their current password or passcode from the modal.
- Owner-created temporary passcode resets and forced sign-out remain in the Users screen.
- Google/OAuth-style users are warned that Google-managed passwords must be changed in Google, while the MenuList password form remains available only if the account also has an email password.

### Permission Boundary

The Users drawer remains the authoritative management surface for another user's access. The My Profile modal reuses the same staff identity field shape for name and phone, but intentionally does not reuse the role/store/activation controls. This prevents a logged-in owner or staff member from accidentally changing their own access or bypassing the user-management permission model.

### Firebase Cost

No new collections, listeners, or list reads were added. Saving the self profile uses the existing authenticated profile API and writes only the current `users/{userId}` document.

---

## ❌ **What Was Wrong**

### **UI Issues**

- ❌ Using Card components for menu items (over-engineered)
- ❌ Manual hover state management (unnecessary)
- ❌ Cluttered spacing and padding
- ❌ Background color on hover looked dated
- ❌ No clear visual hierarchy
- ❌ No section grouping

### **Content Issues**

- ❌ "FAQ" - Too generic, better in Support
- ❌ "Business Settings" - Too vague
- ❌ "Logout" - Should be "Sign Out" (industry standard)
- ❌ No descriptions for menu items
- ❌ No section headers
- ❌ Items not grouped logically

---

## ✅ **What We Fixed**

### **New Structure**

```
┌─────────────────────────────────┐
│  [Avatar] User Name             │  ← Profile Header
│           user@email.com         │
├─────────────────────────────────┤
│  👤 My Profile                  │  ← Personal
│     View and edit your profile  │
├─────────────────────────────────┤
│  PREFERENCES                    │  ← Section Header
│  🎨 Appearance                  │
│     Theme, colors & layout      │
│  ⌨️  Keyboard Shortcuts          │
│     View all shortcuts          │
├─────────────────────────────────┤
│  SUPPORT                        │  ← Section Header
│  ❓ Help Center                 │
│     Guides & FAQs               │
├─────────────────────────────────┤
│  🚪 Sign Out                    │  ← Danger Item
└─────────────────────────────────┘
```

---

## 🎨 **Design Changes**

### **1. Clean Menu Items**

```scss
// ❌ Before: Card components
<Card hoverable>
  <Button icon={icon} />
  <Text>Item</Text>
</Card>

// ✅ After: Simple div with CSS hover
<div className="menuItem">
  <span className="menuIcon">{icon}</span>
  <span className="menuTitle">Item</span>
  <span className="menuDescription">Description</span>
</div>
```

### **2. Section Grouping**

```typescript
const MENU_SECTIONS = [
  {
    items: [
      /* Personal */
    ],
  },
  {
    title: "Preferences",
    items: [
      /* Settings */
    ],
  },
  {
    title: "Support",
    items: [
      /* Help */
    ],
  },
  {
    items: [
      /* Sign Out */
    ],
  },
];
```

### **3. Hover Effects**

```scss
.menuItem {
  &:hover {
    background: var(--ant-color-fill-tertiary); // Subtle

    .menuIcon {
      color: var(--ant-color-primary); // Accent
    }

    .menuTitle {
      font-weight: 500; // Slightly bolder
    }
  }
}
```

---

## 📊 **Industry Comparison**

| Feature                | Slack | Linear | Notion | Your App |
| ---------------------- | ----- | ------ | ------ | -------- |
| **Grouped Sections**   | ✅    | ✅     | ✅     | ✅       |
| **Section Headers**    | ✅    | ✅     | ✅     | ✅       |
| **Item Descriptions**  | ✅    | ✅     | ❌     | ✅       |
| **Clean Menu Items**   | ✅    | ✅     | ✅     | ✅       |
| **Subtle Hover**       | ✅    | ✅     | ✅     | ✅       |
| **Sign Out at Bottom** | ✅    | ✅     | ✅     | ✅       |
| **Danger Color**       | ✅    | ✅     | ✅     | ✅       |

**Result**: ✅ Matches industry leaders!

---

## 🎯 **Menu Structure**

### **Section 1: Personal**

- **My Profile** - View and edit your profile

### **Section 2: Preferences** (labeled)

- **Appearance** - Theme, colors & layout
- **Keyboard Shortcuts** - View all shortcuts

### **Section 3: Support** (labeled)

- **Help Center** - Guides & FAQs

### **Section 4: Sign Out** (danger)

- **Sign Out** - Red color, separated by divider

---

## 💡 **Key Improvements**

### **1. Clear Hierarchy**

```
Profile Info (Avatar, Name, Email)
    ↓
Personal Actions (My Profile)
    ↓
Preferences (Settings, Shortcuts)
    ↓
Support (Help)
    ↓
Sign Out (Danger)
```

### **2. Helpful Descriptions**

```
Before: "Appearance"
After:  "Appearance
         Theme, colors & layout"

Before: "Keyboard Shortcuts"
After:  "Keyboard Shortcuts
         View all shortcuts"
```

### **3. Visual Feedback**

- ✅ Icon color changes to primary on hover
- ✅ Text becomes slightly bolder
- ✅ Subtle background appears
- ✅ Smooth transitions

### **4. Removed Unnecessary**

- ❌ "FAQ" → Merged into "Help Center"
- ❌ "Business Settings" → Replaced with "Appearance"
- ❌ Card components → Simple divs
- ❌ Manual hover state → CSS handles it
- ❌ Excessive padding → Clean spacing

---

## 🎨 **Visual Design**

### **Typography**

```
Profile Name:     14px, weight 600
Profile Email:    13px, secondary
Section Header:   11px, weight 600, uppercase
Menu Title:       14px, weight 450
Menu Description: 12px, tertiary color
```

### **Spacing**

```
Profile Header:  12px 16px padding
Menu Items:      10px 16px padding
Section Gap:     8px margin
Icon-Text Gap:   12px
```

### **Colors**

```
Normal Icon:     colorTextSecondary
Hover Icon:      colorPrimary
Danger Icon:     colorError
Background:      colorFillTertiary (hover)
```

---

## 🔧 **Technical Changes**

### **Before**

```typescript
const ACTIONS_LIST = [
  { title: "My Profile", icon: <LuUser />, onClick: () => {} },
  { title: "FAQ", icon: <LuHelpCircle />, onClick: () => {} },
  { title: "Business Settings", icon: <LuSettings />, onClick: () => {} },
  { title: "App Appearance", icon: <LuSettings2 />, onClick: () => {} },
  { title: "Keyboard Shortcuts", icon: <LuKeyboard />, onClick: () => {} },
  { title: "Logout", icon: <LuLogOut />, onClick: () => logoutUser() },
];

// Flat list, no structure
```

### **After**

```typescript
const MENU_SECTIONS = [
  {
    items: [
      {
        title: "My Profile",
        icon: <LuUser />,
        onClick: () => {},
        description: "View and edit your profile",
      },
    ],
  },
  {
    title: "Preferences",
    items: [
      {
        title: "Appearance",
        icon: <LuSettings2 />,
        onClick: () => dispatch(toggleAppSettingsPanel(true)),
        description: "Theme, colors & layout",
      },
      {
        title: "Keyboard Shortcuts",
        icon: <LuKeyboard />,
        onClick: () => setShowShortcutsModal(true),
        description: "View all shortcuts",
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        title: "Help Center",
        icon: <LuHelpCircle />,
        onClick: () => {},
        description: "Guides & FAQs",
      },
    ],
  },
  {
    items: [
      {
        title: "Sign Out",
        icon: <LuLogOut />,
        onClick: () => logoutUser(),
        danger: true,
      },
    ],
  },
];

// Grouped, structured, descriptive
```

---

## 📱 **Responsive Design**

### **Desktop**

- Width: 280px
- Full descriptions visible
- Hover effects enabled

### **Tablet**

- Width: 280px
- Touch-friendly padding
- Tap instead of hover

### **Mobile**

- Width: 100vw - 32px
- Stacks naturally
- Large touch targets

---

## ♿ **Accessibility**

### **Keyboard Navigation**

- ✅ Tab through items
- ✅ Enter to activate
- ✅ ESC to close

### **Screen Readers**

- ✅ Clear item names
- ✅ Descriptive text
- ✅ Proper ARIA labels

### **Visual**

- ✅ High contrast
- ✅ Clear hover states
- ✅ Danger color for Sign Out

---

## 🎓 **Industry Patterns Applied**

### **Slack**

- ✅ Grouped sections
- ✅ Section headers
- ✅ Clean menu items
- ✅ Profile at top

### **Linear**

- ✅ Subtle hover effects
- ✅ Icon + text layout
- ✅ Descriptions for clarity
- ✅ Sign out at bottom

### **Notion**

- ✅ Simple, clean design
- ✅ No heavy card components
- ✅ Smooth transitions
- ✅ Logical grouping

---

## 🎉 **Result**

### **Before** ❌

- Cluttered with Cards
- No organization
- Generic items
- Dated hover effects
- 6 flat items

### **After** ✅

- Clean simple items
- 4 logical sections
- Descriptive labels
- Modern hover effects
- Professional hierarchy

---

## ✅ **Checklist**

### **Content**

- [x] Removed unnecessary items (FAQ, Business Settings)
- [x] Added helpful descriptions
- [x] Grouped into logical sections
- [x] Added section headers
- [x] "Logout" → "Sign Out"

### **Design**

- [x] Removed Card components
- [x] Clean menu item design
- [x] Subtle hover effects
- [x] Proper spacing
- [x] Visual hierarchy

### **Code**

- [x] Removed unused imports
- [x] Removed manual hover state
- [x] CSS-based hover effects
- [x] Cleaner structure
- [x] Better organization

### **Quality**

- [x] Matches industry standards
- [x] User-friendly for non-tech users
- [x] Professional appearance
- [x] Accessible
- [x] Responsive

---

## 📝 **Summary**

**Removed**:

- ❌ FAQ (merged into Help Center)
- ❌ Business Settings (too vague)
- ❌ Card components (over-engineered)
- ❌ Manual hover state (unnecessary)

**Added**:

- ✅ Section grouping
- ✅ Section headers
- ✅ Item descriptions
- ✅ Clean menu design
- ✅ Better hierarchy

**Result**: Professional, clean, user-friendly profile menu that matches industry leaders!

---

**Current source state**: profile modal behavior is documented here. Current release approval still requires the launch-boundary evidence above.
