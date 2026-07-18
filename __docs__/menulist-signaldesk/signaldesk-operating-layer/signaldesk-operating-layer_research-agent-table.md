# SignalDesk Operating Layer - Research Agent Table

**Status:** Implemented for internal testing
**Created:** June 26, 2026
**Parent:** [SignalDesk Operating Layer](./README.md)

## Purpose

The Research Agent Table brings the most useful Origami-style workflow into SignalDesk:

```txt
plain-English prompt
  -> provider/source plan
  -> governed source-provider run
  -> normalized target import
  -> enrichment table rows
  -> pass / fail / unsure scoring
  -> source transparency
  -> market pod update
```

Example prompt:

```txt
Find cafes in Koramangala with weak menu presence
```

The output is a founder-readable table, not an autonomous campaign.

The same output also feeds the Dashboard `Today's Lead Batch` panel. That is the practical first screen: the founder sees up to 30 pass/unsure leads, why each lead matters, the recommended contact path, what to share, and the next safe action.

## Runtime

| Area | Implementation |
| --- | --- |
| Feature flag | `ENABLE_MENULIST_SIGNALDESK_RESEARCH_AGENT_TABLE` |
| Action | `create-research-agent-run` |
| Server function | `createSignalDeskResearchAgentRunServer` |
| UI | Dashboard `Market Search` and `Today's Lead Batch`; Mission `Research Agent Table` panel |
| Provider options | `google-places`, `apify`, `fhrs-fhis` |
| Collections | `signaldeskResearchRuns`, `signaldeskResearchTableRows` |
| Idempotency | Required bounded actor- and resolved-request-bound key stored in `signaldeskIdempotencyKeys`. The browser retains one key for unchanged prompt/provider/type/policy/result-cap input after failure and clears it after success. New run identity derives from actor plus key hash, so independent keys cannot share a run/row namespace; legacy exact claims replay their stored entity ID. One transaction creates the key, run, and initial timeline before provider use; concurrent exact retries return the existing run with its persisted lifecycle status unchanged, changed input conflicts, and ambiguous claim acknowledgement probes exact durable truth. Replay disposition stays in the separate response `duplicate` flag. The nested provider call derives a second stable key from the research run, reserves any estimated cost against transaction-current account/policy caps before external execution, and atomically commits target/source/provider/retention/claim/audit/cost truth after provider success. An unresolved provider/import outcome becomes review-required with a stable code and no automatic repeat. |
| Completion and founder authority | Final rows/run/pod/timeline/audit/cost settle in one transaction that reads current market-pod review authority. A founder decision committed during provider work cannot be overwritten by stale completion fields. A final transaction error re-reads the deterministic run plus at most 100 matching rows; durable `completed` truth returns directly and blocked compensation applies only when completion is not present. |

## Table Columns

Default business prospect rows include:

- business
- category
- location
- website
- current-list gap
- contactability
- source reference
- evidence summary
- recommended channel
- recommended CTA
- recommended message angle
- fit decision
- next action

Partner-list rows use a partner-oriented column set:

- partner
- partner type
- location
- source reference
- trust fit
- fit decision
- next action

## Fit Decisions

| Decision | Meaning | Next Action |
| --- | --- | --- |
| `pass` | Looks useful for a MenuList pod, prospect review, or partner review. | `score`, `partner-review`, or `pod-review` |
| `unsure` | Needs evidence or manual review before use. | `evidence` or `pod-review` |
| `fail` | Low fit, suppressed, or not useful for this prompt. | `hold` |

## Source Transparency

Each run stores:

- provider;
- source policy;
- source run;
- provider run;
- source references on each row.

Rows also include a `source-transparency` enrichment entry so the table can be audited without opening raw provider payloads.

## Today's Lead Batch

The batch is sorted for founder review:

1. `fail` rows are kept out of the daily lead batch.
2. `pass` rows appear first, then `unsure`.
3. Higher `fitScore` first inside each decision group.
4. Maximum 30 rows on the first screen.

`fail` rows remain visible in Research Output for audit and source-quality learning, but they are not presented as actionable daily leads.

Each card shows:

- lead identity and location;
- validated / needs-evidence state and score;
- evidence gap and source reference;
- recommended channel such as email/export, manual path, partner intro, pod review, or hold;
- recommended CTA and message angle for what should be shared;
- MenuList share message;
- one next action: score, evidence, partner review, pod review, or hold.

If no research table rows exist yet, the dashboard falls back to clear, non-held, non-rejected target summaries so the screen is still useful during the first local trial.

## Prompt Presets

Dashboard/Mission search includes internal presets for common MenuList operating loops:

- Indiranagar cafes and dessert shops;
- Koramangala QSRs;
- Bengaluru menu-photographer and restaurant-consultant partner list.

Each approved Bengaluru preset fills the prompt and sets the first-trial batch to 25. The runtime hard limit remains 30 for a later separately approved use. The source-policy/provider gates still decide whether a run is allowed.

The approved first trial uses the evidence-only public-business manual policy for candidate imports. Market Search remains blocked until a matching provider policy, provider readiness, and separate budget approval exist; the Bengaluru presets do not grant provider or contact permission.

## Boundaries

- No Origami API integration.
- No external sequencer.
- No provider send.
- No social DM automation.
- No paid campaign automation.
- No public SignalDesk page.
- No MenuList store/menu/project/billing/public-output writes.
- No raw provider payload storage.
- Contact use still depends on the source policy. FHRS/FHIS and other source-only records do not become contact identities unless a separate contact-approved source policy allows it.

## Verification

Covered by:

```bash
npm run verify:signaldesk
npm run test:signaldesk:e2e:local
npx tsc --noEmit --incremental false --pretty false
```

The local E2E mocks the FHRS/FHIS provider, creates a research run, verifies two table rows, checks source transparency, verifies the dashboard workspace receives the research rows, rejects changed-input key reuse, proves two concurrent exact requests invoke the provider once, updates a market pod, and confirms no contact identities are created from source-only data.
