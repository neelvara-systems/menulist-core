# Founder Daily Brief Firebase Notes

## Collections

No new collections.

## Reads

The feature reuses the existing Support Assistant summary packet:

| Document | Purpose |
| --- | --- |
| `platformSummary/coverage_{tId}_{sId}` | Coverage/readiness |
| `platformSummary/trustMetrics_{tId}_{sId}` | Drift, entity health, resolution |
| `platformSummary/supportBoardSummary_{tId}_{sId}` | Open and needs-answer cards |
| `platformSummary/frictionSnapshot_{tId}_{sId}` | Recent signals and escalations |
| `platformSummary/knowledgeIntakeSummary_{tId}_{sId}` | Review items |

Worst case: 5 reads per uncached brief request.

Cache hit: 0 Firestore reads for 60 seconds inside the server process.

## Writes

No writes.

## Deletes

No deletes.

## Listeners

No realtime listeners.

## Schedulers

No new scheduler. Existing nightly jobs remain responsible for writing the summaries.

## Placement Cost

Dashboard, Activation, and Support Control navigation links use the existing route and already-loaded screen state. They add no Firestore read, write, realtime listener, scheduler, provider call, or support-credit debit.

## Cost Guardrails

- Summary-only read model.
- Maximum six returned actions.
- No raw tickets, conversations, signals, or search-history collections are scanned.
- No model call is made for the daily brief.
- No transcript is stored.
- No support-credit debit is added.

## Cost Impact

The daily brief adds no incremental Firestore reads beyond the existing Support Assistant brief call because it is computed from the same loaded packet. It adds CPU-only deterministic ranking in the API process.
