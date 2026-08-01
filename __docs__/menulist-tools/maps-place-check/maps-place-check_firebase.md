# Maps Place Check - Firebase Cost Tracking

**Status:** Guarded backend and embedded confirmation contract complete
**Default flag:** Off

## Current Runtime Cost

| Resource | Count per check | Notes |
| --- | ---: | --- |
| Callable Function invocation | 1 | `mapsPlaceCheck` |
| Firestore reads | 3 current-scope point reads plus 1 cached SAFE_MODE read per warm instance per minute | Exact tenant, store, and user authority is proved before provider work; the existing SAFE_MODE helper remains cached |
| Firestore writes | 0 | No canonical write-back |
| Firestore deletes | 0 | None |
| Storage operations | 0 | None |
| Upstash rate-limit operations | 1 sliding-window pipeline | Existing Functions rate limiter |
| Gemini provider calls | 1 | Uses Google Maps grounding tool |
| Google Maps grounded searches | 0 to multiple per prompt | [Current Gemini Maps-grounding billing](https://ai.google.dev/gemini-api/docs/maps-grounding) is per search query the model executes; one prompt can invoke multiple searches. |

## Confirmation Cost

| Owner action | Additional reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Save/remove existing Official Page Google Maps link | 0 | 0 additional | The internal URI binding is mirrored inside the existing store write. |
| Explicitly confirm a grounded Place-ID candidate | 1 transaction read | 1 | Rechecks exact tenant/store identity plus active, deleted, and block state before writing one nested Google Maps binding. |
| Remove a confirmed provider binding | 1 transaction read | 1 | Rechecks the same store boundary and deletes only that provider binding. |

No collection, index, Storage object, summary document, scheduled job, or
provider-history document was added. Identity-only confirmation does not change
public output and therefore does not trigger a public cache refill.

## Cost Guardrails

- Feature flag defaults off.
- The app flag blocks both provider checks and new grounded Place-ID
  confirmations. Removal remains available while disabled.
- Feature must stay off until provider smoke confirms Maps grounding on the pinned Functions `@google/genai` path or a scoped SDK migration is approved.
- Callable requires authentication.
- Signed tenant/store/platform claims are only initial admission. The callable
  re-reads the exact current tenant, store, and user and rejects inactive,
  deleted, disabled, blocked, unverified, removed, cross-product, or
  no-longer-assigned authority before provider work.
- SAFE_MODE blocks provider use.
- Rate limiting runs before provider use.
- No public route or anonymous usage.
- No scheduler.
- No saved report history.
- No source snapshot persistence.
- No raw provider response text is returned to the callable client.

## Storage Policy

The provider check writes nothing. The separate owner-confirmation flow may
store only:

- schema version
- provider name
- provider location ID when a stable ID was returned
- normalized provider URI
- owner-confirmed status, source, and confirmation time

There is no migration or bulk backfill. Existing Google Maps links remain
unchanged and gain the internal URI binding only on their next explicit owner
save. A URI-only binding does not claim a resolved Google Place ID.

Valid Place IDs are stored without truncation up to a 2,048-character
application safety ceiling. [Google documents that Place IDs have no maximum
length, can change, and should be refreshed when older than 12
months](https://developers.google.com/maps/documentation/places/web-service/place-id).
MenuList derives that future freshness decision from `confirmedAt`; it does not
add a scheduled refresh while the provider path remains disabled.

Owner-confirmed canonical fields require a separate write path and public cache invalidation.

## Collision Activation Gate

The current embedded binding does not add a cross-store provider-ID uniqueness
document or index. That keeps the flag-off prototype at its existing one-store
transaction cost, but it also means grounded-candidate confirmation UI cannot be
released until a server-authoritative, fail-closed and reversible collision
policy is approved and costed. Provider smoke alone does not satisfy this gate.

## Disallowed Storage

- Raw grounded response text
- Raw provider response text in callable output
- Review snippets
- Photos
- Broad Maps source snapshots
- Ratings-derived claims
- Menu items, prices, or availability inferred from Maps
