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
import { Button, Card, Dialog, Flex, NavBar, Popup, Text, Toast } from '../antd';

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

    const { aiDescriptionCount, itemsCount, itemsWithDescriptions, itemsWithoutDescriptions } = useMemo(
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
                                    <Button
                                        key={option.value}
                                        disabled={isProcessing}
                                        fill={contentLength === option.value ? 'solid' : 'outline'}
                                        onClick={() => setContentLength(option.value)}
                                        style={{
                                            borderColor: contentLength === option.value ? token.colorPrimaryBorder : token.colorBorderSecondary,
                                            height: 'auto',
                                            justifyContent: 'flex-start',
                                            paddingBlock: 12,
                                            paddingInline: 12,
                                            width: '100%',
                                        }}
                                    >
                                        <Flex gap={4} style={{ minWidth: 0, textAlign: 'left', width: '100%' }} vertical>
                                            <Text strong style={{ color: contentLength === option.value ? token.colorTextLightSolid : undefined, lineHeight: 1.3 }}>
                                                {option.label}
                                            </Text>
                                            <Text style={{ color: contentLength === option.value ? token.colorTextLightSolid : token.colorTextSecondary, lineHeight: 1.35, opacity: contentLength === option.value ? 0.85 : 1, whiteSpace: 'normal' }}>
                                                {option.description}
                                            </Text>
                                        </Flex>
                                    </Button>
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
                                <Text>{t('aiCreatedCount', { count: aiDescriptionCount })}</Text>
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

                    <Flex gap={12} vertical>
                        <Button
                            block
                            color="primary"
                            disabled={isProcessing || itemsWithoutDescriptions === 0}
                            loading={isProcessing}
                            onClick={() => void handleDescriptionRequest(AI_ACTIONS_TYPES.ADD_DESCRIPTION)}
                            size="large"
                        >
                            <Flex align="center" gap={6}>
                                <LuSparkles size={16} />
                                <Text>{t('generateMissing')}</Text>
                            </Flex>
                        </Button>

                        {itemsWithDescriptions > 0 ? (
                            <Button
                                block
                                disabled={isProcessing}
                                fill="outline"
                                onClick={() => {
                                    void Dialog.confirm({
                                        cancelText: t('cancel'),
                                        confirmText: t('refresh'),
                                        content: t('refreshDescriptionsConfirm'),
                                        onConfirm: () => handleDescriptionRequest(AI_ACTIONS_TYPES.REWRITE_DESCRIPTION),
                                        title: t('refreshDescriptionsTitle'),
                                    });
                                }}
                                size="large"
                            >
                                <Flex align="center" gap={6}>
                                    <LuRefreshCcw size={16} />
                                    <Text>{t('refreshAiText')}</Text>
                                </Flex>
                            </Button>
                        ) : null}
                    </Flex>
                </Flex>
            </Flex>
        </Popup>
    );
}
