# Canonica Developer Install Pack v1 Website Notes

## Public Pages Added

- `/install/ai-agent`: copyable AI coding agent install packet and acceptance criteria.
- `/install/manual`: manual v1 script install.
- `/install/frameworks/nextjs`: Next.js App Router and Pages Router install guide.
- `/install/frameworks/react`: React SPA install guide.
- `/install/frameworks/vue`: Vue/Nuxt install guide.
- `/install/frameworks/plain-html`: static/server-rendered script install.
- `/install/frameworks/shopify`: Shopify-style script injection.
- `/install/frameworks/webflow`: Webflow/custom-code install.
- `/install.md` and framework install `.md` files: machine-readable Markdown mirrors.
- `/install/contracts.md`: machine-readable Widget Contract v1 stability policy.
- `/agents/canonica/*`: generated agent files and agent-kit ZIP.
- `/quickstarts`: developer install examples and safe context rules.
- `/roi-calculator`: static repeated-question ROI planning calculator.
- `/proof`: example workload proof pack for launch, release, and studio support patterns.
- `/security-one-pager`: short security/ops summary for buyer and developer review.

## Updated Pages

- `/`: now includes the day-one launch pack linking quickstarts, starter surfaces, import templates, install verification, ROI/proof, and the security handoff from the main buying path.
- `/product`: now includes the same day-one launch pack so product evaluators see practical rollout resources before deeper feature sections.
- `/install`: now centers the AI coding agent install packet, generated agent files, and framework-specific docs.
- `/pricing`: links to the ROI calculator from support-credit explanation.
- `/resources`: includes quickstarts, ROI calculator, proof pack, and security one-pager.
- `/get-started`: first-session checklist now reflects starter surfaces, import starters, install verification, and approved-answer review.
- `/security`: links to the one-page security/ops handoff from the main trust page.
- `llms.txt` and `llms-full.txt`: now prioritize the agent install packet, contract docs, framework Markdown, and agent kit while keeping Public API secondary/gated.

## Copy Boundaries

- Canonica does not present a public SDK, typed helper, or npm package as an end-user install option.
- Agent files are described as coding-agent context and acceptance checks, not a guarantee that every external tool will obey them.
- The frozen contract is Canonica's v1 widget/context/verification contract, not a freeze around third-party AI IDE behavior.
- New installs use `https://canonica.app/widget/v1/canonica-widget.js`.
- Allowed origins and blocked routes are dashboard-owned settings; public install copy must not ask owners to maintain duplicate variables.
- The ROI calculator is illustrative and avoids guaranteed savings claims.
- Proof pack examples are labeled as example workloads, not customer case studies.
- Security one-pager does not replace the full security page.
- Public ROI, proof, and security pages are claim-governed: static assumptions must be labeled, example workloads must not be described as customer proof unless backed by approved evidence, and security copy must describe implemented runtime behavior only.
- Do not claim Public API self-serve, MCP, autonomous publishing, crawling, workflow integrations, email notifications, white-label, or multi-language unless the corresponding feature is enabled for public use.
