'use client';

import { applyAiMenuManagerProjectPatch } from '@lib/ai-menu-manager/actions/projectPatches';
import { getAiMenuManagerProjectPromptHints } from '@lib/ai-menu-manager/projectPromptHints';
import {
    completeAiMenuManagerClientProposal,
    getAiMenuManagerClientInbox,
    sendAiMenuManagerCommand,
    submitAiMenuManagerProposalAction,
} from '@database/aiMenuManager';
import { getProjectDataWithoutLoader, getProjectsListWithoutLoader, updateProjectWithoutLoader } from '@database/projects';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { ProjectSelectorList, ProjectSelectorTrigger, type ProjectSelectorItem } from '../../../shared/ProjectSelector';
import type { Project } from '@template/main-app/projects/types';
import type { AiMenuManagerCardPayload, AiMenuManagerReceipt } from '@type/aiMenuManager';
import { removeObjRef } from '@util/utils';
import { App, Button, Card, Empty, Input, Modal, Space, Spin, Tag, Typography, theme } from 'antd';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuBot, LuCircleSlash, LuIndianRupee, LuMessageSquare, LuPalette, LuSend } from 'react-icons/lu';
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

export default function AiMenuManagerRoute() {
    const { message } = App.useApp();
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const storeId = storeDetails?.storeId;
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [cards, setCards] = useState<AiMenuManagerCardPayload[]>([]);
    const [receipts, setReceipts] = useState<AiMenuManagerReceipt[]>([]);
    const [timeline, setTimeline] = useState<TimelineMessage[]>([]);
    const [input, setInput] = useState('');
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [loadingProject, setLoadingProject] = useState(false);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [workingCardId, setWorkingCardId] = useState<string | null>(null);
    const chatScrollRef = useRef<HTMLDivElement | null>(null);

    const quickPrompts = useMemo(() => {
        const promptHints = getAiMenuManagerProjectPromptHints(selectedProject);
        return [
            promptHints.pricePrompt ? { label: promptHints.pricePrompt, helper: 'Change a price', icon: LuIndianRupee } : null,
            promptHints.availabilityPrompt ? { label: promptHints.availabilityPrompt, helper: 'Mark an item unavailable', icon: LuCircleSlash } : null,
            { label: 'Show note: Fresh menu today', helper: 'Prepare a menu note', icon: LuMessageSquare },
            { label: 'Make menu premium', helper: 'Prepare a style update', icon: LuPalette },
        ].filter((prompt): prompt is { label: string; helper: string; icon: typeof LuIndianRupee } => Boolean(prompt));
    }, [selectedProject]);

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
                sessionId: sessionId || undefined,
            });
            setSessionId(inbox.sessionId || sessionId);
            setCards(inbox.cards || []);
            setReceipts(inbox.receipts || []);
            const compact = inbox.session?.compactMessages || [];
            setTimeline(compact.map((entry) => ({
                id: entry.messageId,
                role: entry.role === 'owner' ? 'owner' : 'menu_manager',
                text: entry.text,
            })));
        } catch (error: any) {
            message.error(error?.message || 'Unable to load selected menu');
        } finally {
            setLoadingProject(false);
        }
    }, [message, sessionId, storeId]);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    useEffect(() => {
        loadSelectedProject(selectedProjectId);
    }, [loadSelectedProject, selectedProjectId]);

    useEffect(() => {
        const node = chatScrollRef.current;
        if (!node) return;
        node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
    }, [cards.length, timeline.length, loadingProject]);

    const refreshCurrent = useCallback(async () => {
        await loadSelectedProject(selectedProjectId);
    }, [loadSelectedProject, selectedProjectId]);

    const handleSelectProject = useCallback((projectId: string) => {
        setSelectedProjectId(projectId);
        setIsProjectSelectorOpen(false);
    }, []);

    const submitPrompt = useCallback(async (prompt?: string) => {
        const text = (prompt ?? input).trim();
        if (!text) return;
        if (!storeId || !selectedProjectId) {
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
                sessionId: sessionId || undefined,
                storeId: String(storeId),
                projectId: selectedProjectId,
                inputType: 'text',
                text,
            });
            setSessionId(response.sessionId);
            setCards((prev) => [...response.cards, ...prev.filter((card) => !response.cards.some((next) => next.cardId === card.cardId))]);
            setTimeline((prev) => [
                ...prev,
                {
                    id: response.messageId,
                    role: 'menu_manager',
                    text: response.cards[0]?.title || 'Prepared a menu card',
                },
            ]);
        } catch (error: any) {
            message.error(error?.message || 'Menu Manager could not prepare that change');
        } finally {
            setSubmitting(false);
        }
    }, [input, message, selectedProjectId, sessionId, storeId]);

    const completeDirective = useCallback(async (card: AiMenuManagerCardPayload) => {
        if (!storeId || !selectedProject) return;
        setWorkingCardId(card.cardId);
        try {
            if (card.kind === 'manual_task' || card.kind === 'unsupported' || card.actions.includes('mark_done')) {
                await submitAiMenuManagerProposalAction({
                    proposalId: card.cardId,
                    storeId,
                    projectId: card.scope.projectId,
                    actionType: card.actionType,
                    action: 'mark_done',
                });
                setCards((prev) => prev.filter((entry) => entry.cardId !== card.cardId));
                message.success('Manual task marked done');
                await refreshCurrent();
                return;
            }

            const actionResponse = await submitAiMenuManagerProposalAction({
                proposalId: card.cardId,
                storeId,
                projectId: card.scope.projectId,
                actionType: card.actionType,
                action: 'approve',
            });
            const directive = actionResponse.data?.directive;
            if (!directive) {
                message.info('This card is prepared, but no executable directive was returned');
                return;
            }

            try {
                const patchedProject = applyAiMenuManagerProjectPatch(selectedProject, directive);
                const savedProject = await updateProjectWithoutLoader(patchedProject);
                setSelectedProject(removeObjRef(savedProject || patchedProject) as Project);
                await completeAiMenuManagerClientProposal({
                    proposalId: card.cardId,
                    storeId,
                    projectId: card.scope.projectId,
                    actionType: card.actionType,
                    executionId: directive.executionId,
                    patchHash: directive.patchHash,
                    result: 'executed',
                    message: `${card.title} applied.`,
                });
                message.success('Menu updated');
                await refreshCurrent();
            } catch (error: any) {
                await completeAiMenuManagerClientProposal({
                    proposalId: card.cardId,
                    storeId,
                    projectId: card.scope.projectId,
                    actionType: card.actionType,
                    executionId: directive.executionId,
                    patchHash: directive.patchHash,
                    result: 'failed',
                    message: error?.message || 'Project update failed',
                }).catch(() => null);
                throw error;
            }
        } catch (error: any) {
            message.error(error?.message || 'Unable to apply this card');
        } finally {
            setWorkingCardId(null);
        }
    }, [message, refreshCurrent, selectedProject, storeId]);

    const cancelCard = useCallback(async (card: AiMenuManagerCardPayload) => {
        if (!storeId) return;
        setWorkingCardId(card.cardId);
        try {
            await submitAiMenuManagerProposalAction({
                proposalId: card.cardId,
                storeId,
                projectId: card.scope.projectId,
                actionType: card.actionType,
                action: 'cancel',
            });
            setCards((prev) => prev.filter((entry) => entry.cardId !== card.cardId));
        } catch (error: any) {
            message.error(error?.message || 'Unable to cancel this card');
        } finally {
            setWorkingCardId(null);
        }
    }, [message, storeId]);

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
                                            Send a message or choose one of the suggestions below.
                                        </Text>
                                    </div>
                                ) : null}
                                {timeline.map((entry) => (
                                    <div
                                        key={entry.id}
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
                                        key={card.cardId}
                                        card={card}
                                        disabled={workingCardId === card.cardId}
                                        onApprove={completeDirective}
                                        onCancel={cancelCard}
                                    />
                                ))}
                            </Space>
                        )}
                    </div>

                    <div style={{ borderTop: `1px solid ${token.colorSplit}`, padding: 18 }}>
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
                                display: 'grid',
                                gap: 8,
                                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                marginTop: 14,
                            }}
                        >
                            {quickPrompts.map((prompt) => {
                                const Icon = prompt.icon;
                                return (
                                    <button
                                        key={prompt.label}
                                        disabled={!selectedProjectId || submitting}
                                        onClick={() => submitPrompt(prompt.label)}
                                        style={{
                                            alignItems: 'center',
                                            background: token.colorFillTertiary,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                            borderRadius: 12,
                                            color: token.colorText,
                                            cursor: !selectedProjectId || submitting ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            gap: 12,
                                            minHeight: 50,
                                            opacity: !selectedProjectId || submitting ? 0.55 : 1,
                                            padding: '10px 14px',
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
                                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{prompt.helper}</Text>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </Card>

                <div style={{ height: '100%', minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        <Card title="Pending cards" style={{ borderRadius: 8 }}>
                            {cards.length ? (
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                    {cards.map((card) => (
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
                                    External platform requests stay as manual tasks.
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
