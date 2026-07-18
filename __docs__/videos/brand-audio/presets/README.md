# MenuList Lyria Preset Library V2

**Status:** Recommended generation presets for future MenuList video assets  
**Updated:** July 13, 2026  
**Machine-readable handoff:** `menulist-lyria-preset-library-v2.json`

**AI Studio installation prompt:** `ai-studio-preset-install-prompt.md`

## Decision

Use a small set of presets organized by narrative job. Do not keep creating near-duplicate "SaaS", "AI", or "technology" tracks.

| Priority | Preset | Duration | Primary use |
| ---: | --- | ---: | --- |
| 1 | MenuList Public Truth Hero | 75s | Main launch film and website hero |
| 2 | MenuList Quiet Product Walkthrough | 180s | Product demo, onboarding, sales calls |
| 3 | MenuList Owner Relief | 60s | Photo/PDF setup, old-file pain, owner-ease stories |
| 4 | MenuList Approval First | 45s | Owner approval and AI Menu Manager videos |
| 5 | MenuList One Link Motion | 30s | Primary default: launch cut, one-link reel, feature reveal, paid social |
| 6 | MenuList Founder Plainspoken | 90s | Founder POV and talking-head edits |
| 7 | MenuList Outlet Control | 60s | Approved alternate: multi-location and premium-plan explainers |

## Shared Generation Rules

- Generation mode: `QUALITY`.
- Voiceover Background: enabled, raw dry mix.
- Vocalization: disabled.
- Mute options: off unless a specific audition requires a drumless stem.
- Use fixed seeds and keep the generated WAV, timestamp, manifest, and SHA-256 hash.
- Keep density between `0.18` and `0.38`; narration and product comprehension stay primary.
- No cinematic vocal pads, vocal drones, deep cinematic beats, crisp techno percussion, aggressive arpeggios, trailer impacts, or dominant lead melody.
- Automation must interpolate smoothly. No abrupt preset switch, drop, or end-only volume jump.
- Generate at least 15 seconds beyond the intended edit so the editor can cut a clean ending.
- Treat the generated track as a pre-mix source. Final videos still require voice-reactive ducking and encoded-audio QA.

## Preset 1: MenuList Public Truth Hero

**Job:** Calm authority at the opening, clear product momentum through the middle, confident brand resolution at the end.

- Duration: `75s`
- Seed: `260715`
- BPM: `106`
- Scale: `D Major / B Minor`
- Temperature: `0.72`
- Guidance: `3.8`
- Top K: `24`
- Density: `0.30`
- Brightness: `0.54`

Prompt mix:

| Layer | Weight |
| --- | ---: |
| Refined minimal electronic brand soundtrack | `1.25` |
| Warm restrained analog synth pads | `0.60` |
| Clean muted rhythmic pluck | `0.55` |
| Soft precise modern percussion | `0.35` |
| Subtle confident bass pulse | `0.22` |

Automation: sparse for `0-8s`, introduce the pluck by `24s`, reach the full controlled rhythm by `48s`, lift slightly from `48-66s`, then reduce percussion and widen the pad for the final lockup.

## Preset 2: MenuList Quiet Product Walkthrough

**Job:** Remain almost invisible under a two-to-three-minute screen demonstration while avoiding flat, lifeless repetition.

- Duration: `180s`
- Seed: `260716`
- BPM: `100`
- Scale: `G Major / E Minor`
- Temperature: `0.62`
- Guidance: `4.0`
- Top K: `18`
- Density: `0.22`
- Brightness: `0.50`

Prompt mix:

| Layer | Weight |
| --- | ---: |
| Minimal unobtrusive electronic product demonstration music | `1.35` |
| Warm soft analog pad | `0.52` |
| Sparse muted digital pluck | `0.38` |
| Light precise percussion without fills | `0.24` |
| Subtle steady bass pulse | `0.16` |

Automation: use slow `40-50s` breathing cycles. Keep changes within `0.08` weight points, avoid fills, and add only a small final lift during the last `12s`.

## Preset 3: MenuList Owner Relief

**Job:** Make setup feel easy and human for a non-technical SMB owner without making MenuList sound like a restaurant lifestyle brand.

- Duration: `60s`
- Seed: `260717`
- BPM: `96`
- Scale: `F Major / D Minor`
- Temperature: `0.68`
- Guidance: `3.8`
- Top K: `22`
- Density: `0.26`
- Brightness: `0.52`

Prompt mix:

| Layer | Weight |
| --- | ---: |
| Warm muted acoustic pluck tones | `0.85` |
| Subtle low-pass electric piano chords | `0.75` |
| Warm soft analog pad | `0.48` |
| Sleek organic percussion flow | `0.30` |
| Gentle modern electronic bass | `0.18` |

Automation: begin with piano and pad, introduce the muted pluck after `7s`, add light organic movement after `18s`, and resolve with a warmer pad rather than a percussion hit.

## Preset 4: MenuList Approval First

**Job:** Support the sequence "MenuList prepares, owner reviews, owner approves" with a controlled sense of completion.

- Duration: `45s`
- Seed: `260718`
- BPM: `104`
- Scale: `D Major / B Minor`
- Temperature: `0.65`
- Guidance: `4.1`
- Top K: `20`
- Density: `0.25`
- Brightness: `0.56`

Prompt mix:

| Layer | Weight |
| --- | ---: |
| Minimal unobtrusive electronic product demonstration music | `1.00` |
| Clean muted rhythmic pluck | `0.45` |
| Warm restrained analog synth pads | `0.45` |
| Light precise percussion without fills | `0.28` |
| Subtle confident bass pulse | `0.15` |

Automation: prepare from `0-10s`, establish the review rhythm from `10-25s`, create a brief restrained hold from `25-31s`, then lift harmonically from `31-38s` and resolve through `45s`. Add the separate MenuList approval sting only in the final video mix.

## Preset 5: MenuList One Link Motion

**Job:** Give short launch cuts and reels immediate movement without becoming noisy or hyperactive.

**Founder status:** Primary default generation direction for new MenuList videos as of July 14, 2026.

- Duration: `30s`
- Seed: `260719`
- BPM: `112`
- Scale: `G Major / E Minor`
- Temperature: `0.75`
- Guidance: `3.7`
- Top K: `26`
- Density: `0.38`
- Brightness: `0.62`

Prompt mix:

| Layer | Weight |
| --- | ---: |
| Refined minimal electronic brand soundtrack | `1.10` |
| Clean muted rhythmic pluck | `0.70` |
| Light syncopated percussion shakers | `0.45` |
| Warm soft analog pad | `0.40` |
| Subtle steady bass pulse | `0.20` |

Automation: recognizable hook in `0-3s`, establish the product rhythm by `8s`, widen from `12-23s`, and remove shaker density during the final brand lockup instead of ending with a hard drop.

## Preset 6: MenuList Founder Plainspoken

**Job:** Support a sincere founder voice without telling the viewer what emotion to feel.

- Duration: `90s`
- Seed: `260720`
- BPM: `92`
- Scale: `C Major / A Minor`
- Temperature: `0.58`
- Guidance: `4.2`
- Top K: `16`
- Density: `0.18`
- Brightness: `0.46`

Prompt mix:

| Layer | Weight |
| --- | ---: |
| Warm soft analog pad | `0.78` |
| Minimal unobtrusive electronic product demonstration music | `0.65` |
| Subtle low-pass electric piano chords | `0.48` |
| Sparse muted digital pluck | `0.28` |
| Light precise percussion without fills | `0.12` |

Automation: no percussion during the first `20s`; introduce sparse pluck between `20-45s`; allow only very light percussion from `45-75s`; return to pad and piano for the closing statement.

## Preset 7: MenuList Outlet Control

**Job:** Communicate consistency, governance, and controlled local flexibility for multi-location operators.

**Founder status:** Approved operational alternate as of July 14, 2026.

- Duration: `60s`
- Seed: `260721`
- BPM: `108`
- Scale: `D Major / B Minor`
- Temperature: `0.70`
- Guidance: `3.9`
- Top K: `22`
- Density: `0.32`
- Brightness: `0.55`

Prompt mix:

| Layer | Weight |
| --- | ---: |
| Refined minimal electronic brand soundtrack | `0.95` |
| Clean muted rhythmic pluck | `0.45` |
| Sleek low-pass synth melody pulse | `0.32` |
| Soft precise modern percussion | `0.35` |
| Subtle confident bass pulse | `0.25` |

Automation: start restrained for the fragmented-state problem, establish a steady master-list pulse by `16s`, add a second quiet rhythmic layer during outlet variation, then converge to one stable pattern for the final `12s`.

## Recommended Generation Order

Generate and review in this order:

1. Public Truth Hero
2. Quiet Product Walkthrough
3. Approval First
4. Owner Relief
5. One Link Motion
6. Founder Plainspoken
7. Outlet Control

Do not approve a preset from solo listening alone. Test it under the actual Indian-English voiceover and representative MenuList UI motion first.
