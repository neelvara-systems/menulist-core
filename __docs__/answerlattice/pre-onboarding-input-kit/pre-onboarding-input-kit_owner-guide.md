# Answerlattice Pre-Onboarding Input Kit — Owner Guide

## Purpose

This guide explains how a product owner should use the Answerlattice pre-onboarding prompt before uploading sources into Answerlattice.

The public copy lives at:

- `/pre-onboarding/guide`
- `/pre-onboarding/owner-guide.md`

## Owner Checklist

Before running the prompt, gather:

- product name and short slug;
- product stage;
- source mode;
- product website URL;
- production app URL;
- repo path, docs workspace, exported docs, website links, or owner notes;
- target product paths and sister products to exclude when one repo contains multiple products;
- API specs, support exports, demo recordings, screenshots, or website/FAQ asset requests if available;
- help center/docs URLs;
- pricing, privacy, terms, refund/cancellation, security/trust, and contact URLs;
- known app pages and user roles;
- plan/entitlement notes;
- existing support FAQs, macros, changelogs, or onboarding notes;
- screenshot/marketing approval status.

## Prompt Fields

The public prompt includes explicit copy/paste placeholders:

| Field | What to enter |
| --- | --- |
| `PRODUCT_NAME` | Product name. |
| `PRODUCT_SLUG` | Short lowercase slug for the output folder. |
| `PUBLIC_WEBSITE_URL` | Website link or `NOT_AVAILABLE`. |
| `PRODUCTION_APP_URL` | App/login link or `NOT_AVAILABLE`. |
| `REPO_OR_DOCS_PATH` | Local repo/docs path or `NOT_AVAILABLE`. |
| `TARGET_PRODUCT_PATHS` | Target app/package/docs paths for multi-product repos or `NOT_AVAILABLE`. |
| `EXCLUDED_PRODUCT_NAMES` | Sister products that must stay out or `NOT_AVAILABLE`. |
| `HELP_DOCS_URLS` | Help/docs links or `NOT_AVAILABLE`. |
| `OPENAPI_OR_API_SPEC_PATHS` | Public API specs or `NOT_AVAILABLE`. |
| `SUPPORT_EXPORT_PATHS` | Support macro, FAQ, solved-ticket, CSV, or Markdown exports or `NOT_AVAILABLE`. |
| `DEMO_RECORDING_OR_SCREENSHOT_PATHS` | Approved recordings/screenshots or `NOT_AVAILABLE`. |
| `WEBSITE_ASSET_REQUEST` | `none`, `faq`, `website_copy_brief`, `demo_walkthrough`, `screenshots`, or `mixed`. |
| `PRICING_URL`, `PRIVACY_URL`, `TERMS_URL`, `REFUND_OR_CANCELLATION_URL`, `SECURITY_TRUST_URL`, `CONTACT_URL` | Public policy/contact links or `NOT_AVAILABLE`. |
| `PRODUCT_STAGE` | `public_live`, `private_beta`, `pre_launch`, or `docs_only`. |
| `SOURCE_MODE` | `repo_and_website`, `multi_product_repo`, `website_only`, `docs_only`, `owner_notes_only`, or `mixed`. |
| `APPROVAL_STATUS`, `SCREENSHOT_MARKETING_PERMISSION`, `ANSWERLATTICE_WORKSPACE_STATUS` | Approval and workspace status. |
| `OWNER_NOTES` | Short product summary/support notes or `NOT_AVAILABLE`. |

## Run Modes

| Mode | Use when | Expected handling |
| --- | --- | --- |
| Repo + website | Product repo and public site are available. | Agent checks code, routes, docs, public pages, policies, and support flows. |
| Multi-product repo | One codebase contains multiple products. | Agent maps products first, targets only the named product, includes shared infrastructure only when support-relevant, and excludes sister-product facts. |
| Website + docs only | No repo access. | Agent uses public docs and owner notes, then marks repo coverage unavailable. |
| Docs only | Local/exported docs exist but public website cannot be checked. | Agent marks website verification pending. |
| Owner notes only | No repo, docs, or public website source is ready. | Agent creates a starter package and marks unsupported facts pending. |
| Early/private product | Product is not fully public. | Agent uses README files, screenshots, notes, and marks production claims pending. |

## Asset Requests

If you want FAQs, website copy, screenshots, or demo walkthroughs, the generated output is still a review brief. Answerlattice pre-onboarding can prepare source-backed questions, claim candidates, capture steps, and scrub rules, but owner approval is required before anything becomes public.

## Capability Limits

The AI IDE can only cover what it can inspect. Private repositories, login-only product screens, restricted websites, recordings, screenshots, and local files may need explicit access or exported copies.

If the agent cannot access a source, it must mark that source as pending or unavailable instead of claiming coverage. This process is not a universal guarantee across every AI IDE, product, private app, or source shape.

## Review Before Upload

The owner must remove:

- secrets, tokens, cookies, API keys, service accounts;
- private user/customer data;
- raw logs;
- payment details;
- private support messages;
- unapproved screenshots;
- unsupported legal, refund, privacy, security, or billing claims.

## Live Support Gate

Pre-onboarding output is not live support readiness.

Before live support, confirm:

- source upload;
- draft review;
- risky-topic escalation rules;
- product surface mapping;
- widget allowed origins and blocked routes;
- runtime widget context;
- support test questions;
- screenshot approval.
