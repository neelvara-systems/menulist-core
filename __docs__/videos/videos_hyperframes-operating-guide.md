# Videos - HyperFrames Operating Guide

**Status:** Active production standard
**Created:** July 10, 2026
**Scope:** MenuList launch, marketing, onboarding, sales, and website video production using HyperFrames.

## Purpose

This document turns the current HyperFrames docs and local production learnings into a MenuList-specific operating guide.

Founder-approved creative authority: [MenuList Founder-Approved Video Production Standard](./videos_founder-approved-production-standard.md). Read that standard first. This operating guide controls the HyperFrames implementation and QA process; the founder-approved standard controls the permanent message, typography, visual, motion, logo, audio, and iteration defaults established through review.

Use it before creating, editing, rendering, or reviewing any MenuList video. The goal is not only a valid MP4. The goal is a production asset that stays truthful to MenuList positioning, is easy for non-technical SMB owners to understand, and passes a repeatable local quality gate.

Conversion authority:

- [launch-video conversion research](./videos_launch-video-conversion-research.md);
- [required conversion brief template](./videos_conversion-brief-template.md);
- [active campaign measurement ledger](./videos_campaign-measurement-ledger.md).

HyperFrames controls how the asset is produced. The conversion brief controls why that exact version exists, where it sends the owner, and how it will be judged.

## Source Docs Reviewed

HyperFrames docs reviewed through July 18, 2026:

- Prompt Guide: https://hyperframes.heygen.com/guides/prompting
- Quickstart: https://hyperframes.heygen.com/quickstart
- Skills catalog: https://hyperframes.heygen.com/guides/skills
- Official GitHub skills directory: https://github.com/heygen-com/hyperframes/tree/main/skills
- Motion Graphics skill: https://github.com/heygen-com/hyperframes/tree/main/skills/motion-graphics
- Faceless Explainer skill: https://github.com/heygen-com/hyperframes/tree/main/skills/faceless-explainer
- Music to Video skill: https://github.com/heygen-com/hyperframes/tree/main/skills/music-to-video
- Media Use skill: https://github.com/heygen-com/hyperframes/tree/main/skills/media-use
- HyperFrames v0.7.57 release: https://github.com/heygen-com/hyperframes/releases/tag/v0.7.57
- HyperFrames v0.7.58 release: https://github.com/heygen-com/hyperframes/releases/tag/v0.7.58
- HyperFrames v0.7.59 release: https://github.com/heygen-com/hyperframes/releases/tag/v0.7.59
- HyperFrames v0.7.60 release: https://github.com/heygen-com/hyperframes/releases/tag/v0.7.60
- HyperFrames v0.7.61 release: https://github.com/heygen-com/hyperframes/releases/tag/v0.7.61
- HyperFrames v0.7.62 release: https://github.com/heygen-com/hyperframes/releases/tag/v0.7.62
- HyperFrames Apache 2.0 license: https://github.com/heygen-com/hyperframes/blob/main/LICENSE
- HeyGen Terms: https://www.heygen.com/terms
- Pixabay Content License summary: https://pixabay.com/service/license-summary/
- The Pipeline: https://hyperframes.heygen.com/guides/pipeline
- Compositions: https://hyperframes.heygen.com/concepts/compositions
- Data Attributes: https://hyperframes.heygen.com/concepts/data-attributes
- GSAP Animation: https://hyperframes.heygen.com/guides/gsap-animation
- Rendering: https://hyperframes.heygen.com/guides/rendering
- Performance: https://hyperframes.heygen.com/guides/performance
- Common Mistakes: https://hyperframes.heygen.com/guides/common-mistakes
- Video Editor Cheatsheet: https://hyperframes.heygen.com/guides/video-editor-cheatsheet
- Timeline Editing: https://hyperframes.heygen.com/guides/timeline-editing
- Video Components: https://hyperframes.heygen.com/guides/video-components
- Website to Video: https://hyperframes.heygen.com/guides/website-to-video
- Color Grading: https://hyperframes.heygen.com/guides/color-grading
- HTML-in-Canvas: https://hyperframes.heygen.com/guides/html-in-canvas
- 4K Rendering: https://hyperframes.heygen.com/guides/4k-rendering
- Remove Background: https://hyperframes.heygen.com/guides/remove-background
- Troubleshooting: https://hyperframes.heygen.com/guides/troubleshooting
- Documentation index: https://hyperframes.heygen.com/llms.txt

## Current Local Standard

Use HyperFrames only for MenuList video work by default.

MenuList video production is zero-cost and local-only. Do not use paid APIs, subscriptions, metered credits, cloud rendering or generation, paid media catalogs, paid plugins, or account-backed generation services. Do not silently fall back to a hosted provider when a local tool or asset is unavailable; stop and solve the requirement locally. Only an explicit future founder decision that reverses this rule may reopen a paid or hosted production path.

Working renders, snapshots, encoded-QA frames, voice auditions, and audio intermediates are reproducible scratch output and stay ignored. Promote only the current reviewed MP4 to the project's `deliverables/` folder. Do not retain one source project per visual or audio experiment; update the active composition and preserve decisions in its README and the founder standard.

Current skill state as of July 18, 2026:

```text
npx hyperframes skills check
Installed skills are up to date: 19 current.
```

Keep skills current before significant video work:

```bash
source ~/.nvm/nvm.sh
nvm use 22
npx hyperframes skills check
npx hyperframes skills update
```

HyperFrames requires Node 22 or newer and FFmpeg. Use Node 22 only for HyperFrames work; do not change the MenuList app runtime.

The current Mac has HyperFrames `0.7.62`, Node `22.23.1`, FFmpeg `7.1`, local headless Chrome, and `whisper-cpp`. It has an M5 Pro, 48 GB unified memory, and enough available memory for the smaller optional local model tiers. Local rendering, Motion Graphics, Talking Head Recut, bundled SFX, deterministic grades, and FFmpeg media operations are ready. HeyGen CLI authentication, Kokoro, Parakeet MLX, mflux, LTX, real-ESRGAN, MusicGen, `uvx`, `gh`, Figma credentials, Docker, and Lambda are not currently required or installed for the launch queue.

## Skill Routing And Local Cost

HyperFrames is Apache 2.0 licensed and local rendering has no HyperFrames per-render fee. MenuList's primary default music is `One Link Motion v2`; `Outlet Control v2` is the approved operational alternate; `Midnight Lo-Fi Focus` is the calm baseline and frozen v1.0 source. These tracks and the MenuList sting are generated locally. Third-party fonts, stock media, models, Figma, hosted generation, AWS, and other metered services are outside the approved production path.

Before building a new video, read [`brand-audio/track-policy.json`](./brand-audio/track-policy.json). Start with One Link Motion unless the narrative, duration, or voiceover requires an approved alternate. Never extend a short track with an obvious loop; generate a structured extension from the matching preset or use the two-minute library.

All 19 current core skills are installed and current. Use the smallest matching workflow:

| Skill | MenuList use | Local decision |
| --- | --- | --- |
| `hyperframes` | Route every video request | Mandatory, local |
| `hyperframes-core` | Composition contract and deterministic timing | Mandatory, local |
| `hyperframes-creative` | MenuList frame/design direction | Mandatory, local |
| `hyperframes-animation` | Scene choreography and transitions | Mandatory, local |
| `hyperframes-keyframes` | Logo draw, wordmark, cursor, masks, FLIP | Use for detailed motion, local |
| `hyperframes-cli` | Check, snapshot, render, transcribe, QA | Mandatory, local; no Lambda |
| `hyperframes-registry` | Reusable reviewed blocks | Selective, local |
| `media-use` | Resolve, adopt, freeze, inventory, reuse, and operate on media | Mandatory asset ledger; local/adopt mode only; no hosted or metered providers |
| `figma` | Import approved Figma source | Conditional; credentials absent |
| `product-launch-video` | The 12 MenuList campaign videos | Default orchestrator, local with repo assets |
| `website-to-video` | Truthful website/UI tour or capture utility | Selective, local for accessible pages |
| `general-video` | Unusual custom composition | Fallback, local |
| `motion-graphics` | Logo sting, six-second bumper, CTA, alpha overlay | High-value supporting workflow, local |
| `talking-head-recut` | Founder footage with designed proof cards | Ready locally with Whisper/FFmpeg |
| `embedded-captions` | Founder/customer social captions | Local after `uvx`/WhisperX setup |
| `music-to-video` | Unnarrated music-led teaser | Selective with an original MenuList-generated track |
| `faceless-explainer` | AI-era public-truth education | Selective; not a product-launch substitute |
| `pr-to-video` | Internal technical release video | Low priority; install `gh` only when needed |
| `slideshow` | Investor or sales presentation | Local deck workflow, not MP4 production |
| `remotion-to-hyperframes` | Port supplied legacy Remotion source | Not for new MenuList assets |

Do not install optional local models merely because the Mac can run them. Keep the current Indian-English Tara/founder-voice path and original locally generated BGM. Install a free on-device dependency such as `uvx`, `gh`, Kokoro, MusicGen, or an approved local model only when a matching job requires it. Do not install or use Docker-based cloud workflows, cloud rendering, paid plugins, paid APIs, or metered generation services.

## HyperFrames 0.7.57-0.7.62 Delta

The following changes are materially useful to MenuList:

| Release area | What changed | MenuList decision |
| --- | --- | --- |
| Intent and review | `BRIEF.md`, companion mode, reusable preferences, recipes, and a tighter review loop | Adopt for repeatable campaign formats; the founder-approved frame and claim system still overrides generic presets |
| Media inventory | `/media-use` now resolves or adopts assets into a project manifest and content-addressed global cache | Adopt as the default media ledger for new HyperFrames projects |
| Media reliability | Automatic H.264 authoring proxies for HEVC, alpha, and other preview-hostile video | Use automatically; keep source media and inspect the encoded MP4 |
| Video generation | `/media-use --type video` can route to HeyGen avatar video or an optional local LTX fallback | Disable the HeyGen route; use local LTX only if a later approved footage brief genuinely requires generation |
| Timeline safety | Stricter GSAP seek-order, initial-hide, SVG draw, and relative-value checks | Adopt through `npx hyperframes check` before every review render |
| Source-audio handling | Talking-head workflows preserve source audio more reliably | Adopt when real founder footage is supplied |
| Capture/render | Better final-frame holding, retries, proxy planning, and serializable request validation | Adopt, but continue encoded frame-zero, transition, and final-frame QA |
| Publish/review | Persistent review sessions and stable publish links were added | Optional for internal review only; local MP4 remains the public handoff authority |

These releases improve production reliability. They do not change MenuList positioning, the local-render default, the founder-approved logo/audio system, or the requirement to verify rights before public distribution.

## MenuList Media-Use Policy

`media-use` is MenuList's media inventory and operations layer. It does not replace AssetOS approval, the founder standard, or a license ledger.

### Default Operating Mode

Use this order:

1. Reuse a frozen project asset when it matches.
2. Reuse an explicitly approved global-cache asset when its entity and purpose match.
3. Adopt an existing repo asset.
4. Resolve from the bundled/local path with network disabled.
5. Stop if the requirement cannot be fulfilled locally. Do not fall through to a network, paid, hosted, account-backed, or metered provider.

Disable telemetry in MenuList commands:

```bash
export DO_NOT_TRACK=1
MEDIA_USE_DIR="$HOME/.agents/skills/media-use"

node "$MEDIA_USE_DIR/scripts/resolve.mjs" --doctor
node "$MEDIA_USE_DIR/scripts/resolve.mjs" --adopt --project "$PROJECT_DIR"
node "$MEDIA_USE_DIR/scripts/resolve.mjs" \
  --type sfx \
  --intent "quiet soft UI confirmation click" \
  --project "$PROJECT_DIR" \
  --local-only
```

`--local-only` is a hard network boundary. It uses project media, the global local cache, bundled media, deterministic grades, and installed on-device providers only.

### What Is Free And Local Today

| Capability | Current state | Production decision |
| --- | --- | --- |
| HyperFrames composition and local render | Ready; Apache 2.0 software | Approved default |
| FFmpeg trim, reframe, stitch, ducking, loudness, probing | Ready and local | Approved default |
| Bundled SFX library | 19 local files; upstream credits identify Pixabay sources | Allowed after retaining the upstream credit/license evidence and checking fit |
| Deterministic grades and generated LUT parameters | Ready and local | Allowed; visual review still required |
| Existing MenuList logo, UI, original BGM, voice, and mockups | Repo-local | Preferred source |
| Whisper transcription fallback | Ready and local | Approved fallback |
| Global media cache | Ready but currently populated only as assets are adopted/resolved | Reuse only after entity, rights, and purpose match |
| Kokoro voice | Free/on-device but not installed | Optional; current Tara/founder path remains preferred |
| Parakeet MLX transcription | Free/on-device but not installed | Optional; install only for a transcription-heavy job |
| mflux image generation | Free/on-device but not installed | Optional; use only under an approved visual brief |
| LTX local video generation | Free/on-device but not installed; model and render costs are substantial | Experimental only, not a default launch-video dependency |
| real-ESRGAN | Free/on-device but not installed | Optional for a verified low-resolution source |

Do not install the optional model stack pre-emptively. The machine can run selected tiers, but model downloads, disk usage, startup time, and visual QA are real production costs.

### HeyGen Catalog Boundary

The current skill advertises account-backed access to more than 10,000 audio tracks, more than 75,000 image/icon assets, TTS, and avatar video through HeyGen CLI OAuth. This account-backed catalog and generation route is outside the approved MenuList production workflow, including routine internal asset selection.

Rules:

- `free with login` means access or allowance, not confirmed commercial clearance;
- HeyGen Free Plan output is restricted by the current HeyGen Terms to personal, non-commercial, internal evaluation use;
- catalog assets may include third-party material with separate rights;
- `.media/manifest.jsonl` records provenance and hashes, but it does not prove or grant a public commercial license;
- do not install, authenticate, browse, retrieve, or generate through the HeyGen CLI for the current MenuList workflow;
- use repo-local, bundled, deterministically generated, or approved on-device media instead;
- no HeyGen Free Plan output may enter a production-bound MenuList video.

The HyperFrames Apache license covers the software. It does not grant rights to third-party catalog assets, generated output, logos, people, music, or trademarks.

### Required Media Records

Every new serious HyperFrames project should keep:

- `.media/manifest.jsonl` as the local machine-readable working inventory;
- `.media/index.md` as the local readable working inventory;
- `.media/preferences.json` only for explicitly confirmed project defaults;
- `assets/licenses/` for source terms, certificates, screenshots/PDFs, attribution requirements, and retrieval dates;
- `assets/licenses/media-manifest.jsonl` as the retained snapshot of production-used third-party or hosted records before final handoff;
- source and final hashes for any production-bound third-party asset;
- an explicit `internal-only` or `commercial-cleared` distribution status.

The project `.media/` directory remains ignored because it contains reusable caches and working records. Before final handoff, promote only the records actually used by the approved render into `assets/licenses/media-manifest.jsonl`. The retained manifest and the license record are separate gates. Both are required before a third-party asset can be public.

## Canonical MenuList Frame Preset

The canonical video-first design and motion system is:

- [MenuList FRAME.md](./frame-presets/menulist/FRAME.md);
- [MenuList caption skin](./frame-presets/menulist/caption-skin.html).

HyperFrames project resolution uses lowercase `frame.md`. `FRAME.md` is the maintained preset template; copy it into each active project as `frame.md`. Once copied, `frame.md` takes precedence over `design.md` and `DESIGN.md`. A project-specific `DESIGN.md` may describe asset-specific constraints, but it must not override the canonical colors, Inter typography, zero tracking, logo behavior, caption treatment, owner-first motion language, or claim boundaries.

For standard projects:

```bash
cp "$REPO_ROOT/__docs__/videos/frame-presets/menulist/FRAME.md" "$PROJECT_DIR/frame.md"
mkdir -p "$PROJECT_DIR/.hyperframes"
cp "$REPO_ROOT/__docs__/videos/frame-presets/menulist/caption-skin.html" \
  "$PROJECT_DIR/.hyperframes/caption-skin.html"
```

For workflows that build a frame preset through `build-frame.mjs`, use the repo preset directory rather than a generic shipped style:

```bash
node "$FACELESS_SKILL_DIR/scripts/build-frame.mjs" \
  --preset menulist \
  --preset-dir "$REPO_ROOT/__docs__/videos/frame-presets" \
  --hyperframes "$PROJECT_DIR"
```

The default caption treatment has no enclosing pill or card. Upcoming words are muted, the current word is MenuList blue, and spoken words settle to dark ink. This keeps captions subordinate to product proof while preserving word-level timing.

## MenuList Motion-Graphics Layer

Use the official HyperFrames `motion-graphics` workflow as MenuList's reusable short-form motion layer. It complements the campaign videos; it does not replace `product-launch-video`, `general-video`, or `talking-head-recut`.

### Admission Gate

Route a request to `motion-graphics` only when all of these are true:

- one message or one structured information unit carries the asset;
- motion itself communicates the idea;
- narration is unnecessary;
- the useful duration is normally 3-10 seconds and never needs a multi-scene product story;
- the output can stand alone as an MP4 or be reused as a transparent overlay inside another edit.

Route narrated, multi-scene, or 15-second-and-longer campaign stories to `product-launch-video` or `general-video`. Route founder footage to `talking-head-recut`. Do not split a coherent 30-75 second story into unrelated motion cards merely because each card can be animated.

### Prompting Rule

Describe the communication outcome and supply the real content. Do not prescribe an effect name, easing curve, or fashionable visual treatment.

Good:

```text
Use HyperFrames motion-graphics to show that an owner uploads existing menu photos,
MenuList prepares a private preview, and nothing becomes public until approval.
Make this a six-second reusable MenuList transition with no narration.
```

Avoid:

```text
Add neon glass cards, elastic easing, spinning 3D icons, and a futuristic AI reveal.
```

The design must still inherit the founder-approved MenuList typography, logo, gradient, light operational canvas, owner-control language, and encoded-frame rules.

### Asset And Evidence Decision

Make the search decision before designing:

- supplied sentence, logo, approved product screen, CSV, or known product fact: use the supplied source directly and do not search;
- public webpage, headline, external statistic, or public trend: verify the current primary source first, freeze the source date, and keep provenance with the project;
- internal performance data: require a real export or approved read model;
- no verified data: do not create a stat card, chart, customer count, revenue claim, adoption claim, or growth animation.

Every highlighted number must include its meaning, unit, and relevant date or period. A number without context is not proof.

### Reusable MenuList Motion Kit

Build these as independent, versioned modules. Each module should have a clean MP4 and, when it will be composited over another scene, a transparent WebM or MOV export.

| Module | Duration | Message | Primary campaign use |
| --- | --- | --- | --- |
| Brand lockup sting | 4-5 seconds | `MenuList` + `One approved customer link` | Opening/final slate, social intro, sales deck, website |
| Existing-menu intake | 5-7 seconds | Upload menu photos or a PDF; no full retyping to start | Hero, launch cut, Photo/PDF reel, onboarding |
| Private-preview approval | 5-7 seconds | MenuList prepares; the owner reviews and approves | Hero, Owner Approval reel, AI Menu Manager reel |
| One-link propagation | 6-8 seconds | One approved link supports QR, page, print, sharing, and actions | Hero, One Link Everywhere reel, Official Business Page reel |
| AI prepares, owner approves | 5-7 seconds | Controlled assistance without silent public changes | AI Menu Manager reel, trust retargeting, founder POV overlay |
| Multi-location governance | 7-9 seconds | One master list with controlled outlet flexibility | Multi-location reel, sales deck, product demo |
| Owner-relief kinetic line | 3-5 seconds | One concise owner pain or outcome | Old PDF reel, stale QR reel, ad bumper, series opener |
| CTA end card | 3-5 seconds | One concrete action and destination | All campaign cuts and paid variants |

The approved logo animation remains frozen. The brand-lockup module must reuse the exact two-path symbol geometry and deterministic one-cycle slate behavior already approved for MenuList; `motion-graphics` is a production route, not permission to redesign the mark.

### Campaign Integration

| Campaign video | Motion-graphics modules to reuse |
| --- | --- |
| 75-sec Product Launch / Hero Film | Brand lockup, existing-menu intake, private-preview approval, one-link propagation, CTA |
| 2-3 min Product Demo Walkthrough | Existing-menu intake, approval callout, one-link propagation, lower-third callouts, CTA |
| 30-sec Launch Announcement Cut | Brand lockup, existing-menu intake, private-preview approval, one-link propagation, CTA |
| Old PDF Problem Reel | Owner-relief kinetic line, current-link replacement, CTA |
| QR Stale Page Reel | Owner-relief kinetic line, same-QR/current-list transformation, CTA |
| Photo/PDF to Customer Link Reel | Existing-menu intake, private-preview approval, CTA |
| Owner Approval Reel | Private-preview approval, approval-status callout, CTA |
| One Link Everywhere Reel | One-link propagation, CTA |
| AI Menu Manager Reel | AI prepares/owner approves, approval receipt, CTA |
| Official Business Page Reel | One-link propagation, customer-action callouts, CTA |
| Multi-location Reel | Multi-location governance, outlet-page callout, CTA |
| Founder / Brand POV Video | Brand lockup, restrained lower-thirds, product-proof overlays, CTA |

### Motion-Graphics Project Contract

Keep each module under `__docs__/videos/hyperframes/<asset-name>/` and retain only:

- `hyperframes.json` and the active composition source;
- frozen approved inputs and provenance;
- a short `README.md` with message, duration, source, usage, and claim boundary;
- the current approved MP4;
- a transparent overlay export only when there is a declared reuse case;
- minimal QA evidence and hashes required by the founder standard.

Ignore scratch renders, temporary captures, redundant snapshots, superseded exports, and package caches. A motion module is reusable because its source and usage contract are clear, not because every experiment is retained.

Before significant motion-graphics work:

```bash
source ~/.nvm/nvm.sh
nvm use 22
npx hyperframes skills update motion-graphics
npx hyperframes skills check
```

## Faceless-Explainer Role

Use `faceless-explainer` for educational content where the input is a concept, article, research brief, or founder thesis and there is no product walkthrough or real website sequence to capture. It invents diagrams, typography, data cards, and teaching visuals under the canonical MenuList frame system.

Approved MenuList uses:

- why stale public business information creates customer confusion;
- why one approved public source matters;
- how owner approval differs from uncontrolled automation;
- what AI-era discovery readiness means without ranking guarantees;
- why old PDFs, screenshots, and scattered links remain operational risk;
- a practical public-business-truth explainer for LinkedIn or YouTube.

Do not use `faceless-explainer` for the 75-second product launch film, product demo, feature demonstration, website tour, or any video whose proof depends on real MenuList UI. Those route to `product-launch-video`, `website-to-video`, or `general-video`.

Research rules:

- use current primary sources for public facts;
- retain source URL, retrieval date, and the exact fact used;
- put a visible date or period next to live statistics;
- do not use a repository star count, install count, market percentage, customer number, or trend unless it was verified for that render;
- do not let invented diagrams imply unverified product behavior.

The preferred caption style is the canonical no-pill MenuList caption skin. Narration remains calm Indian English or founder voice, not a generic promotional voice.

## Music-To-Video Role

Use `music-to-video` only when the track is intentionally the editing authority and the asset has no narration. The workflow analyzes the adopted track once, creates one timing map, and aligns major frame changes to real energy, phrase, onset, or stop information.

Approved MenuList uses:

- a 15-30 second unnarrated launch teaser;
- a kinetic brand reel that visualizes the MenuList frame system;
- a short event or product-update sizzle;
- a montage of approved motion-graphics modules;
- an unnarrated social cut where typography and product states carry the message.

Do not use `music-to-video` as the primary workflow for Owner Ease, the product demo, founder POV, onboarding, or any narration-led video. In those assets, owner comprehension and voice timing remain authoritative; BGM stays subordinate and voice-reactively ducked.

Music timing rules:

- adopt one approved local track before planning visuals;
- generate and retain one `audiomap.json` as the timing truth;
- trust beat cuts only when the source is genuinely rhythmic;
- use phrase and energy flow for calm or ambiguous material;
- place the largest visual reveals at meaningful musical changes, not every beat;
- keep copy readable even when the track is fast;
- never swap the founder-frozen Owner Ease 30s V4 music while producing a visual variant.

`music-to-video` can improve the rhythm of an unnarrated campaign asset. It is not permission to make MenuList louder, faster, more fashionable, or less owner-focused.

## MenuList Production Doctrine

Every HyperFrames video must preserve this positioning:

```text
One approved customer link for your menu, services, and business details.
```

For owner-ease videos, lead with:

```text
Upload your existing menu photos or PDF. MenuList prepares the private preview. You approve before publishing.
```

Allowed emphasis:

- Non-technical owner ease.
- Start from existing menu photos, PDF, owned link, service list, or rate card.
- No need to type the whole menu again.
- Private preview before public publishing.
- Owner approval before important customer-facing changes.
- One approved customer link behind QR, page, print, WhatsApp sharing, and customer actions.
- Search and AI-era readiness only as clean-source readiness, never as ranking or recommendation promises.

Do not show or say:

- AI-powered restaurant software.
- Best QR menu app.
- Fully automatic menu updates.
- Guaranteed Google, ChatGPT, social, delivery-platform, ranking, traffic, revenue, or sales outcomes.
- Automatic updates to Google, Instagram, Zomato, Swiggy, WhatsApp catalog, or delivery platforms.
- Robots, glowing AI brains, futuristic AI dashboards, fake testimonials, fake customer logos, or fake growth metrics.

## Prompting Rules

HyperFrames works best when the prompt gives production constraints, not only a theme.

For a new MenuList video, specify:

- Video type: hero film, product demo, reel, ad cut, website asset, onboarding clip.
- Duration: exact seconds or tight range.
- Aspect ratio: 16:9, 9:16, or 1:1.
- Audience: restaurant owner, cafe owner, service business owner, multi-location operator, sales lead, founder reviewer.
- One message: the single idea this cut must land.
- Tone: calm, operational, owner-focused, low-hype.
- Assets: exact logo, product screen, capture, audio, BGM, and mockup paths when available.
- Guardrails: no unsupported platform claims, no AI magic framing, no fake outcomes.
- Funnel stage: awareness, setup relief, trust, product understanding, evaluation, or high-intent conversion.
- Belief change: one sentence describing what the owner should understand afterward.
- Proof moment: the exact product action or state shown on screen.
- Linked action and destination: one CTA and one route.
- Primary and guard metrics: the deepest reliable outcome plus the quality signal that must not worsen.
- Asset id and `utm_content`: unique identity for this version.

For iteration, do not re-prompt from scratch. Use editor-style requests:

- Make the first hook more owner-ease focused.
- Reduce background visual noise.
- Move captions above the phone mockup.
- Make approval state clearer at 12 seconds.
- Rebuild BGM from the approved original MenuList brand-bed script.
- Render a draft and extract frames at the exact scene midpoints.

When creating an A/B variant, change only the declared test variable. Do not silently change the hook, voice, proof order, CTA, destination, and music in one test.

### Retention Pressure Test

Run this before storyboard approval and again against the encoded MP4:

| Question | Pass condition |
| --- | --- |
| Does frame zero earn attention and remain poster-safe? | MenuList identity, the owner promise, and a recognizable source/product surface are already visible |
| Does the opening match its distribution promise? | Thumbnail, post copy, first frame, and first spoken/on-screen line promise the same payoff |
| Is the product visible early? | Existing menu source or MenuList UI is visible within `1.5s` |
| Is there an early aha? | Existing source becomes a private preview or another real product transformation by approximately `5s` |
| Does motion carry information? | Each opening event explains intake, preparation, review, approval, propagation, or customer outcome |
| Is the first six seconds paced? | A meaningful visual event occurs approximately every `1.5-2.5s` without forced hard cuts |
| Can the owner still understand it? | One focal movement at a time; UI proof holds for `2-4s` when reading is required |
| Is the test controlled? | Only the declared hook, aspect, CTA, voice, or other primary variable changed |
| Is success defined beyond views? | Retention is diagnostic; the primary metric remains the deepest reliable owner/product outcome |

Do not copy agency heuristics as universal rules. `70% retention`, a cut every `1.7s`, a `30s` sunk-cost threshold, and a global `10%` speed-up are not MenuList production standards. Use actual platform retention curves and qualified product progress after publishing.

### Founder-Review Pass Versioning

Use the [video version ledger](./videos_version-ledger.md) for every delivered founder-review pass.

- Use `v1.0`, `v1.1`, `v1.2`, `v1.3`, and later minor IDs for delivered review passes.
- Internal render retries, lint repairs, and pre-delivery polish do not consume version IDs.
- Once a pass is delivered, never silently replace its final MP4. A material change becomes the next version.
- Put the version in the project folder and final MP4 filename.
- Record purpose, changes, audio, output, QA, hash, status, and relationship to earlier passes.
- Do not reserve version numbers for planned assets. Assign the next ID only when the review pass is produced.

## MenuList Extended Production Workflow

Use this workflow for every new public, website, sales, social, or paid MenuList video:

| Step | Output | Gate |
| --- | --- | --- |
| -1. Conversion brief | Project `conversion.md` based on the shared template; ledger row | One audience, problem, belief change, proof moment, CTA, destination, metric, asset id, and paid status are locked |
| 0. HyperFrames setup | `hyperframes.json` and locked format | Duration, aspect, message, language, and production mode are known |
| 1. Source capture | `capture/` and asset inventory | Only truthful, approved, fictional, or permissioned source material is admitted |
| 2. Design system | `DESIGN.md` or `frame.md` | MenuList visual doctrine and real brand assets are locked |
| 3. Story/script | `STORYBOARD.md` and `SCRIPT.md`/`script.txt` | Every beat supports the conversion belief and proof moment |
| 3.5 Retention pressure test | Opening promise, first-5-second proof, visual-event map | Frame zero, product-entry timing, first aha, and one-variable test boundary pass |
| 4. Audio/visual direction | Frozen local audio and enriched storyboard | Voice, music, captions, timing, and UI focus support owner comprehension |
| 5. Composition build | HyperFrames compositions and assembled `index.html` | Seek-safe timeline, readable UI, and truthful state changes |
| 6. QA/render | Review frames, checks, MP4, `ffprobe` proof | Technical, claim, visual, audio, and conversion scorecards pass |
| 7. Distribution package | Native aspect exports, thumbnail, captions, UTM link, ledger update | Publish owner, destination, version identity, and paid eligibility are explicit |
| 8. Learning loop | Ledger results and one-variable decision | Keep, iterate, scale, or retire based on qualified outcomes rather than views alone |

Step -1 and Steps 7-8 are MenuList additions to the HyperFrames production workflow. Do not omit them because the MP4 already renders correctly.

## Required Project Artifacts

For serious MenuList videos, use the HyperFrames 7-step artifact model.

| Artifact | Required when | MenuList requirement |
| --- | --- | --- |
| `conversion.md` | Every public, sales, website, social, or paid version | Asset id, funnel job, proof, CTA, destination, metrics, UTM identity, and paid eligibility |
| `capture/` | Website/product capture or external reference | Use only truthful MenuList/product/brand source material |
| `frame.md` | Every reusable project | Copy from the canonical MenuList FRAME preset; this is the project design and motion authority |
| `DESIGN.md` | Optional project supplement | Asset-specific constraints only; it must not conflict with `frame.md` |
| `SCRIPT.md` or `script.txt` | Every voiced video | Exact words to record or synthesize |
| `STORYBOARD.md` | Any video with 3+ beats | Beat-by-beat timing, frame plan, assets, transitions, SFX |
| `assets/` | Every project | Local frozen media, logo, music, voice, SFX, mockups |
| `.media/manifest.jsonl` and `.media/index.md` | Every new serious project during production | Local resolved/adopted media provenance, hashes, dimensions, duration, provider, and reusable inventory; working `.media/` remains ignored |
| `assets/licenses/media-manifest.jsonl` | Any third-party or hosted media used in the approved render | Retained subset of the production-used `.media` records |
| `assets/licenses/` | Any third-party or hosted asset | Current source terms, certificate or page evidence, retrieval date, account tier, and approved distribution scope |
| `assets/music/ORIGIN.md` | Any BGM use | Build script, source process, local hash, and third-party-free declaration |
| `assets/mix/` | Any mixed audio | Voice/BGM/SFX master and mix notes |
| `compositions/` | Multi-beat or reusable scenes | Prefer one composition per coherent beat once the video grows |
| `snapshots/` or QA frames | Before final handoff | Exact timestamp frame checks |
| `renders/` | Review and final outputs | Name by video, version, aspect, and audio version |

Single-file timelines are acceptable for early 10-30 second review cuts. Once warnings about dense tracks start slowing iteration, split scenes into `compositions/*.html`.

## Composition Rules

Use these rules for every HyperFrames HTML file:

- Root composition must have `data-composition-id`, `data-width`, and `data-height`.
- Set root `data-duration` directly in source for fixed-length outputs.
- Every timed visible layer needs `class="clip"`, `data-start`, `data-duration`, and `data-track-index`.
- Clips on the same `data-track-index` cannot overlap.
- Use CSS `z-index` or visually higher timeline rows for stacking; `data-track-index` is timing, not a substitute for layout intent.
- Use `data-media-start` for media trims instead of script-based seeking.
- Video elements should be muted unless intentionally carrying audio through supported data attributes. Keep final audio in dedicated audio tracks where practical.
- Register a paused GSAP timeline on `window.__timelines` using the exact `data-composition-id` key.
- Extend timelines with `tl.set({}, {}, DURATION)` when visual animation ends before the intended composition duration.
- Do not use `Math.random()`, `Date.now()`, asynchronous timeline construction, or fetch-dependent timeline setup.

## Animation Rules

Prefer seek-safe GSAP animation:

- Create timelines with `{ paused: true }`.
- Use the third GSAP position parameter for absolute timing.
- Animate visual properties such as `opacity`, `x`, `y`, `scale`, `rotation`, `color`, and `backgroundColor`.
- Do not script media playback with `play()`, `pause()`, `currentTime`, or custom seeking.
- Do not animate `width`, `height`, `top`, or `left` directly on video elements. Wrap video in a `div` and animate the wrapper.
- Avoid jump cuts unless intentionally storyboarded.
- Use subtle transitions for MenuList: blur crossfade, soft slide, cover/uncover, small scale, or clean wipe.
- Avoid glitch, vortex, ridged burn, neon, liquid-glass, or heavy VFX unless the specific concept demands it.

For MenuList, motion should feel like an owner workflow becoming clearer, not a tech demo.

## Visual Quality Rules

MenuList videos should look operational, trustworthy, and easy to start.

Use:

- Real MenuList logo and theme.
- Product UI, owner phone, customer phone, QR/table card, print mockup, WhatsApp sharing mockup.
- Clear before/after states.
- Calm grid, light surface, restrained depth, and readable type.
- Short captions with strong contrast.
- Product screen magnification when UI details matter.

Avoid:

- Decorative repeated patterns that distract from the message.
- Repeated horizontal blue bands or accidental tiled gradients.
- Overly dense dashboard screens.
- Tiny UI text pretending to be proof.
- Stock footage that does not show MenuList behavior.
- Generic AI robot/brain visuals.

## Performance Rules

Preview stutter is usually a composition cost problem, not a render correctness problem.

Keep renders efficient:

- Resize large images to at most 2x the canvas. For 1920 x 1080, 3840 x 2160 is enough.
- Avoid many animated shadows.
- Keep `backdrop-filter` stacks to 2-3 layers and avoid large-area 64px or 128px blurs.
- Avoid large `filter: blur()` or `filter: drop-shadow()` on full-screen elements.
- Use static PNG overlays for heavy static blur or glow effects.
- Use `npx hyperframes render --quality draft` when preview is too slow but frame accuracy is needed.

For UI-heavy MenuList clips, prefer crisp CSS/UI mockups and captured product images over heavyweight video layers until final product footage is approved.

## Audio Rules

Current local preference:

- Use founder voice or the reviewed Indian-English Tara path; local Kokoro is optional and not currently installed.
- Use the original locally synthesized MenuList BGM and retain its build script and hashes.
- Mix voice above BGM with sidechain ducking.
- Normalize review/final audio around `-14 LUFS` with true peak around `-2 dBTP`.
- Generate captions when the cut is intended for social or silent autoplay.

No API key is required for local production. Do not route production audio through HeyGen, a hosted voice provider, a paid catalog, a subscription, or a metered API. Use founder voice, the reviewed local Indian-English voice path, or an approved free on-device model.

## Render Rules

Use this render ladder:

```bash
npx hyperframes check
npx hyperframes snapshot --at 1.2,5.8,12,25
npx hyperframes render \
  --quality standard \
  --fps 30 \
  --experimental-fast-capture=false \
  --output renders/review.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,channels,sample_rate -show_entries format=duration,size -of default=noprint_wrappers=1 renders/review.mp4
```

Use `--quality draft` for fast iteration, `--quality standard` for founder review, and `--quality high` for final delivery.

Use local render because this Mac has enough headroom and keeps cost at zero. Do not use Lambda, cloud rendering, remote render farms, or metered render services. Use 4K only after a 1080p cut is approved:

```bash
npx hyperframes render --resolution 4k --quality high --output renders/final-4k.mp4
```

4K supersampling improves vector text, SVG, CSS shapes, gradients, borders, and high-resolution images. It does not add detail to 1080p video, low-resolution PNGs, or fixed-size canvas content.

Current machine-specific note:

```bash
--experimental-fast-capture=false
```

Keep this flag on MenuList renders until the local `ctx.drawElementImage is not a function` fast-capture failure is confirmed fixed.

## QA Gate

Do not hand off a MenuList video until this gate passes:

- `npx hyperframes skills check` passes or outdated skills were deliberately updated.
- `npx hyperframes check` passes its structural, browser, layout, and motion gates, or every accepted warning is documented.
- `.media/manifest.jsonl` and `.media/index.md` exist locally for new serious projects.
- Production-used third-party or hosted records are retained in `assets/licenses/media-manifest.jsonl`.
- Every third-party or hosted asset has retained rights evidence and an explicit distribution status.
- HeyGen Free Plan output is absent from production-bound renders.
- No paid API, subscription, metered credit, cloud render, hosted generation, paid catalog, or paid plugin is required to reproduce the approved asset.
- Snapshot or ffmpeg-extracted frames are reviewed at every beat midpoint.
- Encoded frames at `0s`, `1.5s`, `3s`, and `5s` prove the opening promise, product visibility, and first aha.
- MP4 exists, is non-empty, and passes `ffprobe` duration/codec checks.
- Audio is audible on laptop speakers and earbuds.
- Text is readable at mobile social viewing size.
- Backgrounds do not distract or accidentally tile.
- CTA is visible and concrete.
- Every claim passes MenuList claim boundaries.
- AI-related scenes show owner approval before public changes.
- Unsupported platforms are not shown as automatically updated.
- `conversion.md` exists and matches the final edit.
- The final frame and companion post use one linked action and one destination.
- The version has a unique asset id and `utm_content` value in the campaign ledger.
- The chosen primary metric is deeper than views where product milestones are available.
- Retention is used diagnostically and is never presented as an algorithm guarantee or universal percentage target.
- Paid eligibility is explicitly `eligible` or `blocked`; absence of tracking means blocked, not assumed ready.

Warnings may be accepted for internal review only when they are understood and documented. Dense single-file timeline warnings should be fixed before scaling the same project into a master launch asset.

## MenuList-Specific Prompt Template

Use this as the default prompt shape for future video generation:

```text
Use HyperFrames to create a MenuList video.

Video type:
Duration:
Aspect ratio:
Audience:
One message:
CTA:
Funnel stage:
Belief change:
Proof moment:
Linked destination:
Primary metric:
Guard metric:
Asset id:
UTM content:
Paid eligibility:

MenuList positioning:
One approved customer link for menu, services, and business details.
Do not position MenuList as just a QR menu app or generic AI restaurant software.

Owner-ease emphasis:
Start from existing menu photos/PDF/owned list.
No need to type the whole menu again.
MenuList prepares a private preview.
Owner approves before publishing.

Visual style:
Calm operational product UI, real MenuList logo/theme, owner phone, customer link, QR/page/print/WhatsApp surfaces, minimal animation.

Avoid:
AI magic, robot visuals, guaranteed growth/ranking claims, automatic external-platform updates, fake testimonials, fake customer logos, cluttered dashboards.

Deliver:
conversion.md, frame.md, script, storyboard if 3+ beats, local assets, mixed audio, rendered MP4, QA frames, ffprobe proof, production notes, native distribution package, and campaign-ledger update.
```

## Best Next Improvements For MenuList Videos

1. Produce the native 9:16 Owner Ease V4 before adding another story.
2. Create the declared hook-only Owner Ease variant without changing body, CTA, voice, or destination.
3. Add consent-aware create-menu milestone attribution through private preview, claim, and first approved publish before paid scale.
4. Move from single-file draft timelines to beat-level sub-compositions for the 75-second hero film and 2-3 minute demo.
5. Add `STORYBOARD.md` and `conversion.md` to every new serious video project before coding animation.
6. Use exact word-level transcript timing for longer voiceover videos.
7. Capture approved product UI screenshots from the live app and replace CSS-only mockups where accuracy matters.
8. Use HyperFrames snapshot frames before every render review.
9. Create separate 16:9, 9:16, and 1:1 source projects when the layout materially differs, instead of relying only on crops.
10. Render final approved cuts in `high` quality and optionally 4K after the 1080p version is approved.
