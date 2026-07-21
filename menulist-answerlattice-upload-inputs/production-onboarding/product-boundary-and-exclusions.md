# MenuList Product Boundary And Exclusions

**Verified against current repository structure:** 2026-07-20  
**Target product:** MenuList  
**Internal product code:** `ML`

## Purpose

This file prevents a multi-product repository from becoming blended Answerlattice knowledge. The intake job may use shared infrastructure only where it changes how a MenuList owner, staff member, or customer should be supported.

## Included MenuList Boundary

Include current, owner-relevant truth from:

- MenuList owner desktop and mobile/PWA surfaces;
- public menus, item links, Official Business Page, feedback, QR/share, Menu Kit, Digital Screens, and enabled customer surfaces;
- menu creation, extraction, review, mutation, acknowledgement, publish, cache invalidation, and rollback behavior;
- owner-facing AI extraction, description, translation, image, AI Menu Manager, content-credit, and Transactions behavior;
- authentication, store selection, roles, account lifecycle, localization, timezone, RTL, accessibility, connectivity, failure recovery, billing, subscriptions, locations, and public business identity where they affect MenuList support;
- MenuList website, help, feature, governance, Firebase-cost, and operational documentation;
- MenuList-specific Answerlattice widget installation and route-context behavior.

Canonical public identity:

- website: `https://menulist.ai`;
- app/owner surface: `https://menulist.ai`;
- preview, staging, or alias host when explicitly relevant: `menulist.online`;
- production Firebase project: `menulist`;
- staging/local Firebase project: `menulist-qa`.

## Shared Infrastructure Included Only When Support-Relevant

The following shared code may be used as evidence only for its MenuList behavior:

- authentication and session boundaries;
- localization, timezone, RTL, accessibility, PWA, and error-handling utilities;
- shared content-credit policy copied into MenuList Cloud Functions;
- Razorpay/subscription status interpretation and owner-facing billing presentation;
- Answerlattice widget embed contracts running inside MenuList owner pages;
- shared website/deployment constants that establish MenuList canonical URLs.

Do not ingest a shared module merely because MenuList imports it. Include only the conclusion needed to answer a MenuList support question, and preserve plan, role, account, flag, provider, deployment, and location conditions.

## Explicitly Excluded Sister Products

Do not treat the following as MenuList features, routes, data, pricing, doctrine, or support behavior:

- Answerlattice product runtime, client workspaces, support governance, or Answerlattice pricing;
- CampaignCue;
- GrowthOS;
- KitStamp;
- MyCodex;
- Canonica;
- SignalDesk;
- Neelvara;
- AssetOS / Website Asset Operating System;
- SurfaceOS or other planning-only/internal product concepts;
- dormant cross-product experiments not implemented as current MenuList behavior.

Answerlattice is the target knowledge system for this package, not a MenuList feature. The only Answerlattice runtime facts included here are the bounded MenuList widget context and the operator steps needed to onboard MenuList as an Answerlattice client.

## Non-Merge Rules

- Never infer that a sister-product capability is available in MenuList because it exists in the same repository.
- Never copy sister-product pricing, routes, tenant fields, environment variables, screenshots, or support answers into MenuList knowledge.
- Never present internal/operator-only MenuList tooling as an owner or customer feature.
- Never present a disabled, dormant, flagged, provider-dependent, or undeployed capability as generally available.
- Never let preview/staging hostnames replace the canonical `menulist.ai` identity.
- Keep the MenuList owner widget off Growth Kits, internal operations, platform administration, reseller, and unknown routes. Approved nested owner routes use generic detail context only; raw URL segments and record identifiers must never become widget context.

## Review Rule

If a future repository change makes a boundary uncertain, mark the affected answer `pending product-boundary review`. Do not resolve ambiguity by merging products or inventing shared behavior.
