# Temporary Status Layer - Implementation

**Status:** Current runtime evidence; not deploy approval
**Last reviewed:** July 16, 2026

## Source Gate

Run `npm run verify:temporary-status-boundary` for source/docs parity.

```bash
npm run verify:temporary-status-boundary
```

## Write Flow

`src/app/api/store/temp-status/route.ts` owns the manual set/clear boundary:

1. `withAuth()` and `ENABLE_TEMP_STATUS` admit the route.
2. Session tenant/store/actor values are normalized as bounded Firestore document IDs. Session tenant/store IDs pass through the shared Firestore document-ID guard before limiter material, permission work, document refs, effects, or diagnostics.
3. A hashed owner/store `DATA_WRITE` limiter runs with `failClosedOnProviderError: true` before request-body parsing or permission-backed Firestore work.
4. The route reads at most 4KB, validates the discriminated Zod request, then requires `MANAGE_STORE` or `MANAGE_PUBLIC_PRESENCE`.
5. `set` rejects non-future expiry, normalizes the message, and updates `stores/{storeId}.tempStatus`. `clear` deletes that field.
6. `runStorePublicTruthPostCommitEffects()` attempts menu, store, client-store, and `screen-data` tags with `Promise.allSettled`. The route also touches Digital Screens and invalidates the Owner Business Assistant packet cache through that helper.
7. A post-commit effect failure returns `{ success: true, effectsPending: true }`; only a failed store mutation returns the fixed 500 response.

This ordering prevents expensive/authorized work on rate-limit-provider outage and prevents owner clients from rolling back after persisted truth has already committed.

## Canonical Read Boundary

`src/lib/tempStatus/statusBoundary.ts` is the shared evaluator. It accepts only a known type, parseable future expiry, and object input. It strips controls and invisible formatting, collapses whitespace, caps messages at 100 characters, and supplies a type default when needed.

`src/hooks/useActiveTempStatus.ts` schedules the next expiry. Long durations are rescheduled under the browser timeout ceiling. It is used by the public banner and owner surfaces, so a mounted screen cannot show an expired notice indefinitely.

Public consumers:

- `src/app/client/obp/OBPResolvedSurface.tsx`
- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`
- `src/app/feedback/[projectId]/page.tsx`
- `src/lib/publicTruth/clientStoreProjection.ts`
- `src/app/api/public/v1/business/route.ts`
- `src/lib/schema/index.ts`

The public pull API hides expired temporary status values. Browser/client store payloads omit inactive truth rather than serializing the raw field.

Standard public status types (`closed_today`, `kitchen_closed`, `opening_late`, `closing_early`, and `special_menu`) resolve through the shared public-customer message bundle on OBP, menu, and Guest Feedback. `custom` messages remain owner-authored truth and render verbatim. Localization uses the already-resolved public language and adds no status read/write, translation provider call, listener, or cleanup job.

## Structured Data

`buildTempStatusSchema()` uses the same active-status evaluator and store timezone. Only `closed_today` produces `specialOpeningHoursSpecification`, limited to the current store-local calendar day. Kitchen-only, late-open, early-close, special-menu, and custom banners do not claim that the whole LocalBusiness is closed. Invalid timezones or dates omit the status schema safely.

## Owner Clients

- Desktop: `src/components/templates/main-app/businessSettings/TempStatusCard.tsx`
- Mobile dedicated screen: `src/components/mobile/screens/MobileTempStatusScreen.tsx`
- Mobile Today/Hours shortcuts: `src/components/mobile/screens/MobileHoursScreen.tsx`
- MobileShell route: `src/components/mobile/screens/MobileMoreScreen.tsx`

All mutation callers use `AUTH_BROWSER_REQUEST_POLICY` and `readTempStatusResponse()`. The response parser caps JSON at 8KB, accepts legacy `{ success: true }`, normalizes it to `effectsPending: false`, and rejects all other successful envelopes. Optimistic changes are restored on failure; normal or pending-refresh success copy appears only after the parser returns.

## Special Menu Integration

Browser/Admin lifecycle code in `src/database/projects/specialMenuLifecycle.ts` and scheduled lifecycle code in `functions/src/schedulers/specialMenuLifecycle.ts` write a `special_menu` status with the menu end time and `sourceProjectId`. Deactivate/cancel/repair deletes the notice only when ownership matches, with a legacy fallback tied to the active pointer.

The current audit did not change Functions source; it verified the already-shipped lifecycle contract. No Firebase infrastructure deployment is triggered by the Temporary Status changes.

## Failure and Cleanup

- Invalid or expired persisted truth fails hidden.
- Explicit clear deletes the field.
- An expired field may remain persisted and is replaced by a later set. There is no cleanup scheduler.
- Cache/screen/assistant failures are bounded diagnostics plus `effectsPending`; no second Firestore write or retry queue is added.
- The feature adds no owner toggle beyond the existing flag and status controls.

## Verification

`scripts/verification/test-temporary-status-boundary.ts` deterministically covers normalization, exact expiry, invalid truth, timezone closure schema, kitchen-only omission, and response-envelope compatibility. `scripts/verification/verify-temporary-status-boundary.js` guards source/docs wiring and acknowledgement order.
