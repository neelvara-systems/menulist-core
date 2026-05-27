# Canonica Developer Install Pack v1 Helpdoc

## Use The Starter Setup

1. Open Product Surfaces.
2. Add the starter templates for Billing, Onboarding, Team Settings, Releases, Integrations, and Common Errors.
3. Edit route patterns and context keys to match your app.
4. Open Knowledge Generation.
5. Upload docs or use the starter templates for FAQ CSV, Markdown notes, changelog notes, or ticket macros.
6. Open Widget Management.
7. Create or copy the widget key.
8. Add allowed origins and blocked routes.
9. Open Install Center.
10. Copy the AI install packet, AGENTS.md, CLAUDE.md, Cursor RULE.md, Cursor .mdc, Windsurf rule, or download the agent kit.
11. Give the packet to the coding agent that will edit your product.
12. Install the widget.
13. Verify key, script, origin, route, and context status.

## Safe Context

Send canonical v1 fields: path, title, feature, workflow, role, and locale.

Existing Canonica integrations may still send compatibility fields after sanitization:

- contextKey: public routing hint only.
- page: public page label or path hint only.
- userRole: public role label only.
- plan: public plan label only, never subscription or billing metadata.
- entityHints: public slugs/tags/hints only, never internal IDs or customer records.

Do not send passwords, tokens, card data, raw customer records, emails, phone numbers, billing data, tenant IDs, store IDs, user IDs, or raw database IDs.

## Agent Install Rule

Use `https://canonica.app/widget/v1/canonica-widget.js` for new installs. Older `/widget/canonica-widget.js` installs remain compatible, but new coding-agent packets should use the v1 URL.
