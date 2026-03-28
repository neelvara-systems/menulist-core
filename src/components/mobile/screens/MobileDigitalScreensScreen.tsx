'use client'

import { getScreenState, initializeScreenState, updateScreenSettings } from '@database/campaigns';
import { buildScreenUrl } from '@lib/screen/utils';
import { Button, Card, DotLoading, NavBar, Switch, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuMonitor, LuPlay } from 'react-icons/lu';

interface MobileDigitalScreensScreenProps {
    onBack: () => void;
}

/**
 * Mobile Digital Screens Setup — zero desktop dependency
 * 
 * Owner gets screen URLs for their TV, copies them, previews.
 * Toggle "Use my designs only" mode.
 * Uses same DAL: getScreenState, initializeScreenState, updateScreenSettings, buildScreenUrl
 */
export default function MobileDigitalScreensScreen({ onBack }: MobileDigitalScreensScreenProps) {
    const t = useTranslations('MobileDigitalScreens');
    const [loading, setLoading] = useState(true);
    const [screenToken, setScreenToken] = useState<string | null>(null);
    const [screenUrl, setScreenUrl] = useState<string>('');
    const [ownerOverride, setOwnerOverride] = useState(false);
    const [copiedMenu, setCopiedMenu] = useState(false);
    const [copiedHighlights, setCopiedHighlights] = useState(false);

    useEffect(() => {
        fetchScreenState();
    }, []);

    const fetchScreenState = async () => {
        try {
            setLoading(true);
            let state = await getScreenState();
            if (!state) {
                state = await initializeScreenState();
            }
            setScreenToken(state.screenToken);
            setScreenUrl(buildScreenUrl(state.screenToken));
            setOwnerOverride(state.ownerOverrideEnabled || false);
        } catch (err) {
            Toast.show({ content: t('failedToLoad'), duration: 2000 });
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async (url: string, type: 'menu' | 'highlights') => {
        try {
            await navigator.clipboard.writeText(url);
            if (type === 'menu') {
                setCopiedMenu(true);
                setTimeout(() => setCopiedMenu(false), 2000);
            } else {
                setCopiedHighlights(true);
                setTimeout(() => setCopiedHighlights(false), 2000);
            }
            Toast.show({ content: t('linkCopied'), duration: 1500 });
        } catch {
            Toast.show({ content: t('failedToCopy'), duration: 2000 });
        }
    };

    const handleOverrideToggle = async (enabled: boolean) => {
        try {
            await updateScreenSettings({ ownerOverrideEnabled: enabled });
            setOwnerOverride(enabled);
            Toast.show({ content: enabled ? t('uploadsPrioritized') : t('systemContentRestored'), duration: 1500 });
        } catch {
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        }
    };

    const highlightsUrl = screenUrl ? `${screenUrl}?mode=highlights` : '';

    if (loading) {
        return (
            <div className="flex flex-col h-full">
                <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>
                    {t('title')}
                </NavBar>
                <div className="flex-1 flex items-center justify-center">
                    <DotLoading color="primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>
                {t('title')}
            </NavBar>

            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-4">
                {/* Setup Tip */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                    <p className="text-sm text-green-700 dark:text-green-300">
                        <strong>{t('setup')}</strong> {t('setupTip')}
                    </p>
                </div>

                {/* Menu Board URL */}
                <Card className="rounded-xl">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <LuMonitor size={18} className="text-blue-500" />
                            <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">{t('menuBoard')}</span>
                            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full">{t('default')}</span>
                        </div>
                        <p className="text-xs text-gray-500">{t('menuBoardDesc')}</p>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5 text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                            {screenUrl}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                block
                                size="middle"
                                color={copiedMenu ? 'success' : 'primary'}
                                fill="outline"
                                onClick={() => handleCopy(screenUrl, 'menu')}
                                style={{ minHeight: '44px' }}
                            >
                                {copiedMenu ? <><LuCheck size={14} className="inline mr-1" /> {t('copied')}</> : <><LuCopy size={14} className="inline mr-1" /> {t('copyLink')}</>}
                            </Button>
                            <Button
                                size="middle"
                                fill="outline"
                                onClick={() => { window.open(screenUrl, '_blank'); }}
                                style={{ minHeight: '44px', minWidth: '44px' }}
                            >
                                <LuExternalLink size={16} />
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Highlights URL */}
                <Card className="rounded-xl">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <LuPlay size={18} className="text-purple-500" />
                            <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">{t('highlights')}</span>
                            <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full">{t('optional')}</span>
                        </div>
                        <p className="text-xs text-gray-500">{t('highlightsDesc')}</p>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5 text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                            {highlightsUrl}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                block
                                size="middle"
                                color={copiedHighlights ? 'success' : 'default'}
                                fill="outline"
                                onClick={() => handleCopy(highlightsUrl, 'highlights')}
                                style={{ minHeight: '44px' }}
                            >
                                {copiedHighlights ? <><LuCheck size={14} className="inline mr-1" /> {t('copied')}</> : <><LuCopy size={14} className="inline mr-1" /> {t('copyLink')}</>}
                            </Button>
                            <Button
                                size="middle"
                                fill="outline"
                                onClick={() => { window.open(highlightsUrl, '_blank'); }}
                                style={{ minHeight: '44px', minWidth: '44px' }}
                            >
                                <LuExternalLink size={16} />
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Owner Override Toggle */}
                <Card className="rounded-xl">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 mr-3">
                            <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100">{t('useMyDesignsOnly')}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{t('useMyDesignsOnlyDesc')}</p>
                        </div>
                        <Switch
                            checked={ownerOverride}
                            onChange={handleOverrideToggle}
                            style={{ '--height': '26px', '--width': '44px' } as React.CSSProperties}
                        />
                    </div>
                </Card>

                {/* How It Works */}
                <Card className="rounded-xl">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('howItWorks')}</h3>
                    <div className="space-y-2 text-xs text-gray-500">
                        <p>{t('step1')}</p>
                        <p>{t('step2')}</p>
                        <p>{t('step3')}</p>
                        <p>{t('step4')}</p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
