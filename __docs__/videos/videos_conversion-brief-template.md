# MenuList Video Conversion Brief Template

**Status:** Required production template  
**Created:** July 11, 2026  
**Use:** Complete once for every public, sales, website, social, or paid MenuList video version before animation begins

## Purpose

This template turns a video idea into one measurable owner journey.

Do not start a new HyperFrames composition, cutdown, aspect-ratio version, hook test, or paid variant until this brief is complete. A visual resize with no story or CTA change may reuse the parent brief, but it still needs its own asset id and `utm_content` value.

Use [videos_launch-video-conversion-research.md](./videos_launch-video-conversion-research.md) for the evidence, measurement ladder, and test rules.

## Required Brief

### Identity

| Field | Required value |
| --- | --- |
| Working title | Human-readable video name |
| Asset id | Stable lowercase snake case id |
| Parent asset id | Required for a cutdown, resize, hook variant, or revision |
| Version | `v1`, `v2`, and so on |
| Duration | Exact target duration |
| Aspect | `16x9`, `9x16`, `1x1`, or `4x5` |
| Language/voice | Language plus founder/human-reviewed voice decision |
| Production status | Brief, storyboard, build, review, approved, published, or retired |

### Conversion Job

| Field | Required value |
| --- | --- |
| Funnel stage | Awareness, setup relief, trust, product understanding, evaluation, or high-intent conversion |
| One audience | The primary owner/operator segment for this version |
| One problem | The single current pain recognized in the opening |
| One belief change | What the viewer should understand after watching |
| One proof moment | The exact product action/state that makes the claim credible |
| Emotional job | The intended owner feeling in plain language |
| Display close | Final on-screen line |
| Linked action | The one clickable action outside the video |
| Destination | Exact route or approved external destination |

### Measurement

| Field | Required value |
| --- | --- |
| Primary metric | Deepest reliable event used to choose a winner |
| Leading metric | Retention, completion, or click signal used diagnostically |
| Guard metric | Quality signal that must not worsen |
| Attribution window | Platform-defined window or `organic directional only` |
| Baseline | Existing result or `Not available - establish baseline` |
| Minimum detectable effect | Required before statistical paid testing; otherwise `Not set - directional only` |
| Paid eligibility | Eligible or blocked, with reason |

### Campaign Identity

```text
utm_source=
utm_medium=
utm_campaign=menulist_launch_2026
utm_content=<asset-id>_<hook>_<duration>_<aspect>
```

Use a new `utm_content` when the hook, edit, duration, aspect ratio, voice, CTA, or destination changes materially.

### Claim And Product Proof

- [ ] Starts from an owner-recognizable pain or relief.
- [ ] Existing menu photo/PDF/owned source is shown when setup ease is claimed.
- [ ] Private preview is visible when review safety is claimed.
- [ ] Owner approval is visible when control is claimed.
- [ ] The result is one approved customer link, not only a QR code.
- [ ] Unsupported external-platform updates are not shown or implied.
- [ ] Ranking, traffic, conversion, revenue, and AI recommendation guarantees are absent.
- [ ] Demo data is fictional, permissioned, or clearly labeled.

### Retention Contract

| Field | Required value |
| --- | --- |
| Distribution promise | Exact thumbnail/post-copy promise this opening must fulfill |
| Frame-zero promise | Exact owner-facing message readable in the first encoded frame |
| Product-visible deadline | Target at or before `1.5s` |
| First aha moment | Exact product transformation and target time at or before approximately `5s` |
| Opening event map | Meaningful information changes planned for `0-1.5s`, `1.5-3s`, and `3-5s` |
| Longest static proof hold | Duration and reason; normally `2-4s` when UI reading is required |
| Test variable | One declared variable or `Not an A/B test` |
| Frozen variables | Body, proof order, voice, music, CTA, destination, audience, and placement values held constant |

The retention contract does not require a hard cut every `1.7s`, uninterrupted motion, a universal completion target, or a speed increase. It requires continuous meaningful progress and enough reading time for a non-technical owner.

### Distribution Package

| Field | Required value |
| --- | --- |
| Primary platform | One main destination for this version |
| Secondary platforms | Approved reuse destinations |
| Caption version | Burned-in, sidecar, both, or not required |
| Audio version | VO + mix, music-only, clean, or silent-safe |
| Thumbnail/poster | Exact asset path or required status |
| Publish owner | Person/team responsible for upload and response |
| Publish state | Blocked, organic baseline, controlled paid test, scaled, or retired |

## Pre-Build Gate

The brief passes only when:

- the asset id is unique;
- the funnel stage and belief change are singular;
- the proof moment can be shown truthfully;
- the frame-zero promise, product-visible deadline, and first aha are explicit;
- every opening motion event carries new information rather than decoration;
- the linked action and destination are final;
- the primary metric is deeper than views where the product flow supports it;
- paid eligibility is explicit;
- the version is entered in [videos_campaign-measurement-ledger.md](./videos_campaign-measurement-ledger.md).

## Post-Publish Review

Record:

- publish URL and date;
- impressions/reach;
- 3-second and platform engaged views;
- 25%, 50%, 75%, and complete views where available;
- landing sessions and linked-action clicks;
- private-preview, claim, and approved-publish progress where available;
- owner questions or misunderstandings;
- decision: keep, iterate one variable, scale, or retire.
