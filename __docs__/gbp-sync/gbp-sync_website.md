# GBP Sync — Website Content

> **Launch boundary:** Not current launch certification or deploy approval. This document records disabled/reserved GBP Sync evidence only: `ENABLE_GBP_SYNC` remains false, token operations fail closed with `GBP_TOKEN_STORE_DISABLED`, and manual Google handoff is the only current owner path. Current implementation, website publication, or release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:public-business-truth`, Google Business Profile API access, OAuth and target-secret setup, provider smoke, scoped deploy evidence, browser/device QA, and production-host smoke.

## Current Source Boundary

This is not active public website copy for a live Google sync feature.

Current runtime truth:

- `ENABLE_GBP_SYNC` is `false`.
- Google OAuth/API sync is not shipped.
- The GBP token store fails closed with `GBP_TOKEN_STORE_DISABLED`.
- The Google Business Profile card is hidden while the flag is off; the shared Business Settings Integrations tab may still host Platform Pull API controls.
- Current owner behavior is manual Google handoff using MenuList Official Business Page and menu links.

Public copy must not say MenuList updates Google automatically until API access, OAuth setup, provider smoke, deploy evidence, browser/device QA, and production-host smoke are recorded.

## Hero Section

- **Headline:** Put the right MenuList link on Google
- **Subheadline:** Use your Official Business Page and menu link as the source when you update Google Business Profile.
- **CTA Text:** Review Google handoff
- **CTA Link:** /use-menulist

## Problem Statement

Customers often check Google before they open a menu. If Google points to an old PDF, a broken site, or old hours, customers lose trust before they reach the business.

## Current Solution Statement

MenuList gives the owner a stable Official Business Page and menu link to use as the Google Business Profile website/menu handoff. Google changes remain owner-managed until the GBP API integration is approved and shipped.

## Current Benefits

### 1. Canonical Link Ready

The owner has one MenuList link to copy into Google Business Profile instead of guessing which menu URL is current.

### 2. Manual Handoff Stays Clear

Menu Presence Monitor and Official Business Page guidance keep the Google update task explicit. MenuList does not claim it has written to Google.

### 3. Reserved Sync Path Is Bounded

Automatic GBP sync remains a reserved capability. It requires Google API access, OAuth, provider smoke, deploy evidence, and production-host verification before public copy can describe it as active.

## SEO Meta

- **Page Title:** Google Business Profile Menu Link Handoff | MenuList
- **Meta Description:** Use MenuList's Official Business Page and menu link as the source when updating Google Business Profile.
- **Target Keywords:** Google Business Profile menu link, restaurant Google listing, official menu link, MenuList official page

## Approved Language

### USE

- "Google handoff"
- "Owner-managed Google update"
- "Official Business Page link"
- "MenuList menu link"
- "Reserved Google sync"

### NEVER USE

- "automatic Google sync"
- "connect once"
- "one-click Google fix"
- "MenuList updates Google automatically"
- "AI-powered Google management"
- "Smart listing optimization"
- "SEO automation"
