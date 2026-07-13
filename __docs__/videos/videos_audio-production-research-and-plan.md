# Videos - Audio Production Research And Plan

**Status:** Active production standard
**Created:** July 7, 2026
**Research date:** July 7, 2026
**Scope:** MenuList launch and product-marketing videos produced locally with HyperFrames.

**Current founder-approved audio authority:** [MenuList Founder-Approved Video Production Standard](./videos_founder-approved-production-standard.md). Its Indian-English voice, reusable brand-bed, crescendo, ducking, sting, and approval rules supersede older scratch-audio assumptions in this research history.

**July 12, 2026 hard override:** active MenuList production uses only original locally synthesized music and stings. Earlier external-track research below is historical evaluation evidence, not an approved production source. Do not use downloaded, stock, paid-plan, attribution-dependent, or third-party music by default.

## Purpose

This document converts the audio-quality issue from the first HyperFrames drafts into a repeatable production plan.

The first rendered MenuList video drafts proved the visual direction and timing, but the audio is not production quality. The drafts used macOS `say` narration as a quick placeholder. That is useful only for timing checks. It is not acceptable for founder review, website publishing, paid ads, LinkedIn, YouTube, Instagram, WhatsApp sales, or launch assets.

## Default Decision

MenuList video production uses HyperFrames only by default.

Default stack:

- HyperFrames for video composition, animation, captions, and rendering.
- Local rendering on the Mac.
- Original locally synthesized music and sting assets.
- FFmpeg for audio mixing, ducking, normalization, muxing, and QC.
- No Remotion parallel workflow unless the founder explicitly asks for a Remotion-only experiment.
- No paid/cloud voice, music, SFX, avatar, or generated-media service unless the founder explicitly approves it for a specific asset.

## Vetted Public-Domain And CC0 Exception Sources

**Research refreshed:** July 12, 2026

The original locally synthesized MenuList bed remains the production default. The sources below are an exception pool for a future cut that genuinely needs a different musical character.

"Free," "royalty-free," and "no copyright" are not sufficient rights evidence. Admit an external recording only when its individual source page explicitly marks the **recording**, not only the composition, as `CC0`, `Public Domain`, or unrestricted commercial reuse without permission. Preserve the source URL, page capture, download date, filename, and SHA-256 hash beside the local asset.

### Strongest Sources

| Source | What may be used | MenuList decision |
| --- | --- | --- |
| [OpenGameArt](https://opengameart.org/) | Individual music downloads explicitly marked `CC0` | Best external exception source. Verify the license on each asset page and download the attached file, not an unlicensed preview. |
| [Library of Congress Citizen DJ](https://citizen-dj.labs.loc.gov/about/) | Collection sounds identified as unrestricted for creating new music | Good for building an original sampled bed. Follow the collection-specific use note and preserve cultural context. |
| [Smithsonian Open Access](https://www.si.edu/openaccess) | Individual audio explicitly carrying the Smithsonian `CC0` designation | Permits commercial reuse without Smithsonian attribution or fee; availability of usable music recordings is limited and third-party rights still require review. |
| [Openverse](https://openverse.org/) | Audio search filtered to `CC0` or Public Domain Mark | Discovery only. Verify the original host's item page before admission because Openverse aggregates external metadata. |
| [Wikimedia Commons](https://commons.wikimedia.org/) | Individual audio files explicitly marked `CC0` or Public Domain | Discovery/archive source only. Many Commons files use attribution licenses, so do not treat the site as blanket unrestricted. |
| [Musopen](https://musopen.org/) | Individual recordings identified as public domain | Classical-only option. Musopen says it does not independently guarantee every user-uploaded status, so verify both the composition and the exact recording. |
| [Freesound](https://freesound.org/) | Individual samples explicitly marked `CC0` | Useful for original SFX or music construction, not blanket track use. Avoid `CC BY`, `CC BY-NC`, and old Sampling+ assets. |
| [Free Music Archive](https://freemusicarchive.org/) | Individual tracks explicitly marked `CC0` | Secondary discovery source. FMA does not own uploaded tracks, so preserve item-level evidence and do not use other FMA license types by default. |

### Current CC0 Music Candidates

These are external candidates, not approved replacements for the current MenuList bed:

| Track | Source declaration | Potential use |
| --- | --- | --- |
| [Scaling Up](https://opengameart.org/content/scaling-up) | OpenGameArt page marks the track `CC0` and Public Domain | Best fit from this review for a practical product demo or operations-led launch cut. |
| [Our Expanse](https://opengameart.org/content/our-expanse) | OpenGameArt page marks all supplied versions `CC0` | Hero-film candidate with a calm opening, build, and energetic transition. |
| [City Loop](https://opengameart.org/content/city-loop-0) | OpenGameArt page marks the track `CC0` and Public Domain | Faster social or product-action reel candidate. |
| [MindStream](https://opengameart.org/content/mindstream) | OpenGameArt page marks the track `CC0` | Restrained ambient candidate for product walkthroughs. |
| [Contemplation](https://opengameart.org/content/contemplation-0) | OpenGameArt page marks the track `CC0` | Calm founder or trust-oriented cut; likely too reflective for the main launch film. |

### Rejected As A Default Source

- FreeToUse.com: its free tier prohibits commercial content; MenuList company, website, product, sponsored, and advertising videos require a paid commercial or single-track license.
- Pixabay Music: free and attribution-optional under the Pixabay Content License, but not public domain or license-independent. User-uploaded content may also carry additional third-party rights and Content ID risk.
- Mixkit Music: offered under Mixkit's Stock Music Free License, not CC0 or public domain. It remains a third-party licensed input even when no payment or attribution is required.
- YouTube Audio Library: suitable for YouTube-first publishing when the individual track terms are followed, but YouTube explicitly does not provide legal guidance for off-platform use. It is not the universal website, paid-ad, Instagram, LinkedIn, and WhatsApp default.
- PremiumBeat, Artlist, Musicbed, Epidemic Sound, Soundstripe, Adobe Stock Audio, Uppbeat, and Audiio: legitimate paid licensing options, but outside the founder-approved no-third-party-music default. Do not subscribe or purchase a track without an explicit founder exception for a named asset.
- FreePD: the website states that it permanently closed in 2025.
- Any asset labeled only `royalty-free`, `free download`, or `no copyright` without an item-level CC0/Public Domain declaration.
- Any `CC BY`, `CC BY-SA`, `CC BY-NC`, `CC BY-ND`, or custom stock-library asset when the requirement is no attribution, no commercial restriction, and no separate license management.

Paid-library track suggestions such as PremiumBeat `Gadgets` or Artlist `Themis` may be used only as internal tonal references. Do not copy, publish, or build a production dependency on their preview files. Metadata is not an audition: final fit must be judged under the actual MenuList voiceover, and tracks containing backing vocals, prominent melodies, playful marimba, vocal samples, or heavy trailer energy should not be admitted merely because a catalog tags them `technology` or `corporate`.

### Admission Checklist

1. Confirm the exact recording is `CC0` or Public Domain; an old composition performed in a modern recording is not enough.
2. Confirm commercial use, synchronization to video, editing, and distribution are permitted.
3. Capture the item page and rights statement on the download date.
4. Store the source URL, creator, filename, rights marker, download date, and SHA-256 hash.
5. Run a Content ID test upload before public campaign use; public-domain status does not prevent mistaken automated claims.
6. Keep attribution in internal metadata even when it is not legally required.
7. Prefer the original MenuList procedural bed whenever external provenance is weaker than the local source chain.

## Local HyperFrames CLI Findings

The local CLI probe on July 7, 2026 used `hyperframes v0.7.40`.

Confirmed local commands:

| Command | Local result | MenuList use |
| --- | --- | --- |
| `npx hyperframes tts --help` | Available; generates speech with local Kokoro-82M | Primary local replacement for macOS `say` scratch voice |
| `npx hyperframes transcribe --help` | Available; transcribes audio/video to word-level timestamps and can export SRT/VTT | Caption timing for reels, Shorts, LinkedIn, and website variants |
| `npx hyperframes beats --help` | Available; detects beats in a music track and writes `beats/<audio>.json` | Optional timing guide when a music bed drives cuts |
| `npx hyperframes --help` | No `bgm` command listed in v0.7.40 | Use local/ledgered music files plus FFmpeg mixing instead of depending on HyperFrames BGM generation |

Confirmed Kokoro voice IDs from the local CLI:

```text
af_heart
af_nova
af_sky
am_adam
am_michael
bf_emma
bf_isabella
bm_george
ef_dora
ff_siwis
jf_alpha
zf_xiaobei
```

Confirmed language options:

```text
en-us
en-gb
es
fr-fr
hi
it
pt-br
ja
zh
```

Serial command note:

Do not run multiple first-time `npx hyperframes ...` installs in parallel. One parallel probe produced an npm cache rename race. Run CLI media probes serially when the cache is cold.

Local setup completed:

```text
/Users/danny/.cache/menulist-hyperframes-audio-venv
```

Installed into that venv:

```text
kokoro-onnx
soundfile
```

Use this environment variable for local TTS commands:

```bash
HYPERFRAMES_PYTHON=/Users/danny/.cache/menulist-hyperframes-audio-venv/bin/python
```

## Research Summary

Current HyperFrames and creator workflows point to one pattern: the video is HTML/animation driven, but the audio must be treated as a separate production layer.

Useful patterns from the research:

| Pattern | What it means for MenuList | Source |
| --- | --- | --- |
| HyperFrames is built for AI coding-agent workflows: plan, write HTML, add media, lint, preview, render | Keep HyperFrames as the only video engine and make production specs explicit for Codex to execute | [HyperFrames GitHub](https://github.com/heygen-com/hyperframes) |
| HyperFrames CLI supports TTS plus transcription for narration and word-level caption timing | Use generated or recorded voice as a real audio asset, then transcribe for caption timing instead of manually guessing captions | [HyperFrames CLI docs](https://hyperframes.heygen.com/packages/cli) |
| The website-to-HyperFrames demo uses screen captures, per-beat VO/SFX, kinetic type, and a final audio master around `-14 LUFS` | MenuList should add BGM, SFX, captions, and loudness mastering to every production video | [website-to-hyperframes-demo](https://github.com/heygen-com/website-to-hyperframes-demo) |
| Creator workflows start with `frame.md` or a design brief, storyboard, static-frame review, then motion polish | Keep the current docs-first frame plans, then render and review frames before final audio lock | [CreatorEconomy HyperFrames tutorial](https://creatoreconomy.so/p/full-tutorial-make-professional-launch-videos-for-free-hyperframes-ai) |
| Some HyperFrames workflows combine ElevenLabs voice with HyperFrames animation | Treat ElevenLabs/OpenAI/HeyGen voice as optional paid/cloud upgrades only, not the MenuList default | [MindStudio workflow](https://www.mindstudio.ai/blog/ai-video-generation-workflow-claude-code-hyperframes), [OpenAI TTS docs](https://developers.openai.com/api/docs/guides/text-to-speech), [ElevenLabs pricing](https://elevenlabs.io/pricing/api) |
| Kokoro is an open-weight 82M TTS model with Apache-licensed weights | Use Kokoro as the first local TTS candidate for draft and internal-review narration | [Kokoro GitHub](https://github.com/hexgrad/kokoro) |
| Chatterbox is an open-source TTS option with voice/emotion controls | Test Chatterbox as a second local TTS candidate if Kokoro is not good enough for MenuList tone | [Chatterbox GitHub](https://github.com/resemble-ai/chatterbox) |
| FFmpeg provides `amix`, `sidechaincompress`, and `loudnorm` for mixing, ducking, and loudness normalization | Use FFmpeg as the local audio mastering layer | [FFmpeg filters](https://ffmpeg.org/ffmpeg-filters.html) |
| Spotify normalizes playback around `-14 dB LUFS` and warns about true peaks above `-2 dB` causing distortion | Use `-14 LUFS` for social/website masters and keep true peak under `-2 dB`; use `-16 LUFS` only for dialogue-heavy private demos when needed | [Spotify loudness guidance](https://support.spotify.com/us/artists/article/track-not-as-loud-as-others/) |
| YouTube Audio Library, Pixabay, and Mixkit provide usable music/SFX libraries with their own license rules | Use only downloaded assets with license notes recorded in the project ledger; do not rely on vague "royalty free" assumptions | [YouTube Audio Library](https://support.google.com/youtube/answer/3376882), [Pixabay license summary](https://pixabay.com/service/license-summary/), [Mixkit license](https://mixkit.co/license/) |

## Why The First Draft Audio Failed

The first two drafts were useful for visual direction, but the audio failed because:

- macOS `say` sounds synthetic and flat;
- there was no founder voice, no real local TTS voice model, and no directed voice performance;
- there was no background music bed;
- there was no SFX layer for taps, QR scan, approval card, or transitions;
- the voice was not mixed against music;
- no sidechain ducking was applied;
- no final loudness normalization pass was applied;
- captions were not generated from real word-level timing.

Decision:

```text
macOS say is allowed only for rough timing scratch.
It is not allowed for production review, launch review, or public exports.
```

## MenuList Audio Direction

MenuList audio should sound:

- calm;
- controlled;
- human;
- clear;
- practical;
- founder/owner-first;
- current, but not futuristic;
- trustworthy rather than cinematic.

Avoid:

- robot voices;
- AI avatar narration;
- synthetic "AI magic" effects;
- aggressive startup launch music;
- EDM drops;
- cinematic trailer risers;
- alarm/error sounds;
- heavy whooshes;
- fake crowd or restaurant ambience that distracts from the product;
- music that makes MenuList feel like a generic SaaS ad.

Preferred music mood:

- warm modern ambient;
- light pulse;
- soft percussion;
- restrained marimba/pluck/piano/synth bed;
- 85-110 BPM for launch and reels;
- 70-95 BPM for founder POV and product demo;
- no busy vocal samples;
- no lyrics.

Preferred SFX:

- soft tap;
- quiet paper/card slide;
- subtle confirmation chime;
- restrained QR scan tick;
- low whoosh for scene transition only when needed;
- no arcade, robotic, or game-style effects.

## Voice Strategy

### Best Public Option: Founder Voice

For public launch, the strongest audio is founder voice or founder-led voiceover.

Use this for:

- Founder / Brand POV;
- 75-sec Product Launch / Hero Film;
- LinkedIn founder posts;
- investor/sales deck opener.

Recording requirements:

- quiet room;
- no fan, AC, or traffic;
- phone or mic 15-20 cm from mouth;
- record WAV, M4A, or high-quality voice memo;
- record 2-3 takes;
- pause naturally between paragraphs;
- no background music in the recording;
- no noise reduction in the recording app unless needed.

### Default Local TTS Option: Kokoro

Use Kokoro as the first local TTS candidate for internal review and production drafts.

Why:

- local-first;
- open-weight;
- Apache-licensed weights;
- small enough for fast iteration;
- better than macOS `say` for real review.

Use Kokoro for:

- 30-sec launch cut draft v2;
- reels;
- rough internal product demo narration;
- A/B voice tests before founder recording.

### Second Local TTS Candidate: Chatterbox

Use Chatterbox only if:

- Kokoro voices do not match MenuList tone;
- we need better emotion/intonation control;
- local installation is stable on the Mac;
- voice-cloning is used only with the founder's explicit consent and a clean voice sample.

### Paid/Cloud Voice Options

Paid/cloud voice providers can produce high quality, but they are not the default because the founder chose local/HyperFrames-first production.

Allowed only after explicit approval:

- OpenAI TTS;
- ElevenLabs;
- HeyGen voice/avatar workflow.

If approved, store:

- service;
- voice;
- script;
- date;
- cost/plan note;
- disclosure/compliance note where required;
- final generated file path.

## Background Music Strategy

Every production video should have a music decision:

| Video type | Music rule |
| --- | --- |
| 75-sec launch film | Yes, subtle bed with light lift after approval scene |
| 2-3 min demo walkthrough | Very low bed or no music under dense UI instruction |
| 30-sec launch announcement | Yes, clear but restrained pulse |
| Short reels | Yes, quick pulse unless voice clarity suffers |
| AI Menu Manager reel | Minimal bed, no AI sci-fi sound |
| Founder POV | Warm low bed or none under the most sincere lines |
| Paid ads | Yes, but keep voice intelligible on phone speakers |

Music asset rules:

- Use local generated/curated audio first when available.
- If downloading external music, use YouTube Audio Library, Pixabay, Mixkit, or another source only when the license is recorded.
- Keep a ledger entry for every track.
- Avoid tracks with lyrics.
- Avoid music with recognizable melodies, copyrighted samples, or uncertain Content ID history.
- Do not use a track just because it says "free" in a title.

### July 7, 2026 BGM Candidate Review

The first MenuList launch-cut BGM pass reviewed the founder-supplied free tracks:

| Track | Source | Decision | Reason |
| --- | --- | --- | --- |
| `Enlivening` by Pufino | FreeToUse | Selected for 30-sec Launch Announcement audio v2 | Calm, hopeful, light, and operational enough for MenuList's low-hype public-truth positioning |
| `Chain Reaction` by Aetheric | FreeToUse | Downloaded as alternate | Stronger product/showreel energy; better for future bumpers than the main trust-first launch cut |
| `Snap Crackle` by Aetheric | FreeToUse | Downloaded as alternate | Better fit for faster reels and ad cutdowns |
| `See You Later` by marmixer | Pixabay | Reviewed, not downloaded | License is usable, but the terminal download was blocked by a Cloudflare challenge and the tone is more romantic/piano than operational |

### July 11, 2026 Commercial-License And Opening-Audibility Review

| Track | Source | Decision | Reason |
| --- | --- | --- | --- |
| `Close Up` by Michael Ramir C. | Mixkit | Selected for MenuList brand-audio v3 | Positive technology/corporate fit, naturally audible opening, gradual first-30-second rise, and Mixkit Stock Music Free License metadata for commercial and personal projects |
| `Motivating Mornings` by Ahjay Stelino | Mixkit | Rejected for this cut | Strong energy jump around 10 seconds makes the build less controlled |
| `Running Out of Time` by Ahjay Stelino | Mixkit | Rejected for this cut | Starts more urgently and risks making the calm owner-ease story feel pressured |

License correction: FreeToUse's current plan page excludes company content and paid/sponsored use from its no-plan/personal path. Existing FreeToUse tracks remain internal rollback references only unless MenuList obtains the required commercial license. Do not describe those tracks as no-cost public launch music.

Project ledger:

```text
__docs__/videos/hyperframes/menulist-launch-announcement-30s/assets/music/LICENSES.md
```

Current audio v2 master:

```text
__docs__/videos/hyperframes/menulist-launch-announcement-30s/assets/mix/launch-announcement-audio-v2-master.wav
__docs__/videos/hyperframes/menulist-founder-brand-pov/assets/mix/founder-brand-pov-audio-v2-master.wav
```

Required ledger fields:

```text
asset_id:
file_path:
source_url:
source_name:
title:
creator:
license:
download_date:
allowed_use:
attribution_required:
notes:
```

## SFX Strategy

SFX should support product comprehension, not decorate every cut.

Use SFX for:

- upload/select source;
- private preview reveal;
- approval card appears;
- approve tap;
- customer link live;
- QR scan;
- final CTA.

Do not use SFX for:

- every text animation;
- every UI highlight;
- AI scenes unless it is a normal UI confirmation sound;
- problem scenes in a way that makes owners feel blamed.

SFX mix rule:

```text
SFX should be felt, not noticed.
If the viewer remembers the sound effect, it is probably too loud.
```

## Captions Strategy

Every public or social export needs captions.

Required caption versions:

- burned-in captions for 9:16 reels, Shorts, TikTok, and WhatsApp sharing;
- optional burned-in captions for LinkedIn;
- clean no-caption exports for website hero and editing archive;
- transcript/subtitle sidecar where platform upload supports it.

Process:

1. Generate or record final narration.
2. Transcribe narration to word-level timing.
3. Use timed captions in HyperFrames.
4. Inspect mobile safe zones at 9:16.
5. Export captioned and clean versions.

Caption style:

- short chunks;
- no more than 2 lines;
- avoid tiny text;
- place above bottom UI controls in 9:16;
- no flashy karaoke style for MenuList launch videos;
- emphasize only key terms such as `approved`, `customer link`, `review`, and `current`.

## Mixing And Mastering Standard

Target masters:

| Output | Integrated loudness | True peak | Notes |
| --- | --- | --- | --- |
| Website/social master | `-14 LUFS` | `-2 dBTP` or safer | Default public target |
| Dialogue-heavy demo | `-16 LUFS` | `-2 dBTP` or safer | Use if voice feels too loud at `-14 LUFS` |
| Paid ad cutdowns | `-14 LUFS` | `-2 dBTP` or safer | Check on phone speaker |

Track levels before final loudnorm:

| Track | Starting mix target |
| --- | --- |
| Voice | clear lead, no clipping |
| Music bed | usually 18-28 dB lower than voice while speaking |
| SFX | quiet accents, usually below voice peaks |

Use sidechain ducking:

```text
voice controls music level -> music ducks under voice -> music rises in pauses
```

FFmpeg building blocks:

```bash
# Inspect audio stream and clipping risk.
ffprobe -hide_banner -show_streams -show_format input.wav

# Mix voice and music with sidechain ducking, then normalize.
# Adjust threshold/ratio/attack/release per track.
ffmpeg \
  -i voice.wav \
  -i bgm.wav \
  -filter_complex "[1:a][0:a]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[ducked];[0:a][ducked]amix=inputs=2:normalize=0[mix];[mix]loudnorm=I=-14:TP=-2:LRA=11[aout]" \
  -map "[aout]" \
  -ar 48000 \
  master-audio.wav

# Replace draft video audio without changing the video stream.
ffmpeg \
  -i draft-video.mp4 \
  -i master-audio.wav \
  -map 0:v:0 \
  -map 1:a:0 \
  -c:v copy \
  -c:a aac \
  -b:a 192k \
  final-with-audio.mp4
```

For final public masters, prefer two-pass `loudnorm` when time allows. Single-pass is acceptable only for quick internal review.

## HyperFrames Production Pattern

Use this pattern for every MenuList video:

1. Lock script.
2. Generate or record voice.
3. Choose BGM.
4. Choose SFX set.
5. Build or update HyperFrames composition.
6. Add captions from transcript timing.
7. Render draft.
8. Mix and master final audio.
9. Mux final audio into MP4.
10. Review on laptop, earbuds, and phone speaker.
11. Export aspect-ratio variants.
12. Record asset ledger and verification notes.

## Local Experiment Plan

### Experiment 1 - Replace macOS Say With Kokoro

Goal:

Create higher-quality local narration for the existing 30-sec Launch Announcement and Founder POV.

Status:

Done for the 30-sec Launch Announcement and Founder POV audio-v2 drafts. The launch candidate set has been generated under:

```text
__docs__/videos/hyperframes/menulist-launch-announcement-30s/assets/audio-tests/
```

Selected internal-review candidate:

```text
assets/audio/voice-kokoro-af-nova-selected.wav
```

Steps:

1. Run current HyperFrames CLI help:

```bash
source ~/.nvm/nvm.sh
nvm use 22
npx hyperframes tts --help
npx hyperframes transcribe --help
```

2. Generate 3-5 voice candidates for each script.
3. Save candidates under each project:

```text
assets/audio-tests/kokoro-voice-a.wav
assets/audio-tests/kokoro-voice-b.wav
assets/audio-tests/kokoro-voice-c.wav
```

4. Start with these candidates:

```bash
npx hyperframes tts script.txt --voice af_nova --speed 0.96 --output assets/audio-tests/kokoro-af-nova.wav
npx hyperframes tts script.txt --voice am_michael --speed 0.96 --output assets/audio-tests/kokoro-am-michael.wav
npx hyperframes tts script.txt --voice bf_emma --speed 0.96 --output assets/audio-tests/kokoro-bf-emma.wav
```

5. Choose one default MenuList review voice.
6. Replace `assets/narration.wav`.
7. Re-render.
8. Compare against the old `say` draft.

Done when:

- voice is understandable on phone speakers;
- tone is calm and not robotic;
- pacing matches the visual scenes;
- no phrase sounds overexcited or synthetic in a way that hurts trust.

### Experiment 2 - Test Chatterbox Locally

Goal:

Check whether Chatterbox gives a more founder-like, calm product voice.

Stop if:

- setup is unstable;
- model/license usage is unclear;
- voice-cloning requires founder consent that has not been given;
- output is not meaningfully better than Kokoro.

### Experiment 3 - Add Music Bed

Goal:

Add a quiet MenuList music bed to the 30-sec launch cut and Founder POV.

Music brief:

```text
calm modern product launch bed, warm, light pulse, no vocals, no big drop, no AI sci-fi tone
```

Acceptance:

- voice remains primary;
- music supports momentum;
- no section feels like a hype ad;
- problem scenes stay calm, not dramatic;
- final mix passes loudness check.

Status:

Done for the 30-sec Launch Announcement and Founder POV audio-v2 drafts using `Enlivening` by Pufino. The track is ducked under the voice and normalized in the current master audio files.

### Experiment 4 - Add Minimal SFX

Use only 4-6 SFX in the 30-sec cut:

- old file stack appears;
- upload source selected;
- private preview reveal;
- approval tap;
- customer link live;
- CTA lockup.

Acceptance:

- SFX are subtle at normal laptop volume;
- no SFX competes with voice;
- no AI/futuristic sound;
- no harsh high-frequency clicks.

Status:

Deferred for the first audio v2 draft. The current file proves the corrected voice/BGM layer first. Add SFX only after founder approval of the core audio tone.

### Experiment 5 - Create Audio V2 Renders

Required output names:

```text
menulist-launch-announcement-30s-audio-v2.mp4
menulist-founder-brand-pov-audio-v2.mp4
```

These should sit next to the existing draft MP4s, not overwrite them.

Status:

```text
menulist-launch-announcement-30s-audio-v2.mp4 - rendered
menulist-launch-announcement-30s-vertical-audio-v2.mp4 - rendered
menulist-founder-brand-pov-audio-v2.mp4 - rendered
```

## Production Quality Gates

Before any video is approved for public use:

- no macOS `say` voice remains;
- voice is either founder-recorded or approved local/pro voice;
- BGM decision is explicit, including "no music" if chosen;
- SFX decision is explicit;
- music/SFX license ledger is complete;
- captions exist for social exports;
- final mix is normalized;
- true peak is below the target;
- no clipping is visible or audible;
- voice is clear on phone speakers;
- audio is checked at low volume;
- audio is checked with earbuds;
- CTA is understandable without captions;
- no unsupported claim is added in the spoken script.

## Asset Folder Standard

Each HyperFrames video project should use:

```text
assets/
  narration/
    voice-final.wav
    voice-test-kokoro-a.wav
    voice-test-kokoro-b.wav
  music/
    bgm-final.wav
    bgm-license.md
  sfx/
    tap-soft.wav
    preview-card.wav
    approved-chime.wav
    sfx-license.md
  captions/
    transcript.json
    captions.srt
  mix/
    master-audio.wav
    loudnorm-pass1.json
    mix-notes.md
```

Existing projects can keep `assets/narration.wav` for compatibility, but that file should point to the approved final voice or be clearly labelled as scratch.

## Immediate Fix Order

1. Done - Replace the 30-sec Launch Announcement scratch narration.
2. Done - Add low BGM, ducking, and loudnorm to the 30-sec cut.
3. Done - Render `menulist-launch-announcement-30s-audio-v2.mp4`.
4. Done - Generate SRT/VTT/word-timed captions for the 30-sec Launch Announcement audio-v2 render.
5. Done - Render native 9:16 `menulist-launch-announcement-30s-vertical-audio-v2.mp4`.
6. Done - Replace the Founder POV scratch narration.
7. Done - Add lower BGM, ducking, and loudnorm to Founder POV.
8. Done - Render `menulist-founder-brand-pov-audio-v2.mp4`.
9. Next - Founder listen review on laptop, earbuds, and phone speaker.
10. Next - Use the accepted audio profile for the 75-sec Product Launch / Hero Film.

## Founder Inputs That Improve Quality

The team can proceed with local TTS testing without waiting, but these inputs will make the public assets stronger:

- founder voice sample or final founder voiceover;
- preferred accent: Indian English, neutral global English, or separate Hindi/English versions;
- permission to download license-safe music/SFX from YouTube Audio Library, Pixabay, or Mixkit if local generated options are not good enough;
- confirmation whether founder POV should be talking-head, voiceover-only, or hybrid;
- final CTA pronunciation and destination.

Default if no input is provided:

- use local TTS for internal review;
- use no external paid/cloud services;
- use HyperFrames-only local rendering;
- keep final public publishing blocked until founder voice or explicit TTS approval exists.

## Source Links

- [HyperFrames GitHub](https://github.com/heygen-com/hyperframes)
- [HyperFrames CLI docs](https://hyperframes.heygen.com/packages/cli)
- [HyperFrames quickstart](https://hyperframes.heygen.com/quickstart)
- [website-to-hyperframes-demo](https://github.com/heygen-com/website-to-hyperframes-demo)
- [CreatorEconomy HyperFrames tutorial](https://creatoreconomy.so/p/full-tutorial-make-professional-launch-videos-for-free-hyperframes-ai)
- [MindStudio HyperFrames workflow](https://www.mindstudio.ai/blog/ai-video-generation-workflow-claude-code-hyperframes)
- [HeyGen HyperFrames and HeyGen docs](https://developers.heygen.com/hyperframes-heygen)
- [Kokoro GitHub](https://github.com/hexgrad/kokoro)
- [Chatterbox GitHub](https://github.com/resemble-ai/chatterbox)
- [OpenAI TTS docs](https://developers.openai.com/api/docs/guides/text-to-speech)
- [ElevenLabs API pricing](https://elevenlabs.io/pricing/api)
- [FFmpeg filters](https://ffmpeg.org/ffmpeg-filters.html)
- [Spotify loudness guidance](https://support.spotify.com/us/artists/article/track-not-as-loud-as-others/)
- [FreeToUse Chain Reaction](https://freetouse.com/music/aetheric/chain-reaction)
- [FreeToUse Enlivening](https://freetouse.com/music/pufino/enlivening)
- [FreeToUse Snap Crackle](https://freetouse.com/music/aetheric/snap-crackle)
- [YouTube Audio Library help](https://support.google.com/youtube/answer/3376882)
- [Pixabay See You Later](https://pixabay.com/music/modern-classical-see-you-later-203103/)
- [Pixabay license summary](https://pixabay.com/service/license-summary/)
- [Mixkit license](https://mixkit.co/license/)
- [Mixkit corporate music library](https://mixkit.co/free-stock-music/corporate-music/)
