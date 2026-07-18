# Configuration Safety Mobile Support

Mobile owner surfaces inherit the same compiled app flags, deployment target,
auth session, locale, and server route gates as desktop. No mobile-only flag
registry or environment lookup is allowed.

When a capability is disabled, its MobileShell entry point must be absent or
show the same safe unavailable state as desktop. Mobile must not reveal
provider configuration, secret names, project IDs, or internal rollout data.

This audit changes no MobileShell navigation, Firebase operation, or
owner-facing setting.
