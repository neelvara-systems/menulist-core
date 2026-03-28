/**
 * Feature Flags for Canonica Cloud Functions
 * 
 * Controls nightly batch processing and other server-side Canonica features.
 * Separate from MenuList's functions/src/constants/features.ts.
 * 
 * @see __docs__/canonica/doctrine/05-architecture-evolution.md
 */

export const FUNCTION_FLAGS = {
    /**
     * Canonica Drift Detection + Signal Mutation nightly batch
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
     * Requires: Canonica collections seeded with entities + canonical answers
     *
     * true: Run Canonica nightly batch
     * false: Skip Canonica processing
     *
     * @see __docs__/canonica/doctrine/05-architecture-evolution.md
     */
    ENABLE_CANONICA_NIGHTLY: false,

    /**
     * Canonica Automatic Knowledge Creation (AI Draft Generation)
     *
     * When true + ENABLE_CANONICA_NIGHTLY is true:
     * Step 9 of the nightly batch generates AI draft content for
     * new_answer_required mutation proposals using Gemini.
     *
     * Max 10 drafts per nightly run. Cost: <$0.01/run.
     *
     * @see __docs__/canonica/automatic-knowledge-creation/
     */
    ENABLE_CANONICA_AUTO_KNOWLEDGE: false,

    /**
     * Canonica Product Friction Intelligence (nightly + weekly)
     *
     * Step 9: Nightly friction aggregation (daily stats per entity)
     * Step 10: Weekly AI insight generation (Sundays only)
     *
     * @see __docs__/canonica/product-friction-intelligence/
     */
    ENABLE_CANONICA_FRICTION_INTELLIGENCE: false,

    /**
     * Canonica Founder Onboarding (Knowledge Bootstrap Engine)
     *
     * Step 12 of nightly batch: auto-extracts entities from published KB articles,
     * auto-promotes high-confidence candidates, generates canonical answer drafts.
     * Separate discovery loop (queries kb_generation_jobs, not canonica_entities).
     *
     * Max 50 entities + 50 drafts per run. Cost: ~$0.08/tenant one-time.
     *
     * @see __docs__/canonica/founder-onboarding/
     */
    ENABLE_CANONICA_FOUNDER_ONBOARDING: false,

    /**
     * Canonica External Workflow Integrations
     *
     * When true + ENABLE_CANONICA_NIGHTLY is true:
     * Step 13 of the nightly batch emits governance events
     * (drift, mutations, coverage, gaps) to configured external tools.
     *
     * Adapters: Slack, Email, Linear, GitHub
     * Collections: canonica_integrationEvents, canonica_integrationDeliveryLogs
     * Config: platformSummary/integrationConfig_{tId}_{sId}
     *
     * @see __docs__/canonica/workflow-integrations/
     */
    ENABLE_CANONICA_WORKFLOW_INTEGRATIONS: false,

    /**
     * Canonica Ticket → Knowledge Loop (Expansion Item #9)
     *
     * Step 14 of nightly batch: extracts knowledge candidates from
     * resolved ticket clusters (3+ tickets per entity). Generates
     * AI draft canonical answers from accumulated resolutions.
     *
     * Max 5 drafts per run. Cost: ~$0.12/tenant/month.
     *
     * Requires: ENABLE_CANONICA_NIGHTLY + ENABLE_CANONICA_AUTO_KNOWLEDGE
     * @see __docs__/canonica/ticket-knowledge-loop/
     */
    ENABLE_CANONICA_TICKET_KNOWLEDGE: false,

    /**
     * Canonica Knowledge Graph Exploitation (Nightly Graph Index Rebuild)
     *
     * Step 15 of nightly batch: rebuilds the precomputed entity graph index
     * from canonica_entityRelations. The index enables 1-hop graph traversal
     * during retrieval (client-side flag: ENABLE_CANONICA_KNOWLEDGE_GRAPH).
     *
     * Cost: 1 relation read + 1 platformSummary write per tenant per night.
     *
     * @see __docs__/canonica/knowledge-graph-exploitation/
     */
    ENABLE_CANONICA_KNOWLEDGE_GRAPH: false,

    /**
     * Canonica Predictive Support (Nightly Trigger Sync)
     *
     * Step 16 of nightly batch: auto-generates suggested triggers from
     * friction patterns, rebuilds platformSummary cache, computes
     * effectiveness scores, auto-disables low-performing triggers.
     *
     * Max 5 auto-suggestions per run. Cost: ~$0.01/tenant/night.
     *
     * Requires: ENABLE_CANONICA_NIGHTLY + ENABLE_CANONICA_FRICTION_INTELLIGENCE
     * @see __docs__/canonica/predictive-support/
     */
    ENABLE_CANONICA_PREDICTIVE_SUPPORT: false,
} as const;
