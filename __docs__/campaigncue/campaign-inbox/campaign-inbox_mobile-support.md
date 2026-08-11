# Campaign Inbox - Mobile Support

## Scope

Campaign Inbox is a high-frequency owner input surface and is fully usable in the responsive CampaignCue workspace. It does not create a second mobile route or data loader.

## Mobile Behavior

- One full-width text area with a 4,000-character limit.
- `Review update` appears after the input, not in a detached toolbar.
- Candidate rows stack vertically.
- Candidate selection uses a native checkbox with an associated label.
- Each action has a minimum 44px target.
- Business-detail candidates use one explicit routing action.
- Save progress and errors appear in the existing workspace notice region.
- Draft and reviewed candidates remain browser state; changing tabs does not create a Firebase write.

## Failure And Recovery

- Empty text: keep focus in the input and show a short instruction.
- More than eight details: ask the owner to save the current group, then add the remainder.
- API failure: preserve draft, candidates, and selection for retry.
- Idempotent retry: reuse the same mutation key until the request succeeds or its payload changes.
- Offline/browser interruption: no false saved state; the owner can re-enter the short update.

## Deferred Media

Photo, clip, and voice capture require secure upload, type/size validation, rights confirmation, retention, and Storage rules. They are intentionally handled by the next media-capture workstream rather than embedded as dead controls.
