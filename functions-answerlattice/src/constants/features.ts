/**
 * Feature Flags for Answerlattice Cloud Functions
 * 
 * Controls nightly batch processing and other server-side Answerlattice features.
 * Separate from MenuList's functions/src/constants/features.ts.
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md
 */

export const FUNCTION_FLAGS = {
    /**
     * Answerlattice Drift Detection + Signal Mutation nightly batch
     *
     * Runs as a scheduled Cloud Function to:
     * 1. Evaluate drift for all tenants (4 drift classes)
     * 2. Resolve unresolved signal entityIds
     * 3. Run signal mutation engine (cluster signals → proposals)
     * 4. Aggregate canonical coverage KPI
     * 5. Detect recurring fallbacks → auto proposals
     * 6. Track post-mutation impact (14-day window)
     * 7. Auto-adjust confidence scores
     * 8. Archive expired signals (12-month TTL)
     *
     * Requires: Answerlattice collections seeded with entities + canonical answers
     *
     * true: Run Answerlattice nightly batch
     * false: Skip Answerlattice processing
     *
     * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md
     */
    ENABLE_ANSWERLATTICE_NIGHTLY: true,

    /**
     * Answerlattice Automatic Knowledge Creation (AI Draft Generation)
     *
     * When true + ENABLE_ANSWERLATTICE_NIGHTLY is true:
     * Step 9 of the nightly batch generates AI draft content for
     * new_answer_required mutation proposals using Gemini.
     *
     * Max 10 drafts per nightly run. Cost: <$0.01/run.
     *
     * @see __docs__/answerlattice/automatic-knowledge-creation/
     */
    ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE: true,

    /**
     * Answerlattice Product Friction Intelligence (nightly + weekly)
     *
     * Step 9: Nightly friction aggregation (daily stats per entity)
     * Step 10: Weekly AI insight generation (Sundays only)
     *
     * @see __docs__/answerlattice/product-friction-intelligence/
     */
    ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE: true,

    /**
     * Answerlattice Founder Trust Layer
     *
     * When true + ENABLE_ANSWERLATTICE_NIGHTLY is true:
     * Aggregates coverage, resolution, drift, entity health, and top failing
     * entities into platformSummary/trustMetrics_{tId}_{sId}.
     *
     * Zero new collections. One compact platformSummary write per tenant/run.
     *
     * @see __docs__/answerlattice/founder-trust-layer/
     */
    ENABLE_ANSWERLATTICE_TRUST_METRICS: true,

    /**
     * Answerlattice Founder Onboarding (Knowledge Bootstrap Engine)
     *
     * Step 12 of nightly batch: auto-extracts entities from published KB articles,
     * auto-promotes high-confidence candidates, generates canonical answer drafts.
     * Separate discovery loop (queries kb_generation_jobs, not answerlattice_entities).
     *
     * Max 50 entities + 50 drafts per run. Cost: ~$0.08/tenant one-time.
     *
     * @see __docs__/answerlattice/founder-onboarding/
     */
    ENABLE_ANSWERLATTICE_FOUNDER_ONBOARDING: true,

    /**
     * Answerlattice External Workflow Integrations
     *
     * When true + ENABLE_ANSWERLATTICE_NIGHTLY is true:
     * Step 13 of the nightly batch emits governance events
     * (drift, mutations, coverage, gaps) to configured external tools.
     *
     * Adapters: Slack, Email, Linear, GitHub
     * Collections: answerlattice_integrationEvents, answerlattice_integrationDeliveryLogs
     * Config: platformSummary/integrationConfig_{tId}_{sId}
     *
     * @see __docs__/answerlattice/workflow-integrations/
     */
    ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS: true,

    /**
     * Answerlattice Ticket → Knowledge Loop (Expansion Item #9)
     *
     * Step 14 of nightly batch: extracts knowledge candidates from
     * resolved ticket clusters (3+ tickets per entity). Generates
     * AI draft canonical answers from accumulated resolutions.
     *
     * Max 5 drafts per run. Cost: ~$0.12/tenant/month.
     *
     * Requires: ENABLE_ANSWERLATTICE_NIGHTLY + ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE
     * @see __docs__/answerlattice/ticket-knowledge-loop/
     */
    ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE: true,

    /**
     * Answerlattice Knowledge Graph Exploitation (Nightly Graph Index Rebuild)
     *
     * Step 15 of nightly batch: rebuilds the precomputed entity graph index
     * from answerlattice_entityRelations. The index enables 1-hop graph traversal
     * during retrieval (client-side flag: ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH).
     *
     * Cost: bounded entity/relation/answer/source-version summary reads plus
     * a conditional platformSummary write only when the source hash changed.
     *
     * @see __docs__/answerlattice/knowledge-graph-exploitation/
     */
    ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH: true,

    /**
     * Answerlattice Predictive Support (Nightly Trigger Sync)
     *
     * Step 16 of nightly batch: auto-generates suggested triggers from
     * friction patterns, rebuilds platformSummary cache, computes
     * effectiveness scores, auto-disables low-performing triggers.
     *
     * Max 5 auto-suggestions per run. Cost: ~$0.01/tenant/night.
     *
     * Requires: ENABLE_ANSWERLATTICE_NIGHTLY + ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE
     * @see __docs__/answerlattice/predictive-support/
     */
    ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT: true,

    /**
     * Answerlattice Support Board Nightly Sync
     *
     * When true + ENABLE_ANSWERLATTICE_NIGHTLY is true:
     * creates bounded, deduped Support Board cards from repeated fallback,
     * negative feedback, escalation clusters, drifted answers, and release
     * impact. Also writes platformSummary/supportBoardSummary_{tId}_{sId}
     * so owners can see the review workload without scanning raw logs.
     *
     * Does not create cards for every ticket and never publishes answers.
     * Default is false because tickets, signals, and drift already have their
     * own owner surfaces; enable per rollout when the tenant wants consolidated
     * Support Board review work.
     *
     * @see __docs__/answerlattice/support-board/
     */
    ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SYNC: false,

    /**
     * Answerlattice Knowledge Intake Scheduler Hooks
     *
     * Summary-only nightly maintenance for knowledge-intake jobs. The scheduler
     * reads the latest bounded job docs and writes one compact summary when the
     * payload changed. It does not retry failed jobs, crawl URLs, call AI
     * providers, or publish review items.
     *
     * Owner-triggered app routes remain the only path for extraction, analysis,
     * media OCR/transcription, and publishing.
     *
     * @see __docs__/answerlattice/knowledge-intake-command-center/
     */
    ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE_SCHEDULER: true,

    /**
     * Answerlattice Compiled Context Bundles
     *
     * When true + ENABLE_ANSWERLATTICE_NIGHTLY is true:
     * Nightly checks sourceVersions vs bundleManifest and repairs stale
     * compiled context bundles. Rebuilds are source-change-driven and bounded.
     *
     * @see __docs__/answerlattice/compiled-context-distribution/
     */
    ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES: true,

    /**
     * Answerlattice Context Bundle Builder
     *
     * Enables the Firebase-side bundle builder used by nightly repair and
     * manual backend rebuilds. Runtime widget/API/MCP paths still require
     * their own application flags.
     *
     * @see __docs__/answerlattice/compiled-context-distribution/
     */
    ENABLE_ANSWERLATTICE_BUNDLE_BUILDER: true,
} as const;
