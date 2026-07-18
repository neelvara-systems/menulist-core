# Internal Feedback System - Mobile Support

**Status:** Supported
**Last Updated:** July 16, 2026
**Audience:** Mobile engineering, QA, owner workflow reviewers

---

## Mobile Entry

Owner mobile feedback lives inside `MobileShell`. The `/feedback` direct route maps to the More tab feedback sub-screen; it must not bypass the mobile providers, selected-store context, or shared owner DAL.

Mobile shell route-map source gate: `npm run verify:mobile-shell-route-map` must continue to lock `/feedback` to the More tab feedback screen before this feature is treated as mobile-parity safe.

---

## Runtime Contract

- `src/components/mobile/screens/MobileFeedbackScreen.tsx` uses the shared `getFeedbackList()` DAL and requires `assertFeedbackListLoadSucceeded()` before rendering. Filter changes are effect-driven to avoid duplicate reads, and the screen preserves `lastDocId`/`hasMore` so feedback after the first 50 records remains reachable.
- Public feedback links open through `openMobilePublicLink()` so owner mobile remains shell-safe.
- Mobile copy/share flows acknowledge Clipboard API or fallback results before showing success copy.
- `src/components/mobile/screens/MobileFeedbackDetail.tsx` uses `updateFeedbackStatus()` and requires `assertFeedbackStatusUpdateSucceeded()` before local status advances. The selected detail object and filtered list are updated together after acknowledgement.
- Mobile reply drafts come from `src/lib/feedback/feedbackReplyTemplates.ts`. The owner may edit a draft in browser state, copy it, or open WhatsApp; MenuList does not persist or send it. Resolve is a separate action with a loading guard.
- Browser-local reply drafts remain capped at 500 characters. The persisted `ownerNote` DAL boundary remains 300 characters, but this mobile surface does not write drafts into that field.
- Mobile diagnostics route through `logMobileOwnerFailure()` and must not direct-console raw feedback records, guest contact details, tenant IDs, store IDs, project IDs, or browser/provider exceptions.

---

## QA Boundary

Source gates:

- `npm run verify:guest-feedback-boundary`
- `npm run verify:mobile-shell-route-map`

These checks prove source/docs parity only. Physical-device QA, authenticated owner-shell visual QA, clipboard behavior on real mobile browsers, and custom-domain feedback-link smoke remain external certification gates.
