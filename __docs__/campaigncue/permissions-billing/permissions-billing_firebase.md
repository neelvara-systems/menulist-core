# Permissions Billing - Firebase Notes

## Collections

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/members` | Workspace roles and scopes. |
| `campaigncueBillingAccounts/{billingAccountId}` | Payer, plan, invoice, and subscription metadata. |
| `campaigncueBillingAccounts/{billingAccountId}/usageLedger` | Credit and provider usage events. |
| `campaigncueBillingAccounts/{billingAccountId}/planEntitlements` | Feature, seat, location, and credit limits. |
| `campaigncueWorkspaces/{workspaceId}/spendApprovals` | Spend-changing approval records. |

## Cost Guardrails

- Usage ledger must be append-only and paginated.
- Dashboard reads should use monthly usage summary docs.
- Credit estimates should not require scanning historical usage.
- Billing webhooks should write idempotently.
- Store only necessary invoice metadata, not full payment data.

## Security

- Billing data requires billing admin or owner role.
- Payment provider secrets never live in Firestore.
- Spend approvals require actor id, role, timestamp, amount/limit, and target action.
- Agency billing access must respect agency/client payer boundaries.

