# Ads Studio - Test Cases

## Current Runtime Boundary

1. Creating an ad handoff pack uses existing campaign output fields and makes no Meta request.
2. `/api/campaigncue/integrations` returns Meta as `manual_only` without reading a provider-connection collection.
3. Campaign actions reject direct publish/send, provider metric import, ad create/edit, budget, catalog, and experiment mutations.
4. The workspace and Ads surfaces remain usable when Meta is unavailable because manual handoff is the active path.
5. The root package has no MCP SDK dependency and CampaignCue server/browser code has no Meta MCP network call.

## Future Read-First Connector

Before activation, tests must prove:

1. Only reporting, activity-log, signal-health, and help/troubleshooting tools are allowlisted.
2. Unknown, renamed, write-capable, or mixed read/write tools fail closed.
3. An arbitrary owner/model prompt cannot choose a provider tool directly.
4. Every response is schema-validated; malformed, oversized, future-version, partial, or cross-account payloads are rejected.
5. Workspace role, tenant, selected ad account, authorization state, and revocation are checked before provider work.
6. Timeout, rate limit, provider outage, and partial-response failures preserve manual handoff and do not write a stale/partial summary.
7. Repeated refreshes are deduplicated; unchanged normalized content does not create another Firestore write.
8. One successful refresh writes one bounded summary, never raw rows or one document per metric/activity item.
9. Ads/Results loads the summary lazily; Daily Desk and workspace overview do not gain a provider read.
10. Imported metrics carry date range, timezone, currency, attribution label, freshness, and provider confidence.
11. Provider evidence never rewrites Business Brain facts, Campaign Decision Engine scores, protected text, trust status, or owner-reported results without an explicit future merge policy.

## Mutation Rejection

1. Ad, campaign, and ad-set creation/editing remain unavailable.
2. Budget/spend changes remain unavailable.
3. Catalog writes remain unavailable.
4. A/B test or conversion-lift creation/management remains unavailable.
5. Enabling a future read connector cannot implicitly enable `ENABLE_CAMPAIGNCUE_PUBLISHING`.
