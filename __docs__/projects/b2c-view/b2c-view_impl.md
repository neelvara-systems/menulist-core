# B2C View — Implementation

**Feature:** Customer-Facing Digital Menu  
**Status:** Implemented source evidence; not current launch certification
**Last Updated:** January 2026

**Launch boundary:** This implementation note documents the customer-facing menu view; it is not current launch certification. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, Digital Menu Output Constitution checks, `npm run verify:menu-design-presentation-boundary`, public cache/deploy evidence, browser/mobile customer-menu QA, and target production smoke.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ MENU URL: /{subdomain}.menulist.ai/{slug}                        │
│           OR custom-domain.com/{slug}                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Next.js App Router                                              │
│       │                                                          │
│       ├── generateMetadata()  → Dynamic SEO                     │
│       ├── Page Component      → Server-rendered menu            │
│       └── Client Components   → Interactive elements            │
│                                                                  │
│  Data Flow:                                                      │
│       Tenant Headers → Store Lookup → Project Data → Render     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Current Source Files

```text
src/app/client/[[...slug]]/page.tsx
src/components/templates/main-app/projects/b2cView/index.tsx
src/components/templates/main-app/projects/b2cView/designSystem/index.ts
src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx
src/components/templates/main-app/projects/b2cView/menuPage/menuPageSettingsNew.tsx
src/components/mobile/screens/MobileDesignEditorScreen.tsx
src/lib/menu/menuDesignPresets.ts
src/database/projects/index.ts
src/lib/firebase/functions.ts
```

Older route examples in this file are historical notes. Current source truth for design presentation is the file set above plus the active client-menu docs.

---

## Performance Optimizations

### Memoization

```typescript
// menuLayout.tsx - MenuItem memoized
const MenuItem = React.memo(
  ({ item, theme, onClick }) => (
    <motion.div
      whileInView={{ opacity: 1 }} // Lazy animation
      // ...
    >
      <Image
        fill
        sizes="(max-width: 768px) 50vw, 33vw" // Responsive sizing
        // ...
      />
    </motion.div>
  ),
  (prevProps, nextProps) => {
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.theme === nextProps.theme
    );
  }
);

// Styles memoized
const containerStyles = useMemo(
  () => ({
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    // ...
  }),
  [theme]
);

// Search debounced
const debouncedSearch = useMemo(() => debounce(setSearchQuery, 300), []);

// renderItems wrapped in useCallback
const renderItems = useCallback(
  (items) => {
    return items.map((item) => (
      <MenuItem key={item.id} item={item} theme={theme} />
    ));
  },
  [theme]
);
```

### Next.js Image Optimization

```typescript
<Image
  fill
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  alt={item.name}
  loading="lazy"
  quality={80}
/>
```

---

## SEO Implementation

### generateMetadata

```typescript
// page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const { subdomain, customDomain, tenantType } = await getTenantFromHeaders();

  // Lookup store
  let storeData = null;
  if (tenantType === "subdomain" && subdomain) {
    storeData = await getStoreBySubdomain(subdomain);
  } else if (tenantType === "custom" && customDomain) {
    storeData = await getStoreByCustomDomain(customDomain);
  }

  // Fetch project
  const projectData = await getProjectBySlug(storeData.id, params.slug);

  const title = projectData.menuSettings?.seoTitle || projectData.name;
  const description = projectData.menuSettings?.seoDescription || "";
  const ogImageUrl = projectData.menuSettings?.ogImageUrl || "";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
```

### Schema.org JSON-LD

```typescript
const generateSchemaOrgJsonLd = (project, store) => ({
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: store.name,
  menu: {
    "@type": "Menu",
    hasMenuSection: project.files.flatMap((file) =>
      file.extractedData.data.categories.map((category) => ({
        "@type": "MenuSection",
        name: category.name[activeLang],
        hasMenuItem: file.extractedData.data.items
          .filter((item) => item.category === category.id)
          .map((item) => ({
            "@type": "MenuItem",
            name: item.name[activeLang],
            description: item.description?.[activeLang],
            offers: {
              "@type": "Offer",
              price: item.price,
              priceCurrency: store.currency || "USD",
            },
          })),
      }))
    ),
  },
});
```

---

## Design Presentation System

The current design presentation contract lives in `b2cView/designSystem/index.ts` and `src/lib/menu/menuDesignPresets.ts`.

- `MenuMood` is limited to Clean, Warm, Premium, Bold, and Fast.
- Owner-selectable layout choices are List, Grid, and Card.
- `MOOD_LAYOUT_COMPATIBILITY` filters layout choices by mood.
- `normalizeMenuLayout()` falls back to the default compatible layout when a saved layout is unsupported for the selected mood.
- Legacy saved `tabs` layout values are mapped into `showCategoryTabs` and normalized away from the layout field.
- `getMoodWithBrandColor()` runs accent and price colors through contrast enforcement before public output.
- `MenuStylePresetPreview` renders a small visual strip for recommended-style cards from the existing preset fields: mood, layout, accent color, item prices, item images, category icons, and category tabs. This visual preset preview does not add a new public theme contract, click path, or free-form style surface.

Desktop and mobile editors both use the same helper contracts. The public renderer calls `normalizeMenuMood()` and `normalizeMenuLayout()` before reading `MENU_LAYOUTS`, so stale saved values do not become unsupported customer output.

---

## Device Frame Preview

```typescript
// deviceFrame.tsx
const DeviceFrame = ({ device, children }) => {
  const dimensions = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1024, height: 768 },
  };

  return (
    <div
      style={{
        width: dimensions[device].width,
        height: dimensions[device].height,
        overflow: "auto",
      }}
    >
      {children}
    </div>
  );
};
```

---

## Share Modal

```typescript
// shareModal/index.tsx
const ShareModal = ({ projectId, isOpen, onClose }) => {
  const menuUrl = `${window.location.origin}/menu/${projectId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(menuUrl);
    message.success("Link copied!");
  };

  const handleDownloadQR = () => {
    // Generate QR code using qrcode library
    QRCode.toDataURL(menuUrl, (err, url) => {
      const link = document.createElement("a");
      link.download = "menu-qr.png";
      link.href = url;
      link.click();
    });
  };

  return (
    <Modal title="Share Menu" open={isOpen} onCancel={onClose}>
      <Alert
        type="info"
        message="This menu is public. Anyone with the link can view it."
      />

      <Input value={menuUrl} readOnly />
      <Button onClick={handleCopyLink}>Copy Link</Button>
      <Button onClick={handleDownloadQR}>Download QR Code</Button>
    </Modal>
  );
};
```

---

## Accessibility

```typescript
// MenuItem with accessibility
<motion.div
  role="button"
  tabIndex={0}
  aria-label={`${item.name}, ${item.price}`}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      onClick(item);
    }
  }}
>
  {/* Content */}
</motion.div>
```

---

## Validation Checklist

| Requirement | Implementation | Location | Status |
| --- | --- | --- | --- |
| Mood normalization | `normalizeMenuMood()` | `designSystem/index.ts` | Source-gated |
| Layout compatibility | `normalizeMenuLayout()` and `MOOD_LAYOUT_COMPATIBILITY` | `designSystem/index.ts` | Source-gated |
| Owner-selectable layouts | `OWNER_SELECTABLE_MENU_LAYOUTS` excludes legacy tabs | `src/lib/menu/menuDesignPresets.ts` | Source-gated |
| Desktop controls | mood change resets to preferred compatible layout | `menuPageSettingsNew.tsx` | Source-gated |
| Mobile controls | same helper contracts and publish path | `MobileDesignEditorScreen.tsx` | Source-gated |
| Visual preset preview parity | desktop and mobile recommended-style cards use `MenuStylePresetPreview` | `src/components/shared/menuDesign/MenuStylePresetPreview.tsx` | Source-gated |
| Public output | normalized mood/layout, image caps, price visibility, category-tabs toggle | `menuPageNew.tsx` | Source-gated |
| Publish/cache path | `publishProject()` revalidates public menu/client cache | `src/database/projects/index.ts` | Source-gated |
| External release | External Certification Runbook, Digital Menu Output Constitution checks, browser/mobile customer-menu QA | audit/runbook | Pending |

---

## Related Documents

| Document                                   | Purpose                     |
| ------------------------------------------ | --------------------------- |
| `_spec.md`                                 | Product specification       |
| `b2c-view_mobile-support.md`               | Mobile parity boundary      |
| `_marketing.md`                            | Sales collateral            |
| `../assessments/assessment-11-b2c-view.md` | Original assessment         |
| `../../client-menu/`                       | Detailed B2C implementation |

---

## Recommendations & Future Improvements

### Code Quality Observations

| Finding             | Current State                              | Recommendation                   | Priority |
| ------------------- | ------------------------------------------ | -------------------------------- | -------- |
| **Memoization**     | MenuItem, styles, renderItems all memoized | ✅ Excellent performance         | -        |
| **Search Debounce** | 300ms debounce on search                   | ✅ Prevents excessive re-renders | -        |
| **Next.js Image**   | Using `fill` + `sizes` for responsive      | ✅ Optimized loading             | -        |
| **Framer Motion**   | `whileInView` for lazy animations          | ✅ Good performance pattern      | -        |
| **SEO**             | `generateMetadata` + Schema.org JSON-LD    | ✅ Proper implementation         | -        |

### Suggested Improvements

1. **Offline Support (PWA)**

   - **Current**: Requires network connection
   - **Suggested**: Service worker caching for viewed menus
   - **File**: `next.config.js` (next-pwa already in dependencies)
   - **Priority**: P2

2. **Analytics Integration**

   - **Current**: No tracking of menu views or popular items
   - **Suggested**: Track page views, item clicks, search terms
   - **File**: New analytics hook
   - **Priority**: P1

3. **Menu Item Deep Links**

   - **Current**: Can only link to menu page
   - **Suggested**: Allow linking to specific categories/items (`/menu/pizza-place#appetizers`)
   - **Priority**: P2

4. **Accessibility Audit**

   - **Current**: Basic ARIA labels implemented
   - **Suggested**: Full WCAG AA audit, especially for color contrast in custom themes
   - **Priority**: P1

5. **Image Lazy Loading Placeholder**
   - **Current**: Images show empty space while loading
   - **Suggested**: BlurHash or LQIP placeholders
   - **Priority**: P2

### Source Gate

Run `npm run verify:menu-design-presentation-boundary` after touching design-system helpers, desktop/mobile design controls, B2C public output, publish/cache code, or this doc set. This source gate is not current launch certification; release approval still needs the External Certification Runbook, Digital Menu Output Constitution checks, browser/mobile customer-menu QA, public cache/deploy evidence, and target production smoke.

### Technical Debt

| Item                                 | Description                                                   | Effort |
| ------------------------------------ | ------------------------------------------------------------- | ------ |
| `getAllCategories()`/`getAllItems()` | Not memoized, acceptable for typical sizes but could optimize | Low    |
| Console logs                         | Remove `console.log` statements                               | Low    |
| Browser visual QA                    | Source contrast guards exist; target browser/mobile customer-menu QA remains required | Medium |

---

_Document Status: Historical B2C view implementation evidence - not current launch certification_
