# MenuList Commercial Readiness

This folder is the cross-system certification contract for MenuList pricing,
entitlements, Content Credits, taxation, billing documents, commercial
identity, Razorpay lifecycle handling, and QA/production configuration parity.

## Decision

- Code and immutable settlement records are the commercial source of truth.
- A captured provider payment is required before paid access or credits settle.
- Tax and supplier facts are snapshotted at checkout and document issuance.
- Legal identity, international checkout, documents, and document email fail
  closed until their independent approvals are complete.
- QA and production use the same contracts with separate provider credentials.
- This repository is pre-launch, so no legacy migration or backfill is part of
  this certification.

## Commands

```bash
npm run verify:menulist-commercial-readiness:source
npm run verify:menulist-commercial-readiness
npm run smoke:razorpay-sandbox-readonly
```

The provider smoke is read-only and must use Razorpay test credentials. It is a
separate external gate and is not implied by local source or emulator success.

## Documents

- [Specification](./commercial-readiness_spec.md)
- [Implementation](./commercial-readiness_impl.md)
- [Marketing](./commercial-readiness_marketing.md)
- [Website](./commercial-readiness_website.md)
- [Help](./commercial-readiness_helpdoc.md)
- [Firebase](./commercial-readiness_firebase.md)
- [Mobile](./commercial-readiness_mobile-support.md)
- [Tests](./commercial-readiness_test-cases.md)
- [Current verification](./commercial-readiness_verification.md)
