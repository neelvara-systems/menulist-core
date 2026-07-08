# Founder POV Audio V2 Mix Notes

**Created:** July 8, 2026
**Output:** `founder-brand-pov-audio-v2-master.wav`

## Voice

- Engine: local HyperFrames TTS with Kokoro through `HYPERFRAMES_PYTHON=/Users/danny/.cache/menulist-hyperframes-audio-venv/bin/python`.
- Voice: `af_nova`.
- Speed: `0.65`.
- File: `../audio/voice-kokoro-af-nova-selected.wav`.

## Music

- Track: `Enlivening` by Pufino.
- File: `../music/source-tracks/freetouse-pufino-enlivening.mp3`.
- Role: very low support bed, sidechain-ducked under narration.

## Mix

- Target: dialogue-first internal review master.
- FFmpeg filters: trim to 75.03s, BGM fade-in/fade-out, voice-sidechain ducking, `amix`, and `loudnorm=I=-16:TP=-2:LRA=11`.
- Verification from final MP4 loudness spot-check: `input_i=-16.73`, `input_tp=-4.78`, `input_lra=2.50`.

## Public Status

This is a review-quality audio-v2 mix. Public publishing remains blocked until founder listening approval or founder-recorded voiceover replaces the local TTS.

