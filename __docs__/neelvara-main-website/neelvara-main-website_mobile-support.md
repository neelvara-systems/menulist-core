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

| Gate                 | Result         | Reason                                                                      |
| -------------------- | -------------- | --------------------------------------------------------------------------- |
| Frequency            | Fails          | Owners do not use the Neelvara company website daily as an operational task |
| Speed                | Not applicable | No owner workflow exists                                                    |
| Touch                | Not applicable | Public browsing only                                                        |
| Value away from desk | Fails          | No owner action is required from this site                                  |

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
- fully opaque mobile menu surface so navigation labels remain clear over every page state
- visible focus states
- no text overlap
- no fixed headers covering content
- no large hero that hides all next-section context
- footer legal links visible on mobile
- The homepage hero flows directly into the operating approach on every viewport. Secondary page Prism panels compact before they can force horizontal scroll.

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
- every public Neelvara page: `/`, `/products`, `/about`, `/contact`, `/trust`, `/legal`, `/privacy`, and `/terms`
- touch targets on mobile
- footer link visibility
- no content overlap
- no off-screen nav
- no horizontal overflow (`scrollWidth === viewport width`)
- home page next-section signal visible in desktop and mobile viewport audits
- page Prism panels, product cards, legal text panels, and static 404 recovery layout checked for no horizontal overflow
- Trust status rows collapse to one readable column on mobile; status labels remain visible without clipping or horizontal scrolling

No MenuList mobile verifier is required unless this site is later moved into the shared app, which is not the current recommendation.

---

## 7. Centered Hero Mobile Behavior

The homepage hero remains a public responsive-web surface:

- the full hero hierarchy stays centered and fits without a separate visual column
- primary and secondary actions stack into full-width 44px-plus targets
- the live particle field scales to the hero bounds without creating horizontal overflow and becomes static under reduced motion
- the hero field ignores touch input, and the removed Signal Constellation adds no separate pointer listener or rendering cost
- the hamburger keeps the existing flat Products, About, and Contact navigation

The mobile hamburger retains the flat Products, About, and Contact list on a fully opaque surface, while the hero offers distinct Products and About actions instead of repeating the header email action.

---

## 8. Footer Aura Mobile Behavior

- The homepage-only aura remains below the footer and uses a clamped responsive height instead of a fixed desktop canvas.
- The Neelvara silhouette scales to the available width without horizontal overflow or touch interaction.
- Device pixel ratio is capped at `2` to bound mobile canvas memory and drawing work.
- Intersection and document-visibility observers stop animation work when the signature is not visible.
- `prefers-reduced-motion` renders one static branded frame rather than a moving halo.
- Pointer-driven dot displacement ignores touch pointers and is disabled under `prefers-reduced-motion`.
- The canvas is decorative and hidden from the accessibility tree; footer links remain the final interactive controls.

---

## 9. Unified Surface Mobile Behavior

- Every major content group collapses to one readable `20px`-radius plane with `22px` horizontal padding.
- Policy, company, trust, and contact rows stack to one column inside that plane and use soft horizontal dividers instead of separate mobile cards.
- Product cards remain visually subordinate to the outer section plane with an `18px` radius.
- The shared treatment applies to Home, Products, Contact, About, Trust, Legal, Privacy, and Terms without changing navigation, content order, or tap targets.
- Verification at `390x844` confirmed `scrollWidth === innerWidth`, no clipped content, and no interactive target below the maintained 44px minimum.

---

## 10. Viewport Motion On Mobile

- Mobile uses the same once-only viewport trigger and reading-order stagger as desktop; motion does not change content order, layout dimensions, or tap targets.
- Entry animation is limited to opacity and vertical transform, preventing horizontal overflow or swipe-like movement that could be mistaken for navigation.
- Touch input does not drive the entry system. `IntersectionObserver` reveals each target and then releases it.
- Users requesting reduced motion receive fully visible content with no delayed or animated entry.
