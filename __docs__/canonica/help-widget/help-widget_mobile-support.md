# Canonica Help Widget - Mobile Support

> **Version:** 1.0.0
> **Last Updated:** 2026-05-19
> **Audience:** Developers / Ops

---

## Mobile Decision

`/canonica/widget` is supported on mobile through the existing Canonica dashboard shell. MenuList's mobile More tab also opens the same widget console from More -> Canonica -> Widget Management. Do not create a separate mobile-only widget settings route.

Reason:

- Widget setup is not a daily mobile workflow, so duplicating the full management console would add maintenance cost.
- Emergency actions such as revoke key, add origin, or confirm cache strategy should still be readable and usable on a phone.
- The existing route already owns the single save path through `GET`/`PUT /api/canonica/widget-config` and `POST /api/canonica/widget-key`.

## Mobile Surface

The mobile route uses the same `CanonicaWidgetManagement` template as desktop:

- Key create/regenerate/revoke.
- Install snippets.
- Appearance and behavior settings.
- Origin allowlist.
- Context snippet.
- Cost and cache strategy summary.
- Desktop/mobile preview.

MenuList mobile only acts as a client/test host entry point. It must render Canonica's responsive widget console inside the existing mobile sub-screen model instead of duplicating widget settings in a separate MenuList-only implementation.

## Cost And Cache Mobile Rule

The Cost & Cache section is informational only. It must not add Firebase reads, writes, or listeners.

Current mobile-visible decisions:

| Area | Mobile display | Runtime behavior |
| ---- | -------------- | ---------------- |
| Runtime config | Browser + server cache, 60 second TTL | Short cache through `/api/widget/config`; no realtime listener |
| Widget auth | Short positive and negative cache | Bounded auth freshness; revoke delay stays seconds-level |
| Canonical answers | Redis only for verified answer cache | Upstash remains limited to deterministic canonical output |
| MenuList public pages | Next cache tags stay separate | No coupling between Canonica widget credentials and MenuList public menu cache |

## Mobile UX Requirements

- Touch targets must remain at least 44px where possible.
- Save remains sticky at the bottom on mobile.
- Code snippets may scroll inside textarea controls instead of widening the page.
- No horizontal page overflow.
- Cost/cache summary must stay compact and not become a dashboard.
- No new mobile-only Firebase read path.

## Test Cases

1. Open `/canonica/widget` at mobile width.
2. Confirm the Canonica drawer includes the Widget route under Management for platform users.
3. Confirm MenuList mobile More -> Canonica includes Widget Management and opens the same widget console in the mobile sub-screen flow.
4. Confirm the Cost & Cache section stacks into one column on narrow screens.
5. Confirm Save remains reachable after scrolling past Cost & Cache.
6. Confirm no extra request is made by the Cost & Cache section itself.
7. Confirm desktop layout still shows the same Cost & Cache content without disrupting existing cards.

## Version History

| Date | Version | Change |
| ---- | ------- | ------ |
| 2026-05-19 | 1.0.0 | Added mobile support decision for `/canonica/widget` and the Cost & Cache summary section. |
