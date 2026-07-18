# Visual Profile Completion Firebase Notes

## Summary

Visual Profile Completion is read-only and local to already-loaded owner data.

## Firestore Reads

No new required Firestore read path is introduced.

Desktop uses the already-loaded store public presence data. It omits project-image completion if project summaries are not already supplied.

Mobile uses the already-loaded store public presence data and the existing mobile project summary context from `useMobileProjects()`.

## Firestore Writes

No new Firestore writes.

Existing OBP save behavior remains unchanged:

- cover changes save through current OBP cover paths
- gallery changes save through current OBP photo paths
- project image changes save through current project image paths

## Storage

No new Storage paths.

Existing uploads continue to use the Media Image System profiles:

- `businessCover`
- `galleryImage`
- existing project/menu image profiles

## Indexes

No query index is required. The underlying `stores.publicPresence` map is read only from the already-resolved store document and is exempt from automatic single-field indexing, so cover/gallery arrays and profile copy do not add unused index fanout when owners save them.

## Rules

No Firestore or Storage rules change.

## Functions And Schedulers

No Cloud Function, callable, API provider route, scheduler, or background job is added.

## Cost Impact

The completion card adds browser-local computation only.

Cost impact:

- Firestore reads: 0 required new reads
- Firestore writes: 0
- Storage writes: 0
- Cloud Functions: 0
- provider calls: 0
- schedulers: 0

**Last Updated:** July 17, 2026
