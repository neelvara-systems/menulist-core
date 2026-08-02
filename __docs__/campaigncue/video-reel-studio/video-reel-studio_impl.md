# Video Reel Studio - Implementation

## Runtime Contract

Video Reel Studio has two owned runtime layers:

1. Protected CampaignCue APIs persist compact source-linked storyboards, version evidence, review notes, result/reuse memory, and render-job receipts, and mint short-lived CampaignCue Firebase custom-auth tokens for direct private Storage upload.
2. A client-only deterministic compositor turns the approved project plus private Asset Library or session media into a downloadable file with Canvas, `captureStream`, MediaRecorder, and Web Audio mixing.

No Topview SDK/API, paid generation API, remote render provider, server FFmpeg process, social OAuth, or direct publishing path is admitted.

## Feature Flags

- `ENABLE_CAMPAIGNCUE_VIDEO_STUDIO` controls the project UI/API.
- `ENABLE_CAMPAIGNCUE_IN_HOUSE_VIDEO_RENDER` controls local compositor export.
- `ENABLE_CAMPAIGNCUE_AI_PROVIDER_CALLS` remains `false`; it does not control this deterministic renderer.

## Protected API

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/campaigncue/video-projects` | `GET` | List at most the governed page size of admitted project records. |
| `/api/campaigncue/video-projects` | `POST` | Create, save, approve, reject, or record one render receipt using a strict action schema and idempotency key. |
| `/api/campaigncue/firebase-token` | `GET` | Mint one short-lived custom token for the current CampaignCue user/tenant/store so Firebase Storage rules can authorize direct private upload. |
| `/api/campaigncue/assets` | `POST` | Verify authoritative source/preview Storage objects and register one admitted image, video, or audio asset. |

Every request uses the CampaignCue protected-auth wrapper, the shared CampaignCue scope/tenant guard, bounded JSON parsing, Zod, fail-closed Upstash rate limiting, exact workspace/campaign/output binding, and the dedicated CampaignCue Admin client. Every response branch is private/no-store/nosniff. Client writes to the collection remain denied.

## Project Creation

1. Read the exact current workspace and campaign.
2. Require a video output belonging to that campaign.
3. Build one source-backed project from campaign copy, handoff fields, brand snapshot, approved source references, and Pattern Cue metadata already admitted on the output.
4. Build at most three hook/caption directions and at most eight scenes.
5. Run deterministic trust checks.
6. Commit one project, one audit event, and one completed idempotency record.

## Save And Versioning

- The browser sends the full bounded editable projection plus `expectedVersion`.
- The server rejects stale-version writes with `409`.
- Material changes increment `version`, reset approval to `draft`, rerun trust checks, and append one compact snapshot.
- History is capped at ten snapshots inside the project document to avoid subcollection/read amplification.
- Each snapshot retains bounded trust findings, durable asset ids, captions/audio settings, and source-backed scene state.
- Unknown fields, external URLs, data URLs, blob URLs, and raw binary media are rejected.

## Approval

- `approve` requires a non-blocked current project and an owner, admin, reviewer, or local-manager role allowed by the existing CampaignCue resolution policy.
- `reject` requires a bounded reason.
- Approval stores actor, version, and timestamp.
- Any material save invalidates the approval because the reviewed version changed.
- Open review notes block approval. Adding a note invalidates an existing approval; resolving a note is an audit-only mutation.

## Renderer

1. Validate browser support and select the first native MIME type from a governed allowlist.
2. Size a canvas from the selected 9:16, 1:1, or 16:9 preset.
3. Render each included scene deterministically at 30 fps using brand colour, safe-area layout, source-backed text, and selected image/video media plus pan/zoom/slide/fade motion. Skipped scenes do not contribute media loading, trust text, or duration.
4. Burn in captions when enabled.
5. Optionally mix separate narration and background-music tracks through Web Audio, with owner-controlled levels and bounded background ducking when narration exists. Narration may be recorded locally; voice cloning is not present.
6. Record the canvas stream, stop at the bounded total duration, create a Blob, and download it using the actual MIME extension.
7. Persist bounded progress checkpoints and send a completed, failed, or cancelled receipt. Interrupted started attempts can be explicitly closed before retry. The binary stays on the device.

The same client can always derive and download a bounded plain-text storyboard from the current project. This fallback does not require Canvas, MediaRecorder, a provider, or another Firestore write.

Receipt input is discriminated by status. A start records rights evidence and an explicit all-zero credit lifecycle; progress checkpoints must increase; completed requires MIME and size; failed/cancelled require a governed reason. A receipt ID may start once, and only its matching active attempt may progress or terminate. The persisted decoder accepts the former receipt shape for read compatibility but all new writes use the complete contract.

## Source Media Boundary

- Project documents may hold CampaignCue asset ids, never signed URLs or binary payloads.
- Direct owner uploads use the CampaignCue Firebase client, a short-lived custom-auth token, workspace-scoped Storage rules, resumable upload, local preview generation, and authoritative server verification before Asset Library registration.
- Existing Asset Library objects are resolved through its protected short-lived download endpoint.
- Local file selections use browser object URLs for the active session only.
- Local image/video/audio selection requires an explicit right-to-use confirmation for that render session.
- Selecting or replacing session media returns the browser draft to review; the saved storyboard approval and the separate session-media confirmation must both be current before render.
- A session-local image/video/audio file is not described as durably saved.
- A session-local image replaces any saved Asset Library choice for that scene, and selecting an Asset Library image clears the local override. The approval UI cannot ambiguously render both.
- Render receipt metadata may be registered as an Asset Library export receipt, but the UI must not claim it is remotely downloadable unless a verified Storage path exists.

## Review And Learning

- Review notes stay capped in the project document; no chat thread, notification fanout, or public client portal is added.
- Recording a video result updates the video project and existing campaign result memory in the same transaction.
- A useful result stores only a reusable structural blueprint: purpose, timing, motion, transition, aspect ratio, and caption layout. Reuse applies that structure to current checked copy and sources; it never copies the old text, asset ids, offer, or business identity.

## Trust Checks

The deterministic `campaigncue-video-trust-v1` pass blocks or warns on:

- blocked campaign/output trust;
- missing CTA or source references;
- asset records that are blocked, restricted, or not rights-confirmed;
- fake testimonial/result language or synthetic-customer positioning;
- stale campaign facts at the existing campaign action boundary;
- missing approval for the current version.

## Acceptance

- A checked video output can create, save, approve, render, retry, and download without provider credentials.
- Text-only and owner-image renders are both supported.
- Three aspect ratios render from the same project.
- Edit invalidates approval; stale updates conflict instead of overwriting.
- Failed renders keep all scenes and versions.
- A completed device download is never relabelled as a failed render merely because the follow-up receipt sync fails; the UI reports the receipt-sync gap and asks for refresh.
- The server never receives rendered media bytes.
- Provider calls, social actions, Firebase listeners, and provider credits remain zero.
