'use client'

import { getScreenState, initializeScreenState, updateScreenSettings } from '@database/campaigns';
import { buildScreenUrl } from '@lib/screen/utils';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuMonitor, LuPlay } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, NavBar, Switch, Text, Title, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileDigitalScreensScreenProps {
    onBack: () => void;
}

export default function MobileDigitalScreensScreen({ onBack }: MobileDigitalScreensScreenProps) {
    const t = useTranslations('MobileDigitalScreens');
    const [loading, setLoading] = useState(true);
    const [screenUrl, setScreenUrl] = useState('');
    const [ownerOverride, setOwnerOverride] = useState(false);
    const [copiedMenu, setCopiedMenu] = useState(false);
    const [copiedHighlights, setCopiedHighlights] = useState(false);

    useEffect(() => {
        const fetchState = async () => {
            try {
                setLoading(true);
                let state = await getScreenState();
                if (!state) state = await initializeScreenState();
                setScreenUrl(buildScreenUrl(state.screenToken));
                setOwnerOverride(state.ownerOverrideEnabled || false);
            } catch {
                Toast.show({ content: t('failedToLoad'), duration: 2000 });
            } finally {
                setLoading(false);
            }
        };
        void fetchState();
    }, [t]);

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

    if (loading) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <NavBar onBack={onBack} />
                <Flex align="center" flex={1} justify="center">
                    <DotLoading color="primary" />
                </Flex>
            </Flex>
        );
    }

    const highlightsUrl = screenUrl ? `${screenUrl}?mode=highlights` : '';

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar onBack={onBack} />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={`${t('setup')} ${t('setupTip')}`}
                    title={t('title')}
                />

                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" gap={8}>
                            <LuMonitor color="#1677ff" size={18} />
                            <Title level={5} style={{ margin: 0 }}>{t('menuBoard')}</Title>
                        </Flex>
                        <Text type="secondary">{t('menuBoardDesc')}</Text>
                        <Card>
                            <Text>{screenUrl}</Text>
                        </Card>
                        <Flex gap={8}>
                            <Button block fill="outline" onClick={() => void handleCopy(screenUrl, 'menu')}>
                                <Flex align="center" gap={6}>
                                    {copiedMenu ? <LuCheck size={14} /> : <LuCopy size={14} />}
                                    <Text>{copiedMenu ? t('copied') : t('copyLink')}</Text>
                                </Flex>
                            </Button>
                            <Button fill="outline" onClick={() => window.open(screenUrl, '_blank')}>
                                <LuExternalLink size={16} />
                            </Button>
                        </Flex>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" gap={8}>
                            <LuPlay color="#9333ea" size={18} />
                            <Title level={5} style={{ margin: 0 }}>{t('highlights')}</Title>
                        </Flex>
                        <Text type="secondary">{t('highlightsDesc')}</Text>
                        <Card>
                            <Text>{highlightsUrl}</Text>
                        </Card>
                        <Flex gap={8}>
                            <Button block fill="outline" onClick={() => void handleCopy(highlightsUrl, 'highlights')}>
                                <Flex align="center" gap={6}>
                                    {copiedHighlights ? <LuCheck size={14} /> : <LuCopy size={14} />}
                                    <Text>{copiedHighlights ? t('copied') : t('copyLink')}</Text>
                                </Flex>
                            </Button>
                            <Button fill="outline" onClick={() => window.open(highlightsUrl, '_blank')}>
                                <LuExternalLink size={16} />
                            </Button>
                        </Flex>
                    </Flex>
                </Card>

                <Card>
                    <Flex align="center" justify="space-between">
                        <Flex gap={2} vertical>
                            <Text strong>{t('useMyDesignsOnly')}</Text>
                            <Text type="secondary">{t('useMyDesignsOnlyDesc')}</Text>
                        </Flex>
                        <Switch checked={ownerOverride} onChange={(value) => void handleOverrideToggle(value)} />
                    </Flex>
                </Card>

                <Card title={t('howItWorks')}>
                    <Flex gap={8} vertical>
                        <Text>{t('step1')}</Text>
                        <Text>{t('step2')}</Text>
                        <Text>{t('step3')}</Text>
                        <Text>{t('step4')}</Text>
                    </Flex>
                </Card>
            </Flex>
        </Flex>
    );
}
