# Billing Taxation Website

The pricing page shows the approved tax note near currency and billing-period controls. The setup modal asks for legal/billing name, billing email, country, address, city, state/region, postal code, and optional tax ID.

Owner-facing rules:

- Explain that billing details are private and not published on the customer page.
- Keep GSTIN optional for Indian customers.
- Restrict INR to Indian billing addresses and USD to non-Indian billing addresses.
- Do not display a final tax amount until the server-authoritative checkout calculation is available.
