# Live SMB Support Coverage Checklist

## Why This Exists

MenuList SMB owners will use Canonica for real help and support. That means MenuList data in Canonica must support actual production operations, not only website screenshots.

## Coverage Gate

Do not treat Canonica as ready for live MenuList owner support until these areas have approved KB/FAQ/canonical coverage:

- Account access and onboarding.
- Staff ID/passcode and role permissions.
- Menu creation, upload, link import, and manual entry.
- Menu intake identity warnings for wrong business, wrong outlet, special menu, incomplete menu, and non-menu pages.
- Extraction review and editor changes.
- Bulk price/availability/category changes through Menu Command Center.
- Public menu behavior, search, offline/reconnect behavior, cache window, URL permanence, QR, and sharing.
- Official Business Page setup and public business info.
- Business settings, hours, temporary status, logo, contact, and SEO basics.
- Use MenuList rollout actions, Menu Kit deployment, and QR placement guidance.
- Digital Screens.
- Customer App, only where enabled.
- Generated images, descriptions, translations, theme controls, and PDF export.
- Special menu switching, presence checklist, customer message templates, and External Menu Sync.
- Staff Prompt current-menu reference for staff, where enabled.
- Billing status, payment retry, enhancement packs, and inherited outlet billing.
- Locations, outlets, master menu, local overrides, and outlet policy.
- Dashboard, analytics, menu quality signals, feedback, and help center.
- Troubleshooting and escalation for public correctness, account access, billing, privacy, and security.

## Approval Gate

Before live owner use:

- Import all source files `01` through `26`.
- Confirm the live website claims from `22` through `24` do not conflict with current repo docs or runtime behavior.
- Generate KB and FAQ drafts.
- Review generated entities.
- Approve canonical answers for common questions.
- Mark risky answers as support-only.
- Create Canonica Product Surfaces for all mapped MenuList routes.
- Test widget context on MenuList production owner routes.
- Ask every question in `live-owner-support-test-questions.csv` in Canonica and review every answer.
- Convert unanswered or weak responses into support board cards.

## Risky Topics That Must Stay Escalation-Gated

- Refunds and exact pricing.
- Taxes and invoices.
- Ownership transfer.
- Account merge.
- Data deletion/export.
- Custom domain DNS values.
- Payment disputes.
- Legal or privacy claims.
- POS/third-party sync guarantees.
- Production incidents or suspected security issues.

## Success Standard

Canonica is ready for live MenuList support only when it can answer routine owner questions without making owners think, while reliably escalating account-specific or risky questions.
