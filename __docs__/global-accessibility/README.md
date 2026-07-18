# Global Accessibility and Interaction

**Status:** Implemented and source-gated
**Last updated:** July 17, 2026
**Scope:** Shared keyboard, focus, zoom, motion, touch-target, control-name, image-alternative, and skip-navigation behavior

This folder records the cross-system accessibility boundary. Feature-specific workflows retain their own UX documents; this boundary supplies the shared interaction rules they inherit.

## Documents

- [Specification](global-accessibility_spec.md)
- [Implementation](global-accessibility_impl.md)
- [Firebase and cost](global-accessibility_firebase.md)
- [Mobile support](global-accessibility_mobile-support.md)
- [Test cases](global-accessibility_test-cases.md)
- [Verification](global-accessibility_verification.md)
- [Owner help](global-accessibility_helpdoc.md)
- [Marketing boundary](global-accessibility_marketing.md)
- [Website boundary](global-accessibility_website.md)

## Verify

```bash
npm run verify:global-accessibility-boundary
npm run verify:mobile-shell-route-map
npx tsc --noEmit --incremental false --pretty false
```
