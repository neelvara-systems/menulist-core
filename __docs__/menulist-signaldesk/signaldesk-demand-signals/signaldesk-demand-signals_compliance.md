# SignalDesk Demand Signals - Compliance

**Status:** Runtime-enforced internal boundary
**Created:** June 23, 2026
**Runtime reconciled:** July 21, 2026

## Principle

Demand is business-operating evidence, not permission to identify or contact an anonymous customer.

## Enforced Rules

- The action API accepts only operation key, enumerated signal type/surface, optional target ID, and optional target name paired with a target ID.
- Unknown payload fields are rejected by a strict schema.
- General demand stores no person or business label.
- Target-scoped demand uses current SignalDesk target truth and ignores the caller label.
- No email, phone, IP address, device ID, fingerprint, customer session, message, or raw MenuList payload is accepted.
- Demand does not clear suppression, create contact authority, create a target, or trigger outreach.
- Client Firestore writes remain denied and raw demand events are not exposed in the workspace.

## Future Public Hook Gate

A future MenuList surface hook is not covered by the current operator action. It requires separate consent/privacy review, abuse/rate-limit design, payload and retention contract, cost ceiling, public-source attribution rules, tests, and deployment approval. Anonymous scans must remain aggregate and must never create a target by themselves.
