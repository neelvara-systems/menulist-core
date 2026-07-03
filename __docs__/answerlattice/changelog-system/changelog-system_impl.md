# Changelog System — Technical Implementation Blueprint

> **Version:** 1.0.1
> **Last Updated:** 2026-06-30
> **Audience:** Developers
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Architecture Overview

The Changelog System is a **client-side DAL feature** with no API routes. All CRUD operations use Firestore client SDK via standard DAL pattern with `runTransaction` for atomic operations. Uses a paginated document model where multiple entries are stored per page document.

---

## 2. Complete File Map

### 2.1 Owner-Side Components

| File                                                                | Lines | Purpose                                                                                   |
| ------------------------------------------------------------------- | :---: | ----------------------------------------------------------------------------------------- |
| `src/components/templates/main-app/helpCenter/ChangelogView.tsx`    |  39   | Owner wrapper — fetches latest page via `useChangelogCache`, passes to `DisplayChangelog` |
| `src/components/templates/main-app/helpCenter/landing/WhatsNew.tsx` |   —   | Landing page widget — shows recent changelog entries                                      |

### 2.2 Platform Admin + Display Components

| File                                                                    | Lines | Purpose                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------- | :---: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/templates/platform/changelog/displayChangelog.tsx`      |  282  | Timeline display — Hero banner with animated gradient, timeline axis (date column 120px + dot axis + content), InfiniteScroll for older pages, sidebar (280px) with search + tag filter. Framer Motion animations. Uses `useChangelogCache` for initial load.                                                                                                                                     |
| `src/components/templates/platform/changelog/addEditChangelog.tsx`      |  333  | Create/edit drawer (720px) — Form: title, TipTap editor, tags (multi-select with icons), published toggle, release date+time (DatePicker+TimePicker), version, KB article references (KbTreeSelect), YouTube embeds (add/preview/remove), file attachments (PasteUpload, max 4). Handles both create (`addChangelogEntry`) and update (`updateChangelogEntry`).                                   |
| `src/components/templates/platform/changelog/ChangelogPreview.tsx`      |   —   | Entry preview — renders TipTap content, tags, files, YouTube embeds, KB references, likes/dislikes                                                                                                                                                                                                                                                                                                |
| `src/components/templates/platform/changelog/ChangelogTagRenderer.tsx`  |   —   | Tag display with icon and color from `CHANGELOG_TAG_CONFIG`                                                                                                                                                                                                                                                                                                                                       |
| `src/components/templates/platform/changelog/index.tsx`                 |  220  | **Platform admin CRUD** — Changelog Management page with Steps timeline, InfiniteScroll for older entries, add/edit/delete actions per entry. Uses `fetchLatestChangelogPage()` + `loadOlderChangelogPage()`. Preview modal with `DisplayChangelog`. Per-entry actions: view preview, edit (opens AddEditChangelog drawer), delete (with confirmation). Sorts entries by `releasedOn` descending. |
| `src/components/templates/platform/changelog/AnimatedVersionNumber.tsx` |   —   | Animated version number watermark displayed in the date column of timeline entries                                                                                                                                                                                                                                                                                                                |
| `src/components/templates/platform/changelog/KbTreeSelect.tsx`          |   —   | Tree select component for linking changelog entries to KB articles (categories → sections → articles hierarchy)                                                                                                                                                                                                                                                                                   |
| `src/components/templates/platform/changelog/utils.ts`                  |   —   | Changelog utility functions                                                                                                                                                                                                                                                                                                                                                                       |

### 2.3 Database Layer

**File:** `src/database/changelog/index.ts` (317 lines)

| Function                                                            | Reads | Writes | Notes                                                                                                                                                                     |
| ------------------------------------------------------------------- | :---: | :----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addChangelogEntry(entryPayload)`                                   |  1-2  |   1    | **Transaction:** Find latest page → estimate size → append to current page OR create new page. Handles file uploads before transaction. Auto-generates UUID for entry ID. |
| `fetchLatestChangelogPage()`                                        |   1   |   0    | Query: `orderBy('pageNumber', 'desc'), limit(1)`                                                                                                                          |
| `loadOlderChangelogPage(currentPageNumber)`                         |   1   |   0    | Query: `pageNumber < current, orderBy('pageNumber', 'desc'), limit(1)`                                                                                                    |
| `updateChangelogFeedback(pageId, entryId, feedbackType, increment)` |   1   |   1    | **Transaction:** Read page → find entry → update likes/dislikes → write back                                                                                              |
| `deleteChangelogEntry(entryId)`                                     |   N   |   1    | **Transaction:** Find page containing entry (via `entryIds array-contains`) → filter out entry → update page                                                              |
| `updateChangelogEntry(entryId, updatedPayload)`                     |   N   |   1    | **Transaction:** Find page → find entry index → merge update → write back. Handles file uploads before transaction.                                                       |

**Content Feedback DAL:** `src/database/contentFeedback/index.ts` (68 lines)

| Function                                                       | Reads | Writes | Notes                                                                                                                                                                         |
| -------------------------------------------------------------- | :---: | :----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addContentFeedback('changelog', entryId, comment, sentiment)` |   1   |   1    | **Transaction:** Reads/creates feedback doc at `changelog_feedback/{tId}/{sId}/doc1_{entryId}`. Sanitizes comment (500 char max). Appends to `list` array or creates new doc. |

**Changelog Feedback:** `src/database/changelog/feedback.ts` — Additional feedback utilities.

### 2.4 Types

**File:** `src/types/changelog.ts` (35 lines)

- `ChangelogEntry` — id, title, description (TipTap JSON), tags[], releasedOn, published, version, likes, dislikes, files[], kbSources[], youtubeLinks[]
- `ChangelogPage` — id, pageNumber, nextPageId, entries[], entryIds[], approxSizeBytes

### 2.5 Constants

**File:** `src/constants/changelog.ts`

- `CHANGELOG_TAG_OPTIONS` — Available tag strings
- `CHANGELOG_TAG_CONFIG` — Map of tag → { icon, color } for display

### 2.6 Hook

**File:** `src/hooks/useChangelogCache.ts`

- `getItem()` — Returns cached latest page or fetches from Firestore
- Uses `PlatformGlobalDataContext` for session-level caching
- Failed cache fetches use bounded `answerlattice_changelog_cache_fetch_failed` diagnostics; normal cache hit/miss/clear paths stay quiet.
- `src/components/templates/platform/changelog/displayChangelog.tsx` keeps its last-viewed timestamp in browser `localStorage` only. Blocked read/write attempts use fixed `platform_changelog_last_viewed_read_failed` and `platform_changelog_last_viewed_write_failed` runtime diagnostics with static surface metadata; they do not log changelog content, entry IDs, browser storage values, or user payload.
- When product surfaces are enabled, `src/components/templates/platform/changelog/addEditChangelog.tsx` awaits `rebuildProductSurfaceContentSummaryWithDiagnostics()` after a confirmed add/update and before success copy. Refresh failures log `answerlattice_changelog_summary_refresh_after_create_failed` or `answerlattice_changelog_summary_refresh_after_update_failed` with bounded entry/title/version metadata and show fixed contextual-help refresh warning copy. Surface-option load failures log `answerlattice_changelog_surface_options_load_failed`.
- `src/components/templates/platform/changelog/ChangelogPreview.tsx` keeps KB-category cache prefetch best-effort, but blocked prefetches now log `answerlattice_changelog_preview_kb_categories_prefetch_failed` with bounded changelog entry/page metadata instead of disappearing.

---

## 3. Data Flow

### 3.1 Owner Viewing Changelog

```
ChangelogView mount
  → useChangelogCache.getItem() → check context cache
  → [Cached] Return cached page
  → [Not cached] fetchLatestChangelogPage() → 1 Firestore read
  → Pass pageData to DisplayChangelog
  → Render timeline with entries
  → User scrolls → InfiniteScroll triggers loadMore()
  → loadOlderChangelogPage(currentPageNumber) → 1 read
  → Append older entries to list
```

### 3.2 Admin Creating Entry

```
AddEditChangelog form submit → handleSave()
  → Upload attachments (convert to base64 for new files, keep URLs for existing)
  → Build entryPayload with Timestamp.fromDate(), kbSources, youtubeLinks
  → addChangelogEntry(entryPayload) [DAL — Transaction]:
    1. Upload files via uploadImage() (before transaction)
    2. Find latest page: query orderBy pageNumber desc, limit 1
    3. Generate UUID for entry ID
    4. Estimate combined size with new entry
    5. If < 900KB: append entry to current page's entries array (newest first)
    6. If ≥ 900KB: create new page with pageNumber+1, link to current page
    7. requestBodyComposer adds timestamps
  → onSave callback updates parent state
```

### 3.3 Admin Editing Entry

```
AddEditChangelog form submit → handleSave() (with initialData)
  → updateChangelogEntry(entryId, updatedPayload) [DAL — Transaction]:
    1. Upload new files via uploadImage()
    2. Find page containing entry: query where entryIds array-contains entryId
    3. Find entry index in entries array
    4. Merge update: { ...existing, ...updatedPayload }
    5. requestBodyComposer adds modifiedOn/modifiedBy
    6. Write back updated entries array
```

### 3.4 Feedback (Like/Dislike)

```
ChangelogPreview → click like/dislike
  → updateChangelogFeedback(pageId, entryId, 'like'/'dislike', true) [Transaction]:
    1. Read page document
    2. Find entry by ID
    3. Increment/decrement likes or dislikes (min 0)
    4. Write back updated entries array
```

---

## 4. Paginated Document Model (Detailed)

### Size Estimation

```typescript
async function estimateSizeBytes(obj: any): Promise<number> {
  try {
    return new Blob([JSON.stringify(obj)]).size; // More accurate for UTF-8
  } catch {
    return JSON.stringify(obj).length; // Fallback
  }
}
```

### Page Size Limit

```typescript
const PAGE_SIZE_LIMIT = 900_000; // 900 KB safety margin (Firestore max: 1 MB)
```

### Page ID Format

```typescript
const newPageId = `page_${String(newPageNumber).padStart(6, "0")}`;
// page_000001, page_000002, etc.
```

### Linked List Navigation

- Latest page: `orderBy('pageNumber', 'desc'), limit(1)`
- Older page: `where('pageNumber', '<', current), orderBy('pageNumber', 'desc'), limit(1)`
- Each page has `nextPageId` pointing to the previous (older) page
- `nextPageId: null` means this is the oldest page

---

## 5. Collection Paths

| Collection         | Path                                            | Purpose                          |
| ------------------ | ----------------------------------------------- | -------------------------------- |
| Changelog pages    | `changelog/{tId}/{sId}/page_XXXXXX`             | Paginated entry documents        |
| Changelog feedback | `changelog_feedback/{tId}/{sId}/doc1_{entryId}` | Entry-specific feedback comments |

---

## 6. Dependencies

| Dependency                                | Usage                                               |
| ----------------------------------------- | --------------------------------------------------- |
| `@database/changelog`                     | All changelog DAL functions                         |
| `@database/contentFeedback`               | `addContentFeedback('changelog', ...)`              |
| `@database/storage/uploadBase64ToStorage` | File uploads                                        |
| `@lib/storage/pathGenerator`              | `generateStoragePath()` for tenant-scoped paths     |
| `@lib/apiHelper`                          | `requestBodyComposer`                               |
| `@lib/auth/getActiveSession`              | Session retrieval in DAL                            |
| `@lib/tiptap`                             | `getTextFromTiptapJson()` for search                |
| `@lib/sanitization`                       | `sanitizeFeedbackComment()`                         |
| `@hook/useChangelogCache`                 | Caching hook                                        |
| `@constant/changelog`                     | Tag options and config                              |
| `@atoms/TiptapEditor`                     | Rich text editor                                    |
| `@atoms/PasteUpload`                      | File upload with paste support                      |
| `@atoms/AnimatedGradientBubbles`          | Hero banner decoration                              |
| `react-infinite-scroll-component`         | Infinite scroll                                     |
| `framer-motion`                           | Timeline animations                                 |
| `dayjs`                                   | Date/time picker (Ant Design DatePicker dependency) |

---

## 7. Identified Issues

| #   | Issue                                                                                      | Severity   | File:Line                                             | Notes                                              |
| --- | ------------------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------- | -------------------------------------------------- |
| 1   | `console.error` used instead of `secureError`                                              | Low        | `displayChangelog.tsx:99`, `addEditChangelog.tsx:188` | Debug logging                                      |
| 2   | Search only works on loaded entries (not across all pages)                                 | By Design  | `displayChangelog.tsx:67`                             | Paginated search would need different architecture |
| 3   | Published flag exists on entries but not filtered in display                               | Low        | —                                                     | All entries shown regardless of published status   |
| 4   | Delete doesn't compact pages (pages may have empty entries arrays)                         | Acceptable | —                                                     | Pages accumulate normally                          |
| 5   | `getCollectionRef` uses `session.tId/sId` — requires active session for subcollection path | By Design  | `changelog/index.ts:75`                               | Tenant+store scoping                               |
| 6   | No pagination on page queries (loads all matching pages)                                   | Low        | —                                                     | Infinite scroll loads one page at a time           |

---

## 8. Reverse Engineering Validation

| Category            |         Count         |  Verified   |
| ------------------- | :-------------------: | :---------: |
| Owner components    |           2           |     ✅      |
| Platform components |          4+           |     ✅      |
| DAL files           |    3 (7 functions)    |     ✅      |
| Types               | 1 file (2 interfaces) |     ✅      |
| Constants           |        1 file         |     ✅      |
| Hooks               |           1           |     ✅      |
| Pages               |       2 routes        |     ✅      |
| **Total**           |     **14+ items**     | **✅ 100%** |
