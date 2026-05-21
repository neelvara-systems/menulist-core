import { CANONICA_GOVERNANCE_TABS, CANONICA_ROUTES, getCanonicaGovernanceRoute } from '@constant/canonica/navigations';
import { PRODUCT_IDS } from '@constant/product';
import type {
    CanonicaActivationStage,
    CanonicaActivationStep,
    CanonicaActivationStepStatus,
    CanonicaActivationSubscriptionSummary,
    CanonicaActivationSummary,
    CanonicaSurfaceContentSummary,
    CanonicaTrustMetrics,
    CanonicaWidgetRuntimeStatus,
} from '@type/canonica';
import type { CanonicaCoverageData } from '@database/canonica/coverageKPI';
import { createHash } from 'crypto';

export const getCanonicaActivationSummaryDocId = (tId: number, sId: number) =>
    `activation_${Number(tId)}_${Number(sId)}`;

const getTimestampMillis = (value: any): number => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
};

const getReadinessStage = (score: number, steps: CanonicaActivationStep[]): CanonicaActivationStage => {
    if (score >= 85) return 'live';
    if (steps.some(step => step.key === 'widget-install' && step.status !== 'complete')) return 'install';
    if (steps.some(step => ['knowledge', 'help-center', 'entities', 'canonical-answers', 'product-surfaces', 'page-context'].includes(step.key) && step.status !== 'complete')) return 'knowledge';
    return 'setup';
};

const buildStep = (input: {
    key: string;
    title: string;
    description: string;
    status: CanonicaActivationStepStatus;
    required?: boolean;
    actionLabel?: string;
    route?: string;
    costNote?: string;
}): CanonicaActivationStep => ({
    required: input.required !== false,
    ...input,
});

const normalizeSubscription = (value: Record<string, any> | null | undefined): CanonicaActivationSubscriptionSummary | null => {
    if (!value || typeof value !== 'object') return null;

    return {
        id: value.id || value.providerSubscriptionId || null,
        planId: value.planId || null,
        planName: value.planName || null,
        status: value.status || null,
        currency: value.currency || null,
        amount: Number.isFinite(Number(value.amount)) ? Number(value.amount) : null,
        isBeta: value.planId === 'canonica_beta' || String(value.providerSubscriptionId || value.id || '').startsWith('canonica_beta_'),
        subscriptionEndDate: value.subscriptionEndDate || value.cycleEndDate || null,
    };
};

const getTrustScore = (trust: CanonicaTrustMetrics | null | undefined): number | null => {
    if (!trust) return null;
    const parts = [
        Number(trust.coverage?.rate),
        Number(trust.resolution?.rate),
        100 - Number(trust.drift?.rate),
        Number(trust.entityHealth?.avgScore),
    ].filter(value => Number.isFinite(value));
    if (!parts.length) return null;
    return Math.round(parts.reduce((sum, value) => sum + value, 0) / parts.length);
};

export function buildCanonicaActivationSummary(params: {
    tId: number;
    sId: number;
    storeData: Record<string, any>;
    subscription?: Record<string, any> | null;
    contextSummary?: CanonicaSurfaceContentSummary | null;
    coverage?: CanonicaCoverageData | null;
    trustMetrics?: CanonicaTrustMetrics | null;
}): CanonicaActivationSummary {
    const storeData = params.storeData || {};
    const subscription = normalizeSubscription(storeData.canonicaSubscription || params.subscription);
    const runtimeStatus = (storeData.widgetRuntimeStatus || null) as CanonicaWidgetRuntimeStatus | null;
    const content = params.contextSummary || null;
    const hasWidgetKey = Boolean(storeData.canonicaWidgetApi?.apiKeyHash || storeData.publicApi?.apiKeyHash || storeData.publicApi?.apiKey);
    const allowedOrigins = Array.isArray(storeData.widgetAllowedOrigins) ? storeData.widgetAllowedOrigins : [];
    const subscriptionStatus = String(subscription?.status || '').toLowerCase();
    const licenseStatus: CanonicaActivationStepStatus = subscriptionStatus === 'active'
        ? 'complete'
        : subscriptionStatus === 'pending'
            ? 'attention'
            : 'pending';
    const hasRuntimeContext = Boolean(runtimeStatus?.lastContextKey || runtimeStatus?.lastFeature || runtimeStatus?.lastPage);
    const hasWidgetSeenRecently = Boolean(runtimeStatus?.lastSeenAt && getTimestampMillis(runtimeStatus.lastSeenAt));
    const entityCount = Number(params.trustMetrics?.entityHealth?.totalEntities || 0);
    const activeCanonicalAnswerCount = Number(params.trustMetrics?.drift?.activeCount || 0);
    const primarySurfaces = Array.isArray(storeData.primarySurfaces)
        ? storeData.primarySurfaces.filter(Boolean)
        : [];
    const hasProductProfile = Boolean(storeData.productUrl && storeData.supportEmail);

    const steps: CanonicaActivationStep[] = [
        buildStep({
            key: 'workspace',
            title: 'Workspace created',
            description: 'Company and product workspace are available.',
            status: storeData ? 'complete' : 'pending',
            route: CANONICA_ROUTES.SETTINGS,
            actionLabel: 'Review Settings',
            costNote: 'Uses the existing Canonica store document.',
        }),
        buildStep({
            key: 'product-profile',
            title: 'Product details captured',
            description: hasProductProfile
                ? 'Product URL and support email are saved for setup, widget, and help-center configuration.'
                : 'Add your product URL and support email so Canonica can verify install and route users correctly.',
            status: hasProductProfile ? 'complete' : 'attention',
            route: CANONICA_ROUTES.SETTINGS,
            actionLabel: 'Review Details',
            costNote: 'Stored on the existing Canonica store document.',
        }),
        buildStep({
            key: 'license',
            title: 'License active',
            description: subscriptionStatus === 'pending'
                ? 'Payment is pending. Keep setup moving, but resolve billing before launch.'
                : 'Subscription or beta license is recorded for this workspace.',
            status: licenseStatus,
            route: CANONICA_ROUTES.SETTINGS,
            actionLabel: 'Check License',
            costNote: 'Read from store subscription summary; legacy fallback is capped to 5 docs.',
        }),
        buildStep({
            key: 'knowledge',
            title: 'Knowledge imported',
            description: `${content?.articleCount || 0} published article${(content?.articleCount || 0) === 1 ? '' : 's'} available in the compact content summary.`,
            status: (content?.articleCount || 0) > 0 ? 'complete' : 'pending',
            route: CANONICA_ROUTES.KB_GENERATION,
            actionLabel: 'Import Content',
            costNote: 'Reads platformSummary context content; no article collection scan on this page.',
        }),
        buildStep({
            key: 'help-center',
            title: 'Help center ready',
            description: (content?.articleCount || 0) > 0
                ? 'The public help center has published content to show customers.'
                : 'Publish at least one article before sending customers to the help center.',
            status: (content?.articleCount || 0) > 0 ? 'complete' : 'pending',
            route: CANONICA_ROUTES.DOCS,
            actionLabel: 'Preview Docs',
            costNote: 'Uses the existing context summary article count.',
        }),
        buildStep({
            key: 'entities',
            title: 'Product entities reviewed',
            description: entityCount > 0
                ? `${entityCount} product entit${entityCount === 1 ? 'y is' : 'ies are'} modeled for retrieval and governance.`
                : 'Review feature, plan, role, workflow, integration, and error-code entities.',
            status: entityCount > 0 ? 'complete' : 'pending',
            route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.ENTITIES),
            actionLabel: 'Review Entities',
            costNote: 'Uses the trust metrics summary; no entity collection scan on this page.',
        }),
        buildStep({
            key: 'canonical-answers',
            title: 'Canonical answers reviewed',
            description: activeCanonicalAnswerCount > 0
                ? `${activeCanonicalAnswerCount} active canonical answer${activeCanonicalAnswerCount === 1 ? '' : 's'} available for governed retrieval.`
                : 'Create or review canonical answers so repeated questions do not depend on fallback generation.',
            status: activeCanonicalAnswerCount > 0 ? 'complete' : 'pending',
            route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.ANSWERS),
            actionLabel: 'Review Answers',
            costNote: 'Uses the trust metrics summary; no canonical answer collection scan on this page.',
        }),
        buildStep({
            key: 'product-surfaces',
            title: 'Product surfaces mapped',
            description: `${content?.surfaceCount || 0} product surface${(content?.surfaceCount || 0) === 1 ? '' : 's'} mapped to routes, articles, releases, and signals.`,
            status: (content?.surfaceCount || 0) > 0 ? 'complete' : 'pending',
            route: CANONICA_ROUTES.PRODUCT_SURFACES,
            actionLabel: 'Map Surfaces',
            costNote: 'Uses the same compact summary doc as widget contextual retrieval.',
        }),
        buildStep({
            key: 'widget-key',
            title: 'Widget key ready',
            description: hasWidgetKey ? 'A dedicated Canonica widget key exists.' : 'Create a widget key before installing Canonica in your product.',
            status: hasWidgetKey ? 'complete' : 'pending',
            route: CANONICA_ROUTES.WIDGET,
            actionLabel: hasWidgetKey ? 'Open Widget' : 'Create Key',
            costNote: 'Key status is derived from the store document; raw keys are never read back.',
        }),
        buildStep({
            key: 'allowed-origins',
            title: 'Allowed origins locked',
            description: allowedOrigins.length > 0
                ? `${allowedOrigins.length} allowed origin${allowedOrigins.length === 1 ? '' : 's'} configured.`
                : 'Add your app origin so leaked widget keys cannot be used from unknown domains.',
            status: allowedOrigins.length > 0 ? 'complete' : 'attention',
            route: CANONICA_ROUTES.WIDGET,
            actionLabel: 'Secure Origins',
            costNote: 'Stored on the existing store document; no separate security collection.',
        }),
        buildStep({
            key: 'widget-install',
            title: 'Widget seen in product',
            description: hasWidgetSeenRecently
                ? `Last seen on ${runtimeStatus?.lastPath || 'a product page'}.`
                : 'Install the script and open your product once so Canonica can verify the widget loads.',
            status: hasWidgetSeenRecently ? 'complete' : 'pending',
            route: CANONICA_ROUTES.WIDGET,
            actionLabel: 'Install Widget',
            costNote: 'Runtime writes are throttled and stored on the existing store document.',
        }),
        buildStep({
            key: 'page-context',
            title: 'Page context received',
            description: hasRuntimeContext
                ? `Latest context: ${runtimeStatus?.lastContextKey || runtimeStatus?.lastFeature || runtimeStatus?.lastPage}.`
                : 'Send contextKey, feature, or page after route changes so answers match the user screen.',
            status: hasRuntimeContext ? 'complete' : 'pending',
            route: CANONICA_ROUTES.PRODUCT_SURFACES,
            actionLabel: 'Set Context',
            costNote: 'Context is transient at runtime; only a sanitized last-seen marker is stored.',
        }),
        buildStep({
            key: 'release-notes',
            title: 'Changelog published',
            description: `${content?.changelogCount || 0} recent release note${(content?.changelogCount || 0) === 1 ? '' : 's'} linked in the context summary.`,
            status: (content?.changelogCount || 0) > 0 ? 'complete' : 'optional',
            required: false,
            route: CANONICA_ROUTES.CHANGELOG,
            actionLabel: 'Add Release Notes',
            costNote: 'Recent changelog entries are pre-compacted into the context summary.',
        }),
        buildStep({
            key: 'ticket-signals',
            title: 'Support signal loop tested',
            description: `${content?.ticketCount || 0} ticket signal${(content?.ticketCount || 0) === 1 ? '' : 's'} visible in the context summary.`,
            status: (content?.ticketCount || 0) > 0 ? 'complete' : 'optional',
            required: false,
            route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.SIGNAL_QUEUE),
            actionLabel: 'Test Ticket Flow',
            costNote: 'Tickets remain signal sources, not a helpdesk replacement.',
        }),
    ];

    const requiredSteps = steps.filter(step => step.required);
    const completeRequired = requiredSteps.filter(step => step.status === 'complete').length;
    const readinessScore = requiredSteps.length > 0
        ? Math.round((completeRequired / requiredSteps.length) * 100)
        : 0;
    const signaturePayload = {
        tId: params.tId,
        sId: params.sId,
        readinessScore,
        subscriptionStatus,
        hasWidgetKey,
        allowedOriginCount: allowedOrigins.length,
        widgetPath: runtimeStatus?.lastPath || null,
        widgetContext: runtimeStatus?.lastContextKey || runtimeStatus?.lastFeature || runtimeStatus?.lastPage || null,
        productUrl: storeData.productUrl || null,
        supportEmail: storeData.supportEmail || null,
        billingModel: storeData.billingModel || null,
        primarySurfaceCount: primarySurfaces.length,
        articleCount: content?.articleCount || 0,
        surfaceCount: content?.surfaceCount || 0,
        changelogCount: content?.changelogCount || 0,
        ticketCount: content?.ticketCount || 0,
        entityCount,
        activeCanonicalAnswerCount,
    };

    return {
        pId: PRODUCT_IDS.CANONICA,
        tId: params.tId,
        sId: params.sId,
        readinessScore,
        stage: getReadinessStage(readinessScore, steps),
        computedAtIso: new Date().toISOString(),
        signature: createHash('sha256').update(JSON.stringify(signaturePayload)).digest('hex').slice(0, 24),
        workspace: {
            companyName: storeData.companyName || storeData.businessName || storeData.tenantName || null,
            productName: storeData.productName || storeData.name || null,
            productUrl: storeData.productUrl || null,
            supportEmail: storeData.supportEmail || null,
            billingModel: storeData.billingModel || null,
            primarySurfaceCount: primarySurfaces.length,
        },
        subscription,
        widget: {
            hasWidgetKey,
            keyPrefix: storeData.canonicaWidgetApi?.keyPrefix || storeData.publicApi?.keyPrefix || null,
            allowedOriginCount: allowedOrigins.length,
            configVersion: Number(storeData.widgetConfigVersion || 0),
            runtimeStatus,
        },
        content: {
            surfaceCount: content?.surfaceCount || 0,
            articleCount: content?.articleCount || 0,
            changelogCount: content?.changelogCount || 0,
            ticketCount: content?.ticketCount || 0,
            summaryGeneratedAt: content?.generatedAt || null,
        },
        governance: {
            canonicalCoverageRate: Number.isFinite(Number(params.coverage?.coverage?.rate)) ? Number(params.coverage?.coverage?.rate) : null,
            canonicalCoverageTotal: Number.isFinite(Number(params.coverage?.coverage?.total)) ? Number(params.coverage?.coverage?.total) : null,
            trustScore: getTrustScore(params.trustMetrics),
        },
        steps,
        readModel: {
            firestoreReads: 5,
            firestoreWrites: '0 on normal view; 1 compact platformSummary write only when readiness signature changes or becomes stale.',
            source: 'stores + platformSummary activation/context/coverage/trust docs',
        },
    };
}

export function shouldPersistActivationSummary(existing: Record<string, any> | null, next: CanonicaActivationSummary): boolean {
    if (!existing) return true;
    if (existing.signature !== next.signature) return true;
    const lastComputed = getTimestampMillis(existing.lastComputedAt || existing.computedAtIso);
    return !lastComputed || Date.now() - lastComputed > 30 * 60 * 1000;
}
