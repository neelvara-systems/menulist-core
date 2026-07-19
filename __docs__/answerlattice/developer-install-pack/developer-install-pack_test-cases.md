# Answerlattice Developer Install Pack v1 Test Cases

## Static Website

- `/install` renders as the AI coding agent install overview.
- `/install/ai-agent` renders the copyable agent packet.
- `/install/manual`, `/install/frameworks/nextjs`, `/install/frameworks/react`, `/install/frameworks/vue`, `/install/frameworks/plain-html`, `/install/frameworks/shopify`, and `/install/frameworks/webflow` render with structured data.
- `/install/verify`, `/install/security`, `/install/contracts`, and `/install/changelog` do not exist as human public pages before launch.
- `/install.md`, `/install/ai-agent.md`, framework `.md` mirrors, and `/install/contracts.md` return Markdown.
- `/install/verify.md`, `/install/security.md`, and `/install/changelog.md` do not exist as standalone public Markdown routes before launch.
- `/agents/answerlattice/AGENTS.md`, `/agents/answerlattice/CLAUDE.md`, `/agents/answerlattice/cursor/RULE.md`, `/agents/answerlattice/cursor.mdc`, `/agents/answerlattice/windsurf.md`, `/agents/answerlattice/skill/SKILL.md`, and `/agents/answerlattice/answerlattice-agent-kit.zip` return generated agent assets.
- `/quickstarts` renders with Next.js, React, Vue/Nuxt, and vanilla examples.
- `/roi-calculator` updates estimates client-side without network requests.
- `/proof` labels examples as workloads, not case studies.
- `/security-one-pager` includes allowed origins, blocked routes, safe context, hashed keys, approval, rate limits, and incident contact.

## Dashboard

- Product Surfaces can add one missing template.
- Product Surfaces can add all missing templates and skip existing ones.
- Surface summary rebuild runs once after template application.
- Widget verifier shows key, loaded status, origin status, route status, and context status from existing settings data.
- Allowed origins and blocked routes stay dashboard-owned and are not generated as client-product owner settings or manual variables.
- Install Center copies the AI install packet, AGENTS.md, CLAUDE.md, Cursor RULE.md, Cursor .mdc, and Windsurf rule.
- Generated widget snippets escape quotes, ampersands, and angle brackets in attribute values.
- Agent kit download uses a same-origin no-store fetch to `/api/answerlattice/widget-agent-kit`, requires a successful ZIP content type, and rejects empty or over-2-MiB output.
- Agent packet and kit routes use actor/tenant/workspace rate-limit keys, `MANAGE_WIDGET`, exact store ownership, private no-store responses, and do not expose raw widget keys.
- Malformed widget-config timestamps, oversized strings/lists, negative/non-integer counters, and invalid response shapes do not replace Install Center state.
- Install Center command buttons preserve 44px minimum targets on mobile.
- KB Upload modal appends starter pack text and creates the same ingestion job shape as before.

## Cost

- Static public pages do not call Firestore.
- Verifier does not add collection scans, listeners, scheduled jobs, or telemetry collections beyond existing bounded widget settings/readiness reads.
- Protected dashboard packet and ZIP endpoints read the store document once per owner request.
- Surface template action remains bounded to six writes plus one summary rebuild.
