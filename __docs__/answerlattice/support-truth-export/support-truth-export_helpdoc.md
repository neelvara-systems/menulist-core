# Support Truth Export - Owner Guide

## Download Approved Support Truth

1. Open **Settings** in Answerlattice.
2. Find **Support Truth Export**.
3. Select **Download JSON**.
4. Keep the file private because it contains approved internal product-support knowledge.

The export includes approved answers, relevant source references/citations, product structure, published help content, mapped product surfaces, changelog entries, and releases. It does not include tickets, conversations, secrets, embeddings, or audit history.

## Who Can Export

Workspace owners and roles with **Export data** permission can use the action. Other users do not see the card and the server independently denies unauthorized requests.

## Common Errors

| Code | Meaning | Recovery |
| --- | --- | --- |
| `FEATURE_DISABLED` | Export is not enabled. | Contact the workspace owner or Answerlattice operator. |
| `NOT_ONBOARDED` | No active Answerlattice workspace is available. | Finish workspace setup or switch to the correct product account. |
| `FORBIDDEN` | The current role lacks export permission. | Ask an owner to grant **Export data** or run the export. |
| `RATE_LIMITED` | Two export attempts were used in the current hour. | Wait for the retry period. |
| `RATE_LIMIT_UNAVAILABLE` | The protective limiter is unavailable. | Retry later; the export fails closed. |
| `EXPORT_TOO_LARGE` | The complete package exceeds a safe cap. | Contact support for a reviewed managed export. |
| `EXPORT_FAILED` | Package or audit creation failed. | Retry once; if it repeats, provide the time and workspace to support. |

## Important Boundary

This is a governed support-truth package, not a legal data export, full backup, account closure, or deletion request.
