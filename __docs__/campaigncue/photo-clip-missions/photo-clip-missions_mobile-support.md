# Photo And Clip Missions - Mobile Support

## Scope

This is a high-value mobile owner workflow. It stays inside the responsive CampaignCue workspace and reuses the same upload service and overview state as desktop.

## Mobile Behavior

- `Take photo` requests the rear-facing camera where the browser supports `capture="environment"`.
- `Choose photo or clip` supports the mobile gallery/file picker.
- Rights confirmation appears before capture so permission is not an afterthought.
- Buttons and consent controls have at least 44px touch targets.
- Upload progress remains visible if the owner scrolls within the panel.
- A successful upload returns to the current task context and updates readiness locally.
- Mobile remains review/capture/download oriented; dense canvas editing is not added here.

## Recovery

- Camera cancellation creates no write.
- Network failure preserves the selected consent choice and shows a retryable error.
- Oversized media is rejected before token issuance or Storage upload.
- The temporary Firebase upload session is signed out in a `finally` path.
- Browser interruption can leave an unregistered object only in exceptional cases; retention cleanup remains the final backstop.
