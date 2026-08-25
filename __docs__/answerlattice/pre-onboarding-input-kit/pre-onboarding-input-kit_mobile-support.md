# Answerlattice Pre-Onboarding Input Kit — Mobile Support

> **Last Audited:** 2026-08-25

## Scope

The public Pre-Onboarding Kit and its authenticated Activation Command Center entry are responsive web surfaces. They reuse one prompt, one browser-local copy/download flow, and the existing Knowledge Intake route. They do not introduce a separate mobile data layer, route, or PWA shell state.

## Mobile Admission

- **Frequency:** Pre-onboarding is normally a one-time setup action, so it does not justify a separate mobile screen.
- **Speed:** Opening or copying the prompt completes quickly; generating and reviewing the package remains better suited to the owner's chosen AI tool and a larger workspace.
- **Touch:** Prompt, close, copy, download, and Knowledge Intake actions retain at least 44px touch targets.
- **Value:** Mobile access is useful for reviewing the launch path, but it does not replace desktop package preparation.

Verdict: keep the existing responsive surface available on mobile, but do not create a separate mobile-only workflow.

## Required Behavior

- The Activation Command Center shows the prompt callout only while **Add product knowledge** is incomplete.
- The four preparation steps stack vertically at narrow widths without horizontal overflow.
- **Copy preparation prompt** opens the same bounded, MIME-checked modal used by the public pre-onboarding page.
- Closing the modal restores focus to the invoking control, including the authenticated Ant Design trigger.
- The modal remains bottom-aligned on narrow screens, limits its height, and keeps prompt text independently scrollable.
- Copy and download stay browser-local. Opening or copying the prompt performs no upload, Firestore operation, entitlement change, or live-support activation.
- The existing Knowledge Intake action remains separate and explicit after the owner reviews the generated package.

## Verification

Focused source verification covers shared-prompt reuse, incomplete-step visibility, canonical public URL display, and touch sizing. Browser certification should confirm 390px width, keyboard focus containment/restoration, clipboard fallback, prompt scrolling, modal dismissal, and the transition from prompt review to Knowledge Intake.
