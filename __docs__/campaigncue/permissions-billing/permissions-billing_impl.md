# Permissions Billing - Implementation

## Runtime Contract

Permissions Billing should use CampaignCue-scoped role constants, billing records, and usage ledgers. Spend-changing actions must check permission server-side even when the UI hides controls.

## Roles

| Role | Core Permission |
| --- | --- |
| `owner` | Full workspace control. |
| `admin` | Manage campaigns, users, and settings except billing ownership transfer. |
| `marketer` | Create and edit campaign packs. |
| `reviewer` | Comment and approve assigned outputs. |
| `local_manager` | Manage assigned location outputs. |
| `agency_member` | Manage assigned client workspaces through agency link. |
| `billing_admin` | View plans, invoices, usage, and credit purchase settings. |

## Flow

1. User starts a generation, render, publish, or spend-changing action.
2. Permission service checks role, workspace, agency/client link, and location scope.
3. Usage service returns credit estimate or spend warning.
4. User confirms where required.
5. Provider attempt is recorded.
6. Usage ledger is finalized as charged, failed, refunded, or adjusted.

## Current Runtime

- The workspace has a Billing/Permissions posture screen.
- Workspace member roles and feature flags are visible from the owner app.
- Billing checkout, credit purchase, usage capture, and spend-changing actions are disabled.
- Direct publish and direct send are blocked server-side even if a user reaches the action.
- Settings can request agency, multi-location, deterministic generation, or direct publishing posture, but unsafe provider/billing flags remain gated by repo-level CampaignCue feature flags.

## Data Objects

| Object | Purpose |
| --- | --- |
| `workspaceMembers` | Role and location scope. |
| `billingAccounts` | Payer, plan, and invoice metadata. |
| `usageLedger` | Credit and provider usage events. |
| `planEntitlements` | Feature, credit, seat, and location limits. |
| `spendApprovals` | Ad/channel spend approvals and actor records. |

## Acceptance

- Server-side checks block unauthorized publish/spend actions.
- Credits are estimated before expensive generation.
- Failed provider attempts reconcile visibly.
