# MenuList Staging QA Setup Guide

> Status: first execution guide
> Scope: MenuList local plus staging only
> Last updated: August 2, 2026
> Launch boundary: this guide does not approve production deployment. Finish this MenuList QA setup, verify it end to end, then create a separate MenuList production guide.

This is the dedicated setup file for **MenuList staging/QA**. Follow only this
file first. Do not set up Answerlattice, CampaignCue, SignalDesk, Neelvara, or
MyCodex until MenuList QA is live and verified.

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
| [ ] | QA-A05 | Named daily operator created | Google Workspace and Google Cloud IAM | Deferred during the one-user MenuList QA bootstrap; create `danny@neelvara.com` or the founder's equivalent before production operations, grant only required access, and return the Super Admin to break-glass-only use |
| [x] | QA-A06 | Gmail delivery activated and tested | Google Admin Console, DNS, and every currently licensed mailbox | Google accepted the published MX; post-DKIM mail from `admin@neelvara.com` reached an external Gmail Inbox with SPF, DKIM, and DMARC all passing, and the external reply reached the admin Inbox |
| [x] | QA-A07 | SPF, DKIM, and monitor-only DMARC configured | Google Admin Console and DNS | Authoritative DNS and a fresh Inbox message prove Google-only SPF, active 2048-bit Google DKIM, and monitor-only DMARC reporting to the tested `dmarc@neelvara.com` alias; obsolete GoDaddy mail CNAMEs are removed |
| [x] | QA-A08 | Provider-notice aliases/groups created | Google Admin Console | `billing@neelvara.com`, `security@neelvara.com`, and `dmarc@neelvara.com` are aliases on the one licensed admin mailbox, and separate external delivery tests reached its Inbox |
| [x] | QA-A09 | GitHub repository transferred to company organization | GitHub source `menulist-ai/menulist-core`, controlled intermediary `neelvara-admin/menulist-core`, and target `neelvara-systems/menulist-core` | Company-admin account `neelvara-admin` uses verified `admin@neelvara.com`, passkey, authenticator MFA, and independent recovery; two native transfers preserve `main`, `staging`, and repository metadata without granting the retiring account organization membership; final access readback shows no `menulist-ai` collaborator and no copy/recreated repository was used |
| [x] | QA-A21 | Local Git authentication and author identity migrated | This workstation, `~/.ssh`, GitHub SSH settings, and the local `menulist-core` repository | The dedicated Neelvara key is the only active GitHub key on this workstation and authenticates as `neelvara-admin`; `origin`, authenticated fetch, preserved branch refs, repo-local `Neelvara Systems` noreply identity, old-account key revocation, and deletion of the retired local keypair are all verified |
| [ ] | QA-A10 | Fresh single Vercel project and Git integration created | Fresh Neelvara Vercel account and Project -> Settings -> Git | Exactly one fresh project imports `neelvara-systems/menulist-core` once; no old deployment, project setting, or environment value is transferred; exact branch `staging` can be restricted to Preview |
| [ ] | QA-A11 | MFA enabled and recovery codes stored | Registrar, Google, GitHub, Vercel, providers | No setup depends on a weak or disposable login |
| [ ] | QA-A12 | Secret sharing rule accepted | This guide and password vault | No real secret will be pasted into docs, chat, screenshots, or git |
| [ ] | QA-A13 | Founder recovery identity and ownership recorded | Google Workspace and password vault | A long-lived personal email is recovery-only; offline codes and the recovery owner are recorded; add a second trusted Super Admin before production when another owner is available |
| [x] | QA-A14 | Google Cloud organization visible | Google Cloud Console | Google Cloud visibly confirmed creation of the `neelvara.com` organization and assignment of Organization Administrator to `admin@neelvara.com` before `menulist-qa` creation |
| [ ] | QA-A15 | Retired Firebase service-account keys revoked | Google Cloud Console -> IAM & Admin -> Service Accounts for every retired project | Any old local service-account key is deleted or disabled before new QA credentials are created; do not copy it into `menulist-qa` |
| [ ] | QA-A16 | Maintenance calendar created | Calendar/password vault | Quarterly IAM/secret review and annual domain/payment/recovery review dates are recorded |
| [x] | QA-A17 | Duplicate registrar add-ons resolved | Registrar Products/Billing and support | Professional Email Pro Light is intentionally retained unused through its paid term with auto-renew Off; legacy GoDaddy mail DNS replacement is tracked separately under `QA-A06`, `QA-A07`, and `QA-A19`; Google Workspace and Vercel remain the selected mail/hosting stack |
| [x] | QA-A18 | Generic admin display name corrected | Admin Console -> Directory -> Users -> `admin@neelvara.com` | Admin Console confirmed the managed user's display name is now `Neelvara Systems Admin`; the email address and organization name were not changed |
| [x] | QA-A19 | `neelvara.com` DNS zone exported before mail migration | GoDaddy DNS -> Actions -> Export Zone File | Operator confirmed the complete unchanged 15-record zone is stored privately before mail migration; this does not satisfy the separate `menulist.digital` export in `QA-B04` |
| [ ] | QA-A20 | Old Vercel account retired without carrying forward chaos | Old Vercel account, Vercel Support, registrar, and provider consoles | Phone-number release/unlink is confirmed; domain and env-key/provider names are inventoried without copying values; referenced credentials are revoked/rotated at source; custom domains/subscriptions/projects/teams are removed before permanent account deletion |

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
| [ ] | QA-B03 | No extra domain selected | Registrar and Vercel | No production, SignalDesk, MyCodex, Answerlattice, or CampaignCue domain is used in this pass |
| [ ] | QA-B04 | Current `menulist.digital` DNS zone inventoried and exported | Existing DNS provider/registrar | Every `menulist.digital` A, AAAA, CNAME, MX, TXT, CAA, and SRV record is backed up before QA-domain DNS changes; the `neelvara.com` backup in `QA-A19` does not satisfy this row |
| [ ] | QA-B05 | `menulist.digital` and `www.menulist.digital` added and assigned to exact Git branch `staging` | Vercel Project -> Domains -> Git Branch | Apex and `www` target Preview for `staging`, never Production |
| [ ] | QA-B06 | `app.menulist.digital` added and assigned to exact Git branch `staging` | Vercel Project -> Domains -> Git Branch | Owner sign-in and `/dashboard` use the dedicated QA app host |
| [ ] | QA-B07 | `*.menulist.digital` added and assigned to exact Git branch `staging` | Vercel Project -> Domains -> Git Branch | QA customer subdomains target the same `staging` deployment |
| [ ] | QA-B08 | DNS records preserved and Vercel nameservers configured | Vercel DNS and registrar nameserver screen | Existing required records are recreated in Vercel DNS before the registrar uses the exact Vercel nameservers required for the apex wildcard |
| [ ] | QA-B09 | First branch deployment intentionally deferred | Vercel Domains and this guide | Domain assignments are saved, but no incomplete deployment is triggered before Phase G env and Phase I Firebase gates are ready |
| [ ] | QA-B10 | Domain ownership, DNS, and TLS readiness complete | Vercel Project -> Domains | Apex, `www`, `app`, and wildcard configuration are valid and assigned to exact branch `staging`; content smoke waits for Phase J/K |

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
| [ ] | QA-C10 | Service account values stored securely | Firebase Project Settings -> Service accounts | Admin SDK project id, client email, private key, and Firebase Web API key mapping are stored in the password vault |
| [ ] | QA-C11 | Temporary service account JSON removed | Local machine | No downloaded service account JSON remains outside the vault |
| [x] | QA-C12 | Immutable resource locations recorded | Password vault setup note | Firestore and Storage both record `us-central1`; no location is assumed from an env value alone |
| [ ] | QA-C13 | Admin key creation date and revocation owner recorded | Password vault and Google Cloud IAM | The current static QA key has an owner/date and will be revoked immediately on leak, access removal, or replacement |

### Phase D - Google OAuth

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [x] | QA-D01 | Google Auth branding and contacts configured | Google Cloud Console -> Google Auth Platform -> Branding | MenuList QA name, support email, developer contact, homepage/privacy/terms links, and verified `menulist.digital` domain are accurate |
| [x] | QA-D02 | OAuth audience set to External/Testing | Google Auth Platform -> Audience | QA remains in Testing and only named QA test users are admitted; no production publishing is requested |
| [ ] | QA-D03 | Identity-only scopes confirmed | Google Auth Platform -> Data Access | Only `openid`, `email`, and `profile` are requested for sign-in |
| [ ] | QA-D04 | Web OAuth client created for MenuList QA | Google Auth Platform -> Clients | One Web application client id and secret exist for QA usage |
| [ ] | QA-D05 | Authorized JavaScript origins added | OAuth client settings | Exact origins are `http://localhost:3000` and `https://app.menulist.digital`; no wildcard/customer origin is present |
| [ ] | QA-D06 | Authorized redirect URIs added | OAuth client settings | Exact callbacks are `http://localhost:3000/api/auth/callback/google` and `https://app.menulist.digital/api/auth/callback/google` |
| [ ] | QA-D07 | OAuth test users added | Google Auth Platform -> Audience | Named company QA accounts that will run the smoke test are listed |
| [ ] | QA-D08 | OAuth client id/secret stored securely | Password vault | Values are ready for local env and branch-restricted Vercel Preview env |

### Phase E - Required QA Provider Values

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-E01 | MenuList staging Gemini primary and rotation keys created | Google AI Studio | QA keys exist; canonical `MENULIST_GEMINI_AI_KEY`/`_2`/`_3`/`_4`, current app aliases `GEMINI_AI_KEY`/`_2`/`_3`/`_4`, and matching Function secret names are recorded |
| [ ] | QA-E02 | Upstash staging Redis created | Upstash Console | REST URL/token exist and are stored for QA only |
| [ ] | QA-E03 | Razorpay Test Mode keys and webhook secret available | Razorpay Dashboard -> Test Mode | `rzp_test_` key id/key secret and a distinct QA webhook secret are stored; the endpoint is added only after `app.menulist.digital` is live |
| [ ] | QA-E04 | Sentry QA project created | Sentry dashboard | A MenuList QA project/environment exists and its server/browser DSNs are stored because selected Functions bind `SENTRY_DSN` |
| [ ] | QA-E05 | Meta non-production app and WhatsApp test credentials created | Meta Developers | Meta-provided test phone-number id/token, app secret, and a generated verify token are stored; provider processing remains disabled |
| [ ] | QA-E06 | `NEXTAUTH_SECRET` generated | Local terminal and password vault | Separate 32-byte base64url secret is stored, not pasted into docs/chat |
| [ ] | QA-E07 | `MENULIST_OWNER_REFERRAL_TOKEN_SECRET` generated | Local terminal and password vault | Separate 32-byte base64url secret is stored before owner referral is enabled |
| [ ] | QA-E08 | Revalidation secret generated | Password vault | Separate QA value is ready for Vercel and Firebase Function Secret Manager |
| [ ] | QA-E09 | GCP budget webhook secret generated if budget alerts are configured | Google Cloud billing and password vault | Separate QA budget webhook secret is stored or intentionally skipped |
| [ ] | QA-E10 | Cloud Tasks API enabled in `menulist-qa` | Google Cloud APIs | Cloud Tasks is enabled only for the QA project |
| [ ] | QA-E11 | Batch image queue created | Cloud Tasks -> Queues | `batch-image-generation` exists in `us-central1` with bounded dispatch/retry settings |
| [ ] | QA-E12 | Batch worker secret generated | Password vault | One separate random QA-only secret is ready for `BATCH_IMAGE_GENERATION_WORKER_SECRET` |

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

Gemini rotation note: current MenuList Functions targets declare
`GEMINI_AI_KEY_2`, `GEMINI_AI_KEY_3`, and `GEMINI_AI_KEY_4`. Prefer separate
real failover keys. If a slot temporarily uses the same Google account/provider
value as the primary key, record it in your vault as a rotate-later placeholder;
do not treat duplicate values as extra quota.

### Phase F - Optional QA Provider Decisions

These can be skipped for the first MenuList QA boot if the matching feature is
not being tested. Sentry and Meta/WhatsApp are not in this optional list because
the maintained full Functions target list binds their Secret Manager names even
while messaging provider processing remains disabled. If an optional provider
is skipped, do not create fake values.

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-F01 | reCAPTCHA/App Check staging registration created if needed | reCAPTCHA Admin and Firebase App Check | `app.menulist.digital`, the website apex, and only tested customer hosts are registered as required; monitor mode only unless approved |
| [ ] | QA-F02 | Telegram staging alert bot/chat created if needed | BotFather and Telegram | `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are stored or skipped intentionally |
| [ ] | QA-F03 | SMTP staging sender configured if needed | Workspace or SMTP provider | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` are stored or skipped intentionally |
| [ ] | QA-F04 | UptimeRobot decision recorded | Setup note | Mark enabled or skipped now; create monitors only after the Phase J deployment is live so false setup incidents are not generated |
| [ ] | QA-F05 | GA/Clarity/Plausible staging analytics configured if approved | Analytics provider dashboards | Staging ids are stored or skipped intentionally |

Optional provider console links:

- reCAPTCHA Admin: https://www.google.com/recaptcha/admin/create
- Firebase App Check for MenuList QA:
  https://console.firebase.google.com/project/menulist-qa/appcheck
- Telegram BotFather: https://t.me/BotFather
- UptimeRobot: https://uptimerobot.com/dashboard

### Phase G - Local And Vercel Preview Env

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-G01 | Local ignored env file prepared from `.env.staging.example` | `.env.local` or approved ignored local env | Local values point to `menulist-qa`; local URL overrides use `http://localhost:3000` |
| [ ] | QA-G02 | Branch-restricted Vercel Preview env created | Vercel Project -> Settings -> Environment Variables -> Preview -> Git Branch | Every MenuList QA value, especially secrets, is restricted to exact branch `staging` |
| [ ] | QA-G03 | Runtime URL env values set | Local env and Vercel Preview env | Website/platform values use `menulist.digital`, aliases include `www` and `app`, tenant base uses `menulist.digital`, and `NEXTAUTH_URL` uses `app.menulist.digital` |
| [ ] | QA-G04 | Firebase public canonical keys set | Local env and Vercel Preview env | `NEXT_PUBLIC_MENULIST_FIREBASE_*` values point to `menulist-qa` |
| [ ] | QA-G05 | Firebase public compatibility aliases set | Local env and Vercel Preview env | `NEXT_PUBLIC_FIREBASE_*` values exactly match canonical MenuList values |
| [ ] | QA-G06 | Firebase admin canonical keys set | Local env and Vercel Preview env | `MENULIST_FIREBASE_*` values point to `menulist-qa` |
| [ ] | QA-G07 | Firebase admin compatibility aliases set | Local env and Vercel Preview env | `FIREBASE_*` values exactly match canonical MenuList values |
| [ ] | QA-G08 | Gemini keys, aliases, and rolling ceiling set | Local env and Vercel Preview env | Canonical MenuList keys match current app aliases; `MENULIST_GEMINI_SPEND_LIMIT_USD_10M` uses the approved QA value below the provider ceiling |
| [ ] | QA-G09 | Razorpay Test Mode keys set | Local env and Vercel Preview env | Private and public Razorpay keys start with `rzp_test_` |
| [ ] | QA-G10 | Upstash and revalidation values set | Local env and Vercel Preview env | QA Redis and revalidation secrets are present |
| [ ] | QA-G11 | Provider values handled according to Phase E/F | Local env and Vercel Preview env | Required QA providers use real QA values; optional providers are real QA values or intentionally absent |
| [ ] | QA-G12 | Private key newlines escaped for Vercel | Vercel Preview env | `MENULIST_FIREBASE_PRIVATE_KEY` and `FIREBASE_PRIVATE_KEY` are valid multiline-safe values |
| [ ] | QA-G13 | Production env not touched | Vercel Project -> Environment Variables -> Production | No production values are changed from this guide |
| [ ] | QA-G14 | Other product env setup skipped | Vercel and local env | No real Answerlattice, CampaignCue, SignalDesk, Neelvara, or MyCodex setup is done in this pass |
| [ ] | QA-G15 | MenuList Functions non-secret env set | `functions/.env.menulist-qa` | App/API and message-preview origins are `https://app.menulist.digital`; tenant base is `menulist.digital`; the approved QA Gemini rolling limit is explicit |
| [ ] | QA-G16 | Cloud Tasks worker values set | Local env and Vercel Preview env | Worker URL is the QA app-host endpoint, queue id is `batch-image-generation`, and the QA-only worker secret is present |
| [ ] | QA-G17 | Deployable env values sanitized | Local env and Vercel Preview env | No value contains `<...>` template text, and unrelated product placeholder rows are absent rather than uploaded as values |
| [ ] | QA-G18 | Emulator-first local override documented | Ignored `.env.local` and Firebase Emulator Suite | Destructive/rule-focused local work uses emulator hosts; Vercel remains emulator-off and cloud QA is used only for deliberate integration smoke |

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
| [ ] | QA-H01 | Firebase CLI login confirmed | Local terminal | `firebase projects:list` shows `menulist-qa` |
| [ ] | QA-H02 | Secret Manager API enabled only in `menulist-qa` | Google Cloud API Library | `secretmanager.googleapis.com` is enabled for the QA project after billing/budgets, not for production |
| [ ] | QA-H03 | Required AI secrets set | Firebase Secret Manager for `menulist-qa` | `GEMINI_AI_KEY`, `GEMINI_AI_KEY_2`, `GEMINI_AI_KEY_3`, and `GEMINI_AI_KEY_4` exist because current deploy targets declare them |
| [ ] | QA-H04 | Required Upstash secrets set | Firebase Secret Manager for `menulist-qa` | `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` exist |
| [ ] | QA-H05 | Required Razorpay Test Mode Function secrets set | Firebase Secret Manager for `menulist-qa` | `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` use test-mode values; `RAZORPAY_WEBHOOK_SECRET` stays in local/Vercel env for the Next.js webhook route |
| [ ] | QA-H06 | Required WhatsApp, monitoring, and revalidation secrets set for the maintained target list | Firebase Secret Manager for `menulist-qa` | Real QA `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `SENTRY_DSN`, and `REVALIDATION_SECRET` versions exist even while provider processing is disabled |
| [ ] | QA-H07 | Optional Function secrets handled | Firebase Secret Manager for `menulist-qa` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID` are real QA values or intentionally skipped until a selected deploy target declares/uses them |
| [ ] | QA-H08 | Secret metadata checked without printing values | Google Secret Manager metadata command | Secret names exist, values are never displayed |
| [ ] | QA-H09 | Production Functions secrets not touched | Firebase/Google Secret Manager | No secrets are set in project id `menulist` |

### Phase I - Firebase QA Infrastructure Deploy

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-I01 | Pinned runtime loaded | Local terminal | `node --version` is `v22.23.1`, matching `.nvmrc` |
| [ ] | QA-I02 | Firebase project pre-check passed | Local terminal | `firebase projects:list` includes exact `menulist-qa` under the intended owner login |
| [ ] | QA-I03 | MenuList root rules predeploy suite passed | Local terminal | `npm run verify:menulist-firebase-rules-predeploy` passes every discovered `demo-*` Firestore/Storage emulator rule script |
| [ ] | QA-I04 | Firestore rules/indexes and Storage rules deployed together | Local terminal | Fresh-project command targets `--project menulist-qa --config firebase.json` only |
| [ ] | QA-I05 | Deployed Firestore rules read back | Firebase Console -> Firestore Database -> Rules | Published source/timestamp match the repository deploy; no Console-only edit exists |
| [ ] | QA-I06 | Deployed Storage rules read back | Firebase Console -> Storage -> Rules | Published source/timestamp match the repository deploy; no Console-only edit exists |
| [ ] | QA-I07 | Deployed index state read back | Firebase CLI and Firebase Console -> Firestore Database -> Indexes | Every declared composite index reaches `READY`; none remain `CREATING` or `ERROR` |
| [ ] | QA-I08 | Rule propagation wait completed | Firebase Console and clock | Several minutes have passed after the successful rules release before live smoke testing |
| [ ] | QA-I09 | Deployed allow/deny smoke matrix passed | Local app connected to cloud `menulist-qa`, Firebase Auth, Rules Playground/direct client, Firestore, and Storage | Own-tenant operations work through real QA Auth; anonymous, cross-tenant, server-only spend-window, and legacy Storage operations are denied before the first Vercel deploy |
| [ ] | QA-I10 | MenuList QA Functions bundle deployed only after rule smoke and required secrets pass | Local terminal | Maintained `functions` script deploys scoped MenuList QA function targets to `menulist-qa` only |
| [ ] | QA-I11 | Deploy/readback/smoke evidence recorded | This checklist and operator evidence | Date, project, commands, result, tester ids, and blockers are recorded without secrets or sensitive payloads |
| [ ] | QA-I12 | Production Firebase deploy not run | Local terminal history and Firebase Console | No command targets `--project menulist` |

### Phase J - Vercel Preview/Staging Deploy

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-J01 | Branch-restricted Preview env reviewed before deploy | Vercel Project -> Environment Variables -> Preview | Required MenuList QA values are present and restricted to exact Git branch `staging` |
| [ ] | QA-J02 | Vercel Preview/Staging deployment triggered | Vercel dashboard or approved git workflow | Deployment is not a production deployment |
| [ ] | QA-J03 | Deployment attached to QA domains | Vercel Project -> Deployments and Domains | Website apex/`www`, owner `app`, and customer wildcard all serve the Preview/Staging deployment |
| [ ] | QA-J04 | Runtime project checked from logs/env evidence | Vercel logs or app diagnostics | Runtime points to `menulist-qa`, not `menulist` |
| [ ] | QA-J05 | Vercel Production not touched | Vercel dashboard | No production deploy or production env edit happens in this guide |

### Phase K - MenuList QA Smoke Test

| Status | ID | Check | Where | Expected result |
| --- | --- | --- | --- | --- |
| [ ] | QA-K01 | `https://menulist.digital` opens | Browser | MenuList main website opens with QA/staging values |
| [ ] | QA-K02 | `https://www.menulist.digital` opens | Browser | `www` reaches the same QA website deployment |
| [ ] | QA-K03 | `https://app.menulist.digital/signin` opens | Browser | Canonical QA owner sign-in loads on the app host |
| [ ] | QA-K04 | `https://app.menulist.digital/api/version` opens | Browser | Version endpoint responds from the staging deployment |
| [ ] | QA-K05 | Email/password owner sign-in works | Browser and Firebase Auth | A synthetic QA owner authenticates through the current credential flow on `app.menulist.digital` |
| [ ] | QA-K06 | Google OAuth sign-in works | Browser, Google Auth Platform, and Vercel logs | A listed OAuth test user completes the exact QA callback with no redirect/domain error |
| [ ] | QA-K07 | Single owner dashboard route works | Browser | `https://app.menulist.digital/dashboard` loads and session scope selects the tenant/store |
| [ ] | QA-K08 | Owner onboarding stays on app host | Browser | `https://menulist.digital/create-menu` redirects to `https://app.menulist.digital/create-menu`; Google auth and preview remain on the app host |
| [ ] | QA-K09 | Test business/store can be created or loaded | Browser | Basic owner workflow is usable |
| [ ] | QA-K10 | QA customer link opens | Browser | `https://<test-slug>.menulist.digital` resolves to the test public menu/OBP |
| [ ] | QA-K11 | Firestore writes verified in `menulist-qa` | Firebase Console -> Firestore | Test data appears only in `menulist-qa` |
| [ ] | QA-K12 | Storage writes verified in `menulist-qa` bucket | Firebase Console -> Storage | Test uploads appear only in QA bucket |
| [ ] | QA-K13 | No production writes observed | Firebase Console -> project `menulist` | Production data remains untouched |
| [ ] | QA-K14 | Vercel logs checked | Vercel deployment logs | No missing-env, auth callback, Firebase project, or server secret errors remain |
| [ ] | QA-K15 | QA Sentry event checked | Sentry `menulist-qa` project | One controlled browser/server test error appears only in the QA project and contains no secret or raw sensitive payload |
| [ ] | QA-K16 | Optional post-deploy monitors handled | UptimeRobot/analytics dashboards | Website/app monitors and approved analytics are created and tested, or each is recorded as skipped intentionally |
| [ ] | QA-K17 | Complete QA crawler isolation works | Browser or `curl` | Apex, `www`, `app`, and a QA customer host return `X-Robots-Tag: noindex, nofollow, noarchive`, serve `Disallow: /`, and return `404` for `/sitemap.xml` |
| [ ] | QA-K18 | QA customer origin cannot use owner API CORS | Terminal | A request to an owner API with `Origin: https://<test-slug>.menulist.digital` is rejected and does not receive `Access-Control-Allow-Origin` |
| [ ] | QA-K19 | Explicit no-go checks confirmed | This guide and dashboards | No other product or production setup was performed; retired QA hosts were not activated |
| [ ] | QA-K20 | Controlled batch image worker smoke passes | MenuList QA app, Cloud Tasks, and Vercel logs | One QA batch request reaches `app.menulist.digital`, rejects a wrong secret, accepts the configured secret through the normal queue flow, and leaves no production data |
| [ ] | QA-K21 | Razorpay Test webhook configured and verified | Razorpay Test Mode and Vercel logs | Exact QA endpoint uses the distinct webhook secret; one signed test/sandbox event is accepted without any live-mode operation |
| [ ] | QA-K22 | Final MenuList QA status shared with Codex | Chat plus this file | Codex marks completed items and records blockers before moving to production guide |

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
9. Confirm no action was taken in Firebase project id `menulist`.

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
6. Map the Firebase Web app API key to canonical
   `MENULIST_FIREBASE_API_KEY` and current server alias `FIREBASE_API_KEY` in the
   vault record. It may match the browser Web API key, but both server env names
   remain non-public env entries because current server-auth routes read the
   alias.
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
3. In Google Auth Platform -> Branding, set the app name to `MenuList QA`, use a
   monitored company support/developer contact, and enter these exact QA pages:
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
2. Create four QA keys named `MenuList QA primary`, `MenuList QA rotation 2`,
   `MenuList QA rotation 3`, and `MenuList QA rotation 4`.
3. In Google Cloud Credentials, restrict each key to the Gemini/Generative
   Language API shown by the current console. These are server keys, so do not
   add browser-referrer restrictions that would prevent Vercel or Functions
   calls.
4. Vault each key and record its Google project, creation date, purpose, and
   revocation owner. Keys in the same project share that project's Gemini quota;
   four keys do not create four quotas.
5. Record the env mapping without placing values in this document:

| Vault entry | Canonical Vercel/local env | Current app/Function alias |
| --- | --- | --- |
| Primary | `MENULIST_GEMINI_AI_KEY` | `GEMINI_AI_KEY` |
| Rotation 2 | `MENULIST_GEMINI_AI_KEY_2` | `GEMINI_AI_KEY_2` |
| Rotation 3 | `MENULIST_GEMINI_AI_KEY_3` | `GEMINI_AI_KEY_3` |
| Rotation 4 | `MENULIST_GEMINI_AI_KEY_4` | `GEMINI_AI_KEY_4` |

Expected result:

- Four real QA keys belong to `menulist-qa`, are API-restricted, and are
  recoverable from the vault.
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
4. Vault and map the same QA values to:
   - `MENULIST_UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_URL`
   - `MENULIST_UPSTASH_REDIS_REST_TOKEN` and `UPSTASH_REDIS_REST_TOKEN`
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
   `MENULIST_RAZORPAY_WEBHOOK_SECRET` / `RAZORPAY_WEBHOOK_SECRET`. This value is
   not the Razorpay API key secret.
5. Record the env mapping:
   - `MENULIST_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_ID`, and
     `NEXT_PUBLIC_RAZORPAY_KEY_ID` use the same test key id.
   - `MENULIST_RAZORPAY_KEY_SECRET` and `RAZORPAY_KEY_SECRET` use the test key
     secret and stay server-only.
   - `MENULIST_RAZORPAY_WEBHOOK_SECRET` and `RAZORPAY_WEBHOOK_SECRET` use the QA
     webhook secret and stay server-only.
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
3. Copy the QA DSN. Because local and staging share the QA family, map that DSN
   to `SENTRY_DSN`, `SENTRY_DEV_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, and
   `NEXT_PUBLIC_SENTRY_DEV_DSN` in their correct server/public env locations.
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
7. Map the values to `MENULIST_WHATSAPP_PHONE_NUMBER_ID`,
   `MENULIST_WHATSAPP_ACCESS_TOKEN`, `MENULIST_WHATSAPP_APP_SECRET`, and
   `MENULIST_WHATSAPP_VERIFY_TOKEN` for local/Vercel only when needed, and to
   Function Secret Manager names without the `MENULIST_` prefix in Phase H.
8. Keep `ENABLE_MESSAGING_ONBOARDING=false`. Do not register the production
   webhook, send live messages, or add a live number during this QA setup.

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
5. Keep compatibility aliases only where the existing env template lists them.
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

8. In Vercel Preview for exact branch `staging`, use the hosted values below:

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
| Firebase browser current aliases | Matching `NEXT_PUBLIC_FIREBASE_*` values; optional Realtime Database and Measurement ID rows stay absent unless those services are actually configured |
| Firebase server canonical | `MENULIST_FIREBASE_PROJECT_ID`, `MENULIST_FIREBASE_STORAGE_BUCKET`, `MENULIST_FIREBASE_API_KEY`, `MENULIST_FIREBASE_CLIENT_EMAIL`, `MENULIST_FIREBASE_PRIVATE_KEY`, `MENULIST_FIREBASE_PROJECT_LOCATION=us-central1` |
| Firebase server current aliases | Matching `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_API_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_PROJECT_LOCATION=us-central1` |
| Gemini | `MENULIST_GEMINI_AI_KEY` plus `_2`/`_3`/`_4`, matching `GEMINI_AI_KEY` plus `_2`/`_3`/`_4`, and `MENULIST_GEMINI_SPEND_LIMIT_USD_10M` |
| Razorpay Test | `MENULIST_RAZORPAY_KEY_ID`, `MENULIST_RAZORPAY_KEY_SECRET`, `MENULIST_RAZORPAY_WEBHOOK_SECRET`, matching `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and `NEXT_PUBLIC_RAZORPAY_KEY_ID` |
| Upstash | `MENULIST_UPSTASH_REDIS_REST_URL`, `MENULIST_UPSTASH_REDIS_REST_TOKEN`, and matching `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Sentry | `SENTRY_DSN`, `SENTRY_DEV_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DEV_DSN`; add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` only when source-map upload is configured |
| App/worker secrets | `MENULIST_OWNER_REFERRAL_TOKEN_SECRET`, `REVALIDATION_SECRET`, `BATCH_IMAGE_GENERATION_WORKER_SECRET` |
| Cloud Tasks | `BATCH_IMAGE_GENERATION_WORKER_URL=https://app.menulist.digital/api/image-generation/batch-generation`, `BATCH_IMAGE_GENERATION_QUEUE_ID=batch-image-generation` |
| Meta/WhatsApp | Canonical `MENULIST_WHATSAPP_*` and matching `WHATSAPP_*` values only when testing the Next.js messaging/phone flow; Function Secret Manager values remain required by Phase H |

10. Leave every `ANSWERLATTICE_*`, `CAMPAIGNCUE_*`, `SIGNALDESK_*`,
    `MYCODEX_*`, and matching `NEXT_PUBLIC_*` sister-product key absent. The
    startup validator permits an entirely absent sister-product Firebase family
    but rejects partial product configuration.
11. Check the actual local env for unresolved placeholders without printing any
    configured values:

```bash
awk -F= '$2 ~ /^<.*>$/ {print $1}' .env.local
```

Expected output: no variable names.

12. In Vercel, review values directly because the checked-in example is only a
    key inventory. Confirm each sensitive value says **Preview** and exact Git
    Branch `staging`.
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

- Local and branch-restricted Vercel Preview env use the `menulist-qa`
  configuration family; emulator-first local tests do not create a third
  deployed environment.
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
- `GEMINI_AI_KEY_4`
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
firebase functions:secrets:set GEMINI_AI_KEY_4 --project menulist-qa
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

#### Razorpay Test Webhook

1. Open https://dashboard.razorpay.com/ and confirm the dashboard still says
   **Test Mode**.
2. Add this exact webhook URL:

```text
https://app.menulist.digital/api/razorpay/webhook
```

3. Enter the distinct QA webhook signing secret created in Step 5.3. Do not use
   the Razorpay API key secret.
4. Subscribe only to the event families handled by the current route:
   `order.paid`, `payment.failed`, `payment.refunded`, `refund.processed`,
   `subscription.pending`, `subscription.halted`, `subscription.activated`,
   `subscription.charged`, `subscription.completed`,
   `subscription.cancelled`, `subscription.paused`, `subscription.updated`, and
   `subscription.resumed`.
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
- Production project `menulist` remains unchanged.

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

After this gate passes, create the separate MenuList production setup guide and
repeat the process for production domains and production provider keys.
