# SignalDesk Revenue Operating Layer - Compliance

**Status:** Active implementation contract
**Created:** July 10, 2026
**Last verified:** July 21, 2026

## Global References

Use existing SignalDesk and global security rules:

- [SignalDesk compliance](../menulist-signaldesk_compliance.md)
- [Security implementation rules](../../../.codex/rules/SECURITY_IMPLEMENTATION_RULES.md)
- [Source policy](../signaldesk-source-policy/README.md)
- [Approval queue](../signaldesk-approval-queue/README.md)

## Hard Rules

- A revenue account does not create new outreach rights.
- Qualification cannot override source expiry, blocked contact use, or suppression.
- Public business/contact information is not treated as consent.
- AI cannot qualify legal eligibility, approve an envelope, set price authority, or move an opportunity to won.
- Manual opportunity mutation cannot set `won`; only a verified two-surface activation projection may do so.
- Discounts above the offer's recorded authority require founder review.
- Exception-only mode remains held until separately proven and enabled.
- Operating envelopes expire and never silently renew or graduate.
- Every envelope requires an explicitly founder-approved active market pod with stored approval evidence; a recommendation or research result cannot activate itself.
- Only the founder role may store an approved operating envelope, and the write transaction revalidates every referenced control against its current state.
- Market-pod recommendation/research records attach zero approved pod spend and preserve founder-controlled scope and decision fields.
- Mixed currencies are never combined in one pipeline total.
- Legal threats, material complaints, custom terms, and nonstandard promises require founder review.
- Cold WhatsApp and cold Instagram/Messenger automation remain blocked.
- SignalDesk never writes MenuList customer/store/menu/billing/publish truth.
- Published-only or legacy `converted` target state cannot be treated as a commercial win; only two-surface activation closes the opportunity.
- Interested-reply qualification runs only after suppression/contactability/source-policy checks and does not create new contact permission.
- Outcome auto-sync updates SignalDesk-owned commercial projections only; a failed projection refresh cannot discard the durable outcome.
- Runtime diagnostics record bounded state and never raw replies, target contact values, or MenuList customer truth.
- Exact successful retries return the existing projected record without another audit, timeline, cost, approval-time, or summary write.
- Duplicate offer terms and duplicate envelope policy/template/stop references are rejected at both API validation and server authority boundaries.

## Approval Evidence

Envelope approval records scope, active market pod, referenced policy versions, offer version, compatible budget, caps, expiry, stop conditions, fallback, approver, and requested approval mode. Scope/term changes create a new version; status-only updates preserve approval history.

## PII

Revenue account summaries store target references and bounded business metadata. Contact values remain in existing contact/channel identity collections and are not duplicated into revenue summaries.
