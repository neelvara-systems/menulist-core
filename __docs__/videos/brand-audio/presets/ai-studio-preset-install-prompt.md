# AI Studio Prompt: Install MenuList Production Presets V2

Use this prompt with the existing MenuList Audio AI Studio app. Attach `menulist-lyria-preset-library-v2.json` with the prompt.

## Prompt

Update the existing MenuList Audio app by adding a new preset group named `MenuList Production Presets V2`.

Use the attached `menulist-lyria-preset-library-v2.json` as the source of truth. Add all seven presets exactly as defined, including names, fixed seeds, prompt layers and weights, BPM, scale, temperature, guidance, Top K, density, brightness, target duration, and automation stages.

Preserve the existing presets and previously generated audio. Do not rename, overwrite, or remove them.

Apply these behavior requirements:

1. Selecting a preset configures the mixer only. It must not automatically start playback or recording.
2. Add one explicit `Generate and Record` action and one explicit `Stop` action.
3. `Clear Recording` must stop playback first, clear the audio buffers, and reset the displayed and exported duration to zero.
4. Default `Voiceover Background` to enabled for every MenuList Production Presets V2 preset.
5. Use `QUALITY` mode and disable vocalization for every V2 preset.
6. Show the fixed seed, target duration, current stage, and actual recorded duration while generating.
7. Continue recording for the preset's `recordBeyondTargetSeconds` tail, then stop automatically.
8. Interpolate automation stages smoothly. Do not hard-switch prompt weights or audio settings.
9. Keep the selected preset settings visible and editable before generation.
10. Download lossless 48 kHz stereo WAV with this filename pattern: `<preset-id>-seed-<seed>-<timestamp>.wav`.
11. Do not normalize or compress the generated source when `Voiceover Background` is enabled.
12. Preserve the Super Custom Mixer Board and its scrolling behavior.

Add a short internal note beneath the V2 group:

`Purpose-specific MenuList beds. Generate under the real voiceover before approving a track.`

After implementation, verify all seven preset cards, fixed seeds, target durations, automation labels, start/stop behavior, clear behavior, automatic tail stop, and WAV filename output. Do not change unrelated app styling or generation logic.
