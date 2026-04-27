'use client'

import { getBlockLabels, getEnabledBlocks } from '@config/decisionBlocks';
import { getProjectDefaultLanguage } from '@lib/localization/projectContent';
import {
    applyDecisionBlockSettings,
    buildAllItemOptions,
    getCategoryName,
    getDecisionBlockSettings,
    getFilteredDecisionBlockOptionIds,
    hasDecisionBlockChanges,
    isPinnedItemUnavailable,
    trackDecisionBlockChanges,
} from '../../templates/main-app/projects/editorView/decisionBlocks.shared';
import type { Project } from '../../templates/main-app/projects/types/project.types';
import { Alert, theme } from 'antd';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { LuHelpCircle, LuPin, LuStar, LuTrendingUp, LuZap } from 'react-icons/lu';
import { Button, Card, Flex, NavBar, Popup, Select, Switch, Text, Title, Toast } from '../antd';

type BlockType = 'popular' | 'quickPick' | 'bestValue';

interface SmartRecommendationsSheetProps {
    businessType?: string;
    onClose: () => void;
    onSaved: (updatedProject: Project) => void;
    projectData: Project;
    visible: boolean;
}

export default function SmartRecommendationsSheet({
    businessType,
    onClose,
    onSaved,
    projectData,
    visible,
}: SmartRecommendationsSheetProps) {
    const { token } = theme.useToken();
    const t = useTranslations('MobileMenu');
    const sectionCardStyle = {
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 14,
    } as const;
    const activeLang = getProjectDefaultLanguage(projectData);
    const enabledBlockTypes = useMemo(() => getEnabledBlocks(businessType), [businessType]);
    const popularLabels = useMemo(() => getBlockLabels('popular', businessType), [businessType]);
    const quickPickLabels = useMemo(() => getBlockLabels('quickPick', businessType), [businessType]);
    const bestValueLabels = useMemo(() => getBlockLabels('bestValue', businessType), [businessType]);
    const initialSettings = useMemo(() => getDecisionBlockSettings(projectData), [projectData]);

    const [enablePopular, setEnablePopular] = useState(initialSettings.enablePopular);
    const [enableQuickPick, setEnableQuickPick] = useState(initialSettings.enableQuickPick);
    const [enableBestValue, setEnableBestValue] = useState(initialSettings.enableBestValue);
    const [pinnedPopular, setPinnedPopular] = useState<string | undefined>(initialSettings.pinnedPopular);
    const [pinnedQuickPick, setPinnedQuickPick] = useState<string | undefined>(initialSettings.pinnedQuickPick);
    const [pinnedBestValue, setPinnedBestValue] = useState<string | undefined>(initialSettings.pinnedBestValue);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!visible) return;
        const settings = getDecisionBlockSettings(projectData);
        setEnablePopular(settings.enablePopular);
        setEnableQuickPick(settings.enableQuickPick);
        setEnableBestValue(settings.enableBestValue);
        setPinnedPopular(settings.pinnedPopular);
        setPinnedQuickPick(settings.pinnedQuickPick);
        setPinnedBestValue(settings.pinnedBestValue);
    }, [projectData, visible]);

    const itemOptions = useMemo(() => {
        return buildAllItemOptions(projectData.files || [], activeLang).map((option) => ({
            ...option,
            categoryName: getCategoryName(projectData.files || [], option.category, activeLang),
        }));
    }, [activeLang, projectData.files]);

    const nextSettings = useMemo(() => ({
        enablePopular,
        enableQuickPick,
        enableBestValue,
        pinnedPopular,
        pinnedQuickPick,
        pinnedBestValue,
    }), [enableBestValue, enablePopular, enableQuickPick, pinnedBestValue, pinnedPopular, pinnedQuickPick]);

    const hasChanges = useMemo(
        () => hasDecisionBlockChanges(projectData, nextSettings),
        [nextSettings, projectData]
    );

    const blockPickerValueMap: Record<BlockType, string | undefined> = {
        popular: pinnedPopular,
        quickPick: pinnedQuickPick,
        bestValue: pinnedBestValue,
    };

    const blockToggleMap: Record<BlockType, [boolean, (value: boolean) => void]> = {
        popular: [enablePopular, setEnablePopular],
        quickPick: [enableQuickPick, setEnableQuickPick],
        bestValue: [enableBestValue, setEnableBestValue],
    };

    const blockIconMap: Record<BlockType, ReactNode> = {
        popular: <LuStar size={18} style={{ color: token.colorWarning }} />,
        quickPick: <LuZap size={18} style={{ color: token.colorSuccess }} />,
        bestValue: <LuTrendingUp size={18} style={{ color: token.colorPrimary }} />,
    };

    const blockLabelsMap = {
        popular: popularLabels,
        quickPick: quickPickLabels,
        bestValue: bestValueLabels,
    };

    const getPickerOptions = (blockType: BlockType) => {
        const blockedIds = getFilteredDecisionBlockOptionIds(blockType, nextSettings);
        return itemOptions
            .filter((option) => !blockedIds.has(option.value))
            .map((option) => ({
                value: option.value,
                label: option.categoryName ? `${option.label} (${option.categoryName})` : option.label,
            }));
    };

    const getPinnedLabel = (pinnedId?: string) => {
        if (!pinnedId) return t('smartRecommendationsAutoSelect');
        return itemOptions.find((option) => option.value === pinnedId)?.label || t('smartRecommendationsPinnedUnavailable');
    };

    const handlePinChange = (blockType: BlockType, value?: string) => {
        if (blockType === 'popular') setPinnedPopular(value);
        if (blockType === 'quickPick') setPinnedQuickPick(value);
        if (blockType === 'bestValue') setPinnedBestValue(value);
    };

    const handleSave = async () => {
        if (!hasChanges) {
            onClose();
            return;
        }

        setIsSaving(true);
        try {
            trackDecisionBlockChanges(projectData, nextSettings);
            const updatedProject = applyDecisionBlockSettings(projectData, nextSettings);
            onSaved(updatedProject);
            Toast.show({ content: t('smartRecommendationsSaved'), duration: 1200 });
        } catch {
            Toast.show({ content: t('smartRecommendationsSaveFailed'), duration: 1800 });
        } finally {
            setIsSaving(false);
        }
    };

    const renderBlock = (blockType: BlockType) => {
        if (!enabledBlockTypes.includes(blockType)) return null;

        const labels = blockLabelsMap[blockType];
        if (!labels) return null;

        const [enabled, setEnabled] = blockToggleMap[blockType];
        const pinnedId = blockPickerValueMap[blockType];
        const pinnedStatus = isPinnedItemUnavailable(projectData.files || [], pinnedId);

        return (
            <Card key={blockType} style={sectionCardStyle}>
                <Flex gap={12} vertical>
                    <Flex align="center" justify="space-between">
                        <Flex align="center" gap={10} style={{ flex: 1, minWidth: 0 }}>
                            <Flex
                                align="center"
                                justify="center"
                                style={{
                                    background: enabled ? token.colorPrimaryBg : token.colorBgTextHover,
                                    borderRadius: 12,
                                    color: enabled ? token.colorPrimary : token.colorTextSecondary,
                                    height: 40,
                                    width: 40,
                                }}
                            >
                                {blockIconMap[blockType]}
                            </Flex>
                            <Flex gap={2} style={{ flex: 1, minWidth: 0 }} vertical>
                                <Text strong>{labels.title}</Text>
                                <Text style={{ whiteSpace: 'normal' }} type="secondary">{labels.subtitle}</Text>
                            </Flex>
                        </Flex>
                        <Switch checked={enabled} onChange={setEnabled} />
                    </Flex>

                    {enabled ? (
                        <Flex
                            gap={8}
                            style={{
                                borderTop: `1px solid ${token.colorBorderSecondary}`,
                                paddingTop: 12,
                            }}
                            vertical
                        >
                            <Flex align="center" gap={6}>
                                <LuPin size={14} style={{ color: token.colorTextSecondary }} />
                                <Text type="secondary">{t('smartRecommendationsPinLabel')}</Text>
                                <LuHelpCircle size={14} style={{ color: token.colorTextSecondary }} />
                            </Flex>

                            <Select
                                onChange={(value) => handlePinChange(blockType, value || undefined)}
                                options={getPickerOptions(blockType)}
                                placeholder={t('smartRecommendationsChooseItem')}
                                value={pinnedId}
                            />

                            {pinnedId ? (
                                <Button
                                    block
                                    fill="none"
                                    onClick={() => handlePinChange(blockType, undefined)}
                                    style={{ justifyContent: 'flex-start', paddingInline: 0 }}
                                >
                                    {t('smartRecommendationsClearPinned')}
                                </Button>
                            ) : null}

                            {pinnedStatus.unavailable && pinnedId ? (
                                <Alert
                                    description={t('smartRecommendationsPinnedWarningDesc', {
                                        item: pinnedStatus.itemName || t('smartRecommendationsPinnedUnavailable'),
                                        reason: pinnedStatus.reason || t('smartRecommendationsUnavailableReason'),
                                    })}
                                    message={t('smartRecommendationsPinnedWarning')}
                                    showIcon
                                    style={{ borderRadius: 8 }}
                                    type="warning"
                                />
                            ) : null}
                        </Flex>
                    ) : null}
                </Flex>
            </Card>
        );
    };

    return (
        <>
            <Popup
                bodyStyle={{ minHeight: '64vh', maxHeight: '92vh', overflowX: 'hidden', padding: 0 }}
                destroyOnClose
                onMaskClick={onClose}
                position="bottom"
                visible={visible}
            >
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar onBack={onClose}>{t('smartRecommendationsTitle')}</NavBar>
                    <Flex gap={12} style={{ overflowY: 'auto', padding: '12px 12px 12px' }} vertical>
                        <Card style={sectionCardStyle}>
                            <Flex gap={4} vertical>
                                <Title level={5} style={{ margin: 0 }}>{t('smartRecommendationsHeading')}</Title>
                                <Text type="secondary">{t('smartRecommendationsDesc')}</Text>
                            </Flex>
                        </Card>

                        <Alert
                            description={t('smartRecommendationsInfoDesc')}
                            message={t('smartRecommendationsInfoTitle')}
                            showIcon
                            style={{ borderRadius: 8 }}
                            type="info"
                        />

                        <Flex gap={12} vertical>
                            {renderBlock('popular')}
                            {renderBlock('quickPick')}
                            {renderBlock('bestValue')}
                        </Flex>

                        {enabledBlockTypes.length === 0 ? (
                            <Alert
                                description={t('smartRecommendationsEmptyDesc')}
                                message={t('smartRecommendationsEmptyTitle')}
                                showIcon
                                style={{ borderRadius: 8 }}
                                type="warning"
                            />
                        ) : null}

                        <div
                            style={{
                                backdropFilter: 'blur(10px)',
                                backgroundColor: token.colorBgContainer,
                                borderTop: `1px solid ${token.colorBorderSecondary}`,
                                bottom: 0,
                                marginInline: -12,
                                marginBottom: -16,
                                marginTop: 'auto',
                                padding: '12px 16px',
                                position: 'sticky',
                                zIndex: 5,
                            }}
                        >
                            <Flex gap={8}>
                                <Button block fill="outline" onClick={onClose}>
                                    {t('cancel')}
                                </Button>
                                <Button block disabled={!hasChanges} loading={isSaving} onClick={() => void handleSave()}>
                                    {t('save')}
                                </Button>
                            </Flex>
                        </div>
                    </Flex>
                </Flex>
            </Popup>
        </>
    );
}
