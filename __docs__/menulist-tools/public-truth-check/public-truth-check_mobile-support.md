# Public Truth Check - Mobile Support

**Status:** Implemented - public mobile-responsive route and owner mobile Business Health readiness card
**Last Updated:** July 16, 2026
**Audience:** Product, mobile, developers

---

## Mobile Relevance Decision

**Decision:** Partial.

Public/prospect version should be responsive on mobile website. Owner-app version should be a compact status card, not a full report builder.

---

## Feature Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Partial | Public/prospect check is occasional; owner status can be useful when sharing or fixing a link |
| Speed | Pass for compact status | Status and one fix action can complete under 5 seconds |
| Touch | Pass for compact card | Present/missing rows and one action are thumb-friendly |
| Value | Partial | Owners may need to fix missing link/photo/contact from phone; full setup is better on desktop or guided public flow |

---

## Mobile Website

The public route at `/tools/public-truth-check` is implemented as a responsive website route because many SMB owners will open it from WhatsApp or Instagram.

Requirements:

- single-column form
- large inputs
- no multi-column report tables
- short status rows
- sticky or visible primary CTA
- no horizontal overflow at 320px

---

## Owner Mobile App

Owner mobile app integration is implemented as a compact Business Health card at:

- `src/components/mobile/components/MobilePublicTruthOwnerCheckCard.tsx`
- `src/components/mobile/screens/MobileBusinessHealthScreen.tsx`

It reuses `useMobileProjects()` for project summaries/cached project data and `useOwnerPublicTruthReadiness()` for the shared owner report.

The mobile card now shows the same eight V1 modules as desktop:

- Public truth basics
- QR link health
- Menu or service clarity
- WhatsApp action link
- Hours readiness
- Photo and visual identity
- Google profile handoff
- Menu freshness

The report rows remain read-only: they do not save report state or mutate business data. Their action buttons only route to existing `MobileShell` destinations through callbacks:

- Menu or service clarity and menu freshness open the Menu tab.
- QR link health can open the Share tab.
- Basic facts, customer link, hours, Official Business Page, and Presence Monitor gaps open the existing More sub-screens.

The mobile card does not open desktop owner routes from mobile.

Allowed:

- Business Health card
- Share/QR warning
- Official Business Page missing-photo/contact/hours card
- More -> Public source status

Not allowed:

- full side-by-side public report
- source adapter setup
- external source management
- recurring report configuration

---

## PWA Shell Contract

Owner mobile entry must stay inside `MobileShell`.

Use:

- existing selected store/project context
- existing mobile providers
- shell sub-screen state
- existing save/publish/fix flows

Do not:

- force route reload
- bypass the mobile shell from Today/Menu/Share/More
- create a mobile-only DAL
- create separate auth

---

## Mobile Copy

Use:

- "Ready"
- "Missing hours"
- "Add link"
- "Add photo"
- "No action needed"

Avoid:

- "AI visibility"
- "score"
- "ranking"
- "monitor"
- "optimization"

---

## Verification

Implementation must verify:

- mobile website route at 320, 360, 390px
- owner card inside MobileShell
- dark/light mode
- no text overflow
- 44px touch targets
- no separate project-loading path
- no desktop-route bypass from the mobile card

Current verifier:

- `npm run verify:public-truth-check` confirms the public route, owner card wiring, shared hook, mobile fix-target callbacks, safe runtime boundaries, and no V1 report writes.
- `npm run verify:owner-business-assistant` confirms the Business Health shell guardrails for the mobile card.
- Browser viewport verification is still required before a production website release pass.
