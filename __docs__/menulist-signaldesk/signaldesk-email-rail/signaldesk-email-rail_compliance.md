# SignalDesk Email Rail - Compliance

**Status:** Implemented control contract; external certification pending
**Last Updated:** July 21, 2026

## Core Rule

Email is an owner-approved, low-volume contact path. Source permission and
recipient identity are required facts, not inferred convenience fields.

## Before Export Or Send

- current source policy permits the requested use and has a valid retention period;
- current contact identity is permissioned and carries matching permission evidence;
- target, approval, draft, evidence, CTA, sender, and recipient fingerprints still agree;
- suppression is clear and no prior contact/reply/outcome blocks the action;
- global and email pauses are clear; campaign pause also governs sequencing;
- sender state is active, authenticated, unsubscribe-ready, low-risk, and low-volume/ready;
- live SMTP additionally has a matching From domain, valid optional Reply-To, physical address, unsubscribe URL, provider approval, and budget capacity.

The SMTP adapter appends the maintained physical address and unsubscribe URL.
This is a technical control, not a substitute for jurisdiction-specific legal
review or provider certification.

## Inbound Safety

Signed email webhook events normalize replies and delivery status. Unsubscribe,
DNC, wrong-contact, complaint, privacy/legal request, and hard-bounce signals can
write suppression immediately. Complaint/privacy/legal events create an incident
and activate the email pause pending founder review.

## Prohibited

- cross-channel draft reuse;
- contact without current permission evidence;
- sending after suppression, complaint, or unsubscribe;
- deceptive sender identity or subject;
- retrying an unresolved provider outcome;
- raising volume before sender health and provider certification are reviewed.

## External Pending

SMTP credentials, DNS/authentication evidence, physical-address approval,
unsubscribe destination, webhook secret/provider mapping, mailbox reputation,
and a controlled recipient smoke test remain owner/provider certification work.
