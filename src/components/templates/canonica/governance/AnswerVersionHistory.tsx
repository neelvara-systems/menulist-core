'use client'

/**
 * Canonica — Answer Version History
 * 
 * Per-answer changelog showing all governance events from audit logs.
 * Proves governance rigor: every drift detection, mutation, validation visible.
 * 
 * Phase 4 — Signal Quality (3.4)
 * 
 * @see __docs__/canonica/canonica-build-priority-roadmap.md Phase 4
 */

import { getAnswerVersionHistory } from '@database/canonica/auditLogs';
import { getCanonicalAnswers } from '@database/canonica/canonicalAnswers';
import { CanonicaAuditLog, CanonicaCanonicalAnswer } from '@type/canonica';
import { Badge, Card, Empty, Select, Spin, Tag, Timeline, Typography } from 'antd';
import { useEffect, useState } from 'react';
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
    'drift_cleared': { label: 'Drift Cleared', color: 'green', icon: <LuCheckCircle /> },
    'mutation_proposal_generated': { label: 'Mutation Proposed', color: 'blue', icon: <LuGitBranch /> },
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

function formatTimestamp(ts: any): string {
    if (!ts) return 'Unknown';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function AnswerVersionHistory({ tId, sId }: Props) {
    const [answers, setAnswers] = useState<CanonicaCanonicalAnswer[]>([]);
    const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
    const [history, setHistory] = useState<CanonicaAuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingAnswers, setLoadingAnswers] = useState(true);

    useEffect(() => {
        async function loadAnswers() {
            setLoadingAnswers(true);
            try {
                const data = await getCanonicalAnswers(tId, sId);
                setAnswers(data ?? []);
            } finally {
                setLoadingAnswers(false);
            }
        }
        loadAnswers();
    }, [tId, sId]);

    useEffect(() => {
        if (!selectedAnswerId) {
            setHistory([]);
            return;
        }
        async function loadHistory() {
            setLoading(true);
            try {
                const data = await getAnswerVersionHistory(tId, sId, selectedAnswerId!);
                setHistory(data ?? []);
            } finally {
                setLoading(false);
            }
        }
        loadHistory();
    }, [selectedAnswerId, tId, sId]);

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
                    onChange={setSelectedAnswerId}
                    showSearch
                    filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={answers.map(a => ({
                        value: a.id,
                        label: a.title,
                    }))}
                />
                {selectedAnswerId && (
                    <Badge
                        count={history.length}
                        style={{ backgroundColor: '#1677ff' }}
                        overflowCount={99}
                    />
                )}
            </div>

            {!selectedAnswerId && (
                <Empty description="Select a canonical answer to view its version history" />
            )}

            {selectedAnswerId && loading && <Spin tip="Loading history..." />}

            {selectedAnswerId && !loading && history.length === 0 && (
                <Empty description="No governance events found for this answer" />
            )}

            {selectedAnswerId && !loading && history.length > 0 && (
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
                                                {formatTimestamp(log.timestamp)}
                                            </Text>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <LuUser size={12} />
                                            <Text style={{ fontSize: 12 }}>{log.performedBy}</Text>
                                        </div>
                                        {log.newState && (
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {log.newState.reason || log.newState.driftReason ||
                                                    (log.newState.driftClasses ? `Classes: ${log.newState.driftClasses.join(', ')}` : '') ||
                                                    (log.newState.mutationType ? `Type: ${log.newState.mutationType}` : '')}
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
