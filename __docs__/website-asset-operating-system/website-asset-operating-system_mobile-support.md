# Website Asset Operating System - Mobile Support

**Mobile relevance decision:** Partial  
**Reason:** The operating system itself is internal tooling; generated assets must still support mobile website surfaces.

---

## Decision

Website Asset Operating System does not need an owner-facing mobile UI. It is not a MenuList mobile feature and not an Answerlattice mobile runtime surface.

It does need mobile-aware asset slots and review checks because MenuList and Answerlattice websites are viewed on mobile.

## Feature Admission Test

| Gate | Result | Explanation |
| --- | --- | --- |
| Frequency | Fails for mobile UI | Asset audits are occasional founder/operator work, not daily owner mobile work. |
| Speed | Fails for mobile UI | Asset review often requires screenshots, file checks, and visual comparison. |
| Touch | Fails for mobile UI | Timeline/video/media review is not thumb-first. |
| Value | Partial | Mobile value exists in the output, not in the internal control UI. |

## Mobile Requirements For Assets

Every asset slot that appears on a website must define:

- desktop and mobile placement expectations;
- aspect ratio;
- mobile maximum file size;
- poster/fallback requirements for video;
- reduced-motion fallback where motion is used;
- text legibility at mobile viewport widths;
- no horizontal overflow;
- no cropped critical product proof.

## Mobile Review Checklist

When assets are implemented:

1. Open the relevant route at mobile width.
2. Confirm asset loads without layout shift.
3. Confirm text inside the asset is legible or intentionally decorative.
4. Confirm video has poster and fallback.
5. Confirm reduced-motion users still get static proof.
6. Confirm file size stays within slot budget.
7. Confirm the mobile website does not depend on hover-only interaction.

## Auth, Localization, And Settings

Not applicable to this internal workflow. Asset generation scripts should not create a separate mobile auth path, settings surface, or localization layer.

Website assets must still respect the consuming website's existing localization and theme rules.

