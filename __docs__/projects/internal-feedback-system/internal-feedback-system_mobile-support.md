# Internal Feedback System - Mobile Support

**Status:** Supported
**Last Updated:** July 2, 2026
**Audience:** Mobile engineering, QA, owner workflow reviewers

---

## Mobile Entry

Owner mobile feedback lives inside `MobileShell`. The `/feedback` direct route maps to the More tab feedback sub-screen; it must not bypass the mobile providers, selected-store context, or shared owner DAL.

Mobile shell route-map source gate: `npm run verify:mobile-shell-route-map` must continue to lock `/feedback` to the More tab feedback screen before this feature is treated as mobile-parity safe.

---

## Runtime Contract

- `src/components/mobile/screens/MobileFeedbackScreen.tsx` uses the shared `getFeedbackList()` DAL and requires `assertFeedbackListLoadSucceeded()` before rendering loaded feedback items.
- Public feedback links open through `openMobilePublicLink()` so owner mobile remains shell-safe.
- Mobile copy/share flows acknowledge Clipboard API or fallback results before showing success copy.
- `src/components/mobile/screens/MobileFeedbackDetail.tsx` uses `updateFeedbackStatus()` and requires `assertFeedbackStatusUpdateSucceeded()` before local status or reply state advances.
- Mobile reply drafts come from `src/lib/feedback/feedbackReplyTemplates.ts`, fill the existing reply field, and do not add a provider send path.
- Reply notes remain capped at 500 characters.
- Mobile diagnostics route through `logMobileOwnerFailure()` and must not direct-console raw feedback records, guest contact details, tenant IDs, store IDs, project IDs, or browser/provider exceptions.

---

## QA Boundary

Source gates:

- `npm run verify:guest-feedback-boundary`
- `npm run verify:mobile-shell-route-map`

These checks prove source/docs parity only. Physical-device QA, authenticated owner-shell visual QA, clipboard behavior on real mobile browsers, and custom-domain feedback-link smoke remain external certification gates.
