# SignalDesk Operating Layer - Implementation

**Status:** Implementation-ready
**Created:** June 24, 2026

## Runtime Files

```txt
src/app/(signaldesk)/signaldesk/mission/page.tsx
src/components/signaldesk/SignalDeskWorkspace.tsx
src/constants/signaldesk/routes.ts
src/constants/signaldesk/database.ts
src/types/signaldesk/index.ts
src/lib/signaldesk/workflowServer.ts
src/app/api/signaldesk/workspace/route.ts
src/app/api/signaldesk/actions/route.ts
src/database/signaldesk/index.ts
firestore-signaldesk.rules
firestore-signaldesk.indexes.json
scripts/verification/verify-signaldesk-runtime.js
```

## Feature Flag

```txt
ENABLE_MENULIST_SIGNALDESK_OPERATING_LAYER
```

## Collections

```txt
signaldeskGrowthMissions
signaldeskExperimentCards
signaldeskOfferCtas
signaldeskReplyPlaybooks
signaldeskSourceQualitySnapshots
signaldeskResearchRuns
signaldeskResearchTableRows
```

## Actions

```txt
create-daily-growth-mission
review-growth-mission
create-experiment-card
review-experiment-card
upsert-offer-cta
upsert-reply-playbook
create-source-quality-snapshot
create-research-agent-run
```

## Server Rules

- `create-daily-growth-mission` reads existing summaries and writes one daily mission.
- Daily mission actions are capped at five.
- `review-growth-mission` updates mission status and owner decision note.
- `create-experiment-card` records a controlled pod/source/CTA/proof test.
- `review-experiment-card` records repeat, narrow, stop, hold, or complete decisions.
- `upsert-offer-cta` records approved owner asks and blocked claims.
- `upsert-reply-playbook` records approved reply playbooks.
- `create-source-quality-snapshot` computes quality from source runs, targets, outcomes, demand, and vendor data.
- `create-research-agent-run` converts a plain-English prompt into a governed provider run, target import, research table rows, source-transparent enrichment columns, pass/fail/unsure decisions, and a market-pod update.
- Dashboard and Mission views read the compact research run/table summaries so the founder can review a prepared lead batch without opening raw provider details.

## UI

The Dashboard screen should show:

- Market Search form.
- Area/category prompt presets.
- Latest lead-batch run status.
- Today's Lead Batch capped at 30 rows.
- Structured evidence, contact path, share message, and recommended safe action per lead.
- Failed research rows and suppressed/held/rejected fallback targets are excluded from the daily lead batch.

The Mission screen should show:

- Research Agent Table form and output rows.
- Today's Lead Batch for deeper workflow access.
- Daily Growth Mission panel.
- Experiment card form and list.
- Offer/CTA form and list.
- Reply playbook form and list.
- Source-quality snapshot list.
- First 7-day trial checklist.

## Safety

The operating layer is record/recommend/prepare only.

It must not:

- send;
- publish;
- spend;
- call paid providers;
- bypass source policy;
- bypass suppression;
- write MenuList customer truth.
- convert source-only data into contact permission.
