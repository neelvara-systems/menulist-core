# Answerlattice Public API v1 - Website Rules

> **Current Public-Site Decision:** Do not add a top-level Public API promise while `ENABLE_ANSWERLATTICE_PUBLIC_API` remains disabled by default.

## Allowed Placement

- authenticated, flag-gated `/answerlattice/public-api` management page;
- account-specific implementation material after enablement;
- controlled developer documentation shared with an approved customer;
- the public `/openapi.json` contract, provided it states that the API is disabled by default, account-gated, server-only, and not a self-serve entitlement;
- secondary architecture copy explaining that approved answers can support external server-side surfaces.

## Disallowed Placement

- homepage hero or primary navigation promise;
- pricing-table entitlement without a verified package/rollout decision;
- public "API available now" claim;
- browser copy/paste examples that expose the key;
- claims of generic search, arbitrary data access, autonomous actions, or automatic learning.

## Future Public Copy, Only After General Availability

Headline:

> Use approved support answers in your own server-side workflows.

Supporting copy:

> Retrieve applicable canonical answers, citations, and safe fallback states, then return unresolved support signals to Answerlattice for review.

Required adjacent disclosure:

> Server-side credentials only. Availability and scopes depend on your Answerlattice plan and workspace configuration.

Before publishing, re-verify the live flag, packaging, hosted documentation, credential workflow, rate limits, security policy, and customer proof.
