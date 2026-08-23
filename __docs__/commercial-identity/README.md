# MenuList Commercial Identity

This folder governs the boundary between the MenuList product brand, the
Neelvara Systems operating trade name, the verified legal supplier used for a
purchase, and Razorpay as payment processor.

## Decision

- MenuList remains the customer-facing product.
- MenuList is operated by Neelvara Systems.
- Neelvara Systems is currently an operating trade name, not a verified entity
  type.
- The verified legal supplier is loaded from approved server configuration and
  appears on the applicable billing document.
- Billing stays fail-closed until the legal identity is explicitly verified.

## Documents

- [Specification](./commercial-identity_spec.md)
- [Implementation](./commercial-identity_impl.md)
- [Marketing](./commercial-identity_marketing.md)
- [Website](./commercial-identity_website.md)
- [Help](./commercial-identity_helpdoc.md)
- [Firebase](./commercial-identity_firebase.md)
- [Mobile](./commercial-identity_mobile-support.md)
- [Tests](./commercial-identity_test-cases.md)

Cross-system certification is maintained in
[`__docs__/commercial-readiness/`](../commercial-readiness/README.md).
