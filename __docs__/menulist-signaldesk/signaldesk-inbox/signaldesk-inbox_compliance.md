# SignalDesk Inbox - Compliance Policy

**Status:** Initial policy
**Created:** June 23, 2026

## Principle

Inbound replies are consent and safety signals. SignalDesk must honor opt-out, do-not-contact, wrong-contact, and complaint signals before any growth workflow continues.

## Mandatory Handling

| Reply signal | Required handling |
| --- | --- |
| Unsubscribe | Suppress channel identity and target outreach immediately. |
| Do not contact | Suppress target and all known channel identities unless legal review says otherwise. |
| Wrong contact | Suppress contact identity and lower target contactability confidence. |
| Complaint | Suppress, create incident, notify admin, and pause related follow-up. |
| Bounce/invalid | Suppress that channel identity and update deliverability summary. |

## Privacy Rules

- Store only normalized reply content needed for audit and follow-up.
- Do not store raw provider payloads when normalized fields are enough.
- Do not expose inbox content outside the internal tool.
- Do not use reply content to enrich unrelated MenuList customer data.
- Do not infer sensitive categories from reply text.

## AI Classifier Rules

- Classifier output is a suggestion, not authority.
- Low-confidence or policy-sensitive cases default to human review.
- Suppression-required labels must be deterministic and independently enforced.
- Classifier prompts and versions must be logged for audit.

## Operator Rules

- Override requires reason.
- Reopening suppressed conversations requires admin role and audit event.
- Complaint review is admin-only.
- Manual notes must not include secrets, passwords, payment data, or unrelated personal details.
