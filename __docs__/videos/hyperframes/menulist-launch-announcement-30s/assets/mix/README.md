# Launch Announcement Audio Mix

**Created:** July 7, 2026
**Output:** `launch-announcement-audio-v2-master.wav`

## Inputs

| Role | File |
| --- | --- |
| Voice | `../audio/voice-kokoro-af-nova-selected.wav` |
| BGM | `../music/source-tracks/freetouse-pufino-enlivening.mp3` |

## Mix Notes

- Voice generated locally with HyperFrames Kokoro TTS.
- BGM trimmed to 30 seconds.
- BGM fades in for 1.2 seconds and fades out from 28.4 seconds.
- BGM is lowered and sidechain-ducked under voice.
- Final mix is normalized with FFmpeg `loudnorm` target `I=-14`, `TP=-2`, `LRA=11`.
- Output duration: 30.000 seconds.

## Command

```bash
ffmpeg -y \
  -i ../audio/voice-kokoro-af-nova-selected.wav \
  -i ../music/source-tracks/freetouse-pufino-enlivening.mp3 \
  -filter_complex "[0:a]apad=pad_dur=6,atrim=0:30,asetpts=PTS-STARTPTS[voicepad];[0:a]volume=1.02,apad=pad_dur=6,atrim=0:30,asetpts=PTS-STARTPTS[voice];[1:a]atrim=0:30,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=1.2,afade=t=out:st=28.4:d=1.6,volume=0.16[bgmquiet];[bgmquiet][voicepad]sidechaincompress=threshold=0.025:ratio=7:attack=40:release=450[ducked];[voice][ducked]amix=inputs=2:duration=first:normalize=0,atrim=0:30,asetpts=PTS-STARTPTS,loudnorm=I=-14:TP=-2:LRA=11[aout]" \
  -map "[aout]" \
  -ar 48000 \
  launch-announcement-audio-v2-master.wav
```
