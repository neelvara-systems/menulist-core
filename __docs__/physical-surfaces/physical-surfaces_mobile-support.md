# Physical Surfaces — Mobile Compatibility

**Status:** Legacy read/download compatibility
**Last Updated:** July 16, 2026

Current mobile print workflows stay inside MobileShell:

- More → **Print Menu** uses `MobileMenuCardExportScreen` and the shared export controller.
- More → **QR and print assets** uses `MobilePrintAssetsScreen`/`MobileShareScreen` and the same renderers as desktop.
- Share exposes current menu/OBP/feedback QR and supported downloads according to role and feature flags.

The legacy Today/Hours tent-card and counter-sticker buttons render only when an already-populated `physicalSurfaces` summary entry is eligible. They are read-only downloads and share the desktop generators. Current source has no writer for that summary field, so mobile must not promise automatic creation or fork a mobile-only legacy generator.

All owner actions use 44px-or-larger touch targets. Native file-share cancellation stays quiet; unsupported file sharing may fall back to download.
