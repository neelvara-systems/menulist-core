# API Boundaries - Mobile Support

## Mobile Admission

API Boundaries are mostly engineering-facing, but mobile screens must show connection and blocked states clearly.

## Mobile Requirements

- Show whether an action is connected, manual, unsupported, failed, or blocked by approval.
- Keep export/download and retry actions explicit.
- Avoid provider credential setup as the primary phone flow.
- Show provider error summary without exposing raw technical payloads.
- Keep permission failures understandable.

## Mobile Non-Goals

- Developer API key management.
- Provider OAuth troubleshooting.
- Webhook diagnostics.

## Acceptance

- Owner can understand why a channel action is unavailable from mobile.
- Owner can continue with manual export when API publish is blocked.
