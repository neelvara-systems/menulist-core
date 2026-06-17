'use client';

import { applyAiMenuManagerProjectPatch } from '@lib/ai-menu-manager/actions/projectPatches';
import { getAiMenuManagerProjectPromptHints } from '@lib/ai-menu-manager/projectPromptHints';
import {
    completeAiMenuManagerClientProposal,
    getAiMenuManagerClientInbox,
    sendAiMenuManagerCommand,
    submitAiMenuManagerProposalAction,
} from '@database/aiMenuManager';
import { updateProjectWithoutLoader } from '@database/projects';
import type { AiMenuManagerCardPayload, AiMenuManagerReceipt } from '@type/aiMenuManager';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LuCircleSlash, LuIndianRupee, LuMessageSquare, LuPalette, LuRefreshCw, LuSend } from 'react-icons/lu';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { ProjectSelectorTrigger, type ProjectSelectorItem } from '../../shared/ProjectSelector';
import { theme } from 'antd';
import { Button, Card, Flex, NavBar, Space, Text, TextArea, Toast } from '../antd';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import MobileAiMenuCardStack from './MobileAiMenuCardStack';

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
        refreshCachedProject,
        refreshProjects,
        upsertCachedProject,
    } = useMobileProjects();
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [cards, setCards] = useState<AiMenuManagerCardPayload[]>([]);
    const [receipts, setReceipts] = useState<AiMenuManagerReceipt[]>([]);
    const [input, setInput] = useState('');
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [workingCardId, setWorkingCardId] = useState<string | null>(null);

    const quickPrompts = useMemo(() => {
        const promptHints = getAiMenuManagerProjectPromptHints(selectedProject);
        return [
            promptHints.pricePrompt ? { label: promptHints.pricePrompt, helper: 'Change a price', icon: LuIndianRupee } : null,
            promptHints.availabilityPrompt ? { label: promptHints.availabilityPrompt, helper: 'Mark an item unavailable', icon: LuCircleSlash } : null,
            { label: 'Show note: Fresh menu today', helper: 'Prepare a menu note', icon: LuMessageSquare },
            { label: 'Make menu premium', helper: 'Prepare a style update', icon: LuPalette },
        ].filter((prompt): prompt is { label: string; helper: string; icon: typeof LuIndianRupee } => Boolean(prompt));
    }, [selectedProject]);

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
                sessionId: sessionId || undefined,
            });
            setSessionId(inbox.sessionId || sessionId);
            setCards(inbox.cards || []);
            setReceipts(inbox.receipts || []);
        } catch (error: any) {
            Toast.show({ content: error?.message || 'Unable to load Menu Manager' });
        }
    }, [selectedProjectId, sessionId, storeId]);

    useEffect(() => {
        void loadInbox();
    }, [loadInbox]);

    const submitPrompt = useCallback(async (prompt?: string) => {
        const text = (prompt ?? input).trim();
        if (!text) return;
        if (!storeId || !selectedProjectId) {
            Toast.show({ content: 'Choose a menu first' });
            return;
        }
        setSubmitting(true);
        setInput('');
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
        } catch (error: any) {
            Toast.show({ content: error?.message || 'Could not prepare card' });
        } finally {
            setSubmitting(false);
        }
    }, [input, selectedProjectId, sessionId, storeId]);

    const approveCard = useCallback(async (card: AiMenuManagerCardPayload) => {
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
                Toast.show({ content: 'Marked done', icon: 'success' });
                await loadInbox();
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
                Toast.show({ content: 'No executable directive returned' });
                return;
            }

            try {
                const patchedProject = applyAiMenuManagerProjectPatch(selectedProject, directive);
                const savedProject = await updateProjectWithoutLoader(patchedProject);
                upsertCachedProject(savedProject || patchedProject);
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
                Toast.show({ content: 'Menu updated', icon: 'success' });
                await refreshCachedProject(selectedProjectId, { showLoader: false });
                await loadInbox();
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
            Toast.show({ content: error?.message || 'Unable to apply card' });
        } finally {
            setWorkingCardId(null);
        }
    }, [loadInbox, refreshCachedProject, selectedProject, selectedProjectId, storeId, upsertCachedProject]);

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
            Toast.show({ content: error?.message || 'Unable to cancel card' });
        } finally {
            setWorkingCardId(null);
        }
    }, [storeId]);

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

                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            {quickPrompts.map((prompt) => {
                                const Icon = prompt.icon;
                                return (
                                    <button
                                        key={prompt.label}
                                        disabled={!selectedProjectId || submitting}
                                        onClick={() => void submitPrompt(prompt.label)}
                                        style={{
                                            alignItems: 'center',
                                            background: token.colorFillTertiary,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                            borderRadius: 14,
                                            color: token.colorText,
                                            cursor: !selectedProjectId || submitting ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            gap: 12,
                                            minHeight: 52,
                                            padding: '10px 12px',
                                            textAlign: 'left',
                                            opacity: !selectedProjectId || submitting ? 0.55 : 1,
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
                    </Space>
                </Card>

                <MobileAiMenuCardStack
                    cards={cards}
                    workingCardId={workingCardId}
                    onApprove={(card) => void approveCard(card)}
                    onCancel={(card) => void cancelCard(card)}
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
        </div>
    );
}
