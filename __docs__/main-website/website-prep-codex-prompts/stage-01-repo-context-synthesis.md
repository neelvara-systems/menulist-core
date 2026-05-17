# Stage 1 - MenuList Repo Context Synthesis Prompt

Codebase-first guardrail: before executing this prompt, load the current product codebase and feature docs first. Current runtime code, routes, DAL behavior, feature flags, APIs, and UI components are the primary source of truth. The existing website should be used as historical psychology and conversion context only: understand why it was built that way, but do not assume its current content still covers the full product.

Preservation and scope guardrail: identify the current website state that must be backed up before any future implementation. Also identify which website surfaces are static marketing content and which are functional production flows, especially pricing, auth, payment, subscription, and onboarding paths.

You already have full access to this repository and its context.

Do not code anything yet.

Your role in this step:
Act as a senior product strategist, infrastructure analyst, and SaaS positioning researcher.

Your task is NOT to describe MenuList as a generic "restaurant SaaS."
You must inspect the repository deeply and determine what the product actually represents structurally, operationally, and strategically.

Important framing:

MenuList should be analyzed as:
- a customer-facing business truth infrastructure layer
- a public-presence consistency system
- a canonical menu + business information authority layer
- a multi-surface publishing and synchronization platform
- a long-term SMB infrastructure system

Do NOT reduce the product to:
- "QR menu builder"
- "restaurant website"
- "AI menu maker"
- "menu design tool"

You must infer the deeper system architecture and product intent from the repository itself.

## Goal

Inspect the repository thoroughly and produce a deep context-synthesis document explaining:

- what MenuList actually is
- what strategic category it is moving toward
- which operational/business pains it solves
- what workflows matter most
- which infrastructure patterns exist underneath
- which parts are strongest for marketing and visual storytelling
- which product surfaces create long-term defensibility
- what should and should not be emphasized publicly
- what current website files must be preserved before any new direction is implemented
- which future changes should stay static/homepage-only versus broader website or payment-system changes

Your output will later be used for:
- landing page strategy
- screenshot planning
- visual direction generation
- positioning
- proof architecture
- marketing implementation
- product storytelling

## Repository Analysis Instructions

Before writing conclusions, inspect the repository deeply.

Use evidence from:
- README files
- internal docs
- architecture docs
- markdown specs
- route structure
- feature modules
- Firestore schemas
- APIs
- sync systems
- background jobs
- queue systems
- audit systems
- onboarding flows
- settings pages
- feature flags
- naming conventions
- analytics modules
- publishing flows
- chain/multi-location systems
- permissions systems
- public pages
- webhooks
- translation systems
- image systems
- extraction systems
- public routing systems
- PWA behavior
- state management
- admin interfaces
- menu rendering flows
- review/reputation systems
- official business page systems
- integration layers
- caching/reliability logic
- validation systems
- infrastructure guardrails
- UI empty states
- labels and terminology
- seed/demo/sample data
- test files revealing product intent

If needed, inspect:
- component naming patterns
- data model relationships
- feature ownership boundaries
- infrastructure layering
- silent/internal systems not exposed publicly

## Very Important Rules

1. Do NOT invent unsupported positioning.
2. Separate:
   - explicit repo evidence
   - inferred strategic intent
   - assumptions needing founder validation
3. Do NOT default to generic SaaS language.
4. Do NOT flatten the system into "features."
5. Distinguish:
   - customer-facing workflows
   - internal infrastructure systems
   - long-term platform signals
6. Analyze both:
   - visible UX
   - hidden infrastructure behavior
7. Pay special attention to:
   - authority systems
   - synchronization
   - consistency enforcement
   - publishing architecture
   - truth propagation
   - operational calm
   - multi-surface presence
   - chain governance
   - reliability mechanisms
8. Identify where the repository reveals:
   - infrastructure thinking
   - defensibility
   - category expansion potential
   - long-term positioning
9. If something appears intentionally constrained or simplified, explain why that may be strategic.

## Deliverable Structure

Create a structured report with the EXACT sections below.

## Section 1 - Product Reality Summary

Define:
- Product name
- One-sentence explanation
- What MenuList actually appears to be structurally
- What category it superficially looks like
- What category it may actually be evolving toward
- What layer of the SMB stack it occupies
- What the product explicitly avoids becoming
- Business model if inferable

Also include:
- "Surface perception vs underlying architecture"

Explain the difference between what a normal customer sees and what the underlying system actually does.

## Section 2 - Strategic Product Identity

Explain:
- what strategic role MenuList plays
- what system-of-record characteristics exist
- what "truth authority" mechanisms exist
- where synchronization/control behavior appears
- what infrastructure behaviors are hidden beneath simple UX
- whether the product behaves more like:
  - a utility
  - workflow software
  - infrastructure
  - publishing layer
  - presence layer
  - synchronization layer
  - operational control layer
  - identity layer

Explain WHY using repo evidence.

## Section 3 - Ideal Customer Profiles

Identify:
- primary ICP
- secondary ICPs
- chain/multi-location fit
- SMB maturity level
- operational sophistication level
- likely buyer
- likely operator/end user
- what customer pain is urgent enough to trigger adoption

For each ICP include:
- pain profile
- operational chaos being reduced
- what MenuList centralizes or stabilizes
- what public-facing risk MenuList reduces

## Section 4 - Core Problems Solved

List the major business problems solved.

For each:
- problem statement
- who feels it
- operational consequence
- customer-facing consequence
- how MenuList solves or reduces it
- evidence from repo
- whether the solution is visible or infrastructural

Focus heavily on:
- inconsistent public information
- menu drift
- update propagation
- operational fragmentation
- publishing friction
- multi-surface inconsistency
- chain governance
- stale public data
- trust degradation
- manual repetition
- update reliability

## Section 5 - Core Workflows

Identify the most important workflows.

For each workflow include:
- workflow name
- entry point
- primary actor
- workflow steps
- hidden systems supporting the workflow
- key UI surfaces
- trust/reliability mechanisms
- why this workflow matters strategically
- screenshot-worthiness score (1-10)

Pay attention to:
- onboarding
- extraction
- publishing
- synchronization
- translation
- image generation
- chain inheritance
- override systems
- menu updates
- public page generation
- QR/PWA flows
- review/reputation systems
- proof-of-truth systems

## Section 6 - Infrastructure Signals

Identify all signals suggesting infrastructure-grade thinking.

Examples:
- versioning
- audit logs
- immutable state
- synchronization layers
- queue systems
- debounce systems
- cache systems
- consistency validation
- publish validation
- inheritance systems
- governance models
- feature flags
- reliability safeguards
- propagation systems
- tenant isolation
- authority models

For each signal include:
- signal
- evidence
- why it matters strategically
- whether customers directly see it
- how it contributes to defensibility

## Section 7 - Hidden Strengths

Identify the strongest strategic strengths that may not be obvious externally.

Examples:
- operational calm
- public-truth authority
- synchronization depth
- multi-surface publishing
- chain consistency
- silent infrastructure
- low cognitive load
- inertial product behavior
- customer lock-in through operational dependence
- default-presence dynamics

For each:
- hidden strength
- why it matters
- what repo evidence supports it
- why competitors may struggle to replicate it

## Section 8 - Screenshot-Worthy Systems

Identify the top 10-15 most marketable screens, flows, or UI areas.

For each:
- screen/workflow name
- strategic message communicated instantly
- why it is visually strong
- whether it supports:
  - hero
  - feature section
  - workflow strip
  - proof block
  - comparison visual
  - onboarding story
- whether the value is obvious immediately or requires explanation
- cleanup needed before screenshoting

Prioritize:
- operational clarity
- synchronization
- publishing confidence
- multi-location control
- visual calm
- authority
- trust
- infrastructure simplicity

NOT generic dashboard density.

## Section 9 - Public Positioning Opportunities

Identify:
- strongest positioning territories
- strongest "why now" narratives
- strongest authority narratives
- strongest workflow narratives
- strongest infrastructure narratives
- strongest SMB operational pain narratives

Then identify:
- dangerous positioning traps
- messaging that would commoditize the product
- messaging that would incorrectly frame MenuList as lightweight utility software

## Section 10 - Proof & Trust Signals

Identify all proof elements available from repo evidence.

Examples:
- reliability systems
- synchronization depth
- propagation logic
- chain governance
- translation infrastructure
- automation depth
- publishing control
- auditability
- workflow completeness
- operational safeguards
- consistency systems
- role systems
- scalability indicators

For each:
- proof point
- repo evidence
- confidence level
- strongest marketing use
- where it belongs:
  - hero
  - trust bar
  - feature section
  - proof section
  - FAQ
  - onboarding narrative

## Section 11 - Strategic Defensibility

Analyze:
- what creates switching costs
- what creates operational dependence
- what creates authority accumulation
- what creates data gravity
- what creates behavioral lock-in
- what creates default-presence dynamics
- what could become long-term moat layers

Also identify:
- what is currently weak
- what is not yet defensible
- what still depends too heavily on execution quality

## Section 12 - Messaging Inputs

Generate:
- 15 raw headline territories
- 15 subheadline territories
- 10 positioning directions
- 10 category framings
- 10 trust/proof themes
- 10 CTA angle directions

Do NOT write polished homepage copy.
These should be strategic territories only.

Avoid:
- generic AI startup language
- "all-in-one platform"
- "streamline your business"
- "future of restaurants"
- generic automation cliches

## Section 13 - Weaknesses & Risks

Identify:
- unclear positioning areas
- weak product narratives
- areas that require founder clarification
- areas where the UI may undersell infrastructure depth
- areas where the product may look simpler than it really is
- areas where marketing could accidentally commoditize the product
- areas where visual proof may currently be weak

## Section 14 - Strategic Marketing Recommendation

Conclude with:
- best primary ICP to target first
- best workflow to lead homepage with
- strongest proof block candidate
- strongest hero visual candidate
- strongest infrastructure narrative
- strongest trust narrative
- strongest operational-pain narrative
- biggest messaging mistake to avoid
- biggest positioning opportunity
- best long-term category framing

## Section 15 - Evidence Map

Create a grouped appendix listing:
- most important files
- routes
- modules
- components
- systems
- docs
- schemas
- services

For each:
- what it revealed
- why it matters strategically
- what marketing/storytelling value it exposes

## Section 16 - Preservation And Scope Boundary Recommendation

Conclude the report with a practical scope recommendation before any future implementation.

Include:
- exact current website files that should be backed up before changes
- exact website docs that represent the current approved website state
- which future changes can safely stay in static marketing files, locale files, or homepage components
- which changes would affect broader website surfaces
- which changes could affect pricing, auth, subscription, payment, onboarding, or Razorpay flows
- whether the pricing page should be left unchanged for the next implementation stage
- what would require a separate pricing/payment risk review
- recommended backup file location and naming pattern

## Output Requirements

- Be extremely concrete.
- Cite actual files, systems, routes, modules, or components whenever possible.
- Separate evidence from inference.
- Think like a founder-level strategist, not a feature marketer.
- Prioritize structural insight over feature listing.
- Analyze the hidden architecture beneath the UX.
- Explain WHY systems matter.
- Keep writing dense and high-signal.
- Do not jump to conclusions before inspecting the repository deeply.

Before writing the final report:
fully inspect the repository first.
