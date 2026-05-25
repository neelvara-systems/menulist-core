# Canonica Help Widget - Mobile Support

> **Version:** 1.0.0
> **Last Updated:** 2026-05-19
> **Audience:** Developers / Ops

---

## Mobile Decision

`/canonica/widget` is supported on mobile through the existing Canonica dashboard shell. Client product mobile apps must not expose Canonica management screens inside their own app shell; widget configuration belongs in the Canonica dashboard.

Reason:

- Widget setup is not a daily mobile workflow, so duplicating the full management console would add maintenance cost.
- Emergency actions such as copy/delete key, add origin, or confirm cache strategy should still be readable and usable on a phone.
- The existing route already owns the single save path through `GET`/`PUT /api/canonica/widget-config` and `POST /api/canonica/widget-key`.

## Mobile Surface

The mobile route uses the same `CanonicaWidgetManagement` template as desktop:

- UI Configuration tab: appearance, behavior, desktop/mobile preview.
- Install & Embed tab: install snippets, route/context snippets, runtime update note.
- Access & Security tab: key create/copy/rename/delete, origin allowlist, and blocked routes.

Client mobile apps may show an installed widget only when they explicitly embed the generic public widget script from their own runtime. Canonica core does not ship client-product-specific mobile hosts.

## Runtime Update Mobile Rule

The old Cost & Cache section is not a customer-facing configuration surface. Runtime caching is an internal Canonica performance decision, so the UI now shows only a short runtime update note in the Install & Embed tab.

Current mobile-visible behavior:

| Area | Mobile display | Runtime behavior |
| ---- | -------------- | ---------------- |
| Dashboard settings | "Installed widgets update automatically" | Short cache through `/api/widget/config`; no realtime listener |
| Widget auth | Key status and revoke controls only | Bounded auth freshness; revoke delay stays seconds-level |
| Blocked routes | Route list in Access & Security | Local pathname check in the loader; no Firebase call |
| Canonical answers | Not exposed as a setting | Canonica-owned retrieval cache stays internal |

## Mobile UX Requirements

- Touch targets must remain at least 44px where possible.
- Save remains sticky at the bottom on mobile.
- Code snippets may scroll inside textarea controls instead of widening the page.
- No horizontal page overflow.
- Runtime update note must stay compact and not become a dashboard.
- No new mobile-only Firebase read path.

## Test Cases

1. Open `/canonica/widget` at mobile width.
2. Confirm the Canonica drawer includes the Widget route under Management for platform users.
3. Confirm client product mobile navigation does not expose Canonica management screens.
4. Confirm the UI Configuration, Install & Embed, and Access & Security tabs fit on mobile.
5. Confirm Save remains reachable after switching tabs and scrolling.
6. Confirm the runtime update note does not make its own request.
7. Confirm desktop layout still exposes the same settings without a separate Cost & Cache card.
8. Confirm adding `/help-center/*` hides the installed widget on `/help-center` and child routes after runtime config refresh.

## Version History

| Date | Version | Change |
| ---- | ------- | ------ |
| 2026-05-20 | 1.2.0 | Added blocked route management to the mobile-supported widget settings contract. |
| 2026-05-20 | 1.1.0 | Split widget management into tabs and replaced the customer-facing Cost & Cache section with a compact runtime update note. |
| 2026-05-19 | 1.0.0 | Added mobile support decision for `/canonica/widget` and the Cost & Cache summary section. |
