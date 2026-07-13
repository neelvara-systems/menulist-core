# Neelvara Main Website - Mobile Support

**Status:** Validated
**Decision:** Responsive public website yes; MenuList owner mobile PWA feature no  
**Scope:** Public static Neelvara website

---

## 1. Mobile Rule Compliance

The repo requires a mobile support document for every feature, even when the decision is "desktop only" or outside the owner PWA: `.codex/rules/MOBILE_SUPPORT_RULES.md:9`.

Neelvara main website is not an owner operational feature. It is a public static website. Therefore it does not enter the MenuList owner mobile PWA shell.

---

## 2. Owner Mobile Admission Gates

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Fails | Owners do not use the Neelvara company website daily as an operational task |
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
- The homepage hero flows directly into the compact company summary on every viewport. Secondary page Prism panels compact before they can force horizontal scroll.

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

Current redesign verification checked:

- 320x720 mobile viewport
- 375x812 mobile viewport
- 1440x1000 desktop viewport
- every public Neelvara page: `/`, `/products`, `/about`, `/contact`, `/legal`, `/privacy`, and `/terms`
- touch targets on mobile
- footer link visibility
- no content overlap
- no off-screen nav
- no horizontal overflow (`scrollWidth === viewport width`)
- home page next-section signal visible in desktop and mobile viewport audits
- page Prism panels, product cards, legal text panels, and static 404 recovery layout checked for no horizontal overflow

No MenuList mobile verifier is required unless this site is later moved into the shared app, which is not the current recommendation.
