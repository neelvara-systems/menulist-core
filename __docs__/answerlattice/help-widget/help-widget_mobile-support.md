# Answerlattice Help Widget - Mobile Support

> **Updated:** July 18, 2026
> **Status:** Supported through the existing Answerlattice dashboard shell

## Decision

`/answerlattice/widget` uses the same management template on desktop and mobile. Answerlattice does not add a second client-product settings surface or a mobile-only data path.

## Mobile Jobs

A workspace operator can:

- review the install state;
- create a widget key and copy it during the one-time reveal;
- rename or revoke a key;
- add or remove exact HTTP/HTTPS origins;
- add or remove exact or descendant route blocks;
- edit bounded appearance and behavior settings;
- save through the same protected configuration route.

## Touch And Layout Contract

- Key, origin, and blocked-route controls use at least a 44px touch target.
- Primary create/add controls use the large button size on narrow screens.
- Tabs and code snippets may scroll within their own bounds; the page must not overflow horizontally.
- Save remains reachable after scrolling.
- Raw keys are never shown again after the one-time reveal.
- Destructive wording is `Revoke`, not `Delete`, because bounded audit metadata remains.

## Installed Mobile Runtime

The client product may load the same public widget script on a responsive web application. The maintained loader:

- uses the fixed `/widget/embed` iframe route;
- receives safe page/workflow context from explicit SDK/script calls;
- checks the current pathname against blocked routes locally;
- hides itself on terminal config denial;
- does not expose Answerlattice management inside the client application.

Native mobile SDKs are outside the current contract. A native app would require an explicit product and security decision rather than reusing browser postMessage assumptions.

## Verification

1. Open `/answerlattice/widget` at a narrow viewport.
2. Confirm all three management tabs remain reachable.
3. Confirm key create, rename, and revoke controls have 44px targets.
4. Confirm origin and route rows wrap without horizontal page overflow.
5. Confirm the one-time key reveal remains readable and copyable.
6. Confirm save and error states remain visible.
7. Confirm no client-product mobile navigation exposes the Answerlattice management route.
