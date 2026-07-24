# Temporary Status Layer - Mobile Support

**Status:** Current MobileShell evidence; not device certification
**Last reviewed:** July 16, 2026

## Source Gate

Run `npm run verify:temporary-status-boundary` for mobile parity.

```bash
npm run verify:temporary-status-boundary
```

The gate covers `MobileTempStatusScreen`, `MobileHoursScreen`, `MobileMoreScreen`, `AUTH_BROWSER_REQUEST_POLICY`, acknowledgement order, rollback, live expiry, and maintained mobile docs.

The dedicated `MobileTempStatusScreen` remounts by exact tenant/store, admits only one set/clear action synchronously, and rechecks the initiating scope after confirmation and network stages. Optimistic set/clear projection requires both IDs and the captured prior status; failure rollback requires the exact optimistic store object still to own current context, so an older failure cannot restore status into another store or erase/replace a newer same-store update. Obsolete mounts suppress toast/loading settlement.

## MobileShell Paths

- More > Temporary Status opens `MobileTempStatusScreen` inside `MobileShell` for owners with store-management authority.
- Today/Hours exposes close-today plus the full status set/clear controls in `MobileHoursScreen`.
- Close today uses Temporary Status and does not rewrite the recurring weekday schedule.
- Regular weekday edits remain explicit Working Hours changes.

Both owner surfaces expose the same six status types and future expiry controls as desktop. Exact date/time values are converted through the shared date helpers before the API call.

## Mutation Contract

1. Confirm the customer-visible change.
2. Save the previous raw status and apply the optimistic local update.
3. Call `/api/store/temp-status` with `AUTH_BROWSER_REQUEST_POLICY`.
4. Parse no more than 8KB through `readTempStatusResponse()`.
5. Show normal success only after `{ success: true }`; warn when `effectsPending` is true.
6. Restore the complete previous status on any rejection, malformed response, oversized response, or network failure.

The active-status hook hides the owner status at the exact expiry even when the screen remains mounted. A persisted expired value does not keep the mobile UI active.

## UX and Failure Boundary

- Confirm dialogs explain what customers will see and until when.
- Touch controls use the current Tailwind/antd wrapper layer inside MobileShell; no new mobile UI dependency was added.
- Owner errors remain fixed and non-technical.
- Bounded diagnostics distinguish set, clear, close-today, response rejection, and response parsing without logging the raw custom message.
- Customer-page refresh failure is not shown as a failed save after the write commits; the owner sees that pages may take a moment.

## Pending Evidence

Authenticated iOS/Android/PWA set, clear, cancel, offline, reconnect, exact-expiry, and public-output smoke remain pending. Source completion does not certify those device flows.
