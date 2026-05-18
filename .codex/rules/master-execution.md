---
description: Master Execution Prompt — the central brain for ALL development (MenuList + Canonica). Auto-detects product context, routes workflows, validates everything. Use this to start ANY session.
---

# Master Execution Prompt

This is the **single entry point** for all development sessions across **both products**. It auto-detects which product the task belongs to, loads the correct context/rules/doctrine, and routes accordingly.

## STEP 0 — PRODUCT DETECTION (MANDATORY, EVERY SESSION)

Before ANY other action, determine which product this task belongs to:

### Detection Rules

| Signal                                                                                                                                                                   | Product      | Load                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ----------------------------------- |
| Mentions help center, KB, tickets, chat monitoring, AI chatbot, RAG, changelog, feedback, support infrastructure, Canonica, ontology, canonical answers, drift detection | **Canonica** | Canonica doctrine + rules           |
| Mentions menu, projects, editor, B2C view, OBP, campaigns, stores, outlets, billing, subscriptions, POS, digital screens, onboarding, dashboard (owner)                  | **MenuList** | MenuList constitution + rules       |
| File path contains `helpCenter/`, `helpChat/`, `knowledgeBase/`, `chatManagement/`, `supportTickets/`, `changelog/`, `feedback/`, `KBGeneration/`, `vectorEmbeddings/`   | **Canonica** | Canonica context                    |
| File path contains `projects/`, `editor/`, `b2cView/`, `campaigns/`, `billing/`, `stores/`, `multiOutlet/`, `dashboard/`                                                 | **MenuList** | MenuList context                    |
| Ambiguous or cross-product                                                                                                                                               | **Ask user** | "Is this for MenuList or Canonica?" |

### Context Loading Per Product

**If MenuList:**

1. Read `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md` — MenuList absolute laws
2. Load MenuList constitution (`__docs__/constitution/`)
3. Load relevant feature docs from `__docs__/[feature-name]/`
4. Apply all existing MenuList workflows and rules

**If Canonica:**

1. Read `__docs__/canonica/doctrine/01-core-doctrine.md` — Canonica identity + 5 pillars
2. Read `__docs__/canonica/doctrine/02-non-goals-charter.md` — what NOT to build
3. Read `__docs__/canonica/doctrine/03-infrastructure-freeze-v1.md` — frozen architecture
4. Load relevant Canonica docs from `__docs__/canonica/[feature]/`
5. Apply `.cascade/rules/CANONICA_RULES.md`
6. Apply Canonica-specific feature rejection filter (from non-goals charter)

**Shared rules (BOTH products):**

- Bug-fix zero tolerance
- Security rules (`.cascade/rules/SECURITY_IMPLEMENTATION_RULES.md`)
- DAL patterns (DB_COLLECTIONS, apiCallComposer, requestBodyComposer)
- Mobile rules if applicable
- Documentation organization rules
- Feature flags required for all new features

### Announce Product Context

Always start response with:

```
**Product:** [MenuList | Canonica]
**Stage:** [Stage N — Name]
**Action:** [What I'm doing]
```

## How to Trigger

**Recommended:** Use `/master-execution` slash command (this file).
**Alternative:** Reference `@IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md` in your message.
**Fallback:** Copy-paste the prompt contents into the cascade.

## Execution

1. **Product Detection** (Step 0 above — MANDATORY)
2. Read `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md` — the full Master Execution Prompt
3. Execute it with product-appropriate context loaded:
   - Smart context loading (product-specific rules/doctrines)
   - Auto-detection of current stage (9 stages, 0-8)
   - Automatic workflow routing (17 workflows integrated)
   - IDE_PROMPTS auto-selection (19 prompts integrated)
   - ChatGPT conversation input handling
   - Validation strengthening (web search + codebase reuse)
   - Core architecture protection (impact analysis before shared type changes)
   - Firebase cost discipline (reuse data, minimize reads/writes)
   - Scheduler consolidation discipline (prefer existing product scheduler task registries over new standalone scheduled functions)
   - Client-side DAL preference (no unnecessary API routes)
   - Auto-triggered parity check + simulation after implementation
   - Cross-feature error fixing protocol
   - Testing discipline (3 perspectives)
   - End-of-session cross-check + doc-rebuild
   - Self-improvement protocol

## When NOT to Use This

- If you want to run a **single specific workflow** (e.g., just `/doc-organize`) — use that workflow directly
- If you want a **quick code fix** with no lifecycle implications — just describe the fix

## Guardrails

- The Master Prompt is the AUTHORITY — it decides which workflow to run
- User does NOT need to specify `/chatgpt-review` or `/new-feature` etc. — the Master Prompt detects and routes
- **Product detection happens FIRST** — before any other action
- MenuList laws apply to MenuList work. Canonica doctrine applies to Canonica work.
- Shared codebase patterns (DAL, auth, Firebase) apply to BOTH
- Codebase truth > Cascade analysis > Web research > ChatGPT suggestions > Assumptions

## Two-Product Architecture Summary

| Aspect            | MenuList                        | Canonica                                 |
| ----------------- | ------------------------------- | ---------------------------------------- |
| **Identity**      | Canonical public business truth | Support Knowledge Control Plane for SaaS |
| **Docs**          | `__docs__/[feature]/`           | `__docs__/canonica/` + `doctrine/`       |
| **Rules**         | `.cascade/rules/` (existing)    | `.cascade/rules/CANONICA_RULES.md`       |
| **Constitution**  | `__docs__/constitution/`        | `__docs__/canonica/doctrine/`            |
| **Feature flags** | `src/config/features.ts`        | Same file, `ENABLE_CANONICA_*` prefix    |
| **DB constants**  | `src/constants/database.ts`     | Same file, `CANONICA_*` prefix           |
| **Non-goals**     | Feature Rejection Gate          | `doctrine/02-non-goals-charter.md`       |
| **Freeze**        | 3-year freeze (existing)        | 3-year freeze (independent)              |

## Mandatory Bug-Fix Discipline (ZERO TOLERANCE)

**Rule: If you find ANY bug, error, lint issue, broken import, or type error during ANY session — FIX IT IMMEDIATELY. No exceptions.**

This applies regardless of whether the bug was:

- Pre-existing before this session
- Introduced by your changes
- Found during a type check (`tsc --noEmit`)
- Found during a grep/search
- Found while reading code for context
- A lint warning in the IDE

**Required behavior:**

1. **FIX** the bug right now, in this session, before moving on
2. **REPORT** clearly: what was broken, why it was broken, what you changed
3. **NEVER** label something as "pre-existing" and skip it — that is a bug you found and must fix
4. **NEVER** say "only the pre-existing X error remains" — that means you left a known bug unfixed
5. **ALWAYS** run `tsc --noEmit` after your fixes and achieve **zero errors** before reporting completion

**Why:** Every "pre-existing" bug that gets deferred becomes a landmine. The user has explicitly requested this rule THREE TIMES. Treat every discovered bug as your responsibility to fix.
