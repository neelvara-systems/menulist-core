# MyCodex Audio Reader Firebase Impact

## Summary

No Firebase impact.

## Operations

| Operation | Count | Reason |
| --- | ---: | --- |
| Firestore reads | 0 | Page audio uses rendered text; favorites playback reads Markdown from the same-origin MyCodex route, not Firestore. |
| Firestore writes | 0 | Preferences, queue, favorites, and scroll positions are stored in browser `localStorage`. |
| Firestore deletes | 0 | No server state is created. |
| Realtime listeners | 0 | No live data subscription. |
| Cloud Functions | 0 | No backend synthesis or queue. |
| Storage reads/writes | 0 | No audio files are created. |
| Provider calls | 0 | No OpenAI, Google Cloud, Gemini, wake-lock service, or other TTS API. |
| Browser response validation | 0 | Favorite/read-later Markdown responses are capped and shape-checked in the browser before playback; no Firebase operation is added. |

## Cost Boundary

This feature has no application-side audio bill. Voice quality and wake-lock support depend on the user's browser/OS.
