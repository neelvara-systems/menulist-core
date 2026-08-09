# Owner Action Layer

> **Status:** Implemented as a presentation and routing layer
> **Feature Flag:** `ENABLE_OWNER_ACTION_LAYER`
> **Desktop:** Owner Dashboard
> **Mobile:** Mobile Dashboard inside `MobileShell`
> **Last Updated:** July 9, 2026

## What It Is

Owner Action Layer turns existing MenuList truth into one next owner action when attention is required. When required truth is stable, the dashboard relies on its existing "No action needed" state and does not invent routine work.

It covers the real SMB owner jobs that sit behind the current MenuList surfaces:

- set the customer link
- set hours
- publish the menu
- place the customer link on Google, Instagram, WhatsApp, QR, and print
- open private feedback
- capture daily menu changes through Menu Manager
- set a today status
- prepare staff handoff material
- update prices through Menu Manager

## What It Is Not

- Not a new dashboard
- Not a new analytics surface
- Not a new onboarding score
- Not a crawler or external-platform scan
- Not Google Business Profile sync
- Not review ingestion
- Not holiday-calendar runtime
- Not a new write path

## Runtime Boundary

The action layer is presentation-only. It reads current store and selected-menu data already loaded by the dashboard and routes owners to existing MenuList screens.

No new Firestore collection, Firestore field, API route, Cloud Function, Storage operation, provider call, Google/social scan, external-platform write, or owner setting is added.

## Key Files

| File | Purpose |
| --- | --- |
| `src/lib/ownerActions/buildOwnerActionLayer.ts` | Shared action-priority helper |
| `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx` | Desktop owner dashboard mount |
| `src/components/mobile/screens/MobileDashboardScreen.tsx` | Mobile dashboard mount and shell-safe routing |
| `src/config/features.ts` | `ENABLE_OWNER_ACTION_LAYER` flag |
| `scripts/verification/verify-owner-action-layer.js` | Source gate |

## Related Features

- [Owner Dashboard](../projects/owner-dashboard.md)
- [Menu Setup Progress](../menu-setup-progress/README.md)
- [Menu Presence Monitor](../menu-presence-monitor/README.md)
- [Use MenuList](../use-menulist/README.md)
- [AI Menu Manager](../ai-menu-manager/README.md)
- [Temporary Status Layer](../temp-status-layer/README.md)
- [Reviews & Reputation](../reviews-reputation/README.md)

## Documents

| Doc | Audience |
| --- | --- |
| [owner-action-layer_spec.md](./owner-action-layer_spec.md) | Product |
| [owner-action-layer_impl.md](./owner-action-layer_impl.md) | Engineering |
| [owner-action-layer_firebase.md](./owner-action-layer_firebase.md) | Firebase/cost |
| [owner-action-layer_mobile-support.md](./owner-action-layer_mobile-support.md) | Mobile |
| [owner-action-layer_marketing.md](./owner-action-layer_marketing.md) | Internal marketing |
| [owner-action-layer_website.md](./owner-action-layer_website.md) | Website boundary |
| [owner-action-layer_helpdoc.md](./owner-action-layer_helpdoc.md) | Owner help |
| [owner-action-layer_test-cases.md](./owner-action-layer_test-cases.md) | QA |

## Source Gate

```bash
npm run verify:owner-action-layer
```
