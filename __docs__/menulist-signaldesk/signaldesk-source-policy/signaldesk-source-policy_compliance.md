# SignalDesk Source Policy Safety Contract

**Status:** Runtime-backed product policy; external legal/provider approval remains owner-controlled
**Last verified:** July 21, 2026

## Core Rule

Data availability is not permission to retain, personalize, contact, export, publish, or send.

SignalDesk records a bounded source policy, but it does not determine whether a provider's current terms or a jurisdiction permit a proposed use. The owner/compliance reviewer must verify that basis before activation.

## Safe Defaults

- Public-business research is candidate/evidence only.
- Contact and personalization are off unless a permissioned basis is recorded.
- Contact channels require their matching allowed field.
- Raw provider payload defaults to `never-store`.
- Provider policies require provider approval, budget authority, feature readiness, and current policy authority.
- Source-policy permission does not bypass suppression, recipient authority, sender readiness, unsubscribe, approval, budget, or kill switches.
- Provider send remains disabled.

## Owner Review Checklist

Before policy creation or renewal, verify:

1. source/provider identity and access method;
2. current terms URL/version or documented internal review basis;
3. exact allowed and blocked fields;
4. whether evidence, storage, personalization, contact, and provider execution are permitted independently;
5. permitted contact channels and evidence for contact authority;
6. attribution requirements and prohibited uses;
7. raw-payload policy, refresh method, retention period, and review expiry;
8. provider budget and operational pause state where applicable.

## Renewal Meaning

Renewal confirms the same immutable authority basis for another bounded period. It is not an in-place terms editor. If provider terms, source type, fields, contact rights, prohibited uses, or retention basis change, create a new policy and establish fresh lineage.

Renewal does not restore scrubbed data or authorize old targets automatically.

## Incident Response

If a source basis becomes uncertain:

- block or let the policy expire;
- activate the relevant desktop control, or use the mobile global emergency pause for urgent outbound risk;
- do not renew until the basis is reviewed;
- inspect audit/lifecycle evidence;
- rerun/import only after corrected authority exists.

No automated AI or provider output may approve its own source policy.
