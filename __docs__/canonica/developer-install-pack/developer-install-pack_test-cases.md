# Canonica Developer Install Pack v1 Test Cases

## Static Website

- `/install` renders as the AI coding agent install overview.
- `/install/ai-agent` renders the copyable agent packet.
- `/install/manual`, `/install/frameworks/nextjs`, `/install/frameworks/react`, `/install/frameworks/vue`, `/install/frameworks/plain-html`, `/install/frameworks/shopify`, `/install/frameworks/webflow`, `/install/verify`, `/install/security`, `/install/contracts`, and `/install/changelog` render with structured data.
- `/install.md`, `/install/ai-agent.md`, framework `.md` mirrors, `/install/verify.md`, `/install/security.md`, and `/install/contracts.md` return Markdown.
- `/agents/canonica/AGENTS.md`, `/agents/canonica/CLAUDE.md`, `/agents/canonica/cursor/RULE.md`, `/agents/canonica/cursor.mdc`, `/agents/canonica/windsurf.md`, `/agents/canonica/skill/SKILL.md`, and `/agents/canonica/canonica-agent-kit.zip` return generated agent assets.
- `/quickstarts` renders with Next.js, React, Vue/Nuxt, and vanilla examples.
- `/roi-calculator` updates estimates client-side without network requests.
- `/proof` labels examples as workloads, not case studies.
- `/security-one-pager` includes allowed origins, blocked routes, safe context, hashed keys, approval, rate limits, and incident contact.

## Dashboard

- Product Surfaces can add one missing template.
- Product Surfaces can add all missing templates and skip existing ones.
- Surface summary rebuild runs once after template application.
- Widget verifier shows key, loaded status, origin status, route status, and context status from existing settings data.
- Install Center copies the AI install packet, AGENTS.md, CLAUDE.md, Cursor RULE.md, Cursor .mdc, and Windsurf rule.
- Agent kit download uses `/api/canonica/widget-agent-kit` and does not expose raw widget keys.
- KB Upload modal appends starter pack text and creates the same ingestion job shape as before.

## Cost

- Static public pages do not call Firestore.
- Verifier does not add collection scans, listeners, scheduled jobs, or telemetry collections beyond existing bounded widget settings/readiness reads.
- Protected dashboard packet and ZIP endpoints read the store document once per owner request.
- Surface template action remains bounded to six writes plus one summary rebuild.
