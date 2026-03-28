---
description: Start a new feature from scratch or from ChatGPT conversation. Runs the full pipeline - docs first, then implementation. Use this when beginning any new feature work.
---

# New Feature Pipeline

This workflow orchestrates the full IDE_PROMPTS pipeline (Steps 1-5) for new feature development.

## Prerequisites

1. Read `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md` — absolute laws, all rules
2. Read `.cascade/rules/SECURITY_IMPLEMENTATION_RULES.md` — 20 mandatory security rules
3. Read `IDE_PROMPTS/2. DOCUMENT CREATION PROMPT.md` — doc structure rules (now 6 docs + changelog)
4. Read `IDE_PROMPTS/10. CONTENT LAYERS PROMPT.md` — website, helpdoc, firebase, changelog templates

## Step 1: Determine Entry Point and Domain

Ask the user which scenario applies:

- **Scenario A**: New feature from ChatGPT conversation → Run `/chatgpt-review` first, then continue from Step 2
- **Scenario B**: New feature idea (no ChatGPT) → Start at Step 2 directly
- **Scenario C**: Feature already discussed in previous cascade session → Read previous conversation context, then Step 2

Then determine the domain:

- **Owner-side** (dashboard, projects, editor, settings) → Also load `/owner-dashboard` workflow context
- **Customer-facing** (digital menu, screens, public pages) → Also load `/customer-facing` workflow context
- **Both** → Load both domain contexts

## Step 2: Document Creation (MANDATORY — before any code)

1. Create folder: `__docs__/[feature-name]/` (kebab-case)
2. Create `README.md` following template from `IDE_PROMPTS/6. DOCUMENTATION STRUCTURE PROMPT.md`:
   - Quick Navigation table (audiences → docs)
   - One-liner, Problem Solved, Solution
   - Architecture overview
   - Key files in codebase
   - Feature flag reference
3. Create `[feature-name]_spec.md` (CEO/PM readable):
   - Executive Summary, Goals, Target Customers, Scope, User Stories, Requirements
   - NO technical jargon
   - Every claim must be achievable within 3-year freeze
4. Create `[feature-name]_impl.md` (Developer blueprint):
   - Architecture, DB Schema (Firestore structure), API Contracts (with Zod schemas)
   - File Inventory with exact paths
   - Security Checklist (withAuth, Zod, rate limiting, secure logging)
   - Implementation Phases with checklists
   - Testing Guide
   - Firebase cost estimation
5. Create `[feature-name]_marketing.md` (Sales/Marketing — INTERNAL):
   - Follow Language Governance (no forbidden phrases)
   - Elevator pitch, feature narrative, pitch deck outline
6. Create `[feature-name]_website.md` (Landing page content — PUBLIC):
   - Hero section (headline, subheadline, CTA)
   - Problem/solution statements in customer language
   - 3-5 feature benefits (outcomes, not features)
   - How it works (3 steps max)
   - Social proof slots, FAQ, SEO meta
   - MUST follow Language Governance — no "AI-powered", "Smart", "Dynamic"
7. Create `[feature-name]_helpdoc.md` (Customer help article — PUBLIC):
   - Quick summary, getting started guide
   - Step-by-step how-tos (numbered, one action per step)
   - Troubleshooting / FAQ (top 3-5 problems)
   - Tips, related features, support escalation path
   - Written for non-tech Indian SMB owners — zero jargon
   - Mark screenshot slots even if not captured yet
8. Create `[feature-name]_firebase.md` (Firebase cost tracking — CRITICAL):
   - List ALL Firestore collections this feature touches
   - Document EVERY read: collection, trigger, frequency, docs read, indexed?
   - Document EVERY write: collection, trigger, frequency, fields, merge/set
   - Document EVERY delete: collection, soft vs hard, frequency
   - Storage operations with path patterns and size estimates
   - Cloud Functions with triggers, duration, memory
   - Map DAL functions to file:line references
   - Map API routes to their Firebase operations
   - Cost estimate per 1000 active users/month
   - Flag expensive patterns and optimization opportunities
9. Add entry to `__docs__/changelog.md` under current date:
   - New → Improved → Fixed grouping
   - User-facing language, link to help doc

## Step 3: Mobile Admission Test (MANDATORY — BEFORE implementation)

> **Law 11:** Mobile is core, not optional. Run this BEFORE writing any code.

1. Read `__docs__/mobile-operational-support/02-mobile-ui-doctrine.md` for mobile rules
2. Run the **Feature Admission Test** (4 gates):
   - **Frequency Gate:** Is this done daily or multiple times/day? (If monthly/rarely → desktop only)
   - **Speed Gate:** Can this complete in <5 seconds on mobile? (If slow/complex → desktop only)
   - **Touch Gate:** Does this work well with thumb-only interaction? (If needs precision → desktop only)
   - **Value Gate:** Does the owner NEED this while away from desk? (If only useful at desk → desktop only)
3. Create `[feature-name]_mobile-support.md` in the feature folder:
   - Mobile relevance decision (YES / NO / PARTIAL) with gate results
   - If YES/PARTIAL: which mobile screens, which actions, data source hooks
   - If NO: which gate failed and why (one line per gate)
   - Localization: inherits from desktop (next-intl, RTL, timezone, date/time format)
   - Auth: same NextAuth session, same RBAC permissions
   - Settings: theme mode, language, timezone all inherited from AppSettings Redux state
4. If mobile-relevant: add mobile screen spec to `__docs__/mobile-operational-support/03-mobile-screens-spec.md`

## Step 4: Implementation — Desktop + Mobile in Parallel (MANDATORY)

1. Read `IDE_PROMPTS/4. IMPLEMENTATION PROMPT.md` for implementation protocol
2. Pre-implementation verification:
   - Confirm all impl.md sections are present
   - List exact files/paths to create/modify (desktop AND mobile)
   - Security audit against `__docs__/security` patterns
3. Code implementation (desktop + mobile built together):
   - Create files EXACTLY as specified in impl.md File Structure
   - Follow DAL pattern: `DB_COLLECTIONS` constants, `apiCallComposer`, `requestBodyComposer`
   - All APIs: `withAuth()`, Zod validation, rate limiting, `secureLog`/`secureError`
   - **Desktop UI**: Ant Design, server components + DAL for data fetching
   - **Mobile UI** (if gates passed): antd-mobile + Tailwind, same DAL functions, optimistic updates
   - Add feature flag to `src/config/features.ts`
   - Wire mobile screen into `MobileShell` or `MobileMoreScreen` navigation
4. **Mobile data format audit** (if mobile-relevant):
   - Verify mobile writes use IDENTICAL field names as desktop
   - Verify mobile reads match DAL return shape (not invented field names)
   - Verify status values, date formats, key names all match desktop exactly
5. Generate validation report: `__docs__/[feature-name]/[feature-name]_validation.md`
   - Engineering checklist with file:line evidence
   - Architecture, UI, Security, Firebase Cost checklists
   - Mobile compatibility checklist (if applicable)
   - All must pass 100% or STOP and flag

**Build order:** DAL function → Hook → Desktop UI + Mobile UI (parallel, same session)

**Icons:** Use `react-icons/lu` (Lucide) for all icons — same as desktop. Never mix icon libraries.

**ICP rule:** All UI (desktop AND mobile) must be usable by a non-technical SMB owner. Zero jargon. Large touch targets. Instant feedback via optimistic updates.

## Step 5: Type Check

// turbo
Run `npx tsc --noEmit` to verify no type errors (desktop AND mobile components)

## Guardrails

- 3-YEAR FREEZE: Ship complete. No "Phase 2" or "later" language
- FULL DOC SET: spec + impl + marketing + website + helpdoc + firebase + mobile-support + changelog entry
- FEATURE FLAGS: Every feature gets a flag in `config/features.ts`
- PATH VERIFICATION: Every claim links to exact file:line
- CODEBASE > ChatGPT: Our code is truth
- LANGUAGE GOVERNANCE: Website and helpdoc MUST follow constitution language rules
- FIREBASE TRACKING: Every read/write/delete MUST be documented — directly impacts revenue
- INTERNAL vs PUBLIC: marketing = internal strategy, website + helpdoc = customer-facing content, firebase = cost control
- MOBILE SUPPORT: Every feature MUST have `_mobile-support.md` with admission test results
