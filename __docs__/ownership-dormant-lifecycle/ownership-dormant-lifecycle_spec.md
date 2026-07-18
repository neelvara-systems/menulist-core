# Ownership And Dormant Lifecycle Specification

## Operational owner

An Owner role is an access assignment. Assigning it may grant billing, staff,
public-presence, store, and menu controls, but must not be described as a
business ownership transfer.

Every active store must retain at least one active verified Owner assignment.
Self-removal/deactivation through staff management is rejected.

## Business ownership transfer

A future automated transfer would need one verified, auditable transaction or
orchestration covering:

- tenant and store identity/contact fields;
- primary and billing notification recipients;
- subscription user/email/provider relationships;
- new-owner admission and prior-owner revocation;
- referral, dispute, credit, audit, and legal-retention handling;
- all store mappings in a multi-location tenant.

Until that full contract exists, support review is the safe path.

## Dormancy

Inactivity is advisory. Staleness may trigger a bounded reminder but never
changes `active`, `deleted`, `blocked`, entitlement, subscription, or public
visibility by itself. Owner action, billing lifecycle, platform security
authority, or an approved support process owns those state changes.
