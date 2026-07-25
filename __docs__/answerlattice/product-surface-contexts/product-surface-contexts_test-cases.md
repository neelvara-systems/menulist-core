# Product Surface Contexts Test Cases

## Owner Management

- Create a new product surface.
- Attempt to create the same context key twice and confirm the second create fails.
- Attempt to change an existing context key and confirm the update fails.
- Edit route patterns, tags, entity hints, and entities.
- Archive a surface.
- Rebuild the context summary.
- Refresh the page and confirm surfaces load.

## Failure Acknowledgement

- Simulate `saveProductSurface()` returning a malformed/fallback result and confirm local selection, reload, summary rebuild, and success copy do not advance.
- Simulate `archiveProductSurface()` returning a malformed/fallback result and confirm the surface is not shown locally as archived.
- Simulate starter-template creation returning a malformed/fallback result and confirm the template flow shows fixed failure copy instead of counting the template as added.
- Simulate a successful rebuild-summary HTTP response without a valid `summary` object and confirm local summary state and success copy do not advance.
- Omit initiating scope, send string/zero/extra-field scope, or switch from workspace A to B before the rebuild route executes; confirm the request is rejected and neither workspace summary is written.
- Return a successful summary with a missing or mismatched scope acknowledgement and confirm the browser rejects it.
- Run `npm run test:answerlattice-product-surface-summary-contracts` and `npm run test:answerlattice-product-surface-summary:emulator`; the latter must compile and clean up the modular Firebase Admin app successfully.

## Content Linking

- Link a KB article to a surface.
- Link a changelog entry to a surface.
- Link a support ticket to a surface.
- Rebuild summary and verify compact related content.

## Runtime

- Search with exact `contextKey`.
- Search with an exact route path and confirm it outranks wildcard/global routes.
- Search the wildcard base path and a nested path and confirm both resolve.
- Hide the exact surface from one deployment target and confirm the next eligible surface is used.
- Search with matching feature/page/workflow.
- Pass `state` and `version` through the server schema, web SDK, loader, and iframe sanitizer.
- Confirm route `path` is not copied into the compact `page` field or persisted as widget request metadata.
- Search with partial context.
- Search without context.
- Search with invalid context fields.

## Cost

- Confirm runtime does not query broad KB/changelog/ticket collections.
- Confirm summary rebuild uses bounded queries.
- Archive a surface, rebuild, and confirm complete replacement removes the stale nested summary entry.
- Seed duplicate active keys, confirm rebuild rejects before writing, and confirm the prior valid summary remains intact.
- Confirm optional surface/article fields are omitted rather than serialized as Firestore `undefined` values.
- Confirm no realtime listeners are introduced.
