'use client'

/**
 * Answerlattice — Governance Hub
 * 
 * Main entry point for governance UI features.
 * Phase 3: Answer Editor, Entity Dashboard, Drift Dashboard, Analytics, Health Scores.
 * Phase 4: Version History, White-Label Branding, Multi-Language Articles.
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_GOVERNANCE_UI
 * Accessible as a tab within the Help Center.
 * 
 * @see __docs__/answerlattice/answerlattice-build-priority-roadmap.md Phase 3 + Phase 4
 */

import { FEATURE_FLAGS } from '@config/features';
import {
    ANSWERLATTICE_DEFAULT_GOVERNANCE_TAB,
    ANSWERLATTICE_GOVERNANCE_TABS,
    ANSWERLATTICE_ROUTES,
    getAnswerlatticeGovernanceRoute,
    getAnswerlatticeGovernanceTabFromPathname,
    isAnswerlatticeGovernanceTab,
    normalizeAnswerlatticeRoutePathname,
    toAnswerlatticeDashboardRoute,
} from '@constant/answerlattice/navigations';
import { getBrandingConfig, saveBrandingConfig } from '@database/answerlattice/branding';
import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import EntityCandidateReview from '@/components/templates/answerlattice/EntityCandidateReview';
import MutationProposalReview from '@/components/templates/answerlattice/MutationProposalReview';
import { AnswerlatticeBrandingConfig } from '@type/answerlattice';
import { Empty, Grid, Tabs } from 'antd';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LuBarChart3,
    LuBookOpen,
    LuBoxes,
    LuFlame,
    LuGitPullRequest,
    LuHeart,
    LuHistory,
    LuLanguages,
    LuPaintbrush,
    LuShieldAlert,
    LuShieldCheck,
    LuZap,
} from 'react-icons/lu';

import AnswerUsageAnalytics from './AnswerUsageAnalytics';
import AnswerVersionHistory from './AnswerVersionHistory';
import CanonicalAnswerEditor from './CanonicalAnswerEditor';
import DriftDashboard from './DriftDashboard';
import EntityHealthScore from './EntityHealthScore';
import EntityManagementDashboard from './EntityManagementDashboard';
import FounderTrustDashboard from './FounderTrustDashboard';
import FrictionTab from './FrictionTab';
import MultiLanguageArticles from './MultiLanguageArticles';
import PredictiveTriggerManager from './PredictiveTriggerManager';
import WhiteLabelBranding from './WhiteLabelBranding';

interface GovernanceHubProps {
    tId?: number;
    sId?: number;
    initialTab?: string;
}

const ANSWERLATTICE_GOVERNANCE_TRANSLATION_RESPONSE_JSON_MAX_BYTES = 16 * 1024;
const ANSWERLATTICE_GOVERNANCE_TRANSLATION_FAILED = 'Translation failed';
const ANSWERLATTICE_GOVERNANCE_TRANSLATION_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

type GovernanceTranslationResponse = {
    articleId: string;
    locale: string;
    translatedTitle: string;
    translatedBy: 'ai';
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isGovernanceTranslationResponse = (value: unknown): value is GovernanceTranslationResponse => (
    isRecord(value)
    && typeof value.articleId === 'string'
    && typeof value.locale === 'string'
    && typeof value.translatedTitle === 'string'
    && value.translatedBy === 'ai'
);

const getGovernanceTranslationResponseContext = (
    response: Response,
    articleId: string,
    locale: string,
) => ({
    ...getBoundedAnswerlatticeStringContext('articleId', articleId),
    ...getBoundedAnswerlatticeStringContext('targetLocale', locale),
    responseOk: response.ok,
    responseStatus: response.status,
});

const readGovernanceTranslationResponse = async (
    response: Response,
    articleId: string,
    locale: string,
): Promise<GovernanceTranslationResponse> => {
    let payload: unknown = null;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            ANSWERLATTICE_GOVERNANCE_TRANSLATION_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logAnswerlatticeFailure(
            'answerlattice_governance_translation_response_parse_failed',
            error,
            getGovernanceTranslationResponseContext(response, articleId, locale),
        );
        throw new Error(ANSWERLATTICE_GOVERNANCE_TRANSLATION_FAILED);
    }

    if (!response.ok) {
        logAnswerlatticeFailure(
            'answerlattice_governance_translation_response_rejected',
            undefined,
            getGovernanceTranslationResponseContext(response, articleId, locale),
        );
        throw new Error(ANSWERLATTICE_GOVERNANCE_TRANSLATION_FAILED);
    }

    if (!isGovernanceTranslationResponse(payload)) {
        logAnswerlatticeFailure(
            'answerlattice_governance_translation_response_invalid',
            undefined,
            getGovernanceTranslationResponseContext(response, articleId, locale),
        );
        throw new Error(ANSWERLATTICE_GOVERNANCE_TRANSLATION_FAILED);
    }

    return payload;
};

export default function GovernanceHub({ tId = 0, sId = 0, initialTab }: GovernanceHubProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const legacyRequestedTab = searchParams.get('tab');
    const requestedTab = (
        isAnswerlatticeGovernanceTab(initialTab)
            ? initialTab
            : (isAnswerlatticeGovernanceTab(legacyRequestedTab) ? legacyRequestedTab : ANSWERLATTICE_DEFAULT_GOVERNANCE_TAB)
    );
    const [activeTab, setActiveTab] = useState<string>(requestedTab);
    const [brandingConfig, setBrandingConfig] = useState<Partial<AnswerlatticeBrandingConfig> | undefined>(undefined);
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const normalizedPathname = normalizeAnswerlatticeRoutePathname(pathname);

    // Load branding config if white-label is enabled
    useEffect(() => {
        if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WHITE_LABEL && tId && sId) {
            getBrandingConfig(tId, sId)
                .then(setBrandingConfig)
                .catch((error) => {
                    logAnswerlatticeFailure('answerlattice_governance_branding_config_load_failed', error, {
                        ...getBoundedAnswerlatticeStringContext('tenantId', tId),
                        ...getBoundedAnswerlatticeStringContext('storeId', sId),
                    });
                });
        }
    }, [tId, sId]);

    const handleSaveBranding = useCallback(async (config: AnswerlatticeBrandingConfig) => {
        if (!tId || !sId) return;
        await saveBrandingConfig(tId, sId, config);
        setBrandingConfig(config);
    }, [tId, sId]);

    const handleTranslateArticle = useCallback(async (articleId: string, locale: string) => {
        let res: Response;
        try {
            res = await fetch('/api/answerlattice/translate', {
                ...ANSWERLATTICE_GOVERNANCE_TRANSLATION_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articleId, targetLocale: locale }),
            });
        } catch (error) {
            logAnswerlatticeFailure('answerlattice_governance_translation_request_failed', error, {
                ...getBoundedAnswerlatticeStringContext('articleId', articleId),
                ...getBoundedAnswerlatticeStringContext('targetLocale', locale),
            });
            throw new Error(ANSWERLATTICE_GOVERNANCE_TRANSLATION_FAILED);
        }
        await readGovernanceTranslationResponse(res, articleId, locale);
    }, []);

    const tabItems = useMemo(() => {
        const tabLabel = (Icon: ComponentType<{ size?: number }>, label: string, mobileLabel = label) => (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                <Icon size={16} />
                {isMobile ? mobileLabel : label}
            </span>
        );

        const items: Array<{ key: string; label: ReactNode; children: ReactNode }> = [
            {
                key: ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS,
                label: tabLabel(LuBookOpen, 'Canonical Answers', 'Answers'),
                children: <CanonicalAnswerEditor />,
            },
            {
                key: ANSWERLATTICE_GOVERNANCE_TABS.ENTITIES,
                label: tabLabel(LuBoxes, 'Product Ontology', 'Ontology'),
                children: <EntityManagementDashboard />,
            },
            {
                key: ANSWERLATTICE_GOVERNANCE_TABS.ANALYTICS,
                label: tabLabel(LuBarChart3, 'Answer Analytics', 'Analytics'),
                children: <AnswerUsageAnalytics />,
            },
            {
                key: ANSWERLATTICE_GOVERNANCE_TABS.HEALTH,
                label: tabLabel(LuHeart, 'Entity Health', 'Health'),
                children: <EntityHealthScore />,
            },
            // Phase 4 tabs
            {
                key: ANSWERLATTICE_GOVERNANCE_TABS.HISTORY,
                label: tabLabel(LuHistory, 'Version History', 'History'),
                children: <AnswerVersionHistory tId={tId} sId={sId} />,
            },
        ];

        if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ONTOLOGY) {
            items.push({
                key: ANSWERLATTICE_GOVERNANCE_TABS.CANDIDATES,
                label: tabLabel(LuGitPullRequest, 'Entity Candidates', 'Candidates'),
                children: <EntityCandidateReview />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_DRIFT_DETECTION) {
            items.push({
                key: ANSWERLATTICE_GOVERNANCE_TABS.DRIFT,
                label: tabLabel(LuShieldAlert, 'Drift Governance', 'Drift'),
                children: <DriftDashboard />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION) {
            items.push({
                key: ANSWERLATTICE_GOVERNANCE_TABS.SIGNAL_QUEUE,
                label: tabLabel(LuGitPullRequest, 'Signal Queue', 'Signals'),
                children: <MutationProposalReview />,
            });
        }

        // Conditionally add feature-flagged tabs
        if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_TRUST_METRICS) {
            items.push({
                key: ANSWERLATTICE_GOVERNANCE_TABS.TRUST,
                label: tabLabel(LuShieldCheck, 'System Trust', 'Trust'),
                children: <FounderTrustDashboard tId={tId} sId={sId} />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WHITE_LABEL) {
            items.push({
                key: ANSWERLATTICE_GOVERNANCE_TABS.BRANDING,
                label: tabLabel(LuPaintbrush, 'Branding'),
                children: <WhiteLabelBranding tId={tId} sId={sId} initialConfig={brandingConfig} onSave={handleSaveBranding} />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE) {
            items.push({
                key: ANSWERLATTICE_GOVERNANCE_TABS.FRICTION,
                label: tabLabel(LuFlame, 'Friction'),
                children: <FrictionTab tId={tId} sId={sId} />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_MULTI_LANGUAGE) {
            items.push({
                key: ANSWERLATTICE_GOVERNANCE_TABS.LANGUAGES,
                label: tabLabel(LuLanguages, 'Languages'),
                children: <MultiLanguageArticles tId={tId} sId={sId} onTranslate={handleTranslateArticle} />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT) {
            items.push({
                key: ANSWERLATTICE_GOVERNANCE_TABS.TRIGGERS,
                label: tabLabel(LuZap, 'Triggers'),
                children: <PredictiveTriggerManager tId={tId} sId={sId} />,
            });
        }

        return items;
    }, [tId, sId, brandingConfig, handleSaveBranding, handleTranslateArticle, isMobile]);

    useEffect(() => {
        if (!tabItems.length) return;
        const tabExists = tabItems.some(item => item.key === requestedTab);
        const nextTab = tabExists ? requestedTab : String(tabItems[0]?.key || ANSWERLATTICE_DEFAULT_GOVERNANCE_TAB);
        setActiveTab(nextTab);

        const activePathTab = getAnswerlatticeGovernanceTabFromPathname(normalizedPathname);
        const shouldNormalizeRoute = (
            normalizedPathname === ANSWERLATTICE_ROUTES.GOVERNANCE ||
            Boolean(legacyRequestedTab) ||
            activePathTab !== nextTab
        );

        if (shouldNormalizeRoute) {
            router.replace(
                toAnswerlatticeDashboardRoute(getAnswerlatticeGovernanceRoute(nextTab), currentHostname),
                { scroll: false },
            );
        }
    }, [currentHostname, legacyRequestedTab, normalizedPathname, requestedTab, router, tabItems]);

    const handleTabChange = useCallback((key: string) => {
        setActiveTab(key);
        router.replace(
            toAnswerlatticeDashboardRoute(getAnswerlatticeGovernanceRoute(key), currentHostname),
            { scroll: false },
        );
    }, [currentHostname, router]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GOVERNANCE_UI) {
        return <Empty description="Answerlattice Governance UI is not enabled" />;
    }

    return (
        <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={tabItems}
            type={isMobile ? 'line' : 'card'}
            size="small"
            tabBarGutter={isMobile ? 8 : 16}
            style={{ maxWidth: '100%' }}
        />
    );
}
