# Maps Place Check - Spec

**Status:** Backend prototype, owner/admin only
**Owner:** MenuList
**Feature family:** Public Truth Tools / Control Layer

## Problem

Store identity can drift between MenuList and the public places customers already use. Owners often do not know whether their public place profile has the same address, hours, service options, or directions link as MenuList.

MenuList needs a low-noise way to check public place evidence without turning Google Maps into the source of truth or asking owners to manage another dashboard.

## Decision

Build a backend-only Maps Place Check callable that returns evidence for owner/admin review. The output is intentionally not written to canonical store fields.

## Goals

- Identify likely Google Maps place evidence for a MenuList store.
- Return `placeId`, Maps URI, title, and source metadata when available.
- Present proposed facts as confirmation candidates, not final truth.
- Keep all AI/provider use behind authentication, SAFE_MODE, rate limiting, and a feature flag.
- Preserve the existing unified `@google/genai` Functions path.

## Non-Goals

- No public OBP chatbot.
- No CampaignCue ownership.
- No Google Business Profile mutation.
- No automatic overwrite of MenuList address, hours, amenities, menu items, prices, reviews, ratings, or availability.
- No storage of broad Maps source snapshots, review snippets, photos, or generated Maps text.
- No Firebase AI Logic Web SDK migration.

## Owner Experience

The first usable surface is internal/admin or owner-assisted:

1. User provides store, business name, and optional address or coordinates.
2. MenuList checks Google Maps-grounded evidence.
3. MenuList returns a compact review packet.
4. A future UI may show the packet and ask the owner/admin to confirm any canonical changes.

Normal owners should not see raw grounding mechanics.

## Acceptance

- The callable rejects unauthenticated calls.
- Store-scoped users can check only their own tenant/store.
- Platform users can check a requested tenant/store.
- SAFE_MODE blocks the provider call.
- Rate limiting runs before the provider call.
- Missing business name returns a validation error.
- Results include source metadata and an attribution-required marker when grounding metadata exists.
- The prototype performs no Firestore writes.
