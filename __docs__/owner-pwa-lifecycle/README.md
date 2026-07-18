# Owner PWA, Connectivity, and Update Lifecycle

**Status:** Implemented and source-gated
**Last updated:** July 17, 2026

This folder documents the MenuList owner installed-app boundary. Customer/store PWA identity and public-menu freshness remain under `__docs__/customer-app/`.

## Documents

- [Specification](owner-pwa-lifecycle_spec.md)
- [Implementation](owner-pwa-lifecycle_impl.md)
- [Firebase and cost](owner-pwa-lifecycle_firebase.md)
- [Mobile support](owner-pwa-lifecycle_mobile-support.md)
- [Test cases](owner-pwa-lifecycle_test-cases.md)
- [Verification](owner-pwa-lifecycle_verification.md)
- [Owner help](owner-pwa-lifecycle_helpdoc.md)
- [Marketing boundary](owner-pwa-lifecycle_marketing.md)
- [Website boundary](owner-pwa-lifecycle_website.md)

## Verify

```bash
npm run verify:owner-pwa-lifecycle
npm run verify:customer-app-pwa
npm run verify:mobile-shell-route-map
```
