# Founder POV Audio V2 Mix Notes

**Created:** July 8, 2026
**Updated:** July 9, 2026
**Output:** `founder-brand-pov-audio-v2-master.wav`

## Voice

- Engine: local HyperFrames TTS with Kokoro through `HYPERFRAMES_PYTHON=/Users/danny/.cache/menulist-hyperframes-audio-venv/bin/python`.
- Voice: `af_nova`.
- Speed: `0.78`.
- File: `../audio/voice-kokoro-af-nova-selected.wav`.
- Script revision: founder POV now explicitly says owners should not need to type the whole menu again; they can upload current menu photos and review the prepared customer version.

## Music

- Track: `Enlivening` by Pufino.
- File: `../music/source-tracks/freetouse-pufino-enlivening.mp3`.
- Role: very low support bed, sidechain-ducked under narration.

## Mix

- Target: dialogue-first internal review master.
- FFmpeg filters: trim to 75.03s, BGM fade-in/fade-out, voice-sidechain ducking, `amix`, and `loudnorm=I=-16:TP=-2:LRA=11`.
- Final MP4 duration check: 75.03 seconds.

## Public Status

This is a review-quality audio-v2 mix. Public publishing remains blocked until founder listening approval or founder-recorded voiceover replaces the local TTS.
