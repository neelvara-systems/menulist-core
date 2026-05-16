# Feedback System — Firebase Cost & Operations Tracking

> **Version:** 1.1.0
> **Last Updated:** 2026-05-16
> **Audience:** Developers, Ops
> **Source:** Codebase forensic audit

---

## 1. Firestore Collections

### 1.1 feedback (Owner Wizard)

| Property | Value |
|----------|-------|
| **Collection** | `feedback` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.FEEDBACK` |
| **Doc ID** | Auto-generated |
| **Scoping** | `tId + sId + uId` fields |
| **Avg Doc Size** | 0.5-2 KB |
| **Growth Rate** | Per-submission (infrequent) |

### 1.2 article_feedback (Content Feedback)

| Property | Value |
|----------|-------|
| **Path** | `article_feedback/{tId}/{sId}/doc1_{entryId}` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.ARTICLE_FEEDBACK` |
| **Doc ID** | `doc1_{entryId}` |
| **Scoping** | Subcollection under `{tId}/{sId}` |
| **Avg Doc Size** | 0.5-5 KB (feedback list array) |

### 1.3 changelog_feedback (Content Feedback)

| Property | Value |
|----------|-------|
| **Path** | `changelog_feedback/{tId}/{sId}/doc1_{entryId}` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.CHANGELOG_FEEDBACK` |
| **Doc ID** | `doc1_{entryId}` |
| **Scoping** | Subcollection under `{tId}/{sId}` |
| **Avg Doc Size** | 0.5-5 KB (feedback list array) |

---

## 2. Operations Per Action

### 2.1 Submit Owner Feedback

| Step | Reads | Writes |
|------|:-----:|:------:|
| `addFeedback(data)` | 0 | 1 |
| Use returned `addFeedback()` payload for UI | 0 | 0 |
| **Total** | **0** | **1** |

### 2.2 Get Latest Feedback (On Page Load)

| Step | Reads | Writes |
|------|:-----:|:------:|
| Query: `uId + tId + sId`, limit 1 | 1 | 0 |
| **Total** | **1** | **0** |

### 2.3 Article Like/Dislike

| Step | Reads | Writes |
|------|:-----:|:------:|
| Read article (current counts) | 1 | 0 |
| Update likes/dislikes | 0 | 1 |
| **Total** | **1** | **1** |

### 2.4 Changelog Entry Like/Dislike

| Step | Reads | Writes |
|------|:-----:|:------:|
| Transaction: read page | 1 | 0 |
| Transaction: update entry in page | 0 | 1 |
| **Total** | **1** | **1** |

### 2.5 Add Content Comment Feedback

| Step | Reads | Writes |
|------|:-----:|:------:|
| Transaction: read/create feedback doc | 1 | 1 |
| **Total** | **1** | **1** |

---

## 3. Cost Estimates

### Scenario: 10 stores, 5 feedback submissions/month, 30 likes/month, 10 comments/month

| Operation | Reads/mo | Writes/mo |
|-----------|:--------:|:---------:|
| Owner feedback submit | 0 | 5 |
| Latest feedback load | 100 | 0 |
| Article likes/dislikes | 30 | 30 |
| Changelog likes/dislikes | 30 | 30 |
| Content comments | 10 | 10 |
| **Total** | **170** | **75** |

### Monthly Cost

| Resource | Usage | Cost |
|----------|-------|------|
| Firestore reads | ~170 | $0.00006 |
| Firestore writes | ~75 | $0.00008 |
| **Total** | | **~$0.0001/month** |

Essentially free at any reasonable scale.

---

## 4. Firestore Indexes Required

| Collection | Fields | Purpose |
|-----------|--------|---------|
| `feedback` | `uId ASC, tId ASC, sId ASC, createdOn DESC` | Latest feedback per user |

---

## 5. DAL Function → Collection Mapping

| DAL Function | Collection | Operation |
|-------------|-----------|-----------|
| `addFeedback` | `feedback` | addDoc |
| `getLatestFeedbackForUser` | `feedback` | getDocs (query, limit 1) |
| `updateArticleFeedback` | `kb_articles` | getDoc + setDoc merge |
| `updateChangelogFeedback` | `changelog/{tId}/{sId}` | Transaction: get + update |
| `addContentFeedback` | `{type}_feedback/{tId}/{sId}` | Transaction: get + set/update |
| `updateContentFeedback` | Router | Routes to above handlers |
