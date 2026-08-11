# Campaign Memory 2.0 - Mobile Support

## Mobile Admission

Result capture and a short learning summary are high-value mobile tasks. They remain inside the existing CampaignCue responsive shell and reuse the current overview payload.

## Mobile Behavior

- Show one plain summary before metrics.
- Show confidence as text, not color alone.
- Show at most one recipe signal and one channel signal initially.
- Keep `Record result` inputs at least 44px high.
- Keep source wording visible: `Owner-reported results`.
- Use `Record another result` when evidence is insufficient.
- Use `Review before repeating` for mixed or negative evidence.
- Avoid dense charts, hover-only detail, and horizontal tables.

## Failure And Recovery

- Invalid result option: retain the form and ask the owner to choose a current option.
- Concurrent update: rely on transaction retry and committed summary response.
- Network failure: retain result draft and idempotency key for safe retry.
- Missing legacy summary: show limited recent-campaign coverage without claiming full history.

## Non-Goals

- Advanced attribution dashboard.
- Customer-level analytics.
- Provider reporting UI.
- Full-screen chart builder.
