# KB Generation Pipeline — Customer Help Documentation

> **Version:** 1.1.0
> **Last Updated:** 2026-07-18
> **Audience:** Platform Administrators only
> **Note:** This feature is not accessible to Answerlattice workspace owners. This helpdoc is for internal platform operations.

---

## Overview

The KB Generation Pipeline allows platform administrators to generate reviewable help-article and FAQ drafts from bounded source material. It is an internal compatibility tool; Answerlattice owners use Knowledge Intake instead.

---

## How to Generate Articles

### Step 1 — Upload Source Files
1. Navigate to the KB Generation dashboard (platform navigation)
2. Click **Upload New Content**
3. Drag and drop your files or click to browse
4. Supported input: 1-8 bounded files (documents/text, image, audio, or video) plus pasted text. Pasted links are stored as text; this screen does not crawl or connect to external services.
5. Remove private customer data from images or screenshots before upload. Sources stay with failed/cancelled jobs; explicit deletion removes only paths not referenced by another workspace job.
6. Click **Start Generation**

### Step 2 — Wait for Processing
- The system uploads your files and creates a generation job
- AI processes the files and generates structured articles
- Watch the progress indicator on the job card
- Status moves from Pending → Processing → Needs Review

### Step 3 — Review Generated Content
- When status shows "Needs Review", click the review button
- If duplicate articles are detected, resolve them first:
  - **Replace**: New article replaces the existing one
  - **Discard**: New article is discarded
  - **Keep Both**: Both articles are kept
- Review the generated categories, sections, and articles
- Edit content if needed before publishing

### Step 4 — Publish
- Approve the reviewed content
- Articles are published to the Knowledge Base
- Embeddings are generated automatically for AI search
- Status moves to Published when complete

---

## Viewing Job History

1. On the KB Generation dashboard, click **View Previous Job History**
2. See all completed, failed, and cancelled jobs
3. Click any job to see details in a side drawer
4. View generated content tree, source files, and metadata

---

## Deleting a Job

Deleting a job removes:
- The job document
- Its unpublished/inactive generated article drafts
- Source objects not referenced by another job in the same workspace

Published/active article provenance blocks deletion. Shared source paths are preserved. A Storage cleanup failure leaves the job available for deletion retry. Successful deletion cannot be undone.

---

## Troubleshooting

**Job stuck in "Processing":**
- AI processing can take several minutes depending on file size and count
- If stuck for more than 30 minutes, the job may have failed silently
- Check the job status — if still processing, wait. If failed, create a new job.

**Duplicate articles detected:**
- This means the AI generated articles similar to existing KB content
- Use the reconciliation modal to decide: replace, discard, or keep both
- You must resolve all duplicates before reviewing other generated content

**Articles not appearing in search:**
- Articles must be in "Published" status to appear in AI search
- Embedding generation must complete (check publishing progress)
- Wait for the publishing stage to finish completely
- Until finalization succeeds, generated articles/FAQs remain inactive, existing navigation remains live, and approved replacement articles are not deleted
