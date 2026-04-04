'use client'

import { AI_ACTIONS_TYPES } from '@constant/common';
import { AICapacityError } from '@services/ai/capacityError';
import { theme } from 'antd';
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
    const { token } = theme.useToken();
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
            Toast.show({ content: 'Descriptions updated', duration: 1500 });
            onClose();
        } catch (error) {
            if (error instanceof AICapacityError) {
                Toast.show({ content: 'AI translation credits are needed to continue.', duration: 2200 });
            } else {
                Toast.show({ content: 'Description generation failed', duration: 2000 });
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
            bodyStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88vh', overflowX: 'hidden', overflowY: 'auto' }}
            destroyOnClose
            onMaskClick={isProcessing ? undefined : onClose}
            visible={visible}
        >
            <Flex gap={16} vertical>
                <NavBar onBack={isProcessing ? undefined : onClose}>Menu descriptions</NavBar>
                <Text type="secondary">
                    Create clear, professional descriptions for your menu items.
                </Text>

                {allDescriptionsReady ? (
                    <Card size="small" style={{ backgroundColor: token.colorSuccessBg, borderRadius: 16 }}>
                        <Flex align="center" gap={12}>
                            <LuCheck color={token.colorSuccess} size={22} />
                            <Flex gap={2} vertical>
                                <Text strong>Your menu descriptions are ready.</Text>
                                <Text type="secondary">You can refresh AI descriptions anytime.</Text>
                            </Flex>
                        </Flex>
                    </Card>
                ) : (
                    <Card size="small" style={{ borderRadius: 16 }}>
                        <Flex gap={6} vertical>
                            <Text strong>{itemsCount} items</Text>
                            <Text type="secondary">{itemsWithoutDescriptions} need descriptions</Text>
                        </Flex>
                    </Card>
                )}

                <Card size="small" style={{ borderRadius: 16 }}>
                    <Flex gap={12} vertical>
                        <Text strong>Description length</Text>
                        <Flex gap={8} vertical>
                            {DESCRIPTION_LENGTH_OPTIONS.map((option) => (
                                <Button
                                    key={option.value}
                                    disabled={isProcessing}
                                    fill={contentLength === option.value ? 'solid' : 'outline'}
                                    onClick={() => setContentLength(option.value)}
                                    style={{ minHeight: 52, width: '100%' }}
                                >
                                    <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                        <Text strong style={{ color: contentLength === option.value ? '#fff' : undefined }}>
                                            {option.label}
                                        </Text>
                                        <Text style={{ color: contentLength === option.value ? 'rgba(255,255,255,0.8)' : token.colorTextSecondary, whiteSpace: 'normal' }}>
                                            {option.description}
                                        </Text>
                                    </Flex>
                                </Button>
                            ))}
                        </Flex>
                    </Flex>
                </Card>

                <Card size="small" style={{ borderRadius: 16 }}>
                    <Flex gap={10} vertical>
                        <Flex align="center" justify="space-between">
                            <Text strong>Menu status</Text>
                            <Text type="secondary">{itemsWithDescriptions} described</Text>
                        </Flex>
                        <Flex gap={8} wrap="wrap">
                            <Text>{itemsWithoutDescriptions} missing</Text>
                            <Text>{aiDescriptionCount} AI-created</Text>
                        </Flex>
                        {isProcessing ? (
                            <Text type="secondary">
                                {totalFiles > 1
                                    ? `Processing file ${Math.min(processedCount + 1, totalFiles)} of ${totalFiles}`
                                    : 'Working on your menu...'}
                            </Text>
                        ) : (
                            <Text type="secondary">Descriptions are saved automatically after generation.</Text>
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
                            <Text>Generate missing</Text>
                        </Flex>
                    </Button>

                    {itemsWithDescriptions > 0 ? (
                        <Button
                            block
                            disabled={isProcessing}
                            fill="outline"
                            onClick={() => {
                                void Dialog.confirm({
                                    cancelText: 'Cancel',
                                    confirmText: 'Refresh',
                                    content: 'This refreshes AI-created descriptions and keeps manual edits unchanged.',
                                    onConfirm: () => handleDescriptionRequest(AI_ACTIONS_TYPES.REWRITE_DESCRIPTION),
                                    title: 'Refresh descriptions?',
                                });
                            }}
                            size="large"
                        >
                            <Flex align="center" gap={6}>
                                <LuRefreshCcw size={16} />
                                <Text>Refresh AI text</Text>
                            </Flex>
                        </Button>
                    ) : null}
                </Flex>
            </Flex>
        </Popup>
    );
}
