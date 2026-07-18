# Changelog System — Firebase Cost & Operations Tracking

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** Developers, Ops
> **Source:** Codebase forensic audit

---

## 1. Firestore Collections

### 1.1 changelog (Subcollection)

| Property | Value |
|----------|-------|
| **Path** | `changelog/{tId}/{sId}/page_XXXXXX` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.CHANGELOG` |
| **Doc ID** | `page_XXXXXX` (zero-padded page number) |
| **Scoping** | Subcollection under `{tId}/{sId}` |
| **Avg Doc Size** | 10-900 KB (entries array, auto-rollover at 900KB) |
| **Growth Rate** | Slow (new page only when current fills up) |

### 1.2 changelog_feedback (Subcollection)

| Property | Value |
|----------|-------|
| **Path** | `changelog_feedback/{tId}/{sId}/doc1_{entryId}` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.CHANGELOG_FEEDBACK` |
| **Doc ID** | `doc1_{entryId}` |
| **Scoping** | Subcollection under `{tId}/{sId}` |
| **Avg Doc Size** | 0.5-5 KB (feedback list array) |
| **Growth Rate** | Per-feedback submission |

Separate Answerlattice Firebase mode must allow this nested path in `firestore-answerlattice.rules`. Runtime rules require `pId='AL'`, matching `tId+sId`, a capped `list` array, and append-style updates only.

---

## 2. Firebase Storage

| Purpose | Path Pattern | Size |
|---------|-------------|------|
| Changelog attachments | `changelog/files/{tId}/{sId}/{timestamp}-{uid}` | 0-10 MB per file, max 4 per entry |

---

## 3. Operations Per Action

### 3.1 Create Entry

| Step | Reads | Writes | Storage |
|------|:-----:|:------:|:-------:|
| Upload files (0-4) | 0 | 0 | 0-4 files |
| Transaction: find latest page | 1 | 0 | — |
| Transaction: estimate size | 0 | 0 | — |
| Transaction: append or create page | 0 | 1 | — |
| **Total** | **1** | **1** | **0-4 files** |

### 3.2 Fetch Latest Page (Owner View)

| Step | Reads | Writes |
|------|:-----:|:------:|
| Query: orderBy pageNumber desc, limit 1 | 1 | 0 |
| **Total** | **1** | **0** |

### 3.3 Load Older Page (Infinite Scroll)

| Step | Reads | Writes |
|------|:-----:|:------:|
| Query: pageNumber < current, limit 1 | 1 | 0 |
| **Total** | **1** | **0** |

### 3.4 Update Entry

| Step | Reads | Writes | Storage |
|------|:-----:|:------:|:-------:|
| Upload new files | 0 | 0 | 0-N files |
| Transaction: find page (array-contains) | N | 0 | — |
| Transaction: update entries array | 0 | 1 | — |
| **Total** | **N** | **1** | **0-N files** |

### 3.5 Delete Entry

| Step | Reads | Writes |
|------|:-----:|:------:|
| Transaction: find page (array-contains) | N | 0 |
| Transaction: filter + update page | 0 | 1 |
| **Total** | **N** | **1** |

### 3.6 Like/Dislike Entry

| Step | Reads | Writes |
|------|:-----:|:------:|
| Transaction: read page | 1 | 0 |
| Transaction: update entry in array | 0 | 1 |
| **Total** | **1** | **1** |

### 3.7 Add Feedback Comment

| Step | Reads | Writes |
|------|:-----:|:------:|
| Transaction: read/create feedback doc | 1 | 1 |
| **Total** | **1** | **1** |

---

## 4. Cost Estimates

### Scenario: 10 stores, 2 entries/week, 20 views/day

| Operation | Frequency | Reads/mo | Writes/mo |
|-----------|-----------|:--------:|:---------:|
| Create entries | 8/mo | 8 | 8 |
| Owner views (cached after first) | ~600 first loads | 600 | 0 |
| Load older pages | ~50/mo | 50 | 0 |
| Likes/dislikes | ~30/mo | 30 | 30 |
| Feedback comments | ~10/mo | 10 | 10 |
| Edit entries | ~5/mo | 10 | 5 |
| **Total** | | **~708** | **~53** |

### Monthly Cost

| Resource | Usage | Cost |
|----------|-------|------|
| Firestore reads | ~708 | $0.0003 |
| Firestore writes | ~53 | $0.00006 |
| Storage (attachments) | ~20 MB/mo | ~$0.002 |
| **Total** | | **~$0.003/month** |

**At 1,000 stores:** ~$0.30/month

---

## 5. Firestore Indexes Required

| Collection Path | Fields | Purpose |
|----------------|--------|---------|
| `changelog/{tId}/{sId}` | `pageNumber DESC` | Latest page query |
| `changelog/{tId}/{sId}` | `entryIds (array-contains)` | Find page by entry ID |

---

## 6. DAL Function → Collection Mapping

| DAL Function | Collection | Operation |
|-------------|-----------|-----------|
| `addChangelogEntry` | `changelog/{tId}/{sId}` | Transaction: getDocs + set/update |
| `fetchLatestChangelogPage` | `changelog/{tId}/{sId}` | getDocs (query) |
| `loadOlderChangelogPage` | `changelog/{tId}/{sId}` | getDocs (query) |
| `updateChangelogFeedback` | `changelog/{tId}/{sId}` | Transaction: get + update |
| `deleteChangelogEntry` | `changelog/{tId}/{sId}` | Transaction: getDocs + update |
| `updateChangelogEntry` | `changelog/{tId}/{sId}` | Transaction: getDocs + update |
| `addContentFeedback` | `changelog_feedback/{tId}/{sId}` | Transaction: get + set/update |

---

## 7. Document Growth Risk

Opening the founder release entry with `?create=1` adds 0 Firestore reads, 0 writes, 0 listeners, and no provider call beyond the changelog screen's existing paginated load. Existing save costs apply only after the owner submits the form.

### Page Documents

| Entries Per Page | Est. Size | Status |
|:---------------:|:---------:|:------:|
| 5 | ~50 KB | ✅ Safe |
| 20 | ~200 KB | ✅ Safe |
| 50 | ~500 KB | ✅ Safe |
| 80+ | ~800 KB+ | ⚠️ Near rollover |

**Mitigated:** Auto-rollover at 900KB creates new page. No risk of hitting 1MB limit.

### Feedback Documents

| Feedbacks Per Entry | Est. Size | Status |
|:------------------:|:---------:|:------:|
| 10 | ~2 KB | ✅ Safe |
| 100 | ~20 KB | ✅ Safe |
| 1,000+ | ~200 KB+ | ⚠️ Unlikely at current scale |
