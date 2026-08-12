# Proof & State Identity And Privacy

**Status:** Mandatory privacy gate
**Last Updated:** August 12, 2026

## Governing Boundary

Proof & State is publicly pseudonymous. The public must not be given a reliable
path from the alias to the founder's original identity.

This does not promise anonymity from the platforms. Platform operators may
privately retain email, phone, device, IP, location, payment, or identity
information and may request verification or recovery evidence.

## Never Public

- legal or personal name, face, natural voice, signature, age, or personal bio;
- personal email, phone, address, precise location, personal social accounts,
  family, employer, school, or routine;
- personal Git author identity, personal GitHub account, raw commit history,
  local username, home directory, hostname, device name, or notification data;
- customer names, tenant IDs, raw conversations, support material, credentials,
  tokens, private URLs, active vulnerabilities, or exact abuse thresholds;
- photos with faces, reflections, landmarks, documents, license plates, QR
  codes, browser profiles, or recoverable EXIF/location metadata.

## Current Correlation Audit

| Surface | Finding | Decision |
| --- | --- | --- |
| X/Reddit handle | `proofandstate` produced no obvious web collision; direct public X and Reddit profile fetches returned unclaimed-style 404s on August 12, 2026 | Recheck and register manually; availability is not guaranteed until success |
| Instagram/Facebook handle | Public availability could not be confirmed reliably | Do not claim availability |
| Product websites | Targeted public search found no obvious founder-name result | Useful but not a complete ownership or registration audit |
| Repository source | No normal public page source was found exposing the workspace name; one disposable-domain dataset match was irrelevant | Continue screenshot and output review |
| Git history | Historical author metadata contains a personal-associated identity | Never link Proof & State to this repository or publish raw commit history |
| Domain/company correlation | Corporate records, WHOIS history, app stores, billing, analytics, support accounts, and provider ownership are not yet comprehensively cleared | Do not name or link the products from the alias yet |

Rewriting Git history is not authorized and is not required. The safe decision
is simply not to link the alias to the private repository.

## Account Setup Checklist

Perform these steps manually for each admitted platform:

1. Recheck the exact handle on the platform at registration time.
2. Use the display name `Proof & State`; do not invent a human name.
3. Use a dedicated private recovery email that does not contain or forward to a
   publicly discoverable personal identity.
4. Use a unique password and authenticator or hardware-key 2FA. Preserve
   recovery codes offline; a password manager must not be the sole recovery
   path.
5. Do not upload contacts. Deny contact-book permission and disable discovery
   by phone/email where the platform exposes those controls.
6. Do not connect personal Facebook, Instagram, Google, Apple, GitHub, or other
   social logins merely for convenience.
7. Upload the approved non-human avatar and banner. Do not use an AI-generated
   human face.
8. Do not add a location, birthday, personal site, product link, or personal
   profile link.
9. Review all public profile fields while logged out or in a separate viewer.
10. Save registration date, recovery method, and platform-private disclosures
    in a private account inventory; never in a public post.

Do not use a disposable email or false registration information. Durable
recovery and platform compliance matter more than pretending the platform has
no private identity information.

## Screenshot And Media Gate

Before any image, video, diagram, or file is published:

1. Use demo or sanitized data only.
2. Close unrelated tabs, sidebars, notifications, bookmarks, and account menus.
3. Remove local paths, usernames, hostnames, email, avatars, repo remotes,
   commit authors, timestamps that expose routine, and unique internal IDs.
4. Remove EXIF, GPS, author, software, and document metadata.
5. Inspect reflections, background screens, QR codes, browser profile icons,
   and terminal prompts.
6. Export a clean derivative; do not upload the original source file.
7. Open the exported file independently and run the privacy review again.
8. Record whether the artifact is example, local proof, deployed proof,
   measured result, or inference.

Natural voice is not used while the zero-original-identity rule remains. Use
captions, diagrams, cursor-led screen capture, or a separately reviewed
synthetic narration only when needed.

## Product Connection Gate

Before Proof & State names or links MenuList, Answerlattice, Neelvara, a domain,
an app-store listing, a repository, or a public founder hub, review:

- corporate and domain ownership records;
- public site legal/privacy/contact pages;
- app-store developer identity;
- GitHub organization, contributors, commit metadata, issues, and releases;
- analytics, support, changelog, documentation, and status-page identities;
- public certificates, archives, social accounts, and search results;
- whether the connection itself makes the alias-to-person mapping obvious.

The result must be `safe`, `safe with named redactions`, or `blocked`. Unknown
means blocked.

## Platform Identity Facts

- X explicitly permits pseudonymous accounts, but prohibits deceptive
  manufactured identities, impersonation, and platform manipulation.
- Reddit permits participation without a real-name public identity.
- Instagram says identity need not be publicly disclosed, but registration
  information supplied to Meta must be accurate and current.
- Facebook requires a Page manager to use an authentic private profile and may
  expose Page manager country or confirmed owner details through Page
  Transparency.

See the [research ledger](./founder-public-presence_research-ledger.md) for
checked sources and dates.

## Visual Assets

| Asset | Canonical path | Use |
| --- | --- | --- |
| Avatar | `assets/proof-and-state-avatar.png` | X, Reddit, and later admitted channels |
| X banner | `assets/proof-and-state-x-banner.png` | X launch profile |

The mark is four measured corners around one cobalt evidence point: proof inside
bounded state. Do not add a face, mascot, verification badge, crypto styling,
or unrelated logo variant.
