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

## UI

The Mission screen should show:

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
