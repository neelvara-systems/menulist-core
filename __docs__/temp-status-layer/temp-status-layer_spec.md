# Temporary Status Layer - Specification

**Status:** Implemented from current code truth
**Last reviewed:** July 16, 2026

## Owner Problem

An owner sometimes needs to warn customers about a short-lived exception without changing the recurring weekly schedule. The action must be quick, reversible, and unable to leave an expired customer notice visible.

## Shipped Scope

- One active store-level notice at a time.
- Six admitted types: `closed_today`, `opening_late`, `closing_early`, `kitchen_closed`, `special_menu`, and `custom`.
- A normalized message of at most 100 characters and a required future ISO expiry.
- Desktop Business Settings, Mobile More > Temporary Status, and Mobile Today/Hours controls.
- Customer display on supported OBP, digital-menu, and feedback surfaces.
- Active status in the MenuList public pull API and allowlisted browser store payload.
- Special Menu lifecycle integration with project ownership.
- Public cache, Digital Screens, and Owner Business Assistant invalidation after a committed owner mutation.

## Required Behavior

| Boundary | Requirement |
| --- | --- |
| Set | Reject invalid type, malformed input, or an expiry at/past the server's current time. Normalize the message before persistence. |
| Clear | Delete the existing store `tempStatus` field. |
| Authority | Require an authenticated session and `MANAGE_STORE` or `MANAGE_PUBLIC_PRESENCE`. Never accept tenant/store identity from the request body. |
| Owner UI | Optimistic state must roll back on rejection, invalid/oversized response, or network failure. Success appears only after acknowledgement. |
| Expiry | Treat `expiresAt <= now` as inactive. Mounted banners and owner status controls must self-expire. |
| Public payload | Omit malformed/expired status. Return `null` from the public pull API when no active status exists. |
| Structured data | Only `closed_today` can describe the complete LocalBusiness as closed, using the store-timezone current day. |
| Special Menu | Clear only a `special_menu` notice owned by the transitioning project, including the bounded legacy pointer fallback. |
| Committed write | Cache/screen/assistant effect failure must not be reported as a failed Firestore mutation. Return `effectsPending: true`. |

## Non-Goals

- No recurring or date-exception calendar; use Working Hours and explicit owner status changes.
- No customer push notification or external-profile update.
- No history/ledger, multiple simultaneous notices, media, link, or rich-text notice.
- No background cleanup worker. Public correctness cannot depend on eventual deletion.
- No claim that every external surface refreshes instantly.

## Owner Copy Boundary

Use plain confirmation such as “Customers can see this now.” If post-commit refresh work is pending, say customer pages may take a moment. Do not claim real-time notification, universal publishing, or provider delivery.

## Acceptance

The local acceptance gate is `npm run verify:temporary-status-boundary`, plus exact TypeScript, scoped lint, public-business, public-delivery, tenant-safety, MobileShell, dependency, docs-link, and diff checks. Live browser/device/host evidence is release-operator work.
