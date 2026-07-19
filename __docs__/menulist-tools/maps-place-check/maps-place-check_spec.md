# Maps Place Check - Spec

**Status:** Guarded contract complete; provider activation and grounded-candidate UI pending
**Owner:** MenuList
**Feature family:** Public Truth Tools / Control Layer

## Problem

Store identity can drift between MenuList and the public places customers already use. Owners often do not know whether their public place profile has the same address, hours, service options, or directions link as MenuList.

MenuList needs a low-noise way to check public place evidence without turning Google Maps into the source of truth or asking owners to manage another dashboard.

## Decision

Keep the backend-only Maps Place Check callable as an evidence-only operation.
Add a separate, explicit owner-confirmation contract for the exact store/outlet
so a stable external location binding can be saved, replaced, or removed without
making Google the canonical source.

## Goals

- Identify likely Google Maps place evidence for a MenuList store.
- Return `placeId`, Maps URI, title, and source metadata when available.
- Present proposed facts as confirmation candidates, not final truth.
- Keep all AI/provider use behind authentication, SAFE_MODE, rate limiting, and a feature flag.
- Preserve the existing unified `@google/genai` Functions path.
- Reuse the existing store document instead of adding an identity collection.
- Keep provider bindings internal, location-scoped, and non-propagating.
- Mirror an owner-saved Google Maps directions link into the internal binding in
  the same existing store write.

## Non-Goals

- No public OBP chatbot.
- No CampaignCue ownership.
- No Google Business Profile mutation.
- No automatic overwrite of MenuList address, hours, amenities, menu items, prices, reviews, ratings, or availability.
- No storage of broad Maps source snapshots, review snippets, photos, or generated Maps text.
- No raw provider response text in callable output.
- No Firebase AI Logic Web SDK migration.
- No automatic location merge, duplicate resolution, alias registry, or
  confidence score.
- No public exposure of internal provider IDs through OBP, JSON-LD, or Platform
  Pull.

## Owner Experience

The first usable surface is internal/admin or owner-assisted:

1. User provides store, business name, and optional address or coordinates.
2. MenuList checks Google Maps-grounded evidence.
3. MenuList returns a compact review packet.
4. A future guarded UI may ask the owner/admin to confirm the external location
   binding. Canonical business-field changes remain separate owner actions.

Normal owners should not see raw grounding mechanics.

The current owner-visible path remains the existing Google Maps link field on
Official Page settings. Saving or removing that link on desktop, mobile, or the
embedded editor mirrors or removes only the internal `google_maps` URI binding.
No extra owner setting is introduced. Existing saved links are not bulk
backfilled; they remain valid and gain the internal URI binding on their next
explicit owner save. That URI-only binding is not represented as a resolved
Google Place ID.

## Acceptance

- The callable rejects unauthenticated calls.
- Store-scoped users can check only their own tenant/store.
- Platform users can check a requested tenant/store.
- SAFE_MODE blocks the provider call.
- Rate limiting runs before the provider call.
- Missing business name returns a validation error.
- Results include source metadata and an attribution-required marker when grounding metadata exists.
- Results never include raw provider response text.
- The prototype performs no Firestore writes.
- A confirmed binding uses the optional
  `externalLocationIdentity.bindings.{provider}` field on the exact store
  document.
- Only `owner_confirmed` bindings are persisted; proposals and raw grounded
  content are never stored.
- A stable Maps Place ID and URI must be present together on the same returned
  Maps grounding source; model-parsed response fields alone cannot establish
  the binding.
- Valid Place IDs are never silently truncated. The implementation uses a
  2,048-character safety ceiling because Google documents no provider maximum.
- Explicit confirmation rechecks current tenant/store identity and rejects a
  missing, inactive, deleted, or blocked store before the write.
- Generic store updates cannot directly submit internal identity metadata, and
  the browser confirmation path cannot create a GBP connection record.
- Removing one provider binding preserves every other provider binding.
- Outlet bindings never propagate from a master store or merge two locations.
