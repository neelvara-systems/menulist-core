import { AI_ACTIONS_TYPES } from '@constant/common';
import GlobalLanguagesList from '@data/languages';
import { updateProject } from '@database/projects';
import { useAppDispatch } from '@hook/useAppDispatch';
import { logger } from '@lib/monitoring/logger';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { AICapacityError } from '@services/ai/capacityError';
import { addDescription, DescriptionGovernanceOptions } from '@services/ai/description/descriptionUtils';
import { InheritanceState } from '@type/multiOutlet.types';
import { removeObjRef } from '@util/utils';
import { message as antdMessage, Button, Flex, Modal, Popconfirm, theme, Typography } from 'antd';
import { motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';
import { LuCheck, LuRefreshCcw } from 'react-icons/lu';
import { ExtractedDataItem, Project } from '../types';

const { Text } = Typography;

// P1.1: Simplified to 2 length options - Standard/Detailed only
type ContentLength = "Standard" | "Detailed";
// P1.1: Tone is now internal only - always Professional
type ToneType = "Professional";
const DEFAULT_TONE: ToneType = "Professional";

// P1.1: Simplified length options (2 instead of 3) - Authority UX copy
const LENGTH_OPTIONS: { value: ContentLength; label: string; description: string }[] = [
    { value: 'Standard', label: 'Standard', description: 'One clear sentence suitable for most menus' },
    { value: 'Detailed', label: 'Detailed', description: 'Rich, expressive descriptions for premium items' },
];

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
    const [contentLength, setContentLength] = useState<ContentLength>('Standard');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedCount, setProcessedCount] = useState(0);
    const [totalFiles, setTotalFiles] = useState(0);

    // Calculate affected items count (filtered by governance for outlets)
    const { itemsCount, itemsWithDescriptions, itemsWithoutDescriptions } = useMemo(() => {
        let total = 0;
        let withDesc = 0;
        let withoutDesc = 0;

        const filesToCheck = modalData.sourceFile
            ? projectData.files?.filter(f => f.uid === modalData.sourceFile.uid)
            : projectData.files;

        filesToCheck?.forEach(file => {
            const items = file.extractedData?.data?.items || [];
            items.forEach(item => {
                // Multi-outlet: Only count local-only items for outlets
                if (governance?.itemStates && governance.itemStates[item.id] !== 'local-only') {
                    return; // Skip inherited/overridden items for outlets
                }
                total++;
                const hasDescription = item.description &&
                    Object.values(item.description).some(desc => desc && String(desc).trim().length > 0);
                if (hasDescription) {
                    withDesc++;
                } else {
                    withoutDesc++;
                }
            });
        });

        return { itemsCount: total, itemsWithDescriptions: withDesc, itemsWithoutDescriptions: withoutDesc };
    }, [projectData, modalData.sourceFile, governance]);

    // P1.4: Count items with manual descriptions (protected from refresh) - filtered by governance
    const { manualDescriptionCount, aiDescriptionCount } = useMemo(() => {
        let manual = 0;
        let ai = 0;
        const filesToCheck = modalData.sourceFile
            ? projectData.files?.filter(f => f.uid === modalData.sourceFile.uid)
            : projectData.files;

        filesToCheck?.forEach(file => {
            const items = file.extractedData?.data?.items || [];
            items.forEach((item: ExtractedDataItem) => {
                // Multi-outlet: Only count local-only items for outlets
                if (governance?.itemStates && governance.itemStates[item.id] !== 'local-only') {
                    return; // Skip inherited/overridden items for outlets
                }
                if (item.descriptionSource === 'manual') {
                    manual++;
                } else if (item.description && Object.values(item.description).some(d => d && String(d).trim().length > 0)) {
                    ai++;
                }
            });
        });
        return { manualDescriptionCount: manual, aiDescriptionCount: ai };
    }, [projectData, modalData.sourceFile, governance]);

    const handleDescriptionRequest = async (action: string, contentLength: "Standard" | "Detailed") => {
        setIsProcessing(true);
        setProcessedCount(0);
        dispatch(startLoader("adding description"));

        try {
            let prevData = removeObjRef(projectData);
            const filesToProcess = prevData.files?.filter(f =>
                f.extractedData?.data && (modalData.sourceFile ? modalData.sourceFile.uid === f.uid : true)
            ) || [];

            setTotalFiles(filesToProcess.length);

            if (prevData.files) {
                let processedFiles = 0;
                for (const file of prevData.files) {
                    if (file.extractedData?.data && (modalData.sourceFile ? modalData.sourceFile.uid === file.uid : true)) {
                        setFileProcessingId(file.uid);
                        const sourceLanguage = GlobalLanguagesList.find(gl => gl.code === (prevData.languages?.[0] || 'en'));
                        const targetLanguages = prevData.languages.map(lang => GlobalLanguagesList.find(gl => gl.code === lang));
                        // P1.1: Use DEFAULT_TONE internally (keywords removed per doctrine - reintroduces prompting behavior)
                        // Multi-outlet: Pass governance to filter out inherited/overridden items
                        const { updatedProject, message: resultMessage, messageType } = await addDescription(
                            prevData, file, targetLanguages, sourceLanguage, action, contentLength, DEFAULT_TONE, governance
                        );
                        if (messageType && resultMessage) {
                            antdMessage[messageType as 'success' | 'error' | 'info' | 'warning'](resultMessage);
                        }
                        prevData = updatedProject;
                        setActiveProject(updatedProject);
                        setFileProcessingId(null);
                        processedFiles++;
                        setProcessedCount(processedFiles);
                    }
                }
            }
            // Save to database immediately after generation
            await updateProject({ ...prevData, projectId: prevData.projectId });

            dispatch(stopLoader("adding description"));
            setActiveProject(removeObjRef(prevData));
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
                                {LENGTH_OPTIONS.map((option) => (
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
