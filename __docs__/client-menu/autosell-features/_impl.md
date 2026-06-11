# Auto-Sell Features — Implementation

**Sub-Feature of:** Client Menu  
**Document Type:** Technical Implementation  
**Status:** ✅ Implemented (Features 1-3)  
**Last Updated:** January 12, 2026

---

## File Structure

```
src/components/templates/main-app/projects/b2cView/
├── menuPage/
│   ├── components/
│   │   ├── LiveIndicator.tsx          # Feature #1
│   │   ├── MenuItem.tsx               # Feature #2 (availability styling)
│   │   └── MenuCategory.tsx           # Feature #3 (time visibility)
│   └── layouts/
│       ├── verticalMenuLayout.tsx     # Time-based filtering
│       └── horizontalMenuLayout.tsx   # Time-based tab filtering

src/hooks/
└── useTimedCategories.ts              # Time-based logic

src/config/
├── businessLabels.ts                  # Business-type labels
└── defaultTimeSlotPresets.ts          # Default presets

src/database/stores/
└── index.ts                           # Time slot preset operations

src/types/
├── extractedData.types.ts             # CategoryTimeSlot interface
└── store.ts                           # TimeSlotPreset type
```

---

## Feature #1: Live Indicator

### Component

```typescript
// src/components/.../LiveIndicator.tsx

interface LiveIndicatorProps {
  modifiedOn: Timestamp | Date | string;
}

export function LiveIndicator({ modifiedOn }: LiveIndicatorProps) {
  const formattedTime = useMemo(() => {
    const now = new Date();
    const modified = parseTimestamp(modifiedOn);
    const diffMs = now.getTime() - modified.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "updated just now";
    if (diffMin < 60) return `updated ${diffMin} minutes ago`;
    if (diffDays === 0) return `updated today at ${formatTime(modified)}`;
    if (diffDays <= 3) return `updated ${diffDays} days ago`;
    return null; // Show only "Live" badge
  }, [modifiedOn]);

  return (
    <div className="live-indicator">
      <span className="live-dot pulse" />
      <span>🟢 Live{formattedTime ? ` · ${formattedTime}` : ""}</span>
    </div>
  );
}
```

### Integration

```typescript
// In menuPageNew.tsx or MenuPageHeader.tsx
<LiveIndicator modifiedOn={projectData.modifiedOn} />
```

### Styling

```css
.live-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
}

.pulse {
  animation: pulse 2s ease-in-out 1;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

---

## Feature #2: Instant Availability

### Data Model

```typescript
// src/types/extractedData.types.ts

interface ExtractedDataItem {
  id: string;
  name: LocalizedString;
  price: string;
  // ...other fields
  available?: boolean; // Default: true
}
```

### Owner UI

```typescript
// src/components/.../editItemModal.tsx

const { label } = getBusinessLabels(businessType);

<Switch
  checked={item.available !== false}
  onChange={(checked) => updateItem({ available: checked })}
  checkedChildren={label.available} // "Available"
  unCheckedChildren={label.unavailable} // "Unavailable"
/>;
```

### Customer UI

```typescript
// src/components/.../MenuItem.tsx

const isUnavailable = item.available === false;
const { customerLabel } = getBusinessLabels(businessType);

<div
  className={cn("menu-item", isUnavailable && "opacity-40 pointer-events-none")}
>
  {/* Item content */}
  {isUnavailable && (
    <span className="unavailable-badge">
      {customerLabel.unavailable} {/* "Sold out" */}
    </span>
  )}
</div>;
```

### Business Labels

```typescript
// src/config/businessLabels.ts

export function getBusinessLabels(businessType?: string) {
  switch (businessType) {
    case "retail":
      return {
        customerLabel: { unavailable: "Out of stock" },
        ownerLabel: { available: "In stock", unavailable: "Out of stock" },
      };
    case "service":
      return {
        customerLabel: { unavailable: "Unavailable" },
        ownerLabel: { available: "Available", unavailable: "Unavailable" },
      };
    default: // food
      return {
        customerLabel: { unavailable: "Sold out" },
        ownerLabel: { available: "Available", unavailable: "Unavailable" },
      };
  }
}
```

---

## Feature #3: Time-Based Categories

### Data Model

```typescript
// src/types/store.ts

interface TimeSlotPreset {
  id: string;
  label: string;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  color?: string;
}

interface StoreDataType {
  // ...other fields
  timeSlotPresets?: TimeSlotPreset[];
}
```

```typescript
// src/types/extractedData.types.ts

interface CategoryTimeSlot {
  presetId: string;
  label: string;
  start: string;
  end: string;
}

interface ExtractedDataCategory {
  id: string;
  name: LocalizedString;
  // ...other fields
  timeSlots?: CategoryTimeSlot[];
}
```

### Time Slot Hook

```typescript
// src/hooks/useTimedCategories.ts

export function isWithinTimeSlot(category: ExtractedDataCategory): boolean {
  if (!category.timeSlots?.length) return true; // No time slots = always visible

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return category.timeSlots.some((slot) => {
    const [startH, startM] = slot.start.split(":").map(Number);
    const [endH, endM] = slot.end.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  });
}

export function getNextSlotStart(
  category: ExtractedDataCategory
): { label: string; time: string } | null {
  if (!category.timeSlots?.length) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Find next slot that starts after now
  const nextSlot = category.timeSlots
    .filter((slot) => {
      const [h, m] = slot.start.split(":").map(Number);
      return h * 60 + m > currentMinutes;
    })
    .sort((a, b) => {
      const aMin =
        parseInt(a.start.split(":")[0]) * 60 + parseInt(a.start.split(":")[1]);
      const bMin =
        parseInt(b.start.split(":")[0]) * 60 + parseInt(b.start.split(":")[1]);
      return aMin - bMin;
    })[0];

  if (!nextSlot) return null;

  return { label: nextSlot.label, time: formatTime(nextSlot.start) };
}
```

### Menu Layout Integration

```typescript
// src/components/.../verticalMenuLayout.tsx

const [now, setNow] = useState(new Date());

// Update time every 60 seconds
useEffect(() => {
  const interval = setInterval(() => setNow(new Date()), 60000);
  return () => clearInterval(interval);
}, []);

const visibleCategories = useMemo(() => {
  return categories.filter((cat) => isWithinTimeSlot(cat));
}, [categories, now]);

// Show "X starts at Y" for hidden categories
const upcomingCategories = useMemo(() => {
  return categories
    .filter((cat) => !isWithinTimeSlot(cat))
    .map((cat) => ({ category: cat, next: getNextSlotStart(cat) }))
    .filter(({ next }) => next !== null);
}, [categories, now]);

return (
  <>
    {upcomingCategories.map(({ category, next }) => (
      <div key={category.id} className="upcoming-category">
        {next.label} starts at {next.time}
      </div>
    ))}
    {visibleCategories.map((category) => (
      <MenuCategory key={category.id} category={category} />
    ))}
  </>
);
```

### Default Presets

```typescript
// src/config/defaultTimeSlotPresets.ts

export function getDefaultPresets(businessType: string): TimeSlotPreset[] {
  switch (businessType) {
    case "food":
    case "restaurant":
      return [
        {
          id: generateId(),
          label: "Breakfast",
          start: "07:00",
          end: "11:00",
          color: "gold",
        },
        {
          id: generateId(),
          label: "Lunch",
          start: "11:00",
          end: "15:00",
          color: "blue",
        },
        {
          id: generateId(),
          label: "Dinner",
          start: "18:00",
          end: "22:00",
          color: "purple",
        },
        {
          id: generateId(),
          label: "Late Night",
          start: "22:00",
          end: "02:00",
          color: "magenta",
        },
      ];
    case "service":
    case "salon":
      return [
        {
          id: generateId(),
          label: "Off-Peak",
          start: "09:00",
          end: "11:00",
          color: "green",
        },
        {
          id: generateId(),
          label: "Regular",
          start: "11:00",
          end: "17:00",
          color: "blue",
        },
        {
          id: generateId(),
          label: "Peak",
          start: "17:00",
          end: "21:00",
          color: "red",
        },
      ];
    default:
      return [
        {
          id: generateId(),
          label: "Morning",
          start: "09:00",
          end: "12:00",
          color: "gold",
        },
        {
          id: generateId(),
          label: "Afternoon",
          start: "12:00",
          end: "17:00",
          color: "blue",
        },
        {
          id: generateId(),
          label: "Evening",
          start: "17:00",
          end: "21:00",
          color: "purple",
        },
      ];
  }
}
```

### Database Operations

```typescript
// src/database/stores/index.ts

export async function updateTimeSlotPresets(
  storeId: number,
  presets: TimeSlotPreset[]
) {
  const storeRef = doc(firebaseClient, DB_COLLECTIONS.STORES, String(storeId));
  await updateDoc(storeRef, {
    timeSlotPresets: presets,
    modifiedOn: serverTimestamp(),
  });
}

export function generatePresetId(tenantId: number, storeId: number): string {
  return `${tenantId}${storeId}${Date.now()
    .toString(36)
    .slice(-4)}`.toUpperCase();
}
```

When an existing preset is edited, `updatePresetInAllCategories()` scans the current store's project docs, updates only category `timeSlots[]` entries with the matching `presetId`, writes changed project docs, and revalidates the affected public menu cache. When a preset is deleted, `removePresetFromAllCategories()` removes matching category windows and performs the same per-project revalidation.

---

## Validation Checklist

### Feature #1: Live Indicator

| Item                    | Status |
| ----------------------- | ------ |
| Component created       | ✅     |
| Timestamp decay logic   | ✅     |
| Pulse animation (once)  | ✅     |
| Integrated in menu page | ✅     |
| Mobile responsive       | ✅     |

### Feature #2: Instant Availability

| Item                            | Status |
| ------------------------------- | ------ |
| `available` field in item type  | ✅     |
| Default `true` on extraction    | ✅     |
| Owner toggle in editor          | ✅     |
| Customer fade effect (40%)      | ✅     |
| Business-type labels            | ✅     |
| Click disabled when unavailable | ✅     |
| PDP modal shows unavailable tag | ✅     |

### Feature #3: Time-Based Categories

| Item                               | Status |
| ---------------------------------- | ------ |
| `timeSlots` field in category type | ✅     |
| Store-level presets                | ✅     |
| Default presets by business type   | ✅     |
| Category visibility logic          | ✅     |
| "X starts at Y" message            | ✅     |
| 60-second time update              | ✅     |
| User time format preference        | ✅     |

---

## Testing

### Feature #1: Live Indicator

1. Edit menu item → Save
2. Reload customer menu
3. Check indicator shows "updated just now"
4. Wait 2 minutes → Shows "updated 2 minutes ago"

### Feature #2: Availability

1. Mark item unavailable in editor
2. Customer menu: Item fades to 40%
3. Customer menu: Shows "Sold out" label
4. Customer menu: Click does nothing (disabled)

### Feature #3: Time-Based

1. Create category with time slot 9:00-11:00
2. At 8:59: Shows "X starts at 9:00 AM"
3. At 9:00: Category appears
4. At 11:00: Category fades out

---

_Document Status: ✅ IMPLEMENTED (Features 1-3)_
