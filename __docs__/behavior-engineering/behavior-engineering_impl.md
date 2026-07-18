# Behavior Engineering — Implementation

**Feature:** Behavior Engineering (Presence Dominance Activation)  
**Status:** Implemented, source-gated
**Last verified:** July 17, 2026

## Source Gate

This implementation doc is source-gated by `npm run verify:public-business-truth`.
Share and guidance copy must use the current owner-approved source wording and
respect the existing save/publish plus public-cache refresh boundary.

## Runtime Contract

Behavior guidance is a feature-flagged copy layer on existing owner surfaces.
It does not create a new dashboard card, route, data model, API, or background
job.

```text
FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES
  -> OwnerDashboard existing official-source card
  -> desktop Share modal guidance
  -> MobileShareScreen guidance
  -> existing post-publish/editor reinforcement
```

The runtime must describe the link as the owner-approved public source and must
respect the save/publish plus public-cache boundary. It must not promise that an
unsaved edit is already public.

## Active Files

| File | Responsibility |
|---|---|
| `src/config/features.ts` | Enables or disables behavior-specific copy |
| `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx` | Existing dashboard official-source guidance |
| `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx` | Desktop share, WhatsApp, staff, and QR guidance |
| `src/components/mobile/screens/MobileShareScreen.tsx` | Mobile share, WhatsApp, and QR guidance |
| `src/app/(global-pages)/msg-preview/[sessionId]/page.tsx` | Existing post-publish guidance |
| `src/components/templates/main-app/projects/editorView/Editor.tsx` | Existing one-per-session save reinforcement |

## Deliberate Non-Goals

- No standalone `BehaviorNudgeCard`
- No `behaviorNudgeDismissedAt` store field
- No Firestore read or write for nudge state
- No new route, collection, API, scheduler, provider, or notification
- No gamification, urgency, or customer-facing nudge

The removed standalone component was not mounted by any runtime surface. Keeping
it would have made documentation and static verification validate dead code.
The existing Dashboard and Share surfaces provide the same owner value with less
UI and zero persistence.

## Verification

```bash
npm run verify:public-business-truth
npm run verify:official-business-page-boundary
npm run verify:embedded-owner-capabilities
```

The embedded-capabilities verifier also rejects restoration of the dead
standalone card and requires both desktop and mobile share surfaces to consume
the feature flag.
