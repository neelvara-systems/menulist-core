# Owner Business Assistant Action Support - Removed

**Status:** Archived and removed from active product contract  
**Removal Date:** June 17, 2026  
**Replacement Owner:** AI Menu Manager / Menu Manager

## Decision

Owner Business Assistant / Business Health no longer supports owner-initiated actions, draft preparation, confirmation sheets, public-truth mutation handoffs, or action audit records.

Business Health is now a read-only health, analytics, and answer surface. Menu, store, image, publish, theme, special-menu, and external handoff operations belong to AI Menu Manager / Menu Manager.

## Removed Runtime Surface

- `/api/owner-business-assistant/action`
- `src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantAction.ts`
- Desktop `OwnerAssistantActionSheet`
- Mobile `MobileBusinessHealthActionSheet`
- `src/lib/ownerBusinessAssistant/actions/*`
- `ownerBusinessAssistantActions`
- `ownerBusinessAssistantDrafts`
- `ENABLE_OWNER_BUSINESS_ACTION_*` flags

## Current Boundary

Business Health may show read-only checks, facts, analytics summaries, suggested questions, and grounded answers. It must not create action options, drafts, approval cards, direct writes, or manual-task cards. When the owner wants to act, Menu Manager owns the operation loop:

owner intent -> proposal card -> approval when needed -> existing MenuList operation -> receipt.
