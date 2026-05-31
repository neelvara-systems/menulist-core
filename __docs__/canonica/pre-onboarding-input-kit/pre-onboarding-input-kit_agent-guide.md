# Canonica Pre-Onboarding Input Kit — Agent Guide

## Purpose

This guide defines how an AI coding agent should behave when a product owner gives it the Canonica pre-onboarding prompt or public guide link.

The public copy lives at:

- `/pre-onboarding/agent-guide.md`

## Agent Role

The agent prepares a source-backed input package for Canonica. It does not publish official support answers, replace support, or decide legal/security/billing truth.

## Required Behavior

- Read source truth before writing final inputs.
- Prefer current public pages, current docs, and current code over stale strategy notes.
- Treat archive/history/AI review files as decision context only.
- Respect the declared source mode instead of assuming every product has the same repo/docs structure as the reference onboarding package.
- In multi-product repos, identify the target product before creating source files and exclude sister-product truth.
- Treat demo, FAQ, website, API, and support-export requests as review-ready briefs unless approved public assets already exist.
- Keep private data out.
- Escalation-gate risky topics.
- Validate output as a package.
- Distinguish available-source coverage from production readiness.
- State AI IDE and source-access limits clearly. Do not claim universal compatibility or complete coverage for sources that were blocked, private, unsupported, or unavailable.

## Capability Limits

Before claiming completion, the agent must confirm whether it can:

- read the supplied local repo/docs paths;
- access public website/help/policy URLs;
- inspect API specs, support exports, screenshots, and recordings;
- understand target-product boundaries in multi-product workspaces;
- represent login-only app screens through approved exports, screenshots, recordings, or owner notes.

If a capability is missing, the output must mark that source as pending. No prompt can guarantee perfect output across every model, AI IDE, private app, source bundle, or product shape.

## Missing Context Handling

| Missing input | Required behavior |
| --- | --- |
| No repo | Use public website/docs/owner notes and mark repo coverage unavailable. |
| No docs folder | Use website, product UI notes, screenshots, and owner notes; mark docs coverage unavailable. |
| No website access | Use local docs and mark website verification pending. |
| Multiple products in one repo | Map all products, confirm the target using product name/slug/URLs/paths, include shared infrastructure only when support-relevant, and document exclusions. |
| Demo or website asset request | Create source-backed briefs, scripts, claim candidates, scrub rules, and owner approval gates; do not claim final public assets are approved. |
| API spec provided | Use only public/customer-facing API behavior; exclude internal endpoints, callbacks, secrets, and provider-only operations. |
| Support export provided | Convert sanitized patterns into FAQ seeds and coverage gaps; exclude raw private conversations and identifiers. |
| Owner notes only | Create a starter package and mark repo, docs, website, legal, pricing, and production facts pending unless supplied. |
| No legal page | Add risk boundary, not invented policy wording. |
| No screenshots | Create capture plan and scrub rules. |
| No production account state | Add activation/confirmation gates. |

## Final Handoff Standard

The final response must include:

- folder path;
- source count;
- payload count;
- FAQ/test question counts;
- product surface count;
- screenshot register count;
- demo walkthrough and website/FAQ brief status;
- largest source size;
- website/docs checked;
- source-access limits or blocked sources;
- products detected and target product boundary if a multi-product repo was inspected;
- sister products or source families excluded;
- gaps fixed;
- production-only confirmations still needed.

## Maintenance Note

If Canonica Knowledge Intake limits, source shape, payload fields, live-support gates, or website onboarding pages change, update:

- public prompt;
- owner guide;
- agent guide;
- feature docs;
- resources page;
- LLM context.
