# Support Truth Export - Mobile Support

## Current Surface

The export card lives in the shared Answerlattice Settings template. It uses wrapped layout, a loading button, concise recovery messages, and the browser-native file download path.

## Mobile Contract

- The action remains permission-gated and server-authorized.
- The button must remain at least 44 px high through the existing Ant Design control sizing.
- Long explanatory text must wrap without covering the action.
- Only one export request may run from the component at a time.
- Switching workspace or leaving the screen aborts the current request; a former-workspace response cannot download afterward.
- The 8 MiB browser body cap applies equally on mobile.

## Verification Still Required

- Safari iOS download/file handoff;
- Chrome Android download/file handoff;
- narrow-width Settings layout;
- expired-session and manual-redirect recovery;
- oversized and rate-limited messages.

No dedicated mobile export app, background download, share sheet, or offline archive is required.
