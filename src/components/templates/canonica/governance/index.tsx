'use client'

/**
 * Canonica — Governance Hub
 * 
 * Main entry point for governance UI features.
 * Phase 3: Answer Editor, Entity Dashboard, Drift Dashboard, Analytics, Health Scores.
 * Phase 4: Version History, White-Label Branding, Multi-Language Articles.
 * 
 * Feature-flagged: ENABLE_CANONICA_GOVERNANCE_UI
 * Accessible as a tab within the Help Center.
 * 
 * @see __docs__/canonica/canonica-build-priority-roadmap.md Phase 3 + Phase 4
 */

import { FEATURE_FLAGS } from '@config/features';
import {
    CANONICA_DEFAULT_GOVERNANCE_TAB,
    CANONICA_GOVERNANCE_TABS,
    CANONICA_ROUTES,
    getCanonicaGovernanceRoute,
    getCanonicaGovernanceTabFromPathname,
    isCanonicaGovernanceTab,
    normalizeCanonicaRoutePathname,
    toCanonicaDashboardRoute,
} from '@constant/canonica/navigations';
import { getBrandingConfig, saveBrandingConfig } from '@database/canonica/branding';
import EntityCandidateReview from '@/components/templates/canonica/EntityCandidateReview';
import MutationProposalReview from '@/components/templates/canonica/MutationProposalReview';
import { CanonicaBrandingConfig } from '@type/canonica';
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

export default function GovernanceHub({ tId = 0, sId = 0, initialTab }: GovernanceHubProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const legacyRequestedTab = searchParams.get('tab');
    const requestedTab = (
        isCanonicaGovernanceTab(initialTab)
            ? initialTab
            : (isCanonicaGovernanceTab(legacyRequestedTab) ? legacyRequestedTab : CANONICA_DEFAULT_GOVERNANCE_TAB)
    );
    const [activeTab, setActiveTab] = useState<string>(requestedTab);
    const [brandingConfig, setBrandingConfig] = useState<Partial<CanonicaBrandingConfig> | undefined>(undefined);
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const normalizedPathname = normalizeCanonicaRoutePathname(pathname);

    // Load branding config if white-label is enabled
    useEffect(() => {
        if (FEATURE_FLAGS.ENABLE_CANONICA_WHITE_LABEL && tId && sId) {
            getBrandingConfig(tId, sId).then(setBrandingConfig).catch(() => { });
        }
    }, [tId, sId]);

    const handleSaveBranding = useCallback(async (config: CanonicaBrandingConfig) => {
        if (!tId || !sId) return;
        await saveBrandingConfig(tId, sId, config);
        setBrandingConfig(config);
    }, [tId, sId]);

    const handleTranslateArticle = useCallback(async (articleId: string, locale: string) => {
        const res = await fetch('/api/canonica/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ articleId, targetLocale: locale }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Translation failed' }));
            throw new Error(err.error || 'Translation failed');
        }
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
                key: CANONICA_GOVERNANCE_TABS.ANSWERS,
                label: tabLabel(LuBookOpen, 'Canonical Answers', 'Answers'),
                children: <CanonicalAnswerEditor />,
            },
            {
                key: CANONICA_GOVERNANCE_TABS.ENTITIES,
                label: tabLabel(LuBoxes, 'Product Ontology', 'Ontology'),
                children: <EntityManagementDashboard />,
            },
            {
                key: CANONICA_GOVERNANCE_TABS.ANALYTICS,
                label: tabLabel(LuBarChart3, 'Answer Analytics', 'Analytics'),
                children: <AnswerUsageAnalytics />,
            },
            {
                key: CANONICA_GOVERNANCE_TABS.HEALTH,
                label: tabLabel(LuHeart, 'Entity Health', 'Health'),
                children: <EntityHealthScore />,
            },
            // Phase 4 tabs
            {
                key: CANONICA_GOVERNANCE_TABS.HISTORY,
                label: tabLabel(LuHistory, 'Version History', 'History'),
                children: <AnswerVersionHistory tId={tId} sId={sId} />,
            },
        ];

        if (FEATURE_FLAGS.ENABLE_CANONICA_ONTOLOGY) {
            items.push({
                key: CANONICA_GOVERNANCE_TABS.CANDIDATES,
                label: tabLabel(LuGitPullRequest, 'Entity Candidates', 'Candidates'),
                children: <EntityCandidateReview />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_CANONICA_DRIFT_DETECTION) {
            items.push({
                key: CANONICA_GOVERNANCE_TABS.DRIFT,
                label: tabLabel(LuShieldAlert, 'Drift Governance', 'Drift'),
                children: <DriftDashboard />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_CANONICA_SIGNAL_MUTATION) {
            items.push({
                key: CANONICA_GOVERNANCE_TABS.SIGNAL_QUEUE,
                label: tabLabel(LuGitPullRequest, 'Signal Queue', 'Signals'),
                children: <MutationProposalReview />,
            });
        }

        // Conditionally add feature-flagged tabs
        if (FEATURE_FLAGS.ENABLE_CANONICA_TRUST_METRICS) {
            items.push({
                key: CANONICA_GOVERNANCE_TABS.TRUST,
                label: tabLabel(LuShieldCheck, 'System Trust', 'Trust'),
                children: <FounderTrustDashboard tId={tId} sId={sId} />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_CANONICA_WHITE_LABEL) {
            items.push({
                key: CANONICA_GOVERNANCE_TABS.BRANDING,
                label: tabLabel(LuPaintbrush, 'Branding'),
                children: <WhiteLabelBranding tId={tId} sId={sId} initialConfig={brandingConfig} onSave={handleSaveBranding} />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_CANONICA_FRICTION_INTELLIGENCE) {
            items.push({
                key: CANONICA_GOVERNANCE_TABS.FRICTION,
                label: tabLabel(LuFlame, 'Friction'),
                children: <FrictionTab tId={tId} sId={sId} />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_CANONICA_MULTI_LANGUAGE) {
            items.push({
                key: CANONICA_GOVERNANCE_TABS.LANGUAGES,
                label: tabLabel(LuLanguages, 'Languages'),
                children: <MultiLanguageArticles tId={tId} sId={sId} onTranslate={handleTranslateArticle} />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_CANONICA_PREDICTIVE_SUPPORT) {
            items.push({
                key: CANONICA_GOVERNANCE_TABS.TRIGGERS,
                label: tabLabel(LuZap, 'Triggers'),
                children: <PredictiveTriggerManager tId={tId} sId={sId} />,
            });
        }

        return items;
    }, [tId, sId, brandingConfig, handleSaveBranding, handleTranslateArticle, isMobile]);

    useEffect(() => {
        if (!tabItems.length) return;
        const tabExists = tabItems.some(item => item.key === requestedTab);
        const nextTab = tabExists ? requestedTab : String(tabItems[0]?.key || CANONICA_DEFAULT_GOVERNANCE_TAB);
        setActiveTab(nextTab);

        const activePathTab = getCanonicaGovernanceTabFromPathname(normalizedPathname);
        const shouldNormalizeRoute = (
            normalizedPathname === CANONICA_ROUTES.GOVERNANCE ||
            Boolean(legacyRequestedTab) ||
            activePathTab !== nextTab
        );

        if (shouldNormalizeRoute) {
            router.replace(
                toCanonicaDashboardRoute(getCanonicaGovernanceRoute(nextTab), currentHostname),
                { scroll: false },
            );
        }
    }, [currentHostname, legacyRequestedTab, normalizedPathname, requestedTab, router, tabItems]);

    const handleTabChange = useCallback((key: string) => {
        setActiveTab(key);
        router.replace(
            toCanonicaDashboardRoute(getCanonicaGovernanceRoute(key), currentHostname),
            { scroll: false },
        );
    }, [currentHostname, router]);

    if (!FEATURE_FLAGS.ENABLE_CANONICA_GOVERNANCE_UI) {
        return <Empty description="Canonica Governance UI is not enabled" />;
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
