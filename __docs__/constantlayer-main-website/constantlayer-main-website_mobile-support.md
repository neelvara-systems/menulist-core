# ConstantLayer Main Website - Mobile Support

**Status:** Draft  
**Decision:** Responsive public website yes; MenuList owner mobile PWA feature no  
**Scope:** Public static ConstantLayer website

---

## 1. Mobile Rule Compliance

The repo requires a mobile support document for every feature, even when the decision is "desktop only" or outside the owner PWA: `.codex/rules/MOBILE_SUPPORT_RULES.md:9`.

ConstantLayer main website is not an owner operational feature. It is a public static website. Therefore it does not enter the MenuList owner mobile PWA shell.

---

## 2. Owner Mobile Admission Gates

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Fails | Owners do not use ConstantLayer parent website daily as an operational task |
| Speed | Not applicable | No owner workflow exists |
| Touch | Not applicable | Public browsing only |
| Value away from desk | Fails | No owner action is required from this site |

Decision: do not build an owner mobile screen, `MobileShell` route, antd-mobile component, mobile DAL hook, or Redux integration.

---

## 3. Public Responsive Requirements

The site must still work well on mobile web.

Required:

- 320px minimum viewport support
- no horizontal scrolling
- readable text without zoom
- 44px minimum tap targets for nav and CTAs
- accessible mobile menu
- visible focus states
- no text overlap
- no fixed headers covering content
- no large hero that hides all next-section context
- footer legal links visible on mobile

---

## 4. Not In Scope

Do not add:

- `MobileShell` integration
- `antd-mobile`
- Tailwind mobile layer from MenuList app
- owner PWA sub-screen
- owner auth
- NextAuth session logic
- Redux state
- Firestore DAL
- mobile app install prompt
- product login shortcut

This site is outside the MenuList owner app.

---

## 5. Responsive Layout Guidance

Use simple static responsive CSS:

- single-column layout on mobile
- constrained readable width on desktop
- header collapses to accessible menu
- CTAs stack on narrow widths
- product card remains one column until there is enough space
- legal text keeps short paragraphs and headings

Avoid complex animations, carousels, horizontal cards, or dense multi-column legal layouts.

---

## 6. Verification

After implementation, check:

- 320x640 mobile viewport
- 375x812 mobile viewport
- 390x844 mobile viewport
- 768x1024 tablet viewport
- 1440x900 desktop viewport
- keyboard navigation on desktop
- touch targets on mobile
- footer link visibility
- no content overlap
- no off-screen nav

No MenuList mobile verifier is required unless this site is later moved into the shared app, which is not the current recommendation.

