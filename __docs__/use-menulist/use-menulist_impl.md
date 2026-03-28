# Use MenuList — Technical Implementation

> **Version:** 1.0
> **Feature Flag:** `ENABLE_USE_MENULIST`

## 1. Architecture

Pure UI aggregation layer. Zero new backend logic. Zero new Firestore collections. Zero Firebase cost delta.

The page reads existing data (store details, screen state, project metadata) and presents links/downloads using existing generators.

## 2. Data Flow

```
UseMenuListPage (client component)
    ├── Redux session (tId, sId, subdomain, customDomain)
    ├── getScreenState() → screen token
    ├── getActiveProject() → projectId for feedback QR
    ├── generateProjectUrl() → menu/OBP links
    ├── buildScreenUrl() → screen link
    ├── getFeedbackUrl() → feedback link
    └── generateMenuKit() → ZIP download (on-demand, client-side)
```

## 3. Data Contract

```typescript
interface UseMenuListData {
    // Links
    obpLink: string;          // {subdomain}.menulist.ai
    menuLink: string;         // {subdomain}.menulist.ai/{slug} or root if default
    feedbackLink: string;     // menulist.ai/feedback/{projectId}
    
    // Screen
    screenToken: string | null;
    menuBoardLink: string | null;    // menulist.ai/screen/{token}
    highlightsLink: string | null;   // menulist.ai/screen/{token}?mode=highlights
    screenLastSeenAt: any;
    
    // Store info
    storeName: string;
    storeLogo: string | null;
    subdomain: string;
    customDomain: string | null;
    businessType: string;
    
    // Project info
    projectId: string | null;
    projectName: string | null;
    isDefaultProject: boolean;
    menuModifiedOn: any;
    
    // States
    hasPublishedMenu: boolean;
    hasScreen: boolean;
    hasFeedbackEnabled: boolean;
}
```

## 4. Component Architecture

```
UseMenuListPage
 ├── HeaderStatus           — "Your menu is live and ready to share"
 ├── QuickActions           — Copy Menu Link, Open Menu, Copy Screen Link, Download Menu Kit
 ├── ShareSection           — OBP link card + Direct menu link card
 ├── ScreensSection         — Menu Board + Highlights link cards
 ├── PrintSection           — Individual asset cards (table, counter, entrance, feedback, PDF)
 └── ResourcesSection       — Setup/Printing/Sharing guide modals
```

## 5. Key Files

### New Files
| File | Lines (est) | Purpose |
|------|-------------|---------|
| `src/app/(main)/use-menulist/page.tsx` | ~15 | Page route wrapper |
| `src/components/templates/main-app/useMenuList/index.tsx` | ~250 | Main orchestrator |
| `src/components/templates/main-app/useMenuList/QuickActions.tsx` | ~100 | Top action buttons |
| `src/components/templates/main-app/useMenuList/ShareSection.tsx` | ~80 | Link cards |
| `src/components/templates/main-app/useMenuList/ScreensSection.tsx` | ~100 | Screen link cards |
| `src/components/templates/main-app/useMenuList/PrintSection.tsx` | ~150 | Asset download cards |
| `src/components/templates/main-app/useMenuList/ResourcesSection.tsx` | ~120 | Guide modals |
| `src/components/templates/main-app/useMenuList/types.ts` | ~40 | Shared types |

### Existing Files Modified
| File | Change |
|------|--------|
| `src/config/features.ts` | Add `ENABLE_USE_MENULIST` flag |
| `src/constants/navigations.ts` | Add route + sidebar entry |

### Existing Files Reused (No Changes)
| File | Reused For |
|------|-----------|
| `src/lib/utils/slugify.ts` | `generateProjectUrl()` |
| `src/lib/obp/generateOBPUrl.ts` | `generateOBPUrl()` |
| `src/lib/screen/utils.ts` | `buildScreenUrl()` |
| `src/lib/utils/feedbackQrCode.ts` | `generateFeedbackQrCode()`, `getFeedbackUrl()` |
| `src/lib/menu-kit/menuKitGenerator.ts` | `generateMenuKit()` |
| `src/lib/export/menuPdfGenerator.ts` | `generateMenuPdf()` |
| `src/database/campaigns/index.ts` | `getScreenState()` |
| `src/lib/menu-kit/businessTypeLabels.ts` | `getOfferingLabels()` |

## 6. State Management

No Redux changes. Uses existing:
- `useClientAuthSession()` — tId, sId, subdomain, customDomain
- `getScreenState()` — Screen token from DAL
- Store/project context from existing providers

## 7. Implementation Order

1. Feature flag + navigation entry
2. Types file
3. Main page component with data loading
4. QuickActions component
5. ShareSection component
6. ScreensSection component
7. PrintSection component (reuses Menu Kit generators)
8. ResourcesSection component
9. Mobile responsive testing

## 8. Performance

- Page load target: < 1 second
- No heavy computations on load
- Menu Kit ZIP generated on-demand (click), not pre-loaded
- Individual asset previews lazy-loaded
- Screen state fetched once via DAL
