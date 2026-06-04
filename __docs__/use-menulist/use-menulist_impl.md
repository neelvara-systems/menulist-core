# Use MenuList — Technical Implementation

> **Version:** 1.1
> **Feature Flag:** `ENABLE_USE_MENULIST`
> **Last Updated:** June 3, 2026

## 1. Architecture

Use MenuList itself remains a UI aggregation layer. The hub adds no backend logic, no Firestore collections, and no Firebase cost delta. Complex child workflows linked from the hub, such as Menu Card Export and Print Assets, own their own route/API/data contracts and cost documentation.

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
    ├── generateMenuKit() → ZIP bundle (on-demand, client-side)
    ├── generateMenuKitAsset() → single printable/social file (on-demand, client-side)
    ├── generateBrandedQrCodeDataUrl() → branded standalone QR cards (on-demand, client-side)
    ├── generateBrandedFeedbackQrCode() → branded feedback QR card (on-demand, client-side)
    ├── generateMenuPdf() → branded Menu Card Export renderer bridge (on-demand, client-side)
    └── downloadMenuData() → XLSX/JSON export (on-demand, client-side)
```

All generated QR/card/PDF paths pass the already-loaded store `activePlanType` into the shared MenuList branding policy. Premium stores hide visible MenuList logo/name/domain attribution; Starter, Pro, missing, and unknown plan data keep it visible.

## 3. Data Contract

```typescript
interface UseMenuListData {
    // Links
    obpLink: string;          // {subdomain}.menulist.ai
    menuLink: string;         // {subdomain}.menulist.ai/{slug} or root if default
    storeMenuLink: string;    // {subdomain}.menulist.ai/menu stable store alias
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
 ├── QRSection              — Store Menu QR, Business Profile QR, Project Menu QR, outlet QRs
 ├── ScreensSection         — Menu Board + Highlights link cards
 ├── PrintSection           — Print Assets entry plus individual asset cards (table, counter, entrance, feedback, Print Menu, Menu Kit)
 ├── ExportSection          — XLSX/JSON backup downloads
 ├── POSSection             — POS provider setup summary + settings handoff
 └── ResourcesSection       — Setup/Printing/Sharing guide modals
```

Mobile implements the same owner output jobs in `src/components/mobile/screens/MobileShareScreen.tsx` using mobile cards and sheets:
- project/OBP/customer app/feedback link cards
- branded QR sheet for Store Menu, Business Profile, Project Menu, and outlet aliases
- Print Menu route entry, Menu Kit ZIP, print assets, social assets, and feedback QR downloads
- XLSX/JSON export from the selected project cache
- Menu Board and Highlights links from `getScreenState()`
- POS setup summary copy and mobile POS settings handoff
- setup, printing, and sharing guide sheets

`/use-menulist/print-assets` renders `UseMenuList` in focused `print-assets` mode on desktop. On handheld devices, the same path maps through `MobileShell` to the More tab `printAssets` sub-screen and reuses `MobileShareScreen` in focused mode. This keeps mobile data loading inside the existing mobile project provider and avoids desktop-route reload behavior.

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
| `src/lib/utils/feedbackQrCode.ts` | `generateBrandedFeedbackQrCode()`, `getFeedbackUrl()` |
| `src/lib/utils/qrCode.ts` | branded QR card generation + download helper |
| `src/lib/menu-kit/platformAttribution.ts`, `src/lib/platform/menuListBranding.ts` | shared MenuList logo/name/domain footer for generated QR, print, PDF, and public attribution outputs; hidden only for Premium stores |
| `src/lib/menu-kit/brandTokens.ts` | shared logo/color/QR readability tokens |
| `src/lib/menu-kit/menuKitGenerator.ts` | `generateMenuKit()` |
| `src/lib/export/menuPdfGenerator.ts` | `generateMenuPdf()` compatibility bridge into Menu Card Export |
| `src/components/templates/main-app/projects/utils/excelUtils.ts` | `downloadMenuData()` |
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
- Individual Menu Kit files generated by key through `generateMenuKitAsset()`, not by rendering the full ZIP first
- Direct PDF fallback generated on-demand through the Menu Card Export renderer bridge, not pre-loaded
- Branded standalone QR cards generated on-demand; no background generation or server upload
- Individual asset previews lazy-loaded
- Screen state fetched once via DAL
