# Permissions Billing - Spec

## Summary

Permissions Billing defines CampaignCue's workspace roles, agency/client access, credit estimation, generation usage, plan limits, invoice posture, and spend-changing approvals.

## Goals

- Prevent accidental generation cost and ad/channel spend.
- Keep roles understandable for owners and agencies.
- Make credits visible before expensive actions.
- Support workspace, agency, and multi-location billing boundaries.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Roles | Owner, admin, marketer, agency member, reviewer, local manager, and billing admin permissions are explicit. |
| Credit estimate | Generation and render actions show estimated credit use before execution. |
| Usage ledger | Provider attempts, refunds, failures, and adjustments are recorded. |
| Plan limits | Workspaces show plan, usage, limits, and blocked states. |
| Spend approval | Ad spend or paid channel actions require explicit role permission and approval. |
| Agency billing | Agency-paid and client-paid workspaces remain distinct. |

## Non-Goals

- It does not define final pricing numbers until pricing is approved.
- It does not manage external ad-platform invoices.
- It does not allow user overrides to bypass security or spend controls.

## Risks

- Unclear credits can reduce trust.
- Agency billing can become confusing if payer and workspace owner differ.
- Provider failures need clear reconciliation.

