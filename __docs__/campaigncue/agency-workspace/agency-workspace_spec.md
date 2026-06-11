# Agency Workspace - Spec

## Summary

Agency Workspace lets agencies manage multiple local-business clients, prepare campaign packs, collect approvals, reuse templates, and produce client reports without mixing client data.

## Goals

- Support agencies as a primary buyer without weakening owner-first workflows.
- Keep client workspaces strictly separated.
- Provide approval links and reporting snapshots.
- Let agencies reuse campaign templates while keeping source facts client-specific.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Multi-client dashboard | Agency user can switch assigned client workspaces. |
| Approval workflow | Client owner can approve, reject, or comment on campaign outputs. |
| Templates | Agency can create reusable campaign structures without copying client facts. |
| Report snapshots | Agency can prepare shareable client reports from campaign summaries. |
| Role boundaries | Agency admin, agency member, client owner, and client reviewer roles are separate. |
| Audit trail | Approval, export, publish, and client comment actions are logged. |

## Non-Goals

- It is not a full CRM.
- It does not manage agency invoices unless billing scope explicitly includes it.
- It does not allow one client to see another client's data.

## Risks

- Multi-client access mistakes are high severity.
- Template reuse can accidentally carry stale client facts.
- Client approval links need strong expiry and access rules.

