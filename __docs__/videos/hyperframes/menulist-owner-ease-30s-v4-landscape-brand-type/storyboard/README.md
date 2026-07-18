# MenuList Owner Ease 30s Storyboard And Production Pack

**Status:** Storyboard-ready production pack based on the current founder-approved 30-second MenuList source
**Format:** 16:9, 1920 x 1080, 30fps
**Language:** English
**Voice direction:** Calm Indian English
**Audience:** A busy, non-technical SMB owner who already has a menu or service list

## Deliverables

| Deliverable | Purpose |
| --- | --- |
| [10-frame key storyboard](./storyboard-keyframes-10-frame.jpg) | The compact approval board, matching the numbered-frame style of the supplied references |
| [20-frame motion progression board](./storyboard-motion-progression-20-frame.jpg) | A denser motion-state board sampled every 1.5 seconds |
| [Individual storyboard frames](./frames/) | Ten 1920 x 1080 annotated JPEG frames |
| [Shot list](./shot-list.csv) | Machine-readable timing, copy, voiceover, and motion plan |
| [Canonical narration](../script.txt) | The exact 78-word narration source |
| [Storyboard source](../storyboard.md) | The maintained five-beat story and QA plan |
| [Current source MP4](../deliverables/menulist-owner-ease-30s-lyria-midnight-lofi-v1.mp4) | The founder-review video used as visual truth for these boards |

The boards are extracted deterministically from the real MenuList composition. A generative image model was intentionally not used for the UI frames because the product copy, menu items, logo, and approval states must remain exact and legible.

## Locked Brief

- **Message:** Start from the menu you already have, review a private preview, and publish one approved customer link.
- **Angle:** Owner relief and owner control, not AI capability.
- **Length:** 30 seconds.
- **Primary destination:** Website, YouTube, LinkedIn, sales deck, and product presentation.
- **Primary aspect:** Native 16:9. Any 9:16 or 1:1 version must be recomposed, not cropped.
- **Visual system:** Inter, zero tracking, light operational canvas, restrained MenuList gradient, real product UI, and the plain original MenuList identity.
- **CTA:** `Put one approved customer link online.`

## Reference Image Decisions

The supplied contact sheets are useful for their planning grammar:

- numbered frames and visible time ranges;
- one clear claim plus one proof surface per frame;
- calm white and blue palette;
- progressive UI states rather than decorative scene changes;
- a clear opening and closing brand frame.

The following reference ideas are intentionally excluded because they are unsupported, distracting, or outside this 30-second story:

- Google, Instagram, Maps, WhatsApp, or delivery-platform logos presented as automatic sync targets;
- invented review counts, ratings, analytics, traffic growth, uptime, or ranking claims;
- `We handle the rest` language that hides the required owner review and approval step;
- generic owner stock photography with no product proof;
- heavy phone bezels, neon AI styling, robots, autonomous-agent imagery, or repeated blue grids.

## 30-Second Voiceover Script

Use this verbatim for the current approved cut:

> MenuList is built for busy owners, not technical setup.
>
> Take photos of the menu you already have, or upload a PDF.
>
> MenuList turns it into a private customer preview.
>
> You do not type the full menu again.
>
> You review the items, prices, and business details.
>
> Nothing goes public until you approve.
>
> Once approved, one customer link powers your QR, page, print files, WhatsApp sharing, and customer actions.
>
> MenuList. Upload what you have. Put one approved customer link online.

The retained Tara narration runs for approximately 26.70 seconds inside the 30-second mix, leaving space for the opening identity and held final lockup.

## Frame Plan

| Frame | Time | Narrative job | On-screen copy | Voiceover cue | Motion and sound |
| --- | --- | --- | --- | --- | --- |
| 01 | 00:00-00:02 | Poster-safe identity | `MenuList` / `One approved customer link` | MenuList is built for busy owners... | Founder-final two-path symbol draw over a visible scaffold; wordmark fills left to right; music is already audible |
| 02 | 00:02-00:04 | Owner-relief hook | `Do not type your menu again.` | ...not technical setup. | Hook resolves as the opening lockup overlaps into the first proof scene |
| 03 | 00:04-00:07 | Show accepted starting points | `Upload photos. Preview appears.` | Take photos of the menu you already have, or upload a PDF. | Source cards lift in as a deliberate grid; no heavy device frame |
| 04 | 00:07-00:10 | Show preparation, not magic | `Upload photos. Preview appears.` | MenuList turns it into a private customer preview. | Restrained cursor/tap cue, upload state, and preview transition |
| 05 | 00:10-00:13 | Establish private state | `Review first. Then publish.` | You do not type the full menu again. | Private customer preview arrives with the visible `NOT PUBLIC` state |
| 06 | 00:13-00:16 | Establish owner control | `Review first. Then publish.` | You review the items, prices, and business details. Nothing goes public until you approve. | Review rows settle; cursor lands on `Review and approve`; small focus ring only |
| 07 | 00:16-00:20 | Reveal the approved link | `One link goes everywhere.` | Once approved, one customer link powers... | Approved link card becomes the hub; supporting surfaces connect without third-party platform logos |
| 08 | 00:20-00:23 | Show supported surfaces | `One link goes everywhere.` | ...your QR, page, print files, WhatsApp sharing, and customer actions. | QR, menu page, print, and sharing/action cards finish around the approved source |
| 09 | 00:23-00:27 | Summarize the owner workflow | `Put one approved customer link online.` | MenuList. Upload what you have. | Three-step approved checklist holds long enough to read; music begins its final lift |
| 10 | 00:27-00:30 | Brand close and CTA hold | `MenuList` / `One approved customer link` | Put one approved customer link online. | Founder-final lockup, subtle approval sting near the settle, then a useful nonblank final hold |

## Visual Direction

- Use the canonical [MenuList frame preset](../../../frame-presets/menulist/FRAME.md).
- Use the repo-local Inter variable font for every visible word.
- Keep letter spacing at zero.
- Use the MenuList website gradient only on one meaningful phrase per scene:

```css
linear-gradient(90deg, #0051d1 0%, #0284c7 52%, #27a8e3 100%)
```

- Keep one dominant claim and one dominant proof surface in each beat.
- Keep the in-scene MenuList identity small and bottom-right.
- Use the large two-column MenuList lockup only for the opening and final slates.
- Preserve continuous visual weight across transitions; no pale or blank flashes.
- Cursor motion must explain a real owner action, settle before clicking, and disappear when it is no longer useful.
- Do not add scene labels, production metadata, duplicate lower-thirds, or a second competing CTA.

## Audio Package

| Layer | Frozen source | Direction |
| --- | --- | --- |
| Voice | [Tara narration](../assets/audio/voice-macos-en-in-tara-192-selected-processed.wav) | Calm Indian English, practical delivery, no ad-style exaggeration |
| Background bed | [30-second MenuList Lyria bed](../../../brand-audio/mix/menulist-brand-bed-30s-lyria-midnight-lofi-v1.wav) | Founder-approved `Midnight Lo-Fi Focus` production edit for this named video |
| Approval sting | [MenuList approval sting](../../../brand-audio/sfx/menulist-approval-sting-original-v1.wav) | Use only at the final lockup settle |
| Final master | [Mixed 30-second WAV](../assets/mix/owner-ease-30s-lyria-midnight-lofi-v1-master.wav) | Voice-reactive ducking, music recovery through pauses, final controlled lift |

The current encoded reference is approximately `-15.6 LUFS` integrated with `-2.6 dBFS` true peak. Keep music present from frame zero, audible but subordinate under voice, and fuller after narration.

## Caption Direction

- Use the canonical [no-pill MenuList caption skin](../../../frame-presets/menulist/caption-skin.html).
- Keep captions to two lines maximum.
- Upcoming words are muted, the current word is MenuList blue, and spoken words settle to dark ink.
- Generate word timing from the final narration file, not from estimated storyboard timestamps.
- Deliver a clean version and a captioned version when the destination requires both.

## Source Asset Checklist

- [ ] Plain MenuList symbol: `../assets/brand/menulist-symbol-transparent.png`
- [ ] Inter variable font: `../assets/fonts/inter-latin-variable.woff2`
- [ ] Narration script: `../script.txt`
- [ ] Tara narration: `../assets/audio/voice-macos-en-in-tara-192-selected-processed.wav`
- [ ] Frozen mixed audio: `../assets/mix/owner-ease-30s-lyria-midnight-lofi-v1-master.wav`
- [ ] HyperFrames composition: `../index.html`
- [ ] Storyboard image builder: `../scripts/build_storyboard_boards.sh`
- [ ] Founder-review render: `../deliverables/menulist-owner-ease-30s-lyria-midnight-lofi-v1.mp4`

No additional stock photos, AI-generated restaurant imagery, third-party logos, or hosted media are required for this cut.

## HyperFrames Build And Render

Run locally with Node 22:

```bash
cd __docs__/videos/hyperframes/menulist-owner-ease-30s-v4-landscape-brand-type
source ~/.nvm/nvm.sh
nvm use 22

npm run check
scripts/build_audio_lyria_midnight_lofi_v1.sh

npx hyperframes render \
  --output renders/menulist-owner-ease-30s-lyria-midnight-lofi-v1.mp4 \
  --quality high \
  --fps 30 \
  --workers 1 \
  --experimental-fast-capture=false

scripts/build_storyboard_boards.sh
```

The storyboard builder is deterministic and can be rerun after any approved render revision.

## Required Export Set

1. 16:9 clean master, 1920 x 1080, H.264/AAC, 30fps.
2. 16:9 captioned master when the destination requires burned-in captions.
3. Native 9:16 composition for Reels, Shorts, TikTok, and mobile sales sharing.
4. Native 1:1 composition only when a feed or paid placement specifically requires it.

Vertical and square versions must preserve the same proof order, narration, opening/final identity, and owner-approval boundary. Do not crop the landscape frame.

## Encoded QA Gate

- [ ] Frame zero contains a useful MenuList identity before animation begins.
- [ ] The final frame is nonblank and holds through the MP4 end.
- [ ] No transition contains a white flash, black frame, accidental opacity loss, or flicker.
- [ ] Menu items, prices, button labels, and CTA copy remain legible.
- [ ] The cursor never covers important copy or the approved-link proof.
- [ ] All public claims stay inside current MenuList product truth.
- [ ] No fake ratings, reviews, analytics, rankings, traffic, uptime, or external-platform sync claims appear.
- [ ] Dimensions, duration, frame rate, codecs, loudness, true peak, and SHA-256 are recorded.
- [ ] The founder, product-truth, claim, audio, destination, and current distribution-terms gates pass before public use.

## Copy/Paste Generation Brief

```text
Create a 30-second MenuList product video for a busy, non-technical SMB owner.
The one message is: start from the menu you already have, review a private preview,
then publish one approved customer link.

Use the canonical MenuList HyperFrames frame preset, Inter with zero tracking,
the light MenuList website canvas, real product UI, one gradient decision phrase
per scene, and the plain original MenuList identity. Keep the video UI-led.

Story order: poster-safe MenuList lockup; do-not-retype hook; upload menu photos
or a PDF; private customer preview; review items, prices, and business details;
nothing public before owner approval; one approved link supporting QR, page,
print, sharing, and customer actions; ready-for-customers summary; final lockup.

Use the retained Tara Indian-English narration and the frozen Owner Ease
Midnight Lo-Fi audio master. Preserve voice-reactive ducking and the final
approval sting. No AI hype, third-party platform-sync claim, invented metric,
stock owner footage, neon treatment, heavy device frame, blank transition,
or MenuList AI lockup. Render locally in HyperFrames at 1920x1080, 30fps.
```
