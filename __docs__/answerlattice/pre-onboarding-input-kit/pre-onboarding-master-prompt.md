# Answerlattice Pre-Onboarding Master Prompt

Use the public machine-readable copy at:

```text
https://answerlattice.com/pre-onboarding.md
```

The public route is the copy customers should paste into Codex, Cursor, Windsurf, Antigravity, Claude Code, or another AI coding agent.

This internal file exists so the prompt can be reviewed alongside the feature docs. Keep it aligned with `src/lib/answerlattice/preOnboardingPrompt.ts`.

## Prompt Summary

The prompt asks the agent to:

- collect explicit copy/paste fields for product name, website URL, app URL, source mode, product stage, approvals, and owner notes;
- inspect the client's available source bundle: repo, docs, website, owner notes, screenshots, routes, policies, and support flows;
- handle multi-product repos by identifying the target product, documenting shared infrastructure, and excluding sister-product truth;
- handle market-common source requests such as API specs, support exports, screenshots, recordings, FAQ seeds, website briefs, and demo walkthrough briefs;
- check whether the AI IDE can actually access the supplied repo, website, app, media, API, and export sources;
- generate a structured `*-answerlattice-pre-onboarding-inputs/` folder;
- create 26 source families for Answerlattice Knowledge Intake, marking unavailable or not-applicable families instead of inventing content;
- create source/payload/manifest parity;
- create support FAQ seeds and live support test questions;
- map product surfaces and screenshot slots;
- keep private data out;
- state source-access limits and avoid claiming guaranteed coverage across every AI IDE, product, private app, or source shape;
- mark production-only facts as confirmation gates;
- validate the package before final handoff.
