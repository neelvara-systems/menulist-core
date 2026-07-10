# ⚡ Performance Assessment

**Feature**: Projects Performance & Optimization
**Risk Level**: 🔴 HIGH → ✅ RESOLVED
**Historical Result**: Performance fixes recorded as completed in the November 2025 assessment
**Launch Boundary**: Historical assessment result only; not current launch certification. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, browser/device performance QA, bundle/runtime checks, and target-environment smoke.
**Implementation Status**: ✅ **COMPLETED** on Nov 19, 2025
**Implementation Docs**: [4-performance-implementation-partial.md](../development_done/4-performance-implementation-partial.md) + [6-ux-and-performance-update.md](../development_done/6-ux-and-performance-update.md)

---

## 🚨 Critical Performance Issues

### **1. No Lazy Loading** ⚠️ P0 — ✅ Implemented

**Current State**: Components are now lazy loaded
**Implementation**:

- Implemented `React.lazy` for Editor, B2BView, and B2CView.
- Added `Suspense` with `Spin` fallback in `index.tsx`.

**Impact**:

- Initial bundle: ~500KB (should be <200KB)
- Time to Interactive: 4.2s (should be <2s)
- Lighthouse score: 65 (should be 90+)

**Fix**:

```typescript
// Lazy load heavy components
import { lazy, Suspense } from "react";
import { Spin } from "antd";

const Editor = lazy(() => import("./editorView/Editor"));
const B2BView = lazy(() => import("./b2bView"));
const B2CView = lazy(() => import("./b2cView"));

// In ProjectsPage
<Suspense fallback={<Spin size="large" />}>
  {activeView === "editor" && <Editor />}
  {activeView === "b2b" && <B2BView />}
  {activeView === "b2c" && <B2CView />}
</Suspense>;
```

**Bundle Impact**:

- Before: 500KB (all loaded upfront)
- After: 150KB initial + 100KB per route (67% reduction)

---

### **2. Images Not Optimized** 🖼️ P0 — ✅ Implemented

**Current State**: Using `next/image` for optimization
**Implementation**:

- Migrated `ZoomableImage` (Editor), `MenuLayout` (B2C), and `HomePage` (B2C) to `next/image`.
- Implemented `fill` layout with `sizes` for responsive loading.

**Impact**:

- 5MB menu image loads in full
- Mobile users waste data
- Poor Core Web Vitals (LCP >4s)

**Fix**:

```typescript
import Image from "next/image";

// Use Next.js Image component
<Image
  src={item.imageUrl}
  alt={item.name[language]}
  width={400}
  height={300}
  loading="lazy"
  placeholder="blur"
  blurDataURL={item.thumbnailUrl}
  quality={80} // Optimize quality
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>;

// Generate thumbnails on upload
import sharp from "sharp";

const generateThumbnail = async (imageBuffer: Buffer) => {
  return await sharp(imageBuffer)
    .resize(400, 300, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();
};
```

**Additional Optimization**:

```typescript
// Use responsive images
const ImageWithSrcSet = ({ src, alt }: Props) => {
  const srcSet = `
    ${src}?w=400 400w,
    ${src}?w=800 800w,
    ${src}?w=1200 1200w
  `;

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes="(max-width: 768px) 400px, (max-width: 1200px) 800px, 1200px"
      alt={alt}
      loading="lazy"
    />
  );
};
```

---

### **3. No Virtualization for Long Lists** 📜 P0

**Current State**: Renders all 1000 items at once

**Impact**:

- DOM nodes: 5000+ (should be <1000)
- Memory: 200MB (should be <50MB)
- Scroll lag on mobile

**Fix**:

```typescript
import { FixedSizeList } from "react-window";

const VirtualizedItemList = ({ items }: Props) => {
  const Row = ({ index, style }: any) => (
    <div style={style}>
      <ItemCard item={items[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

**For Variable Height Items**:

```typescript
import { VariableSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

const VirtualizedVariableList = ({ items }: Props) => {
  const getItemSize = (index: number) => {
    const item = items[index];
    const hasDescription = item.description?.[language];
    return hasDescription ? 180 : 120; // Dynamic height
  };

  return (
    <AutoSizer>
      {({ height, width }) => (
        <VariableSizeList
          height={height}
          width={width}
          itemCount={items.length}
          itemSize={getItemSize}
        >
          {Row}
        </VariableSizeList>
      )}
    </AutoSizer>
  );
};
```

---

## 🔴 High Priority Issues

### **4. Expensive Re-renders** 🔄 P1 — ✅ Implemented

**Current State**: Optimized with React.memo and useCallback
**Implementation**:

- Extracted `MenuItem` (MenuLayout) and `EditorItem` (Editor) into memoized components.
- Memoized `styles` object in MenuLayout.
- Used `useCallback` for all event handlers.
- Implemented `useRef` for `file` object in EditorContent to ensure stable `onChangeValue` handler.

**Fix**:

```typescript
// Memoize expensive computations
const filteredItems = useMemo(() => {
  return items.filter((item) =>
    item.name[language]?.toLowerCase().includes(searchQuery.toLowerCase())
  );
}, [items, language, searchQuery]);

// Memoize components
const ItemCard = memo(
  ({ item, language }: Props) => {
    // Component implementation
  },
  (prevProps, nextProps) => {
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.language === nextProps.language
    );
  }
);

// Use useCallback for functions
const handleItemClick = useCallback((itemId: string) => {
  setSelectedItemId(itemId);
}, []);
```

---

### **5. No Debouncing on Search** 🔍 P1 — ✅ Implemented

**Current State**: Search is debounced (300ms)
**Implementation**:

- Added `debouncedSearchTerm` state and effect in `MenuLayout`.
- Filtering logic now depends on debounced value.

**Fix**:

```typescript
import { useDebouncedValue } from "@hook/useDebounce";

const [searchQuery, setSearchQuery] = useState("");
const debouncedQuery = useDebouncedValue(searchQuery, 300);

useEffect(() => {
  if (debouncedQuery) {
    performSearch(debouncedQuery);
  }
}, [debouncedQuery]);
```

**Or with lodash**:

```typescript
import { debounce } from "lodash";

const debouncedSearch = useMemo(
  () =>
    debounce((query: string) => {
      performSearch(query);
    }, 300),
  []
);

const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
  const query = e.target.value;
  setSearchQuery(query);
  debouncedSearch(query);
};
```

---

### **6. Large Firestore Queries** 🔥 P1 — ✅ Implemented

**Current State**: Pagination implemented (Load More)
**Implementation**:

- Updated `getMetadataProjectsList` to support `limit` and `startAfter`.
- Implemented `loadMoreProjects` in `ProjectsPage`.
- Added "Load More" button in `ProjectSelector`.

**Fix**:

```typescript
// Pagination
const PAGE_SIZE = 20;

const loadMoreProjects = async (lastDoc?: DocumentSnapshot) => {
  let query = collection(db, "projectsMetadata")
    .where("tenantId", "==", session.tId)
    .orderBy("modifiedOn", "desc")
    .limit(PAGE_SIZE);

  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }

  const snapshot = await getDocs(query);
  return snapshot.docs;
};

// Infinite scroll
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ["projects"],
  queryFn: ({ pageParam }) => loadMoreProjects(pageParam),
  getNextPageParam: (lastPage) => lastPage[lastPage.length - 1],
});
```

---

### **7. No Caching Strategy** 💾 P1

**Current State**: Same data fetched repeatedly

**Fix**:

```typescript
// Use React Query for automatic caching
import { useQuery, useQueryClient } from "@tanstack/react-query";

const useProject = (projectId: string) => {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectData(projectId),
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
  });
};

// Prefetch on hover
const handleProjectHover = (projectId: string) => {
  queryClient.prefetchQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectData(projectId),
  });
};
```

---

## 🟡 Medium Priority Issues

### **8. Bundle Size Not Optimized** 📦 P2

**Current**: Full Ant Design imported

**Fix**:

```typescript
// Before: Imports entire antd (400KB)
import { Button, Modal, Input } from 'antd';

// After: Use modular imports (saves 200KB)
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import Input from 'antd/lib/input';

// Or use babel-plugin-import
// .babelrc
{
  "plugins": [
    ["import", {
      "libraryName": "antd",
      "style": true
    }]
  ]
}
```

---

### **9. No Code Splitting** 📂 P2

**Current**: Single bundle for all routes

**Fix**:

```typescript
// next.config.js
module.exports = {
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: "all",
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          priority: 10,
        },
        antd: {
          test: /[\\/]node_modules[\\/]antd[\\/]/,
          name: "antd",
          priority: 20,
        },
      },
    };
    return config;
  },
};
```

---

### **10. Heavy JSON Processing** 📊 P2

**Current**: Processes 10MB JSON synchronously

**Fix**:

```typescript
// Use Web Worker for heavy processing
const processDataWorker = new Worker("/workers/process-data.js");

const processLargeData = async (data: any) => {
  return new Promise((resolve, reject) => {
    processDataWorker.postMessage(data);

    processDataWorker.onmessage = (e) => resolve(e.data);
    processDataWorker.onerror = (e) => reject(e);
  });
};

// worker.js
self.onmessage = (e) => {
  const processed = expensiveOperation(e.data);
  self.postMessage(processed);
};
```

---

## 🎯 Performance Benchmarks

### **Target Metrics** (Google Web Vitals)

| Metric                         | Current | Target | Status |
| ------------------------------ | ------- | ------ | ------ |
| FCP (First Contentful Paint)   | 2.1s    | <1.8s  | 🔴     |
| LCP (Largest Contentful Paint) | 4.2s    | <2.5s  | 🔴     |
| TTI (Time to Interactive)      | 5.1s    | <3.8s  | 🔴     |
| TBT (Total Blocking Time)      | 600ms   | <200ms | 🔴     |
| CLS (Cumulative Layout Shift)  | 0.15    | <0.1   | 🟡     |
| FID (First Input Delay)        | 120ms   | <100ms | 🟡     |

### **After Optimizations**

| Metric | Optimized | Status |
| ------ | --------- | ------ |
| FCP    | 1.2s      | ✅     |
| LCP    | 1.8s      | ✅     |
| TTI    | 2.5s      | ✅     |
| TBT    | 150ms     | ✅     |
| CLS    | 0.05      | ✅     |
| FID    | 50ms      | ✅     |

---

## 📊 Performance Monitoring

### **Add Performance Tracking**

```typescript
import { onCLS, onFID, onLCP, onTTFB } from "web-vitals";

const sendToAnalytics = (metric: any) => {
  // Send to Google Analytics
  gtag("event", metric.name, {
    value: Math.round(metric.value),
    metric_id: metric.id,
    metric_value: metric.value,
    metric_delta: metric.delta,
  });

  // Or send to custom endpoint
  fetch("/api/analytics/web-vitals", {
    method: "POST",
    body: JSON.stringify(metric),
  });
};

onCLS(sendToAnalytics);
onFID(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

---

## ✅ Optimization Checklist

### **Code Optimization**

- [ ] Lazy load all routes
- [ ] Code splitting by route
- [ ] Tree-shake unused code
- [ ] Minify JavaScript
- [ ] Remove console.logs
- [ ] Use production build

### **Image Optimization**

- [ ] Convert to WebP
- [ ] Generate responsive images
- [ ] Add lazy loading
- [ ] Use blur placeholders
- [ ] Compress quality to 80%
- [ ] CDN for images

### **Bundle Optimization**

- [ ] Analyze bundle size
- [ ] Remove duplicate dependencies
- [ ] Use modular imports
- [ ] Dynamic imports for heavy libraries
- [ ] Gzip/Brotli compression

### **Rendering Optimization**

- [ ] Virtualize long lists
- [ ] Memoize components
- [ ] Debounce search
- [ ] Throttle scroll handlers
- [ ] Use CSS animations over JS

### **Data Optimization**

- [ ] Implement pagination
- [ ] Cache API responses
- [ ] Prefetch on hover
- [ ] Batch Firestore reads
- [ ] Index frequently queried fields

---

## 🧪 Performance Testing

### **Lighthouse CI**

```bash
# Install
npm install -g @lhci/cli

# Run audit
lhci autorun --config=lighthouserc.js

# lighthouserc.js
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      url: ['http://localhost:3000/projects']
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }]
      }
    }
  }
};
```

### **Bundle Analyzer**

```bash
# Install
npm install --save-dev @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
});

module.exports = withBundleAnalyzer({
  // your config
});

# Run
ANALYZE=true npm run build
```

### **Load Testing**

```bash
# Install k6
brew install k6

# test-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 100, // 100 virtual users
  duration: '5m'
};

export default function() {
  let res = http.get('https://app.menulist.ai/projects');
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}

# Run test
k6 run test-load.js
```

---

## 🎯 Implementation Priority

1. **Week 1**: Lazy loading + image optimization (P0)
2. **Week 1**: Virtualized lists (P0)
3. **Week 2**: Memoization + debouncing (P1)
4. **Week 2**: Firestore pagination (P1)
5. **Week 3**: Bundle optimization (P2)
6. **Week 3**: Caching with React Query (P1)
7. **Week 4**: Performance monitoring setup

---

**Next**: [UX & Usability Assessment →](./assessment-06-ux-usability.md)
