'use client'

import { AI_ACTIONS_TYPES } from '@constant/common';
import { AICapacityError } from '@services/ai/capacityError';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { LuCheck, LuRefreshCcw, LuSparkles } from 'react-icons/lu';
import type { Project } from '../../templates/main-app/projects/types';
import {
    DESCRIPTION_LENGTH_OPTIONS,
    getDescriptionGenerationStats,
    runDescriptionGeneration,
    type DescriptionContentLength,
} from '../../templates/main-app/projects/editorView/descriptionGeneration.shared';
import { Button, Card, Flex, NavBar, Popup, Text, Toast } from '../antd';
import AiActionProgressPanel from '../components/AiActionProgressPanel';

interface GenerateDescriptionsSheetProps {
    onClose: () => void;
    onSaved: (updatedProject: Project) => void;
    projectData: Project;
    visible: boolean;
}

export default function GenerateDescriptionsSheet({
    onClose,
    onSaved,
    projectData,
    visible,
}: GenerateDescriptionsSheetProps) {
    const t = useTranslations('MobileMenu');
    const { token } = theme.useToken();
    const sectionCardStyle = {
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 14,
    } as const;
    const [contentLength, setContentLength] = useState<DescriptionContentLength>('Standard');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedCount, setProcessedCount] = useState(0);
    const [totalFiles, setTotalFiles] = useState(0);

    const { itemsCount, itemsWithDescriptions, itemsWithoutDescriptions } = useMemo(
        () => getDescriptionGenerationStats(projectData, null, undefined),
        [projectData]
    );

    const handleDescriptionRequest = async (action: string) => {
        setIsProcessing(true);
        setProcessedCount(0);

        try {
            const updatedProject = await runDescriptionGeneration({
                action,
                contentLength,
                onProgress: (processedFiles, nextTotalFiles) => {
                    setProcessedCount(processedFiles);
                    setTotalFiles(nextTotalFiles);
                },
                onProjectUpdate: onSaved,
                projectData,
            });

            onSaved(updatedProject);
            Toast.show({ content: t('descriptionsUpdated'), duration: 1500 });
            onClose();
        } catch (error) {
            if (error instanceof AICapacityError) {
                Toast.show({ content: t('translationCreditsRequired'), duration: 2200 });
            } else {
                Toast.show({ content: t('descriptionGenerationFailed'), duration: 2000 });
            }
        } finally {
            setIsProcessing(false);
            setProcessedCount(0);
            setTotalFiles(0);
        }
    };

    if (!visible) return null;

    const allDescriptionsReady = itemsCount > 0 && itemsWithoutDescriptions === 0;

    return (
        <Popup
            bodyStyle={{ minHeight: '64vh', maxHeight: '92vh', overflowX: 'hidden', overflowY: 'auto', padding: 0 }}
            destroyOnClose
            onMaskClick={isProcessing ? undefined : onClose}
            visible={visible}
        >
            <Flex style={{ height: '100%' }} vertical>
                <NavBar onBack={isProcessing ? undefined : onClose}>{t('menuDescriptions')}</NavBar>
                <Flex gap={12} style={{ overflowY: 'auto', padding: '12px 12px 12px' }} vertical>
                    <Card size="small" style={sectionCardStyle}>
                        <Text type="secondary">
                            {t('menuDescriptionsDesc')}
                        </Text>
                    </Card>

                    {isProcessing ? (
                        <AiActionProgressPanel
                            detail={totalFiles > 1
                                ? t('processingFileProgress', { current: Math.min(processedCount + 1, totalFiles), total: totalFiles })
                                : t('workingOnMenu')}
                            helperText={t('keepScreenOpen')}
                            labels={[
                                t('checkingItemsStep'),
                                t('writingDescriptionsStep'),
                                t('savingDescriptionsStep'),
                            ]}
                            title={t('updatingOfferingDescriptions')}
                        />
                    ) : null}

                    {allDescriptionsReady ? (
                        <Card size="small" style={{ ...sectionCardStyle, backgroundColor: token.colorSuccessBg }}>
                            <Flex align="center" gap={12}>
                                <LuCheck color={token.colorSuccess} size={22} />
                                <Flex gap={2} vertical>
                                    <Text strong>{t('descriptionsReady')}</Text>
                                    <Text type="secondary">{t('refreshDescriptionsAnytime')}</Text>
                                </Flex>
                            </Flex>
                        </Card>
                    ) : (
                        <Card size="small" style={sectionCardStyle}>
                            <Flex gap={6} vertical>
                                <Text strong>{t('itemsCountLabel', { count: itemsCount })}</Text>
                                <Text type="secondary">{t('itemsNeedDescriptions', { count: itemsWithoutDescriptions })}</Text>
                            </Flex>
                        </Card>
                    )}

                    <Card size="small" style={sectionCardStyle}>
                        <Flex gap={12} vertical>
                            <Text strong>{t('descriptionLength')}</Text>
                            <Flex gap={8} vertical>
                                {DESCRIPTION_LENGTH_OPTIONS.map((option) => (
                                    <div
                                        key={option.value}
                                        onClick={() => {
                                            if (isProcessing) return;
                                            setContentLength(option.value);
                                        }}
                                        style={{
                                            backgroundColor: token.colorBgContainer,
                                            border: `1px solid ${contentLength === option.value ? token.colorPrimary : token.colorBorderSecondary}`,
                                            borderRadius: 12,
                                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                                            opacity: isProcessing ? 0.6 : 1,
                                            paddingBlock: 12,
                                            paddingInline: 12,
                                            width: '100%',
                                        }}
                                    >
                                        <Flex align="center" gap={12} justify="space-between">
                                            <Flex gap={4} style={{ flex: 1, minWidth: 0, textAlign: 'left' }} vertical>
                                                <Text strong style={{ color: contentLength === option.value ? token.colorPrimary : undefined, lineHeight: 1.3 }}>
                                                    {option.label}
                                                </Text>
                                                <Text style={{ color: token.colorTextSecondary, lineHeight: 1.35, whiteSpace: 'normal' }}>
                                                    {option.description}
                                                </Text>
                                            </Flex>
                                            <Flex
                                                align="center"
                                                justify="center"
                                                style={{
                                                    backgroundColor: contentLength === option.value ? token.colorPrimary : 'transparent',
                                                    border: `1px solid ${contentLength === option.value ? token.colorPrimary : token.colorBorderSecondary}`,
                                                    borderRadius: '999px',
                                                    color: contentLength === option.value ? token.colorTextLightSolid : token.colorTextQuaternary,
                                                    flexShrink: 0,
                                                    height: 20,
                                                    width: 20,
                                                }}
                                            >
                                                {contentLength === option.value ? <LuCheck size={12} /> : null}
                                            </Flex>
                                        </Flex>
                                    </div>
                                ))}
                            </Flex>
                        </Flex>
                    </Card>

                    <Card size="small" style={sectionCardStyle}>
                        <Flex gap={10} vertical>
                            <Flex align="center" justify="space-between">
                                <Text strong>{t('menuStatus')}</Text>
                                <Text type="secondary">{t('itemsDescribed', { count: itemsWithDescriptions })}</Text>
                            </Flex>
                            <Flex gap={8} wrap="wrap">
                                <Text>{t('itemsMissing', { count: itemsWithoutDescriptions })}</Text>
                            </Flex>
                            {isProcessing ? (
                                <Text type="secondary">
                                    {totalFiles > 1
                                        ? t('processingFileProgress', { current: Math.min(processedCount + 1, totalFiles), total: totalFiles })
                                        : t('workingOnMenu')}
                                </Text>
                            ) : (
                                <Text type="secondary">{t('descriptionsAutoSaved')}</Text>
                            )}
                        </Flex>
                    </Card>

                    {itemsWithoutDescriptions > 0 || itemsWithDescriptions > 0 ? (
                        <Flex gap={12}>
                            {itemsWithoutDescriptions > 0 ? (
                                <Button
                                    block
                                    color="primary"
                                    disabled={isProcessing}
                                    loading={isProcessing}
                                    onClick={() => {
                                        void handleDescriptionRequest(AI_ACTIONS_TYPES.ADD_DESCRIPTION);
                                    }}
                                    size="large"
                                    style={{ flex: 1 }}
                                >
                                    <Flex align="center" gap={6} justify="center">
                                        <LuSparkles size={16} />
                                        <Text>{t('generateMissing')}</Text>
                                    </Flex>
                                </Button>
                            ) : null}

                            {itemsWithDescriptions > 0 ? (
                                <Button
                                    block
                                    disabled={isProcessing}
                                    fill="outline"
                                    onClick={() => {
                                        void handleDescriptionRequest(AI_ACTIONS_TYPES.REWRITE_DESCRIPTION);
                                    }}
                                    size="large"
                                    style={{ flex: 1 }}
                                >
                                    <Flex align="center" gap={6} justify="center">
                                        <LuRefreshCcw size={16} />
                                        <Text>{t('refreshDescriptionsCta')}</Text>
                                    </Flex>
                                </Button>
                            ) : null}
                        </Flex>
                    ) : null}
                </Flex>
            </Flex>
        </Popup>
    );
}
