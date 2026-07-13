# AI Extraction Release Validation Checklist

**Feature:** Menu extraction pipeline release signoff  
**Status:** Source-gated validation checklist — passing it does not authorize release
**Audience:** Founder, QA, Engineering  
**Last Updated:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated AI Extraction Monitoring evidence only. Current source sets `ENABLE_EXTRACTION_MONITORING_DASHBOARD=true` and exposes platform-only desktop routes at `/ops/extraction` and `/platform/extraction-monitor` plus `MobileExtractionMonitorScreen` inside `MobileShell`. Cross-tenant job reads and `MENULIST_AI_OPERATIONS` reads are Firestore-rule-gated to platform admins; ordinary authenticated users retain own-job reads only. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:ai-accounting`, `npm run verify:menu-extraction-pipeline`, `npm run verify:agent-readiness`, `npm run verify:mobile-shell-route-map`, `npm run verify:auth-security-failure-matrix`, authenticated platform desktop/mobile browser QA, bounded read/cost and desktop retry smoke, current extraction/provider smoke, applicable target Firebase rules/index/Functions and Vercel deploy evidence, and production-host smoke.

---

## Purpose

Use this checklist before freezing or shipping extraction changes. This validates the real runtime contract across:

1. mobile upload flow
2. desktop upload flow
3. Firestore job queue
4. Firebase Functions processing
5. project document persistence
6. re-extraction review and apply/discard

This checklist is intentionally operational. It is for confirming that the extraction system behaves correctly in production-like conditions.

Passing this checklist records one evidence set only. It does not replace provider, deploy, platform desktop/mobile monitor, or production-host certification.

---

## Expected Architecture

The release check assumes this contract is true:

1. First extraction auto-saves directly into the project document on the server.
2. Re-extraction does not auto-save into the project document.
3. Re-extraction ends in `preview_ready` and waits for user review.
4. User approval applies changes through the shared client review/apply path.
5. User discard cancels the review job without mutating the project document.

If any test contradicts this contract, treat that as a release blocker.

---

## Manual QA Checklist

### 1. First Extraction With Image

1. Open mobile `Menu` on a project with no extracted menu items.
2. Upload one valid image.
3. Confirm a processing job is created.
4. Confirm progress UI is shown.
5. Wait for completion.
6. Confirm no review screen is shown.
7. Confirm the project document is updated automatically.
8. Confirm extracted items appear in the menu.

Expected result:
Job reaches `completed`, and extracted data is saved to the project automatically.

### 2. First Extraction With PDF

1. Use a valid PDF within page and size limits.
2. Upload from mobile and desktop.
3. Confirm pages are converted and uploaded.
4. Confirm only one processing job is created.
5. Wait for completion.
6. Confirm no review screen is shown.
7. Confirm extracted menu data appears in the project.

Expected result:
PDF first extraction follows the same auto-save path as image first extraction.

### 3. Re-Extraction With Existing Menu

1. Start from a project that already has extracted items.
2. Upload a new image or PDF.
3. Confirm job does not auto-save directly into the project.
4. Confirm job reaches `preview_ready`.
5. Confirm review UI opens.
6. Test `Select All`.
7. Test `Approve Safe Only`.
8. Test partial approval.
9. Apply approved changes.

Expected result:
Only approved changes are merged into the project document.

### 4. Re-Extraction Discard

1. Start a re-extraction job.
2. When review opens, discard changes.
3. Confirm the job is marked cancelled/discarded.
4. Confirm the main project document remains unchanged.

Expected result:
Discard never mutates the project document.

### 5. Cancel While Processing

1. Start a job with a larger file set.
2. Cancel while status is `pending` or `processing`.
3. Confirm UI clears correctly.
4. Confirm job status becomes `cancelled`.
5. Confirm the project document is not overwritten later.

Expected result:
Cancelled jobs do not resume and do not mutate the project after cancellation.

### 6. Reload Or Reopen During Active Job

1. Start a processing job.
2. Reload desktop, or close/reopen the mobile app/browser tab.
3. Confirm the active job is restored.
4. Confirm progress or review resumes correctly.
5. Confirm final completion still resolves correctly.

Expected result:
Active job recovery works without creating a second job.

### 7. Duplicate Active Job Protection

1. Start a processing job.
2. Try uploading again while the job is still active.
3. Confirm the UI reuses the existing active job instead of creating a new one.

Expected result:
Only one active job is used per project at a time.

### 8. Linked Outlet Review Path

1. Use a linked outlet project.
2. Run extraction even if that outlet has no local extracted items yet.
3. Confirm the job still requires review.

Expected result:
Linked outlets always route through review for safety.

### 9. Failure Path

1. Use a corrupt or invalid PDF, or another controlled failing case.
2. Confirm the failure state appears in the UI.
3. Confirm the project document is not partially mutated by the client flow.
4. Confirm the job records failure details.

Expected result:
Failed jobs surface clear status and do not create partial project corruption.

### 10. Locale Sanity

1. Switch app locale across several supported languages.
2. Open mobile upload and review states.
3. Confirm no missing-key errors.
4. Confirm placeholders and counts render correctly.

Expected result:
All extraction-related strings render correctly in supported locale packs.

---

## Firestore And Functions Validation

Validate the runtime state directly in Firebase for at least one successful first extraction and one re-extraction.

### First Extraction

Check:

1. job status starts at `pending`
2. job moves to `processing`
3. function saves extracted data into the project document
4. job ends at `completed`

Expected result:
Project write happens before final `completed` status.

### Re-Extraction

Check:

1. job status starts at `pending`
2. job moves to `processing`
3. function does not overwrite the project document directly
4. job ends at `preview_ready`
5. review apply changes the project document and finalizes the job path
6. discard leaves the project document unchanged and cancels the job

Expected result:
Re-extraction is review-gated.

### Cleanup Validation

Check:

1. stale `processing` jobs are eventually marked failed
2. expired `preview_ready` jobs are eventually marked failed
3. old terminal jobs are cleaned up according to scheduler logic

Expected result:
Abandoned jobs do not accumulate forever.

---

## Go / No-Go Rules

### Go

Release can proceed if:

1. all ten manual QA scenarios pass
2. first extraction auto-saves correctly
3. re-extraction requires review correctly
4. apply/discard behave correctly
5. reload recovery works
6. no duplicate active-job behavior is observed

### No-Go

Do not freeze or ship if any of the following occur:

1. re-extraction auto-saves without review
2. first extraction does not auto-save
3. active job is lost after reload/reopen
4. cancel still allows later overwrite
5. apply/discard results in incorrect Firestore final state
6. project document is partially mutated on failure

---

## Signoff Notes

Record the following after validation:

1. date tested
2. environment tested
3. tester name
4. mobile device/browser used
5. project IDs used
6. pass/fail outcome per scenario
7. any anomalies found in Firestore job history

No action needed once every required scenario passes and Firestore state matches the expected lifecycle.
