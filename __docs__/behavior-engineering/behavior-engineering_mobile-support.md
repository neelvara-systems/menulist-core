# Behavior Engineering — Mobile Support

**Status:** Implemented in the existing mobile owner shell
**Last verified:** July 17, 2026

## Mobile Contract

`MobileShareScreen` remains inside `MobileShell` and reuses its existing store,
project, localization, QR, clipboard, WhatsApp, and native-share behavior.
`FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES` changes only the helper copy.

When enabled, the screen frames the public link as the official customer source.
When disabled, the ordinary share helper remains. The flag does not hide or
disable copy, WhatsApp, QR, or native sharing.

## Boundaries

- No new screen, route, provider, or data loader
- No mobile-only auth or Firebase access
- No persisted dismissal state
- No duplicate upload, QR, or share implementation
- Existing touch targets, RTL, theme, and localization behavior remain inherited

## Verification

```bash
npm run verify:embedded-owner-capabilities
npm run verify:public-business-truth
```

The verifier requires the mobile screen to consume the behavior flag and rejects
the removed standalone dashboard card.
