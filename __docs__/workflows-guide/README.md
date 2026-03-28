# Windsurf Workflows — User Guide

**Created:** February 7, 2026  
**Purpose:** How and when to use each Cascade workflow slash command  
**Location:** `.windsurf/workflows/` (15 workflow files)

---

## What Are Workflows?

Workflows are **saved recipes** stored as `.md` files. Instead of re-explaining context every session, you type a slash command like `/new-feature` and Cascade follows the exact steps defined in the workflow file.

**How to use:** Type `/workflow-name` in the Cascade chat panel. Cascade reads the file and executes each step.

---

## Quick Reference — Which Workflow When?

| I want to...                              | Type this              | What happens                                                                                                           |
| ----------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **I'm not sure / you decide**             | **`/help`**            | **Cascade analyzes your request and picks the right workflow automatically**                                           |
| Review a ChatGPT conversation             | `/chatgpt-review`      | Cross-checks ChatGPT ideas against our codebase, creates decision matrix                                               |
| Start a new feature                       | `/new-feature`         | Full pipeline: docs first → implementation → validation                                                                |
| Process ChatGPT feedback on docs          | `/doc-feedback`        | Validates feedback against code, updates docs only (no code changes)                                                   |
| Process ChatGPT feedback on code          | `/code-feedback`       | Validates suggestions against spec/impl, applies valid fixes only                                                      |
| Document an existing undocumented feature | `/retro-doc`           | Reverse-engineers from codebase to create spec/impl/marketing docs                                                     |
| Refactor/review an existing feature       | `/refactor-feature`    | Deep codebase analysis + fresh docs + code cleanup                                                                     |
| **Clean up scattered documentation**      | `/doc-organize`        | Audit + move + consolidate docs into correct folders                                                                   |
| **Rebuild cluttered feature docs**        | `/doc-rebuild`         | Goes back to codebase truth, rewrites clean canonical docs from scratch                                                |
| **Run infrastructure security audit**     | `/system-audit`        | Scan for auth gaps, cost bombs, stale sessions, logging violations                                                     |
| End-of-session review                     | `/final-review`        | Full verification: code↔docs, redundancy check, type check, wrap-up                                                    |
| **Working on owner dashboard/projects**   | **`/owner-dashboard`** | **Loads DAL patterns, security rules, auth conventions, feature rejection gate**                                       |
| **Working on menus/screens/public pages** | **`/customer-facing`** | **Loads constitution, 10 Laws, language governance, menu enforcement rules**                                           |
| **Review mobile implementation**          | **`/mobile-review`**   | **Deep cross-check of mobile screens against doctrine, 12 laws, architecture**                                         |
| **Post-impl spec-vs-code parity audit**   | **`/parity-audit`**    | **Builds system map from docs + code separately, diffs them. Catches cross-file mismatches file-by-file reviews miss** |

---

## Workflow Map — How They Connect

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FEATURE DEVELOPMENT PIPELINE                      │
│                                                                      │
│  ChatGPT conversation                                                │
│       ↓                                                              │
│  /chatgpt-review  ──→  Decision matrix (AGREE/REJECT/PARTIAL)       │
│       ↓                                                              │
│  /new-feature  ──→  Docs first → Code → Validation                  │
│       ↓                                                              │
│  (Optional) Send docs to ChatGPT                                     │
│       ↓                                                              │
│  /doc-feedback  ──→  Update docs from valid feedback                 │
│       ↓                                                              │
│  (Optional) Send code to ChatGPT                                     │
│       ↓                                                              │
│  /code-feedback  ──→  Apply valid code fixes                         │
│       ↓                                                              │
│  /parity-audit  ──→  Deep spec-vs-code system map diff (MANDATORY)  │
│       ↓                                                              │
│  /final-review  ──→  End-of-session verification                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    DOMAIN-SPECIFIC CONTEXT                             │
│                                                                      │
│  Owner features (dashboard, editor, settings)                         │
│       → /owner-dashboard  (DAL, security, auth patterns)              │
│                                                                      │
│  Customer surfaces (menu, screens, public pages)                      │
│       → /customer-facing  (constitution, language, enforcement)       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    MAINTENANCE & CLEANUP                              │
│                                                                      │
│  Feature exists but no docs  →  /retro-doc                           │
│  Feature needs review/refactor  →  /refactor-feature                 │
│  Docs scattered/messy  →  /doc-organize                              │
│  Feature docs cluttered after many sessions  →  /doc-rebuild         │
│  Security/infra health check  →  /system-audit                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Guide — Each Workflow

### 1. `/chatgpt-review`

**When:** You discussed a feature idea with ChatGPT and want to validate it against our codebase.

**What you provide:** Paste the ChatGPT conversation in the chat after invoking the workflow.

**What Cascade does:**

- Analyzes every ChatGPT suggestion
- Cross-references against actual codebase implementation
- Checks 3-year freeze compliance
- Creates a decision matrix: AGREE / DISAGREE / PARTIAL
- Outputs ONE review doc in `__docs__/[feature-name]/_archive/`

**Maps to:** `IDE_PROMPTS/1. CHATGPT-CONVERSATION-REVIEW.md`

---

### 2. `/new-feature`

**When:** Starting any new feature work — from scratch or after a ChatGPT review.

**What you provide:** Feature name and description. If coming from ChatGPT, reference the review doc.

**What Cascade does:**

1. Creates `__docs__/[feature-name]/` with README, spec, impl, marketing docs
2. Creates website content (`_website.md`) and help documentation (`_helpdoc.md`)
3. Creates Firebase cost tracking (`_firebase.md`) — every read/write/delete documented
4. Adds changelog entry to `__docs__/changelog.md`
5. Implements code exactly as specified in impl.md
6. Adds feature flag to `src/config/features.ts`
7. Generates validation report with 100% checklist pass
8. Runs `npx tsc --noEmit`

**Maps to:** `IDE_PROMPTS/2. DOCUMENT CREATION PROMPT.md` + `IDE_PROMPTS/4. IMPLEMENTATION PROMPT.md` + `IDE_PROMPTS/10. CONTENT LAYERS PROMPT.md`

**Important:** Docs are created BEFORE any code. This is non-negotiable.

---

### 3. `/doc-feedback`

**When:** You sent our docs to ChatGPT for review and received feedback.

**What you provide:** Paste ChatGPT's feedback on the docs.

**What Cascade does:**

- Audits each feedback point against actual codebase
- Updates ONLY docs (zero code changes)
- Rejects feedback that contradicts code reality
- Creates alignment verification

**Maps to:** `IDE_PROMPTS/3. VALIDATION FEEDBACK PROMPT.md`

**Mode:** DOCS ONLY — git diff should show only doc files changed.

---

### 4. `/code-feedback`

**When:** You sent our code to ChatGPT for review and received suggestions.

**What you provide:** Paste ChatGPT's code feedback.

**What Cascade does:**

- Audits each suggestion against spec/impl docs
- Implements ONLY valid fixes (rejects scope creep)
- Re-validates after changes
- Runs type check

**Maps to:** `IDE_PROMPTS/5. AFTER IMPLEMENTATION FEEDBACK PROMPT.md`

---

### 5. `/retro-doc`

**When:** A feature exists in code but has no documentation (or outdated/scattered docs).

**What you provide:** Feature name and key entry points in codebase.

**What Cascade does:**

- Deep codebase exploration: every file, every import, every flow
- Traces end-to-end: Frontend → Backend → DB → Response → UI
- Creates full doc set from code reality: spec, impl, marketing, website, helpdoc, firebase + README
- Archives old scattered docs
- Includes suggestions for improvements discovered during analysis

**Maps to:** `IDE_PROMPTS/0. FEATURE RETRO DOCUMENTATION PROMPT.md` + `IDE_PROMPTS/10. CONTENT LAYERS PROMPT.md`

---

### 6. `/refactor-feature`

**When:** Revisiting an existing feature for improvements, code cleanup, or comprehensive review.

**What you provide:** Feature name.

**What Cascade does:**

- Deep codebase scan (every nested/imported file)
- End-to-end flow tracing
- Fresh documentation from scratch (archives old docs)
- Code refactoring using patterns from `IDE_PROMPTS/7. CODE REFACTORING PATTERNS.md`
- Redundancy elimination, type consolidation, constant cleanup
- Web research for context-specific improvements
- Type check

**Maps to:** `IDE_PROMPTS/8. EXISTING-FEATURE-REFACTORING.md` + `IDE_PROMPTS/7. CODE REFACTORING PATTERNS.md`

---

### 7. `/doc-organize`

**When:** Documentation is scattered, folders are duplicated, or after bulk doc creation.

**What you provide:** Nothing specific — Cascade audits the current state.

**What Cascade does:**

- Scans git changes for new/modified docs
- Identifies orphaned root-level docs
- Checks naming conventions (kebab-case folders, prefix matching)
- Moves docs to correct feature folders
- Archives historical/review docs to `_archive/`
- Updates all affected README.md files
- Verifies nothing was lost

**Maps to:** `IDE_PROMPTS/6. DOCUMENTATION STRUCTURE PROMPT.md` (cleanup checklist)

---

### 8. `/doc-rebuild`

**When:** A feature's documentation has become cluttered and chaotic after many Cascade sessions, ChatGPT feedback rounds, and audit/validation phases. Too many files, redundant content, outdated info.

**What you provide:** Feature name (the `__docs__/[feature-name]/` folder to rebuild).

**What Cascade does:**

- Inventories ALL files in the feature folder
- Reads and classifies each: CANONICAL / SUB-FEATURE / ONE-TIME / REDUNDANT / MISPLACED
- Extracts codebase truth (scans actual code for the feature)
- Creates sub-feature subfolders if needed
- Archives one-time docs (audits, ChatGPT reviews, session logs)
- Updates canonical docs against codebase truth
- Rewrites feature README.md with new structure
- Cross-references related feature folders (permissions, billing, etc.)
- Updates `__docs__/index.md` and `__docs__/README.md`
- Verifies no content loss, naming conventions, type check
- Reports bugs/suggestions found during the process

**Key difference from `/doc-organize`:** `/doc-organize` is surface-level folder cleanup (naming, moves). `/doc-rebuild` is deep content cleanup — goes back to codebase and rewrites docs from truth.

**Key difference from `/retro-doc`:** `/retro-doc` is for features with NO docs. `/doc-rebuild` is for features with TOO MANY docs.

**Maps to:** `IDE_PROMPTS/0. FEATURE RETRO DOCUMENTATION PROMPT.md` (codebase truth extraction) + `IDE_PROMPTS/6. DOCUMENTATION STRUCTURE PROMPT.md` (structure rules)

---

### 9. `/system-audit`

**When:** Periodic infrastructure health check, before major releases, or when security concerns arise.

**What you provide:** Nothing specific — Cascade scans the full codebase.

**What Cascade does:**

- Scans all API routes for auth/rate-limiting gaps
- Checks DAL pattern compliance across all database files
- Identifies cost bombs (uncontrolled AI calls, missing caching)
- Audits logging compliance (console.log vs secureLog)
- Documents ALL findings with exact file:line references
- Creates implementation plan with severity and effort estimates

**Maps to:** The system strengthening audit process documented in `__docs__/system-strengthening/`

**Output:** Audit findings in `__docs__/system-strengthening/system-strengthening_impl.md`

---

### 10. `/help`

**When:** You're not sure which workflow to use, or you want Cascade to decide.

**What you provide:** Just describe what you need in plain language.

**What Cascade does:**

- Analyzes your request against all 14 task-specific workflows
- Detects combo patterns (e.g., ChatGPT idea → new feature → final review)
- Announces which workflow(s) it will run and why
- Executes the selected workflow(s) in sequence
- If truly ambiguous, asks ONE focused clarifying question

**Maps to:** `.windsurf/workflows/help.md` (smart router)

---

### 11. `/owner-dashboard`

**When:** Working on ANY owner-side feature: dashboard views, projects, editor, analytics, settings, subscriptions, onboarding, team management.

**What you provide:** Just start working. This workflow loads context automatically.

**What Cascade auto-loads:**

- 20 security rules (`.cascade/rules/SECURITY_IMPLEMENTATION_RULES.md`)
- Feature Rejection Gate (`__docs__/constitution/08-feature-rejection-gate.md`)
- Language Governance for owner-facing copy
- DAL patterns: `DB_COLLECTIONS`, `apiCallComposer`, `requestBodyComposer`
- API patterns: `withAuth()`, `verifyTenantAccess()`, Zod, rate limiting
- Frontend patterns: server components + DAL, Ant Design, SWR hooks

**Key rule:** Every new owner feature must pass the 5-question Feature Rejection Gate before any code is written.

**Use with other workflows:** `/owner-dashboard` + `/new-feature` for new owner features, `/owner-dashboard` + `/refactor-feature` for existing ones.

---

### 12. `/customer-facing`

**When:** Working on ANY customer-facing surface: digital menu, QR menu page, screen/TV display, public feedback, trust page, or anything end-customers see.

**What you provide:** Just start working. This workflow loads context automatically.

**What Cascade auto-loads:**

- Full Constitution (`__docs__/constitution/`) — 10 Laws, Language Governance, Feature Rejection Gate
- Menu Enforcement Rules (`.windsurf/rules/menu-enforcement.md`)
- Failure Refusal Matrix — what the system refuses to do
- AutoMode spec — 12-month autonomous operation contract
- Public route security patterns (rate limiting, no auth needed)
- Cache/realtime patterns (unstable_cache, onSnapshot, localStorage)

**Key rules:**

- All 10 Laws are active — "Default Authority", "Silence Is a Feature", "No Cognitive Load"
- Language Governance — no forbidden phrases ("Smart", "AI-powered", "You should...")
- Mobile-first, low-bandwidth, one-hand operation
- A non-technical owner CANNOT make the menu worse

**Use with other workflows:** `/customer-facing` + `/new-feature` for new customer features, `/customer-facing` + `/refactor-feature` for existing ones.

---

### 13. `/final-review`

**When:** Before ending ANY coding session.

**What you provide:** Nothing — Cascade reviews everything done in the current session.

**What Cascade does:**

1. Cross-checks all session changes: code ↔ docs ↔ master rules
2. Redundancy check (per refactoring patterns)
3. UI/UX review (if applicable)
4. Fixes any bugs discovered
5. **Proactive Fix Rule (Law 10):** If any issue is identified AND the fix is known → fix it immediately, don't defer
6. Runs `npx tsc --noEmit`
7. Updates verification.md and README.md
8. Logs scope for improvement
9. Adds new patterns to IDE_PROMPTS (Law 7)
10. Reports items needing discussion

**Maps to:** `IDE_PROMPTS/9. FINAL-VARIFICATION.md` + `IDE_PROMPTS/end.md`

---

## Usage Examples — What to Type for Each Workflow

### `/help` — When you're unsure

```
/help I want to improve the stores management feature
```

```
/help I have ChatGPT feedback on both docs and code — what order?
```

```
/help Where do I start? I need to build a new notification system.
```

### `/chatgpt-review` — Validating ChatGPT ideas

```
/chatgpt-review

I discussed multi-outlet consistency improvements with ChatGPT. Here's the conversation:
[paste full ChatGPT conversation]
```

```
/chatgpt-review

ChatGPT suggested we add a new pricing algorithm. Conversation:
[paste conversation]
```

### `/new-feature` — Building from scratch

```
/new-feature

Feature: Supplier Price Import
Description: Allow owners to upload supplier price lists (CSV/PDF) and auto-match to menu items for price change suggestions.
```

```
/new-feature

Feature: Table QR Code Generator
Coming from ChatGPT review: __docs__/table-qr/_archive/chatgpt-review.md
```

### `/doc-feedback` — ChatGPT reviewed our docs

```
/doc-feedback

I sent the decision-intelligence spec and impl to ChatGPT. Here's what it said:
[paste ChatGPT feedback on docs]
```

### `/code-feedback` — ChatGPT reviewed our code

```
/code-feedback

ChatGPT reviewed our stores-management API routes and suggested these changes:
[paste ChatGPT code feedback]
```

### `/retro-doc` — Feature exists, no docs

```
/retro-doc

Feature: Chat Analytics
Key files: src/components/templates/platform/chatManagement/, src/database/chatAnalytics/
```

```
/retro-doc

Feature: Knowledge Base
Entry point: src/app/api/kb/ and src/database/knowledgeBase/
```

### `/refactor-feature` — Improving existing feature

```
/refactor-feature

Feature: AI Image Generation
I want a full review — code cleanup, fresh docs, and improvement suggestions.
```

### `/doc-organize` — Docs are messy

```
/doc-organize

We just finished a big feature sprint. Docs are scattered everywhere.
```

### `/system-audit` — Infrastructure health check

```
/system-audit

We're preparing for production launch. Run a full security and cost audit.
```

```
/system-audit

Check all API routes for missing rate limiting and auth gaps.
```

### `/owner-dashboard` — Working on owner features

```
/owner-dashboard

I'm going to work on the project editor's drag-and-drop reordering.
```

```
/owner-dashboard

Building a new analytics dashboard tab for store comparison.
```

### `/customer-facing` — Working on public surfaces

```
/customer-facing

I need to fix the digital menu layout on mobile devices.
```

```
/customer-facing

Adding a new "Most Popular" badge to the QR menu page.
```

### `/final-review` — End of session

```
/final-review

We're done for today. Please verify everything.
```

---

## Common Scenarios

### Scenario A: "I have a ChatGPT conversation about a new feature"

```
/chatgpt-review → /new-feature → /final-review
```

### Scenario B: "Full cycle with ChatGPT reviewing everything"

```
/chatgpt-review → /new-feature → /doc-feedback → /code-feedback → /final-review
```

### Scenario C: "Feature exists but no docs"

```
/retro-doc → /final-review
```

### Scenario D: "Revisiting an old feature for cleanup"

```
/refactor-feature → /final-review
```

### Scenario E: "Docs are a mess after lots of work"

```
/doc-organize
```

### Scenario E2: "Feature docs are cluttered after many sessions"

```
/doc-rebuild → /final-review
```

### Scenario F: "Pre-release security check"

```
/system-audit
```

### Scenario G: "Working on the project editor"

```
/owner-dashboard
(then /new-feature or /refactor-feature as needed)
```

### Scenario H: "Fixing the digital menu display"

```
/customer-facing
(then /refactor-feature as needed)
```

### Scenario I: "New feature for the menu page from ChatGPT idea"

```
/chatgpt-review → /customer-facing → /new-feature → /final-review
```

---

## IDE_PROMPTS → Workflow Mapping

| IDE Prompt                                        | Workflow                              | When                             |
| ------------------------------------------------- | ------------------------------------- | -------------------------------- |
| `00. MASTER RULES & WORKFLOW.md`                  | _Auto-loaded by all workflows_        | Always                           |
| `0. FEATURE RETRO DOCUMENTATION PROMPT.md`        | `/retro-doc`                          | Feature exists, no docs          |
| `1. CHATGPT-CONVERSATION-REVIEW.md`               | `/chatgpt-review`                     | ChatGPT conversation to validate |
| `2. DOCUMENT CREATION PROMPT.md`                  | `/new-feature` (Step 2)               | Creating feature docs            |
| `3. VALIDATION FEEDBACK PROMPT.md`                | `/doc-feedback`                       | ChatGPT reviewed our docs        |
| `4. IMPLEMENTATION PROMPT.md`                     | `/new-feature` (Step 3)               | Implementing from docs           |
| `5. AFTER IMPLEMENTATION FEEDBACK PROMPT.md`      | `/code-feedback`                      | ChatGPT reviewed our code        |
| `6. DOCUMENTATION STRUCTURE PROMPT.md`            | `/doc-organize` + `/doc-rebuild`      | Cleanup docs structure           |
| `7. CODE REFACTORING PATTERNS.md`                 | `/refactor-feature` + `/final-review` | Code cleanup                     |
| `8. EXISTING-FEATURE-REFACTORING.md`              | `/refactor-feature`                   | Deep feature refactor            |
| `9. FINAL-VARIFICATION.md`                        | `/final-review`                       | End of session                   |
| `end.md`                                          | `/final-review`                       | End of session                   |
| `__docs__/constitution/*`                         | `/customer-facing`                    | Customer-facing work             |
| `.windsurf/rules/menu-enforcement.md`             | `/customer-facing`                    | Menu output enforcement          |
| `.cascade/rules/SECURITY_IMPLEMENTATION_RULES.md` | `/owner-dashboard` + all workflows    | Security enforcement             |

---

## File Locations

```
.windsurf/workflows/
├── help.md                 # /help  ← START HERE if unsure
├── chatgpt-review.md       # /chatgpt-review
├── new-feature.md          # /new-feature
├── doc-feedback.md         # /doc-feedback
├── code-feedback.md        # /code-feedback
├── retro-doc.md            # /retro-doc
├── refactor-feature.md     # /refactor-feature
├── doc-organize.md         # /doc-organize
├── doc-rebuild.md          # /doc-rebuild  ← feature docs cluttered after many sessions
├── system-audit.md         # /system-audit
├── final-review.md         # /final-review
├── owner-dashboard.md      # /owner-dashboard  ← owner-side features
└── customer-facing.md      # /customer-facing  ← customer-facing surfaces
```

---

## Tips

- **Workflows can call other workflows** — `/new-feature` tells Cascade to run `/chatgpt-review` first if you have a ChatGPT conversation
- **You don't need to remember IDE_PROMPTS numbers** — just use the slash command
- **Workflows load the right context automatically** — each one references the exact IDE_PROMPTS files it needs
- **`// turbo` annotation** — marks steps that can auto-run (like `npx tsc --noEmit`)
- **You can still use IDE_PROMPTS directly** if you need more control — workflows are a convenience layer

---

---

## Mobile Support Doctrine (Added Feb 14, 2026)

Every new feature MUST consider mobile compatibility **by default**. This is NOT a separate workflow — it's built into every existing workflow.

### 5 Core Mobile Rules

1. **Mobile = operational only** — Quick edits, status checks, daily actions. NOT configuration, AI tools, or heavy workflows.
2. **Actions < 5 seconds** — Any common mobile action must complete in ≤5 seconds (edit price, toggle availability, check hours).
3. **Menu is home** — App lands directly on Menu screen. Search is primary interaction.
4. **Auto-publish small edits** — Price change, availability toggle, hours update go live instantly on mobile. No "Save & Publish" step.
5. **No feature creep** — Every mobile feature must pass the Feature Admission Test (see `__docs__/mobile-operational-support/02-mobile-ui-doctrine.md`).

### Mobile Feature Admission Test (Quick Reference)

Before adding ANY feature to mobile, answer these 4 questions:

1. **Frequency Gate:** Is this done daily or multiple times per day? (If monthly/rarely → desktop only)
2. **Speed Gate:** Can this complete in <5 seconds on mobile? (If slow/complex → desktop only)
3. **Touch Gate:** Does this work well with thumb-only interaction? (If needs precision → desktop only)
4. **Value Gate:** Does the owner NEED this while away from desk? (If only useful at desk → desktop only)

All 4 must pass. Any failure → desktop only.

### How Mobile Fits Into Existing Workflows

| Workflow            | Mobile Addition                                             |
| ------------------- | ----------------------------------------------------------- |
| `/new-feature`      | Step 2 now includes `_mobile-support.md` doc creation       |
| `/owner-dashboard`  | Must evaluate mobile relevance using Feature Admission Test |
| `/customer-facing`  | Mobile-first for customer surfaces (already the rule)       |
| `/final-review`     | Must verify mobile doc exists and is accurate               |
| `/retro-doc`        | Include mobile assessment in retro documentation            |
| `/refactor-feature` | Review mobile compatibility during refactor                 |

### New Document Type: `_mobile-support.md`

Every feature now gets a `[feature-name]_mobile-support.md` document:

```
Contents:
- Mobile relevance decision (YES/NO/PARTIAL with gate results)
- If YES/PARTIAL: which screens, which actions, data source hooks
- If NO: which gate failed and why
- Localization: inherits from desktop (same next-intl, same RTL, same timezone)
- Auth: same session, same permissions, same RBAC
- Settings: theme, language, date/time format all inherited from AppSettings
```

### Architecture (Permanent)

```
SHARED CORE (existing — do NOT rebuild):
├── DAL (src/database/*) — all business logic
├── Hooks (src/hooks/*) — shared state
├── Redux — global state (auth, UI prefs)
├── Types (src/types/*) — shared types
└── Constants (src/constants/*) — shared constants

DESKTOP (existing — do NOT refactor):
└── antd + SCSS modules

MOBILE (new — clean addition):
├── antd-mobile + Tailwind CSS
├── src/components/mobile/MobileShell.tsx
├── src/components/mobile/screens/*.tsx
└── Icons: react-icons/lu (same as desktop)
```

### ICP Rule: Non-Tech SMB Owner

All mobile UI must be usable by a **non-technical small business owner** (our ICP):

- Zero jargon in UI copy
- Large touch targets (min 44px)
- Clear, simple actions (no multi-step wizards on mobile)
- Instant feedback (optimistic updates)
- Works on mid-range Android phones (not just latest iPhones)

**Version:** 1.4  
**Last Updated:** February 14, 2026  
**Total Workflows:** 15 (14 task-specific + 1 smart router)
