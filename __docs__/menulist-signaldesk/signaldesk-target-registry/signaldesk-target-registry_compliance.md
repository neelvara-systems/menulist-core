# SignalDesk Target Registry - Compliance Policy

**Status:** Runtime-backed policy
**Created:** June 23, 2026
**Last Updated:** July 21, 2026

## Core Rule

A target is an internal research candidate, not permission to contact.

## Source And Contact Admission

- Every import requires an active source policy that allows import and the specific admitted fields.
- Manual imports cannot claim trusted provider identity.
- Provider fields require the matching provider policy and trusted provider-run completion.
- Retained contact identity requires both an allowed contact use/channel and a permission-evidence reference.
- Public availability of a phone, email, website, or social handle does not create consent.
- Re-import cannot upgrade an existing blocked, review-required, or expired contact permission state.

## Privacy

- Target list responses contain no raw email, phone, Instagram, notes, permission evidence, provider payload, or contact record.
- Raw values remain in private detail/contact documents and are never available through direct client Firestore writes.
- Reveal is a separate permissioned, reason-required, audited action and remains unavailable on mobile.
- Imported row content and free-form notes are not copied into durable audit reason fields.
- Raw contact values must not enter AI prompts by default.

## Identity And Suppression

- Exact deterministic identity is reused; uncertain identity is never automatically merged.
- Provider identity can bind only to attributable provider record evidence.
- Contact identity cannot rebind to another target or source policy.
- Existing suppression ledger evidence holds the target and blocks downstream outreach.
- Wrong contact, complaint, or suppression safety history is preserved independently of source-data expiry.

## Operator Rules

- Use only reviewed source policies.
- Include permission evidence for every retained contact row.
- Do not put raw contact data into notes.
- Do not bypass a held target by re-importing it.
- Resolve identity/policy conflicts through reviewed data correction, never direct client writes.

## Production Review Items

- Founder/compliance approval of source-specific retention terms.
- Provider terms and attribution evidence before enabling a new provider.
- Hosted role, mobile-block, and contact-reveal QA before production use.
