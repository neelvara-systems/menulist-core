'use client';

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS } from '@constant/permissions';
import {
    applyAiMenuManagerProjectPatch,
    projectContainsAiMenuManagerPatch,
} from '@lib/ai-menu-manager/actions/projectPatches';
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
    getAiMenuManagerAttentionSuggestions,
    getAiMenuManagerProjectPromptGroups,
    getAiMenuManagerPromptText,
    getAiMenuManagerStarterSuggestions,
    type AiMenuManagerPromptKind,
    type AiMenuManagerPromptSuggestion,
} from '@lib/ai-menu-manager/projectPromptHints';
import {
    buildAiMenuManagerTimeline,
    getAiMenuManagerProjectStatusLine,
} from '@lib/ai-menu-manager/presentation';
import {
    buildAiMenuManagerClientBatchExecution,
    buildAiMenuManagerClientExecutionDirective,
    cancelAiMenuManagerClientOperation,
    completeAiMenuManagerClientProposal,
    completeAiMenuManagerClientOperation,
    completeAiMenuManagerClientOperations,
    getAiMenuManagerClientInbox,
    sendAiMenuManagerCommand,
    submitAiMenuManagerProposalAction,
} from '@database/aiMenuManager';
import { getScreenState } from '@database/campaigns';
import { assertProjectUpdateSucceeded, updateProjectWithoutLoader } from '@database/projects';
import type {
    AiMenuManagerCardPayload,
    AiMenuManagerCommandContextSelection,
    AiMenuManagerPendingOperation,
    AiMenuManagerReceipt,
    AiMenuManagerSessionDoc,
    AiMenuManagerSuggestedReply,
} from '@type/aiMenuManager';
import type { Project } from '@template/main-app/projects/types';
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
    LuPlus,
    LuSend,
    LuSlidersHorizontal,
    LuSparkles,
    LuUpload,
    LuX,
} from 'react-icons/lu';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { hasAnyPermission } from '@lib/permissions/permissionRequirements';
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
    const { storeDetails, userPermissions } = useContext(PlatformGlobalDataContext);
    const storeId = storeDetails?.storeId;
    const canAccessDigitalScreens = FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED
        && hasAnyPermission(userPermissions, [PERMISSIONS.MANAGE_DIGITAL_SCREENS]);
    const {
        hasLoadError,
        isLoading,
        projectsList,
        refreshProjects,
        selectedProject,
        selectedProjectId,
        selectedProjectSummary,
        selectProject,
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
    const [isToolsOpen, setIsToolsOpen] = useState(false);
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
    const approvalGroups = useMemo(() => {
        const grouped = new Map<string, AiMenuManagerPendingOperation[]>();
        operations.forEach((operation) => {
            if (
                !operation.commandGroupId
                || operation.executionMode !== 'client_project_mutation'
                || operation.card.kind !== 'proposal'
                || operation.card.status !== 'pending_approval'
                || !operation.patch
            ) return;
            grouped.set(operation.commandGroupId, [
                ...(grouped.get(operation.commandGroupId) || []),
                operation,
            ]);
        });
        return Array.from(grouped.entries())
            .filter(([, groupOperations]) => groupOperations.length > 1)
            .map(([groupId, groupOperations]) => ({ groupId, operations: groupOperations }));
    }, [operations]);
    const timeline = useMemo(() => buildAiMenuManagerTimeline({
        activeCards: cards,
        compactMessages: currentSession?.compactMessages,
        receipts,
    }), [cards, currentSession?.compactMessages, receipts]);
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
    const [digitalScreenToken, setDigitalScreenToken] = useState<string | undefined>();
    useEffect(() => {
        let active = true;
        if (!canAccessDigitalScreens || !selectedProjectId) {
            setDigitalScreenToken(undefined);
            return () => {
                active = false;
            };
        }
        void getScreenState()
            .then((screen) => {
                if (active) setDigitalScreenToken(screen?.screenToken);
            })
            .catch((error) => {
                if (active) setDigitalScreenToken(undefined);
                logRuntimeFailure('mobile_ai_menu_manager_screen_context_load_failed', error, {
                    ...getBoundedRuntimeStringContext('storeId', (storeDetails as any)?.storeId),
                });
            });
        return () => {
            active = false;
        };
    }, [canAccessDigitalScreens, selectedProjectId, (storeDetails as any)?.storeId]);
    const storePublicContext = useMemo(() => ({
        customDomain: (storeDetails as any)?.customDomain,
        screenToken: canAccessDigitalScreens ? digitalScreenToken : undefined,
        subdomain: (storeDetails as any)?.subdomain,
    }), [canAccessDigitalScreens, digitalScreenToken, storeDetails]);

    const promptGroups = useMemo(() => getAiMenuManagerProjectPromptGroups(selectedProject), [selectedProject]);
    const attentionSuggestions = useMemo(() => getAiMenuManagerAttentionSuggestions(selectedProject), [selectedProject]);
    const starterSuggestions = useMemo(() => getAiMenuManagerStarterSuggestions(promptGroups), [promptGroups]);
    const emptyStateSuggestions = attentionSuggestions.length ? attentionSuggestions : starterSuggestions;
    const projectStatusLine = useMemo(() => getAiMenuManagerProjectStatusLine(selectedProject), [selectedProject]);
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

    const removeOperation = useCallback((operationId: string, receipt?: AiMenuManagerReceipt) => {
        setOperations((prev) => prev.filter((entry) => entry.operationId !== operationId));
        if (receipt) {
            setReceipts((prev) => [
                receipt,
                ...prev.filter((entry) => entry.proposalId !== receipt.proposalId),
            ].slice(0, 20));
        }
    }, []);

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
            logRuntimeFailure('mobile_ai_menu_manager_inbox_load_failed', error, {
                ...getBoundedRuntimeStringContext('storeId', storeId),
                ...getBoundedRuntimeStringContext('projectId', selectedProjectId),
                ...getBoundedRuntimeStringContext('sessionId', getSessionIdForProject(selectedProjectId)),
            });
            Toast.show({ content: 'Unable to load Menu Manager.' });
        }
    }, [getSessionIdForProject, rememberSessionId, selectedProjectId, storeId]);

    useEffect(() => {
        void loadInbox();
    }, [loadInbox]);

    useEffect(() => {
        setComposerContext({ selectedEntityIds: [], target: null });
        setContextSearch('');
        setIsToolsOpen(false);
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
        setIsToolsOpen(false);
        setIsSuggestionsOpen(false);
        setActiveSuggestion(null);
        setIsContextPickerOpen(true);
    }, []);

    const openSuggestions = useCallback(() => {
        setIsToolsOpen(false);
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

    const submitPrompt = useCallback(async (
        prompt?: string,
        options?: {
            composerContext?: AiMenuManagerCommandContextSelection;
            ignoreComposerContext?: boolean;
            replaceOperationId?: string;
        },
    ) => {
        const rawText = (prompt ?? input).trim();
        if (!rawText) return;
        const shouldUseComposerContext = !options?.ignoreComposerContext && !options?.composerContext;
        if (
            shouldUseComposerContext
            && !canUseAiMenuManagerComposerContext({ data: composerContextData, selection: composerContext })
        ) {
            Toast.show({ content: 'Choose the item or category first' });
            return;
        }
        const text = shouldUseComposerContext
            ? buildAiMenuManagerComposerPrompt({
                data: composerContextData,
                input: rawText,
                selection: composerContext,
            }).trim()
            : rawText;
        let commandContext: AiMenuManagerCommandContextSelection | undefined;
        if (options?.composerContext?.target) {
            commandContext = {
                target: options.composerContext.target,
                selectedEntityIds: options.composerContext.selectedEntityIds || [],
            };
        } else if (shouldUseComposerContext && composerContext.target) {
            commandContext = {
                target: composerContext.target,
                selectedEntityIds: composerContext.selectedEntityIds,
            };
        }
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
                replaceOperationId: options?.replaceOperationId,
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
            logRuntimeFailure('mobile_ai_menu_manager_prompt_submit_failed', error, {
                ...getBoundedRuntimeStringContext('storeId', storeId),
                ...getBoundedRuntimeStringContext('projectId', selectedProjectId),
                ...getBoundedRuntimeStringContext('sessionId', getSessionIdForProject(selectedProjectId)),
                hasComposerContext: (commandContext?.selectedEntityIds?.length || 0) > 0 || Boolean(commandContext?.target),
                inputLength: text.length,
            });
            Toast.show({ content: 'Could not prepare card.' });
        } finally {
            setSubmitting(false);
        }
    }, [businessType, clearComposerContext, composerContext, composerContextData, currentSession, getSessionIdForProject, input, rememberSessionId, selectedProject, selectedProjectId, storeId, storeName, storePublicContext]);

    const resolveClarification = useCallback((card: AiMenuManagerCardPayload, reply: AiMenuManagerSuggestedReply) => {
        void submitPrompt(reply.prompt, {
            composerContext: reply.composerContext,
            ignoreComposerContext: true,
            replaceOperationId: card.cardId,
        });
    }, [submitPrompt]);

    const approveOperationGroup = useCallback(async (groupId: string) => {
        if (!storeId || !selectedProject) return;
        const groupOperations = operations.filter((operation) => operation.commandGroupId === groupId);
        if (groupOperations.length < 2) {
            Toast.show({ content: 'Prepared updates no longer match this request' });
            return;
        }

        setWorkingCardId(groupId);
        let projectWasUpdated = false;
        try {
            const alreadyApplied = groupOperations.every((operation) => (
                operation.patch && projectContainsAiMenuManagerPatch(
                    selectedProject,
                    operation.patch,
                    operation.projectId,
                )
            ));
            if (!alreadyApplied) {
                const batch = buildAiMenuManagerClientBatchExecution({
                    operations: groupOperations,
                    project: selectedProject,
                    storeName,
                    businessType,
                });
                const savedProject = await updateProjectWithoutLoader(batch.patchedProject, {
                    ...(batch.directives[0].baseProjectUpdatedAt
                        ? { expectedModifiedOn: batch.directives[0].baseProjectUpdatedAt }
                        : {}),
                });
                assertProjectUpdateSucceeded(
                    savedProject,
                    batch.patchedProject.projectId,
                    'mobile_ai_menu_manager_group_project_update_rejected',
                );
                projectWasUpdated = true;
                upsertCachedProject(savedProject || batch.patchedProject);
            }

            try {
                const result = await completeAiMenuManagerClientOperations({
                    operations: groupOperations,
                    result: 'executed',
                    sessionSnapshot: currentSession,
                });
                setCurrentSession(result.session);
                setOperations(result.session.pendingOperations || []);
                setReceipts(result.session.recentReceiptSummaries || []);
                Toast.show({
                    content: alreadyApplied
                        ? 'Menu already matches these updates'
                        : `${groupOperations.length} menu updates applied`,
                    icon: 'success',
                });
            } catch (error) {
                logRuntimeFailure('mobile_ai_menu_manager_group_receipt_completion_failed', error, {
                    ...getBoundedRuntimeStringContext('storeId', storeId),
                    ...getBoundedRuntimeStringContext('projectId', selectedProject.projectId),
                    ...getBoundedRuntimeStringContext('commandGroupId', groupId),
                    actionCount: groupOperations.length,
                });
                Toast.show({ content: 'Menu updated. Receipts could not be saved.' });
            }
        } catch (error) {
            logRuntimeFailure('mobile_ai_menu_manager_group_apply_failed', error, {
                ...getBoundedRuntimeStringContext('storeId', storeId),
                ...getBoundedRuntimeStringContext('projectId', selectedProject.projectId),
                ...getBoundedRuntimeStringContext('commandGroupId', groupId),
                actionCount: groupOperations.length,
            });
            if (!projectWasUpdated) {
                const failedResult = await completeAiMenuManagerClientOperations({
                    operations: groupOperations,
                    result: 'failed',
                    sessionSnapshot: currentSession,
                }).catch((completionError): null => {
                    logRuntimeFailure('mobile_ai_menu_manager_group_failed_completion_failed', completionError, {
                        ...getBoundedRuntimeStringContext('storeId', storeId),
                        ...getBoundedRuntimeStringContext('projectId', selectedProject.projectId),
                        ...getBoundedRuntimeStringContext('commandGroupId', groupId),
                    });
                    return null;
                });
                if (failedResult?.session) {
                    setCurrentSession(failedResult.session);
                    setOperations(failedResult.session.pendingOperations || []);
                    setReceipts(failedResult.session.recentReceiptSummaries || []);
                }
            }
            Toast.show({ content: 'Unable to apply these prepared updates' });
        } finally {
            setWorkingCardId(null);
        }
    }, [businessType, currentSession, operations, selectedProject, storeId, storeName, upsertCachedProject]);

    const approveCard = useCallback(async (card: AiMenuManagerCardPayload) => {
        if (!storeId || !selectedProject) return;
        const operation = operations.find((entry) => entry.operationId === card.cardId);
        if (!operation) {
            Toast.show({ content: 'Card no longer matches this menu' });
            return;
        }
        setWorkingCardId(card.cardId);
        try {
            const isServerBackedCard = operation.executionMode === 'existing_server_api' && !operation.patch;
            if (card.kind === 'unsupported') {
                if (isServerBackedCard) {
                    await submitAiMenuManagerProposalAction({
                        proposalId: operation.operationId,
                        storeId,
                        projectId: operation.projectId,
                        actionType: card.actionType,
                        action: 'cancel',
                    });
                    removeOperation(operation.operationId);
                    Toast.show({ content: 'No MenuList action was taken' });
                    return;
                }
                const result = await cancelAiMenuManagerClientOperation({ operation, sessionSnapshot: currentSession });
                setCurrentSession(result.session);
                setOperations(result.session.pendingOperations || []);
                setReceipts(result.session.recentReceiptSummaries || []);
                Toast.show({ content: 'No MenuList action was taken' });
                return;
            }

            if (card.kind === 'manual_task' && card.actions.includes('mark_done')) {
                if (isServerBackedCard) {
                    const result = await submitAiMenuManagerProposalAction({
                        proposalId: operation.operationId,
                        storeId,
                        projectId: operation.projectId,
                        actionType: card.actionType,
                        action: 'mark_done',
                    });
                    removeOperation(operation.operationId, result.data.receipt);
                    Toast.show({ content: card.localActions?.length ? 'Done' : 'Marked done', icon: 'success' });
                    return;
                }
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

            if (operation.patch && projectContainsAiMenuManagerPatch(
                selectedProject,
                operation.patch,
                operation.projectId,
            )) {
                try {
                    const result = await completeAiMenuManagerClientOperation({
                        operation,
                        result: 'executed',
                        message: `${card.title} already matches this menu.`,
                        sessionSnapshot: currentSession,
                    });
                    setCurrentSession(result.session);
                    setOperations(result.session.pendingOperations || []);
                    setReceipts(result.session.recentReceiptSummaries || []);
                    Toast.show({ content: 'Menu already updated', icon: 'success' });
                } catch (error: any) {
                    logRuntimeFailure('mobile_ai_menu_manager_already_applied_receipt_failed', error, {
                        ...getBoundedRuntimeStringContext('storeId', storeId),
                        ...getBoundedRuntimeStringContext('projectId', selectedProject?.projectId),
                        ...getBoundedRuntimeStringContext('operationId', operation.operationId),
                        ...getBoundedRuntimeStringContext('cardId', card.cardId),
                        actionCount: card.actions.length,
                    });
                    Toast.show({ content: 'Menu already updated. Receipt could not be saved.' });
                }
                return;
            }

            const directive = isServerBackedCard
                ? (await submitAiMenuManagerProposalAction({
                    proposalId: operation.operationId,
                    storeId,
                    projectId: operation.projectId,
                    actionType: card.actionType,
                    action: 'approve',
                })).data.directive
                : buildAiMenuManagerClientExecutionDirective({
                    operation,
                    project: selectedProject,
                    storeName,
                    businessType,
                });
            if (!directive) {
                throw new Error('Approved card did not return an execution directive');
            }
            if (isServerBackedCard && projectContainsAiMenuManagerPatch(
                selectedProject,
                directive.patch,
                operation.projectId,
            )) {
                try {
                    const result = await completeAiMenuManagerClientProposal({
                        proposalId: operation.operationId,
                        storeId,
                        projectId: operation.projectId,
                        actionType: card.actionType,
                        executionId: directive.executionId,
                        patchHash: directive.patchHash,
                        result: 'executed',
                        message: `${card.title} already matches this menu.`,
                    });
                    removeOperation(operation.operationId, result.data.receipt);
                    Toast.show({ content: 'Menu already updated', icon: 'success' });
                } catch (error: any) {
                    logRuntimeFailure('mobile_ai_menu_manager_server_already_applied_receipt_failed', error, {
                        ...getBoundedRuntimeStringContext('storeId', storeId),
                        ...getBoundedRuntimeStringContext('projectId', selectedProject?.projectId),
                        ...getBoundedRuntimeStringContext('operationId', operation.operationId),
                        ...getBoundedRuntimeStringContext('cardId', card.cardId),
                        actionCount: card.actions.length,
                    });
                    removeOperation(operation.operationId);
                    Toast.show({ content: 'Menu already updated. Receipt could not be saved.' });
                }
                return;
            }
            let savedProject: Project | null = null;
            let patchedProject: Project | null = null;
            try {
                patchedProject = applyAiMenuManagerProjectPatch(selectedProject, directive);
                savedProject = await updateProjectWithoutLoader(patchedProject, {
                    ...(directive.baseProjectUpdatedAt
                        ? { expectedModifiedOn: directive.baseProjectUpdatedAt }
                        : {}),
                });
                assertProjectUpdateSucceeded(
                    savedProject,
                    patchedProject.projectId,
                    'mobile_ai_menu_manager_project_update_rejected',
                );
            } catch (error: unknown) {
                logRuntimeFailure('mobile_ai_menu_manager_project_update_failed', error, {
                    ...getBoundedRuntimeStringContext('storeId', storeId),
                    ...getBoundedRuntimeStringContext('projectId', selectedProject?.projectId),
                    ...getBoundedRuntimeStringContext('operationId', operation.operationId),
                    ...getBoundedRuntimeStringContext('cardId', card.cardId),
                    actionCount: card.actions.length,
                });
                if (isServerBackedCard) {
                    await completeAiMenuManagerClientProposal({
                        proposalId: operation.operationId,
                        storeId,
                        projectId: operation.projectId,
                        actionType: card.actionType,
                        executionId: directive.executionId,
                        patchHash: directive.patchHash,
                        result: 'failed',
                        message: 'Project update failed',
                    }).catch((completionError): null => {
                        logRuntimeFailure('mobile_ai_menu_manager_project_update_failed_proposal_completion_failed', completionError, {
                            ...getBoundedRuntimeStringContext('storeId', storeId),
                            ...getBoundedRuntimeStringContext('projectId', operation.projectId),
                            ...getBoundedRuntimeStringContext('operationId', operation.operationId),
                            ...getBoundedRuntimeStringContext('cardId', card.cardId),
                            ...getBoundedRuntimeStringContext('executionId', directive.executionId),
                        });
                        return null;
                    });
                } else {
                    const failedResult = await completeAiMenuManagerClientOperation({
                        operation,
                        result: 'failed',
                        message: 'Project update failed',
                        sessionSnapshot: currentSession,
                    }).catch((completionError): null => {
                        logRuntimeFailure('mobile_ai_menu_manager_project_update_failed_operation_completion_failed', completionError, {
                            ...getBoundedRuntimeStringContext('storeId', storeId),
                            ...getBoundedRuntimeStringContext('projectId', operation.projectId),
                            ...getBoundedRuntimeStringContext('operationId', operation.operationId),
                            ...getBoundedRuntimeStringContext('cardId', card.cardId),
                        });
                        return null;
                    });
                    if (failedResult?.session) {
                        setCurrentSession(failedResult.session);
                        setOperations(failedResult.session.pendingOperations || []);
                        setReceipts(failedResult.session.recentReceiptSummaries || []);
                    }
                }
                throw error;
            }

            upsertCachedProject(savedProject || patchedProject);
            try {
                if (isServerBackedCard) {
                    const result = await completeAiMenuManagerClientProposal({
                        proposalId: operation.operationId,
                        storeId,
                        projectId: operation.projectId,
                        actionType: card.actionType,
                        executionId: directive.executionId,
                        patchHash: directive.patchHash,
                        result: 'executed',
                        message: `${card.title} applied.`,
                    });
                    removeOperation(operation.operationId, result.data.receipt);
                } else {
                    const result = await completeAiMenuManagerClientOperation({
                        operation,
                        result: 'executed',
                        message: `${card.title} applied.`,
                        sessionSnapshot: currentSession,
                    });
                    setCurrentSession(result.session);
                    setOperations(result.session.pendingOperations || []);
                    setReceipts(result.session.recentReceiptSummaries || []);
                }
                Toast.show({ content: 'Menu updated', icon: 'success' });
            } catch (error: any) {
                logRuntimeFailure('mobile_ai_menu_manager_receipt_completion_failed', error, {
                    ...getBoundedRuntimeStringContext('storeId', storeId),
                    ...getBoundedRuntimeStringContext('projectId', selectedProject?.projectId),
                    ...getBoundedRuntimeStringContext('operationId', operation.operationId),
                    ...getBoundedRuntimeStringContext('cardId', card.cardId),
                    actionCount: card.actions.length,
                });
                Toast.show({ content: 'Menu updated. Approve this card again to finish the receipt.' });
            }
        } catch (error: any) {
            logRuntimeFailure('mobile_ai_menu_manager_card_apply_failed', error, {
                ...getBoundedRuntimeStringContext('storeId', storeId),
                ...getBoundedRuntimeStringContext('projectId', selectedProject?.projectId),
                ...getBoundedRuntimeStringContext('cardId', card.cardId),
                actionCount: card.actions.length,
            });
            Toast.show({ content: 'Unable to apply card.' });
        } finally {
            setWorkingCardId(null);
        }
    }, [businessType, currentSession, operations, removeOperation, selectedProject, storeId, storeName, upsertCachedProject]);

    const cancelCard = useCallback(async (card: AiMenuManagerCardPayload) => {
        if (!storeId) return;
        const operation = operations.find((entry) => entry.operationId === card.cardId);
        if (!operation) {
            setOperations((prev) => prev.filter((entry) => entry.operationId !== card.cardId));
            return;
        }
        setWorkingCardId(card.cardId);
        try {
            if (operation.executionMode === 'existing_server_api' && !operation.patch) {
                await submitAiMenuManagerProposalAction({
                    proposalId: operation.operationId,
                    storeId,
                    projectId: operation.projectId,
                    actionType: card.actionType,
                    action: 'cancel',
                });
                removeOperation(operation.operationId);
                return;
            }
            const result = await cancelAiMenuManagerClientOperation({ operation, sessionSnapshot: currentSession });
            setCurrentSession(result.session);
            setOperations(result.session.pendingOperations || []);
        } catch (error: any) {
            logRuntimeFailure('mobile_ai_menu_manager_card_cancel_failed', error, {
                ...getBoundedRuntimeStringContext('storeId', storeId),
                ...getBoundedRuntimeStringContext('projectId', operation.projectId),
                ...getBoundedRuntimeStringContext('operationId', operation.operationId),
                ...getBoundedRuntimeStringContext('cardId', card.cardId),
            });
            Toast.show({ content: 'Unable to cancel card.' });
        } finally {
            setWorkingCardId(null);
        }
    }, [currentSession, operations, removeOperation, storeId]);

    return (
        <div style={{ minHeight: '100%', background: token.colorBgLayout, color: token.colorText, paddingBottom: 24 }}>
            <NavBar
                onBack={onBack}
            >
                Menu Manager
            </NavBar>

            <Space direction="vertical" size={12} style={{ width: '100%', padding: 16 }}>
                <ProjectSelectorTrigger
                    clickable={!isLoading && projectsList.length > 1}
                    currentProject={currentProjectSelectorItem}
                    emptyLabel={isLoading ? 'Loading menu' : hasLoadError ? 'Menus unavailable' : 'No menu selected'}
                    helperText={isLoading
                        ? 'Checking the selected menu.'
                        : selectedProjectId
                        ? 'Actions apply only to this selected menu.'
                        : 'Menu Manager needs a menu before it can prepare anything.'}
                    onClick={!isLoading && projectsList.length > 1 ? () => setIsProjectSelectorOpen(true) : undefined}
                />
                {projectStatusLine ? (
                    <Text type="secondary" style={{ display: 'block', fontSize: 12, paddingInline: 4 }}>
                        {projectStatusLine}
                    </Text>
                ) : null}

                <Card>
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        {isLoading ? (
                            <Flex align="center" justify="center" style={{ minHeight: 280 }}>
                                <Text type="secondary">Loading menu…</Text>
                            </Flex>
                        ) : hasLoadError && !selectedProject ? (
                            <Flex align="center" style={{ minHeight: 280, paddingBlock: 24, textAlign: 'center' }} vertical>
                                <ContextualStateIllustration
                                    color={token.colorPrimary}
                                    size={104}
                                    treatment="softHalo"
                                    variant="serverErrorContext"
                                />
                                <Text strong style={{ display: 'block', fontSize: 17, marginTop: 14 }}>Menu could not be loaded</Text>
                                <Text type="secondary" style={{ display: 'block', fontSize: 13, marginTop: 6 }}>
                                    Menu Manager has not confirmed that this store has no menus.
                                </Text>
                                <Button
                                    color="primary"
                                    fill="solid"
                                    onClick={() => void refreshProjects({ force: true, loadSelectedProject: true, showLoader: true })}
                                    style={{ marginTop: 18, minHeight: 44 }}
                                >
                                    Try again
                                </Button>
                            </Flex>
                        ) : !selectedProjectId ? (
                            <Flex align="center" style={{ minHeight: 280, paddingBlock: 24, textAlign: 'center' }} vertical>
                                <ContextualStateIllustration
                                    color={token.colorPrimary}
                                    size={104}
                                    treatment="softHalo"
                                    variant="emptyWorkspace"
                                />
                                <Text strong style={{ display: 'block', fontSize: 17, marginTop: 14 }}>Create a menu first</Text>
                                <Text type="secondary" style={{ display: 'block', fontSize: 13, marginTop: 6 }}>
                                    Open the Menu tab to create a menu before using Menu Manager.
                                </Text>
                            </Flex>
                        ) : !selectedProject ? (
                            <Flex align="center" justify="center" style={{ minHeight: 280 }}>
                                <Text type="secondary">Loading selected menu…</Text>
                            </Flex>
                        ) : (
                            <>
                        {!cards.length && !timeline.length && emptyStateSuggestions.length ? (
                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                <div>
                                    <Text strong style={{ display: 'block', fontSize: 16 }}>
                                        {attentionSuggestions.length ? 'Start with what needs attention' : 'What should change?'}
                                    </Text>
                                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                        {attentionSuggestions.length
                                            ? 'Use a menu issue, ask a question, or type what changed.'
                                            : 'Type naturally, choose a suggestion, or select what to work on.'}
                                    </Text>
                                </div>
                                <Text
                                    type="secondary"
                                    style={{ alignItems: 'center', display: 'inline-flex', fontSize: 12, gap: 5 }}
                                >
                                    <LuCheck size={13} /> Nothing changes before you approve.
                                </Text>
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                    {emptyStateSuggestions.map((suggestion) => {
                                        const Icon = promptIconByKind[suggestion.kind];
                                        return (
                                            <button
                                                key={suggestion.label}
                                                onClick={() => activateStarterSuggestion(suggestion)}
                                                style={{
                                                    alignItems: 'center',
                                                    background: token.colorFillTertiary,
                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                    borderRadius: 8,
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
                                                        borderRadius: 8,
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

                        {timeline.map((entry) => (
                            <div
                                key={`message_${entry.id}`}
                                style={{
                                    display: 'flex',
                                    justifyContent: entry.role === 'owner' ? 'flex-end' : 'flex-start',
                                }}
                            >
                                <div
                                    style={{
                                        alignItems: 'flex-start',
                                        background: entry.role === 'owner'
                                            ? token.colorPrimary
                                            : entry.kind === 'receipt'
                                                ? token.colorSuccessBg
                                                : token.colorBgElevated,
                                        border: entry.role === 'owner'
                                            ? undefined
                                            : `1px solid ${entry.kind === 'receipt' ? token.colorSuccessBorder : token.colorBorderSecondary}`,
                                        borderRadius: 18,
                                        color: entry.role === 'owner' ? token.colorTextLightSolid : token.colorText,
                                        display: 'flex',
                                        fontSize: 14,
                                        gap: 7,
                                        maxWidth: '88%',
                                        padding: '10px 12px',
                                    }}
                                >
                                    {entry.kind === 'receipt' ? (
                                        <LuCheck color={token.colorSuccess} size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                                    ) : null}
                                    <span>{entry.text}</span>
                                </div>
                            </div>
                        ))}

                        {approvalGroups.map((group) => (
                            <Card
                                key={`approval_group_${group.groupId}`}
                                style={{
                                    background: token.colorPrimaryBg,
                                    border: `1px solid ${token.colorPrimaryBorder}`,
                                    borderRadius: 8,
                                }}
                            >
                                <Flex align="center" gap={10} justify="space-between" wrap="wrap">
                                    <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                                        <Text strong>{group.operations.length} updates prepared together</Text>
                                        <Text color="secondary" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                                            Review below, then apply with one menu save.
                                        </Text>
                                    </div>
                                    <Button
                                        color="primary"
                                        fill="solid"
                                        loading={workingCardId === group.groupId}
                                        disabled={Boolean(workingCardId)}
                                        onClick={() => void approveOperationGroup(group.groupId)}
                                        style={{ minHeight: 44 }}
                                    >
                                        <LuCheck size={16} />
                                        Approve all
                                    </Button>
                                </Flex>
                            </Card>
                        ))}

                        <MobileAiMenuCardStack
                            cards={cards}
                            workingCardId={workingCardId}
                            onApprove={(card) => void approveCard(card)}
                            onCancel={(card) => void cancelCard(card)}
                            onDraftPrompt={draftPrompt}
                            onEdit={editCard}
                            onResolveClarification={resolveClarification}
                        />

                        <div
                            style={{
                                alignItems: 'flex-end',
                                background: token.colorBgElevated,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 28,
                                boxShadow: token.boxShadowTertiary,
                                display: 'flex',
                                gap: 8,
                                padding: 8,
                            }}
                        >
                            <Button
                                ariaLabel="Choose context or suggestions"
                                disabled={!selectedProjectId || submitting}
                                fill="outline"
                                onClick={() => setIsToolsOpen(true)}
                                style={{
                                    borderRadius: '50%',
                                    flexShrink: 0,
                                    height: 44,
                                    minWidth: 44,
                                    padding: 0,
                                    width: 44,
                                }}
                            >
                                <LuPlus size={20} />
                            </Button>
                            <TextArea
                                autoSize={{ minRows: 1, maxRows: 4 }}
                                disabled={!selectedProjectId || submitting}
                                onChange={setInput}
                                placeholder="Message Menu Manager"
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

                        {composerContext.target ? (
                            <Flex align="center" gap={8} justify="between" wrap="wrap">
                                <Text style={{ alignItems: 'center', display: 'inline-flex', fontSize: 12, gap: 6 }}>
                                    <LuSlidersHorizontal size={14} /> {composerContextLabel}
                                </Text>
                                <Button
                                    disabled={submitting}
                                    fill="none"
                                    onClick={clearComposerContext}
                                    style={{ minHeight: 44, paddingInline: 0 }}
                                >
                                    Clear
                                </Button>
                            </Flex>
                        ) : null}
                            </>
                        )}
                    </Space>
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
                onMaskClick={() => setIsToolsOpen(false)}
                visible={isToolsOpen}
                bodyStyle={{
                    background: token.colorBgContainer,
                    padding: 16,
                }}
            >
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Flex align="center" justify="space-between" gap={12}>
                        <div>
                            <Text strong style={{ display: 'block', fontSize: 18 }}>Start from</Text>
                            <Text type="secondary">Add context or choose a prepared suggestion.</Text>
                        </div>
                        <Button
                            ariaLabel="Close tools"
                            fill="none"
                            onClick={() => setIsToolsOpen(false)}
                            style={{ minHeight: 44, minWidth: 44, padding: 0 }}
                        >
                            <LuX size={20} />
                        </Button>
                    </Flex>
                    <Button
                        block
                        fill="outline"
                        onClick={openContextPicker}
                        style={{ borderRadius: 8, minHeight: 56, textAlign: 'left' }}
                    >
                        <LuSlidersHorizontal size={18} />
                        <span>
                            <Text strong style={{ display: 'block' }}>Work on</Text>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                Choose items, a category, or a MenuList area
                            </Text>
                        </span>
                    </Button>
                    <Button
                        block
                        fill="outline"
                        onClick={openSuggestions}
                        style={{ borderRadius: 8, minHeight: 56, textAlign: 'left' }}
                    >
                        <LuSparkles size={18} />
                        <span>
                            <Text strong style={{ display: 'block' }}>Suggestions</Text>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                Pick a useful starting point and edit before sending
                            </Text>
                        </span>
                    </Button>
                </Space>
            </Popup>

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
                            <Text type="secondary">Pick a menu area first, then type what to do.</Text>
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
                                                borderRadius: 8,
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
                                borderRadius: 8,
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
                            <Text type="secondary">Pick one to draft it. You can edit before sending.</Text>
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
                                                    borderRadius: 8,
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
                                                    borderRadius: 8,
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
