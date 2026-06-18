'use client';

import { applyAiMenuManagerProjectPatch } from '@lib/ai-menu-manager/actions/projectPatches';
import { getAiMenuManagerCardEditPrompt } from '@lib/ai-menu-manager/cardEditPrompt';
import {
    buildAiMenuManagerComposerPrompt,
    canUseAiMenuManagerComposerContext,
    filterAiMenuManagerComposerEntities,
    getAiMenuManagerComposerContextData,
    getAiMenuManagerComposerContextLabel,
    type AiMenuManagerComposerContext,
    type AiMenuManagerComposerTarget,
} from '@lib/ai-menu-manager/composerContext';
import {
    getAiMenuManagerProjectPromptGroups,
    getAiMenuManagerPromptText,
    getAiMenuManagerStarterSuggestions,
    type AiMenuManagerPromptKind,
    type AiMenuManagerPromptSuggestion,
} from '@lib/ai-menu-manager/projectPromptHints';
import {
    buildAiMenuManagerClientExecutionDirective,
    cancelAiMenuManagerClientOperation,
    completeAiMenuManagerClientOperation,
    getAiMenuManagerClientInbox,
    sendAiMenuManagerCommand,
} from '@database/aiMenuManager';
import { updateProjectWithoutLoader } from '@database/projects';
import type {
    AiMenuManagerCardPayload,
    AiMenuManagerPendingOperation,
    AiMenuManagerReceipt,
    AiMenuManagerSessionDoc,
} from '@type/aiMenuManager';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    LuCheck,
    LuCircleSlash,
    LuChevronLeft,
    LuChevronRight,
    LuExternalLink,
    LuEye,
    LuImage,
    LuIndianRupee,
    LuMegaphone,
    LuMessageSquare,
    LuPalette,
    LuRefreshCw,
    LuSend,
    LuSlidersHorizontal,
    LuSparkles,
    LuUpload,
    LuX,
} from 'react-icons/lu';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { ProjectSelectorTrigger, type ProjectSelectorItem } from '../../shared/ProjectSelector';
import { theme } from 'antd';
import { Button, Card, Flex, NavBar, Popup, SearchBar, Space, Text, TextArea, Toast } from '../antd';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import MobileAiMenuCardStack from './MobileAiMenuCardStack';

const promptIconByKind: Record<AiMenuManagerPromptKind, typeof LuIndianRupee> = {
    availability: LuCircleSlash,
    content: LuMessageSquare,
    design: LuPalette,
    external: LuExternalLink,
    image: LuImage,
    import: LuUpload,
    note: LuMessageSquare,
    more: LuSparkles,
    price: LuIndianRupee,
    promote: LuMegaphone,
    publish: LuUpload,
    visibility: LuEye,
};

export default function MobileAiMenuManagerScreen({
    onBack,
}: {
    onBack?: () => void;
}) {
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const storeId = storeDetails?.storeId;
    const {
        isLoading,
        projectsList,
        selectedProject,
        selectedProjectId,
        selectedProjectSummary,
        selectProject,
        refreshProjects,
        upsertCachedProject,
    } = useMobileProjects();
    const [, setSessionId] = useState<string | null>(null);
    const [currentSession, setCurrentSession] = useState<AiMenuManagerSessionDoc | null>(null);
    const [operations, setOperations] = useState<AiMenuManagerPendingOperation[]>([]);
    const [receipts, setReceipts] = useState<AiMenuManagerReceipt[]>([]);
    const [input, setInput] = useState('');
    const [composerContext, setComposerContext] = useState<AiMenuManagerComposerContext>({
        selectedEntityIds: [],
        target: null,
    });
    const [contextSearch, setContextSearch] = useState('');
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [isContextPickerOpen, setIsContextPickerOpen] = useState(false);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState<AiMenuManagerPromptSuggestion | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [workingCardId, setWorkingCardId] = useState<string | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const sessionProjectIdRef = useRef<string | null>(null);

    const rememberSessionId = useCallback((nextSessionId: string | null | undefined, projectId: string) => {
        const normalizedSessionId = nextSessionId || null;
        sessionIdRef.current = normalizedSessionId;
        sessionProjectIdRef.current = normalizedSessionId ? projectId : null;
        setSessionId(normalizedSessionId);
    }, []);

    const getSessionIdForProject = useCallback((projectId: string) => (
        sessionProjectIdRef.current === projectId ? sessionIdRef.current || undefined : undefined
    ), []);
    const cards = useMemo(() => operations.map((operation) => operation.card), [operations]);
    const storeName = useMemo(() => (
        (storeDetails as any)?.businessName
        || (storeDetails as any)?.storeName
        || (storeDetails as any)?.name
        || 'Selected store'
    ), [storeDetails]);
    const businessType = useMemo(() => (
        (storeDetails as any)?.businessType
        || (storeDetails as any)?.businessCategory
    ), [storeDetails]);
    const storePublicContext = useMemo(() => ({
        customDomain: (storeDetails as any)?.customDomain,
        screenToken: (storeDetails as any)?.screen?.screenToken || (storeDetails as any)?.screenToken,
        subdomain: (storeDetails as any)?.subdomain,
    }), [storeDetails]);

    const promptGroups = useMemo(() => getAiMenuManagerProjectPromptGroups(selectedProject), [selectedProject]);
    const starterSuggestions = useMemo(() => getAiMenuManagerStarterSuggestions(promptGroups), [promptGroups]);
    const composerContextData = useMemo(() => getAiMenuManagerComposerContextData({
        businessType,
        project: selectedProject,
        storeName,
    }), [businessType, selectedProject, storeName]);
    const composerContextLabel = useMemo(() => getAiMenuManagerComposerContextLabel({
        data: composerContextData,
        selection: composerContext,
    }), [composerContext, composerContextData]);
    const activeComposerTarget = useMemo(() => (
        composerContextData.targets.find((entry) => entry.target === composerContext.target) || null
    ), [composerContext.target, composerContextData.targets]);
    const filteredContextEntities = useMemo(() => filterAiMenuManagerComposerEntities(
        composerContextData.entities,
        composerContext.target,
        contextSearch,
    ), [composerContext.target, composerContextData.entities, contextSearch]);
    const activeContextEntityCount = useMemo(() => (
        composerContextData.entities.filter((entity) => entity.target === composerContext.target).length
    ), [composerContext.target, composerContextData.entities]);
    const shouldShowContextSearch = Boolean(
        activeComposerTarget?.requiresEntity && (activeContextEntityCount > 8 || contextSearch.trim()),
    );

    const currentProjectSelectorItem = useMemo<ProjectSelectorItem | null>(() => {
        if (!selectedProjectId) return null;
        return {
            active: selectedProjectSummary?.active !== false,
            deleted: selectedProjectSummary?.deleted === true,
            id: selectedProjectId,
            isDefault: selectedProjectSummary?.isDefault,
            isSpecialMenu: selectedProjectSummary?.isSpecialMenu === true,
            name: selectedProjectSummary?.name || selectedProject?.name || 'Untitled menu',
            projectImage: selectedProjectSummary?.projectImage || selectedProject?.projectImage || null,
            specialMenuBaseProjectId: selectedProjectSummary?.specialMenuBaseProjectId,
            specialMenuBaseProjectName: selectedProjectSummary?.specialMenuBaseProjectId
                ? projectsList.find((project: any) => project.projectId === selectedProjectSummary.specialMenuBaseProjectId)?.name
                : undefined,
            specialMenuEndsAt: selectedProjectSummary?.specialMenuEndsAt,
            specialMenuStatus: selectedProjectSummary?.specialMenuStatus,
        };
    }, [projectsList, selectedProject, selectedProjectId, selectedProjectSummary]);

    const loadInbox = useCallback(async () => {
        if (!storeId || !selectedProjectId) return;
        try {
            const inbox = await getAiMenuManagerClientInbox({
                storeId,
                projectId: selectedProjectId,
                sessionId: getSessionIdForProject(selectedProjectId),
            });
            rememberSessionId(inbox.sessionId, selectedProjectId);
            setCurrentSession(inbox.session || null);
            setOperations(inbox.operations || []);
            setReceipts(inbox.receipts || []);
        } catch (error: any) {
            Toast.show({ content: error?.message || 'Unable to load Menu Manager' });
        }
    }, [getSessionIdForProject, rememberSessionId, selectedProjectId, storeId]);

    useEffect(() => {
        void loadInbox();
    }, [loadInbox]);

    useEffect(() => {
        setComposerContext({ selectedEntityIds: [], target: null });
        setContextSearch('');
        setIsContextPickerOpen(false);
    }, [selectedProjectId]);

    const selectComposerTarget = useCallback((target: AiMenuManagerComposerTarget) => {
        const targetConfig = composerContextData.targets.find((entry) => entry.target === target);
        setComposerContext({ selectedEntityIds: [], target });
        setContextSearch('');
        if (!targetConfig?.requiresEntity) {
            setIsContextPickerOpen(false);
        }
    }, [composerContextData.targets]);

    const clearComposerContext = useCallback(() => {
        setComposerContext({ selectedEntityIds: [], target: null });
        setContextSearch('');
    }, []);

    const toggleComposerEntity = useCallback((entityId: string) => {
        const target = composerContextData.targets.find((entry) => entry.target === composerContext.target);
        const shouldCloseAfterSelect = target?.maxSelection === 1 && !composerContext.selectedEntityIds.includes(entityId);
        setComposerContext((prev) => {
            const exists = prev.selectedEntityIds.includes(entityId);
            if (exists) {
                return {
                    ...prev,
                    selectedEntityIds: prev.selectedEntityIds.filter((id) => id !== entityId),
                };
            }
            if (target?.maxSelection === 1) {
                return { ...prev, selectedEntityIds: [entityId] };
            }
            return { ...prev, selectedEntityIds: [...prev.selectedEntityIds, entityId] };
        });
        if (shouldCloseAfterSelect) {
            setIsContextPickerOpen(false);
        }
    }, [composerContext.selectedEntityIds, composerContext.target, composerContextData.targets]);

    const pickSuggestion = useCallback((prompt: string) => {
        setInput(prompt);
        setIsContextPickerOpen(false);
        setIsSuggestionsOpen(false);
        setActiveSuggestion(null);
        clearComposerContext();
    }, [clearComposerContext]);

    const closeSuggestions = useCallback(() => {
        setIsSuggestionsOpen(false);
        setActiveSuggestion(null);
    }, []);

    const openContextPicker = useCallback(() => {
        setIsSuggestionsOpen(false);
        setActiveSuggestion(null);
        setIsContextPickerOpen(true);
    }, []);

    const openSuggestions = useCallback(() => {
        setIsContextPickerOpen(false);
        setActiveSuggestion(null);
        setIsSuggestionsOpen(true);
    }, []);

    const handleSuggestionClick = useCallback((suggestion: AiMenuManagerPromptSuggestion) => {
        if (suggestion.children?.length) {
            setActiveSuggestion(suggestion);
            return;
        }
        pickSuggestion(getAiMenuManagerPromptText(suggestion));
    }, [pickSuggestion]);

    const activateStarterSuggestion = useCallback((suggestion: AiMenuManagerPromptSuggestion) => {
        if (suggestion.children?.length) {
            setActiveSuggestion(suggestion);
            setIsContextPickerOpen(false);
            setIsSuggestionsOpen(true);
            return;
        }
        pickSuggestion(getAiMenuManagerPromptText(suggestion));
    }, [pickSuggestion]);

    const draftPrompt = useCallback((prompt: string) => {
        setInput(prompt);
        clearComposerContext();
    }, [clearComposerContext]);

    const editCard = useCallback((card: AiMenuManagerCardPayload) => {
        setInput(getAiMenuManagerCardEditPrompt(card));
        clearComposerContext();
    }, [clearComposerContext]);

    const submitPrompt = useCallback(async (prompt?: string) => {
        const rawText = (prompt ?? input).trim();
        if (!rawText) return;
        if (!canUseAiMenuManagerComposerContext({ data: composerContextData, selection: composerContext })) {
            Toast.show({ content: 'Choose the item or category first' });
            return;
        }
        const text = buildAiMenuManagerComposerPrompt({
            data: composerContextData,
            input: rawText,
            selection: composerContext,
        }).trim();
        const commandContext = composerContext.target
            ? {
                target: composerContext.target,
                selectedEntityIds: composerContext.selectedEntityIds,
            }
            : undefined;
        if (!text) return;
        if (!storeId || !selectedProjectId || !selectedProject) {
            Toast.show({ content: 'Choose a menu first' });
            return;
        }
        setSubmitting(true);
        setInput('');
        try {
            const response = await sendAiMenuManagerCommand({
                sessionId: getSessionIdForProject(selectedProjectId),
                storeId: String(storeId),
                projectId: selectedProjectId,
                project: selectedProject,
                storeName,
                businessType,
                storePublicContext,
                composerContext: commandContext,
                inputType: 'text',
                sessionSnapshot: currentSession,
                text,
            });
            clearComposerContext();
            rememberSessionId(response.sessionId, selectedProjectId);
            if (response.session) {
                setCurrentSession(response.session);
                setOperations(response.session.pendingOperations || response.operations || []);
                setReceipts(response.session.recentReceiptSummaries || []);
            } else {
                setOperations(response.operations || []);
            }
        } catch (error: any) {
            Toast.show({ content: error?.message || 'Could not prepare card' });
        } finally {
            setSubmitting(false);
        }
    }, [businessType, clearComposerContext, composerContext, composerContextData, currentSession, getSessionIdForProject, input, rememberSessionId, selectedProject, selectedProjectId, storeId, storeName, storePublicContext]);

    const approveCard = useCallback(async (card: AiMenuManagerCardPayload) => {
        if (!storeId || !selectedProject) return;
        const operation = operations.find((entry) => entry.operationId === card.cardId);
        if (!operation) {
            Toast.show({ content: 'Card no longer matches this menu' });
            return;
        }
        setWorkingCardId(card.cardId);
        try {
            if (card.kind === 'unsupported') {
                const result = await cancelAiMenuManagerClientOperation({ operation, sessionSnapshot: currentSession });
                setCurrentSession(result.session);
                setOperations(result.session.pendingOperations || []);
                setReceipts(result.session.recentReceiptSummaries || []);
                Toast.show({ content: 'No MenuList action was taken' });
                return;
            }

            if (card.kind === 'manual_task' || card.actions.includes('mark_done')) {
                const result = await completeAiMenuManagerClientOperation({
                    operation,
                    result: 'manual_task',
                    message: card.localActions?.length
                        ? `${card.title} prepared. No MenuList menu truth was changed.`
                        : undefined,
                    sessionSnapshot: currentSession,
                });
                setCurrentSession(result.session);
                setOperations(result.session.pendingOperations || []);
                setReceipts(result.session.recentReceiptSummaries || []);
                Toast.show({ content: card.localActions?.length ? 'Done' : 'Marked done', icon: 'success' });
                return;
            }

            const directive = buildAiMenuManagerClientExecutionDirective({
                operation,
                project: selectedProject,
                storeName,
                businessType,
            });

            try {
                const patchedProject = applyAiMenuManagerProjectPatch(selectedProject, directive);
                const savedProject = await updateProjectWithoutLoader(patchedProject);
                upsertCachedProject(savedProject || patchedProject);
                const result = await completeAiMenuManagerClientOperation({
                    operation,
                    result: 'executed',
                    message: `${card.title} applied.`,
                    sessionSnapshot: currentSession,
                });
                setCurrentSession(result.session);
                setOperations(result.session.pendingOperations || []);
                setReceipts(result.session.recentReceiptSummaries || []);
                Toast.show({ content: 'Menu updated', icon: 'success' });
            } catch (error: any) {
                const failedResult = await completeAiMenuManagerClientOperation({
                    operation,
                    result: 'failed',
                    message: error?.message || 'Project update failed',
                    sessionSnapshot: currentSession,
                }).catch(() => null);
                if (failedResult?.session) {
                    setCurrentSession(failedResult.session);
                    setOperations(failedResult.session.pendingOperations || []);
                    setReceipts(failedResult.session.recentReceiptSummaries || []);
                }
                throw error;
            }
        } catch (error: any) {
            Toast.show({ content: error?.message || 'Unable to apply card' });
        } finally {
            setWorkingCardId(null);
        }
    }, [businessType, currentSession, operations, selectedProject, storeId, storeName, upsertCachedProject]);

    const cancelCard = useCallback(async (card: AiMenuManagerCardPayload) => {
        if (!storeId) return;
        const operation = operations.find((entry) => entry.operationId === card.cardId);
        if (!operation) {
            setOperations((prev) => prev.filter((entry) => entry.operationId !== card.cardId));
            return;
        }
        setWorkingCardId(card.cardId);
        try {
            const result = await cancelAiMenuManagerClientOperation({ operation, sessionSnapshot: currentSession });
            setCurrentSession(result.session);
            setOperations(result.session.pendingOperations || []);
        } catch (error: any) {
            Toast.show({ content: error?.message || 'Unable to cancel card' });
        } finally {
            setWorkingCardId(null);
        }
    }, [currentSession, operations, storeId]);

    return (
        <div style={{ minHeight: '100%', background: token.colorBgLayout, color: token.colorText, paddingBottom: 24 }}>
            <NavBar
                onBack={onBack}
                right={(
                    <Button
                        aria-label="Refresh"
                        fill="none"
                        icon={<LuRefreshCw />}
                        onClick={() => {
                            void refreshProjects({ force: true, loadSelectedProject: true, showLoader: false });
                            void loadInbox();
                        }}
                    />
                )}
            >
                Menu Manager
            </NavBar>

            <Space direction="vertical" size={12} style={{ width: '100%', padding: 16 }}>
                <ProjectSelectorTrigger
                    clickable={!isLoading && projectsList.length > 1}
                    currentProject={currentProjectSelectorItem}
                    helperText="Actions apply only to this selected menu."
                    onClick={!isLoading && projectsList.length > 1 ? () => setIsProjectSelectorOpen(true) : undefined}
                />

                <Card>
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        {!cards.length && !receipts.length && starterSuggestions.length ? (
                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                <div>
                                    <Text strong style={{ display: 'block', fontSize: 16 }}>What should change?</Text>
                                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                        Start from a draft, or type your own message.
                                    </Text>
                                </div>
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                    {starterSuggestions.map((suggestion) => {
                                        const Icon = promptIconByKind[suggestion.kind];
                                        return (
                                            <button
                                                key={suggestion.label}
                                                onClick={() => activateStarterSuggestion(suggestion)}
                                                style={{
                                                    alignItems: 'center',
                                                    background: token.colorFillTertiary,
                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                    borderRadius: 16,
                                                    color: token.colorText,
                                                    display: 'flex',
                                                    gap: 12,
                                                    minHeight: 58,
                                                    padding: '12px',
                                                    textAlign: 'left',
                                                    width: '100%',
                                                }}
                                                type="button"
                                            >
                                                <span
                                                    style={{
                                                        alignItems: 'center',
                                                        background: token.colorBgContainer,
                                                        borderRadius: 12,
                                                        color: token.colorPrimary,
                                                        display: 'inline-flex',
                                                        flexShrink: 0,
                                                        height: 36,
                                                        justifyContent: 'center',
                                                        width: 36,
                                                    }}
                                                >
                                                    <Icon size={18} />
                                                </span>
                                                <span style={{ flex: 1, minWidth: 0 }}>
                                                    <Text strong style={{ display: 'block' }}>{suggestion.label}</Text>
                                                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                                        {suggestion.helper}
                                                    </Text>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </Space>
                            </Space>
                        ) : null}

                        <div
                            style={{
                                alignItems: 'flex-end',
                                background: token.colorBgElevated,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 28,
                                boxShadow: token.boxShadowTertiary,
                                display: 'flex',
                                gap: 8,
                                padding: '8px 8px 8px 16px',
                            }}
                        >
                            <TextArea
                                autoSize={{ minRows: 1, maxRows: 4 }}
                                disabled={!selectedProjectId || submitting}
                                onChange={setInput}
                                placeholder="Ask Menu Manager"
                                style={{
                                    background: 'transparent',
                                    borderColor: 'transparent',
                                    boxShadow: 'none',
                                    color: token.colorText,
                                    flex: 1,
                                    minHeight: 42,
                                    padding: '8px 0',
                                    width: '100%',
                                }}
                                value={input}
                            />
                            <Button
                                aria-label="Send"
                                color="primary"
                                disabled={!selectedProjectId || submitting || !input.trim()}
                                fill="solid"
                                loading={submitting}
                                onClick={() => void submitPrompt()}
                                style={{
                                    borderRadius: '50%',
                                    flexShrink: 0,
                                    height: 44,
                                    minWidth: 44,
                                    padding: 0,
                                    width: 44,
                                }}
                            >
                                <LuSend size={18} />
                            </Button>
                        </div>

                        <Flex align="center" gap={8} wrap="wrap">
                            <Button
                                ariaLabel="Choose work context"
                                disabled={!selectedProjectId || submitting}
                                fill="outline"
                                icon={<LuSlidersHorizontal size={16} />}
                                onClick={openContextPicker}
                                style={{
                                    borderRadius: 22,
                                    minHeight: 44,
                                }}
                            >
                                {composerContextLabel}
                            </Button>
                            <Button
                                ariaLabel="Show suggestions"
                                disabled={!selectedProjectId || submitting}
                                fill="outline"
                                icon={<LuSparkles size={16} />}
                                onClick={openSuggestions}
                                style={{
                                    borderRadius: 22,
                                    minHeight: 44,
                                }}
                            >
                                Suggestions
                            </Button>
                            {composerContext.target ? (
                                <Button
                                    disabled={submitting}
                                    fill="none"
                                    onClick={clearComposerContext}
                                    style={{ minHeight: 44, paddingInline: 0 }}
                                >
                                    Clear
                                </Button>
                            ) : null}
                        </Flex>
                    </Space>
                </Card>

                <MobileAiMenuCardStack
                    cards={cards}
                    workingCardId={workingCardId}
                    onApprove={(card) => void approveCard(card)}
                    onCancel={(card) => void cancelCard(card)}
                    onDraftPrompt={draftPrompt}
                    onEdit={editCard}
                />

                <Card title="Recent receipts">
                    {receipts.length ? (
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            {receipts.slice(0, 5).map((receipt) => (
                                <div key={receipt.receiptId}>
                                    <Text strong>{receipt.title}</Text>
                                    <Text type="secondary" style={{ display: 'block' }}>{receipt.message}</Text>
                                </div>
                            ))}
                        </Space>
                    ) : (
                        <Text type="secondary">No receipts yet.</Text>
                    )}
                </Card>
            </Space>

            <MobileProjectSelectorSheet
                currentProjectId={selectedProjectId}
                currentProjectName={selectedProjectSummary?.name || selectedProject?.name || null}
                onClose={() => setIsProjectSelectorOpen(false)}
                onProjectsChanged={async (preferredProjectId) => {
                    setIsProjectSelectorOpen(false);
                    await selectProject(preferredProjectId || null);
                }}
                visible={isProjectSelectorOpen}
            />

            <Popup
                destroyOnClose
                onMaskClick={() => setIsContextPickerOpen(false)}
                visible={isContextPickerOpen}
                bodyStyle={{
                    background: token.colorBgContainer,
                    maxHeight: '78vh',
                    overflowY: 'auto',
                    padding: 16,
                }}
            >
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                    <Flex align="center" justify="space-between" gap={12}>
                        <div>
                            <Text strong style={{ display: 'block', fontSize: 18 }}>Work on</Text>
                            <Text type="secondary">Choose context, then send your message.</Text>
                        </div>
                        <Button
                            ariaLabel="Close context picker"
                            fill="none"
                            onClick={() => setIsContextPickerOpen(false)}
                            style={{ minHeight: 44, minWidth: 44, padding: 0 }}
                        >
                            <LuX size={20} />
                        </Button>
                    </Flex>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {composerContextData.targets.map((target) => {
                            const selected = composerContext.target === target.target;
                            return (
                                <button
                                    key={target.target}
                                    onClick={() => selectComposerTarget(target.target)}
                                    style={{
                                        alignItems: 'center',
                                        background: selected ? token.colorPrimaryBg : token.colorFillTertiary,
                                        border: `1px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`,
                                        borderRadius: 999,
                                        color: token.colorText,
                                        display: 'inline-flex',
                                        gap: 6,
                                        minHeight: 38,
                                        padding: '8px 12px',
                                        whiteSpace: 'nowrap',
                                    }}
                                    type="button"
                                >
                                    <span style={{ color: selected ? token.colorPrimary : token.colorTextQuaternary, flexShrink: 0, width: 16 }}>
                                        {selected ? <LuCheck size={18} /> : null}
                                    </span>
                                    <Text strong style={{ overflowWrap: 'normal', wordBreak: 'keep-all' }}>{target.label}</Text>
                                </button>
                            );
                        })}
                    </div>

                    {activeComposerTarget?.requiresEntity ? (
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            <Flex align="center" justify="space-between" gap={10}>
                                <div>
                                    <Text strong style={{ display: 'block' }}>
                                        {composerContext.target === 'item' ? 'Pick items' : 'Pick category'}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{activeContextEntityCount} available</Text>
                                </div>
                                {composerContext.selectedEntityIds.length ? (
                                    <Flex align="center" gap={6}>
                                        <span
                                            style={{
                                                background: token.colorPrimaryBg,
                                                border: `1px solid ${token.colorPrimaryBorder}`,
                                                borderRadius: 999,
                                                color: token.colorPrimary,
                                                flexShrink: 0,
                                                fontSize: 12,
                                                padding: '4px 8px',
                                            }}
                                        >
                                            {composerContext.selectedEntityIds.length} selected
                                        </span>
                                        <Button
                                            color="primary"
                                            onClick={() => setIsContextPickerOpen(false)}
                                            size="small"
                                            style={{ minHeight: 34 }}
                                        >
                                            Done
                                        </Button>
                                    </Flex>
                                ) : null}
                            </Flex>
                            {shouldShowContextSearch ? (
                                <SearchBar
                                    placeholder={composerContext.target === 'item' ? 'Find item' : 'Find category'}
                                    style={{ minHeight: 38 }}
                                    value={contextSearch}
                                    onChange={setContextSearch}
                                />
                            ) : null}
                            <Space
                                direction="vertical"
                                size={6}
                                style={{
                                    maxHeight: '36vh',
                                    overflowY: 'auto',
                                    width: '100%',
                                }}
                            >
                                {filteredContextEntities.slice(0, 80).map((entity) => {
                                    const selected = composerContext.selectedEntityIds.includes(entity.id);
                                    return (
                                        <button
                                            key={entity.id}
                                            onClick={() => toggleComposerEntity(entity.id)}
                                            style={{
                                                alignItems: 'center',
                                                background: selected ? token.colorPrimaryBg : token.colorFillTertiary,
                                                border: `1px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`,
                                                borderRadius: 10,
                                                color: token.colorText,
                                                display: 'flex',
                                                gap: 8,
                                                minHeight: 44,
                                                padding: '8px 10px',
                                                textAlign: 'left',
                                                width: '100%',
                                            }}
                                            type="button"
                                        >
                                            <span
                                                style={{
                                                    alignItems: 'center',
                                                    color: selected ? token.colorPrimary : token.colorTextQuaternary,
                                                    display: 'inline-flex',
                                                    flexShrink: 0,
                                                    height: 20,
                                                    justifyContent: 'center',
                                                    width: 20,
                                                }}
                                            >
                                                {selected ? <LuCheck size={17} /> : null}
                                            </span>
                                            <span style={{ flex: 1, minWidth: 0 }}>
                                                <Text
                                                    strong
                                                    style={{
                                                        display: 'block',
                                                        lineHeight: 1.2,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {entity.label}
                                                </Text>
                                                {entity.helper ? (
                                                    <Text
                                                        type="secondary"
                                                        style={{
                                                            display: 'block',
                                                            fontSize: 12,
                                                            lineHeight: 1.2,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {entity.helper}
                                                    </Text>
                                                ) : null}
                                            </span>
                                        </button>
                                    );
                                })}
                                {!filteredContextEntities.length ? (
                                    <Text type="secondary">No matching {composerContext.target === 'item' ? 'items' : 'categories'}.</Text>
                                ) : null}
                            </Space>
                        </Space>
                    ) : activeComposerTarget ? (
                        <div
                            style={{
                                background: token.colorFillTertiary,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 14,
                                padding: 12,
                            }}
                        >
                            <Text strong style={{ display: 'block' }}>{activeComposerTarget.label}</Text>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{activeComposerTarget.helper}</Text>
                        </div>
                    ) : null}
                </Space>
            </Popup>

            <Popup
                destroyOnClose
                onMaskClick={closeSuggestions}
                visible={isSuggestionsOpen}
                bodyStyle={{
                    background: token.colorBgContainer,
                    maxHeight: '78vh',
                    overflowY: 'auto',
                    padding: 16,
                }}
            >
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                    <Flex align="center" justify="space-between" gap={12}>
                        <div>
                            <Text strong style={{ display: 'block', fontSize: 18 }}>Suggestions</Text>
                            <Text type="secondary">Choose one, then send when ready.</Text>
                        </div>
                        <Button
                            ariaLabel="Close suggestions"
                            fill="none"
                            onClick={closeSuggestions}
                            style={{ minHeight: 44, minWidth: 44, padding: 0 }}
                        >
                            <LuX size={20} />
                        </Button>
                    </Flex>

                    <Space direction="vertical" size={14} style={{ width: '100%' }}>
                        {activeSuggestion ? (
                            <div>
                                <Button
                                    fill="none"
                                    onClick={() => setActiveSuggestion(null)}
                                    style={{ color: token.colorPrimary, minHeight: 44, paddingInline: 0 }}
                                >
                                    <LuChevronLeft size={18} />
                                    Back
                                </Button>
                                <Text strong style={{ display: 'block', fontSize: 16, marginBottom: 4 }}>
                                    {activeSuggestion.label}
                                </Text>
                                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                                    {activeSuggestion.helper}
                                </Text>
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                    {(activeSuggestion.children || []).map((prompt) => {
                                        const Icon = promptIconByKind[prompt.kind];
                                        return (
                                            <button
                                                key={prompt.label}
                                                onClick={() => pickSuggestion(getAiMenuManagerPromptText(prompt))}
                                                style={{
                                                    alignItems: 'center',
                                                    background: token.colorFillTertiary,
                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                    borderRadius: 14,
                                                    color: token.colorText,
                                                    display: 'flex',
                                                    gap: 12,
                                                    minHeight: 58,
                                                    padding: '12px',
                                                    textAlign: 'left',
                                                    width: '100%',
                                                }}
                                                type="button"
                                            >
                                                <span
                                                    style={{
                                                        alignItems: 'center',
                                                        color: token.colorTextSecondary,
                                                        display: 'inline-flex',
                                                        flexShrink: 0,
                                                        justifyContent: 'center',
                                                        width: 24,
                                                    }}
                                                >
                                                    <Icon size={19} />
                                                </span>
                                                <span style={{ minWidth: 0 }}>
                                                    <Text strong style={{ display: 'block' }}>{prompt.label}</Text>
                                                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{prompt.helper}</Text>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </Space>
                            </div>
                        ) : promptGroups.map((group) => (
                            <div key={group.groupId}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>{group.title}</Text>
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                    {group.suggestions.map((prompt) => {
                                        const Icon = promptIconByKind[prompt.kind];
                                        const hasChildren = Boolean(prompt.children?.length);
                                        return (
                                            <button
                                                key={prompt.label}
                                                onClick={() => handleSuggestionClick(prompt)}
                                                style={{
                                                    alignItems: 'center',
                                                    background: token.colorFillTertiary,
                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                    borderRadius: 14,
                                                    color: token.colorText,
                                                    display: 'flex',
                                                    gap: 12,
                                                    minHeight: 58,
                                                    padding: '12px',
                                                    textAlign: 'left',
                                                    width: '100%',
                                                }}
                                                type="button"
                                            >
                                                <span
                                                    style={{
                                                        alignItems: 'center',
                                                        color: token.colorTextSecondary,
                                                        display: 'inline-flex',
                                                        flexShrink: 0,
                                                        justifyContent: 'center',
                                                        width: 24,
                                                    }}
                                                >
                                                    <Icon size={19} />
                                                </span>
                                                <span style={{ flex: 1, minWidth: 0 }}>
                                                    <Text strong style={{ display: 'block' }}>{prompt.label}</Text>
                                                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{prompt.helper}</Text>
                                                </span>
                                                {hasChildren ? (
                                                    <LuChevronRight
                                                        color={token.colorTextQuaternary}
                                                        size={18}
                                                        style={{ flexShrink: 0 }}
                                                    />
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                </Space>
                            </div>
                        ))}
                    </Space>
                </Space>
            </Popup>
        </div>
    );
}
