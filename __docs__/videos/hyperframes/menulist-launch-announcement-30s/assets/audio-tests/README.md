# Launch Announcement Audio Tests

**Created:** July 7, 2026
**Purpose:** Local Kokoro TTS candidates for replacing the macOS `say` scratch narration.

## Local Setup

HyperFrames CLI:

```text
hyperframes v0.7.40
```

Python venv:

```text
/Users/danny/.cache/menulist-hyperframes-audio-venv
```

The venv contains `kokoro-onnx` and `soundfile` and is used through:

```bash
HYPERFRAMES_PYTHON=/Users/danny/.cache/menulist-hyperframes-audio-venv/bin/python
```

## Candidate Files

| File | Voice | Speed | Duration | Status |
| --- | --- | --- | --- | --- |
| `kokoro-af-nova.wav` | `af_nova` | `0.96` | 25.69s | Timing fits |
| `kokoro-bf-emma.wav` | `bf_emma` | `0.96` | 26.84s | Timing fits |
| `kokoro-af-heart.wav` | `af_heart` | `0.98` | 28.67s | Timing fits tightly |
| `kokoro-am-adam.wav` | `am_adam` | `1.04` | 26.03s | Timing fits |
| `kokoro-am-michael.wav` | `am_michael` | `0.96` | 31.96s | Too long for 30s cut without speed/script adjustment |

## Commands Used

```bash
source ~/.nvm/nvm.sh
nvm use 22
HYPERFRAMES_PYTHON=/Users/danny/.cache/menulist-hyperframes-audio-venv/bin/python npx hyperframes tts script.txt --voice af_nova --speed 0.96 --output assets/audio-tests/kokoro-af-nova.wav
HYPERFRAMES_PYTHON=/Users/danny/.cache/menulist-hyperframes-audio-venv/bin/python npx hyperframes tts script.txt --voice am_michael --speed 0.96 --output assets/audio-tests/kokoro-am-michael.wav
HYPERFRAMES_PYTHON=/Users/danny/.cache/menulist-hyperframes-audio-venv/bin/python npx hyperframes tts script.txt --voice bf_emma --speed 0.96 --output assets/audio-tests/kokoro-bf-emma.wav
HYPERFRAMES_PYTHON=/Users/danny/.cache/menulist-hyperframes-audio-venv/bin/python npx hyperframes tts script.txt --voice af_heart --speed 0.98 --output assets/audio-tests/kokoro-af-heart.wav
HYPERFRAMES_PYTHON=/Users/danny/.cache/menulist-hyperframes-audio-venv/bin/python npx hyperframes tts script.txt --voice am_adam --speed 1.04 --output assets/audio-tests/kokoro-am-adam.wav
```

## Selection Rule

Default internal-review candidate:

```text
kokoro-af-nova.wav
```

Reason:

- timing fits the 30-second composition with room for scene pacing;
- it is a neutral local TTS candidate to compare against founder voice;
- it avoids the overlong timing of `am_michael`.

Before public use, the chosen voice still needs human listening review on laptop speakers, earbuds, and phone speaker.
