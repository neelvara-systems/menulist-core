# Temporary Status Layer

**Status:** Implemented; local source boundary complete
**Feature flag:** `ENABLE_TEMP_STATUS: true`
**Last code-truth review:** July 16, 2026

Temporary Status lets an authorized owner place one short, time-bounded notice on supported MenuList customer surfaces. It is for temporary exceptions; recurring hours continue to use Working Hours.

## Source Gate

Run `npm run verify:temporary-status-boundary` for the focused boundary.

```bash
npm run verify:temporary-status-boundary
```

The gate covers route admission, expiry, owner acknowledgement and rollback, public projections, live banner expiry, Special Menu ownership, cache/screen/assistant invalidation, structured data, tests, and this maintained doc set.

## Current Contract

- Owner choices are Closed Today, Opening Late, Closing Early, Kitchen Closed, Special Menu, and Custom.
- `POST /api/store/temp-status` accepts `set` or `clear`; tenant, store, and actor identity come from the authenticated session.
- The route is feature-gated, permissioned, bounded to 4KB JSON, Zod-validated, and protected by a hashed fail-closed `DATA_WRITE` limiter.
- A successful set writes the existing store document's `tempStatus` field. A successful clear deletes it.
- Desktop Business Settings and the two MobileShell entry points update optimistically, but keep that state and show success only after a bounded valid `{ success: true }` response.
- Public menu, Official Business Page (OBP), feedback, browser store payload, and pull API share the canonical active-status boundary. Invalid or expired truth is omitted.
- Mounted public and owner components schedule expiry locally, so a notice disappears when its expiry passes without requiring a reload.
- Only `closed_today` produces a whole-business closure in structured data. `kitchen_closed` and other notices never mark the complete business closed.
- A Special Menu can own `type: special_menu` using `sourceProjectId`; its browser and scheduler lifecycle clears only the status owned by that project.

## Expired-State Boundary

Expiry is a visibility rule, not a cleanup promise. The persisted field may remain after expiry; customer and browser projections hide it. A later set replaces it and an explicit clear deletes it. There is no Temporary Status cleanup worker, collection, queue, listener, or scheduled scan.

## Post-Commit Effects

After the store write commits, the route attempts the existing public effects together:

- `menu-store-{storeId}`
- `store-{storeId}`
- `client-stores`
- `screen-data`
- Digital Screens content-version touch
- Owner Business Assistant packet-cache invalidation

If one of these effects fails, the response remains a committed success with `effectsPending: true`; owner UI warns that customer pages may take a moment. It does not roll back to false local truth after the Firestore write has committed.

The public pull API hides expired temporary status values, and the shared browser projection omits expired or malformed values.

## Maintained Documents

- [Specification](./temp-status-layer_spec.md)
- [Implementation](./temp-status-layer_impl.md)
- [Firebase and scale](./temp-status-layer_firebase.md)
- [Mobile support](./temp-status-layer_mobile-support.md)
- [Help](./temp-status-layer_helpdoc.md)
- [Marketing](./temp-status-layer_marketing.md)
- [Website](./temp-status-layer_website.md)
- [Validation](./temp-status-layer_validation.md)

Superseded pre-review narratives are retained under `_archive/pre-2026-07-16/`.

## Release Boundary

Local source completion is not production certification. Approved app release, authenticated desktop/MobileShell set-clear QA, hosted menu/OBP/feedback/pull-API/cache/screen smoke, expiry observation, browser/device QA, and production-host evidence remain pending.
