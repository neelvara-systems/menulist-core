# Video Reel Studio - Spec

## Summary

Video Reel Studio turns one checked CampaignCue video output into a source-locked short-video project. Owners can edit a lightweight timeline, use private Asset Library image/video/audio or session-only media, regenerate one checked scene at a time, collaborate through bounded review notes, approve the project, and download a real 9:16, 1:1, or 16:9 video produced by CampaignCue's browser compositor.

## Owner Outcome

An owner can go from a checked campaign pack to a usable short video without opening a professional editor, buying provider credits, or connecting a social account.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Brief to project | A video campaign output creates a persisted project with hook, script, scenes, overlays, caption, CTA, and source references. |
| Text to motion | A project with no media still renders a branded motion-typography video. |
| Image to motion | An owner-selected image can be animated with pan or zoom during the current browser render. |
| Owned clip composition | A private Asset Library or session-local video clip can play inside one scene without being copied to a provider. |
| Pattern adaptation | Pattern Cue may influence abstract pacing and structure; source wording, footage, music, likeness, and creator identity are not copied. |
| Scene control and regeneration | Owners can edit text, timing, motion, transition, order, and visibility for at most eight scenes. Regenerating one scene deterministically changes its checked copy direction, motion, transition, and timing without inventing facts or footage. |
| Bounded variants | Each project exposes no more than three deterministic hook/caption directions. |
| Brand consistency | The project snapshots approved business name, primary colour, voice, and source references. |
| Captions and audio | Captions can be burned into the render. Separate narration and background-music tracks may use rights-confirmed Asset Library audio or session files; owners can record non-cloned narration locally, set both levels, and enable automatic background ducking. Session media requires explicit right-to-use confirmation. |
| Private media intake | Owners can upload bounded image, video, or audio directly to private CampaignCue Storage, generate a local preview thumbnail, register authoritative Storage metadata, and reuse only admitted Asset Library ids. |
| Timeline-lite | The UI shows ordered scenes, duration, total runtime, and move/add/remove controls without a professional multi-track editor. |
| Native aspect variants | Owners may save and render 9:16, 1:1, and 16:9 variants from one project. |
| Version history | Each material save increments the project version and retains a bounded, reviewable snapshot history. |
| Version evidence | Each retained snapshot includes the trust findings and durable asset ids reviewed for that version. Each render receipt records whether session-media rights were confirmed. |
| Exact render binding | Every new render receipt stores the exact project version it rendered. A later edit cannot relabel an older render as the current structure. Legacy unbound receipts remain visible but cannot feed format learning. |
| Trust gate | Source freshness, campaign trust, missing CTA, unconfirmed asset rights, and synthetic-likeness boundaries are checked before approval/export. |
| Deterministic content coach | The already-loaded draft is checked programmatically for opening clarity, owner-controlled business proof, pacing, visible-text density, final action, and source/rights readiness. A ready, rights-confirmed uploaded/imported image or clip, or a rights-confirmed session recording, can satisfy proof; generated, unavailable, restricted, or unconfirmed media cannot. The coach does not call a model and does not silently mutate the project. |
| Phone capture guide | The project derives a scene-linked phone shot list from included scenes and existing media, with no extra persistence or generic video-production workflow. |
| Owner approval | Render/download remains blocked until the current version is approved. Editing an approved project returns it to review. |
| Review notes | Workspace collaborators can add bounded project or scene notes. Prompted human review is optional; CampaignCue does not require a retained strategy service. Open notes block approval; authorized reviewers or the note author can resolve them. |
| Render jobs | Started, checkpointed, completed, failed, cancelled, and interrupted browser attempts record a bounded job receipt with zero-credit reservation/capture/refund values. Server admission verifies project version, preset, duration, durable asset ids, and session-rights evidence. Progress updates do not create separate audit-event documents. A failed or cancelled attempt never deletes the storyboard. |
| Result and reuse | An owner can link an exactly versioned completed render to campaign result memory. CampaignCue stores a compact format signature and format snapshot, groups recent workspace outcomes from the already-loaded project list, and creates structural reuse only from the version that produced the file. Re-recording a result replaces the prior project contribution instead of inflating counters. |
| Manual fallback | The current storyboard downloads as a plain-text file even when the browser cannot record Canvas video. |
| Zero provider credits | The in-house compositor records zero provider calls and zero provider credits. |
| Manual delivery | The result downloads to the device. CampaignCue does not publish, send, boost, or mutate spend. |

## Supported Input Modes

- `campaign_to_video`: source-backed campaign output to storyboard and video.
- `text_to_video`: copy and brand tokens to motion typography.
- `image_to_video`: owner-controlled image plus campaign copy to motion.
- `reference_to_video`: abstract Pattern Cue pacing applied to original source-backed content.

These modes describe CampaignCue composition workflows. They do not claim a foundational generative-video model.

## Supported Output Presets

- Portrait `9:16` for Reels, Shorts, and story-style placements.
- Square `1:1` for feed posts and reusable campaign assets.
- Landscape `16:9` for widescreen placements.
- Browser-selected encoding: MP4 only when the browser reports native MediaRecorder support; otherwise WebM. The UI must show the actual file type before download.

## Non-Goals

- Professional timeline, colour grading, masking, keyframe curves, or multi-track mixing.
- Film, drama, cinematic-scene, or long-form generation.
- Public avatar or model marketplace.
- Fake or synthetic customer testimonials, reactions, staff claims, or likenesses.
- Face swap, body swap, watermark removal, virtual try-on, AI livestreams, or viral-video cloning.
- Third-party footage/music scraping, voice cloning, or rights clearance.
- Provider rendering, automatic posting, social OAuth, ad creation, or spend mutation.
- Guaranteed reach, virality, bookings, revenue, or platform acceptance.

## Failure Contract

- Unsupported browser recording returns a clear fallback, keeps the project, and leaves plain-text storyboard download available.
- Image/video/audio decode failure returns a clear retry message and preserves the project. The owner may remove or replace the file and render again; CampaignCue does not silently omit selected media.
- Render failure records a failed receipt and exposes `Try again` without charging credits.
- Owner cancellation records a cancelled receipt; an interrupted started attempt can be closed before retrying.
- A stale, blocked, rejected, or unapproved project cannot render.
