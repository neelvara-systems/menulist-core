# Changelog System — Product Specification

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** CEO, PM, Clients
> **Source:** Codebase forensic audit (code is truth)

---

## 1. Executive Summary

### Goal

Provide a release notes system where platform administrators publish changelog entries (features, improvements, fixes) and SMB owners browse them in a rich timeline view with search, filtering, and feedback.

### Scope

- Rich text entries with TipTap editor (JSON content)
- Tag categorization with color-coded icons
- Version numbers and release dates
- File attachments (images, documents — max 4 per entry)
- YouTube video embeds
- KB article references (link changelog to related help articles)
- Published/unpublished toggle
- Paginated document model (~900KB page limit with auto-rollover)
- Infinite scroll with older page loading
- Search (title + description text)
- Tag-based filtering with sidebar
- Timeline visualization with animated version numbers
- Entry feedback: likes/dislikes + detailed comments
- Tenant+Store scoped (each store has own changelog)

### Out of Scope

- Email/push notifications for new changelog entries
- RSS feed
- Changelog widget for embedding outside dashboard
- Scheduled publishing (future date auto-publish)
- Multi-language entries

---

## 2. User Roles

### 2.1 SMB Owner (Changelog Reader)

**Access:** `/help-center` → "What's New" tab, OR Help Center landing → "What's New" section
**Can do:**

- Browse changelog in timeline view
- Search entries by title and description
- Filter by tags (sidebar)
- Infinite scroll for older entries
- Like/dislike entries
- Add feedback comments
- View file attachments and YouTube embeds
- Click KB article references

### 2.2 Platform Administrator

**Access:** `/platform/changelog`
**Can do:**

- Create new changelog entries (drawer form)
- Edit existing entries
- Delete entries
- Set published/unpublished status
- Assign tags, version numbers, release dates
- Attach files (drag-and-drop + paste, max 4)
- Embed YouTube videos (multiple per entry)
- Link to KB articles (category/section/article tree select)
- View all entries in timeline + manage

---

## 3. Entry Structure

| Field                | Type                                     | Required | Description                       |
| -------------------- | ---------------------------------------- | :------: | --------------------------------- |
| id                   | string                                   |    ✅    | UUID (generated on creation)      |
| title                | string                                   |    ✅    | Entry headline                    |
| description          | TipTap JSON                              |    ✅    | Rich text content                 |
| tags                 | string[]                                 |    ❌    | Categorization tags               |
| releasedOn           | Timestamp                                |    ✅    | Release date+time                 |
| published            | boolean                                  |    ❌    | Visibility toggle (default: true) |
| version              | string                                   |    ❌    | Version number (e.g., "1.2.0")    |
| files                | UserUploadedFileType[]                   |    ❌    | Attachments (max 4)               |
| youtubeLinks         | string[]                                 |    ❌    | Embedded YouTube video URLs       |
| kbSources            | { categoryId, sectionId?, articleId? }[] |    ❌    | KB article references             |
| likes                | number                                   |    ❌    | Positive feedback count           |
| dislikes             | number                                   |    ❌    | Negative feedback count           |
| createdOn/modifiedOn | Timestamp                                |   Auto   | Via requestBodyComposer           |
| createdBy/modifiedBy | string                                   |   Auto   | Via requestBodyComposer           |

---

## 4. Paginated Document Model

### Architecture

Entries are NOT stored as individual Firestore documents. Instead, they're grouped into **page documents**:

```
changelog/{tId}/{sId}/
  └── page_000001  (newest entries, up to ~900KB)
  └── page_000002  (older entries)
  └── page_000003  (oldest entries)
```

### Page Structure

| Field                | Type             | Description                                 |
| -------------------- | ---------------- | ------------------------------------------- | -------------------------------- |
| pageNumber           | number           | Sequential page number (1 = first/oldest)   |
| nextPageId           | string           | null                                        | Link to older page (linked list) |
| entries              | ChangelogEntry[] | Array of entries (newest first within page) |
| entryIds             | string[]         | Flat array of entry IDs for quick lookup    |
| approxSizeBytes      | number           | Estimated document size                     |
| createdOn/modifiedOn | Timestamp        | Page timestamps                             |

### Page Rollover Logic

1. New entry → find latest page (highest pageNumber)
2. Estimate combined size (existing entries + new entry)
3. If < 900KB → append to current page
4. If ≥ 900KB → create new page with `pageNumber + 1`

All operations use Firestore `runTransaction` for atomicity.

---

## 5. Timeline Display

### Visual Layout

```
┌──────────┬───┬────────────────────────────────┐
│ Date     │ · │  Entry Title                    │
│ Version  │ │ │  [Tags]                         │
│          │ │ │  Description...                  │
│          │ │ │  [Attachments] [YouTube]         │
│          │ │ │  [KB References]                 │
│          │ │ │  [Likes/Dislikes]                │
├──────────┤ │ ├────────────────────────────────┤
│ Date     │ · │  Next Entry...                  │
│ Version  │   │                                 │
└──────────┴───┴────────────────────────────────┘
         ↑ Timeline axis (continuous vertical line with dots)
```

- Left column (120px): Release date, version number, animated version watermark
- Center: Timeline axis with dots per entry
- Right column (flex): Entry content with ChangelogPreview component
- Gradient background on date column based on first tag's color
- Framer Motion animations (stagger children, spring transitions)
- Infinite scroll via `react-infinite-scroll-component`
- Sidebar (280px): Search input + tag filter list

---

## 6. Feedback System

### Likes/Dislikes

- Stored directly on entry within the page document
- `updateChangelogFeedback(pageId, entryId, type, increment)` — Transaction-based
- Increment/decrement with `Math.max(0, ...)` floor

### Detailed Comments

- Stored in separate collection: `changelog_feedback/{tId}/{sId}/doc1_{entryId}`
- Each feedback: comment text (sanitized, max 500 chars), sentiment (like/dislike), timestamp, userId
- Transaction-based: first comment creates doc, subsequent appends to `list` array

---

## 7. Caching Strategy

`useChangelogCache` hook provides session-level caching:

- Caches latest changelog page via `PlatformGlobalDataContext`
- Prevents re-fetch on every tab switch
- Older pages loaded on demand via `loadOlderChangelogPage()`

---

## 8. Risks & Open Questions

| #   | Item                                                                | Status                                                            |
| --- | ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | Page document could hit 1MB with many large entries                 | Mitigated — 900KB rollover limit                                  |
| 2   | No entry-level published filter — all entries in page are shown     | By design — published flag exists but not filtered in display     |
| 3   | Delete entry removes from page but doesn't compact pages            | Acceptable — pages may have gaps                                  |
| 4   | Search is client-side on loaded entries only (not across all pages) | By design — paginated search would require different architecture |
| 5   | No notification system for new changelog entries                    | Not implemented                                                   |
| 6   | `console.error` used instead of `secureError`                       | ✅ RESOLVED — 7x console.error removed across 4 files             |

---

## 9. STEP 9C Audit (2026-03-04)

### Bugs Fixed

- Removed 3x `console.error` from `changelog/index.tsx` (fetch, load more, delete)
- Removed 2x `console.error` from `displayChangelog.tsx` (fetch, load more)
- Removed `console.error` from `addEditChangelog.tsx` (save)
- Removed `console.error` from `KbTreeSelect.tsx` (KB categories fetch)

### Additional Bug Fixed (REDO)

- Removed `console.error` from `ChangelogView.tsx` (owner-side fetch error)

### Industry Best Practices Comparison (Step D Web Search)

Sources: Beamer, Featurebase, Appcues, Archbee

| Industry Feature                   | Our Status                                 | Gap?                                                |
| ---------------------------------- | ------------------------------------------ | --------------------------------------------------- |
| Rich text entries with media       | ✅ TipTap + attachments + YouTube          | No                                                  |
| Tag categorization with icons      | ✅ Color-coded tags                        | No                                                  |
| Version numbers                    | ✅ With animated display                   | No                                                  |
| Timeline visualization             | ✅ Steps + infinite scroll + Framer Motion | No                                                  |
| Search + tag filtering             | ✅ Client-side with sidebar                | No                                                  |
| Likes/dislikes feedback            | ✅ On entries                              | No                                                  |
| Detailed comments                  | ✅ Separate collection                     | No                                                  |
| KB article references              | ✅ Tree select linking                     | No                                                  |
| Paginated document model           | ✅ 900KB rollover                          | No                                                  |
| Visual media (screenshots, GIFs)   | ✅ File attachments + YouTube embeds       | No                                                  |
| **"New" badge / unread indicator** | ✅ Now implemented                         | **Was missing**                                     |
| Emoji reactions                    | ❌                                         | Low priority (likes/dislikes + comments sufficient) |
| In-app notification widget         | ❌                                         | Separate feature (notification system)              |
| Email notifications                | ❌                                         | Explicitly out of scope                             |

### Assessment

- **Architecture:** Solid paginated document model. 900KB page rollover prevents Firestore 1MB limit. Transaction-based writes ensure atomicity. Linked-list pagination is cost-efficient.
- **Firebase Cost:** Very low. Paginated model = 1 read per page. Entry CRUD = 1 read + 1 write (transaction).
- **UI/UX:** Rich timeline with animated version numbers, tag filtering, search, infinite scroll. Admin drawer with TipTap editor, file attachments, YouTube embeds, KB references.
- **Caching:** Session-level caching via `PlatformGlobalDataContext` prevents re-fetch on tab switches.

### Improvements Implemented (REDO 2026-03-04)

1. ✅ **"New" badge on unread entries:** `localStorage`-based tracking of last viewed time. Entries published after that time show a green dot badge on the timeline. Updates `lastViewed` after 2s delay so user sees badges first. Industry-standard pattern (Beamer, Featurebase).

### Skipped (Validated)

- **Emoji reactions:** Low priority — likes/dislikes + detailed comments already provide feedback
- **Page compaction on delete:** Sparse pages acceptable, compaction adds complexity for negligible savings
- **Cross-page search:** Would require search index architecture — overkill for changelog scale
- **Notification system:** Out of scope per spec
