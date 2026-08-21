# Answerlattice QA And Production Environment Setup Checklist

> **Last updated:** August 21, 2026
> **Status:** live setup ledger
> **Order:** QA first, production second
> **Launch boundary:** completing setup does not certify a release or authorize a Vercel deployment

Use this file as the single owner/operator checklist for Answerlattice cloud
setup. Report exact item IDs such as `AL-QA-A01 done`; record evidence beside
the item before moving forward.

## Fixed Architecture

| Concern | QA | Production |
| --- | --- | --- |
| Firebase project | `neelvara-answerlattice-qa` | `neelvara-answerlattice-prod` |
| Firebase alias | `answerlattice-qa` | `answerlattice-prod` |
| Website | `canonica.app`, `www.canonica.app` | `answerlattice.com`, `www.answerlattice.com` |
| Vercel environment | custom `qa`, branch `staging` | Production |
| Admin authentication | Vercel OIDC through project-owned WIF | Vercel OIDC through project-owned WIF |
| Runtime service account | `answerlattice-vercel-qa@neelvara-answerlattice-qa.iam.gserviceaccount.com` | `answerlattice-vercel-prod@neelvara-answerlattice-prod.iam.gserviceaccount.com` |
| WIF pool | project-local `answerlattice-vercel` | project-local `answerlattice-vercel` |
| WIF provider ID | `answerlattice-qa` | `answerlattice-prod` |
| Firebase config | `firebase-answerlattice.json` | `firebase-answerlattice.json` |
| Rules/indexes/Storage | dedicated Answerlattice files | same approved files, deployed independently |
| Functions | `functions-answerlattice/`, codebase `answerlattice` | same approved source revision, deployed independently |

Firebase Functions use Google-managed runtime credentials. The Vercel OIDC/WIF
flow is for the shared Next.js runtime and must not replace Functions ADC.

## Status Legend

- `[x]` verified now from source or live readback.
- `[ ]` pending or not currently readable.
- Historical evidence is named explicitly and never converted to `[x]`
  without current readback.

## Current Baseline

- [x] `AL-BASE-01` Source target matrix uses `neelvara-answerlattice-qa` and
  `neelvara-answerlattice-prod`.
- [x] `AL-BASE-02` `.firebaserc` maps production alias
  `answerlattice-prod` to project `neelvara-answerlattice-prod`.
- [x] `AL-BASE-03` Dedicated Firebase config, rules, indexes, Storage rules,
  and Functions source exist.
- [x] `AL-BASE-04` Staging and production env examples contain separate
  full-name `ANSWERLATTICE_*` key families and OIDC selectors.
- [x] `AL-BASE-05` WIF regression coverage defines a different service
  account and provider for each Answerlattice project.
- [x] `AL-BASE-06` Production apex and `www` return HTTP 200 from Vercel.
- [x] `AL-BASE-07` Fresh QA ownership. On August 20, 2026,
  `admin@neelvara.com` created Google Cloud project
  `neelvara-answerlattice-qa` (project number `216985843437`) under
  organization `neelvara.com` and read it back in Google Cloud Console.
- [x] `AL-BASE-08` QA domain ownership and routing preparation. `canonica.app`
  is in the company GoDaddy account; the apex and `www` hosts are attached only
  to Vercel custom environment `qa`. The parked web records are being replaced
  with Vercel's exact records; mail and verification DNS remain untouched.
- [x] `AL-BASE-09` Repository QA host contract uses `canonica.app` and
  `www.canonica.app`, with noindex, disallow-all robots, and no sitemap.
- [x] `AL-BASE-10` The former IDs `answerlattice-qa` and `answerlattice` are
  unowned/unreadable from the company account and permanently retired from
  source, credentials, IAM, provider setup, and deploy commands.

## Stop Conditions

Stop before any mutation when one of these is true:

- Before any Firebase-scoped deploy, the exact project is absent from
  `firebase projects:list` for the setup account.
- A console or CLI command resolves production alias `answerlattice-prod` to
  anything other than project `neelvara-answerlattice-prod`.
- The chosen Firestore location conflicts with an existing database. Firestore
  location is immutable; read it before creating or documenting parity.
- A secret, webhook, database, API key, service account, WIF pool/provider, or
  budget belongs to MenuList or another product.
- Vercel selectors would expose QA values to Production, Production values to
  QA, or either Answerlattice family to unrelated Preview deployments.
- A combined Firebase deploy proposes deleting remote indexes. Do not use
  `--force`; audit remote/local index parity first.

## Answerlattice QA

### Access And Ownership

- [x] `AL-QA-A01` Create company-owned Google Cloud project
  `neelvara-answerlattice-qa` under `neelvara.com` and verify direct access for
  `admin@neelvara.com`. Project number: `216985843437`.
- [x] `AL-QA-A02` Record project number, organization, billing account,
  Firebase status, and active owner/break-glass identities.
  - Current readback on August 21, 2026: project number `216985843437`,
    organization `neelvara.com`, billing account
    `0135AA-B5D4AD-C72CAB`, Firebase enabled, and
    `admin@neelvara.com` is the only visible principal with inherited
    Organisation Administrator plus direct Owner and is the only permitted
    human operator for every product. On August 21, 2026, Cloud Identity Free
    was activated with 50 no-charge identities available, but the owner
    explicitly prohibited creating another user. Google Workspace Business
    Base remains at one assigned license. No named daily operator,
    product-specific user, or second paid account exists.
- [x] `AL-QA-A03` Confirm billing alerts and hard provider spend controls are
  routed to the company operational mailbox.
  - A project-scoped INR 25 monthly Google Cloud budget alert exists with 50%,
    90%, and 100% thresholds. A separate enforced INR 20 monthly spend cap now
    applies only to Gemini API in `neelvara-answerlattice-qa`, with 50%, 80%,
    and 100% notifications to billing administrators/users and project owners
    at the company-managed account. The Vercel `qa` environment also retains
    the repository admission guard
    `ANSWERLATTICE_GEMINI_SPEND_LIMIT_USD_10M=8`. The cap can pause Gemini API
    usage and is intentionally independent from the general project alert.
- [x] `AL-QA-A04` Confirm service-account key creation policy and verify zero
  user-managed keys on the Vercel runtime service account.
  - Current readback on August 20, 2026: inherited constraint
    `iam.managed.disableServiceAccountKeyCreation` is Enforced and dedicated
    runtime identity `answerlattice-vercel-qa@neelvara-answerlattice-qa.iam.gserviceaccount.com`
    has zero user-managed keys.

### Firebase Foundation

- [x] `AL-QA-B01` Firestore `(default)` is Native/Standard in immutable
  multi-region `nam5`, with point-in-time recovery and delete protection
  enabled.
- [x] `AL-QA-B02` Verify Firebase Auth, Web app, Storage bucket, App Check,
  Functions, Eventarc, Cloud Tasks, Scheduler, Artifact Registry, Secret
  Manager, Pub/Sub, and Cloud Run state.
  - Current readback: active Firebase Web app `Answerlattice QA Web`, US
    multi-region Storage, dedicated App Check registration, 11 active approved
    Functions, one hourly Scheduler job, one running embedding task queue, and
    the required Google-managed supporting services. Optional provider-send
    Functions are not deployed.
- [x] `AL-QA-B03` Record the exact Firebase Web configuration in the custom
  Vercel `qa` environment using the `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_*`
  keys from `.env.staging.example`.
- [x] `AL-QA-B04` Keep `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE=separate` and
  reject partial Answerlattice configuration.
- [x] `AL-QA-B05` Verify authorized Auth domains and App Check registration for
  `canonica.app` and `www.canonica.app` before enforcement.
  - Auth permits the exact QA hosts. App Check uses a dedicated legacy
    score-based reCAPTCHA v3 key for `canonica.app`, TTL 24 hours, threshold
    0.5. Enforcement remains intentionally OFF for monitoring-first rollout.
    No live reCAPTCHA Enterprise key is retained. Google Cloud's key inventory
    contains only the legacy `Website - score` key for `canonica.app`. Firebase
    still retains the historical Enterprise provider configuration because the
    App Check API has no delete method and rejects an empty `siteKey`; its
    referenced Enterprise key has been deleted, so it cannot exchange tokens.
    The application initializes only `ReCaptchaV3Provider`.

### Keyless Vercel Runtime

- [x] `AL-QA-C01` Create or verify
  `answerlattice-vercel-qa@neelvara-answerlattice-qa.iam.gserviceaccount.com`.
- [x] `AL-QA-C02` Create or verify project-local WIF pool
  `answerlattice-vercel` and provider `answerlattice-qa` with the exact Vercel
  team/project/environment condition.
- [x] `AL-QA-C03` Grant only the repository-documented runtime roles and WIF
  impersonation binding; do not grant Owner/Editor to the runtime identity.
- [x] `AL-QA-C04` Set the QA-only OIDC selectors from `.env.staging.example`;
  remove static service-account JSON variables and files.
- [x] `AL-QA-C05` Run `npm run test:vercel-workload-identity` and
  `npm run verify:env-targets`.
- [ ] `AL-QA-C06` Produce one authorized hosted proof for OIDC/STS, Firebase
  custom-token signing, Firestore, Storage, and any admitted task path without
  creating real customer data.
  - Project-local WIF, least-privilege IAM, managed-environment selectors, and
    hosted deployment identity are configured and source-verified. The final
    custom-token/data-path proof needs an authorized disposable credential
    fixture, so it remains deferred testing rather than missing provider setup.

### Secrets And Providers

- [x] `AL-QA-D01` Inventory current Vercel QA values and Firebase Secret
  Manager names. Record names/status only, never secret values. The custom
  `qa` environment now contains the dedicated Answerlattice Firebase/OIDC/public
  selectors; Secret Manager contains only the admitted core secret names.
- [x] `AL-QA-D02` Create distinct QA values for the required core secret group:
  `ANSWERLATTICE_CRON_SECRET`, `ANSWERLATTICE_GEMINI_AI_KEY`, and
  `ANSWERLATTICE_PUBLIC_BUNDLE_SALT`.
  - Current readback on August 21, 2026: the dedicated Google AI Studio
    authorization key `Answerlattice QA Gemini Authorization` is bound to its
    project-local AI Studio service account, restricted to
    `generativelanguage.googleapis.com`, and is not reused by MenuList. Vercel's
    custom `qa` environment contains the sensitive
    `ANSWERLATTICE_GEMINI_AI_KEY` value. Firebase Secret Manager has enabled
    version 3 of `ANSWERLATTICE_GEMINI_AI_KEY`; versions 1 and 2 are destroyed.
    All eight deployed AI entry points that declare the key are ACTIVE and bind
    version 3. The superseded standard Google API key is deleted. The public
    Firebase Web API key remains a separate browser identifier and is never the
    Gemini runtime credential.
- [x] `AL-QA-D03` Do not create a paid QA Upstash database. The admitted Redis
  integrations are optional fast paths; when the dedicated variables are
  absent they degrade to Firestore/live retrieval. Durable truth remains in
  Firestore. Reopen this item only after measured load justifies Redis.
- [x] `AL-QA-D04` Keep SMTP, GitHub, WhatsApp, MCP, paid Redis, and optional
  analytics absent while their owning feature gates remain disabled. Blank
  values are intentional; do not create placeholder credentials. EmailOS is
  tracked separately because its provider preparation is an approved setup
  requirement even while outbound sending remains disabled.
- [x] `AL-QA-D05` Verify no MenuList API key, webhook secret, Redis token, or
  Firebase secret is reused.
  - Google OAuth is not an exception to isolation. Host-routed OAuth source is
    prepared and uses a dedicated `ANSWERLATTICE_GOOGLE_CLIENT_*` pair without
    changing the MenuList client.
- [ ] `AL-QA-D06` Migrate the explicitly API-restricted standard Gemini API key
  to a Google AI Studio authorization key before Google's September 2026
  standard-key rejection. Rotate the value in Vercel `qa` and Firebase Secret
  Manager, redeploy only the eight Functions that bind
  `ANSWERLATTICE_GEMINI_AI_KEY`, verify an authorized provider call from the
  exact enabled secret version, redeploy the Vercel custom `qa` environment,
  and then destroy the superseded Google Cloud key and Secret Manager version.
  Hosted product-workflow certification remains in `AL-QA-E06`. Follow Google's
  [Gemini API key guidance](https://ai.google.dev/gemini-api/docs/api-key) and
  never place the authorization key in browser configuration.
  - Credential creation is owner-operated. Codex prepares the exact project,
    name, and scope and guides the owner through final creation; after explicit
    confirmation, Codex verifies metadata and performs the secret transfer,
    scoped redeploys, readback, and retirement without displaying secret values.
  - The AI Studio key, Vercel `qa` value, Secret Manager version 3, eight
    Firebase Function bindings, direct provider call, and old-key retirement
    are complete. Current QA deployment
    `menulist-core-1f590am4b-neelvara-systems.vercel.app` serves exact staging
    revision `a6afeafd25ee05235c06ce2199fa15e9f3945177` on both Canonica hosts, and
    `/api/version` confirms that build. Because shared
    Next.js Answerlattice API routes read `ANSWERLATTICE_GEMINI_AI_KEY`, this
    item stays open only until one authenticated bounded server-side Gemini
    call is read back using a disposable QA workspace fixture.
- [ ] `AL-QA-D07` Complete Google OAuth parity for Canonica without reusing the
  MenuList client. In Google Auth Platform for `neelvara-answerlattice-qa`, use
  truthful branding `Answerlattice QA`, support email
  `support@neelvara.com`, developer contact `admin@neelvara.com`, External
  audience in Testing, and only `admin@neelvara.com` as a test user. Use the
  home page `https://canonica.app`, privacy policy
  `https://canonica.app/privacy-policy`, terms
  `https://canonica.app/terms-of-service`, authorized domain `canonica.app`,
  and only the standard `openid`, `email`, and `profile` identity scopes. As
  `admin@neelvara.com`, create the dedicated Answerlattice QA Web OAuth client
  using only:
  - JavaScript origins: `https://canonica.app` and `https://www.canonica.app`
  - Redirect URIs: `https://canonica.app/api/auth/callback/google` and
    `https://www.canonica.app/api/auth/callback/google`
  - Vercel `qa`: `ANSWERLATTICE_GOOGLE_CLIENT_ID` and sensitive
    `ANSWERLATTICE_GOOGLE_CLIENT_SECRET`
  - Remove hosted `NEXTAUTH_URL`; do not change `NEXTAUTH_SECRET` or the
    MenuList `GOOGLE_CLIENT_*` pair.
  - Deploy the exact approved staging revision, complete one bounded Google
    login/callback, verify the host-only session and Answerlattice Firebase
    custom-token synchronization, then record non-secret client metadata.
  - Live provider setup on August 21, 2026 under `admin@neelvara.com`:
    Google Auth Platform is initialized with app name `Answerlattice QA`,
    support email `support@neelvara.com`, developer contact
    `admin@neelvara.com`, External audience in Testing, and only
    `admin@neelvara.com` as a test user. The saved branding uses Canonica home,
    privacy, and terms URLs plus authorized domain `canonica.app`.
  - Data Access matches MenuList QA: neither project registers additional
    sensitive or restricted scopes in Google Auth Platform. The shared
    NextAuth `google` provider requests only `openid`, `email`, and `profile`
    at sign-in.
  - The owner created the dedicated Web client `Answerlattice QA Web`. The
    initially created secret was rotated before use after it surfaced in an
    automation accessibility label; that secret was disabled and deleted.
    Exactly one replacement secret remains enabled.
  - Vercel custom environment `qa` now contains sensitive
    `ANSWERLATTICE_GOOGLE_CLIENT_ID` and
    `ANSWERLATTICE_GOOGLE_CLIENT_SECRET` values. Hosted `NEXTAUTH_URL` was
    removed without changing `NEXTAUTH_SECRET` or the MenuList
    `GOOGLE_CLIENT_*` pair. No secret value was written to the repository or
    documentation, and temporary automation buffers were cleared.
  - Custom QA deployment
    `menulist-core-2ix2pt0p5-neelvara-systems.vercel.app` served exact staging
    revision `1589272a29e1f342ae7d4b93985da91f66922152` on both Canonica hosts.
    Hosted provider readback derives the exact apex and `www` callbacks and
    requests only `openid email profile`. A bounded Google consent/callback as
    `admin@neelvara.com` returned to `canonica.app` authenticated. The session
    remained host-only: the apex retained the signed-in state while `www`
    remained signed out. Answerlattice Firebase custom-token synchronization
    still requires an authorized disposable workspace fixture. Keep this item
    unchecked until that final proof is recorded.
- [ ] `AL-QA-D08` Complete the product-isolated Answerlattice QA Resend/EmailOS
  boundary inside the existing MFA-protected `MenuList` Resend team. Do not
  create another paid team or human account.
  - The approved shared-team architecture accepts Resend's team-wide provider
    suppression, reputation and quotas at the current operating scale. It does
    not share domains, API keys, webhook registrations/signing secrets,
    Firebase secrets, delivery collections or local suppression state.
  - Team-scoped webhooks can deliver both products' signed events to both
    endpoints. Source therefore attaches `email_os_product` and
    `email_os_delivery_id`; each webhook requires a matching product-local
    delivery before any receipt, status or suppression write. A wrong-product
    or unbound signed event returns `200 ignored` with zero product writes.
  - Required provider state: verified sender domain `answerlattice.com`,
    isolated return-path `send.answerlattice.com`, owner-created QA sending key
    restricted to `answerlattice.com`, and a QA webhook subscribed only to the
    nine code-admitted delivery and suppression events.
  - Required secret boundary: Vercel custom `qa` receives only the QA sending
    key and non-secret From configuration. Project
    `neelvara-answerlattice-qa` receives separate enabled
    `ANSWERLATTICE_RESEND_API_KEY` and
    `ANSWERLATTICE_RESEND_WEBHOOK_SECRET` versions. The webhook signing secret
    must never enter Vercel or source.
  - Required runtime state: deploy only `answerlatticeEmailOsWebhook`; its
    signing secret is an unconditional Function binding and does not depend on
    the optional outbound-provider secret switch. Keep
    `ENABLE_ANSWERLATTICE_EMAIL_OS_PROVIDER_SEND=false` until later controlled
    delivery certification. Its Cloud Run transport invoker is public so
    Resend can reach it, while the handler remains fail-closed on the raw-body
    Resend signature and product-local delivery binding before any write.
  - Current partial evidence on August 21, 2026: the verified sender domain,
    isolated return-path DNS, QA webhook registration, enabled webhook-signing
    secret version 1, non-secret Vercel sender values, and scoped webhook
    deployment are complete. Active revision
    `answerlatticeemailoswebhook-00006-zer` binds only the signing secret.
    Cloud Run retains `run.googleapis.com/invoker-iam-disabled=true` under the
    organization Domain Restricted Sharing policy, and an unsigned POST
    reached the handler and returned HTTP 400 `Invalid webhook`. The separate
    owner-created sending key is now stored as a sensitive variable only in
    Vercel custom `qa` and as enabled Secret Manager version 1 in
    `neelvara-answerlattice-qa`. It was transferred through standard input
    without display or repository persistence. Approved deployment
    `dpl_BdKiiGMKCR5hsdpLywDTTn1PqBLf` reached READY in custom environment `qa`
    from exact certified commit
    `a6afeafd25ee05235c06ce2199fa15e9f3945177`, activating the current QA-only
    value on both Canonica aliases. No controlled email has been sent, and
    provider sending remains disabled. Keep this item unchecked until
    controlled delivery certification is complete.
- [x] `AL-QA-D09` Create one unique server-only
  `ANSWERLATTICE_WIDGET_RUNTIME_SECRET` of at least 32 random bytes in Vercel
  custom environment `qa`. A fresh 32-byte Base64URL value is stored as a
  sensitive QA-only Vercel variable. It was transferred without display or
  repository persistence. This is a host-to-iframe token-signing key, not the
  workspace-issued public `al_*` widget credential and not a Firebase Functions
  secret. Hosted activation is complete:
  deployment `dpl_91Uj4beXQWDCppJQK88VqvT56ZHQ` reached READY in custom
  environment `qa` from exact staging commit
  `a6afeafd25ee05235c06ce2199fa15e9f3945177`, and both Canonica hosts return
  that build from `/api/version`.
- [x] `AL-QA-D10` Verify the Answerlattice monitoring boundary without creating
  unused provider state. Live Sentry readback shows the maintained MenuList QA
  and production projects, while the shared Vercel QA process has its one
  environment-scoped `NEXT_PUBLIC_SENTRY_DSN` and tags events by product.
  Source readback confirms `functions-answerlattice/` has no Sentry dependency,
  initialization, or `SENTRY_DSN` declaration and uses Google Cloud Logging.
  No Answerlattice Functions Sentry secret or additional Sentry project is
  required. The project-local `SENTRY_DSN` rule applies only to MenuList
  Functions, whose source declares that integration.

### Scoped Deploy And Setup Closure

- [x] `AL-QA-E01` Run source gates on the exact revision:
  `npm run typecheck:answerlattice`,
  `npm --prefix functions-answerlattice run build`,
  `npm run test:vercel-workload-identity`, and
  `npm run verify:env-targets`.
  - Current evidence on August 20, 2026: the full
    `npm run verify:answerlattice-runtime-truth` aggregate passed, including
    dedicated/shared Firestore rule parity, Storage rules, billing, public API,
    widget, scheduler, governance, tenant-isolation, and runtime contracts.
    Answerlattice TypeScript, the Functions build, `git diff --check`, and the
    documentation link scan also passed with zero broken links. The link scan
    reported only pre-existing video-document naming warnings outside this
    setup scope.
- [x] `AL-QA-E02` Audit remote indexes before deploying. Resolve the historical
  `kb_articles` conflict without `--force` or remote index deletion.
- [x] `AL-QA-E03` Deploy the dedicated rules, Storage rules, approved indexes,
  and approved Functions targets to `neelvara-answerlattice-qa` using
  `firebase-answerlattice.json`.
- [x] `AL-QA-E04` Read back active rules, Storage rules, index states,
  Functions, scheduler/task resources, secret bindings, and service-account
  identities from `neelvara-answerlattice-qa`.
- [x] `AL-QA-E05` After the prepared routing revision is deployed to QA,
  attach `canonica.app` and `www.canonica.app` only to the custom Vercel `qa`
  environment and exact `staging` branch, then replace only the parked GoDaddy
  web records with Vercel's exact records. Preserve mail and verification DNS.
  - Domain attachment and DNS replacement are complete. GoDaddy now serves apex
    A `216.150.1.1` and `www` CNAME
    `dd4b150d15c50a85.vercel-dns-017.com.`; public DNS and Vercel both report
    valid QA configuration. Mail and verification records were preserved.
    Exact staging commit `05779ae3fefe58fe07352067ad5adcbd1693ac24`
    was verified live on both hosts. Later ledger-only commits do not change the
    application runtime. Hosted readback returned HTTP 200 with valid TLS,
    `x-product-id: answerlattice`, and
    `x-robots-tag: noindex, nofollow, noarchive`; Canonica remains inside QA and
    no longer redirects to production.
- [x] `AL-QA-E06` Verify TLS, `/api/version`, noindex/robots policy, Auth
  configuration, App Check registration, and the deployed widget/dashboard/
  ticket/KB/scheduler setup surfaces. Product workflow testing remains separate
  from setup closure.
  - Base hosted proof is complete: `/api/version` returned exact commit
    `05779ae3fefe58fe07352067ad5adcbd1693ac24`, both Canonica hosts returned
    HTTP 200 with the Answerlattice product header and QA crawler isolation,
    `robots.txt` disallows all crawling, `sitemap.xml` returns 404, and the
    production Answerlattice host remains HTTP 200 and indexable. Hydrated
    browser readback confirmed AnswerLattice branding and the approved governed
    source tagline. Product-routed Google OAuth now passes provider
    configuration, consent, callback, authenticated NextAuth session, and
    host-only cookie proof. Answerlattice Firebase custom-token proof remains
    open in `AL-QA-D07`.
    Fixture-dependent App Check, widget, dashboard, ticket, KB, scheduler, and
    authenticated identity-path certification remains deferred testing and is
    not inferred from the base-host proof.
- [ ] `AL-QA-E07` Complete a non-destructive backup/restore drill using
  `answerlattice-backup-recovery-runbook.md`.
  - A daily 14-week managed-backup schedule is active. The first backup reached
    `READY`, and its isolated restore into delete-protected database
    `answerlattice-recovery-20260821` completed on August 21, 2026. The structural
    rehearsal preserved all 100 composite indexes. As expected, the 18 source
    TTL policies were not restored. Keep this item open for fixture content and
    tenant-lineage validation, TTL reapplication/readback, separate Storage/Auth
    recovery evidence, and explicitly approved cleanup.

QA provider and infrastructure setup closes when the checked core items plus
`AL-QA-D08` through `AL-QA-D10` have current evidence and the Vercel QA
redeployment recorded by `AL-QA-D09` is active. The remaining hosted
data-path portion of `AL-QA-C06`, authenticated application-call portion of
`AL-QA-D06`, Firebase custom-token portion of `AL-QA-D07`, and
fixture-dependent paths named under `AL-QA-E06` are testing-only evidence, not
missing setup. `AL-QA-E07` is a post-setup recovery certification whose
structural cloud restore is complete; its remaining fixture, TTL, Storage, Auth,
and cleanup checks are not missing provider setup. Historical May/June deploy
records do not waive current setup readbacks.

## Answerlattice Production

Start this section only after QA setup closes. Production preparation may be
performed without traffic activation, but production deploy and provider-send
activation require an explicit scoped approval.

### Access And Ownership

- [x] `AL-PROD-A01` Grant `admin@neelvara.com` explicit access to project
  `neelvara-answerlattice-prod` and verify it appears in
  `firebase projects:list`.
- [x] `AL-PROD-A02` Record project number, organization, billing, budgets,
  operational contacts, and break-glass access independently from QA.
  - Current readback on August 21, 2026: project number `48335396774`,
    organization `neelvara.com`, billing account `0135AA-B5D4AD-C72CAB`, and
    direct Owner `admin@neelvara.com`. The same owner-approved single human
    account operates all products; project IAM, budgets, service accounts, and
    secrets remain independent. The project-scoped general alert is INR 25 at
    50%, 90%, and 100%. The Gemini API hard cap is INR 20 at 50%, 80%, and
    100% and is scoped only to `generativelanguage.googleapis.com` in this
    project.
- [x] `AL-PROD-A03` Verify the production runtime service account has zero
  user-managed keys and no broad Owner/Editor role.
  - Current readback: zero user-managed keys. Project roles are only
    `roles/datastore.user` and `roles/firebaseauth.admin`; bucket access is
    scoped independently. The service account can mint its own tokens and only
    the exact Production Vercel OIDC subject can impersonate it.

### Firebase Foundation

- [ ] `AL-PROD-B01` Verify or create the Firebase Web app, Auth, Firestore,
  Storage, App Check, Functions, Eventarc, Cloud Tasks, Scheduler, Artifact
  Registry, Secret Manager, Pub/Sub, and Cloud Run foundation.
  - Foundation readback is complete except the Gemini-dependent runtime
    activation. Firebase Web app `Answerlattice Production Web`, Email/Password
    Auth, Firestore, Storage, required APIs, App Engine `us-central`, Artifact
    Registry, Secret Manager, Eventarc, Pub/Sub, Cloud Tasks, Scheduler, Cloud
    Run, and Cloud Functions APIs exist. App Check has been initialized and its
    dedicated legacy score-based reCAPTCHA v3 provider is registered with
    enforcement OFF. No production Answerlattice Functions, queue, or scheduler
    are deployed yet.
- [x] `AL-PROD-B02` Confirm the immutable Firestore location before creation.
  Use the approved Answerlattice architecture; do not copy MenuList's regional
  decision automatically.
  - Firestore is Native/Standard in immutable multi-region `nam5`, with delete
    protection and point-in-time recovery enabled. One daily managed-backup
    schedule retains backups for `8467200s` (98 days). Backup
    `5bad4389-5ae1-42b8-bce3-1e1ec7720723` is `READY` with snapshot time
    `2026-08-21T13:41:43.122400Z` and is the source of the isolated recovery
    rehearsal recorded under `AL-PROD-E06`.
- [x] `AL-PROD-B03` Record production Firebase Web configuration only in
  Vercel Production using `.env.production.example`.
  - Vercel Production contains the complete public Firebase selector family,
    `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE=separate`, and the production OIDC
    selectors. Static Admin client-email/private-key variables are absent. The
    current live build predates these values, so activation still requires a
    separately authorized Production redeploy.
- [x] `AL-PROD-B04` Configure exact production Auth domains and App Check
  registration for `answerlattice.com` and `www.answerlattice.com`.
  - Auth is complete: only Email/Password is enabled and the exact apex and
    `www` hosts are authorized alongside Firebase defaults. A dedicated legacy
    score-based reCAPTCHA v3 key for `answerlattice.com` is registered on the
    production Web app with a 24-hour token TTL. Its public site key is bound
    only to Vercel Production as
    `NEXT_PUBLIC_ANSWERLATTICE_RECAPTCHA_SITE_KEY`; the existing custom-`qa`
    value remains isolated. App Check readback shows all listed APIs
    `Unenforced`, preserving the monitoring-first boundary.

### Keyless Vercel Runtime

- [x] `AL-PROD-C01` Create or verify
  `answerlattice-vercel-prod@neelvara-answerlattice-prod.iam.gserviceaccount.com`.
- [x] `AL-PROD-C02` Create or verify the project-local WIF pool
  `answerlattice-vercel` and provider `answerlattice-prod`, restricted to the
  shared Vercel project's Production environment.
- [x] `AL-PROD-C03` Apply least-privilege runtime and impersonation bindings.
- [x] `AL-PROD-C04` Set Production-only OIDC selectors and remove all static
  Answerlattice Admin key material.
  - Live provider readback is ACTIVE with issuer
    `https://oidc.vercel.com/neelvara-systems` and exact team, Vercel project,
    `production` environment, and immutable subject conditions. The source WIF
    and environment-target gates pass.
- [ ] `AL-PROD-C05` Produce an authenticated hosted production proof for
  OIDC/STS, custom-token signing, Firestore, Storage, and admitted task paths.
  - The identity and managed environment are ready. Hosted proof remains
    blocked until the production source is promoted and a Vercel Production
    deployment activates the newly added values.

### Secrets, Providers, And Spend

- [x] `AL-PROD-D01` Create fresh production core secrets; do not promote QA
  secret values.
  - Fresh `ANSWERLATTICE_CRON_SECRET` and
    `ANSWERLATTICE_PUBLIC_BUNDLE_SALT` exist independently in Vercel Production
    and Secret Manager. The owner-created production
    `ANSWERLATTICE_GEMINI_AI_KEY` is also present as a sensitive Vercel
    Production variable and enabled Secret Manager version 1. No QA or
    MenuList secret value was reused.
- [x] `AL-PROD-D02` Create an independent Google AI Studio authorization key,
  billing attribution, usage alerting, and spend-control evidence for project
  `neelvara-answerlattice-prod`. Do not create or promote a standard Gemini API
  key that will be rejected after September 2026.
  - The production project is imported into AI Studio and its independent
    billing/spend controls already exist. The owner created
    `Answerlattice Production Gemini Authorization` in that project. Codex
    transferred it without display to Vercel Production and Secret Manager,
    and a bounded direct provider call returned HTTP 200 with exactly `OK`.
    No fallback standard key, QA key, MenuList key, placeholder, or
    Cloud-console-created unrestricted key was substituted.
- [x] `AL-PROD-D03` Create a production Upstash database and hard budget only
  if the admitted production paths require it; never share QA credentials.
  - No production Upstash database or credential was created. Current Redis
    paths are optional fast paths and measured production load does not yet
    justify another paid database. Reopen only from observed demand.
- [x] `AL-PROD-D04` Configure production Resend/SMTP/provider credentials only
  for approved send paths. Keep WhatsApp and other optional provider sends
  disabled until legal/ownership/certification gates close.
  - Resend, SMTP, GitHub, WhatsApp, analytics, and other provider-send
    credentials remain absent and their optional Functions remain undeployed.
- [x] `AL-PROD-D05` Verify every enabled Secret Manager version is bound only
  to the exact Functions that declare it.
  - Secret Manager contains only the three production core secrets. Current
    Function readback shows all 11 approved core Functions ACTIVE on Node 22
    in `us-central1`. Each of the eight AI paths binds
    `ANSWERLATTICE_GEMINI_AI_KEY` version 1, the scheduler paths bind only their
    declared bundle/cron secrets, and the three non-AI analytics/support
    Functions bind no secrets. No optional provider secret is present.
- [ ] `AL-PROD-D06` Create and bind the dedicated Answerlattice production Web
  OAuth client in `neelvara-answerlattice-prod`. Configure truthful branding
  `Answerlattice`, support email `support@neelvara.com`, developer contact
  `admin@neelvara.com`, External audience in Testing, and only
  `admin@neelvara.com` as a test user until the release publishing gate.
  Configure home page `https://answerlattice.com`, privacy policy
  `https://answerlattice.com/privacy-policy`, terms
  `https://answerlattice.com/terms-of-service`, authorized domain
  `answerlattice.com`, and only the standard `openid`, `email`, and `profile`
  identity scopes. The Web client must use only
  `https://answerlattice.com` and `https://www.answerlattice.com` as origins and
  their exact `/api/auth/callback/google` URIs as redirects. Store it only as
  `ANSWERLATTICE_GOOGLE_CLIENT_ID` and sensitive
  `ANSWERLATTICE_GOOGLE_CLIENT_SECRET` in Vercel Production, remove hosted
  `NEXTAUTH_URL`, deploy the approved production revision, and certify the same
  identity-only Google flow, host-only session, and Answerlattice custom-token
  synchronization as QA. Never copy the QA or MenuList client.
  - Live configuration on August 21, 2026 under `admin@neelvara.com` now has
    truthful Answerlattice branding, the exact public/legal URLs and authorized
    domain, External audience in Testing, sole test user
    `admin@neelvara.com`, and a dedicated `Answerlattice Production Web`
    client with only the approved apex/`www` origins and callbacks. The hosted
    Vercel Production `NEXTAUTH_URL` variable was removed while the staging
    Preview value was preserved. The client ID and sensitive client secret are
    now bound to Vercel Production only as the two product-specific variables;
    readback confirms the pre-existing custom-`qa` rows remain `qa`-only and
    neither new row includes Preview. Deployment activation and hosted
    callback/session proof remain open. No credential value is recorded in
    this ledger.

### Production Promotion And Setup Closure

- [x] `AL-PROD-E01` Freeze the exact source revision that passed QA and rerun
  the focused source gates.
  - The hosted QA application revision and approved application source are
    `05779ae3fefe58fe07352067ad5adcbd1693ac24`. Answerlattice TypeScript,
    Functions build, WIF contracts, environment target matrix, and hosted
    OAuth routing passed again on August 21, 2026. Later ledger-only commits do
    not change this application release boundary.
- [x] `AL-PROD-E02` Audit production remote indexes before deploy; never use
  `--force` as a shortcut.
  - Current production readback has 100 composite indexes and all 100 are
    READY. The 18 TTL field configurations are present.
- [x] `AL-PROD-E03` With explicit scoped approval, deploy dedicated rules,
  Storage rules, approved indexes, and approved Functions targets to project
  `neelvara-answerlattice-prod` using `firebase-answerlattice.json`.
  - Firestore rules, Storage rules, and the approved indexes are deployed and
    source-hash verified. All 11 approved core Functions are deployed and
    ACTIVE with no placeholder or QA secret: eight Gemini-bound Functions,
    Scheduler and embedding task infrastructure, two retry-safe Firestore
    analytics/support triggers, and the PLATFORM-authorized analytics backfill
    callable. The optional EmailOS webhook is intentionally excluded under
    `AL-PROD-D04`; its absence does not leave the approved core target partial.
- [x] `AL-PROD-E04` Read back active rules, Storage rules, indexes, Functions,
  service identities, secret bindings, scheduler/tasks, and budgets.
  - Rules/indexes, service identities, databases, budgets, and all three core
    secret names are read back. All 11 approved core Functions report ACTIVE
    on Node 22 in `us-central1`; Scheduler, task queue, trigger regions, and
    exact secret version bindings are read back. Production
    `backfillChatAnalytics` uses the same Domain Restricted Sharing-compatible
    Cloud Run transport setting as QA:
    `run.googleapis.com/invoker-iam-disabled=true`. An unsigned POST reached
    the callable and returned HTTP 401 `UNAUTHENTICATED`, proving transport is
    reachable while Firebase callable authentication remains enforced.
- [x] `AL-PROD-E05` Verify Vercel Production assignments for
  `answerlattice.com` and `www.answerlattice.com`, TLS, canonical redirects,
  `/api/version`, and production environment identity.
  - Vercel deployment `dpl_6wszXf6VQAqYEV6Q5knDPMeBcPo1` is READY from exact
    application commit `5fa6ae245dd151ebbea10d28a9c523689bdcf2d0`.
    `answerlattice.com` returns HTTP 200 with valid TLS, HSTS, Answerlattice
    product headers, environment `production`, and that exact `/api/version`
    build identity. `www.answerlattice.com` returns method-preserving permanent
    `308` to the same path on the apex, and following the redirect returns the
    same production build identity.
- [ ] `AL-PROD-E06` Complete authenticated backend smoke and a bounded
  backup/restore drill before launch certification.
  - Managed backup
    `5bad4389-5ae1-42b8-bce3-1e1ec7720723` reached `READY` with snapshot time
    `2026-08-21T13:41:43.122400Z`. Its isolated restore into delete-protected
    database `answerlattice-prod-recovery-20260821` in `nam5` completed on
    August 21, 2026. Completion was observed at `2026-08-21T17:06:56Z`, giving
    an observed upper-bound RTO of 46 minutes 57 seconds and an RPO at restore
    start of 2 hours 38 minutes 16 seconds. All 100 composite indexes and all 15
    non-TTL field overrides match production. The expected 18 TTL policies were
    not restored and remain an explicit reapplication/readback step. The live
    production `(default)` database was not modified or connected to the
    recovery database. The new production authorization key passed a bounded
    direct Gemini HTTP 200 `OK` call. Hosted authenticated backend smoke,
    fixture-level tenant/data validation, Storage/Auth recovery evidence, TTL
    reapplication, and approved cleanup remain open certification work.
- [x] `AL-PROD-E07` Record intentionally disabled providers and feature flags;
  setup closure must not silently activate them.
  - Optional Redis, Resend, SMTP, GitHub, WhatsApp, analytics, and provider-send
    paths remain disabled. Google OAuth is a core identity path, not an optional
    provider-send path; its dedicated production client remains open in
    `AL-PROD-D06`.

Production setup closes only when `AL-PROD-A01` through `AL-PROD-E07`, including
`AL-PROD-D06`, have
current readback. Release certification, real-client onboarding, provider
delivery certification, browser/device checks, and launch approval remain
separate gates.

## Evidence Log

Append short entries here. Do not paste secrets, tokens, private keys, raw
service-account JSON, or customer data.

| Date | Item | Result | Evidence |
| --- | --- | --- | --- |
| 2026-08-20 | `AL-BASE-01` through `AL-BASE-06` | Source and public production host baseline recorded | Repository target/config files; HTTP header checks |
| 2026-08-20 | `AL-BASE-07` | Superseded discovery | Firebase CLI as `admin@neelvara.com` could not read the retired external Answerlattice IDs; the company-owned replacement QA project was then created and verified |
| 2026-08-20 | `AL-BASE-07` | Superseded discovery | Direct GCP checks confirmed the old IDs were inaccessible; they were retired rather than reused or requested |
| 2026-08-20 | `AL-BASE-08` | Pass | GoDaddy inventory confirmed `canonica.app` ownership; the domain was attached only to Vercel `qa`, and the exact apex and `www` web records were replaced without changing mail or verification DNS |
| 2026-08-20 | `AL-BASE-09` | Pass after hosted release | Deployment target, product routing, widget staging URL, crawler isolation, and regression assertions moved to `canonica.app`; exact staging commit `f02e2c9dc18af21d83a4e8a4c2bfd86f22a043ea` is live on both QA hosts |
| 2026-08-20 | `AL-QA-D01` | Superseded pre-setup inventory | Custom Vercel `qa` was branch-locked to `staging` and initially had zero `ANSWERLATTICE_*` variables; dedicated values were added later in the setup |
| 2026-08-20 | `AL-QA-A01` | Pass after fresh-project decision | The inaccessible external IDs were not modified; company-owned project `neelvara-answerlattice-qa` was created under `neelvara.com` and verified as `admin@neelvara.com` |
| 2026-08-21 | `AL-QA-A03` | Pass | General INR 25 project alert remains active; enforced INR 20 monthly Gemini API spend cap added for `neelvara-answerlattice-qa` with 50%, 80%, and 100% notifications to billing users and project owners; Vercel admission guard remains 8 USD per 10 minutes |
| 2026-08-20 | `AL-QA-B01` through `AL-QA-B05` | Pass with monitoring boundary | Firebase enabled; Firestore `nam5`; active Web app; US Storage; exact Auth domains; legacy reCAPTCHA v3 App Check registered with enforcement OFF |
| 2026-08-20 | `AL-QA-C01` through `AL-QA-C05` | Pass | Dedicated keyless runtime service account, project-local WIF pool/provider, least-privilege roles, exact Vercel QA selectors, zero user-managed keys, and focused identity/env gates |
| 2026-08-20 | `AL-QA-D01` through `AL-QA-D05` | Historical pass before OAuth parity approval | Dedicated core secrets and Firebase/OIDC values exist; no MenuList secret or Redis credential reused; optional providers disabled; the former credential-only OAuth decision was superseded on August 21 |
| 2026-08-21 | `AL-QA-D07` / `AL-PROD-D06` | Source and both provider bindings complete; production activation open | Shared NextAuth selects dedicated MenuList or Answerlattice Google credentials from the request hostname while retaining the same `google` provider and callback path. QA and Production each have an independent client and sensitive environment-scoped Vercel binding with hosted `NEXTAUTH_URL` absent. QA hosted callback proof is complete; production deployment/callback proof remains open. |
| 2026-08-21 | `AL-QA-D07` | Provider and credential binding prepared; deployment open | QA Google Auth Platform has truthful Answerlattice QA branding, Canonica legal URLs and authorized domain, company support/developer contacts, External Testing audience, sole test user `admin@neelvara.com`, and dedicated client `Answerlattice QA Web`. The first secret was invalidated before use after accessibility-label exposure; only its replacement remains enabled and is bound directly to Vercel `qa`. Hosted `NEXTAUTH_URL` is absent. No secret value was written to source or documentation. |
| 2026-08-21 | `AL-QA-D07` | Hosted OAuth and session boundary pass; Firebase sync fixture open | Deployment `menulist-core-2ix2pt0p5-neelvara-systems.vercel.app` serves exact staging build `1589272a29e1f342ae7d4b93985da91f66922152` on Canonica. Both hosts derive exact Google callback URLs with `openid email profile`. The authorized admin consent/callback returned authenticated on the apex, and the session did not cross to `www`. A disposable workspace is still required for Answerlattice Firebase custom-token proof. |
| 2026-08-21 | `AL-PROD-D06` | Provider and credential binding complete; deployment proof open | Production Google Auth Platform has truthful Answerlattice branding, External Testing audience, sole admin test user, exact public/legal URLs, identity-only scopes, and the dedicated apex/`www` Web client. Product-scoped ID/secret rows are bound only to Vercel Production; hosted `NEXTAUTH_URL` is absent. |
| 2026-08-20 | `AL-QA-E02` through `AL-QA-E04` | Pass | Rules and Storage rules hashes match source; 100 composite indexes READY; 18 TTL fields ACTIVE; 12 approved Functions ACTIVE on Node 22 in `us-central1`; one Scheduler job and one task queue active |
| 2026-08-21 | `AL-QA-E05` | Pass | Canonica apex and `www` are attached only to Vercel `qa`; public DNS and Vercel are valid; deployment `dpl_8JAgWBZiFvzgo1PqUXi64RqgHvBq` at `menulist-core-jun1m21ji-neelvara-systems.vercel.app` serves exact application-bearing build `05779ae3fefe58fe07352067ad5adcbd1693ac24` with HTTP 200, valid TLS, Answerlattice product identity, QA crawler isolation, and no production redirect |
| 2026-08-21 | `AL-QA-E06` | Base setup and OAuth-host pass | Exact `/api/version`, HTTP 200, TLS, Answerlattice product header, noindex header, disallow-all robots, absent sitemap, and product-routed OAuth callback/session behavior were verified on the fresh hosted revision. Fixture-dependent application paths and Firebase custom-token synchronization remain separate testing evidence. |
| 2026-08-21 | QA login deployment | Pass after scoped build repair | Initial deployment `dpl_AhmxMDzT73N2aFvUnhTP3eCMiXpY` failed because it referenced a local-only uncommitted website constant; the login copy dependency was made self-contained, source gates passed, and replacement deployment `dpl_4RrusSrXKWKUDyVvV9UjUGogxy9R` reached READY |
| 2026-08-21 | `AL-QA-E07` | Structural restore pass; certification checks open | READY backup `36bebe19-9fd9-4f25-9609-d0facd1c34f2` restored into delete-protected database `answerlattice-recovery-20260821` in `nam5`. Completion was observed in 32 minutes 7 seconds with a 2 hour 25 minute 2 second RPO. All 100 composite indexes restored; 18 TTL policies were absent as expected. Fixture content/tenant validation, TTL reapplication, Storage/Auth evidence, and cleanup remain open. |
| 2026-08-21 | `AL-QA-D06` | Partial; authenticated server call open | Owner created the project-local AI Studio authorization key; metadata and API restriction verified; Vercel `qa` and Firebase Secret Manager rotated; eight AI Functions are ACTIVE on secret version 3; direct Gemini call returned HTTP 200 with `OK`; old standard key and secret version 2 were destroyed. Current Canonica build `a6afeafd25ee05235c06ce2199fa15e9f3945177` carries the rotated QA environment. One authenticated bounded Next.js server-side Gemini readback remains fixture-dependent. |
| 2026-08-21 | `AL-QA-D04`, `AL-QA-D08` through `AL-QA-D10` | Setup-only parity audit | Correct-profile live readback found independent Answerlattice Resend onboarding absent and confirmed the new private widget runtime secret in Vercel QA. The shared Next.js Sentry DSN is present; source and Secret Manager readback confirm Answerlattice Functions intentionally use Cloud Logging and require no Sentry secret. Disabled GitHub, MCP, WhatsApp, SMTP, paid Redis, analytics, and fixture widget-key values remain intentionally absent. |
| 2026-08-21 | `AL-QA-D09` | Pass; deployment activation pending | Generated a unique 32-byte Base64URL widget runtime secret and stored it as a sensitive variable only in Vercel custom `qa`; the value was not displayed or persisted locally. Vercel requires a later approved QA redeployment before the hosted runtime receives it. |
| 2026-08-21 | `AL-QA-D08` | Partial; hosted key activation complete, certification open | Sender domain, isolated return path, QA webhook registration, webhook secret version 1 and non-secret sender configuration are prepared. Scoped Function revision `answerlatticeemailoswebhook-00006-zer` is ACTIVE, binds only `ANSWERLATTICE_RESEND_WEBHOOK_SECRET` version 1, retains the DRS-compatible public transport setting, and rejects an unsigned request with HTTP 400 `Invalid webhook`. The separately restricted sending key is a sensitive Vercel custom-`qa` variable and enabled Answerlattice QA Secret Manager version 1; transfer occurred through standard input without display or repository persistence. Approved deployment `dpl_BdKiiGMKCR5hsdpLywDTTn1PqBLf` reached READY from exact certified commit `a6afeafd25ee05235c06ce2199fa15e9f3945177`; both Canonica aliases serve it with Answerlattice identity and QA noindex headers. No controlled email has been sent and provider sending remains disabled. |
| 2026-08-21 | `AL-QA-D09` | Pass; hosted activation complete | Automatic deployment `dpl_91Uj4beXQWDCppJQK88VqvT56ZHQ` reached READY in custom environment `qa` from exact commit `a6afeafd25ee05235c06ce2199fa15e9f3945177`. Vercel emitted environment `qa` and the expected QA OIDC subject; `canonica.app` and `www.canonica.app` both serve that build with Answerlattice and noindex headers. |
| 2026-08-21 | QA runtime target correction | Pass | Retired external scheduler project IDs were replaced with the frozen company-owned deployment targets. Runtime-truth, final-readiness, WIF, environment, EmailOS, backup-recovery, typecheck, Functions build, focused lint, documentation, and diff gates passed. Custom-`qa` deployment `dpl_8JAgWBZiFvzgo1PqUXi64RqgHvBq` reached READY from exact commit `05779ae3fefe58fe07352067ad5adcbd1693ac24`; both Canonica aliases serve it and CSP admits the company-owned QA and production Function origins. |
| 2026-08-21 | `AL-PROD-A01` through `AL-PROD-A03` | Pass | Company-owned production project is visible to `admin@neelvara.com`; independent project budgets exist; runtime service account has least-privilege roles and zero user-managed keys |
| 2026-08-21 | `AL-PROD-B01` through `AL-PROD-B04` | Foundation and App Check complete; runtime activation open | Firebase Web/Auth/Firestore/Storage and supporting APIs are ready; Firestore is protected in `nam5`; exact Auth hosts are active; dedicated legacy reCAPTCHA v3 App Check is registered with enforcement OFF; Functions await the production Gemini authorization key |
| 2026-08-21 | `AL-PROD-C01` through `AL-PROD-C04` | Pass | Production WIF provider is ACTIVE with exact team/project/environment/subject restriction; Vercel selectors exist; static Admin key material is absent |
| 2026-08-21 | `AL-PROD-D01` through `AL-PROD-D05` | Partial by explicit boundary | Fresh cron and bundle secrets exist; Gemini key is parked; no paid Redis or optional provider credentials were created; secret bindings await Functions deploy |
| 2026-08-21 | `AL-PROD-E01` through `AL-PROD-E07` | Infrastructure partial | Focused source gates pass; 100 indexes are READY and 18 TTL fields exist; rules/Storage/indexes are deployed; domains/TLS are healthy; the isolated structural restore completed; Functions, Vercel activation, authenticated smoke, fixture recovery validation, TTL reapplication, Storage/Auth evidence, and cleanup remain open |
| 2026-08-21 | `AL-PROD-B04`, `AL-PROD-D02`, `AL-PROD-D06` | App Check and OAuth binding complete; Gemini parked | Dedicated production legacy reCAPTCHA v3 App Check is registered with enforcement OFF. The site key and dedicated Google OAuth client credentials are bound only to Vercel Production; the existing custom-`qa` rows remain isolated and Preview is excluded. Production `NEXTAUTH_URL` remains absent while staging Preview is unchanged. Gemini authorization-key creation remains parked after two AI Studio automated security-check rejections. No secret value was written to source or documentation. |
| 2026-08-21 | `AL-PROD-E06` | Structural restore pass; certification checks open | READY backup `5bad4389-5ae1-42b8-bce3-1e1ec7720723` restored into delete-protected non-default database `answerlattice-prod-recovery-20260821` in `nam5`. Completion was observed in 46 minutes 57 seconds with a 2 hour 38 minute 16 second RPO. All 100 composite indexes and 15 non-TTL field overrides match production; 18 TTL policies were absent as expected. Production `(default)` remained untouched. Authenticated smoke, fixture content/tenant validation, TTL reapplication, Storage/Auth evidence, and cleanup remain open. |
| 2026-08-21 | `AL-PROD-D01`, `AL-PROD-D02`, `AL-PROD-D05` | Pass | Owner-created AI Studio authorization key transferred without display to sensitive Vercel Production and Secret Manager version 1; direct provider smoke returned HTTP 200 with exactly `OK`; all three production core secret names and their exact Function bindings were read back. |
| 2026-08-21 | `AL-PROD-E03`, `AL-PROD-E04` | Scoped Gemini activation pass; four non-AI Functions open | The first deployment exposed Google's new-project default build-account boundary. The standard `roles/cloudbuild.builds.builder` role was added only to `48335396774-compute@developer.gserviceaccount.com`; the pre-existing Eventarc service-agent role was left unchanged. All eight Gemini-bound Functions are ACTIVE on Node 22 in `us-central1`, with Firestore triggers on production `(default)` in `nam5`, one Scheduler, one embedding task queue, and exact Secret Manager version 1 bindings. |
| 2026-08-21 | `AL-PROD-E05` | Pass | Vercel Production deployment `dpl_6wszXf6VQAqYEV6Q5knDPMeBcPo1` reached READY from exact application commit `5fa6ae245dd151ebbea10d28a9c523689bdcf2d0`. The apex returns HTTP 200 with HSTS, Answerlattice routing headers, environment `production`, and matching `/api/version`; `www` returns `308` to the same apex path and resolves to the identical build. |
| 2026-08-22 | `AL-PROD-E03`, `AL-PROD-E04` | Approved core Function target complete | Deployed the two retry-safe Firestore analytics/support triggers and the PLATFORM-authorized analytics backfill callable. Live readback reports 11 approved core Functions ACTIVE on Node 22 in `us-central1`. The callable retains Firebase auth and current PLATFORM authorization while using the QA-proven DRS-compatible transport annotation `run.googleapis.com/invoker-iam-disabled=true`; an unsigned POST returned HTTP 401 `UNAUTHENTICATED`. The optional EmailOS webhook remains intentionally undeployed with provider credentials absent. |
