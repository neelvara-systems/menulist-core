'use client';

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
    type AiMenuManagerTimelineMessage,
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
import { assertProjectUpdateSucceeded, getProjectDataWithoutLoader, getProjectsListWithoutLoader, updateProjectWithoutLoader } from '@database/projects';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { ProjectSelectorList, ProjectSelectorTrigger, type ProjectSelectorItem } from '../../../shared/ProjectSelector';
import type { Project } from '@template/main-app/projects/types';
import type {
    AiMenuManagerCardPayload,
    AiMenuManagerCommandContextSelection,
    AiMenuManagerPendingOperation,
    AiMenuManagerReceipt,
    AiMenuManagerSessionDoc,
    AiMenuManagerSuggestedReply,
} from '@type/aiMenuManager';
import { removeObjRef } from '@util/utils';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { hasAnyPermission } from '@lib/permissions/permissionRequirements';
import { App, Button, Card, Dropdown, Empty, Input, Modal, Space, Spin, Tag, Typography, theme } from 'antd';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    LuBot,
    LuCheck,
    LuChevronLeft,
    LuChevronRight,
    LuCircleSlash,
    LuExternalLink,
    LuEye,
    LuImage,
    LuIndianRupee,
    LuMegaphone,
    LuMessageSquare,
    LuPalette,
    LuPlus,
    LuSearch,
    LuSend,
    LuSlidersHorizontal,
    LuSparkles,
    LuUpload,
    LuX,
} from 'react-icons/lu';
import AiMenuProposalCard from './cards/AiMenuProposalCard';

const { Paragraph, Text, Title } = Typography;

type ProjectSummary = {
    active?: boolean;
    deleted?: boolean;
    isDefault?: boolean;
    isSpecialMenu?: boolean;
    name?: any;
    projectImage?: string | null;
    projectId: string;
    specialMenuBaseProjectId?: string;
    specialMenuEndsAt?: string;
    specialMenuStatus?: ProjectSelectorItem['specialMenuStatus'];
};

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

export default function AiMenuManagerRoute() {
    const { message } = App.useApp();
    const { token } = theme.useToken();
    const { storeDetails, userPermissions } = useContext(PlatformGlobalDataContext);
    const storeId = storeDetails?.storeId;
    const canAccessDigitalScreens = FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED
        && hasAnyPermission(userPermissions, [PERMISSIONS.MANAGE_DIGITAL_SCREENS]);
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [, setSessionId] = useState<string | null>(null);
    const [currentSession, setCurrentSession] = useState<AiMenuManagerSessionDoc | null>(null);
    const [operations, setOperations] = useState<AiMenuManagerPendingOperation[]>([]);
    const [receipts, setReceipts] = useState<AiMenuManagerReceipt[]>([]);
    const [timeline, setTimeline] = useState<AiMenuManagerTimelineMessage[]>([]);
    const [input, setInput] = useState('');
    const [composerContext, setComposerContext] = useState<AiMenuManagerComposerContext>({
        selectedEntityIds: [],
        target: null,
    });
    const [contextSearch, setContextSearch] = useState('');
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [loadingProject, setLoadingProject] = useState(false);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [isContextPickerOpen, setIsContextPickerOpen] = useState(false);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState<AiMenuManagerPromptSuggestion | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [workingCardId, setWorkingCardId] = useState<string | null>(null);
    const [digitalScreenToken, setDigitalScreenToken] = useState<string | undefined>();
    const chatScrollRef = useRef<HTMLDivElement | null>(null);
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
    useEffect(() => {
        let active = true;
        if (!canAccessDigitalScreens) {
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
                logRuntimeFailure('ai_menu_manager_screen_context_load_failed', error, {
                    ...getBoundedRuntimeStringContext('storeId', (storeDetails as any)?.storeId),
                });
            });
        return () => {
            active = false;
        };
    }, [canAccessDigitalScreens, (storeDetails as any)?.storeId]);
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

    const projectSelectorItems = useMemo<ProjectSelectorItem[]>(() => (
        projects.map((project) => ({
            active: project.active !== false,
            deleted: project.deleted === true,
            id: project.projectId,
            isDefault: project.isDefault,
            isSpecialMenu: project.isSpecialMenu === true,
            name: project.name || 'Untitled menu',
            projectImage: project.projectImage || null,
            specialMenuBaseProjectId: project.specialMenuBaseProjectId,
            specialMenuBaseProjectName: project.specialMenuBaseProjectId
                ? projects.find((entry) => entry.projectId === project.specialMenuBaseProjectId)?.name
                : undefined,
            specialMenuEndsAt: project.specialMenuEndsAt,
            specialMenuStatus: project.specialMenuStatus,
        }))
    ), [projects]);

    const selectedProjectSelectorItem = useMemo(() => (
        projectSelectorItems.find((project) => project.id === selectedProjectId) || null
    ), [projectSelectorItems, selectedProjectId]);
    const cards = useMemo(() => operations.map((operation) => operation.card), [operations]);
    const pendingSummaryCards = useMemo(() => (
        cards.filter((card) => card.kind === 'proposal' || card.kind === 'manual_task')
    ), [cards]);
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

    const removeOperation = useCallback((operationId: string, receipt?: AiMenuManagerReceipt) => {
        setOperations((prev) => prev.filter((entry) => entry.operationId !== operationId));
        if (receipt) {
            setReceipts((prev) => [
                receipt,
                ...prev.filter((entry) => entry.proposalId !== receipt.proposalId),
            ].slice(0, 20));
            setTimeline((prev) => [
                ...prev.filter((entry) => entry.id !== `${receipt.receiptId}_manager`),
                {
                    id: `${receipt.receiptId}_manager`,
                    kind: 'receipt',
                    role: 'menu_manager',
                    text: receipt.message,
                },
            ]);
        }
    }, []);

    const loadProjects = useCallback(async () => {
        if (!storeId) return;
        setLoadingProjects(true);
        try {
            const result = await getProjectsListWithoutLoader(true);
            const nextProjects = (result?.projects || []) as ProjectSummary[];
            setProjects(nextProjects);
            const preferred = nextProjects.find((project) => project.isDefault && project.active !== false)
                || nextProjects.find((project) => project.active !== false)
                || nextProjects[0]
                || null;
            if (preferred && !selectedProjectId) {
                setSelectedProjectId(preferred.projectId);
            }
        } catch (error: any) {
            logRuntimeFailure('ai_menu_manager_projects_load_failed', error, {
                ...getBoundedRuntimeStringContext('storeId', storeId),
                ...getBoundedRuntimeStringContext('selectedProjectId', selectedProjectId),
            });
            message.error('Unable to load menus.');
        } finally {
            setLoadingProjects(false);
        }
    }, [message, selectedProjectId, storeId]);

    const loadSelectedProject = useCallback(async (projectId?: string | null) => {
        if (!projectId || !storeId) return;
        setLoadingProject(true);
        try {
            const project = await getProjectDataWithoutLoader(projectId);
            setSelectedProject(removeObjRef(project) as Project);
            const inbox = await getAiMenuManagerClientInbox({
                storeId,
                projectId,
                sessionId: getSessionIdForProject(projectId),
            });
            rememberSessionId(inbox.sessionId, projectId);
            const nextOperations = inbox.operations || [];
            const nextReceipts = inbox.receipts || [];
            setCurrentSession(inbox.session || null);
            setOperations(nextOperations);
            setReceipts(nextReceipts);
            setTimeline(buildAiMenuManagerTimeline({
                activeCards: nextOperations.map((operation) => operation.card),
                compactMessages: inbox.session?.compactMessages,
                receipts: nextReceipts,
            }));
        } catch (error: any) {
            logRuntimeFailure('ai_menu_manager_selected_project_load_failed', error, {
                ...getBoundedRuntimeStringContext('storeId', storeId),
                ...getBoundedRuntimeStringContext('projectId', projectId),
                ...getBoundedRuntimeStringContext('sessionId', getSessionIdForProject(projectId)),
            });
            message.error('Unable to load selected menu.');
        } finally {
            setLoadingProject(false);
        }
    }, [getSessionIdForProject, message, rememberSessionId, storeId]);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    useEffect(() => {
        loadSelectedProject(selectedProjectId);
    }, [loadSelectedProject, selectedProjectId]);

    useEffect(() => {
        setComposerContext({ selectedEntityIds: [], target: null });
        setContextSearch('');
        setIsContextPickerOpen(false);
    }, [selectedProjectId]);

    useEffect(() => {
        const node = chatScrollRef.current;
        if (!node) return;
        node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
    }, [cards.length, timeline.length, loadingProject]);

    const handleSelectProject = useCallback((projectId: string) => {
        setSelectedProjectId(projectId);
        setIsProjectSelectorOpen(false);
        setComposerContext({ selectedEntityIds: [], target: null });
        setContextSearch('');
    }, []);

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

    const toggleContextPicker = useCallback(() => {
        setIsContextPickerOpen((open) => {
            const nextOpen = !open;
            if (nextOpen) {
                setIsSuggestionsOpen(false);
                setActiveSuggestion(null);
            }
            return nextOpen;
        });
    }, []);

    const toggleSuggestions = useCallback(() => {
        setIsSuggestionsOpen((open) => {
            if (open) {
                setActiveSuggestion(null);
                return false;
            }
            setIsContextPickerOpen(false);
            return true;
        });
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

    const applySessionState = useCallback((session: AiMenuManagerSessionDoc) => {
        const nextOperations = session.pendingOperations || [];
        const nextReceipts = session.recentReceiptSummaries || [];
        setCurrentSession(session);
        setOperations(nextOperations);
        setReceipts(nextReceipts);
        setTimeline(buildAiMenuManagerTimeline({
            activeCards: nextOperations.map((operation) => operation.card),
            compactMessages: session.compactMessages,
            receipts: nextReceipts,
        }));
    }, []);

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
            message.warning('Choose the item or category first');
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
            message.warning('Choose a store and menu first');
            return;
        }

        setSubmitting(true);
        setInput('');
        const ownerMessage: AiMenuManagerTimelineMessage = {
            id: `local_owner_${Date.now()}`,
            kind: 'reply',
            role: 'owner',
            text,
        };
        setTimeline((prev) => [...prev, ownerMessage]);

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
                applySessionState({
                    ...response.session,
                    pendingOperations: response.session.pendingOperations || response.operations || [],
                });
            } else {
                setOperations(response.operations || []);
                setTimeline((prev) => [
                    ...prev,
                    {
                        id: response.messageId,
                        kind: 'reply',
                        role: 'menu_manager',
                        text: response.cards[0]?.title || 'Prepared a menu card',
                    },
                ]);
            }
        } catch (error: any) {
            logRuntimeFailure('ai_menu_manager_prompt_submit_failed', error, {
                ...getBoundedRuntimeStringContext('storeId', storeId),
                ...getBoundedRuntimeStringContext('projectId', selectedProjectId),
                ...getBoundedRuntimeStringContext('sessionId', getSessionIdForProject(selectedProjectId)),
                hasComposerContext: (commandContext?.selectedEntityIds.length || 0) > 0 || Boolean(commandContext?.target),
                inputLength: text.length,
            });
            message.error('Menu Manager could not prepare that change.');
        } finally {
            setSubmitting(false);
        }
    }, [applySessionState, businessType, clearComposerContext, composerContext, composerContextData, currentSession, getSessionIdForProject, input, message, rememberSessionId, selectedProject, selectedProjectId, storeId, storeName, storePublicContext]);

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
            message.error('Prepared updates no longer match this request');
            return;
        }

        setWorkingCardId(groupId);
        let projectWasUpdated = false;
        try {
            let savedProject = selectedProject;
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
                const saved = await updateProjectWithoutLoader(batch.patchedProject, {
                    ...(batch.directives[0].baseProjectUpdatedAt
                        ? { expectedModifiedOn: batch.directives[0].baseProjectUpdatedAt }
                        : {}),
                });
                assertProjectUpdateSucceeded(
                    saved,
                    batch.patchedProject.projectId,
                    'ai_menu_manager_group_project_update_rejected',
                );
                savedProject = removeObjRef(saved || batch.patchedProject) as Project;
                projectWasUpdated = true;
                setSelectedProject(savedProject);
            }

            try {
                const result = await completeAiMenuManagerClientOperations({
                    operations: groupOperations,
                    result: 'executed',
                    sessionSnapshot: currentSession,
                });
                applySessionState(result.session);
                message.success(alreadyApplied
                    ? 'Menu already matches these updates'
                    : `${groupOperations.length} menu updates applied`);
            } catch (error) {
                logRuntimeFailure('ai_menu_manager_group_receipt_completion_failed', error, {
                    ...getBoundedRuntimeStringContext('storeId', storeId),
                    ...getBoundedRuntimeStringContext('projectId', savedProject.projectId),
                    ...getBoundedRuntimeStringContext('commandGroupId', groupId),
                    actionCount: groupOperations.length,
                });
                message.warning('Menu updated. Receipts could not be saved. Approve these cards again to finish them.');
            }
        } catch (error) {
            logRuntimeFailure('ai_menu_manager_group_apply_failed', error, {
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
                }).catch((completionError) => {
                    logRuntimeFailure('ai_menu_manager_group_failed_completion_failed', completionError, {
                        ...getBoundedRuntimeStringContext('storeId', storeId),
                        ...getBoundedRuntimeStringContext('projectId', selectedProject.projectId),
                        ...getBoundedRuntimeStringContext('commandGroupId', groupId),
                    });
                    return null;
                });
                if (failedResult?.session) applySessionState(failedResult.session);
            }
            message.error('Unable to apply these prepared updates.');
        } finally {
            setWorkingCardId(null);
        }
    }, [applySessionState, businessType, currentSession, message, operations, selectedProject, storeId, storeName]);

    const completeDirective = useCallback(async (card: AiMenuManagerCardPayload) => {
        if (!storeId || !selectedProject) return;
        const operation = operations.find((entry) => entry.operationId === card.cardId);
        if (!operation) {
            message.error('Card no longer matches this menu');
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
                    message.info('No MenuList action was taken');
                    return;
                }
                const result = await cancelAiMenuManagerClientOperation({ operation, sessionSnapshot: currentSession });
                applySessionState(result.session);
                message.info('No MenuList action was taken');
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
                    message.success(card.localActions?.length ? 'Done' : 'Task marked done');
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
                applySessionState(result.session);
                message.success(card.localActions?.length ? 'Done' : 'Task marked done');
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
                    applySessionState(result.session);
                    message.success('Menu already updated');
                } catch (error: any) {
                    logRuntimeFailure('ai_menu_manager_already_applied_receipt_failed', error, {
                        ...getBoundedRuntimeStringContext('storeId', storeId),
                        ...getBoundedRuntimeStringContext('projectId', selectedProject?.projectId),
                        ...getBoundedRuntimeStringContext('operationId', operation.operationId),
                        ...getBoundedRuntimeStringContext('cardId', card.cardId),
                        actionCount: card.actions.length,
                    });
                    message.warning('Menu already updated. Receipt could not be saved.');
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
                    message.success('Menu already updated');
                } catch (error: any) {
                    logRuntimeFailure('ai_menu_manager_server_already_applied_receipt_failed', error, {
                        ...getBoundedRuntimeStringContext('storeId', storeId),
                        ...getBoundedRuntimeStringContext('projectId', selectedProject?.projectId),
                        ...getBoundedRuntimeStringContext('operationId', operation.operationId),
                        ...getBoundedRuntimeStringContext('cardId', card.cardId),
                        actionCount: card.actions.length,
                    });
                    removeOperation(operation.operationId);
                    message.warning('Menu already updated. Receipt could not be saved.');
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
                    'ai_menu_manager_project_update_rejected',
                );
            } catch (error: any) {
                logRuntimeFailure('ai_menu_manager_project_update_failed', error, {
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
                    }).catch((completionError) => {
                        logRuntimeFailure('ai_menu_manager_project_update_failed_proposal_completion_failed', completionError, {
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
                    }).catch((completionError) => {
                        logRuntimeFailure('ai_menu_manager_project_update_failed_operation_completion_failed', completionError, {
                            ...getBoundedRuntimeStringContext('storeId', storeId),
                            ...getBoundedRuntimeStringContext('projectId', operation.projectId),
                            ...getBoundedRuntimeStringContext('operationId', operation.operationId),
                            ...getBoundedRuntimeStringContext('cardId', card.cardId),
                        });
                        return null;
                    });
                    if (failedResult?.session) {
                        applySessionState(failedResult.session);
                    }
                }
                throw error;
            }

            setSelectedProject(removeObjRef(savedProject || patchedProject) as Project);
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
                    applySessionState(result.session);
                }
                message.success('Menu updated');
            } catch (error: any) {
                logRuntimeFailure('ai_menu_manager_receipt_completion_failed', error, {
                    ...getBoundedRuntimeStringContext('storeId', storeId),
                    ...getBoundedRuntimeStringContext('projectId', selectedProject?.projectId),
                    ...getBoundedRuntimeStringContext('operationId', operation.operationId),
                    ...getBoundedRuntimeStringContext('cardId', card.cardId),
                    actionCount: card.actions.length,
                });
                message.warning('Menu updated. Receipt could not be saved. Approve this card again to finish it.');
            }
        } catch (error: any) {
            logRuntimeFailure('ai_menu_manager_card_apply_failed', error, {
                ...getBoundedRuntimeStringContext('storeId', storeId),
                ...getBoundedRuntimeStringContext('projectId', selectedProject?.projectId),
                ...getBoundedRuntimeStringContext('cardId', card.cardId),
                actionCount: card.actions.length,
            });
            message.error('Unable to apply this card.');
        } finally {
            setWorkingCardId(null);
        }
    }, [applySessionState, businessType, currentSession, message, operations, removeOperation, selectedProject, storeId, storeName]);

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
            applySessionState(result.session);
        } catch (error: any) {
            logRuntimeFailure('ai_menu_manager_card_cancel_failed', error, {
                ...getBoundedRuntimeStringContext('storeId', storeId),
                ...getBoundedRuntimeStringContext('projectId', operation.projectId),
                ...getBoundedRuntimeStringContext('operationId', operation.operationId),
                ...getBoundedRuntimeStringContext('cardId', card.cardId),
            });
            message.error('Unable to cancel this card.');
        } finally {
            setWorkingCardId(null);
        }
    }, [applySessionState, currentSession, message, operations, removeOperation, storeId]);

    return (
        <div
            style={{
                background: token.colorBgLayout,
                boxSizing: 'border-box',
                color: token.colorText,
                height: 'calc(100vh - 72px)',
                minHeight: 640,
                overflow: 'hidden',
                padding: 16,
            }}
        >
            <div
                style={{
                    display: 'grid',
                    gap: 16,
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 380px)',
                    height: '100%',
                    margin: '0 auto',
                    maxWidth: 1440,
                    minHeight: 0,
                    width: '100%',
                }}
            >
                <Card
                    style={{ borderRadius: 8, height: '100%', minHeight: 0, overflow: 'hidden' }}
                    styles={{
                        body: {
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            minHeight: 0,
                            padding: 0,
                        },
                    }}
                >
                    <div style={{ borderBottom: `1px solid ${token.colorSplit}`, padding: '14px 18px' }}>
                        <div style={{ alignItems: 'flex-start', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' }}>
                            <Space align="start" size={10} style={{ flex: '1 1 360px', minWidth: 0 }}>
                                <LuBot size={24} style={{ marginTop: 3 }} />
                                <div style={{ minWidth: 0 }}>
                                    <Title level={3} style={{ margin: 0 }}>Menu Manager</Title>
                                    <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>
                                        Ask a question or prepare a change for the selected menu.
                                    </Paragraph>
                                    {projectStatusLine ? (
                                        <Text
                                            type="secondary"
                                            style={{ display: 'block', fontSize: 12, marginTop: 6 }}
                                        >
                                            {projectStatusLine}
                                        </Text>
                                    ) : null}
                                </div>
                            </Space>
                            <div style={{ flex: '0 1 420px', minWidth: 300 }}>
                                <ProjectSelectorTrigger
                                    clickable={projectSelectorItems.length > 1}
                                    currentProject={selectedProjectSelectorItem}
                                    helperText="Actions apply only to this selected menu."
                                    onClick={projectSelectorItems.length > 1 ? () => setIsProjectSelectorOpen(true) : undefined}
                                />
                            </div>
                        </div>
                    </div>

                    <div ref={chatScrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18 }}>
                        {loadingProject ? (
                            <Spin />
                        ) : (
                            <Space direction="vertical" size={14} style={{ width: '100%' }}>
                                {timeline.length === 0 && cards.length === 0 ? (
                                    <div
                                        style={{
                                            alignItems: 'center',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            minHeight: 260,
                                            textAlign: 'center',
                                        }}
                                    >
                                        <Title level={4} style={{ marginBottom: 6 }}>
                                            {attentionSuggestions.length ? 'Start with what needs attention' : 'What should change?'}
                                        </Title>
                                        <Text type="secondary">
                                            {attentionSuggestions.length
                                                ? 'Use a loaded-menu issue, ask a question, or type what changed.'
                                                : 'Type naturally, choose a suggestion, or select what to work on.'}
                                        </Text>
                                        <Text
                                            type="secondary"
                                            style={{ alignItems: 'center', display: 'inline-flex', gap: 6, marginTop: 10 }}
                                        >
                                            <LuCheck size={14} /> Nothing changes before you approve.
                                        </Text>
                                        {emptyStateSuggestions.length ? (
                                            <div
                                                style={{
                                                    display: 'grid',
                                                    gap: 10,
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                                    marginTop: 18,
                                                    maxWidth: 720,
                                                    width: '100%',
                                                }}
                                            >
                                                {emptyStateSuggestions.map((suggestion) => {
                                                    const Icon = promptIconByKind[suggestion.kind];
                                                    return (
                                                        <button
                                                            key={suggestion.label}
                                                            onClick={() => activateStarterSuggestion(suggestion)}
                                                            style={{
                                                                alignItems: 'flex-start',
                                                                background: token.colorBgElevated,
                                                                border: `1px solid ${token.colorBorderSecondary}`,
                                                                borderRadius: 8,
                                                                color: token.colorText,
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                gap: 10,
                                                                minHeight: 84,
                                                                padding: '12px 14px',
                                                                textAlign: 'left',
                                                            }}
                                                            type="button"
                                                        >
                                                            <span
                                                                style={{
                                                                    alignItems: 'center',
                                                                    background: token.colorFillTertiary,
                                                                    borderRadius: 8,
                                                                    color: token.colorPrimary,
                                                                    display: 'inline-flex',
                                                                    flexShrink: 0,
                                                                    height: 34,
                                                                    justifyContent: 'center',
                                                                    width: 34,
                                                                }}
                                                            >
                                                                <Icon size={18} />
                                                            </span>
                                                            <span style={{ minWidth: 0 }}>
                                                                <Text strong style={{ display: 'block' }}>{suggestion.label}</Text>
                                                                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 3 }}>
                                                                    {suggestion.helper}
                                                                </Text>
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : null}
                                    </div>
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
                                                gap: 8,
                                                maxWidth: 620,
                                                padding: '10px 14px',
                                            }}
                                        >
                                            {entry.kind === 'receipt' ? (
                                                <LuCheck color={token.colorSuccess} size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                                            ) : null}
                                            <span>{entry.text}</span>
                                        </div>
                                    </div>
                                ))}
                                {approvalGroups.map((group) => (
                                    <div
                                        key={`approval_group_${group.groupId}`}
                                        style={{
                                            alignItems: 'center',
                                            background: token.colorPrimaryBg,
                                            border: `1px solid ${token.colorPrimaryBorder}`,
                                            borderRadius: 8,
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 12,
                                            justifyContent: 'space-between',
                                            padding: '12px 14px',
                                        }}
                                    >
                                        <div>
                                            <Text strong>{group.operations.length} updates prepared together</Text>
                                            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                                                Review the cards below, then apply them with one menu save.
                                            </Text>
                                        </div>
                                        <Button
                                            type="primary"
                                            icon={<LuCheck />}
                                            disabled={Boolean(workingCardId)}
                                            loading={workingCardId === group.groupId}
                                            onClick={() => approveOperationGroup(group.groupId)}
                                            style={{ minHeight: 44 }}
                                        >
                                            Approve all
                                        </Button>
                                    </div>
                                ))}
                                {cards.map((card) => (
                                    <AiMenuProposalCard
                                        key={`card_${card.cardId}`}
                                        card={card}
                                        disabled={Boolean(workingCardId)}
                                        onApprove={completeDirective}
                                        onCancel={cancelCard}
                                        onDraftPrompt={draftPrompt}
                                        onEdit={editCard}
                                        onResolveClarification={resolveClarification}
                                    />
                                ))}
                            </Space>
                        )}
                    </div>

                    {isSuggestionsOpen ? (
                        <div
                            data-testid="amm-desktop-suggestions-tray"
                            style={{
                                background: token.colorBgContainer,
                                borderTop: `1px solid ${token.colorSplit}`,
                                maxHeight: 320,
                                overflowY: 'auto',
                                padding: 16,
                            }}
                        >
                            <div
                                style={{
                                    alignItems: 'flex-start',
                                    display: 'flex',
                                    gap: 12,
                                    justifyContent: 'space-between',
                                    marginBottom: 14,
                                }}
                            >
                                <div>
                                    <Text strong>Suggestions</Text>
                                    <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                                        Pick one to draft it. You can edit before sending.
                                    </Text>
                                </div>
                                <Button
                                    aria-label="Close suggestions"
                                    icon={<LuX size={16} />}
                                    onClick={closeSuggestions}
                                    shape="circle"
                                    size="small"
                                    type="text"
                                />
                            </div>
                            <Space direction="vertical" size={14} style={{ width: '100%' }}>
                                {activeSuggestion ? (
                                    <div>
                                        <Button
                                            icon={<LuChevronLeft size={16} />}
                                            onClick={() => setActiveSuggestion(null)}
                                            size="small"
                                            style={{ marginBottom: 12, paddingInline: 0 }}
                                            type="link"
                                        >
                                            Back
                                        </Button>
                                        <Text strong style={{ display: 'block', marginBottom: 4 }}>{activeSuggestion.label}</Text>
                                        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                                            {activeSuggestion.helper}
                                        </Text>
                                        <div
                                            style={{
                                                display: 'grid',
                                                gap: 8,
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                            }}
                                        >
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
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            gap: 12,
                                                            minHeight: 56,
                                                            padding: '12px 14px',
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
                                                            <Icon size={18} />
                                                        </span>
                                                        <span style={{ minWidth: 0 }}>
                                                            <Text strong style={{ display: 'block' }}>{prompt.label}</Text>
                                                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                                                {prompt.helper}
                                                            </Text>
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : promptGroups.map((group) => (
                                    <div key={group.groupId}>
                                        <Text strong style={{ display: 'block', marginBottom: 8 }}>{group.title}</Text>
                                        <div
                                            style={{
                                                display: 'grid',
                                                gap: 8,
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                            }}
                                        >
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
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            gap: 12,
                                                            minHeight: 56,
                                                            padding: '12px 14px',
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
                                                            <Icon size={18} />
                                                        </span>
                                                        <span style={{ flex: 1, minWidth: 0 }}>
                                                            <Text strong style={{ display: 'block' }}>{prompt.label}</Text>
                                                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                                                {prompt.helper}
                                                            </Text>
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
                                        </div>
                                    </div>
                                ))}
                            </Space>
                        </div>
                    ) : null}

                    <div style={{ borderTop: `1px solid ${token.colorSplit}`, padding: 18 }}>
                        {isContextPickerOpen ? (
                            <div
                                data-testid="amm-desktop-context-picker"
                                style={{
                                    background: token.colorFillQuaternary,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    borderRadius: 8,
                                    marginBottom: 12,
                                    padding: 12,
                                }}
                            >
                                <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                    <div>
                                        <Text strong style={{ display: 'block' }}>Work on</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Optional. Pick a menu area first, then type what to do.
                                        </Text>
                                    </div>
                                    {composerContext.target ? (
                                        <Button
                                            disabled={submitting}
                                            onClick={clearComposerContext}
                                            size="small"
                                            type="text"
                                        >
                                            Clear
                                        </Button>
                                    ) : null}
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 8,
                                        marginTop: 10,
                                    }}
                                >
                                    {composerContextData.targets.map((target) => (
                                        <button
                                            key={target.target}
                                            onClick={() => selectComposerTarget(target.target)}
                                            style={{
                                                alignItems: 'center',
                                                background: composerContext.target === target.target ? token.colorPrimaryBg : token.colorBgContainer,
                                                border: `1px solid ${composerContext.target === target.target ? token.colorPrimary : token.colorBorderSecondary}`,
                                                borderRadius: 999,
                                                color: token.colorText,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                gap: 6,
                                                minHeight: 34,
                                                padding: '6px 12px',
                                                whiteSpace: 'nowrap',
                                            }}
                                            type="button"
                                        >
                                            <span
                                                style={{
                                                    alignItems: 'center',
                                                    color: composerContext.target === target.target ? token.colorPrimary : token.colorTextQuaternary,
                                                    display: 'inline-flex',
                                                    flexShrink: 0,
                                                    height: 16,
                                                    justifyContent: 'center',
                                                    width: 16,
                                                }}
                                            >
                                                {composerContext.target === target.target ? <LuCheck color={token.colorPrimary} size={15} /> : null}
                                            </span>
                                            <Text strong style={{ lineHeight: 1.2 }}>{target.label}</Text>
                                        </button>
                                    ))}
                                </div>

                                {activeComposerTarget?.requiresEntity ? (
                                    <div style={{ marginTop: 12 }}>
                                        <div
                                            style={{
                                                alignItems: 'flex-end',
                                                display: 'grid',
                                                gap: 10,
                                                gridTemplateColumns: shouldShowContextSearch ? 'minmax(0, 1fr) minmax(220px, 300px)' : '1fr',
                                                marginBottom: 8,
                                            }}
                                        >
                                            <div>
                                                <Text strong style={{ display: 'block' }}>
                                                    {composerContext.target === 'item' ? 'Pick items' : 'Pick category'}
                                                </Text>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {activeContextEntityCount} available
                                                </Text>
                                            </div>
                                            {shouldShowContextSearch ? (
                                                <Input
                                                    allowClear
                                                    onChange={(event) => setContextSearch(event.target.value)}
                                                    placeholder={composerContext.target === 'item' ? 'Find item' : 'Find category'}
                                                    prefix={<LuSearch size={15} />}
                                                    size="small"
                                                    value={contextSearch}
                                                />
                                            ) : null}
                                        </div>
                                        <div style={{
                                            display: 'grid',
                                            gap: 6,
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                            maxHeight: 174,
                                            overflowY: 'auto',
                                        }}>
                                            {filteredContextEntities.slice(0, 80).map((entity) => {
                                                const selected = composerContext.selectedEntityIds.includes(entity.id);
                                                return (
                                                    <button
                                                        key={entity.id}
                                                        onClick={() => toggleComposerEntity(entity.id)}
                                                        style={{
                                                            alignItems: 'center',
                                                            background: selected ? token.colorPrimaryBg : token.colorBgContainer,
                                                            border: `1px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`,
                                                            borderRadius: 8,
                                                            color: token.colorText,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            gap: 8,
                                                            minHeight: 38,
                                                            padding: '6px 9px',
                                                            textAlign: 'left',
                                                        }}
                                                        type="button"
                                                    >
                                                        <span style={{
                                                            alignItems: 'center',
                                                            color: selected ? token.colorPrimary : token.colorTextQuaternary,
                                                            display: 'inline-flex',
                                                            flexShrink: 0,
                                                            height: 18,
                                                            justifyContent: 'center',
                                                            width: 18,
                                                        }}>
                                                            {selected ? <LuCheck size={15} /> : null}
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
                                        </div>
                                        {composerContext.selectedEntityIds.length ? (
                                            <div
                                                style={{
                                                    alignItems: 'center',
                                                    display: 'flex',
                                                    gap: 8,
                                                    justifyContent: 'flex-end',
                                                    marginTop: 8,
                                                }}
                                            >
                                                <Tag color="blue">
                                                    {composerContext.selectedEntityIds.length} selected
                                                </Tag>
                                                <Button
                                                    onClick={() => setIsContextPickerOpen(false)}
                                                    size="small"
                                                    type="primary"
                                                >
                                                    Done
                                                </Button>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : activeComposerTarget ? (
                                    <div
                                        style={{
                                            background: token.colorFillTertiary,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                            borderRadius: 8,
                                            marginTop: 12,
                                            padding: '10px 12px',
                                        }}
                                    >
                                        <Text strong style={{ display: 'block' }}>{activeComposerTarget.label}</Text>
                                        <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                            {activeComposerTarget.helper}
                                        </Text>
                                    </div>
                                ) : null}
                            </div>
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
                                padding: 8,
                            }}
                        >
                            <Dropdown
                                menu={{
                                    items: [
                                        {
                                            key: 'work_on',
                                            icon: <LuSlidersHorizontal size={16} />,
                                            label: 'Work on an item or menu area',
                                        },
                                        {
                                            key: 'suggestions',
                                            icon: <LuSparkles size={16} />,
                                            label: 'Show suggestions',
                                        },
                                    ],
                                    onClick: ({ key }) => {
                                        if (key === 'work_on') toggleContextPicker();
                                        if (key === 'suggestions') toggleSuggestions();
                                    },
                                }}
                                placement="topLeft"
                                trigger={['click']}
                            >
                                <Button
                                    aria-label="Choose context or suggestions"
                                    disabled={!selectedProjectId || submitting}
                                    icon={<LuPlus size={20} />}
                                    shape="circle"
                                    style={{ flexShrink: 0, height: 44, minWidth: 44, width: 44 }}
                                />
                            </Dropdown>
                            <Input.TextArea
                                autoSize={{ minRows: 1, maxRows: 4 }}
                                value={input}
                                disabled={!selectedProjectId || submitting}
                                onChange={(event) => setInput(event.target.value)}
                                onPressEnter={(event) => {
                                    if (!event.shiftKey) {
                                        event.preventDefault();
                                        submitPrompt();
                                    }
                                }}
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
                            />
                            <Button
                                aria-label="Send"
                                disabled={!selectedProjectId || submitting || !input.trim()}
                                icon={<LuSend size={18} />}
                                loading={submitting}
                                onClick={() => submitPrompt()}
                                shape="circle"
                                style={{
                                    flexShrink: 0,
                                    height: 44,
                                    minWidth: 44,
                                    width: 44,
                                }}
                                type="primary"
                            />
                        </div>
                        {composerContext.target ? (
                            <div
                                style={{
                                    alignItems: 'center',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                    justifyContent: 'space-between',
                                    marginTop: 10,
                                }}
                            >
                                <Tag icon={<LuSlidersHorizontal size={14} />} style={{ marginInlineEnd: 0 }}>
                                    {composerContextLabel}
                                </Tag>
                                <Space size={8}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Applies to the next message
                                    </Text>
                                    <Button disabled={submitting} onClick={clearComposerContext} size="small" type="text">
                                        Clear
                                    </Button>
                                </Space>
                            </div>
                        ) : null}
                    </div>
                </Card>

                <div style={{ height: '100%', minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        <Card title="Pending cards" style={{ borderRadius: 8 }}>
                            {pendingSummaryCards.length ? (
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                    {pendingSummaryCards.map((card) => (
                                        <div key={`summary_${card.cardId}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <Text>{card.title}</Text>
                                            <Tag color={card.risk === 'high' ? 'red' : 'blue'}>{card.status}</Tag>
                                        </div>
                                    ))}
                                </Space>
                            ) : (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No pending cards" />
                            )}
                        </Card>

                        <Card title="Recent receipts" style={{ borderRadius: 8 }}>
                            {receipts.length ? (
                                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                    {receipts.map((receipt) => (
                                        <div key={receipt.receiptId}>
                                            <Text strong>{receipt.title}</Text>
                                            <br />
                                            <Text type="secondary">{receipt.message}</Text>
                                        </div>
                                    ))}
                                </Space>
                            ) : (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No receipts yet" />
                            )}
                        </Card>

                        <Card title="How Menu Manager works" style={{ borderRadius: 8 }}>
                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                <Text strong>Ask, diagnose, prepare, approve.</Text>
                                <Text type="secondary">
                                    Prepared cards change only the selected menu.
                                </Text>
                                <Text type="secondary">
                                    Prices, availability, visibility, menu notes, and style changes wait for approval.
                                </Text>
                                <Text type="secondary">
                                    External platform posting is not supported from Menu Manager.
                                </Text>
                            </Space>
                        </Card>
                    </Space>
                </div>
            </div>

            <Modal
                destroyOnHidden
                footer={null}
                loading={loadingProjects}
                onCancel={() => setIsProjectSelectorOpen(false)}
                open={isProjectSelectorOpen}
                title="Select menu"
                width={560}
            >
                <ProjectSelectorList
                    currentProjectId={selectedProjectId}
                    onSelect={handleSelectProject}
                    projects={projectSelectorItems}
                />
            </Modal>
        </div>
    );
}
