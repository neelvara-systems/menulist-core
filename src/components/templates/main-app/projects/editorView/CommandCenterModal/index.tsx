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
import { getProjectDefaultLanguage } from '@lib/localization/projectContent';
import { removeObjRef } from '@util/utils';
import { Button, Flex, Modal, Splitter, Typography, message as antdMessage, theme } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuHelpCircle } from 'react-icons/lu';
import type { Project } from '../../types';

const { Panel } = Splitter;

import type {
    ActiveInactivePreview,
    ActiveInactiveTarget,
    AvailabilityPreview,
    AvailabilityTarget,
    CommandCenterAction,
    ImpactSummary,
    MoveCategoryPreview,
    PricingConfig
} from '../../types/commandCenter.types';
import ActionEngine from './ActionEngine';
import ImpactPreview from './ImpactPreview';
import SelectionContext from './SelectionContext';
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
    storeName?: string;
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
    storeName,
    onClose,
    onApply,
}: CommandCenterModalProps) {
    const { token } = theme.useToken();
    const activeLang = getProjectDefaultLanguage(projectData);

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

    // ─── Undo state ───
    const undoProjectRef = useRef<Project | null>(null);
    const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Internal project tracking (for multi-action session) ───
    const [internalProject, setInternalProject] = useState<Project>(projectData);

    // Reset on open
    useEffect(() => {
        if (open) {
            setSelectedIds(new Set());
            setActiveAction(null);
            setLastApplyMessage(null);
            setPricingPreview(null);
            setPricingConfig(null);
            setAvailabilityPreview(null);
            setAvailabilityTarget(null);
            setMoveCategoryPreview(null);
            setMoveCategoryDestination(null);
            setActiveInactivePreview(null);
            setActiveInactiveTarget(null);
            undoProjectRef.current = null;
            setInternalProject(removeObjRef(projectData));
        }
    }, [open]);

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
        return false;
    }, [activeAction, pricingConfig, availabilityTarget, moveCategoryDestination, activeInactiveTarget]);

    // Can apply current action?
    const canApply = useMemo(() => {
        if (selectedIds.size === 0) return false;
        if (activeAction === 'pricing') return pricingConfig !== null;
        if (activeAction === 'availability') return availabilityTarget !== null && (availabilityPreview?.itemsToChange ?? 0) > 0;
        if (activeAction === 'moveCategory') return moveCategoryDestination !== null && (moveCategoryPreview?.itemsToMove ?? 0) > 0;
        if (activeAction === 'activeInactive') return activeInactiveTarget !== null && (activeInactivePreview?.itemsToChange ?? 0) > 0;
        return false;
    }, [selectedIds.size, activeAction, pricingConfig, availabilityTarget, availabilityPreview, moveCategoryDestination, moveCategoryPreview, activeInactiveTarget, activeInactivePreview]);

    // ─── Apply logic ───

    const handleApply = useCallback(() => {
        if (!canApply) return;

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
            destroyOnClose
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
                                onClick={() => {
                                    Modal.confirm({
                                        title: 'Apply changes?',
                                        content: activeAction === 'pricing'
                                            ? `Apply price update to ${pricingPreview?.itemsAffected || selectedItems.length} items?`
                                            : activeAction === 'availability'
                                                ? `Update availability for ${availabilityPreview?.itemsToChange || selectedItems.length} items?`
                                                : activeAction === 'activeInactive'
                                                    ? `${activeInactiveTarget === 'show' ? 'Show' : 'Hide'} ${activeInactivePreview?.itemsToChange || selectedItems.length} items?`
                                                    : `Move ${moveCategoryPreview?.itemsToMove || selectedItems.length} items?`,
                                        okText: 'Apply',
                                        cancelText: 'Cancel',
                                        onOk: handleApply,
                                    });
                                }}
                            >
                                Apply Changes
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
                            hasSelection={selectedIds.size > 0}
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
                        lastApplyMessage={lastApplyMessage}
                        selectedItems={selectedItems}
                    />
                </Panel>
            </Splitter>
        </Modal>
    );
}
