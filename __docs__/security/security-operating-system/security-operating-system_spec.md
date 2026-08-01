# Security Operating System - Specification

> Version: 1.1
> Status: Implemented
> Date: July 29, 2026

## Problem

The repository already has extensive security rules, verifiers, emulator tests, and product-specific doctrine. They are distributed across hundreds of scripts and documentation files. Without a governed index, a reviewer can miss existing evidence, run an unsafe or oversized command, confuse one product with another, or report a registry match as a passing security result.

## Goal

Create an internal operating layer that maps security surfaces to existing evidence and makes incomplete coverage explicit.

## Users

- Founder/repository owner
- Authorized maintainers
- Codex agents working inside this repository

It is not for customers, external penetration testers without separate authorization, or public vulnerability submission.

## Functional Requirements

1. Register the current deployment products using full product slugs.
2. Deep-map MenuList and Answerlattice.
3. Register other products without implying completed coverage.
4. Map each surface to source paths and zero or more existing evidence commands.
5. Group related evidence into manually selectable bundles rather than adding one automatic command for every verifier.
6. Keep bundle planning read-only and incapable of executing evidence commands.
7. Separate coverage state from verification state.
8. Validate all IDs, paths, npm commands, bundle references, product agreement, and boundary flags locally.
9. Reject external scanner, credential, network, Firebase SDK, and command-execution integration in SecurityOS package code.
10. Provide a reusable repository skill and root security policy.
11. Keep sensitive findings untracked and private.

## Non-Goals

- Rebuilding Codex Security, CodeQL, Semgrep, OSV-Scanner, Gitleaks, or Trivy.
- Claiming end-to-end security certification.
- Executing the entire verifier catalog from one audit command.
- Runtime vulnerability exploitation.
- Automatic severity, patching, merging, disclosure, or deployment.
- New Firebase collections, Storage paths, Functions, schedulers, or indexes.
- Public SecurityOS website, API, pricing, or support surface.

## Data Model

### Product profile

Defines the product slug, current phase, source paths, and explicit exclusions.

### Security surface

Defines product, risk, coverage status, verification status, source paths, direct evidence IDs, bundle IDs, and a bounded note.

### Evidence entry

Defines the existing verifier/policy path, one approved npm command when applicable, execution mode, network policy, production-write prohibition, and product scope.

### Evidence bundle

Defines a product-scoped group of evidence IDs with `selectionMode: manual-selective`. It is a discovery and planning object, not an executable suite.

## State Rules

- New evidence begins as `not-run`.
- `mapped` means discoverable evidence, not pass.
- `partial`, `registered`, and `unknown` must remain visible warnings.
- A pass is current only for the exact worktree and command reviewed.
- A failing command does not automatically establish exploitability or severity.
- A registry audit may validate structure but never upgrade a mapped surface to passed.
- Listing or printing an evidence bundle never executes its commands or changes verification state.

## Security and Privacy

- No credentials are read by SecurityOS.
- No source or findings are uploaded.
- No network API is called.
- No child command is executed by the audit.
- No child command is executed by the grouped planner.
- All raw findings remain outside Git or inside the gitignored private directory.
- Repository content is untrusted during assessment.

## Product Boundaries

### MenuList

SecurityOS maps authentication/failure behavior, tenant lifecycle and DAL scope, API tenant isolation, Firestore tenant rules, security events, POS secret rules, input/file/network/webhook validation, Storage boundaries, CSP reporting, and dependency integrity.

### Answerlattice

SecurityOS maps its repository security audit, Storage isolation, governance authority, public API, knowledge intake, integrations, billing, chat-session, release, ontology, dashboard read-rate policy, core doctrine, and dependency integrity. Canonical answers, knowledge, tickets, and live tenant data remain outside the audit's write authority.

### Registered-only products

CampaignCue, SignalDesk, and MyCodex have registered-only evidence bundles without a pass claim. Neelvara is visible but remains unknown because no focused verifier is registered.

## Acceptance Criteria

- The package and full internal doc set exist.
- Root policy and repo-local skill exist.
- Surface and evidence IDs are unique.
- Bundle IDs are unique, contain valid product-compatible evidence, and use manual selection.
- Every mapped/partial surface has direct evidence or a bundle.
- Every evidence command exists in `package.json`.
- Every source/evidence path exists.
- Boundary flags prohibit runtime, marketing, Firebase operations, upload, auto-fix, and auto-deploy.
- Planner output exposes execution/network policy and runs no evidence command.
- Focused verifier, typecheck, and lint pass without a production build.
