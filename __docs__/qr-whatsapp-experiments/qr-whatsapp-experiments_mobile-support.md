# QR WhatsApp Experiments Mobile Support

**Status:** PLANNING ONLY — NO MOBILE RUNTIME
**Last Updated:** July 17, 2026

No mobile runtime exists. The capabilities below are admission guidance for a later docs-first implementation, not current MobileShell behavior.

## Mobile Admission Decision

Full experiment creation is not admitted for the first mobile version. It is too configuration-heavy for the owner mobile PWA: variant setup, consent text, print placement, campaign token checks, and winner rules need a wider workspace.

Mobile should support lightweight monitoring and sharing once the desktop flow exists.

## Mobile Scope

| Mobile Capability | Status | Reason |
| --- | --- | --- |
| View active campaigns | Accepted | Owner may need to check status during business hours. |
| See winner recommendation | Accepted | Simple summary can reduce decision load. |
| Download/share variant files | Accepted if already generated client-side | Useful for sending to printer or staff. |
| Pause campaign | Accepted | Emergency/operational action. |
| Create campaign from scratch | Rejected for initial mobile scope | Too many inputs and higher mistake risk. |
| Edit consent copy | Rejected for initial mobile scope | Compliance-sensitive. |
| Configure webhook/provider | Rejected | Not an SMB mobile task. |

## PWA Shell Contract

The mobile surface must open inside `MobileShell`, likely from **More -> Assets -> Experiments** or a dedicated Assets sub-screen. It must not route-bypass the mobile shell.

## Mobile UX Rules

- Use large touch targets.
- Show one clear campaign status: draft, active, paused, completed.
- Show the winning decision in plain language.
- Avoid analytics jargon. Use labels such as "Scans", "WhatsApp taps", "Chats started", "Opt-ins", and "Orders/bookings".
- Keep privacy and consent warnings short.
- If data is missing, say what is known rather than showing empty charts.

## Mobile Data Pattern

Mobile should reuse the same store index read as desktop:

```text
storeQrWhatsappExperiments/{tenantId}/{storeId}/default
```

No mobile-specific Firestore collection should be added.

## Verification

- Mobile owner can open experiment status without route reload.
- Mobile owner can pause an active campaign with clear confirmation.
- Mobile owner cannot accidentally start a new campaign with incomplete consent/placement settings.
- Mobile UI still works when WhatsApp webhook data is unavailable and only manual counts exist.
