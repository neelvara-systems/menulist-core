# Publish a Release Note Safely

## Create a normal announcement

1. Open Changelog Management.
2. Add a title, description, date, and optional tags, media, related articles, or product surfaces.
3. Leave Version empty when the note is not tied to a product release.
4. Choose Published and save.

## Create a versioned release note

1. Enter a numeric version such as `2.4.1`.
2. Select every changed product area.
3. Choose Published and save.
4. Answerlattice first saves the note privately.
5. It registers and activates the release, checks affected approved answers, and then publishes the linked note.

The note is visible to customers only after the release check succeeds.

## If publication does not finish

The entry is saved as a draft. Reopen it and save again. Answerlattice reuses the same release identity where possible and does not create a second version.

Do not create a different version to work around a failed activation. Review the changed product areas and any malformed affected answer reported by the owner workflow.

## What customers can see

- Published title, description, version, date, tags, approved media, related public KB links, and feedback counts.

They cannot see internal release IDs, entity mappings, context keys, workspace IDs, author identity, audits, or draft entries.

## Important boundaries

- A changelog entry does not approve or update a canonical answer.
- Drifted answers require human review.
- Version, release date, and changed product areas are fixed after release linkage in the editor.
- Search in the management view covers loaded pages; it is not a global changelog index.
