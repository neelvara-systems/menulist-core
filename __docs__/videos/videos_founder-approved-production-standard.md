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
- [founder-review version ledger](./videos_version-ledger.md);
- [campaign measurement ledger](./videos_campaign-measurement-ledger.md);
- [market, format, and script system](./videos_market-format-and-script-system.md);
- [asset intake and readiness contract](./videos_asset-intake-and-readiness.md);
- [brand-audio package](./brand-audio/).

## 1. Product Positioning

Internally, MenuList is public-business truth infrastructure for SMBs. This is category and architecture language for production strategy, partners, investors, and ecosystem explanation. Do not speak it or render it in owner-acquisition, website, launch, onboarding, sales, support, or paid-video copy.

For non-technical owners, lead with the concrete problem and outcome: old menus, conflicting prices, scattered PDFs or links, and one owner-approved customer link for the latest published version. MenuList is not positioned as:

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

Do not use `always current`, `customers always see the current version`, `update once everywhere`, or similar absolute freshness and propagation claims. Prefer `latest owner-approved publish`, `latest published version`, and `supported MenuList outputs`. Name owner review and publishing whenever the workflow depends on them.

## 2. Non-Technical Owner Story

Every launch and setup video must make starting feel small and practical for a non-technical SMB owner.

Default proof order:

1. The owner already has a menu or service list.
2. The current product sign-in boundary is shown accurately.
3. The owner uploads menu photos or a PDF already on the phone.
4. The owner does not need to retype the whole menu before beginning.
5. MenuList prepares the first private customer version.
6. The owner checks the important information.
7. Nothing important goes public until the owner approves.
8. One approved customer link then supports QR, page, print, sharing, and customer actions.

Preferred owner-relief lines:

- `No need to retype the whole menu before you begin.`
- `Already have a menu? That is enough to start.`
- `Upload menu photos or a PDF.`
- `Private preview first.`
- `Review before publishing.`
- `MenuList prepares a private customer preview.`
- `One approved list. Every customer link.`

Do not lead with dashboards, setup forms, technical terminology, integrations, or AI capability. Lead with the smallest owner action and its visible outcome.

## 3. Production Stack

- Use local HyperFrames plus FFmpeg on the founder's Mac by default.
- Use Node 22 for HyperFrames commands.
- MenuList video production is zero-cost and local-only. Do not use paid APIs, subscriptions, metered credits, cloud rendering or generation, paid catalogs, paid plugins, or account-backed generation services.
- Do not introduce Remotion, paid rendering, cloud rendering, AI avatars, or parallel video stacks. Only an explicit future founder decision that reverses the zero-cost local-only rule may reopen them.
- Keep source, frozen media, licensing records, project docs, review frames, and rendered MP4s under `__docs__/videos/`.
- Create native aspect-ratio compositions. Do not crop a landscape master into a vertical deliverable.
- Use [the canonical MenuList FRAME preset](./frame-presets/menulist/FRAME.md) as the video-first brand and motion authority. Copy it into each active project as lowercase `frame.md`.
- Use [the canonical no-pill caption skin](./frame-presets/menulist/caption-skin.html) for word-timed narration unless a named asset has a founder-approved caption experiment.

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
- Default word-timed captions have no enclosing pill or card: upcoming words are muted, the current word is MenuList blue, and spoken words settle to dark ink.
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

Short, reusable motion graphics are an approved production layer when one message carries the full asset, narration is unnecessary, and the useful duration is normally 3-10 seconds. Use them for brand stings, upload-to-preview transformations, approval moments, one-link propagation, multi-location governance, lower-thirds, and CTA cards. Use the [HyperFrames operating guide](./videos_hyperframes-operating-guide.md#menulist-motion-graphics-layer) for the routing and export contract.

Do not replace a coherent launch, demo, feature, or founder story with a sequence of disconnected animated cards. Motion-graphics modules should strengthen product proof and pacing inside the longer edit.

For motion-graphics prompts, state what the viewer must understand and provide the real content. Do not request visual effects by name. The production system chooses motion that fits the message while remaining inside this standard.

Charts, stat cards, and count-ups require verified real data with a source date and contextual label. Never animate an invented customer count, revenue result, ranking result, install count, adoption rate, or performance claim.

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

## 8. Retention Engineering

Retention is a comprehension and relevance problem, not permission to make MenuList louder, faster, or less trustworthy.

Every public, social, launch, website, sales, or paid cut must satisfy this opening contract:

1. The first encoded frame is poster-safe and already communicates the owner-facing promise.
2. MenuList identity and a recognizable source or product surface are visible within the first `1.5s`.
3. The message promised by the thumbnail, post copy, and opening frame is the same message.
4. The first real product transformation or proof moment lands by approximately `5s`.
5. The product's value is stated by the second beat; later beats provide evidence.

For feed-native cuts, do not spend the opening on a standalone logo slate. Preserve the plain MenuList identity, but combine it with the owner hook and source/product proof in the same composition. The full founder-frozen lockup remains appropriate for the held ending and for a brief overlapping opening treatment that does not delay the proof.

Use meaningful visual progression:

- target one new visual event every `1.5-2.5s` during the first `6s`;
- allow `2-4s` proof holds later when the viewer needs to read UI;
- reveal elements when the narration or on-screen story names them;
- keep one focal movement at a time;
- use intake, preparation, row reveal, approval, status change, causal expansion, or customer outcome as the motion event;
- prefer a clear still hold over decorative breathing, drifting, floating, or an unnecessary cut.

Motion must add information. A cursor action, row reveal, private-to-approved status change, or one-link expansion earns attention because it explains the workflow. Repeated zooms, random whooshes, background activity, and card movement that reveal nothing do not.

Do not adopt unsupported viral-video shortcuts:

- no claim that an algorithm must distribute a video;
- no universal retention percentage presented as a MenuList target;
- no sunk-cost manipulation claim tied to a fixed watch time;
- no mandatory cut every `1.7s` or other fixed shot-rate rule;
- no automatic `10%` speed-up of the final video;
- no change to hook, body, proof order, voice, music, CTA, destination, and aspect in one A/B test.

Judge a cut with both attention and business-quality signals:

- `3s` hold and `5s` engaged view;
- `25%`, `50%`, `75%`, and completion where available;
- linked destination visit;
- source selected, upload completed, and private preview reached where available;
- owner review and first approved customer link where available;
- category misunderstanding and unsupported-integration questions as guard signals.

Retention alone does not define a winner. Reject a higher-retention variant when it creates worse owner understanding, lower private-preview progress, lower approval quality, or misleading expectations.

## 9. Scene Transitions

- Use overlapping refocus transitions rather than hard cuts to pale or empty frames.
- Keep the outgoing proof visible until the incoming scene has enough visual weight.
- Use light veils sparingly and below the level that washes the frame toward blank white.
- Check both sides of every transition in the encoded MP4.
- No scene change may feel like flicker, accidental opacity loss, or a blank frame.

## 10. Logo, Poster Frame, And Final Slate

- Use the supplied plain transparent MenuList symbol directly.
- Do not place the symbol inside a square app tile, white card, or separate logo container.
- Do not add a faded duplicate or replica behind the logo.
- Keep the brand name `MenuList`; do not change the final lockup to `MenuList AI`.
- During content scenes, keep the persistent MenuList identity small, plain, and bottom-right; it must read as authorship rather than website navigation.
- The first encoded frame must be useful as a sharing poster. It must show the plain MenuList symbol, `MenuList`, and `One approved customer link`, or another founder-approved meaningful opening composition.
- For feed-native cuts, the meaningful opening composition should combine this identity with the owner hook and source/product proof. Do not use a logo-only opening when it delays the first product evidence.
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
- The default final slate contains only the large symbol and a left-aligned text column with `MenuList`, `One approved customer link`, and `menulist.ai`.
- Keep `menulist.ai` readable after the 1920x1080 frame is reduced to approximately 590px wide in a phone preview. Use at least a 30px source font for the current landscape lockup.
- When plain domain text loses clarity, place it in a quiet destination label: pale blue fill, thin blue border, 8px radius, dark blue text, and compact horizontal padding. It must read as a URL label, not as a primary button or interactive CTA.
- In the default final lockup, keep `MenuList` and `One approved customer link` left-aligned to the same edge, then center the compact `menulist.ai` label horizontally within that right-hand text column. Do not center the wordmark or tagline, and do not stretch the domain label to the column width.
- Do not add a button-shaped CTA or repeat the product proof below the lockup. An MP4 button is not interactive, and the video has already established the workflow.
- Put conversion actions in the platform CTA, post copy, linked website placement, or sales message. Bake a CTA into the slate only when a specific paid format requires it and founder review approves the exception.
- Use a smooth staged reveal with a restrained bump/settle and the brand sonic mark.
- Hold a useful nonblank final frame through the end of the MP4.
- Review the final lockup at full resolution and in a phone-scale simulation before approval; the wordmark, tagline, and domain must remain independently readable.

## 11. Audio Standard

### Voice

- Use an Indian-English voice by default for the current launch system.
- Current local reference: macOS `Tara` at the reviewed rate and processing profile.
- Voice must be calm, practical, clear, and owner-focused.
- Avoid exaggerated advertising delivery, strong foreign accents, AI-avatar voices, and robotic pacing.

### Music

- The Owner Ease 30s V4 video must use the founder-approved and frozen `Midnight Lo-Fi Focus` Lyria production edit. Do not replace it during later visual, caption, aspect-ratio, or export work unless the founder explicitly reopens audio selection for that named video.
- `MenuList One Link Motion v2`, seed `260719`, is the founder-selected primary default for new MenuList background music. Start with it for general launch, one-link, feature, and short-form conversion assets.
- `MenuList Outlet Control v2`, seed `260721`, is a founder-approved alternate for multi-location, outlet-governance, and operational stories.
- `Midnight Lo-Fi Focus` remains the founder-approved calm baseline and stays frozen for Owner Ease `v1.0`.
- The global machine-readable selection policy is `brand-audio/track-policy.json`. Default means first audition choice, not a forced fit. For an asset longer than the selected source, create a structured extension from the approved preset or use the two-minute library; do not carelessly loop a short source.
- Keep each approved source WAV, seed or auto-seed status, provenance, mix script, final master, hashes, and applied MP4. The v1.8 and v1.9 decisions do not overwrite the frozen v1.0 baseline.
- Other MenuList videos may select a purpose-fit track; they must inherit the same generated-source ledger, narration-space, voice-reactive ducking, controlled timeline lift, and encoded-audio QA rules.
- Use the documented two-minute library when the primary default, operational alternate, or calm baseline does not fit the runtime or narrative: Product Demo for UI-led walkthroughs, Owner Humanistic for non-technical owner-ease stories, and Launch Momentum for progressive reveal/CTA edits. The library is indexed in `brand-audio/library/README.md`.
- A library selection is still a per-video decision. Do not force one track across every format, and do not replace the frozen Owner Ease 30s V4 bed from this library.
- Generate new candidates from the purpose-specific V2 preset library in `brand-audio/presets/README.md`. Do not create generic AI, cinematic-vocal, or duplicate SaaS presets when an existing narrative-job preset applies.
- Do not use paid-plan, subscription, attribution-dependent, hosted, or third-party catalog music. Retain the generated WAV, model, preset, seed, timestamp, and hash with every approved Lyria source.
- HyperFrames `/media-use` may inventory, adopt, cache, and operate on approved media, but its manifest is provenance rather than a commercial license. Keep separate rights evidence for every third-party or hosted asset.
- Do not use the HeyGen account-backed catalog or generation route for routine MenuList production or internal asset selection. Current Free Plan output must not enter MenuList launch, website, advertising, client, or monetized distribution.
- Music should begin smoothly, build energy across the timeline, and make the final lockup feel charged without overpowering narration.
- Keep music present from the opening, lower it decisively while narration is active, recover it smoothly through speech pauses, and return to the full bed after narration.
- Do not hold BGM at one constant level. Use voice-reactive sidechain movement; the current Lyria bed uses `2.8:1`, `35ms` attack, and `430ms` release plus a wider production gain lift.
- Keep the under-voice bed audible but subordinate. The viewer should notice the lift in pauses without hearing obvious pumping or losing a word of narration.
- Use the subtle MenuList approval sting at the final lockup when it fits.

### Mix

- Current reference master: approximately `-15.5 LUFS` integrated and `-1.8 dBFS` true peak after AAC encoding.
- Check phone speaker, laptop speaker, earbuds, and headphones before public approval.
- Keep music and voice decisions reviewable independently where possible.

One Link Motion v2 is the primary default for new assets; Outlet Control v2 is the approved operational alternate; Midnight Lo-Fi remains the calm baseline and frozen v1.0 source. Every asset still requires narrative-fit, duration-fit, narration-space, ducking, rights, and encoded-QA review.

## 12. Aspect Ratios And Exports

- `16:9`: website, YouTube, LinkedIn, product demo, sales deck.
- `9:16`: Instagram Reels, YouTube Shorts, TikTok, mobile sales sharing.
- `1:1`: paid/social feed only when needed.
- Recompose natively for every aspect ratio.
- Keep essential text inside platform-safe margins.
- Deliver captioned and clean versions where required by the handoff.
- Return a direct local `.mp4` link after rendering.

## 13. Iteration Workflow

Work on one video until its visual, audio, message, and motion system is approved. Do not expand all 12 videos from an unstable reference.

Founder-review passes follow the immutable sequence in the [video version ledger](./videos_version-ledger.md). A delivered pass receives `v1.x`; internal retries do not. Never overwrite a delivered or frozen pass, and do not assign a version to an unbuilt plan.

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

## 14. Pre-Delivery Checklist

- [ ] Product is positioned beyond QR menu.
- [ ] Setup begins with the owner's existing menu photos or PDF.
- [ ] No-retyping and private-preview relief are clear where relevant.
- [ ] Owner approval is visible before important public changes.
- [ ] One approved customer link remains the outcome.
- [ ] Inter is embedded and used everywhere.
- [ ] The project contains the canonical lowercase `frame.md`, and project-specific design notes do not conflict with it.
- [ ] Letter spacing is zero.
- [ ] Headline, body, label, and caption line heights are deliberate.
- [ ] Only one meaningful gradient phrase appears per scene.
- [ ] No internal scene label or production metadata appears in an audience-facing frame.
- [ ] No lower-third card repeats a claim already communicated by the primary hierarchy.
- [ ] No dark device frames, repeated blue patterns, or uncontrolled glass/neon effects.
- [ ] Cursor, tap, and zoom cues point to the actual action without covering content.
- [ ] The thumbnail, post copy, opening frame, and first spoken/on-screen promise describe the same payoff.
- [ ] MenuList identity and recognizable source/product proof appear within the first 1.5 seconds.
- [ ] The first real product transformation or proof moment lands by approximately 5 seconds.
- [ ] Opening motion introduces meaningful new information every 1.5-2.5 seconds without forcing hard cuts.
- [ ] Later UI holds remain long enough for a non-technical owner to understand the proof.
- [ ] No arbitrary retention benchmark, algorithm guarantee, sunk-cost claim, fixed shot-rate rule, or automatic speed-up is used.
- [ ] A/B variants change only the declared primary variable.
- [ ] Transitions preserve continuous visual information.
- [ ] Word-timed captions use the no-pill muted/blue/ink treatment unless the asset records an approved exception.
- [ ] Every short motion module communicates one idea without narration.
- [ ] Every animated number has verified provenance, a unit, context, and a date or period.
- [ ] Original MenuList symbol is plain, large, and unduplicated.
- [ ] Opening and final lockups use the symbol-left, name/tagline-right structure with both text rows sharing one left edge.
- [ ] Both slates combine the poster-safe scaffold, true two-path draw, and lighter trace at the reviewed slower timing; neither treatment loops.
- [ ] The founder-final symbol animation remains unchanged; wordmark motion is isolated to the text layer.
- [ ] `MenuList` fills in strict reading order over a readable scaffold, and any baseline sweep disappears before the held lockup.
- [ ] Encoded frame zero is a useful branded poster frame, not an empty background.
- [ ] Final slate says `MenuList`, not `MenuList AI`.
- [ ] Final frame is nonblank and held through the end.
- [ ] Owner Ease 30s V4 uses the frozen Lyria Midnight Lo-Fi source and mix; other assets use a documented purpose-fit track.
- [ ] New MenuList videos start their music review with One Link Motion v2; Outlet Control v2 is used for operational or multi-location fit; Midnight Lo-Fi remains the calm baseline.
- [ ] No paid-plan, subscription, or attribution-dependent music is present.
- [ ] The project is reproducible locally without paid APIs, subscriptions, metered credits, cloud rendering or generation, paid catalogs, paid plugins, or account-backed generation services.
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
