# Platform Cost Posture Mobile Support

## Mobile Decision

No owner mobile PWA screen is added.

This is an internal platform control surface. It does not belong in owner Today, Menu, Share, or More workflows.

Current runtime exposes the same platform tool through the platform-only mobile internal wrapper for operators with `platformRole === "PLATFORM"`. That wrapper is reachable from the platform-only More section and the `/platform/cost-posture` MobileShell route mapping, uses the desktop component inside the shared internal platform wrapper, and provides an "open desktop tools" action for full-width inspection.

Source gate: `npm run verify:platform-cost-posture-boundary` locks the mobile platform-only Cost Posture gate, MobileShell route mapping, internal wrapper config, desktop fallback route, and docs parity.

## Responsive Requirement

The desktop platform screen should remain readable on a narrow browser viewport for platform operators, but it is not an SMB owner mobile workflow.

## Owner Impact

None. Owners do not see cost posture, billing export readiness, internal provider cost, SAFE_MODE rationale, or platform alert details.

## Customer Impact

None. Public menu, official business page, customer app, and QR menu routes are unchanged.

## Future Rule

If a future change proposes owner-visible cost or usage data, it must go through the owner workflow gate separately. That proposal must prove it reduces owner responsibility rather than adding dashboard anxiety.
