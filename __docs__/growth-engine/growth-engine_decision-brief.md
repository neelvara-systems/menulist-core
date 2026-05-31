# Growth Engine - Decision Brief

**Status:** Active planning decision
**Decision date:** May 31, 2026
**Recommended path:** Same repo, separate product boundary, separate Firebase/functions/runtime data.

---

## Short Recommendation

Do not clone MenuList.

Do not build Growth Engine as a normal MenuList feature.

Build it in the same repo as a separate product module with isolated folders, isolated Firebase targets, isolated Cloud Functions, and a narrow MenuList integration contract.

## Why Same Repo Is Correct Now

Growth Engine depends on current MenuList onboarding routes, attribution feedback, auth patterns, rate limiting, secure logging, feature flags, and product-domain discipline. Keeping it in the same repo avoids stale copies of those contracts.

The repo already has multi-product rules that require product-scoped folders for non-MenuList products and shared infrastructure only where appropriate. Evidence:

| Repo truth | Evidence |
| --- | --- |
| Product IDs are centralized and immutable once added | `src/constants/product.ts:1-21` |
| Product domain routing is centralized by product site | `src/constants/productDomains.ts:1-22`, `src/constants/productDomains.ts:59-117` |
| Current deployment target matrix only includes MenuList, Answerlattice, and MyCodex | `src/constants/deploymentTargets.ts:10-98` |
| Multi-product file organization requires product subfolders | `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md:995-1031` |
| GrowthOS is already locked as a MenuList add-on, not a standalone acquisition system | `__docs__/growthos-addon/README.md:1-8`, `__docs__/growthos-addon/README.md:54-82` |

## Why Not Clone

Cloning looks clean for a week and becomes expensive after that.

| Problem | Impact |
| --- | --- |
| Auth and security drift | Outreach operators may get weaker checks than MenuList admin surfaces. |
| Onboarding route drift | Growth links can point to outdated flows or lose attribution events. |
| Duplicate Firebase helpers | Cost controls, secure logging, and validation patterns split. |
| Duplicate product-domain logic | Host routing bugs become likely when MenuList changes. |
| Duplicate docs/rules | Future agents may implement conflicting product boundaries. |
| Slower feedback loop | Lead conversion depends on exact MenuList onboarding completion events. |

Clone only when Growth Engine becomes externally sold, has an independent team, or needs a hard repository boundary for security/compliance.

## Why Not Normal MenuList Feature

Growth Engine handles cold or semi-cold outreach, lead PII, suppression evidence, message histories, provider credentials, campaign caps, and compliance incidents.

That data does not belong in MenuList owner/customer runtime.

If built as a MenuList feature, it would create the wrong mental model:

```txt
MenuList owner product = public business truth
Growth Engine = internal acquisition operations
```

Those should integrate, not merge.

## Recommended Architecture Shape

```txt
Product code: GE
Docs: __docs__/growth-engine/
App routes: src/app/(growth-engine)/growth-engine/
Website route: none at launch; src/app/sites/growth-engine/ only if public/internal site is approved
API routes: src/app/api/growth-engine/
Types: src/types/growth-engine/
Lib: src/lib/growth-engine/
DAL: src/database/growth-engine/
Constants: src/constants/growth-engine/
Hooks: src/hooks/growth-engine/
Components: src/components/templates/growth-engine/
Firebase client: src/lib/firebase/growthEngineFirebaseClient.ts
Functions: functions-growth-engine/
Firestore project QA: growth-engine-qa
Firestore project prod: growth-engine
MenuList integration: tracked onboarding route creation + feedback event ingestion only
```

## Product Boundary

Growth Engine owns:

- lead source runs
- lead normalization and dedupe
- lead fit scoring
- channel identity and eligibility
- campaign dry runs
- campaign approvals
- message templates and guardrails
- channel execution jobs
- inbox and reply classification
- DNC, unsubscribe, wrong-number, complaint handling
- onboarding route attribution
- campaign/source/channel summaries
- cost and safety control room

MenuList owns:

- onboarding UX
- menu creation
- business verification
- owner account activation
- public menu and official business page truth
- QR, screens, PDFs, customer pages
- billing and subscriptions

The only approved bridge is:

```ts
createGrowthRoute({
  leadId,
  onboardingFlowId,
  attribution,
  prefill,
}) => trackingUrl

recordGrowthFeedback({
  routeId,
  eventType,
  onboardingFlowId,
  occurredAt,
  metadata,
})
```

## ChatGPT Conversation Verdict

The attached conversation is directionally useful but too broad if implemented literally.

Accepted:

- artifact-first outbound is stronger than generic cold outreach
- lead data must be normalized, deduped, scored, and suppressed before sending
- dry-run mode is mandatory
- WhatsApp should start assisted, not bulk automated
- Firestore must use summary docs and bounded queries
- BigQuery should handle heavy analytics
- DNC/complaint handling must be first-class

Modified:

- "AI website demos" becomes "private/noindex claim or audit artifact" only when source rights and accuracy allow it
- Google Maps scraping becomes "source adapter candidate input," not source of truth
- omnichannel becomes email-first plus WhatsApp-assisted, with Instagram/Messenger inbound or warm-only until policy is proven
- AI autonomy becomes typed, evaluated, and approval-gated

Rejected:

- mass-generate public demo websites
- rehost Google Maps photos, reviews, menus, or profile content
- treat scraped data as MenuList truth
- start with all channels at once
- send without suppression, dry run, approvals, and kill switches

## Final Decision

Build Growth Engine as internal acquisition infrastructure in the same repo, with separate product identity and runtime boundaries.

This gives us integration speed without product contamination.
