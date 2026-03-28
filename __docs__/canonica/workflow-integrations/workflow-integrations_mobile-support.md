# Canonica — External Workflow Integrations — Mobile Support Assessment

> **Version:** 1.0.0
> **Last Updated:** 2026-03-09
> **Audience:** Engineering

---

## §1 — Feature Admission Test (4-Gate)

| Gate | Question | Answer | Pass? |
|------|----------|--------|:-----:|
| **Frequency** | Daily/multiple times per day? | No — governance events are nightly batch + occasional real-time. Founders check integration settings rarely (setup once, forget). | ❌ |
| **Speed** | Completes in <5 seconds? | N/A — this is a backend system. No user-facing mobile interaction. | ❌ |
| **Touch** | Works with thumb-only? | N/A — integration settings are a one-time configuration, not a daily task. | ❌ |
| **Value** | Needed away from desk? | No — integration setup requires API keys, webhook URLs, GitHub tokens. These are desk tasks. | ❌ |

**Result: 0/4 gates passed. Mobile UI is NOT required.**

---

## §2 — Justification

This feature is:
1. **Backend infrastructure** — Cloud Functions, Firestore, outbound HTTP delivery
2. **One-time configuration** — Set up Slack webhook, Linear API key once, then forget
3. **Notifications arrive on mobile anyway** — Slack/email push notifications are mobile-native
4. **No operational interaction** — Founders don't "use" integrations daily; they receive notifications passively

The entire value proposition is "don't open any dashboard." Adding mobile UI contradicts this.

---

## §3 — What Mobile Users Get For Free

| Mobile Surface | How | Notes |
|---------------|-----|-------|
| Slack notifications | Native Slack app push notifications | Block Kit messages render well on mobile |
| Email notifications | Native email app | HTML emails are responsive |
| Linear issues | Native Linear app push notifications | Issues appear in Linear inbox |
| GitHub issues | Native GitHub app push notifications | Issues appear in GitHub notifications |

Mobile users receive full integration value through existing mobile apps. Zero Canonica mobile work needed.

---

## §4 — Future Consideration

If Canonica adds a mobile governance dashboard (viewing drift, approving proposals), integration settings could be added to that mobile surface. But this is not needed for v1 and should only be considered after the desktop governance UI is proven.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-09 | 1.0.0 | Initial mobile assessment — 0/4 gates, no mobile UI needed |
