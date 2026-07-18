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
| `platformSummary/activation_{tId}_{sId}` | Factual launch verification and next blocker |

Worst case: 6 reads per uncached brief request.

Cache hit: 0 Firestore reads for 60 seconds inside the server process.

## Writes

No writes from the brief or prepared-card preview. When the optional action flag is enabled and the owner submits the prefilled Support Board form, the existing one-card write path applies.

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
- Maximum four returned actions.
- No raw tickets, conversations, signals, or search-history collections are scanned.
- No model call is made for the daily brief.
- No transcript is stored.
- No support-credit debit is added.

## Cost Impact

The daily brief adds one compact activation-summary read to the existing five-document Support Assistant packet on a cache miss. It adds CPU-only deterministic ranking and no raw collection query. Cache hits remain zero reads. The release deep link and prepared-card handoff add zero reads and zero writes before owner confirmation and create no assistant action collection.
