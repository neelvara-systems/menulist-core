# Website Asset Operating System

**Status:** Internal v1 implemented  
**Decision date:** May 31, 2026  
**Source:** ChatGPT asset-factory conversation reviewed against live repo doctrine  
**Decision:** Separate-product-style internal architecture, Answerlattice-adjacent, not a public market-facing product

---

## Product Decision

The ChatGPT conversation is useful, but the correct product boundary is narrower than the proposal.

**Website Asset Operating System is now built as an internal product architecture.** It is separate from MenuList and Answerlattice runtime behavior, but it is not a public market-facing product. It gives Codex a repo-native asset contract for generating, auditing, and refreshing website and marketing media for MenuList and Answerlattice without the founder restating product context every time.

It should live in this repo because it depends on:

- the current MenuList website implementation and asset requirements;
- the current Answerlattice website implementation and dark infrastructure visual system;
- product separation rules that prevent GrowthOS, VisualMeta, MenuList, and Answerlattice from blurring;
- existing docs, generated website assets, source screenshots, brand marks, and current code.

## Answerlattice Relationship

The practical home for this system is Answerlattice-adjacent, founder/operator/developer tooling.

Answerlattice answers: **what should users be told when they ask for help?**

Website Asset Operating System answers: **what should the website or product media show, and is that media still true?**

That makes AssetOS valuable beside Answerlattice's current knowledge intake, product surfaces, canonical answers, changelog/release context, feedback signals, drift governance, and readiness summaries. Those Answerlattice surfaces can inform asset briefs and stale-asset review.

The boundary stays strict:

- AssetOS may read Answerlattice docs, website files, product-surface summaries, release notes, and signal summaries as source context.
- AssetOS may turn that context into asset slots, briefs, fingerprints, audits, and founder-review decisions.
- AssetOS must not write Answerlattice KB, canonical answers, tickets, support signals, widget configuration, product surfaces, Firebase data, or runtime state.
- AssetOS must not become a generic helpdesk, CMS, chatbot, or public content studio.

## Why Not A Separate Product

| Test | Result |
| --- | --- |
| External buyer | Not proven yet. The first user is the founder/operator. |
| Product identity | Passes internally and becomes strongest when tied to Answerlattice's founder/operator/developer ICP. The product question is: what product media should exist, is it truthful, and how can Codex refresh it safely? |
| Current repo doctrine | Passes only as internal architecture. Public extraction remains blocked until a buyer and product boundary are proven. |
| VisualMeta overlap | Lower when scoped to source-grounded product-media governance. It becomes high again if it turns into broad content creation or campaign tooling. |
| GrowthOS overlap | Medium. Promotional outputs for SMBs belong to GrowthOS, but this system prepares MenuList/Answerlattice assets for our own sites. |
| Day-one revenue | Weak. It saves founder time before it creates sellable value. |
| Operational value | Strong. It gives Codex a durable asset contract, audit loop, brief generator, review script, and rejection rules. |

## Document Index

| Document | Audience | Purpose |
| --- | --- | --- |
| [ChatGPT Review](./website-asset-operating-system_chatgpt-review.md) | Founder / architect | External suggestion review, verdicts, product decision |
| [Spec](./website-asset-operating-system_spec.md) | Founder / PM | Plain-language scope, non-goals, requirements |
| [Implementation Plan](./website-asset-operating-system_impl.md) | Developers / Codex | File plan, scripts, manifests, validation |
| [Founder Usage Guide](./website-asset-operating-system_usage-guide.md) | Founder / operators | What it is, why it exists, where it lives, and how to use it |
| [Marketing](./website-asset-operating-system_marketing.md) | Internal strategy | Internal positioning, not public GTM |
| [Website](./website-asset-operating-system_website.md) | Website/content | Decision to avoid a public landing page now |
| [Helpdoc](./website-asset-operating-system_helpdoc.md) | Founder / operators | How to use the internal workflow after implementation |
| [Firebase Cost](./website-asset-operating-system_firebase.md) | Founder / cost review | Cost model and storage rules |
| [Mobile Support](./website-asset-operating-system_mobile-support.md) | Product / QA | Mobile relevance decision |
| [Test Cases](./website-asset-operating-system_test-cases.md) | QA / Codex | Audit, manifest, asset-slot, and docs tests |
| [Validation](./website-asset-operating-system_validation.md) | Founder / engineering | Implementation evidence and parity result |

## Current Evidence

| Evidence | Why it matters |
| --- | --- |
| `__docs__/strategy/product-universe-ssot.md:57` | Product universe already separates truth running, growth output, and content preparation. |
| `__docs__/strategy/product-universe-ssot.md:330` | Separate products are future extraction events, not current engineering requirements. |
| `__docs__/constitution/12-product-separation-doctrine.md:14` | MenuList, GrowthOS, and VisualMeta must not blur identities. |
| `__docs__/constitution/12-product-separation-doctrine.md:100` | MenuList must not gain campaign/post/canvas UI. |
| `__docs__/constitution/11-product-evolution-doctrine.md:50` | Later-stage products must not start before MenuList is stable. |
| `__docs__/main-website/main-website_image-assets.md:12` | MenuList already has controlled website demo visuals and launch-safe asset rules. |
| `__docs__/main-website/main-website_image-assets.md:130` | MenuList already has an asset priority matrix that this system should formalize. |
| `__docs__/answerlattice/answerlattice-website/README.md:141` | Answerlattice already has reusable visual diagram/proof components. |
| `package.json:5` | No asset audit/generation scripts exist yet in the root scripts. |

## Implemented V1

The first internal implementation installs the contract before generating videos.

Implemented:

- `AGENTS.md` product-boundary rule;
- `.agents/skills/website-asset-factory/SKILL.md`;
- MenuList and Answerlattice compact skill references;
- MenuList and Answerlattice brand asset-context docs;
- typed asset slot declarations;
- `packages/asset-factory/manifest/assets.json`;
- `npm run assets:audit`;
- `npm run assets:review`;
- `npm run assets:brief -- --slot <slot-id>`;
- `npm run assets:fingerprint`;
- `npm run assets:generate:missing -- --slot <slot-id>`;
- raw/working directory guardrails;
- an internal review prompt under `.github/codex/prompts/asset-review.md`.

It does not generate polished hero videos, launch videos, public routes, public customer screenshots, Firebase writes, or website copy changes in this pass.
