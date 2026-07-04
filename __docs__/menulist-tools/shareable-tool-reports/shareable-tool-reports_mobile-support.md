# Shareable Tool Reports - Mobile Support

**Status:** Supported public mobile web route
**Last Updated:** July 4, 2026

---

## Mobile Admission

Shareable reports are public website pages, not owner PWA screens.

They pass the mobile admission test because recipients will often open report links from WhatsApp, email, social DMs, or staff chat.

---

## Behavior

Mobile report page must:

- open without login
- render the status and first rows without horizontal scrolling
- keep buttons touch-friendly
- keep the follow-up form usable with 44px controls
- preserve the evidence and boundary text
- route next action to an existing MenuList public path

---

## Owner PWA Boundary

Do not add a MobileShell sub-screen for V0 shareable reports.

V1 owner readiness modules remain inside Business Health, Share, Public Discovery, OBP readiness, and existing mobile shell surfaces. Public report links stay on the website route.

## Internal Ops Boundary

Report Lead Ops is an internal platform-admin desktop monitor at `/ops/report-leads`.

Mobile review result:

- no owner-mobile action
- no customer-facing mobile route
- no MobileShell sub-screen for V0
- desktop table has horizontal scroll for narrow admin browsers
- public report viewing and public follow-up remain mobile web supported
