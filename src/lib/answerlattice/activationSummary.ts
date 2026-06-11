import { ANSWERLATTICE_GOVERNANCE_TABS, ANSWERLATTICE_ROUTES, getAnswerlatticeGovernanceRoute } from '@constant/answerlattice/navigations';
import { PRODUCT_IDS } from '@constant/product';
import { buildAnswerlatticeWidgetKeySummaries, normalizeAnswerlatticeWidgetApiState } from '@lib/answerlattice/widgetKeyManager';
import { getNotificationReadiness } from '@lib/notifications';
import type {
    AnswerlatticeActivationStage,
    AnswerlatticeActivationStep,
    AnswerlatticeActivationStepStatus,
    AnswerlatticeActivationSubscriptionSummary,
    AnswerlatticeActivationSummary,
    AnswerlatticeCompiledContextReadiness,
    AnswerlatticeLaunchProofItem,
    AnswerlatticeLaunchProofSummary,
    AnswerlatticeSurfaceReadinessItem,
    AnswerlatticeSurfaceContentSummary,
    AnswerlatticeTrustMetrics,
    AnswerlatticeWidgetRuntimeStatus,
} from '@type/answerlattice';
import type { AnswerlatticeCoverageData } from '@database/answerlattice/coverageKPI';
import { createHash } from 'crypto';

export const getAnswerlatticeActivationSummaryDocId = (tId: number, sId: number) =>
    `activation_${Number(tId)}_${Number(sId)}`;

const getTimestampMillis = (value: any): number => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
};

const getReadinessStage = (score: number, steps: AnswerlatticeActivationStep[]): AnswerlatticeActivationStage => {
    if (score >= 85) return 'live';
    if (steps.some(step => step.key === 'widget-install' && step.status !== 'complete')) return 'install';
    if (steps.some(step => ['knowledge', 'help-center', 'entities', 'canonical-answers', 'product-surfaces', 'page-context'].includes(step.key) && step.status !== 'complete')) return 'knowledge';
    return 'setup';
};

const buildStep = (input: {
    key: string;
    title: string;
    description: string;
    status: AnswerlatticeActivationStepStatus;
    required?: boolean;
    actionLabel?: string;
    route?: string;
    costNote?: string;
}): AnswerlatticeActivationStep => ({
    required: input.required !== false,
    ...input,
});

const getCombinedStatus = (steps: AnswerlatticeActivationStep[], keys: string[]): AnswerlatticeActivationStepStatus => {
    const selected = keys
        .map(key => steps.find(step => step.key === key)?.status)
        .filter(Boolean) as AnswerlatticeActivationStepStatus[];
    if (!selected.length) return 'pending';
    if (selected.every(status => status === 'complete')) return 'complete';
    if (selected.some(status => status === 'complete' || status === 'attention')) return 'attention';
    return 'pending';
};

const buildLaunchProof = (items: AnswerlatticeLaunchProofItem[]): AnswerlatticeLaunchProofSummary => {
    const completeCount = items.filter(item => item.status === 'complete').length;
    const totalCount = items.length;

    return {
        ready: totalCount > 0 && completeCount === totalCount,
        score: totalCount > 0 ? Math.round((completeCount / totalCount) * 100) : 0,
        completeCount,
        totalCount,
        blockers: items
            .filter(item => item.status !== 'complete')
            .map(item => item.title),
        items,
    };
};

const normalizeSubscription = (value: Record<string, any> | null | undefined): AnswerlatticeActivationSubscriptionSummary | null => {
    if (!value || typeof value !== 'object') return null;

    return {
        id: value.id || value.providerSubscriptionId || null,
        planId: value.planId || null,
        planName: value.planName || null,
        status: value.status || null,
        currency: value.currency || null,
        amount: Number.isFinite(Number(value.amount)) ? Number(value.amount) : null,
        isBeta: value.planId === 'answerlattice_beta' || String(value.providerSubscriptionId || value.id || '').startsWith('answerlattice_beta_'),
        subscriptionEndDate: value.subscriptionEndDate || value.cycleEndDate || null,
    };
};

const getTrustScore = (trust: AnswerlatticeTrustMetrics | null | undefined): number | null => {
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

const getSurfaceReadinessPriority = (item: AnswerlatticeSurfaceReadinessItem): number => {
    const priority: Record<AnswerlatticeSurfaceReadinessItem['status'], number> = {
        needs_articles: 4,
        open_signals: 3,
        needs_mapping: 2,
        ready: 1,
    };
    return priority[item.status] || 0;
};

const buildSurfaceReadiness = (content: AnswerlatticeSurfaceContentSummary | null | undefined): AnswerlatticeSurfaceReadinessItem[] => {
    if (!content?.surfaces) return [];

    return Object.values(content.surfaces)
        .map((surface): AnswerlatticeSurfaceReadinessItem => {
            const articleCount = surface.articles?.length || 0;
            const faqCount = surface.faqs?.length || 0;
            const changelogCount = surface.changelogs?.length || 0;
            const ticketCount = surface.tickets?.total || 0;
            const openTicketCount = surface.tickets?.open || 0;
            const hasRoutingSignal = Boolean(
                (surface.routePatterns || []).length
                || surface.feature
                || surface.page
                || surface.workflow
                || (surface.entityHints || []).length
                || (surface.tags || []).length
            );

            if (!hasRoutingSignal) {
                return {
                    key: surface.key,
                    label: surface.label,
                    routePatterns: surface.routePatterns || [],
                    articleCount,
                    faqCount,
                    changelogCount,
                    ticketCount,
                    openTicketCount,
                    status: 'needs_mapping',
                };
            }

            if (articleCount === 0 && faqCount === 0) {
                return {
                    key: surface.key,
                    label: surface.label,
                    routePatterns: surface.routePatterns || [],
                    articleCount,
                    faqCount,
                    changelogCount,
                    ticketCount,
                    openTicketCount,
                    status: 'needs_articles',
                };
            }

            if (openTicketCount > 0) {
                return {
                    key: surface.key,
                    label: surface.label,
                    routePatterns: surface.routePatterns || [],
                    articleCount,
                    faqCount,
                    changelogCount,
                    ticketCount,
                    openTicketCount,
                    status: 'open_signals',
                };
            }

            return {
                key: surface.key,
                label: surface.label,
                routePatterns: surface.routePatterns || [],
                articleCount,
                faqCount,
                changelogCount,
                ticketCount,
                openTicketCount,
                status: 'ready',
            };
        })
        .sort((left, right) => (
            getSurfaceReadinessPriority(right) - getSurfaceReadinessPriority(left)
            || right.openTicketCount - left.openTicketCount
            || (left.articleCount + (left.faqCount || 0)) - (right.articleCount + (right.faqCount || 0))
            || left.label.localeCompare(right.label)
        ))
        .slice(0, 8);
};

export function buildAnswerlatticeActivationSummary(params: {
    tId: number;
    sId: number;
    storeData: Record<string, any>;
    subscription?: Record<string, any> | null;
    contextSummary?: AnswerlatticeSurfaceContentSummary | null;
    coverage?: AnswerlatticeCoverageData | null;
    trustMetrics?: AnswerlatticeTrustMetrics | null;
    compiledContext?: AnswerlatticeCompiledContextReadiness | null;
}): AnswerlatticeActivationSummary {
    const storeData = params.storeData || {};
    const subscription = normalizeSubscription(storeData.answerlatticeSubscription || params.subscription);
    const runtimeStatus = (storeData.widgetRuntimeStatus || null) as AnswerlatticeWidgetRuntimeStatus | null;
    const content = params.contextSummary || null;
    const widgetKeyState = normalizeAnswerlatticeWidgetApiState(storeData.answerlatticeWidgetApi);
    const widgetKeySummaries = buildAnswerlatticeWidgetKeySummaries(widgetKeyState);
    const hasWidgetKey = widgetKeySummaries.length > 0;
    const allowedOrigins = Array.isArray(storeData.widgetAllowedOrigins) ? storeData.widgetAllowedOrigins : [];
    const subscriptionStatus = String(subscription?.status || '').toLowerCase();
    const licenseStatus: AnswerlatticeActivationStepStatus = subscriptionStatus === 'active'
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
    const notificationReadiness = getNotificationReadiness(PRODUCT_IDS.ANSWERLATTICE);
    const notificationsReady = notificationReadiness.enabled && notificationReadiness.smtpConfigured && hasProductProfile;
    const surfaceReadiness = buildSurfaceReadiness(content);
    const canonicalCoverageRate = Number.isFinite(Number(params.coverage?.coverage?.rate)) ? Number(params.coverage?.coverage?.rate) : null;
    const canonicalCoverageTotal = Number.isFinite(Number(params.coverage?.coverage?.total)) ? Number(params.coverage?.coverage?.total) : null;
    const trustScore = getTrustScore(params.trustMetrics);
    const compiledContextReady = params.compiledContext?.status === 'ready' && (
        params.compiledContext?.publicBundlesReady === true
        || params.compiledContext?.privateBundlesReady === true
        || Number(params.compiledContext?.bundleVersion || 0) > 0
    );

    const steps: AnswerlatticeActivationStep[] = [
        buildStep({
            key: 'workspace',
            title: 'Workspace created',
            description: 'Company and product workspace are available.',
            status: storeData ? 'complete' : 'pending',
            route: ANSWERLATTICE_ROUTES.SETTINGS,
            actionLabel: 'Review Settings',
            costNote: 'Uses the existing Answerlattice store document.',
        }),
        buildStep({
            key: 'product-profile',
            title: 'Product details captured',
            description: hasProductProfile
                ? 'Product URL and support email are saved for setup, widget, and help-center configuration.'
                : 'Add your product URL and support email so Answerlattice can verify install and route users correctly.',
            status: hasProductProfile ? 'complete' : 'attention',
            route: ANSWERLATTICE_ROUTES.SETTINGS,
            actionLabel: 'Review Details',
            costNote: 'Stored on the existing Answerlattice store document.',
        }),
        buildStep({
            key: 'license',
            title: 'License active',
            description: subscriptionStatus === 'pending'
                ? 'Payment is pending. Keep setup moving, but resolve billing before launch.'
                : 'Subscription or beta license is recorded for this workspace.',
            status: licenseStatus,
            route: ANSWERLATTICE_ROUTES.SETTINGS,
            actionLabel: 'Check License',
            costNote: 'Read from store subscription summary; legacy fallback is capped to 5 docs.',
        }),
        buildStep({
            key: 'knowledge',
            title: 'Knowledge imported',
            description: `${content?.articleCount || 0} published article${(content?.articleCount || 0) === 1 ? '' : 's'} and ${content?.faqCount || 0} FAQ${(content?.faqCount || 0) === 1 ? '' : 's'} available in the compact content summary.`,
            status: ((content?.articleCount || 0) + (content?.faqCount || 0)) > 0 ? 'complete' : 'pending',
            route: ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE,
            actionLabel: 'Import Content',
            costNote: 'Reads platformSummary context content; no article collection scan on this page.',
        }),
        buildStep({
            key: 'help-center',
            title: 'Help center ready',
            description: ((content?.articleCount || 0) + (content?.faqCount || 0)) > 0
                ? 'The public help center has published content to show customers.'
                : 'Publish at least one article or FAQ before sending customers to the help center.',
            status: ((content?.articleCount || 0) + (content?.faqCount || 0)) > 0 ? 'complete' : 'pending',
            route: ANSWERLATTICE_ROUTES.DOCS,
            actionLabel: 'Preview Docs',
            costNote: 'Uses the existing context summary content counts.',
        }),
        buildStep({
            key: 'entities',
            title: 'Product entities reviewed',
            description: entityCount > 0
                ? `${entityCount} product entit${entityCount === 1 ? 'y is' : 'ies are'} modeled for retrieval and governance.`
                : 'Review feature, plan, role, workflow, integration, and error-code entities.',
            status: entityCount > 0 ? 'complete' : 'pending',
            route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ENTITIES),
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
            route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS),
            actionLabel: 'Review Answers',
            costNote: 'Uses the trust metrics summary; no canonical answer collection scan on this page.',
        }),
        buildStep({
            key: 'product-surfaces',
            title: 'Product surfaces mapped',
            description: `${content?.surfaceCount || 0} product surface${(content?.surfaceCount || 0) === 1 ? '' : 's'} mapped to routes, articles, releases, and signals.`,
            status: (content?.surfaceCount || 0) > 0 ? 'complete' : 'pending',
            route: ANSWERLATTICE_ROUTES.PRODUCT_SURFACES,
            actionLabel: 'Map Surfaces',
            costNote: 'Uses the same compact summary doc as widget contextual retrieval.',
        }),
        buildStep({
            key: 'widget-key',
            title: 'Widget key ready',
            description: hasWidgetKey ? 'A dedicated Answerlattice widget key exists.' : 'Create a widget key before installing Answerlattice in your product.',
            status: hasWidgetKey ? 'complete' : 'pending',
            route: ANSWERLATTICE_ROUTES.WIDGET,
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
            route: ANSWERLATTICE_ROUTES.WIDGET,
            actionLabel: 'Secure Origins',
            costNote: 'Stored on the existing store document; no separate security collection.',
        }),
        buildStep({
            key: 'widget-install',
            title: 'Widget seen in product',
            description: hasWidgetSeenRecently
                ? `Last seen on ${runtimeStatus?.lastPath || 'a product page'}.`
                : 'Install the script and open your product once so Answerlattice can verify the widget loads.',
            status: hasWidgetSeenRecently ? 'complete' : 'pending',
            route: ANSWERLATTICE_ROUTES.WIDGET,
            actionLabel: 'Install Widget',
            costNote: 'Runtime writes are throttled and stored on the existing store document.',
        }),
        buildStep({
            key: 'page-context',
            title: 'Page context received',
            description: hasRuntimeContext
                ? `Latest context: ${runtimeStatus?.lastContextKey || runtimeStatus?.lastFeature || runtimeStatus?.lastPage}.`
                : 'Send path, title, feature, workflow, role, or locale after route changes so answers match the user screen.',
            status: hasRuntimeContext ? 'complete' : 'pending',
            route: ANSWERLATTICE_ROUTES.PRODUCT_SURFACES,
            actionLabel: 'Set Context',
            costNote: 'Context is transient at runtime; only a sanitized last-seen marker is stored.',
        }),
        buildStep({
            key: 'notifications',
            title: 'Ticket notifications ready',
            description: notificationsReady
                ? `Ticket emails are enabled from ${notificationReadiness.fromAddress}. Send a test email before launch.`
                : notificationReadiness.enabled
                    ? 'Add sender configuration and support email so ticket replies do not go unnoticed.'
                    : 'Enable Answerlattice notifications before launching support to customers.',
            status: notificationsReady ? 'complete' : 'attention',
            route: ANSWERLATTICE_ROUTES.ACTIVATION,
            actionLabel: 'Test Email',
            costNote: 'No collection scan. Sends are rate-limited and logged to the Answerlattice notification log only when an email is attempted.',
        }),
        buildStep({
            key: 'release-notes',
            title: 'Changelog published',
            description: `${content?.changelogCount || 0} recent release note${(content?.changelogCount || 0) === 1 ? '' : 's'} linked in the context summary.`,
            status: (content?.changelogCount || 0) > 0 ? 'complete' : 'optional',
            required: false,
            route: ANSWERLATTICE_ROUTES.CHANGELOG,
            actionLabel: 'Add Release Notes',
            costNote: 'Recent changelog entries are pre-compacted into the context summary.',
        }),
        buildStep({
            key: 'ticket-signals',
            title: 'Support signal loop tested',
            description: `${content?.ticketCount || 0} ticket signal${(content?.ticketCount || 0) === 1 ? '' : 's'} visible in the context summary.`,
            status: (content?.ticketCount || 0) > 0 ? 'complete' : 'optional',
            required: false,
            route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.SIGNAL_QUEUE),
            actionLabel: 'Test Ticket Flow',
            costNote: 'Tickets remain signal sources, not a helpdesk replacement.',
        }),
    ];

    const requiredSteps = steps.filter(step => step.required);
    const completeRequired = requiredSteps.filter(step => step.status === 'complete').length;
    const readinessScore = requiredSteps.length > 0
        ? Math.round((completeRequired / requiredSteps.length) * 100)
        : 0;
    const governanceSummaryStatus: AnswerlatticeActivationStepStatus = canonicalCoverageTotal !== null && trustScore !== null && compiledContextReady
        ? 'complete'
        : canonicalCoverageTotal !== null || trustScore !== null || compiledContextReady || entityCount > 0 || activeCanonicalAnswerCount > 0
            ? 'attention'
            : 'pending';
    const signalLoopStatus: AnswerlatticeActivationStepStatus = (content?.ticketCount || 0) > 0
        ? 'complete'
        : hasWidgetSeenRecently || hasRuntimeContext
            ? 'attention'
            : 'pending';
    const launchProof = buildLaunchProof([
        {
            key: 'self-serve-setup',
            title: 'Self-serve setup',
            description: 'Workspace, product profile, and license state are ready without manual provisioning.',
            status: getCombinedStatus(steps, ['workspace', 'product-profile', 'license']),
            route: ANSWERLATTICE_ROUTES.SETTINGS,
            actionLabel: 'Review Setup',
        },
        {
            key: 'knowledge-surfaces',
            title: 'Knowledge and surfaces',
            description: 'Imported content is mapped to product pages, workflows, and help-center output.',
            status: getCombinedStatus(steps, ['knowledge', 'help-center', 'product-surfaces']),
            route: ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE,
            actionLabel: 'Import Knowledge',
        },
        {
            key: 'ontology-canonical',
            title: 'Ontology and canonical answers',
            description: 'Product entities and approved canonical answers exist before customer traffic.',
            status: getCombinedStatus(steps, ['entities', 'canonical-answers']),
            route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS),
            actionLabel: 'Review Governance',
        },
        {
            key: 'widget-runtime',
            title: 'Widget runtime proof',
            description: 'Widget key, allowed origins, install telemetry, and page context have all been verified.',
            status: getCombinedStatus(steps, ['widget-key', 'allowed-origins', 'widget-install', 'page-context']),
            route: ANSWERLATTICE_ROUTES.WIDGET,
            actionLabel: 'Verify Widget',
        },
        {
            key: 'governance-summaries',
            title: 'Governance summaries',
            description: 'Coverage, trust, and compiled context summaries are available for launch review.',
            status: governanceSummaryStatus,
            route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.TRUST),
            actionLabel: 'Open Trust Metrics',
        },
        {
            key: 'signal-loop-test',
            title: 'Signal source test',
            description: 'A fallback or ticket signal source is visible; open Signal Queue to confirm proposal quality before broader rollout.',
            status: signalLoopStatus,
            route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.SIGNAL_QUEUE),
            actionLabel: 'Test Signal Flow',
        },
    ]);
    const signaturePayload = {
        tId: params.tId,
        sId: params.sId,
        readinessScore,
        subscriptionStatus,
        hasWidgetKey,
        allowedOriginCount: allowedOrigins.length,
        widgetPath: runtimeStatus?.lastPath || null,
        widgetContext: runtimeStatus?.lastContextKey || runtimeStatus?.lastFeature || runtimeStatus?.lastPage || null,
        notificationsEnabled: notificationReadiness.enabled,
        smtpConfigured: notificationReadiness.smtpConfigured,
        productUrl: storeData.productUrl || null,
        supportEmail: storeData.supportEmail || null,
        billingModel: storeData.billingModel || null,
        primarySurfaceCount: primarySurfaces.length,
        articleCount: content?.articleCount || 0,
        faqCount: content?.faqCount || 0,
        surfaceCount: content?.surfaceCount || 0,
        changelogCount: content?.changelogCount || 0,
        ticketCount: content?.ticketCount || 0,
        surfaceReadiness: surfaceReadiness.map(surface => ({
            key: surface.key,
            status: surface.status,
            articleCount: surface.articleCount,
            faqCount: surface.faqCount || 0,
            openTicketCount: surface.openTicketCount,
            changelogCount: surface.changelogCount,
        })),
        entityCount,
        activeCanonicalAnswerCount,
        compiledContextStatus: params.compiledContext?.status || null,
        compiledContextVersion: params.compiledContext?.bundleVersion || 0,
        launchProof: launchProof.items.map(item => ({
            key: item.key,
            status: item.status,
        })),
    };

    return {
        pId: PRODUCT_IDS.ANSWERLATTICE,
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
            keyPrefix: widgetKeyState.keyPrefix || null,
            allowedOriginCount: allowedOrigins.length,
            configVersion: Number(storeData.widgetConfigVersion || 0),
            runtimeStatus,
        },
        notifications: {
            enabled: notificationReadiness.enabled,
            smtpConfigured: notificationReadiness.smtpConfigured,
            fromAddress: notificationReadiness.fromAddress,
            logTarget: notificationReadiness.logTarget,
        },
        content: {
            surfaceCount: content?.surfaceCount || 0,
            articleCount: content?.articleCount || 0,
            faqCount: content?.faqCount || 0,
            changelogCount: content?.changelogCount || 0,
            ticketCount: content?.ticketCount || 0,
            summaryGeneratedAt: content?.generatedAt || null,
            surfaceReadiness,
        },
        governance: {
            canonicalCoverageRate,
            canonicalCoverageTotal,
            trustScore,
        },
        compiledContext: params.compiledContext || null,
        launchProof,
        steps,
        readModel: {
            firestoreReads: 6,
            firestoreWrites: '0 on normal view; 1 compact platformSummary write only when readiness signature changes or becomes stale.',
            source: 'stores + platformSummary activation/context/coverage/trust/bundle docs',
        },
    };
}

export function shouldPersistActivationSummary(existing: Record<string, any> | null, next: AnswerlatticeActivationSummary): boolean {
    if (!existing) return true;
    if (existing.signature !== next.signature) return true;
    const lastComputed = getTimestampMillis(existing.lastComputedAt || existing.computedAtIso);
    return !lastComputed || Date.now() - lastComputed > 30 * 60 * 1000;
}
