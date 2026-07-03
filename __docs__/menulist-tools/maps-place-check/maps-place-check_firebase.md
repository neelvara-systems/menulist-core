# Maps Place Check - Firebase Cost Tracking

**Status:** Backend prototype
**Default flag:** Off

## Current Runtime Cost

| Resource | Count per check | Notes |
| --- | ---: | --- |
| Callable Function invocation | 1 | `mapsPlaceCheck` |
| Firestore reads | 1 cached SAFE_MODE read per warm instance per minute | Existing SAFE_MODE helper |
| Firestore writes | 0 | No canonical write-back |
| Firestore deletes | 0 | None |
| Storage operations | 0 | None |
| Upstash rate-limit operations | 1 sliding-window pipeline | Existing Functions rate limiter |
| Gemini provider calls | 1 | Uses Google Maps grounding tool |
| Google Maps grounded prompts | 0 or 1 billable grounded result | Charged only when provider returns a Maps-grounded result under current provider rules |

## Cost Guardrails

- Feature flag defaults off.
- Feature must stay off until provider smoke confirms Maps grounding on the pinned Functions `@google/genai` path or a scoped SDK migration is approved.
- Callable requires authentication.
- SAFE_MODE blocks provider use.
- Rate limiting runs before provider use.
- No public route or anonymous usage.
- No scheduler.
- No saved report history.
- No source snapshot persistence.

## Storage Policy

The prototype writes nothing. A future confirmation flow may store only:

- `googleMapsPlaceId`
- normalized Google Maps URI
- `lastMapsPlaceCheckAt`
- owner/admin confirmation status

Owner-confirmed canonical fields require a separate write path and public cache invalidation.

## Disallowed Storage

- Raw grounded response text
- Review snippets
- Photos
- Broad Maps source snapshots
- Ratings-derived claims
- Menu items, prices, or availability inferred from Maps
