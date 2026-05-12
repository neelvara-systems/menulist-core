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
import { getBrandingConfig, saveBrandingConfig } from '@database/canonica/branding';
import { CanonicaBrandingConfig } from '@type/canonica';
import { Empty, Grid, Tabs } from 'antd';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LuBarChart3,
    LuBookOpen,
    LuBoxes,
    LuFlame,
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
}

export default function GovernanceHub({ tId = 0, sId = 0 }: GovernanceHubProps) {
    const [activeTab, setActiveTab] = useState('answers');
    const [brandingConfig, setBrandingConfig] = useState<Partial<CanonicaBrandingConfig> | undefined>(undefined);
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;

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

        const items = [
            {
                key: 'answers',
                label: tabLabel(LuBookOpen, 'Canonical Answers', 'Answers'),
                children: <CanonicalAnswerEditor />,
            },
            {
                key: 'entities',
                label: tabLabel(LuBoxes, 'Product Ontology', 'Ontology'),
                children: <EntityManagementDashboard />,
            },
            {
                key: 'drift',
                label: tabLabel(LuShieldAlert, 'Drift Governance', 'Drift'),
                children: <DriftDashboard />,
            },
            {
                key: 'analytics',
                label: tabLabel(LuBarChart3, 'Answer Analytics', 'Analytics'),
                children: <AnswerUsageAnalytics />,
            },
            {
                key: 'health',
                label: tabLabel(LuHeart, 'Entity Health', 'Health'),
                children: <EntityHealthScore />,
            },
            // Phase 4 tabs
            {
                key: 'history',
                label: tabLabel(LuHistory, 'Version History', 'History'),
                children: <AnswerVersionHistory tId={tId} sId={sId} />,
            },
        ];

        // Conditionally add feature-flagged tabs
        if (FEATURE_FLAGS.ENABLE_CANONICA_TRUST_METRICS) {
            items.push({
                key: 'trust',
                label: tabLabel(LuShieldCheck, 'System Trust', 'Trust'),
                children: <FounderTrustDashboard tId={tId} sId={sId} />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_CANONICA_WHITE_LABEL) {
            items.push({
                key: 'branding',
                label: tabLabel(LuPaintbrush, 'Branding'),
                children: <WhiteLabelBranding tId={tId} sId={sId} initialConfig={brandingConfig} onSave={handleSaveBranding} />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_CANONICA_FRICTION_INTELLIGENCE) {
            items.push({
                key: 'friction',
                label: tabLabel(LuFlame, 'Friction'),
                children: <FrictionTab tId={tId} sId={sId} />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_CANONICA_MULTI_LANGUAGE) {
            items.push({
                key: 'languages',
                label: tabLabel(LuLanguages, 'Languages'),
                children: <MultiLanguageArticles tId={tId} sId={sId} onTranslate={handleTranslateArticle} />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_CANONICA_PREDICTIVE_SUPPORT) {
            items.push({
                key: 'triggers',
                label: tabLabel(LuZap, 'Triggers'),
                children: <PredictiveTriggerManager tId={tId} sId={sId} />,
            });
        }

        return items;
    }, [tId, sId, brandingConfig, handleSaveBranding, handleTranslateArticle, isMobile]);

    if (!FEATURE_FLAGS.ENABLE_CANONICA_GOVERNANCE_UI) {
        return <Empty description="Canonica Governance UI is not enabled" />;
    }

    return (
        <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            type={isMobile ? 'line' : 'card'}
            size="small"
            tabBarGutter={isMobile ? 8 : 16}
            style={{ maxWidth: '100%' }}
        />
    );
}
