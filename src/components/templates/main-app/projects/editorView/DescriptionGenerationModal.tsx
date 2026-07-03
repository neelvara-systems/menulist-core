import { AI_ACTIONS_TYPES } from '@constant/common';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { getProjectDescriptionContentLength, getProjectDescriptionTone, mergeProjectAIPreferences } from '@lib/ai/projectAIPreferences';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { AICapacityError } from '@services/ai/capacityError';
import { DescriptionGovernanceOptions } from '@services/ai/description/descriptionUtils';
import { InheritanceState } from '@type/multiOutlet.types';
import { removeObjRef } from '@util/utils';
import { message as antdMessage, Button, Flex, Grid, Modal, Popconfirm, theme, Typography } from 'antd';
import { motion } from 'framer-motion';
import React, { useEffect, useMemo, useState } from 'react';
import { LuCheck, LuRefreshCcw } from 'react-icons/lu';
import { Project } from '../types';
import {
    DESCRIPTION_LENGTH_OPTIONS,
    DESCRIPTION_TONE_OPTIONS,
    getDescriptionGenerationStats,
    runDescriptionGeneration,
    type DescriptionContentLength,
    type DescriptionTone,
} from './descriptionGeneration.shared';

const { Text } = Typography;
const MENU_DESCRIPTION_MODAL_GENERATION_FAILED = 'menu_description_modal_generation_failed';

interface DescriptionGenerationModalProps {
    businessType?: string;
    businessCategory?: string;
    modalData: any;
    onClose: () => void;
    setFileProcessingId: (id: string | null) => void;
    setActiveProject: (project: Project) => void;
    setHasChanges: (hasChanges: boolean) => void;
    setProjectData?: (project: Project) => void;
    persistProject?: (project: Project) => Promise<Project | void>;
    projectData: Project;
    /** Multi-outlet: Item inheritance states for governance filtering */
    itemStates?: Record<string, InheritanceState>;
    /** Multi-outlet: Whether this store is linked to a master */
    isMasterLinked?: boolean;
    /** Multi-outlet: Whether inherited item descriptions may be locally overridden */
    allowInheritedDescriptionOverride?: boolean;
}

const DescriptionGenerationModal: React.FC<DescriptionGenerationModalProps> = ({
    businessType,
    businessCategory,
    modalData,
    onClose,
    setFileProcessingId,
    setActiveProject,
    setHasChanges,
    setProjectData,
    persistProject,
    projectData,
    itemStates,
    isMasterLinked = false,
    allowInheritedDescriptionOverride = false
}) => {
    // Multi-outlet: Build governance options for outlets
    const governance: DescriptionGovernanceOptions | undefined = isMasterLinked && itemStates && !allowInheritedDescriptionOverride
        ? { itemStates }
        : undefined;

    const dispatch = useAppDispatch()
    const { token } = theme.useToken();
    const screens = Grid.useBreakpoint();
    const labels = useOfferingLabels();
    const [contentLength, setContentLength] = useState<DescriptionContentLength>(getProjectDescriptionContentLength(projectData, businessType, businessCategory));
    const [descriptionTone, setDescriptionTone] = useState<DescriptionTone>(getProjectDescriptionTone(projectData, businessType, businessCategory));
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedCount, setProcessedCount] = useState(0);
    const [totalFiles, setTotalFiles] = useState(0);

    const { itemsCount, itemsWithDescriptions, itemsWithoutDescriptions, manualDescriptionCount, aiDescriptionCount } = useMemo(
        () => getDescriptionGenerationStats(projectData, modalData.sourceFile, governance),
        [governance, modalData.sourceFile, projectData]
    );

    const getDescriptionModalLogContext = (action: string) => ({
        action,
        aiDescriptionCount,
        allowInheritedDescriptionOverride,
        isMasterLinked,
        itemsCount,
        itemsWithoutDescriptions,
        itemsWithDescriptions,
        manualDescriptionCount,
        ...getBoundedRuntimeStringContext('businessCategory', businessCategory),
        ...getBoundedRuntimeStringContext('businessType', businessType),
        ...getBoundedRuntimeStringContext('projectId', projectData?.projectId),
        ...getBoundedRuntimeStringContext('sourceFileId', modalData.sourceFile?.uid),
    });

    useEffect(() => {
        setContentLength(getProjectDescriptionContentLength(projectData, businessType, businessCategory));
        setDescriptionTone(getProjectDescriptionTone(projectData, businessType, businessCategory));
    }, [businessType, businessCategory, projectData]);

    const handleDescriptionRequest = async (action: string, nextContentLength: DescriptionContentLength, nextDescriptionTone: DescriptionTone) => {
        setIsProcessing(true);
        setProcessedCount(0);
        dispatch(startLoader("adding description"));

        try {
            const projectWithPreferences = mergeProjectAIPreferences(projectData, {
                description: {
                    contentLength: nextContentLength,
                    tone: nextDescriptionTone,
                },
            });
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
                onProjectUpdate: (updatedProject) => {
                    if (isMasterLinked) {
                        setProjectData?.(removeObjRef(updatedProject));
                    } else {
                        setActiveProject(updatedProject);
                    }
                },
                persistProject,
                projectData: projectWithPreferences,
                sourceFile: modalData.sourceFile,
                tone: nextDescriptionTone,
            });

            dispatch(stopLoader("adding description"));
            if (isMasterLinked) {
                setProjectData?.(removeObjRef(updatedProject));
            } else {
                setActiveProject(updatedProject);
            }
            setHasChanges(false); // Already saved, no pending changes
            antdMessage.success('Descriptions updated.');
            onClose();
        } catch (error) {
            dispatch(stopLoader("adding description"));
            if (error instanceof AICapacityError) {
                antdMessage.info('Get more enhancements to continue. Visit Billing to add an enhancement pack.');
            } else {
                antdMessage.error('Description generation failed. Please try again.');
                logRuntimeFailure(MENU_DESCRIPTION_MODAL_GENERATION_FAILED, error, getDescriptionModalLogContext(action));
            }
        } finally {
            setIsProcessing(false);
            setProcessedCount(0);
            setTotalFiles(0);
        }
    };

    const handleGenerateEmptyClick = () => {
        handleDescriptionRequest(AI_ACTIONS_TYPES.ADD_DESCRIPTION, contentLength, descriptionTone);
    };

    // P1.2: Rewrite now called "Refresh" and is handled via Popconfirm
    const handleRefreshConfirmed = () => {
        handleDescriptionRequest(AI_ACTIONS_TYPES.REWRITE_DESCRIPTION, contentLength, descriptionTone);
    };

    const canGenerateEmpty = itemsWithoutDescriptions > 0;
    // P1.3: Check if all items already have descriptions (silence as outcome)
    const allDescriptionsReady = itemsCount > 0 && itemsWithoutDescriptions === 0;
    // P1.4: Items that can be refreshed (AI-generated only)
    const refreshableCount = aiDescriptionCount;

    return (
        <Modal
            title={`${labels.offeringTitle} descriptions`}
            open={modalData.active}
            onCancel={onClose}
            footer={null}
            width="min(420px, calc(100vw - 24px))"
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
                                Your {labels.offeringLower} descriptions are ready.
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
                            Create clear, professional descriptions for your {labels.itemsPlural}.
                        </Text>
                        <Text strong>
                            {itemsCount} {labels.itemsPlural} • {itemsWithoutDescriptions} need descriptions
                        </Text>
                    </div>

                    {/* P1.1: Simplified Settings - Keep only owner-facing generation choices */}
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
                        <div>
                            <Text strong style={{ display: 'block', marginBottom: 10, fontSize: 14 }}>Writing style</Text>
                            <Flex gap={8}>
                                {DESCRIPTION_TONE_OPTIONS.map((option) => (
                                    <div
                                        key={option.value}
                                        onClick={() => !isProcessing && setDescriptionTone(option.value)}
                                        style={{
                                            flex: 1,
                                            padding: '12px 14px',
                                            borderRadius: 8,
                                            border: `1.5px solid ${descriptionTone === option.value ? token.colorPrimary : token.colorBorder}`,
                                            background: descriptionTone === option.value ? token.colorPrimaryBg : 'transparent',
                                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                                            opacity: isProcessing ? 0.6 : 1,
                                            transition: 'all 0.2s ease',
                                            textAlign: 'center'
                                        }}
                                    >
                                        <Text strong style={{ color: descriptionTone === option.value ? token.colorPrimary : token.colorText, display: 'block' }}>
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
                                    : `Working on your ${labels.offeringLower}…`}
                            </Text>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                                This may take a moment.
                            </Text>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <Flex
                        vertical={!screens.sm}
                        gap={12}
                        style={{ marginTop: 24, width: '100%' }}
                    >
                        {/* Primary: Generate descriptions */}
                        <Button
                            size='large'
                            type="primary"
                            onClick={handleGenerateEmptyClick}
                            loading={isProcessing}
                            disabled={isProcessing || !canGenerateEmpty}
                            style={{ flex: 1, width: screens.sm ? undefined : '100%' }}
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
                                    style={{ width: screens.sm ? undefined : '100%' }}
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
