# Creative Editor Template Registry Mobile Support

**Status:** Supported as browsing/download fallback; editor save remains desktop-first  
**Last Updated:** June 16, 2026

## Decision

Mobile owners can continue using generated printable asset templates through the existing mobile Share/Assets flow. The full shared editor and saved-template authoring remain desktop-first because precise drag, resize, layer order, QR positioning, and print-safe layout edits are not good touch-first work for most SMB owners.

The platform template manager is also desktop-first. It is a platform operations surface under `/platform/asset-templates`, not an SMB owner mobile task.

## Mobile Scope

| Capability | Mobile Decision |
| --- | --- |
| Generated template preview/download | Supported through existing mobile flow. |
| Saved designs list | Allowed later through the same registry client when the mobile route exposes saved templates. |
| Save as template | Desktop-first. |
| Full editor customization | Desktop-first. |
| QR/source rehydration | Shared helper; applies to any future mobile saved-template opener. |

## Mobile Contract

- Do not bypass `MobileShell`.
- Use the same API client if saved-template listing is exposed later.
- Keep touch targets at least 44px.
- Do not add realtime listeners.
- Do not autosave on every drag/edit.

## Cost Impact

No additional mobile Firebase cost is introduced by the initial implementation. Mobile continues to use generated templates and existing route data.
