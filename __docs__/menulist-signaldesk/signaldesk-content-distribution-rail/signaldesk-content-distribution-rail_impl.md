# SignalDesk Content Distribution Rail - Implementation

**Status:** Feature 16 locally source-complete
**Date:** June 24, 2026
**Last Updated:** July 22, 2026

## Runtime Files

| File | Role |
| --- | --- |
| `src/app/(signaldesk)/signaldesk/content/page.tsx` | Content route entry. |
| `src/app/api/signaldesk/workspace/route.ts` | Feature-gated protected workspace read boundary. |
| `src/components/signaldesk/SignalDeskWorkspace.tsx` | Content UI panels and action handlers. |
| `src/app/api/signaldesk/actions/route.ts` | Protected action validation and dispatch. |
| `src/lib/signaldesk/workflowServer.ts` | Server-side content rail workflow. |
| `src/types/signaldesk/index.ts` | Content source, asset, draft, calendar, and performance contracts. |
| `src/constants/signaldesk/database.ts` | Content collection names. |
| `src/database/signaldesk/index.ts` | Client action union. |
| `firestore-signaldesk.rules` | Read-only client access. |
| `firestore-signaldesk.indexes.json` | Composite indexes. |
| `scripts/verification/verify-signaldesk-runtime.js` | Drift verifier. |

## Action Flow

```txt
upsert-content-source
  -> signaldeskContentSources
create-content-asset
  -> signaldeskContentAssets
generate-content-distribution-drafts
  -> signaldeskContentDistributionDrafts
review-content-distribution-draft
  -> approval/status update
schedule-content-distribution-draft
  -> signaldeskContentCalendarItems
record-content-performance
  -> signaldeskContentPerformanceSummaries
  -> approved draft + matching calendar item published
  -> source asset distributed
  -> optional signaldeskDemandSignalSummaries
```

Proof authority is a separate founder-controlled path:

```txt
target registry option (configure authority only)
  -> active / hold / revoked proof permission
  -> customer-proof asset authority
  -> draft and schedule revalidation
  -> hourly natural-expiry materialization and bounded dependency reconciliation
```

## Permission And Read Contract

| Operation | Required permission |
| --- | --- |
| Content source configure | `source.configure` |
| Proof permission grant/hold/revoke | `signaldesk.configure` plus founder-admin role |
| Asset and draft creation | `draft.create` |
| Asset review, draft review, schedule | `draft.approve` |
| Manual performance evidence | `target.review` |

The content workspace loads sources, assets, calendars, drafts, performance, market pods, proof permissions, and CTAs concurrently. It loads bounded target options only for `signaldesk.configure`; operators without that authority receive an empty target list. UI controls mirror the API permissions but do not replace server enforcement.

## Activation Proof Preparation

Today and Activations may route a verified target to `/signaldesk/content?proofTargetId={targetId}`. The Content workspace admits the target only when it is present in the existing configure-authorized bounded target list and its durable projection contains an activation timestamp, evidence reference, `menulist-signed` or `owner-reviewed-manual` integrity, and at least two distinct activation surfaces. It then:

1. selects the target;
2. selects an active, currently effective proof permission containing at least one public proof scope;
3. selects an active proof/case source only when any referenced market pod is currently founder-approved; and
4. prefills a reviewable customer-proof title and canonical message.

The preparation path never calls `runAction()`. Existing permission, source, asset, draft, review, scheduling, and performance actions remain separate explicit submissions with their existing server revalidation and idempotency contracts.

## Safety Gates

- `ENABLE_MENULIST_SIGNALDESK_CONTENT_DISTRIBUTION_RAIL` must be true.
- The flag fails closed at the page route, workspace API, advanced navigation, UI handlers, and server workflow.
- `content-distribution` kill switch blocks content writes that advance the rail.
- Draft scheduling requires `approvalStatus = approved`.
- Client writes remain denied in Firestore rules; mutations go through the protected action API.
- Performance capture is manual and compact. Non-zero metrics require a publication URL/timestamp and an approved draft; publication evidence is fingerprinted into idempotency, revalidates asset/draft/calendar coupling, and settles their publication state atomically.
- Published-state replay must match the existing publication URL and timestamp. It never calls a social or publishing provider.

## Distribution.ai Adaptation

Adopted:

- Source asset to channel-ready drafts.
- Content calendar queue.
- Brand/proof-aware repurposing.
- Performance feedback.

Rejected:

- Auto-publishing as the default.
- Broad social manager scope.
- Public productization.

## Proof-Permission Expiry And Published-Authority Reconciliation - July 15, 2026

`functions-signaldesk/src/schedulers/signaldeskMaintenanceScheduler.ts` now owns one hourly, leased `proof_permission_lifecycle` task. `functions-signaldesk/src/schedulers/proofPermissionLifecycle.ts` materializes naturally due active grants as expired, stores the deterministic `proof-permission-expiry-v1` reconciliation token/progress on the permission, and resumes bounded asset, draft, and calendar pages after interruption.

The app server keeps a separate `content-authority-hold-v1` owner for founder mutations to source, proof-permission, CTA, pod, offer, and asset authority. App recovery refuses scheduler-owned tokens instead of consuming or replacing them.

For unpublished dependants, authority reduction applies conservative holds. Already-published truth is never rewritten as unpublished: distributed/marker assets, published drafts, and published calendar items retain their publication status and open one deterministic high-severity removal/review incident per authority path plus asset. The asset receives a durable `publicationReviewRequired` marker. Evidence selection is timestamp-first and then completeness-ranked, so an older draft/calendar cannot downgrade a newer marker; nullable incident fields are written explicitly so a newer sparse marker cannot retain stale URL or draft identity.

Existing incident/product/control collisions fail before partial writes. Resolved incidents reopen under the same ID on a later authority token without incrementing the total incident count again. Direct CTA reconciliation also follows published drafts/calendars whose legacy asset has no `ctaId`, while retaining the published dependency and asset state.

Malformed same-product dependency rows are fail-visible. Draft ID, channel, lifecycle pair, schedule, and optional publication evidence are validated before mutation. Calendar ID must match both its stored ID and `content_calendar_{contentDraftId}` link, with a valid channel/schedule and exact publication URL/timestamp pairing. Malformed permission/asset/draft/calendar rows are quarantined through a deterministic lifecycle-failure incident; later valid permissions continue in the same scheduler run.

Failure reporting re-reads the permission transactionally. If its product changed after a scoped query, no SignalDesk incident, control, audit, timeline, or permission effect is written. Retry/reconciliation errors and even a colliding malformed failure-incident document are isolated per permission; the run increments `failureDiagnosticErrorCount`, emits one stable structured diagnostic without raw payload/error text, and continues to later permissions.
