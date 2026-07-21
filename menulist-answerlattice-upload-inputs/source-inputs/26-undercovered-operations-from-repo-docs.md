# MenuList Undercovered Cross-System And Operational Support

**Verified:** 2026-07-20 against current MenuList runtime, maintained feature docs, feature flags, and cross-system audits.

## Purpose

This source closes support gaps that do not fit neatly into one screen. These flows are frequent causes of incorrect support answers because they cross project, store, public, mobile, billing, AI, localization, provider, or account boundaries.

## Project Mutation, Publish, And Public Cache

Support facts:

- The selected project/menu is the authoritative editable menu.
- Owner success requires an acknowledged project/store write.
- Save and publish paths validate current menu/pricing structure before persistence.
- Public-truth writes invalidate the MenuList public menu/Official Business Page cache through the owning client/server path.
- Configured Digital Screens receive the existing content-version update where required.
- A failed post-commit refresh effect must not be described as a rolled-back save; support should distinguish committed truth from an effect that is still pending.
- Old downloaded PDFs/cards/print files cannot change after download. Stable QR/public links can continue to resolve current live truth.

Owner answer:

> Save the change, confirm the correct menu and location, wait for the public page to refresh, and reload the customer link. If the saved owner view is correct but the public view remains wrong, contact support.

Do not expose Firestore, cache tags, summary documents, invalidation endpoints, or internal retries.

## Menu Extraction And Intake Identity

MenuList can accept supported menu photos, PDFs, direct public menu/PDF/image links, and manual entry through authenticated owner flows.

The intake identity check may warn about:

- another business or outlet;
- a special menu;
- non-menu or incomplete pages;
- changed business name, phone, address, or type.

The owner may continue only after confirming the source is correct. Extraction prepares a draft; review/apply/publish remain separate. Storage/provider/quota failure must not be described as a completed extraction.

## Description Generation

- First-pass description preparation for a new item is platform-absorbed under the current policy.
- Rewriting an existing description uses the current public credit rate.
- Requests are batched safely; the project save is all-or-nothing for the owner flow even if an earlier provider request produced a valid recorded operation.
- Incomplete, extra, malformed, unknown-item, or oversized provider output fails before menu persistence.
- Provider-only item aliases prevent raw project item IDs from entering prompts.
- The owner reviews generated wording and remains responsible for factual claims, ingredients, allergens, dietary notes, benefits, and rights.

## Menu Translation And Public Language

- Translation requests are authenticated, rate limited, project/location scoped, body bounded, and linked-outlet policy checked.
- One request can contain at most five target languages.
- Menu/entity translation needs a real project ID; store-only business copy has a narrower path.
- A batch succeeds only when every requested language/field has valid coverage. Extra provider keys are discarded and incomplete results are not presented as fully saved.
- Public rendering uses requested language, then English, then another available approved localized value.
- Translation requests can create multiple charged operations because work is recorded per request/batch, not one charge for a whole language-selection gesture.
- Public fixed UI chrome is separate from menu/business content translation.

Do not translate prices, allergens, availability, legal terms, or service promises by inference.

## Image Generation, Image Editing, And Media

- Owner image uploads are validated, resized/framed/compressed, and stored using safe scoped media paths.
- Eligible generated images/edits show the exact credit estimate before work.
- Non-cache work reserves credits before provider work, settles successful output, and restores exact reserved buckets on terminal failure.
- Prompt-cache hits are zero-credit operations.
- Batch jobs are scoped to the exact tenant/store/project and keep owner reviewable results.
- Provider bytes are prepared before public storage; raw base64/provider responses do not belong in Firestore/support answers.
- The owner can accept selected images, discard, cancel, or retry within the current job rules.
- A generated image is not public until the owner accepts it and the owning menu/store save succeeds.

## AI Menu Manager

AI Menu Manager answers selected-menu questions and prepares supported registered actions. It is not a generic autonomous agent.

Support facts:

- deterministic routing is preferred;
- a bounded provider planner can classify unresolved in-domain owner language;
- provider output is not an executable patch;
- one command may create several non-conflicting proposal cards;
- approval uses current exact store/project/menu scope;
- a stale proposal fails when the menu changed after preparation;
- grouped approved updates use one existing project save and compact receipts;
- image/import/publish/rule/staff/special-menu families stay behind their current adapter readiness and handoff boundaries.

## AI Credits And Transactions

Current public content-credit rates:

- description rewrite: 1;
- generated menu image: 5;
- language addition: 3;
- item translation: 1;
- image translation: 5;
- image edit: 5.

The owner sees exact purchased Pack balance and the credits required/used by eligible actions. The owner does not see provider cost, margin, internal monthly allowance, overdraft, prompt/response bodies, or secret model/accounting data.

The accounting state machine is:

```text
admit and reserve -> provider work -> validate output -> settle
terminal failure -> restore exact reserved buckets once
```

If Transactions shows failure without restored credits, or success without usable owner output, escalate with the operation time/type but do not request raw prompts or private IDs.

## Today, Setup Progress, And Business Health

- Today is the primary day-to-day owner view.
- Menu Setup Progress is computed from the selected loaded project, store truth, quality signals, publication, and activation evidence.
- Optional descriptions, images, translations, and official-page improvements do not keep required setup open after the required path is complete.
- Business Health is read-only: it explains current health, public readiness, analytics, feedback, and supported questions from bounded read models.
- Menu Manager owns supported change preparation. Business Health cannot mutate menu, store, staff, billing, outlet, or public truth.

## Menu Presence And Public Truth Tools

- Menu Presence is a checklist of places where the owner placed the official link/QR/screen/feedback surface.
- Manual confirmation proves the owner marked the placement; it does not prove Google, Instagram, WhatsApp, or another provider currently displays it.
- Public Truth Tools are browser-local/read-first diagnostics unless the specifically gated monitor history is active.
- Shareable reports are unsigned self-reports and must say so.
- No tool promises ranking, AI citation, external scan, provider verification, or automatic correction.

## Working Hours, Timezone, And Temporary Status

- Weekly hours are owner-maintained store truth.
- Open/closed display uses the business timezone and validated time ranges, including overnight boundaries.
- Mobile Today edits the current weekday in the store timezone.
- Temporary Status is the one-off closure/opening-late/custom-notice path and expires from its saved boundary.
- Holiday calendars and date-specific exception managers are not shipped.

If public status is wrong, check the exact selected location, business timezone, weekly hours, Temporary Status, and current cache window.

## Owner And Public Localization

- Owner desktop and MobileShell use the same normalized locale, timezone, date/time, number, currency, and direction boundary.
- Current checked-in owner packs are key-exact across the maintained locale registry.
- Public fixed customer chrome follows the store language where a dedicated reviewed pack exists.
- Menu/business content can use a broader public language registry; fixed chrome falls back to English when that content language has no UI pack.
- No runtime provider translates fixed chrome.
- Unknown/invalid locale, timezone, date, or direction data fails to safe normalized/fallback behavior.

If a saved language is correct but a surface renders the wrong meaning/direction, record the language, surface, and selected location and escalate.

## Owner PWA, Connectivity, Accessibility, And Failure Recovery

- Mobile owner features reached from Today, Menu, Share, or More stay inside MobileShell.
- Private owner/auth/screen resources are not runtime-cached as an offline source of truth.
- Connectivity is advisory and non-blocking; current truth still requires a connection.
- Owner app updates require explicit refresh.
- Maintained screens preserve zoom, keyboard focus, reduced motion, accessible names, image alternatives, and owner-sized touch controls.
- Error recovery says exactly whether it retries, refreshes, opens Help, prepares details, or confirms a monitoring event.
- Ordinary recovery does not clear all browser caches or claim that support is already working on the incident.

## Account, Staff, Ownership, And Dormancy

- Logout attempts Firebase and NextAuth teardown, then clears owner browser/session state once the signed session ends.
- Staff removal from the last store deactivates that staff access and revokes current sessions through the managed flow.
- Owner role grants operational permissions; it does not transfer the business account, billing, notification recipients, or subscriptions.
- Complete ownership transfer requires verified authority and support review.
- Stale-menu or dormant signals are advisory. They do not silently deactivate store, account, subscription, entitlement, or public menu.
- Full account access/correction/portability/deletion is support-managed. Menu/project downloads are not a complete legal account export.

## Multi-Location And External Identity

- Master truth and outlet overrides remain separate, exact-location records.
- Outlet policy controls which local fields can differ.
- Billing can be direct to the selected store or inherited from HQ; mutation authority depends on the direct billed store.
- An owner-entered Maps URI is not automatically a stable Place ID.
- A confirmed external Place ID needs attributable evidence and owner confirmation on the exact location.
- External identity is internal, reversible, non-propagating, and excluded from ordinary public output.
- Similar name/phone/address data does not authorize automatic location merge.

## Special Menu, Communication, Staff Reference, And Screens

- Special menus can schedule a bounded temporary menu and return to regular menu; overlapping schedules are blocked.
- Communication templates prepare current-link/address/hours messages for copy/share and do not become campaign automation.
- Staff Prompt is a simplified current-menu reference, not a public customer page.
- Digital Screens read current menu/screen configuration through the existing link; there is no separate screen CMS.
- Customer App is an installable current-menu shortcut, not a native store app or permission to show stale offline menu truth.

## External Menu Sync, Public API, GBP, Reviews, And Experiments

- External Menu Sync sends one signed full-menu snapshot to a configured provider/developer URL after approved menu changes.
- The receiver applying that snapshot is outside MenuList's guarantee.
- Platform Pull API is scoped/key/rate limited and read-only for current business/menu truth.
- GBP posting, Reviews/Reputation, and AI Reply Assist remain disabled or dormant experiments.
- QR/WhatsApp experiments and communication helpers do not imply external posting, campaign automation, delivery, ranking, or read receipts.
- Owner Referral remains disabled outside an explicit approved pilot/allowlist.

## Allergen And Regulated Truth Boundary

MenuList does not allow AI extraction/generation to become an approved allergen, ingredient, dietary, price, availability, legal, or accessibility assertion without responsible owner review. Future schema/governance work may prepare those fields, but QR-only compliance, automatic allergen publication, and legal certification are not current product promises.

## Internal And Separate-Product Exclusions

Do not expose internal platform cost, scheduler, SAFE_MODE, alert, reseller, or recovery controls as owner features.

Do not blend Answerlattice, CampaignCue, GrowthOS, KitStamp, MyCodex, Canonica, SignalDesk, Neelvara, SurfaceOS planning, or other sibling-product capabilities into MenuList answers. Shared repository or infrastructure does not make their product behavior part of MenuList.

## Escalation Boundary

Answer the ordinary navigation/workflow only from reviewed truth. Escalate when:

- public price, availability, hours, location, language, or customer output remains wrong;
- access, ownership, privacy, deletion, transfer, billing, or security is involved;
- provider/storage/quota/deployment state blocks a live workflow;
- paid AI credits or output state do not reconcile;
- an integration/external location/provider is involved;
- feature availability depends on an unverified flag, plan, role, allowlist, or account state;
- the package lacks an approved canonical answer.
