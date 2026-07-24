# SignalDesk Source Policy Specification

**Status:** Implemented
**Last verified:** July 21, 2026

## Objective

Prevent source data from being imported, retained, cited, personalized, contacted, exported, or used by a provider beyond explicit current authority.

## Policy Authority

Each policy defines:

- immutable `sourcePolicyId`, product `pId: SD`, name, source type, and optional provider;
- access method and documented terms/review basis;
- allowed fields, blocked fields, contact channels, attribution requirements, and prohibited uses;
- allowed use for evidence, import, storage, personalization, contact, and provider execution;
- raw-payload and refresh method;
- retention days from 1 through 365;
- owner, approval, last-review, expiry, status, and audit metadata.

Supported statuses are `active`, `approved`, `inactive`, `review_required`, and `blocked`. Runtime usability derives an additional presentation state such as active, expiring soon, expired, or review required.

## Required Invariants

1. A policy document must have matching document identity and `pId: SD`.
2. `displayName` is always an allowed field; no field may be both allowed and blocked.
3. Import and storage authority require evidence authority.
4. Personalization requires evidence authority.
5. Contact authority requires evidence authority, at least one contact channel, the corresponding contact field, and an explicit bounded access method.
6. Provider policies require an approved provider and `provider-refresh`; non-provider policies cannot claim provider identity.
7. Expiry cannot exceed the policy retention window.
8. Every high-risk workflow rechecks current policy state and requested use transactionally where it writes consequential truth.
9. Policy failure is fail-closed and writes bounded blocked-operation evidence.
10. Availability of public or provider data is never treated as contact permission.

## Renewal

`renew-source-policy` is a founder-controlled review action. It accepts only policy ID, new review time, new expiry, and an actor-bound idempotency key.

- It preserves all source, provider, access, field, use, contact, terms, raw-payload, refresh, retention, owner, and creation fields.
- It rejects blocked policies, regressing review dates, non-extending expiry, and expiry beyond the existing retention window.
- Exact retries return the durable policy; changed facts under the same key fail.
- It changes no target, source run, evidence, contact, draft, export, or public capability.
- A held or tombstoned target remains held. Fresh data requires a new governed import/provider run.

## Owner Surface

The desktop Policies screen creates policies, shows current policy state, and renews review windows. The form forces evidence authority when contact is enabled and clears contact/personalization if evidence is disabled. Provider policies start evidence-only.

The owner does not edit immutable policy terms in place. A materially different authority basis requires a new policy and fresh import lineage.

## Non-Goals

- No generic legal/compliance engine.
- No automatic acceptance of provider terms.
- No policy-version collection or mutable terms editor.
- No renewal-driven target revival.
- No mobile source-policy administration.
- No provider send activation.
