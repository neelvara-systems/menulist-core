# Campaign Pack Output System — Firebase Cost

## Cost Verdict

The Campaign Pack Output System adds no Firestore collection, Storage path, Cloud Function, realtime listener, provider call, or paid model call.

It is derived from the existing CampaignCue overview and generated as a browser-local ZIP.

## Reads

| Flow | Reads |
| --- | --- |
| Daily desk overview | Same existing bounded overview reads. |
| Output pack build | 0 additional reads. |
| Output pack UI summary, including proof deck status | 0 additional reads. |
| ZIP generation | 0 Firebase reads. |

## Writes

| Flow | Writes |
| --- | --- |
| Download campaign pack ZIP | Existing campaign action write for `export`; no new output-pack write. |
| ZIP file creation | Browser-local only; no Firestore or Storage write. |

## Cost Guards

- `CampaignCueOutputPack` is response-derived state.
- No separate `campaignPacks` collection is added.
- No large JSON blob is persisted.
- No signed URLs or base64 assets are saved in output-pack state.
- No provider connection read is needed.
- No social posting or ad-spend API is called.
- Campaign Proof Deck content is derived from the already-loaded output pack, Business Brain Brand Playbook, source facts, and trust summary.

## Future Boundary

If hosted mini-pages or server-rendered bundle files are activated later, they require a separate Firebase cost plan covering public route reads, Storage writes, cache invalidation, QR/link tracking, owner approval, retention, and abuse controls.
