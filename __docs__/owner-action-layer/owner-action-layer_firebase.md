# Owner Action Layer Firebase Notes

## Runtime Operations

Normal dashboard rendering adds no Firebase operation. After an acknowledged
project publication, each other open dashboard tab for the exact tenant, store,
and project performs one authoritative project re-read so it cannot keep showing
`Not live` while the customer menu is already live.

| Operation | Count | Notes |
| --- | ---: | --- |
| Firestore reads | 1 per open matching dashboard tab after an acknowledged publish | Event-driven revalidation only; no polling, focus listener, or unrelated-store read. |
| Firestore writes | 0 | No new write path. Buttons route to existing screens. |
| Storage reads/writes | 0 | No media path. |
| Cloud Functions | 0 | No scheduler or callable function. |
| Provider calls | 0 | No external calls. |

## Cost Impact

No incremental Firebase cost in normal dashboard rendering. A publish incurs at
most one additional document read for each open matching dashboard tab. This is
preferred to polling or focus revalidation because it pays only when canonical
publication truth changes and closes an owner-trust stale-state gap.

## Boundary

This feature must not add:

- Firestore collection
- Firestore field
- API route
- Cloud Function
- Storage object
- external-platform scan
- Google Business Profile read/write
- social profile write
- review ingestion

Any future proof capture, date-specific exception schema, review ingestion, or referrer-backed placement proof requires its own Firebase cost document before implementation.
