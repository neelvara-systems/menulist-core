# Owner Business Assistant Firebase Model

**Owner-Facing Name:** Business Health
**Status:** Compact read-only model
**Last Updated:** June 17, 2026

## Cost Position

Business Health must stay compact by default. It is a read model and answer layer, not an event stream or action workflow engine.

## Allowed Firestore Shape

Business Health may use bounded documents for:

- current health summary
- daily health snapshots
- analytics period index
- multi-location summary
- compact owner threads
- answer events
- feedback
- platform monitoring

Every query must be tenant/store scoped and bounded.

## Removed Workflow Storage

Business Health no longer has workflow storage for owner operations. Operation records and operation drafts are removed from the active contract.

They must not be present in active database constants, rules, scheduler cleanup, platform monitor reads, or UI docs.

## Forbidden Cost Patterns

- Firestore write per token
- Firestore document per message fragment
- Firestore document per provider chunk
- Firestore document per card render
- unbounded listener over all sessions/proposals/history
- opening Business Health by scanning historical daily sessions
- raw project/menu/store scans at answer time
- base64 images in Firestore
- Business Health generated-media storage
- action/draft workflow writes

## Context Packet Cache

Context packet cache keys must include tenant, store, packet profile, and selected project where the packet is project scoped.

Active packet profiles:

- `health_card`
- `analytics_periods`
- `owner_question_basic`
- `multi_location_summary`

Context packets must not include an action catalog.

## Scheduler Discipline

Business Health scheduled work belongs in existing consolidated MenuList scheduler discipline with bounded reads, leases, and explicit cost notes. No standalone cleanup scheduler should exist for Business Health action records because those records are no longer produced.

## Storage

Core Business Health uses no Firebase Storage. Generated images, imports, and heavy operation artifacts belong to Menu Manager or their existing feature-specific systems, not Business Health.

## Rules

Firestore rules should keep Business Health read models protected behind APIs unless an existing safe client-read pattern is explicitly documented.

Direct client writes to Business Health monitor/thread/feedback docs must remain blocked unless the route is explicitly designed for that write.

There are no active Firestore rules for removed Business Health operation records or operation drafts.

## Cost Acceptance

Opening Business Health should use cached data or a bounded current-health read. Asking a question should reuse context packets where possible and write at most the bounded thread/event records enabled by flags. It must not create action workflow documents.
