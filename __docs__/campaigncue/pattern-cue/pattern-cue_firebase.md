# Pattern Cue - Firebase

## Active Cost

Pattern Cue reuses the existing source-input write request and overview read model.

| Operation | Cost |
| --- | ---: |
| Additional overview reads | 0 |
| Additional source-list reads | 0 |
| Realtime listeners | 0 |
| New collections/subcollections | 0 |
| Storage writes | 0 |
| Cloud Functions | 0 |
| Provider calls | 0 |
| Writes when replacing current example | 3 |
| Reads/writes for Video Reel Studio format coaching | 0 additional |

The three existing-pattern writes are one merged workspace update, one default source-snapshot update, and one bounded event record. The implementation does not add a source-input document for each example.

## Bounded Persistence

`campaigncueWorkspaces/{workspaceId}` stores one `patternCueSource`. Every replacement overwrites the same bounded field and fixed logical source ID.

The compact observation stores source URL, source hash, platform, rights posture, classifications, generic structure, visual beats, original hooks, and guardrails. It never stores the submitted transcript/notes or fetched media.

When a pattern-backed video is rendered, the existing video-project document may store the classification plus a content-free format signature and exact project version. The existing campaign result write carries that signature. No pattern history, competitor event, trend refresh, or performance collection is created.

## Cost/Correctness Rationale

Storing every example in `sourceInputs` would grow the collection and could displace real business inputs from the 12-document overview query. Workspace-level current-pattern storage avoids that failure and adds no read. A persistent example library requires a separate retention and pagination decision and is intentionally not active.
