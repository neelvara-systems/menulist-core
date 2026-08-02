# Video Reel Studio - Test Cases

## Contract

1. Create accepts only a current CampaignCue campaign video output.
2. Create produces one to eight bounded scenes, three or fewer variants, source refs, brand snapshot, version `1`, draft approval, and zero-provider cost policy.
3. List omits malformed or cross-workspace records.
4. Save rejects unknown fields, media/data/blob URLs, more than eight scenes, invalid durations, and stale `expectedVersion`.
5. Save increments version, appends bounded history, reruns trust, and invalidates prior approval.
6. Save rejects a project with every scene skipped; skipped-scene duration and text do not enter the rendered output or trust pass.
7. Approve rejects blocked projects and stores the reviewed version.
8. Reject requires a reason and prevents render.
9. Idempotent retries return the same project/result and key reuse with different input returns `409`.
10. Render selection tries governed native MIME types and uses the actual extension.
11. Renderer blocks draft, rejected, stale-version, or trust-blocked projects.
12. Text-only render produces a non-empty Blob when browser primitives are available.
13. Failed image/audio decoding does not delete or mutate the persisted storyboard.
14. Session-local image/audio cannot render until the owner confirms the right to use it; changing the file resets that confirmation.
15. Portrait, square, and landscape presets use governed dimensions and safe-area padding.
16. Captions remain within the canvas safe area.
17. Render receipt stores status, attempt, preset, MIME, duration, and size only; no binary or signed URL.
18. Started receipts reject terminal metadata and duplicate receipt IDs; only the matching started attempt can complete or fail.
19. Every CampaignCue API response is private/no-store/nosniff, and limiter-provider outage returns 503 without quota metadata.
20. Mobile controls remain usable without drag, hover, or horizontal scrolling.
21. Provider/network scans find no Topview dependency, video-generation adapter, social posting, or spend mutation.
22. Storyboard text download remains available without MediaRecorder and contains no signed URL, object URL, binary, or provider action.
23. Selecting a local scene image clears the saved Asset Library choice; selecting a library image or removing the scene revokes the local override.
24. A successful device download followed by receipt-sync failure is reported as a receipt-sync gap, not as a failed render.
25. Video-project schema failures use bounded security logging and return a generic client error.
26. CampaignCue custom-auth token carries only the current user/tenant/store/product claims and Storage rules reject cross-workspace upload/delete.
27. Uploaded image/video/audio MIME, size, workspace path, Storage generation, and magic bytes are verified before registration; preview files are bounded images.
28. Per-scene regeneration changes only bounded copy/motion/timing structure and preserves current source references.
29. Narration and background music use separate tracks; narration ducking never changes the saved source audio and voice cloning is absent.
30. Open review notes block approval; only the note author or an approval-resolution role can resolve a note.
31. Render progress increases monotonically, cancellation records `cancelled`, interrupted attempts can close as failed, and all credit fields remain zero.
32. Version snapshots retain trust findings and durable reviewed asset ids; session rights confirmation is stored only on the matching render receipt.
33. Video result recording updates existing campaign result memory, and a useful result creates only a structural reusable layout with no old text or asset ids.
34. Applying a reusable layout keeps the target project's checked copy, assets, business identity, and source references.

## Required Gates

- CampaignCue video unit verifier.
- CampaignCue runtime verifier.
- CampaignCue Firestore and Storage rules verifiers.
- TypeScript no-emit check under the pinned Node runtime.
- Focused lint for touched CampaignCue files.
- Manual browser smoke: create, edit, save, approve, render, download, retry, and mobile layout.
