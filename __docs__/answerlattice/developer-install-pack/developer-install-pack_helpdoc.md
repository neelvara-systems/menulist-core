# Answerlattice Developer Install Pack v1 Helpdoc

## Use The Starter Setup

1. Open Product Surfaces.
2. Add the starter templates for Billing, Onboarding, Team Settings, Releases, Integrations, and Common Errors.
3. Edit route patterns and context keys to match your app.
4. Open Knowledge Generation.
5. Upload docs or use the starter templates for FAQ CSV, Markdown notes, changelog notes, or ticket macros.
6. Open Widget Management.
7. Create the widget key and save the full one-time `al_*` value.
8. Add allowed origins and blocked routes.
9. Open Install Center.
10. Copy the AI install packet, AGENTS.md, CLAUDE.md, Cursor RULE.md, Cursor .mdc, Windsurf rule, or download the agent kit.
11. Give the packet to the coding agent that will edit your product.
12. Install the widget.
13. Verify key, script, origin, route, and context status.

If the agent kit download fails, retry from Install Center after confirming the current session still has Widget Management permission. Do not use a downloaded HTML/error page as a ZIP and do not substitute the saved key identifier for the one-time full `al_*` widget key.

## Safe Context

Send canonical v1 fields: path, title, feature, workflow, role, and locale.

Do not send passwords, tokens, card data, raw customer records, emails, phone numbers, billing data, tenant IDs, store IDs, user IDs, or raw database IDs.

## Agent Install Rule

Use `https://answerlattice.com/widget/v1/answerlattice-widget.js` for new installs. Allowed origins and blocked routes are configured in Answerlattice dashboard, not as separate product settings or manual variables.

The supported browser SDK is the loader plus `window.AnswerlatticeWidget`. There is no supported npm package. Plan, account, billing, or other trusted customer claims must not be copied into unsigned page context.
