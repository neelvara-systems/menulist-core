# Videos - HyperFrames Operating Guide

**Status:** Active production standard
**Created:** July 10, 2026
**Scope:** MenuList launch, marketing, onboarding, sales, and website video production using HyperFrames.

## Purpose

This document turns the current HyperFrames docs and local production learnings into a MenuList-specific operating guide.

Use it before creating, editing, rendering, or reviewing any MenuList video. The goal is not only a valid MP4. The goal is a production asset that stays truthful to MenuList positioning, is easy for non-technical SMB owners to understand, and passes a repeatable local quality gate.

## Source Docs Reviewed

HyperFrames docs reviewed on July 10, 2026:

- Prompt Guide: https://hyperframes.heygen.com/guides/prompting
- Quickstart: https://hyperframes.heygen.com/quickstart
- Skills catalog: https://hyperframes.heygen.com/guides/skills
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

Current skill state as of July 10, 2026:

```text
npx hyperframes skills check
Installed skills are up to date: 20 current.
```

Keep skills current before significant video work:

```bash
source ~/.nvm/nvm.sh
nvm use 22
npx hyperframes skills check
npx hyperframes skills update
```

HyperFrames requires Node 22 or newer and FFmpeg. Use Node 22 only for HyperFrames work; do not change the MenuList app runtime.

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

For iteration, do not re-prompt from scratch. Use editor-style requests:

- Make the first hook more owner-ease focused.
- Reduce background visual noise.
- Move captions above the phone mockup.
- Make approval state clearer at 12 seconds.
- Replace BGM with the approved FreeToUse track.
- Render a draft and extract frames at the exact scene midpoints.

## Required Project Artifacts

For serious MenuList videos, use the HyperFrames 7-step artifact model.

| Artifact | Required when | MenuList requirement |
| --- | --- | --- |
| `capture/` | Website/product capture or external reference | Use only truthful MenuList/product/brand source material |
| `DESIGN.md` | Every reusable project | Include MenuList colors, typography, visual guardrails, no-hype rules |
| `SCRIPT.md` or `script.txt` | Every voiced video | Exact words to record or synthesize |
| `STORYBOARD.md` | Any video with 3+ beats | Beat-by-beat timing, frame plan, assets, transitions, SFX |
| `assets/` | Every project | Local frozen media, logo, music, voice, SFX, mockups |
| `assets/music/LICENSES.md` | Any BGM use | Source URL, local file, license notes, attribution notes |
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

- Use local Kokoro TTS for review drafts unless founder voice is available.
- Use approved local BGM files with license ledger.
- Mix voice above BGM with sidechain ducking.
- Normalize review/final audio around `-14 LUFS` with true peak around `-2 dBTP`.
- Generate captions when the cut is intended for social or silent autoplay.

No API key is required for local drafts. HyperFrames can fall back to local voice and music engines. HeyGen or ElevenLabs can be considered later only if the founder approves a higher-quality paid/cloud audio step.

## Render Rules

Use this render ladder:

```bash
npx hyperframes lint
npx hyperframes validate
npx hyperframes inspect
npx hyperframes snapshot --at 1.2,5.8,12,25
npx hyperframes render --quality standard --fps 30 --output renders/review.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,channels,sample_rate -show_entries format=duration,size -of default=noprint_wrappers=1 renders/review.mp4
```

Use `--quality draft` for fast iteration, `--quality standard` for founder review, and `--quality high` for final delivery.

Use local render by default because this Mac has enough headroom and keeps cost at zero. Use Docker only when exact cross-machine reproducibility matters. Use 4K only after a 1080p cut is approved:

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
- `npx hyperframes lint` has 0 errors.
- `npx hyperframes validate` has no browser console errors.
- `npx hyperframes inspect` reports no layout issues.
- Snapshot or ffmpeg-extracted frames are reviewed at every beat midpoint.
- MP4 exists, is non-empty, and passes `ffprobe` duration/codec checks.
- Audio is audible on laptop speakers and earbuds.
- Text is readable at mobile social viewing size.
- Backgrounds do not distract or accidentally tile.
- CTA is visible and concrete.
- Every claim passes MenuList claim boundaries.
- AI-related scenes show owner approval before public changes.
- Unsupported platforms are not shown as automatically updated.

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
DESIGN.md, script, storyboard if 3+ beats, local assets, mixed audio, rendered MP4, QA frames, ffprobe proof, and production notes.
```

## Best Next Improvements For MenuList Videos

1. Move from single-file draft timelines to beat-level sub-compositions for the 75-second hero film and 2-3 minute demo.
2. Add `STORYBOARD.md` to every new serious video project before coding animation.
3. Use exact word-level transcript timing for longer voiceover videos.
4. Capture approved product UI screenshots from the live app and replace CSS-only mockups where accuracy matters.
5. Use HyperFrames snapshot frames before every render review.
6. Create separate 16:9, 9:16, and 1:1 source projects when the layout materially differs, instead of relying only on crops.
7. Render final approved cuts in `high` quality and optionally 4K after the 1080p version is approved.
