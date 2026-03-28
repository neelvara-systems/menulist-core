# 🔍 Image Preview & Zoom Controls

**Files**: `ZoomableImage.tsx`, `components/FileImagePreview.tsx`  
**Last Updated**: Nov 27, 2025

---

## 📋 Overview

The image preview system provides an interactive way to view uploaded menu images with zoom, pan, and action controls.

---

## 🖼️ FileImagePreview Component

**File**: `components/FileImagePreview.tsx` (7.7KB)

### Purpose

Wrapper component that combines the zoomable image with action buttons and help popover.

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ [menu-page-1.jpg]                    [?] [👁] [🗑]      │
│                                                         │
│                                                         │
│                    Menu Image                           │
│                   (Zoomable)                            │
│                                                         │
│                                                         │
│                                    [-] [100%] [+] [↺]   │
├─────────────────────────────────────────────────────────┤
│ [🔤 Re-translate]          [ℹ️ Generate Descriptions]   │
└─────────────────────────────────────────────────────────┘
```

### Props

```typescript
interface FileImagePreviewProps {
  file: ProjectFileType;
  fileProcessingId: string | null;
  onPreview: (file: ProjectFileType) => void;
  onDelete: (file: ProjectFileType) => void;
  onRetryTranslations: (file: ProjectFileType) => void;
  onRetryDescription: (file: ProjectFileType) => void;
}
```

### Features

#### 1. File Name Display

Shows the file name in a semi-transparent overlay (top-left):

```typescript
{
  file.name && (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 18,
        background: "rgba(0,0,0,0.6)",
        padding: "4px 10px",
        borderRadius: 6,
      }}
    >
      <Text ellipsis={{ tooltip: file.name }}>{file.name}</Text>
    </div>
  );
}
```

#### 2. Action Buttons (Top-Right)

| Button | Icon           | Action                           | Tooltip                                              |
| ------ | -------------- | -------------------------------- | ---------------------------------------------------- |
| Help   | `LuHelpCircle` | Opens help popover               | -                                                    |
| View   | `LuEye`        | Opens fullscreen preview         | "View full image"                                    |
| Delete | `LuTrash`      | Deletes file (with confirmation) | "Delete this file" / "Cannot delete until processed" |

#### 3. Help Popover (ImageControlsHelp)

Comprehensive guide showing all available controls:

**Zoom Controls Section:**
| Icon | Keys | Action |
|------|------|--------|
| ➕ | `Scroll Up`, `+` | Zoom in |
| ➖ | `Scroll Down`, `-` | Zoom out |
| 🔄 | `0`, `Click %` | Reset zoom |
| 🖱️ | `Double-click` | Quick zoom (2x) |
| ✋ | `Drag` | Pan when zoomed |

**Available Actions Section:**
| Icon | Label | Description |
|------|-------|-------------|
| 👁️ | View Full Image | Open image in fullscreen preview |
| 🔤 | Re-translate | Use AI to re-extract and translate text |
| ℹ️ | Generate Descriptions | Use AI to create item descriptions |
| 🗑️ | Delete File | Remove this file from the project |

**Tip:**

> 💡 Click on the image area and use keyboard shortcuts

---

## 🔎 ZoomableImage Component

**File**: `ZoomableImage.tsx` (14.4KB)

### Purpose

Interactive image viewer with zoom, pan, and keyboard controls.

### Props

```typescript
interface ZoomableImageProps {
  isLoading: boolean;
  src: string;
  alt: string;
  retryTranslations: () => void;
  retryDescription: () => void;
}
```

### Features

#### 1. Zoom Controls

**Zoom Range**: 100% - 400% (0.25 increments for scroll, 0.5 for buttons)

**Methods:**
| Method | Action | Code |
|--------|--------|------|
| Scroll Wheel | Zoom in/out | `handleWheel` |
| `+` / `-` Keys | Zoom in/out | `handleKeyDown` |
| Double-click | Toggle 100% ↔ 200% | `handleDoubleClick` |
| Click Buttons | Zoom in/out | `handleZoomIn` / `handleZoomOut` |
| Click % | Reset to 100% | `handleResetZoom` |
| Press `0` | Reset to 100% | `handleKeyDown` |

```typescript
// Scroll wheel zoom
const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.25 : 0.25;
  setZoom((prev) => Math.min(Math.max(prev + delta, 1), 4));
}, []);

// Keyboard shortcuts
const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
  if (e.key === "+" || e.key === "=") {
    setZoom((prev) => Math.min(prev + 0.5, 4));
  } else if (e.key === "-" || e.key === "_") {
    setZoom((prev) => Math.max(prev - 0.5, 1));
  } else if (e.key === "0") {
    handleResetZoom();
  }
}, []);

// Double-click toggle
const handleDoubleClick = useCallback(() => {
  if (zoom === 1) {
    setZoom(2);
  } else {
    handleResetZoom();
  }
}, [zoom]);
```

#### 2. Pan Controls

When zoomed in (>100%), users can drag to pan:

```typescript
const handleMouseDown = useCallback(
  (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setStartPosition({ ...position });
    }
  },
  [zoom, position]
);

// Bounded position to prevent panning outside image
const getBoundedPosition = useCallback(
  (x: number, y: number) => {
    const maxX = Math.max(0, (scaledWidth - container.width) / 2);
    const maxY = Math.max(0, (scaledHeight - container.height) / 2);
    return {
      x: Math.min(Math.max(x, -maxX), maxX),
      y: Math.min(Math.max(y, -maxY), maxY),
    };
  },
  [zoom]
);
```

**Cursor States:**

- Default: `cursor: default`
- Zoomed: `cursor: grab`
- Dragging: `cursor: grabbing`

#### 3. First-Time Zoom Hint

Shows a helpful hint on first use:

```typescript
const ZOOM_HINT_SHOWN_KEY = "zoomableImage_hintShown";

useEffect(() => {
  const hintShown = localStorage.getItem(ZOOM_HINT_SHOWN_KEY);
  if (!hintShown) {
    setShowZoomHint(true);
    // Auto-hide after 5 seconds
    const timer = setTimeout(() => {
      setShowZoomHint(false);
      localStorage.setItem(ZOOM_HINT_SHOWN_KEY, "true");
    }, 5000);
    return () => clearTimeout(timer);
  }
}, []);
```

**Hint Message:**

> 🔍 Scroll or use +/- to zoom • Double-click to zoom in

#### 4. Zoom Controls UI

```
┌─────────────────────────────────────┐
│  [-]  │  150%  │  [+]  │  [↺]      │
└─────────────────────────────────────┘
```

| Element    | Action                   | Tooltip               |
| ---------- | ------------------------ | --------------------- |
| `-` button | Zoom out                 | "Zoom out (-)"        |
| % display  | Click to reset           | "Click to reset zoom" |
| `+` button | Zoom in                  | "Zoom in (+)"         |
| ↺ button   | Reset (only when zoomed) | "Reset zoom (0)"      |

#### 5. Action Buttons

Bottom action buttons with explanatory tooltips:

```typescript
<Flex gap={10}>
  <Tooltip title="Use AI to re-translate all text extracted from this image">
    <Button onClick={retryTranslations} block icon={<TbLanguageHiragana />}>
      Re-translate
    </Button>
  </Tooltip>
  <Tooltip title="Use AI to generate descriptions for all items in this image">
    <Button onClick={retryDescription} block icon={<LuInfo />}>
      Generate Descriptions
    </Button>
  </Tooltip>
</Flex>
```

#### 6. Loading State

Shows spinner overlay when processing:

```typescript
{
  isLoading && (
    <div
      style={{
        position: "absolute",
        background: token.colorBgMask,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
      }}
    >
      <Spin size="large" />
    </div>
  );
}
```

---

## 📱 Touch Support

Both mouse and touch events are supported:

```typescript
// Touch start
const handleTouchStart = useCallback(
  (e: React.TouchEvent<HTMLDivElement>) => {
    if (zoom > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setStartPosition({ ...position });
    }
  },
  [zoom, position]
);

// Touch move
const handleTouchMove = useCallback(
  (e: TouchEvent) => {
    if (isDragging && zoom > 1) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - dragStart.x;
      const deltaY = e.touches[0].clientY - dragStart.y;
      setPosition(
        getBoundedPosition(startPosition.x + deltaX, startPosition.y + deltaY)
      );
    }
  },
  [isDragging, dragStart, startPosition, zoom]
);
```

---

## 🎨 Styling

### Zoom Controls Styling

```css
.zoom-controls {
    opacity: 0.9;
    border: 1px solid ${token.colorBorder};
}
.zoom-controls:hover {
    opacity: 1;
}
```

### Container Styling

```typescript
style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    overflow: 'hidden',
    cursor: isDragging ? 'grabbing' : (zoom > 1 ? 'grab' : 'default'),
    userSelect: 'none',
    touchAction: 'none',
    position: 'relative'
}}
```

---

## 🔗 Usage in Views

### AdvancedView

```typescript
<Splitter.Panel>
  <FileImagePreview
    file={file}
    fileProcessingId={fileProcessingId}
    onPreview={setPreviewFile}
    onDelete={(file) => confirmFileDeletion(file)}
    onRetryTranslations={onRetryTranslations}
    onRetryDescription={(file) =>
      setIsDescModalOpen({ active: true, sourceFile: file })
    }
  />
</Splitter.Panel>
```

### FocusView

Similar usage but without the splitter panel.

---

## 📊 State Management

| State           | Type      | Purpose                          |
| --------------- | --------- | -------------------------------- |
| `zoom`          | `number`  | Current zoom level (1-4)         |
| `isDragging`    | `boolean` | Whether user is panning          |
| `position`      | `{x, y}`  | Current pan position             |
| `dragStart`     | `{x, y}`  | Mouse position when drag started |
| `startPosition` | `{x, y}`  | Image position when drag started |
| `showZoomHint`  | `boolean` | Whether to show first-time hint  |

---

## 🔗 Related Files

- `Editor.tsx` - Parent component
- `views/AdvancedView.tsx` - Uses FileImagePreview
- `views/FocusView.tsx` - Uses FileImagePreview
