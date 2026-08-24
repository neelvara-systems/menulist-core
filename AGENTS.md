# AGENTS.md — Persistent Brain + Execution System

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

**Version:** 2.2
**Status:** 🔒 CRITICAL — SYSTEM AUTHORITY
**Last Updated:** May 2026

---

## Purpose

This file serves as the **persistent brain** for Codex, replacing Windsurf memory. Contains system decisions, architecture truths, and critical gotchas that must be remembered across all sessions.

---

## Rule Loading Contract

These Windsurf-era rules are now part of the Codex working contract for this repo. Do not treat them as optional references.

### Primary Rule Sources

- **Persistent brain**: `AGENTS.md`
- **Master IDE prompt**: `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md`
- **Absolute development laws**: `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`
- **IDE prompt guide**: `IDE_PROMPTS/README.md`
- **Security rules**: `.cascade/rules/SECURITY_IMPLEMENTATION_RULES.md` and `.codex/rules/SECURITY_IMPLEMENTATION_RULES.md`
- **Mobile rules**: `.cascade/rules/MOBILE_SUPPORT_RULES.md` and `.codex/rules/MOBILE_SUPPORT_RULES.md`
- **Documentation rules**: `.cascade/rules/DOCUMENTATION_ORGANIZATION_RULES.md` and `.codex/rules/DOCUMENTATION_ORGANIZATION_RULES.md`
- **FinanceOS rules**: `.cascade/rules/FINANCE_OPERATING_SYSTEM_RULES.md` and `.codex/rules/FINANCE_OPERATING_SYSTEM_RULES.md`
- **Founder public presence rules**: `.cascade/rules/FOUNDER_PUBLIC_PRESENCE_RULES.md` and `.codex/rules/FOUNDER_PUBLIC_PRESENCE_RULES.md`
- **Answerlattice rules**: `.cascade/rules/ANSWERLATTICE_RULES.md` and `.codex/rules/ANSWERLATTICE_RULES.md`
- **Contextual state illustration rules**: `.cascade/rules/CONTEXTUAL_STATE_ILLUSTRATION_RULES.md` and `.codex/rules/CONTEXTUAL_STATE_ILLUSTRATION_RULES.md`
- **Master execution**: `.codex/rules/master-execution.md` and `.codex/workflows/master-execution.md`
- **Tech stack memory**: `.windsurfrules`
- **Windsurf workflows**: `.windsurf/workflows/`
- **Codex workflows**: `.codex/workflows/`
- **Architect mode**: `.codex/rules/architect-mode.md`
- **Menu enforcement**: `.windsurf/rules/menu-enforcement.md`

### Mandatory Loading Behavior

- Detect product context first: MenuList, Answerlattice, CampaignCue, SignalDesk, or MyCodex.
- Load context selectively based on the task. Do not load everything blindly, and do not skip relevant rule files.
- Always treat `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md` as the development-law source when a task has feature, docs, implementation, audit, or workflow implications.
- For MenuList work, load MenuList constitution and relevant `__docs__/[feature]/` docs when the task has lifecycle, governance, or feature-scope implications.
- For Answerlattice work, load `__docs__/answerlattice/doctrine/01-core-doctrine.md`, `02-non-goals-charter.md`, and `03-infrastructure-freeze-v1.md` before implementation.
- For security-sensitive work, read the security rules before editing auth, middleware, API routes, Firestore rules, logging, tenant isolation, or validation code.
- For mobile work, read mobile support rules before editing mobile screens, sheets, hooks, or mobile UX.
- For documentation work, read documentation organization rules before moving, creating, or restructuring docs.
- For portfolio operating expenses, invoices, payment proofs, subscriptions, renewals, prepaid or usage-based balances, business assets, reconciliation, cost forecasts, or payment reminders, read the FinanceOS rules and `__docs__/finance-operating-system/` before deciding, recording, or scheduling work. Customer billing-product implementation remains governed by its product-specific billing rules, not FinanceOS.
- For Proof & State, the founder's pseudonymous X/Reddit or any founder social channel, creator research, public post ideas, audience strategy, account identity/privacy, replies, or useful public lessons discovered during repo work, read the PresenceOS rules and `__docs__/founder-public-presence/` before deciding, drafting, or capturing material.
- For digital menu output work, read menu enforcement rules before editing customer-facing menu output.
- For website work, load the website workflow and website/content-layer rules before editing `src/app/(website)/`, `src/components/website/`, or `public/locales/menulist.ai/` website copy.
- For any new or changed empty, result, first-use, recovery, completion, or no-data state, read the contextual state illustration rules before choosing artwork or leaving the state plain.

### Proactive Default Execution Loop

This loop is the default for every non-trivial repo request. The user does not need to name a slash command, prompt file, or workflow.

1. **Classify first**: identify product context, request stage, affected surfaces, and risk class before answering or editing.
2. **Treat master execution as implicit**: use `.codex/workflows/master-execution.md` and `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md` as the routing contract whenever a request has implementation, docs, audit, workflow, lifecycle, or unclear-stage implications.
3. **Load the smallest correct rule set**: after routing, read the stage-specific workflow and IDE prompt, plus security/mobile/documentation/website/customer-facing/Answerlattice rules only when their triggers apply.
4. **Use source files as live authority**: `AGENTS.md` is the compact memory layer; `IDE_PROMPTS/*`, `.codex/workflows/*`, `.codex/rules/*`, `.cascade/rules/*`, and relevant `__docs__/` files remain the exact source of truth. Re-open them when wording, checklist details, or current contracts matter.
5. **Auto-continue within safe scope**: do not wait for the user to explicitly request parity checks, final review, mobile review, docs sync, cache checks, or security checks when the selected workflow requires them. Stop only for core architecture changes, breaking changes, dependency conflicts, or genuinely ambiguous product context.
6. **Skip only truly trivial requests**: a one-line shell answer or isolated wording change can be handled directly, but any repo behavior, owner/customer surface, public output, data contract, route, docs, or workflow request must go through this loop.

### Strategy Confidence and Error Recovery

- **Apply confidence loops proportionally**: for strategies, architecture, production-impacting fixes, security, cost, public/customer output, data contracts, route behavior, cache behavior, and cross-surface owner/mobile work, ask internally: "Am I factually confident this strategy covers the real risk?" If not, identify loopholes, failure modes, hidden assumptions, and missing evidence; propose fixes; then repeat until no known material gaps remain.
- **Do not fake certainty**: "100% confident" means evidence-backed and no known material loopholes after code/docs/source verification. If a true unknown remains, state the unknown, reduce scope, gather more evidence, or ask only when the decision cannot be made safely.
- **Choose the lightest useful loop**: small copy edits, direct shell answers, and isolated mechanical changes do not need a full strategy audit unless they touch product doctrine, public claims, legal/security/cost behavior, or source-of-truth contracts.
- **Do not fight repeated errors**: if the same command, test, build, runtime, dependency, API, or browser error appears twice, stop guessing. Research current docs and primary sources where available, collect 3-5 plausible fixes, choose the smallest efficient fix that fits this repo's architecture, implement it, and verify.
- **Record durable learnings**: if the confidence loop or repeated-error research reveals a reusable project rule, update the right rule/doc/memory location instead of leaving it only in chat.
- **Keep memories current by default across the whole project**: after non-trivial MenuList, Answerlattice, product, architecture, mobile, security, cache, scheduler, deploy, AI, Firebase, or production-hardening work, update the appropriate project docs/rules and, when the active Codex memory policy allows, write the matching memory note before final handoff without waiting for a separate reminder.

### Git Operations Control Plane

- **Canonical ledger**: `__docs__/deployment/git-operations-ledger.md` is the append-only authority for Git commits that move release history, merges, cherry-picks, rebases, pulls that move a ref, pushes, branch resets/deletions, and worktree add/remove/prune operations in this repository.
- **Applies to every worktree and agent**: before any Git mutation, every agent must read the ledger, inventory all registered worktrees, fetch current remote refs, record the active worktree path/ID, branch, HEAD, dirty state, actor/session/thread ID, and intended operation ID. Unknown attribution must be written as `unknown`; never infer an actor or claim another process's action.
- **Main operator/reviewer duty**: the Codex session handling Git promotion is the control-plane reviewer for that active session. It must audit concurrent ref movement and append observed operations before claiming consistency. This is session-bound monitoring, not an unsupported claim of continuous background observation when Codex is not running.
- **Branch-by-branch local/server evidence is mandatory**: every ledger entry must contain an ISO-8601 timestamp with timezone, operation ID, actor/session ID, and a separate row for local `main`, local `staging`, every other local branch involved in the operation, and each corresponding server ref. Each row must record the full local SHA, direct `git ls-remote` server SHA, tracking ref, ahead/behind count, owning worktree path/ID, staged/unstaged/untracked counts, and one status: `IN_SYNC`, `LOCAL_AHEAD`, `SERVER_AHEAD`, `DIVERGED`, `LOCAL_ONLY`, or `SERVER_ONLY`. Never use a remote-tracking ref alone as server proof.
- **Before/after evidence**: every ledger entry must preserve both the pre-operation and post-operation branch matrices, source and destination refs, full SHAs, command class, validation run, filesystem state, direct server readback, and whether the operation was performed here or merely observed from reflog/provider evidence.
- **Firebase local/server evidence is mandatory**: before saying Firebase deployment is current or unnecessary, inspect every changed path since the last verified infrastructure release, including merge parents and post-release commits. Record a separate local-versus-server row for Firestore Rules, Firestore indexes, Storage Rules, and Cloud Functions for each active target: MenuList QA (`menulist-qa`), MenuList production (`menulist-prod`), Answerlattice QA (`neelvara-answerlattice-qa`), and Answerlattice production (`neelvara-answerlattice-prod`). Each row must record local source/config paths, local Git/blob or deterministic artifact SHA-256 and byte count where applicable, local validation/build result, Firebase project and codebase, authenticated deployed release/version/revision or inventory, deployed source hash/byte count when retrievable, readback timestamp, and exact parity/deployment status. Never collapse QA and production or Rules and Functions into one aggregate claim.
- **Firebase classifications**: record two independent fields for every Firebase product/target/component row. `Delta` is exactly `NO_INFRA_CHANGE` or `INFRA_CHANGE`. `Deployment state` is exactly one of `SERVER_STATE_UNKNOWN`, `LOCAL_NOT_VALIDATED`, `DEPLOY_REQUIRED`, `DEPLOY_BLOCKED`, `DEPLOYED_NOT_READ_BACK`, `SOURCE_RESTORED_TO_DEPLOYED_BYTES`, `DEPLOYED_AND_READ_BACK`, or `NOT_CONFIGURED`. `NO_INFRA_CHANGE` never proves server parity. `SOURCE_RESTORED_TO_DEPLOYED_BYTES` and `DEPLOYED_AND_READ_BACK` require authenticated server evidence; a local filename, commit message, CLI success message, or cached remote-tracking ref is insufficient. If authenticated readback was not performed in the current evidence window, use `SERVER_STATE_UNKNOWN` and do not claim parity.
- **Promotion policy**: ordinary pushes target `staging` only. Do not move or push `main` unless Danny explicitly requests it in the current instruction. An explicit main promotion must preserve all remote history without force and finish with local/remote `main` and `staging` on the same verified SHA.
- **No unledgered completion claim**: do not report a commit, merge, push, branch alignment, Firebase parity, or clean worktree as complete until the ledger entry is appended and direct readback is captured. Report committed-history parity separately from filesystem cleanliness.
- **Preserve concurrent work**: never stage a moving snapshot, overwrite another worktree, or absorb unrelated dirty files into an operation merely to make the tree clean. Record the blocker or observed concurrent changes in the ledger.

### Firebase Infrastructure Deployment Control

- **Git operator boundary**: the Git control-plane operator tracks Firebase local/server state but does not deploy Firebase infrastructure. A Git commit, staging push, main promotion, detected infrastructure delta, or prior auto-deploy convention never grants deployment permission.
- **Explicit deployment authorization only**: deploy Firestore Rules, Firestore indexes, Storage Rules, or Cloud Functions only when Danny explicitly requests that exact deployment scope in the current instruction. Record it as a separate deployment operation with its own before/after Firebase matrix. If the instruction is Git-only, stop after recording `DEPLOY_REQUIRED` or the exact blocker.
- For an explicitly authorized non-destructive MenuList Firebase release intended for the shared product runtime, promote the same locally validated source to `menulist-qa` first and then `menulist-prod`, and verify both targets before closing the deployment operation. Stop and report the exact blocker when QA fails, production has an explicit hold, a real required production secret is missing, or the change needs migration/backfill/destructive approval; never create placeholder credentials to force parity.
- Publish Firestore Security Rules through the Firebase CLI, not the Firebase Console editor. Use the product-specific config and the smallest rules-only target: `firebase deploy --only firestore:rules --project <target> --config <config> --non-interactive`. Before publication, run the maintained generator/staleness check and product-specific emulator/predeploy suite. After publication, read back the active rules release and compare its exact source hash and byte count with the intended deployment artifact; CLI success alone is insufficient evidence.
- Treat deploy artifacts and canonical rule sources as different responsibilities. Canonical sources retain the complete reviewed policy and emulator compatibility; cloud configs must target deterministic product-specific artifacts that remove only unreachable or unrelated product namespaces and helper functions. Never edit generated rule artifacts manually, weaken default deny, or remove authorization behavior merely to satisfy compiler limits. For MenuList, `firestore.rules` is canonical and `firestore-menulist.rules` is generated by `scripts/verification/generate-menulist-firestore-rules.mjs`.
- If a large ruleset returns HTTP 503 or an unknown console-save error twice, stop retrying the web editor. Preserve the active release, inspect Rules API/Logs evidence, check raw/compiled size, nesting, repeated expressions, and helper-call depth, then reduce compiler branching only through a deterministic, reviewable transformation. Re-run local behavior tests, authenticated Rules API validation when available, scoped CLI publication, and exact active readback. Follow `__docs__/deployment/firebase-rules-publication.md`.
- Scope any Firebase deployment authorization only to the explicitly named Firebase rules, indexes, Storage Rules, or Functions targets. Do not use it to deploy unrelated Next.js, website, hosting, or app changes unless the user explicitly asks.
- Use the smallest safe deploy target: MenuList uses the `menulist-qa` Firebase project for staging/local, `menulist-prod` for production, and default `firebase.json`; Answerlattice uses `firebase-answerlattice.json`, `firestore-answerlattice.rules`, `firestore-answerlattice.indexes.json`, and `functions-answerlattice/`.
- If validation or deploy fails, fix and retry when safe; if blocked by credentials, project access, missing secrets, or destructive deploy risk, report the blocker with the exact command and error.

### Vercel Deployment Guard

- Do not run Vercel deploys, production deploys, preview deploys, or Vercel remote builds unless the user explicitly asks for a Vercel deploy in the current session.
- This opt-in rule applies even when app-side code, website code, Next.js routes, middleware, or production smoke testing is involved. Report the required Vercel deploy command as a pending step instead of running it.
- Explicit Firebase deployment authorization remains limited to the named Firebase rules, indexes, Storage Rules, or Cloud Functions targets; it never implies Vercel deployment permission.

### IDE Prompt Registry

- `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`: universal laws; read before feature, docs, implementation, audit, or refactor work.
- `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md`: central router; use for stage detection, context loading, parity, session lifecycle, and production readiness.
- `IDE_PROMPTS/0. FEATURE RETRO DOCUMENTATION PROMPT.md`: rebuild docs for an existing implementation from codebase truth.
- `IDE_PROMPTS/1. CHATGPT-CONVERSATION-REVIEW.md`: validate external AI ideas or pasted conversations against codebase truth.
- `IDE_PROMPTS/2. DOCUMENT CREATION PROMPT.md`: create the full feature doc set before new feature implementation.
- `IDE_PROMPTS/3. VALIDATION FEEDBACK PROMPT.md`: process external feedback on docs only.
- `IDE_PROMPTS/4. IMPLEMENTATION PROMPT.md`: implement from `_impl.md` exactly.
- `IDE_PROMPTS/5. AFTER IMPLEMENTATION FEEDBACK PROMPT.md`: process external feedback on implemented code.
- `IDE_PROMPTS/6. DOCUMENTATION STRUCTURE PROMPT.md`: organize docs and enforce naming/audience rules.
- `IDE_PROMPTS/7. CODE REFACTORING PATTERNS.md`: consolidate redundancy and preserve single sources of truth.
- `IDE_PROMPTS/8. EXISTING-FEATURE-REFACTORING.md`: deep review of existing feature code and docs.
- `IDE_PROMPTS/9. FINAL-VARIFICATION.md`: end-of-session verification checklist.
- `IDE_PROMPTS/10. CONTENT LAYERS PROMPT.md`: website, helpdoc, Firebase cost, and changelog content.
- `IDE_PROMPTS/11. PRODUCTION-AUDIT.md`: production hardening and audit.
- `IDE_PROMPTS/12. POST-IMPL-PARITY-AUDIT.md`: docs-vs-code parity audit after implementation.
- `IDE_PROMPTS/FINAL FEATURE HARDENING + DOCUMENT GOVERNANCE PROMPT.md`: production-readiness clearance.
- `IDE_PROMPTS/MULTI-PRODUCT-TENANCY/`: use for multi-product tenancy and long-term architecture trap audits.
- `IDE_PROMPTS/end.md` and `IDE_PROMPTS/sequence.md`: deprecated rough notes; use `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md` as the merged source of truth unless inspecting history.

---

## System Decisions

### Product Architecture

- **MenuList**: Canonical public business truth infrastructure for SMB restaurants
- **Answerlattice**: Governed Answer Infrastructure for SaaS Support (separate product)
- **Website Asset Operating System**: Internal-only, separate-product-style asset architecture for MenuList/Answerlattice website media; never public by default
- **Security Operating System**: Internal-only, separate-product-style security evidence architecture for the portfolio; never a public scanner or autonomous remediation service
- **Finance Operating System**: Internal-only, founder-operated portfolio expense, obligation, prepaid-balance, asset, evidence, forecasting, reconciliation, period-close, backup/restore, and provider-review architecture; v1 is frozen as an independent open-format operating contract and is never a customer billing runtime or autonomous payment system
- **3-Product Separation**: MenuList vs GrowthOS vs KitStamp - never merge
- **Infrastructure Identity**: MenuList is public utility, not SaaS software

### Product Identity and Environment Naming

- **Product codes vs slugs are separate**: `ML`, `AL`, `CC`, and `MC` are internal product codes from `src/constants/product.ts`. Route/domain/session slugs stay full names such as `menulist`, `answerlattice`, `campaigncue`, and `mycodex`.
- **Environment variables use full product names only**: Use keys such as `MENULIST_*`, `ANSWERLATTICE_*`, `CAMPAIGNCUE_*`, `SIGNALDESK_*`, and `MYCODEX_*`. Never introduce shorthand env prefixes such as `ML_*`, `AL_*`, `CC_*`, `MC_*`, `NEXT_PUBLIC_ML_*`, `NEXT_PUBLIC_AL_*`, `NEXT_PUBLIC_CC_*`, or `NEXT_PUBLIC_MC_*`.
- **MenuList app and tenant host contract**: Use `menulist.digital`/`www.menulist.digital` for the QA website, `app.menulist.digital` for the single QA owner/staff app, and `*.menulist.digital` for QA customer links. Every `menulist.digital` QA host is `noindex`, serves a disallow-all `robots.txt`, and publishes no sitemap. Use `menulist.ai`/`www.menulist.ai` for the production website, `app.menulist.ai` for the single production owner/staff app, and `*.menulist.online` for production customer links. The owner app uses `/dashboard`; authenticated session scope selects the tenant/store. Sign-in, `/create-menu`, `/invite`, and owner routes stay on the canonical app host so host-only auth/referral cookies are never broadened to customer subdomains. Production app hosts are `noindex`, publish no sitemap, and use exact-origin CORS; tenant subdomains never inherit app/API CORS trust. Do not introduce `dashboard.menulist.*`, `app.menulist.online`, `qa.menulist.digital`, or `*.qa.menulist.digital` as active hosts.
- **MenuList infrastructure setup contract**: Keep the current single-region setup at `us-central1` for MenuList Firestore, Storage, Firebase Functions, and Cloud Tasks. Firestore requires an explicit location choice; choose `us-central1` so it matches the existing Functions/runtime contract. Do not introduce regional stacks or a third deployed environment unless the user explicitly reopens that architecture decision. The shared Vercel project's custom `qa` environment must attach only to the exact `staging` Git branch; routine destructive local work is emulator-first but still uses the same QA configuration family.
- **MenuList and Answerlattice Vercel keyless identity contract**: Keep one shared Vercel project. Its custom `qa` environment and Production environment use Vercel OIDC plus Google Workload Identity Federation for all four external server targets: `menulist-qa`, `menulist-prod`, `neelvara-answerlattice-qa`, and `neelvara-answerlattice-prod`. Each Firebase project owns a dedicated Vercel runtime service account, pool/provider values, and least-privilege IAM binding; never use one cross-project service account or retain static Admin keys in managed Vercel env. Provision and certify targets independently in this order: MenuList QA, MenuList production, Answerlattice QA, Answerlattice production. MenuList QA and production are not blocked by the Answerlattice targets: keep every Answerlattice Firebase/Admin value absent from a MenuList-only managed environment until the Answerlattice pass is explicitly reopened, while rejecting any partial Answerlattice configuration. Firebase Functions remain on Google-managed Application Default Credentials and are outside this Vercel identity migration.
- **Single human Google identity contract**: Use only `admin@neelvara.com` as the human Workspace, Google Cloud, Firebase, and provider owner/operator for every product. Do not create a separate daily operator, product-specific user, duplicate Super Admin, or random Gmail account. Public addresses use aliases or groups. This one-human-account rule does not merge machine identities: each Firebase project retains its dedicated least-privilege runtime service accounts, WIF provider, and secret boundary.
- **Current product matrix is fixed unless deployment sources change**: MenuList uses `ML` with Firebase `menulist-qa` staging/local and `menulist-prod` production; Answerlattice uses `AL` with Firebase `neelvara-answerlattice-qa` staging/local and `neelvara-answerlattice-prod` production; CampaignCue uses `CC` with `campaigncue-qa` and `campaigncue`; SignalDesk uses `SD` with Firebase `menulist-signaldesk-qa` staging/local and `menulist-signaldesk` production, but its env keys use `SIGNALDESK_*`; MyCodex uses reserved code `MC`, slug `mycodex`, no active public domain, and no Firebase project.
- **CampaignCue setup/testing is parked**: Exclude CampaignCue and `campaigncue.ai` from the active environment-setup, provider-setup, deployment, QA, production-certification, domain, Firebase, Vercel, and testing pipeline. Do not raise CampaignCue gaps, recommend CampaignCue actions, create or configure its infrastructure, test its surfaces, or treat it as a dependency for MenuList or Answerlattice readiness. Keep existing CampaignCue source and historical documentation intact. Reopen CampaignCue only after both MenuList and Answerlattice are live and Danny explicitly instructs Codex to reopen CampaignCue in a later request.
- **MyCodex remains static/no DB and no active domain dependency**: Do not add MyCodex Firestore, Storage, Cloud Functions, billing plans, owner notifications, product `pId` writes, Firebase env keys, or any active domain dependency. `menulist.digital`, `www.menulist.digital`, `app.menulist.digital`, and `*.menulist.digital` belong to MenuList QA/staging. MyCodex Vercel env is limited to `MYCODEX_BASIC_AUTH_USER`, `MYCODEX_BASIC_AUTH_PASSWORD`, and `MYCODEX_SESSION_SECRET` unless the static-reader architecture is explicitly changed first.

### Technology Stack Decisions

- **Pinned package runtime**: Freeze follows the exact versions in `package.json` / lockfiles and is guarded by `npm run verify:dependency-freeze`; no version changes without explicit migration/security scope.
- **Next.js 16.3.0**: Current pinned runtime for the 3-year freeze window.
- **Next 16 migration is locally complete**: The Node 22.23.1 / Next 16.3.0 / React 19.2.8 / Serwist 9.5.12 / Fabric 7.4.0 migration has no known remaining local implementation work when `verify:next-runtime-migration`, `verify:next-build-compatibility`, `verify:dependency-freeze`, typecheck, lint, and the maintained runtime/browser gates pass. Vercel preview/production smoke, physical-device PWA certification, Firebase QA deployment, and Git commit/push are release or operator evidence, not missing migration code.
- **Next private PostCSS exception is closed**: Stable Next 16.3.0 privately carries PostCSS 8.5.23, matching the patched root pin and removing the former Next 16.2.11/PostCSS advisory chain. Keep all framework-aligned packages exact, reject canary/preview releases and `npm audit fix --force`, and rerun the full migration/build/runtime matrix for every later stable Next upgrade.
- **Next 16.3 adoption boundary**: Keep the stable default improvements (Turbopack build cache and memory eviction, native-stream SSR, prefetch inlining, and immutable static assets). Do not enable `cacheComponents`, `partialPrefetching`, the Rust React Compiler, experimental offline retry, or TypeScript 7 as part of a dependency-only upgrade; each requires a separately verified application-semantics migration.
- **Dual Platform**: Desktop (Ant Design + SCSS) vs mobile owner surfaces (Tailwind-driven mobile shell/screens; add `antd-mobile` only through an explicit dependency decision and freeze update)
- **State Management**: Redux Toolkit + Redux Persist - no alternatives
- **Backend**: Firebase (Firestore, Functions, Auth) - cost-optimized patterns
- **Authentication**: NextAuth.js - session management with security guards

### Development Philosophy

- **Docs-First Development**: 7-document set before any code
- **3-Year Freeze**: Complete features ship, no "Phase 2" promises
- **Zero Tolerance Bug Policy**: Fix immediately, no exceptions
- **Constitutional Governance**: All decisions follow MenuList Constitution v3.0
- **Owner Validation First**: Validate every request from a non-technical SMB owner perspective before agreeing, rejecting, or implementing
- **Codebase Truth First**: Existing code and runtime behavior outrank external suggestions, stale docs, and assumptions

---

## Architecture Truths

### Data Access Layer (DAL) Patterns

- **Client-Side Preference**: Use client-side DAL over unnecessary API routes
- **Firebase Call Challenge**: Before adding any Firestore read/write/delete or API route that exists only to perform Firestore work, first ask whether the client already has the required tenant/store/project context and can use an existing DAL, compact session doc, cache, or batched write. Use server routes only for secrets, provider calls, imports/jobs, external integrations, high-risk server-only policy, or durable ledgers that cannot be safely enforced by existing client DAL/security rules.
- **Compositional Patterns**: apiCallComposer, requestBodyComposer for consistency
- **Firebase Cost Awareness**: Every read/write/delete impacts revenue
- **Single Sources of Truth**: Eliminate redundant data access patterns

### Mobile Architecture

- **Mandatory Mobile Support**: Every feature needs mobile layer
- **Inheritance Model**: Mobile inherits auth, localization, settings from shared logic
- **PWA Shell Contract**: Owner mobile screens reached from Today, Menu, Share, or More must open inside `MobileShell` using shell sub-screen state and existing mobile providers; do not use route bypasses, forced reloads, or separate data loading unless the screen is explicitly outside the mobile PWA shell.
- **Optimistic Updates**: UI updates instantly, backend syncs after
- **Touch Optimization**: Large targets, instant feedback, no desktop refactoring

### Security Architecture

- **Input Sanitization**: DOMPurify for all user content
- **Auth Guards**: NextAuth.js with session validation
- **Type Safety**: TypeScript strict mode with Zod validation
- **Data Validation**: Runtime validation at all boundaries

---

## Critical Gotchas

### Development Gotchas

- **Never Mix Icon Libraries**: Use react-icons/lu (Lucide) only
- **Contextual Illustrations Are Not Icons**: Use the shared locally bundled contextual state illustration component only for eligible decorative states; keep Lucide on every interactive control, keep healthy/filter/loading/editor-output states plain, and update `verify:contextual-state-illustrations` whenever the empty-state inventory changes.
- **No Version Drift**: 3-year freeze applies to all dependencies; declarations must stay exact and pass `npm run verify:dependency-freeze`
- **Mobile Files**: Every feature needs `[feature-name]_mobile-support.md`
- **Feature Flags**: Required in `src/config/features.ts` for all new features
- **Type Check**: Must pass `npx tsc --noEmit` before completion

### Documentation Gotchas

- **7-Document Standard**: spec, impl, marketing, website, helpdoc, firebase, README
- **Path Verification**: Every claim must link to exact `file:line` evidence
- **Language Governance**: No "AI-powered", "Smart", "Dynamic" in public content
- **Constitutional Language**: Use "No action needed", "Menu state is stable"

### Firebase Gotchas

- **Cost Tracking**: Document every operation's revenue impact
- **Read Optimization**: Prefer client-side queries over server functions
- **No Reflex API Routes**: Do not add protected API routes just to re-read data already loaded in the owner context. Prefer a tenant-scoped DAL/session-doc pattern unless server-only authority is required.
- **Write Patterns**: Batch operations, minimize document writes
- **Auth Context**: User context affects security rules and costs
- **Scheduled Function Consolidation**: Do not add new standalone MenuList scheduled Cloud Functions for operational maintenance by default. Add tasks to `functions/src/schedulers/menulistMaintenanceScheduler.ts` with an explicit cadence, per-task Firestore lease, state tracking, and Firebase cost note. Store-EOD analytics/intelligence remains in `functions/src/decisionBlocksScoring.ts`; Answerlattice scheduled work remains in `functions-answerlattice/`.

### Mobile Gotchas

- **Mobile Components**: Use the current Tailwind-driven mobile shell/screens and shared business logic; do not import `antd-mobile` unless it is intentionally added as a dependency and the freeze verifier is updated.
- **Tailwind CSS**: Mobile styling layer, don't mix with SCSS modules
- **Touch Events**: Handle touch interactions properly
- **Performance**: Mobile-first optimization required
- **44px Touch Targets**: Mobile owner actions must use large touch targets and instant feedback
- **PWA Shell Screens**: Mobile tab actions should use `MobileShell` sub-screens and callbacks, with direct routes mapped into shell state only when needed for deep links.

### Security Rule Summary

- **API Route Protection**: Protected routes require `withAuth()`.
- **Tenant Isolation**: Verify tenant access before tenant data reads or writes.
- **Input Validation**: Validate request data with Zod before database access.
- **Security Logging**: Log security-relevant events through the approved secure logger.
- **Rate Limiting**: Apply rate limits before expensive operations.
- **Firestore Rules**: Default deny, explicit allow.
- **No Sensitive Logs**: Never log passwords, tokens, secrets, or raw sensitive payloads.
- **Generic Errors**: Avoid user enumeration and sensitive implementation details.
- **Firestore Sanitization**: Use `sanitizeForFirestore()` for writes that may contain undefined values.
- **Security Override Limit**: User override does not bypass security rules.

### Critical Security Files

Do not casually modify these files. If a task requires changes here, read the security rules first and explain the risk:

- `src/middleware/auth.ts`
- `firestore.rules`
- `src/lib/auth/security.ts`
- `src/lib/monitoring/logger.ts`

### Mobile Rule Summary

- **Mobile Assessment Required**: Every feature needs explicit mobile impact review.
- **Feature Admission Gates**: Frequency, speed, touch, and owner value must pass.
- **DAL-First Architecture**: DAL -> hook -> desktop UI -> mobile UI.
- **No Desktop Refactoring for Mobile**: Mobile should be a layer over shared logic unless desktop changes are genuinely required.
- **Inheritance**: Mobile inherits auth, localization, timezone, RTL, and settings from shared systems.
- **PWA Shell Contract**: Owner mobile PWA features reached from existing tabs stay in `MobileShell`; direct route navigation and desktop-route bypasses are exceptions that need explicit justification.
- **Icons**: Use `react-icons/lu` only.
- **ICP Compliance**: Non-technical SMB owner copy, no jargon, large targets, instant feedback.
- **Optimistic Updates**: Mobile UI updates immediately and syncs after.

### Documentation Rule Summary

- **Global Patterns**: Put application-wide patterns in `__docs__/security/`.
- **Feature Specifics**: Put feature-specific docs in `__docs__/[feature]/`.
- **Global First**: If a reusable global pattern is missing, create it before feature docs depend on it.
- **Reference, Do Not Duplicate**: Feature docs reference global docs instead of copying them.
- **Decision Matrix**: Entire app, 2+ features, or reusable utility means global; one feature means feature docs.
- **Feature Doc Set**: New or retro-documented features use README, `_spec.md`, `_impl.md`, `_marketing.md`, `_website.md`, `_helpdoc.md`, `_firebase.md`, `_mobile-support.md`, optional `_test-cases.md`, and changelog entry.
- **Naming Convention**: Feature doc filenames are lowercase kebab-case with one underscore before doc type, for example `feature-name_spec.md`.
- **Archive Rule**: Do not delete historical docs; move them to `_archive/`.

### Answerlattice Rule Summary

- **Identity**: Answerlattice is the Governed Answer Infrastructure, separate from MenuList.
- **Doctrine First**: Read the 3 Answerlattice doctrine files before Answerlattice work.
- **Flags and Constants**: Use `ENABLE_ANSWERLATTICE_*` flags and `ANSWERLATTICE_*` database constants.
- **Tenant Shape**: Answerlattice documents use `pId`, `tId`, and `sId`; do not invent alternate tenant field names.
- **Canonical Retrieval**: Canonical answers take priority over RAG.
- **Organization**: Answerlattice docs live under `__docs__/answerlattice/`; code lives under `/answerlattice/` subfolders.
- **Infrastructure Separation**: Separate Firebase project, Cloud Functions, and clients for Answerlattice.
- **Answerlattice Memory Discipline**: After non-trivial Answerlattice AI, RAG, widget, Firebase, scheduler, runtime, deploy, or production-hardening work, update the dedicated Answerlattice memory/docs before final handoff when active memory policy allows it.
- **Pre-Onboarding Maintenance**: Treat the Answerlattice Pre-Onboarding Input Kit as a first-class onboarding surface. `/pre-onboarding` is the primary human route; markdown prompt, owner guide, agent guide, and `/pre-onboarding/guide` are companion utility routes. When Knowledge Intake limits, source/payload shape, product-surface mapping, live-support gates, widget context, screenshot policy, source-access limits, AI IDE capability boundaries, or onboarding positioning changes, update the public prompt, owner guide, agent guide, feature docs, header/mobile/footer navigation, homepage placement, resources links, get-started placement, sitemap/site config, and LLM context in the same pass. MenuList's package is the reference coverage standard, but the public process must stay product-shape agnostic with `repo_and_website`, `multi_product_repo`, `website_only`, `docs_only`, `owner_notes_only`, and `mixed` modes, explicit copy/paste placeholders, and `Not available` / `Not applicable` handling instead of invented source coverage. If one repo contains multiple products, map product-like surfaces first, target the named product only, include shared infrastructure only when support-relevant, and document sister-product exclusions. Market-adjacent outputs such as FAQ seeds, demo walkthrough briefs, website claim briefs, screenshots, API support maps, and support-export summaries stay review-ready until owner approval. Never claim the prompt guarantees perfect output across every AI IDE, private repo, login-only app, restricted website, file, recording, product shape, or model; blocked sources stay pending.

### Tech Stack Freeze

- **Source of truth**: `package.json`, `package-lock.json`, `functions/package.json`, `functions/package-lock.json`, `functions-answerlattice/package.json`, `functions-answerlattice/package-lock.json`, `functions-signaldesk/package.json`, and `functions-signaldesk/package-lock.json`; enforce with `npm run verify:dependency-freeze`.
- **Frameworks**: Next.js 16.3.0, React 19.2.8, TypeScript 5.8.3 in the root app.
- **UI**: Ant Design 5.25.1 for desktop; current mobile owner surfaces are Tailwind-driven and must not import `antd-mobile` unless the dependency is intentionally added and the freeze verifier is updated.
- **State**: Redux Toolkit 2.12.0, React Redux 9.3.0, and Redux Persist 6.0.0 only.
- **Auth**: NextAuth.js 4.24.15.
- **Runtime**: Root Node 22 with `.nvmrc` pinned to 22.23.1.
- **PWA runtime**: Serwist 9.5.12 with isolated owner/customer/MyCodex worker contracts; do not restore `next-pwa` or the retired root `worker/index.js`.
- **Backend**: Root Firebase client 11.7.3 and Firebase Admin 14.2.0 through modular entry points; MenuList, Answerlattice, and SignalDesk Functions pin Firebase Admin 13.10.0 and stable Firebase Functions 7.3.0 through modular entry points. Answerlattice CI pins Firebase CLI 15.24.0; do not install Firebase Functions release candidates.
- **AI SDK**: `@google/genai` 2.13.0 in the root app, MenuList Functions, and Answerlattice Functions.
- **Gemini runtime contract**: Active text routes use explicit stable IDs from `src/data/shared/geminiRuntime.ts`: `gemini-3.5-flash-lite` for high-throughput structured work, `gemini-3.6-flash` for complex or escalation work, and `gemini-3.5-flash` for balanced work. Active image routes use `gemini-3.1-flash-lite-image` or `gemini-3.1-flash-image`. Never use `*-latest`, preview, experimental, or retired model IDs for provider calls. Every `generateContent` call must pass through the shared compatibility compiler, which removes deprecated sampling and unsupported candidate fields for every admitted Gemini 3.x model and rejects prefilled model turns where disallowed, `thinkingBudget`, incomplete function responses, and unknown model IDs before a paid call.
- **Editors**: Tiptap v2.11.0 and Fabric.js 7.4.0; Fabric ships its own types.
- **Styling**: Tailwind CSS for mobile, SASS/SCSS for desktop.

### Build Discipline Summary

- **Vercel Turbopack Memory And Trace Boundary**: The standard 8 GiB Vercel build uses `build:vercel` with a 4096 MiB V8 ceiling and disabled browser/server source maps. Runtime-only dynamic filesystem reads must use `turbopackIgnore` only when their required deploy assets are covered by explicit output tracing. Never globally exclude `node_modules/@swc/**`: Next 16's deployed Turbopack routes require `@swc/helpers`. `build:vercel` must finish with `npm run verify:next-deployment-bundle`, which loads the traced website route without the repository's full `node_modules`; `npm run verify:next-build-compatibility` guards the source contract.
- **Next Server Firebase Admin Bundle Boundary**: Root Next.js server routes must keep `firebase-admin` in `transpilePackages` and must not add it to `serverExternalPackages` or custom Webpack server externals. Firebase Admin 14 reaches `jwks-rsa` 4 CommonJS and ESM-only `jose` 6; native external loading can pass locally but fail in a Vercel route with `ERR_REQUIRE_ESM`. Keep Firebase Admin unavailable to browser bundles through client-only aliases. `build:verify` must run the source contract before compilation, and `verify:next-deployment-bundle` must isolated-load the website, sign-in, and NextAuth API traces.
- **Search Before Creating**: Look for existing utilities, hooks, components, DAL functions, constants, and patterns before adding new ones.
- **DAL First**: Prefer client-side DAL and existing database patterns when server-only behavior is not required.
- **Feature Flags**: New features must be guarded by `src/config/features.ts`; mirror Cloud Function flags when applicable.
- **Shared Data Mirror**: Static data shared with Cloud Functions must live in `src/data/shared/` and be copied byte-for-byte to `functions/src/sharedData/`.
- **Core Architecture Protection**: Do not silently change shared types, enums, DB fields, constants, or DAL contracts. Present impact analysis first if a shared change is unavoidable.
- **No Settings Bloat**: Do not add owner-facing toggles for behavior already controlled by existing settings or sensible defaults.
- **Firebase Cost Discipline**: Avoid redundant reads, batch writes, paginate growing lists, document every new read/write/delete pattern, and reject new proposal/event/operation docs when a capped daily/session summary can safely hold the state.
- **Operational Monitoring**: AI and expensive routes need SAFE_MODE and rate limiting; mutation/payment/publish flows need appropriate monitoring and alerts.
- **Public Entity Addressability**: Customer-facing items and business entities should have stable, human-readable URLs when they are intended to be shareable/indexable.
- **Public Cache Invalidation**: Any code path that writes public-facing `projects` or `stores` truth must invalidate the public menu/OBP cache. Client/browser DAL paths must use `src/lib/cache/publicClientCache.ts`; server/API paths must revalidate `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`. This applies to desktop, mobile, direct Firestore writes, API routes, special menus, PWA/customer app settings, and multi-outlet propagation/override flows.
- **Website Auto-Sync**: If a feature changes public/customer-visible capability, check whether website copy, help docs, and output surfaces need updating.
- **Website Asset Operating System Boundary**: Website asset generation, audits, briefs, manifests, and media review belong under `packages/asset-factory/` and `__docs__/website-asset-operating-system/`. Keep it internal-only unless a later explicit product-extraction decision creates a public runtime. It may read MenuList and Answerlattice website/docs/assets, but it must not write product data, create owner-facing UI, expose public routes, or blur into GrowthOS/KitStamp.
- **Security Operating System Boundary**: Portfolio security profiles, surface maps, verifier evidence, grouped manual-selection bundles, provenance reviews, and local registry audits belong under `packages/security-os/`, `__docs__/security/security-operating-system/`, and `.agents/skills/security-os/`. Keep SecurityOS internal-only and read-only by default. Evidence bundles are planning aids and must never auto-execute their commands. SecurityOS may map owned source, rules, docs, and verifiers, but must not upload source/findings, scan production or third-party targets, auto-fix, auto-deploy, expose a public route, or treat mapped evidence as a passing security result. External scanners require a separate license, data-flow, credential, cost, and provenance decision.
- **Finance Operating System Boundary**: Portfolio operating transactions, obligations, subscriptions, prepaid and usage-based balances, assets, evidence indexes, forecasts, reminders, provider-console reviews, reconciliation, period closes, exceptions, and backup/restore evidence belong under the founder-controlled local Documents store, with rules and empty schemas under `packages/finance-os/`, `__docs__/finance-operating-system/`, and `.agents/skills/finance-os/`. FinanceOS v1 is frozen as one independent open-format system: the private store is operational authority and must remain usable without Chrome, reminders, Firebase, product runtime, or a particular workbook application. Never commit real invoices, payment screenshots, statements, ledger exports, tax records, balances, or asset evidence. Keep expected, invoiced, paid, refunded, and reconciled states separate; timestamp balance observations; label depletion dates as estimates; detect duplicates; preserve append-only corrections and closed-period history; and never infer payment from a reminder or invoice. Periodic provider monitoring is a reminder followed by a session-bound, owner-approved, read-only Chrome review after Danny opens the `admin@neelvara.com` profile; it is never continuous background access. Keep each provider and each active Firebase product/environment separate, keep authentication/MFA founder-operated, and never mutate billing, payments, plans, quotas, alerts, IAM, APIs, secrets, Firebase configuration, or deployments through a review. Verify encrypted backup scope monthly and test a non-destructive sample restore quarterly; configuration alone is not recovery evidence. FinanceOS must not initiate or change payments/subscriptions, create Firebase or public/product surfaces, replace professional accounting/tax review, or blur shared infrastructure into one product. Future schema changes require a recorded legal/accounting, security/data-loss, provider-compatibility, or founder-approved material reason; never create a parallel ledger or silently rewrite history.
- **PresenceOS Boundary**: The founder's public identity is the transparent pseudonym `Proof & State`, first-choice handle `@proofandstate`. PresenceOS belongs under `__docs__/founder-public-presence/` with mirrored Codex/Cascade rules, approved local visual assets, manual workflows, a canonical daily progress tracker, and morning/evening internal Codex heartbeats. Mark external work complete only from a founder-provided URL or clear result; silence is `unconfirmed`, not failure. Give one primary action per day, carry forward at most one missed action, and use `DONE`, `BLOCKED`, or `SKIP` results to guide the next dependency. Never expose the founder's original identity, face, natural voice, personal accounts/contact details, personal Git identity/history, identifying metadata, customer content, or private repository details. Do not link MenuList, Answerlattice, Neelvara, product domains, repositories, app-store identities, or a founder hub until the documented identity-correlation audit passes. Public pseudonymity does not imply platform anonymity; comply with private registration/verification requirements without making them public. Keep PresenceOS internal-only: no public runtime, dashboard, database, scraper, auto-posting, automated replies, engagement network, lead harvesting, account creation, publication, messages, follows, purchases, verification, or spend without a separate architecture decision or explicit external-action instruction as applicable.

---

## Product Context Memory

### MenuList Identity

- **North Star**: "The system keeps working when no one is watching"
- **10 Laws**: Default Authority, Silence Is Feature, No Explanations, etc.
- **Infrastructure Mentality**: Upstream positioning, cleanest source
- **Zero Cognitive Load**: If it makes owners think, don't ship
- **Founder-Approved Video Standard**: All MenuList launch, demo, reel, ad, onboarding, founder, website-video, and aspect-ratio assets must follow `__docs__/videos/videos_founder-approved-production-standard.md`. Default to local HyperFrames/FFmpeg, the non-technical owner upload-photo/PDF story, Inter everywhere, zero letter spacing, selective website-gradient phrases, calm UI-led motion, overlapping non-flicker transitions, the plain original MenuList logo, Indian-English voice, audible voice-reactive ducking, controlled timeline lift, native aspect layouts, and encoded-MP4 QA. MenuList video and media production is zero-cost and local-only: no paid APIs, subscriptions, metered credits, cloud rendering or generation, paid catalogs, paid plugins, or account-backed generation services unless the founder explicitly reverses this rule. For new videos, `MenuList One Link Motion v2` seed `260719` is the primary default background-track direction; `MenuList Outlet Control v2` seed `260721` is the approved multi-location and operational alternate; `Midnight Lo-Fi Focus` remains the calm baseline and stays frozen for Owner Ease `v1.0`. Default means first audition choice, not forced reuse; match narrative and duration, and create a structured extension or use the two-minute library instead of carelessly looping a short source. Do not drift back to QR-only positioning, AI hype, serif/mono type, heavy device frames, repeated blue patterns, blank final frames, `MenuList AI` lockups, random music/voices, paid or attribution-dependent music, or unsupported growth/ranking/integration claims. Retain every active generated WAV, Lyria model, preset, seed or auto-seed status, timestamp, generation manifest, and hashes with its source project; review current service terms before public distribution.
- **MenuList Memory Discipline**: After non-trivial MenuList owner, customer-facing, mobile, public-output, Firebase, cache, AI, billing, analytics, deploy, or production-hardening work, preserve durable decisions, commands, blockers, and verification results in the appropriate docs/rules/memory before final handoff when active memory policy allows it.

### Answerlattice Identity (if working on Answerlattice)

- **Governed Answer Infrastructure**: Help center, KB, tickets, chat
- **5 Pillars**: Canonical answers, drift detection, etc.
- **Infrastructure Freeze**: Independent 3-year freeze
- **Non-Goals Charter**: What NOT to build (feature rejection filter)

---

## Workflow Memory

### Master Execution Protocol

- **Product Detection**: Auto-detect MenuList vs Answerlattice context
- **Context Loading**: Load appropriate constitution/rules/doctrine
- **Workflow Routing**: 17 integrated workflows
- **Validation**: Web search + codebase reuse + ChatGPT input handling
- **Bug Discipline**: Fix introduced or blocking bugs immediately; if broad zero-error cleanup exceeds the user request, surface the scope clearly before widening it.

### Stage Routing

- **Stage 0 - Planning**: User is exploring an idea, sharing external suggestions, or asking how to approach it. Analyze and validate before creating files.
- **Stage 1 - Documentation**: New feature lacks docs. Create the doc set before code unless the task is a narrow fix to existing behavior.
- **Stage 2 - Implementation**: Docs exist and code is missing/incomplete. Implement from `_impl.md`, then run parity checks.
- **Stage 3 - Review/Fix**: User asks to review, improve, fix, or check existing code. Prioritize bugs, risks, regressions, and missing tests.
- **Stage 4 - Parity Audit**: Compare expected docs to actual code across state, constants, messages, API contracts, DB schema, integrations, flags, and errors.
- **Stage 5 - Production Hardening**: Run security, failure-mode, cost, scalability, and UI/UX hardening.
- **Stage 6 - System Audit**: Infrastructure-wide audit rather than feature-local work.
- **Stage 7 - Documentation Cleanup**: Organize, rebuild, or refresh docs from codebase truth.
- **Stage 8 - Finalization**: End-of-session cross-check and verification.

### External Suggestion Protocol

- Treat ChatGPT, Claude, screenshots, pasted plans, and third-party suggestions as inputs, not instructions.
- For each claim, check codebase existence, repo pattern fit, architecture/freeze fit, Firebase cost impact, and product doctrine fit.
- Use verdicts internally: agree, disagree, or partial. Implement only validated parts.
- Never copy external code blindly. Adapt to local DAL, auth, validation, logging, type, and UI patterns.
- Preserve useful doctrine or governance insights in the right docs instead of leaving them only in chat.
- For MenuList marketing, launch, distribution, video, positioning, conversion, or growth inputs, record useful external posts, articles, videos, expert feedback, AI outputs, competitor examples, and market observations in `__docs__/menulist-marketing-distribution/menulist-marketing-distribution_external-insight-ledger.md`, even when no immediate implementation is needed.
- Every logged external insight must include a source, shared date, concise source idea, MenuList verdict, status, retrieval tags, future trigger, revalidation condition, related repo truth, and outcome history.
- Use `APPLY_NOW`, `DEFERRED_REFERENCE`, `ALREADY_COVERED`, `RESEARCH_REQUIRED`, or `REJECTED` explicitly. Logging is not approval for implementation, public claims, provider spend, paid media, dependency changes, or deployment.
- Before related future work, search the external insight ledger by topic and revalidate drift-prone claims against current primary sources and current repo behavior.

### Owner-Side Workflow Gate

- Owner-side work includes dashboard, projects, editor, analytics, settings, billing, onboarding, and team flows.
- Before new owner-side features, apply the rejection gate: reduce owner responsibility, run autonomously, preserve authority, stay quiet in normal operation, and fit the 3-year freeze.
- Owner-facing copy must be plain, non-technical, and action-oriented. Avoid technical terms and avoid creating extra decisions for the owner.

### Customer-Facing Workflow Gate

- Customer-facing work includes QR menus, public menus, official business pages, feedback forms, screen displays, and public website surfaces.
- Load constitution, language governance, failure/refusal rules, feature rejection gate, menu enforcement, and public-route security rules when relevant.
- Customer-facing surfaces must show less rather than wrong, load fast on low bandwidth, work mobile-first, avoid technical leakage, and avoid forbidden public copy such as "AI-powered", "Smart", or "Dynamic".
- Public endpoints need public rate limiting, validation, safe CORS behavior where relevant, and no sensitive response data.
- When owner/admin changes can affect public menu, OBP, PWA, outlet, or store identity output, verify the write path invalidates both menu and OBP cache tags. Do not assume desktop/mobile parity unless both surfaces route through the same invalidating DAL or API.

### Documentation Workflow

- **IDE_PROMPTS**: 19 integrated prompts for all phases
- **Slash Commands**: Use `/help` for workflow routing
- **Validation Strengthening**: Cross-check after implementation
- **End-of-Session**: 8-phase wrap-up protocol

### Workflow Registry

- `/build-debug`: Debug Vercel build failures.
- `/chatgpt-review`: Cross-check ChatGPT conversations.
- `/code-feedback`: Validate external feedback on implemented code against spec/impl before applying.
- `/customer-facing`: Customer-facing screens such as QR menus.
- `/doc-feedback`: Process external feedback on docs only; no code changes.
- `/doc-organize`: Clean up `__docs__/` organization.
- `/doc-rebuild`: Rebuild cluttered feature docs.
- `/execute`: Short alias for master routing, execute, debug on failure, and repeat until success.
- `/final-review`: End-of-session verification.
- `/help`: Smart workflow router.
- `/master-execution`: Central brain for development.
- `/mobile-review`: Mobile screen cross-check.
- `/new-feature`: Start new feature with docs first.
- `/owner-dashboard`: Owner dashboard features.
- `/parity-audit`: Spec-vs-code parity check.
- `/production-audit`: Production audit.
- `/refactor-feature`: Refactor existing feature.
- `/retro-doc`: Document existing feature.
- `/review`: Review code changes.
- `/system-audit`: Full infrastructure audit.
- `/website`: Marketing website work.

### Final Review Protocol

- Review changed files line by line for behavior, regressions, security, and consistency.
- Check docs against code and code against docs for touched feature areas.
- Sweep all touched feature doc types, especially `_firebase.md`, `_helpdoc.md`, `_website.md`, and `_marketing.md`.
- Verify mobile impact and mobile data parity when owner or customer workflows are touched.
- Verify operational monitoring for modified API routes and Cloud Functions.
- Verify public content language governance and website/help/changelog impact when public capability changes.
- Verify public cache invalidation for any touched public-facing `projects` or `stores` write path, including direct Firestore writes that bypass shared desktop/mobile DAL functions.
- Deploy changed Firebase rules, indexes, or Firebase function logic to the matching MenuList or Answerlattice Firebase target after validation; this applies only to those infrastructure changes.
- Run `npm run typecheck` unless the task is documentation-only. The script keeps incremental mode enabled because `tsconfig.json` defines `tsBuildInfoFile`.
- Preserve important decisions in docs when they would otherwise be lost in chat.

### Testing Perspectives

- **Platform Owner**: Can MenuList monitor it, control cost, disable it, and recover from failure?
- **SMB Owner**: Can a non-technical owner use it from a phone, understand the action, and see instant feedback?
- **End Customer**: Is the public result clear, fast, accessible, and free from internal/technical language?

---

## Codebase Structure Memory

### Key Directories

- `__docs__/`: All documentation (constitution, features, answerlattice)
- `IDE_PROMPTS/`: Development workflow prompts
- `.cascade/rules/`: Security and implementation rules
- `src/config/features.ts`: Feature flag management
- `src/constants/database.ts`: Database constants
- `.kilocode/rules/`: Custom instructions for AI

### Critical Files

- `package.json`: Frozen dependency versions
- `next.config.js`: Next.js configuration with optimizations
- `tsconfig.json`: TypeScript strict configuration
- `firebase.json`: Firebase configuration and rules
- `tailwind.config.ts`: Tailwind configuration for mobile

---

## Testing Memory

### Testing Requirements

- **3 Perspectives**: Unit, Integration, E2E
- **Type Safety**: `npx tsc --noEmit` mandatory
- **Mobile Testing**: Touch interactions, responsive design
- **Performance**: Firebase cost optimization validation

### Validation Checklist

- **Code Review**: Security, performance, maintainability
- **Documentation Review**: Completeness, accuracy, governance
- **Cross-Feature Review**: Consistency, redundancy elimination
- **UI/UX Review**: Mobile optimization, accessibility

---

## Cost Memory

### Firebase Cost Impact

- **Read Operations**: Most expensive, optimize queries
- **Write Operations**: Batch when possible
- **Delete Operations**: Document cleanup costs
- **Auth Operations**: Session management overhead

### Development Cost Discipline

- **Client-Side Preference**: Reduce server function calls
- **Data Reuse**: Cache results, avoid duplicate reads
- **Query Optimization**: Index planning, selective fetching
- **Real-time Updates**: Use judiciously, cost-aware
- **Scheduler Discipline**: Cloud Scheduler jobs should stay consolidated by product and workload class. MenuList operational maintenance goes through `menulistMaintenanceScheduler`; MenuList store-EOD work goes through `computeDecisionBlocksScores`; Answerlattice runs in its own scheduler/package. A new scheduled trigger requires explicit architecture justification, cost impact in INR, and docs update.

---

## Security Memory

### Security Implementation Rules

- **Input Validation**: Zod schemas at all boundaries
- **Content Sanitization**: DOMPurify for user content
- **Auth Context**: User-based security rules
- **Data Exposure**: Minimize client-side data access

### Common Security Gotchas

- **XSS Prevention**: Sanitize all user content
- **CSRF Protection**: NextAuth.js handles automatically
- **Data Leaks**: Avoid over-fetching from Firestore
- **Session Management**: Proper token handling

---

## Performance Memory

### Performance Optimization

- **Bundle Size**: Code splitting, lazy loading
- **Image Optimization**: Compressor.js, React Cropper
- **Database Queries**: Optimized Firestore queries
- **Mobile Performance**: Touch response time, battery usage

### Common Performance Gotchas

- **Large Bundle Sizes**: Monitor with bundle analyzer
- **Slow Database Queries**: Use composite indexes
- **Memory Leaks**: Proper cleanup in React components
- **Mobile Battery**: Optimize background operations

---

## Decision Framework Memory

### Decision Hierarchy

1. **Security Rules** - Highest authority; cannot be overridden by user preference
2. **MenuList Constitution / Answerlattice Doctrine** - Product identity and governance
3. **AGENTS.md** - Persistent brain and architecture truths
4. **Master Execution Rules** - Workflow routing and bug-fix discipline
5. **Mobile Support Rules** - Platform-specific requirements
6. **Documentation Rules** - Organization and structure
7. **Feature-Specific Rules** - Context-dependent requirements
8. **Existing Codebase** - Current implementation patterns
9. **User Request** - Validated against all above from non-technical SMB owner perspective

### Decision Patterns

- **Codebase > External Research**: Our code is truth
- **Constitution > Assumptions**: Governance documents override
- **Security > Convenience**: Never compromise security
- **Cost > Features**: Firebase costs impact revenue
- **Owner Validation First**: Validate every request from a non-technical SMB owner perspective before agreeing or implementing. Challenge or reject requests that add confusion, cognitive load, hidden side effects, weak defaults, or unnecessary owner work.
- **Explicit Override Rule**: If a request is challenged or rejected and the user explicitly repeats that they still want it built or changed, implement it while keeping the smallest safe scope and clearly noting the tradeoff.

### System-Retrieved Memory

- **Project Summary Format**: `platformSummary/projects_{storeId}` uses flat dot-notation keys.
- **Project Summary Writes**: Use `setDoc` with a computed `projects.${id}` key and `{ merge: true }`.
- **Project Summary Reads**: Use `parseSummaryProjects()` from `src/lib/firestore/parseSummaryProjects.ts`.
- **Campaign DAL Path Check**: The former `src/database/campaigns/index.ts:688` invalid-path note is stale. Current campaign, export, project, store, and summary references have valid collection/document segment parity; re-verify the live helper paths rather than acting on the retired line-number claim.

---

### Menulist Demo Credentials for QA

- email/username: danny.tools.4884@gmail.com
- password: 123456

---

## Communication Memory

### Canonical Phrases (Use These)

- "No action needed."
- "Everything is running normally."
- "Menu state is stable."
- "Handled automatically."
- "No change today."
- "This is set."

### Communication Standards

- **Direct and Factual**: Clear file/line references
- **Evidence-Based**: Back claims with code evidence
- **Structured Updates**: Use markdown headings and bullets
- **Constitutional Language**: Use approved phrases
- **No Automatic Agreement**: Do not agree with the user's implementation direction as-is. First state whether it makes sense for a non-technical SMB owner, then proceed, revise, or reject based on that validation.
- **Pricing Currency**: Always present pricing and cost estimates in INR rupees for the user. If a vendor publishes USD pricing, convert it to INR and state the exchange-rate assumption.

---

**Document Signature:** Persistent Brain - System Memory Replacement
**Authority:** Maximum - Critical system memory for all AI sessions
