# Stage 4 - MenuList Marketing Site Implementation Prompt

Current website guardrail: before executing this prompt, load the current website docs and implementation paths listed in this folder's README. Do not replace the existing landing page from generic SaaS assumptions.

Canonical scope guardrail: before editing, classify the approved change as static/homepage-only, broader website, or pricing/payment/auth-impacting, and document touched files in the stage output. Do not touch high-risk production flows unless explicitly approved by the strategy and risk review.

Use the approved MenuList visual direction and all previous strategic context as the source of truth.

This step is implementation only.

Your role:
Act as:
- senior frontend engineer
- product marketing implementation lead
- design-system-aware SaaS builder
- infrastructure-product UX implementer

Your task:
Implement the MenuList marketing site / homepage inside the existing repository using the approved visual direction.

Very important:
This is NOT a marketing redesign disconnected from the product.

The implementation must:
- truthfully represent the real product
- preserve the actual information architecture
- reuse existing product design patterns where appropriate
- communicate infrastructure depth through calm clarity
- feel operationally trustworthy
- remain visually premium without becoming flashy

Do NOT:
- invent fake dashboards
- create random analytics visuals
- over-design the experience
- add visual noise
- introduce unnecessary complexity
- build a "startup template"
- make the product feel like generic restaurant SaaS

## Primary Implementation Objective

Build a polished, production-quality marketing experience that:
- communicates MenuList's strategic positioning clearly
- converts effectively
- showcases real workflows
- uses believable product visuals
- scales into future landing-page expansion
- aligns with the approved direction
- remains implementation-efficient

## Implementation Rules

1. Inspect the repository first.
2. Identify:
   - existing marketing-site structure
   - design system
   - typography system
   - theme system
   - reusable primitives
   - layout systems
   - animation systems
   - screenshotable UI areas
3. Reuse existing components wherever possible.
4. Minimize unnecessary new components.
5. Preserve maintainability.
6. Preserve accessibility.
7. Preserve responsiveness.
8. Preserve performance discipline.
9. Favor clarity over visual experimentation.
10. Preserve product truth at all times.

## Mandatory Backup & Change Boundary Gate

Before coding, complete this gate.

1. Create a separate dated backup file under `__docs__/main-website/_archive/`.
   - The backup must preserve the current website docs/content state and list every source file that will be touched.
   - If implementation will substantially rewrite a component, paste the pre-change component source into the backup file before editing.
   - Use a clear name such as `main-website_v2-6-pre-website-prep-backup-YYYY-MM-DD.md`.

2. Classify the implementation scope:
   - static marketing/content/docs/locales only
   - homepage component/layout only
   - broader website surface change
   - pricing/auth/payment/onboarding-impacting change

3. Default to the smallest safe scope.
   - Homepage strategy changes should usually affect `src/components/website/home/`, website locale keys, website CSS, and `__docs__/main-website/*` content docs.
   - Do not edit unrelated website pages only for visual consistency unless the approved strategy requires it.

4. Protect pricing and payment logic.
   - Treat `src/app/(website)/pricing/page.tsx`, `src/components/website/pricing/**`, `src/components/website/pricing-pages/**`, `src/app/(website)/WebsiteAuthProvider.tsx`, subscription DAL calls, billing hooks, Razorpay API routes, onboarding payment paths, and payment verification flows as high-risk.
   - Do not touch these files unless the approved strategy explicitly requires a pricing-page change.
   - If pricing-page work is required, preserve the existing payment/subscription behavior and run a separate risk review before editing.

## Very Important MenuList Positioning Rules

The implementation should subtly communicate:
- canonical business truth
- public-presence consistency
- synchronization confidence
- infrastructure calm
- multi-surface publishing
- operational authority
- chain-grade governance
- invisible reliability

WITHOUT:
- technical overload
- architecture diagrams everywhere
- enterprise software heaviness
- generic AI visuals

The experience should feel:
- simple externally
- sophisticated underneath

## What To Build

Implement the approved homepage and supporting marketing structure.

Depending on the approved strategy, this may include:
- hero section
- trust/proof layer
- workflow overview
- synchronization narrative
- publishing flow
- screenshot strips
- multi-location governance section
- operational consistency section
- integrations section
- FAQ
- final CTA
- supporting asset placeholders
- screenshot compositions
- responsive mobile layouts

Only include sections that support the approved strategy.

## Product Visual Rules

If screenshots/mockups are needed:
- derive them from real product screens
- derive them from real workflows
- use believable data states
- preserve accurate UI hierarchy

Do NOT:
- fabricate fake interfaces
- use generic stock SaaS layouts
- overcomplicate screenshots

If needed:
- prepare staging/demo data
- prepare screenshot-ready states
- create screenshot wrapper components
- create composite-friendly layouts

## Implementation Process

Before coding:

FIRST:
inspect the repository carefully and identify:
- where the marketing site should live
- current route structure
- reusable systems
- design constraints
- likely affected files
- likely reusable components
- screenshot source areas

THEN:
produce a short implementation plan including:
- files to inspect
- files to modify
- reusable components
- new components required
- screenshot/mockup needs
- backup file to create
- scope classification
- whether pricing/auth/payment/onboarding files remain untouched
- responsive concerns
- validation steps

THEN:
begin implementation.

## Design & UX Requirements

The final implementation must:
- feel premium
- feel calm
- feel credible
- feel product-led
- feel infrastructure-aware

The hero must:
- communicate value instantly
- avoid overload
- create trust quickly
- establish authority quickly

The page must:
- escalate trust progressively
- maintain strong hierarchy
- use whitespace intentionally
- avoid dashboard chaos
- keep sections visually distinct but coherent
- reduce skepticism through visuals and workflow proof

## Responsiveness Requirements

Ensure:
- desktop polish
- tablet usability
- mobile clarity
- proper screenshot scaling
- strong mobile hierarchy
- CTA clarity on small screens
- readable proof sections
- no broken screenshot compositions

## Motion & Interaction Rules

If motion is used:
- keep it subtle
- keep it purposeful
- keep it calm
- avoid excessive parallax
- avoid gimmicks
- avoid distracting transitions

Good motion examples:
- gentle reveal
- propagation visualization
- screenshot emphasis
- workflow sequencing
- hover refinement

## Code Quality Requirements

- Follow repository conventions.
- Keep components modular.
- Avoid unnecessary dependencies.
- If adding dependencies:
  - explain why
  - justify strategic value
- Maintain accessibility semantics.
- Avoid dead code.
- Avoid duplicated patterns.
- Keep implementation scalable for future landing pages.

## Validation Requirements

After implementation:

Run:
- local build
- linting
- type checks if available

Then review:
- desktop layouts
- mobile layouts
- screenshot quality
- CTA clarity
- visual consistency
- hierarchy
- trust progression
- implementation accuracy relative to approved direction

Then fix obvious issues before finalizing.

## Deliverables

At the end provide:

1. What was implemented
2. Files modified
3. New components created
4. New assets/placeholders created
5. Responsive considerations handled
6. Any screenshot/demo-data prep completed
7. Any implementation deviations from the approved mock
8. Any remaining polish items
9. Any founder approvals still needed
10. Any visuals still needing final asset generation
11. Confirmation that the backup was created before edits
12. Confirmation of whether pricing/payment/auth/onboarding logic was untouched

## Important Execution Priorities

Prioritize:
1. clarity
2. credibility
3. operational trust
4. product truth
5. implementation quality
6. responsiveness
7. maintainability

NOT:
- visual gimmicks
- decorative complexity
- feature overload
- trendy motion systems

## Starting Sequence

Begin by:

1. Summarizing the approved visual direction
2. Inspecting the repository implementation path
3. Producing the short implementation plan
4. Then executing the implementation
5. Then validating the result
6. Then summarizing deliverables
