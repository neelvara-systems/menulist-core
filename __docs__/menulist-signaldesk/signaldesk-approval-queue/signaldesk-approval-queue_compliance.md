# SignalDesk Approval Queue - Compliance

**Status:** Implemented and fail-closed
**Last Updated:** July 21, 2026

## Human Authority

Approval is a human decision over one exact prepared email/export action. The
server permission is `draft.approve`. AI, templates, imports, packet
recommendations, and operators without that permission cannot create approval.

## Current Invalidators

Approval fails when any material authority is missing or changed, including:

- target identity, latest draft/approval, segment, next action, or suppression;
- current source lifecycle, permitted use, expiry, or contact permission;
- exact contact identity/source-run binding;
- evidence, rejected facts, or current-menu diagnostic;
- template status, channel, variables, text fingerprint, or unsupported claims;
- CTA identity/fingerprint or sender identity/fingerprint/readiness;
- prior conversation, contact, outcome, unsubscribe, complaint, or DNC truth;
- packet action fingerprint, channel, route, or recommendation.

The browser cannot waive these checks. A stale loaded packet may still be
rejected by the transaction-current server.

## Rejection And Replay

Rejection uses a maintained reason enum. `other` requires an explanatory note.
An exact same-actor and same-request-fingerprint retry is a historical acknowledgement only; it does not
re-authorize current contact or delivery. Conflicting terminal requests fail.

## Downstream Boundary

Approved means eligible for a separately guarded manual export/handoff. It does
not mean sent, published, opted in, owner-converted, or safe for another channel.
Every downstream rail revalidates its own current source, contact, suppression,
CTA, sender, and kill-switch authority. Provider sending remains disabled.
