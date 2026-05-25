# Developer Install Pack Spec

## Goal

Help a Canonica client reach the first successful support install quickly:

1. Understand value from public quickstarts, ROI, proof, and security summaries.
2. Create a workspace.
3. Seed starter product surfaces.
4. Import starter knowledge.
5. Install the widget.
6. Verify key, origin, route, and page context.

## In Scope

- Thin typed browser SDK wrapper around `window.CanonicaWidget`.
- Quickstarts for Next.js App Router, React SPA, Vue/Nuxt, and vanilla script.
- Dashboard install verifier based on existing widget runtime telemetry.
- Starter surface templates for Billing, Onboarding, Team Settings, Releases, Integrations, and Common Errors.
- Import starter templates for Markdown docs, FAQ CSV, changelog entries, and ticket macros.
- Static public ROI calculator.
- Public proof pack with clearly labeled example workloads.
- Shareable security and operations one-pager.

## Out of Scope

- No autonomous publishing.
- No URL crawling expansion.
- No new public write APIs.
- No new scheduled jobs.
- No separate helpdesk product.
- No claim that the SDK bypasses widget keys, allowed origins, or server-side authorization.

## Acceptance Criteria

- Public pages are in sitemap and LLM context.
- Dashboard verifier uses existing runtime status and does not add new reads.
- Surface templates create only product surface records and require later human-authored or generated-and-reviewed knowledge.
- Import starter pack feeds the existing KB generation job source flow.
- All claims remain aligned with implemented runtime behavior.
