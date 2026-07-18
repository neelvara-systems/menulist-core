# SurfaceOS - Planning Boundary

**Product code:** `SF` (reserved only)
**Status:** Stage 1 planning only. No implementation is approved or active.
**Runtime truth:** The product-domain entry and local prefix are disabled
placeholders. There is no SurfaceOS route, API, UI, Firebase target, collection,
rule set, index set, Storage namespace, Function, provider integration, billing
plan, environment namespace, or public website.
**Source gate:** `npm run verify:surfaceos-boundary`
**Last verified:** July 17, 2026

## Current Decision

SurfaceOS remains a separate future-product concept. The repository reserves:

- product code `SF`
- `surfaceos.app` and `www.surfaceos.app`
- local namespace `/__surfaceos`
- internal placeholder `/sites/surfaceos`

Those reservations prevent namespace collisions. They do not activate a
product. `PRODUCT_SITES` keeps the entry `enabled: false`, no matching route
exists, and SurfaceOS is absent from the deployment-target matrix.

The archived March 2026 strategy is research input, not a frozen specification.
Its modules, ICP, providers, database choice, pricing, launch order, parent-brand
idea, and public claims require a new explicit product decision before use.

## Separation Rules

- Do not add SurfaceOS behavior to MenuList projects, public menus, OBP,
  analytics, Reviews, GBP scaffolds, Digital Screens, or owner settings.
- Do not reinterpret generic phrases such as "public surface", "product
  surface", or physical display surface as SurfaceOS runtime.
- Do not provision SurfaceOS inside MenuList, Answerlattice, CampaignCue, or
  SignalDesk Firebase projects.
- Do not expose the reserved host or local prefix until a real route,
  deployment target, security boundary, cost model, and release plan are
  approved together.
- The reserved `SF` value may appear as cross-product provenance metadata. It
  does not authorize SurfaceOS reads or writes.

## Activation Gate

Implementation may start only after the owner explicitly approves the product
boundary and the codebase records, at minimum:

1. current customer evidence and non-goals;
2. product ownership and separation from existing flows;
3. deployment and domain ownership;
4. authentication, tenant isolation, and support responsibilities;
5. provider feasibility and failure behavior;
6. Firebase or alternative persistence decision with a cost budget;
7. billing and legal boundaries;
8. desktop/mobile/public-surface admission; and
9. replacement of this planning-only verifier with runtime tests.

Until then, the correct runtime and Firebase cost are both zero.

## Maintained Documents

| Document | Purpose |
| --- | --- |
| [Specification](./surface-os_spec.md) | Current reserved scope and non-goals |
| [Implementation](./surface-os_impl.md) | Explicit no-runtime implementation boundary |
| [Firebase](./surface-os_firebase.md) | Zero-resource and zero-cost contract |
| [Mobile support](./surface-os_mobile-support.md) | No mobile surface before activation |
| [Marketing](./surface-os_marketing.md) | Internal-only claim boundary |
| [Website](./surface-os_website.md) | Publication block |
| [Helpdoc](./surface-os_helpdoc.md) | Customer-help publication block |
| [Test cases](./surface-os_test-cases.md) | Current planning-boundary verification |
| [Verification](./surface-os_verification.md) | July 2026 audit evidence and residual work |

Historical strategy and source reviews remain under `_archive/`.
