# Canonica Pre-Onboarding Input Kit — Specification

## Purpose

Create a reusable pre-onboarding stage that helps Canonica clients prepare high-quality source inputs before their first Knowledge Intake job.

The system must let product owners use their existing AI coding tools to generate a Canonica-ready folder from their own product source truth.

## Target Users

- Solo SaaS founders.
- AI-built SaaS builders.
- Product owners preparing support before launch.
- Engineering teams asked to install Canonica and pass product context.
- Support operators migrating scattered docs and repeated answers into Canonica.

## Primary User Story

As a SaaS founder, I want to run one master prompt in my AI IDE so it inspects the strongest product sources I can provide, then creates a structured Canonica upload package I can review and upload.

## Product Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| POI-01 | Provide a public page explaining pre-onboarding and when to use it. | P0 |
| POI-02 | Provide a machine-readable master prompt for AI IDEs. | P0 |
| POI-03 | Require the agent to inspect live website/public docs when available. | P0 |
| POI-04 | Require active repo docs/code inventory when a repo is available. | P0 |
| POI-05 | Support repo+website, multi-product-repo, website-only, docs-only, owner-notes-only, and mixed source modes. | P0 |
| POI-06 | Require explicit copy/paste placeholders for product name, website, app URL, source mode, product stage, and approval status. | P0 |
| POI-07 | Require multi-product repo handling: target product identification, shared-infra inclusion rules, and sister-product exclusion. | P0 |
| POI-08 | Support market-common inputs: public URLs, API specs, support exports, screenshots, screen recordings, and demo/website asset requests. | P0 |
| POI-09 | Require a Canonica-ready folder structure with source inputs, payload skeletons, production onboarding notes, and asset inputs. | P0 |
| POI-10 | Include strict private-data exclusion rules. | P0 |
| POI-11 | Require risk boundaries for billing, legal, privacy, security, custom domains, integrations, and production incidents. | P0 |
| POI-12 | Require support test questions before live support activation. | P0 |
| POI-13 | Include a confidence standard that separates available-source coverage from production-runtime confirmation. | P0 |
| POI-14 | Keep the process product-agnostic and usable for any SaaS product. | P0 |
| POI-15 | State source-access and AI IDE capability limits clearly, including no universal guarantee across every agent, private source, or product shape. | P0 |

## Required Output Folder

The AI IDE should create:

```text
<product-slug>-canonica-pre-onboarding-inputs/
  README.md
  canonica-intake-plan.md
  upload-manifest.json
  source-inputs/
  api-payloads/
  production-onboarding/
    product-boundary-and-exclusions.md
  asset-inputs/
    demo-walkthrough-brief.md
    website-and-faq-asset-brief.md
```

## Required Source Families

The prompt requires 26 source families so Canonica receives consistent context. The files are standard; the product shape is not. If a family is unavailable or not applicable, the agent must keep the file and state why instead of fabricating content.

1. Product context.
2. Primary onboarding/intake workflow.
3. Public/customer-facing surfaces.
4. Correctness/governance.
5. Owner/admin operations.
6. Why this product is a Canonica client.
7. Asset and screenshot context.
8. FAQ seed CSV.
9. Risk boundaries and review rules.
10. Production onboarding context.
11. Account/access support.
12. Core workflow support.
13. Public/share/embed support.
14. Settings/profile/configuration support.
15. Integrations/install/export support.
16. Billing/subscription/payments support.
17. Roles/permissions/tenancy support.
18. Dashboard/analytics/feedback support.
19. Troubleshooting and escalation.
20. Live support operating contract.
21. Coverage index.
22. Live website public truth.
23. Live website feature claim coverage.
24. Public pricing/legal/trust/contact support.
25. Source evidence map.
26. Undercovered operations from available sources.

## Success Standard

Pre-onboarding is successful when:

- all available product truth is represented or explicitly excluded;
- missing repo, docs, website, legal, pricing, screenshot, or production facts are marked unavailable or pending with reasons;
- multi-product codebases have target-product paths, shared-infra inclusions, and sister-product exclusions documented;
- demo, FAQ, website, API, and support-export outputs are review-ready briefs or source maps, not approved public assets;
- blocked, private, login-only, or unsupported sources are marked pending instead of treated as covered;
- source files are small enough for Canonica intake limits;
- upload payloads match source files;
- risky topics are escalation-gated;
- live support test questions cover routine and risky user questions;
- screenshot usage rules prevent private data leakage;
- the owner can upload the package without rebuilding context manually.

## Doctrine Constraints

This feature strengthens Canonica by improving source quality before intake. It must not:

- auto-publish answers;
- claim Canonica owns client product truth before review;
- become a helpdesk workflow;
- become a broad docs CMS;
- encourage private data export into prompts;
- bypass Canonica's review and approval model.
- claim guaranteed perfect output across all AI IDEs, private apps, source bundles, or product shapes.
