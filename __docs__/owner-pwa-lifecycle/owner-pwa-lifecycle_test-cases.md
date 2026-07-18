# Owner PWA Lifecycle Test Cases

| Case | Expected result |
| --- | --- |
| Open a maintained owner/auth path in production | Exactly the owner `/sw.js` registration is targeted |
| Open a platform website route | No new owner worker; an installed production owner worker is preserved |
| Open owner path in preview/development | Owner worker is not registered; stale registration is removed |
| Upgrade from a legacy worker | Retired private/auth/screen/start caches are deleted on activation |
| Inspect owner Cache Storage | No authenticated owner, sign-in, screen, API, Firestore/Storage, broad media, or customer HTML runtime cache |
| Lose connectivity | One non-blocking status appears; current screen remains usable for review |
| Browser reports a slow connection | Notice appears; UI remains interactive |
| Reconnect during an edit | Notice clears without automatic reload |
| Server build differs | Manual update prompt appears |
| Dismiss update | Prompt stays hidden for that build in the current session |
| Choose Refresh now | Page reloads once by explicit owner action |
| Rotate installed owner app | Layout follows device orientation |
| Attempt a mutation offline | Existing operation fails honestly; no queued/replayed success |
