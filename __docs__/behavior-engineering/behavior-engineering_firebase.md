# Behavior Engineering — Firebase

**Status:** Implemented with zero feature-specific Firebase operations
**Last verified:** July 17, 2026

## Cost Contract

Behavior Engineering is copy on already-mounted owner surfaces.

| Resource | Feature-specific operations |
|---|---:|
| Firestore reads | 0 |
| Firestore writes | 0 |
| Firestore deletes | 0 |
| Storage operations | 0 |
| Cloud Function invocations | 0 |
| Scheduled work | 0 |

There is no `behaviorNudgeDismissedAt` field. The runtime does not persist
dismissal state because there is no standalone dismissible nudge card.

Existing Dashboard and Share surfaces may use their normal store/project data,
but enabling or disabling behavior copy adds no read, query, listener, write, or
index.

## Security And Infrastructure

- No Firestore or Storage rule change
- No index change
- No DAL or API mutation
- No provider call or secret
- No deployable Firebase target

Any future proposal that adds behavior-event documents, per-view reads, or
dismissal writes requires a new cost and privacy review. The current source-gated
copy layer should remain the default.
