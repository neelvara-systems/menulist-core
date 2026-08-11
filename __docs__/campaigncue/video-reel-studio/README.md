# Video Reel Studio - Documentation

Video Reel Studio is CampaignCue's in-house short-video workflow. It converts a checked campaign output into an editable storyboard and renders it in the browser from CampaignCue copy, brand tokens, and owner-controlled media. Topview and other video-generation providers are not dependencies.

| File | Audience | Purpose |
| --- | --- | --- |
| [video-reel-studio_spec.md](./video-reel-studio_spec.md) | Product, design | Current video-studio requirements and non-goals. |
| [video-reel-studio_impl.md](./video-reel-studio_impl.md) | Engineering | Runtime, persistence, compositor, and failure contracts. |
| [video-reel-studio_marketing.md](./video-reel-studio_marketing.md) | GTM | Accurate positioning and claims. |
| [video-reel-studio_website.md](./video-reel-studio_website.md) | Public website | Approved public copy. |
| [video-reel-studio_helpdoc.md](./video-reel-studio_helpdoc.md) | Customers | Owner workflow. |
| [video-reel-studio_firebase.md](./video-reel-studio_firebase.md) | Engineering, finance | Compact records, Storage boundary, and cost posture. |
| [video-reel-studio_mobile-support.md](./video-reel-studio_mobile-support.md) | Product, mobile | Phone review, approval, and export. |
| [video-reel-studio_test-cases.md](./video-reel-studio_test-cases.md) | QA, engineering | Required runtime and boundary coverage. |
| [video-reel-studio_validation.md](./video-reel-studio_validation.md) | Product, engineering, QA | Current local-runtime verification and parity against the initial Topview-derived in-house capability decision. |

## Current Boundary

- In-house means CampaignCue owns the storyboard, renderer, versioning, trust checks, and export flow.
- Rendering is local and deterministic: Canvas, browser media APIs, and owner-controlled files only.
- The render binary downloads to the owner's device. The compact project and render receipt persist; no large media blob is written through a Next.js request.
- Delivery remains `export_download_only`. CampaignCue does not connect or post to social accounts.
- Paid model generation, public avatars, synthetic customer UGC, face/body swap, viral cloning, watermark removal, virtual try-on, AI live streaming, and film/drama generation are excluded.
- The owner workflow now includes a deterministic six-check content coach, a phone shot list, optional human review prompts, exact render-to-version receipts, workspace-only format learning, and structural reuse from the rendered snapshot. These are bounded extensions of the existing project document, not a creator-monitoring or provider-video system.
- Legacy render receipts remain readable but are labelled `legacy_unverified`; they cannot create new format learning or reusable structure until the owner renders an exact current version.
