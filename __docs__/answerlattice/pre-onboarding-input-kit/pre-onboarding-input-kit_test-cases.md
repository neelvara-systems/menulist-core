# Answerlattice Pre-Onboarding Input Kit — Test Cases

## Static Website

| ID | Scenario | Expected Result |
| --- | --- | --- |
| POI-WEB-001 | Visit `/pre-onboarding`. | Page loads with Answerlattice header/footer and explains the pre-onboarding workflow. |
| POI-WEB-002 | Open `/pre-onboarding.md`. | Markdown prompt is returned as `text/markdown`. |
| POI-WEB-003 | Visit `/pre-onboarding/guide`. | Detailed guide loads with owner prep, run modes, agent rules, review checklist, and live-support gates. |
| POI-WEB-004 | Open `/pre-onboarding/owner-guide.md`. | Owner guide is returned as `text/markdown`. |
| POI-WEB-005 | Open `/pre-onboarding/agent-guide.md`. | Agent guide is returned as `text/markdown`. |
| POI-WEB-006 | Open `/resources`. | Resource hub includes links to Pre-Onboarding Kit and Guide. |
| POI-WEB-007 | Open sitemap. | `/pre-onboarding` and `/pre-onboarding/guide` appear through `ANSWERLATTICE_PUBLIC_PAGES`. |
| POI-WEB-008 | Inspect public copy. | It does not claim auto-publishing, helpdesk replacement, or private data import. |
| POI-WEB-009 | Inspect safety and guide copy. | It states that coverage depends on what the AI IDE can inspect and does not guarantee perfect output for every agent, private source, or product shape. |
| POI-WEB-010 | Use the prompt CTA on `/pre-onboarding`. | Prompt opens in an in-page modal with copy, Markdown download, and preview. |
| POI-WEB-011 | Use the prompt CTA on `/pre-onboarding/guide`. | Prompt opens in the same modal flow without navigating away from the guide. |
| POI-WEB-011A | Simulate an oversized or non-Markdown `/pre-onboarding.md` response. | The modal rejects the preview, shows fixed fallback copy, and keeps the direct Markdown route visible. |
| POI-WEB-011B | Simulate a rejected Clipboard API write with textarea fallback available. | Copy Prompt falls through to the fallback and shows copied state only after `document.execCommand('copy')` returns true; unavailable or failed fallback support keeps the fixed error state. |
| POI-WEB-011C | Return Markdown without an allowed `Content-Type`. | Modal fails closed and keeps the direct Markdown route visible. |
| POI-WEB-011D | Open the prompt modal, navigate with Tab/Shift+Tab, then close it. | Initial focus lands on the in-dialog close button, the backdrop is absent from the tab order, focus stays inside the dialog, and close restores the prompt trigger. |
| POI-WEB-011E | Inspect every prompt/guide/tool Markdown route. | Each route uses the shared Markdown content type, cache policy, and `nosniff` header. |
| POI-WEB-012 | Visit Answerlattice homepage. | Hero includes a pre-onboarding source-preparation link and the first-scroll page flow includes the Pre-Onboarding Kit section. |
| POI-WEB-013 | Inspect desktop and mobile navigation. | Desktop header and mobile drawer include a direct Pre-Onboarding link. |
| POI-WEB-014 | Visit `/get-started`. | Page offers pre-onboarding before workspace creation for owners with source material. |
| POI-WEB-015 | Visit `/resources`. | Pre-Onboarding Kit is highlighted before rollout planning links. |

## Prompt Output

| ID | Scenario | Expected Result |
| --- | --- | --- |
| POI-PROMPT-001 | Run prompt in an AI IDE with product name, website URL, source mode, and approval placeholders filled. | Creates `<product-slug>-answerlattice-pre-onboarding-inputs/`. |
| POI-PROMPT-002 | Product has website and docs. | Generated package includes live website truth and source evidence map. |
| POI-PROMPT-003 | Product has no repo access. | Agent marks repo coverage as unavailable and uses public/docs/owner notes. |
| POI-PROMPT-004 | Product has no docs folder. | Agent marks docs coverage unavailable and continues from website/owner sources. |
| POI-PROMPT-005 | Product has owner notes only. | Agent creates starter files and marks unsupported repo, website, legal, pricing, and production facts pending. |
| POI-PROMPT-006 | Repo contains multiple products. | Agent maps products, targets the named product, documents shared-infra inclusions, and excludes sister-product facts. |
| POI-PROMPT-007 | Target product cannot be identified in a multi-product repo. | Agent asks for target paths/domains before creating upload inputs. |
| POI-PROMPT-008 | Product has OpenAPI/API spec. | Agent maps public/customer-facing API support and excludes internal endpoints/secrets. |
| POI-PROMPT-009 | Product has support exports or solved-ticket examples. | Agent creates sanitized FAQ seeds and coverage gaps without raw private conversations. |
| POI-PROMPT-010 | Product owner asks for demo video or website assets. | Agent creates review-ready demo/website/FAQ briefs, capture plan, scrub rules, and approval gates. |
| POI-PROMPT-011 | Product has billing/legal/privacy pages. | Risky policy answers are review-gated. |
| POI-PROMPT-012 | Product has app routes/product surfaces. | Product surface CSV maps routes/pages/workflows when available or marks unavailable with reason. |
| POI-PROMPT-013 | Product has private IDs in examples. | Agent excludes or redacts them. |
| POI-PROMPT-014 | Generated CSVs are invalid. | Agent fixes CSVs before final handoff. |
| POI-PROMPT-015 | Missing active support source family found. | Agent patches source coverage or marks it unavailable before declaring readiness. |
| POI-PROMPT-016 | User asks for 100% confidence. | Agent distinguishes available-source coverage from production runtime gates. |
| POI-PROMPT-017 | AI IDE cannot browse the website or read local files. | Agent asks for exports/access or marks those sources pending; it does not claim complete coverage. |
| POI-PROMPT-018 | Product has login-only screens and no approved screenshots or recordings. | Agent creates a production confirmation gate and capture plan instead of inventing screen behavior. |
| POI-PROMPT-019 | Package is ready. | Final report lists source count, CSV row counts, largest source size, product boundary if relevant, source-access limits, asset brief status, and remaining production gates. |
| POI-PROMPT-020 | Agent builds add-source JSONL for a public page. | Payload uses one singular `originUrl`, a supported source type, and no `sourceUrls` field. |
| POI-PROMPT-021 | Agent builds API-ready JSONL for a local Markdown/CSV source. | Reviewed `contentText` is present and does not exceed 40,000 characters; review-only skeletons are labeled not ready to send. |
| POI-PROMPT-022 | Agent includes raw screenshot, audio, or video. | Package directs the owner to authenticated media upload instead of embedding raw media in JSONL. |
| POI-PROMPT-023 | Source is a ticket, chat, macro, or repeated reply. | Source is marked as a support signal until an authoritative fact is reviewed. |
| POI-PROMPT-024 | Two sources disagree. | Evidence map preserves both sources, authority, applicability, conflict, and required owner decision. |
| POI-PROMPT-025 | Private source is supplied without approved AI-tool handling. | Agent excludes it or marks it pending; no private URL/text is marked for public citation. |
| POI-PROMPT-026 | Agent prepares the package in a product repo. | Only generated package files change unless the owner separately requests and reviews product/source edits. |

## Live Support Gate

| ID | Scenario | Expected Result |
| --- | --- | --- |
| POI-LIVE-001 | Client wants to enable live widget support immediately. | Do not enable until source upload, review, product surfaces, widget context, and test questions pass. |
| POI-LIVE-002 | Client wants screenshots for marketing. | Require approved demo tenant, privacy scrub, and final signoff. |
| POI-LIVE-003 | Client asks Answerlattice to answer refund or legal questions. | Keep escalation-gated unless approved source wording exists. |
