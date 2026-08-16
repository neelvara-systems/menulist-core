# MenuList Staging QA Setup Guide

> Status: first execution guide
> Scope: MenuList local plus staging only
> Last updated: August 16, 2026
> Launch boundary: this guide does not approve production deployment. MenuList production preparation and release gates are maintained separately in `menulist-production-provider-setup.md`.

This is the dedicated setup file for **MenuList staging/QA**. Follow only this
file first. Do not set up Answerlattice, CampaignCue, SignalDesk, Neelvara, or
MyCodex until MenuList QA is live and verified.

Application flow certification after infrastructure setup is tracked separately
in [menulist-staging-feature-certification.md](./menulist-staging-feature-certification.md).

## August 16 Current Production Boundary

- The August 15 production-absence entries below are retained as dated QA
  evidence. They are superseded for current operations: production project
  `menulist-prod` now exists and its inactive Firebase/Google foundation is
  tracked only in
  [menulist-production-provider-setup.md](./menulist-production-provider-setup.md).
- QA remains isolated on `menulist-qa`. No QA application data, secret, deploy,
  or provider credential was copied into `menulist-prod`.
- MenuList QA's Vercel OIDC migration is complete. Production Workload Identity
  Federation is prepared, but production hosted proof and any Production
  deployment remain release-gated in the production ledger.

## August 15 Production-Boundary Correction (Historical QA Evidence)

- The owner confirmed that MenuList production Firebase has not been created or
  initialized; only `menulist-qa` has been set up. Fresh authenticated Firebase
  CLI readback independently lists only active project `menulist-qa`.
- The checked-in `.firebaserc` entry `menulist-prod: menulist` is a reserved
  future deployment alias, not evidence that a production Firebase project,
  Firestore database, Storage bucket, Authentication tenant, or deployed
  Function exists.
- Every executed QA deploy, hosted runtime readback, Admin credential, Firestore
  write, Storage write, and Firebase Function target is bound to
  `menulist-qa`. No production Firebase credential or initialized Firebase
  resource was available to receive the synthetic QA artifacts.
- This completes `QA-K13` through structural non-reachability evidence. The
  earlier HTTP 403 result proved only that an inaccessible Google Cloud project
  identifier could not be inspected; it did not prove that MenuList production
  Firebase had been set up. Production will not be created, queried, or changed
  merely to manufacture an absence check.

## August 15 Overall QA Readiness Reconciliation

- The canonical infrastructure/setup tables contain 147 unique checks. Exactly
  146 are verified complete. The only unchecked row is `QA-A05`, deliberately
  deferred under the owner-confirmed one-maintainer model; all phases B through
  K are complete, including all 23 Phase K smoke checks.
- The separate application feature-certification ledger contains 43 unique
  flows: 7 `PASS`, 24 `FIXED`, 8 `IN PROGRESS`, 2 `BLOCKED`, and 2
  `NOT STARTED`. Therefore 31 of 43 certification flows have closure evidence
  and 12 remain unfinished.
- MenuList QA infrastructure is operationally ready under the explicit
  one-maintainer governance exception, but MenuList is not approved for
  production. Full Menu lifecycle and Billing lifecycle are still not started;
  mobile authentication and entitled Project CRUD remain blocked; and eight
  parent flows still require completion evidence.
- At this August 15 reconciliation point, production Firebase was still
  uninitialized and no Vercel Production deployment was authorized. The August
  16 current boundary above supersedes the resource-state portion of this dated
  evidence; deploy, activation, and host-smoke approval remain gated.
- The later `QA-OIDC-01` through `QA-OIDC-05` keyless-runtime migration is a
  superseding infrastructure change and is not included in the historical
  147-check count above. The migration is complete: application/runtime proof
  passed, the static Vercel rows were removed, and authenticated IAM readback
  confirms the former Admin SDK service account now has zero user-managed keys.

## August 14 Razorpay Hosted Certification Checkpoint

- Vercel Preview build `de18a865a1c08603ba3f740c958b827246d99a65` proved the authenticated pending-checkout recovery UI end to end. Closing the reopened Razorpay Standard Checkout immediately restored the exact `Payment Pending` state and `Continue Checkout` action without creating payment, entitlement, history, MRR, notification, or credit evidence.
- Cancelling disposable Test Mode subscription `sub_TPLMUb5xz8kme6` produced a signed `subscription.cancelled` delivery. The initial HTTP 503 exposed an unconditional Answerlattice lookup in MenuList-only QA. Build `1234895fdd013fa03d59400dcd8253f6d9fd6d0b` restricted lookup to the event's intended configured product stores; Razorpay's automatic retry returned HTTP 200 and owner Billing converged to `No Active Subscription`.
- Exact cleanup removed only the disposable local subscription. Retained baseline `sub_TPGo1XmddplChB` remains provider `created`, unpaid, and unchanged. Its synthetic owner/store/tenant fixture remains available for the unfinished authorization smoke. Production Firebase, Razorpay Live Mode, and Vercel Production were not queried or changed. At this August 14 checkpoint `QA-K13` remained open; the August 15 production-boundary correction above supersedes that interpretation.
- A real zero-value Razorpay `payment.failed` payload exposed a second route defect: failed-payment audit projection required a positive amount and inferred top-up from order presence. Build `2780c22a821719b6c1ee7cf1543f2f45eb17d6be` accepts provider zero for audit, uses only a bounded exact-subscription fallback when amount is absent, and requires explicit pack identity for top-up classification. Focused source/emulator gates pass. The original event's provider-controlled automatic retry is still pending observation under Razorpay's documented retry policy.
- The Test webhook is enabled with all 13 selected events, including `subscription.authenticated`. Full immediate-start card authorization, `subscription.activated`, and captured `subscription.charged` evidence remain blocked at the Razorpay Test Checkout/mock-bank boundary; these transitions were not synthesized and no money or entitlement was fabricated.

## August 14 Project, Production-Absence, And Account-Security Checkpoint

- Preview commit `6acb68b487de151bb369babb0fda323bef07decb` exactly matches `origin/staging`, hosted `/api/version`, and Vercel deployment `dpl_7g1jsmpk1gJ2tHy9nXBDhRzMvGvH`. Vercel reports the Preview deployment `READY` with the apex, `www`, app, wildcard, and staging-branch aliases. It contains the exact-scope Firebase Auth readiness gate and controlled Duplicate/Delete dialog corrections.
- The remaining deterministic first-project rules boundary was corrected and released separately. A fresh exact-scope `2/2` owner then completed hosted first-project create, reload persistence, edit, duplicate, duplicate-cancel, and normal delete. Firestore REST readback verified the canonical project, duplicate, two soft-delete tombstones, literal compact-summary projection, exact `ML`/tenant/store/user identity, one-language configuration, and no files.
- A later hard reload exposed a narrower client-session boundary: NextAuth intentionally removes `expires` from the React Server Component form of `getServerSession()`, so passing that projection into the strict client-session validator left the DAL cache and client `SessionProvider` without a complete session. Commit `2bdeeb076e789c379c0d43f3382fd88030b6bd0e` now refreshes the complete `/api/auth/session` payload, validates its stable identity and MenuList tenant/store/product scope against the trusted server projection, and only then exposes owner screens. Invalid input and scope mismatches fail closed; logout and in-flight request invalidation remain unchanged. Vercel deployment `dpl_FWspseXxHrDmC4QxKkkNbvorJJ5Y` reached `READY`, `app.menulist.digital/api/version` reported that exact commit, and two authenticated hosted reloads rendered the full owner shell and expected no-subscription gate without another `session_provider_session_prime_failed` or store-bootstrap failure. `QA-K09` is complete.
- Guarded cleanup asserted every disposable identity and update time before atomically deleting the exact three project documents, compact summary, manual QA entitlement, and disposable user document, then removed the matching Firebase Auth user. Readback proves all six Firestore documents and the Auth user absent. Retained baseline `sub_TPGo1XmddplChB` remains unchanged at scope `1/1`, local `pending`, provider `created`, with the same update time.
- Read-only production checks did not establish absence. Google Cloud exposed an inaccessible project identifier `menulist`, but `admin@neelvara.com` and the founder account both lacked `resourcemanager.projects.get`; direct Firebase Console access reported that the project was unavailable or unauthorized, and the reauthenticated Firebase CLI listed only `menulist-qa`. Failed unauthenticated Cloud Shell probes returned HTTP 403 and were not counted as absence. This was the August 14 interpretation; the owner-confirmed August 15 correction above establishes that production Firebase was never initialized and closes `QA-K13` without production access.
- `QA-A11` is complete. GoDaddy, Google, GitHub, Vercel, Sentry, Upstash,
  Razorpay, and the authentic personal Meta administrator have verified
  MFA/recovery evidence, and the Meta QA business portfolio requires 2FA for
  everyone. The Meta profile remains a temporary personal QA administrator,
  not a company-owned or permanent production identity. No authenticator seed,
  OTP, password, phone number, recovery code, or recovery mailbox content was
  requested, viewed, or stored.
- `QA-A12` is complete: secrets remain vaulted and only names, versions, redacted identifiers, and non-secret completion evidence are recorded. `QA-A16` is also complete. The company `admin@neelvara.com` Calendar now contains a quarterly `Neelvara quarterly IAM and secret review` series starting September 1, 2026 and an annual `Neelvara annual domain, payment, and recovery review` series starting August 1, 2027. Search readback confirmed both recurrences under the `Neelvara Systems Admin` calendar. Two mistakenly targeted draft series were detected under the retired personal Calendar connector and deleted immediately before any company evidence was claimed.
- `QA-A15` is complete as a no-target MenuList inventory. Firebase CLI exposes
  only active `menulist-qa`, and the owner confirmed no retired MenuList project
  is visible in Resource Manager. Its current August 9 Firebase Admin key was
  preserved; reserved production and separate-product credentials were not
  opened or changed.
- `QA-A20` is complete with explicit historical limitations. The owner confirms
  the old Vercel account remains permanently deleted, no old environment value
  was copied, and the fresh provider credentials are authoritative. Current CLI
  readback is authenticated as `neelvara-admin` and shows only team
  `neelvara-systems` and project `menulist-core`. The missing pre-deletion
  environment/provider inventory and unused phone-reuse proof are accepted as
  unrecoverable history; the retired account will not be recreated to manufacture
  evidence.

## August 14 Deterministic First-Project Rule Checkpoint

- Current staging commit `6acb68b487de151bb369babb0fda323bef07decb` exactly matches `origin/staging` and the hosted `/api/version` response. The Firebase-auth readiness and controlled Duplicate/Delete dialog fixes are therefore live.
- A fresh disposable owner at exact MenuList scope `2/2` still reached `Could not load your menus`. Source and emulator tracing isolated the remaining defect to the deterministic first-project transaction: `addProject()` must read `projects/2/2/2-default-2` to distinguish missing state from retry recovery, while the deployed rule required `resource.data` identity even when the document did not exist.
- The scoped rule now admits a missing resource only after exact authenticated tenant/store membership, using `resource == null`; existing documents remain project/tenant/store identity-bound. Emulator proof covers same-scope missing read, cross-store and cross-tenant denial, misbound existing-document denial, and the exact missing-read-then-create transaction. The full project verifier, session scope test, focused ESLint, TypeScript, and documentation-link checks pass.
- Firebase accepted and compiled immutable ruleset `fd3bf828-2c33-4732-af32-4a4bf56a7735`; its full-source SHA-256 exactly matches the local `firestore.rules`. Although the release PATCH initially returned HTTP 503, independent release readback proves `projects/menulist-qa/releases/cloud.firestore` now points to that exact ruleset with update time `2026-08-14T04:52:56.959667Z`. The hosted CRUD matrix, exact Firestore projection checks, and guarded cleanup all passed. `QA-K09` remains open only because the subsequently isolated DAL session-cache priming correction is local and needs one staging push plus a clean hosted hard-reload rerun.

## August 13 Razorpay Checkout Recovery Checkpoint

- Read-only QA evidence confirmed the pending yearly subscription is structurally safe in Firestore: exact MenuList/store scope, local `pending`, null cycle dates, empty billing history, and no active entitlement. Razorpay reports provider `created`, one issued/unpaid invoice, no captured payment, and an eMandate payment method still awaiting asynchronous confirmation.
- The existing hosted payment link returned Razorpay's "Invalid month passed for anchor" error even though the provider create payload has no `start_at` and the yearly plan is valid. Source now avoids that hosted link for authenticated pending owner flows and applies the 48-hour server-checked recovery policy documented under `__docs__/razorpay/`.
- Local source/emulator certification must pass before release. The hosted QA app remains on the earlier Vercel Preview revision until an explicitly approved staging deployment, so browser proof of Continue Checkout is still a release step rather than current hosted evidence.

## Final Domain Contract Used By This Guide

| Domain | Purpose | Env |
| --- | --- | --- |
| `menulist.digital` + `www` | MenuList main website running in staging/QA mode | Staging/QA website |
| `app.menulist.digital` | Single owner/staff authenticated app; canonical dashboard is `/dashboard` | Staging/QA app |
| `*.menulist.digital` | QA customer test links, for example `abc.menulist.digital`; platform labels such as `app`, `www`, and `qa` are reserved | Staging/QA customer hosts |
| `menulist.ai` | Main MenuList marketing, SEO, and production app shell | Production, not touched here |
| `app.menulist.ai` | Owner/staff authenticated app | Production, not touched here |
| `*.menulist.online` | Production customer public menu/OBP links, for example `abc.menulist.online` | Production, not touched here |
| `menulist.online` + `www` | 301 redirect to `menulist.ai` | Production redirect, not touched here |

## Decisions For This First Setup

| Area | MenuList QA decision |
| --- | --- |
| Environment | local and staging share QA values |
| QA main website | `menulist.digital`, with `www.menulist.digital` as its alias |
| Canonical QA owner app | `app.menulist.digital`; owner dashboard path is `/dashboard` |
| QA tenant wildcard | `*.menulist.digital`; generated links are `<business-slug>.menulist.digital` |
| Owner scope | One app hostname only; authenticated session data selects the tenant and store |
| Firebase project | `menulist-qa` |
| Firebase/Google Cloud region | `us-central1` for Firestore, Storage, Functions, and Cloud Tasks; Firestore asks for an explicit choice, so select `us-central1` |
| Vercel project | one fresh company-owned shared repo project; discard the old project/history/env and use Preview/Staging env only |
| Vercel secret scope | Preview values restricted to exact Git branch `staging` |
| Local data safety | same QA configuration family; use Firebase emulators first for destructive/rule testing, and use cloud `menulist-qa` only for integration smoke |
| QA discovery | every `menulist.digital` host is `noindex`, disallows all crawlers, and publishes no sitemap |
| Production | not touched in this guide |
| Other products | not touched in this guide |
| MyCodex | not used; MyCodex remains static/no DB and has no `menulist.digital` dependency |
| SignalDesk | not part of MenuList QA setup; SignalDesk remains under its dedicated `signaldesk.menulist.online` contract |
| MenuList env naming | use `MENULIST_*` for server-side MenuList values and `NEXT_PUBLIC_MENULIST_*` for browser values |

Important Next.js rule: browser-exposed variables must still start with
`NEXT_PUBLIC_`. So the public MenuList prefix is `NEXT_PUBLIC_MENULIST_*`, not
`MENULIST_NEXT_PUBLIC_*`.

## Permanent Owner Account Decision

Use `admin@neelvara.com` from one Google Workspace tenant as the permanent
break-glass Google, Google Cloud, Firebase, and provider owner identity. Do not
use it for routine browsing or daily operations after the initial setup. During
the MenuList QA bootstrap only, one licensed user is allowed:
`admin@neelvara.com` may perform the setup after MFA and recovery are secured.
Create a named daily operator such as `danny@neelvara.com` before production
operations, grant only the access needed, and return `admin@neelvara.com` to
break-glass-only use. Do not use a new address such as
`neelvara@gmail.com` as the permanent company root account. A founder's
existing long-lived personal email may be the recovery address, but it is not
the shared operational owner.

Creating the Workspace tenant requires control of `neelvara.com`. Google asks
you to prove that control through a DNS verification record. Neelvara Systems
can remain an operating/trade name during this QA setup; do not represent it as
a registered company, LLP, or corporation unless that registration actually
exists.

`admin@neelvara.com` does not need to exist before Workspace signup. The
Workspace signup creates that first custom-domain user and makes it the initial
Super Admin. If Google asks for a current/contact email before that user exists,
use the founder's existing long-lived personal Gmail address only for contact
and recovery. Do not create `neelvara@gmail.com`, and do not activate the unused
GoDaddy Professional Email plan to create `admin@neelvara.com`.

Use the display name `Neelvara Systems Admin` for the generic
`admin@neelvara.com` break-glass identity. Do not leave the founder's personal
name on that generic account, and do not use the singular `Neelvara System`.
Future named user accounts retain each real person's name for auditability.

There are two separate choices in Google Cloud:

- **Resource parent:** create `menulist-qa` under the Google Cloud organization
  associated with the verified `neelvara.com` Workspace domain.
- **Payments profile type:** choose the truthful type for the person/entity that
  currently pays. Do not invent company registration or tax details. Google
  does not allow the payments-profile account type or country to be changed
  later; if the legal payer changes, create a new billing account/payments
  profile with the correct details and relink `menulist-qa`.

Official references:

- Google Workspace domain verification:
  https://support.google.com/a/answer/60216
- Google Cloud organization setup:
  https://cloud.google.com/resource-manager/docs/creating-managing-organization
- Cloud Billing account creation and permanent account-type choice:
  https://cloud.google.com/billing/docs/how-to/create-billing-account
- Cloud Billing settings that can and cannot be changed:
  https://cloud.google.com/billing/docs/how-to/modify-billing-account

## Stop Rules

Stop and fix the setup before continuing if:

- Exact domain `neelvara.com` is unavailable at registrar checkout or ownership
  of `menulist.digital` cannot be proved. Do not choose a substitute silently.
- Firebase project id `menulist-qa` is unavailable.
- Firebase Console suggests a suffixed id such as `menulist-qa-12345`.
- Vercel asks you to configure MenuList QA on `menulist.online`,
  `www.menulist.online`, `menulist.ai`, or `app.menulist.ai`.
- Vercel tries to connect `menulist.digital`, `www.menulist.digital`,
  `app.menulist.digital`, or `*.menulist.digital` to Production instead of
  Preview/Staging.
- A sensitive Vercel Preview variable is available to every Preview branch
  instead of being restricted to exact Git branch `staging`.
- You have not exported the current `menulist.digital` DNS zone, or an existing
  mail/verification record has not been recreated before changing nameservers.
- Any setup step asks you to activate `qa.menulist.digital`,
  `*.qa.menulist.digital`, `dashboard.menulist.digital`, or
  `app.menulist.online`.
- An existing `menulist-qa` Firestore database or Storage bucket is not in
  `us-central1`. Resource locations cannot be changed in place; record the
  existing location and stop for architecture review instead of deleting it.
- Any `menulist.digital` QA website, app, or customer page is indexable, serves
  an allow-crawling `robots.txt`, or publishes a sitemap.
- You do not have the real owner Google/Firebase/Vercel account.
- The source GitHub `menulist-ai/menulist-core` repository or exact `staging`
  branch is unavailable for native transfer to the fresh company organization,
  or the fresh Vercel account cannot connect to the transferred repository.
- A non-Firebase provider asks for production verification, live mode, or live
  billing. Firebase/Google Cloud billing for `menulist-qa` is allowed only
  when it is required for QA Functions/Storage and belongs to the company owner
  account.
- You are about to paste a real secret into this document, chat, git, or a
  screenshot.
- An actual local or Vercel env value still contains a literal template marker
  such as `<menulist-qa-web-api-key>`.
- A required Preview spend-cap budget is unavailable in the selected billing
  account. Stop before paid Gemini calls and report the provider limitation;
  an alert-only budget is not a spending cap.

## Live Execution Checklist - MenuList QA Only

Use this checklist while doing the setup. When you finish something, tell Codex
the checklist id, for example `QA-A01 done` or `QA-F04 blocked`, and Codex will
mark the item here before guiding the next step.

Do not paste secret values into this file or chat. For secret-related items,
mark completion only after the value is stored in the password vault, local
ignored env file, Vercel Preview env, or Firebase Secret Manager as instructed.

Guided execution contract:

- During this live setup, every Codex handoff must identify one immediate
  operator action, where to perform it, the expected result, and the exact
  non-secret completion statement or redacted evidence to return.
- Do not move the operator to a later provider while an earlier blocking safety
  action remains incomplete.
- Keep marking this checklist from operator confirmations and safe evidence;
  never request passwords, recovery codes, payment details, API keys, or other
  secret values in chat.
- Bitwarden is an operational credential manager, not a product/runtime
  dependency or the sole recovery authority. Maintain an independently
  controlled encrypted or physically secured recovery record outside
  Bitwarden. Keep that record as a recovery map where possible; avoid duplicate
  plaintext password lists and update every retained copy after a rotation.

Operator progress:

- `2026-08-03` - Operator confirmed the Bitwarden account and
  `Neelvara Systems` vault setup is complete without sharing credentials;
  `QA-A01` is complete.
- `2026-08-03` - GoDaddy confirmed exact `neelvara.com` registration and added
  it to the account. The supplied confirmation shows domain auto-renew and Full
  Domain Protection auto-renew. `QA-A02` remains open until
  `menulist.digital` ownership, valid payment, domain lock, account MFA, and
  vaulted recovery are also verified. No receipt number, payment reference, or
  price is stored here.
- `2026-08-03` - Registrar evidence confirms `menulist.online`,
  `menulist.digital`, `menulist.ai`, and `menulist.app` are present in the
  owner-controlled account. `QA-B01` is complete. The `menulist.digital`
  settings screenshot shows auto-renew Off, so `QA-A02` and `QA-B02` remain
  open until auto-renew and the remaining registrar safeguards are verified.
- `2026-08-04` - Operator confirmed `menulist.digital` auto-renew is enabled;
  `QA-B02` is complete. `QA-A02` remains open until GoDaddy two-step
  verification, domain lock, payment readiness, and vaulted recovery are
  confirmed.
- `2026-08-04` - Operator confirmed GoDaddy two-step verification is enabled
  and tested successfully. The registrar MFA portion of `QA-A02` is complete;
  the checklist item remains open for domain lock, payment readiness, and
  vaulted registrar recovery confirmation.
- `2026-08-04` - Operator confirmed Domain Lock is On for `neelvara.com`,
  `menulist.digital`, `menulist.ai`, `menulist.online`, and `menulist.app`.
  The registrar lock portion of `QA-A02` is complete; payment readiness and
  vaulted registrar recovery confirmation remain.
- `2026-08-04` - Operator confirmed all five retained domains have auto-renew
  enabled and a valid renewal payment method assigned. The registrar payment
  portion of `QA-A02` is complete; only vaulted registrar recovery confirmation
  remains before the checklist item can close.
- `2026-08-04` - Operator confirmed GoDaddy recovery information is stored in
  Bitwarden and also maintains an independently controlled private recovery
  record to avoid password-manager lock-in. GoDaddy ownership, auto-renew,
  payment readiness, Domain Lock, two-step verification, and recovery are now
  confirmed; `QA-A02` is complete.
- `2026-08-04` - Operator chose to retain the already-paid GoDaddy Professional
  Email Pro Light plan through its current term because the cost is acceptable.
  `QA-A17` remains open until auto-renew is disabled for that email subscription
  only and the operator confirms it is not intentionally activated. DNS records
  created by GoDaddy are inventoried and migrated separately under `QA-A06`,
  `QA-A07`, and `QA-A19`. Google Workspace remains the selected company-mail
  platform.
- `2026-08-04` - Operator confirmed Professional Email Pro Light auto-renew is
  Off, the email service is not activated, and all domain renewals remain On.
  The plan is intentionally retained only through its paid term; Google
  Workspace remains the selected mail platform and `QA-A17` is complete as a
  subscription/renewal decision. Later DNS inspection found GoDaddy mail
  records; their controlled replacement remains pending under `QA-A06`,
  `QA-A07`, and `QA-A19` and does not reopen the resolved renewal decision.
- `2026-08-04` - Google startup-benefit preflight opened before Workspace
  creation. Paid Google Workspace signup and the 90-day Google Cloud Free Trial
  are temporarily on hold until Start-tier eligibility, public website/email
  domain alignment, billing-account timing, and the Workspace benefit window
  are confirmed. The earlier instruction to start paid Workspace is superseded
  by this hold.
- `2026-08-04` - Startup preflight records a truthful start date of February
  2025, a working MVP, a clear business model, no prior Google Cloud/Firebase
  $300 trial, and no prior Google startup credits. The operator does not
  currently plan to seek venture funding, so the published Start-tier criteria
  are not fully met. The operator also confirmed no prior
  VC/accelerator/incubator funding. The preflight is complete: do not apply to
  the Start or Scale tier using facts that do not match the operator's actual
  plans. The temporary Workspace hold is released; proceed with the normal paid
  Workspace setup at `QA-A03`. Keep the Google Cloud Free Trial unstarted until
  the later Cloud billing step so its 90-day window is not wasted.
- `2026-08-05` - The Workspace checkout was observed defaulting to Starter at
  `INR 270/user/month` with the Annual one-year-commitment toggle enabled. Do
  not start that trial from the default card. Open **Compare plans**, select the
  lower Base edition, and switch Annual Off so checkout shows flexible/monthly
  billing before accepting the Workspace trial. `QA-A03` remains pending.
- `2026-08-05` - The operator reached the Google Workspace **Discover**
  onboarding screen after signup. This confirms that Workspace onboarding has
  started, but the supplied screen does not evidence the selected billing plan,
  verified `neelvara.com` ownership, or completed Super Admin security. Keep
  `QA-A03` and `QA-A04` open until those checks are separately verified.
- `2026-08-05` - Google Admin Console now shows the `Neelvara Systems` tenant,
  one Workspace user, and an active no-cost trial. The console still requires
  `neelvara.com` verification by `2026-08-18`, so `QA-A03` remains open. A
  separate one-time prepayment notice is visible but is not the current action;
  complete domain verification before resolving paid-service billing. The
  supplied screen does not expose the user's address or MFA status, so `QA-A04`
  also remains open.
- `2026-08-05` - Workspace offered automatic GoDaddy DNS configuration through
  the third-party Entri authorization flow. Do not authorize that connection
  for this setup. Domain ownership requires only Google's verification TXT
  record, so use **Other verification options** and add the TXT record manually
  in GoDaddy for a smaller, directly auditable permission surface. `QA-A03`
  remains pending until Google confirms the manually published record.
- `2026-08-05` - Workspace displayed the manual primary TXT verification method
  and an alternative CNAME method. Use only the primary TXT method: add a new
  root-host TXT record in GoDaddy with Google's exact value and the lowest
  available TTL. Do not add the alternative CNAME, replace an existing TXT/SPF
  record, or store the verification value in this document. `QA-A03` remains
  pending until DNS resolves and Workspace confirms ownership.
- `2026-08-05` - The GoDaddy DNS screen for `neelvara.com` is open at **New
  Records**. Visible existing records include a GoDaddy WebsiteBuilder apex
  record, the `www` CNAME, and GoDaddy/SecureServer email-related CNAMEs. Do not
  edit or delete them during ownership verification. Add only the new Google
  TXT record now; capture the complete DNS zone later under `QA-A19` before
  Workspace MX or Vercel changes.
- `2026-08-05` - The Google root-host verification TXT record was saved in
  GoDaddy. A public DNS readback confirms the verification record resolves.
  `QA-A03` remains open only until Workspace accepts the record and reports the
  domain as verified. The same readback confirms legacy GoDaddy MX and SPF plus
  a `p=quarantine` DMARC policy; do not delete them during ownership
  verification. Replace them deliberately during `QA-A06` and `QA-A07` after
  the full `QA-A19` DNS export.
- `2026-08-05` - Google Workspace accepted the DNS verification record and
  displayed **Your domain is verified** for `neelvara.com`. `QA-A03` is
  complete. Do not activate Gmail or change MX records yet; first confirm and
  secure the signup-created break-glass Super Admin under `QA-A04`, then export
  the current `neelvara.com` DNS zone under `QA-A19`.
- `2026-08-05` - The operator chose a temporary one-user Workspace setup to
  avoid paying for a second user before MenuList QA is stable. Use only
  `admin@neelvara.com` during this QA bootstrap, after completing MFA/recovery
  under `QA-A04`. `QA-A05` is intentionally deferred and remains open; create a
  named daily operator before production operations and then stop using the
  Super Admin for routine work.
- `2026-08-05` - The Admin Console account switcher confirms the active managed
  account is exactly `admin@neelvara.com`. This satisfies the identity portion
  of `QA-A04`; keep the item open until account recovery and MFA are configured
  and recovery material is stored independently. The Admin Console still shows
  a stale domain-verification banner after the separate verification success;
  do not repeat verification solely because of that cached banner.
- `2026-08-05` - The signup-created generic admin account currently displays the
  founder's personal name. Change only this generic account's display name to
  `Neelvara Systems Admin` under `QA-A18` before production operations. Future
  named users keep their real human names; the Workspace organization remains
  `Neelvara Systems`.
- `2026-08-05` - The Google Account name fields are read-only because this is a
  managed Workspace identity. The display-name correction must be performed
  later from Admin Console -> Directory -> Users, so it is parked as
  non-blocking `QA-A18`. It does not delay MFA/recovery or the MenuList QA
  bootstrap.
- `2026-08-05` - Admin Console confirmed the managed user's name was updated to
  `Neelvara Systems Admin`; `QA-A18` is complete. The operator also reached the
  `admin@neelvara.com` 2-Step Verification screen. `QA-A04` remains open until
  an authenticator method is enrolled, 2-Step Verification is On, recovery is
  configured, and backup codes are stored independently without sharing them.
- `2026-08-05` - Scanning the authenticator QR with the iPhone Passwords code
  scanner displayed unrelated existing Google password entries and no
  `admin@neelvara.com` entry. Do not attach the verification code to another
  account and do not create an unnecessary duplicate password record solely to
  hold TOTP. Cancel that prompt and enroll `admin@neelvara.com` in a dedicated
  authenticator app; recovery codes remain the independent recovery path.
- `2026-08-05` - Google confirms an Authenticator was added to
  `admin@neelvara.com`. The page still displays **Turn on 2-Step Verification**,
  so enrollment alone has not enabled MFA. Keep `QA-A04` open until 2-Step
  Verification is explicitly On, backup codes are generated and stored
  independently, and account recovery is configured.
- `2026-08-05` - Google now reports **Your account is protected with 2-Step
  Verification** and shows the Authenticator as added for
  `admin@neelvara.com`. MFA is active. Keep `QA-A04` open only until fresh
  backup codes are generated and stored outside the active session, and the
  controlled recovery method is configured.
- `2026-08-05` - The operator confirmed fresh Google backup codes were generated
  and stored independently without sharing their values. The backup-code
  requirement of `QA-A04` is complete. Keep `QA-A04` open only until a
  long-lived controlled recovery phone or recovery email is added and verified
  for `admin@neelvara.com`.
- `2026-08-05` - The operator confirmed both a recovery phone and recovery email
  were added and verified for `admin@neelvara.com` without sharing either value.
  Together with the confirmed Authenticator, active 2-Step Verification, and
  independently stored backup codes, `QA-A04` is complete. `QA-A13` remains
  open for the later second-trusted-admin production requirement and final
  recovery-ownership record.
- `2026-08-05` - Before `QA-A19`, the operator asked whether to delete apparently
  unnecessary DNS records first. Decision: no cleanup before export. The current
  15-record zone is the rollback baseline and must be exported unchanged. Keep
  NS, SOA, `_domainconnect`, and Google's verification TXT. Replace GoDaddy mail
  MX/SPF/DKIM/bounce/DMARC records only during the controlled Workspace Gmail
  migration, and replace WebsiteBuilder apex/`www` records only during the later
  Neelvara Vercel connection.
- `2026-08-05` - A one-time Google recovery verification code appeared in a
  browser tab title in supplied evidence. Its value is not stored here. Because
  recovery was already confirmed, close that tab and treat the code as used and
  expired; if any verification is incomplete, request a new code rather than
  reusing the exposed one.
- `2026-08-05` - The operator confirmed the unchanged 15-record
  `neelvara.com` DNS zone was exported and stored privately before mail
  migration. `QA-A19` is complete. Gmail activation may now begin under
  `QA-A06`; do not delete or replace records until Google's activation flow
  presents the exact routing change.
- `2026-08-05` - Workspace Gmail activation now provides one root-host MX record
  (`smtp.google.com`, priority `1`) and the Workspace-only SPF value
  `v=spf1 include:_spf.google.com ~all`. Apply these in two verified steps: add
  the Google MX and remove only the two GoDaddy/SecureServer MX records, then
  edit the existing root SPF TXT record in place. Never publish a second SPF
  record. Leave GoDaddy DKIM/bounce CNAMEs and the existing DMARC record
  unchanged until Gmail routing is confirmed and the later `QA-A07` migration
  is ready. Do not click Workspace **Confirm** until public DNS readback passes.
- `2026-08-05` - The operator added the Workspace MX and removed both legacy
  GoDaddy MX records. Readback from both authoritative GoDaddy nameservers and
  public Google and Cloudflare resolvers confirms the only published MX is
  `smtp.google.com` at priority `1`. The root SPF record still authorizes only
  GoDaddy (`include:spf.em.secureserver.net`), so do not click Workspace
  **Confirm** yet. Edit that existing SPF record in place under `QA-A07`; never
  add a second SPF record. `QA-A06` remains open until Workspace accepts the
  activation and `admin@neelvara.com` passes send-and-receive testing.
- `2026-08-05` - The operator replaced the existing GoDaddy SPF record in place
  with `v=spf1 include:_spf.google.com ~all`. Readback from both authoritative
  GoDaddy nameservers and public Google and Cloudflare resolvers confirms
  exactly one root-host SPF record and the Workspace value. No second SPF
  record was introduced. Workspace Gmail activation may now be confirmed;
  `QA-A06` remains open until Google accepts it and two-way mailbox testing
  passes. DKIM and the controlled monitor-only DMARC migration remain pending
  under `QA-A07`.
- `2026-08-05` - Google Workspace displayed **Gmail is activated** and **Gmail
  is now ready** for verified domain `neelvara.com`. This confirms Workspace
  accepted the published MX and mail routing configuration. Keep the one-user
  QA bootstrap; do not create additional users or aliases during this step.
  `QA-A06` remains open only until `admin@neelvara.com` successfully sends to
  and receives from an external mailbox. Google's optional import and premium
  feature steps are not required. DKIM remains the next authentication task
  under `QA-A07` after delivery testing.
- `2026-08-05` - The first outbound test from `admin@neelvara.com` reached the
  external Gmail account but was placed in Spam. This proves outbound routing,
  not acceptable inbox placement, and does not complete `QA-A06`. DNS readback
  confirms the Google-only SPF value is published, no Google DKIM record is
  present at the default selector, and the inherited GoDaddy DMARC record still
  uses `p=quarantine` with a GoDaddy report recipient. Open Google's
  **Authenticate outgoing emails** flow next and use only the exact selector
  and value Google generates. Do not guess a DKIM value, weaken DMARC, or mark
  the test complete before DKIM activation and a fresh two-way test.
- `2026-08-05` - Workspace generated a 2048-bit DKIM public key with selector
  `google`, requiring a TXT record at `google._domainkey.neelvara.com`. Do not
  transcribe or persist the long public-key value in this runbook; use the
  Workspace copy control and paste it directly into GoDaddy. This is an
  additive TXT record and does not conflict with the existing GoDaddy
  `sable.cloud._domainkey` or `sable.cloud2._domainkey` CNAME records. Do not
  delete those legacy records or click Workspace **Confirm** until authoritative
  and public DNS readback proves the new Google selector resolves exactly.
- `2026-08-05` - The operator published the Google DKIM TXT record. Readback
  from both authoritative GoDaddy nameservers and public Google and Cloudflare
  resolvers returns the same structurally valid 408-character DKIM value at
  `google._domainkey.neelvara.com`. The full public key is intentionally not
  duplicated in this runbook. Workspace may now validate the record and start
  DKIM authentication. Keep `QA-A07` open until Google confirms activation and
  a fresh outbound message proves `DKIM=PASS`; DMARC migration remains pending.
- `2026-08-05` - The operator confirmed Google Workspace accepted the published
  key and activated DKIM authentication for `neelvara.com`. This completes the
  provider activation step but not the evidence gate: send a completely new
  message after activation and inspect the receiving mailbox's original-message
  authentication summary for `SPF=PASS`, `DKIM=PASS`, and `DMARC=PASS`. Do not
  reuse the pre-activation message because it cannot prove current signing.
  `QA-A06` remains open for fresh inbox placement plus inbound reply testing;
  `QA-A07` remains open for header proof and controlled DMARC replacement.
- `2026-08-05` - A fresh post-activation message from
  `admin@neelvara.com` reached the external Gmail Inbox, and Gmail's original
  message summary reported `SPF=PASS`, `DKIM=PASS`, and `DMARC=PASS`. This
  proves outbound delivery, inbox placement for the test, Google DKIM signing,
  and current-domain alignment. `QA-A06` remains open only for an inbound reply
  from the external mailbox. `QA-A07` remains open because the inherited
  GoDaddy DMARC reporting destination and enforcement policy still need the
  planned controlled replacement; do not mistake a passing message for the
  final DNS governance state.
- `2026-08-05` - The external mailbox replied to the authenticated test, and
  the reply arrived in the `admin@neelvara.com` Inbox. Together with the
  verified outbound Inbox delivery and authentication results, this completes
  `QA-A06`. During the one-user QA bootstrap, create provider-notice addresses
  as aliases on this mailbox rather than additional paid users. Complete
  `QA-A08` before replacing DMARC so `dmarc@neelvara.com` can receive reports.
- `2026-08-05` - Admin Console evidence confirms `billing@neelvara.com`,
  `security@neelvara.com`, and `dmarc@neelvara.com` were added as alternative
  email addresses on the existing `admin@neelvara.com` user. No additional
  user or Workspace licence was created. Keep `QA-A08` open until an external
  mailbox sends a separate test to each alias and all three arrive in the admin
  Inbox. Do not publish `rua=mailto:dmarc@neelvara.com` before that delivery
  test proves the report recipient works.
- `2026-08-05` - Three separate external messages addressed to
  `billing@neelvara.com`, `security@neelvara.com`, and
  `dmarc@neelvara.com` all arrived in the `admin@neelvara.com` Inbox. This
  completes `QA-A08` and proves the dedicated DMARC report recipient works as
  an alias without another paid Workspace user. The existing `_dmarc` TXT
  record may now be edited in place to the documented monitor-only Neelvara
  value. Never add a second DMARC record.
- `2026-08-05` - The operator replaced the inherited GoDaddy `_dmarc` TXT
  record in place. Both authoritative GoDaddy nameservers and Google Public DNS
  now return exactly `v=DMARC1; p=none; rua=mailto:dmarc@neelvara.com`.
  Cloudflare DNS timed out during the final read rather than returning a
  conflicting value; authoritative agreement is the controlling evidence.
  Keep `QA-A07` open for removal of only the four now-unused GoDaddy email
  CNAMEs: `bounces.cloud.em`, `bounces.cloud2.em`,
  `sable.cloud._domainkey`, and `sable.cloud2._domainkey`. Do not remove
  Workspace DKIM, website, nameserver, SOA, verification, or `_domainconnect`
  records.
- `2026-08-05` - The operator reported deleting all four obsolete GoDaddy mail
  CNAMEs. Authoritative DNS readback confirms `bounces.cloud.em`,
  `sable.cloud._domainkey`, and `sable.cloud2._domainkey` are absent, while
  `bounces.cloud2.em` still resolves to
  `cbounces.cloud2.em.secureserver.net` from both GoDaddy nameservers over
  direct TCP. Required Google MX, SPF, 408-character DKIM, DMARC, and ownership
  verification records remain intact. Do not close `QA-A07`; refresh GoDaddy
  DNS and remove only the remaining `bounces.cloud2.em` CNAME.
- `2026-08-05` - The operator removed the remaining `bounces.cloud2.em`
  CNAME. After brief GoDaddy nameserver propagation, direct readback from both
  authoritative servers confirms all four obsolete GoDaddy email CNAMEs are
  absent. The required Workspace records remain intact: one Google MX, one
  Google SPF record, the 408-character Google DKIM key, monitor-only Neelvara
  DMARC, and the Google ownership-verification TXT record. Together with the
  passing post-DKIM message headers and two-way delivery tests, this completes
  `QA-A07`.
- `2026-08-05` - Local repository evidence confirms `origin` is the existing
  `git@github.com:menulist-ai/menulist-core.git`, the active local branch is
  `staging`, the remote `staging` branch exists, and the current SSH key
  authenticates to GitHub as `menulist-ai`. This records the source state only;
  the owner decision immediately below supersedes the provisional instruction
  to retain that account. Never rewrite existing Git history.
- `2026-08-05` - Owner decision supersedes the earlier existing-account Vercel
  assumption. Create a fresh founder GitHub account using
  `admin@neelvara.com`, create the `neelvara-systems` organization, and move
  the existing repository with GitHub's native transfer; never copy files into
  a replacement repository. Create a fresh Neelvara Vercel account and one
  fresh shared project after the GitHub transfer. Do not transfer the old
  Vercel project, deployments, history, settings, or environment values. Before
  touching Vercel, finish the GitHub phase end to end: create and secure the new
  founder account, create the organization, add and independently test a new
  local SSH key, natively transfer the repository, update and verify the local
  remote and repo-local author identity, and then retire the old GitHub key.
  Before deleting the old Vercel account, confirm phone-number release with Vercel,
  record only domain assignments and environment-variable names/provider
  ownership, revoke or rotate every referenced credential at its source,
  remove custom domains, cancel paid subscriptions, and then delete the old
  project/team/account. Build new local and Vercel env values only from the
  maintained repo templates and newly created QA credentials.
- `2026-08-06` - The operator confirmed that the fresh company-admin GitHub
  account was created with `admin@neelvara.com` and that GitHub verified the
  email address. This completes the account/email portion of `QA-A09` only.
  Keep `QA-A09` open until GitHub MFA and independent recovery are configured,
  the `neelvara-systems` organization exists, and the repository is natively
  transferred with branch `staging` preserved. Keep `QA-A21` open until the new
  workstation SSH key, remote URL, repo-local author identity, authenticated
  fetch, and old-key retirement are all verified.
- `2026-08-06` - GitHub displayed that two-factor authentication is enabled
  using the founder account's authenticator app, and the operator confirmed its
  recovery codes are stored independently. The founder-account security portion
  of `QA-A09` is complete. Keep `QA-A09` open for organization creation and the
  native repository transfer; keep portfolio-wide `QA-A11` open until every
  required provider account has MFA and recoverable ownership.
- `2026-08-06` - The operator confirmed a passkey was added to the fresh founder
  GitHub account while authenticator 2FA remained enabled. The passkey is an
  additional phishing-resistant method; independently stored recovery codes
  remain the separate recovery path. Keep `QA-A09` open for creation of the
  empty `neelvara-systems` organization and native repository transfer.
- `2026-08-06` - The operator created the empty `neelvara-systems`
  organization with `neelvara-admin` as its sole owner. The non-personal
  username and blank personal-profile name are an intentional privacy decision;
  do not restore the superseded `dnyaneshwar-garudkar` username or require the
  founder's personal name on the public profile. Future repository-local commit
  identity will use `Neelvara Systems` and GitHub's exact noreply address for
  `neelvara-admin`. Keep `QA-A09` open until organization authentication policy
  is secured and the existing repository is natively transferred.
- `2026-08-06` - The operator confirmed the `neelvara-systems` organization now
  requires 2FA for everyone and permits only secure two-factor methods. The
  organization-security portion of `QA-A09` is complete. Keep `QA-A09` open for
  native repository transfer and keep `QA-A21` open for the controlled local
  SSH, remote, author-identity, fetch, and old-key retirement sequence.
- `2026-08-06` - The pre-migration workstation audit confirms the existing
  `~/.ssh/id_ed25519` public key is the old MenuList credential and direct
  `ssh -T git@github.com` still authenticates as `menulist-ai`. The local
  repository remains on branch `staging` with `origin` set to
  `git@github.com:menulist-ai/menulist-core.git`. It has no repository-local Git
  author override; the current global identity is `menulist-ai` with the old
  Gmail address. Do not overwrite or retire the old key yet. Generate the new
  Neelvara key at the distinct path
  `~/.ssh/id_ed25519_neelvara_github`, test it independently, and change the
  remote and repository-local author identity only after native transfer.
- `2026-08-06` - The dedicated Neelvara Ed25519 keypair now exists at
  `~/.ssh/id_ed25519_neelvara_github` and `.pub`. Local inspection confirms
  private/public permissions of `600`/`644`, public-key comment
  `admin@neelvara.com`, and new fingerprint
  `SHA256:thxwveyLfjX2a/fKfG0EJhiD92yq3Pdk4dtgQp6ANzI`. The old key remains
  unchanged with its distinct fingerprint. Only the new public key was copied
  to the macOS clipboard; keep `QA-A21` open until GitHub registration,
  independent authentication, remote migration, fetch proof, and old-key
  retirement all pass.
- `2026-08-06` - GitHub's public API for `neelvara-admin` reports the registered
  authentication-key fingerprint
  `SHA256:thxwveyLfjX2a/fKfG0EJhiD92yq3Pdk4dtgQp6ANzI`, exactly matching the
  dedicated local Neelvara public key. This proves correct public-key
  registration without exposing private-key contents. Keep `QA-A21` open until
  the passphrase-protected key is loaded through macOS Keychain, independently
  authenticates as `neelvara-admin`, and the post-transfer migration finishes.
- `2026-08-06` - The passphrase-protected Neelvara key is loaded in the macOS
  SSH agent/Keychain, and a forced `IdentitiesOnly=yes` authentication test
  returned `Hi neelvara-admin`. The old key remains separately usable for the
  source repository. Source readback records public repository
  `menulist-ai/menulist-core`, default branch `main`, remote branches `main` and
  `staging`, and zero tags. GitHub requires the initiating owner to have
  repository-creation permission in a target organization, so do not invite
  the retiring `menulist-ai` account into `neelvara-systems`. Use two native
  transfers instead: first `menulist-ai/menulist-core` to personal account
  `neelvara-admin` and accept it within GitHub's one-day window, then transfer
  `neelvara-admin/menulist-core` into `neelvara-systems`. Remove the old account
  as collaborator only after final ref and settings verification.
- `2026-08-06` - The operator initiated GitHub's first native transfer from
  `menulist-ai/menulist-core` to personal account
  `neelvara-admin/menulist-core`. Keep `QA-A09` open: the company-admin account
  must accept the transfer within GitHub's one-day window, verify the
  intermediate repository, and then initiate the second native transfer to
  `neelvara-systems`. Do not change the local remote or retire either key while
  the first transfer is pending.
- `2026-08-06` - The company-admin account accepted the first transfer and
  GitHub completed the intermediate move to `neelvara-admin/menulist-core`.
  Public API and forced new-key Git readback confirm owner `neelvara-admin`,
  public/active status, default branch `main`, source-matching `main` commit
  `2efe5cf8200c39d7d3d1b7b5f2658c9a3b434151`, source-matching `staging` commit
  `8df6d973c2c5a7bac88d806bc1dfb9e841bf5f27`, and the old URL redirecting to
  the intermediate repository. Keep `QA-A09` open for the second native
  transfer and final organization-level readback. Keep the local remote on the
  old URL until the final organization repository is verified.
- `2026-08-06` - GitHub completed the second native transfer to
  `neelvara-systems/menulist-core`. Public API readback confirms organization
  owner `neelvara-systems`, public/active status, default branch `main`,
  source-matching `main` commit
  `2efe5cf8200c39d7d3d1b7b5f2658c9a3b434151`, source-matching `staging`
  commit `8df6d973c2c5a7bac88d806bc1dfb9e841bf5f27`, exactly one repository in the
  new organization, and both former repository URLs redirecting to the final
  organization repository. Keep `QA-A09` open only through post-transfer
  access cleanup. Proceed with the controlled local migration under `QA-A21`.
- `2026-08-06` - The workstation now routes `github.com` through the dedicated
  `~/.ssh/id_ed25519_neelvara_github` key with `IdentitiesOnly=yes`. Default
  `ssh -T git@github.com` authenticates as `neelvara-admin`; local `origin` is
  `git@github.com:neelvara-systems/menulist-core.git`; authenticated fetch and
  remote-ref readback return the preserved `main` and `staging` commits. This
  repository now overrides the old global author identity with repo-local
  `Neelvara Systems` and GitHub's ID-based private noreply address for
  `neelvara-admin`. Keep `QA-A21` open only until the retiring account's old
  GitHub SSH key is removed from GitHub and unloaded/retired locally after
  collaborator cleanup.
- `2026-08-06` - Final repository access readback shows no `menulist-ai`
  collaborator or outside-collaborator entry. The sole listed entity is
  `neelvara-admin`, identified by GitHub as owner of `neelvara-systems`; its
  access must remain. This completes the native-transfer and post-transfer
  access-cleanup requirements in `QA-A09`. Keep `QA-A21` open only for retiring
  the old `menulist-ai` SSH credential from GitHub and the workstation.
- `2026-08-06` - The operator removed the old `menulist-ai` SSH key. GitHub's
  public-key API now returns no keys for that account. Workstation readback
  confirms only the Neelvara key is loaded in the SSH agent, `~/.ssh/config`
  references only `~/.ssh/id_ed25519_neelvara_github`, and no active Git config
  references the old key or old repository URL. The revoked local
  `~/.ssh/id_ed25519` and `.pub` files remain pending explicit deletion; keep
  `QA-A21` open until they are removed and final authentication/fetch proof is
  repeated.
- `2026-08-06` - With explicit operator authorization, the revoked local
  `~/.ssh/id_ed25519` and `.pub` files were deleted. Final proof confirms the
  dedicated Neelvara keypair remains intact, it is the only key loaded in the
  SSH agent, default GitHub SSH authentication returns `neelvara-admin`,
  authenticated fetch succeeds, `origin` targets
  `neelvara-systems/menulist-core`, `main` and `staging` retain their verified
  commits, and the repository-local author identity remains `Neelvara Systems`
  with the ID-based GitHub noreply address. This completes `QA-A21`.
- `2026-08-06` - The operator reported that the old Vercel project was deleted,
  its custom domains were released, its environment entries were deleted, and
  the old Vercel account was then permanently deleted. This establishes the
  Vercel-side deletion portion of `QA-A20`, but the account was deleted before
  Support confirmed phone-number reuse and before an old env-key/provider-name
  inventory was preserved. Keep `QA-A20` open until the phone number works on
  the fresh account and old provider credentials are reconstructed from
  repository/local key-name evidence and revoked or rotated at each issuing
  provider. Never copy any surviving old value into the fresh project.
- `2026-08-06` - Fresh Vercel onboarding created the `Neelvara Systems` Pro team
  under the new GitHub-backed account and reached the empty **New Project**
  screen. No repository has been imported and no environment value has been
  added. Keep `QA-A10` open until account security is complete, the GitHub App
  is restricted to `neelvara-systems/menulist-core`, and exactly one project is
  created without deploying incomplete configuration. Signup did not present a
  phone-number challenge, so do not treat phone reuse as independently proven
  yet under `QA-A20`.
- `2026-08-06` - The operator confirmed the fresh Vercel owner account now has
  authenticator-app 2FA, independently stored recovery codes, and a passkey.
  The account email is `admin@neelvara.com` and its connected GitHub sign-in is
  `neelvara-admin`. This completes Vercel owner-account authentication setup;
  keep portfolio-wide `QA-A11` open for later providers and keep `QA-A10` open
  until the GitHub App and single project are configured.
- `2026-08-06` - The operator authorized the Vercel GitHub App for the
  `neelvara-systems` organization with access restricted to the sole selected
  repository `menulist-core`. No broader organization-repository access was
  granted. Keep `QA-A10` open until the one shared `menulist-core` Vercel project
  is created and its Git/branch settings are verified; do not trigger the first
  deployment before required QA configuration is ready.
- `2026-08-06` - Vercel's import configuration correctly shows team
  `Neelvara Systems` on Pro, source `neelvara-systems/menulist-core`, project
  name `menulist-core`, Next.js preset, and root directory `./`. The source is
  currently the repository default branch `main`; **Deploy** was deliberately
  not clicked because it would start an incomplete first deployment before the
  QA environment and Firebase gates are ready. Keep this configuration pending
  and continue with the company Cloud/Firebase setup.
- `2026-08-06` - Google Cloud Resource Manager was opened with the managed
  account `admin@neelvara.com`. The resource list currently shows **No results
  to display**, while the unused Google Cloud `$300` free-trial offer is
  available. This does not complete `QA-A14`: the `neelvara.com` organization
  has not yet been visibly read back. Continue through the free-trial/Cloud
  terms flow using truthful current payer details, then verify the organization
  before creating `menulist-qa`.
- `2026-08-06` - The Google Cloud onboarding flow created the `neelvara.com`
  organization and visibly confirmed that `admin@neelvara.com` received the
  Organization Administrator role. Google also automatically created the
  bootstrap project `vocal-partition-504716-r3` with display name **My First
  Project**. Do not convert or reuse that project for Firebase: `menulist-qa`
  remains the required immutable QA project id. The operator configured
  autopay, but the console still reports that free-trial prepayment is pending;
  billing activation must be read back before another payment or project
  operation. Retire the empty bootstrap project after billing is confirmed.
- `2026-08-06` - Billing account management shows one direct billing account
  under `neelvara.com`, zero spend, status **Closed**, and four health-check
  recommendations. Autopay authorization is therefore recorded as configured
  but not as proof of active Cloud Billing. Do not create a duplicate billing
  account or repeat payment blindly; inspect the account's health checks and
  resolve the stated activation/prepayment requirement first. `QA-BILL01`
  remains pending.
- `2026-08-06` - Billing Health Checks confirms that its four warnings are
  governance recommendations: create budget alerts, add a billing viewer, add
  another billing administrator, and remove the domain-wide Billing Account
  Creator role. They are not the activation error. The persistent banner states
  that this postpay free trial requires a one-time prepayment. Budget setup is
  tracked in `QA-BILL02`; viewer/second-admin access remains deferred with the
  one-user bootstrap; domain-wide billing-account creation cleanup is tracked
  in `QA-BILL09` after the selected account is active.
- `2026-08-06` - The billing **How you pay** page confirms a postpay account,
  zero balance, a configured primary payment method, no transactions, and a
  red **There are issues with your payments account** panel. It does not yet
  display the one-time prepayment amount. The visible payment threshold is the
  later postpay charging threshold and must not be mistaken for the activation
  prepayment. Inspect the issue details before submitting a payment.
- `2026-08-06` - Expanded payment issues now state the exact activation gates:
  a one-time prepayment of at least INR 1,000 and completion of India tax
  information. No payment has been submitted yet. Because Neelvara Systems is
  currently an operating trade name without a registered company/GST identity,
  do not invent a GSTIN, registered-business status, or legal entity. Inspect
  the available tax-profile choices first and complete `QA-BILL08` truthfully
  before paying.
- `2026-08-06` - The India tax form is open without submitted data. Step 1 asks
  for **Entity type** and shows TAN and CIN as optional; Step 2 covers PAN and
  GSTIN. No entity type, tax identifier, or document has been selected or
  entered. Inspect the available Entity type values before choosing the option
  that truthfully matches the current payer.
- `2026-08-06` - The Entity type list contains only Embassy, Government,
  Government authority, Local authority, Organisation, SEZ, and UN
  organisation. It has no Individual option. None truthfully matches the
  current unregistered Neelvara setup, so no option or tax identifier was
  submitted. Treat the current Google payments profile as incorrectly typed
  and do not use it for the activation prepayment until the supported profile
  correction path is confirmed.
- `2026-08-06` - Temporary payer decision: until the CA-guided Neelvara legal
  and banking setup is ready, the founder will use a personal payment method
  for required provider charges under a truthfully typed individual payments
  profile. Do not record the UPI identifier or other payment details in this
  repository. After the Neelvara legal entity and its approved bank account
  are ready, create or select a correctly typed business payments profile,
  migrate provider billing deliberately, verify every active subscription and
  cloud project, and then remove the temporary personal method. This decision
  does not authorize payment through the currently mismatched Google profile.
- `2026-08-06` - Google Cloud Payment settings confirms the current linked
  payments profile has account type **Organisation**. No displayed address,
  payment-account identifier, payments-profile identifier, phone number, or
  payment method is recorded in this repository. Google Cloud documents that
  the linked payments profile and its account type cannot be changed on an
  existing Cloud Billing account. The supported correction is to create a new
  self-serve Cloud Billing account, create or select a truthfully typed
  **Individual** payments profile during that flow, and leave the current
  mismatched account unused. Do not submit its prepayment or India tax form.
- `2026-08-06` - Returned to Billing account management under the
  `neelvara.com` organization. The mismatched billing account remains closed
  with zero spend, and **Create account** is available. No replacement account
  has been created yet.
- `2026-08-06` - The payment method/autopay authorization on the closed,
  mismatched billing account does not migrate to a replacement Cloud Billing
  account. Leave the old payments profile untouched while creating and
  validating the replacement so recovery remains possible. After the new
  Individual billing account is active and every linked Google service is
  inventoried, remove the old payment method or close the old payments profile
  only if it has no other subscriptions or services. The old Cloud Billing
  account itself remains retained by Google for reporting and auditing.
- `2026-08-06` - Operator confirmed the existing personal UPI autopay mandate
  was left unchanged. No cancellation, new payment, or prepayment was
  submitted on the old Organisation profile.
- `2026-08-06` - The replacement Cloud Billing account form is open with
  organization `neelvara.com`, country India, and currency INR. These values
  are correct. The billing-account display name will identify it as temporary;
  no account has been created or payment submitted yet. This temporary
  Individual billing account may fund both the `menulist-qa` project and the
  `menulist` production project's pre-launch setup/testing while the
  CA-approved Neelvara legal payer and bank account are pending. Keep project
  budgets, alerts, usage reporting, and credentials separate. Do not treat the
  temporary payer as approval for unrestricted live-production spend. When the
  official business payments profile and Cloud Billing account are ready,
  relink both projects deliberately, verify service continuity, and retire the
  temporary payment path.
- `2026-08-06` - Replacement billing-account display name entered as
  `Neelvara Cloud Billing - Temporary`. Organization remains `neelvara.com`,
  country remains India, and currency remains INR. The form has not yet been
  continued or submitted.
- `2026-08-06` - The replacement billing-profile step initially preselects the
  existing `Neelvara Systems` Organisation payments profile and its existing
  payment method. The screen explicitly states that this profile is also used
  with Google Workspace. Therefore, do not close that payments profile or
  cancel its autopay mandate while Workspace depends on it. Do not submit the
  replacement Cloud Billing account with the preselected Organisation profile;
  use **Change** under Contact information to create or select a separate,
  truthfully typed Individual profile. No payment details or profile/account
  identifiers are recorded here.
- `2026-08-06` - The Contact information profile selector shows only the
  existing Organisation profile plus **Add name and address**; no existing
  Individual profile is available. Use **Add name and address** to begin the
  separate Individual profile flow. The existing profile remains selected and
  no replacement profile or billing submission has occurred yet.
- `2026-08-06` - The new contact-profile form opened with **This is for an
  organisation** selected by default. This default must be cleared before any
  personal legal name or address is entered so the new payments profile is
  created as Individual. No contact details have been submitted.
- `2026-08-06` - **This is for an organisation** was cleared. The form now
  states that the account is solely for the payer's personal trade, craft, or
  profession and does not represent a registered business or nonprofit. This
  matches the temporary legal-payer decision. The automatically suggested
  Workspace display name must be replaced with the payer's exact personal
  legal/KYC name; no legal name or address is recorded in this repository.
- `2026-08-06` - Operator confirmed the Individual profile's Legal name was
  corrected to the exact personal KYC name. The value itself is intentionally
  not recorded. The profile remains unsaved and no billing submission or
  payment has occurred.
- `2026-08-06` - Operator confirmed all required Individual address fields were
  completed using personal KYC/billing information. No address value is
  recorded in this repository. The contact profile remains unsaved and Cloud
  Billing has not been submitted or enabled.
- `2026-08-06` - Operator confirmed the new contact profile was saved. Personal
  name and address values remain intentionally unrecorded. Before changing the
  payment method or enabling billing, visually confirm that the selected
  Contact information card is labelled Individual rather than Organisation.
- `2026-08-06` - Operator visually confirmed the selected Contact information
  card is labelled **Individual**, not Organisation. `QA-BILL08` remains open
  until the new Cloud Billing account is enabled and its saved profile type is
  read back from Payment settings. No payment has been submitted.
- `2026-08-06` - The Payment method selector for the new Individual profile is
  open. No method has been selected, authorized, or submitted in this step;
  payment identifiers and mandate details must not be copied into the setup
  record.
- `2026-08-06` - The selector offers **Add credit or debit card** and **Pay by
  UPI QR code**. For the temporary Individual payer path, select the UPI QR
  option so Google can establish the payment method for this new billing flow.
  Do not cancel or alter the separate Organisation/Workspace profile's existing
  mandate, and do not record any UPI, QR, bank, phone, or mandate details here.
- `2026-08-06` - Operator selected **Pay by UPI QR code** for the new Individual
  payments profile. The billing setup page now shows the Individual contact
  profile and UPI QR method together, with **Submit and enable billing** as the
  next action. No UPI authorization, mandate approval, or billing enablement has
  occurred yet; personal profile identifiers remain intentionally unrecorded.
- `2026-08-06` - Operator clicked **Submit and enable billing** and reached the
  **Scan QR code to use UPI** screen. A QR code is displayed, but it and all
  associated payment or mandate details remain intentionally unrecorded. No UPI
  approval or confirmed billing activation has occurred yet.
- `2026-08-06` - Operator scanned the Google billing QR code and confirmed that
  the UPI authorization screen opened. Approval remains pending. Merchant,
  amount, UPI, bank, mandate, and authorization details are intentionally not
  recorded in this repository.
- `2026-08-06` - Operator reviewed the UPI authorization request and confirmed
  that its merchant and authorization terms match the intended Google Cloud
  billing setup. Approval and confirmed Cloud Billing activation remain
  pending; no payment details are recorded.
- `2026-08-06` - Operator approved the verified request in the UPI app and
  confirmed that UPI authorization succeeded. Transaction, bank, UPI, mandate,
  and authorization identifiers remain intentionally unrecorded. Cloud Billing
  activation still requires confirmation from the Google Cloud browser flow.
- `2026-08-06` - Google accepted the UPI authorization and displayed a
  **One-time prepayment required** confirmation. The temporary Cloud Billing
  account and free trial will become active only after that refundable
  prepayment is credited. The modal currently exposes only an **OK** action;
  payment and transaction details remain intentionally unrecorded.
- `2026-08-06` - After UPI authorization and acknowledgement of the required
  prepayment notice, Google redirected to the temporary billing account Overview
  and labelled it **Paid account**, with zero reported Cloud usage cost. Later
  Account management evidence confirms that **Paid account** is a billing
  classification, not proof of active/good-standing status. Billing activation
  was not established by this screen. `QA-BILL08` remained open at this point
  until Payment settings confirmed the saved profile type was Individual.
- `2026-08-06` - Operator opened **Payment settings** for the active temporary
  billing account. Saved account-type readback is pending; payments profile and
  billing identifiers remain intentionally unrecorded.
- `2026-08-06` - Google accepted the billing submission and presented its
  provider-required one-time prepayment step. The free trial and associated
  credits remain inactive until that prepayment is credited. The prepayment
  amount and all transaction details are intentionally unrecorded; `QA-BILL08`
  remains open until activation and Individual profile read-back are verified.
- `2026-08-06` - Payment settings read-back confirms the active temporary
  payments profile's account type is **Individual**. The legal payer and country
  were entered from current personal KYC truth, no unregistered entity or tax
  details were invented, and the later migration to CA-approved Neelvara
  company billing is recorded above. `QA-BILL08` is complete.
- `2026-08-06` - Resource Manager now shows the `neelvara.com` organization and
  only the unwanted automatic **My First Project** bootstrap project beneath it,
  with zero reported charges. The project remains active and unselected;
  `QA-C00` is still pending until shutdown is confirmed.
- `2026-08-06` - Operator selected the unwanted **My First Project** row in
  Resource Manager. No deletion request has been submitted; the confirmation
  dialog and final project-identity check remain pending.
- `2026-08-06` - Operator opened the project shutdown confirmation dialog. No
  project identifier has been entered and no shutdown request has been
  submitted; final target verification remains pending.
- `2026-08-06` - Operator verified that the shutdown dialog targets **My First
  Project** with the exact unwanted bootstrap project ID recorded in `QA-C00`.
  No identifier has been entered and no shutdown request has been submitted.
- `2026-08-06` - Operator entered the verified bootstrap project ID in the
  shutdown confirmation field and confirmed that the final shutdown control is
  enabled. The shutdown request has not yet been submitted.
- `2026-08-06` - Google confirmed that **My First Project** is shut down and
  pending deletion, scheduled for final deletion after the provider recovery
  window. The active resource list now contains only the `neelvara.com`
  organization. `QA-C00` is complete; the project must not be restored or
  reused.
- `2026-08-06` - Operator dismissed the pending-deletion confirmation and
  returned to the active Resource Manager list. The retired bootstrap project
  remains absent from active resources.
- `2026-08-06` - Firebase Console is open under the Neelvara administrator
  account and shows the first-project welcome screen with no existing Firebase
  projects. No new project has been created; `QA-C01` remains pending until the
  exact `menulist-qa` project ID is accepted by the creation flow.
- `2026-08-06` - The Firebase project form displays exact project name and
  generated project ID `menulist-qa` without an availability error. **Continue**
  remains disabled because no parent resource is selected. Project creation has
  not been submitted; `neelvara.com` must be selected as the parent first.
- `2026-08-06` - The Firebase parent-resource selector is open and shows
  `neelvara.com` as the available organization. No parent has been selected and
  project creation remains unsubmitted.
- `2026-08-06` - Operator selected `neelvara.com` as the parent resource. The
  form shows exact project ID `menulist-qa`, the Firebase terms are accepted,
  and **Continue** is enabled. `QA-C01` is complete. The optional Google
  Developer Programme enrollment remains enabled and must be turned off before
  continuing; project creation is still unsubmitted.
- `2026-08-06` - Operator disabled the optional Google Developer Programme
  enrollment. The form still shows exact project ID `menulist-qa`, parent
  `neelvara.com`, accepted Firebase terms, and enabled **Continue**. Project
  creation remains unsubmitted.
- `2026-08-06` - The Firebase Google Analytics step is open with Analytics
  enabled by default. The setup contract enables GA4 only after an explicit
  product decision; none is recorded for this QA project. Disable this option
  before project creation. It can be configured later through the governed,
  consent-aware analytics path if separately approved.
- `2026-08-06` - Operator disabled Firebase Google Analytics for `menulist-qa`.
  The exact project ID and organization parent remain verified, optional
  Developer Programme enrollment is disabled, and project creation remains
  unsubmitted.
- `2026-08-06` - Firebase created exact project `menulist-qa` and opened its
  canonical project overview under the selected `neelvara.com` parent. The
  project currently uses the no-cost Spark plan and has no app or paid service
  configured. `QA-C02` and `QA-C03` are complete; actual billing linkage remains
  pending in `QA-BILL01`.
- `2026-08-06` - The Firebase pricing selector is open. Spark remains the
  current plan, and Blaze is presented as the pay-as-you-go plan required to use
  additional Google Cloud services. No plan selection or billing linkage has
  been submitted.
- `2026-08-06` - After selecting Blaze, Firebase's billing-account step reports
  no available Cloud Billing Account and offers to create another. This
  conflicts with the already verified active temporary account, so do not create
  a duplicate. Close this flow and link `menulist-qa` from the existing Google
  Cloud Billing account instead. `QA-BILL01` remains pending.
- `2026-08-06` - Operator closed the Firebase billing dialog without creating a
  duplicate account. `menulist-qa` remains on Spark and no billing linkage or
  plan change has occurred.
- `2026-08-06` - Operator returned to the active temporary Google Cloud Billing
  account on **Payment settings**. `menulist-qa` remains unlinked; navigation to
  billing Account management is next.
- `2026-08-06` - Billing **Account management** is authoritative and reports the
  temporary billing account as **Closed**, with no linked projects, despite the
  earlier Overview label **Paid account**. This closed state explains why
  Firebase could not list the account. Do not create another account; reopen
  this verified temporary account, then link `menulist-qa`. `QA-BILL01` remains
  pending.
- `2026-08-06` - The **Reopen billing account** control is disabled. Its tooltip
  states that the account cannot be reopened because it is not in good standing.
  This supersedes the attempted reopen path: inspect and resolve the provider's
  outstanding payment/prepayment condition before retrying. No duplicate Cloud
  Billing account may be created.
- `2026-08-06` - Billing Overview still displays **Paid account**, confirming
  that this label is plan/account classification rather than operational status.
  Account management remains authoritative for the closed/not-in-good-standing
  state. Inspect **How you pay** next for the actionable provider condition.
- `2026-08-06` - **How you pay** confirms the unresolved conditions: the
  provider-required one-time prepayment is still unpaid, there are no
  transactions, and **Pay now** is available. Google also separately requests
  India tax information. The earlier UPI authorization added the payment method
  but did not make the prepayment. Resolve **Pay now** first; payment, tax, and
  transaction details remain intentionally unrecorded.
- `2026-08-06` - Operator opened **Pay now**. The prepayment dialog shows the
  existing UPI QR method and has the provider-required minimum prepayment option
  selected. No payment has been submitted or approved; amounts and payment
  identifiers remain intentionally unrecorded.
- `2026-08-06` - Operator continued to Google's final **Review your payment**
  screen for the existing temporary Cloud Billing account and UPI QR method.
  The final **Pay now** action is visible, but no payment has been initiated;
  amount, billing, and payment identifiers remain intentionally unrecorded.
- `2026-08-06` - Operator verified that the final prepayment review targets the
  intended temporary Cloud Billing account, uses UPI QR, and requests only the
  provider-required minimum. The final payment remains uninitiated; no payment
  details are recorded.
- `2026-08-06` - Operator clicked the verified **Pay now** action and Google
  displayed the prepayment UPI QR code. The QR and all payment identifiers are
  intentionally unrecorded. No UPI payment approval has occurred yet.
- `2026-08-06` - Operator scanned the prepayment QR and confirmed that the UPI
  authorization screen opened. Approval remains pending; bank, UPI, amount,
  merchant identifier, and transaction details are intentionally unrecorded.
- `2026-08-06` - Operator verified that the UPI prepayment request references
  Google and matches the reviewed provider-required minimum. Payment approval
  and confirmed billing-account restoration remain pending; no payment details
  are recorded.
- `2026-08-06` - Google confirmed the prepayment was successful. **How you pay**
  now shows an account credit and the last manual payment, while the previous
  prepayment activation warning is absent. India tax information remains a
  separate provider request. Payment amounts, identifiers, and transaction
  details are intentionally unrecorded; Account management must still confirm
  that the billing account is open and in good standing before project linkage.
- `2026-08-06` - Account management now offers **Close billing account**, the
  previous closed/not-in-good-standing warning is absent, and no projects are
  linked. This is authoritative evidence that the selected temporary billing
  account is open again. Firebase linkage remains pending in `QA-BILL01`.
- `2026-08-06` - The `menulist-qa` Firebase Blaze upgrade flow now lists the
  existing temporary Cloud Billing account as available for selection. The
  prior account-availability blocker is cleared; no duplicate billing account
  is required. `QA-BILL01` remains pending until linkage is confirmed.
- `2026-08-06` - Selecting the existing account opened Firebase's **Set a
  billing budget** step. The visible `25` is the empty field's placeholder, not
  an entered or saved budget; **Continue** is therefore disabled. `QA-BILL01`
  and `QA-BILL02` remain pending.
- `2026-08-06` - Operator entered an INR 25 project budget. Firebase displayed
  email thresholds at 50%, 90%, and 100%, then opened the final **Link Cloud
  Billing Account** review for `menulist-qa`, Blaze, and the existing temporary
  billing account. This is an alert-only budget, not a spending cap.
  `QA-BILL01` and `QA-BILL02` remain pending until Firebase confirms creation
  and linkage.
- `2026-08-06` - Firebase confirmed **Plan change completed successfully**, and
  the `menulist-qa` project now reads **Blaze - Pay as you go**. The existing
  temporary Cloud Billing account is linked, so `QA-BILL01` is complete.
  `QA-BILL02` remains pending until the alert budget is read back in Google
  Cloud Billing.
- `2026-08-06` - Google Cloud Billing Account management independently lists
  `menulist-qa` under **Projects linked to this billing account**. This
  cross-console read-back confirms `QA-BILL01`; `QA-BILL02` remains pending.
- `2026-08-07` - Google Cloud **Budgets & alerts** lists the monthly specified
  amount budget **Firebase Project menulist-qa**, scoped only to project
  `menulist-qa`, with alert thresholds at 50%, 90%, and 100%. Spend-cap status
  is **Not applicable**, as expected for this alert-only budget. `QA-BILL02` is
  complete.
- `2026-08-07` - Billing Account management shows one collapsed **Billing
  Account Creator** binding in the IAM panel. Its principal and inheritance
  source have not yet been inspected, so no role change has been made and
  `QA-BILL09` remains pending.
- `2026-08-07` - Expanded billing IAM confirms **Billing Account Creator** is
  granted to the entire `neelvara.com` domain and inherited from a parent
  policy, so it cannot be removed at the billing-account resource. The direct
  `admin@neelvara.com` Billing Account Administrator binding is separate and
  must be preserved. Trace the inherited creator grant to its parent before
  changing it; `QA-BILL09` remains pending.
- `2026-08-07` - The inheritance pop-over identifies only `neelvara.com` and is
  informational rather than navigable. This confirms the creator grant comes
  from organization IAM. Continue from the `neelvara.com` organization IAM
  policy; do not attempt removal from the billing-account panel. `QA-BILL09`
  remains pending.
- `2026-08-07` - Resource Manager organization IAM confirms the domain-wide
  **Billing Account Creator** binding is direct and removable at
  `neelvara.com`. `admin@neelvara.com` has a separate Organisation
  Administrator role but not an explicit Billing Account Creator binding.
  Grant Billing Account Creator to the authorized admin first, then remove only
  the domain-wide creator binding. Do not change Organisation Administrator or
  Project Creator during this cleanup. `QA-BILL09` remains pending.
- `2026-08-07` - The organization-level **Grant access to neelvara.com** form is
  open with no principal, role, or condition selected. The intended narrow
  grant is `admin@neelvara.com` plus Billing Account Creator only; nothing has
  been saved and `QA-BILL09` remains pending.
- `2026-08-07` - `admin@neelvara.com` is selected as the sole new principal and
  the role picker is open. No role, condition, or permission change has been
  saved; `QA-BILL09` remains pending.
- `2026-08-07` - The organization grant is staged with sole principal
  `admin@neelvara.com`, role **Billing Account Creator**, and no IAM condition.
  The grant has not yet been saved; `QA-BILL09` remains pending.
- `2026-08-07` - Operator saved the explicit Billing Account Creator grant for
  `admin@neelvara.com`. Read-back verification is still required before the
  domain-wide creator binding can be removed; `QA-BILL09` remains pending.
- `2026-08-07` - Organization IAM read-back shows both
  `admin@neelvara.com` and the `neelvara.com` domain under Billing Account
  Creator. Explicit administrator capability is preserved; only the domain
  principal is now eligible for removal. `QA-BILL09` remains pending until
  removal and final read-back succeed.
- `2026-08-07` - Operator reviewed and accepted the least-privilege reason for
  removing the domain-wide Billing Account Creator grant: prevent ordinary
  domain users from creating duplicate or untracked billing accounts while the
  explicit authorized-admin grant remains. `QA-BILL09` remains pending until
  removal and final read-back succeed.
- `2026-08-07` - The removal confirmation is open with **Remove neelvara.com
  from the role Billing Account Creator on this resource** selected. The
  broader **remove from all roles** option is not selected, so Organisation
  Administrator and Project Creator remain outside this change. Removal has
  not yet been confirmed; `QA-BILL09` remains pending.
- `2026-08-07` - Operator confirmed the scoped removal of the `neelvara.com`
  domain from Billing Account Creator. Final organization-IAM read-back must
  show `admin@neelvara.com` as the sole creator principal and preserve the
  separate Project Creator binding before `QA-BILL09` is complete.
- `2026-08-07` - Final organization-IAM read-back confirms Billing Account
  Creator has only `admin@neelvara.com`, while the separate Project Creator
  domain binding remains. The domain-wide billing-account creation permission
  is removed without affecting project creation or administrator access;
  `QA-BILL09` is complete.
- `2026-08-07` - The Google Cloud API details page for exact project
  `menulist-qa` shows **Gemini API**, service
  `generativelanguage.googleapis.com`, with **Status: Enabled** and a **Disable
  API** control. No new credential was created or exposed; `QA-BILL03` is
  complete.
- `2026-08-07` - Google Cloud Billing -> Budgets & alerts was reopened after
  enabling the Gemini API. The existing `Firebase Project menulist-qa` budget
  still shows **Spend cap status: Not applicable**, confirming it is the
  alert-only budget from `QA-BILL02`; `QA-BILL04` requires a separate
  spend-cap configuration.
- `2026-08-07` - A second budget was started with **Spend cap enforcement
  (Preview)** selected. `QA-BILL04` remains in progress until its exact project,
  service, amount, and final read-back are verified.
- `2026-08-07` - The enforcement budget was named
  `menulist-qa Gemini API spend cap`, and the console advanced to **Scope**.
  The project and service filters still require explicit verification.
- `2026-08-07` - The enforcement budget's project scope was narrowed explicitly
  to `menulist-qa`. The eligible-services selector exposes **Gemini API** with
  service `generativelanguage.googleapis.com`; service selection remains
  pending.
- `2026-08-07` - The enforcement budget scope now contains only project
  `menulist-qa` and **Gemini API** (`generativelanguage.googleapis.com`). Savings
  remain excluded because the spend-cap flow tracks gross estimated cost.
- `2026-08-07` - The enforcement budget review shows a monthly target of INR 20
  with notification thresholds at 50%, 80%, and 100% (INR 10, INR 16, and
  INR 20). Notifications are enabled for billing admins/users and project
  owners. The configuration is not yet treated as complete until post-save
  read-back succeeds.
- `2026-08-07` - Post-save read-back lists
  `menulist-qa Gemini API spend cap` with project `menulist-qa`, service
  **Gemini API**, monthly amount INR 20, thresholds 50%/80%/100%, and **Spend
  cap status: Configured**. `QA-BILL04` is complete.
- `2026-08-07` - Google AI Studio -> Rate Limit opened on exact project
  `menulist-qa` and reports **Tier 1**. The visible RPM/TPM/RPD quotas are rate
  limits, not the rolling spend ceiling required by `QA-BILL05`; the separate
  **Spend** view must be read next. No API key or provider call was created.
- `2026-08-07` - Google AI Studio -> Spend opened on exact project
  `menulist-qa` and reports **Tier 1**. Its experimental monthly spend-cap
  read-back is `INR 0.00 / -`, meaning no separate AI Studio monthly cap is
  configured; the page warns that enforcement can lag by about 10 minutes. The
  Google Cloud Gemini-only INR 20 cap remains the provider enforcement layer,
  and the finite local rolling guard will remain the application layer.
  `QA-BILL05` is complete without creating a key or making a provider call.
- `2026-08-07` - The non-secret local rolling ceiling
  `MENULIST_GEMINI_SPEND_LIMIT_USD_10M=8` was saved in the password-vault QA
  setup note for later Phase G wiring. `QA-BILL06` is complete.
- `2026-08-07` - A Cloud Run spend cap remains intentionally deferred because
  enforcement can pause every Cloud Run service, job, and worker pool in the
  project, and no outage/restore drill has been approved. `QA-BILL07` is
  complete as **Skipped intentionally**; no Cloud Run cap was created.
- `2026-08-07` - Firestore creation was started for exact project
  `menulist-qa` using **Standard edition**, database ID `(default)`, and regional
  location `us-central1 (Iowa)`. The final configuration uses **Production
  mode**, whose initial rules deny third-party reads and writes. `QA-C07`
  remains pending until database creation and location read-back complete.
- `2026-08-07` - Firebase reports the `(default)` Firestore database is ready
  and explicitly shows **Database location: us-central1**. `QA-C07` is complete.
- `2026-08-07` - Firebase Storage default-bucket setup was configured for
  `menulist-qa.firebasestorage.app` using **All locations**,
  `US-CENTRAL1`, regional storage, **Standard** access frequency, and
  **Production mode** default-deny rules. `QA-C08` remains pending until bucket
  creation and location read-back complete.
- `2026-08-07` - Firebase Storage now opens the Files view for
  `gs://menulist-qa.firebasestorage.app`, confirming that the default bucket was
  created. `QA-C08` remains pending only for immutable location read-back.
- `2026-08-07` - The Firebase Storage bucket selector independently shows the
  default bucket `menulist-qa.firebasestorage.app` at `US-CENTRAL1`. `QA-C08`
  is complete.
- `2026-08-07` - Firebase Authentication opens the **Sign-in method** page for
  exact project `menulist-qa`. Authentication is initialized, and the page
  shows Email/Password as an available provider that is not configured yet;
  `QA-C04` remains pending until that provider is enabled and saved.
- `2026-08-07` - Firebase Authentication now lists **Email/Password** with
  status **Enabled** for exact project `menulist-qa`. Passwordless email-link
  sign-in was not enabled. `QA-C04` is complete.
- `2026-08-07` - Firebase Authentication **Authorised domains** lists
  `localhost` and custom domain `app.menulist.digital`. No customer wildcard
  was added. `QA-C09` is complete.
- `2026-08-07` - Firebase Project Settings -> General confirms exact project
  `menulist-qa` has no registered apps. The next action is to register the one
  required QA Web app; `QA-C05` remains pending until registration and secure
  config capture are complete.
- `2026-08-07` - The single Firebase Web app `MenuList QA Web` was registered
  without Firebase Hosting. Firebase displayed its Web SDK configuration;
  values are intentionally excluded from this repository and must be captured
  only in the password vault before `QA-C05` is complete.
- `2026-08-07` - The operator confirmed the `MenuList QA Web` configuration was
  copied directly from Firebase. It was not pasted into chat or the repository;
  `QA-C05` remains pending until the existing QA vault note is updated.
- `2026-08-07` - The operator confirmed the `MenuList QA Web` configuration was
  saved in the existing secure QA vault note. No configuration values were
  recorded in chat or this repository. `QA-C05` is complete.
- `2026-08-07` - Firebase Project Settings independently lists the single Web
  app `MenuList QA Web` under exact project `menulist-qa`. Every Firebase action
  in this setup remained scoped to QA; production project id `menulist` was not
  opened or changed. `QA-C06` is complete.
- `2026-08-07` - The existing secure QA vault note now records Firestore
  location `us-central1`, Storage location `us-central1`, and default bucket
  `menulist-qa.firebasestorage.app`. `QA-C12` is complete.
- `2026-08-07` - Admin SDK private-key generation remains intentionally
  deferred until the Vercel server credentials are ready to be entered. This
  avoids creating a static QA key earlier than needed; `QA-C10`, `QA-C11`, and
  `QA-C13` remain pending.
- `2026-08-07` - Google Auth Platform project configuration for exact project
  `menulist-qa` advanced past **App Information** with app name `MenuList QA`
  and a selected support email. The saved support contact will be verified on
  the final Branding page before `QA-D01` is complete.
- `2026-08-07` - Google Auth Platform project configuration advanced past
  **Audience** after selecting **External**. The app must remain in Testing and
  admit only named QA test users; `QA-D02` remains pending until that saved
  audience state is verified after creation.
- `2026-08-07` - Google Auth Platform base project configuration was created for
  exact project `menulist-qa` with the monitored company developer contact.
  The OAuth overview confirms that no OAuth client exists yet. Branding URLs,
  audience read-back, scopes, and client creation remain pending.
- `2026-08-07` - Google Auth Platform Branding independently confirms app name
  `MenuList QA`, the monitored company support/developer contact, and Testing
  status. Combined with the saved External audience selection, `QA-D02` is
  complete. `QA-D01` remains pending for the required URLs and authorized
  domain.
- `2026-08-07` - Google Auth Platform confirmed **Branding changes saved** and
  read back the exact homepage, privacy-policy, and Terms-of-Service URLs plus
  authorized domain `menulist.digital`. `QA-D01` is complete.
- `2026-08-09` - Google Auth Platform **Data access** initially shows no
  non-sensitive, sensitive, or restricted scopes for exact project
  `menulist-qa`. `QA-D03` remains pending until only `openid`, `email`, and
  `profile` are selected and saved.
- `2026-08-09` - Google Auth Platform **Data access** now reads back exactly
  `openid`, `userinfo.email`, and `userinfo.profile` as non-sensitive scopes.
  Sensitive and restricted scope tables remain empty. `QA-D03` is complete.
- `2026-08-09` - Google Auth Platform **Clients** shows no existing OAuth
  clients for exact project `menulist-qa`. The next action is to create the one
  required Web application client; `QA-D04` remains pending.
- `2026-08-09` - Google Auth Platform created the Web application client
  `MenuList QA Web` and reads back only the exact localhost and canonical QA app
  origins plus their two NextAuth Google callback URIs. `QA-D04`, `QA-D05`, and
  `QA-D06` are complete. Client credentials are intentionally excluded from
  chat and this repository; `QA-D08` remains pending secure vault capture.
- `2026-08-09` - The Google OAuth client secret was copied directly from Google
  Cloud into the existing secure `menulist-qa` password-vault note and saved
  under the canonical `GOOGLE_CLIENT_SECRET` name. The value was not written to
  chat or this repository. `QA-D08` remains pending until the matching client ID
  is also stored securely.
- `2026-08-09` - The matching Google OAuth client ID was saved in the same
  secure `menulist-qa` password-vault note under the canonical
  `GOOGLE_CLIENT_ID` name. Both QA OAuth credentials are now stored without
  exposing either value in chat or this repository. `QA-D08` is complete.
- `2026-08-09` - Google Auth Platform **Audience** reads back **External** user
  type, **Testing** publishing status, and named test user
  `admin@neelvara.com`. The app was not published and no production audience
  was changed. `QA-D07` is complete, closing the Phase D Google OAuth setup.
- `2026-08-16` - Google Auth Platform Branding for exact project
  `menulist-qa` changed the user support contact from the administrator
  fallback to the company-managed `support@neelvara.com` Google Group. Live
  readback confirms that Group as the support email while
  `admin@neelvara.com` remains the developer contact. No OAuth client,
  credential, audience, scope, domain, Vercel variable, or deployment changed.
- `2026-08-09` - Google AI Studio **API Keys** is filtered to exact existing
  project `menulist-qa` and shows no current keys in that project. No new Google
  Cloud project was created. `QA-E01` remains pending creation, restriction,
  and secure vault capture of the four QA-only Gemini keys.
- `2026-08-09` - The primary Gemini QA key for exact project `menulist-qa` was
  created and saved directly in the secure QA vault with canonical mapping
  `MENULIST_GEMINI_AI_KEY` and current alias `GEMINI_AI_KEY`, plus its creation
  date, purpose, and revocation owner. The key value was not written to chat or
  this repository. `QA-E01` remains pending the three rotation keys and API
  restrictions for all four keys.
- `2026-08-09` - Gemini QA rotation key 2 was created in exact project
  `menulist-qa` and saved directly in the secure QA vault with canonical mapping
  `MENULIST_GEMINI_AI_KEY_2` and current alias `GEMINI_AI_KEY_2`, plus its
  creation date, purpose, and revocation owner. The value was not written to
  chat or this repository. `QA-E01` remains pending rotation keys 3 and 4 plus
  API restrictions for all four keys.
- `2026-08-09` - Gemini QA rotation key 3 was created in exact project
  `menulist-qa` and saved directly in the secure QA vault with canonical mapping
  `MENULIST_GEMINI_AI_KEY_3` and current alias `GEMINI_AI_KEY_3`, plus its
  creation date, purpose, and revocation owner. The value was not written to
  chat or this repository. `QA-E01` remains pending rotation key 4 plus API
  restrictions for all four keys.
- `2026-08-09` - Gemini QA rotation key 4 was created in exact project
  `menulist-qa` and saved directly in the secure QA vault with canonical mapping
  `MENULIST_GEMINI_AI_KEY_4` and current alias `GEMINI_AI_KEY_4`, plus its
  creation date, purpose, and revocation owner. All four QA key values are now
  securely stored without appearing in chat or this repository. `QA-E01`
  remains pending API restriction read-back for all four keys.
- `2026-08-09` - Google Cloud Credentials reads back the `MenuList QA primary`
  key with exactly one selected API, **Gemini API**, no application restriction,
  and Google's automatically bound service account. No edit was required and
  no browser-referrer restriction was added. `QA-E01` remains pending the same
  read-back for rotation keys 2 through 4.
- `2026-08-09` - Google Cloud Credentials independently reads back all four
  `MenuList QA` Gemini keys with exactly one selected API, **Gemini API**, no
  application restriction, and a bound account. All four values and their env
  mappings are stored only in the secure QA vault. `QA-E01` is complete.
- `2026-08-09` - Upstash Redis opened to an empty database list with zero
  commands, zero storage, and zero cost; no existing database can be reused or
  accidentally duplicated. The active workspace is labeled **Personal**, so
  account ownership must be verified before creating `menulist-qa-rate-limit`.
  `QA-E02` remains pending.
- `2026-08-09` - The operator verified that the active Upstash workspace is
  signed in through the company-controlled account. No database has been
  created yet; current region and plan choices will be inspected before
  creation. `QA-E02` remains pending.
- `2026-08-09` - Upstash created exactly one Redis database named
  `menulist-qa-rate-limit` on the Free Tier in Google Cloud Iowa
  (`us-central1`). The details page reads back REST access, TLS enabled, zero
  usage, and zero cost; no paid plan or read region was added. The current Free
  Tier details show 500,000 commands per month, 50 GB bandwidth, and 256 MB
  storage. `QA-E02` remains pending secure capture of the REST URL and standard
  REST token.
- `2026-08-09` - The Upstash standard REST URL and token were copied directly
  into the secure QA vault with canonical mappings
  `MENULIST_UPSTASH_REDIS_REST_URL` and
  `MENULIST_UPSTASH_REDIS_REST_TOKEN` plus current aliases
  `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. No credential value
  was written to chat or this repository. `QA-E02` is complete.
- `2026-08-09` - The owner-controlled Razorpay dashboard opened with **Test
  Mode** active. Live-payment onboarding/KYC is incomplete and will not be
  started for this QA pass. No Live Mode key, payment, settlement, or webhook
  was created or changed. `QA-E03` remains pending test-key and distinct QA
  webhook-secret capture.
- `2026-08-09` - One Razorpay Test Mode key pair was generated, its key ID was
  confirmed to use the `rzp_test_` prefix, and both values were saved directly
  in the secure QA vault under canonical MenuList names and current app aliases.
  No credential value was written to chat or this repository. `QA-E03` remains
  pending a separate QA webhook-signing secret; no webhook endpoint has been
  added.
- `2026-08-09` - A distinct 32-byte random Razorpay QA webhook-signing secret
  was generated directly into the local clipboard and saved in the secure QA
  vault as `MENULIST_RAZORPAY_WEBHOOK_SECRET` with current alias
  `RAZORPAY_WEBHOOK_SECRET`. It is separate from the API key secret and was not
  printed to chat, terminal output, or this repository. No webhook endpoint was
  added because the canonical QA app host is not live yet. `QA-E03` is complete.
- `2026-08-09` - Sentry sign-in with company account `admin@neelvara.com`
  reached first-time organization creation, confirming that no existing Sentry
  organization or project is available to reuse. The immutable data-storage
  location will be inspected before organization creation. `QA-E04` remains
  pending.
- `2026-08-09` - Sentry organization `Neelvara Systems` was created under the
  company account with immutable data-storage location **United States (US)**,
  matching the MenuList QA US infrastructure family. No paid upgrade or payment
  method was selected. The first-project wizard has **Next.js** selected;
  `QA-E04` remains pending creation and secure DSN capture for `menulist-qa`.
- `2026-08-09` - Sentry created the first Next.js project with provider-default
  slug `javascript-nextjs` and opened SDK installation guidance. The repository
  already contains its governed Sentry integration, so the provider wizard,
  sample error, and AI-assisted setup will not be run. The project must be
  renamed to `menulist-qa` before DSN capture; `QA-E04` remains pending.
- `2026-08-09` - The Sentry Next.js project slug was changed from the provider
  default to canonical `menulist-qa`; platform remains **Next.js** and no SDK
  wizard or sample event was run. `QA-E04` remains pending secure DSN capture.
- `2026-08-09` - The default `menulist-qa` client DSN was copied directly into
  the secure QA vault once. The later root env consolidation maps it only to
  `NEXT_PUBLIC_SENTRY_DSN`; Firebase Functions use their isolated project-local
  `SENTRY_DSN` Secret Manager name. No additional client key, OTLP
  configuration, provider wizard, or sample event was created.
  `QA-E04` remains pending Sentry account-security review; an organization auth
  token remains deferred unless source-map upload later proves it is required.
- `2026-08-09` - Sentry Account Security shows both **Authenticator App** and
  **Passkey / Biometric / Security Key** inactive, with recovery codes
  unavailable until 2FA is enabled. Account MFA must be configured and recovery
  material vaulted before `QA-E04` is complete.
- `2026-08-09` - Sentry Authenticator App MFA was enabled and the resulting
  recovery codes were stored in the secure password vault without entering any
  setup secret, one-time code, or recovery code into docs or chat. The
  phishing-resistant passkey remains pending before `QA-E04` is complete.
- `2026-08-09` - A company-controlled passkey named for the Neelvara Sentry
  administrator was added alongside Authenticator App MFA and independently
  stored recovery codes. The isolated `menulist-qa` project, vaulted QA DSN,
  and strongest available account protection now satisfy `QA-E04`; controlled
  event delivery remains a separate later check under `QA-K15`.
- `2026-08-09` - Meta Developers app access was opened through the founder's
  authentic personal Facebook profile because no managed company Meta login
  exists. No shared or synthetic company profile will be created. The QA app
  must use the `Neelvara Systems` business portfolio when available, and a
  second trusted administrator remains a pre-production ownership requirement;
  `QA-E05` remains pending app and WhatsApp test-credential creation.
- `2026-08-09` - Existing unpublished app `MenuList Dev Messaging`, its
  `MenuList Dev` business portfolio, and Meta-provided WhatsApp test account
  were accepted for QA-only reuse. Production will use a fresh app and business
  ownership setup rather than promoting this personal-profile-administered QA
  asset. The old webhook still targets a retired `ecomsai` Function and must be
  removed before QA configuration. A temporary access token was visible in a
  setup screenshot, so it is classified as exposed, must not be vaulted or
  used, and must expire or be invalidated before a replacement is captured.
  `QA-E05` remains pending isolated webhook and fresh credential setup.
- `2026-08-09` - The existing Meta app's webhook subscription to the retired
  `ecomsai` Cloud Function was removed. The unpublished QA app no longer routes
  WhatsApp webhook traffic to that legacy backend; `QA-E05` remains pending
  QA identity normalization and fresh credential capture.
- `2026-08-09` - The reused unpublished Meta app was renamed to `MenuList QA
  Messaging` and its provider contact was changed to the company-controlled
  `admin@neelvara.com` mailbox. `QA-E05` remains pending rotation and secure
  storage of the QA app secret, access token, phone-number id, and verify token.
- `2026-08-09` - The reused Meta app secret was rotated after legacy webhook
  removal and the replacement was stored directly in the secure QA vault under
  canonical `MENULIST_WHATSAPP_APP_SECRET` and Function-compatible
  `WHATSAPP_APP_SECRET` mappings. No secret value entered docs or chat;
  `QA-E05` remains pending the other WhatsApp QA credentials.
- `2026-08-09` - A distinct random 32-byte QA webhook verification token was
  generated directly to the local clipboard without terminal output and stored
  in the secure vault under `MENULIST_WHATSAPP_VERIFY_TOKEN` and
  `WHATSAPP_VERIFY_TOKEN`. It remains unwired until the new QA webhook exists;
  `QA-E05` remains pending phone-number id and fresh access-token capture.
- `2026-08-09` - The Meta-provided WhatsApp test sender phone-number id was
  copied directly into the secure QA vault under
  `MENULIST_WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_PHONE_NUMBER_ID`. The
  displayed phone number, recipient number, exposed temporary token, and cURL
  command were not captured; `QA-E05` remains pending a fresh durable token.
- `2026-08-09` - Employee-level Meta system user `MenuList QA Runtime` was
  created in the QA-only `MenuList Dev` business portfolio. It has no broad
  administrator role and no assets or token yet; `QA-E05` remains pending
  least-privilege QA app/WABA assignment and token generation.
- `2026-08-09` - `MenuList QA Runtime` received **Manage app** access only to
  `MenuList QA Messaging`; partial app toggles were left unused and the system
  user remains an Employee at portfolio scope. `QA-E05` remains pending the
  matching WhatsApp test-account assignment and durable token generation.
- `2026-08-09` - The Meta QA system user was assigned the test WhatsApp account
  and sender with only message delivery, message-template view, and phone-number
  view permissions. Template/phone management, payment, user assignment, and
  **Everything** permissions remain disabled; `QA-E05` remains pending scoped
  system-user token generation and secure storage.
- `2026-08-09` - A replacement system-user access token was generated for
  `MenuList QA Runtime` with a 60-day expiry and only the
  `whatsapp_business_messaging` permission. It was stored directly in the
  secure QA vault under `MENULIST_WHATSAPP_ACCESS_TOKEN` and
  `WHATSAPP_ACCESS_TOKEN`; no token value entered docs, screenshots, or chat.
  The app remains unpublished, uses only Meta test WhatsApp assets, and has no
  production number, billing, webhook, or provider processing enabled. Together
  with the vaulted test phone-number id, rotated app secret, and independent
  verify token, this completes `QA-E05`; rotation is required before the
  provider-displayed expiry.
- `2026-08-09` - Meta credential readiness and webhook activation were kept as
  separate checkpoints. `QA-E05` covers the isolated QA app, test assets, and
  four vaulted credentials only. No Meta callback is currently registered.
  Webhook verification, the `messages` subscription, and one bounded signed
  provider smoke remain pending under post-deploy `QA-K22` because the
  `menulist-qa` `messagingOnboarding` Function and its Secret Manager bindings
  must exist first.
- `2026-08-09` - The operator explicitly confirmed the Meta QA app is paused
  unchanged until the post-deploy `QA-K22` return. No callback, production
  number, payment method, publish-state change, or additional webhook
  subscription was added.
- `2026-08-09` - The initially stored standard-Base64 NextAuth value was
  superseded before use by a separately generated 32-byte, 43-character
  Base64URL value. Only the corrected QA value remains in the secure vault
  under `NEXTAUTH_SECRET`; no secret value entered docs or chat. This completes
  `QA-E06`.
- `2026-08-09` - A separate 32-byte, 43-character Base64URL owner-referral
  signing secret was generated directly to the clipboard and stored in the
  secure QA vault under `MENULIST_OWNER_REFERRAL_TOKEN_SECRET`. It does not
  reuse the NextAuth or any provider secret, and no value entered docs or chat.
  This completes `QA-E07`.
- `2026-08-09` - A separate 32-byte, 43-character Base64URL cache-revalidation
  secret was generated directly to the clipboard and stored in the secure QA
  vault under canonical `REVALIDATION_SECRET`. It does not reuse an auth,
  referral, payment, or provider secret, and no value entered docs or chat.
  This completes `QA-E08`.
- `2026-08-09` - `QA-E09` was skipped intentionally. The existing alert-only
  and Gemini spend-cap budgets notify billing administrators, billing users,
  and project owners through Google-managed notifications; no Pub/Sub or HTTP
  budget webhook was configured. The maintained MenuList QA deploy target does
  not include `gcpBudgetAlertWebhook`, so no unused
  `GCP_BUDGET_WEBHOOK_SECRET` was generated.
- `2026-08-09` - The Cloud Tasks API was enabled in exact Google Cloud project
  `menulist-qa`; no production project was changed. Queue creation remains a
  separate bounded action under `QA-E11`. This completes `QA-E10`.
- `2026-08-09` - Cloud Shell created and read back the single running queue
  `projects/menulist-qa/locations/us-central1/queues/batch-image-generation`.
  Its explicit policy is 8 maximum concurrent dispatches, 4 dispatches per
  second, 5 maximum attempts, 5-second minimum backoff, and 300-second maximum
  backoff. Service-derived `maxBurstSize: 10` and `maxDoublings: 16` were
  retained. No production queue was created. This completes `QA-E11`.
- `2026-08-09` - A separate 32-byte, 43-character Base64URL batch-worker
  authentication secret was generated directly to the clipboard and stored in
  the secure QA vault under `BATCH_IMAGE_GENERATION_WORKER_SECRET`. It does not
  reuse another application or provider secret, and no value entered docs or
  chat. This completes `QA-E12` and closes the required Phase E provider-value
  setup.
- `2026-08-09` - The operator confirmed the first-boot optional-provider
  defaults: App Check/reCAPTCHA enforcement, Telegram alerts, SMTP delivery,
  and staging analytics are skipped intentionally; UptimeRobot is approved for
  creation only after the Phase J staging deployment is live. No optional
  account, credential, monitor, or production analytics destination was
  created. This completes `QA-F01` through `QA-F05`.
- `2026-08-10` - Firebase Project Settings -> Service accounts for exact project
  `menulist-qa` reports that key creation is not allowed for the Firebase Admin
  SDK service account because of organization policy. No key was created or
  downloaded, and no policy was weakened. Current MenuList Vercel runtime code
  still requires explicit service-account email/private-key env values; a
  keyless Workload Identity path is not implemented. `QA-C10`, `QA-C11`, and
  `QA-C13` remain pending while the effective constraint and its inheritance
  source are inspected for the narrowest safe resolution.
- `2026-08-10` - Google Cloud Organization Policies for exact project
  `menulist-qa` identifies active managed constraint
  `iam.managed.disableServiceAccountKeyCreation` with policy source **Inherit
  parent's policy**. The legacy constraint is not the observed blocker. No
  project or organization policy was changed; inspect the managed policy detail
  before deciding whether a project-only override is available and justified.
- `2026-08-10` - The managed policy detail confirms the effective project
  status is **Enforced**, with no condition after hierarchy evaluation. It
  denies create/update for `iam.googleapis.com/ServiceAccountKey` when the key
  is user-managed and Google-provided. No policy edit was opened or saved;
  `QA-C10`, `QA-C11`, and `QA-C13` remain pending while project-level override
  permission is checked.
- `2026-08-10` - Opening **Manage policy** was denied for
  `admin@neelvara.com`. Google Cloud reports that the account lacks all of
  `orgpolicy.policies.create`, `orgpolicy.policies.delete`,
  `orgpolicy.policies.update`, and `orgpolicy.policy.get` on project
  `menulist-qa`. No policy was changed. Resolution requires an organization
  administrator to grant the Organization Policy Administrator role at the
  organization level or to apply the narrow project-only exemption on behalf
  of the operator; `QA-C10`, `QA-C11`, and `QA-C13` remain pending.
- `2026-08-10` - **Fix access** identifies
  `roles/orgpolicy.policyAdmin` (**Organization Policy Administrator**) as the
  role containing the missing permissions, with target resource the entire
  `neelvara.com` organization. Because this is broader than `menulist-qa`, any
  grant must be temporary: use it only to apply and later remove the QA-project
  exception, then remove the organization-level role from the operator. No
  role has been granted yet.
- `2026-08-10` - The **Edit policy** page for exact project `menulist-qa` is now
  accessible after the organization-level access grant. The page still shows
  **Inherit parent's policy** selected, so no organization policy behavior has
  changed yet. Treat `roles/orgpolicy.policyAdmin` on `neelvara.com` as an
  active temporary elevation and remove it after the QA exception is restored.
- `2026-08-10` - A project-only override is staged but not saved for
  `iam.managed.disableServiceAccountKeyCreation`: **Override parent's policy**
  with one unconditional rule and **Enforcement Off**. This affects only
  `menulist-qa` once applied; the parent organization policy remains enforced.
  Do not leave this exception active after the one required QA key is created
  and secured.
- `2026-08-10` - The project-only override was applied successfully. Service
  account key creation is temporarily **Not enforced** for `menulist-qa` while
  the parent `neelvara.com` organization policy remains enforced. Create
  exactly one Firebase Admin SDK QA key, secure its required values, delete the
  downloaded JSON, then restore inheritance immediately.
- `2026-08-10` - Exactly one Firebase Admin SDK QA private key was generated,
  and its JSON credential was downloaded locally. The credential is not yet
  considered secured or cleaned up: `QA-C10`, `QA-C11`, and `QA-C13` remain
  pending until the required runtime fields and ownership metadata are saved
  in the existing QA vault note, the downloaded JSON is securely removed, and
  key-creation enforcement is restored.
- `2026-08-10` - The Firebase Admin QA runtime fields, private-key ID, creation
  date, and owner were saved in the existing `menulist-qa` secure vault note.
  No credential value was shared in chat. The downloaded JSON still requires
  removal and the temporary key-creation exception still requires reversal
  before the credential setup is closed.
- `2026-08-10` - The downloaded Firebase Admin SDK JSON and any duplicate of
  that download were removed locally, and Trash was emptied. No unencrypted
  local credential file remains. `QA-C11` is complete; restore the inherited
  key-creation policy before completing the remaining credential metadata.
- `2026-08-10` - The temporary `menulist-qa` exception was removed after the
  single required key was secured. Policy source is again **Inherit parent's
  policy**, so service-account key creation is enforced for QA. The parent
  organization policy was never disabled. Remove the temporary
  `roles/orgpolicy.policyAdmin` grant from the operator next.
- `2026-08-10` - The temporary organization-level
  `roles/orgpolicy.policyAdmin` grant was removed from `admin@neelvara.com`.
  The operator retains the pre-existing **Billing Account Creator** and
  **Organization Administrator** roles only. The privileged exception workflow
  is closed: QA key creation is enforced and no temporary policy-admin access
  remains.
- `2026-08-10` - The secure QA vault record now includes the Firebase Admin
  key ID, creation date, owner, and explicit immediate-revocation conditions
  for suspected exposure, owner access removal, replacement, or unexpected
  use. `QA-C13` is complete.
- `2026-08-10` - The existing Firebase Web `apiKey` was mapped in the secure QA
  vault to `MENULIST_FIREBASE_API_KEY` and, at that point, a temporary generic
  compatibility alias. Together with the vaulted Admin SDK project ID, client
  email, and private key, this completed `QA-C10`. The later environment
  consolidation removed the generic alias from managed runtime configuration.
- `2026-08-10` - A minimal gitignored `.env.local` scaffold was created from
  the governed MenuList QA inventory. It contains fixed local/QA identifiers,
  emulator-first defaults, no literal template markers, no sister-product
  keys, and 52 blank values awaiting direct vault entry. `QA-G01` remains
  pending until those required values are populated and validated.
- `2026-08-10` - The checked-in `functions/.env.menulist-qa` independently
  matches the required `app.menulist.digital` origins,
  `menulist.digital` tenant base, USD 8 Gemini rolling ceiling, and disabled
  messaging-onboarding master flag. `QA-G15` is complete.
- `2026-08-10` - The shared Next/Vercel env contract was consolidated to one
  product-scoped key per MenuList value. Managed local and example env files no
  longer contain generic Firebase, Gemini, Razorpay, Upstash, SMTP, Telegram,
  WhatsApp, revalidation, or batch-worker aliases. Runtime readers prefer
  `MENULIST_*` / `NEXT_PUBLIC_MENULIST_*` and retain legacy names only as
  read-only migration fallbacks for an existing deployment. Answerlattice now
  has its own optional `ANSWERLATTICE_UPSTASH_*` namespace. Firebase Functions
  keep project-local Secret Manager names because each Firebase project has an
  isolated secret namespace; those names are not duplicated in Vercel/local.
- `2026-08-10` - The consolidated contract passed its focused verifier,
  configuration-safety and environment-target gates, root TypeScript and
  ESLint checks, Firebase Functions TypeScript build, and the affected
  readiness/backfill boundary suites. No Vercel or Firebase deployment was
  performed. Vercel Preview values for exact branch `staging` remain an
  operator step.
- `2026-08-11` - The first local Phase G group was revalidated from the current
  ignored `.env.local` without printing values. Authentication, owner-referral,
  Firebase Web, and Firebase Admin canonical rows are present; NextAuth and
  referral secrets decode to distinct 32-byte values; Firebase project,
  domain, bucket, App ID/sender, Admin email, and `us-central1` target the QA
  family; and the Admin private key parses after dotenv expands its quoted
  literal `\n` escapes. Stale compatibility-alias comments were removed and no
  generic alias key exists. Phase G remains pending while Gemini, Razorpay,
  Upstash, revalidation, Sentry, batch-worker, and Meta values plus the
  branch-restricted Vercel Preview environment are completed.
- `2026-08-11` - The local Gemini group was validated without printing key
  material. All four canonical `MENULIST_GEMINI_AI_KEY*` rows contain distinct
  current-format Google AI Studio authorization keys, the local rolling ceiling
  remains USD 8, no generic Gemini alias exists, and the maintained MenuList env
  contract verifier passes. The local comment now marks these values as
  server-only. `QA-G08` remains pending only for the exact-branch Vercel Preview
  copy and later provider smoke; no paid Gemini request was made during this
  validation.
- `2026-08-11` - The local Razorpay Test Mode group was validated without
  printing credential material. The canonical public key ID uses the
  `rzp_test_` family, no live key ID is present, the API key secret and webhook
  signing secret are populated and distinct, neither private value is exposed
  through `NEXT_PUBLIC_*`, no generic Razorpay alias exists, and the maintained
  MenuList env contract verifier passes. `QA-G09` remains pending only for the
  exact-branch Vercel Preview copy and the post-deploy test webhook flow.
- `2026-08-11` - The local Upstash and revalidation group was validated without
  printing secret material. The canonical Upstash URL uses HTTPS on the
  expected provider host without embedded credentials, its token and the
  separately generated revalidation secret are populated and distinct, no
  generic alias exists, and the maintained MenuList env contract verifier
  passes. `QA-G10` remains pending only for the exact-branch Vercel Preview copy
  and later bounded connectivity/revalidation smoke.
- `2026-08-11` - The pending root Sentry scaffold was consolidated before any
  DSN was entered. The single shared Vercel app now uses one environment-scoped
  `NEXT_PUBLIC_SENTRY_DSN`; browser, server, and edge reuse it, while Firebase
  Functions retain project-local `SENTRY_DSN` in Secret Manager. The redundant
  root `SENTRY_DSN`, `SENTRY_DEV_DSN`, and `NEXT_PUBLIC_SENTRY_DEV_DSN` rows were
  removed so later product setup does not create conflicting duplicate rows.
- `2026-08-11` - The local shared-app Sentry DSN was validated without printing
  it. It is a structurally valid HTTPS Sentry DSN with a public key component,
  no password component, and a project path; `.env.local` contains only the
  canonical `NEXT_PUBLIC_SENTRY_DSN` row. The older ignored `.env` was found to
  contain a different DSN plus other stale cross-product/provider values, so it
  was preserved as ignored `legacy.env`, which Next.js does not load. Fresh
  MenuList QA configuration now comes only from `.env.local`; migrate or remove
  the retired values deliberately during each later product setup. The local
  Sentry portion of `QA-G11` is ready, while exact-branch Vercel Preview copy and
  controlled event smoke remain pending.
- `2026-08-11` - The local batch image worker group was validated without
  printing its secret or dispatching a task. The canonical worker secret is
  populated, non-placeholder, sufficiently long, whitespace-free, and distinct
  from every other populated local secret. Its fixed endpoint is exactly the QA
  app batch-generation route, the queue is `batch-image-generation`, and the
  project/region remain `menulist-qa`/`us-central1`; no generic batch-worker
  alias exists and the maintained env contract verifier passes. The local part
  of `QA-G16` is ready, while exact-branch Vercel Preview copy and the controlled
  post-deploy queue smoke remain pending.
- `2026-08-11` - The four vaulted Meta QA credentials were structurally
  validated without printing them. Codebase tracing then confirmed that the
  app secret, verify token, and messaging-onboarding runtime flags are consumed
  only by Firebase Functions, while the root app uses only the phone id and
  access token for optional outbound phone/notification paths. Because no such
  root smoke is enabled, all four real Meta values and the three Functions-only
  flags were removed from `.env.local`; the credentials remain vaulted for
  Phase H Secret Manager. `functions/.env.menulist-qa` remains fail-closed with
  `ENABLE_MESSAGING_ONBOARDING=false`. No webhook, provider request, secret
  write, Functions deploy, or Vercel deploy was performed.
- `2026-08-12` - A fresh empty `neelvara-systems/menulist-core` Vercel project
  was created and linked to `neelvara-systems/menulist-core` without triggering
  a deployment. Readback confirms Next.js at root `.`, Node.js `22.x`, build
  command `npm run build:vercel`, Git integration, and zero deployments. The
  QA env inventory contains exactly 39 unique rows: 13 Sensitive and 26
  Non-sensitive, all restricted to Preview branch `staging`. Production has no
  project env rows. The imported values use `menulist.digital`/`app` hosts,
  `menulist-qa`, test-mode Razorpay, emulator-off hosted flags, canonical
  product-scoped names, and no sister-product, generic Firebase, placeholder,
  or local-emulator rows. No value was retrieved during remote verification.
  `QA-A10` and `QA-G02` through `QA-G18` are complete.
- `2026-08-12` - Firebase CLI reauthentication succeeded as
  `admin@neelvara.com`, and metadata-only `firebase projects:list` returned the
  single active project `menulist-qa`. Google Cloud Console then confirmed
  `secretmanager.googleapis.com` is Enabled in that exact project. An initial
  metadata-only audit found all 14 required Function secret names absent, so no
  existing version was overwritten. `QA-H01` and `QA-H02` are complete.
- `2026-08-12` - Secret Manager version 1 was created in project number
  `113909530649` for `GEMINI_AI_KEY`, `GEMINI_AI_KEY_2`,
  `GEMINI_AI_KEY_3`, `GEMINI_AI_KEY_4`, `UPSTASH_REDIS_REST_URL`,
  `UPSTASH_REDIS_REST_TOKEN`, `RAZORPAY_KEY_ID`, and
  `RAZORPAY_KEY_SECRET`. Values were streamed directly from the ignored local
  env into Firebase CLI and were never printed. Metadata-only readback confirms
  every created version is Enabled; the Razorpay key ID was guarded as
  `rzp_test_`. `RAZORPAY_WEBHOOK_SECRET` remains only in local/Vercel env for
  the Next.js route. `QA-H03`, `QA-H04`, and `QA-H05` are complete; WhatsApp,
  Sentry, revalidation, optional-secret handling, final metadata inventory, and
  production non-touch evidence remain pending under `QA-H06` through
  `QA-H09`.
- `2026-08-12` - Secret Manager version 1 was created in `menulist-qa` for
  `SENTRY_DSN` and `REVALIDATION_SECRET`, streamed from the ignored local env
  without printing either value. These complete the monitoring and
  revalidation portions of `QA-H06`. The operator then entered
  `WHATSAPP_PHONE_NUMBER_ID` directly into Firebase CLI's private prompt, and
  Secret Manager created version 1 without exposing the value. The same private
  prompt flow then created version 1 of `WHATSAPP_ACCESS_TOKEN`. That gate now
  includes version 1 of `WHATSAPP_APP_SECRET` and `WHATSAPP_VERIFY_TOKEN` as
  well. All six maintained names now have version 1, completing `QA-H06`.
- `2026-08-12` - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
  `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID` were intentionally skipped for
  this deploy target. Source readback confirms no exported MenuList Function
  binds `SECRET_GROUPS.SMTP` or `SECRET_GROUPS.MONITORING`;
  `PLATFORM_ALERT_DELIVERY` deliberately excludes both groups, SMTP returns a
  not-configured result, and Telegram skips delivery when absent. Do not create
  placeholder secrets. This completes `QA-H07`; add real QA values only if a
  selected target later declares and uses either group.
- `2026-08-12` - A metadata-only Firebase CLI audit checked the complete
  14-name required inventory. Every secret reports version 1 as `ENABLED`, and
  no value was accessed or displayed. Every create and metadata command used
  exact project `menulist-qa`; the authenticated project inventory exposed no
  production project and no command targeted project id `menulist`. This
  completes `QA-H08` and `QA-H09`, closing Phase H.
- `2026-08-12` - Phase I prechecks confirmed active Node `v22.23.1` matches
  `.nvmrc`, while `firebase projects:list --json` returned only active project
  `menulist-qa` with project number `113909530649`. This completes `QA-I01` and
  `QA-I02` without running a build or deploy.
- `2026-08-12` - `npm run verify:menulist-firebase-rules-predeploy`
  discovered and passed all 41 root Firestore/Storage emulator rule scripts.
  The maintained runner enforced `demo-*` projects and performed no QA or
  production cloud read, write, or deploy. Expected denied-operation logs were
  test assertions; every suite and the aggregate command exited successfully.
  This completes `QA-I03`.
- `2026-08-12` - The first exact-project baseline deploy targeted only
  Firestore rules/indexes and Storage rules in `menulist-qa`. Storage and
  Firestore rules compiled successfully; Firestore emitted 26 non-blocking
  existing compiler warnings. Upload then stopped on
  `firebaserules.googleapis.com` HTTP 503 (`The service is currently
  unavailable`). Treat this as a transient external failure and a potentially
  partial attempt: `QA-I04` remains open until the complete baseline command
  exits successfully, followed by console readback under `QA-I05` through
  `QA-I07`.
- `2026-08-12` - One retry of the same exact-project baseline command also
  stopped at the Google Firebase Rules API, this time on the server-side
  `projects/menulist-qa:test` preflight with HTTP 503 before upload. The public
  Firebase and Google Cloud status dashboards showed no broad Firestore or
  Storage incident at the time, and the workstation's global Firebase CLI was
  `14.15.1` while the current stable registry release was `15.26.0`. Stop
  immediate retries. Non-mutating checks through explicitly pinned Firebase
  CLI `15.26.0` authenticated successfully, listed only `menulist-qa`, and read
  the `(default)` Firestore database as Native mode in `us-central1`; this
  isolates the failure to the Firebase Rules API rather than login, project
  visibility, or database creation. `QA-I04` remains externally blocked; after
  a cooling period, make only one rules-first attempt with the pinned current
  CLI, then escalate through project-specific Service Health or Firebase
  Support if the same API 503 recurs.
- `2026-08-12` - Firebase Console readback for bucket
  `menulist-qa.firebasestorage.app` still showed the initial 11-line deny-all
  Storage template, while repository `storage.rules` contains the maintained
  461-line tenant/file-validation policy. This confirms that neither failed
  attempt published the repository Storage rules. Keep the Console as a
  post-deploy readback surface only; do not paste/publish rules manually because
  that would bypass the version-controlled deployment record and cannot deploy
  the Firestore index manifest. `QA-I06` remains open until the remote source
  matches the repository after a successful CLI deployment.
- `2026-08-12` - Project-specific diagnosis ruled out a general outage or
  project configuration error. Cloud Logging returned no project-visible
  `firebaserules.googleapis.com` entries; Google Cloud Service Health showed no
  relevant active incident; the Firebase Rules API was Enabled; all displayed
  Rules API quotas were at 0%; and the project Rules service agent retained its
  Google-managed Firebase Rules System role. Pinned Firebase CLI `15.26.0`
  debug traffic then proved OAuth refresh, IAM permission checks, Firestore API
  access, database readback, rules compilation, release listing, and current
  ruleset readback all returned HTTP 200. Only
  `POST /v1/projects/menulist-qa/rulesets` for the repository Firestore source
  returned HTTP 503 `UNAVAILABLE`. Google exposed no deeper project log or
  request identifier for this managed control-plane failure.
- `2026-08-12` - The Rules API accepted and released repository
  `storage.rules` through pinned CLI `15.26.0`, proving the project could create
  and release rulesets. A non-releasing REST diagnostic also created valid
  default-deny Firestore rulesets at 512, 204800, 204801, and 205443 bytes,
  including the exact byte size of the failing source. This ruled out the
  documented raw source-size boundary and isolated the trigger to the compiled
  complexity of the repository Firestore policy. The diagnostic rulesets were
  never attached to `cloud.firestore` and therefore never changed active
  access behavior; all four were deleted after diagnosis returned HTTP 200 for
  each cleanup request.
- `2026-08-12` - Ten functions reported by the Firebase compiler as unused were
  removed from `firestore.rules`. They were unreachable from every `allow`
  expression, so this changed no authorization path and reduced the source from
  205443 to 198976 bytes. The complete
  `npm run verify:menulist-firebase-rules-predeploy` gate then passed all 41
  emulator suites again. The reduced source compiled, created ruleset
  `9ce8cb3f-0bb1-4c12-bec0-1e9973c258e2`, and released successfully to
  `cloud.firestore` at `2026-08-12T04:25:08.720448Z`. Seven newly exposed
  transitive unused-helper warnings remain nonblocking; no active rule or test
  depends on those helpers.
- `2026-08-12` - The first indexes-only retry exposed one invalid one-field
  composite declaration for `menuImageProcessingJobs.createdAt DESCENDING`.
  Firestore supplies that single-field direction by default and no field
  override disables it, so the redundant declaration was removed. An
  indexes-only temporary deploy config prevented the main CLI config from
  recompiling Firestore rules while the Rules API was under diagnosis. After
  one expected HTTP 409 cross-transaction contention retry, Firestore accepted
  the corrected manifest. REST readback reports all 166 composite indexes in
  `READY` state.
- `2026-08-12` - Rules API readback confirmed active Firestore ruleset
  `9ce8cb3f-0bb1-4c12-bec0-1e9973c258e2` is 198976 bytes and SHA-256
  `a6e0fc744050b73bcfbfa21e79b93e31b978617bb9822107f760bba2b6fc5da4`,
  exactly matching local `firestore.rules`. Active Storage ruleset
  `d37f8e26-60c3-47d4-97e2-f04d5327f2ff` is 18176 bytes and SHA-256
  `226d2a206d7de8a442bf356a61ad048118322acb993eb89fa45744ed78ed1838`,
  exactly matching local `storage.rules`; its release timestamp is
  `2026-08-12T04:09:12.303731Z`. This completes `QA-I04` through `QA-I07`.
- `2026-08-12` - More than five minutes after the Firestore release, a fresh
  Rules API readback still matched both repository rule files byte-for-byte,
  and Firestore Admin API readback still reported all 166 composite indexes as
  `READY`. The propagation hold is complete. This completes `QA-I08`; the
  real-auth allow/deny matrix under `QA-I09` remains the next gate.
- `2026-08-12 10:46 IST` - Two synthetic, non-customer QA identities and their
  separate baseline businesses were created only in project `menulist-qa` for
  the live rules gate. `QA owner A` uses Firebase Auth UID
  `udsMmv6gQQP59zibA1RQUoX6Ckd2`, tenant/store `1/1`; `QA owner B` uses UID
  `w916RXQfreRKIxpZEAXT2TH6t6R2`, tenant/store `2/2`. Each token carried only
  the matching `ML` owner claims. Neither fixture has a Razorpay subscription,
  customer data, menu data, or provider activity.
- `2026-08-12 10:46 IST` - Operator `admin@neelvara.com` ran from branch
  `staging` at base commit `159005a3a003`, using Node `v22.23.1` and pinned
  Firebase CLI `15.26.0`. The local app and direct Firebase Web SDK were
  connected deliberately to cloud project `menulist-qa`, with emulators
  disabled only for this smoke. Both synthetic owners authenticated through
  the real localhost credential flow and completed the protected app/store
  bootstrap. The subscription guard then routed both unsubscribed fixtures to
  Billing, as expected; direct client reads independently confirmed that each
  owner could read only their own store.
- `2026-08-12 10:46 IST` - The deployed-rule matrix passed all `35/35`
  scenarios: four positive own-tenant scenarios and 31 expected denials.
  Allowed coverage included owner A and B own-store reads, one reversible
  owner-A campaign create/read/delete sequence, and one owner-A scoped Storage
  upload/read/delete sequence. Denied coverage included anonymous owner-store
  access, owner-A cross-tenant read/write and Storage upload, all
  get/list/create/update/delete operations on server-only
  `geminiSpendWindows/menulist` across anonymous, owner, and platform-style
  identities, and read/write/delete on legacy `MenuListAi/project/files/...`
  Storage paths across anonymous, same-tenant, cross-tenant, and platform-style
  identities. Expected `permission-denied` responses were assertions, not
  failures.
- `2026-08-12 10:46 IST` - Post-smoke cleanup removed the disposable campaign,
  scoped and legacy Storage objects, and server-only spend-window fixture;
  remote readback found no residual smoke objects. Temporary platform-style
  claims were restored to normal owner claims. Test passwords were rotated,
  the temporary credential file was deleted, the local session was signed out,
  the dev server was stopped, and `.env.local` was restored to emulator-first
  hosts. Future hosted Phase K reuse must reset the synthetic passwords through
  Firebase Auth. No blocker remains for `QA-I09`, and this evidence completes
  `QA-I11` without recording a password, token, secret value, or customer
  payload.
- `2026-08-12` - Every Phase I cloud command used exact project
  `menulist-qa`; no command targeted project id `menulist`, which remained
  absent from the authenticated Firebase project inventory. This completes
  `QA-I12`.
- `2026-08-12 11:20 IST` - `npm run verify:functions-deploy-preflight` passed
  the MenuList Functions lint and TypeScript build gates before deployment. The
  first deploy exposed a Firebase CLI dotenv collision because `.firebaserc`
  mapped both the default project and a same-name `menulist-qa` alias to the
  same `.env.menulist-qa` file. The redundant self-alias was removed and both
  deploy/readiness verifiers now guard that boundary; the default project
  remains exact `menulist-qa`.
- `2026-08-12 11:20 IST` - Fresh-project bootstrap enabled only the APIs needed
  by the maintained Functions bundle. The Firebase-prescribed Pub/Sub service
  agent token-creator grant and Compute default service-account Run invoker and
  Eventarc receiver grants were applied. Cloud Build readback showed this new
  project uses `113909530649-compute@developer.gserviceaccount.com` as its
  default build identity, so that exact service account received
  `roles/cloudbuild.builds.builder`. Artifact Registry cleanup was set to seven
  days for `gcf-artifacts`; no application read/write path or function quota
  changed.
- `2026-08-12 11:20 IST` - The organization domain-restricted-sharing policy
  initially rejected the public `allUsers` Cloud Run invoker required by the
  Firebase callable transport. A project-only override was created for exact
  project `menulist-qa`; both the current and legacy Organization Policy
  readbacks report public members allowed for that project. The temporary
  organization-policy administrator grant used to create the override was
  removed immediately. Production and sister projects were not changed.
  `processMenuImages` now has `allUsers -> roles/run.invoker`, while its callable
  handler still enforces Firebase authentication and tenant/store scope before
  application logic.
- `2026-08-12 11:20 IST` - The maintained ten-target deploy completed after the
  fresh-project IAM and first-use Eventarc propagation gates. A final targeted
  deploy of `processMenuImages` exited successfully after its invoker binding
  propagated. Firebase CLI readback reports all ten maintained targets
  `ACTIVE`, second generation, Node.js 22, and `us-central1`: `processMenuImages`,
  `processMenuImagesJob`, `menulistMaintenanceScheduler`,
  `computeDecisionBlocksScores`, `triggerDecisionBlocksScoring`,
  `triggerStoreNightlyScheduler`, `messagingOnboarding`,
  `backfillStoresSummary`, `mapsPlaceCheck`, and `verifyMenuPublish`. A
  provider-free unauthenticated callable probe reached `processMenuImages` and
  returned HTTP 401 with `UNAUTHENTICATED`, proving public transport reachability
  without bypassing application auth or invoking image processing. This
  completes `QA-I10`; no Vercel or production deploy was run.
- `2026-08-12 22:53 IST` - Commit `4bc4d0182` was pushed to exact branch
  `staging`. Vercel deployment `dpl_9jSJRpgEecstJH1kZYi9kHko6Exc` completed
  with target `preview` and status `Ready`; its generated branch alias is
  `menulist-core-git-staging-neelvara-systems.vercel.app`. Read-only Vercel CLI
  inspection confirmed all 39 configured variables are scoped to Preview for
  exact Git branch `staging`, with 13 Sensitive and 26 Non-sensitive rows. The
  push did not create or promote a Production deployment; the dashboard's only
  Production entry predates this push and remains a failed deployment from the
  prior day. This completes `QA-J01`, `QA-J02`, and `QA-J05`.
- `2026-08-12 22:53 IST` - Read-only Vercel domain inventory returned zero
  domains for the fresh `neelvara-systems` team, so `QA-J03` remains pending.
  Public DNS readback before any mutation found GoDaddy nameservers
  `ns19.domaincontrol.com` and `ns20.domaincontrol.com`, apex A record
  `216.198.79.1`, and `www` CNAME
  `9bd65540e56b2d57.vercel-dns-017.com`; `app`, apex AAAA, MX, apex TXT, and CAA
  returned no records. GoDaddy zone readback confirmed seven records total,
  including its default apex NS/SOA records, `_domainconnect` CNAME, and a
  `_dmarc` TXT policy. No DNS or domain assignment was changed during this
  inspection.
- `2026-08-12 23:26 IST` - The pre-change `menulist.digital` GoDaddy zone was
  captured as a restorable seven-record baseline: `A @ 216.198.79.1` with TTL
  600 seconds; default `NS @ ns19.domaincontrol.com.` and
  `NS @ ns20.domaincontrol.com.` with TTL one hour; `CNAME www
  9bd65540e56b2d57.vercel-dns-017.com.` with TTL one hour; GoDaddy-managed
  `CNAME _domainconnect _domainconnect.gd.domaincontrol.com.` with TTL one
  hour; the GoDaddy-managed apex SOA; and `TXT _dmarc "v=DMARC1;
  p=quarantine; adkim=r; aspf=r;
  rua=mailto:dmarc_rua@onsecureserver.net;"` with TTL one hour. No AAAA, MX,
  CAA, apex TXT, or SRV records were present. This completes `QA-B04` without
  changing nameserver authority.
- `2026-08-12 23:26 IST` - `menulist.digital` and `www.menulist.digital` both
  report **Valid Configuration** and exact Git branch `staging` in Vercel,
  completing `QA-B05`. `app.menulist.digital` was added to Preview for exact
  branch `staging`; Vercel requested `A app 76.76.21.21`, and the operator added
  that non-conflicting record in GoDaddy with TTL 600 seconds. Both authoritative
  GoDaddy nameservers and the system, Cloudflare, and Google public resolvers now
  return `76.76.21.21`; Vercel CLI inspection no longer reports a configuration
  warning. The subsequent dashboard refresh classified that legacy A target as
  functional but **DNS Change Recommended** because Vercel is expanding its IP
  range. Vercel supplied the project-specific preferred record `CNAME app
  dd4b150d15c50a85.vercel-dns-017.com.` and stated that `76.76.21.21` continues
  to work.
- `2026-08-12 23:31 IST` - The temporary `A app 76.76.21.21` record was removed
  and replaced by Vercel's exact project-specific `CNAME app
  dd4b150d15c50a85.vercel-dns-017.com.` target. GoDaddy now shows the expected
  eight-record post-change zone with no conflicting `app` A record. Public DNS
  readback returns that exact CNAME, and Vercel reports **Valid Configuration**
  with exact Git branch `staging` for `app.menulist.digital`. An HTTPS header
  probe reaches Vercel and redirects to Vercel SSO because Preview deployment
  protection is active; this is not a DNS failure and remains a later browser
  smoke concern. This completes `QA-B06`.
- `2026-08-12 23:33 IST` - `*.menulist.digital` was added to Vercel Preview for
  exact Git branch `staging` with no redirect, completing the assignment portion
  of `QA-B07`. Vercel correctly reports **Invalid Configuration** until DNS
  authority moves from GoDaddy to `ns1.vercel-dns.com` and
  `ns2.vercel-dns.com`. Read-only Vercel DNS inspection found the destination
  zone already contains Vercel-managed apex and wildcard `ALIAS` records aimed
  at `dd4b150d15c50a85.vercel-dns-017.com`, plus Vercel's default certificate
  `CAA` records for Google Trust Services, Sectigo, and Let's Encrypt. Before
  changing nameservers, the portable `_dmarc` TXT policy must be recreated in
  Vercel DNS. The GoDaddy-managed NS, SOA, and `_domainconnect` records must not
  be copied, and the old apex/`www`/`app` routing records are superseded by the
  managed Vercel `ALIAS` records. Wildcard validation remains pending under
  `QA-B08` and `QA-B10`.
- `2026-08-12 23:35 IST` - The portable `_dmarc` TXT policy was recreated in
  Vercel DNS as record `rec_04dac82323806804289f662e`. Read-only destination-zone
  verification returned that exact policy together with the managed apex and
  wildcard `ALIAS` records and Vercel's three default certificate `CAA`
  records. This matches the portable content from the pre-change GoDaddy
  baseline: there were no MX, apex TXT, AAAA, SRV, or additional CAA records to
  migrate. The destination zone is therefore ready for the registrar
  nameserver switch; `QA-B08` remains pending until public NS propagation and
  post-switch record verification pass.
- `2026-08-12 23:37 IST` - GoDaddy accepted the custom nameserver change and
  displays only `ns1.vercel-dns.com` and `ns2.vercel-dns.com`. Direct queries to
  Vercel's authoritative nameserver already return the expected apex, `www`,
  `app`, and synthetic wildcard A answers plus the preserved `_dmarc` TXT
  policy. The `.digital` registry and the system, Cloudflare, and Google public
  resolvers still return the previous `ns19.domaincontrol.com` and
  `ns20.domaincontrol.com` delegation with a one-hour registry TTL, so wildcard
  public resolution is not complete yet. This is normal delegation propagation;
  no further GoDaddy DNS-record mutation is required. `QA-B08` remains pending
  until registry/public NS readback changes to Vercel and the wildcard HTTPS
  check succeeds.
- `2026-08-12 23:37-23:41 IST` - Eight direct `.digital` registry polls at
  30-second intervals continued to return the previous GoDaddy delegation. The
  registry advertises a 3,600-second NS TTL. This bounded poll confirms the
  setup is waiting on external registry publication rather than another Vercel
  or GoDaddy configuration action; do not resave the nameservers or delete the
  old GoDaddy zone while propagation is pending.
- `2026-08-12 23:45 IST` - Independent of DNS propagation, read-only Vercel
  deployment inspection confirmed Preview deployment
  `dpl_9jSJRpgEecstJH1kZYi9kHko6Exc` remains **Ready**, targets `preview`, and
  was built from branch `staging` at commit `4bc4d01`. Exact-branch Preview env
  readback, with secret values never printed, confirmed Firebase project
  `menulist-qa`, Auth domain `menulist-qa.firebaseapp.com`, Storage bucket
  `menulist-qa.firebasestorage.app`, environment `preview`, Vercel environment
  `preview`, and emulators `false`. The temporary mode-0600 env file was
  truncated immediately after the bounded readback. This completes `QA-J04`;
  no deployment or environment mutation was performed.
- `2026-08-12 23:46 IST` - HTTPS probes to the QA custom domains currently
  receive a Vercel Authentication redirect before Next.js middleware. Vercel's
  current Deployment Protection contract applies authentication to every
  request, so leaving this project-level gate enabled would block ordinary QA
  customer-link access and third-party Razorpay/Meta webhook delivery. The
  project Deployment Protection screen must be reviewed before Phase K; no
  protection setting was changed during this diagnosis.
- `2026-08-12 23:46 IST` - Vercel Project -> Settings -> Deployment Protection
  confirms **Require Log In** is enabled with **Standard Protection**. Password
  Protection and per-domain Deployment Protection Exceptions each require the
  $150/month Advanced Deployment Protection add-on, while automation bypass
  headers do not solve ordinary customer browsers, OAuth callbacks, or external
  webhook providers. The approved zero-cost QA path is therefore to disable
  project-level Vercel Authentication, while retaining MenuList application
  authentication, exact QA Firebase isolation, crawler blocking, and route/API
  authorization. Do not purchase an add-on. Completion waits for a fresh
  unauthenticated request to reach the application rather than Vercel SSO.
- `2026-08-12 23:47 IST` - Vercel Authentication was disabled and saved without
  purchasing an add-on. Fresh unauthenticated requests now reach the application:
  apex and `www` return HTTP 200, `app.menulist.digital/signin` returns HTTP 200,
  and `app.menulist.digital/api/version` returns HTTP 200 with build
  `4bc4d018204a2c82744a8e2ee320c9205a346aff`, environment `preview`, and the
  expected deployment URL. The website and app responses include
  `X-Robots-Tag: noindex, nofollow, noarchive`; the generated branch alias is
  also public and returns `X-Robots-Tag: noindex`. The apex `/create-menu`
  request returns HTTP 308 to `https://app.menulist.digital/create-menu`.
- `2026-08-12 23:47 IST` - The `.digital` registry, Cloudflare, and Google now
  all return only `ns1.vercel-dns.com` and `ns2.vercel-dns.com`, and public DNS
  returns Vercel addresses for a synthetic wildcard hostname. This completes
  `QA-B08` and confirms the branch deploy was correctly deferred until after
  the env/Firebase gates, completing `QA-B09`. Wildcard HTTPS still fails its
  TLS handshake while Vercel provisions the wildcard certificate, so `QA-B10`
  and `QA-J03` remain pending.
- `2026-08-12 23:47 IST` - A request to the owner API from synthetic tenant
  origin `https://dns-smoke-20260812.menulist.digital` returned HTTP 403 with
  `CORS policy: Origin not allowed` and no `Access-Control-Allow-Origin` header.
  This completes `QA-K18`. Apex, `www`, and app crawler-isolation checks pass,
  but `QA-K17` remains pending until the wildcard TLS endpoint can be checked.
  `QA-K04` is complete from the live version response; `QA-K01` through
  `QA-K03` remain pending visual browser verification despite their successful
  HTTP responses.
- `2026-08-13 01:03 IST` - Vercel's domain dashboard changed the wildcard label
  to **Proxy Status Unknown** with `Failed to check whether a proxy is in front
  of this domain`. Direct verification proves this is a non-blocking dashboard
  detector failure, not a DNS, proxy, certificate, or assignment failure:
  Vercel CLI reports the domain on the Edge Network with intended/current
  nameservers matching; registry, Cloudflare, Google, authoritative, public,
  and workstation DNS resolve arbitrary tenant hosts; and two independently
  named wildcard hosts complete HTTPS and return HTTP 200 from middleware path
  `/client/[[...slug]]` with tenant-subdomain headers. The active Let's Encrypt
  certificate has CN/SAN `*.menulist.digital` and is valid from
  `2026-08-12T17:22:49Z` through `2026-11-10T17:22:48Z`. Wildcard
  `/api/version` reports exact Preview commit `4bc4d01`; `robots.txt` returns
  `Disallow: /`, `/sitemap.xml` returns HTTP 404, and every response carries
  `X-Robots-Tag: noindex, nofollow, noarchive`. This completes `QA-B10`,
  `QA-J03`, and `QA-K17`. Do not change DNS to address the dashboard-only proxy
  classification.
- `2026-08-13 01:05 IST` - Read-only visual browser verification at a
  `1280x720` viewport completed the three public entry gates. The apex and
  `www` hosts rendered the MenuList QA website with the expected navigation,
  hero, customer-link actions, and optional-analytics banner; neither emitted
  a browser console error. `https://app.menulist.digital/signin` rendered the
  canonical MenuList owner sign-in with both Google and email entry paths.
  The sign-in page emitted the bounded diagnostic `[Firebase Bootstrap]
  Operation failed` because this first QA boot intentionally skipped
  App Check/reCAPTCHA and the branch-scoped Preview environment therefore has
  no `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`; `initAppCheck` returns without creating
  App Check in that case, so the diagnostic does not block Firebase Auth.
  This completes `QA-K01`, `QA-K02`, and `QA-K03`. App Check remains skipped
  until normal Auth, Firestore, and Storage smoke has passed, as recorded in
  `QA-F01`.
- `2026-08-13 01:14 IST` - Live email/password smoke used only synthetic
  `QA owner A`; its temporary password was rotated for this test and was not
  printed, logged, documented, or placed in shell history. Firebase Auth
  accepted the credential and the live Preview reached `/dashboard`, then the
  expected no-subscription guard routed the fixture to `/billing`. The first
  access-status check failed closed with `TENANT_REFERENCE_INVALID`. Bounded
  QA-only readback found contradictory legacy aliases on both synthetic user
  documents: canonical `tenantId/storeId` values were `1/1` and `2/2`, while
  `tId/sId` were `0/0`. A two-document batch in project `menulist-qa` repaired
  only those synthetic aliases to `1/1` and `2/2`; Auth claims already carried
  the matching `ML` owner scopes. Reauthentication then remained on the owner
  shell and settled at `/billing` with **No Active Subscription**, without the
  access-ended modal. Subsequent automatic `/api/auth/access-status` requests
  returned HTTP 200 in Vercel Preview with no authorization-failure log. This
  completes `QA-K05` and `QA-K07`; the Billing destination is expected for
  these deliberately unsubscribed fixtures.
- `2026-08-13 01:39 IST` - Google OAuth smoke used the named QA test user
  `admin@neelvara.com` and the exact callback
  `https://app.menulist.digital/api/auth/callback/google`. The first callback
  failed closed at `/unauthorized`: Vercel recorded bounded
  `oauth_user_create_failed` / `AuthSecurityUnavailableError` diagnostics and
  no redirect-domain mismatch. Readback confirmed that this listed OAuth test
  identity had no MenuList QA user document. A QA-only owner document was
  therefore provisioned with deterministic OAuth id, product `ML`, and the
  existing synthetic tenant/store A scope `1/1`; no production record or new
  tenant was created. The repeated Google chooser flow then completed and
  landed at `https://app.menulist.digital/dashboard`. Firebase Auth readback
  confirms the resulting identity is enabled and carries only the expected
  `ML` owner, tenant/store `1/1`, and store-list claims. This completes
  `QA-K06`.
- `2026-08-13` - Owner onboarding remained on the canonical app host. Opening
  `https://menulist.digital/create-menu` redirected to
  `https://app.menulist.digital/create-menu`; the existing Google-authenticated
  owner session remained valid, and the subsequent upload preview stayed at
  `https://app.menulist.digital/create-menu/preview/f5222684-e923-5ac1-85ab-3897b5e65752`.
  This completes `QA-K08`.
- `2026-08-13` - One bounded QA upload used the repository-owned 205,041-byte
  PNG `featured-choices-public-menu.png`. The live app created
  `publicMenuDrafts/f5222684-e923-5ac1-85ab-3897b5e65752` and
  `menuImageProcessingJobs/public_f5222684-e923-5ac1-85ab-3897b5e65752` in
  Firestore project `menulist-qa`, then stored the exact 205,041-byte
  `image/png` object at
  `publicMenuDrafts/f5222684-e923-5ac1-85ab-3897b5e65752/menu.png` in bucket
  `menulist-qa.firebasestorage.app`. This completes the positive QA-project
  write evidence for `QA-K11` and `QA-K12`; the separate production-absence
  check remains `QA-K13`.
- `2026-08-13` - The same extraction job remained `pending`, progress `0`,
  current step `Queued`, with no `startedAt`, completion, or error after the
  upload. Its public draft also remained unclaimed with `extractionStatus`
  `pending`. This proves `processMenuImagesJob` never claimed the Firestore
  create event, so the active blocker is Eventarc/Firestore trigger delivery or
  trigger wiring rather than a Gemini failure inside the worker. Vercel's
  earlier bounded `public_menu_identity_check` HTTP 429 degraded to the durable
  queue as designed and is not what left this job unclaimed. `QA-K09` and
  `QA-K10` remain pending until this trigger path is repaired and one bounded
  extraction finishes.
- `2026-08-13` - The controlled batch-worker negative-auth request reached
  `https://app.menulist.digital/api/image-generation/batch-generation` with a
  deliberately false task secret and returned HTTP 403 with generic
  `{"error":"Forbidden"}` output. This proves the first half of `QA-K20`; a
  one-item normal queue acceptance test remains pending.
- `2026-08-13` - Fresh read-only Vercel log inspection for Preview deployment
  `dpl_9jSJRpgEecstJH1kZYi9kHko6Exc` found no missing-environment-variable,
  Firebase-project mismatch, or unresolved OAuth/access-status error in the
  current one-hour window. The only secret-related entries were six deliberate
  wrong-worker-secret requests from the controlled `QA-K20` negative test.
  Older error rows correspond to the already repaired synthetic scope aliases,
  the first OAuth provisioning attempt, the durable create-menu fallback, and
  a malformed backslash path probe; none is a current configuration blocker.
  This completes `QA-K14`.
- `2026-08-13` - One metadata-only controlled server event reached Sentry
  project `menulist-qa` as issue `MENULIST-QA-3`, event
  `e1c85343403d4122b2fe74735f226229`. Provider readback reports environment
  `preview`, release `4bc4d018204a`, handled `yes`, source
  `controlled-server-sdk`, verification tag `menulist-qa-k15`, no user, and no
  request URL or raw payload. This completes `QA-K15` without exposing a DSN or
  other secret.
- `2026-08-13` - Optional post-deploy monitoring was intentionally skipped for
  this initial QA pass. No owner-controlled UptimeRobot account or named alert
  operator is configured, and optional analytics remain skipped under the
  earlier consent decision. The two approved endpoints remain documented for a
  later owner-controlled monitor setup; no wildcard-per-tenant monitor was
  created. This completes `QA-K16` as an explicit skip, not an unreviewed gap.
- `2026-08-13` - No-go review confirms this setup changed only MenuList QA
  project `menulist-qa`, Preview branch `staging`, and `menulist.digital` QA
  hosts. It did not deploy Vercel Production, write to production Firebase,
  activate retired MenuList QA hostnames, or configure Answerlattice,
  CampaignCue, SignalDesk, MyCodex, `menulist.ai`, `app.menulist.ai`, or
  `menulist.online`. This completes `QA-K19`.
- `2026-08-13` - Read-only production-absence verification remains blocked,
  correctly, rather than inferred. Local `.env.prod` identifies Firebase
  project `menulist` but intentionally contains no Admin client email/private
  key, the local `gcloud` session has no active account, and Google Cloud/Firebase
  administrator pages require password reauthentication. `QA-K13` stays open
  until an administrator can prove that the exact QA draft, job, and Storage
  object IDs are absent from production.
- `2026-08-13` - Firebase Functions dashboard readback for
  `processMenuImagesJob` reports one 24-hour request, zero billable instance
  time, Node.js 22, 2 GiB, 9-minute timeout, and the deployed Firestore
  `document.created` trigger. Together with the unclaimed pending job, this
  narrows the failure to trigger ingress/IAM or startup before the first
  Firestore transaction. Exact Cloud Run IAM, Eventarc trigger metadata, and
  Functions logs require the same administrator reauthentication, so no source
  patch or blind redeploy was attempted. `QA-K09`, `QA-K10`, and the positive
  half of `QA-K20` remain blocked on that evidence-led repair.
- `2026-08-13` - The retained `functions/firebase-debug.log` from the original
  scoped deployment supplies the missing infrastructure evidence. Firebase
  successfully created `processMenuImagesJob`, its active Eventarc trigger
  `processmenuimagesjob-367299`, the exact
  `menuImageProcessingJobs/{jobId}` Firestore path filter, and the compute
  service-account trigger identity. The same deployment then attempted to grant
  `allUsers -> roles/run.invoker` on the callable `processMenuImages` Cloud Run
  service. Google rejected that IAM write with HTTP 400 because the member did
  not belong to a permitted customer, explicitly identifying an organization
  policy. The deploy summary was 10 Functions deployed and one errored. This is
  Domain Restricted Sharing evidence, not another Rules API HTTP 503. Public
  callable and Meta webhook ingress cannot be considered repaired until the
  owner grants a narrowly reviewed project policy exception or chooses an
  architecture that does not require unauthenticated Cloud Run ingress.
- `2026-08-13` - A second deterministic extraction defect was reproduced from
  the live QA fixture. Cloud Functions injects
  `FIREBASE_CONFIG.storageBucket = menulist-qa.firebasestorage.app`, but the
  three Functions consumers synthesized `menulist-qa.appspot.com` whenever no
  explicit bucket env existed. A shared resolver now admits the exact deployed
  `FIREBASE_CONFIG.storageBucket` before the project-derived legacy fallback,
  and `processMenuImages`, `processMenuImagesJob`, and messaging asset
  intelligence all use it. Source gates reject duplicated consumer fallbacks.
  Compiled runtime checks passed for explicit env precedence, the deployed
  Firebase config shape, malformed-config fallback, Functions lint/build,
  agent readiness, tenant safety, callable scope, sensitive server-store scope,
  and CSP boundaries.
- `2026-08-13` - Bounded recovery of only the synthetic QA draft/job proved the
  storage correction through Firestore claim, QA Storage object validation,
  download, and Upstash admission. One transient 1.5-second Upstash timeout
  failed closed; an immediate direct atomic-provider check passed three times
  and the next worker attempt advanced to Gemini. Gemini then returned HTTP 429
  for file upload across all four QA keys after the maintained rotation and
  bounded backoff policy, so the job correctly ended `failed` with
  `FILE_ERROR` and no extracted data. `QA-K09` and `QA-K10` remain open on
  provider capacity plus deployed trigger repair; no provider limit was
  bypassed and no result was fabricated.
- `2026-08-13` - A fresh QA-only Firestore `onCreate` probe recreated the same
  synthetic extraction job and polled it every three seconds for one minute.
  It remained `pending`, progress `0`, step `Queued`, with no `startedAt` for
  the entire window. This independently confirms Eventarc delivery is still
  failing before worker execution. The smallest deploy target,
  `functions:processMenuImagesJob`, passed its lint/build predeploy but could
  not be published: the owner Firebase login requires `firebase login
  --reauth`, while an isolated QA service-account attempt lacks
  `iam.serviceAccounts.ActAs` on
  `menulist-qa@appspot.gserviceaccount.com`. No broader role was self-granted.
  A final owner-login attempt reached Google's password verification screen for
  `admin@neelvara.com`; it was stopped without accessing stored credentials,
  changing IAM, or leaving a deploy process running.
- `2026-08-13` - Razorpay route verification remains bounded to Test Mode. A
  wrong signature returned HTTP 400; the distinct QA webhook secret produced
  HTTP 200 and a processed `ML` ledger entry at
  `razorpayWebhookEvents/evt_menulist_qa_k21_1786566382077` in
  `menulist-qa`. `QA-K21` remains open because a provider-originated Razorpay
  Test Mode delivery and dashboard registration have not been evidenced; no
  live-mode payment or webhook was created.
- `2026-08-13` - The exact Meta callback is
  `https://us-central1-menulist-qa.cloudfunctions.net/messagingOnboarding/whatsapp`.
  Controlled GET and POST probes are rejected by Google IAM with HTTP 403
  before the handler, consistent with Domain Restricted Sharing preventing the
  required public invoker. `QA-K22` remains open; callback verification,
  `messages` subscription, and a bounded signed Meta test event cannot pass
  until public ingress is deliberately resolved and the Function is redeployed.
- `2026-08-13` - The complete local menu-extraction pipeline passed after
  repairing one time-sensitive WhatsApp adapter fixture. The fixture had used
  a fixed epoch that eventually aged beyond the maintained 30-day inbound
  retention boundary; it now derives the current test time. The rerun passed
  all 382 core extraction cases and every maintained lifecycle, Firestore,
  Storage, model-input, publish, messaging, WhatsApp adapter, and upload-content
  validation stage. Expected warning/error logs from negative provider cases
  were asserted by the tests and did not fail the gate.
- `2026-08-13` - Final Admin SDK readback was restricted to project
  `menulist-qa`. The synthetic draft still exists with extraction status
  `pending` and no extracted data; its job still exists with status `pending`,
  progress `0`, step `Queued`, no `startedAt`, no `completedAt`, and no error
  code. This preserves the bounded Eventarc probe for owner-side infrastructure
  repair and confirms no later background delivery changed the diagnosis.
- `2026-08-13` - Final QA status was consolidated into this checklist and
  shared with Codex. `QA-K23` is complete as an evidence handoff, while
  `QA-K09`, `QA-K10`, `QA-K13`, `QA-K20`, `QA-K21`, and `QA-K22` remain
  explicitly open. This guide does not authorize moving to production.
- `2026-08-13` - A Chrome-session owner-flow sweep reused only the synthetic
  `admin@neelvara.com` QA owner and deliberately excluded Firebase sign-in,
  reauthentication, password, and provider-auth flows. Desktop coverage
  included Dashboard/Today, Projects, Feedback, all Business Settings tabs,
  Growth Kits, Business Health, QR and print assets, Users, permissions,
  locations, billing, transactions, support, app appearance, public website,
  canonical redirects, and authorization boundaries for platform, reseller,
  and operations routes. No Razorpay checkout, WhatsApp send, provider write,
  production route, or destructive business-setting mutation was executed.
- `2026-08-13` - Project CRUD used one zero-value synthetic QA subscription and
  one synthetic project. Create and rename reached the intended tenant/store
  scope; opening Edit now closes the project-selector modal before showing the
  editor, preventing the two dialogs from overlapping. The hosted branch could
  not complete duplicate, publish, or normal delete because its NextAuth owner
  session had no matching client Firebase Auth identity. This is inside the
  explicitly excluded Auth boundary and was not bypassed. Exact Admin readback
  and shape checks removed both synthetic documents afterward; neither the
  project nor subscription remains in `menulist-qa`.
- `2026-08-13` - True mobile-owner smoke used an iPhone-class `393x852`
  viewport, touch/coarse-pointer capability, and the hosted `staging` owner
  session. Today, More, business profile, working hours, roles, locations,
  users, billing, feedback, public-presence, SEO/AEO, analytics, integrations,
  customer-app, Presence Monitor, and Help Centre screens rendered meaningful
  content without horizontal overflow; all primary navigation targets met the
  44px minimum. Hosted Menu and Share were blank after the scoped project read
  failed, and Menu Design reached the global error boundary when a fresh store
  had neither a subdomain nor custom domain.
- `2026-08-13` - Source fixes now make the mobile project provider expose a
  bounded load-failure state, give Menu and Share explicit recovery/retry UI,
  give Share a first-menu creation action, and prevent Menu Design from
  generating a strict tenant URL until a tenant host exists. Focused project,
  mobile-route, and contextual-state verifiers pass. The hosted Preview still
  serves commit `4bc4d018204a`, so post-fix browser certification remains
  pending an explicitly authorized Vercel Preview deployment; this run did not
  deploy Vercel.
- `2026-08-13` - The temporary `Closed Today` UI check left no residue: final
  Admin readback of `stores/1` in exact project `menulist-qa` reports no
  `tempStatus`. The local Next development server and mobile debug processes
  were stopped after testing. No production Firebase project was queried or
  changed as part of this owner-flow continuation.
- `2026-08-13` - Firebase CLI owner reauthentication completed as
  `admin@neelvara.com`. The Functions deploy preflight then exposed and repaired
  a stale package entrypoint: `functions/package.json` pointed at
  `lib/functions/src/index.js` even though TypeScript emits `lib/index.js`.
  The preflight now cleans `lib`, verifies the declared `main`, and rejects a
  stale output tree before any deploy. Functions lint, TypeScript build, the
  full 382-case menu-extraction pipeline, focused project/image-batch gates,
  root typecheck, and root lint all pass.
- `2026-08-13` - The smallest Firebase deploy published only
  `processMenuImages` and `processMenuImagesJob` to exact project
  `menulist-qa`. The active worker revision is
  `processmenuimagesjob-00005-hek`. The worker compute identity received only
  `roles/datastore.user`, which was the missing permission needed to claim its
  Firestore job. A fresh synthetic `onCreate` job then reached Eventarc trigger
  `processmenuimagesjob-367299`, started the current worker, claimed the job,
  validated the destination, uploaded to Gemini, and rotated all four QA keys.
  This supersedes the earlier unclaimed-trigger diagnosis.
- `2026-08-13` - The current extraction failure is correctly classified as
  retryable `RATE_LIMIT`, not generic `FILE_ERROR`. All four Gemini Files API
  attempts return HTTP 429 `RESOURCE_EXHAUSTED` because the AI Studio project
  reports depleted prepaid credits. The worker preserves that retryable
  provider classification and bounded processing-stage diagnostics. No limit
  was bypassed and no extraction result was fabricated. `QA-K09` and `QA-K10`
  remain open until provider credit exists and one real menu can finish and be
  published.
- `2026-08-13` - The operator chose a bounded hybrid Gemini QA policy and
  created unbilled Google AI Studio project `menulist-gemini-qa-free` for
  synthetic text extraction only. Real customer data must never use this
  free-tier credential, and paid-only image models remain on the existing
  `menulist-qa` credentials. Source inspection confirms the current MenuList
  gateway uses one shared key pool for text, Files API, and image methods, so
  the free credential was not yet wired or treated as active at that checkpoint.
  A separate server-side text-only credential pool, spend admission, failure
  isolation, and focused verifier coverage were required before `QA-E13` could
  complete. The new project is a provider billing
  boundary only; it is not a second Firebase project, deployed environment, or
  quota-multiplication strategy.
- `2026-08-13` - The proposal to reserve current key slot 1 for extraction and
  slot 2 for images was reviewed and rejected because the current `KeyManager`
  rotates every configured slot through one shared gateway; slot numbers do
  not enforce workload routing. The production proposal to create four Google
  projects for four quotas was also rejected. Google applies Gemini limits per
  project, and production capacity must use one governed paid project, its
  approved tier/quota-increase path, bounded retry/backpressure, and multiple
  same-project keys only for rotation, leak response, and availability. The
  accepted implementation direction is two explicit credential pools selected
  by operation: one free-project pool for synthetic QA text/File API work and
  one paid `menulist-qa` pool for image operations. No key value has been
  deployed under this decision yet.
- `2026-08-13` - Google AI Studio created exactly one authorization key named
  `MenuList QA synthetic text` in the filtered free project
  `menulist-gemini-qa-free` (Google-generated project id
  `gen-lang-client-0740061827`, project number `534438952454`). Evidence exposed
  only a masked key value. The credential is created but remains intentionally
  unwired: `QA-E13` is still pending secure vault capture, distinct text-pool
  implementation, Firebase Secret Manager wiring, scoped worker deployment,
  and a synthetic-only hosted extraction smoke. No second key, billing setup,
  production credential, or paid call was created.
- `2026-08-13` - The operator confirmed the `MenuList QA synthetic text`
  credential is vaulted. The repository never receives or records its value.
  Source now uses the environment-neutral Firebase secret name
  `MENULIST_GEMINI_TEXT_AI_KEY` for the dedicated menu text/File API gateway;
  the existing `GEMINI_AI_KEY*` pool remains separate. Vault capture is
  complete, while Firebase Secret Manager transfer, scoped QA worker deploy,
  and synthetic hosted smoke evidence remain pending.
- `2026-08-13` - Firebase Secret Manager created
  `projects/113909530649/secrets/MENULIST_GEMINI_TEXT_AI_KEY/versions/1` in
  `menulist-qa` from the vaulted value. The value was entered interactively and
  is absent from source, shell history, docs, and logs. Secret transfer is
  complete; scoped `processMenuImagesJob` deployment and synthetic hosted smoke
  remain pending.
- `2026-08-13` - The scoped deploy of
  `functions:processMenuImagesJob` to `menulist-qa` passed predeploy lint/build
  and completed. The active Node.js 22 revision in `us-central1` has source hash
  `61d035e45023bb5c8561d2454c9fe24643805f83` and binds only
  `MENULIST_GEMINI_TEXT_AI_KEY`, `REVALIDATION_SECRET`, and the two Upstash
  rate-limit secrets. It does not bind any `GEMINI_AI_KEY*` slot, proving the
  deployed extraction worker cannot rotate onto the paid image/shared pool.
- `2026-08-13` - Two disposable hosted public-draft extraction probes used a
  fresh UUID, the repository-owned `featured-choices-public-menu.png` fixture,
  platform tenant/store scope only, and a one-hour expiry. Both reached the
  deployed worker, passed the public-draft/routing checks, and terminated with
  bounded `FILE_ERROR`; each probe then deleted its job document, draft
  document, and Storage object. An independent fetch of the same synthetic
  Storage URL returned `200`, `image/png`, and the expected 205041 bytes.
  Direct in-memory provider probes, with no key value printed, identified the
  upstream cause: `MENULIST_GEMINI_TEXT_AI_KEY` returns HTTP 403
  `PERMISSION_DENIED` with `Your project has been denied access` for both text
  generation and Files API upload. Google AI Studio confirms
  `menulist-gemini-qa-free` and the account's default Gemini project are
  `Restricted` with billing `Unavailable`. The four existing `menulist-qa`
  keys each return HTTP 429 `RESOURCE_EXHAUSTED` because prepayment credits are
  depleted; AI Studio reports `Prepay required`. The Files API itself is not a
  paid-only feature. `QA-E13` remains open until Google restores free-project
  access or the owner funds `menulist-qa`, the secret is rotated to an admitted
  key, the worker is redeployed to the resulting secret version, and one
  synthetic hosted extraction completes. No customer data or production key
  was used.
- `2026-08-13` - The owner permanently retired the free-tier Gemini exception
  for MenuList QA. QA and production now require paid keys from each
  environment's single governed Gemini project. The dedicated extraction pool
  remains because it provides independent credential rotation and prevents
  extraction from falling back into the shared image/general pool; it is not a
  project-quota scaling mechanism. Shared MenuList source discovery is reduced
  to primary plus rotations 2 and 3. Existing paid provider slot 4 is reserved
  for menu extraction; the former slot-4 runtime aliases are retired from both
  the Next.js and Functions shared clients, Function secret groups, and the
  three Decision Blocks bindings.
- `2026-08-13` - Google AI Studio rejected an attempted fifth paid QA key with
  `The request is suspicious`; the same provider action was not retried. The
  existing paid `MenuList QA rotation 4` credential was instead copied through
  the system clipboard directly into Firebase Secret Manager without printing
  or storing its value. This created
  `projects/113909530649/secrets/MENULIST_GEMINI_TEXT_AI_KEY/versions/2`.
  The clipboard was cleared immediately. The active worker still required a
  scoped redeploy before version 2 could take effect, and funded provider smoke
  remained blocked by `menulist-qa` prepay.
- `2026-08-13` - The paid credential policy was deployed to `menulist-qa`.
  `processMenuImagesJob` is `ACTIVE` on Node.js 22 with source hash
  `f3103a15d669037839dd6de1c29cb674eda22f4e` and binds only
  `MENULIST_GEMINI_TEXT_AI_KEY` version 2 plus its non-AI worker secrets.
  `processMenuImages`, `mapsPlaceCheck`, the MenuList maintenance scheduler,
  and the Decision Blocks functions bind shared slots 1-3 only; none binds
  `GEMINI_AI_KEY_4`. The retired extraction secret version 1 is `DESTROYED`;
  Firebase destroyed `GEMINI_AI_KEY_4@1` and removed the now-empty duplicate
  secret. Vercel removed `MENULIST_GEMINI_AI_KEY_4` from Preview restricted to
  branch `staging`. The paid extraction credential now exists at runtime only
  as `MENULIST_GEMINI_TEXT_AI_KEY` version 2.
  A bounded synthetic version-2 provider probe reached the paid project and
  returned HTTP 429 `PREPAY_REQUIRED_OR_QUOTA`, replacing the former free-key
  HTTP 403 boundary. `QA-E13` is now blocked only by prepay and one successful
  hosted synthetic extraction.
- `2026-08-13` - Google Payments identity verification completed and the
  governed `menulist-qa` AI Studio prepay balance was funded with INR 1,000;
  auto-reload remains off. The maintained Functions preflight and 64-case menu
  extraction dry-run passed. One disposable hosted public-draft certification
  job, `public_30770eeb-8ca3-43a1-8f2e-3311cffef7f7`, used the repository-owned
  205041-byte `featured-choices-public-menu.png` fixture at platform scope
  `0/0`, with `skipProjectSave=true` and a one-hour draft expiry. The active
  worker used `MENULIST_GEMINI_TEXT_AI_KEY` version 2 and
  `gemini-3.5-flash-lite`, completed with 1 category, 8 items, quality score
  100, and a recorded AI transaction. Cloud Logging showed no error entries
  for the run. The synthetic Firestore job, public draft, and Storage object
  were deleted and independently confirmed absent. No real customer data,
  production target, project save, Firebase deploy, or Vercel deploy was used.
  `QA-E13` is complete; this evidence does not close project CRUD,
  customer-link, device, payment, messaging, or other provider gates.
- `2026-08-13` - Four retired compatibility exports were inadvertently named in
  the first scoped Firebase command: `embedArticleWorker`, `startGeneration`,
  `retryGeneration`, and `finalizePublish`. They were deleted immediately from
  `us-central1`; a subsequent `firebase functions:list --json` confirmed all
  four are absent. No production Firebase target was used.
- `2026-08-13` - Deletion of the retired free-project provider key failed twice
  in Google AI Studio with `Failed to delete API key. Please retry.` The same
  provider action was not repeated. Its Firebase secret version is destroyed
  and the free project is not used by any deployed revision. Google Cloud then
  required password re-authentication before provider-side deletion, so the
  credential page was left open for the owner to complete that final cleanup.
- `2026-08-13` - The owner completed Google password re-authentication and
  deleted the retired `MenuList QA synthetic text` provider key from project
  `gen-lang-client-0740061827`. AI Studio now lists only the four paid
  `menulist-qa` credentials: primary, shared rotations 2 and 3, and the
  provider key still displayed as `MenuList QA rotation 4`. Slot 4 is not a
  runtime rotation slot; it is the dedicated extraction credential stored in
  Firebase as `MENULIST_GEMINI_TEXT_AI_KEY` version 2. Rename its provider
  display name to `MenuList QA menu extraction` when the console permits so
  operators do not mistake it for shared quota or failover capacity.
- `2026-08-13` - Final scoped deploy/readback after retiring the slot-4 aliases
  confirms all seven affected QA revisions are `ACTIVE`. `processMenuImages`
  and `mapsPlaceCheck` use hash `bbee32a3e76e26d57aa9fbeb8af44e7e05bbedc4`;
  `processMenuImagesJob` uses
  `f3103a15d669037839dd6de1c29cb674eda22f4e`;
  `menulistMaintenanceScheduler` uses
  `19b118c365dc21f48bcb6c8c6bb6b97aa814704b`; and the three Decision Blocks
  exports use `c1dcc16e28f352c1deb99f2dd6fd10afadb88b82`. Shared revisions bind slots
  1-3 only and the extraction worker binds version 2 only. Firebase CLI exited
  non-zero because it could not reapply the existing invoker IAM policy for
  `menulistMaintenanceScheduler` and `computeDecisionBlocksScores`. Live
  readback confirms both new revisions are active; independent IAM-policy
  readback remains operator evidence and was not represented as passing.
- `2026-08-13` - Vercel Preview deployment
  `dpl_4VTwaJ1TAENTffk8ZW3bBhxoySHN` is Ready for staging commit
  `158f19219e3e72936ac3c360330069d7ed59d152`. Live
  `https://app.menulist.digital/api/version` returns that exact build id,
  environment `preview`, and deployment URL
  `menulist-core-bnr9dwfc3-neelvara-systems.vercel.app`.
- `2026-08-13` - `QA-K20` is complete. The maintained wrong-secret request
  still returns generic HTTP 403. A real task was then created in
  `projects/menulist-qa/locations/us-central1/queues/batch-image-generation`
  with the configured QA secret and an actual-shaped tenant/store project id.
  The task reached `app.menulist.digital` on the current Preview deployment,
  returned HTTP 200 through the intended idempotent `job no longer exists`
  path, and was removed from the queue after acknowledgement. Vercel logs show
  the exact POST route, branch `staging`, environment `preview`, and status 200;
  no image-provider call, durable image job, or production write was created.
- `2026-08-13` - `QA-K21` is complete for Razorpay Test Mode webhook transport.
  The exact QA endpoint is enabled with 12 route-handled events:
  `payment.failed`, `order.paid`, `refund.processed`, `subscription.paused`,
  `subscription.resumed`, `subscription.activated`, `subscription.pending`,
  `subscription.halted`, `subscription.charged`, `subscription.cancelled`,
  `subscription.completed`, and `subscription.updated`. One
  disposable INR 1 Test Mode order completed through Razorpay's mock netbanking
  success path and generated a provider-originated `order.paid` delivery.
  Vercel Preview logs record the exact POST to `/api/razorpay/webhook` on branch
  `staging` with HTTP 200, a present event id, and a present product id. The
  route's maintained negative smoke still rejects a false signature. Guarded
  cleanup removed the exact temporary QA payment audit and webhook ledger, and
  bounded Firestore REST readback confirmed both identities absent. No real
  money, Live Mode operation, production read, or production write was involved.
  A later readback superseded the earlier Plans/Subscriptions HTTP 401 result:
  both APIs now return HTTP 200, and the dashboard exposes subscription events.
  At the time of this transport certification, `subscription.authenticated`
  remained intentionally unsubscribed because the hosted route had no handler
  for that provider-only pre-activation state; the local `pending` row remained
  non-entitled until an authoritative active/captured transition.
- `2026-08-13` - Source lifecycle hardening supersedes the earlier 12-event
  target after the next Vercel staging deployment. The route now explicitly
  handles all 10 subscription events: authentication and activation remain
  local `pending`; activation records provider/cycle metadata and marks captured
  settlement outstanding without entitlement. Only a matching captured charge
  settles payment, activates paid access, and resets credits. Source, pure contract,
  and Firestore-emulator matrices pass 10/10 events plus no-quantity
  `subscription.updated`. Keep the Razorpay Test webhook on its currently
  certified 12-event set until the hardened route is hosted; then add
  `subscription.authenticated` as the 13th total configured event and run a
  provider Test Mode lifecycle matrix.
- `2026-08-13` - Follow-up code review added canonical
  `x-razorpay-event-id` dedupe, collision-safe hashing for unsafe event IDs,
  exact event/provider-status admission before the event claim, and captured
  payment/subscription identity checks for charged settlement. Emulator proof
  also covers late charged delivery after cancelled/completed without reopening
  entitlement or resetting consumed credits. These source changes remain part
  of the same pending Vercel staging deployment; do not change the dashboard's
  certified 12-event selection before that deployment is Ready.
- `2026-08-13` - The reconciliation half of that hardening is deployed to QA.
  The scoped Firebase deployment was repeated after the shared pending-checkout
  policy and final reconciliation source were frozen. Readback reports
  `menulistMaintenanceScheduler` `ACTIVE` in `us-central1` on Node 22 at hash
  `3ba1fd91827c88f7bd56959324994d5fd38bb226`, with `RAZORPAY_KEY_ID` and
  `RAZORPAY_KEY_SECRET` still bound to version 1. Hosted app readback remains
  Vercel Preview build `87abeca436e32ab4febaf405dd87f50da73c6d2c`,
  which matches checked-out `HEAD` but not the uncommitted route hardening. No
  Vercel or production deployment occurred; therefore the Razorpay dashboard
  must remain on the certified 12-event set until the new Preview is Ready.
- `2026-08-13` - A read-only Firestore REST audit through the authenticated
  Firebase CLI session inspected aggregate shape only. The one `ML` subscription
  is pending, Razorpay-backed, exact-dual-product scoped, exact tenant/store alias
  scoped, and has a valid provider subscription identity, HTTPS checkout URL,
  array billing history, and array status history. It has no captured payment
  evidence and zero active-without-payment, pending-with-payment, provider,
  scope, alias, or malformed-history anomalies. The legacy row predates explicit
  `providerStatus: created`; this cannot grant access, and the hardened Continue
  Checkout route fetches provider truth before deciding whether to reopen, wait,
  or replace that checkout.
- `2026-08-13` - A final active-status consumer sweep found that Founder Monitor
  still projected unverified local `active` rows into current MRR and unpaid
  `pending` checkout rows into past-due MRR. The shared Functions payment-evidence
  boundary now requires confirmed manual payment or an exact captured Razorpay
  `pay_*` history entry; current MRR additionally requires a current paid window.
  Pending checkout remains visible as payment attention only. Focused Functions
  and Founder Monitor gates passed before the scoped scheduler redeploy reflected
  by the active hash above.
- `2026-08-13` - The hosted MenuList billing flow created exactly one canonical
  Starter Yearly provider plan (`plan_TPGo0iCOW9gJmT`) and one disposable Test
  Mode subscription (`sub_TPGo1XmddplChB`) through the application path. This
  confirms the central provider-plan registry and subscription creation APIs are
  available; no manual Dashboard plan was created. Card authorisation reached
  Razorpay's saved-card token OTP boundary but was not bypassed with the dummy
  contact. A subsequent eMandate attempt reached Razorpay's mock-bank Success
  result, and bounded API readback records `payment_method=emandate` while the
  provider subscription remains `created` with no captured payment or billing
  cycle. No subscription lifecycle webhook has fired yet, so activation,
  settlement, and local entitlement synchronization remain pending provider
  transition evidence rather than a failed webhook configuration. No real
  money, Live Mode operation, production read, or production write was used.
- `2026-08-13` - The QA Cloud Run service for `messagingOnboarding` had no
  invoker binding even though the callable image service was already public.
  A narrowly scoped `allUsers -> roles/run.invoker` binding was applied only to
  QA service `messagingonboarding`; the exact callback now reaches the handler
  and returns HTTP 200 `OK`. The handler remains intentionally disabled under
  `ENABLE_MESSAGING_ONBOARDING=false`. `QA-K22` stays open until the flag is
  enabled for a controlled window, Meta verifies the callback, only `messages`
  is subscribed, and one provider-signed test event is captured.
- `2026-08-13` - `QA-K22` is complete. During one bounded QA-only window,
  `messagingOnboarding` was deployed with `ENABLE_MESSAGING_ONBOARDING=true`.
  Meta verified the exact `menulist-qa` callback using the vaulted verify token,
  and app `MenuList QA Messaging` subscribed only to the WhatsApp Business
  Account `messages` field at Graph API version `v26.0`. Cloud Logging records
  the controlled wrong-token GET at HTTP 403, the real Meta challenge at HTTP
  200 with `[WhatsApp] Webhook verification successful`, and a Meta dashboard
  test POST at HTTP 200 with no invalid-signature log. Bounded Firestore REST
  readback found no inbound-message or tracking documents from the provider
  sample, so no synthetic cleanup write was required. The flag was immediately
  restored to `false`; scoped redeploy/readback reports active hash
  `ee465f97efe387e86727b849b8f222534d6a6c84`, provider `whatsapp`, tracking
  enabled, and all four WhatsApp secret bindings still on version 1. The
  callback and sole `messages` subscription remain registered, but the app
  remains unpublished and provider processing is disabled. No production
  number, payment method, production project, publish-state change, or
  production message was used.
- `2026-08-13` - Post-`QA-K22` checklist reconciliation leaves nine unchecked
  rows: owner-governance items `QA-A05`, `QA-A11`, `QA-A12`, `QA-A13`,
  `QA-A15`, `QA-A16`, and `QA-A20`; the explicitly excluded Firebase Auth
  project-reload boundary `QA-K09`; and owner-controlled production-absence
  evidence `QA-K13`. Razorpay recurring API enablement is now confirmed; only
  provider-originated subscription activation/charge delivery and resulting
  local entitlement synchronization remain to be certified. That lifecycle
  evidence is not misclassified as a failed QA webhook transport check. No
  production query or destructive account cleanup was performed during this
  reconciliation.
- `2026-08-13` - Hosted project creation reached exact QA scope `1/1` and wrote
  its project plus summary entry, but reload certification is not accepted as a
  pass. Chrome's active MenuList PWA service worker continued serving immutable
  chunk hashes from an older Preview build while direct server HTML and
  `/api/version` served `158f19219`; the stale bundle also logged the bounded
  `[Firebase Bootstrap] Operation failed` diagnostic. Browser policy prevented
  opening Chrome's internal service-worker controls, and the direct current
  deployment correctly redirected to sign-in, which is outside this run's
  excluded Auth scope. The temporary wildcard slug therefore returned the QA
  noindex response with `Menu not found`, so `QA-K09` and `QA-K10` remain open
  for a fresh-browser/current-bundle authenticated rerun rather than being
  inferred from source or Admin data.
- `2026-08-13` - A fresh Chrome rerun on current Preview build
  `87abeca436e32ab4febaf405dd87f50da73c6d2c` superseded the earlier stale
  service-worker diagnosis. One zero-value, four-hour QA subscription admitted
  project creation at exact scope `1/1`; Chrome created and immediately loaded
  project `1-msrgdura-AIe2cGaeK9XhyBJkf6HN-1` with slug
  `qa-k09-crud-2026-08-13`. After a normal reload, the current immutable bundle
  logged bounded `[Firebase Bootstrap]` and `[Projects Page]` failures even
  though Vercel recorded HTTP 200 for `/api/auth/set-claims`. Update and normal
  delete therefore remain uncertified inside the explicitly excluded Firebase
  Auth boundary. No auth state was cleared, replaced, or bypassed, so `QA-K09`
  remains open.
- `2026-08-13` - `QA-K10` is complete. Because the clean QA store had no
  customer host, a unique disposable subdomain
  `qa-k10-cert-20260813.menulist.digital` was attached only to `stores/1` in
  `menulist-qa` after confirming no conflicting store. Chrome opened the OBP,
  followed its generated `View QA K09 CRUD 2026-08-13` link, and rendered the
  project menu with its honest `No items yet` state. Independent HTTP readback
  returned 200, `x-matched-path: /client/[[...slug]]`, the exact tenant
  subdomain headers, and `x-robots-tag: noindex, nofollow, noarchive`.
- `2026-08-13` - The focused host-routing verifier initially failed because it
  still asserted the retired unprefixed `BATCH_IMAGE_GENERATION_WORKER_URL`
  alias. Both environment templates already use the governed full product name
  `MENULIST_BATCH_IMAGE_GENERATION_WORKER_URL`; the verifier was aligned with
  that source-of-truth contract and rerun.
- `2026-08-13` - The customer-link rerun left no synthetic residue. Guarded
  cleanup removed the temporary subdomain, project, sole project-summary
  document, and zero-value subscription only after their expected identities
  were asserted. Independent Admin readback reports the three documents absent
  and `stores/1.subdomain` absent. Production Firebase and Vercel Production
  were not queried or changed.
- `2026-08-13` - Final cleanup removed and verified absent every synthetic
  certification artifact from `menulist-qa`: two project documents, the
  project-summary document containing three synthetic entries, the zero-value
  QA subscription, three public-menu drafts, three extraction jobs, the
  synthetic Razorpay webhook ledger entry, and all three uploaded draft
  objects. Cloud Tasks retained no probe task. Production Firebase and Vercel
  Production were not queried or changed; the separately controlled
  production-absence gate `QA-K13` remains open.
- `2026-08-13` - A repository-wide Gemini credential documentation audit
  reconciled every maintained MenuList AI System Layer doc, environment
  template, setup/launch runbook, owner action, production-readiness record,
  and focused verifier with the deployed contract: three shared paid keys plus
  one extraction-only paid credential. Dated March audits retain their original
  bodies as historical evidence but now warn that their four-slot/retry details
  are not current operator guidance. Answerlattice and SignalDesk `_4` slots
  remain untouched because they are separate product contracts. The ignored
  local `.env.local` slot-4 alias was removed without reading or displaying its
  value, and stale verifier/audit wording was aligned with the August 13
  Firebase authentication and scoped-deploy evidence. Changelog and source
  gates record the boundary; no provider setting, Firebase revision, or
  production target changed in this documentation pass.
- `2026-08-14` - Razorpay hosted certification deployed three bounded staging
  corrections. Build `de18a865a1c08603ba3f740c958b827246d99a65` proved
  authoritative pending state after checkout dismissal. Build
  `1234895fdd013fa03d59400dcd8253f6d9fd6d0b` fixed product-store resolution;
  a provider-originated `subscription.cancelled` automatic retry returned HTTP
  200 and owner Billing converged to no active subscription. Build
  `2780c22a821719b6c1ee7cf1543f2f45eb17d6be` fixed zero-value/missing-amount
  failed-payment audit projection and ordinary order-backed payment
  classification. The disposable subscription was cancelled and removed only
  after exact checks; the retained unpaid baseline was unchanged. The Test
  endpoint now has 13 events. Immediate authorization/charge and the original
  `payment.failed` automatic retry remain pending external provider evidence;
  `QA-K13` remains owner-controlled and open.
- `2026-08-14` - Preview commit `3fbff578cbef46c7b61f99afe17f416c9c889663`
  was confirmed live and matching `origin/staging`. Hosted project create and
  edit passed at scope `2/2`, including exact REST readback of the canonical
  project and updated literal summary projection. Reload then exposed a
  transient stale Firebase-auth readiness frame, and Duplicate/Delete exposed
  non-rendering static confirmation dialogs. Local source now keys Auth
  readiness to the exact session scope and uses one controlled selector action
  dialog. Session/project verifiers, focused ESLint, and TypeScript pass.
  Guarded cleanup removed only the disposable project, summary field, and
  zero-value entitlement; retained baseline `sub_TPGo1XmddplChB` remained
  unchanged. `QA-K09` stays open pending one staging push and clean hosted
  reload, duplicate-cancel, and delete proof.
- `2026-08-14` - Staging commit `6acb68b487de151bb369babb0fda323bef07decb`
  exactly matched `origin/staging` and hosted `/api/version`. A new disposable
  exact-scope `2/2` owner proved the two pushed browser fixes were present, but
  first-project loading exposed a separate missing-resource rule boundary.
  Local rules now permit only an exact same-tenant/store missing project read;
  cross-store, cross-tenant, and misbound existing reads remain denied, and the
  real read-then-create transaction passes the emulator. Firebase compiled an
  immutable ruleset with the exact local source hash. Although the release API
  initially returned HTTP 503, release readback later proved that exact ruleset
  active at `2026-08-14T04:52:56.959667Z`. Hosted create, reload persistence,
  edit, duplicate, duplicate-cancel, and normal delete then passed with exact
  Firestore shape proof. Guarded cleanup removed the six disposable Firestore
  documents and matching Auth user; the retained Razorpay baseline was
  unchanged. A later hard reload exposed a separate five-second client DAL
  session-cache expiry race. Its strict trusted-session priming fix passes
  focused local gates but is not in deployed commit `6acb68b`; `QA-K09` remains
  open only for that push and one clean hosted hard-reload rerun.
- `2026-08-14` - Staging commit
  `2bdeeb076e789c379c0d43f3382fd88030b6bd0e` exactly matched
  `origin/staging` and the custom-domain `/api/version` response; Vercel
  deployment `dpl_FWspseXxHrDmC4QxKkkNbvorJJ5Y` was `READY`. Source inspection
  confirmed that NextAuth deliberately omits `expires` from the RSC
  `getServerSession()` projection. The client session boundary now obtains one
  complete `/api/auth/session` payload, validates its stable identity and
  tenant/store/product scope against the trusted server projection, and passes
  only that complete session to both the DAL cache and client provider. Two
  authenticated hard reloads of `/projects` rendered the full owner shell and
  expected no-subscription guard. The prior
  `session_provider_session_prime_failed` and store-bootstrap failure did not
  recur. The only new console diagnostic was the already documented,
  intentionally non-blocking `app_check_site_key_missing` first-boot message.
  Combined with the completed hosted CRUD, exact Firestore projection, guarded
  cleanup, and customer-link proof on the preceding build, this closes
  `QA-K09`; `QA-K10` remains complete.
- `2026-08-14` - Secret-handling governance and the maintenance calendar were
  closed without exposing credentials. Secrets remain vaulted; this guide stores
  names, versions, redacted identifiers, and non-secret outcomes only. The
  company `admin@neelvara.com` Calendar now has a quarterly IAM/secret review
  from September 1, 2026 and an annual domain/payment/recovery review from
  August 1, 2027. Calendar search proved the recurring instances under
  `Neelvara Systems Admin`. Two series initially created through a connector
  authenticated to the retired personal account were detected from returned
  identity evidence and deleted immediately; they are not retained evidence.
- `2026-08-14` - Provider/account-security readback was refreshed without
  crossing private verification boundaries. Upstash MFA remains off; Razorpay
  has no active method or phone and requires owner phone/OTP setup; Meta stops
  at a code sent to a masked recovery email. Current Vercel CLI identity is
  `neelvara-admin` with one `neelvara-systems` team and one `menulist-core`
  project, which does not prove old-account retirement. MenuList QA has one
  current user-managed Firebase Admin key while its configured local key path
  is absent. Separate-product ignored credential files were not changed.
  `QA-A11`, `QA-A15`, and `QA-A20` remain open on exact owner-controlled proof.
- `2026-08-14` - The owner reaffirmed the one-person operating model and
  deliberately deferred `QA-A05`. `admin@neelvara.com` remains the secured
  sole maintainer/operator for QA; no second paid Workspace identity is being
  created merely to represent the same person. This does not mark the control
  complete: create a least-privilege named operator before routine access is
  delegated to another person, or when production operations justify
  separating daily work from Super Admin authority. Until then, use the admin
  account only from the controlled company profile and retain its existing MFA,
  recovery, and vault controls.
- `2026-08-14` - The owner enabled Upstash MFA and confirmed its recovery
  material is stored in the controlled company vault. No QR code, seed, OTP,
  recovery code, or credential value was shared. This closes the Upstash
  portion of `QA-A11`; Razorpay and Meta account-security evidence remain open.
- `2026-08-14` - The owner enabled Razorpay team-level 2-Step Verification and
  confirmed the recovery owner/reset information is stored in the controlled
  company vault. No phone number, OTP, password, or recovery detail was shared.
  This closes the Razorpay portion of `QA-A11`; Meta account and business-level
  two-factor evidence remains open.
- `2026-08-14` - The founder enabled two-factor authentication on the authentic
  personal Facebook profile temporarily administering the unpublished Meta QA
  assets and confirmed its recovery codes are vaulted. The profile remains a
  personal identity, not a company-owned or shared account, and this evidence
  does not approve it as the permanent production ownership model. No masked
  recovery address, QR code, seed, OTP, password, or recovery code was shared.
  The individual Meta-login portion of `QA-A11` is complete; business-portfolio
  2FA enforcement remains open.
- `2026-08-14` - The owner enabled the Meta QA business portfolio requirement
  for every human member to use 2FA and confirmed the temporary personal
  administrator is compliant. Together with the previously acknowledged
  provider controls and vaulted recovery material, this completes `QA-A11`.
  The temporary personal Meta identity and the separately documented fresh
  production ownership requirement remain explicit; this completion does not
  convert or approve that personal profile as company-owned production access.
- `2026-08-14` - The sole maintainer confirmed the founder recovery identity,
  offline recovery material, and ownership record are stored in the controlled
  company vault. A fake or duplicate administrator will not be created merely
  to represent the same person. `QA-A13` is complete for the one-maintainer QA
  model by explicit deferral: add a second trusted Super Admin only when
  another real trusted maintainer exists, before shared production operations.
- `2026-08-14` - `QA-A15` completed as a no-target MenuList inventory. Pinned
  Firebase CLI readback under the authenticated company owner exposes only
  active project `menulist-qa`; the owner separately confirmed Google Cloud
  Resource Manager shows no retired MenuList project. The current August 9 QA
  Firebase Admin key was deliberately preserved, reserved production project
  `menulist` was not opened or changed, and no unrelated Answerlattice or
  releases-center credential was treated as MenuList evidence. No key value or
  key identifier was accessed, displayed, downloaded, or revoked.
- `2026-08-14` - The owner confirmed the old Vercel account remains permanently
  deleted, no old environment value was copied, and the fresh provider
  credentials are authoritative. Current CLI readback shows only the intended
  company identity, team, and project. `QA-A20` is complete with two explicitly
  accepted historical limitations: the pre-deletion environment/provider-name
  inventory was not preserved, and phone-number reuse was never independently
  exercised because fresh signup did not require it. The retired account will
  not be recreated, and no unverifiable historical detail is claimed.
- `2026-08-15` - The owner corrected the production boundary: MenuList
  production Firebase has not been set up. A fresh authenticated Firebase CLI
  inventory lists only active `menulist-qa`; `.firebaserc` contains only a
  reserved future production alias, not a live-resource assertion; and all
  executed deploy/runtime evidence is bound to QA. `QA-K13` is complete by
  structural non-reachability. No production project was created, queried, or
  changed to obtain this evidence.

Status rules:

- `[ ]` means pending.
- `[x]` means completed and verified. For an optional item, it can also mean
  the decision was completed and Codex recorded `Skipped intentionally` on the
  row; a silent skip is never complete.
- Do not mark a provider complete just because an account exists. Mark it
  complete only when the QA key/value is created, stored, and wired where this
  guide says.

### Phase A - Owner Access And Safety

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [x] | QA-A01 | Password vault exists for MenuList QA setup | Password manager | Operator confirmed the Bitwarden `Neelvara Systems` vault setup is complete; no credentials or recovery material were shared in evidence |
| [x] | QA-A02 | Registrar account secured and required domains confirmed | Registrar account | Operator confirmed ownership, auto-renew, payment readiness, Domain Lock, tested two-step verification, and independently recoverable secured account records |
| [x] | QA-A03 | Workspace tenant created and primary domain verified | Google Workspace/Admin Console and registrar DNS | Google accepted the manually published TXT record and displayed **Your domain is verified** for the `Neelvara Systems` Workspace tenant using `neelvara.com` |
| [x] | QA-A04 | Break-glass Workspace Super Admin secured | Google Account and Google Workspace Admin Console | `admin@neelvara.com` has active Authenticator-backed 2-Step Verification, independently stored backup codes, and verified recovery phone/email; it may perform the one-user QA bootstrap but returns to break-glass-only use before production operations |
| [ ] | QA-A05 | Named daily operator created | Google Workspace and Google Cloud IAM | Deliberately deferred under the owner-confirmed one-person model: `admin@neelvara.com` remains the secured sole QA operator. Reopen before another person receives routine access or when production operations justify separating daily work from Super Admin authority; then create a named account and grant only required access |
| [x] | QA-A06 | Gmail delivery activated and tested | Google Admin Console, DNS, and every currently licensed mailbox | Google accepted the published MX; post-DKIM mail from `admin@neelvara.com` reached an external Gmail Inbox with SPF, DKIM, and DMARC all passing, and the external reply reached the admin Inbox |
| [x] | QA-A07 | SPF, DKIM, and monitor-only DMARC configured | Google Admin Console and DNS | Authoritative DNS and a fresh Inbox message prove Google-only SPF, active 2048-bit Google DKIM, and monitor-only DMARC reporting to the tested `dmarc@neelvara.com` alias; obsolete GoDaddy mail CNAMEs are removed |
| [x] | QA-A08 | Provider-notice aliases/groups created | Google Admin Console | `billing@neelvara.com`, `security@neelvara.com`, and `dmarc@neelvara.com` are aliases on the one licensed admin mailbox, and separate external delivery tests reached its Inbox |
| [x] | QA-A09 | GitHub repository transferred to company organization | GitHub source `menulist-ai/menulist-core`, controlled intermediary `neelvara-admin/menulist-core`, and target `neelvara-systems/menulist-core` | Company-admin account `neelvara-admin` uses verified `admin@neelvara.com`, passkey, authenticator MFA, and independent recovery; two native transfers preserve `main`, `staging`, and repository metadata without granting the retiring account organization membership; final access readback shows no `menulist-ai` collaborator and no copy/recreated repository was used |
| [x] | QA-A21 | Local Git authentication and author identity migrated | This workstation, `~/.ssh`, GitHub SSH settings, and the local `menulist-core` repository | The dedicated Neelvara key is the only active GitHub key on this workstation and authenticates as `neelvara-admin`; `origin`, authenticated fetch, preserved branch refs, repo-local `Neelvara Systems` noreply identity, old-account key revocation, and deletion of the retired local keypair are all verified |
| [x] | QA-A10 | Fresh single Vercel project and Git integration created | Fresh Neelvara Vercel account and Project -> Settings -> Git | Exactly one fresh project is linked to `neelvara-systems/menulist-core`; readback confirms the intended framework/root/build/runtime settings, exact-branch Preview env support, and zero inherited or new deployments |
| [x] | QA-A11 | MFA enabled and recovery codes stored | Registrar, Google, GitHub, Vercel, providers | GoDaddy, Google, GitHub, Vercel, Sentry, Upstash, Razorpay, and the temporary authentic personal Meta administrator have verified MFA/recovery evidence; the Meta QA business portfolio requires 2FA for everyone. Recovery material is vaulted, and the personal Meta profile remains explicitly temporary and unapproved as company-owned production access |
| [x] | QA-A12 | Secret sharing rule accepted | This guide and password vault | Secrets remain vaulted; maintained evidence records only names, versions, redacted identifiers, and non-secret outcomes, with no real secret copied into docs, chat, screenshots, or git |
| [x] | QA-A13 | Founder recovery identity and ownership recorded | Google Workspace and password vault | The founder recovery identity, offline codes, and recovery owner are vaulted. Under the confirmed one-maintainer model, a duplicate/fake administrator is intentionally not created; add a second trusted Super Admin only when another real trusted maintainer exists, before shared production operations |
| [x] | QA-A14 | Google Cloud organization visible | Google Cloud Console | Google Cloud visibly confirmed creation of the `neelvara.com` organization and assignment of Organization Administrator to `admin@neelvara.com` before `menulist-qa` creation |
| [x] | QA-A15 | Retired Firebase service-account keys revoked | Google Cloud Console -> IAM & Admin -> Service Accounts for every retired project | No retired MenuList project is visible to the company owner and Firebase CLI exposes only active `menulist-qa`, so there is no retired MenuList key target. The current August 9 QA key is preserved; production and separate-product credentials were not opened, changed, or misclassified |
| [x] | QA-A16 | Maintenance calendar created | Company `admin@neelvara.com` Calendar | Quarterly IAM/secret review starts September 1, 2026 at 9:00 AM IST and recurs every three months; annual domain/payment/recovery review starts August 1, 2027 at 9:00 AM IST and recurs yearly. Calendar search confirmed both series under `Neelvara Systems Admin` |
| [x] | QA-A17 | Duplicate registrar add-ons resolved | Registrar Products/Billing and support | Professional Email Pro Light is intentionally retained unused through its paid term with auto-renew Off; legacy GoDaddy mail DNS replacement is tracked separately under `QA-A06`, `QA-A07`, and `QA-A19`; Google Workspace and Vercel remain the selected mail/hosting stack |
| [x] | QA-A18 | Generic admin display name corrected | Admin Console -> Directory -> Users -> `admin@neelvara.com` | Admin Console confirmed the managed user's display name is now `Neelvara Systems Admin`; the email address and organization name were not changed |
| [x] | QA-A19 | `neelvara.com` DNS zone exported before mail migration | GoDaddy DNS -> Actions -> Export Zone File | Operator confirmed the complete unchanged 15-record zone is stored privately before mail migration; this does not satisfy the separate `menulist.digital` export in `QA-B04` |
| [x] | QA-A20 | Old Vercel account retired without carrying forward chaos | Owner confirmation and current Vercel CLI readback | The old account remains permanently deleted, no old value was copied, and fresh credentials are authoritative. Current CLI shows `neelvara-admin`, only team `neelvara-systems`, and only project `menulist-core`; missing pre-deletion inventory and unused phone-reuse proof are recorded as accepted historical limitations rather than fabricated evidence |

Old Vercel retirement gate before `QA-A10`:

1. Ask Vercel Support whether deleting the old account releases its verified
   phone number for immediate reuse. If not, ask Support to unlink it. Do not
   delete the account based on an assumption.
2. Record only old project/team names, attached domain names, environment-key
   names, and the provider that issued each credential. Do not export or copy
   any old environment value into the fresh setup.
3. Revoke or rotate every referenced API key, token, password, private key, and
   webhook secret at the issuing provider. Deleting Vercel does not revoke a
   credential at Firebase, Google, Upstash, Sentry, Razorpay, or another
   provider.
4. Remove every custom domain from old projects and teams. This intentionally
   creates a maintenance window until the fresh project is ready; registrar
   ownership and DNS backups remain untouched.
5. Cancel paid subscriptions, remove integrations, delete old projects, delete
   any old team for which this account is the sole owner, and only then delete
   the personal account.
6. Create the fresh Vercel login under `admin@neelvara.com`, enable MFA/passkey
   and recovery, and import `neelvara-systems/menulist-core` exactly once.
7. Populate the fresh project only from `.env.staging.example`, newly generated
   secrets, and newly created QA provider credentials. Never use an old Vercel
   export as the source of truth.

Startup-benefit preflight decision before `QA-A03`:

- Completed on `2026-08-04`. MenuList meets the recorded start-date, MVP,
  business-model, and prior-credit conditions, but the operator does not plan
  to seek venture funding soon and has no qualifying prior funding. Do not
  submit a Start- or Scale-tier application using facts that do not match the
  operator's actual plans.
- The temporary paid-Workspace hold is released. Continue with `QA-A03` using
  the normal company Workspace setup. Do not create `neelvara@gmail.com`; use
  `admin@neelvara.com` as the permanent company administration identity and a
  long-lived personal Google account only as recovery.
- Do not start the 90-day Google Cloud Free Trial during Workspace creation.
  Start it only at the later Cloud billing step when `menulist-qa` is ready to
  consume the trial window.
- Recheck the official program criteria only if the venture-funding plan
  genuinely changes while the company still satisfies the then-current
  eligibility window. Never invent incorporation, funding, or growth facts.

### Phase B - Domain And DNS

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [x] | QA-B01 | `menulist.digital` ownership confirmed | Registrar DNS screen | Registrar evidence confirms the domain is present in the owner-controlled account |
| [x] | QA-B02 | `menulist.digital` auto-renew confirmed | Registrar billing/domain settings | Operator confirmed auto-renew is enabled; payment details were not shared or recorded |
| [x] | QA-B03 | No extra domain selected | Registrar and Vercel | Only MenuList QA `menulist.digital` hosts were added; no production or sister-product domain entered this pass |
| [x] | QA-B04 | Current `menulist.digital` DNS zone inventoried and exported | Existing DNS provider/registrar | The exact seven-record GoDaddy baseline, TTLs, managed-record boundaries, and absent record families are recorded before nameserver changes |
| [x] | QA-B05 | `menulist.digital` and `www.menulist.digital` added and assigned to exact Git branch `staging` | Vercel Project -> Domains -> Git Branch | Both hosts report Valid Configuration and exact branch `staging`, never Production |
| [x] | QA-B06 | `app.menulist.digital` added and assigned to exact Git branch `staging` | Vercel Project -> Domains -> Git Branch | The final project-specific CNAME resolves publicly, Vercel reports Valid Configuration on exact branch `staging`, and no conflicting `app` A record remains |
| [x] | QA-B07 | `*.menulist.digital` added and assigned to exact Git branch `staging` | Vercel Project -> Domains -> Git Branch | The wildcard is assigned to Preview for exact branch `staging` with no redirect; Vercel DNS validation intentionally waits for the controlled nameserver migration in `QA-B08` |
| [x] | QA-B08 | DNS records preserved and Vercel nameservers configured | Vercel DNS and registrar nameserver screen | The portable DMARC policy is preserved, Vercel's managed routing/CAA records are present, and registry plus Cloudflare/Google readback returns only Vercel nameservers |
| [x] | QA-B09 | First branch deployment intentionally deferred | Vercel Domains and this guide | The first Preview deployment occurred only after Phase G env, Phase H secrets, and Phase I Firebase deploy/smoke gates were complete |
| [x] | QA-B10 | Domain ownership, DNS, and TLS readiness complete | Vercel Project -> Domains | Apex, `www`, `app`, and arbitrary wildcard hosts resolve through Vercel, complete TLS, and serve exact branch `staging`; dashboard-only Proxy Status Unknown is disproved by direct DNS/TLS/runtime evidence |

### Phase C - Firebase Project Shell And Auth

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [x] | QA-C00 | Automatic trial bootstrap project retired | Google Cloud Billing and Resource Manager | Billing activation is confirmed first; empty project `vocal-partition-504716-r3` is then shut down and is never reused for Firebase, credentials, APIs, or deployment |
| [x] | QA-C01 | Firebase project id checked before creation | Firebase Console | Exact id `menulist-qa` is available or already exists |
| [x] | QA-C02 | Firebase project `menulist-qa` exists under the Neelvara organization | Firebase/Google Cloud Console | Project URL is `https://console.firebase.google.com/project/menulist-qa/overview` and its resource parent is the `neelvara.com` organization |
| [x] | QA-C03 | Firebase ownership and intended billing owner confirmed | Firebase and Google Cloud Console | Project belongs to the company organization/operator and the truthful billing owner is identified; Phase C2 performs the actual link and guardrails |
| [x] | QA-C04 | Firebase Auth and Email/Password provider enabled | Firebase Console -> Authentication -> Sign-in method | Firebase Auth is initialized and Email/Password is enabled for the current owner credential/custom-token flow; Google OAuth remains configured separately in Phase D |
| [x] | QA-C05 | MenuList QA Web app created | Firebase Project Settings -> General | Web app config values are available and vaulted |
| [x] | QA-C06 | Production Firebase not touched | Firebase Console | No setup work is done in project id `menulist` |

### Phase C2 - QA Billing And Spend Guardrails

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [x] | QA-BILL01 | `menulist-qa` linked to billing | Google Cloud Billing or Firebase Console | Firebase project can use Blaze/paid Google Cloud services for QA only |
| [x] | QA-BILL02 | Alert-only budget created | Google Cloud Billing -> Budgets and alerts | Owner notifications exist before Gemini/Functions usage starts |
| [x] | QA-BILL03 | Gemini API enabled in exact QA project | Google Cloud API Library | Generative Language/Gemini API is enabled for `menulist-qa` without creating a second project or making a paid call |
| [x] | QA-BILL04 | Gemini API spend cap created | Google Cloud Billing -> Budgets and alerts | Preview spend-cap enforcement is scoped to `menulist-qa` and the Gemini API only |
| [x] | QA-BILL05 | AI Studio system limit read | Google AI Studio project rate limits | Current project rolling spend ceiling is recorded without exposing keys |
| [x] | QA-BILL06 | Local rolling ceiling chosen and vaulted | AI Studio limits and password vault setup note | The intended `MENULIST_GEMINI_SPEND_LIMIT_USD_10M` value is below the active AI Studio ceiling; checked-in default is USD 8 and Phase G performs the env wiring |
| [x] | QA-BILL07 | Cloud Run cap intentionally deferred | Setup notes | Skipped intentionally: no cap exists until its whole-project outage/restore behavior is approved and drilled |
| [x] | QA-BILL08 | Payments profile is truthful and migration note recorded | Google Payments/Cloud Billing and password vault | Account type, legal payer, country, and tax details match current reality; no unregistered entity details are invented |
| [x] | QA-BILL09 | Domain-wide Billing Account Creator role removed | Google Cloud organization IAM | After the selected billing account is active, the default domain-wide creator grant is removed so ordinary domain users cannot create duplicate billing accounts; explicit administrators retain required access |

### Phase C3 - Firebase Data Services And Credentials

Cloud Storage for Firebase now requires Blaze billing. Do not start this phase
until every Phase C2 billing/spend item is complete.

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [x] | QA-C07 | Firestore enabled in Native mode at `us-central1` | Firebase Console -> Firestore Database | Firestore asks for a location; `us-central1` is selected so the `(default)` database matches the existing Functions/Tasks contract |
| [x] | QA-C08 | Firebase Storage enabled at `us-central1` | Firebase Console -> Storage | Project is already on Blaze; the default `menulist-qa.firebasestorage.app` bucket uses immutable location `us-central1` |
| [x] | QA-C09 | Firebase authorized domains added | Firebase Auth -> Settings -> Authorized domains | `localhost` and `app.menulist.digital` are listed; public tenant hosts do not require owner auth |
| [x] | QA-C10 | Service account values stored securely | Firebase Project Settings -> Service accounts | Admin SDK project id, client email, private key, and Firebase Web API key mapping are stored in the password vault |
| [x] | QA-C11 | Temporary service account JSON removed | Local machine | No downloaded service account JSON remains outside the vault |
| [x] | QA-C12 | Immutable resource locations recorded | Password vault setup note | Firestore and Storage both record `us-central1`; no location is assumed from an env value alone |
| [x] | QA-C13 | Admin key creation date and revocation owner recorded | Password vault and Google Cloud IAM | The current static QA key has an owner/date and will be revoked immediately on leak, access removal, or replacement |

### Phase D - Google OAuth

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [x] | QA-D01 | Google Auth branding and contacts configured | Google Cloud Console -> Google Auth Platform -> Branding | MenuList QA name, company-managed `support@neelvara.com` Group, `admin@neelvara.com` developer contact, homepage/privacy/terms links, and verified `menulist.digital` domain are accurate |
| [x] | QA-D02 | OAuth audience set to External/Testing | Google Auth Platform -> Audience | QA remains in Testing and only named QA test users are admitted; no production publishing is requested |
| [x] | QA-D03 | Identity-only scopes confirmed | Google Auth Platform -> Data Access | Only `openid`, `email`, and `profile` are requested for sign-in |
| [x] | QA-D04 | Web OAuth client created for MenuList QA | Google Auth Platform -> Clients | One Web application client id and secret exist for QA usage |
| [x] | QA-D05 | Authorized JavaScript origins added | OAuth client settings | Exact origins are `http://localhost:3000` and `https://app.menulist.digital`; no wildcard/customer origin is present |
| [x] | QA-D06 | Authorized redirect URIs added | OAuth client settings | Exact callbacks are `http://localhost:3000/api/auth/callback/google` and `https://app.menulist.digital/api/auth/callback/google` |
| [x] | QA-D07 | OAuth test users added | Google Auth Platform -> Audience | Named company QA accounts that will run the smoke test are listed |
| [x] | QA-D08 | OAuth client id/secret stored securely | Password vault | Values are ready for local env and branch-restricted Vercel Preview env |

### Phase E - Required QA Provider Values

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [x] | QA-E01 | MenuList staging shared and extraction Gemini keys created | Google AI Studio | Three shared QA keys exist for canonical Vercel/local `MENULIST_GEMINI_AI_KEY`/`_2`/`_3`; the fourth paid credential is dedicated to Firebase menu extraction as `MENULIST_GEMINI_TEXT_AI_KEY`, not shared slot 4 |
| [x] | QA-E02 | Upstash staging Redis created | Upstash Console | REST URL/token exist and are stored for QA only |
| [x] | QA-E03 | Razorpay Test Mode keys and webhook secret available | Razorpay Dashboard -> Test Mode | `rzp_test_` key id/key secret and a distinct QA webhook secret are stored; the endpoint is added only after `app.menulist.digital` is live |
| [x] | QA-E04 | Sentry QA project created | Sentry dashboard | Isolated Next.js project `menulist-qa` exists; its single QA DSN is securely mapped for server/browser use, account Authenticator MFA and a company-controlled passkey are active, and recovery codes are vaulted; source-map auth token remains deferred unless later required |
| [x] | QA-E05 | Meta non-production app and WhatsApp test credentials created | Meta Developers | Meta-provided test phone-number id/token, app secret, and a generated verify token are stored; provider processing remains disabled |
| [x] | QA-E06 | `NEXTAUTH_SECRET` generated | Local terminal and password vault | Separate 32-byte base64url secret is stored, not pasted into docs/chat |
| [x] | QA-E07 | `MENULIST_OWNER_REFERRAL_TOKEN_SECRET` generated | Local terminal and password vault | Separate 32-byte base64url secret is stored before owner referral is enabled |
| [x] | QA-E08 | Revalidation secret generated | Password vault | Separate QA value is ready for Vercel and Firebase Function Secret Manager |
| [x] | QA-E09 | GCP budget webhook secret generated if budget alerts are configured | Google Cloud billing and password vault | Skipped intentionally because the configured budgets use Google-managed notifications and the optional budget webhook is not in the maintained QA deploy target |
| [x] | QA-E10 | Cloud Tasks API enabled in `menulist-qa` | Google Cloud APIs | Cloud Tasks is enabled only for the QA project |
| [x] | QA-E11 | Batch image queue created | Cloud Tasks -> Queues | `batch-image-generation` exists in `us-central1` with bounded dispatch/retry settings |
| [x] | QA-E12 | Batch worker secret generated | Password vault | One separate random QA-only secret is ready for `BATCH_IMAGE_GENERATION_WORKER_SECRET` |
| [x] | QA-E13 | Paid menu-extraction Gemini boundary certified | Google AI Studio, Firebase Secret Manager, scoped Functions deploy, hosted synthetic smoke, and focused verifiers | Free-project use is retired. The fourth paid provider credential is dedicated to extraction and deployed as `MENULIST_GEMINI_TEXT_AI_KEY` version 2; shared source discovery and deployed shared bindings exclude the retired slot-4 aliases. INR 1,000 prepay is funded with auto-reload off, and disposable hosted job `public_30770eeb-8ca3-43a1-8f2e-3311cffef7f7` completed with 1 category, 8 items, quality 100, recorded accounting, no project save, no error logs, and full artifact cleanup |

Provider console links for this phase:

- Google AI Studio API keys: https://aistudio.google.com/apikey
- Upstash Console: https://console.upstash.com/
- Razorpay Dashboard: https://dashboard.razorpay.com/
- Google Cloud Billing: https://console.cloud.google.com/billing
- Cloud Tasks API for `menulist-qa`: https://console.cloud.google.com/apis/library/cloudtasks.googleapis.com?project=menulist-qa
- Cloud Tasks queues for `menulist-qa`: https://console.cloud.google.com/cloudtasks?project=menulist-qa
- Cloud Tasks queue creation reference: https://cloud.google.com/tasks/docs/creating-queues
- Sentry: https://sentry.io/
- Meta Developers: https://developers.facebook.com/apps/

Gemini credential note: the shared MenuList Functions pool uses
`GEMINI_AI_KEY`, `GEMINI_AI_KEY_2`, and `GEMINI_AI_KEY_3`. The fourth paid
provider credential is dedicated to menu extraction and its value is stored under
`MENULIST_GEMINI_TEXT_AI_KEY`; shared source discovery and new shared Function
revisions must not bind the retired `GEMINI_AI_KEY_4` alias. The Next.js shared
pool likewise uses only `MENULIST_GEMINI_AI_KEY` plus slots 2 and 3. Keys
provide rotation and workload isolation,
not extra project quota.

Paid extraction policy: QA and production both use paid keys from their own
single governed Gemini project. The former `menulist-gemini-qa-free` exception
is retired and must not be restored. The dedicated extraction secret permits
independent rotation and prevents fallback into the shared image/general pool;
it does not authorize a second runtime environment or provider-project quota
sharding.

### Phase F - Optional QA Provider Decisions

These can be skipped for the first MenuList QA boot if the matching feature is
not being tested. Sentry and Meta/WhatsApp are not in this optional list because
the maintained full Functions target list binds their Secret Manager names even
while messaging provider processing remains disabled. If an optional provider
is skipped, do not create fake values.

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [x] | QA-F01 | reCAPTCHA/App Check staging registration created if needed | reCAPTCHA Admin and Firebase App Check | Skipped intentionally for first boot; no enforcement is enabled before normal Auth, Firestore, and Storage smoke |
| [x] | QA-F02 | Telegram staging alert bot/chat created if needed | BotFather and Telegram | Skipped intentionally; no bot/chat or placeholder credential was created |
| [x] | QA-F03 | SMTP staging sender configured if needed | Workspace or SMTP provider | Skipped intentionally; lifecycle-email delivery is outside the first QA boot |
| [x] | QA-F04 | UptimeRobot decision recorded | Setup note | Enabled after Phase J; monitors are created only after the staging deployment is live |
| [x] | QA-F05 | GA/Clarity/Plausible staging analytics configured if approved | Analytics provider dashboards | Skipped intentionally; QA events will not enter production reporting |

Optional provider console links:

- reCAPTCHA Admin: https://www.google.com/recaptcha/admin/create
- Firebase App Check for MenuList QA:
  https://console.firebase.google.com/project/menulist-qa/appcheck
- Telegram BotFather: https://t.me/BotFather
- UptimeRobot: https://uptimerobot.com/dashboard

### Phase G - Local And Vercel Preview Env

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [x] | QA-G01 | Local ignored env file prepared from `.env.staging.example` | `.env.local` or approved ignored local env | Local values point to `menulist-qa`; local URL overrides use `http://localhost:3000` |
| [x] | QA-G02 | Branch-restricted Vercel Preview env created | Vercel Project -> Settings -> Environment Variables -> Preview -> Git Branch | All 39 MenuList QA rows are restricted to exact branch `staging`; 13 true secrets are Sensitive and 26 public/config rows are Non-sensitive |
| [x] | QA-G03 | Runtime URL env values set | Local env and Vercel Preview env | Website/platform values use `menulist.digital`, aliases include `www` and `app`, tenant base uses `menulist.digital`, and `NEXTAUTH_URL` uses `app.menulist.digital` |
| [x] | QA-G04 | Firebase public canonical keys set | Local env and Vercel Preview env | `NEXT_PUBLIC_MENULIST_FIREBASE_*` values point to `menulist-qa` |
| [x] | QA-G05 | Generic Firebase public aliases absent | Local env and Vercel Preview env | No `NEXT_PUBLIC_FIREBASE_*` duplicate rows are stored; runtime uses the canonical MenuList family |
| [x] | QA-G06 | Firebase admin canonical keys set | Local env and Vercel Preview env | `MENULIST_FIREBASE_*` values point to `menulist-qa` |
| [x] | QA-G07 | Generic Firebase admin aliases absent | Local env and Vercel Preview env | No generic `FIREBASE_*` duplicate rows are stored; emulator host variables remain local-only infrastructure controls |
| [x] | QA-G08 | Gemini shared keys and rolling ceiling set | Local env and Vercel Preview env | Only `MENULIST_GEMINI_AI_KEY` plus `_2`/`_3` are stored; the Functions-only extraction key and retired `_4` alias are absent; `MENULIST_GEMINI_SPEND_LIMIT_USD_10M` uses the approved QA value below the provider ceiling |
| [x] | QA-G09 | Razorpay Test Mode keys set | Local env and Vercel Preview env | The public key ID starts with `rzp_test_`; the private key secret belongs to the same QA pair and remains server-only |
| [x] | QA-G10 | Upstash and revalidation values set | Local env and Vercel Preview env | QA Redis and revalidation secrets are present |
| [x] | QA-G11 | Provider values handled according to Phase E/F | Local env and Vercel Preview env | Required root-runtime QA providers use real QA values; Functions-only Meta values remain vaulted for Phase H rather than duplicated in Vercel |
| [x] | QA-G12 | Private key newlines escaped for Vercel | Vercel Preview env | The single Sensitive `MENULIST_FIREBASE_PRIVATE_KEY` value was imported through dotenv-compatible multiline handling |
| [x] | QA-G13 | Production env not touched | Vercel Project -> Environment Variables -> Production | CLI readback reports no Production project env rows and no deployment was triggered |
| [x] | QA-G14 | Other product env setup skipped | Vercel and local env | No real Answerlattice, CampaignCue, SignalDesk, Neelvara, or MyCodex setup was added in this pass |
| [x] | QA-G15 | MenuList Functions non-secret env set | `functions/.env.menulist-qa` | App/API and message-preview origins are `https://app.menulist.digital`; tenant base is `menulist.digital`; the approved QA Gemini rolling limit is explicit |
| [x] | QA-G16 | Cloud Tasks worker values set | Local env and Vercel Preview env | Worker URL is the QA app-host endpoint, queue id is `batch-image-generation`, and the QA-only worker secret is present |
| [x] | QA-G17 | Deployable env values sanitized | Local env and Vercel Preview env | No value contains `<...>` template text, and unrelated product placeholder rows are absent rather than uploaded as values |
| [x] | QA-G18 | Emulator-first local override documented | Ignored `.env.local` and Firebase Emulator Suite | Destructive/rule-focused local work keeps emulator hosts local; Vercel stores emulator-off flags and cloud QA is reserved for deliberate integration smoke |

Required runtime values for this guide:

```env
NEXT_PUBLIC_ENV=preview
NEXT_PUBLIC_VERCEL_ENV=preview
NEXT_PUBLIC_APP_URL=https://menulist.digital
NEXT_PUBLIC_DEPLOYMENT_URL=https://menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=menulist.digital,www.menulist.digital,app.menulist.digital
NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN=menulist.digital
NEXTAUTH_URL=https://app.menulist.digital
```

Required MenuList Functions non-secret values:

```env
NEXT_PUBLIC_APP_URL=https://app.menulist.digital
MENULIST_TENANT_BASE_DOMAIN=menulist.digital
NEXT_PUBLIC_MSG_PREVIEW_BASE_URL=https://app.menulist.digital
MENULIST_GEMINI_SPEND_LIMIT_USD_10M=8
```

### Phase H - Firebase Functions Secrets And Metadata

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [x] | QA-H01 | Firebase CLI login confirmed | Local terminal | `firebase projects:list` succeeded as `admin@neelvara.com` and returned the single active project `menulist-qa` |
| [x] | QA-H02 | Secret Manager API enabled only in `menulist-qa` | Google Cloud API Library | `secretmanager.googleapis.com` is visibly Enabled in exact project `menulist-qa`; no production project was selected or modified |
| [x] | QA-H03 | Required AI secrets set | Firebase Secret Manager for `menulist-qa` | Shared `GEMINI_AI_KEY`, `_2`, and `_3` version 1 plus extraction-only `MENULIST_GEMINI_TEXT_AI_KEY` version 2 report Enabled; the retired `GEMINI_AI_KEY_4` secret is absent |
| [x] | QA-H04 | Required Upstash secrets set | Firebase Secret Manager for `menulist-qa` | Version 1 of `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` exists and metadata readback reports Enabled |
| [x] | QA-H05 | Required Razorpay Test Mode Function secrets set | Firebase Secret Manager for `menulist-qa` | Version 1 of `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` exists and metadata readback reports Enabled; the key ID was guarded as test mode, while `RAZORPAY_WEBHOOK_SECRET` remains local/Vercel-only for the Next.js route |
| [x] | QA-H06 | Required WhatsApp, monitoring, and revalidation secrets set for the maintained target list | Firebase Secret Manager for `menulist-qa` | Version 1 of `SENTRY_DSN`, `REVALIDATION_SECRET`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, and `WHATSAPP_VERIFY_TOKEN` exists even while provider processing is disabled |
| [x] | QA-H07 | Optional Function secrets handled | Firebase Secret Manager for `menulist-qa` | Skipped intentionally: no exported MenuList Function currently binds `SECRET_GROUPS.SMTP` or `SECRET_GROUPS.MONITORING`; runtime delivery fails closed, so no placeholder secret was created |
| [x] | QA-H08 | Secret metadata checked without printing values | Google Secret Manager metadata command | Metadata-only readback confirms all 14 required names have version 1 `ENABLED`; no value was accessed or displayed |
| [x] | QA-H09 | Production Functions secrets not touched | Firebase/Google Secret Manager | Every create and metadata command targeted exact project `menulist-qa`; no command targeted project id `menulist`, which was absent from the authenticated project inventory |

### Phase I - Firebase QA Infrastructure Deploy

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [x] | QA-I01 | Pinned runtime loaded | Local terminal | `node --version` is `v22.23.1`, matching `.nvmrc` |
| [x] | QA-I02 | Firebase project pre-check passed | Local terminal | `firebase projects:list --json` returned only active project `menulist-qa` under the intended owner login |
| [x] | QA-I03 | MenuList root rules predeploy suite passed | Local terminal | `npm run verify:menulist-firebase-rules-predeploy` passed all 41 discovered `demo-*` Firestore/Storage emulator rule scripts with exit code 0 |
| [x] | QA-I04 | Firestore rules/indexes and Storage rules deployed as the fresh QA baseline | Local terminal | Every command targeted exact project `menulist-qa`; Rules API diagnosis required safe split deployment through pinned Firebase CLI `15.26.0`, and every intended baseline target completed |
| [x] | QA-I05 | Deployed Firestore rules read back | Firebase Rules API metadata/source readback | Active ruleset timestamp, byte count, and SHA-256 match repository `firestore.rules`; no Console-only edit exists |
| [x] | QA-I06 | Deployed Storage rules read back | Firebase Rules API metadata/source readback | Active ruleset timestamp, byte count, and SHA-256 match repository `storage.rules`; no Console-only edit exists |
| [x] | QA-I07 | Deployed index state read back | Firebase CLI and Firestore Admin API | Corrected manifest contains 166 composite indexes and every remote composite index reports `READY`; none remain `CREATING` or `ERROR` |
| [x] | QA-I08 | Rule propagation wait completed | Firebase Rules API, Firestore Admin API, and clock | More than five minutes elapsed after the Firestore release; fresh ruleset hashes still matched local source and all 166 indexes remained `READY` |
| [x] | QA-I09 | Deployed allow/deny smoke matrix passed | Local app connected to cloud `menulist-qa`, Firebase Auth, direct Web SDK, Firestore, and Storage | All 35 live scenarios passed: own-tenant operations worked through real QA Auth, while anonymous, cross-tenant, server-only spend-window, and legacy Storage operations were denied before the first Vercel deploy |
| [x] | QA-I10 | MenuList QA Functions bundle deployed only after rule smoke and required secrets pass | Local terminal, Cloud Build, Cloud Run, Eventarc, and Firebase Functions readback | All ten maintained targets are `ACTIVE`, second generation, Node.js 22, and `us-central1`; the public callable transport returns the expected unauthenticated application response and no command targeted production |
| [x] | QA-I11 | Deploy/readback/smoke evidence recorded | This checklist and operator evidence | Date, project, command families, results, tester ids, cleanup, and blocker state are recorded without secrets or sensitive payloads |
| [x] | QA-I12 | Production Firebase deploy not run | Local terminal history and Firebase project inventory | Every Phase I cloud command targeted exact project `menulist-qa`; no command targeted `--project menulist`, which was absent from the authenticated project inventory |

### Phase J - Vercel Preview/Staging Deploy

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [x] | QA-J01 | Branch-restricted Preview env reviewed before deploy | Vercel Project -> Environment Variables -> Preview | All 39 configured MenuList QA rows are restricted to exact Git branch `staging`; Vercel readback reports 13 Sensitive and 26 Non-sensitive Preview rows without exposing their values |
| [x] | QA-J02 | Vercel Preview/Staging deployment triggered | Vercel dashboard or approved git workflow | Commit `4bc4d0182` produced Ready Preview deployment `dpl_9jSJRpgEecstJH1kZYi9kHko6Exc` and the generated exact-branch staging alias |
| [x] | QA-J03 | Deployment attached to QA domains | Vercel Project -> Deployments and Domains | Apex, `www`, app, and arbitrary wildcard hosts all serve exact Preview commit `4bc4d01` from the staging deployment |
| [x] | QA-J04 | Runtime project checked from logs/env evidence | Vercel logs or app diagnostics | Exact-branch Preview readback reports `menulist-qa`, its matching Auth domain and Storage bucket, Preview mode, and emulators disabled; no production identifier is present |
| [x] | QA-J05 | Vercel Production not touched | Vercel dashboard | This push targeted Preview only and did not create or promote Production; the visible failed Production entry predates this push by one day |

### Phase K - MenuList QA Smoke Test

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [x] | QA-K01 | `https://menulist.digital` opens | Browser | MenuList main website opens with QA/staging values |
| [x] | QA-K02 | `https://www.menulist.digital` opens | Browser | `www` reaches the same QA website deployment |
| [x] | QA-K03 | `https://app.menulist.digital/signin` opens | Browser | Canonical QA owner sign-in loads on the app host |
| [x] | QA-K04 | `https://app.menulist.digital/api/version` opens | Browser | Live HTTP 200 JSON reports environment `preview`; its full build id matches `origin/staging`, and its deployment URL matches the newest Ready Preview |
| [x] | QA-K05 | Email/password owner sign-in works | Browser and Firebase Auth | A synthetic QA owner authenticates through the current credential flow on `app.menulist.digital` |
| [x] | QA-K06 | Google OAuth sign-in works | Browser, Google Auth Platform, and Vercel logs | A listed OAuth test user completes the exact QA callback with no redirect/domain error |
| [x] | QA-K07 | Single owner dashboard route works | Browser | `https://app.menulist.digital/dashboard` loads and session scope selects the tenant/store |
| [x] | QA-K08 | Owner onboarding stays on app host | Browser | `https://menulist.digital/create-menu` redirects to `https://app.menulist.digital/create-menu`; Google auth and preview remain on the app host |
| [x] | QA-K09 | Test business/store can be created or loaded | Browser | Exact ruleset `fd3bf828-2c33-4732-af32-4a4bf56a7735` is active. Hosted first-project create, reload persistence, edit, duplicate, duplicate cancel, normal delete, exact Firestore projection, and guarded cleanup passed on build `6acb68b`. Build `2bdeeb076e789c379c0d43f3382fd88030b6bd0e` then completed two authenticated hard reloads without recurrence of the RSC/session-cache bootstrap failure |
| [x] | QA-K10 | QA customer link opens | Browser | `https://<test-slug>.menulist.digital` resolves to the test public menu/OBP |
| [x] | QA-K11 | Firestore writes verified in `menulist-qa` | Firebase Console -> Firestore | Test data appears only in `menulist-qa` |
| [x] | QA-K12 | Storage writes verified in `menulist-qa` bucket | Firebase Console -> Storage | Test uploads appear only in QA bucket |
| [x] | QA-K13 | No production writes observed | Owner confirmation, Firebase CLI inventory, repo target configuration, and deployed QA runtime evidence | Production Firebase has not been created or initialized. Authenticated Firebase CLI lists only active `menulist-qa`; the `menulist-prod` alias is reserved configuration only; and every executed deploy, credential, hosted runtime, Firestore write, Storage write, and Function target is bound to `menulist-qa`. No production resource was created or queried to manufacture absence evidence |
| [x] | QA-K14 | Vercel logs checked | Vercel deployment logs | Current Preview logs contain no missing-env, Firebase-project mismatch, or unresolved auth error; controlled negative-test entries are identified separately |
| [x] | QA-K15 | QA Sentry event checked | Sentry `menulist-qa` project | Controlled event `e1c85343403d4122b2fe74735f226229` appears only in QA with Preview/release tags and no user, URL, secret, or raw payload |
| [x] | QA-K16 | Optional post-deploy monitors handled | UptimeRobot/analytics dashboards | Initial QA monitoring is skipped intentionally because no owner-controlled monitor account/operator exists; optional analytics remain skipped by decision |
| [x] | QA-K17 | Complete QA crawler isolation works | Browser or `curl` | Apex, `www`, app, and a synthetic wildcard customer host return the full noindex header, `Disallow: /`, and HTTP 404 for `/sitemap.xml` |
| [x] | QA-K18 | QA customer origin cannot use owner API CORS | Terminal | A synthetic wildcard tenant origin receives HTTP 403 `Origin not allowed` and no `Access-Control-Allow-Origin` header from the owner API |
| [x] | QA-K19 | Explicit no-go checks confirmed | This guide and dashboards | Only MenuList QA project/Preview/domain setup was performed; production, sister products, and retired QA hosts were not activated |
| [x] | QA-K20 | Controlled batch image worker smoke passes | MenuList QA app, Cloud Tasks, and Vercel logs | Wrong-secret admission returns HTTP 403; one configured-secret QA task reached the current staging worker, returned HTTP 200 through its idempotent missing-job path, disappeared after acknowledgement, and created no provider call or production data |
| [x] | QA-K21 | Razorpay Test webhook transport configured and verified | Razorpay Test Mode and Vercel logs | Distinct-secret transport is active with 13 selected events. Provider-originated `order.paid` and `subscription.cancelled` deliveries have returned HTTP 200 on hosted QA; cancellation also converged the owner UI and was cleaned up exactly. Build `2780c22a821719b6c1ee7cf1543f2f45eb17d6be` fixes real zero-value/missing-amount failure projection, but the original `payment.failed` automatic retry and immediate authorization/charged lifecycle remain pending provider evidence. No real money, Live Mode, production read, or production write was used. |
| [x] | QA-K22 | Meta QA webhook registered and verified | Meta Developers, Firebase Functions, and Functions logs | Exact `menulist-qa` callback verified with the vaulted token; only `messages` is subscribed at v26.0, one Meta dashboard test POST reached the QA Function with HTTP 200, and the QA runtime was restored to `ENABLE_MESSAGING_ONBOARDING=false` without production assets |
| [x] | QA-K23 | Final MenuList QA status shared with Codex | Chat plus this file | Infrastructure setup checks are reconciled. `QA-A05` remains deliberately deferred under the one-maintainer model, application feature certification remains a separate ledger, and production is not approved or initialized |

## Step-By-Step Setup Order

### Step 1: Create The Permanent Owner Identity And Confirm Access

Where:

- Password manager.
- Bitwarden account creation: https://vault.bitwarden.com/#/register
- Bitwarden free-organization setup:
  https://bitwarden.com/help/getting-started-organizations/
- Registrar account for `neelvara.com` and `menulist.digital`.
- GoDaddy account/products: https://account.godaddy.com/products
- GoDaddy domain search: https://www.godaddy.com/domains
- GoDaddy refund request instructions:
  https://www.godaddy.com/en-in/help/request-a-refund-from-godaddy-8849
- Google Workspace: https://workspace.google.com/
- Google Admin Console: https://admin.google.com/
- Workspace domain verification: https://support.google.com/a/answer/60216
- Workspace MX setup: https://support.google.com/a/answer/6156494
- Workspace SPF setup: https://support.google.com/a/answer/33786
- Workspace DKIM setup: https://support.google.com/a/answer/174124
- Workspace DMARC setup: https://support.google.com/a/answer/2466580
- Google Cloud Console: https://console.cloud.google.com/
- GitHub source repository before native transfer:
  https://github.com/menulist-ai/menulist-core
- GitHub account signup: https://github.com/signup
- GitHub organization creation: https://github.com/account/organizations/new
- GitHub native repository transfer:
  https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository
- GitHub SSH key generation:
  https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent
- GitHub SSH key addition:
  https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account
- Vercel dashboard: https://vercel.com/dashboard
- Vercel Support: https://vercel.com/help
- Vercel account deletion prerequisites:
  https://examples.vercel.com/kb/guide/how-do-i-delete-my-vercel-account
- Firebase Console: https://console.firebase.google.com/

What to do:

1. Create a free Bitwarden account using the founder's current long-lived
   personal email because Workspace mail does not exist yet. Use a new,
   memorable master passphrase of at least five unrelated words that is never
   reused. Do not paste that passphrase into chat, docs, email, or a digital
   note.
2. Write the Bitwarden master passphrase on paper and keep it in a private,
   physically secure place. Enable two-step login using an authenticator app,
   download/write the Bitwarden recovery code, and store that recovery code
   offline beside the paper record. Never store Bitwarden's own recovery code
   only inside Bitwarden.
3. In the Bitwarden web vault, create a free Organization named
   `Neelvara Systems`. Create two collections:
   `Core Infrastructure` and `Providers`. Company credentials belong to this
   organization, not to an unstructured personal folder.
4. Add organization-owned Login items in `Core Infrastructure` for GoDaddy,
   Google Workspace, Google Cloud/Firebase, GitHub, and Vercel as each account
   is configured. Add Login or Secure Note items in `Providers` for Gemini,
   Upstash, Razorpay, Sentry, Meta, SMTP, Telegram, and monitoring providers as
   they are configured.
5. For each item, record only what exists: provider URL, login identity,
   generated unique password, MFA method, recovery codes, account owner,
   renewal/billing owner, and a short purpose note. Store API keys and webhook
   secrets as separate clearly named Secure Notes. Do not store a combined env
   dump or placeholder values.
6. Install the official Bitwarden browser extension and phone app, sign in,
   confirm sync, and configure automatic vault lock. Do not enable browser-only
   password saving for these company accounts.
7. After `admin@neelvara.com` can receive mail, change the Bitwarden owner
   account email from the temporary personal address to
   `admin@neelvara.com`, verify it, and sign back in on every device. Add a
   second trusted Organization owner before production when another owner is
   available.
8. `QA-A01` is complete only when the Bitwarden account and
   `Neelvara Systems` Organization exist, two-step login is active, offline
   recovery is stored, both collections exist, and the GoDaddy login is saved
   in `Core Infrastructure`.
9. Sign in to the founder-controlled registrar account, turn on MFA, vault its
   recovery codes, and confirm exact ownership of `menulist.digital`.
10. Search for exact `neelvara.com` at checkout. If it is not already owned and
   the registrar confirms it is available, purchase only that exact domain. Do
   not rely on an earlier availability check and do not choose a substitute.
   Do not add registrar email, website-builder, hosting, or SSL products;
   Google Workspace provides company mail and Vercel provides hosting/TLS.
11. For both domains, enable auto-renew, confirm a valid payment method, enable
   transfer/domain lock, and record the registrar account owner.
12. If a duplicate registrar add-on was already purchased, do not activate or
   configure it. Contact registrar support immediately and ask whether that
   line can be cancelled/refunded separately without changing the domain or
   domain-protection products. Do not delete the domain or a bundled
   subscription yourself. Record the support outcome without receipt/payment
   details.
13. Create one Google Workspace tenant with `neelvara.com` as its primary domain.
    In India, choose the lowest current Google Workspace edition that includes
    custom-domain Gmail and Admin Console; as of `2026-08-04`, Google offers
    Business Base for this purpose. Select monthly/flexible billing when shown
    and do not accept an annual commitment during initial QA setup. Enter
    `Neelvara Systems` as an operating/trade name and truthful founder/contact,
    country, and billing information; do not claim company registration that
    does not exist. When signup asks for an existing current/contact email, use
    the founder's long-lived personal Gmail address only as contact/recovery.
    When signup asks for the new Workspace username, enter `admin`; this creates
    `admin@neelvara.com` as the tenant's initial Super Admin. The address does
    not need to exist before this step. Store its generated unique password and
    recovery material securely and do not share either in chat or screenshots.
    The India checkout may default to Starter with the Annual one-year
    commitment enabled. Do not accept that default. Select **Compare plans**,
    choose Base, turn Annual Off, and confirm checkout explicitly shows
    flexible/monthly billing before starting the Workspace trial. This is an
    initial-setup risk decision, not a rejection of annual billing forever:
    Google's Annual/Fixed-Term plan remains payable for the full commitment if
    cancelled early, and license cost cannot be reduced until renewal. Keep the
    Flexible plan while QA mail, the legal payer/profile, and the required user
    count are being established. Review a switch to Annual only after QA and
    production ownership are stable and the expected yearly saving is worth the
    fixed commitment.
14. If Workspace offers automatic GoDaddy configuration through Entri, close
   that authorization dialog and choose **Other verification options**. Do not
   grant Entri or another DNS automation intermediary access for a single TXT
   verification record. Add the exact DNS verification TXT record Google
   provides manually in GoDaddy; then return to Admin Console and wait until the
   domain shows Verified. Do not change nameservers, MX, A, CNAME, or unrelated
   TXT records during this verification step. When Google shows both a primary
   TXT method and an alternative CNAME method, use only the primary TXT method.
   In GoDaddy DNS, select **Add New Record**, set Type to `TXT`, set Name/Host to
   `@` (the root/default host), paste Google's exact `google-site-verification`
   value, and select the lowest available TTL. Add this as a separate TXT
   record; never overwrite an existing SPF, DMARC, provider-verification, or
   other TXT record. Do not also add Google's alternative CNAME.
15. Confirm the signup-created `admin@neelvara.com` user is the Super Admin and
   configure MFA/recovery before any further provider setup. During the
   one-user MenuList QA bootstrap only, this account may perform setup work from
   a controlled browser profile. Do not use it for unrelated personal browsing.
   The managed Google Account name fields may be read-only; the non-blocking
   display-name correction is tracked separately in `QA-A18` and must be made
   from Admin Console -> Directory -> Users before production operations.
16. A second paid user is not required during the initial MenuList QA bootstrap.
   Before production operations, create the named daily operator
   `danny@neelvara.com` or the founder's equivalent named mailbox, grant only
   the roles needed, and return `admin@neelvara.com` to break-glass-only use.
17. Create `billing@neelvara.com`, `security@neelvara.com`, and
   `dmarc@neelvara.com` as aliases or groups that deliver to named real users.
   Do not create shared-password users for these addresses. Configure the DMARC
   report recipient to accept the required external aggregate reports without
   exposing its member list.
18. Publish the exact Google-provided MX record(s), activate Gmail in Admin
    Console, and send a test message in both directions from each real mailbox.
    Remove or replace MX records from any previous mail provider after its mail
    has been exported. Preserve unrelated non-mail DNS records.
19. Publish one SPF TXT record covering every actual sender. For Workspace-only
    sending, follow Google's current Workspace-only value. If an SPF record
    already exists or another sender is active, merge it according to the
    provider instructions; never publish two SPF records.
20. In Admin Console, generate the DKIM record, publish Google's exact TXT value,
    wait for DNS propagation, and click **Start authentication**. Confirm a sent
    test message passes DKIM.
21. After SPF/DKIM have propagated, publish DMARC for `neelvara.com` in
    monitoring mode (`p=none`) with reports delivered to the controlled DMARC
    address. Do not move to quarantine/reject during initial setup.
22. Use a founder's long-lived personal email only as the recovery address. Do
   not create or use `neelvara@gmail.com` as the permanent company root.
23. Turn on MFA for `admin@neelvara.com` now and store its break-glass recovery
   codes offline and in the controlled vault. When the named daily operator is
   created before production, turn on MFA for that account as well.
24. During the one-user QA bootstrap, use `admin@neelvara.com` only for this
   controlled setup and confirm the `neelvara.com` organization resource is
   visible. After the named daily operator is created, use that account for
   normal work and return the Super Admin to break-glass-only use.
25. Complete GitHub before starting Vercel. Create the fresh company-admin
    account with verified `admin@neelvara.com` and username
    `neelvara-admin`. The public profile name may remain blank; do not require
    the founder's personal name.
    Enable MFA, generate recovery codes, and store recovery independently.
    Create a dedicated Ed25519 key on this workstation at
    `~/.ssh/id_ed25519_neelvara_github`; never upload or share its private key.
    Add only its `.pub` value to the fresh GitHub account and test that key
    independently before changing the existing SSH default. Create the
    `neelvara-systems` organization. Because the source owner does not belong to
    the target organization, use GitHub's native transfer first from
    `menulist-ai/menulist-core` to `neelvara-admin/menulist-core`; accept the
    emailed transfer within one day. Then, while signed in as `neelvara-admin`,
    use GitHub's native transfer again to move the same repository into
    `neelvara-systems/menulist-core`. This avoids granting the retiring account
    organization membership while preserving `main`, `staging`, and repository
    metadata. Do not copy files into a recreated repository.
    After the transfer, set local `origin` to the transferred repository, make
    the new key the GitHub key for this workstation, and set repository-local
    `user.name` as `Neelvara Systems` plus GitHub's exact noreply `user.email`
    for `neelvara-admin`; do not change global Git identity unless separately
    audited.
    Confirm `ssh -T`, `git remote -v`, `git fetch origin`, and local/remote
    `staging` evidence. Only after those checks pass, remove the old key from
    GitHub authentication and local SSH-agent/config use. Do not rewrite prior
    commits or delete the source account during this migration.
26. Retire the old Vercel account only through the `QA-A20` gate. Then create
    the fresh Neelvara Vercel account with MFA/passkey and recovery, import
    `neelvara-systems/menulist-core` exactly once into one fresh shared project,
    and confirm branch `staging` under Project -> Settings -> Git. Do not
    transfer old deployments/settings/env or create another project for the
    same repository.
27. Before creating new Firebase credentials, revoke any confirmed retired
    service-account key from an old project. Never copy an old key into
    `menulist-qa`.
28. Create calendar reminders for quarterly IAM/secret review and annual
    domain, payment, recovery-code, and ownership review.

Expected result:

- `admin@neelvara.com` is the recoverable owner and may perform the one-user QA
  bootstrap. Before production operations, a named daily operator performs
  routine work and the Super Admin returns to break-glass-only use.
- You can access registrar, Google/Firebase, and Vercel from owner-controlled
  accounts, with recovery details stored separately.
- Workspace mail can send and receive, and SPF, DKIM, and monitor-only DMARC are
  active before provider billing/security notices depend on those addresses.
- The existing GitHub repository is natively transferred to the fresh company
  organization with `staging` preserved, and one fresh Vercel project imports
  it without carrying forward old deployments or environment values.
- No setup depends on a personal disposable login.

### Step 2: Configure MenuList QA Domains

Where:

- Registrar DNS screen.
- Vercel Project -> Settings -> Domains.
- Vercel domain docs: https://vercel.com/docs/domains/working-with-domains
- Vercel Git and branch-domain docs: https://vercel.com/docs/git
- Vercel nameserver docs:
  https://vercel.com/docs/domains/working-with-nameservers

What to do:

1. Confirm `menulist.digital` is owned in the registrar account.
2. Confirm auto-renew is on.
3. Inventory and export every current DNS record before changing DNS authority.
   Include A, AAAA, CNAME, MX, TXT, CAA, and SRV records. A screenshot alone is
   not a restorable zone backup.
4. Confirm the fresh Project -> Settings -> Git points to
   `neelvara-systems/menulist-core`. In that fresh single Vercel project, add
   `menulist.digital`,
   `www.menulist.digital`, `app.menulist.digital`, and `*.menulist.digital`.
5. Assign every entry to the exact Git branch `staging`. Vercel domains default
   to Production unless explicitly assigned, so verify the Git Branch field on
   each entry instead of relying on the word "Preview" elsewhere in the UI.
6. The maintained apex-wildcard setup uses Vercel nameservers. Before switching
   them at the registrar, recreate every DNS record that must survive in Vercel
   DNS, then compare the old and new zone inventories.
7. Change the registrar nameservers only to the exact values Vercel currently
   shows. Do not invent an A or wildcard CNAME from this guide. If the current
   domain cannot move to Vercel nameservers, stop and review a delegated-domain
   design before issuing any tenant links.
8. Save the branch assignments but do not trigger the first deployment yet.
   Phase J creates the fresh exact-`staging` Preview only after env, secrets,
   Firebase rules, and Functions are ready.
9. Confirm `app`, `www`, `qa`, `dashboard`, and every other reserved platform
   label cannot be issued as a customer slug.
10. Confirm Vercel reports valid domain ownership/DNS and the expected TLS
    certificate state for apex, `www`, `app`, and wildcard. Confirm every domain
    still shows Git Branch `staging`, not Production. Content and HTTPS request
    smoke happens after the Phase J deployment.
11. Do not attach `menulist.online`, `www.menulist.online`, `menulist.ai`, or
    `app.menulist.ai` to this staging flow.

Expected result:

- `menulist.digital`, `www.menulist.digital`, `app.menulist.digital`, and the
  wildcard are DNS/TLS-ready for the first exact-`staging` Preview deployment.
- `app.menulist.digital` is assigned as the only QA owner/auth app host, and QA
  customer tests are assigned to `<business-slug>.menulist.digital`.
- Vercel is authoritative DNS for the apex wildcard and all pre-existing
  required DNS records still resolve.
- `menulist.digital` is not used for MyCodex and is not attached to Production.

### Step 3: Create Or Confirm Firebase Project `menulist-qa`

Where:

- Firebase Console: https://console.firebase.google.com/
- Firebase project docs: https://firebase.google.com/docs/projects/learn-more

What to do:

1. Search for exact Firebase project id `menulist-qa`.
2. If it exists under the owner/company account, use it.
3. If it does not exist, create exactly `menulist-qa` from the named company
   operator account. Use the break-glass admin only if additional organization
   permission is required.
4. Select the Google Cloud organization associated with `neelvara.com` as the
   project resource parent when Google presents that choice.
5. Do not accept a suffixed id.
6. Confirm the project owner/operator and the truthful intended billing owner.
   Do not link billing or create paid resources until Step 4 creates the budget
   guardrails.
7. Enable Firebase Auth, then Authentication -> Sign-in method -> Email/Password.
   Enable Email/Password for the current owner credential flow. Do not enable
   Firebase's Google provider as a substitute for the separate NextAuth Google
   OAuth client configured in Step 5.
8. Create one MenuList Web app named `MenuList QA Web` and store its config
   values in the password vault. Do not create a separate web app per QA host.
9. Confirm no action was taken in Firebase project id `menulist-prod`.

Expected result:

- Firebase project id is exactly `menulist-qa`.
- Firebase Auth and one QA Web app exist under the company project.
- No production project is touched.

### Step 4: Enable QA Billing For Firebase And Gemini

Where:

- Google Cloud Billing: https://console.cloud.google.com/billing
- Firebase project billing: https://console.firebase.google.com/project/menulist-qa/usage/details
- Google Cloud alert-only budgets: https://cloud.google.com/billing/docs/how-to/budgets
- Google Cloud spend-cap budgets Preview: https://cloud.google.com/billing/docs/how-to/budgets-spend-caps
- Gemini API for `menulist-qa`:
  https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=menulist-qa
- Google AI Studio project limits: https://aistudio.google.com/usage
- Gemini API billing docs: https://ai.google.dev/gemini-api/docs/billing

What to do:

1. Link `menulist-qa` to the approved QA Cloud Billing account.
2. When Google creates or selects the payments profile, use the truthful current
   payer, country, address, tax details, and account type. Do not claim Neelvara
   is a registered legal entity when it is not. Record the chosen account type
   in the password vault/setup notes because Google does not let you change it
   on that payments profile later.
3. If the legal payer changes after registration, create a new correctly typed
   Cloud Billing account/payments profile and relink `menulist-qa`; do not
   rewrite false details into the old profile.
4. Create a low alert-only budget scoped to project `menulist-qa` before API
   usage starts. Send notifications to the real billing/security recipients and
   select deliberate threshold percentages. Record the amount and recipients.
   This standard budget sends alerts; it does not stop spending.
5. Enable the Gemini/Generative Language API in exact project `menulist-qa`.
   Do not create a key or make a provider call yet.
6. Create a separate Preview spend-cap budget scoped to project `menulist-qa`
   and service **Gemini API**. Keep the amount below the owner's absolute limit
   because enforcement is not instantaneous and in-flight calls may complete.
   This feature is a Google Cloud Preview capability and may not be available to
   every billing account. If the console does not offer it, stop before paid
   Gemini calls and report the external blocker; do not mark `QA-BILL04` done.
7. Read the current AI Studio rolling spend limit for project `menulist-qa`.
8. Choose and vault `MENULIST_GEMINI_SPEND_LIMIT_USD_10M` below that provider
   limit. The checked-in default is USD 8. Wire it only when Phase G prepares
   the env files.
9. Do not configure a Cloud Run spend cap in this pass. It pauses every Cloud
   Run service, job, and worker pool in the project when enforced.

Expected result:

- `menulist-qa` can deploy Firebase Functions and use paid/production-grade
  services after their provider keys are created in Phase E.
- Alert-only, provider rolling, chosen app-local rolling, and monthly Gemini
  spend-cap layers are all visible and distinct before any paid Gemini call.
- No production billing account or production Firebase project is touched.

### Step 4.1: Create Firebase Data Services And Admin Credentials

Where:

- Firebase Console: https://console.firebase.google.com/project/menulist-qa/overview
- Firestore location docs: https://firebase.google.com/docs/firestore/locations
- Storage setup and Blaze requirement:
  https://firebase.google.com/docs/storage/web/start
- Storage location docs: https://firebase.google.com/docs/storage/locations

What to do:

1. Confirm exact project `menulist-qa` is linked to the guarded billing account
   from Step 4 and now shows the Blaze plan.
2. Enable the `(default)` Firestore database in Native mode. Firestore asks for
   a location; select `us-central1` so it matches the current Firebase Functions
   and Cloud Tasks runtime contract.
3. Enable the default Storage bucket. Select `us-central1` and confirm the new
   bucket name is `menulist-qa.firebasestorage.app`. Its location is permanent.
4. In Authentication -> Settings -> Authorized domains, add only:
   - `localhost`
   - `app.menulist.digital`
5. In Project Settings -> Service accounts, generate one new QA Admin SDK
   private key only when the Vercel server credentials are ready to be entered.
   Vault the `project_id`, `client_email`, and `private_key`; record the key id,
   creation date, and revocation owner.
6. Map the Firebase Web app API key once as
   `NEXT_PUBLIC_MENULIST_FIREBASE_API_KEY`. Firebase Web API keys are public
   identifiers, and server-auth routes read this same canonical value. Do not
   add a second server alias.
7. After extracting the required fields into the vault and ignored local env,
   securely remove the downloaded JSON from Downloads and every unencrypted
   local path. Never commit or upload the JSON file to Vercel.
8. Record the actual Firestore and Storage locations in the vault setup note.
   If either resource already exists elsewhere, do not delete or recreate it;
   stop and report the current location for architecture review.

Expected result:

- Firestore and Storage both report `us-central1` in their console metadata.
- QA sign-in can complete on localhost and `app.menulist.digital`; production
  and customer tenant domains are not authorized in `menulist-qa`.
- Admin credentials and the server Firebase API-key mapping are vaulted, with no
  downloaded JSON left on disk.

Region decision for this setup: use only `us-central1`. Do not create regional
copies or add another deployed environment.

### Step 5: Configure Google OAuth For QA

Where:

- Google Auth Platform for `menulist-qa`:
  https://console.cloud.google.com/auth/overview?project=menulist-qa
- Google Search Console: https://search.google.com/search-console
- Google Auth Platform overview:
  https://support.google.com/cloud/answer/15548748
- Google Auth client setup:
  https://support.google.com/cloud/answer/15549257

What to do:

1. Select exact project `menulist-qa` in the Google Cloud project selector.
2. Verify domain ownership for `menulist.digital` in Search Console using the
   company operator/project owner. DNS verification does not make the QA site
   indexable; the app still enforces its noindex/robots/no-sitemap policy.
3. In Google Auth Platform -> Branding, set the app name to `MenuList QA`, use
   the company-managed `support@neelvara.com` Google Group as the user support
   contact and `admin@neelvara.com` as the monitored developer contact, and
   enter these exact QA pages:
   - Home: `https://menulist.digital`
   - Privacy: `https://menulist.digital/privacy-policy`
   - Terms: `https://menulist.digital/terms-of-service`
   - Authorized domain: `menulist.digital`
4. In Audience, select **External** and keep publishing status **Testing**. Add
   only the named company accounts that will run QA. Do not publish the app or
   request production verification in this pass.
5. In Data Access, keep only the identity scopes used by the current NextAuth
   sign-in: `openid`, `email`, and `profile`. Stop if the console shows a
   sensitive/restricted scope not explained by this guide.
6. In Clients, create one **Web application** OAuth client named
   `MenuList QA Web`.
7. Add the exact Authorized JavaScript origins below. Do not add wildcard tenant
   hosts or customer origins.

Authorized JavaScript origins:

- `http://localhost:3000`
- `https://app.menulist.digital`

Authorized redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `https://app.menulist.digital/api/auth/callback/google`

8. Save the client. Vault the client id and client secret immediately; Google
   may not show the secret again. These become `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET` in Phase G.
9. Re-open the client and compare every origin and redirect character-for-
   character. Do not add `menulist.ai`, `app.menulist.ai`, production callbacks,
   customer wildcards, or Vercel-generated preview URLs.

Expected result:

- OAuth client id and secret are stored for QA use.
- Branding, audience, test users, scopes, origins, and callbacks are all scoped
  to the MenuList QA flow.
- Production OAuth client is not changed.

### Step 5.1: Create MenuList QA Gemini Keys

Where:

- Google AI Studio API keys: https://aistudio.google.com/apikey
- Google Cloud API credentials for `menulist-qa`:
  https://console.cloud.google.com/apis/credentials?project=menulist-qa
- Gemini rate-limit reference: https://ai.google.dev/gemini-api/docs/rate-limits

What to do:

1. In AI Studio, select the existing Google Cloud project `menulist-qa`. Do not
   let AI Studio silently create another project.
2. Create three shared QA authorization keys named `MenuList QA primary`,
   `MenuList QA rotation 2`, and `MenuList QA rotation 3`, plus one dedicated
   paid credential named `MenuList QA menu extraction`. Current AI Studio keys
   use the `AQ.` authorization key format rather than the legacy `AIza`
   standard-key format.
3. Confirm each key is an authorization key bound to the intended
   `menulist-qa` service account. AI Studio restricts authorization keys to the
   Gemini/Generative Language API by default. Do not convert them to shared
   standard keys or add browser-referrer restrictions; these values are used
   only by server runtimes in Vercel and Firebase Functions.
4. Vault each key and record its Google project, creation date, purpose, and
   revocation owner. Keys in the same project share that project's Gemini quota;
   four credentials do not create four quotas.
5. Record the env mapping without placing values in this document. Vercel and
   local use only the canonical MenuList name. Firebase Functions use the
   project-local Secret Manager name in the separate `menulist-qa` runtime:

| Vault entry | Vercel/local env | Firebase Functions Secret Manager |
| --- | --- | --- |
| Primary | `MENULIST_GEMINI_AI_KEY` | `GEMINI_AI_KEY` |
| Rotation 2 | `MENULIST_GEMINI_AI_KEY_2` | `GEMINI_AI_KEY_2` |
| Rotation 3 | `MENULIST_GEMINI_AI_KEY_3` | `GEMINI_AI_KEY_3` |
| Menu extraction | Not stored in root/Vercel env | `MENULIST_GEMINI_TEXT_AI_KEY` |

Expected result:

- Four real QA authorization keys belong to `menulist-qa`, retain their default
  Gemini API restriction and intended service-account binding, and are
  recoverable from the vault. Only three participate in the shared pool; menu
  extraction has one isolated credential and no shared fallback.
- No Answerlattice, CampaignCue, SignalDesk, or production key is created.

### Step 5.2: Create The QA Upstash Database

Where:

- Upstash Console: https://console.upstash.com/
- Upstash Redis getting started: https://upstash.com/docs/redis/overall/getstarted

What to do:

1. Create or use one company-controlled Upstash account with MFA/provider login
   recovery recorded in the vault.
2. Create exactly one QA Redis database named `menulist-qa-rate-limit`. Use the
   provider's current low-cost/default single-database option for this pass and
   record the provider-selected location/plan; do not create multi-region or a
   production database yet.
3. Open the database REST details and copy the REST URL plus the standard REST
   token. Do not expose a Redis token to `NEXT_PUBLIC_*` variables.
4. Vault and map the QA values once as
   `MENULIST_UPSTASH_REDIS_REST_URL` and
   `MENULIST_UPSTASH_REDIS_REST_TOKEN`. Do not add generic duplicate rows.
   Future Answerlattice Redis configuration uses `ANSWERLATTICE_UPSTASH_*`.
5. Do not run destructive flush commands. Connectivity is tested through the
   app's bounded rate-limit path after deployment.

Expected result:

- One isolated QA Redis database exists and both REST values are vaulted.
- No production Upstash database or browser-visible token exists.

### Step 5.3: Prepare Razorpay Test Mode

Where:

- Razorpay Dashboard: https://dashboard.razorpay.com/
- Razorpay test/live quickstart: https://razorpay.com/docs/payments/quickstart/
- Razorpay webhook guide: https://razorpay.com/docs/webhooks/

What to do:

1. Create or use one owner-controlled Razorpay merchant account. Enter the
   truthful current individual/trade-name payer details; do not invent company
   registration, tax, or KYC details.
2. Switch the dashboard to **Test Mode** before generating anything.
3. Generate one test key pair. Confirm the key id starts with `rzp_test_`, vault
   the key id/secret, and record the creation date. Stop if a key starts with
   `rzp_live_`.
4. Generate a separate random QA webhook signing secret and vault it as
   `MENULIST_RAZORPAY_WEBHOOK_SECRET`. This value is not the Razorpay API key
   secret.
5. Record the env mapping:
   - `NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID` uses the test key id. Razorpay
     Checkout requires the key ID in the browser, and server code reads the
     same public identifier; do not store a second server alias.
   - `MENULIST_RAZORPAY_KEY_SECRET` uses the test key secret and stays
     server-only.
   - `MENULIST_RAZORPAY_WEBHOOK_SECRET` uses the distinct QA webhook secret and
     stays server-only.
6. Do not add the webhook endpoint yet. Step 9.5 adds it only after
   `https://app.menulist.digital` is live.

Expected result:

- Test keys and a distinct test webhook secret are vaulted.
- Razorpay Live Mode, live keys, and production webhooks remain untouched.

### Step 5.4: Create The MenuList QA Sentry Project

Where:

- Sentry: https://sentry.io/
- Sentry Next.js setup: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Sentry organization auth tokens:
  https://docs.sentry.io/organization/auth-tokens/

What to do:

1. Create or use one company-controlled Sentry organization and enable the
   strongest available account MFA.
2. Create one Next.js project named `menulist-qa`. Do not reuse a production
   project.
3. Copy the QA DSN once into `NEXT_PUBLIC_SENTRY_DSN`. Browser, server, and edge
   runtimes in the shared Vercel app reuse this DSN; Vercel Preview/branch scope
   separates it from the production value. Do not add root `SENTRY_DSN`,
   `SENTRY_DEV_DSN`, or `NEXT_PUBLIC_SENTRY_DEV_DSN` duplicates. Firebase
   Functions receive the same QA DSN later through their isolated project-local
   `SENTRY_DSN` Secret Manager name.
4. Create a least-privilege organization auth token only if the current Vercel
   source-map upload requires it. Vault `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and
   `SENTRY_PROJECT`; keep the auth token server-only.
5. Record a retention/PII review owner. Do not enable collection of raw secrets,
   passwords, provider tokens, or unrestricted customer payloads.

Expected result:

- Browser, Next.js server, and selected Firebase Functions can report to one
  isolated MenuList QA Sentry project.
- No production Sentry project or DSN is used.

### Step 5.5: Create Meta WhatsApp Test Credentials Required By The Function Bundle

Where:

- Meta Developers apps: https://developers.facebook.com/apps/
- WhatsApp Cloud API getting started:
  https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/

What to do:

1. Sign in with the owner-controlled Meta developer account and record MFA and
   recovery ownership.
2. Create one non-production app using the WhatsApp-capable business app option
   shown by the current Meta console, then add the WhatsApp product.
3. Use Meta's test WhatsApp number and test recipient flow. Do not connect a
   production business number, production billing, or live customer recipient.
4. Vault the test phone-number id and test access token. Record the token expiry;
   replace an expired temporary token before any messaging smoke test.
5. From App Settings -> Basic, vault the app secret.
6. Generate a separate random verify token and vault it. This is an owner-chosen
   challenge token, not the Meta app secret or access token.
7. Add only `MENULIST_WHATSAPP_PHONE_NUMBER_ID` and
   `MENULIST_WHATSAPP_ACCESS_TOKEN` to local/Vercel when an approved Next.js
   phone OTP or owner-notification smoke requires them. Keep the app secret and
   verify token out of root env files.
8. Map all four credentials to Function Secret Manager names without the
   `MENULIST_` prefix in Phase H. Keep `ENABLE_MESSAGING_ONBOARDING=false` in
   `functions/.env.menulist-qa` until the controlled webhook smoke. Do not
   register the production webhook, send live messages, or add a live number.

Expected result:

- The real non-production values required by the maintained Functions target
  declarations exist without activating production messaging.
- If Meta blocks app creation or test credentials, record `QA-E05 blocked` and
  stop before the full Functions deploy. Never use fake values.

### Step 5.6: Generate The Remaining QA-Only Secrets

Where:

- Local terminal, with output moved directly into the password vault.

Run the command separately for each required secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Generate and label separate values for:

- `NEXTAUTH_SECRET`
- `MENULIST_OWNER_REFERRAL_TOKEN_SECRET`
- `REVALIDATION_SECRET`
- `BATCH_IMAGE_GENERATION_WORKER_SECRET`
- `GCP_BUDGET_WEBHOOK_SECRET` only if the optional budget webhook will be used

Never reuse one generated value for two names. Do not paste the output into chat
or this document.

### Step 5.7: Create The QA Cloud Tasks Queue

Where:

- Cloud Tasks API: https://console.cloud.google.com/apis/library/cloudtasks.googleapis.com?project=menulist-qa
- Cloud Tasks queues: https://console.cloud.google.com/cloudtasks?project=menulist-qa
- Google Cloud Shell or a local terminal authenticated to the owner account.

What to do:

1. Confirm the selected project is exactly `menulist-qa`.
2. Enable the Cloud Tasks API.
3. Create the queue with the existing runtime queue id and project location:

```bash
gcloud tasks queues create batch-image-generation \
  --project=menulist-qa \
  --location=us-central1 \
  --max-concurrent-dispatches=8 \
  --max-dispatches-per-second=4 \
  --max-attempts=5 \
  --min-backoff=5s \
  --max-backoff=300s
```

4. If the command reports that the queue already exists, do not create a
   second queue. Inspect the existing one:

```bash
gcloud tasks queues describe batch-image-generation \
  --project=menulist-qa \
  --location=us-central1
```

5. Confirm the separate QA-only `BATCH_IMAGE_GENERATION_WORKER_SECRET` from
   Step 5.6 is vaulted. Do not enter it in an env until Phase G.
6. Record these non-secret values for Phase G:

```env
BATCH_IMAGE_GENERATION_WORKER_URL=https://app.menulist.digital/api/image-generation/batch-generation
BATCH_IMAGE_GENERATION_QUEUE_ID=batch-image-generation
```

Stop if the command targets another project/location, billing is not active,
or the existing queue has materially different retry/rate settings. Share the
output with Codex before changing an existing queue.

Expected result:

- One running `batch-image-generation` queue exists in
  `menulist-qa/us-central1`.
- The worker URL is recorded for the QA owner-app host, not the marketing or
  customer domain.
- No task has been enqueued yet; the controlled worker smoke happens after the
  Vercel staging deployment is live.

### Step 5.8: Record Optional QA Provider Decisions

Do not create optional accounts merely to fill env rows. For the first
MenuList QA boot, use these defaults unless a named test requires otherwise:

1. **Firebase App Check/reCAPTCHA:** skip enforcement. If App Check is being
   evaluated, register only the QA website/app/test hosts and leave it in
   monitoring mode until the normal Auth, Firestore, and Storage smoke passes.
2. **Telegram alerts:** skip unless QA operations alerts are part of this test.
   If enabled, create a QA-only bot/chat through BotFather and vault both
   values; do not reuse a production bot.
3. **SMTP:** skip unless lifecycle-email delivery is part of this test. If
   enabled, create a QA sender in the approved mail provider, verify its sending
   domain, vault host/port/user/password, and send only to controlled testers.
4. **UptimeRobot:** record `Enabled after Phase J` as the recommended decision.
   Do not create monitors until the first staging deployment is live.
5. **Analytics:** skip staging analytics by default. Enable a separate QA
   property only when an analytics test has been explicitly approved; never
   send QA events into production reporting.

Tell Codex the outcome for `QA-F01` through `QA-F05`. Codex will mark each
decision complete and add `Skipped intentionally`, `Enabled after Phase J`, or
the configured QA provider reference without recording a secret.

Expected result:

- Every optional provider has an explicit decision before env preparation.
- No fake placeholder, production credential, or unapproved analytics account
  exists.

### Step 6: Prepare Env Values

Where:

- Local ignored env file.
- Vercel Project -> Settings -> Environment Variables -> Preview.

What to do:

1. Use `.env.staging.example` as the complete inventory. It is not deployable
   as-is and Vercel does not read it automatically.
2. Populate only the MenuList/shared runtime rows required by this pass in the
   ignored local env and Vercel Preview. For every Vercel value, choose Preview
   and restrict its Git Branch to exact branch `staging`; do not expose QA
   secrets to unrelated Preview branches. Remove or leave unset every unrelated
   product row; do not upload literal `<...>` values to make a key look present.
3. Keep production values out of this file.
4. Use full MenuList env names: `MENULIST_*` and `NEXT_PUBLIC_MENULIST_*`.
5. Do not create generic compatibility aliases. The managed templates contain
   exactly one product-scoped row per MenuList value.
6. Set `functions/.env.menulist-qa` from its checked-in example so app/API,
   customer-domain, and messaging-preview values remain separate.
7. In the local ignored env, override the deployment markers and URLs below.
   The Firebase/provider values still come from the same QA family:

```env
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_VERCEL_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

## Superseding Keyless QA Decision - August 15, 2026

The historical QA key-generation and rotation evidence above remains a record
of the former setup. The approved final hosted contract no longer uses that key:

- one shared `menulist-core` Vercel project has a custom `qa` environment
  attached only to exact branch `staging`;
- MenuList QA uses Vercel OIDC and project-local Google Workload Identity
  Federation for `menulist-qa`;
- the static QA Admin key must be removed from Vercel after keyless provider
  setup and runtime evidence, then revoked under the existing rotation record;
- local development uses ADC and may not depend on the hosted OIDC token;
- MenuList QA is configured and certified independently before MenuList
  production; both Answerlattice targets remain pending and all Answerlattice
  Firebase/Admin values stay absent from custom environment `qa` during this
  MenuList-only pass.

### Live Vercel Provider Checkpoint - August 15, 2026

- [x] `QA-OIDC-01` Read-only Vercel identity preflight completed for linked
  project `neelvara-systems/menulist-core`. The project and team IDs match the
  repository link. Team issuer mode is already selected with issuer
  `https://oidc.vercel.com/neelvara-systems` and audience
  `https://vercel.com/neelvara-systems`; no OIDC setting was changed or saved.
- [x] `QA-OIDC-02` Provision one branch-restricted custom environment named
  `qa`. The owner activated Vercel Pro and used its included Custom Environment
  to create `qa` with description **Production-grade QA for the staging
  branch**. Live readback confirms Branch Tracking is enabled with exact rule
  **Branch is `staging`**. No domain is attached, no environment variable was
  added or imported, and no deployment was triggered. Generic Preview trust,
  additional Custom Environment capacity, and a second Vercel project are not
  required by the approved architecture.
- [x] `QA-OIDC-03` Create and verify the `menulist-qa` Google WIF pool,
  provider, dedicated runtime service account, least-privilege roles, exact
  federated-subject bindings, and short-lived token exchange. Hosted proof from
  a disposable deployment targeted at custom environment `qa` returned exact
  JWT subject
  `owner:neelvara-systems:project:menulist-core:environment:qa`, claim
  `environment=qa`, immutable team ID
  `team_pCphDvMJUPFjVfH8x1AXSmPz`, immutable project ID
  `prj_9DIdLQC5fWX0HtExaBFpg0xAJklz`, `VERCEL_ENV=preview`, and
  `VERCEL_TARGET_ENV=qa`. The earlier local token pull remains correctly
  classified as development-only evidence. Security Token Service is enabled.
  Active pool `menulist-vercel` contains provider `menulist-qa` with team
  issuer `https://oidc.vercel.com/neelvara-systems`, no allowed-audience
  override, exact subject mapping, immutable-ID mappings, and a condition that
  requires both IDs, `environment=qa`, and the exact subject. Dedicated runtime
  service account `menulist-vercel-qa@menulist-qa.iam.gserviceaccount.com` has
  project-scoped `roles/datastore.user` and `roles/firebaseauth.admin`,
  bucket-scoped `roles/storage.objectAdmin` only on
  `menulist-qa.firebasestorage.app`, queue-scoped
  `roles/cloudtasks.enqueuer` only on `batch-image-generation`, self-scoped
  `roles/iam.serviceAccountTokenCreator`, and exact-subject
  `roles/iam.workloadIdentityUser`. The service account has no user-managed
  keys. A second disposable hosted proof requested the provider's canonical
  audience and passed Vercel audience exchange, Google STS exchange,
  service-account impersonation, and Firebase custom-token `signBlob`. Both
  disposable deployments, all temporary files, and generated protection-bypass
  credentials were removed; Vercel readback shows zero `qa` probe deployments
  and zero automation bypass secrets. This completes provider identity setup,
  not the application migration. Vercel custom environment `qa` now contains
  the five non-secret MenuList WIF selectors: auth mode, project number,
  service-account email, pool ID, and provider ID.
- [x] `QA-OIDC-04` Populate and verify the MenuList-only custom `qa` runtime
  baseline. The effective branch-specific Preview source contained 38 explicit
  project variables plus Vercel system values. Exactly 36 MenuList/shared
  project values were copied; `MENULIST_FIREBASE_CLIENT_EMAIL` and
  `MENULIST_FIREBASE_PRIVATE_KEY` were deliberately excluded, and no Vercel
  system or sister-product value was copied. Custom `qa` readback now contains
  41 project variables: the 36 baseline values plus the five MenuList WIF
  selectors. Value-safe verification passed for exact preview stage markers,
  QA domains, `menulist-qa`, `us-central1`, emulator-off flags, Cloud Tasks
  queue/worker target, and all WIF selectors. No static Admin-key variable and
  no Answerlattice variable is present. The live custom environment also passed
  repository `validateEnvironment()` with zero missing requirements. Focused
  Workload Identity, env-contract, environment-target, configuration-safety,
  TypeScript, lint, and diff checks passed. The former key pair still exists
  only in the legacy branch-specific Preview configuration; remove it from
  Vercel and revoke the underlying key after the first keyless MenuList QA
  runtime smoke passes. Answerlattice QA and production remain pending and do
  not block MenuList certification.
- [x] `QA-OIDC-05` Deploy the MenuList app to custom environment `qa` and close
  the runtime/domain cutover. Application deployment
  `dpl_uSd8VderSJwFav1uW8nt5BV52nTb` from commit
  `aea6c9314cc5fa2447fc1d9e53176cd17ae0860f` is **Ready** with target `qa`.
  The custom environment initially inherited a stale Google OAuth client secret;
  correcting it moved sign-in past `invalid_client`. The next authenticated
  `/api/auth/set-claims` call returned HTTP 503 because the copied Upstash token
  was stale and `/pipeline` returned HTTP 401. Replacing the QA Upstash URL/token
  resolved that boundary. Current runtime logs show repeated HTTP 200 responses
  for `/api/auth/set-claims` and `/api/auth/session`, plus authenticated owner
  loads for `/today`, `/projects`, `/billing`, and `/business-settings`.
  At this runtime-proof checkpoint, canonical domains `menulist.digital`, `www.menulist.digital`,
  `app.menulist.digital`, and `*.menulist.digital`, plus the custom-environment
  Vercel alias, resolved to that application deployment. HTTP readback returned
  200 for the apex, `www`, `/api/version`, and a tenant subdomain. Later
  branch-tracked `qa` builds may replace the deployment ID while retaining the
  same four canonical environment assignments.
  A scoped disposable probe using the same custom `qa` identity reconfirmed the
  exact Vercel claims and passed Google STS, service-account impersonation,
  `signBlob`, Storage object create/read/delete, and Cloud Tasks task creation on
  queue `batch-image-generation`. The task used a deliberately invalid smoke
  payload, so it proved queue-scoped enqueue permission without invoking AI or
  mutating business data. The app deployment's authenticated owner loads prove
  the Firestore-backed runtime path.

  Two disposable probe deployments briefly auto-promoted the custom `qa`
  aliases during the smoke and made the canonical hosts return 404. The issue
  was detected immediately; all five aliases were reassigned to the application
  deployment and the four canonical HTTP checks returned 200 again. Both probe
  deployments were deleted and the generated Vercel automation bypass was
  revoked; a fresh project-protection readback returned an empty
  `protectionBypass` map.

  `MENULIST_FIREBASE_CLIENT_EMAIL` and
  `MENULIST_FIREBASE_PRIVATE_KEY` have now been removed from the legacy
  branch-specific Preview configuration, and custom `qa` still has no static
  Admin-key variable. Public-key matching identified the former Google
  user-managed key exactly as
  `79ef5b9d27319c55c674fed85655e0b681443ec2` on
  `firebase-adminsdk-fbsvc@menulist-qa.iam.gserviceaccount.com`. The company
  operator reauthenticated Firebase CLI. A pre-delete IAM query returned
  exactly that one enabled `USER_MANAGED`/`GOOGLE_PROVIDED` key. The scoped
  delete request targeted only its full IAM resource name; a fresh readback
  after propagation returned `verifiedAbsent=true` and
  `remainingUserManagedKeyCount=0`. No other key or service account changed.
  `QA-OIDC-05` is complete.

  Answerlattice QA and production remain pending and are not part of this
  MenuList-only closure.

  Historical failed attempts are retained below for incident context.
  The first branch-tracked application attempt started automatically after
  commit `7d4e2bf` reached `staging` and correctly targeted custom environment
  `qa`, but deployment `dpl_2aDCkisLor8AUMUzEjPsLMYyExpM` failed while Next.js
  collected `/client/sitemap.xml`. Firebase Admin 14 rejected the generic
  custom credential when constructing Firestore before a request-scoped OIDC
  token was needed. TypeScript, lint, and compilation had already passed. Keep
  all QA domains unmoved. The replacement deployment
  `dpl_6hJ4p8SEMBg59iwDM8n1c3RNmzQX` for commit `9dacb253` also targeted custom
  environment `qa` and confirmed the exact OIDC subject environment is `qa`,
  but failed while collecting `/api/auth/claim-account`: established
  `admin.firestore()` compatibility callers still asked Firebase Admin to
  reconstruct Firestore from the custom credential. The selected Firestore
  client is now registered by Firebase app name so default MenuList and named
  Answerlattice callers remain isolated while reusing their keyless clients.
  Focused QA module-load verification passed before the successful deployment
  and canonical-domain smoke recorded above.

8. In Vercel custom environment `qa` for exact branch `staging`, use the hosted values below:

```env
NEXT_PUBLIC_ENV=preview
NEXT_PUBLIC_VERCEL_ENV=preview
NEXT_PUBLIC_APP_URL=https://menulist.digital
NEXT_PUBLIC_DEPLOYMENT_URL=https://menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.digital
NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES=menulist.digital,www.menulist.digital,app.menulist.digital
NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN=menulist.digital
NEXTAUTH_URL=https://app.menulist.digital
```

9. Populate this minimum MenuList QA value map before the first deployment. Use
   `.env.staging.example` for the exact one-key-per-line inventory and comments:

| Group | Required names for this pass |
| --- | --- |
| Auth | `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Firebase browser canonical | `NEXT_PUBLIC_MENULIST_FIREBASE_API_KEY`, `NEXT_PUBLIC_MENULIST_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_MENULIST_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_MENULIST_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_MENULIST_FIREBASE_APP_ID` |
| Firebase server-only canonical | `MENULIST_FIREBASE_ADMIN_AUTH_MODE=vercel_oidc`, `MENULIST_GCP_PROJECT_NUMBER`, `MENULIST_GCP_SERVICE_ACCOUNT_EMAIL`, `MENULIST_GCP_WORKLOAD_IDENTITY_POOL_ID`, `MENULIST_GCP_WORKLOAD_IDENTITY_PROVIDER_ID`, `MENULIST_FIREBASE_PROJECT_LOCATION=us-central1`; server code reuses the public project ID, bucket, and Web API key above |
| Gemini | `MENULIST_GEMINI_AI_KEY` plus `_2`/`_3`, and `MENULIST_GEMINI_SPEND_LIMIT_USD_10M` |
| Razorpay Test | `NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID`, `MENULIST_RAZORPAY_KEY_SECRET`, and `MENULIST_RAZORPAY_WEBHOOK_SECRET` |
| Upstash | `MENULIST_UPSTASH_REDIS_REST_URL`, `MENULIST_UPSTASH_REDIS_REST_TOKEN` |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN`; add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` only when source-map upload is configured; Firebase Functions use project-local `SENTRY_DSN` Secret Manager |
| App/worker secrets | `MENULIST_OWNER_REFERRAL_TOKEN_SECRET`, `MENULIST_REVALIDATION_SECRET`, `MENULIST_BATCH_IMAGE_GENERATION_WORKER_SECRET` |
| Cloud Tasks | `MENULIST_BATCH_IMAGE_GENERATION_WORKER_URL=https://app.menulist.digital/api/image-generation/batch-generation`, `MENULIST_BATCH_IMAGE_GENERATION_QUEUE_ID=batch-image-generation` |
| Meta/WhatsApp | Root env accepts only optional `MENULIST_WHATSAPP_PHONE_NUMBER_ID` and `MENULIST_WHATSAPP_ACCESS_TOKEN` for an approved Next.js phone/notification smoke. App secret, verify token, and onboarding runtime flags remain Functions-only; Phase H uses project-local Secret Manager and `functions/.env.menulist-qa` |

10. During the MenuList QA pass, keep Answerlattice values entirely absent.
    MenuList QA may deploy and complete its runtime smoke independently after its
    own value inventory and release gates pass. Add the complete
    `answerlattice-qa` client and OIDC/WIF tuple only when the later
    Answerlattice pass is explicitly reopened. Leave CampaignCue, SignalDesk,
    MyCodex, and matching `NEXT_PUBLIC_*` values governed by their own setup
    gates; the validator rejects every partial Firebase family.
11. Check the actual local env for unresolved placeholders without printing any
    configured values:

```bash
awk -F= '$2 ~ /^<.*>$/ {print $1}' .env.local
```

Expected output: no variable names.

12. In Vercel, review values directly because the checked-in example is only a
    key inventory. Confirm each QA value belongs to custom environment `qa` and
    that environment is attached only to exact Git branch `staging`.
13. For rule tests and destructive local data work, start the Firebase Emulator
   Suite and use this ignored local override:

```env
NEXT_PUBLIC_USE_EMULATORS=true
FUNCTIONS_EMULATOR=true
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```

14. Keep those emulator values off in Vercel. Set them back to `false`/blank
   locally only when deliberately smoke-testing the shared cloud
   `menulist-qa` integration.

Expected result:

- Local and the branch-restricted Vercel custom `qa` environment use the
  `menulist-qa` configuration family; local uses ADC, hosted QA uses OIDC/WIF,
  and emulator-first local tests do not create a third deployed environment.
- Website runtime values use `menulist.digital`; `NEXTAUTH_URL` uses
  `app.menulist.digital`.
- Generated QA customer links use `<slug>.menulist.digital`.
- Functions use `NEXT_PUBLIC_APP_URL=https://app.menulist.digital`,
  `NEXT_PUBLIC_MSG_PREVIEW_BASE_URL=https://app.menulist.digital`, and
  `MENULIST_TENANT_BASE_DOMAIN=menulist.digital`.
- No deployable env contains a template marker or a fake sister-product value.

### Step 7: Set Firebase Functions Secrets

Where:

- Local terminal with Firebase CLI.
- Google Secret Manager: https://console.cloud.google.com/security/secret-manager

Use only project `menulist-qa`.

Confirm the Firebase login includes exact project `menulist-qa`:

```bash
firebase projects:list
```

Then enable Secret Manager only in that project:

```bash
gcloud services enable secretmanager.googleapis.com --project=menulist-qa
```

Stop on any authentication, IAM, billing, or project-not-found error. Do not
substitute `menulist` or another project.

The maintained full MenuList QA Functions command includes targets whose
deployment options bind Sentry and WhatsApp Secret Manager parameters. Those
secret names must have real QA versions before that command can deploy, even
though `ENABLE_MESSAGING_ONBOARDING=false` keeps provider processing off. To
defer either provider, stop before the Functions deploy and review a smaller
target list separately; never create fake secret values.

Required secret names for this QA pass:

- `GEMINI_AI_KEY`
- `GEMINI_AI_KEY_2`
- `GEMINI_AI_KEY_3`
- `MENULIST_GEMINI_TEXT_AI_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_VERIFY_TOKEN`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `SENTRY_DSN`
- `REVALIDATION_SECRET`

Optional only if enabled:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `GCP_BUDGET_WEBHOOK_SECRET` for `gcpBudgetAlertWebhook`.

`RAZORPAY_WEBHOOK_SECRET` is still required in local and Vercel Preview env for
the Next.js Razorpay webhook route, but it is not a Firebase Functions Secret
Manager secret in the current MenuList Functions code.

Run these commands and enter the real QA value when the Firebase CLI prompts
for it:

```bash
firebase functions:secrets:set GEMINI_AI_KEY --project menulist-qa
firebase functions:secrets:set GEMINI_AI_KEY_2 --project menulist-qa
firebase functions:secrets:set GEMINI_AI_KEY_3 --project menulist-qa
firebase functions:secrets:set MENULIST_GEMINI_TEXT_AI_KEY --project menulist-qa
firebase functions:secrets:set UPSTASH_REDIS_REST_URL --project menulist-qa
firebase functions:secrets:set UPSTASH_REDIS_REST_TOKEN --project menulist-qa
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID --project menulist-qa
firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN --project menulist-qa
firebase functions:secrets:set WHATSAPP_APP_SECRET --project menulist-qa
firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN --project menulist-qa
firebase functions:secrets:set RAZORPAY_KEY_ID --project menulist-qa
firebase functions:secrets:set RAZORPAY_KEY_SECRET --project menulist-qa
firebase functions:secrets:set SENTRY_DSN --project menulist-qa
firebase functions:secrets:set REVALIDATION_SECRET --project menulist-qa
```

If you later deploy `gcpBudgetAlertWebhook`, also set:

```bash
firebase functions:secrets:set GCP_BUDGET_WEBHOOK_SECRET --project menulist-qa
```

If SMTP or Telegram is enabled and a selected Function binds those groups, set
only the corresponding real QA values:

```bash
firebase functions:secrets:set SMTP_HOST --project menulist-qa
firebase functions:secrets:set SMTP_PORT --project menulist-qa
firebase functions:secrets:set SMTP_USER --project menulist-qa
firebase functions:secrets:set SMTP_PASS --project menulist-qa
firebase functions:secrets:set TELEGRAM_BOT_TOKEN --project menulist-qa
firebase functions:secrets:set TELEGRAM_CHAT_ID --project menulist-qa
```

If a selected Firebase deploy target reports a missing SMTP, Telegram, or
budget-alert secret, stop and set only the missing declared QA secret in
`menulist-qa`. Do not switch to production and do not add fake placeholder
values.

Check secret names without printing values:

```bash
gcloud secrets list --project menulist-qa --format='value(name)'
```

Never run a command that prints secret values, such as `functions:secrets:access`,
while sharing terminal output in chat or screenshots.

Expected result:

- Secret metadata exists in `menulist-qa`.
- Secret values are never printed in terminal output, docs, or chat.

### Step 8: Deploy Firebase QA Infrastructure

Where:

- Local terminal.
- Firebase Console: https://console.firebase.google.com/project/menulist-qa
- Firebase rules deployment guide:
  https://firebase.google.com/docs/rules/manage-deploy
- Firebase rules emulator testing guide:
  https://firebase.google.com/docs/rules/unit-tests
- [External Certification Runbook Gate 2A](../production-readiness/external-certification-runbook.md#gate-2a-firebase-storage-rules-deployment)

#### 8.1 Load The Pinned Runtime

```bash
nvm use
node --version
npm --version
firebase --version
```

Expected:

- Node prints `v22.23.1`, matching `.nvmrc`.
- Firebase CLI prints a version instead of a missing-command error.

Stop if Node does not match `.nvmrc`. Do not accept rule evidence from a
different runtime when the maintained suite is pinned to Node 22.23.1.

#### 8.2 Confirm Login And Exact Project Access

```bash
firebase projects:list
```

If authentication has expired, run `firebase login` interactively, then repeat
the project list. Confirm the active login is the intended company-controlled
owner/operator and the output includes exact project id `menulist-qa`.

Stop if the project is missing or the command reports IAM, Cloud Resource
Manager, billing, or authentication errors. Do not substitute another project,
create a similarly named project, or continue against `menulist`.

#### 8.3 Run The Complete Local Root-Rules Gate

Optional inventory only:

```bash
npm run verify:menulist-firebase-rules-predeploy -- --list
```

Required local gate:

```bash
npm run verify:menulist-firebase-rules-predeploy
```

The maintained runner discovers every direct Firestore/Storage emulator rule
script that executes against the root `firebase.json`, requires a `demo-*`
project boundary, runs the scripts sequentially, and stops at the first
failure. The discovered count may increase as coverage is added; record the
count printed by the current run instead of copying an old fixed count.

Expected:

- Every discovered emulator rule script passes.
- The runner confirms `firebase.json` still points to `firestore.rules`,
  `firestore.indexes.json`, and `storage.rules`.
- No real Firebase project is read, written, or deployed by this local gate.

Stop on any failure. Fix the repository rule/test mismatch and rerun the entire
gate before deploying.

#### 8.4 Deploy The Fresh MenuList QA Rules Baseline

Required fresh-project command:

```bash
firebase deploy --project menulist-qa --config firebase.json --only firestore:rules,firestore:indexes,storage --non-interactive
```

The narrower command below is valid only for a reviewed Firestore-rule-only
change after the QA baseline already exists:

```bash
firebase deploy --project menulist-qa --config firebase.json --only firestore:rules --non-interactive
```

Do **not** replace the fresh-project command with that narrower command. A new
`menulist-qa` project also needs the repository's composite indexes and Storage
rules.

Expected:

- The CLI reports successful release of Firestore rules, Firestore indexes, and
  Storage rules to exact project `menulist-qa`.
- The command never targets `menulist`.

Stop on any IAM, billing, API enablement, project-not-found, rules compilation,
index, or Storage error. Do not edit rules in Firebase Console to make a deploy
pass; repository files deployed by CLI are the source of truth, and later CLI
deploys overwrite Console-only rule changes.

#### 8.5 Read Back The Deployed State

1. Open Firebase Console -> project `menulist-qa` -> Firestore Database ->
   Rules. Confirm the published timestamp is after this deploy and compare the
   displayed source with `firestore.rules`.
2. Open Firebase Console -> project `menulist-qa` -> Storage -> Rules. Confirm
   the published timestamp is after this deploy and compare the displayed
   source with `storage.rules`.
3. List deployed indexes:

```bash
firebase firestore:indexes --project menulist-qa --database '(default)'
```

4. Open Firebase Console -> Firestore Database -> Indexes. Compare the deployed
   composite index definitions with `firestore.indexes.json` and wait until
   every required index is `READY`.

Rules releases can take several minutes to propagate. Wait after the successful
release before live testing. Do not continue while an index is `CREATING` or
`ERROR`, or when either displayed rules source/timestamp cannot be reconciled
with the repository deploy.

#### 8.6 Smoke The Deployed Rules With Real QA Identities

Prepare two synthetic Firebase Auth users and two synthetic QA businesses in
`menulist-qa`:

- `QA owner A` owns only `QA tenant/store A`.
- `QA owner B` owns only `QA tenant/store B`.

Record only their test labels, Firebase Auth UIDs, tenant ids, and store ids in
the evidence. Never record passwords, tokens, provider keys, or customer data.

For this pre-Vercel gate, run the app locally against the real cloud QA project:

1. Confirm local env uses `NEXT_PUBLIC_ENV=development`, Firebase project
   `menulist-qa`, and the local URLs from Step 6.
2. Set `NEXT_PUBLIC_USE_EMULATORS=false` and remove every emulator host value for
   this deliberate integration smoke.
3. Start the local app without running a production build:

```bash
npm run dev
```

4. Open `http://localhost:3000/signin`. Before any test write, confirm the
   browser/server diagnostics identify project `menulist-qa`, never `menulist`.

Run this matrix after propagation:

| Test | Method | Required result |
| --- | --- | --- |
| Owner A sign-in and own dashboard/store load | Sign in normally at `http://localhost:3000` | Allowed through real `menulist-qa` Firebase Auth and scoped to tenant/store A |
| Owner A harmless own-tenant save | Use one reversible owner-app edit | Allowed; change appears only in `menulist-qa` |
| Owner A own scoped upload | Upload one disposable QA asset through the app | Allowed only under the tenant-scoped Storage path |
| Anonymous owner-only Firestore access | Firebase Rules Playground or direct Web SDK with no auth | Denied |
| Owner A reads or writes tenant/store B | Rules Playground/direct Web SDK using owner A's QA UID and current claims | Denied |
| Browser access to `geminiSpendWindows/menulist` | Rules Playground/direct Web SDK as anonymous, owner, and platform-style test identities; check get/list/create/update/delete | Every operation denied; this collection is server-only |
| Legacy `MenuListAi/project/...` Storage read/write/delete | Direct Storage SDK using anonymous, same-tenant, cross-tenant, and platform-style test identities | Denied as specified by External Certification Gate 2A |
| Owner B normal own-tenant load | Sign in normally at localhost as owner B | Allowed and scoped only to tenant/store B |

Use the Firebase Rules Playground for negative operations the product UI does
not expose. Enter the real QA test UID and the same claims assigned to that test
account. Use the normal app for positive owner flows. Do not use Admin SDK,
Cloud Functions, service-account credentials, or Firebase Console document
edits as proof of Security Rules because privileged server access bypasses the
client rule layer.

Hard stop if any prohibited operation succeeds or any expected own-tenant
operation fails. Do not weaken rules in Console, deploy Functions, trigger a
Vercel deployment, or touch production until the mismatch is fixed, the full
local gate is rerun, rules are redeployed/read back, propagation completes, and
the entire live matrix passes.

After the matrix, stop the local dev server and restore the emulator-first local
override before routine destructive work. Phase K repeats positive auth and
tenant behavior on the hosted QA domains.

#### 8.7 Record Evidence

For `QA-I03` through `QA-I09`, record:

```text
Date/time (Asia/Kolkata):
Operator account:
Firebase project: menulist-qa
Git commit/worktree reference:
Node version:
Firebase CLI version:
Local rule scripts discovered/passed:
Deploy command and result:
Firestore rules published timestamp/readback result:
Storage rules published timestamp/readback result:
Index READY result:
QA owner A UID / tenant id / store id:
QA owner B UID / tenant id / store id:
Allow tests passed:
Deny tests passed:
Blockers:
```

Screenshots must omit tokens, passwords, secret values, personal customer data,
and full provider credentials.

#### 8.8 Validate And Deploy Functions Only After Rules Pass

Validate the local deploy boundary:

```bash
npm run verify:functions-deploy-preflight
npm --prefix functions run build
```

Deploy Functions only after required declared secrets exist:

```bash
npm --prefix functions run deploy:menulist-qa
```

Expected result:

- Rules/indexes/storage are locally verified, deployed to `menulist-qa`, read
  back, propagated, and live-smoked before Functions deployment.
- Function deploy targets only the maintained MenuList QA bundle:
  `processMenuImages`, `processMenuImagesJob`, `menulistMaintenanceScheduler`,
  `computeDecisionBlocksScores`, `triggerDecisionBlocksScoring`,
  `triggerStoreNightlyScheduler`, `messagingOnboarding`,
  `backfillStoresSummary`, `mapsPlaceCheck`, and `verifyMenuPublish`.
- No command targets `menulist`.

### Step 9: Deploy Vercel Preview/Staging

Where:

- Vercel dashboard: https://vercel.com/dashboard
- The fresh single Neelvara Vercel project for this repository.

What to do:

1. Confirm Preview env values are present and every MenuList QA value is
   restricted to exact Git branch `staging`.
2. Confirm each QA domain's Git Branch field is exactly `staging`.
3. Trigger a new deployment from the `staging` branch after the domain
   assignments exist.
4. Confirm apex, `www`, `app`, and wildcard `menulist.digital` domains are
   assigned to the staging deployment.
5. Do not trigger or promote Production from this guide.

Expected result:

- `https://menulist.digital` serves the QA website and
  `https://app.menulist.digital` serves the owner app.
- Logs show `menulist-qa` runtime values.

### Step 9.5: Connect Post-Deploy Provider Endpoints

#### Meta WhatsApp Test Webhook

Do not perform this section until Phase H has placed the four real WhatsApp QA
values in Firebase Secret Manager and Phase I has deployed the maintained
`messagingOnboarding` Function to exact project `menulist-qa`. Meta's challenge
cannot be verified against an absent Function, and the current handler returns
a generic disabled response while `ENABLE_MESSAGING_ONBOARDING=false`.

1. During a controlled QA smoke window only, set the `menulist-qa` Functions
   runtime to `ENABLE_MESSAGING_ONBOARDING=true`, keep
   `MESSAGING_ONBOARDING_PROVIDERS=whatsapp`, validate the Functions target, and
   deploy the approved QA Function scope. Do not target project `menulist`.
2. Open Meta Developers -> `MenuList QA Messaging` -> WhatsApp ->
   Configuration and enter this exact callback URL:

```text
https://us-central1-menulist-qa.cloudfunctions.net/messagingOnboarding/whatsapp
```

3. Paste the independently vaulted `WHATSAPP_VERIFY_TOKEN` into Meta's Verify
   token field. Do not use the app secret or access token there.
4. Select **Verify and save**, then subscribe only to the `messages` webhook
   field. Leave unrelated account, template, payment, calling, and management
   fields unsubscribed.
5. Send one bounded Meta dashboard test event and confirm the QA Function logs
   show successful challenge/signature handling without logging payloads,
   tokens, or full phone numbers. Keep the test app/account isolated; do not add
   a production number, payment method, or production webhook.
6. After recording the bounded smoke evidence, restore
   `ENABLE_MESSAGING_ONBOARDING=false`, rebuild, redeploy only the approved QA
   Function scope, and read back the active revision. Leave the verified
   callback and sole `messages` subscription registered; the disabled flag is
   the runtime gate until a separately approved intake test window.

Record this as `QA-K22` only after the callback, subscription, and signed test
event are all verified and the QA runtime is restored to disabled. If current
Meta app-mode rules block the intended test event, record the exact non-secret
blocker and review the current official Meta requirement before changing
publish state.

#### Razorpay Test Webhook

1. Open https://dashboard.razorpay.com/ and confirm the dashboard still says
   **Test Mode**.
2. Add this exact webhook URL:

```text
https://app.menulist.digital/api/razorpay/webhook
```

3. Enter the distinct QA webhook signing secret created in Step 5.3. Do not use
   the Razorpay API key secret.
4. Subscribe only to events handled by the hosted route. After the August 13
   lifecycle hardening is deployed to Vercel staging, the QA webhook target is
   these 13 events: `order.paid`, `payment.failed`,
   `refund.processed`, `subscription.paused`, `subscription.resumed`,
   `subscription.authenticated`, `subscription.activated`,
   `subscription.pending`, `subscription.halted`, `subscription.charged`,
   `subscription.cancelled`, `subscription.completed`, and
   `subscription.updated`. Until that exact source is hosted, retain the
   previously certified 12-event selection without `subscription.authenticated`.
   Do not select `payment.refunded` unless the route adds an explicit handler
   for that event.
5. Use Razorpay's Test Mode webhook test or one bounded sandbox transaction.
   Confirm Vercel accepts the signed event, rejects an invalid signature, and
   writes only QA billing data. Do not perform a Live Mode transaction.

#### Optional Uptime Monitors

If `QA-F04` was marked enabled, create HTTPS monitors only now for:

- `https://menulist.digital`
- `https://app.menulist.digital/api/version`

Route alerts to a named company operator. Do not create wildcard-per-tenant
monitors during initial QA. If UptimeRobot was intentionally skipped, record
that result under `QA-K16`.

### Step 10: Smoke Test MenuList QA

Open:

- `https://menulist.digital`
- `https://www.menulist.digital`
- `https://app.menulist.digital/signin`
- `https://app.menulist.digital/dashboard`
- `https://app.menulist.digital/create-menu`
- `https://app.menulist.digital/api/version`
- `https://<test-slug>.menulist.digital`

For each host below, open `/robots.txt` and confirm it contains `Disallow: /`;
confirm `/sitemap.xml` returns `404`:

- `https://menulist.digital`
- `https://www.menulist.digital`
- `https://app.menulist.digital`
- `https://<test-slug>.menulist.digital`

Also confirm a normal HTML response from each host includes:

```text
X-Robots-Tag: noindex, nofollow, noarchive
```

Run this with the same test slug (no auth cookie is required for this negative
origin check):

```bash
curl -i \
  -H 'Origin: https://<test-slug>.menulist.digital' \
  https://app.menulist.digital/api/auth/access-status
```

Expected: the request is rejected before owner data access and the response
does not contain `Access-Control-Allow-Origin` for the tenant origin.

Verify that the batch worker rejects an invalid task secret before testing a
real batch. This command deliberately uses a false secret and must return
`403 Forbidden` without creating or changing a job:

```bash
curl -i -X POST \
  -H 'Content-Type: application/json' \
  -H 'project-id: menulist-qa' \
  -H 'x-menulist-task-secret: deliberately-wrong' \
  --data '{}' \
  https://app.menulist.digital/api/image-generation/batch-generation
```

Then use one QA store and one test item to start the normal batch-image flow
from the owner app. Confirm one task appears in the `batch-image-generation`
queue, reaches the QA worker URL, and writes only to `menulist-qa`. Stop after
one controlled item; do not use production data or production keys.

Check:

- Email/password and Google OAuth sign-in both work with synthetic QA users.
- `https://menulist.digital/create-menu` redirects to the app-host onboarding route.
- Every QA website, app, and customer host is `noindex`, disallows crawling,
  and publishes no sitemap.
- A QA customer origin such as `https://<test-slug>.menulist.digital` is not
  admitted by CORS to owner APIs on `app.menulist.digital`.
- Test store workflow works.
- Generated public link uses `https://<slug>.menulist.digital`.
- Firestore writes appear only in `menulist-qa`.
- Storage writes appear only in the `menulist-qa` bucket.
- The Cloud Tasks invalid-secret check returns `403`, and one normal QA batch
  task completes through `app.menulist.digital`.
- The Razorpay Test webhook accepts one correctly signed test/sandbox event and
  rejects an invalid signature; no Live Mode operation occurs.
- One controlled Sentry event reaches only the `menulist-qa` project, and every
  optional monitor/analytics decision is recorded.
- Production project `menulist-prod` remains unchanged by QA certification.

## Final QA Completion Gate

MenuList QA is complete only when:

- `menulist.digital`, `www.menulist.digital`, and `app.menulist.digital` are live
  on Preview/Staging.
- QA tenant wildcard links work.
- All `menulist.digital` QA hosts pass the noindex, disallow-all robots, and
  no-sitemap checks.
- Vercel QA variables are restricted to exact Git branch `staging`.
- The complete root-rules emulator gate passes; Firestore rules, indexes, and
  Storage rules are deployed/read back; indexes are `READY`; and the real-auth
  allow/deny matrix passes against `menulist-qa`.
- Auth, Firestore, Storage, and required provider keys work against `menulist-qa`.
- The Razorpay Test webhook and isolated QA Sentry event pass without production
  provider usage.
- The `batch-image-generation` QA queue and worker-secret boundary pass their
  controlled smoke test.
- No production Firebase, Vercel Production, `menulist.ai`, `app.menulist.ai`, or
  `menulist.online` setup was touched.
- You report the completed checklist ids back to Codex.

## Maintenance Record Created During QA Setup

This setup is durable, but credentials and ownership still require review.
Before marking QA complete, record the responsible person and next due date for:

| Frequency | Review |
| --- | --- |
| Monthly | Google Cloud/Gemini spend, failed uptime checks, and unresolved Sentry alerts |
| Quarterly | Workspace, Google Cloud, Firebase, Vercel, GitHub, registrar, and provider IAM; unused API/service-account keys; secret rotation need |
| Annually | Domain auto-renew/payment backup, recovery codes, account owners, DNS export, and a documented Firebase backup/restore check before production launch |

Revoke a credential immediately after a leak, staff/access change, or provider
warning; do not wait for the scheduled review.

Production provider preparation is tracked separately in
[MenuList Production Provider Setup](./menulist-production-provider-setup.md).
Its inactive preparation phases may run in parallel with feature certification;
its deploy, DNS, live-provider, production-data, and launch phases remain gated.
