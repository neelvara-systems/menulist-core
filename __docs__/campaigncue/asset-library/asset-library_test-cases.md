# Asset Library - Test Cases

## Admission

1. Metadata-only asset with bounded name/type/source/rights/tags succeeds without a Storage operation.
2. Unknown request fields or `downloadUrl` fail strict schema admission.
3. Output or channel without a campaign fails before Firebase access.
4. Missing, cross-workspace, or output-mismatched campaign references fail before the asset/event batch.
5. Cross-workspace Storage path fails before Storage metadata lookup or Firestore write.
6. Storage-backed registration derives size and MIME from object metadata; malformed or oversized metadata fails closed.
7. Duplicate tags are stored once.

## Persisted Record

1. Document ID and payload ID/workspace must match.
2. Unknown asset/status/source/rights/consent values fail closed.
3. External or signed persisted download URLs fail closed.
4. Cross-workspace Storage paths, unsafe sizes, malformed tags, and oversized usage refs fail closed.
5. Legacy null optional file/right/reference fields normalize safely.
6. One malformed asset is omitted from the bounded list instead of exposing its data or breaking valid rows.

## Download

1. Missing asset returns owner-safe `404`.
2. Blocked, malformed, or fileless asset returns owner-safe `409`.
3. Valid private file returns a 15-minute signed URL derived from the current workspace Storage path.
4. Download never returns a persisted external URL.
5. No signed URL is written to Firestore or durable editor JSON.

## Cost And Regression

1. Metadata-only create: workspace guard read, one asset/event batch, no Storage call.
2. Campaign-linked create: one additional direct campaign read, no list scan.
3. Storage-backed create: one metadata lookup, no duplicate upload.
4. List/overview: one bounded asset query and zero repair writes.
5. `npm run test:campaigncue-asset-boundary`, exact TypeScript, scoped lint, and `npm run verify:campaigncue` pass.
