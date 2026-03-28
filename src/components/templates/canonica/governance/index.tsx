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
import { Empty, Tabs } from 'antd';
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
        const items = [
            {
                key: 'answers',
                label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LuBookOpen /> Canonical Answers
                    </span>
                ),
                children: <CanonicalAnswerEditor />,
            },
            {
                key: 'entities',
                label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LuBoxes /> Product Ontology
                    </span>
                ),
                children: <EntityManagementDashboard />,
            },
            {
                key: 'drift',
                label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LuShieldAlert /> Drift Governance
                    </span>
                ),
                children: <DriftDashboard />,
            },
            {
                key: 'analytics',
                label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LuBarChart3 /> Answer Analytics
                    </span>
                ),
                children: <AnswerUsageAnalytics />,
            },
            {
                key: 'health',
                label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LuHeart /> Entity Health
                    </span>
                ),
                children: <EntityHealthScore />,
            },
            // Phase 4 tabs
            {
                key: 'history',
                label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LuHistory /> Version History
                    </span>
                ),
                children: <AnswerVersionHistory tId={tId} sId={sId} />,
            },
        ];

        // Conditionally add feature-flagged tabs
        if (FEATURE_FLAGS.ENABLE_CANONICA_TRUST_METRICS) {
            items.push({
                key: 'trust',
                label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LuShieldCheck /> System Trust
                    </span>
                ),
                children: <FounderTrustDashboard tId={tId} sId={sId} />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_CANONICA_WHITE_LABEL) {
            items.push({
                key: 'branding',
                label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LuPaintbrush /> Branding
                    </span>
                ),
                children: <WhiteLabelBranding tId={tId} sId={sId} initialConfig={brandingConfig} onSave={handleSaveBranding} />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_CANONICA_FRICTION_INTELLIGENCE) {
            items.push({
                key: 'friction',
                label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LuFlame /> Friction
                    </span>
                ),
                children: <FrictionTab tId={tId} sId={sId} />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_CANONICA_MULTI_LANGUAGE) {
            items.push({
                key: 'languages',
                label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LuLanguages /> Languages
                    </span>
                ),
                children: <MultiLanguageArticles tId={tId} sId={sId} onTranslate={handleTranslateArticle} />,
            });
        }

        if (FEATURE_FLAGS.ENABLE_CANONICA_PREDICTIVE_SUPPORT) {
            items.push({
                key: 'triggers',
                label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LuZap /> Triggers
                    </span>
                ),
                children: <PredictiveTriggerManager tId={tId} sId={sId} />,
            });
        }

        return items;
    }, [tId, sId, brandingConfig, handleSaveBranding, handleTranslateArticle]);

    if (!FEATURE_FLAGS.ENABLE_CANONICA_GOVERNANCE_UI) {
        return <Empty description="Canonica Governance UI is not enabled" />;
    }

    return (
        <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            type="card"
            size="small"
        />
    );
}
