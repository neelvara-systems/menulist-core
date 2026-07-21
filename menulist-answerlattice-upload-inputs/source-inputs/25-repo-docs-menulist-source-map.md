# MenuList Repo Evidence Map For Answerlattice

**Verified:** 2026-07-20 against current paths in the MenuList repository.

## Purpose

This map tells Answerlattice reviewers where to verify a summarized package claim before approving it as support truth. It prevents public website copy, old strategy notes, disabled scaffolds, or sister-product docs from outranking current code and maintained MenuList documentation.

## Authority Order

1. Current runtime code, shared constants/types, feature flags, and executable verifiers.
2. Current maintained feature docs and active verification reports.
3. Current public website source and legal-page components.
4. Current production configuration/evidence available to the authenticated operator.
5. Owner-approved account-specific evidence.
6. Historical archives, external AI conversations, strategies, and screenshots only as non-authoritative context.

## Package-Level Evidence

| Evidence | Use |
| --- | --- |
| `FEATURE_SWEEP_MASTER_INVENTORY.md` | MenuList feature/classification/surface map. |
| `FEATURE_SWEEP_MASTER_REPORT.md` | Cross-system audit findings, fixes, verification, and pending external evidence. |
| `src/config/features.ts` | Current source feature-flag declarations. |
| `src/constants/database.ts` | Current MenuList collection constants. |
| `src/types/` | Shared runtime data and boundary types. |
| `scripts/verification/` | Executable source/behavior/rules/cache/cost gates. |
| `__docs__/audits/menulist-production-readiness-audit.md` | Current production-readiness separation between local proof and external release evidence. |

## Product, Website, Discovery, And Public Truth

- `__docs__/constitution/`
- `__docs__/main-website/`
- `__docs__/public-menu-entry/`
- `__docs__/client-menu/`
- `__docs__/client-menu-retrieval-foundation/`
- `__docs__/official-business-page/`
- `__docs__/discovery-infrastructure/`
- `__docs__/agent-readiness-strategy/`
- `__docs__/canonical-truth-infrastructure/`
- `__docs__/business-truth-graph/`
- `__docs__/url-routing-architecture/`
- `__docs__/customer-facing-infrastructure/`

Canonical public URL identity is `https://menulist.ai`. Preview/alias hosts are deployment evidence only and must not replace canonical Answerlattice source identity.

## Menu Intake, Extraction, Editing, Publish, And Correctness

- `__docs__/projects/`
- `__docs__/menu-extraction-pipeline/`
- `__docs__/menu-link-import/`
- `__docs__/menu-intake-identity/`
- `__docs__/menu-command-center/`
- `__docs__/menu-correctness-engine/`
- `__docs__/pricing-integrity-system/`
- `__docs__/menu-quality-signals/`
- `__docs__/menu-trust-signals/`
- `__docs__/menu-setup-progress/`
- `__docs__/menulist-activation-concierge/`
- `__docs__/editor-ux-improvements/`

Current save/publish/cache truth is also enforced through `src/database/projects/` and `src/lib/cache/publicClientCache.ts`.

## MenuList AI Owner Workflows

- `__docs__/ai-system-layer/`
- `__docs__/ai-enhancement-packs/`
- `__docs__/ai-menu-manager/`
- `__docs__/projects/description-generation/`
- `__docs__/projects/multi-language-translation/`
- `__docs__/projects/ai-image-generation/`
- `__docs__/media-image-system/`
- `__docs__/extracted-business-profile/`
- `src/constants/AI/unitCosts.ts`
- `src/data/shared/contentCreditPolicy.ts`

Use these to distinguish free setup operations, paid content-credit operations, owner review, credit reservation/settlement/restoration, provider failures, and safe Transactions presentation. Never expose internal provider cost, margin, raw prompts/responses, model-routing internals, or secret identifiers.

## Public, Share, Print, Screen, And Customer Surfaces

- `__docs__/menu-kit/`
- `__docs__/item-truth-export/`
- `__docs__/menu-card-export/`
- `__docs__/print-assets/`
- `__docs__/printable-asset-templates/`
- `__docs__/print-menu-surfaces/`
- `__docs__/pdf-surface/`
- `__docs__/customer-communication-kit/`
- `__docs__/physical-surfaces/`
- `__docs__/digital-screens/`
- `__docs__/customer-app/`
- `__docs__/sharable-item-card-generation/`

Downloaded/printed assets are snapshots. Stable QR destinations can continue to show current truth, but an old downloaded PDF/image does not update after it leaves MenuList.

## Store, Hours, Localization, Accessibility, And Mobile

- `__docs__/stores-management/`
- `__docs__/hours-holiday-accuracy/`
- `__docs__/temp-status-layer/`
- `__docs__/global-localization/`
- `__docs__/website-i18n/`
- `__docs__/global-accessibility/`
- `__docs__/mobile-operational-support/`
- `__docs__/owner-pwa-lifecycle/`
- `.codex/rules/MOBILE_SUPPORT_RULES.md`

Owner UI language, store/public language, and owner-entered menu content language are distinct. Weekly hours and current status use the business timezone. Holiday calendars/date-specific exception managers are not shipped.

## Dashboard, Analytics, Business Health, Feedback, And Help

- `__docs__/projects/owner-dashboard.md`
- `__docs__/owner-business-assistant/`
- `__docs__/menu-presence-monitor/`
- `__docs__/menulist-tools/public-truth-tools/`
- `__docs__/continuous-menu-intelligence/`
- `__docs__/decision-intelligence/`
- `__docs__/answerlattice/help-center/`
- current Guest Feedback docs under `__docs__/features/` and related feature folders

Business Health is read-only. AI Menu Manager owns supported action preparation. Analytics are bounded business signals, not personal, billing, or legal records.

## Account, Staff, Ownership, And Multi-Location

- `__docs__/auth/`
- `__docs__/auth-onboarding/`
- `__docs__/onboarding/`
- `__docs__/onboarding-centralization/`
- `__docs__/account-tenant-lifecycle/`
- `__docs__/roles-permissions/`
- `__docs__/multi-chain-permissions/`
- `__docs__/staff-prompt/`
- `__docs__/multi-outlet-consistency/`
- `__docs__/ownership-transfer/`
- `__docs__/ownership-dormant-lifecycle/`

An operational Owner role is not a complete business-account transfer. Full ownership, privacy, portability, deletion, or last-owner disputes require verified support.

## Billing, Trust, Security, And Legal

- `__docs__/razorpay/`
- `__docs__/ai-enhancement-packs/`
- `__docs__/security/`
- `__docs__/compliance-pages/`
- `__docs__/production-readiness/`
- `src/components/website/legal/`
- `src/data/PlatformPlansList.ts`
- `src/lib/billing/`

Use source code and dated public components for current price/policy facts. Do not restore retired fixed 30-day deletion wording, absolute output ownership, all-feature access, provider certification, or access beyond the valid paid cycle.

## Integrations, Location Identity, And External Distribution

- `__docs__/pos-webhook-sync/`
- `__docs__/external-integrations/`
- `__docs__/platform-pull-api/`
- `__docs__/gbp-sync/`
- `__docs__/qr-whatsapp-experiments/`
- `__docs__/canonical-truth-infrastructure/`
- `__docs__/business-truth-graph/`
- `src/lib/public-truth-tools/externalLocationIdentity.ts`

External Menu Sync is one signed snapshot path to a configured receiver. GBP posting/review experiments, automatic platform posting, public MCP, agent truth audit, external collision detection, and automatic location merging are not ordinary shipped owner capabilities.

## Failure, Configuration, Lifecycle, Cost, And Internal Operations

- `__docs__/global-failure-observability/`
- `__docs__/configuration-safety/`
- `__docs__/account-tenant-lifecycle/`
- `__docs__/ownership-dormant-lifecycle/`
- `__docs__/firebase-scale-cost-closeout/`
- `__docs__/ops-control-room/`
- `__docs__/cost-self-protection/`
- `__docs__/internal-platform/`

These folders explain system behavior and operator boundaries. Internal alerts, schedulers, costs, safe-mode controls, and platform recovery must not become ordinary owner-facing feature claims.

## Disabled, Dormant, Or Planning-Only Boundaries

- `__docs__/reviews-reputation/`
- `__docs__/reputation-protection/`
- `__docs__/owner-referral/`
- `__docs__/surface-os/`
- dormant pricing/background queue material explicitly marked inactive in its maintained docs

Documentation existence does not prove availability. Check current flags, runtime consumers, account allowlists, and release evidence.

## Separate Products And Exclusions

Exclude Answerlattice, CampaignCue, GrowthOS, KitStamp, MyCodex, Canonica, SignalDesk, Neelvara, SurfaceOS planning, and other sibling-product features from MenuList support unless the exact question is about the boundary or a deliberately shared MenuList surface.

Relevant exclusion roots include:

- `__docs__/answerlattice/`
- `__docs__/campaigncue/`
- `__docs__/growthos-addon/`
- `__docs__/kitstamp/`
- `__docs__/mycodex-*`
- `__docs__/surface-os/`
- sibling runtime route groups, packages, Firebase targets, and deployment domains

## Upload And Approval Rule

Ingest the 26 summarized package sources first. Attach individual repo docs only when deeper evidence is needed. A source file, support reply, screenshot, public page, or generated draft remains evidence for review; it does not become approved canonical truth automatically.

If two current sources disagree, keep both facts and their applicability visible, identify the authority/conflict, and require owner review. Never silently choose historical or more convenient wording over current code/runtime truth.
