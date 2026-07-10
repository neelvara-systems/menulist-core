# Website Asset Operating System - Founder Usage Guide

**Audience:** Founder/operator  
**Purpose:** What this is, why it exists, where it lives, and how to use it  
**Status:** Internal v1 implemented  
**Public product:** No

---

## Short Answer

Website Asset Operating System is the internal system that lets Codex manage MenuList and Answerlattice website assets without you explaining the brand, product boundaries, asset rules, and approval logic every time.

Use it when you want to check, refresh, brief, or review website visuals such as hero images, social previews, product screenshots, launch images, PWA icons, splash screens, or future short product clips.

It is built like a separate product internally, but it is not public and not sold yet. Its strongest practical role is beside Answerlattice, where product knowledge, product surfaces, feedback signals, and drift context already exist.

## Why This Exists

Before this system, every asset task needed repeated explanation:

- what MenuList is allowed to show;
- what Answerlattice is allowed to show;
- which files are real public website assets;
- which screenshots are safe;
- which assets need founder approval;
- which visuals are stale;
- which assets are missing;
- which generated images are too large;
- which visuals would blur MenuList, Answerlattice, GrowthOS, or KitStamp.

Now that context lives in the repo.

The goal is not just to make images. The goal is to make assets governed, repeatable, and safe.

## How This Relates To Answerlattice

Answerlattice is the governed answer infrastructure. It controls what the product knows, what support answers should say, what signals show gaps, and where product knowledge has drifted.

AssetOS controls the media side of that same truth problem:

| Answerlattice asks | AssetOS asks |
| --- | --- |
| What should users be told when they ask for help? | What should the website or product media show? |
| Which knowledge is approved, missing, stale, or risky? | Which assets are approved, missing, stale, or risky? |
| Which product surfaces and signals prove the answer? | Which source files and briefs prove the visual? |

Use Answerlattice context when planning Answerlattice assets:

- product surfaces can explain what the visual must represent;
- approved intake sources can improve briefs;
- changelog/release changes can trigger stale-asset review;
- feedback and support signals can show which public proof is confusing or missing;
- drift/readiness summaries can help decide whether an asset is safe to publish.

The boundary is important. AssetOS can read Answerlattice docs and summaries as source context, but it must not write Answerlattice KB content, tickets, support signals, widget config, product surfaces, or Firebase data.

## What It Does

| Job | What it means |
| --- | --- |
| Audit assets | Checks which assets exist, which are missing, which are stale, which are oversized, and which need approval. |
| Generate briefs | Creates a clear brief before Codex or a designer creates an asset. |
| Review assets | Scores assets against brand fit, strategy fit, clarity, file size, and approval state. |
| Lock fingerprints | Records source-file hashes so future code/docs changes can mark assets stale. |
| Protect boundaries | Stops MenuList from becoming asset/campaign software and stops Answerlattice from looking like MenuList or a generic helpdesk. |
| Stage future media | Lets us plan videos/clips internally before putting anything public. |

## What It Does Not Do

| Not included | Reason |
| --- | --- |
| Public website or landing page | This is not public yet. |
| MenuList owner feature | Restaurant owners should not see or manage this. |
| Answerlattice runtime feature | It can read Answerlattice context for asset briefs, but Answerlattice support answers/widgets do not depend on it. |
| Firebase writes | It is local repo tooling only. |
| Automatic public publishing | Founder-review assets stay blocked until approved. |
| Real customer screenshot publishing | Real customer data needs explicit approval and scrubbing. |
| Full launch films | AssetOS can govern short website motion clips, but full launch films still need the separate video production workflow. |

## Where It Lives

| Area | Path | Why it matters |
| --- | --- | --- |
| Main docs | `__docs__/website-asset-operating-system/` | Product decision, spec, implementation, usage, validation, costs. |
| Internal package | `packages/asset-factory/` | Slots, manifest, brand context, scripts, briefs, staging folders. |
| Asset skill | `.agents/skills/website-asset-factory/` | Instructions Codex should load for asset tasks. |
| Review prompt | `.github/codex/prompts/asset-review.md` | Checklist for future asset reviews. |
| MenuList public assets | `public/images/website/` | Current MenuList website images. |
| Answerlattice public assets | `public/answerlattice-*`, `public/answerlattice-splash/` | Current Answerlattice OG, logo, icon, and splash assets. |

## The Important Files

| File | What it controls |
| --- | --- |
| `packages/asset-factory/manifest/assets.json` | Which assets exist, their status, files, review state, and source fingerprints. |
| `packages/asset-factory/slots/menulist.asset-slots.ts` | MenuList asset slots and rules. |
| `packages/asset-factory/slots/answerlattice.asset-slots.ts` | Answerlattice asset slots and rules. |
| `packages/asset-factory/brand/menulist.asset-context.md` | MenuList brand and rejection rules. |
| `packages/asset-factory/brand/answerlattice.asset-context.md` | Answerlattice brand and rejection rules. |
| `packages/asset-factory/briefs/` | Generated briefs for each asset slot. |
| `packages/asset-factory/raw/` | Local-only raw files. Do not commit media here. |
| `packages/asset-factory/working/` | Local-only work files. Do not commit media here. |
| `packages/asset-factory/published/` | Internal approved package outputs that are not public website assets. |

## How To Use It

### 1. Check Current Asset Health

Run:

```bash
npm run assets:audit
```

Read the output groups:

| Group | Meaning |
| --- | --- |
| Missing | Asset slot exists, but the asset is not created yet. |
| Stale | A source file changed after the asset was accepted. |
| Oversized | Asset file is larger than the allowed budget. |
| Approval Required | Asset needs founder review before public use. |
| Disconnected | Public file exists but is not owned by a slot. |

Current healthy result should have:

- 0 errors;
- no stale generated assets;
- no oversized generated assets;
- no disconnected public assets;
- expected warnings for planned/founder-review assets.

### 2. Create Or Refresh A Brief

Before creating an asset, generate its brief:

```bash
npm run assets:brief -- --slot answerlattice.home.hero.support-control-motion
```

The brief appears in:

```text
packages/asset-factory/briefs/
```

Read the brief before asking Codex or a designer to create the asset. It tells them:

- what the asset is for;
- where it will appear;
- which files to inspect;
- what format and size are required;
- what must be avoided;
- whether founder approval is needed.

### 3. Use Creative Helper Skills

After a brief exists, Codex can use installed creative skills as helpers:

| Need | Helper skill |
| --- | --- |
| Website hero, section, social, browser, or dashboard-style visual reference | `imagegen-frontend-web` |
| Phone mockup, mobile walkthrough, onboarding, or app-store-style frame | `imagegen-frontend-mobile` |
| Brand identity board or visual-world exploration | `brandkit` |
| Turning an approved visual reference into frontend implementation guidance | `image-to-code-skill` |

The brief still controls the asset. Helper skills cannot invent features, customer proof, private data, unsupported platform sync, or public claims outside the source files.

For MenuList video and motion assets, use local HyperFrames plus FFmpeg by default. Cloud video tools, paid media services, Remotion, or Motion Canvas require explicit founder approval for that specific asset.

Current governed motion source lives under:

```text
__docs__/videos/hyperframes/
```

Use these local commands for the current AssetOS motion clips:

```bash
node scripts/website-assets/generate-assetos-motion-compositions.mjs
npm --prefix __docs__/videos/hyperframes/menulist-business-truth-loop run check
npm --prefix __docs__/videos/hyperframes/menulist-business-truth-loop run render -- --output ./renders/menulist-business-truth-loop-source.mp4 --workers 1 --experimental-fast-capture=false --quiet
node scripts/website-assets/transcode-assetos-motion-assets.mjs
node scripts/website-assets/generate-assetos-motion-compositions.mjs --approve-manifest
npm run assets:launch:frames
npm run assets:fingerprint
```

Run the equivalent `npm --prefix ... run check` and `render` commands for each HyperFrames source folder before transcoding and approving the manifest.

For a coordinated MenuList launch pack, reuse the approved website motion, social, and device slots, then run `npm run assets:launch:frames` for the four editorial keyframes. Keep those frames under `packages/asset-factory/published/` unless a runtime slot explicitly needs a public file.

### 4. Review Asset State

Run:

```bash
npm run assets:review
```

This gives a table of slots, status, decision, scores, and file sizes.

Use it to decide:

- which generated assets are already usable;
- which draft assets need review;
- which planned assets are still missing;
- whether any generated asset is blocked.

### 5. Lock Fingerprints After Approval

Only after an asset and its source files are accepted, run:

```bash
npm run assets:fingerprint -- --slot menulist.home.hero.official-source
```

This records the current watched source hashes in the manifest. After that, if the page, component, brand context, or slot changes, the audit can mark the asset stale.

Do not run this casually to hide drift. Use it only after the source and asset still match. Use all-slot `npm run assets:fingerprint` only when every non-missing asset in the manifest has been reviewed against current sources.

### 6. Create A Planning Placeholder

For a missing future asset, you can create an internal placeholder:

```bash
npm run assets:generate:missing -- --slot answerlattice.home.hero.support-control-motion
```

This writes an SVG under:

```text
packages/asset-factory/published/placeholders/
```

This is for internal planning only. It does not update a public website.

## How To Ask Codex For Asset Work

Use direct prompts like these:

```text
Audit the Website Asset Operating System and tell me which MenuList website assets need action.
```

```text
Generate a brief for answerlattice.home.hero.support-control-motion and explain what kind of asset should be created.
```

```text
Review current MenuList website assets using the asset factory rules. Do not change public assets yet.
```

```text
Create a draft plan for the Answerlattice hero motion asset, but keep it internal and do not publish anything.
```

```text
Check whether any public website media is disconnected from the asset manifest.
```

## Approval Rules

| Asset type | Codex can proceed? | Rule |
| --- | --- | --- |
| Manifest cleanup | Yes | Safe if it only updates local metadata. |
| Brief generation | Yes | Always safe. |
| Static derivative from approved asset | Usually yes | Must pass audit/review. |
| OG image from approved template | Usually yes | Must stay under size budget. |
| Product screenshot from approved demo route | Maybe | Must not show private data. |
| Analytics proof | No | Founder review required. |
| Real customer screenshot | No | Founder approval and scrubbing required. |
| Hero motion | No | Founder approval required. |
| Launch/social asset | No | Founder review required before public use. |

## MenuList Rules

MenuList assets should show:

- official public source;
- public menu;
- Official Business Page;
- QR/share surfaces;
- setup, review, and publish workflow;
- calm business truth infrastructure.

MenuList assets must not show:

- POS, payroll, CRM, inventory, accounting, or ordering systems;
- marketing campaign UI;
- fake customer proof;
- unsupported external sync claims;
- private owner/customer data;
- generic AI visuals.

## Answerlattice Rules

Answerlattice assets should show:

- governed answer infrastructure;
- canonical answers;
- page-aware widget context;
- hosted help;
- missed-question review;
- product-surface governance;
- dark infrastructure visual language.

Answerlattice assets must not show:

- restaurant/menu visuals;
- MenuList tenant data;
- generic helpdesk or CMS positioning;
- autonomous chatbot claims;
- private support tickets;
- unsupported integrations.

## When To Use This System

Use it when:

- updating MenuList website visuals;
- updating Answerlattice website visuals;
- checking Answerlattice website media after product-surface, release, feedback, or drift changes;
- preparing OG/social preview images;
- planning a hero animation or product clip;
- checking whether assets are stale after page/component changes;
- asking Codex to create asset prompts or briefs;
- checking whether current public assets are safe and connected.

Do not use it for:

- editing MenuList restaurant owner features;
- editing Answerlattice support runtime;
- creating GrowthOS customer marketing kits;
- launching KitStamp;
- publishing public product pages for this system.

## What A Good Run Looks Like

1. You ask Codex to audit assets.
2. Codex runs `npm run assets:audit`.
3. Codex explains missing, stale, approval-required, and safe generated assets.
4. You choose one slot.
5. Codex runs `npm run assets:brief -- --slot <slot-id>`.
6. Codex creates or plans the asset from that brief.
7. Codex runs `npm run assets:review`.
8. Founder-review assets stop for your approval.
9. Approved assets get fingerprints locked with `npm run assets:fingerprint`.

## Current Internal Status

The current implementation is active on our own products.

Current approved motion outputs:

- MenuList homepage hero uses `public/images/website/menulist-business-truth-loop.webm` with MP4 and WebP poster fallbacks.
- Answerlattice homepage hero uses `public/answerlattice-support-control-motion.webm` with MP4 and PNG poster fallbacks.
- Answerlattice learning-loop section uses `public/answerlattice-authority-transfer.webm` with MP4 and PNG poster fallbacks.
- Answerlattice page-aware widget product page uses `public/answerlattice-page-aware-widget-clip.webm` with MP4 and PNG poster fallbacks.

Current healthy audit result should be 0 errors, 0 warnings, and 0 founder-review blockers.

Current Answerlattice drift note:

- If `npm run assets:audit` reports blocked Answerlattice OG/logo/PWA/splash assets because `__docs__/answerlattice/answerlattice-website/README.md` changed, do not treat that as an AssetOS code failure.
- That means Answerlattice product/website truth changed after those approved asset fingerprints were locked.
- Review the affected Answerlattice assets against the new Answerlattice website truth. If they still match, lock fingerprints intentionally with `npm run assets:fingerprint`. If not, generate new briefs and refresh the assets.

## Simple Founder Decision Rule

Keep it internal until it proves repeatable value.

If it only helps us manage MenuList and Answerlattice assets, keep it internal.

If the same workflow repeatedly works for our products and a real external buyer becomes clear, then evaluate product extraction later without mixing it into MenuList or Answerlattice.
