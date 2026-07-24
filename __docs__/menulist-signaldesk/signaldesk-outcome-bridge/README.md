# SignalDesk Outcome Bridge - Feature Doc Set

**Status:** Runtime implemented; local emulator verified; production producer wiring pending external deployment verification
**Created:** June 23, 2026
**Runtime reconciled:** July 22, 2026
**Parent:** [MenuList SignalDesk](../README.md)
**Audience:** Internal growth operators and future implementers

## Purpose

SignalDesk Outcome Bridge connects growth activity to real MenuList outcomes without taking ownership of MenuList onboarding, store truth, menu truth, or customer-facing flows.

It creates tracked routes and records the five implemented outcome events: route created, upload started, preview prepared, published, and owner-reviewed two-surface activation.

## Source Specs

- Spec 9: onboarding router, renamed to outcome bridge
- Spec 22: attribution
- Spec 32: demand signal and route outcomes
- Spec 35: QR/menu-link flywheel

## Document Map

| Document | Purpose |
| --- | --- |
| [Specification](./signaldesk-outcome-bridge_spec.md) | Outcome events, route tokens, and attribution rules. |
| [Implementation](./signaldesk-outcome-bridge_impl.md) | Bridge modules, flow, and MenuList boundary. |
| [Firebase](./signaldesk-outcome-bridge_firebase.md) | Route token, attribution, outcome, and audit collections. |
| [Compliance](./signaldesk-outcome-bridge_compliance.md) | Privacy, consent, route-token safety, and data boundaries. |
| [Mobile Support](./signaldesk-outcome-bridge_mobile-support.md) | Dashboard-only mobile visibility and blocked outcome mutations. |
| [Test Cases](./signaldesk-outcome-bridge_test-cases.md) | Attribution, route safety, and boundary tests. |

## Boundary

This feature must not write MenuList business truth directly.

MenuList remains the authority for stores, menus, owner approval, public URLs, billing, and onboarding state. SignalDesk records growth-side route and attribution events only.

The Today desk now exposes a deliberately weaker manual handoff while the signed producer remains pending: it copies the existing anonymous founder-pilot MenuList `/create-menu` URL. Copying the link does not create a route token or outcome and carries no target, owner, store, project, phone, or business identifier. Operators record only later observed setup progress in Activations under the existing manual outcome authority.

## Production Gate

The repository runtime now enforces scoped, expiring, revocable hash-only route tokens; strict signed payloads; transactional idempotency; direct attribution touches; and the MenuList truth boundary. Production clearance still requires:

- deploy-time secret configuration for `MENULIST_SIGNALDESK_OUTCOME_BRIDGE_SECRET`,
- an approved MenuList producer using the documented raw-body HMAC contract,
- live retry/replay smoke testing against the deployed route,
- privacy and retention approval for outcome and attribution history.
