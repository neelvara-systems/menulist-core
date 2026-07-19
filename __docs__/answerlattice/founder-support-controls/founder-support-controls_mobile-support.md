# Founder Support Controls - Mobile Support

## Answerlattice Answer Tests Runtime Boundary

The live Answer Tests client uses bounded same-origin/no-store responses and 44px toolbar, row, result, confirmation, and modal actions. The table collapses to a card list below the dashboard breakpoint. Browser/device evidence remains pending; this is a source contract, not production-host certification.

## Answerlattice Widget Security Runtime Boundary

Widget security uses the responsive Access & Security panel with 44px create, rotate, disable, host, copy, confirmation, and modal-completion actions. The one-time private key is removed from reusable response state and cleared when its modal closes. Authenticated browser/device evidence remains pending.

> **Status:** Required responsive support

## Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass | Founders may review failures and known issues from mobile during a release. |
| Speed | Pass | Issue status and answer-test outcomes need quick inspection. |
| Touch | Pass | Actions can use card controls and confirmation sheets. |
| Owner value | Pass | Solo founders often operate support away from desktop. |

## Required Mobile Behavior

- Answer Tests render as cards with question, expected result, critical/evidence badges, a wrapping current First 10 proof alert, historical latest-run proof, and 44px actions.
- A suite-revision mismatch renders a text-labelled stale warning above the historical result; stale state never relies on color alone.
- Test creation/editing uses a full-screen responsive modal with single-column fields.
- Run progress does not resize the page and results remain readable without horizontal scrolling.
- Evidence reference IDs wrap inside result cards; `Ready`, `Review`, and `Blocked` remain text-labelled and do not rely on color alone.
- The deterministic-proof limitation and the **Adopt current route and evidence** confirmation copy wrap without hiding the unchanged phrase-check warning.
- Proposal impact opens as a responsive modal. Summary counts stack on narrow screens, current/proposed outcomes render as separate labelled panels, long answer previews wrap, and every close/check/publish action remains at least 44px high.
- The preview explicitly labels missing linked tests and advisory proof; color is never the only regression or improvement signal.
- Known Issues render as status cards with primary status action, expiry, affected context, and resolve confirmation.
- Private keys are shown once in a copyable code area that wraps safely; the screen warns before dismissal.
- Evidence links open externally with `noopener,noreferrer`.
- Export uses the bounded browser download flow and displays a clear error when mobile download, rate enforcement, package generation, or audit retention is unavailable.
- Owner Support Assistant uses stacked evidence and action cards; no dense table or side-by-side composer.

## Widget Mobile Behavior

- Known-issue notices appear above normal conversation content and remain dismissible.
- The notice cannot cover the close button, composer, or screenshot controls.
- Long titles/messages wrap and are capped.
- Signed context and evidence links add no visible customer configuration.

## Shared Logic

Desktop and mobile use the same APIs, hooks, validation, permissions, and data contracts. No mobile-specific Firebase reads or writes are permitted.
