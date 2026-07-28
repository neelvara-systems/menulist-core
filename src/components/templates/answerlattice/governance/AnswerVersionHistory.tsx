'use client'

/**
 * Answerlattice — Answer Version History
 * 
 * Per-answer changelog showing all governance events from audit logs.
 * Proves governance rigor: every drift detection, mutation, validation visible.
 * 
 * Phase 4 — Signal Quality (3.4)
 * 
 * @see __docs__/answerlattice/answerlattice-build-priority-roadmap.md Phase 4
 */

import { getAnswerVersionHistory } from '@database/answerlattice/auditLogs';
import { getAnswerlatticeCanonicalAnswersScopeKey } from '@hook/answerlattice/canonicalAnswersScopeState';
import { useCanonicalAnswers } from '@hook/answerlattice/useCanonicalAnswers';
import {
    formatAnswerlatticeAuditTimestamp,
    getAnswerlatticeAuditStateSummary,
} from '@lib/answerlattice/auditLogPresentation';
import { createLatestRequestGuard } from '@lib/runtime/latestRequestGuard';
import { AnswerlatticeAuditLog } from '@type/answerlattice';
import { Badge, Card, Empty, Select, Spin, Tag, Timeline, Typography, theme } from 'antd';
import { useEffect, useRef, useState } from 'react';
import {
    LuCheckCircle,
    LuClock,
    LuFileEdit,
    LuGitBranch,
    LuShieldAlert,
    LuUser,
    LuXCircle,
} from 'react-icons/lu';

const { Text, Title } = Typography;

interface Props {
    tId: number;
    sId: number;
}

const ACTION_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    'drift_detected': { label: 'Drift Detected', color: 'orange', icon: <LuShieldAlert /> },
    'drift_manually_resolved': { label: 'Drift Resolved', color: 'green', icon: <LuCheckCircle /> },
    'drift_cleared': { label: 'Drift Cleared', color: 'green', icon: <LuCheckCircle /> },
    'canonical_answer_updated': { label: 'Canonical Answer Updated', color: 'geekblue', icon: <LuFileEdit /> },
    'draft_approved_as_canonical_answer': { label: 'Canonical Answer Approved', color: 'purple', icon: <LuFileEdit /> },
    'mutation_proposal_generated': { label: 'Mutation Proposed', color: 'blue', icon: <LuGitBranch /> },
    'mutation_proposal_approved': { label: 'Mutation Approved', color: 'green', icon: <LuCheckCircle /> },
    'mutation_approved': { label: 'Mutation Approved', color: 'green', icon: <LuCheckCircle /> },
    'mutation_rejected': { label: 'Mutation Rejected', color: 'red', icon: <LuXCircle /> },
    'mutation_implemented': { label: 'Mutation Implemented', color: 'cyan', icon: <LuFileEdit /> },
    'answer_created': { label: 'Answer Created', color: 'purple', icon: <LuFileEdit /> },
    'answer_updated': { label: 'Answer Updated', color: 'geekblue', icon: <LuFileEdit /> },
    'answer_validated': { label: 'Answer Validated', color: 'green', icon: <LuCheckCircle /> },
    'confidence_adjusted': { label: 'Confidence Adjusted', color: 'gold', icon: <LuGitBranch /> },
};

function getActionMeta(action: string) {
    return ACTION_LABELS[action] ?? { label: action, color: 'default', icon: <LuClock /> };
}

export default function AnswerVersionHistory({ tId, sId }: Props) {
    const { token } = theme.useToken();
    const {
        answers,
        loading: loadingAnswers,
        selectedAnswer,
        setSelectedAnswer,
    } = useCanonicalAnswers(tId, sId);
    const selectedAnswerId = selectedAnswer?.id ?? null;
    const scopeKey = getAnswerlatticeCanonicalAnswersScopeKey(tId, sId);
    const [historyState, setHistoryState] = useState<{
        scopeKey: string | null;
        answerId: string | null;
        history: AnswerlatticeAuditLog[];
        loading: boolean;
        error: boolean;
    }>({ scopeKey: null, answerId: null, history: [], loading: false, error: false });
    const requestGuardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(null);
    if (!requestGuardRef.current) requestGuardRef.current = createLatestRequestGuard();

    useEffect(() => {
        const requestGuard = requestGuardRef.current;
        if (!requestGuard || !scopeKey || !selectedAnswerId) {
            requestGuard?.invalidate();
            setHistoryState({
                scopeKey,
                answerId: selectedAnswerId,
                history: [],
                loading: false,
                error: false,
            });
            return;
        }
        const requestId = requestGuard.begin();
        setHistoryState({
            scopeKey,
            answerId: selectedAnswerId,
            history: [],
            loading: true,
            error: false,
        });
        async function loadHistory() {
            try {
                const data = await getAnswerVersionHistory(tId, sId, selectedAnswerId!);
                if (!requestGuard.isCurrent(requestId)) return;
                setHistoryState({
                    scopeKey,
                    answerId: selectedAnswerId,
                    history: data ?? [],
                    loading: false,
                    error: false,
                });
            } catch {
                if (!requestGuard.isCurrent(requestId)) return;
                setHistoryState({
                    scopeKey,
                    answerId: selectedAnswerId,
                    history: [],
                    loading: false,
                    error: true,
                });
            }
        }
        void loadHistory();
        return () => requestGuard.invalidate();
    }, [scopeKey, selectedAnswerId, tId, sId]);

    const historyIsCurrent = historyState.scopeKey === scopeKey
        && historyState.answerId === selectedAnswerId;
    const history = historyIsCurrent ? historyState.history : [];
    const loading = historyIsCurrent ? historyState.loading : Boolean(selectedAnswerId);
    const historyError = historyIsCurrent && historyState.error;

    if (loadingAnswers) {
        return <Spin tip="Loading answers..." />;
    }

    if (answers.length === 0) {
        return <Empty description="No canonical answers found" />;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Text strong>Select Answer:</Text>
                <Select
                    placeholder="Choose a canonical answer"
                    style={{ width: 400 }}
                    value={selectedAnswerId}
                    onChange={(answerId) => {
                        setSelectedAnswer(answers.find(answer => answer.id === answerId) ?? null);
                    }}
                    showSearch
                    filterOption={(input, option) => (
                        typeof option?.label === 'string'
                        && option.label.toLowerCase().includes(input.toLowerCase())
                    )}
                    options={answers.map(a => ({
                        value: a.id,
                        label: a.title,
                    }))}
                />
                {selectedAnswerId && (
                    <Badge
                        count={history.length}
                        style={{ backgroundColor: token.colorPrimary }}
                        overflowCount={99}
                    />
                )}
            </div>

            {!selectedAnswerId && (
                <Empty description="Select a canonical answer to view its version history" />
            )}

            {selectedAnswerId && loading && <Spin tip="Loading history..." />}

            {selectedAnswerId && !loading && historyError && (
                <Empty description="Could not load version history" />
            )}

            {selectedAnswerId && !loading && !historyError && history.length === 0 && (
                <Empty description="No governance events found for this answer" />
            )}

            {selectedAnswerId && !loading && !historyError && history.length > 0 && (
                <Card size="small" title={`Version History (${history.length} events)`}>
                    <Timeline
                        items={history.map((log) => {
                            const meta = getActionMeta(log.action);
                            return {
                                dot: meta.icon,
                                color: meta.color,
                                children: (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Tag color={meta.color}>{meta.label}</Tag>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {formatAnswerlatticeAuditTimestamp(log.timestamp)}
                                            </Text>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <LuUser size={12} />
                                            <Text style={{ fontSize: 12 }}>{log.performedBy}</Text>
                                        </div>
                                        {getAnswerlatticeAuditStateSummary(log.newState) && (
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {getAnswerlatticeAuditStateSummary(log.newState)}
                                            </Text>
                                        )}
                                    </div>
                                ),
                            };
                        })}
                    />
                </Card>
            )}
        </div>
    );
}
