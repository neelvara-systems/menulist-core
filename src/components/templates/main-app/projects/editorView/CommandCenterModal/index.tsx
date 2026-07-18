/**
 * CommandCenterModal — Menu Command Center
 *
 * Multi-action bulk operations modal with 3-panel layout:
 * LEFT: SelectionContext (item/category selection)
 * CENTER: ActionEngine (action list → action-specific UI)
 * RIGHT: ImpactPreview (live computed preview)
 *
 * All changes computed locally on Project clone.
 * Single onApply(updatedProject) callback → Editor → syncChanges() → Firebase.
 *
 * @see __docs__/menu-command-center/menu-command-center_impl.md
 */

import type { InheritanceState } from '@type/multiOutlet.types';
import { assertProjectUpdateSucceeded, updateProjectMetadata } from '@database/projects';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { getProjectDescriptionContentLength, getProjectDescriptionTone } from '@lib/ai/projectAIPreferences';
import { getMissingProjectPublicContentGaps, getProjectDefaultLanguage } from '@lib/localization/projectContent';
import { getCanonicalProjectSourceLanguage } from '@lib/localization/languagePolicy';
import { applyMissingCategoryIconsToProject, countMissingCategoryIcons } from '@lib/menu/categoryIconRepair';
import { hasPublicItemDisplayPrice } from '@lib/pricing/publicItemPricePresentation';
import { removeObjRef } from '@util/utils';
import { Button, Flex, Modal, Splitter, Typography, message as antdMessage, theme } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuHelpCircle } from 'react-icons/lu';
import { AICapacityError } from '@services/ai/capacityError';
import translateProjectPublicContent from '@services/ai/projectPublicContent/translateProjectPublicContent';
import type { Project, ProjectSummaryData } from '../../types';

const { Panel } = Splitter;

import type {
    ActiveInactivePreview,
    ActiveInactiveTarget,
    AvailabilityPreview,
    AvailabilityTarget,
    CommandCenterAction,
    ImpactSummary,
    MoveCategoryPreview,
    PricingConfig,
    RepairMenuSummary
} from '../../types/commandCenter.types';
import ActionEngine from './ActionEngine';
import ImpactPreview from './ImpactPreview';
import SelectionContext from './SelectionContext';
import {
    getDescriptionGenerationStats,
    runDescriptionGeneration,
} from '../descriptionGeneration.shared';
import {
    getLanguageRepairFailureCause,
    getLanguageRepairPartialProject,
    getProjectLanguageIssues,
    repairLanguageProject,
} from '../languageRepair.shared';
import {
    applyTextCaseToProject,
    type TextCaseConfig,
    type TextCasePreview,
} from '../textCase.shared';
import {
    applyBulkActiveInactive,
    applyBulkAvailability,
    applyBulkMoveCategory,
    applyBulkPricing,
    buildSelectableItems,
    buildSelectionSummary,
} from './utils/bulkOperations';

const { Text } = Typography;

interface CommandCenterModalProps {
    open: boolean;
    projectData: Project;
    isMasterLinked: boolean;
    itemStates: Record<string, InheritanceState>;
    categoryStates: Record<string, InheritanceState>;
    masterPrices: Record<string, string>;
    businessType?: string;
    storeName?: string;
    storeDetails?: any;
    allowInheritedDescriptionOverride?: boolean;
    canGenerateDescriptions?: boolean;
    initialAction?: CommandCenterAction | null;
    onClose: () => void;
    onApply: (updatedProject: Project) => void;
}

export default function CommandCenterModal({
    open,
    projectData,
    isMasterLinked,
    itemStates,
    categoryStates,
    masterPrices,
    businessType,
    storeName,
    storeDetails,
    allowInheritedDescriptionOverride = false,
    canGenerateDescriptions = false,
    initialAction = null,
    onClose,
    onApply,
}: CommandCenterModalProps) {
    const { token } = theme.useToken();
    const activeLang = getProjectDefaultLanguage(projectData);
    const currencySymbol = storeDetails?.currencySymbol || '₹';

    // ─── Selection state ───
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // ─── Action state ───
    const [activeAction, setActiveAction] = useState<CommandCenterAction | null>(null);
    const [lastApplyMessage, setLastApplyMessage] = useState<string | null>(null);

    // ─── Pricing state ───
    const [pricingPreview, setPricingPreview] = useState<ImpactSummary | null>(null);
    const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);

    // ─── Availability state ───
    const [availabilityPreview, setAvailabilityPreview] = useState<AvailabilityPreview | null>(null);
    const [availabilityTarget, setAvailabilityTarget] = useState<AvailabilityTarget | null>(null);

    // ─── Move category state ───
    const [moveCategoryPreview, setMoveCategoryPreview] = useState<MoveCategoryPreview | null>(null);
    const [moveCategoryDestination, setMoveCategoryDestination] = useState<string | null>(null);

    // ─── Active/inactive state ───
    const [activeInactivePreview, setActiveInactivePreview] = useState<ActiveInactivePreview | null>(null);
    const [activeInactiveTarget, setActiveInactiveTarget] = useState<ActiveInactiveTarget | null>(null);

    // ─── Text case state ───
    const [textCasePreview, setTextCasePreview] = useState<TextCasePreview | null>(null);
    const [textCaseConfig, setTextCaseConfig] = useState<TextCaseConfig | null>(null);

    // ─── Repair Menu state ───
    const [isRepairing, setIsRepairing] = useState(false);
    const [repairStep, setRepairStep] = useState<string | null>(null);

    // ─── Undo state ───
    const undoProjectRef = useRef<Project | null>(null);
    const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Internal project tracking (for multi-action session) ───
    const [internalProject, setInternalProject] = useState<Project>(projectData);

    // Reset on open
    useEffect(() => {
        if (open) {
            setSelectedIds(new Set());
            setActiveAction(initialAction);
            setLastApplyMessage(null);
            setPricingPreview(null);
            setPricingConfig(null);
            setAvailabilityPreview(null);
            setAvailabilityTarget(null);
            setMoveCategoryPreview(null);
            setMoveCategoryDestination(null);
            setActiveInactivePreview(null);
            setActiveInactiveTarget(null);
            setTextCasePreview(null);
            setTextCaseConfig(null);
            setIsRepairing(false);
            setRepairStep(null);
            undoProjectRef.current = null;
            setInternalProject(removeObjRef(projectData));
        }
    }, [initialAction, open]);

    // Build selectable items from current internal project state
    const allItems = useMemo(
        () => buildSelectableItems(internalProject, activeLang, itemStates, isMasterLinked),
        [internalProject, activeLang, itemStates, isMasterLinked]
    );

    // Selected items (filtered from allItems)
    const selectedItems = useMemo(
        () => allItems.filter((i) => selectedIds.has(i.id)),
        [allItems, selectedIds]
    );

    // Selection summary
    const summary = useMemo(
        () => buildSelectionSummary(selectedItems, isMasterLinked, storeName),
        [selectedItems, isMasterLinked, storeName]
    );

    const descriptionGovernance = useMemo(() => (
        isMasterLinked && itemStates && !allowInheritedDescriptionOverride
            ? { itemStates }
            : undefined
    ), [allowInheritedDescriptionOverride, isMasterLinked, itemStates]);
    const translationGovernance = useMemo(() => (
        isMasterLinked ? { categoryStates, itemStates } : undefined
    ), [categoryStates, isMasterLinked, itemStates]);

    const descriptionStats = useMemo(
        () => getDescriptionGenerationStats(internalProject, null, descriptionGovernance),
        [descriptionGovernance, internalProject]
    );

    const repairLanguageIssues = useMemo(() => {
        if (!canGenerateDescriptions) return [];
        const sourceLanguageCode = getCanonicalProjectSourceLanguage(internalProject.languages);
        return getProjectLanguageIssues(internalProject, sourceLanguageCode, translationGovernance);
    }, [canGenerateDescriptions, internalProject, translationGovernance]);

    const languagesNeedingRepair = useMemo(
        () => repairLanguageIssues.filter((issue) => issue.total > 0),
        [repairLanguageIssues]
    );

    const projectPublicContentGaps = useMemo(
        () => canGenerateDescriptions
            ? getMissingProjectPublicContentGaps(internalProject, internalProject.languages)
            : [],
        [canGenerateDescriptions, internalProject]
    );

    const projectPublicContentLanguagesNeedingRepair = useMemo(
        () => Array.from(new Set(projectPublicContentGaps.map((gap) => gap.languageCode))),
        [projectPublicContentGaps]
    );

    const manualReviewSummary = useMemo(() => {
        let missingImages = 0;
        let missingPrices = 0;

        internalProject.files?.forEach((file) => {
            const data = file.extractedData?.data;
            if (!data) return;
            const categoryActiveMap = new Map<string, boolean>();
            data.categories?.forEach((category) => {
                categoryActiveMap.set(category.id, category.active !== false);
            });

            data.items?.forEach((item) => {
                const categoryActive = categoryActiveMap.get(item.category) !== false;
                if (item.active === false || !categoryActive) return;

                if (!hasPublicItemDisplayPrice(item)) {
                    missingPrices += 1;
                }

                const imageUrl = item.images?.[0]?.url;
                if (typeof imageUrl !== 'string' || imageUrl.trim().length === 0) {
                    missingImages += 1;
                }
            });
        });

        return { missingImages, missingPrices };
    }, [internalProject]);

    const repairSummary = useMemo<RepairMenuSummary>(() => {
        const languageIssueCount = languagesNeedingRepair.reduce((total, issue) => total + issue.total, 0);
        const categoryIconsToRepair = countMissingCategoryIcons(internalProject);
        const descriptionsToGenerate = canGenerateDescriptions
            ? descriptionStats.itemsWithoutDescriptions
            : 0;
        const fixableNowCount = languageIssueCount
            + descriptionsToGenerate
            + projectPublicContentGaps.length
            + categoryIconsToRepair;
        const manualReviewCount = manualReviewSummary.missingImages + manualReviewSummary.missingPrices;

        return {
            categoryIconsToRepair,
            descriptionsToGenerate,
            fixableNowCount,
            languageIssueCount,
            languagesToRepair: languagesNeedingRepair.length,
            manualReviewCount,
            missingImages: manualReviewSummary.missingImages,
            missingPrices: manualReviewSummary.missingPrices,
            projectContentIssueCount: projectPublicContentGaps.length,
            projectContentLanguagesToRepair: projectPublicContentLanguagesNeedingRepair.length,
        };
    }, [
        canGenerateDescriptions,
        descriptionStats.itemsWithoutDescriptions,
        internalProject,
        languagesNeedingRepair,
        manualReviewSummary.missingImages,
        manualReviewSummary.missingPrices,
        projectPublicContentGaps.length,
        projectPublicContentLanguagesNeedingRepair.length,
    ]);

    // ─── Action handlers ───

    const handleActionSelect = (action: CommandCenterAction) => {
        setActiveAction(action);
        setLastApplyMessage(null);
        // Clear previous action state
        setPricingPreview(null);
        setPricingConfig(null);
        setAvailabilityPreview(null);
        setAvailabilityTarget(null);
        setMoveCategoryPreview(null);
        setMoveCategoryDestination(null);
        setActiveInactivePreview(null);
        setActiveInactiveTarget(null);
        setTextCasePreview(null);
        setTextCaseConfig(null);
        setRepairStep(null);
    };

    const handleBack = () => {
        if (hasActionInProgress) {
            Modal.confirm({
                title: 'Discard current action?',
                icon: <LuHelpCircle />,
                content: 'You have unsaved changes in this action. Discard?',
                okText: 'Discard',
                okType: 'danger',
                cancelText: 'Keep Editing',
                onOk: () => {
                    setActiveAction(null);
                },
            });
        } else {
            setActiveAction(null);
        }
    };

    // Check if user has entered values in current action
    const hasActionInProgress = useMemo(() => {
        if (activeAction === 'pricing') return pricingConfig !== null;
        if (activeAction === 'availability') return availabilityTarget !== null;
        if (activeAction === 'moveCategory') return moveCategoryDestination !== null;
        if (activeAction === 'activeInactive') return activeInactiveTarget !== null;
        if (activeAction === 'textCase') return textCaseConfig !== null;
        if (activeAction === 'repairMenu') return isRepairing;
        return false;
    }, [activeAction, pricingConfig, availabilityTarget, moveCategoryDestination, activeInactiveTarget, textCaseConfig, isRepairing]);

    // Can apply current action?
    const canApply = useMemo(() => {
        if (activeAction === 'repairMenu') return repairSummary.fixableNowCount > 0 && !isRepairing;
        if (selectedIds.size === 0) return false;
        if (activeAction === 'pricing') return pricingConfig !== null;
        if (activeAction === 'availability') return availabilityTarget !== null && (availabilityPreview?.itemsToChange ?? 0) > 0;
        if (activeAction === 'moveCategory') return moveCategoryDestination !== null && (moveCategoryPreview?.itemsToMove ?? 0) > 0;
        if (activeAction === 'activeInactive') return activeInactiveTarget !== null && (activeInactivePreview?.itemsToChange ?? 0) > 0;
        if (activeAction === 'textCase') return textCaseConfig !== null && (textCasePreview?.totalFields ?? 0) > 0;
        return false;
    }, [selectedIds.size, activeAction, pricingConfig, availabilityTarget, availabilityPreview, moveCategoryDestination, moveCategoryPreview, activeInactiveTarget, activeInactivePreview, textCaseConfig, textCasePreview, repairSummary.fixableNowCount, isRepairing]);

    const handleRepairMenuApply = useCallback(async () => {
        if (repairSummary.fixableNowCount === 0 || isRepairing) return;

        setIsRepairing(true);
        setRepairStep('Preparing repair');

        let updated = removeObjRef(internalProject);
        let completedLanguageRepairs = 0;
        try {
            undoProjectRef.current = null;
            const projectMetadataTranslationUpdate: Partial<ProjectSummaryData> = {};
            const sourceLanguageCode = getCanonicalProjectSourceLanguage(updated.languages);
            let repairedCategoryIconCount = 0;

            if (repairSummary.categoryIconsToRepair > 0) {
                setRepairStep('Adding category icons');
                const categoryIconRepair = applyMissingCategoryIconsToProject(
                    updated,
                    businessType || storeDetails?.businessType,
                    storeDetails?.businessCategory,
                );
                updated = categoryIconRepair.project;
                repairedCategoryIconCount = categoryIconRepair.updatedCount;
            }

            for (const issue of languagesNeedingRepair) {
                setRepairStep(`Repairing ${issue.code.toUpperCase()} text`);
                updated = await repairLanguageProject(
                    updated,
                    issue.code,
                    sourceLanguageCode,
                    translationGovernance,
                );
                completedLanguageRepairs += 1;
            }

            if (repairSummary.descriptionsToGenerate > 0) {
                setRepairStep('Adding missing descriptions');
                updated = await runDescriptionGeneration({
                    action: AI_ACTIONS_TYPES.ADD_DESCRIPTION,
                    contentLength: getProjectDescriptionContentLength(updated, businessType || storeDetails?.businessType, storeDetails?.businessCategory),
                    tone: getProjectDescriptionTone(updated, businessType || storeDetails?.businessType, storeDetails?.businessCategory),
                    projectData: updated,
                    governance: descriptionGovernance,
                    skipPersist: true,
                });
            }

            if (projectPublicContentLanguagesNeedingRepair.length > 0) {
                setRepairStep('Repairing project details');
                const translatedProjectContent = await translateProjectPublicContent({
                    projectDetails: updated,
                    projectId: updated.projectId,
                    storeDetails,
                    targetLanguageCodes: projectPublicContentLanguagesNeedingRepair,
                });

                if (translatedProjectContent) {
                    if (translatedProjectContent.name) {
                        updated.name = translatedProjectContent.name as any;
                        projectMetadataTranslationUpdate.name = translatedProjectContent.name;
                    }
                    if (translatedProjectContent.description) {
                        updated.description = translatedProjectContent.description as any;
                        projectMetadataTranslationUpdate.description = translatedProjectContent.description;
                    }
                    if (translatedProjectContent.specialNote) {
                        updated.menuSettings = {
                            ...(updated.menuSettings || {}),
                            specialNote: translatedProjectContent.specialNote,
                        };
                    }
                    if (translatedProjectContent.specialMenuDisplayName) {
                        updated._specialMenu = {
                            ...(updated._specialMenu || {}),
                            displayName: translatedProjectContent.specialMenuDisplayName,
                        };
                        (updated as any).specialMenuDisplayName = translatedProjectContent.specialMenuDisplayName;
                        projectMetadataTranslationUpdate.specialMenuDisplayName = translatedProjectContent.specialMenuDisplayName;
                    }
                }
            }

            if (Object.keys(projectMetadataTranslationUpdate).length > 0) {
                const metadataTranslationResult = await updateProjectMetadata(updated.projectId, projectMetadataTranslationUpdate);
                assertProjectUpdateSucceeded(
                    metadataTranslationResult,
                    updated.projectId,
                    'command_center_project_metadata_translation_update_rejected',
                );
            }

            const repairSummaryParts = [
                repairSummary.languageIssueCount > 0
                    ? `${repairSummary.languageIssueCount} language issues`
                    : null,
                repairSummary.descriptionsToGenerate > 0
                    ? `${repairSummary.descriptionsToGenerate} descriptions`
                    : null,
                repairSummary.projectContentIssueCount > 0
                    ? `${repairSummary.projectContentIssueCount} project detail${repairSummary.projectContentIssueCount !== 1 ? 's' : ''}`
                    : null,
                repairedCategoryIconCount > 0
                    ? `${repairedCategoryIconCount} category icon${repairedCategoryIconCount !== 1 ? 's' : ''}`
                    : null,
                repairSummary.missingPrices > 0
                    ? `${repairSummary.missingPrices} prices need review`
                    : null,
            ].filter(Boolean) as string[];
            const successMessage = repairSummaryParts.length > 0
                ? repairSummaryParts.join(' · ')
                : 'Menu repair finished';

            setInternalProject(updated);
            onApply(updated);
            setActiveAction(null);
            setLastApplyMessage(successMessage);
            antdMessage.success('Menu repair finished.');
        } catch (error) {
            const partialProject = getLanguageRepairPartialProject(error);
            if (partialProject) updated = partialProject;
            if (partialProject || completedLanguageRepairs > 0) {
                setInternalProject(updated);
                onApply(updated);
                setActiveAction(null);
                setLastApplyMessage('Repair stopped. Completed translations were kept.');
                antdMessage.warning('Repair stopped. Completed translations were kept and will be saved.');
                return;
            }
            if (getLanguageRepairFailureCause(error) instanceof AICapacityError) {
                antdMessage.info('Get more enhancements to continue. Visit Billing to add an enhancement pack.');
            } else {
                antdMessage.error('Could not repair menu.');
            }
        } finally {
            setRepairStep(null);
            setIsRepairing(false);
        }
    }, [
        businessType,
        descriptionGovernance,
        descriptionStats.itemsWithoutDescriptions,
        internalProject,
        isRepairing,
        languagesNeedingRepair,
        onApply,
        projectPublicContentLanguagesNeedingRepair,
        repairSummary.descriptionsToGenerate,
        repairSummary.fixableNowCount,
        repairSummary.categoryIconsToRepair,
        repairSummary.languageIssueCount,
        repairSummary.missingPrices,
        repairSummary.projectContentIssueCount,
        storeDetails,
        translationGovernance,
    ]);

    // ─── Apply logic ───

    const handleApply = useCallback(async () => {
        if (!canApply) return;

        if (activeAction === 'repairMenu') {
            await handleRepairMenuApply();
            return;
        }

        const editableIds = new Set(
            selectedItems.filter((i) => !i.isLocked).map((i) => i.id)
        );

        let updatedProject: Project;
        let successMessage: string;

        if (activeAction === 'pricing' && pricingConfig) {
            // Store for undo
            undoProjectRef.current = removeObjRef(internalProject);
            updatedProject = applyBulkPricing(internalProject, editableIds, pricingConfig);
            successMessage = `Prices updated for ${pricingPreview?.itemsAffected || editableIds.size} items`;
        } else if (activeAction === 'availability' && availabilityTarget) {
            undoProjectRef.current = removeObjRef(internalProject);
            updatedProject = applyBulkAvailability(internalProject, editableIds, availabilityTarget);
            successMessage = `Availability updated for ${availabilityPreview?.itemsToChange || editableIds.size} items`;
        } else if (activeAction === 'moveCategory' && moveCategoryDestination) {
            undoProjectRef.current = removeObjRef(internalProject);
            updatedProject = applyBulkMoveCategory(internalProject, editableIds, moveCategoryDestination);
            successMessage = `${moveCategoryPreview?.itemsToMove || editableIds.size} items moved`;
        } else if (activeAction === 'activeInactive' && activeInactiveTarget) {
            undoProjectRef.current = removeObjRef(internalProject);
            updatedProject = applyBulkActiveInactive(internalProject, editableIds, activeInactiveTarget);
            const verb = activeInactiveTarget === 'show' ? 'shown' : 'hidden';
            successMessage = `${activeInactivePreview?.itemsToChange || editableIds.size} items ${verb}`;
        } else if (activeAction === 'textCase' && textCaseConfig) {
            undoProjectRef.current = removeObjRef(internalProject);
            updatedProject = applyTextCaseToProject(internalProject, textCaseConfig);
            successMessage = `Text case updated for ${textCasePreview?.totalFields || 0} values`;
        } else {
            return;
        }

        // Update internal project for multi-action session
        setInternalProject(updatedProject);

        // Send to Editor for Firebase save
        onApply(updatedProject);

        // Reset action state (back to action list)
        setActiveAction(null);
        setLastApplyMessage(successMessage);

        // Show undo toast
        const key = `cmd-center-undo-${Date.now()}`;
        antdMessage.success({
            content: (
                <Flex align="center" gap={12}>
                    <Text>{successMessage}</Text>
                    <Button
                        type="link"
                        size="small"
                        onClick={() => {
                            if (undoProjectRef.current) {
                                setInternalProject(removeObjRef(undoProjectRef.current));
                                onApply(removeObjRef(undoProjectRef.current));
                                undoProjectRef.current = null;
                                antdMessage.destroy(key);
                                antdMessage.info('Changes reverted');
                                setLastApplyMessage('Changes reverted successfully');
                            }
                        }}
                        style={{ padding: 0 }}
                    >
                        Undo
                    </Button>
                </Flex>
            ),
            key,
            duration: 30,
        });

        // Clear undo after 30 seconds
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => {
            undoProjectRef.current = null;
        }, 30000);
    }, [
        canApply,
        activeAction,
        selectedItems,
        internalProject,
        pricingConfig,
        pricingPreview,
        availabilityTarget,
        availabilityPreview,
        moveCategoryDestination,
        moveCategoryPreview,
        activeInactiveTarget,
        activeInactivePreview,
        textCaseConfig,
        textCasePreview,
        handleRepairMenuApply,
        onApply,
    ]);

    // ─── Close handler ───

    const handleClose = () => {
        if (hasActionInProgress) {
            Modal.confirm({
                title: 'Discard changes?',
                icon: <LuHelpCircle />,
                content: 'You have an action in progress. Close without applying?',
                okText: 'Discard & Close',
                okType: 'danger',
                cancelText: 'Keep Editing',
                onOk: onClose,
            });
        } else {
            onClose();
        }
    };

    // Cleanup undo timer on unmount
    useEffect(() => {
        return () => {
            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        };
    }, []);

    return (
        <Modal
            centered
            title={
                <Flex vertical gap={2}>
                    <Text strong style={{ fontSize: 16 }}>
                        Menu Command Center
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Select items, choose an action, preview changes, and apply
                    </Text>
                </Flex>
            }
            open={open}
            onCancel={handleClose}
            closable
            maskClosable={false}
            destroyOnHidden
            styles={{
                mask: { backdropFilter: 'blur(6px)' },
                body: { padding: 0, height: '70vh' },
            }}
            width="85vw"
            style={{ maxWidth: 1400 }}
            footer={
                <Flex justify="space-between" align="center" style={{ padding: '0 8px' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {selectedIds.size > 0
                            ? `${selectedIds.size} items selected`
                            : activeAction === 'repairMenu' || activeAction === 'textCase'
                                ? 'Whole menu action'
                                : 'Select items to get started'}
                    </Text>
                    <Flex gap={8}>
                        {activeAction && (
                            <Button onClick={handleBack}>
                                Cancel action
                            </Button>
                        )}
                        <Button onClick={handleClose}>
                            Close
                        </Button>
                        {activeAction && (
                            <Button
                                type="primary"
                                disabled={!canApply}
                                loading={activeAction === 'repairMenu' && isRepairing}
                                onClick={() => {
                                    const repairConfirmParts = [
                                        repairSummary.languagesToRepair > 0
                                            ? `rebuild ${repairSummary.languagesToRepair} language area${repairSummary.languagesToRepair !== 1 ? 's' : ''}`
                                            : null,
                                        repairSummary.descriptionsToGenerate > 0
                                            ? `add ${repairSummary.descriptionsToGenerate} missing description${repairSummary.descriptionsToGenerate !== 1 ? 's' : ''}`
                                            : null,
                                        repairSummary.projectContentIssueCount > 0
                                            ? `fill ${repairSummary.projectContentIssueCount} project detail translation${repairSummary.projectContentIssueCount !== 1 ? 's' : ''}`
                                            : null,
                                        repairSummary.categoryIconsToRepair > 0
                                            ? `add ${repairSummary.categoryIconsToRepair} category icon${repairSummary.categoryIconsToRepair !== 1 ? 's' : ''}`
                                            : null,
                                    ].filter(Boolean);
                                    Modal.confirm({
                                        title: activeAction === 'repairMenu' ? 'Repair menu?' : 'Apply changes?',
                                        content: activeAction === 'repairMenu'
                                            ? `This will ${repairConfirmParts.join(', ')}. Prices and photos will stay unchanged.`
                                            : activeAction === 'textCase'
                                                ? `Apply text case cleanup to ${textCasePreview?.totalFields || 0} text values?`
                                                : activeAction === 'pricing'
                                                    ? `Apply price update to ${pricingPreview?.itemsAffected || selectedItems.length} items?`
                                                    : activeAction === 'availability'
                                                        ? `Update availability for ${availabilityPreview?.itemsToChange || selectedItems.length} items?`
                                                        : activeAction === 'activeInactive'
                                                            ? `${activeInactiveTarget === 'show' ? 'Show' : 'Hide'} ${activeInactivePreview?.itemsToChange || selectedItems.length} items?`
                                                            : `Move ${moveCategoryPreview?.itemsToMove || selectedItems.length} items?`,
                                        okText: activeAction === 'repairMenu' ? 'Repair Menu' : 'Apply',
                                        cancelText: 'Cancel',
                                        onOk: () => handleApply(),
                                    });
                                }}
                            >
                                {activeAction === 'repairMenu' ? 'Repair Menu' : 'Apply Changes'}
                            </Button>
                        )}
                    </Flex>
                </Flex>
            }
        >
            <Splitter style={{ height: '100%' }}>
                {/* LEFT: Selection Context */}
                <Panel
                    defaultSize={280}
                    min={240}
                    max={500}
                    style={{ overflow: 'hidden' }}
                >
                    <SelectionContext
                        allItems={allItems}
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
                        summary={summary}
                        currencySymbol={currencySymbol}
                    />
                </Panel>

                {/* CENTER: Action Engine */}
                <Panel
                    defaultSize="50%"
                    min={350}
                    max={700}
                >
                    <Flex
                        vertical
                        style={{
                            height: '100%',
                            borderRight: `1px solid ${token.colorBorderSecondary}`,
                            overflow: 'hidden',
                        }}
                    >
                        <ActionEngine
                            activeAction={activeAction}
                            onActionSelect={handleActionSelect}
                            onBack={handleBack}
                            selectedItems={selectedItems}
                            projectData={internalProject}
                            currencySymbol={currencySymbol}
                            hasSelection={selectedIds.size > 0}
                            repairSummary={repairSummary}
                            repairLanguageIssues={repairLanguageIssues}
                            isRepairing={isRepairing}
                            repairStep={repairStep}
                            onTextCasePreview={setTextCasePreview}
                            onTextCaseConfigReady={setTextCaseConfig}
                            onPricingPreview={setPricingPreview}
                            onPricingConfigReady={setPricingConfig}
                            onAvailabilityPreview={setAvailabilityPreview}
                            onAvailabilityConfigReady={setAvailabilityTarget}
                            onMoveCategoryPreview={setMoveCategoryPreview}
                            onMoveCategoryConfigReady={setMoveCategoryDestination}
                            onActiveInactivePreview={setActiveInactivePreview}
                            onActiveInactiveConfigReady={setActiveInactiveTarget}
                        />
                    </Flex>
                </Panel>

                {/* RIGHT: Impact Preview */}
                <Panel
                    defaultSize={320}
                    min={250}
                    max={500}
                    style={{ overflow: 'hidden' }}
                >
                    <ImpactPreview
                        activeAction={activeAction}
                        pricingPreview={pricingPreview}
                        availabilityPreview={availabilityPreview}
                        moveCategoryPreview={moveCategoryPreview}
                        activeInactivePreview={activeInactivePreview}
                        currencySymbol={currencySymbol}
                        repairSummary={repairSummary}
                        textCasePreview={textCasePreview}
                        lastApplyMessage={lastApplyMessage}
                        selectedItems={selectedItems}
                    />
                </Panel>
            </Splitter>
        </Modal>
    );
}
