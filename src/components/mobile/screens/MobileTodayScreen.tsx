'use client'

import { FEATURE_FLAGS } from '@config/features';
import { completeCampaign as dbCompleteCampaign, skipCampaign as dbSkipCampaign } from '@database/campaigns';
import { useTodayCampaigns } from '@hook/useTodayCampaigns';
import { ACTION_TITLES, CampaignType, CONTEXT_TEMPLATES, SURFACE_BUTTON_COPY, TodayCampaignSummary } from '@type/campaigns';
import { getExportMethod, getMealName } from '@util/campaignUtils';
import { Button, Card, DotLoading, NavBar, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LuCalendarOff, LuCheck, LuMessageCircle, LuSkipForward } from 'react-icons/lu';

interface MobileTodayScreenProps {
    onBack: () => void;
}

/**
 * Mobile Today Screen — zero desktop dependency
 * 
 * Daily campaign actions: primary action + operational items.
 * WhatsApp share, skip, staff prompt — all from phone.
 * Uses same DAL: getTodayCampaigns, completeCampaign, skipCampaign
 */
export default function MobileTodayScreen({ onBack }: MobileTodayScreenProps) {
    const t = useTranslations('MobileToday');
    const { todayCampaigns, staffPrompt, isLoading, mutate } = useTodayCampaigns();
    const [isProcessing, setIsProcessing] = useState(false);
    const [postAction, setPostAction] = useState<'shared' | 'skipped' | null>(null);

    const handleComplete = async (campaign: TodayCampaignSummary) => {
        setIsProcessing(true);
        try {
            const method = getExportMethod(campaign.primarySurface);
            await dbCompleteCampaign(campaign.campaignId, campaign.projectId, campaign.type, campaign.primarySurface, method);
            setPostAction('shared');
            setTimeout(() => { setPostAction(null); mutate(); }, 2000);
        } catch {
            Toast.show({ content: t('failed'), duration: 2000 });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSkip = async (campaignId: string, type: CampaignType) => {
        setIsProcessing(true);
        try {
            await dbSkipCampaign(campaignId, type);
            mutate();
        } catch {
            Toast.show({ content: t('failedToSkip'), duration: 2000 });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!FEATURE_FLAGS.SOCIAL_CONTENT_ENABLED) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>{t('title')}</NavBar>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '0 24px' }}>
                    <LuCalendarOff size={36} color="#d1d5db" />
                    <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{t('comingSoon')}</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>{t('title')}</NavBar>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DotLoading color="primary" /></div>
            </div>
        );
    }

    // Post-action feedback
    if (postAction) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>{t('title')}</NavBar>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <LuCheck size={32} color="#16a34a" />
                    </div>
                    <p style={{ fontSize: '18px', fontWeight: 600, color: '#1f2937' }}>
                        {postAction === 'shared' ? t('done') : t('skipped')}
                    </p>
                </div>
            </div>
        );
    }

    // Empty state
    if (!todayCampaigns || todayCampaigns.isEmpty || (!todayCampaigns.primary && (!todayCampaigns.operational || todayCampaigns.operational.length === 0))) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>{t('title')}</NavBar>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '0 24px' }}>
                    <LuCheck size={36} color="#4ade80" />
                    <p style={{ fontSize: '18px', fontWeight: 600, color: '#1f2937' }}>{t('allDoneForToday')}</p>
                    <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{t('noActionsNeeded')}</p>
                </div>
            </div>
        );
    }

    const mealName = getMealName();
    const primary = todayCampaigns.primary as TodayCampaignSummary | undefined;
    const operational = (todayCampaigns.operational || []).slice(0, 2) as TodayCampaignSummary[];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>Today</NavBar>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Primary Campaign Card */}
                {primary && (
                    <Card style={{ borderRadius: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#16a34a' }}>
                                <LuCheck size={16} />
                                <span style={{ fontWeight: 500 }}>
                                    {(ACTION_TITLES[primary.type] || 'Share this item')
                                        .replace('{itemName}', primary.subject?.itemName || 'Item')
                                        .replace('{mealName}', mealName)
                                        .replace('{festivalName}', 'the occasion')}
                                </span>
                            </div>

                            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>
                                {primary.subject?.itemName || 'Menu Item'}
                            </h3>

                            <p style={{ fontSize: '14px', color: '#6b7280' }}>
                                {(CONTEXT_TEMPLATES[primary.type] || '')
                                    .replace('{mealName}', mealName.toLowerCase())
                                    .replace('{festivalName}', 'the occasion')}
                            </p>

                            <Button
                                block
                                color="primary"
                                fill="solid"
                                size="large"
                                loading={isProcessing}
                                onClick={() => handleComplete(primary)}
                                style={{ minHeight: '48px' }}
                            >
                                {SURFACE_BUTTON_COPY[primary.primarySurface] || 'Share'}
                            </Button>

                            <button
                                onClick={() => handleSkip(primary.campaignId, primary.type)}
                                disabled={isProcessing}
                                style={{
                                    width: '100%',
                                    textAlign: 'center',
                                    color: '#9ca3af',
                                    fontSize: '14px',
                                    padding: '8px',
                                    minHeight: '44px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    cursor: isProcessing ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <LuSkipForward size={14} style={{ display: 'inline', marginRight: '4px' }} /> {t('skip')}
                            </button>
                        </div>
                    </Card>
                )}

                {/* Staff Prompt */}
                {staffPrompt?.eligible && (
                    <Card style={{ borderRadius: '12px', borderLeft: '3px solid #3b82f6' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <LuMessageCircle size={18} color="#3b82f6" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div>
                                <p style={{ fontSize: '12px', color: '#9ca3af' }}>{t('staffPromptForToday')}</p>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', marginTop: '4px' }}>
                                    {t('sayThisWhenCustomersAsk')}
                                </p>
                                <p style={{ fontSize: '16px', fontWeight: 500, fontStyle: 'italic', color: '#374151', marginTop: '4px' }}>
                                    &quot;{staffPrompt.text}&quot;
                                </p>
                                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>{t('appliesToday')}</p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Operational Campaigns */}
                {operational.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('alsoToday')}</p>
                        {operational.map((campaign) => {
                            const title = campaign.type === 'now_available'
                                ? `Now Available: ${campaign.subject?.itemName || 'Item'}`
                                : (ACTION_TITLES[campaign.type] || 'Share')
                                    .replace('{itemName}', campaign.subject?.itemName || 'Item')
                                    .replace('{mealName}', mealName);

                            return (
                                <Card key={campaign.campaignId} style={{ borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                            <LuCheck size={14} color="#16a34a" style={{ flexShrink: 0 }} />
                                            <p style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
                                        </div>
                                        <Button
                                            size="small"
                                            color="primary"
                                            fill="outline"
                                            loading={isProcessing}
                                            onClick={() => handleComplete(campaign)}
                                            style={{ minHeight: '36px', marginLeft: '8px' }}
                                        >
                                            {t('share')}
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div >
    );
}
