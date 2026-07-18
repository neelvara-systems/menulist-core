# External Menu Sync — Approved Positioning

> **Audience:** Founder, sales, support, content
> **Status:** Internal claim boundary, not a launch proof
> **Last reviewed:** July 16, 2026

## Approved one-line description

MenuList can send a signed full-menu snapshot to a connected store system that provides a compatible public HTTPS endpoint.

## When to mention it

Mention External Menu Sync only when a prospect or customer already has a provider, developer, agency, website, ordering system, or POS team able to receive webhooks. It is supporting operations proof, not the lead MenuList promise.

## Approved value points

- MenuList remains the menu source.
- The receiving team gets one current full snapshot instead of a partial delta.
- Each request is signed and versioned.
- Owners can test the destination and see recent attempts.
- Each outlet controls its own destination.
- The setup secret is protected behind integration permission.

## Accurate explanation

After an acknowledged project save, the open MenuList app waits briefly and makes one delivery attempt to the configured endpoint. The receiver must verify the signature and apply the payload. MenuList records whether the endpoint accepted the request.

## Required qualification

Before presenting the feature as usable, ask:

1. Does the receiving system provide a public HTTPS webhook URL?
2. Can its technical team implement MenuList's JSON and HMAC headers?
3. Will they confirm a test and actual application?
4. Is the owner willing to configure each outlet separately?

If any answer is unknown, position it as a technical compatibility check, not an available vendor integration.

## Approved sales answers

**Does this work with my POS?**
It can work when your POS provider or developer gives you a public HTTPS endpoint and implements MenuList's signed full-menu snapshot. We confirm compatibility through a connection test; we do not claim every POS is supported.

**Is it real-time?**
No. The open app combines rapid project saves for 25 seconds, then makes one attempt.

**Does MenuList retry?**
No automatic retry is active. The next acknowledged project save sends the latest full snapshot.

**Does success mean my POS updated?**
Success means the endpoint returned a 2xx response. The provider must confirm it applied the menu.

**Can one master connection update all outlets?**
No. Each outlet has its own connection and must be configured/tested separately.

**Does MenuList email my provider?**
MenuList prepares an email draft on the owner's device. The owner sends it.

## Forbidden claims

Do not say:

- works with any POS;
- Petpooja, DotPe, Foodics, Square, Toast, or another named vendor is supported without certification;
- real-time sync;
- guaranteed delivery;
- automatic retries;
- always updated or stays updated forever;
- no integration work required;
- enterprise-grade or bank-grade;
- every outlet updates automatically;
- no mismatches or errors;
- bidirectional sync;
- Google Business Profile sync;
- the receiver applied a request because it returned 2xx.

## Website posture

Until a real provider cohort and repeatable production smoke exist, the main website may use only low-prominence copy such as:

> Need to pass your menu to another system? A compatible provider or developer can receive a signed full-menu snapshot from MenuList through a store-level HTTPS connection.

Do not create logo walls, vendor compatibility tables, reliability percentages, setup-time claims, savings claims, or customer outcome claims without evidence.

## Pricing posture

The code does not enforce a separate POS add-on price. Do not promise permanent free inclusion. Pricing statements must come from the current billing/pricing source of truth at the time of sale.

## Proof required before stronger positioning

- named provider approval;
- staging and production delivery/application proof;
- owner/provider support runbook exercised;
- measured success/failure volume;
- confirmation of app-open/debounce limitations;
- legal/security approval for public provider naming.
