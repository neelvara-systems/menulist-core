# Platform Founder Monitor Mobile Support

## Classification

Platform internal screen, not restaurant owner workflow.

## Mobile Route

`/platform/founder-monitor` maps into the mobile More platform wrapper as `founderMonitor`.

## Access

Only platform admins can open it. The same desktop route and API guards remain active:

- Route layout requires platform admin access.
- Browser screen checks `platformRole === PLATFORM`.
- API uses `withPlatformAuth`.

## UX

The screen uses the existing `MobilePlatformInternalScreen` wrapper. Because the table-heavy view needs horizontal space, the wrapper uses a minimum width and offers the desktop route handoff.

## Owner Impact

No owner mobile tab, owner setting, owner dashboard card, or owner copy is added.
