# Internal Ops Monitoring — Firebase And Cost

**Last updated:** July 17, 2026

## Manual refresh costs

| Surface | Bounded operation shape |
| --- | --- |
| Control Room | 1 current-user read; 2 alert/config document reads; up to 10 alert rows; 3 aggregation count queries |
| Store selector | 1 current-user read; 1 `storesSummary` document read, shared in provider state |
| Scheduler | 1 current-user read; up to 30 run rows; up to 100 settlement rows; filtered history may add 10 health rows |
| Extraction | 1 current-user read; up to 150 job rows; up to 100 cost rows |
| Messaging onboarding | 1 current-user read; at most 30 document reads plus 18 aggregation-count queries |
| Platform notifications | 1 current-user read; bounded newest-first scan capped at 150 |
| Owner notifications | 1 current-user read; bounded product window capped at 90; selected detail adds capped direct reads |
| Founder Monitor | 1 current-user read; three summary reads; up to 90 daily summaries; 40 movement rows |
| Cost Posture | 1 current-user read; one config; 30 alerts; 300 extraction rows; 200 Business Health rows |

No monitor uses a realtime listener. Empty source and read failure are different states.

## Writes

- SAFE_MODE: one transaction read; zero writes on replay, one config write on change; changed state attempts one alert write.
- Alert mute: one config write.
- Scheduler recovery: one callable and its existing run/state writes.
- Extraction retry: existing active-job claim and replacement job write.
- Notification/entity recovery: existing bounded/idempotent transactions and provider paths.
- `system_alert_retention_cleanup`: at most 100 deletes once daily after the 90-day cutoff.

## Scale decision

The system-alert cleanup is intentionally part of the existing `menulistMaintenanceScheduler`; a new scheduled Function would add operational overhead without value. The timestamp query uses an existing single-field index. The 100-row daily cap bounds cost; current alert volume is expected to remain below that drain rate. If telemetry proves sustained creation above 100 old rows/day, adjust this cap rather than introducing a second scheduler.

The compact `platformSummary/storesSummary.stores` and `platformSummary/projects_{storeId}.projects` maps are read only after exact summary-document resolution. No runtime query filters or orders by either nested map; the special-menu scheduler queries the separate top-level `specialMenuNextTransitionAt` scalar. `firestore.indexes.json` therefore disables automatic single-field indexing for `platformSummary.stores` and `platformSummary.projects`. This removes nested index fanout from store identity/entitlement/presence updates and project publish/active/special-menu summary updates without changing read counts, summary payloads, scalar query indexes, or public/cache behavior.

## Deployment

The scoped Firestore index deployment and the existing `menulistMaintenanceScheduler` deployment are required. The prior scheduler deploy passed predeploy lint/build and failed before upload with Cloud Resource Manager HTTP 403 caller permission. The retries remain owner/IAM-pending; production requires QA evidence and explicit approval. No Firestore rule or Storage rule changed in this cost pass.
