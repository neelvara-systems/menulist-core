# Asset Library - Mobile Support

## Mobile Admission

Asset Library is mobile-relevant for asset review, reuse, and upload from phone.

Current Campaign Pack cloud-copy download is supported as a mobile review action through the same generation-pinned signed Asset Library route. It adds no mobile-only listener or archive browser.

## Mobile Requirements

- Show a bounded asset list without downloading originals.
- Provide `Take photo` with rear-camera preference and `Choose photo or clip` for the device gallery.
- Ask for permission/consent state before opening the picker.
- Keep capture, choose, reuse, and download actions at least 44px high.
- Show rights/source warning before reuse.
- Support phone uploads with progress and failure states.

## Mobile Non-Goals

- Bulk file management.
- Complex metadata editing.
- Advanced crop or video editing.

## Acceptance

- Owner can upload, review, download, and reuse an asset from mobile.
- Mobile asset cards do not download originals until needed.
- A metadata-only file note cannot mark a Photo/Clip Mission ready.
