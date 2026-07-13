# MenuList Publisher And AI Distribution Readiness

**Status:** Pre-application dossier ready; no provider access or integration authorized
**Created:** July 10, 2026
**Owner:** Founder
**Scope:** Google Business Profile, Apple Business, Bing Places, and future read-only AI discovery providers
**Related actions:** MLD-R016, MLD-I006, MLD-I007

## Purpose

This dossier defines what MenuList must prove and control before applying for publisher API access, acting as a third-party profile manager, or entering a direct AI-discovery partnership.

It does not authorize provider account creation, API access requests, OAuth setup, profile writes, automatic sync, AI ordering, or public partnership claims.

## Current MenuList Baseline

MenuList already has the correct first-party discovery foundation:

- owner-approved public HTML;
- category-aware schema.org JSON-LD;
- `LocalBusiness`, `Menu`, `MenuItem`, `OfferCatalog`, `Offer`, `Product`, and `Service` output where applicable;
- stable public business and customer-list URLs;
- sitemaps, robots policy, canonical rules, and LLM context files;
- owner-confirmed Google Business Profile, Apple Business, Bing Places, Instagram, and WhatsApp placement signals;
- no claim that an external provider automatically accepted, refreshed, indexed, ranked, or verified MenuList data.

Current public contract evidence:

- `src/lib/schema/index.ts:385-406`
- `public/llms.txt:3-29`
- `src/types/platform/store.ts:721-730`

## Provider Position

| Surface | Current MenuList behavior | Future readiness question | Current decision |
| --- | --- | --- | --- |
| Google Business Profile | Owner places/confirms the appropriate MenuList link manually | Can MenuList qualify for approved API access and meet third-party consent, ownership, reporting, support, and revocation duties? | Keep manual; prepare only |
| Apple Business | Owner places/confirms the MenuList link manually | Is direct or partner-mediated Shared API Access appropriate, and can owner delegation be implemented safely? | Keep manual; prepare only |
| Bing Places | Owner places/confirms the MenuList link manually | Is there a current supported provider path that fits MenuList's data authority and support capacity? | Reverify official path before implementation |
| Search and general AI crawlers | Public HTML, JSON-LD, sitemaps, robots, and LLM files | Do providers need anything beyond first-party crawlable truth? | Maintain current public contract |
| Direct AI provider integration | None | Is a read-only discovery partnership available that preserves owner authority and does not require MenuList checkout/order ownership? | Watch; no integration |
| UCP or agentic commerce | None | Does MenuList become the order/checkout authority? | No; reject commerce implementation |

## Primary Provider Sources

Use current official sources again immediately before any application or implementation because programs and requirements can change.

### Google

- Business Profile performance: https://support.google.com/business/answer/9918094?hl=en
- Business links policies and crawlability: https://support.google.com/business/answer/13769188?hl=en
- Third-party policies: https://support.google.com/business/answer/7353941?hl=en-GB
- Business Profile API basic setup: https://developers.google.com/my-business/content/basic-setup
- LocalBusiness structured data: https://developers.google.com/search/docs/appearance/structured-data/local-business

### Apple

- Apple Business: https://business.apple.com/
- Partner directory: https://business.apple.com/partners
- Custom Action Links: https://businessconnect.apple.com/promote/assets/custom-action-links.pdf

### AI Distribution

- Square's July 2026 ChatGPT/Claude integration example: https://squareup.com/us/es/press/claude-chatgpt-integrations
- Universal Commerce Protocol: https://ucp.dev/

## Universal Authorization Contract

No provider integration may proceed until all fields below have an approved answer.

| Control | Required decision |
| --- | --- |
| Business authority | Which owner/authorized representative may connect the profile? |
| Consent action | What explicit positive action grants MenuList access? |
| Permission scope | Which locations, fields, and operations are allowed? |
| Provider ownership | How does the owner retain provider ownership/co-ownership and direct access? |
| Data authority | Which MenuList source is authoritative for each field? |
| Conflict handling | What happens when provider data differs from MenuList? |
| Preview and approval | Which changes require owner review before provider write? |
| Audit | What actor, source, previous value, new value, provider result, and time are recorded? |
| Reporting | How are provider-specific metrics kept distinct from MenuList analytics? |
| Revocation | How can the owner disconnect immediately? |
| Offboarding | How are permissions removed and provider control returned? |
| Support | Who handles failed writes, rejected links, suspensions, and account warnings? |
| Retention | What provider tokens, IDs, results, and error data are kept, and for how long? |
| Cost | What API, support, storage, monitoring, and retry cost is acceptable? |
| Incident response | What stops writes when credentials, ownership, or provider policy is uncertain? |

## Data Authority Matrix

The exact provider schema must be mapped during feature documentation. This initial matrix fixes the authority principle.

| Public field | MenuList authority | Provider conflict rule |
| --- | --- | --- |
| Business name | Owner-approved store identity | Hold and ask owner when materially different |
| Location/address | Owner-approved location record | Never overwrite provider-verified location silently |
| Hours | Owner-approved current hours and temporary status | Hold stale/conflicting change for owner review |
| Menu/service/catalog URL | Current MenuList public customer link for that location | Must be dedicated, crawlable, and location-correct |
| Menu/service facts | Owner-approved published project/menu | Do not infer missing price, availability, or claim |
| Phone/contact | Owner-approved business contact | Do not import personal or unapproved contact data |
| Ordering/reservation link | Owner-approved external provider link | MenuList does not become transaction authority |
| Social links | Owner-confirmed public profiles | No auto-discovery write without owner approval |
| Photos/logo | Owner-supplied or licensed media | Do not republish without rights and provider-fit review |

## Google Readiness

Before Google Business Profile API or third-party management work:

1. Confirm the legal MenuList entity and provider-facing company identity.
2. Recheck the current API access application, project approval, API enablement, and OAuth requirements.
3. Create explicit business-owner consent and revocation UX.
4. Preserve owner ownership/co-ownership and direct profile access.
5. Share required third-party disclosures before managing a profile.
6. Use a dedicated landing page for the exact location and intended action.
7. Verify the URL returns a successful response and loads without login, CAPTCHA, geoblocking, or blocked crawler resources.
8. Keep Google-specific performance data identifiable and accessible separately from other analytics.
9. Define support for rejected links, duplicate provider links, profile suspension, and ownership disputes.
10. Never promise rankings, permanent appearance, or guaranteed refresh timing.

Messaging links, social pages, app-store links, and link shorteners must not be used as transaction/action links where Google's business-link policy disallows them. The correct MenuList page depends on the provider field and business action.

## Apple Readiness

Before direct or partner-mediated Apple Business access:

1. Recheck current Apple Business organization verification and API/partner eligibility.
2. Decide whether MenuList applies directly or works through an approved Shared API Access partner.
3. Require explicit business delegation before an API partner acts for a business.
4. Define location-level access, field scope, revocation, and support ownership.
5. Use the owner-approved public destination appropriate to the custom action.
6. Do not add UTM parameters where Apple's current Custom Action Links specification disallows them.
7. Keep Apple insights and provider status distinct from MenuList analytics.
8. Do not claim Apple partnership until a signed/approved relationship exists.

## Bing Readiness

MenuList currently uses owner-confirmed placement only. Before any Bing provider work:

1. Recheck current official Bing Places management and bulk/provider paths.
2. Confirm country, category, and business eligibility.
3. Apply the same owner-consent, field-authority, audit, revocation, and support controls.
4. Do not infer that Google or Apple permissions extend to Bing.
5. Do not build against an unofficial or stale API path.

## Direct AI Discovery Readiness

Square's current integration is evidence that provider relationships can expose current business/menu data inside AI experiences. It is not evidence that MenuList has access to those provider programs.

A MenuList-fit direct AI contract must be:

- read-only for public owner-approved business truth;
- location- and source-aware;
- explicit about freshness and missing fields;
- unable to edit MenuList owner truth;
- unable to create orders, bookings, payments, or claims unless a separately approved external provider owns that transaction;
- measurable by provider/source without exposing customer identity;
- revocable by the business owner;
- free from ranking, recommendation, citation, or placement guarantees.

Reject:

- UCP checkout or order ownership;
- MCP tools that write menu, price, hours, billing, or owner settings;
- autonomous provider profile changes;
- inferred dietary, allergen, medical, availability, or price claims;
- an AI-specific duplicate database of public business truth.

## Provider Application Packet

Prepare this packet only when the evidence gate passes.

| Item | Required content | Current state |
| --- | --- | --- |
| Legal entity | Registered entity, address, and authorized signer | Founder input required |
| Product identity | MenuList public-business-truth description | Repo-ready |
| Domains | Production domains and callback domains | Production confirmation required |
| Privacy and terms | Current public policies and provider-specific disclosures | Provider review required |
| Security contact | Named contact and escalation path | Founder input required |
| Support contact | Profile/link failure response owner and hours | Founder input required |
| Data architecture | Owner-approved source, public output, token storage, audit, revocation | Feature docs required before implementation |
| Consent UX | Screens and exact owner authorization language | Not implemented |
| Offboarding UX | Disconnect and permission-removal process | Not implemented |
| Requested scope | Exact read/write fields and locations | Evidence-dependent |
| Expected volume | Number of businesses/locations and update cadence | Cohort evidence required |
| Test plan | QA tenant, provider sandbox/test path, negative cases | Provider-dependent |
| Incident process | Stop, alert, recover, and owner notification | Security review required |

## Evidence Gate

Do not apply for provider access merely because the technical foundation exists.

Proceed to provider eligibility review only when:

1. at least five permissioned businesses have activated;
2. at least three remain active at day 30;
3. owners repeatedly identify external profile placement or upkeep as a material problem;
4. the manual owner-confirmed workflow has measurable friction that provider access would remove;
5. a founder-owned support and incident path exists;
6. legal/security/cost review is authorized;
7. the requested provider scope can remain narrower than full profile management.

These are internal decision gates, not claims about provider acceptance.

## Implementation Gates

| Gate | Requirement | Current state |
| --- | --- | --- |
| 0. First-party truth | Public pages, schema, discovery files, and owner placement | Implemented |
| 1. Cohort evidence | Five activations, three day-30 active, repeated owner demand | Blocked on real cohort |
| 2. Provider eligibility | Current official program and application fit confirmed | Deferred |
| 3. Feature docs | Full spec, impl, Firebase/cost, security, mobile, help, website, tests | Not started by design |
| 4. Consent and revocation | Owner authorization, status, disconnect, and offboarding | Not started by design |
| 5. Provider integration | Smallest provider-specific implementation behind flag | Not authorized |
| 6. QA certification | Provider test, negative paths, ownership, revocation, retry, cost | Not authorized |
| 7. Production | Explicit deploy and provider launch approval | Not authorized |

## Owner-Facing Wording

Allowed current wording:

- "Use your MenuList link on Google, Apple, Bing, WhatsApp, Instagram, QR, print, or your website."
- "Mark the placement complete after you add it."
- "MenuList does not control when another platform refreshes or displays a link."

Blocked until a real provider integration exists:

- "MenuList syncs Google/Apple/Bing automatically."
- "MenuList is an official Google/Apple/OpenAI partner."
- "Your menu will rank or appear in AI answers."
- "MenuList updates every platform instantly."

## Current Decision

The dossier is complete. Keep current owner-confirmed placement and first-party machine-readable output. Do not apply for provider access or build integrations until the cohort evidence gate passes and the founder supplies legal, support, security, and application ownership.
