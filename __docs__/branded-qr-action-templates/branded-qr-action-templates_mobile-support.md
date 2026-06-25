# Branded QR Action Templates Mobile Support

**Status:** Editor-backed alignment layer
**Last Updated:** June 25, 2026

## Mobile Admission

Standard branded QR action templates are admitted on mobile because they are the same job as current Assets:

```text
pick asset
-> preview
-> download/share
```

Advanced design editing, QR styling controls, and experiment setup are not admitted on mobile.

The desktop Creative Editor exposes guided QR action-card presets, but mobile should continue to consume the resulting template/document through the existing Assets flow.

## Mobile Scope

| Capability | Decision |
| --- | --- |
| View action templates in Assets | Accepted if using existing mobile Assets flow. |
| Preview/download standard template | Accepted. |
| Share downloaded file | Accepted through existing share/download behavior. |
| Customize template layout | Desktop only. |
| Choose artistic QR treatment | Rejected. |
| Launch measured WhatsApp campaign | Future limited status/download only; creation remains desktop first. |

## UX Rules

- Use plain action labels: Menu, Order, Feedback, Booking, Offer, Reorder.
- Do not show QR engineering language.
- Do not expose scan-safety settings.
- Keep one primary action per selected asset.
- Use the same renderer as desktop.

## Verification

- Mobile Assets still opens inside `MobileShell`.
- Mobile preview uses the same template ID as desktop.
- Mobile does not expose unsafe QR styling controls.
- Mobile does not start QR WhatsApp Experiments from standard download flow.
