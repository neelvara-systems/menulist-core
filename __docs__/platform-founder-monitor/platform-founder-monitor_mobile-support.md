# Platform Founder Monitor Mobile Support

## Classification

Platform internal screen, not restaurant owner workflow.

## Mobile Route

`/platform/founder-monitor` maps into the mobile More platform wrapper as `founderMonitor`.

## Access

Only platform admins can open it. The same desktop route and API guards remain active:

- Route layout requires platform admin access.
- Browser visibility checks `platformRole === PLATFORM`; the server API independently applies a fail-closed limiter and current persisted platform-user check before private reads.
- API uses `withPlatformAuth`.

## UX

The screen uses the existing `MobilePlatformInternalScreen` wrapper. Because the table-heavy view needs horizontal space, the wrapper uses a minimum width and offers the desktop route handoff.

## Owner Impact

No owner mobile tab, owner setting, owner dashboard card, or owner copy is added.
