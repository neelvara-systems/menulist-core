# Branded QR Action Templates Spec

**Status:** Docs-ready alignment layer
**Last Updated:** June 25, 2026

## Problem

SMB owners already place QR codes on tables, counters, packaging, receipts, flyers, business cards, and posters. A plain QR is functional, but it is often ignored. A QR that is too artistic can look good but scan poorly.

MenuList needs the useful middle: branded, clear, scan-safe physical action points.

## Goal

Define how MenuList should support branded QR action templates without becoming a QR art product, open-ended design tool, or analytics-heavy scan ledger.

## Owner Outcome

The owner should be able to choose a business action and download a finished physical file that is:

- branded with their business identity;
- easy to scan;
- clear about what the customer gets;
- tied to the current MenuList destination or a governed experiment destination;
- printable without design work.

## Action Taxonomy

| Action | Normal Destination | Measured Campaign Destination |
| --- | --- | --- |
| Current menu/services | Live MenuList page | Not needed by default. |
| Order now | Live ordering/menu page when available | Campaign/order experiment if owner is testing CTAs. |
| Leave feedback | Existing feedback route when enabled | Feedback experiment only if a measured campaign exists. |
| Review us | External review handoff only after policy review | Campaign route with clear destination preview. |
| Book appointment | Booking/contact destination when configured | Booking experiment. |
| Join loyalty | Existing loyalty/contact capture when configured | Opt-in experiment with consent. |
| WhatsApp offer | Not normal menu QR behavior | QR WhatsApp Experiments. |
| Reorder | Live menu/catalog or offer page | Packaging/receipt campaign experiment. |
| Event/special | Campaign asset page or current MenuList page | Campaign experiment. |
| Product info | Product/menu item page when stable | Packaging/product tag experiment. |

## Product Rules

- The QR is a distribution mechanism, not the product.
- The printed object must have one clear customer action.
- Brand identity belongs around the QR, not inside the QR pattern by default.
- QR modules stay dark on a high-contrast white scan panel unless scan-safety tests prove another treatment.
- The four-module quiet zone remains non-negotiable.
- The short link or destination hint should be visible near the QR where space allows.
- Normal MenuList menu/service/catalog QR codes open the live page directly.
- WhatsApp consent, campaign tokens, and winner dashboards belong to QR WhatsApp Experiments.
- Do not use "verified", "secure", "no spam", or official-platform claims unless a separate legal/product review approves exact wording.

## Allowed Template Types

| Template Type | Examples | Current Home |
| --- | --- | --- |
| Table action | Scan to view menu, order, feedback | Menu Kit, Print Menu Surfaces, Assets |
| Counter action | Scan to pay, order, review, join rewards | Assets |
| Packaging action | Reorder, product info, offer | Assets / Menu Kit where current bundle supports it |
| Handout action | Flyer, invitation, postcard, gift certificate | Assets |
| Identity action | Business card, ID card, service card | Assets |
| Experiment action | WhatsApp offer, campaign offer, CTA test | QR WhatsApp Experiments |

## Rejected For Normal Assets

- QR modules recolored with low contrast.
- Logo or photo covering finder patterns.
- Heavy QR module distortion.
- Artistic scene QR codes.
- Hidden destination.
- Per-scan Firestore events.
- Unclear "scan me" copy without a benefit.
- Consent claims on normal menu QR files.

## Acceptance Criteria

- Existing Assets docs identify this as a scan-safe template layer.
- Existing QR WhatsApp docs identify it as the creative source for measured campaign variants.
- Menu Kit remains focused on current MenuList deployment, not campaign experiments.
- Firebase cost remains unchanged for normal standard templates.
- Future artistic QR work is blocked until scan-regression coverage exists.
