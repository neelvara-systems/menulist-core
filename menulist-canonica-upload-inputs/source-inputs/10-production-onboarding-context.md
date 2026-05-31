# MenuList Production Onboarding Context For Canonica

## Why This Source Exists

MenuList is intended to be a real Canonica production client when Canonica goes live.

The goal is not only to teach Canonica about MenuList. The goal is to onboard MenuList into Canonica production, run Canonica against MenuList production owner/product surfaces, and use the resulting Canonica dashboard state as the source for Canonica website, demo, and marketing assets.

## Required Launch Story

Canonica should be able to show:

- MenuList as a production client workspace;
- MenuList knowledge imported through Canonica Knowledge Intake;
- reviewed MenuList KB, FAQ, entity, and canonical-answer outputs;
- MenuList product surfaces mapped in Canonica;
- Canonica widget connected to MenuList production owner routes;
- widget runtime and page-context telemetry from MenuList;
- support feedback and support board items tied to MenuList questions;
- approved Canonica screenshots using MenuList as the example product.

## Production Onboarding Requirements

Before the dashboard can be used for public assets:

- MenuList founder/legal approval must confirm that MenuList can be onboarded to Canonica production.
- A Canonica production workspace and active license must exist for MenuList.
- Allowed origins must be locked to approved MenuList production hosts.
- A Canonica widget key must be issued through Canonica and configured through MenuList production environment variables.
- MenuList product surfaces must use safe route-level context, not private IDs.
- Knowledge outputs must be reviewed before they become canonical.
- Screenshots must be scrubbed and approved before public marketing use.

## Dashboard Data That Matters

The Canonica dashboard should not be empty when captured.

Meaningful MenuList-derived state includes:

- activation checklist progress;
- knowledge intake source list;
- reviewed KB articles;
- reviewed FAQs;
- entity candidates and accepted entities;
- canonical answer drafts and approved answers;
- product surface coverage;
- widget access/security configuration;
- widget runtime last-seen status;
- page context received from MenuList owner routes;
- feedback and support board signals;
- governance or drift items that need owner/admin review.

## Safe Widget Context

Use high-level context only:

- feature;
- page;
- workflow;
- role label;
- entity hints.

Do not send tenant IDs, store IDs, project IDs, owner contact details, customer information, payment information, raw support messages, tokens, or secrets.

## Asset Boundary

Until live onboarding and approval are complete, generated MenuList images and private captures are planning references only.

After onboarding, Canonica assets should prefer real routed screenshots from:

- MenuList public/product surfaces;
- Canonica activation and dashboard surfaces;
- Canonica knowledge intake;
- Canonica product surfaces;
- Canonica widget management;
- Canonica governance and support board.

