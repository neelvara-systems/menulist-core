import { AI_ACTIONS_TYPES } from '@constant/common';
import { useAppDispatch } from '@hook/useAppDispatch';
import { logger } from '@lib/monitoring/logger';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { AICapacityError } from '@services/ai/capacityError';
import { DescriptionGovernanceOptions } from '@services/ai/description/descriptionUtils';
import { InheritanceState } from '@type/multiOutlet.types';
import { message as antdMessage, Button, Flex, Modal, Popconfirm, theme, Typography } from 'antd';
import { motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';
import { LuCheck, LuRefreshCcw } from 'react-icons/lu';
import { Project } from '../types';
import {
    DESCRIPTION_LENGTH_OPTIONS,
    getDescriptionGenerationStats,
    runDescriptionGeneration,
    type DescriptionContentLength,
} from './descriptionGeneration.shared';

const { Text } = Typography;

interface DescriptionGenerationModalProps {
    modalData: any;
    onClose: () => void;
    setFileProcessingId: (id: string | null) => void;
    setActiveProject: (project: Project) => void;
    setHasChanges: (hasChanges: boolean) => void;
    projectData: Project;
    /** Multi-outlet: Item inheritance states for governance filtering */
    itemStates?: Record<string, InheritanceState>;
    /** Multi-outlet: Whether this store is linked to a master */
    isMasterLinked?: boolean;
}

const DescriptionGenerationModal: React.FC<DescriptionGenerationModalProps> = ({
    modalData,
    onClose,
    setFileProcessingId,
    setActiveProject,
    setHasChanges,
    projectData,
    itemStates,
    isMasterLinked = false
}) => {
    // Multi-outlet: Build governance options for outlets
    const governance: DescriptionGovernanceOptions | undefined = isMasterLinked && itemStates
        ? { itemStates }
        : undefined;

    const dispatch = useAppDispatch()
    const { token } = theme.useToken();
    const [contentLength, setContentLength] = useState<DescriptionContentLength>('Standard');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedCount, setProcessedCount] = useState(0);
    const [totalFiles, setTotalFiles] = useState(0);

    const { itemsCount, itemsWithDescriptions, itemsWithoutDescriptions, manualDescriptionCount, aiDescriptionCount } = useMemo(
        () => getDescriptionGenerationStats(projectData, modalData.sourceFile, governance),
        [governance, modalData.sourceFile, projectData]
    );

    const handleDescriptionRequest = async (action: string, nextContentLength: DescriptionContentLength) => {
        setIsProcessing(true);
        setProcessedCount(0);
        dispatch(startLoader("adding description"));

        try {
            setTotalFiles(projectData.files?.filter((file) =>
                file.extractedData?.data && (modalData.sourceFile ? modalData.sourceFile.uid === file.uid : true)
            ).length || 0);

            const updatedProject = await runDescriptionGeneration({
                action,
                contentLength: nextContentLength,
                governance,
                onFileProcessingIdChange: setFileProcessingId,
                onProgress: (processedFiles, nextTotalFiles) => {
                    setProcessedCount(processedFiles);
                    setTotalFiles(nextTotalFiles);
                },
                onProjectUpdate: setActiveProject,
                projectData,
                sourceFile: modalData.sourceFile,
            });

            dispatch(stopLoader("adding description"));
            setActiveProject(updatedProject);
            setHasChanges(false); // Already saved, no pending changes
            antdMessage.success('Descriptions updated.');
            onClose();
        } catch (error) {
            dispatch(stopLoader("adding description"));
            if (error instanceof AICapacityError) {
                antdMessage.info('Get more AI enhancements to continue. Visit Billing to add an enhancement pack.');
            } else {
                antdMessage.error('Description generation failed. Please try again.');
                logger.error('Description generation failed', error);
            }
        } finally {
            setIsProcessing(false);
            setProcessedCount(0);
            setTotalFiles(0);
        }
    };

    const handleGenerateEmptyClick = () => {
        handleDescriptionRequest(AI_ACTIONS_TYPES.ADD_DESCRIPTION, contentLength);
    };

    // P1.2: Rewrite now called "Refresh" and is handled via Popconfirm
    const handleRefreshConfirmed = () => {
        handleDescriptionRequest(AI_ACTIONS_TYPES.REWRITE_DESCRIPTION, contentLength);
    };

    const canGenerateEmpty = itemsWithoutDescriptions > 0;
    // P1.3: Check if all items already have descriptions (silence as outcome)
    const allDescriptionsReady = itemsCount > 0 && itemsWithoutDescriptions === 0;
    // P1.4: Items that can be refreshed (AI-generated only)
    const refreshableCount = aiDescriptionCount;

    return (
        <Modal
            title="Menu descriptions"
            open={modalData.active}
            onCancel={onClose}
            footer={null}
            width={420}
            maskClosable={false}
        >
            {/* P1.3: Silence as Outcome - Show success state when all ready */}
            {allDescriptionsReady ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                    <Flex
                        vertical
                        align="center"
                        gap={16}
                        style={{
                            padding: '32px 16px',
                            background: token.colorSuccessBg,
                            borderRadius: 12,
                            marginBottom: 16
                        }}
                    >
                        <LuCheck style={{ fontSize: 48, color: token.colorSuccess }} />
                        <div style={{ textAlign: 'center' }}>
                            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>
                                Your menu descriptions are ready.
                            </Text>
                            <Text type="secondary">
                                You can update them anytime.
                            </Text>
                        </div>
                        {refreshableCount > 0 && (
                            <Popconfirm
                                title="Refresh descriptions?"
                                description={
                                    <div style={{ maxWidth: 280 }}>
                                        <Text>This will update descriptions created by MenuList.</Text>
                                        <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                                            Your manual edits will not be changed.
                                        </Text>
                                    </div>
                                }
                                onConfirm={handleRefreshConfirmed}
                                okText="Confirm refresh"
                                cancelText="Cancel"
                                placement="top"
                            >
                                <Button icon={<LuRefreshCcw />} disabled={isProcessing}>
                                    Refresh descriptions
                                </Button>
                            </Popconfirm>
                        )}
                    </Flex>
                </motion.div>
            ) : (
                <>
                    {/* Header line + Status */}
                    <div style={{ marginBottom: 20 }}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                            Create clear, professional descriptions for your menu items.
                        </Text>
                        <Text strong>
                            {itemsCount} items • {itemsWithoutDescriptions} need descriptions
                        </Text>
                    </div>

                    {/* P1.1: Simplified Settings - Only length (2 options), tone hidden */}
                    <Flex vertical gap={20}>
                        {/* Description Length - Authority UX: No word counts, no numbers */}
                        <div>
                                <Text strong style={{ display: 'block', marginBottom: 10, fontSize: 14 }}>Description length</Text>
                            <Flex gap={8}>
                                {DESCRIPTION_LENGTH_OPTIONS.map((option) => (
                                    <div
                                        key={option.value}
                                        onClick={() => !isProcessing && setContentLength(option.value)}
                                        style={{
                                            flex: 1,
                                            padding: '12px 14px',
                                            borderRadius: 8,
                                            border: `1.5px solid ${contentLength === option.value ? token.colorPrimary : token.colorBorder}`,
                                            background: contentLength === option.value ? token.colorPrimaryBg : 'transparent',
                                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                                            opacity: isProcessing ? 0.6 : 1,
                                            transition: 'all 0.2s ease',
                                            textAlign: 'center'
                                        }}
                                    >
                                        <Text strong style={{ color: contentLength === option.value ? token.colorPrimary : token.colorText, display: 'block' }}>
                                            {option.label}
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            {option.description}
                                        </Text>
                                    </div>
                                ))}
                            </Flex>
                        </div>
                    </Flex>

                    {/* Progress indicator - Authority UX copy */}
                    {isProcessing && (
                        <div style={{ marginTop: 20, textAlign: 'center' }}>
                            <Text type="secondary">
                                {totalFiles > 1
                                    ? `Processing file ${processedCount + 1} of ${totalFiles}`
                                    : 'Working on your menu…'}
                            </Text>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                                This may take a moment.
                            </Text>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <Flex gap={12} style={{ marginTop: 24 }}>
                        {/* Primary: Generate descriptions */}
                        <Button
                            size='large'
                            type="primary"
                            onClick={handleGenerateEmptyClick}
                            loading={isProcessing}
                            disabled={isProcessing || !canGenerateEmpty}
                            style={{ flex: 1 }}
                        >
                            Generate descriptions ({itemsWithoutDescriptions})
                        </Button>

                        {/* Secondary: Refresh with confirmation */}
                        {itemsWithDescriptions > 0 && (
                            <Popconfirm
                                title="Refresh descriptions?"
                                description={
                                    <div style={{ maxWidth: 280 }}>
                                        <Text>This will update descriptions created by MenuList.</Text>
                                        <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                                            Your manual edits will not be changed.
                                        </Text>
                                    </div>
                                }
                                onConfirm={handleRefreshConfirmed}
                                okText="Confirm refresh"
                                cancelText="Cancel"
                                disabled={isProcessing}
                            >
                                <Button
                                    size='large'
                                    loading={isProcessing}
                                    disabled={isProcessing}
                                >
                                    Refresh descriptions
                                </Button>
                            </Popconfirm>
                        )}
                    </Flex>

                    {/* Footer hint */}
                    <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 12 }}>
                        Descriptions are saved automatically.
                    </Text>
                </>
            )}
        </Modal>
    );
};

export default DescriptionGenerationModal;
