# GitHub Change Intake - Mobile Support

> **Status:** Local source complete; authenticated hosted QA pending
> **Last Updated:** 2026-08-11

GitHub Change Intake uses the existing responsive Teach Answerlattice route. No separate mobile route, provider picker, or mobile data loader is added.

## Required Mobile Behavior

- Connection status, selected repositories, last event, and disconnect remain readable without horizontal scrolling.
- Repository selection wraps into a single-column list.
- Connect, save, reconnect, and disconnect targets are at least 44px high.
- OAuth returns to the same responsive Knowledge Intake screen.
- Long repository names wrap or truncate without moving controls.
- Existing source review, governance, analysis, and publication behavior remains unchanged.

## Boundary

The mobile surface does not expose tokens, webhook secrets, callback URLs, raw GitHub payloads, patches, or source code. It does not create a second installation workflow or bypass `canManageIntegrations`.
