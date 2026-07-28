# Answerlattice Public API v1 - Mobile Support Assessment

> **Decision:** No dedicated mobile product surface. Responsive authenticated management is secondary; server integration remains the core workflow.

## Four-Gate Assessment

| Gate | Result | Reason |
| --- | --- | --- |
| Frequent mobile use | Fail | Key creation/rotation is rare administrative work. |
| Time-sensitive owner value | Partial | Emergency revocation may be urgent. |
| Touch-native workflow | Partial | Status and revoke are simple; secure one-time secret handling is safer on desktop. |
| Preserves product simplicity | Pass without dedicated screen | Existing authenticated navigation/component can render responsively when enabled. |

## Required Behavior

- The feature stays hidden when the main flag is off or permission is missing.
- Buttons and confirmations remain usable at narrow widths.
- Scope controls wrap instead of overflowing.
- The one-time key field and copy control remain inside the viewport.
- No raw key is persisted in mobile storage, logs, notifications, deep links, or screenshots by Answerlattice.
- Cross-origin requests to the management route are rejected.
- A session/workspace transition immediately hides the prior status and one-time secret; stale responses and mutations cannot settle into the replacement workspace.

## Recommended Owner Guidance

Use desktop for initial key creation and backend configuration. Mobile/narrow-width access may be used to inspect status or revoke a compromised key, but Answerlattice should not encourage storing the raw key on the device.

## Verification Boundary

Source and type verification can confirm responsive primitives and hidden-state contracts. Authenticated hosted narrow-width interaction, clipboard behavior, password-manager behavior, and physical-device secret handling remain external evidence.
