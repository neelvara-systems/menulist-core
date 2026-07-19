# Hosted Help Center Mobile Support

**Status:** Responsive web implementation; external device proof pending  
**Last verified:** July 18, 2026

## Public customer surface

Hosted Help uses one responsive web client for desktop and mobile browsers. It does not introduce a native app route or a second mobile data contract.

Required mobile behavior:

- navigation and search remain usable without hover;
- links and controls retain practical touch targets;
- article text, code, links, and images do not overflow the viewport;
- temporary-unavailability and empty states remain distinguishable;
- canonical and public URLs do not depend on device type;
- no tenant, provider, ticket, or internal-note data enters the browser payload.

## Owner management

Hosted Help configuration remains inside the responsive Answerlattice Widget Management surface. A separate mobile management workflow is not justified because domain/DNS changes are infrequent and require careful review.

## External proof still required

- iOS Safari and Android Chrome rendering;
- small-screen search/navigation behavior;
- long article/code wrapping;
- keyboard and accessibility navigation;
- DNS management ergonomics on narrow screens;
- canonical/sitemap behavior through a real custom domain.
