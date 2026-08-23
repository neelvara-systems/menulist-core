# Billing Documents Mobile Support

> Status: Implemented mobile parity contract
> Last updated: August 22, 2026

The owner PWA Billing screen loads the same private billing-document summaries as desktop. Each settled payment shows the MenuList document when available, while a provider receipt remains fallback evidence. Credit notes appear as separate credited rows.

PDF access opens the authenticated document route. It does not require a desktop, expose a Firebase download token, or add a separate mobile data model.

Required checks: 44px action target, document label visible without hover, download works from PWA/browser session, expired session returns authentication failure, and cross-store IDs remain inaccessible.
