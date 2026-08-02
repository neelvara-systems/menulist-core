# Video Reel Studio - Mobile Support

## Mobile Admission

The feature is mobile-relevant because local owners commonly review a reel, attach phone media, approve it, and download the result away from desktop.

## Mobile Runtime

- Use the same project API, project types, trust gates, and renderer as desktop.
- Stay inside the existing CampaignCue responsive workspace; do not create a separate route or data loader.
- Show one editable scene card at a time in normal document flow.
- Use 44px or larger controls for scene movement, variant selection, approval, retry, and render.
- Keep overlay, script, CTA, total duration, format, actual encoding, approval, and trust state visible without horizontal scroll.
- Allow phone camera/gallery image or video selection, narration recording, and separate audio-file selection through native controls.
- Direct uploads are explicit, resumable, progress-labelled, and stay inside private CampaignCue Storage; a local preview is shown before registration.
- Allow save, approve/reject, render, retry, and download from phone when the browser supports Canvas capture and MediaRecorder.
- If the browser cannot record, keep the explicit **Download storyboard** action available and explain the limitation without losing the project.

## Mobile Non-Goals

- Drag-only timeline ordering.
- Multi-track waveform editing.
- Colour grading, masks, or keyframe curves.
- Automatic background upload or account posting.

## Acceptance

- All essential controls are keyboard and touch operable.
- Reordering has explicit Move up/Move down buttons.
- Render progress is announced with `aria-live` and the screen cannot start two renders.
- Owners see `0 provider credits` and the local-processing boundary before rendering.
- Session-local image/video/audio requires the same right-to-use confirmation as desktop.
- Review-note, resolve, cancel, recover, result, and reusable-layout actions use 44px controls and do not require drag or hover.
- A completed file downloads using its actual MIME extension.
