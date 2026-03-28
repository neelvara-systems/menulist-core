# 🎬 Batch Actions

**File**: `EditorActionsPopover.tsx`  
**Last Updated**: Nov 27, 2025

---

## 📋 Overview

The "More Actions" popover provides quick access to batch operations that affect multiple items at once.

---

## 🎯 Actions Menu

### Location

"More Actions" button in the Editor header.

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ Manage & Control Your Menu                              │
│ Customize content, add languages, upload images, and    │
│ organize items                                          │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [🌐] Manage Languages                               │ │
│ │     Choose which languages your menu is available in│ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [ℹ️] Generate Descriptions                          │ │
│ │     Let AI write descriptions for your menu items   │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [🖼️] Add Images                                     │ │
│ │     Upload photos for your menu items               │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [👁️] Show or Hide Items                             │ │
│ │     Control which items appear on your menu         │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [↕️] Rearrange Menu                                  │ │
│ │     Change the order of categories and items        │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Available Actions

### 1. Manage Languages (`Ctrl+L`)

| Property        | Value                                            |
| --------------- | ------------------------------------------------ |
| **Icon**        | `LuLanguages`                                    |
| **Title**       | Manage Languages                                 |
| **Description** | Choose which languages your menu is available in |
| **Modal**       | `LanguageSelectorModal`                          |

**What it does:**

- Add/remove languages for your menu
- AI auto-translates all items to new languages
- Manage translation quality

### 2. Generate Descriptions (`Ctrl+G`)

| Property        | Value                                                       |
| --------------- | ----------------------------------------------------------- |
| **Icon**        | `LuInfo`                                                    |
| **Title**       | Generate Descriptions                                       |
| **Description** | Let AI write descriptions for your menu items automatically |
| **Modal**       | `DescriptionGenerationModal`                                |

**What it does:**

- AI generates descriptions for items without descriptions
- Choose description length (Short/Medium/Long)
- Apply to all items or specific file

### 3. Add Images (`Ctrl+U`)

| Property        | Value                             |
| --------------- | --------------------------------- |
| **Icon**        | `LuImage`                         |
| **Title**       | Add Images                        |
| **Description** | Upload photos for your menu items |
| **Modal**       | `ImageUploadModal`                |

**What it does:**

- Bulk upload images
- Assign images to specific items
- Crop and resize images
- AI image generation (optional)

### 4. Show or Hide Items (`Ctrl+B`)

| Property        | Value                                   |
| --------------- | --------------------------------------- |
| **Icon**        | `LuEye`                                 |
| **Title**       | Show or Hide Items                      |
| **Description** | Control which items appear on your menu |
| **Modal**       | `BulkStatusMenuModal`                   |

**What it does:**

- Bulk activate/deactivate items
- Bulk activate/deactivate categories
- Two-column checkbox interface
- See current status before changing

### 5. Rearrange Menu (`Ctrl+R`)

| Property        | Value                                    |
| --------------- | ---------------------------------------- |
| **Icon**        | `LuArrowUpDown`                          |
| **Title**       | Rearrange Menu                           |
| **Description** | Change the order of categories and items |
| **Modal**       | `ReorderMenuModal`                       |

**What it does:**

- Drag & drop categories
- Drag & drop items within categories
- Two-column interface
- Multi-file support

---

## ⚙️ Implementation

### Action Configuration

```typescript
export type EditorAction =
  | "language"
  | "description"
  | "images"
  | "activeInactive"
  | "reorder";

type ActionConfig = {
  key: EditorAction;
  icon: React.ReactNode;
  title: string;
  description: string;
};

const ACTIONS: ActionConfig[] = [
  {
    key: "language",
    icon: <LuLanguages style={{ fontSize: 20 }} />,
    title: "Manage Languages",
    description: "Choose which languages your menu is available in",
  },
  {
    key: "description",
    icon: <LuInfo style={{ fontSize: 20 }} />,
    title: "Generate Descriptions",
    description: "Let AI write descriptions for your menu items automatically",
  },
  {
    key: "images",
    icon: <LuImage style={{ fontSize: 20 }} />,
    title: "Add Images",
    description: "Upload photos for your menu items",
  },
  {
    key: "activeInactive",
    icon: <LuEye style={{ fontSize: 20 }} />,
    title: "Show or Hide Items",
    description: "Control which items appear on your menu",
  },
  {
    key: "reorder",
    icon: <LuArrowUpDown style={{ fontSize: 20 }} />,
    title: "Rearrange Menu",
    description: "Change the order of categories and items",
  },
];
```

### Props

```typescript
type EditorActionsPopoverProps = {
  onActionClick: (action: EditorAction) => void;
};
```

### Handler in Editor.tsx

```typescript
const handleActionClick = (action: EditorAction) => {
  switch (action) {
    case "language":
      setIsLanguageModalOpen(true);
      break;
    case "description":
      setIsDescModalOpen({ active: true });
      break;
    case "images":
      setIsImageModalOpen({ active: true, item: null });
      break;
    case "activeInactive":
      setIsBulkStatusModalOpen(true);
      break;
    case "reorder":
      setIsReorderModalOpen(true);
      break;
  }
};
```

---

## 🎨 Styling

### Action Card

```typescript
<Card
  size="small"
  hoverable
  onClick={() => {
    setOpen(false);
    onActionClick(action.key);
  }}
  style={{ borderRadius: 14 }}
  styles={{ body: { padding: 12 } }}
>
  <Flex gap={12} align="flex-start">
    <div
      style={{
        padding: 8,
        borderRadius: 8,
        background: token.colorPrimaryBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {action.icon}
    </div>
    <Flex vertical gap={4} style={{ flex: 1 }}>
      <Text strong>{action.title}</Text>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {action.description}
      </Text>
    </Flex>
  </Flex>
</Card>
```

### Popover Header

```typescript
<Flex vertical gap={4} style={{ marginBottom: 20 }}>
  <Text strong style={{ fontSize: 16 }}>
    Manage & Control Your Menu
  </Text>
  <Text type="secondary" style={{ fontSize: 12 }}>
    Customize content, add languages, upload images, and organize items
  </Text>
</Flex>
```

---

## ⌨️ Keyboard Shortcuts

All batch actions have keyboard shortcuts:

| Action                | Shortcut |
| --------------------- | -------- |
| Manage Languages      | `Ctrl+L` |
| Generate Descriptions | `Ctrl+G` |
| Add Images            | `Ctrl+U` |
| Show/Hide Items       | `Ctrl+B` |
| Rearrange Menu        | `Ctrl+R` |

---

## 📊 Action Flow

```
User clicks "More Actions"
    ↓
Popover opens with 5 action cards
    ↓
User clicks an action
    ↓
Popover closes
    ↓
Corresponding modal opens
    ↓
User performs batch operation
    ↓
Modal closes
    ↓
Changes applied to projectData
    ↓
Auto-save triggers
```

---

## 🔗 Related Files

- `Editor.tsx` - Action handler
- `LanguageSelectorModal.tsx` - Language management
- `DescriptionGenerationModal.tsx` - AI descriptions
- `ImageUploadModal.tsx` - Image upload
- `BulkStatusMenuModal.tsx` - Bulk status
- `ReorderMenuModal.tsx` - Reorder menu
