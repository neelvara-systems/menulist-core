# Founder Daily Brief Firebase Notes

## Collections

No new collections.

Explicitly rejected:

- `answerlattice_ownerActions`;
- `ownerActionCenter`;
- per-action seen/snoozed/dismissed documents;
- handled-today history;
- action evidence event documents.

## Reads

The feature reuses the existing Support Assistant summary packet:

| Document | Purpose |
| --- | --- |
| `platformSummary/coverage_{tId}_{sId}` | Coverage/readiness |
| `platformSummary/trustMetrics_{tId}_{sId}` | Drift, entity health, resolution |
| `platformSummary/supportBoardSummary_{tId}_{sId}` | Open and needs-answer cards |
| `platformSummary/frictionSnapshot_{tId}_{sId}` | Recent signals, escalations, and the bounded top-friction entity projection |
| `platformSummary/knowledgeIntakeSummary_{tId}_{sId}` | Review items |
| `platformSummary/activation_{tId}_{sId}` | Factual launch verification and next blocker |

Worst case: 6 reads per uncached brief request.

Cache hit: 0 Firestore reads for 60 seconds inside the server process.

Source-health classification, deterministic ranking, permission filtering, and strict browser validation are CPU-only. They add no Firestore operation.

The documented hardening may additionally project fields already present in these six documents:

- `trustMetrics.topFailingEntities`;
- `supportBoardSummary.highPriorityCards`;
- `frictionSnapshot.frictionLevel`;
- `frictionSnapshot.topFrictionEntities`.

These are already loaded with the same six point reads. Projecting them must not introduce a seventh document read or a list query.

## Writes

No writes from the brief or prepared-card preview. When the optional action flag is enabled and the owner submits the prefilled Support Board form, the existing one-card write path applies.

Daily Brief does not write seen, handled, snoozed, dismissed, accepted-risk, priority, fingerprint, or completion state. The source workflow owns resolution and its existing audit behavior.

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
- No realtime action listener.
- No summary rebuild caused by opening Daily Brief.
- No action write caused by refreshing Daily Brief.
- No duplicated lifecycle that must reconcile with Support Board, Governance, Tickets, Releases, or Activation.

## Cost Impact

The daily brief uses the existing six-document Support Assistant packet, including Activation proof, on a cache miss. It adds CPU-only deterministic ranking and no raw collection query. Cache hits remain zero reads. Naming the highest-friction product area reads the first already-loaded summary entry and adds no Firestore operation. The release deep link and prepared-card handoff add zero reads and zero writes before owner confirmation and create no assistant action collection.

Scheduled summary timestamps older than 48 hours are exposed as stale. A five-minute future tolerance avoids small clock skew while rejecting implausible future evidence. These checks do not refresh or rewrite a source.

Removing generic release and cost cards, admitting the quiet state, projecting `highPriorityCards`, and tightening friction qualification are CPU-only changes. The Firebase cost remains six cold reads or zero reads on a valid 60-second process-cache hit.
