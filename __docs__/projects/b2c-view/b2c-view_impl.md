# B2C View — Implementation

**Feature:** Customer-Facing Digital Menu  
**Status:** ✅ Production Ready  
**Last Updated:** January 2026

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

## File Structure

```
src/
├── app/(website)/menu/[projectId]/
│   └── page.tsx                    # Menu page with generateMetadata
│
└── components/templates/main-app/projects/
    └── b2cView/                    # 30+ files
        ├── index.tsx               # Main B2C container
        ├── homePage/               # Homepage components
        ├── menuPage/               # Menu display components
        │   └── menuLayout.tsx      # Core menu layout (memoized)
        ├── layouts/                # Layout templates
        ├── components/             # Shared components
        └── shareModal/             # Share/QR functionality
```

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

## Theme System

### ThemeConfig Type

```typescript
interface ThemeConfig {
  homePage: {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    logoUrl?: string;
    coverImageUrl?: string;
  };
  menuPage: {
    backgroundColor: string;
    textColor: string;
    categoryColor: string;
    priceColor: string;
    fontFamily: string;
    layout: "grid" | "list" | "horizontal";
  };
}
```

### Layout Components

```typescript
// Grid layout
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</div>

// List layout
<div className="flex flex-col space-y-4">
  {items.map(item => <ItemRow key={item.id} item={item} />)}
</div>

// Horizontal tabs
<Tabs>
  {categories.map(cat => (
    <TabPane tab={cat.name} key={cat.id}>
      {/* Items */}
    </TabPane>
  ))}
</Tabs>
```

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

| Requirement        | Implementation              | Location               | Status |
| ------------------ | --------------------------- | ---------------------- | ------ |
| MenuItem memoized  | React.memo + custom compare | menuLayout.tsx:51-156  | ✅     |
| Styles memoized    | useMemo                     | menuLayout.tsx:176-255 | ✅     |
| Search debounced   | 300ms debounce              | menuLayout.tsx:167-172 | ✅     |
| Next.js Image      | fill + sizes                | menuLayout.tsx:84-93   | ✅     |
| Framer Motion lazy | whileInView                 | menuLayout.tsx:58-59   | ✅     |
| generateMetadata   | Dynamic SEO                 | page.tsx               | ✅     |
| Schema.org JSON-LD | Restaurant/Menu             | page.tsx               | ✅     |
| Accessibility      | role, tabIndex, aria-label  | menuLayout.tsx         | ✅     |

---

## Related Documents

| Document                                   | Purpose                     |
| ------------------------------------------ | --------------------------- |
| `_spec.md`                                 | Product specification       |
| `_marketing.md`                            | Sales collateral            |
| `../Assessments/ASSESSMENT-11-B2C-VIEW.md` | Original assessment         |
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

### Technical Debt

| Item                                 | Description                                                   | Effort |
| ------------------------------------ | ------------------------------------------------------------- | ------ |
| `getAllCategories()`/`getAllItems()` | Not memoized, acceptable for typical sizes but could optimize | Low    |
| Console logs                         | Remove `console.log` statements                               | Low    |
| Theme validation                     | No contrast ratio validation for custom themes                | Medium |

---

_Document Status: ✅ PRODUCTION READY_
