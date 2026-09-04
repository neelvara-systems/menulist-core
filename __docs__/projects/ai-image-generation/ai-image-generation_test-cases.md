# AI Image Generation — Saved-Person Test Cases

**Status:** Source acceptance matrix; authenticated target QA remains pending
**Last Updated:** August 31, 2026
**Audience:** Engineering, QA, product

## Preconditions

- Run with the saved-person and master image-generation flags enabled.
- Use one store manager, one staff user with image-generation permission only, and a second store/tenant account.
- Use synthetic or explicitly authorized adult reference photos. Never use a public figure or real customer photos for QA.

## Source and API cases

| ID | Case | Expected result |
| --- | --- | --- |
| SP-01 | Manager creates a profile with 2–4 valid photos and all four confirmations | One active store-scoped profile is created; prepared private objects contain no download token |
| SP-02 | Create with 0, 1, or 5 photos; missing confirmation; malformed data URL; oversized body; extra field | Request fails before profile persistence; validation is security-logged without image bytes, label, or consent payload |
| SP-03 | Staff with generation permission lists profiles | Only active summaries are returned; withdrawn/deleting rows are absent |
| SP-04 | Staff requests `includeWithdrawn=true` or attempts create/withdraw/delete | Request is denied by `MANAGE_STORE` admission |
| SP-05 | Manager explicitly lists with `includeWithdrawn=true` | Active and withdrawn summaries are returned; deleting/malformed rows remain hidden |
| SP-06 | Invalid, duplicate, mixed, or unknown GET query parameters | Request returns 400 before permission-store reads and records bounded validation telemetry |
| SP-07 | Two sessions create when seven profiles already exist | At most one transaction commits; rejected creation attempts exact cleanup of its just-prepared private objects and returns the limit error |
| SP-08 | Manager withdraws an active profile | New single/batch admission and authenticated preview fail immediately; accepted generated media is unchanged |
| SP-09 | Manager deletes a withdrawn profile | Exact validated private objects are removed before the Firestore row; repeat delete is idempotent |
| SP-10 | Another store/tenant guesses a profile/reference UUID | Exact session scope prevents list, preview, mutation, and generation access |
| SP-11 | Stored checksum, path prefix, consent shape, reference bounds, or version is invalid | Profile is rejected or generation fails closed before provider work |

## Owner-flow cases

| ID | Case | Expected result |
| --- | --- | --- |
| SP-12 | Desktop manager opens the selector | Active selection plus add/withdraw/delete governance controls are available |
| SP-13 | Mobile manager or permitted staff opens the selector | Active selection/clear and protected preview work; creation, withdrawal, and deletion are absent with desktop guidance |
| SP-14 | Select a profile, reload, and reopen the project | Only profile ID/version persist; no label, URL, path, consent text, or image bytes enter project/local preferences |
| SP-15 | Generate once with a saved person and a separate visual reference | Subject images remain identity anchors and the one-off reference remains visual direction; result stays a draft |
| SP-16 | Start batch generation with a selected profile | Trigger preflights exact ID/version; each durable item carries only ID/version and the worker re-resolves active consent |
| SP-17 | Withdraw after batch creation but before worker execution | Worker fails closed before provider generation for the withdrawn profile |
| SP-18 | Generate without a saved person | Existing single, reference-image, edit, batch, accounting, and acceptance behavior remains unchanged |
| SP-19 | Saved-person request reaches prompt-cache logic | Request is ineligible for shared prompt-image cache reads and writes |
| SP-20 | Owner accepts or discards output | Only accepted generated media enters project truth; source references never become public catalog media |
| SP-21 | Reopen the generator within five minutes for the same store and visibility level | The scoped global summary is reused with no profile-list request |
| SP-22 | Create, withdraw, or delete while the summary is cached | The cache updates from the mutation response without a follow-up list query |
| SP-23 | Switch store/account or change between active-only and management visibility | The prior cache is not rendered or reused; session reset clears it and late prior-scope responses are discarded |
| SP-24 | Cached profile is withdrawn elsewhere before generation | Preview/generation still fails closed against server truth; the cache never authorizes provider work |
| SP-25 | Manager renames an active profile at the expected version | Private label changes, reference version and objects remain unchanged, and cached summary updates without another list read |
| SP-26 | Manager replaces 2–4 photos with renewed consent | New versioned private objects become current atomically; prior exact objects are cleaned and new generation pins the incremented version |
| SP-27 | Replacement races withdrawal, deletion, or another replacement | Transaction fails closed; only this attempt's newly staged objects are cleaned; current profile truth is preserved |
| SP-28 | Restaurant/product-led owner opens generation | Saved Person is collapsed and no list call occurs until explicitly opened |
| SP-29 | Salon/tattoo/fitness/person-led owner opens generation | Saved Person consistency card is visible and uses business-aware explanatory/prompt copy |
| SP-30 | Owner selects single or batch quantity | Start CTA displays the maximum credit count and completion-only charging note; no punitive agreement gate blocks the action |
| SP-31 | Generated results are reviewed with keyboard/screen reader or touch | Each photo has a visible labeled checkbox and the final action reports the selected count; hover is not required |
| SP-32 | Single-generation route returns 400/403/404/409/429/5xx or network failure | Client preserves typed owner-safe recovery copy and never reports an empty success |
| SP-33 | Business type uses a canonical alias such as Gym | Client and server resolve the same image-view registry and produce the selected view instruction |
| SP-34 | Accounting fallback is inspected for the active model | Single and Cloud-Tasks batch use USD 0.067 per completed 1K output; native provider Batch discount is not claimed |

## Required verification

- TypeScript and scoped lint for changed API, store, service, UI, and verifier files.
- Prompt, batch-client, runtime storage/indexing, AI-accounting, documentation-link, and contextual-state verification.
- Production build without deployment.
- Authenticated desktop/mobile target smoke and representative provider consistency samples before any public claim.
