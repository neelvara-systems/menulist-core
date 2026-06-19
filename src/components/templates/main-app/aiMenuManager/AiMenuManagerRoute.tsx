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
import { getProjectDataWithoutLoader, getProjectsListWithoutLoader, updateProjectWithoutLoader } from '@database/projects';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { ProjectSelectorList, ProjectSelectorTrigger, type ProjectSelectorItem } from '../../../shared/ProjectSelector';
import type { Project } from '@template/main-app/projects/types';
import type {
    AiMenuManagerCardPayload,
    AiMenuManagerPendingOperation,
    AiMenuManagerReceipt,
    AiMenuManagerSessionDoc,
} from '@type/aiMenuManager';
import { removeObjRef } from '@util/utils';
import { App, Button, Card, Empty, Input, Modal, Space, Spin, Tag, Typography, theme } from 'antd';
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

type TimelineMessage = {
    id: string;
    role: 'owner' | 'menu_manager';
    text: string;
};

function compactMessagesToTimeline(compactMessages?: AiMenuManagerSessionDoc['compactMessages']): TimelineMessage[] {
    return (compactMessages || []).reduce<TimelineMessage[]>((messages, entry) => {
        const role = entry.role === 'owner' ? 'owner' : 'menu_manager';
        if (role === 'menu_manager') {
            return messages;
        }
        const previous = messages[messages.length - 1];
        if (previous?.role === role && previous.text === entry.text) {
            return messages;
        }
        messages.push({
            id: entry.messageId,
            role,
            text: entry.text,
        });
        return messages;
    }, []);
}

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
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const storeId = storeDetails?.storeId;
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [, setSessionId] = useState<string | null>(null);
    const [currentSession, setCurrentSession] = useState<AiMenuManagerSessionDoc | null>(null);
    const [operations, setOperations] = useState<AiMenuManagerPendingOperation[]>([]);
    const [receipts, setReceipts] = useState<AiMenuManagerReceipt[]>([]);
    const [timeline, setTimeline] = useState<TimelineMessage[]>([]);
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
            message.error(error?.message || 'Unable to load menus');
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
            setTimeline(compactMessagesToTimeline(inbox.session?.compactMessages));
        } catch (error: any) {
            message.error(error?.message || 'Unable to load selected menu');
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
        setTimeline(compactMessagesToTimeline(session.compactMessages));
    }, []);

    const submitPrompt = useCallback(async (prompt?: string) => {
        const rawText = (prompt ?? input).trim();
        if (!rawText) return;
        if (!canUseAiMenuManagerComposerContext({ data: composerContextData, selection: composerContext })) {
            message.warning('Choose the item or category first');
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
            message.warning('Choose a store and menu first');
            return;
        }

        setSubmitting(true);
        setInput('');
        const ownerMessage: TimelineMessage = {
            id: `local_owner_${Date.now()}`,
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
                        role: 'menu_manager',
                        text: response.cards[0]?.title || 'Prepared a menu card',
                    },
                ]);
            }
        } catch (error: any) {
            message.error(error?.message || 'Menu Manager could not prepare that change');
        } finally {
            setSubmitting(false);
        }
    }, [applySessionState, businessType, clearComposerContext, composerContext, composerContextData, currentSession, getSessionIdForProject, input, message, rememberSessionId, selectedProject, selectedProjectId, storeId, storeName, storePublicContext]);

    const completeDirective = useCallback(async (card: AiMenuManagerCardPayload) => {
        if (!storeId || !selectedProject) return;
        const operation = operations.find((entry) => entry.operationId === card.cardId);
        if (!operation) {
            message.error('Card no longer matches this menu');
            return;
        }
        setWorkingCardId(card.cardId);
        try {
            if (card.kind === 'unsupported') {
                const result = await cancelAiMenuManagerClientOperation({ operation, sessionSnapshot: currentSession });
                applySessionState(result.session);
                message.info('No MenuList action was taken');
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
                applySessionState(result.session);
                message.success(card.localActions?.length ? 'Done' : 'Task marked done');
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
                setSelectedProject(removeObjRef(savedProject || patchedProject) as Project);
                const result = await completeAiMenuManagerClientOperation({
                    operation,
                    result: 'executed',
                    message: `${card.title} applied.`,
                    sessionSnapshot: currentSession,
                });
                applySessionState(result.session);
                message.success('Menu updated');
            } catch (error: any) {
                const failedResult = await completeAiMenuManagerClientOperation({
                    operation,
                    result: 'failed',
                    message: error?.message || 'Project update failed',
                    sessionSnapshot: currentSession,
                }).catch(() => null);
                if (failedResult?.session) {
                    applySessionState(failedResult.session);
                }
                throw error;
            }
        } catch (error: any) {
            message.error(error?.message || 'Unable to apply this card');
        } finally {
            setWorkingCardId(null);
        }
    }, [applySessionState, businessType, currentSession, message, operations, selectedProject, storeId, storeName]);

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
            applySessionState(result.session);
        } catch (error: any) {
            message.error(error?.message || 'Unable to cancel this card');
        } finally {
            setWorkingCardId(null);
        }
    }, [applySessionState, currentSession, message, operations, storeId]);

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
                                        Tell MenuList what changed. Review the prepared card before it updates the selected menu.
                                    </Paragraph>
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
                                        <Title level={4} style={{ marginBottom: 6 }}>What should change?</Title>
                                        <Text type="secondary">
                                            Start from a message, a suggestion, or a selected menu area.
                                        </Text>
                                        {starterSuggestions.length ? (
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
                                                {starterSuggestions.map((suggestion) => {
                                                    const Icon = promptIconByKind[suggestion.kind];
                                                    return (
                                                        <button
                                                            key={suggestion.label}
                                                            onClick={() => activateStarterSuggestion(suggestion)}
                                                            style={{
                                                                alignItems: 'flex-start',
                                                                background: token.colorBgElevated,
                                                                border: `1px solid ${token.colorBorderSecondary}`,
                                                                borderRadius: 12,
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
                                                                    borderRadius: 10,
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
                                                background: entry.role === 'owner' ? token.colorPrimary : token.colorBgElevated,
                                                border: entry.role === 'owner' ? undefined : `1px solid ${token.colorBorderSecondary}`,
                                                borderRadius: 18,
                                                color: entry.role === 'owner' ? token.colorTextLightSolid : token.colorText,
                                                maxWidth: 620,
                                                padding: '10px 14px',
                                            }}
                                        >
                                            {entry.text}
                                        </div>
                                    </div>
                                ))}
                                {cards.map((card) => (
                                    <AiMenuProposalCard
                                        key={`card_${card.cardId}`}
                                        card={card}
                                        disabled={workingCardId === card.cardId}
                                        onApprove={completeDirective}
                                        onCancel={cancelCard}
                                        onDraftPrompt={draftPrompt}
                                        onEdit={editCard}
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
                                        Choose one to place it in the message box. Send it when ready.
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
                                                            borderRadius: 12,
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
                                                            borderRadius: 12,
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
                                    borderRadius: 14,
                                    marginBottom: 12,
                                    padding: 12,
                                }}
                            >
                                <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                    <div>
                                        <Text strong style={{ display: 'block' }}>Work on</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Optional context for the next message.
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
                                            borderRadius: 10,
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
                                gap: 10,
                                padding: '8px 8px 8px 16px',
                            }}
                        >
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
                            <Space size={8} wrap>
                                <Button
                                    disabled={!selectedProjectId || submitting}
                                    icon={<LuSlidersHorizontal size={16} />}
                                    onClick={toggleContextPicker}
                                    size="small"
                                >
                                    {composerContextLabel}
                                </Button>
                                <Button
                                    disabled={!selectedProjectId || submitting}
                                    icon={<LuSparkles size={16} />}
                                    onClick={toggleSuggestions}
                                    size="small"
                                >
                                    {isSuggestionsOpen ? 'Hide suggestions' : 'Suggestions'}
                                </Button>
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
                            </Space>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Selection only applies to the next message.
                            </Text>
                        </div>
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

                        <Card title="How changes work" style={{ borderRadius: 8 }}>
                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                <Text strong>Prepared cards change only the selected menu.</Text>
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
