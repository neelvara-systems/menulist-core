# MenuList Founder-Approved Video Production Standard

**Status:** Locked default for future MenuList video assets  
**Created:** July 11, 2026  
**Scope:** Launch films, product demos, feature videos, reels, ads, onboarding clips, founder videos, website videos, and future aspect-ratio variants

## Authority

This document records the durable production decisions established through founder review of the MenuList Owner Ease V4 video iterations.

Use it before scripting, designing, animating, mixing, rendering, reviewing, or adapting any MenuList video. When an older handoff, draft, prompt, or visual reference conflicts with this document, this standard wins unless the founder explicitly changes the rule for a named asset.

Supporting technical and conversion documents remain authoritative for their own layers:

- [HyperFrames operating guide](./videos_hyperframes-operating-guide.md);
- [conversion brief template](./videos_conversion-brief-template.md);
- [campaign measurement ledger](./videos_campaign-measurement-ledger.md);
- [brand-audio package](./brand-audio/).

## 1. Product Positioning

MenuList is public-business truth infrastructure for SMBs. It is not positioned as:

- a QR-menu-only builder;
- generic AI restaurant software;
- a flashy SaaS dashboard;
- an autonomous external-platform updater;
- a ranking, traffic, revenue, or growth guarantee.

The default product line is:

```text
One approved customer link for your menu, services, and business details.
```

The AI-era expansion is allowed only when source readiness or discovery is the subject:

```text
One approved customer link - ready for customers, search, and AI-era discovery.
```

This is readiness language, not a claim that MenuList guarantees rankings, recommendations, citations, traffic, or automatic updates to Google, Instagram, Zomato, Swiggy, or other external platforms.

## 2. Non-Technical Owner Story

Every launch and setup video must make starting feel small and practical for a non-technical SMB owner.

Default proof order:

1. The owner already has a menu or service list.
2. The owner uploads menu photos or a PDF already on the phone.
3. No full-menu retyping is required to start.
4. MenuList prepares the first private customer version.
5. The owner checks the important information.
6. Nothing important goes public until the owner approves.
7. One approved customer link then supports QR, page, print, sharing, and customer actions.

Preferred owner-relief lines:

- `Do not type your menu again.`
- `Already have a menu? Start there.`
- `Upload menu photos or a PDF.`
- `Private preview first.`
- `Review before publishing.`
- `Create your customer link in minutes.`
- `One approved list. Every customer link.`

Do not lead with dashboards, setup forms, technical terminology, integrations, or AI capability. Lead with the smallest owner action and its visible outcome.

## 3. Production Stack

- Use local HyperFrames plus FFmpeg on the founder's Mac by default.
- Use Node 22 for HyperFrames commands.
- Do not introduce Remotion, paid rendering, cloud rendering, AI avatars, or parallel video stacks unless explicitly requested for a named experiment.
- Keep source, frozen media, licensing records, project docs, review frames, and rendered MP4s under `__docs__/videos/`.
- Create native aspect-ratio compositions. Do not crop a landscape master into a vertical deliverable.

## 4. Website-Aligned Typography

Use the MenuList website typography system across all video content and UI.

### Font

- Inter is the default and must be used across headlines, body copy, UI, labels, captions, CTA text, and logo-supporting type.
- Use the repo-local Inter variable font from `src/fonts/local/inter-latin-variable.woff2` and freeze a copy inside each render project when needed.
- Do not mix Inter with serif, mono, Poppins, Avenir, or decorative headline fonts unless a future founder-approved identity change replaces this standard.

### Spacing

- Letter spacing is `0` everywhere, including uppercase labels.
- H1 line height: `1.08`.
- H2 line height: `1.12`.
- Video body line height: `1.5` by default; increase only when a denser explanatory frame needs it.
- Caption line height: `1.35`.
- UI labels and buttons: `1.2-1.3` depending on size.
- Avoid cramped headline leading, negative tracking, and oversized type that pushes proof below mobile safe zones.

### Gradient Highlight

Use the exact MenuList website gradient:

```css
linear-gradient(90deg, #0051d1 0%, #0284c7 52%, #27a8e3 100%)
```

Rules:

- highlight one meaningful decision phrase per scene;
- keep the rest of the headline dark `#0f172a` for authority and contrast;
- use the gradient for owner outcomes such as `your menu again`, `Review first`, `One link`, or `approved customer link`;
- do not apply gradient styling to body copy, dense UI text, every label, or entire paragraphs;
- do not turn the gradient into a decorative page background.

## 5. Visual Language

Default visual direction:

- light operational canvas using MenuList website colors;
- UI-first product proof;
- clean phone and desktop surfaces without heavy black device frames;
- soft glass only where it improves separation;
- restrained shadows and borders;
- one dominant claim and one dominant proof surface per beat;
- scene-specific low-opacity operational words may appear behind content and animate letter by letter;
- equivalent source or option cards use a deliberate grid with consistent gaps and no accidental overlap;
- internal scene names, beat labels, and production metadata never appear in audience-facing frames;
- supporting lower-thirds appear only when they add unique necessary information; do not repeat a claim already readable in the headline, body, or proof UI;
- persistent in-scene identity uses a quiet bottom-right symbol-and-name watermark rather than a top-left header lockup;
- real MenuList logo and product identity assets only.

Avoid:

- repeated blue horizontal bands, repeated grid patterns, or background tiling artifacts;
- dark borders around every card;
- heavy phone bezels;
- nested card-on-card layouts;
- neon or futuristic AI styling;
- glowing brains, robots, or autonomous-agent imagery;
- generic restaurant stock footage with no product proof;
- fake testimonials, customer logos, metrics, charts, or revenue claims.

Current founder direction is to keep the active launch iteration UI-led and skip real-world footage until explicitly reintroduced.

## 6. Content Styling

- Keep on-screen copy short enough to read without pausing.
- Use sentence case for primary copy and uppercase only for short operational labels.
- Match text size to the surface: large type for the main claim, compact type inside UI cards.
- Use one clear CTA per video.
- Keep captions mobile-readable and limited to two lines.
- Keep any necessary lower-third spatially separate from decorative background words, progress indicators, and proof surfaces.
- Do not use tiny corner tags as a second hierarchy. Internal labels belong in the storyboard, not the rendered video.
- Preserve a visible proof surface whenever voiceover makes a product claim.
- Do not let decorative background words compete with foreground copy.
- Do not show more text merely because the frame has empty space.

## 7. Motion And Interaction

Mouse and cursor motion is useful only when it explains the workflow.

Required interaction behavior:

- lead into the target rather than appearing on it;
- settle briefly before the action;
- show a restrained focus glow or tap ring;
- use press and release feedback on the actual target;
- keep zooms modest and centered on the relevant action;
- move the cursor along a human path rather than a rigid straight jump;
- hide the cursor when it no longer adds meaning.

Do not cover labels, prices, buttons, or the approved-link proof with the cursor or annotation.

Animation should use short material-style lift, scale, blur, and settle. Avoid constant floating, elastic movement, aggressive parallax, and animation that changes layout dimensions.

## 8. Scene Transitions

- Use overlapping refocus transitions rather than hard cuts to pale or empty frames.
- Keep the outgoing proof visible until the incoming scene has enough visual weight.
- Use light veils sparingly and below the level that washes the frame toward blank white.
- Check both sides of every transition in the encoded MP4.
- No scene change may feel like flicker, accidental opacity loss, or a blank frame.

## 9. Logo, Poster Frame, And Final Slate

- Use the supplied plain transparent MenuList symbol directly.
- Do not place the symbol inside a square app tile, white card, or separate logo container.
- Do not add a faded duplicate or replica behind the logo.
- Keep the brand name `MenuList`; do not change the final lockup to `MenuList AI`.
- During content scenes, keep the persistent MenuList identity small, plain, and bottom-right; it must read as authorship rather than website navigation.
- The first encoded frame must be useful as a sharing poster. It must show the plain MenuList symbol, `MenuList`, and `One approved customer link`, or another founder-approved meaningful opening composition.
- Default opening and final slates use a two-column lockup: the symbol is the left column; the right column contains `MenuList` on row one and `One approved customer link` on row two, with both text rows left-aligned to the same edge.
- Use the exact icon-only SVG geometry from `src/components/atoms/animatedVerticalLogo/` for the slate mark.
- Opening and final treatment: combine a faint complete scaffold, one genuine two-path gradient draw from full dash offsets to zero, and one lighter trace pass before the finished mark settles.
- Keep the opening scaffold visible enough that encoded frame zero remains a useful branded poster even before the real path draw completes.
- Use approximately `1.0-1.05s` for the real path draw and `0.88s` for the trace. Do not compress the complete sequence into a rushed half-second effect.
- Do not use the component's infinite CSS loop in rendered video. Run one combined cycle per slate and hold the complete lockup.
- The symbol animation is founder-final and frozen. Do not change its paths, scaffold, gradient draw, trace, geometry, or timing during later wordmark, tagline, slate, or audio revisions.
- Animate the `MenuList` wordmark as a separate layer: retain a readable faint scaffold, then fill characters in strict left-to-right order through a soft mask/blur and restrained blue-to-ink settle.
- A single quiet gradient baseline sweep may accompany the wordmark fill, but it must disappear before the clean static hold. Do not use scrambled letters, random order, rearrangement, spinning glyphs, bounce, a typewriter cursor, or a fantasy-specific imitation.
- Do not make frame zero depend on a delayed GSAP reveal. The opening identity must be visible in the encoded MP4 before timeline animation begins.
- Hold the opening identity long enough for phone and social previews to capture it, then dissolve it into the first product scene without a blank or pale flash.
- The final slate must contain a large symbol, the MenuList wordmark, and a concise supporting line.
- The current supporting line is `One approved customer link`.
- Use a smooth staged reveal with a restrained bump/settle and the brand sonic mark.
- Hold a useful nonblank final frame through the end of the MP4.

## 10. Audio Standard

### Voice

- Use an Indian-English voice by default for the current launch system.
- Current local reference: macOS `Tara` at the reviewed rate and processing profile.
- Voice must be calm, practical, clear, and owner-focused.
- Avoid exaggerated advertising delivery, strong foreign accents, AI-avatar voices, and robotic pacing.

### Music

- The Owner Ease 30s V4 video must use the founder-approved and frozen `Midnight Lo-Fi Focus` Lyria production edit. Do not replace it during later visual, caption, aspect-ratio, or export work unless the founder explicitly reopens audio selection for that named video.
- Other MenuList videos may select a purpose-fit track; they must inherit the same generated-source ledger, narration-space, voice-reactive ducking, controlled timeline lift, and encoded-audio QA rules.
- Use the documented two-minute library as the first audition set for future assets: Product Demo for UI-led walkthroughs, Owner Humanistic for non-technical owner-ease stories, and Launch Momentum for progressive reveal/CTA edits. The library is indexed in `brand-audio/library/README.md`.
- A library selection is still a per-video decision. Do not force one track across every format, and do not replace the frozen Owner Ease 30s V4 bed from this library.
- Generate new candidates from the purpose-specific V2 preset library in `brand-audio/presets/README.md`. Do not create generic AI, cinematic-vocal, or duplicate SaaS presets when an existing narrative-job preset applies.
- Do not use paid-plan, subscription, attribution-dependent, or third-party catalog music in the default production path. Retain the generated WAV, model, preset, seed, timestamp, and hash with every approved Lyria source.
- Music should begin smoothly, build energy across the timeline, and make the final lockup feel charged without overpowering narration.
- Keep music present from the opening, lower it decisively while narration is active, recover it smoothly through speech pauses, and return to the full bed after narration.
- Do not hold BGM at one constant level. Use voice-reactive sidechain movement; the current Lyria bed uses `2.8:1`, `35ms` attack, and `430ms` release plus a wider production gain lift.
- Keep the under-voice bed audible but subordinate. The viewer should notice the lift in pauses without hearing obvious pumping or losing a word of narration.
- Use the subtle MenuList approval sting at the final lockup when it fits.

### Mix

- Current reference master: approximately `-15.5 LUFS` integrated and `-1.8 dBFS` true peak after AAC encoding.
- Check phone speaker, laptop speaker, earbuds, and headphones before public approval.
- Keep music and voice decisions reviewable independently where possible.

The Lyria Midnight Lo-Fi source and mix are founder-approved and frozen for Owner Ease 30s V4. Future assets should inherit its production discipline instead of assuming that every video must reuse the same composition.

## 11. Aspect Ratios And Exports

- `16:9`: website, YouTube, LinkedIn, product demo, sales deck.
- `9:16`: Instagram Reels, YouTube Shorts, TikTok, mobile sales sharing.
- `1:1`: paid/social feed only when needed.
- Recompose natively for every aspect ratio.
- Keep essential text inside platform-safe margins.
- Deliver captioned and clean versions where required by the handoff.
- Return a direct local `.mp4` link after rendering.

## 12. Iteration Workflow

Work on one video until its visual, audio, message, and motion system is approved. Do not expand all 12 videos from an unstable reference.

For every meaningful revision:

1. Keep the conversion job and proof order fixed unless the test explicitly changes them.
2. Change one primary variable when possible.
3. Render snapshots at key beats.
4. Review encoded frame zero, cursor positions, text wrapping, gradient emphasis, and final slate.
5. Render the high-quality MP4 locally.
6. Extract encoded frames at key beats and both sides of transitions.
7. Verify dimensions, duration, codecs, loudness, true peak, black frames, and SHA-256.
8. Update the project README, production index, campaign ledger, and changelog.
9. Keep public and paid eligibility blocked until the required founder/product/claim/audio gates pass.

## 13. Pre-Delivery Checklist

- [ ] Product is positioned beyond QR menu.
- [ ] Setup begins with the owner's existing menu photos or PDF.
- [ ] No-retyping and private-preview relief are clear where relevant.
- [ ] Owner approval is visible before important public changes.
- [ ] One approved customer link remains the outcome.
- [ ] Inter is embedded and used everywhere.
- [ ] Letter spacing is zero.
- [ ] Headline, body, label, and caption line heights are deliberate.
- [ ] Only one meaningful gradient phrase appears per scene.
- [ ] No internal scene label or production metadata appears in an audience-facing frame.
- [ ] No lower-third card repeats a claim already communicated by the primary hierarchy.
- [ ] No dark device frames, repeated blue patterns, or uncontrolled glass/neon effects.
- [ ] Cursor, tap, and zoom cues point to the actual action without covering content.
- [ ] Transitions preserve continuous visual information.
- [ ] Original MenuList symbol is plain, large, and unduplicated.
- [ ] Opening and final lockups use the symbol-left, name/tagline-right structure with both text rows sharing one left edge.
- [ ] Both slates combine the poster-safe scaffold, true two-path draw, and lighter trace at the reviewed slower timing; neither treatment loops.
- [ ] The founder-final symbol animation remains unchanged; wordmark motion is isolated to the text layer.
- [ ] `MenuList` fills in strict reading order over a readable scaffold, and any baseline sweep disappears before the held lockup.
- [ ] Encoded frame zero is a useful branded poster frame, not an empty background.
- [ ] Final slate says `MenuList`, not `MenuList AI`.
- [ ] Final frame is nonblank and held through the end.
- [ ] Owner Ease 30s V4 uses the frozen Lyria Midnight Lo-Fi source and mix; other assets use a documented purpose-fit track.
- [ ] No paid-plan, subscription, or attribution-dependent music is present.
- [ ] The active generated source retains its model, preset, seed, timestamp, manifest, and hashes.
- [ ] BGM lowers under active voice, recovers through pauses, and does not remain at one loud constant level.
- [ ] Encoded MP4 has been visually and technically reviewed.
- [ ] Claims contain no ranking, revenue, growth, recommendation, or unsupported integration promise.
- [ ] Documentation and campaign ledger are current.

## Current Reference Asset

Use these native founder-review masters as the visual and production references:

[Owner Ease V4 1920 x 1080 Lyria Midnight Lo-Fi founder-review MP4](./hyperframes/menulist-owner-ease-30s-v4-landscape-brand-type/deliverables/menulist-owner-ease-30s-lyria-midnight-lofi-v1.mp4)

The current bed is a MenuList-specific production edit of the founder-selected Lyria Realtime take; the approval sting is an original procedural MenuList asset. The generated-source manifest and current Google-terms review remain part of the release gate.

The active source project is:

[MenuList Owner Ease V4 landscape HyperFrames project](./hyperframes/menulist-owner-ease-30s-v4-landscape-brand-type/)

Native vertical and square versions must be rebuilt from this frozen standard after landscape approval. Superseded aspect-ratio experiments are not reference assets.
