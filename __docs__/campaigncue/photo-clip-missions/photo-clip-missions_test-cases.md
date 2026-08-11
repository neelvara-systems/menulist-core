# Photo And Clip Missions - Test Cases

## Unit And Contract Cases

1. Confirmed durable image satisfies visual readiness.
2. Confirmed durable video satisfies visual readiness.
3. Audio never satisfies visual readiness.
4. Metadata-only image note never satisfies visual readiness.
5. Missing Storage generation never satisfies visual readiness.
6. `needs_review` visual appears as reviewable but not ready.
7. Mission tags are normalized, deduplicated, and bounded.
8. Consent maps to the expected rights state.
9. Image above 12 MiB fails before upload.
10. Audio above 50 MiB fails before upload.
11. Video above 250 MiB fails before upload.

## Storage And Server Cases

- Same-workspace create succeeds for allowed MIME and bounded size.
- Cross-workspace create/read/delete fails.
- Source overwrite fails.
- Unsupported MIME fails.
- Oversized image/audio/video fails.
- Registration rejects a missing object, path mismatch, MIME mismatch, size mismatch, generation mismatch, or invalid signature.
- Failed registration invokes best-effort source and preview cleanup.

## Workflow Cases

- Daily Desk photo task opens the capture surface.
- Uploading a confirmed photo updates Asset Library and recomputes readiness without a new overview fetch.
- Uploading an unconfirmed-rights photo leaves the campaign in review.
- Saving a metadata note does not complete the photo task.
- Video Studio continues to upload image, video, and audio through the shared helper.
- Uploading never creates a provider/social action.

## Required Validation

- Focused Photo/Clip Mission test.
- CampaignCue runtime verifier.
- CampaignCue Firestore and Storage emulator tests.
- TypeScript and focused ESLint.
- Authenticated responsive browser check when CampaignCue QA credentials are available.
