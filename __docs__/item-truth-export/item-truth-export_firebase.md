# Item Truth Export Firebase Notes

## Reads

OG/download endpoint per uncached request:
- 1 store document read
- 1 `platformSummary/projects_{storeId}` read
- up to N active public project reads until the item is found

The endpoint uses CDN cache headers:

```text
public, max-age=300, s-maxage=86400, stale-while-revalidate=604800
```

The image routes accept optional `project={projectId}`, `tenant={tenantId}`, and `store={storeId}` context. This keeps current-page downloads fast and lets older item IDs resolve even when the item ID does not contain tenant/store in its prefix.

## Writes

No Firestore writes are introduced by share/copy/download instrumentation. Events are GA4-only unless a future owner dashboard requires counters.

## Public Data

Renderer uses published project data and sanitized public menu output only. It does not expose owner-only settings or auth data.
