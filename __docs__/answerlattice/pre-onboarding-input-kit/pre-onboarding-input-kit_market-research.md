# Answerlattice Pre-Onboarding Input Kit — Market Research

## Purpose

This note captures official-source research behind the pre-onboarding prompt shape. It is not a competitor teardown. It explains why Answerlattice pre-onboarding now handles repo/docs, website URLs, API specs, support exports, screenshots, recordings, demo briefs, FAQ seeds, and website asset briefs.

## Official-Source Findings

| Source | Observed pattern | Answerlattice handling |
| --- | --- | --- |
| Intercom website sync | Public URLs can be synced for support AI, but users review relevant pages and can exclude URLs. | Require include/exclude URL notes and avoid unrelated marketing or sister-product pages. |
| Zendesk AI agents | External knowledge can come from help centers, Confluence, SharePoint, crawled websites, CSV, Markdown, and federated records; sources are imported/synced, not live internet search. | Support multiple source types, but preserve source maps, freshness notes, and owner review. |
| GitBook import | Docs can be imported from online docs, files, and Git sync; content differences and formatting limits require review. | Keep imported docs review-gated and mark conversion/source limitations. |
| Mintlify docs | Docs can live in a Git repository and deploy from repo-backed MDX. | Treat repo/docs as useful source truth, but convert implementation details into support-safe product behavior. |
| ReadMe OpenAPI upload | API references can be generated from OpenAPI Specification files. | Accept public API specs as support sources while excluding internal endpoints and secrets. |
| Arcade interactive demo docs | Recorded product flows can become step-by-step walkthroughs embedded into websites/docs. | Create demo walkthrough briefs, scripts, and capture plans, not final approved demos. |
| Guidde capture docs | Screen capture can produce clear step visuals, transcript, and ready-to-share layout. | Treat recordings as sources for support steps and transcript outlines after owner review. |
| Supademo Smart Blur docs | Demo recording tools may blur names, prices, emails, personal data, and other PII during capture. | Require scrub rules and approved demo data before screenshots or recordings enter Answerlattice assets. |
| Guru enterprise search | Knowledge answers can be permission-aware, cited, verified, and governed by human workflows. | Keep Answerlattice pre-onboarding source-backed, cited, and review-gated. |

## Rules Added From Research

- Do not treat repo access as enough. Many products expect source-to-doc, source-to-FAQ, source-to-demo, and source-to-website asset preparation.
- Do not crawl or summarize everything. Record include/exclude decisions for URLs, source folders, product paths, and sister products.
- Do not treat recordings/screenshots as public assets. Produce capture plans, transcript outlines, scrub rules, and owner approval gates.
- Do not include raw support tickets or private conversations. Convert sanitized patterns into FAQ seeds and coverage gaps.
- Do not use API specs blindly. Include only public/customer-facing API behavior and escalation-gate security-sensitive topics.
- Do not publish generated website copy, FAQs, or demo scripts as approved Answerlattice truth. They remain review-ready briefs until owner signoff.

## Sources

- Intercom: `https://www.intercom.com/help/en/articles/9357945-sync-and-manage-websites`
- Zendesk: `https://support.zendesk.com/hc/en-us/articles/9733984274586-Can-AI-agents-search-for-answers-outside-of-my-help-center`
- GitBook: `https://gitbook.com/docs/getting-started/import`
- Mintlify: `https://www.mintlify.com/docs/what-is-mintlify`
- ReadMe: `https://docs.readme.com/main/docs/openapi-upload-and-management`
- Arcade: `https://docs.arcade.software/kb/build/interactive-demo`
- Guidde: `https://help.guidde.com/en/articles/9382933-getting-started-with-capturing-a-guidde`
- Supademo: `https://docs.supademo.com/create/by-demo-type/guided-screenshot-and-video-demos/smart-blur`
- Guru: `https://www.getguru.com/solutions/ai-enterprise-search`
